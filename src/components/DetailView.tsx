import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { IMAGES } from '../constants';

const DetailView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { posts, addComment } = useApp();
  const [commentText, setCommentText] = useState('');
  
  const post = posts.find(p => p.id === id);

  if (!post) return <div>Post not found</div>;

  const handleCommentSubmit = () => {
    if (commentText.trim()) {
      addComment(post.id, commentText);
      setCommentText('');
    }
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden pb-20">
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center p-4 justify-between bg-gradient-to-b from-black/50 to-transparent">
        <div onClick={() => navigate(-1)} className="text-white flex size-10 shrink-0 items-center justify-center rounded-full bg-black/20 backdrop-blur-md cursor-pointer">
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </div>
        <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 ml-4">Detalhe</h2>
        <div className="flex items-center justify-end">
          <button className="text-white text-sm font-bold bg-red-500/80 hover:bg-red-600 px-4 py-1.5 rounded-full transition-colors">
            Reportar
          </button>
        </div>
      </div>

      <div className="w-full">
        <div className="w-full bg-center bg-no-repeat bg-cover flex flex-col justify-end min-h-[320px] shadow-lg" 
             style={{ backgroundImage: `url('${post.image || IMAGES.planeDetail}')` }}>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white dark:bg-[#1a212e] px-4 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-12 w-12 border-2 border-primary" 
             style={{ backgroundImage: `url('${post.user.avatar || IMAGES.avatar1}')` }}></div>
        <div className="flex flex-col justify-center flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[#0c121d] dark:text-white text-base font-bold leading-tight">{post.user.name}</p>
            <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Colaborative</span>
          </div>
          <p className="text-[#4567a1] dark:text-gray-400 text-xs font-medium mt-1 uppercase">14:20 UTC • 5.2nm away</p>
        </div>
        <div className="shrink-0">
          <div className="flex size-8 items-center justify-center bg-success/10 rounded-full">
            <span className="material-symbols-outlined text-success text-xl">verified</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1a212e] px-4 py-4">
        <p className="text-[#0c121d] dark:text-gray-200 text-lg font-medium leading-relaxed">
           {post.description}
        </p>
      </div>

      <div className="flex flex-col px-4 py-4 bg-white dark:bg-[#1a212e] gap-4">
        <button className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-5 bg-success text-white gap-3 shadow-lg shadow-success/20 active:scale-95 transition-transform">
          <span className="material-symbols-outlined text-2xl">check_circle</span>
          <span className="text-base font-bold tracking-tight">Confirmar Validade</span>
        </button>
        
        <div className="flex items-center gap-3 py-1">
          <div className="flex -space-x-3 overflow-hidden">
             <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-[#1a212e] bg-cover bg-center" style={{ backgroundImage: `url('${IMAGES.reviewer1}')` }}></div>
             <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-[#1a212e] bg-cover bg-center" style={{ backgroundImage: `url('${IMAGES.reviewer2}')` }}></div>
             <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-[#1a212e] bg-cover bg-center" style={{ backgroundImage: `url('${IMAGES.reviewer3}')` }}></div>
             <div className="flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-white dark:ring-[#1a212e] bg-gray-200 dark:bg-gray-700">
               <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">+12</span>
             </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Outros pilotos confirmaram esta condição</p>
        </div>
      </div>

      <div className="h-2 bg-gray-100 dark:bg-gray-900"></div>

      <div className="flex flex-col bg-white dark:bg-[#1a212e] flex-1 pb-24">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Comentários</h3>
        </div>
        
        {post.comments.map((comment, i) => (
             <div key={i} className="flex gap-3 p-4 border-b border-gray-50 dark:border-gray-800/50">
                <div className="h-10 w-10 rounded-full bg-cover bg-center shrink-0" style={{ backgroundImage: `url('${comment.user.avatar}')` }}></div>
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{comment.user.name}</span>
                    <span className="text-[10px] text-gray-400">{comment.timestamp}</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{comment.text}</p>
                </div>
            </div>
        ))}

      </div>

      <div className="fixed bottom-0 max-w-[480px] w-full p-3 bg-white/90 dark:bg-background-dark/90 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 flex items-center gap-3 z-20">
        <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2.5 flex items-center gap-2">
          <input className="bg-transparent border-none focus:ring-0 text-sm w-full outline-none text-[#0c121d] dark:text-white placeholder:text-gray-500" 
                 placeholder="Adicionar comentário..." type="text" 
                 value={commentText}
                 onChange={(e) => setCommentText(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit()}
                 />
        </div>
        <button onClick={handleCommentSubmit} className="bg-primary text-white p-2.5 rounded-full flex items-center justify-center shadow-md shadow-primary/30">
          <span className="material-symbols-outlined text-xl">send</span>
        </button>
      </div>
    </div>
  );
};

export default DetailView;