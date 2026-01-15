import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useApp } from '../AppContext';

const UserPostList = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logAudit } = useApp();
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            if (user.role === 'registered') {
                navigate('/feed');
                return;
            }
            fetchPosts(user.id);
        }
    }, [user, location.key]);

    const fetchPosts = async (uid: string) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('posts')
            .select(`
        *,
        media:post_media(storage_path)
      `)
            .eq('author_auth_uid', uid)
            .order('created_at', { ascending: false });

        if (error) {
            alert('Error fetching posts: ' + error.message);
        } else {
            setPosts(data || []);
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        const reason = prompt('Por que você deseja remover este post? (Opcional)');
        if (reason === null) return; // User cancelled

        if (!confirm('Confirma a remoção deste post?')) return;

        await logAudit('DELETE_OWN_POST', 'posts', id, { reason });

        const { error } = await supabase.from('posts').delete().eq('id', id);
        if (error) {
            alert('Erro ao deletar: ' + error.message);
        } else {
            fetchPosts(user!.id);
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen text-slate-900 dark:text-slate-100">
            <header className="sticky top-0 z-10 flex items-center bg-white dark:bg-slate-900 p-4 border-b border-slate-200 dark:border-slate-800 shadow-sm">
                <button onClick={() => navigate(-1)} className="p-2 mr-2">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-lg font-bold flex-1">Meus Posts</h1>
                <button onClick={() => user && fetchPosts(user.id)} className="p-2">
                    <span className="material-symbols-outlined">refresh</span>
                </button>
            </header>

            <main className="p-4">
                {loading ? (
                    <p className="text-center p-10 text-slate-500">Carregando...</p>
                ) : posts.length === 0 ? (
                    <div className="text-center p-10">
                        <p className="text-slate-500 mb-4">Você ainda não criou nenhum post.</p>
                        <button onClick={() => navigate('/create')} className="bg-primary text-white font-bold py-2 px-6 rounded-xl">Criar Agora</button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {posts.map((post) => (
                            <div key={post.id} className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-base">{post.title || 'Sem título'}</p>
                                        <p className="text-xs text-slate-500">{new Date(post.created_at).toLocaleString()}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${post.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                        }`}>{post.status}</span>
                                </div>
                                <p className="text-sm text-slate-700 dark:text-slate-300">{post.description}</p>

                                <div className="flex gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <button onClick={() => handleDelete(post.id)} className="flex-1 flex items-center justify-center gap-2 p-2 text-red-500 font-bold bg-red-50 dark:bg-red-900/10 rounded-lg text-sm">
                                        <span className="material-symbols-outlined text-lg">delete</span>
                                        Remover
                                    </button>
                                    {/* Placeholder for Edit */}
                                    <button onClick={() => navigate('/create', { state: { post } })} className="flex-1 flex items-center justify-center gap-2 p-2 text-primary font-bold bg-primary/10 rounded-lg text-sm">
                                        <span className="material-symbols-outlined text-lg">edit</span>
                                        Editar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default UserPostList;
