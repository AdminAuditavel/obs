import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { IMAGES } from '../constants';

const Login = () => {
    const navigate = useNavigate();
    const { signIn } = useApp();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await signIn(email, password);
            navigate('/feed');
        } catch (err: any) {
            setError(err.message || 'Falha ao fazer login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-full min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark text-[#0c121d] dark:text-white">
            {/* Header */}
            <div className="flex items-center bg-transparent p-4 pb-2 justify-between shrink-0">
                <div className="text-[#0c121d] dark:text-white flex size-12 shrink-0 items-center justify-center cursor-pointer" onClick={() => navigate('/')}>
                    <span className="material-symbols-outlined">arrow_back_ios</span>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-6">
                <div className="mb-8 flex flex-col items-center">
                    <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 text-primary">
                        <span className="material-symbols-outlined text-4xl">lock_open</span>
                    </div>
                    <h1 className="text-2xl font-bold">Bem-vindo de volta</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Acesse sua conta para continuar</p>
                </div>

                <form onSubmit={handleLogin} className="w-full max-w-sm flex flex-col gap-4">
                    {error && (
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">error</span>
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">E-mail</label>
                        <input
                            type="email"
                            required
                            className="w-full h-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 focus:ring-2 focus:ring-primary outline-none"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Senha</label>
                        <input
                            type="password"
                            required
                            className="w-full h-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 focus:ring-2 focus:ring-primary outline-none"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end">
                        <button type="button" className="text-xs font-semibold text-primary hover:text-primary/80">
                            Esqueceu a senha?
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-4 w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                        {loading ? <span className="animate-spin material-symbols-outlined">progress_activity</span> : 'Entrar'}
                    </button>

                    <button type="button" onClick={() => navigate('/register')} className="mt-2 text-sm text-center text-primary font-semibold">
                        Não tem conta? Crie agora
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
