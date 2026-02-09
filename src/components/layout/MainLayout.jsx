import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Utils } from '../../utils/helpers';
import { 
    Shield, Eye, Database, LogOut, LayoutDashboard, Layers, BarChart, 
    Users, Upload, Trash2, EyeOff, Save, ChevronDown, FileText, 
    AlertTriangle, Download, FolderOpen, RefreshCw, Grid, Activity, 
    CheckCircle, Clock, Wrench, Box, Calendar, Edit, X
} from 'lucide-react';
import UserManagementModal from '../auth/UserManagementModal';

// --- COMPONENTES AUXILIARES ---

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
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

const SuccessModal = ({ isOpen, onClose, message }) => {
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

const ApprovalModal = ({ isOpen, onClose, onConfirm, changes }) => {
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

// --- MAIN LAYOUT PRINCIPAL ---

const MainLayout = () => {
    const { user, access, logout } = useAuth();
    const { loading, error, saveData, matrix, registry, quantities, setMatrix, setRegistry, setQuantities } = useData();
    
    // Estados para modales y menús
    const [modals, setModals] = useState({ delete: null, success: null, approval: null, manageUsers: false });
    const [activeMenu, setActiveMenu] = useState(null); // 'import', 'export', 'clear'
    
    // Estados para lógica de carga
    const [pendingData, setPendingData] = useState(null);
    const [changeStats, setChangeStats] = useState(null);
    const [hideDeleted, setHideDeleted] = useState(true);

    // Referencias para inputs de archivo
    const fileInputMatrix = useRef(null);
    const fileInputRegistry = useRef(null);
    const fileInputQuantities = useRef(null);

    // Helper para cerrar menús al hacer click fuera (simulado)
    const toggleMenu = (menuName) => {
        if (activeMenu === menuName) setActiveMenu(null);
        else setActiveMenu(menuName);
    };

    // --- LÓGICA DE CARGA DE ARCHIVOS ---
    const handleFileUpload = (e, type) => {
        const file = e.target.files[0];
        if(!file) return;
        
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const text = ev.target.result;
                const delimiter = Utils.detectDelimiter(text);
                const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim().length > 0);
                if (lines.length < 2) throw new Error("El archivo parece estar vacío o sin cabeceras");

                const headers = Utils.parseCSVLine(lines[0], delimiter).map(h => h.toUpperCase().trim());
                const rows = lines.slice(1).map(line => Utils.parseCSVLine(line, delimiter));

                if (type === 'matrix') {
                    // Mapeo Matriz
                    const idx = {
                        tag: headers.findIndex(h => h === 'TAG'), 
                        spec: headers.findIndex(h => h.includes('ESPECIALIDAD') || h === 'ESP'), 
                        desc: headers.findIndex(h => h.includes('DESC') && !h.includes('SIS')),
                        sis: headers.findIndex(h => h === 'SISTEMA' || h === 'SIS'), 
                        sisDesc: headers.findIndex(h => h.includes('DESC') && h.includes('SIS')), 
                        sub: headers.findIndex(h => h.includes('SUB') && !h.includes('DESC')),
                        subDesc: headers.findIndex(h => h.includes('DESC') && h.includes('SUB')), 
                        skid: headers.findIndex(h => h === 'SKID'), 
                        alm: headers.findIndex(h => h === 'ALMACEN' || h === 'ALM'),
                        calib: headers.findIndex(h => h.includes('CALIBRAR')), 
                        prov: headers.findIndex(h => h.includes('PROVISION')), 
                        cTot: headers.findIndex(h => h.includes('CANTREG') && h.includes('TOT')),
                        cReal: headers.findIndex(h => h.includes('CANTREG') && h.includes('REAL')), 
                        est1: headers.findIndex(h => h.includes('ESTADO_1')), 
                        est2: headers.findIndex(h => h.includes('ESTADO_2'))
                    };

                    const newData = [];
                    rows.forEach((c) => { 
                        const tagVal = Utils.cleanStr(c[idx.tag]);
                        if(tagVal && tagVal.toUpperCase() !== "TAG" && !tagVal.toUpperCase().includes("DESCRIPCION")) {
                            newData.push({
                                especialidad: Utils.cleanStr(c[idx.spec]), tag: tagVal, descripcion: Utils.cleanStr(c[idx.desc]), 
                                sistema: Utils.cleanStr(c[idx.sis]), descSistema: Utils.cleanStr(c[idx.sisDesc]),
                                subsistema: Utils.cleanStr(c[idx.sub]), descSubsistema: Utils.cleanStr(c[idx.subDesc]), 
                                skid: Utils.cleanStr(c[idx.skid]), almacen: Utils.cleanStr(c[idx.alm]),
                                aCalibrar: Utils.cleanStr(c[idx.calib]), provision: Utils.cleanStr(c[idx.prov]), 
                                cantRegTot: Utils.cleanStr(c[idx.cTot]) || "0", cantRegReal: Utils.cleanStr(c[idx.cReal]) || "0", 
                                estado1: Utils.cleanStr(c[idx.est1]), estado2: Utils.cleanStr(c[idx.est2])
                            });
                        } 
                    });

                    // Calcular estadísticas de cambio
                    let modCount = 0; let newCount = 0;
                    const currentMap = new Map(matrix.map(d => [d.tag, d]));
                    newData.forEach(newItem => { 
                        const currentItem = currentMap.get(newItem.tag); 
                        if (!currentItem) newCount++; 
                        else if (newItem.skid !== currentItem.skid || newItem.almacen !== currentItem.almacen) modCount++; 
                    });

                    setPendingData(newData);
                    setChangeStats({ total: newData.length, newItems: newCount, modified: modCount });
                    setModals(p => ({ ...p, approval: true }));

                } else if (type === 'registry') {
                    // Mapeo Registros
                    const idx = { 
                        tag: headers.findIndex(h => h === 'TAG'), 
                        skid: headers.findIndex(h => h.includes('SKID')), 
                        ubic: headers.findIndex(h => h.includes('UBICA') && !h.includes('REGISTRO')), 
                        lab: headers.findIndex(h => h.includes('LABT') || h.includes('CALIB')), 
                        fCalib: headers.findIndex(h => h.includes('FECHA') && h.includes('CALIB')), 
                        estReg: headers.findIndex(h => h.includes('ESTADO') && h.includes('REGIST')), 
                        fGen: headers.findIndex(h => h.includes('GENERADO')), 
                        fPres: headers.findIndex(h => h.includes('PRESENTADO')), 
                        fDev: headers.findIndex(h => h.includes('DEVOLUCION')), 
                        ubicReg: headers.findIndex(h => h.includes('REGISTRO')), 
                        montado: headers.findIndex(h => h === 'MONTADO'), 
                        prov: headers.findIndex(h => h === 'PROVISION' || h.includes('PROVISION')) 
                    };

                    const newData = [];
                    rows.forEach((c) => { 
                        if(c[idx.tag]) newData.push({ 
                            tag: Utils.cleanStr(c[idx.tag]), skid: Utils.cleanStr(c[idx.skid]), 
                            ubicacion: Utils.cleanStr(c[idx.ubic]), lab: Utils.cleanStr(c[idx.lab]), 
                            fCalib: Utils.normalizeDate(c[idx.fCalib]), estadoReg: Utils.cleanStr(c[idx.estReg]), 
                            fGen: Utils.normalizeDate(c[idx.fGen]), fPres: Utils.normalizeDate(c[idx.fPres]), 
                            fDev: Utils.normalizeDate(c[idx.fDev]), ubicReg: Utils.cleanStr(c[idx.ubicReg]), 
                            montado: Utils.cleanStr(c[idx.montado]), 
                            provision: idx.prov !== -1 ? Utils.cleanStr(c[idx.prov]) : "Sin Dato" 
                        }); 
                    });

                    setRegistry(newData);
                    saveData(null, newData, null, null, user.email);
                    setModals(p => ({ ...p, success: `Se cargaron ${newData.length} registros de instrumentación.` }));

                } else if (type === 'quantities') {
                    // Carga de Cantidades
                    const { data: d } = Utils.parseSegCantCSV(text);
                    if (d.length === 0) throw new Error("Archivo de cantidades vacío");
                    
                    setQuantities(d);
                    saveData(null, null, null, d, user.email);
                    setModals(p => ({ ...p, success: `Se cargaron ${d.length} registros de cantidades.` }));
                }
            } catch (err) {
                alert("Error al procesar archivo: " + err.message);
                console.error(err);
            }
            e.target.value = null;
            setActiveMenu(null);
        };
        reader.readAsText(file);
    };

    const confirmMatrixLoad = () => {
        if (pendingData) {
            setMatrix(pendingData);
            saveData(pendingData, null, {}, null, user.email);
            setModals(p => ({ ...p, approval: null, success: `Matriz actualizada: ${pendingData.length} items` }));
        }
    };

    // --- LÓGICA DE LIMPIEZA ---
    const handleClearCloud = () => {
        const target = modals.delete; // 'matrix', 'registry', 'quantities', 'all'
        
        let newMatrix = null, newReg = null, newQuant = null, newEdits = null;
        
        if (target === 'matrix') { newMatrix = []; newEdits = {}; } 
        if (target === 'registry') newReg = [];
        if (target === 'quantities') newQuant = [];
        if (target === 'all') { newMatrix = []; newReg = []; newQuant = []; newEdits = {}; }

        saveData(newMatrix, newReg, newEdits, newQuant, user.email);
        setModals(p => ({ ...p, delete: null }));
        if (target === 'all') window.location.reload(); 
    };

    // --- LÓGICA DE EXPORTACIÓN ---
    const downloadCSV = (type) => {
        let csvContent = "data:text/csv;charset=utf-8,";
        let fileName = "export.csv";

        if (type === 'matrix') {
            csvContent += "TAG;SISTEMA;SUBSISTEMA;DESCRIPCION;SKID;ALMACEN;ESTADO_CALC;DOC_TOT;DOC_REAL\n";
            matrix.forEach(row => { 
                let state = "PENDIENTE";
                const tot = parseInt(row.cantRegTot||0); const real = parseInt(row.cantRegReal||0);
                if (tot > 0 && real >= tot) state = "INSTALADO"; else if (real > 0) state = "EN PROCESO";
                csvContent += `${row.tag};${row.sistema};${row.subsistema};${row.descripcion};${row.skid};${row.almacen};${state};${tot};${real}\n`; 
            });
            fileName = "matriz_abm.csv";
        } else if (type === 'registry') {
            csvContent += "TAG;ESTADO_DOC;UBICACION;LABORATORIO;FECHA_GEN;FECHA_PRES;FECHA_DEV\n";
            registry.forEach(row => { 
                const estDoc = row.fDev ? "FINALIZADO" : row.fPres ? "EN INSPECCIÓN" : row.fGen ? "EN LABORATORIO" : "PENDIENTE";
                csvContent += `${row.tag};${estDoc};${row.ubicacion};${row.lab};${row.fGen};${row.fPres};${row.fDev}\n`; 
            });
            fileName = "registros_inst.csv";
        } else if (type === 'quantities') {
            if (quantities.length > 0) {
                // 1. Identificar Semanas Estándar (Usando Linea Base como referencia)
                const baseRows = quantities.filter(r => Utils.isLineaBase(r.Curva || r.curva));
                let standardDates = new Set();
                
                // Recolectar fechas estándar
                const sourceRows = baseRows.length > 0 ? baseRows : quantities;
                sourceRows.forEach(r => {
                    Object.keys(r).forEach(k => {
                        if (k.match(/^\d{4}-\d{2}-\d{2}$/)) standardDates.add(k);
                    });
                });
                
                const sortedStandardDates = Array.from(standardDates).sort((a, b) => new Date(a) - new Date(b));
                
                // 2. Procesar filas y AGREGAR manuales a sus semanas
                const processedQuantities = quantities.map(row => {
                    if (!Utils.isAvanceReal(row.Curva || row.curva)) return row;

                    const newRow = { ...row };
                    
                    // Inicializar columnas estándar si faltan
                    sortedStandardDates.forEach(d => {
                        if (newRow[d] === undefined || newRow[d] === null) newRow[d] = "";
                    });

                    // Buscar y sumar fechas manuales
                    Object.keys(newRow).forEach(key => {
                        if (!key.match(/^\d{4}-\d{2}-\d{2}$/)) return;
                        if (sortedStandardDates.includes(key)) return; // Ya es estándar

                        const manualDate = key;
                        const manualValue = Utils.parseNumber(newRow[key]);

                        if (manualValue === 0) return;

                        // Lógica: Fecha Manual se suma a la semana inmediatamente inferior
                        // Regla: Semana_Inferior <= Fecha_Manual < Semana_Superior
                        let targetWeek = null;
                        
                        for (let i = 0; i < sortedStandardDates.length; i++) {
                            const currentWeek = sortedStandardDates[i];
                            const nextWeek = sortedStandardDates[i+1];

                            if (!nextWeek) {
                                // Si es la última semana, todo lo mayor o igual va aquí
                                if (manualDate >= currentWeek) targetWeek = currentWeek;
                            } else {
                                // Rango normal
                                if (manualDate >= currentWeek && manualDate < nextWeek) {
                                    targetWeek = currentWeek;
                                    break;
                                }
                            }
                        }

                        if (targetWeek) {
                            const existingVal = Utils.parseNumber(newRow[targetWeek]);
                            newRow[targetWeek] = existingVal + manualValue;
                        }
                    });

                    return newRow;
                });

                // 3. Generar CSV solo con columnas limpias
                const staticKeys = Object.keys(quantities[0]).filter(k => !k.match(/^\d{4}-\d{2}-\d{2}$/));
                // Priorizar claves estáticas comunes
                const prioritizedKeys = ["Curva", "Disciplina", "Actividad", "Alcance", "Actual", "Remanente", "unidad"];
                const otherStaticKeys = staticKeys.filter(k => !prioritizedKeys.includes(Utils.normalizeText(k)) && !prioritizedKeys.includes(k));
                
                // Construir headers finales: Estáticos + Fechas Ordenadas
                const allExportKeys = [...prioritizedKeys.filter(k => quantities[0].hasOwnProperty(k)), ...otherStaticKeys, ...sortedStandardDates];
                
                csvContent = "data:text/csv;charset=utf-8," + Utils.generateSegCantCSV(allExportKeys, processedQuantities);
            }
            fileName = "seguimiento_cantidades.csv";
        }

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setActiveMenu(null);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans relative" onClick={() => activeMenu && setActiveMenu(null)}>
            {/* --- MODALES --- */}
            <UserManagementModal isOpen={modals.manageUsers} onClose={() => setModals(p => ({...p, manageUsers: false}))} />
            
            <ConfirmModal 
                isOpen={!!modals.delete} 
                onClose={() => setModals(p => ({...p, delete: null}))} 
                onConfirm={handleClearCloud} 
                title={modals.delete === 'all' ? "⚠ Limpieza Total" : "Limpiar Base de Datos"} 
                message={
                    modals.delete === 'all' ? "ESTA ACCIÓN ES DESTRUCTIVA. Se borrarán TODAS las bases de datos. ¿Estás seguro?" :
                    modals.delete === 'matrix' ? "¿Borrar toda la Matriz ABM y sus ediciones?" :
                    modals.delete === 'registry' ? "¿Borrar todos los Registros de Instrumentación?" :
                    "¿Borrar el historial de Cantidades?"
                } 
            />
            
            <SuccessModal isOpen={!!modals.success} onClose={() => setModals(p => ({...p, success: null}))} message={modals.success} />
            <ApprovalModal isOpen={!!modals.approval} onClose={() => setModals(p => ({...p, approval: null}))} onConfirm={confirmMatrixLoad} changes={changeStats} />
            
            {/* Inputs de Archivo Ocultos */}
            <input type="file" ref={fileInputMatrix} onChange={(e) => handleFileUpload(e, 'matrix')} accept=".csv" className="hidden" />
            <input type="file" ref={fileInputRegistry} onChange={(e) => handleFileUpload(e, 'registry')} accept=".csv" className="hidden" />
            <input type="file" ref={fileInputQuantities} onChange={(e) => handleFileUpload(e, 'quantities')} accept=".csv" className="hidden" />

            <div className="flex flex-col gap-4 mb-6">
                {/* Header de Usuario */}
                <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${access.role === 'admin' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                            {access.role === 'admin' ? <Shield size={20}/> : <Eye size={20}/>}
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-bold">USUARIO</p>
                            <p className="text-sm font-bold text-slate-700">{user?.email}</p>
                        </div>
                        {loading && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded animate-pulse flex items-center gap-1"><Database size={12}/> Sincronizando...</span>}
                    </div>
                    <button onClick={logout} className="text-red-500 hover:bg-red-50 px-3 py-1 rounded text-sm flex gap-2 font-medium transition-colors"><LogOut size={16}/> Salir</button>
                </div>

                {error && <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm text-red-700 text-sm flex gap-2"><AlertTriangle size={20}/> {error}</div>}

                {/* Barra Principal de Herramientas Unificada */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col xl:flex-row justify-between items-center gap-4 z-50 relative">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Control de Obra</h1>
                        <p className="text-slate-500">Sistema Integral de Gestión</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 items-center justify-center xl:justify-end" onClick={(e) => e.stopPropagation()}>
                        {/* 1. Gestión de Accesos (Solo Admin) */}
                        {access.canManageUsers && (
                            <>
                                <button 
                                    onClick={() => setModals(p => ({...p, manageUsers: true}))} 
                                    className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded text-sm hover:bg-slate-50 transition-colors mr-2 shadow-sm"
                                >
                                    <Users size={16}/> Accesos
                                </button>
                                <div className="h-8 w-px bg-slate-300 mx-2 hidden xl:block"></div>
                            </>
                        )}

                        {/* 2. Botón Unificado EXPORTAR */}
                        <div className="relative">
                            <button 
                                onClick={() => toggleMenu('export')}
                                className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded text-sm hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                <Download size={16}/> Exportar Datos <ChevronDown size={14}/>
                            </button>
                            {activeMenu === 'export' && (
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                                    <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Seleccionar Base</div>
                                    <button onClick={() => downloadCSV('matrix')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2"><Layers size={16}/> Matriz ABM</button>
                                    <button onClick={() => downloadCSV('registry')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2"><LayoutDashboard size={16}/> Reg. Instrumentación</button>
                                    <button onClick={() => downloadCSV('quantities')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2"><BarChart size={16}/> Cantidades</button>
                                </div>
                            )}
                        </div>

                        {access.canEdit && (
                            <>
                                {/* 3. Botón Unificado IMPORTAR */}
                                <div className="relative">
                                    <button 
                                        onClick={() => toggleMenu('import')}
                                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors shadow-sm"
                                    >
                                        <Upload size={16}/> Cargar Datos <ChevronDown size={14}/>
                                    </button>
                                    {activeMenu === 'import' && (
                                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                                            <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Seleccionar Destino</div>
                                            <button onClick={() => fileInputMatrix.current.click()} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-purple-600 flex items-center gap-2"><Layers size={16}/> Matriz ABM</button>
                                            <button onClick={() => fileInputRegistry.current.click()} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2"><LayoutDashboard size={16}/> Reg. Instrumentación</button>
                                            <button onClick={() => fileInputQuantities.current.click()} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-green-600 flex items-center gap-2"><BarChart size={16}/> Cantidades</button>
                                        </div>
                                    )}
                                </div>

                                {/* 4. Botón Unificado LIMPIAR */}
                                <div className="relative">
                                    <button 
                                        onClick={() => toggleMenu('clear')}
                                        className="flex items-center gap-2 bg-white border border-red-200 text-red-600 px-4 py-2 rounded text-sm hover:bg-red-50 transition-colors shadow-sm"
                                    >
                                        <Trash2 size={16}/> Limpiar Base <ChevronDown size={14}/>
                                    </button>
                                    {activeMenu === 'clear' && (
                                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                                            <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">¿Qué desea borrar?</div>
                                            <button onClick={() => setModals(p => ({...p, delete: 'matrix'}))} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2"><Layers size={16}/> Solo Matriz</button>
                                            <button onClick={() => setModals(p => ({...p, delete: 'registry'}))} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2"><LayoutDashboard size={16}/> Solo Registros</button>
                                            <button onClick={() => setModals(p => ({...p, delete: 'quantities'}))} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2"><BarChart size={16}/> Solo Cantidades</button>
                                            <div className="border-t border-slate-100 my-1"></div>
                                            <button onClick={() => setModals(p => ({...p, delete: 'all'}))} className="w-full text-left px-4 py-2 text-sm text-red-600 font-bold hover:bg-red-50 flex items-center gap-2"><AlertTriangle size={16}/> BORRAR TODO</button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Navegación (Tabs usando Router) */}
                <div className="flex gap-6 border-b border-slate-200 px-4 overflow-x-auto">
                    {access.tabs.includes('dashboard') && (
                        <NavLink to="/dashboard" className={({isActive}) => `pb-3 px-2 flex gap-2 transition-colors whitespace-nowrap ${isActive ? 'text-blue-600 border-b-2 border-blue-600 font-bold' : 'text-slate-500 font-medium'}`}>
                            <LayoutDashboard size={20}/> Instrumentación
                        </NavLink>
                    )}
                    {access.tabs.includes('systems') && (
                        <NavLink to="/systems" className={({isActive}) => `pb-3 px-2 flex gap-2 transition-colors whitespace-nowrap ${isActive ? 'text-blue-600 border-b-2 border-blue-600 font-bold' : 'text-slate-500 font-medium'}`}>
                            <Layers size={20}/> Sistemas - Precomm
                        </NavLink>
                    )}
                    {access.tabs.includes('quantities') && (
                        <NavLink to="/quantities" className={({isActive}) => `pb-3 px-2 flex gap-2 transition-colors whitespace-nowrap ${isActive ? 'text-blue-600 border-b-2 border-blue-600 font-bold' : 'text-slate-500 font-medium'}`}>
                            <BarChart size={20}/> Seguimiento de Cantidades
                        </NavLink>
                    )}
                </div>
            </div>

            {/* Contenido de la Solapa Activa */}
            <div className="animate-in fade-in">
                <Outlet />
            </div>
        </div>
    );
};

export default MainLayout;