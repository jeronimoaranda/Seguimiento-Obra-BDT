import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import MainLayout from './components/layout/MainLayout';
import LoginScreen from './components/auth/LoginScreen'; // Mover LoginScreen a su archivo

// Lazy loading para los módulos (Mejora rendimiento inicial)
const DashboardModule = React.lazy(() => import('./modules/dashboard/DashboardModule'));
const SystemsModule = React.lazy(() => import('./modules/systems/SystemsModule'));
const QuantitiesModule = React.lazy(() => import('./modules/quantities/QuantitiesModule'));

// Componente para proteger rutas que requieren login
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) return <div className="h-screen flex items-center justify-center">Cargando sesión...</div>;
    if (!user) return <LoginScreen />;
    return children;
};

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <DataProvider>
                    <Routes>
                        <Route path="/" element={
                            <ProtectedRoute>
                                <MainLayout />
                            </ProtectedRoute>
                        }>
                            {/* Redirección inicial inteligente */}
                            <Route index element={<Navigate to="/dashboard" replace />} />
                            
                            <Route path="dashboard" element={
                                <Suspense fallback={<div>Cargando Gráficos...</div>}>
                                    <DashboardModule />
                                </Suspense>
                            } />
                            
                            <Route path="systems" element={
                                <Suspense fallback={<div>Cargando Sistemas...</div>}>
                                    <SystemsModule />
                                </Suspense>
                            } />
                            
                            <Route path="quantities" element={
                                <Suspense fallback={<div>Cargando Cantidades...</div>}>
                                    <QuantitiesModule />
                                </Suspense>
                            } />

                            {/* AGREGAR AQUI NUEVAS RUTAS SIN ROMPER LO ANTERIOR */}
                            {/* <Route path="finanzas" element={<FinanceModule />} /> */}
                            
                            <Route path="*" element={<div>Página no encontrada</div>} />
                        </Route>
                    </Routes>
                </DataProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;