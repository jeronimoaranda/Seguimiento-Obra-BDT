import React, { useMemo, useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { MetricCard } from '../../components/ui/Cards';
import { TablePagination } from '../../components/ui/TablePagination';
import { Activity, CheckCircle, Clock, Wrench, Box, Filter, ArrowUpDown, X, Loader } from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
    PieChart, Pie, Cell, ResponsiveContainer, LabelList 
} from 'recharts';
import { COLORS_LIST } from '../../config/app-config';

const DashboardModule = () => {
    const { registry, loading, edits, saveData } = useData();
    const { access, user } = useAuth();
    
    const [ui, setUi] = useState({ 
        regPage: 1, 
        pageSize: 50, 
        filters: {},
        sortConfig: { key: null, direction: 'asc' }
    });

    const handleSort = (key) => {
        let direction = 'asc';
        if (ui.sortConfig.key === key && ui.sortConfig.direction === 'asc') direction = 'desc';
        setUi(prev => ({ ...prev, sortConfig: { key, direction } }));
    };

    const handleFilterChange = (key, value) => setUi(prev => ({ ...prev, regPage: 1, filters: { ...prev.filters, [key]: value === "ALL" ? "" : value } }));
    const clearFilters = () => setUi(prev => ({ ...prev, filters: {}, regPage: 1 }));

    // Edición en línea
    const handleRegEdit = (tag, field, value) => {
        if (!access.canEdit) return;
        const newRegs = registry.map(r => {
            if(r.tag !== tag) return r;
            let newState = r.estadoReg;
            // Lógica de cambio de estado automático
            if (field === 'fDev' && value) newState = "FINALIZADO"; 
            else if (field === 'fPres' && value) newState = "EN INSPECCIÓN"; 
            else if (field === 'fGen' && value) newState = "EN LABORATORIO"; 
            else if (field === 'fCalib' && value) newState = "CALIBRADO";
            return { ...r, [field]: value, estadoReg: newState };
        });
        saveData(null, newRegs, null, null, user.email);
    };

    const derivedData = useMemo(() => {
        if (!registry) return { flatRegs: [], skidCounts: {ON:0, OFF:0}, docStatusChart: [], regStatusChart: [], physLocationChart: {data:[], keys:[]} };

        let flatRegs = registry.map(item => ({
            tag: item.tag, 
            ubicacionFisica: item.ubicacion || "Sin Dato", 
            ubicacionRegistro: item.ubicReg || "PENDIENTE",
            proveedor: item.lab || "Sin Prov.", 
            estadoDoc: item.fDev ? "FINALIZADO" : item.fPres ? "EN INSPECCIÓN" : item.fGen ? "EN LABORATORIO" : item.fCalib ? "CALIBRADO" : "PENDIENTE",
            fechaGen: item.fGen, fechaPres: item.fPres, fechaDev: item.fDev, fCalib: item.fCalib,
            montado: item.montado, provision: item.provision || "Sin Dato", skid: item.skid || "Sin Dato"
        }));

        // Filtros
        const activeFilters = Object.entries(ui.filters).filter(([_, val]) => val && val !== "");
        if (activeFilters.length > 0) {
            flatRegs = flatRegs.filter(row => activeFilters.every(([key, filterVal]) => { 
                const rowVal = String(row[key] || "").toLowerCase(); 
                const searchVal = filterVal.toLowerCase(); 
                return rowVal.includes(searchVal); 
            }));
        }

        // Ordenamiento
        if (ui.sortConfig.key) {
            flatRegs.sort((a, b) => {
                if (a[ui.sortConfig.key] < b[ui.sortConfig.key]) return ui.sortConfig.direction === 'asc' ? -1 : 1;
                if (a[ui.sortConfig.key] > b[ui.sortConfig.key]) return ui.sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        // Estadísticas para Gráficos
        const getUniqueValues = (key) => Array.from(new Set(registry.map(item => {
            if (key === 'proveedor') return item.lab || "Sin Prov.";
            if (key === 'ubicacionFisica') return item.ubicacion || "Sin Dato";
            if (key === 'provision') return item.provision || "Sin Dato";
            if (key === 'montado') return item.montado;
            if (key === 'skid') return item.skid || "Sin Dato";
            if (key === 'estadoDoc') { if (item.fDev) return "FINALIZADO"; if (item.fPres) return "EN INSPECCIÓN"; if (item.fGen) return "EN LABORATORIO"; if (item.fCalib) return "CALIBRADO"; return "PENDIENTE"; }
            if (key === 'ubicacionRegistro') return item.ubicReg || "PENDIENTE";
            return item[key];
        }).filter(Boolean))).sort();

        const skidCounts = { ON: 0, OFF: 0 };
        flatRegs.forEach(d => { if (d.skid === 'ON') skidCounts.ON++; if (d.skid === 'OFF') skidCounts.OFF++; });

        const docStatusCounts = flatRegs.reduce((acc, curr) => { acc[curr.estadoDoc] = (acc[curr.estadoDoc] || 0) + 1; return acc; }, {});
        const docStatusChart = Object.keys(docStatusCounts).map(key => ({ name: key, value: docStatusCounts[key] }));

        const regStatusCounts = flatRegs.reduce((acc, curr) => { acc[curr.ubicacionRegistro] = (acc[curr.ubicacionRegistro] || 0) + 1; return acc; }, {});
        const regStatusChart = Object.keys(regStatusCounts).map(key => ({ name: key, value: regStatusCounts[key] }));

        const physStats = {}; const provisions = new Set();
        flatRegs.forEach(item => { const loc = item.ubicacionFisica; provisions.add(item.provision); if (!physStats[loc]) physStats[loc] = { name: loc }; physStats[loc][item.provision] = (physStats[loc][item.provision] || 0) + 1; });
        const physLocationChart = { data: Object.values(physStats), keys: Array.from(provisions).sort() };

        return { 
            flatRegs, skidCounts, docStatusChart, regStatusChart, physLocationChart,
            uniqueValues: { proveedor: getUniqueValues('proveedor'), estadoDoc: getUniqueValues('estadoDoc'), ubicacionFisica: getUniqueValues('ubicacionFisica'), provision: getUniqueValues('provision'), ubicacionRegistro: getUniqueValues('ubicacionRegistro'), montado: getUniqueValues('montado'), skid: getUniqueValues('skid') }
        };
    }, [registry, ui.filters, ui.sortConfig]);

    const paginatedRegs = useMemo(() => {
        const start = (ui.regPage - 1) * ui.pageSize;
        return derivedData.flatRegs.slice(start, start + ui.pageSize);
    }, [derivedData.flatRegs, ui.regPage, ui.pageSize]);

    if (loading && (!registry || registry.length === 0)) return <div className="flex h-64 justify-center items-center"><Loader className="animate-spin text-blue-500"/></div>;

    // Si no hay datos, mostrar mensaje amigable
    if (!registry || registry.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96 bg-white rounded-lg border border-dashed border-slate-300">
                <Activity className="w-16 h-16 text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-500">No hay datos de instrumentación</h3>
                <p className="text-sm text-slate-400 mt-2">Carga un archivo "Reg. Inst." usando el botón superior derecho.</p>
            </div>
        );
    }

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                <MetricCard title="Instrumentos Reg." value={derivedData.flatRegs.length} percentage={100} icon={Activity} color="#6366f1" />
                <MetricCard title="Finalizados" value={derivedData.flatRegs.filter(d => d.estadoDoc === "FINALIZADO").length} percentage={derivedData.flatRegs.length > 0 ? ((derivedData.flatRegs.filter(d => d.estadoDoc === "FINALIZADO").length / derivedData.flatRegs.length) * 100) : 0} icon={CheckCircle} color="#15803d" />
                <MetricCard title="En Inspección" value={derivedData.flatRegs.filter(d => d.estadoDoc === "EN INSPECCIÓN").length} percentage={derivedData.flatRegs.length > 0 ? ((derivedData.flatRegs.filter(d => d.estadoDoc === "EN INSPECCIÓN").length / derivedData.flatRegs.length) * 100) : 0} icon={Clock} color="#eab308" />
                <MetricCard title="Laboratorio" value={derivedData.flatRegs.filter(d => d.estadoDoc === "EN LABORATORIO").length} icon={Wrench} color="#f97316" />
                <MetricCard title="Estado Skid" value={`ON: ${derivedData.skidCounts.ON} | OFF: ${derivedData.skidCounts.OFF}`} icon={Box} color="#8b5cf6" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow border border-slate-100 h-80 flex flex-col"><h3 className="text-lg font-bold text-slate-700 mb-4">Estado Documental</h3><div className="flex-1 min-h-0 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={derivedData.docStatusChart} layout="vertical" margin={{top: 5, right: 30, left: 20, bottom: 5}}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" /><YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10}} /><Tooltip /><Bar dataKey="value" fill="#3b82f6" radius={[0,4,4,0]}><LabelList dataKey="value" position="right" /></Bar></BarChart></ResponsiveContainer></div></div>
                <div className="bg-white p-6 rounded-lg shadow border border-slate-100 h-80 flex flex-col"><h3 className="text-lg font-bold text-slate-700 mb-4">Estado del registro</h3><div className="flex-1 min-h-0 w-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={derivedData.regStatusChart} cx="50%" cy="50%" innerRadius={40} outerRadius={70} fill="#8884d8" paddingAngle={5} dataKey="value" label>{derivedData.regStatusChart.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS_LIST[index % COLORS_LIST.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div></div>
                <div className="bg-white p-6 rounded-lg shadow border border-slate-100 h-80 flex flex-col"><h3 className="text-lg font-bold text-slate-700 mb-4">Ubicación Física</h3><div className="flex-1 min-h-0 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={derivedData.physLocationChart.data} layout="vertical" margin={{top: 5, right: 30, left: 20, bottom: 5}}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" /><YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10}} /><Tooltip /><Legend wrapperStyle={{fontSize: "10px"}}/>{derivedData.physLocationChart.keys.map((key, index) => <Bar key={key} dataKey={key} stackId="a" fill={COLORS_LIST[index % COLORS_LIST.length]} />)}</BarChart></ResponsiveContainer></div></div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden border border-slate-200">
                <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-700">Listado de Registros (ABM)</h3>
                    <div className="flex items-center gap-2">{(Object.keys(ui.filters).length > 0) && (<button onClick={clearFilters} className="text-xs flex items-center gap-1 text-red-500 hover:text-red-700 font-medium px-3 py-1 rounded bg-red-50 border border-red-200 transition-colors"><X size={12}/> Limpiar Filtros</button>)}</div>
                </div>
                <div className="overflow-x-auto max-h-[600px]">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-100 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-3 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('tag')}><div className="flex items-center gap-1">TAG <ArrowUpDown size={12}/></div></th>
                                <th className="px-2 py-3 w-32 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('proveedor')}>Lab</th>
                                <th className="px-2 py-3 w-32">Calibración</th><th className="px-2 py-3 w-32">Generado</th><th className="px-2 py-3 w-32">Presentado</th><th className="px-2 py-3 w-32">Devolución</th>
                                <th className="px-6 py-3 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('estadoDoc')}><div className="flex items-center gap-1">Estado Doc. <ArrowUpDown size={12}/></div></th>
                                <th className="px-2 py-3 w-32 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('ubicacionFisica')}>Ubicación</th>
                                <th className="px-2 py-3 w-32">Provisión</th>
                                <th className="px-6 py-3 font-bold text-right cursor-pointer hover:bg-slate-200" onClick={() => handleSort('ubicacionRegistro')}><div className="flex justify-end items-center gap-1">Estado Reg. <ArrowUpDown size={12}/></div></th>
                                <th className="px-2 py-3 text-center w-32">Montado</th><th className="px-2 py-3 text-center w-32">Skid</th>
                            </tr>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-4 py-2"><div className="relative"><input type="text" placeholder="Filtrar TAG..." className="w-full text-xs p-1 border rounded focus:ring-1 focus:ring-blue-500 outline-none font-normal normal-case" value={ui.filters.tag || ''} onChange={(e) => handleFilterChange('tag', e.target.value)} /><Filter size={10} className="absolute right-2 top-2 text-slate-400"/></div></th>
                                <th className="px-2 py-2"><select className="w-full text-xs p-1 border rounded font-normal normal-case" value={ui.filters.proveedor || ''} onChange={(e) => handleFilterChange('proveedor', e.target.value)}><option value="">Todos</option>{derivedData.uniqueValues.proveedor?.map(v => <option key={v} value={v}>{v}</option>)}</select></th>
                                <th className="px-2 py-2"><input type="date" className="w-full text-xs p-1 border rounded focus:ring-1 focus:ring-blue-500 outline-none font-normal normal-case" value={ui.filters.fCalib || ''} onChange={(e) => handleFilterChange('fCalib', e.target.value)} /></th>
                                <th className="px-2 py-2"><input type="date" className="w-full text-xs p-1 border rounded focus:ring-1 focus:ring-blue-500 outline-none font-normal normal-case" value={ui.filters.fechaGen || ''} onChange={(e) => handleFilterChange('fechaGen', e.target.value)} /></th>
                                <th className="px-2 py-2"><input type="date" className="w-full text-xs p-1 border rounded focus:ring-1 focus:ring-blue-500 outline-none font-normal normal-case" value={ui.filters.fechaPres || ''} onChange={(e) => handleFilterChange('fechaPres', e.target.value)} /></th>
                                <th className="px-2 py-2"><input type="date" className="w-full text-xs p-1 border rounded focus:ring-1 focus:ring-blue-500 outline-none font-normal normal-case" value={ui.filters.fechaDev || ''} onChange={(e) => handleFilterChange('fechaDev', e.target.value)} /></th>
                                <th className="px-2 py-2"><select className="w-full text-xs p-1 border rounded font-normal normal-case" value={ui.filters.estadoDoc || ''} onChange={(e) => handleFilterChange('estadoDoc', e.target.value)}><option value="">Todos</option>{derivedData.uniqueValues.estadoDoc?.map(v => <option key={v} value={v}>{v}</option>)}</select></th>
                                <th className="px-2 py-2"><select className="w-full text-xs p-1 border rounded font-normal normal-case" value={ui.filters.ubicacionFisica || ''} onChange={(e) => handleFilterChange('ubicacionFisica', e.target.value)}><option value="">Todos</option>{derivedData.uniqueValues.ubicacionFisica?.map(v => <option key={v} value={v}>{v}</option>)}</select></th>
                                <th className="px-2 py-2"><select className="w-full text-xs p-1 border rounded font-normal normal-case" value={ui.filters.provision || ''} onChange={(e) => handleFilterChange('provision', e.target.value)}><option value="">Todos</option>{derivedData.uniqueValues.provision?.map(v => <option key={v} value={v}>{v}</option>)}</select></th>
                                <th className="px-2 py-2"><select className="w-full text-xs p-1 border rounded font-normal normal-case" value={ui.filters.ubicacionRegistro || ''} onChange={(e) => handleFilterChange('ubicacionRegistro', e.target.value)}><option value="">Todos</option>{derivedData.uniqueValues.ubicacionRegistro?.map(v => <option key={v} value={v}>{v}</option>)}</select></th>
                                <th className="px-2 py-2"><select className="w-full text-xs p-1 border rounded font-normal normal-case" value={ui.filters.montado || ''} onChange={(e) => handleFilterChange('montado', e.target.value)}><option value="">Todos</option>{derivedData.uniqueValues.montado?.map(v => <option key={v} value={v}>{v}</option>)}</select></th>
                                <th className="px-2 py-2"><select className="w-full text-xs p-1 border rounded font-normal normal-case" value={ui.filters.skid || ''} onChange={(e) => handleFilterChange('skid', e.target.value)}><option value="">Todos</option>{derivedData.uniqueValues.skid?.map(v => <option key={v} value={v}>{v}</option>)}</select></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedRegs.map((row, idx) => (
                                <tr key={row.tag || idx} className="bg-white hover:bg-slate-50">
                                    <td className="px-6 py-3 font-medium">{row.tag}</td>
                                    <td className="px-2 py-1"><select disabled={!access.canEdit} className="border border-slate-200 rounded px-1.5 py-0.5 text-xs w-full bg-white outline-none disabled:bg-slate-50" value={row.proveedor === "Sin Prov." ? "" : row.proveedor} onChange={(e) => handleRegEdit(row.tag, 'lab', e.target.value)}><option value="">-</option>{derivedData.uniqueValues.proveedor?.map(lab => <option key={lab} value={lab}>{lab}</option>)}</select></td>
                                    <td className="px-2 py-1"><input disabled={!access.canEdit} type="date" className="border border-slate-200 rounded px-1.5 py-0.5 text-xs w-full disabled:bg-slate-50" value={row.fCalib || ''} onChange={(e) => handleRegEdit(row.tag, 'fCalib', e.target.value)}/></td>
                                    <td className="px-2 py-1"><input disabled={!access.canEdit || !row.fCalib} type="date" className="border border-slate-200 rounded px-1.5 py-0.5 text-xs w-full disabled:bg-slate-50" value={row.fechaGen} onChange={(e) => handleRegEdit(row.tag, 'fGen', e.target.value)}/></td>
                                    <td className="px-2 py-1"><input disabled={!access.canEdit || !row.fechaGen} type="date" className="border border-slate-200 rounded px-1.5 py-0.5 text-xs w-full disabled:bg-slate-50" value={row.fechaPres} onChange={(e) => handleRegEdit(row.tag, 'fPres', e.target.value)}/></td>
                                    <td className="px-2 py-1"><input disabled={!access.canEdit || !row.fechaPres} type="date" className="border border-slate-200 rounded px-1.5 py-0.5 text-xs w-full disabled:bg-slate-50" value={row.fechaDev} onChange={(e) => handleRegEdit(row.tag, 'fDev', e.target.value)}/></td>
                                    <td className="px-6 py-3"><span className={`px-2 py-1 rounded text-xs font-bold ${row.estadoDoc === 'FINALIZADO' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{row.estadoDoc}</span></td>
                                    <td className="px-2 py-1"><select disabled={!access.canEdit} className="border border-slate-200 rounded px-1.5 py-0.5 text-xs w-full bg-white outline-none disabled:bg-slate-50" value={row.ubicacionFisica === "Sin Dato" ? "" : row.ubicacionFisica} onChange={(e) => handleRegEdit(row.tag, 'ubicacion', e.target.value)}><option value="">-</option>{derivedData.uniqueValues.ubicacionFisica?.map(loc => <option key={loc} value={loc}>{loc}</option>)}</select></td>
                                    <td className="px-2 py-1"><select disabled={!access.canEdit} className="border border-slate-200 rounded px-1.5 py-0.5 text-xs w-full bg-white outline-none disabled:bg-slate-50" value={row.provision === "Sin Dato" ? "" : row.provision} onChange={(e) => handleRegEdit(row.tag, 'provision', e.target.value)}><option value="">-</option>{derivedData.uniqueValues.provision?.map(prov => <option key={prov} value={prov}>{prov}</option>)}</select></td>
                                    <td className="px-6 py-3 font-bold text-right text-slate-600">{row.ubicacionRegistro}</td>
                                    <td className="px-2 py-1"><select disabled={!access.canEdit} className="border border-slate-200 rounded px-1.5 py-0.5 text-xs w-full bg-white outline-none disabled:bg-slate-50" value={row.montado} onChange={(e) => handleRegEdit(row.tag, 'montado', e.target.value)}><option value="SIN MONTAR">SIN MONTAR</option><option value="MONTADO">MONTADO</option></select></td>
                                    <td className="px-2 py-1 text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${row.skid === 'Sin Dato' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{row.skid}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <TablePagination totalItems={derivedData.flatRegs.length} itemsPerPage={ui.pageSize} currentPage={ui.regPage} onPageChange={(page) => setUi(prev => ({ ...prev, regPage: page }))} onPageSizeChange={(newSize) => setUi(prev => ({ ...prev, pageSize: newSize, regPage: 1 }))} />
            </div>
        </div>
    );
};

export default DashboardModule;