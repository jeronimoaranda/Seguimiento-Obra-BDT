import React, { useMemo, useState, useCallback } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { MetricCard } from '../../components/ui/Cards';
import { Activity, Zap, Wrench, Target, Hammer, Loader, Layers, ChevronDown, ChevronRight, Boxes, ArrowUpDown } from 'lucide-react';
import { Utils } from '../../utils/helpers';

// --- COMPONENTES INTERNOS ---

const TagEditRow = React.memo(({ tagItem, onEdit, skidOptions, almacenOptions, isReadOnly }) => {
    let rowColor = "hover:bg-slate-50";
    if (tagItem.calculatedStatus === "INSTALADO") rowColor = "bg-green-50/60";
    else if (tagItem.calculatedStatus === "EN PROCESO") rowColor = "bg-yellow-50/60";

    const inputClass = "border border-slate-200 rounded px-1 py-0.5 text-xs w-full text-center outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-transparent disabled:border-none disabled:text-slate-500";
    const selectClass = "border border-slate-200 rounded px-1 py-0.5 text-xs w-full outline-none focus:ring-1 focus:ring-blue-500 bg-white cursor-pointer disabled:bg-transparent disabled:border-none disabled:appearance-none";

    return (
        <tr className={`border-b border-slate-100 transition-colors ${rowColor}`}>
            <td className="px-4 py-2 font-medium text-slate-800 w-32 text-xs">{tagItem.tag}</td>
            <td className="px-4 py-2 text-slate-500 text-[10px] truncate max-w-[150px]" title={tagItem.desc}>{tagItem.desc}</td>
            
            {/* Campos de Avance y Fechas (Alineados con el Header Principal) */}
            <td className="px-1 py-1 w-16"><input disabled={isReadOnly} type="number" min="0" max="100" className={inputClass} value={tagItem.avCons} onChange={(e) => onEdit(tagItem.tag, 'avCons', e.target.value)} placeholder="0%"/></td>
            <td className="px-1 py-1 w-24"><input disabled={isReadOnly} type="date" className={inputClass} value={tagItem.fCons} onChange={(e) => onEdit(tagItem.tag, 'fCons', e.target.value)}/></td>
            
            <td className="px-1 py-1 w-16"><input disabled={isReadOnly} type="number" min="0" max="100" className={inputClass} value={tagItem.avQa} onChange={(e) => onEdit(tagItem.tag, 'avQa', e.target.value)} placeholder="0%"/></td>
            <td className="px-1 py-1 w-24"><input disabled={isReadOnly} type="date" className={inputClass} value={tagItem.fQa} onChange={(e) => onEdit(tagItem.tag, 'fQa', e.target.value)}/></td>
            
            <td className="px-1 py-1 w-24"><input disabled={isReadOnly} type="date" className={inputClass} value={tagItem.fRec} onChange={(e) => onEdit(tagItem.tag, 'fRec', e.target.value)}/></td>
            <td className="px-1 py-1 w-24"><input disabled={isReadOnly} type="date" className={inputClass} value={tagItem.fEnt} onChange={(e) => onEdit(tagItem.tag, 'fEnt', e.target.value)}/></td>

            {/* Campos de Gestión (Estos quedan visualmente bajo los totales si se alinea la tabla interna, o a la derecha) */}
            <td className="px-1 py-1 w-20">
                <select disabled={isReadOnly} className={selectClass} value={tagItem.skid || ""} onChange={(e) => onEdit(tagItem.tag, 'skid', e.target.value)}>
                    <option value="">-</option>{skidOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            </td>
            <td className="px-1 py-1 w-20">
                <select disabled={isReadOnly} className={selectClass} value={tagItem.almacen || ""} onChange={(e) => onEdit(tagItem.tag, 'almacen', e.target.value)}>
                    <option value="">-</option>{almacenOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            </td>
            <td className="px-1 py-1 text-center w-12">
                <select disabled={isReadOnly} className={selectClass} value={tagItem.aCalibrar || "0"} onChange={(e) => onEdit(tagItem.tag, 'aCalibrar', e.target.value)}><option value="0">NO</option><option value="1">SI</option></select>
            </td>
            <td className="px-1 py-1 w-12"><input disabled={isReadOnly} type="number" className={inputClass} value={tagItem.cantRegTot} onChange={(e) => onEdit(tagItem.tag, 'cantRegTot', e.target.value)} placeholder="0"/></td>
            <td className="px-1 py-1 w-12"><input disabled={isReadOnly} type="number" className={inputClass} value={tagItem.cantRegReal} onChange={(e) => onEdit(tagItem.tag, 'cantRegReal', e.target.value)} placeholder="0"/></td>
            <td className="px-2 py-1 text-center w-24">
                 <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${tagItem.calculatedStatus === 'INSTALADO' ? 'text-green-700 bg-green-100 border-green-200' : tagItem.calculatedStatus === 'EN PROCESO' ? 'text-yellow-700 bg-yellow-100 border-yellow-200' : 'text-slate-400 bg-slate-100 border-slate-200'}`}>
                    {tagItem.calculatedStatus}
                 </span>
            </td>
        </tr>
    );
});

const SpecialtyGroup = ({ specialtyName, tags, onEdit, skidOptions, almacenOptions, isReadOnly }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const total = tags.length;
    
    // Cálculos de Resumen
    const mounted = tags.filter(t => t.calculatedStatus === "INSTALADO").length;
    const avgAvCons = Math.round(tags.reduce((a, b) => a + (parseInt(b.avCons)||0), 0) / (total || 1));
    const avgAvQa = Math.round(tags.reduce((a, b) => a + (parseInt(b.avQa)||0), 0) / (total || 1));
    
    // Fechas máximas
    const getMaxDate = (field) => {
        const dates = tags.map(t => t[field]).filter(d => d);
        return dates.length > 0 ? dates.sort().pop() : '-';
    };
    const maxFCons = getMaxDate('fCons');
    const maxFRec = getMaxDate('fRec');

    const iconMap = { "Instrumentación": <Activity size={14} className="text-blue-500"/>, "Electricidad": <Zap size={14} className="text-yellow-500"/>, "Mecánica": <Wrench size={14} className="text-gray-500"/>, "Piping": <Target size={14} className="text-indigo-500"/>, "Civil": <Hammer size={14} className="text-orange-500"/> };
    
    return (
        <div className="border border-slate-200 rounded mb-2 overflow-hidden bg-white shadow-sm">
            <div className="flex justify-between items-center p-2 px-3 cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown size={14} className="text-slate-400"/> : <ChevronRight size={14} className="text-slate-400"/>}
                    <span className="font-bold text-slate-700 text-xs flex items-center gap-2">{iconMap[specialtyName] || <Layers size={14}/>} {specialtyName}</span>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-slate-500 font-medium">
                    <div title="Promedio Avance Construcción">Av. Cons: <span className="text-blue-600 font-bold">{avgAvCons}%</span></div>
                    <div title="Fecha Máxima Construcción">F. Cons: <span className="text-slate-700">{maxFCons}</span></div>
                    <div title="Instalados">Inst: <span className="text-green-600 font-bold">{mounted}/{total}</span></div>
                </div>
            </div>
            {isExpanded && (
                <div className="overflow-x-auto">
                    <table className="w-full text-[10px] text-left">
                        <thead className="bg-slate-100 text-slate-500 uppercase border-y border-slate-200">
                            <tr>
                                <th className="px-4 py-2 font-semibold">TAG</th>
                                <th className="px-4 py-2 font-semibold">Descripción</th>
                                <th className="px-1 py-2 font-semibold text-center">Av. Cons</th>
                                <th className="px-1 py-2 font-semibold text-center">F. Cons</th>
                                <th className="px-1 py-2 font-semibold text-center">Av. QAQC</th>
                                <th className="px-1 py-2 font-semibold text-center">F. QAQC</th>
                                <th className="px-1 py-2 font-semibold text-center">F. Recorri</th>
                                <th className="px-1 py-2 font-semibold text-center">F. Entreg</th>
                                <th className="px-1 py-2 font-semibold">Skid</th>
                                <th className="px-1 py-2 font-semibold">Almacén</th>
                                <th className="px-1 py-2 font-semibold text-center">Calib?</th>
                                <th className="px-1 py-2 font-semibold text-center">R. T</th>
                                <th className="px-1 py-2 font-semibold text-center">R. R</th>
                                <th className="px-2 py-2 font-semibold text-center">Estado</th>
                            </tr>
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

    return (
        <>
            <tr className={`bg-white hover:bg-blue-50 transition-colors border-b border-slate-100 cursor-pointer ${isExpanded ? 'bg-slate-50 border-l-4 border-l-blue-500' : ''}`} onClick={onToggle}>
                <td className="px-6 py-4"><div className="flex items-center gap-2 text-slate-500">{isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}<span className="font-medium text-slate-800 text-sm">{sys.sistema}</span></div><div className="text-xs text-slate-400 pl-6">{sys.descSistema}</div></td>
                <td className="px-6 py-4"><div className="font-medium text-slate-700 text-sm">{sys.subsistema}</div><div className="text-xs text-slate-400">{sys.descSubsistema}</div></td>
                
                {/* --- NUEVO ORDEN: Resúmenes en el medio --- */}
                <td className="px-2 py-4 text-center text-xs text-slate-600">{sys.stats.avgAvCons}%</td>
                <td className="px-2 py-4 text-center text-xs text-slate-600 whitespace-nowrap">{sys.stats.maxFCons}</td>
                <td className="px-2 py-4 text-center text-xs text-slate-600">{sys.stats.avgAvQa}%</td>
                <td className="px-2 py-4 text-center text-xs text-slate-600 whitespace-nowrap">{sys.stats.maxFQa}</td>
                <td className="px-2 py-4 text-center text-xs text-slate-600 whitespace-nowrap">{sys.stats.maxFRec}</td>
                <td className="px-2 py-4 text-center text-xs text-slate-600 whitespace-nowrap font-bold text-blue-700">{sys.stats.maxFEnt}</td>

                {/* --- Totales al final --- */}
                <td className="px-6 py-4 text-center font-bold text-slate-700 text-sm">{sys.totalTags}</td>
                <td className="px-6 py-4 text-center"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${sys.mountedTags > 0 ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'}`}>{sys.mountedTags}</span></td>
                <td className="px-6 py-4 text-center"><div className="text-xs font-bold text-slate-600">{sys.percent}%</div><div className="w-full bg-gray-200 rounded-full h-1 mt-1"><div className="bg-blue-600 h-1 rounded-full" style={{width: `${sys.percent}%`}}></div></div></td>
            </tr>
            {isExpanded && (
                <tr><td colSpan="11" className="p-4 bg-slate-50 border-b border-slate-200 shadow-inner"><div className="pl-6"><h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2 tracking-wider"><Boxes size={14}/> Detalle por Especialidad (ABM)</h4>{Object.keys(groupedTags).sort().map(specName => (<SpecialtyGroup key={specName} specialtyName={specName} tags={groupedTags[specName]} onEdit={onEdit} skidOptions={skidOptions} almacenOptions={almacenOptions} isReadOnly={isReadOnly} />))}</div></td></tr>
            )}
        </>
    );
};

// --- MÓDULO PRINCIPAL ---

const SystemsModule = () => {
    const { matrix, edits, loading, saveData } = useData();
    const { user, access } = useAuth();
    const [expandedRows, setExpandedRows] = useState({});
    const [sortConfig, setSortConfig] = useState({ key: 'sistema', direction: 'asc' });

    const options = useMemo(() => {
        if (!matrix) return { skids: [], almacenes: [] };
        const uniqueSkids = new Set();
        const uniqueAlmacenes = new Set();
        matrix.forEach(item => { if (item.skid?.trim()) uniqueSkids.add(item.skid.trim()); if (item.almacen?.trim()) uniqueAlmacenes.add(item.almacen.trim()); });
        uniqueAlmacenes.add("EN OBRA");
        return { skids: Array.from(uniqueSkids).sort(), almacenes: Array.from(uniqueAlmacenes).sort() };
    }, [matrix]);

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

            // Nuevos campos para agregación
            const avCons = Utils.safeParseInt(edit.avCons ?? item.avCons);
            const avQa = Utils.safeParseInt(edit.avQa ?? item.avQa);
            const fCons = edit.fCons ?? item.fCons;
            const fQa = edit.fQa ?? item.fQa;
            const fRec = edit.fRec ?? item.fRec;
            const fEnt = edit.fEnt ?? item.fEnt;

            if (!systems[key]) systems[key] = { 
                id: key, sistema: `${item.sistema} - ${item.descSistema}`, descSistema: item.descSistema, 
                subsistema: `${item.subsistema} - ${item.descSubsistema}`, descSubsistema: item.descSubsistema, 
                totalTags: 0, mountedTags: 0, inProcessTags: 0, tags: [], rawSys: sysCode, rawSub: subCode,
                // Acumuladores para stats
                sumAvCons: 0, sumAvQa: 0, datesFCons: [], datesFQa: [], datesFRec: [], datesFEnt: []
            };

            const s = systems[key];
            s.totalTags++;
            if (isMounted) s.mountedTags++;
            if (state === "EN PROCESO") s.inProcessTags++;
            
            s.sumAvCons += avCons;
            s.sumAvQa += avQa;
            if(fCons) s.datesFCons.push(fCons);
            if(fQa) s.datesFQa.push(fQa);
            if(fRec) s.datesFRec.push(fRec);
            if(fEnt) s.datesFEnt.push(fEnt);

            s.tags.push({ 
                tag: item.tag, desc: item.descripcion, specialty: item.especialidad, calculatedStatus: state,
                skid: edit?.skid ?? item.skid, almacen: edit?.almacen ?? item.almacen, aCalibrar: edit?.aCalibrar ?? item.aCalibrar, 
                cantRegTot: edit?.cantRegTot ?? item.cantRegTot, cantRegReal: edit?.cantRegReal ?? item.cantRegReal,
                avCons, avQa, fCons, fQa, fRec, fEnt
            });
            
            totalTags++; 
            const sp = (item.especialidad || "").toUpperCase();
            let k = null;
            if (sp.includes("INSTRUMENT") || sp.includes("(I)")) k = "I"; else if (sp.includes("ELECTRIC") || sp.includes("(E)")) k = "E"; else if (sp.includes("PIPING") || sp.includes("(P)")) k = "P"; else if (sp.includes("MEC") || sp.includes("(M)")) k = "M"; else if (sp.includes("CIVIL") || sp.includes("(C)")) k = "C";
            if (k) { specsTot[k] += vTot; specs[k] += vReal; }
        });

        const globalProgress = matrixDocTotal > 0 ? ((matrixDocReal/matrixDocTotal)*100).toFixed(2) : "0.00";

        // Calcular promedios finales y fechas máximas por sistema
        const processedSystems = Object.values(systems).map(g => {
            const count = g.totalTags || 1;
            const getMax = (dates) => dates.length > 0 ? dates.sort().pop() : '-';
            
            return {
                ...g, 
                percent: ((g.mountedTags / count) * 100).toFixed(1),
                stats: {
                    avgAvCons: Math.round(g.sumAvCons / count),
                    avgAvQa: Math.round(g.sumAvQa / count),
                    maxFCons: getMax(g.datesFCons),
                    maxFQa: getMax(g.datesFQa),
                    maxFRec: getMax(g.datesFRec),
                    maxFEnt: getMax(g.datesFEnt)
                }
            };
        });

        // Ordenamiento dinámico
        const sorted = processedSystems.sort((a, b) => {
            let valA, valB;
            
            // Mapeo de claves de ordenamiento
            switch(sortConfig.key) {
                case 'avCons': valA = a.stats.avgAvCons; valB = b.stats.avgAvCons; break;
                case 'fCons': valA = a.stats.maxFCons; valB = b.stats.maxFCons; break;
                case 'fEnt': valA = a.stats.maxFEnt; valB = b.stats.maxFEnt; break;
                case 'avance': valA = parseFloat(a.percent); valB = parseFloat(b.percent); break;
                default: // Default by ID (System code)
                    const sysA = String(a.rawSys || "").substring(0, 3); const sysB = String(b.rawSys || "").substring(0, 3);
                    const resSys = sysA.localeCompare(sysB, undefined, { numeric: true, sensitivity: 'base' });
                    if (resSys !== 0) return resSys;
                    valA = String(a.rawSub || "").substring(0, 2); valB = String(b.rawSub || "").substring(0, 2);
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return {
            systems: sorted, globalProgress, totalTagsScope: totalTags, 
            registryStats: { total: matrixDocTotal, real: matrixDocReal }, 
            specialtyStats: [
                { label: "Instrumentación (I)", val: specs.I, tot: specsTot.I, color: "#3b82f6", icon: Activity },
                { label: "Electricidad (E)", val: specs.E, tot: specsTot.E, color: "#eab308", icon: Zap },
                { label: "Piping (P)", val: specs.P, tot: specsTot.P, color: "#6366f1", icon: Target },
                { label: "Mecánica (M)", val: specs.M, tot: specsTot.M, color: "#64748b", icon: Wrench },
                { label: "Civil (C)", val: specs.C, tot: specsTot.C, color: "#f97316", icon: Hammer },
            ]
        };
    }, [matrix, edits, calculateState, sortConfig]);

    const handleTagEdit = (tag, field, value) => {
        if (!access.canEdit) return;
        const updated = { ...edits };
        const newTagEdit = { ...(updated[tag] || {}), [field]: value };
        // Regla: Si completó reales, marcar En Obra (lógica original preservada)
        if (field === 'cantRegReal') {
            const item = matrix.find(d => d.tag === tag);
            const tot = Utils.safeParseInt(newTagEdit.cantRegTot ?? (item?.cantRegTot || 0));
            if (tot > 0 && Utils.safeParseInt(value) >= tot) newTagEdit.almacen = "EN OBRA";
        }
        updated[tag] = newTagEdit;
        saveData(null, null, updated, null, user.email);
    };

    const toggleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    if (loading && (!matrix || matrix.length === 0)) return <div className="flex h-64 justify-center items-center"><Loader className="animate-spin text-blue-500"/></div>;

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
                        <tr>
                            <th className="px-6 py-3 cursor-pointer hover:bg-slate-200" onClick={() => toggleSort('sistema')}>Sistema {sortConfig.key === 'sistema' && <ArrowUpDown size={10} className="inline"/>}</th>
                            <th className="px-6 py-3">Subsistema</th>
                            
                            {/* --- NUEVO ORDEN EN HEADER --- */}
                            <th className="px-2 py-3 text-center cursor-pointer hover:bg-slate-200" onClick={() => toggleSort('avCons')}>Av. Cons {sortConfig.key === 'avCons' && <ArrowUpDown size={10} className="inline"/>}</th>
                            <th className="px-2 py-3 text-center cursor-pointer hover:bg-slate-200" onClick={() => toggleSort('fCons')}>F. Cons {sortConfig.key === 'fCons' && <ArrowUpDown size={10} className="inline"/>}</th>
                            <th className="px-2 py-3 text-center">Av. QAQC</th>
                            <th className="px-2 py-3 text-center">F. QAQC</th>
                            <th className="px-2 py-3 text-center">F. Rec</th>
                            <th className="px-2 py-3 text-center cursor-pointer hover:bg-slate-200" onClick={() => toggleSort('fEnt')}>F. Ent {sortConfig.key === 'fEnt' && <ArrowUpDown size={10} className="inline"/>}</th>
                            
                            {/* --- Totales al final --- */}
                            <th className="px-6 py-3 text-center">Total</th>
                            <th className="px-6 py-3 text-center">Inst.</th>
                            <th className="px-6 py-3 text-center cursor-pointer hover:bg-slate-200" onClick={() => toggleSort('avance')}>Avance {sortConfig.key === 'avance' && <ArrowUpDown size={10} className="inline"/>}</th>
                        </tr>
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