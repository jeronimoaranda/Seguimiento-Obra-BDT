import React from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, Upload } from 'lucide-react';

export const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center gap-3 mb-4 text-red-600"><AlertTriangle size={24} /><h3 className="text-lg font-bold">{title}</h3></div>
                <p className="text-slate-600 mb-6 text-sm">{message}</p>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm">Cancelar</button>
                    <button onClick={onConfirm} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm">Confirmar</button>
                </div>
            </div>
        </div>
    );
};

export const SuccessModal = ({ isOpen, onClose, message }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center gap-3 mb-4 text-green-600"><CheckCircle size={24} /><h3 className="text-lg font-bold">Éxito</h3></div>
                <p className="text-slate-600 mb-6 text-sm">{message}</p>
                <div className="flex justify-end"><button onClick={onClose} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">Aceptar</button></div>
            </div>
        </div>
    );
};

export const ApprovalModal = ({ isOpen, onClose, onConfirm, changes }) => {
    if (!isOpen || !changes) return null;
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center gap-3 mb-4 text-blue-600"><RefreshCw size={24} /><h3 className="text-lg font-bold">Sincronizar</h3></div>
                <div className="bg-slate-50 p-4 rounded border border-slate-200 mb-6 text-sm space-y-2">
                    <div className="flex justify-between"><span>Total:</span> <strong>{changes.total}</strong></div>
                    <div className="flex justify-between text-green-600"><span>Nuevos:</span> <strong>+{changes.newItems}</strong></div>
                    <div className="flex justify-between text-orange-600"><span>Modificados:</span> <strong>~{changes.modified}</strong></div>
                </div>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm">Cancelar</button>
                    <button onClick={onConfirm} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-2"><Upload size={16}/> Subir</button>
                </div>
            </div>
        </div>
    );
};