import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Utils } from '../../../utils/helpers';
import { Calendar, Edit } from 'lucide-react';

const ChartCard = React.memo(({ discipline, activity, rawData, dateColumns, isSourceCumulative, TODAY_ISO, globalTargetDate, onOpenModal }) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);
    const [localTargetDate, setLocalTargetDate] = useState(globalTargetDate);
    const [chartJsLoaded, setChartJsLoaded] = useState(false);

    // Dynamic Chart.js Loader - USANDO UMD EXPLICITAMENTE
    useEffect(() => {
        if (window.Chart) {
            setChartJsLoaded(true);
            return;
        }
        const script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/chart.js/dist/chart.umd.min.js";
        script.async = true;
        script.onload = () => setChartJsLoaded(true);
        document.body.appendChild(script);
    }, []);

    const chartData = useMemo(() => {
        const rowBase = rawData.find(r => r.Disciplina === discipline && r.Actividad === activity && Utils.isLineaBase(r.Curva));
        const rowReal = rawData.find(r => r.Disciplina === discipline && r.Actividad === activity && Utils.isAvanceReal(r.Curva));

        if (!rowBase) return null;

        let actualFromFile = 0, remanenteFromFile = 0, unit = '';

        const getUnit = (row) => {
            if (!row) return '';
            const keyUnit = Object.keys(row).find(k => Utils.normalizeText(k) === 'unidad');
            return keyUnit ? row[keyUnit] : '';
        }
        unit = getUnit(rowReal) || getUnit(rowBase) || '';

        if (rowReal) {
            const keyActual = Object.keys(rowReal).find(k => Utils.normalizeText(k) === 'actual');
            const keyRemanente = Object.keys(rowReal).find(k => Utils.normalizeText(k) === 'remanente');
            if (keyActual) actualFromFile = Utils.parseNumber(rowReal[keyActual]);
            if (keyRemanente) remanenteFromFile = Utils.parseNumber(rowReal[keyRemanente]);
        }

        let calculatedTotalScope = 0;
        if (actualFromFile > 0 || remanenteFromFile > 0) {
            calculatedTotalScope = actualFromFile + remanenteFromFile;
        } else {
            // Calcular scope solo con columnas que existen en el row
            dateColumns.forEach(date => {
                if (rowBase[date] !== undefined) {
                    const val = Utils.parseNumber(rowBase[date]);
                    if (!isSourceCumulative) calculatedTotalScope += val; 
                    else if (val > calculatedTotalScope) calculatedTotalScope = val;
                }
            });
        }
        if (calculatedTotalScope === 0) calculatedTotalScope = Utils.parseNumber(rowBase.Alcance) || 100;

        const baseAccum = [];
        let accBase = 0, baseFinishDate = null, baseAtCutoff = 0;
        let cutoffIndex = -1;
        for (let i = 0; i < dateColumns.length; i++) if (dateColumns[i] <= TODAY_ISO) cutoffIndex = i; else break;
        
        const targetIndex = dateColumns.findIndex(d => d >= localTargetDate);
        const goalIndex = targetIndex !== -1 ? targetIndex : dateColumns.length - 1;

        // Construir Linea Base
        dateColumns.forEach((date, i) => {
            const rawVal = rowBase[date];
            let val = 0;
            
            // Lógica de Padding para Base
            if (isSourceCumulative) {
                if (rawVal === undefined || rawVal === null || rawVal === '') {
                    val = accBase;
                } else {
                    val = Utils.parseNumber(rawVal);
                }
                baseAccum.push(val);
                accBase = val;
            } else {
                val = Utils.parseNumber(rawVal); 
                accBase += val;
                baseAccum.push(accBase);
            }

            if(!baseFinishDate && accBase >= calculatedTotalScope * 0.999) baseFinishDate = date;
            if (i === cutoffIndex) baseAtCutoff = accBase;
        });

        const realAccum = [], fileProjAccum = [], calcProjAccum = [];
        let accReal = 0;

        if (rowReal) {
            dateColumns.forEach((date, i) => {
                const valStr = rowReal[date];
                let val = 0;
                let hasData = (valStr !== undefined && valStr !== null && valStr.toString().trim() !== '');
                
                if (isSourceCumulative) {
                    if (!hasData) val = accReal; 
                    else val = Utils.parseNumber(valStr);
                    if (val < accReal && val === 0) val = accReal; 
                    accReal = val;
                } else {
                    val = Utils.parseNumber(valStr);
                    accReal += val;
                }

                if (i <= cutoffIndex) {
                    if (i === cutoffIndex && actualFromFile > 0) accReal = actualFromFile;
                    realAccum.push(accReal); fileProjAccum.push(null); calcProjAccum.push(null);
                } else {
                    realAccum.push(null);
                    if (hasData || (isSourceCumulative && accReal > 0)) fileProjAccum.push(accReal);
                    else fileProjAccum.push(null);
                    calcProjAccum.push(null);
                }
            });
        }

        const pivotValue = (cutoffIndex >= 0) ? realAccum[cutoffIndex] : 0;
        if (cutoffIndex >= 0 && cutoffIndex < dateColumns.length) {
            fileProjAccum[cutoffIndex] = pivotValue; calcProjAccum[cutoffIndex] = pivotValue;
        }

        let slope = 0;
        const weeksToGo = goalIndex - cutoffIndex;
        const gap = remanenteFromFile > 0 ? remanenteFromFile : (calculatedTotalScope - pivotValue);

        if (weeksToGo > 0 && gap > 0) slope = gap / weeksToGo;

        let currCalc = pivotValue;
        for (let i = cutoffIndex + 1; i < dateColumns.length; i++) {
            if (currCalc < calculatedTotalScope) {
                currCalc += slope;
                if (currCalc > calculatedTotalScope) currCalc = calculatedTotalScope;
            }
            calcProjAccum[i] = currCalc;
        }

        const pctReal = calculatedTotalScope > 0 ? ((pivotValue / calculatedTotalScope) * 100) : 0;
        const pctBase = calculatedTotalScope > 0 ? ((baseAtCutoff / calculatedTotalScope) * 100) : 0;
        const gapPct = calculatedTotalScope > 0 ? ((gap / calculatedTotalScope) * 100).toFixed(1) : 0;
        const deviationAbsolute = pivotValue - baseAtCutoff;
        let deviationPct = (pctReal - pctBase).toFixed(1);

        return {
            labels: dateColumns,
            datasets: [
                { label: 'Línea Base', data: baseAccum, borderColor: '#2563eb', borderWidth: 2, pointRadius: 0, order: 3 },
                { label: 'Real', data: realAccum, borderColor: '#ea580c', borderWidth: 3, pointRadius: 1, fill: false, spanGaps: false, order: 1 },
                { label: 'Proy. Archivo', data: fileProjAccum, borderColor: '#fb923c', borderDash: [2, 2], borderWidth: 2, pointRadius: 0, spanGaps: true, order: 2 },
                { label: 'Proy. Objetivo', data: calcProjAccum, borderColor: '#16a34a', borderDash: [5, 5], borderWidth: 2, pointRadius: 0, spanGaps: true, order: 1 },
            ],
            kpi: { 
                totalScope: calculatedTotalScope, currentProgress: pivotValue, baseAtCutoff: baseAtCutoff,
                deviation: deviationAbsolute, deviationPct: deviationPct, pct: pctReal.toFixed(1),
                remanente: gap, remanentePct: gapPct, cutoffIndex: cutoffIndex, projectionRate: slope, unit: unit
            }
        };
    }, [rawData, discipline, activity, dateColumns, isSourceCumulative, localTargetDate, TODAY_ISO]);

    useEffect(() => {
        if (!chartData || !chartRef.current || !chartJsLoaded) return;
        if (chartInstance.current) chartInstance.current.destroy();

        const ctx = chartRef.current.getContext('2d');
        const valueLabelPlugin = {
            id: 'valueLabels',
            afterDatasetsDraw: (chart) => {
                const { ctx } = chart;
                const idx = chartData.kpi.cutoffIndex;
                if (idx === -1) return;
                const metaBase = chart.getDatasetMeta(0);
                const metaReal = chart.getDatasetMeta(1);
                if (!metaBase.data[idx] || !metaReal.data[idx]) return;
                const xPos = metaBase.data[idx].x;
                const yBase = metaBase.data[idx].y;
                const yReal = metaReal.data[idx].y;

                ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
                const valBase = chartData.kpi.baseAtCutoff.toLocaleString('es-ES', { maximumFractionDigits: 0 });
                const valReal = chartData.kpi.currentProgress.toLocaleString('es-ES', { maximumFractionDigits: 0 });

                ctx.fillStyle = '#ea580c'; ctx.fillText(valReal, xPos + 6, yReal - 6);
                ctx.beginPath(); ctx.arc(xPos, yReal, 3, 0, 2 * Math.PI); ctx.fill();

                ctx.fillStyle = '#2563eb'; ctx.fillText(valBase, xPos + 6, yBase + 6);
                ctx.beginPath(); ctx.arc(xPos, yBase, 3, 0, 2 * Math.PI); ctx.fill();
                
                ctx.save(); ctx.beginPath(); ctx.moveTo(xPos, chart.chartArea.top); ctx.lineTo(xPos, chart.chartArea.bottom);
                ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(100, 116, 139, 0.5)'; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.restore();
            }
        };

        chartInstance.current = new window.Chart(ctx, {
            type: 'line', data: chartData, plugins: [valueLabelPlugin],
            options: {
                responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
                plugins: { legend: { display: true, position: 'top', labels: { boxWidth: 10, font: { size: 10 } } }, tooltip: { enabled: true } },
                scales: {
                    x: { 
                        grid: { display: false },
                        ticks: { display: true, autoSkip: true, maxTicksLimit: 12, maxRotation: 45, minRotation: 45, font: { size: 9 }, callback: function(val) { const label = this.getLabelForValue(val); if(!label) return ''; const parts = label.split('-'); if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`; return label; } }
                    },
                    y: { display: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } }
                },
                layout: { padding: { right: 20, top: 20, bottom: 10 } }
            }
        });
        return () => { if (chartInstance.current) chartInstance.current.destroy(); };
    }, [chartData, chartJsLoaded]);

    if (!chartData) return null;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col h-full hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
                <div><h3 className="font-bold text-slate-800 text-sm leading-tight">{activity}</h3><p className="text-xs text-slate-500">{discipline}</p></div>
                <div className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-2 ${chartData.kpi.deviation >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <span className="text-xs text-slate-500 font-normal border-r border-slate-300 pr-2 mr-1" title="Tasa Semanal Objetivo">{chartData.kpi.projectionRate > 0 ? chartData.kpi.projectionRate.toLocaleString('es-ES', {maximumFractionDigits:0}) + ' ' + chartData.kpi.unit + '/sem' : '-'}</span>
                    {chartData.kpi.deviation >= 0 ? '+' : ''}{chartData.kpi.deviationPct}%
                </div>
            </div>
            <div className="flex-1 w-full min-h-[220px] relative"><canvas ref={chartRef}></canvas></div>
            <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-4 text-xs">
                <div className="flex flex-col">
                    <span className="text-slate-400 font-medium uppercase tracking-wider mb-1">Avance Real</span>
                    <div className="flex items-baseline gap-1"><span className="text-lg font-bold text-slate-800">{chartData.kpi.pct}%</span><span className="text-slate-500">({chartData.kpi.currentProgress.toLocaleString('es-ES', {maximumFractionDigits:0})} {chartData.kpi.unit})</span></div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden"><div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${Math.min(chartData.kpi.pct, 100)}%` }}></div></div>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-slate-400 font-medium uppercase tracking-wider mb-1">Faltante</span>
                    <div className="flex items-baseline gap-1"><span className="text-lg font-bold text-amber-600">{chartData.kpi.remanentePct}%</span><span className="text-slate-500">({chartData.kpi.remanente.toLocaleString('es-ES', {maximumFractionDigits:0})} {chartData.kpi.unit})</span></div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden flex justify-end"><div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${Math.min(chartData.kpi.remanentePct, 100)}%` }}></div></div>
                </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 relative">
                    <input type="date" value={localTargetDate} onChange={(e) => setLocalTargetDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs w-full focus:outline-none focus:border-blue-400 text-slate-600"/>
                    <span className="absolute right-2 top-1.5 pointer-events-none text-slate-400"><Calendar className="w-3 h-3" /></span>
                </div>
                <button onClick={() => onOpenModal(discipline, activity, localTargetDate)} className="py-1.5 px-3 bg-blue-50 text-blue-600 text-xs font-medium rounded hover:bg-blue-100 transition-colors flex items-center justify-center gap-1 border border-blue-100"><Edit className="w-3 h-3" /> Carga Cant.</button>
            </div>
        </div>
    );
});

export default ChartCard;