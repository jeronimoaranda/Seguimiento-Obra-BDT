import React from 'react';
import { Activity } from 'lucide-react';

export const MetricCard = ({ title, value, icon: Icon, color, subtext, percentage, compact }) => (
    <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 relative overflow-hidden group hover:shadow-md transition-all" style={{ borderLeftColor: color }}>
        <div className="flex justify-between items-center z-10 relative">
            <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{title}</p>
                <h3 className={`${compact ? 'text-lg' : 'text-xl'} font-bold text-slate-700 flex items-baseline gap-2 mt-1`}>
                    {value}
                    {percentage !== undefined && <span className="text-xs font-normal text-slate-400">({typeof percentage === 'number' ? percentage.toFixed(0) : percentage}%)</span>}
                </h3>
            </div>
            <div className={`p-2 rounded-full bg-opacity-10 group-hover:scale-110 transition-transform`} style={{ backgroundColor: `${color}20` }}>
                {Icon ? <Icon size={compact ? 20 : 24} color={color} /> : <Activity size={24} color={color}/>}
            </div>
        </div>
        {percentage !== undefined && (
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3">
                <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${percentage}%`, backgroundColor: color }}></div>
            </div>
        )}
        {subtext && <p className="text-xs text-slate-400 mt-2 z-10 relative">{subtext}</p>}
    </div>
);

export const ProgressBar = ({ current, total, color = "bg-blue-600" }) => {
    const percent = total > 0 ? Math.min(100, (current / total) * 100) : 0;
    return (
        <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
            <div className={`h-2 rounded-full transition-all duration-500 ${color}`} style={{ width: `${percent}%` }}></div>
        </div>
    );
};