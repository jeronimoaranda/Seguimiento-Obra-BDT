import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { isConfigured } from '../../services/firebase';
import { RefreshCw, LogIn, Settings } from 'lucide-react';

const LoginScreen = () => {
    const { login, loading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (email && password) {
            try {
                await login(email, password, isRegistering);
            } catch (err) {
                setError(err.message);
            }
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden w-full max-w-md flex flex-col">
                <div className="bg-blue-600 p-6 text-white text-center">
                    <h1 className="text-2xl font-bold mb-2">Control de Obra</h1>
                    <p className="text-blue-100 text-sm">Plataforma Colaborativa en Tiempo Real</p>
                </div>
                {!isConfigured && (
                    <div className="bg-yellow-50 border-b border-yellow-200 p-4 text-yellow-800 text-xs">
                        <strong className="flex items-center gap-2 mb-1"><Settings size={14}/> Configuración Requerida</strong>
                        Verifica el archivo .env o la configuración de Firebase.
                    </div>
                )}
                <div className="p-8">
                    <h2 className="text-xl font-bold text-slate-700 mb-6 text-center">Iniciar Sesión</h2>
                    {error && <div className="mb-4 p-2 bg-red-50 text-red-600 text-xs rounded border border-red-200">{error}</div>}
                    
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none" placeholder="usuario@obra.com" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Contraseña</label>
                            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none" placeholder="••••••••" />
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <input type="checkbox" id="regCheck" checked={isRegistering} onChange={e => setIsRegistering(e.target.checked)} className="rounded text-blue-600"/>
                            <label htmlFor="regCheck" className="text-xs text-slate-500 select-none">Crear cuenta nueva si no existe</label>
                        </div>
                        <button disabled={loading || !isConfigured} type="submit" className={`mt-4 py-2 rounded font-bold shadow-lg transform active:scale-95 transition-all flex justify-center items-center gap-2 ${!isConfigured ? 'bg-gray-300 cursor-not-allowed text-gray-500' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                            {loading ? <RefreshCw className="animate-spin"/> : <LogIn size={18} />}
                            {isRegistering ? 'Registrar y Entrar' : 'Iniciar Sesión'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;