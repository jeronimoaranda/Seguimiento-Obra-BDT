import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Grid, Activity, Edit, X } from 'lucide-react';
import ChartCard from './ChartCard';
import { Utils } from '../../../utils/helpers';

const SegCantView = ({ quantities, saveData, currentUserEmail, canEdit }) => {
    const [headers, setHeaders] = useState([]); 
    const [chartList, setChartList] = useState([]); 
    const [showInputModal, setShowInputModal] = useState(false);
    const [isSourceCumulative, setIsSourceCumulative] = useState(false); 
    const [manualEntry, setManualEntry] = useState({ date: new Date().toISOString().split('T')[0], value: '' });
    const [currentEditing, setCurrentEditing] = useState({ discipline: '', activity: '' });
    const [cutoffDateISO, setCutoffDateISO] = useState(''); 
    const [globalTargetDate, setGlobalTargetDate] = useState('2026-04-17'); 
    const [availableDates, setAvailableDates] = useState([]); // Nueva lista para el selector

    useEffect(() => {
        if (quantities && quantities.length > 0) {
            // Reconstruir headers basados en los datos
            const allKeys = new Set();
            quantities.forEach(obj => Object.keys(obj).forEach(k => allKeys.add(k)));
            const detectedHeaders = Utils.sortHeaders(Array.from(allKeys));
            setHeaders(detectedHeaders);

            // Calcular Fechas Disponibles (Columnas de fecha en el archivo)
            const dateCols = detectedHeaders.filter(h => !isNaN(Date.parse(h)) && h.includes('-'));
            dateCols.sort((a, b) => new Date(a) - new Date(b));
            setAvailableDates(dateCols);

            // Calcular Fecha de Corte Dinámica Inicial (Semana inmediatamente inferior a Hoy)
            const todayStr = new Date().toISOString().split('T')[0];
            let foundCutoff = '';
            
            for (let i = 0; i < dateCols.length; i++) {
                if (dateCols[i] <= todayStr) {
                    foundCutoff = dateCols[i];
                } else {
                    break; 
                }
            }
            // Si no encuentra fecha anterior (ej. proyecto futuro), usa la primera, o si hay, la encontrada.
            // Si el usuario ya seleccionó una fecha manualmente, respetarla (aunque al recargar data se suele resetear)
            if (!cutoffDateISO) {
                setCutoffDateISO(foundCutoff || (dateCols.length > 0 ? dateCols[0] : todayStr));
            }

            const uniqueCharts = [];
            const seen = new Set();
            quantities.forEach(row => {
                const key = `${row.Disciplina}|${row.Actividad}`;
                if (!seen.has(key) && row.Disciplina && row.Actividad) {
                    seen.add(key);
                    uniqueCharts.push({ discipline: row.Disciplina, activity: row.Actividad });
                }
            });
            setChartList(uniqueCharts);
        } else {
            setHeaders(["Curva", "Disciplina", "Actividad", "Alcance", "Actual", "Remanente", "unidad"]);
            setChartList([]);
            setCutoffDateISO(new Date().toISOString().split('T')[0]);
            setAvailableDates([]);
        }
    }, [quantities]);

    const formatDateForDisplay = (isoStr) => {
        if (!isoStr) return 'Sin datos';
        const parts = isoStr.split('-');
        if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
        return isoStr;
    };

    const normalizedDateColumns = useMemo(() => {
        const rawDates = headers.filter(h => !isNaN(Date.parse(h)) && h.includes('-'));
        if (rawDates.length === 0) return [];

        const sortedDates = [...rawDates].sort((a, b) => new Date(a) - new Date(b));
        const minDate = new Date(sortedDates[0]);
        const maxDate = new Date(sortedDates[sortedDates.length - 1]);
        const fmt = d => d.toISOString().split('T')[0];

        const extraBefore = [];
        for (let i = 4; i >= 1; i--) {
            const d = new Date(minDate);
            d.setDate(d.getDate() - (i * 7));
            extraBefore.push(fmt(d));
        }

        const extraAfter = [];
        for (let i = 1; i <= 4; i++) {
            const d = new Date(maxDate);
            d.setDate(d.getDate() + (i * 7));
            extraAfter.push(fmt(d));
        }

        return [...extraBefore, ...sortedDates, ...extraAfter];
    }, [headers]);

    const openEditModal = (disp, act, dateOverride) => {
        if (!canEdit) { alert("No tienes permisos para editar."); return; }
        setCurrentEditing({ discipline: disp, activity: act });
        const row = quantities.find(r => r.Disciplina === disp && r.Actividad === act && Utils.isAvanceReal(r.Curva));
        const val = row && row[manualEntry.date] ? row[manualEntry.date] : '';
        setManualEntry(prev => ({ ...prev, value: val }));
        setShowInputModal(true);
    };

    const handleSaveEntry = () => {
        if (!currentEditing.discipline || !currentEditing.activity || !manualEntry.date) return;
        
        let newData = [...quantities];
        let idx = newData.findIndex(r => r.Disciplina === currentEditing.discipline && r.Actividad === currentEditing.activity && Utils.isAvanceReal(r.Curva));
        
        if (idx === -1) {
            const baseRow = newData.find(r => r.Disciplina === currentEditing.discipline && r.Actividad === currentEditing.activity);
            newData.push({ 
                Curva: 'Avance Real', Disciplina: currentEditing.discipline, Actividad: currentEditing.activity, 
                Alcance: baseRow?.Alcance, Actual: baseRow?.Actual || 0, Remanente: baseRow?.Remanente || 0, unidad: baseRow?.unidad 
            });
            idx = newData.length - 1;
        }
        newData[idx][manualEntry.date] = parseFloat(manualEntry.value);

        // Recalcular Actual basado en la fecha de corte seleccionada visualmente
        const dateCols = [...headers];
        if (!dateCols.includes(manualEntry.date)) dateCols.push(manualEntry.date);
        
        let newActualTotal = 0;
        let cutoffIdx = -1;
        const validDates = Utils.sortHeaders(dateCols.filter(h => !isNaN(Date.parse(h))));
        
        // Usamos cutoffDateISO para que el cálculo del "Actual" sea consistente con lo que ve el usuario
        const targetCutoff = cutoffDateISO || new Date().toISOString().split('T')[0];
        
        for(let i=0; i<validDates.length; i++) { if(validDates[i] <= targetCutoff) cutoffIdx = i; else break; }
        
        validDates.forEach((d, i) => {
            if (i <= cutoffIdx) {
                const v = Utils.parseNumber(newData[idx][d]);
                if (isSourceCumulative) { if (v > 0) newActualTotal = v; } else { newActualTotal += v; }
            }
        });

        const keyActual = Object.keys(newData[idx]).find(k => Utils.normalizeText(k) === 'actual');
        if(keyActual) newData[idx][keyActual] = newActualTotal;
        else newData[idx]['Actual'] = newActualTotal;

        saveData(null, null, null, newData, currentUserEmail);
        setShowInputModal(false);
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header de la Solapa - Limpio y Responsivo */}
            {/* z-10 para evitar superposición con el menú principal (z-50) */}
            <div className="mb-6 bg-white rounded-xl shadow-sm p-4 md:p-6 sticky top-0 z-10 border border-slate-200">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    {/* Título y Subtítulo - Flexible */}
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 truncate">
                            <Grid className="text-blue-600 w-6 h-6 flex-shrink-0" /> 
                            <span className="truncate">Seguimiento de Cantidades</span>
                        </h1>
                        <div className="flex items-center gap-2 mt-1 text-slate-500 text-sm flex-wrap">
                            <span>Visualización Multi-Actividad |</span>
                            <div className="flex items-center gap-1 bg-slate-100 rounded px-2 py-0.5 border border-slate-200">
                                <span className="text-xs font-bold text-slate-400 uppercase mr-1">Corte:</span>
                                <select 
                                    value={cutoffDateISO} 
                                    onChange={(e) => setCutoffDateISO(e.target.value)}
                                    className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer p-0 border-none focus:ring-0 appearance-none hover:text-blue-600 transition-colors"
                                    title="Cambiar fecha de corte"
                                >
                                    {availableDates.map(d => (
                                        <option key={d} value={d}>{formatDateForDisplay(d)}</option>
                                    ))}
                                    {availableDates.length === 0 && <option value="">Sin fechas disponibles</option>}
                                </select>
                                <Edit size={12} className="text-slate-400 ml-1 pointer-events-none"/>
                            </div>
                        </div>
                    </div>
                    
                    {/* Controles - Alineados a la derecha en Desktop, envolventes en Mobile */}
                    <div className="flex items-center gap-3 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 flex-shrink-0">
                            <span className="text-xs font-bold text-slate-500 uppercase">Meta Global:</span>
                            <input type="date" value={globalTargetDate} onChange={(e) => setGlobalTargetDate(e.target.value)} className="bg-transparent text-sm focus:outline-none text-slate-700" />
                        </div>
                        <button onClick={() => setIsSourceCumulative(!isSourceCumulative)} className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm flex-shrink-0 ${isSourceCumulative ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                            {isSourceCumulative ? 'Datos Acumulados' : 'Datos Semanales'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="">
                {chartList.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {chartList.map((item, index) => (
                            <ChartCard 
                                key={`${item.discipline}-${item.activity}-${index}`}
                                discipline={item.discipline}
                                activity={item.activity}
                                rawData={quantities}
                                dateColumns={normalizedDateColumns} // USAR FECHAS NORMALIZADAS
                                isSourceCumulative={isSourceCumulative}
                                TODAY_ISO={cutoffDateISO} // USAR LA FECHA SELECCIONADA POR EL USUARIO
                                globalTargetDate={globalTargetDate}
                                onOpenModal={openEditModal}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50">
                        <Activity className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-lg font-medium">Sin datos para mostrar</p>
                        <p className="text-sm mt-2">Utilice el menú "Cargar Datos" en la barra superior para importar su CSV.</p>
                    </div>
                )}
            </div>

            {showInputModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Edit className="w-4 h-4 text-blue-600" /> Editar: {currentEditing.activity}</h3>
                            <button onClick={() => setShowInputModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Registro</label><input type="date" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={manualEntry.date} onChange={e => setManualEntry(prev => ({...prev, date: e.target.value}))} /></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Valor {isSourceCumulative ? 'Acumulado' : 'del Periodo'}</label><input type="number" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0.00" value={manualEntry.value} onChange={e => setManualEntry(prev => ({...prev, value: e.target.value}))} /></div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 flex justify-end gap-2 border-t">
                            <button onClick={() => setShowInputModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm">Cancelar</button>
                            <button onClick={handleSaveEntry} disabled={!manualEntry.date} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow disabled:opacity-50 font-medium text-sm">Guardar Cambios</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SegCantView;