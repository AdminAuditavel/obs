import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useApp } from '../AppContext';

const AdminPostList = () => {
    const navigate = useNavigate();
    const { user, logAudit } = useApp();
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('posts')
            .select(`
        *,
        user:user_profiles!author_auth_uid(full_name, email, callsign)
      `)
            .order('created_at', { ascending: false });

        if (error) {
            alert('Error fetching posts: ' + error.message);
        } else {
            setPosts(data || []);
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        const reason = prompt('Motivo da remoção (Auditado):');
        if (!reason) return;

        if (!confirm('Esta ação deletará o post permanentemente. Confirmar?')) return;

        // Log first
        if (logAudit) await logAudit('DELETE_POST', 'posts', id, { reason });

        const { error } = await supabase.from('posts').delete().eq('id', id);
        if (error) {
            alert('Erro ao deletar: ' + error.message);
        } else {
            fetchPosts();
        }
    };

    if (!user || user.role !== 'admin') {
        return (
            <div className="p-10 text-center">
                <h1 className="text-xl font-bold text-red-500">Acesso Negado</h1>
                <button onClick={() => navigate('/feed')} className="mt-4 text-blue-500 underline">Voltar</button>
            </div>
        );
    }

    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen text-slate-900 dark:text-slate-100">
            <header className="sticky top-0 z-10 flex items-center bg-white dark:bg-slate-900 p-4 border-b border-slate-200 dark:border-slate-800 shadow-sm">
                <button onClick={() => navigate(-1)} className="p-2 mr-2">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-lg font-bold flex-1">Admin: Lista de Posts</h1>
                <button onClick={fetchPosts} className="p-2">
                    <span className="material-symbols-outlined">refresh</span>
                </button>
            </header>

            <main className="p-4 overflow-x-auto">
                {loading ? (
                    <p className="text-center p-10 text-slate-500">Carregando...</p>
                ) : (
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-100 dark:bg-slate-800">
                            <tr>
                                <th className="px-3 py-3">Data</th>
                                <th className="px-3 py-3">Status</th>
                                <th className="px-3 py-3">Titulo/Desc</th>
                                <th className="px-3 py-3">Autor</th>
                                <th className="px-3 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {posts.map((post) => (
                                <tr key={post.id} className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-3 py-4 font-mono text-xs">
                                        {new Date(post.created_at).toLocaleString('pt-BR')}
                                    </td>
                                    <td className="px-3 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${post.status === 'published' ? 'bg-green-100 text-green-700' :
                                                post.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100'
                                            }`}>
                                            {post.status}
                                        </span>
                                    </td>
                                    <td className="px-3 py-4 max-w-[200px]">
                                        <p className="font-bold truncate">{post.title}</p>
                                        <p className="text-xs text-slate-500 truncate">{post.description}</p>
                                        <p className="text-[10px] text-slate-400 mt-1 font-mono">{post.airport_id}</p>
                                    </td>
                                    <td className="px-3 py-4">
                                        <p className="font-medium">{post.user?.callsign || post.user?.full_name || 'Unk'}</p>
                                        <p className="text-xs text-slate-400 truncate max-w-[100px]">{post.user?.email}</p>
                                    </td>
                                    <td className="px-3 py-4">
                                        <button onClick={() => handleDelete(post.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                            <span className="material-symbols-outlined">delete</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </main>
        </div>
    );
};

export default AdminPostList;
