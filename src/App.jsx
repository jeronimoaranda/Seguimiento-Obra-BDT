import React, { Suspense } from 'react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom'; // Usamos MemoryRouter
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import MainLayout from './components/layout/MainLayout';
import LoginScreen from './components/auth/LoginScreen';
import { Loader } from 'lucide-react';

// Lazy loading para optimizar carga inicial
const DashboardModule = React.lazy(() => import('./modules/dashboard/DashboardModule'));
const SystemsModule = React.lazy(() => import('./modules/systems/SystemsModule'));
const QuantitiesModule = React.lazy(() => import('./modules/quantities/QuantitiesModule'));

// Componente de Carga de Página (Spinner centrado)
const PageLoader = () => (
    <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 min-h-[300px]">
        <Loader className="w-8 h-8 animate-spin mb-2 text-blue-500" />
        <p className="text-sm font-medium">Cargando módulo...</p>
    </div>
);

// Protección de Rutas: Si no hay usuario, muestra Login. Si está cargando auth, muestra spinner.
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    
    if (loading) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500">
                <Loader className="w-10 h-10 animate-spin text-blue-600 mb-4" />
                <p className="font-medium">Iniciando sesión segura...</p>
            </div>
        );
    }
    
    if (!user) return <LoginScreen />; // LoginScreen maneja su propia lógica de renderizado
    return children;
};

// Redirección Inteligente: Envía al usuario a su primera pestaña permitida
const RoleBasedRedirect = () => {
    const { access } = useAuth();
    
    // Si el usuario no tiene pestañas asignadas (caso raro), mostrar mensaje
    if (!access || !access.tabs || access.tabs.length === 0) {
        return (
            <div className="p-10 text-center text-slate-500">
                <h3 className="text-lg font-bold mb-2">Acceso Restringido</h3>
                <p>Tu usuario no tiene pestañas asignadas. Contacta al administrador.</p>
            </div>
        );
    }

    // Redirigir a la primera pestaña disponible en su lista de acceso
    return <Navigate to={`/${access.tabs[0]}`} replace />;
};

function App() {
    return (
        <MemoryRouter>
            <AuthProvider>
                <DataProvider>
                    <Routes>
                        <Route path="/" element={
                            <ProtectedRoute>
                                <MainLayout />
                            </ProtectedRoute>
                        }>
                            {/* Ruta Index: Redirige dinámicamente según rol */}
                            <Route index element={<RoleBasedRedirect />} />
                            
                            <Route path="dashboard" element={
                                <Suspense fallback={<PageLoader />}>
                                    <DashboardModule />
                                </Suspense>
                            } />
                            
                            <Route path="systems" element={
                                <Suspense fallback={<PageLoader />}>
                                    <SystemsModule />
                                </Suspense>
                            } />
                            
                            <Route path="quantities" element={
                                <Suspense fallback={<PageLoader />}>
                                    <QuantitiesModule />
                                </Suspense>
                            } />
                            
                            {/* Captura de errores 404: Intenta redirigir a lo seguro antes de mostrar error */}
                            <Route path="*" element={<RoleBasedRedirect />} />
                        </Route>
                    </Routes>
                </DataProvider>
            </AuthProvider>
        </MemoryRouter>
    );
}

export default App;