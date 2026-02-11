import React, { useState, useRef } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Utils } from '../../utils/helpers';
import { 
    Shield, Eye, Database, LogOut, LayoutDashboard, Layers, BarChart, 
    Users, Upload, Trash2, ChevronDown, 
    AlertTriangle, Download, Loader, Lock
} from 'lucide-react';
import UserManagementModal from '../auth/UserManagementModal';
import { ConfirmModal, SuccessModal, ApprovalModal } from '../ui/Modals';

const MainLayout = () => {
    const { user, access, logout } = useAuth();
    const { loading, error, saveData, matrix, registry, quantities, setMatrix, setRegistry, setQuantities } = useData();
    
    // Detectar carga inicial
    const isInitialLoading = loading && (!matrix || matrix.length === 0) && (!registry || registry.length === 0) && (!quantities || quantities.length === 0);

    const [modals, setModals] = useState({ delete: null, success: null, approval: null, manageUsers: false });
    const [activeMenu, setActiveMenu] = useState(null);
    const [pendingData, setPendingData] = useState(null);
    const [changeStats, setChangeStats] = useState(null);

    const fileInputMatrix = useRef(null);
    const fileInputRegistry = useRef(null);
    const fileInputQuantities = useRef(null);

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
                if (lines.length < 2) throw new Error("Archivo vacío o sin cabeceras");
                const headers = Utils.parseCSVLine(lines[0], delimiter).map(h => h.toUpperCase().trim());
                const rows = lines.slice(1).map(line => Utils.parseCSVLine(line, delimiter));

                if (type === 'matrix') {
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
                        est2: headers.findIndex(h => h.includes('ESTADO_2')),
                        // NUEVOS CAMPOS
                        avCons: headers.findIndex(h => h.includes('AVANCE_CONS')),
                        fCons: headers.findIndex(h => h.includes('FECHA_CONS')),
                        avQa: headers.findIndex(h => h.includes('AVANCE_QAQC')),
                        fQa: headers.findIndex(h => h.includes('FECHA_QAQC')),
                        fRec: headers.findIndex(h => h.includes('FECHA_RECORRIDA')),
                        fEnt: headers.findIndex(h => h.includes('FECHA_ENTREGA'))
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
                                estado1: Utils.cleanStr(c[idx.est1]), estado2: Utils.cleanStr(c[idx.est2]),
                                // MAPEO NUEVOS CAMPOS
                                avCons: Utils.cleanStr(c[idx.avCons]) || "0",
                                fCons: Utils.normalizeDate(c[idx.fCons]),
                                avQa: Utils.cleanStr(c[idx.avQa]) || "0",
                                fQa: Utils.normalizeDate(c[idx.fQa]),
                                fRec: Utils.normalizeDate(c[idx.fRec]),
                                fEnt: Utils.normalizeDate(c[idx.fEnt])
                            });
                        } 
                    });
                    let modCount = 0; let newCount = 0;
                    const currentMap = new Map(matrix.map(d => [d.tag, d]));
                    newData.forEach(newItem => { const currentItem = currentMap.get(newItem.tag); if (!currentItem) newCount++; else if (newItem.skid !== currentItem.skid || newItem.almacen !== currentItem.almacen) modCount++; });
                    setPendingData(newData);
                    setChangeStats({ total: newData.length, newItems: newCount, modified: modCount });
                    setModals(p => ({ ...p, approval: true }));
                } else if (type === 'registry') {
                    const idx = { tag: headers.findIndex(h => h === 'TAG'), skid: headers.findIndex(h => h.includes('SKID')), ubic: headers.findIndex(h => h.includes('UBICA') && !h.includes('REGISTRO')), lab: headers.findIndex(h => h.includes('LABT') || h.includes('CALIB')), fCalib: headers.findIndex(h => h.includes('FECHA') && h.includes('CALIB')), estReg: headers.findIndex(h => h.includes('ESTADO') && h.includes('REGIST')), fGen: headers.findIndex(h => h.includes('GENERADO')), fPres: headers.findIndex(h => h.includes('PRESENTADO')), fDev: headers.findIndex(h => h.includes('DEVOLUCION')), ubicReg: headers.findIndex(h => h.includes('REGISTRO')), montado: headers.findIndex(h => h === 'MONTADO'), prov: headers.findIndex(h => h === 'PROVISION' || h.includes('PROVISION')) };
                    const newData = [];
                    rows.forEach((c) => { if(c[idx.tag]) newData.push({ tag: Utils.cleanStr(c[idx.tag]), skid: Utils.cleanStr(c[idx.skid]), ubicacion: Utils.cleanStr(c[idx.ubic]), lab: Utils.cleanStr(c[idx.lab]), fCalib: Utils.normalizeDate(c[idx.fCalib]), estadoReg: Utils.cleanStr(c[idx.estReg]), fGen: Utils.normalizeDate(c[idx.fGen]), fPres: Utils.normalizeDate(c[idx.fPres]), fDev: Utils.normalizeDate(c[idx.fDev]), ubicReg: Utils.cleanStr(c[idx.ubicReg]), montado: Utils.cleanStr(c[idx.montado]), provision: idx.prov !== -1 ? Utils.cleanStr(c[idx.prov]) : "Sin Dato" }); });
                    setRegistry(newData);
                    saveData(null, newData, null, null, user.email);
                    setModals(p => ({ ...p, success: `Se cargaron ${newData.length} registros.` }));
                } else if (type === 'quantities') {
                    const { data: d } = Utils.parseSegCantCSV(text);
                    setQuantities(d);
                    saveData(null, null, null, d, user.email);
                    setModals(p => ({ ...p, success: `Se cargaron ${d.length} filas.` }));
                }
            } catch (err) { alert("Error: " + err.message); }
            e.target.value = null; setActiveMenu(null);
        };
        reader.readAsText(file);
    };

    const confirmMatrixLoad = () => {
        if (pendingData) { setMatrix(pendingData); saveData(pendingData, null, {}, null, user.email); setModals(p => ({ ...p, approval: null, success: `Matriz actualizada.` })); }
    };

    const handleClearCloud = () => {
        const t = modals.delete;
        saveData(t==='matrix'||t==='all'?[]:null, t==='registry'||t==='all'?[]:null, t==='matrix'||t==='all'?{}:null, t==='quantities'||t==='all'?[]:null, user.email);
        setModals(p => ({ ...p, delete: null }));
        if(t==='all') window.location.reload();
    };

    const downloadCSV = (type) => {
        let csv = "data:text/csv;charset=utf-8,";
        let name = "export.csv";
        if(type==='matrix') { csv+="TAG;SISTEMA;SKID;ALMACEN;ESTADO;AVANCE_CONS;FECHA_CONS;AVANCE_QAQC;FECHA_QAQC;FECHA_RECORRIDA;FECHA_ENTREGA\n"; matrix.forEach(r=>{csv+=`${r.tag};${r.sistema};${r.skid};${r.almacen};${parseInt(r.cantRegReal)>0?'EN PROCESO':'PENDIENTE'};${r.avCons};${r.fCons};${r.avQa};${r.fQa};${r.fRec};${r.fEnt}\n`}); name="matriz.csv"; }
        else if(type==='registry') { csv+="TAG;ESTADO;UBICACION\n"; registry.forEach(r=>{csv+=`${r.tag};${r.estadoDoc};${r.ubicacion}\n`}); name="registros.csv"; }
        else if(type==='quantities') { 
            const k = Object.keys(quantities[0]||{}); const s = k.filter(x=>!x.match(/^\d/)); const d=k.filter(x=>x.match(/^\d/)).sort();
            csv += Utils.generateSegCantCSV([...s,...d], quantities); name="cantidades.csv";
        }
        const link = document.createElement("a"); link.href = encodeURI(csv); link.download = name; document.body.appendChild(link); link.click(); document.body.removeChild(link); setActiveMenu(null);
    };

    // Helper para verificar acceso total
    const hasFullAccess = access.tabs.includes('systems') && access.tabs.includes('dashboard') && access.tabs.includes('quantities');

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans relative" onClick={() => activeMenu && setActiveMenu(null)}>
            <UserManagementModal isOpen={modals.manageUsers} onClose={() => setModals(p => ({...p, manageUsers: false}))} />
            <ConfirmModal isOpen={!!modals.delete} onClose={() => setModals(p => ({...p, delete: null}))} onConfirm={handleClearCloud} title="Confirmar Limpieza" message="¿Estás seguro de borrar los datos seleccionados?" />
            <SuccessModal isOpen={!!modals.success} onClose={() => setModals(p => ({...p, success: null}))} message={modals.success} />
            <ApprovalModal isOpen={!!modals.approval} onClose={() => setModals(p => ({...p, approval: null}))} onConfirm={confirmMatrixLoad} changes={changeStats} />
            
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
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-slate-700">{user?.email}</p>
                                {!access.canEdit && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1"><Lock size={10}/> Solo Lectura</span>}
                            </div>
                        </div>
                        {loading && !isInitialLoading && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded animate-pulse flex items-center gap-1"><Database size={12}/> Sync...</span>}
                    </div>
                    <button onClick={logout} className="text-red-500 hover:bg-red-50 px-3 py-1 rounded text-sm flex gap-2 font-medium transition-colors"><LogOut size={16}/> Salir</button>
                </div>

                {error && <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm text-red-700 text-sm flex gap-2"><AlertTriangle size={20}/> {error}</div>}

                {/* Barra Herramientas - Bloqueada si carga inicial */}
                <div className={`bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col xl:flex-row justify-between items-center gap-4 z-50 relative transition-opacity ${isInitialLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div><h1 className="text-3xl font-bold text-slate-800">Control de Obra</h1><p className="text-slate-500">Sistema Integral de Gestión</p></div>
                    
                    <div className="flex flex-wrap gap-2 items-center justify-center xl:justify-end" onClick={(e) => e.stopPropagation()}>
                        {/* 1. Gestión de Accesos (Solo Admin) */}
                        {access.canManageUsers && (<><button onClick={() => setModals(p => ({...p, manageUsers: true}))} className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded text-sm hover:bg-slate-50 mr-2 shadow-sm"><Users size={16}/> Accesos</button><div className="h-8 w-px bg-slate-300 mx-2 hidden xl:block"></div></>)}
                        
                        {/* 2. Botones de Acción */}
                        {access.canEdit && (
                            <>
                                {/* Exportar */}
                                <div className="relative">
                                    <button onClick={() => toggleMenu('export')} className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded text-sm hover:bg-slate-50 shadow-sm">
                                        <Download size={16}/> Exportar Datos <ChevronDown size={14}/>
                                    </button>
                                    {activeMenu === 'export' && (
                                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                                            <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Seleccionar Base</div>
                                            {access.tabs.includes('systems') && (
                                                <button onClick={() => downloadCSV('matrix')} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700 flex items-center gap-2"><Layers size={14}/> Matriz ABM</button>
                                            )}
                                            {access.tabs.includes('dashboard') && (
                                                <button onClick={() => downloadCSV('registry')} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700 flex items-center gap-2"><LayoutDashboard size={14}/> Reg. Inst.</button>
                                            )}
                                            {access.tabs.includes('quantities') && (
                                                <button onClick={() => downloadCSV('quantities')} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700 flex items-center gap-2"><BarChart size={14}/> Cantidades</button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Cargar */}
                                <div className="relative">
                                    <button onClick={() => toggleMenu('import')} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 shadow-sm">
                                        <Upload size={16}/> Cargar Datos <ChevronDown size={14}/>
                                    </button>
                                    {activeMenu === 'import' && (
                                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                                            <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Seleccionar Destino</div>
                                            {access.tabs.includes('systems') && (
                                                <button onClick={() => fileInputMatrix.current.click()} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700 flex items-center gap-2"><Layers size={14}/> Matriz ABM</button>
                                            )}
                                            {access.tabs.includes('dashboard') && (
                                                <button onClick={() => fileInputRegistry.current.click()} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700 flex items-center gap-2"><LayoutDashboard size={14}/> Reg. Instrumentación</button>
                                            )}
                                            {access.tabs.includes('quantities') && (
                                                <button onClick={() => fileInputQuantities.current.click()} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700 flex items-center gap-2"><BarChart size={14}/> Cantidades</button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Limpiar */}
                                <div className="relative">
                                    <button onClick={() => toggleMenu('clear')} className="flex items-center gap-2 bg-white border border-red-200 text-red-600 px-4 py-2 rounded text-sm hover:bg-red-50 shadow-sm">
                                        <Trash2 size={16}/> Limpiar <ChevronDown size={14}/>
                                    </button>
                                    {activeMenu === 'clear' && (
                                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                                            <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">¿Qué desea borrar?</div>
                                            {access.tabs.includes('systems') && (
                                                <button onClick={() => setModals(p => ({...p, delete: 'matrix'}))} className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"><Layers size={14}/> Solo Matriz</button>
                                            )}
                                            {access.tabs.includes('dashboard') && (
                                                <button onClick={() => setModals(p => ({...p, delete: 'registry'}))} className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"><LayoutDashboard size={14}/> Solo Registros</button>
                                            )}
                                            {access.tabs.includes('quantities') && (
                                                <button onClick={() => setModals(p => ({...p, delete: 'quantities'}))} className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"><BarChart size={14}/> Solo Cantidades</button>
                                            )}
                                            <div className="border-t my-1"></div>
                                            {hasFullAccess && (
                                                <button onClick={() => setModals(p => ({...p, delete: 'all'}))} className="w-full text-left px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"><AlertTriangle size={14}/> BORRAR TODO</button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className={`flex gap-6 border-b border-slate-200 px-4 overflow-x-auto ${isInitialLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                    {access.tabs.includes('dashboard') && <NavLink to="/dashboard" className={({isActive}) => `pb-3 px-2 flex gap-2 transition-colors whitespace-nowrap ${isActive ? 'text-blue-600 border-b-2 border-blue-600 font-bold' : 'text-slate-500 font-medium'}`}><LayoutDashboard size={20}/> Instrumentación</NavLink>}
                    {access.tabs.includes('systems') && <NavLink to="/systems" className={({isActive}) => `pb-3 px-2 flex gap-2 transition-colors whitespace-nowrap ${isActive ? 'text-blue-600 border-b-2 border-blue-600 font-bold' : 'text-slate-500 font-medium'}`}><Layers size={20}/> Sistemas - Precomm</NavLink>}
                    {access.tabs.includes('quantities') && <NavLink to="/quantities" className={({isActive}) => `pb-3 px-2 flex gap-2 transition-colors whitespace-nowrap ${isActive ? 'text-blue-600 border-b-2 border-blue-600 font-bold' : 'text-slate-500 font-medium'}`}><BarChart size={20}/> Seguimiento de Cantidades</NavLink>}
                </div>
            </div>

            {/* Contenido */}
            {isInitialLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-slate-400 animate-in fade-in duration-500">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
                        <Database className="w-6 h-6 text-blue-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-lg font-medium mt-4 text-slate-600">Cargando base de datos...</p>
                    <p className="text-sm text-slate-400">Esto puede tomar unos segundos dependiendo de tu conexión.</p>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <Outlet />
                </div>
            )}
        </div>
    );
};

export default MainLayout;