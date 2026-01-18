import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useApp } from '../AppContext';
import { UserBadge } from './UserBadge';

interface UserProfile {
    id: string; // This is the PK (uuid) of the profile
    auth_uid: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    role_id: 'admin' | 'moderator' | 'contributor' | 'registered';
    job_title?: string;
    created_at: string;
}

const UserList = () => {
    const navigate = useNavigate();
    const { user } = useApp();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        // Assuming RLS allows admins to see all profiles
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching users", error);
        } else {
            setUsers(data as UserProfile[]);
        }
        setLoading(false);
    };

    const handleRoleChange = async (targetUid: string, newRole: string) => {
        setUpdating(targetUid);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/adminUpdateUser`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    target_uid: targetUid,
                    new_role: newRole
                })
            });

            if (!response.ok) {
                const res = await response.json();
                throw new Error(res.error || "Failed to update role");
            }

            // Optimistic update or refetch
            setUsers(prev => prev.map(u => u.auth_uid === targetUid ? { ...u, role_id: newRole as any } : u));
            // alert("Cargo atualizado com sucesso"); // Optional feedback

        } catch (err: any) {
            alert(`Erro: ${err.message}`);
        } finally {
            setUpdating(null);
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen pb-24">
            <header className="sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between px-4 h-16">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(-1)}>
                        <span className="material-symbols-outlined text-primary">arrow_back_ios</span>
                        <h1 className="text-lg font-bold tracking-tight">Gerenciar Usuários</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto p-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-slate-500">Carregando usuários...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-3">Usuário</th>
                                        <th className="px-4 py-3">Contato</th>
                                        <th className="px-4 py-3">Profissão / Badge</th>
                                        <th className="px-4 py-3">Cargo</th>
                                        <th className="px-4 py-3 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {users.map(u => (
                                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="font-semibold">{u.full_name || 'Sem nome'}</div>
                                                <div className="text-xs text-slate-400 font-mono">{u.auth_uid.slice(0, 8)}...</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    {u.email && <span className="text-xs">{u.email}</span>}
                                                    {u.phone && <span className="text-xs text-slate-500">{u.phone}</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <UserBadge job_title={u.job_title} />
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold capitalize 
                          ${u.role_id === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                                        u.role_id === 'moderator' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                            u.role_id === 'contributor' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                                'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                    }`}>
                                                    {u.role_id}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {updating === u.auth_uid ? (
                                                    <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
                                                ) : (
                                                    <select
                                                        value={u.role_id}
                                                        onChange={(e) => handleRoleChange(u.auth_uid, e.target.value)}
                                                        disabled={u.auth_uid === user?.id} // Prevent self-demotion lockout logic if needed
                                                        className="bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg text-xs py-1 px-2 focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                                                    >
                                                        <option value="registered">Registered</option>
                                                        <option value="contributor">Contributor</option>
                                                        <option value="moderator">Moderator</option>
                                                        <option value="admin">Admin</option>
                                                    </select>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default UserList;
