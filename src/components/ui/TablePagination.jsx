import React from 'react';
import { ChevronLeft } from 'lucide-react';

export const TablePagination = ({ totalItems, itemsPerPage, currentPage, onPageChange, onPageSizeChange }) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    return (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-200 flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>Filas por página:</span>
                <select className="border border-slate-300 rounded px-2 py-1 text-xs outline-none bg-slate-50" value={itemsPerPage} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
                    <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option><option value={totalItems > 0 ? totalItems : 999999}>Todos</option>
                </select>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 hidden sm:inline">{totalItems === 0 ? 'Sin datos' : `${((currentPage - 1) * itemsPerPage) + 1} - ${Math.min(currentPage * itemsPerPage, totalItems)} de ${totalItems}`}</span>
                <div className="flex gap-1">
                    <button onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1 || totalItems === 0} className="p-1 border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronLeft size={16} /></button>
                    <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600 flex items-center">{currentPage} / {totalPages || 1}</span>
                    <button onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages || totalItems === 0} className="p-1 border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transform rotate-180"><ChevronLeft size={16} /></button>
                </div>
            </div>
        </div>
    );
};