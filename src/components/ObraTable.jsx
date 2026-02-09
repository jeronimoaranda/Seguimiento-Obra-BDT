import React, { useState, useMemo } from 'react';
import { Activity, Zap, Wrench, Target, Hammer, ChevronDown, ChevronRight, Layers, Boxes } from 'lucide-react';
import { ProgressBar } from './Metrics';

const TagEditRow = React.memo(({ tagItem, onEdit, skidOptions, almacenOptions, isReadOnly }) => {
    let rowColor = "hover:bg-slate-50";
    if (tagItem.calculatedStatus === "INSTALADO") rowColor = "bg-green-50/60";
    else if (tagItem.calculatedStatus === "EN PROCESO") rowColor = "bg-yellow-50/60";
    const commonClass = "border border-slate-200 rounded px-1.5 py-0.5 text-xs w-full outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:bg-slate-100 disabled:text-slate-400";

    return (
        <tr className={`border-b border-slate-100 transition-colors ${rowColor}`}>
            <td className="px-4 py-2 font-medium text-slate-800 w-32">{tagItem.tag}</td>
            <td className="px-4 py-2 text-slate-500 text-[10px] truncate max-w-[150px]" title={tagItem.desc}>{tagItem.desc}</td>
            <td className="px-2 py-1"><select disabled={isReadOnly} className={`${commonClass} bg-white cursor-pointer`} value={tagItem.skid || ""} onChange={(e) => onEdit(tagItem.tag, 'skid', e.target.value)}><option value="">-</option>{skidOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></td>
            <td className="px-2 py-1"><select disabled={isReadOnly} className={`${commonClass} bg-white cursor-pointer`} value={tagItem.almacen || ""} onChange={(e) => onEdit(tagItem.tag, 'almacen', e.target.value)}><option value="">-</option>{almacenOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></td>
            <td className="px-2 py-1 text-center w-20"><select disabled={isReadOnly} className={`${commonClass} bg-white cursor-pointer text-center`} value={tagItem.aCalibrar || "0"} onChange={(e) => onEdit(tagItem.tag, 'aCalibrar', e.target.value)}><option value="0">NO</option><option value="1">SI</option></select></td>
            <td className="px-2 py-1 w-16"><input disabled={isReadOnly} type="number" className={`${commonClass} text-center`} value={tagItem.cantRegTot} onChange={(e) => onEdit(tagItem.tag, 'cantRegTot', e.target.value)} placeholder="0"/></td>
            <td className="px-2 py-1 w-16"><input disabled={isReadOnly} type="number" className={`${commonClass} text-center`} value={tagItem.cantRegReal} onChange={(e) => onEdit(tagItem.tag, 'cantRegReal', e.target.value)} placeholder="0"/></td>
            <td className="px-2 py-1 text-center w-32"><span className={`text-[10px] font-bold px-2 py-1 rounded border ${tagItem.calculatedStatus === 'INSTALADO' ? 'text-green-700 bg-green-100 border-green-200' : tagItem.calculatedStatus === 'EN PROCESO' ? 'text-yellow-700 bg-yellow-100 border-yellow-200' : 'text-slate-400 bg-slate-100 border-slate-200'}`}>{tagItem.calculatedStatus}</span></td>
        </tr>
    );
});

const SpecialtyGroup = ({ specialtyName, tags, onEdit, skidOptions, almacenOptions, isReadOnly }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const total = tags.length;
    const mounted = tags.filter(t => t.calculatedStatus === "INSTALADO").length;
    const percent = total > 0 ? ((mounted / total) * 100).toFixed(0) : 0;
    const iconMap = { "Instrumentación": <Activity size={14} className="text-blue-500"/>, "Electricidad": <Zap size={14} className="text-yellow-500"/>, "Mecánica": <Wrench size={14} className="text-gray-500"/>, "Piping": <Target size={14} className="text-indigo-500"/>, "Civil": <Hammer size={14} className="text-orange-500"/> };
    
    return (
        <div className="border border-slate-200 rounded mb-2 overflow-hidden bg-white shadow-sm">
            <div className="flex justify-between items-center p-2 px-3 cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown size={14} className="text-slate-400"/> : <ChevronRight size={14} className="text-slate-400"/>}
                    <span className="font-bold text-slate-700 text-xs flex items-center gap-2">{iconMap[specialtyName] || <Layers size={14}/>} {specialtyName}</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-500 font-medium">{mounted}/{total} Inst.</span>
                    <div className="w-16 bg-gray-200 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${percent == 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${percent}%` }}></div></div>
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

export const ExpandableRow = ({ sys, isExpanded, onToggle, onEdit, skidOptions, almacenOptions, isReadOnly }) => {
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
                <td className="px-6 py-4 text-center font-bold text-slate-700 text-sm">{sys.totalTags}</td>
                <td className="px-6 py-4 text-center"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${sys.mountedTags > 0 ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'}`}>{sys.mountedTags}</span></td>
                <td className="px-6 py-4"><div className="flex items-center gap-3"><span className="text-xs font-bold w-8 text-right">{sys.percent}%</span><ProgressBar current={sys.mountedTags} total={sys.totalTags} color={parseFloat(sys.percent) === 100 ? 'bg-green-600' : parseFloat(sys.percent) > 50 ? 'bg-blue-600' : 'bg-orange-400'} /></div></td>
            </tr>
            {isExpanded && (
                <tr><td colSpan="5" className="p-4 bg-slate-50 border-b border-slate-200 shadow-inner"><div className="pl-6"><h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2 tracking-wider"><Boxes size={14}/> Detalle por Especialidad (ABM)</h4>{Object.keys(groupedTags).sort().map(specName => (<SpecialtyGroup key={specName} specialtyName={specName} tags={groupedTags[specName]} onEdit={onEdit} skidOptions={skidOptions} almacenOptions={almacenOptions} isReadOnly={isReadOnly} />))}</div></td></tr>
            )}
        </>
    );
};