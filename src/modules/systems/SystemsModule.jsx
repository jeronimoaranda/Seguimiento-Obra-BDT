import React, { useMemo, useState, useCallback } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { MetricCard } from '../../components/ui/Cards';
import { Activity, Zap, Wrench, Target, Hammer, Loader, Layers, ChevronDown, ChevronRight, Boxes } from 'lucide-react';
import { Utils } from '../../utils/helpers';

// --- COMPONENTES INTERNOS (Filas y Grupos) ---

const TagEditRow = React.memo(({ tagItem, onEdit, skidOptions, almacenOptions, isReadOnly }) => {
    let rowColor = "hover:bg-slate-50";
    if (tagItem.calculatedStatus === "INSTALADO") rowColor = "bg-green-50/60";
    else if (tagItem.calculatedStatus === "EN PROCESO") rowColor = "bg-yellow-50/60";

    const commonClass = "border border-slate-200 rounded px-1.5 py-0.5 text-xs w-full outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:bg-slate-100 disabled:text-slate-400";

    return (
        <tr className={`border-b border-slate-100 transition-colors ${rowColor}`}>
            <td className="px-4 py-2 font-medium text-slate-800 w-32">{tagItem.tag}</td>
            <td className="px-4 py-2 text-slate-500 text-[10px] truncate max-w-[150px]" title={tagItem.desc}>{tagItem.desc}</td>
            <td className="px-2 py-1">
                <select disabled={isReadOnly} className={`${commonClass} bg-white cursor-pointer`} value={tagItem.skid || ""} onChange={(e) => onEdit(tagItem.tag, 'skid', e.target.value)}>
                    <option value="">-</option>
                    {skidOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            </td>
            <td className="px-2 py-1">
                <select disabled={isReadOnly} className={`${commonClass} bg-white cursor-pointer`} value={tagItem.almacen || ""} onChange={(e) => onEdit(tagItem.tag, 'almacen', e.target.value)}>
                    <option value="">-</option>
                    {almacenOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            </td>
            <td className="px-2 py-1 text-center w-20">
                <select disabled={isReadOnly} className={`${commonClass} bg-white cursor-pointer text-center`} value={tagItem.aCalibrar || "0"} onChange={(e) => onEdit(tagItem.tag, 'aCalibrar', e.target.value)}>
                    <option value="0">NO</option>
                    <option value="1">SI</option>
                </select>
            </td>
            <td className="px-2 py-1 w-16"><input disabled={isReadOnly} type="number" className={`${commonClass} text-center`} value={tagItem.cantRegTot} onChange={(e) => onEdit(tagItem.tag, 'cantRegTot', e.target.value)} placeholder="0"/></td>
            <td className="px-2 py-1 w-16"><input disabled={isReadOnly} type="number" className={`${commonClass} text-center`} value={tagItem.cantRegReal} onChange={(e) => onEdit(tagItem.tag, 'cantRegReal', e.target.value)} placeholder="0"/></td>
            <td className="px-2 py-1 text-center w-32">
                 <span className={`text-[10px] font-bold px-2 py-1 rounded border ${tagItem.calculatedStatus === 'INSTALADO' ? 'text-green-700 bg-green-100 border-green-200' : tagItem.calculatedStatus === 'EN PROCESO' ? 'text-yellow-700 bg-yellow-100 border-yellow-200' : 'text-slate-400 bg-slate-100 border-slate-200'}`}>
                    {tagItem.calculatedStatus}
                 </span>
            </td>
        </tr>
    );
});

const SpecialtyGroup = ({ specialtyName, tags, onEdit, skidOptions, almacenOptions, isReadOnly }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const total = tags.length;
    
    // Instalados
    const mounted = tags.filter(t => t.calculatedStatus === "INSTALADO").length;
    const percentMounted = total > 0 ? ((mounted / total) * 100).toFixed(0) : 0;
    
    // En Proceso
    const inProcess = tags.filter(t => t.calculatedStatus === "EN PROCESO").length;
    const percentProcess = total > 0 ? ((inProcess / total) * 100).toFixed(0) : 0;

    const iconMap = { "Instrumentación": <Activity size={14} className="text-blue-500"/>, "Electricidad": <Zap size={14} className="text-yellow-500"/>, "Mecánica": <Wrench size={14} className="text-gray-500"/>, "Piping": <Target size={14} className="text-indigo-500"/>, "Civil": <Hammer size={14} className="text-orange-500"/> };
    
    return (
        <div className="border border-slate-200 rounded mb-2 overflow-hidden bg-white shadow-sm">
            <div className="flex justify-between items-center p-2 px-3 cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown size={14} className="text-slate-400"/> : <ChevronRight size={14} className="text-slate-400"/>}
                    <span className="font-bold text-slate-700 text-xs flex items-center gap-2">{iconMap[specialtyName] || <Layers size={14}/>} {specialtyName}</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-yellow-600 font-medium">{inProcess} Proc.</span>
                        <div className="w-16 bg-gray-200 rounded-full h-1.5"><div className="h-1.5 rounded-full bg-yellow-500" style={{ width: `${percentProcess}%` }}></div></div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-medium">{mounted}/{total} Inst.</span>
                        <div className="w-16 bg-gray-200 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${percentMounted == 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${percentMounted}%` }}></div></div>
                    </div>
                </div>
            </div>
            {isExpanded && (
                <div className="overflow-x-auto">
                    <table className="w-full text-[10px] text-left">
                        <thead className="bg-slate-100 text-slate-500 uppercase border-y border-slate-200">
                            <tr><th className="px-4 py-2 font-semibold">TAG</th><th className="px-4 py-2 font-semibold">Descripción</th><th className="px-2 py-2 font-semibold w-24">Skid</th><th className="px-2 py-2 font-semibold w-24">Almacén</th><th className="px-2 py-2 font-semibold text-center w-16">Calib?</th><th className="px-2 py-2 font-semibold text-center w-16">R. Tot</th><th className="px-2 py-2 font-semibold text-center w-16">R. Real</th><th className="px-2 py-2 font-semibold text-center w-32">Estado</th></tr>
                        </thead>
                        <tbody>{tags.map((tagItem) => <TagEditRow key={tagItem.tag} tagItem={tagItem} onEdit={onEdit} skidOptions={skidOptions} almacenOptions={almacenOptions} isReadOnly={isReadOnly} />)}</tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const ExpandableRow = ({ sys, isExpanded, onToggle, onEdit, skidOptions, almacenOptions, isReadOnly }) => {
    const groupedTags = useMemo(() => {
        const groups = {};
        sys.tags.forEach(t => { const spec = t.specialty || "Sin Especialidad"; if (!groups[spec]) groups[spec] = []; groups[spec].push(t); });
        return groups;
    }, [sys.tags]);

    const percentProcess = sys.totalTags > 0 ? ((sys.inProcessTags / sys.totalTags) * 100).toFixed(0) : 0;

    return (
        <>
            <tr className={`bg-white hover:bg-blue-50 transition-colors border-b border-slate-100 cursor-pointer ${isExpanded ? 'bg-slate-50 border-l-4 border-l-blue-500' : ''}`} onClick={onToggle}>
                <td className="px-6 py-4"><div className="flex items-center gap-2 text-slate-500">{isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}<span className="font-medium text-slate-800 text-sm">{sys.sistema}</span></div><div className="text-xs text-slate-400 pl-6">{sys.descSistema}</div></td>
                <td className="px-6 py-4"><div className="font-medium text-slate-700 text-sm">{sys.subsistema}</div><div className="text-xs text-slate-400">{sys.descSubsistema}</div></td>
                <td className="px-6 py-4 text-center font-bold text-slate-700 text-sm">{sys.totalTags}</td>
                <td className="px-6 py-4 text-center"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${sys.mountedTags > 0 ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'}`}>{sys.mountedTags}</span></td>
                <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2" title="Instalado (Completado)">
                            <span className="text-[10px] font-bold w-6 text-right text-slate-500">{sys.percent}%</span>
                            <div className="w-24 bg-slate-100 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${parseFloat(sys.percent) === 100 ? 'bg-green-600' : parseFloat(sys.percent) > 50 ? 'bg-blue-600' : 'bg-orange-400'}`} style={{ width: `${sys.percent}%` }}></div></div>
                        </div>
                        <div className="flex items-center gap-2" title="En Proceso (Iniciado)">
                            <span className="text-[10px] font-bold w-6 text-right text-yellow-600">{percentProcess}%</span>
                            <div className="w-24 bg-slate-100 rounded-full h-1.5"><div className="h-1.5 rounded-full bg-yellow-500" style={{ width: `${percentProcess}%` }}></div></div>
                        </div>
                    </div>
                </td>
            </tr>
            {isExpanded && (
                <tr><td colSpan="5" className="p-4 bg-slate-50 border-b border-slate-200 shadow-inner"><div className="pl-6"><h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2 tracking-wider"><Boxes size={14}/> Detalle por Especialidad (ABM)</h4>{Object.keys(groupedTags).sort().map(specName => (<SpecialtyGroup key={specName} specialtyName={specName} tags={groupedTags[specName]} onEdit={onEdit} skidOptions={skidOptions} almacenOptions={almacenOptions} isReadOnly={isReadOnly} />))}</div></td></tr>
            )}
        </>
    );
};

// --- MÓDULO PRINCIPAL ---

const SystemsModule = () => {
    const { matrix, edits, loading, saveData } = useData();
    const { user, access } = useAuth();
    const [expandedRows, setExpandedRows] = useState({});

    // Opciones para Selects (Extraído de los datos)
    const options = useMemo(() => {
        if (!matrix) return { skids: [], almacenes: [] };
        const uniqueSkids = new Set();
        const uniqueAlmacenes = new Set();
        matrix.forEach(item => { if (item.skid?.trim()) uniqueSkids.add(item.skid.trim()); if (item.almacen?.trim()) uniqueAlmacenes.add(item.almacen.trim()); });
        uniqueAlmacenes.add("EN OBRA");
        return { skids: Array.from(uniqueSkids).sort(), almacenes: Array.from(uniqueAlmacenes).sort() };
    }, [matrix]);

    // Función de cálculo de estado de TAG
    const calculateState = useCallback((item, edit) => {
        const tot = Utils.safeParseInt(edit?.cantRegTot ?? item.cantRegTot);
        const real = Utils.safeParseInt(edit?.cantRegReal ?? item.cantRegReal);
        if (tot > 0 && real >= tot) return "INSTALADO";
        if (real > 0 && real < tot) return "EN PROCESO";
        return "PENDIENTE";
    }, []);

    const derivedData = useMemo(() => {
        if (!matrix) return { systems: [], globalProgress: 0, totalTagsScope: 0, registryStats: { total: 0, real: 0 }, specialtyStats: [] };

        const systems = {}; let totalTags = 0;
        const specs = { "I":0, "E":0, "P":0, "M":0, "C":0 };
        const specsTot = { ...specs };
        let matrixDocTotal = 0; let matrixDocReal = 0;

        matrix.forEach(item => {
            const est1 = (item.estado1 || "").toUpperCase();
            if (est1.includes("ELIMINA")) return; 

            const edit = edits?.[item.tag] || {};
            const vTot = Utils.safeParseInt(edit?.cantRegTot ?? item.cantRegTot);
            const vReal = Utils.safeParseInt(edit?.cantRegReal ?? item.cantRegReal);
            matrixDocTotal += vTot; matrixDocReal += vReal;

            const state = calculateState(item, edit);
            const isMounted = state === "INSTALADO";
            const key = `${item.sistema || '000'}|${item.subsistema || '000'}`;
            const sysCode = item.sistema || '';
            const subCode = item.subsistema || '';

            if (!systems[key]) systems[key] = { 
                id: key, sistema: `${item.sistema} - ${item.descSistema}`, descSistema: item.descSistema, 
                subsistema: `${item.subsistema} - ${item.descSubsistema}`, descSubsistema: item.descSubsistema, 
                totalTags: 0, mountedTags: 0, inProcessTags: 0, tags: [], rawSys: sysCode, rawSub: subCode
            };

            systems[key].totalTags++;
            if (isMounted) systems[key].mountedTags++;
            if (state === "EN PROCESO") systems[key].inProcessTags = (systems[key].inProcessTags || 0) + 1;
            
            systems[key].tags.push({ 
                tag: item.tag, desc: item.descripcion, specialty: item.especialidad, calculatedStatus: state,
                skid: edit?.skid ?? item.skid, almacen: edit?.almacen ?? item.almacen, aCalibrar: edit?.aCalibrar ?? item.aCalibrar, cantRegTot: edit?.cantRegTot ?? item.cantRegTot, cantRegReal: edit?.cantRegReal ?? item.cantRegReal
            });
            
            totalTags++; 
            
            // Stats por Especialidad
            const sp = (item.especialidad || "").toUpperCase();
            let k = null;
            if (sp.includes("INSTRUMENT") || sp.includes("(I)")) k = "I"; else if (sp.includes("ELECTRIC") || sp.includes("(E)")) k = "E"; else if (sp.includes("PIPING") || sp.includes("(P)")) k = "P"; else if (sp.includes("MEC") || sp.includes("(M)")) k = "M"; else if (sp.includes("CIVIL") || sp.includes("(C)")) k = "C";
            if (k) { specsTot[k] += vTot; specs[k] += vReal; }
        });

        const globalProgress = matrixDocTotal > 0 ? ((matrixDocReal/matrixDocTotal)*100).toFixed(2) : "0.00";

        const sortedSystems = Object.values(systems).map(g => ({ ...g, percent: g.totalTags > 0 ? ((g.mountedTags / g.totalTags) * 100).toFixed(1) : "0.0" }))
        .sort((a, b) => {
            const sysA = String(a.rawSys || "").substring(0, 3); const sysB = String(b.rawSys || "").substring(0, 3);
            const resSys = sysA.localeCompare(sysB, undefined, { numeric: true, sensitivity: 'base' });
            if (resSys !== 0) return resSys;
            const subA = String(a.rawSub || "").substring(0, 2); const subB = String(b.rawSub || "").substring(0, 2);
            return subA.localeCompare(subB, undefined, { numeric: true, sensitivity: 'base' });
        });

        return {
            systems: sortedSystems, globalProgress, totalTagsScope: totalTags, 
            registryStats: { total: matrixDocTotal, real: matrixDocReal }, 
            specialtyStats: [
                { label: "Instrumentación (I)", val: specs.I, tot: specsTot.I, color: "#3b82f6", icon: Activity },
                { label: "Electricidad (E)", val: specs.E, tot: specsTot.E, color: "#eab308", icon: Zap },
                { label: "Piping (P)", val: specs.P, tot: specsTot.P, color: "#6366f1", icon: Target },
                { label: "Mecánica (M)", val: specs.M, tot: specsTot.M, color: "#64748b", icon: Wrench },
                { label: "Civil (C)", val: specs.C, tot: specsTot.C, color: "#f97316", icon: Hammer },
            ]
        };
    }, [matrix, edits, calculateState]);

    const handleTagEdit = (tag, field, value) => {
        if (!access.canEdit) return;
        const updated = { ...edits };
        const newTagEdit = { ...(updated[tag] || {}), [field]: value };
        if (field === 'cantRegReal') {
            const item = matrix.find(d => d.tag === tag);
            const tot = Utils.safeParseInt(newTagEdit.cantRegTot ?? (item?.cantRegTot || 0));
            if (tot > 0 && Utils.safeParseInt(value) >= tot) newTagEdit.almacen = "EN OBRA";
        }
        updated[tag] = newTagEdit;
        saveData(null, null, updated, null, user.email);
    };

    if (loading && (!matrix || matrix.length === 0)) return <div className="flex h-64 justify-center items-center"><Loader className="animate-spin text-blue-500"/></div>;

    // Si no hay datos, mostrar mensaje amigable
    if (!matrix || matrix.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96 bg-white rounded-lg border border-dashed border-slate-300">
                <Layers className="w-16 h-16 text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-500">No hay datos de matriz ABM</h3>
                <p className="text-sm text-slate-400 mt-2">Carga un archivo "Matriz ABM" usando el botón superior derecho.</p>
            </div>
        );
    }

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">{derivedData.specialtyStats.map(s => <MetricCard key={s.label} title={s.label} value={`${s.val}/${s.tot}`} icon={s.icon} color={s.color} compact percentage={s.tot>0?(s.val/s.tot)*100:0}/>)}</div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500"><h3 className="text-sm font-medium text-gray-500 uppercase">Subsistemas</h3><p className="text-3xl font-bold text-gray-800">{derivedData.systems.length}</p></div>
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500"><h3 className="text-sm font-medium text-gray-500 uppercase">Total Tags</h3><p className="text-3xl font-bold text-gray-800">{derivedData.totalTagsScope}</p></div>
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-cyan-500"><h3 className="text-sm font-medium text-gray-500 uppercase">Total Registros</h3><div className="flex flex-col"><p className="text-3xl font-bold text-gray-800">{derivedData.registryStats.real} <span className="text-lg text-gray-400 font-normal"> / {derivedData.registryStats.total}</span></p><div className="w-full bg-slate-100 rounded-full h-1.5 mt-2"><div className="h-1.5 rounded-full bg-cyan-500 transition-all duration-500" style={{ width: `${derivedData.registryStats.total > 0 ? (derivedData.registryStats.real / derivedData.registryStats.total) * 100 : 0}%` }}></div></div></div></div>
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-600"><h3 className="text-sm font-medium text-gray-500 uppercase">Avance Global</h3><p className="text-3xl font-bold text-gray-800 flex items-center gap-2">{derivedData.globalProgress}% <Activity size={20} className="text-green-500"/></p></div>
            </div>

            <div className="bg-white rounded shadow overflow-hidden border border-slate-200">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 text-slate-700 uppercase text-xs">
                        <tr><th className="px-6 py-3">Sistema</th><th className="px-6 py-3">Subsistema</th><th className="px-6 py-3 text-center">Total</th><th className="px-6 py-3 text-center">Inst.</th><th className="px-6 py-3">Avance</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {derivedData.systems.map(sys => <ExpandableRow key={sys.id} sys={sys} isExpanded={expandedRows[sys.id]} onToggle={() => setExpandedRows(p => ({...p, [sys.id]: !p[sys.id]}))} onEdit={handleTagEdit} skidOptions={options.skids} almacenOptions={options.almacenes} isReadOnly={!access.canEdit} />)}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SystemsModule;