import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, currentAppId } from '../../services/firebase';
import { Users, Plus, Trash2, CheckSquare, Square, X } from 'lucide-react';

const UserManagementModal = ({ isOpen, onClose }) => {
    const [usersConfig, setUsersConfig] = useState({});
    const [newEmail, setNewEmail] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !db) return;
        const fetchConfig = async () => {
            setLoading(true);
            try {
                const docRef = doc(db, 'artifacts', currentAppId, 'public', 'data', 'config', 'roles_v2');
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    setUsersConfig(snap.data().users || {});
                } else {
                    // Migración legacy si es necesario
                    const legacyRef = doc(db, 'artifacts', currentAppId, 'public', 'data', 'config', 'roles');
                    const legacySnap = await getDoc(legacyRef);
                    if (legacySnap.exists()) {
                        const admins = legacySnap.data().admins || [];
                        const migrated = {};
                        admins.forEach(email => {
                            migrated[email] = { role: 'admin', tabs: ['dashboard', 'systems'] };
                        });
                        setUsersConfig(migrated);
                    }
                }
            } catch (e) {
                if (e.code !== 'permission-denied') console.error("Error loading users config", e);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, [isOpen]);

    const saveConfig = async (newConfig) => {
        setLoading(true);
        try {
            const docRef = doc(db, 'artifacts', currentAppId, 'public', 'data', 'config', 'roles_v2');
            await setDoc(docRef, { users: newConfig }, { merge: true });
            setUsersConfig(newConfig);
        } catch (e) {
            alert("Error guardando configuración: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = () => {
        if (!newEmail || !newEmail.includes('@')) return;
        const email = newEmail.toLowerCase();
        if (usersConfig[email]) { alert("El usuario ya existe"); return; }
        // Default roles para nuevos usuarios
        const newConfig = { ...usersConfig, [email]: { role: 'viewer', tabs: ['dashboard', 'systems', 'quantities'] } };
        saveConfig(newConfig);
        setNewEmail('');
    };

    const handleUpdateUser = (email, field, value) => {
        const newConfig = { ...usersConfig, [email]: { ...usersConfig[email], [field]: value } };
        saveConfig(newConfig);
    };

    const handleToggleTab = (email, tab) => {
        const currentTabs = usersConfig[email]?.tabs || [];
        let newTabs;
        if (currentTabs.includes(tab)) newTabs = currentTabs.filter(t => t !== tab);
        else newTabs = [...currentTabs, tab];
        handleUpdateUser(email, 'tabs', newTabs);
    };

    const handleRemoveUser = (email) => {
        if (!confirm(`¿Eliminar configuración para ${email}?`)) return;
        const newConfig = { ...usersConfig };
        delete newConfig[email];
        saveConfig(newConfig);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[80vh]">
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2 text-blue-600"><Users size={24} /><h3 className="text-lg font-bold">Gestión de Accesos Avanzada</h3></div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                <div className="flex gap-2 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="flex-1 border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" placeholder="usuario@empresa.com"/>
                    <button onClick={handleAddUser} disabled={loading || !newEmail} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"><Plus size={16}/> Agregar Usuario</button>
                </div>
                <div className="overflow-y-auto flex-1">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
                            <tr>
                                <th className="px-4 py-3">Usuario</th>
                                <th className="px-4 py-3">Rol</th>
                                <th className="px-2 py-3 text-center" title="Instrumentación">Inst.</th>
                                <th className="px-2 py-3 text-center" title="Sistemas">Sist.</th>
                                <th className="px-2 py-3 text-center" title="Cantidades">Cant.</th>
                                <th className="px-4 py-3 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {Object.entries(usersConfig).map(([email, config]) => (
                                <tr key={email} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 font-medium text-slate-700">{email}</td>
                                    <td className="px-4 py-3">
                                        <select value={config.role} onChange={(e) => handleUpdateUser(email, 'role', e.target.value)} className="border rounded px-2 py-1 text-xs bg-white outline-none focus:border-blue-500">
                                            <option value="viewer">Visualizador</option>
                                            <option value="admin">Administrador</option>
                                        </select>
                                    </td>
                                    <td className="px-2 py-3 text-center"><button onClick={() => handleToggleTab(email, 'dashboard')} className={`p-1 rounded ${config.tabs?.includes('dashboard') ? 'text-green-600 bg-green-50' : 'text-slate-300'}`}>{config.tabs?.includes('dashboard') ? <CheckSquare size={18}/> : <Square size={18}/>}</button></td>
                                    <td className="px-2 py-3 text-center"><button onClick={() => handleToggleTab(email, 'systems')} className={`p-1 rounded ${config.tabs?.includes('systems') ? 'text-green-600 bg-green-50' : 'text-slate-300'}`}>{config.tabs?.includes('systems') ? <CheckSquare size={18}/> : <Square size={18}/>}</button></td>
                                    <td className="px-2 py-3 text-center"><button onClick={() => handleToggleTab(email, 'quantities')} className={`p-1 rounded ${config.tabs?.includes('quantities') ? 'text-green-600 bg-green-50' : 'text-slate-300'}`}>{config.tabs?.includes('quantities') ? <CheckSquare size={18}/> : <Square size={18}/>}</button></td>
                                    <td className="px-4 py-3 text-right"><button onClick={() => handleRemoveUser(email)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition-colors"><Trash2 size={16}/></button></td>
                                </tr>
                            ))}
                            {Object.keys(usersConfig).length === 0 && (<tr><td colSpan="6" className="px-4 py-8 text-center text-slate-400 italic">No hay configuraciones personalizadas.</td></tr>)}
                        </tbody>
                    </table>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400 text-center">Los usuarios no listados aquí tendrán acceso de solo lectura a todas las pestañas por defecto.</div>
            </div>
        </div>
    );
};

export default UserManagementModal;