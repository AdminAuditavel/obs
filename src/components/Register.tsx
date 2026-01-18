import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import AvatarUpload from './AvatarUpload';

const Register = () => {
    const navigate = useNavigate();
    const { signUp } = useApp();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [jobTitle, setJobTitle] = useState('registered');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await signUp(email, password, fullName, phone, avatarUrl || undefined, jobTitle);
            alert('Cadastro realizado! Verifique seu e-mail para confirmar a conta.');
            navigate('/login');
        } catch (err: any) {
            setError(err.message || 'Falha ao criar conta');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-full min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark text-[#0c121d] dark:text-white">
            {/* Header */}
            <div className="flex items-center bg-transparent p-4 pb-2 justify-between shrink-0">
                <div className="text-[#0c121d] dark:text-white flex size-12 shrink-0 items-center justify-center cursor-pointer" onClick={() => navigate(-1)}>
                    <span className="material-symbols-outlined">arrow_back_ios</span>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center px-6 pb-10">
                <div className="mb-6 flex flex-col items-center">
                    <h1 className="text-2xl font-bold">Criar Conta</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Junte-se à comunidade Observer</p>
                </div>

                <form onSubmit={handleRegister} className="w-full max-w-sm flex flex-col gap-4">
                    <div className="flex justify-center mb-2">
                        <AvatarUpload
                            url={avatarUrl}
                            onUpload={(url) => setAvatarUrl(url)}
                            editable={true}
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">error</span>
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Nome Completo</label>
                        <input
                            type="text"
                            required
                            className="w-full h-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 focus:ring-2 focus:ring-primary outline-none"
                            placeholder="Seu Nome"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                        />
                    </div>

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
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Telefone (Opcional)</label>
                        <input
                            type="tel"
                            className="w-full h-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 focus:ring-2 focus:ring-primary outline-none"
                            placeholder="(11) 99999-9999"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Profissão / Função</label>
                        <select
                            className="w-full h-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 focus:ring-2 focus:ring-primary outline-none appearance-none"
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                        >
                            <option value="registered">Entusiasta / Spotter</option>
                            <option value="ground">Equipe de Solo</option>
                            <option value="mech">Mecânico</option>
                            <option value="met">Meteorologia (PMET, OEA)</option>
                            <option value="atc">Navegação Aérea (ATC, OEA, AIS)</option>
                            <option value="pilot">Piloto/Comandante</option>
                            <option value="staff">Staff / Admin</option>
                        </select>
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

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-4 w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                        {loading ? <span className="animate-spin material-symbols-outlined">progress_activity</span> : 'Cadastrar'}
                    </button>

                    <button type="button" onClick={() => navigate('/login')} className="mt-2 text-sm text-center text-primary font-semibold">
                        Já tem conta? Faça login
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Register;
