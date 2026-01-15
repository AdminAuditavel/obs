import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { IMAGES } from '../constants';

const DetailView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { posts, createComment, confirmPostValidity, reportPost, user } = useApp();
  const [commentText, setCommentText] = useState('');
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportComment, setReportComment] = useState('');
  const [confirming, setConfirming] = useState(false);

  const post = posts.find(p => p.id === id);

  if (!post) return <div>Post not found</div>;

  const handleCommentSubmit = async () => {
    if (commentText.trim()) {
      try {
        await createComment(post.id, commentText);
        setCommentText('');
      } catch (error) {
        console.error("Failed to post comment:", error);
        alert("Erro ao enviar comentário. Tente novamente.");
      }
    }
  };

  const handleConfirm = async () => {
    if (!user) {
      navigate('/onboarding');
      return;
    }
    if (confirming || post.confirmedByMe) return; // Prevent if already confirmed

    setConfirming(true);
    try {
      const result = await confirmPostValidity(post.id);
      if (result && result.success) {
        // Optimistic update of confirm count could happen here or wait for refetch (AppContext usually refetches or we manually mutate local)
        // Since we don't have a direct 'updatePost' exposed easily for partial logic without full object re-assembly in component,
        // we might rely on the window reload or just show the alert.
        // Ideally we update the context. For now, alert is fine as per prompt.
        alert(`Confirmação recebida! Total: ${result.new_count}`);
      }
    } catch (error: any) {
      console.error("Failed to confirm:", error);
      alert(error.message || "Erro ao confirmar.");
    } finally {
      setConfirming(false);
    }
  };

  const handleReport = async () => {
    if (!reportReason) return;

    try {
      await reportPost(post.id, reportReason, reportComment);
      setIsReportOpen(false);
      setReportReason('');
      setReportComment('');
      alert('Denúncia enviada com sucesso. Nossa equipe irá analisar.');
    } catch (error) {
      console.error("Failed to report:", error);
      alert("Erro ao enviar denúncia. Tente novamente.");
    }
  };

  return (
    <>
      <div className="flex flex-col bg-white dark:bg-[#1a212e]">
        {/* Author Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-800">
          <button onClick={() => navigate(-1)} className="mr-2">
            <span className="material-symbols-outlined text-gray-500">arrow_back</span>
          </button>
          <div className="h-10 w-10 rounded-full bg-cover bg-center border border-gray-200 dark:border-gray-700" style={{ backgroundImage: `url('${post.user.avatar}')` }}></div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="font-bold text-[#0c121d] dark:text-white">{post.user.name}</span>
              {post.type === 'official' && <span className="material-symbols-outlined text-blue-500 !text-[14px] fill-1">verified</span>}
            </div>
            <span className="text-xs text-gray-500">{post.timestamp}</span>
          </div>
          <div className="ml-auto">
            <button onClick={() => setIsReportOpen(true)} className="p-2 text-gray-400 hover:text-red-500">
              <span className="material-symbols-outlined !text-[20px]">flag</span>
            </button>
          </div>
        </div>

        {/* Post Content */}
        <div className="p-4 flex flex-col gap-4">
          {post.category && (
            <span className="self-start px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase tracking-tight">
              {post.category}
            </span>
          )}

          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{post.title}</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{post.description}</p>
          </div>

          {post.image && (
            <div className="w-full rounded-xl overflow-hidden shadow-sm">
              <img src={post.image} alt="Post attachment" className="w-full h-auto object-cover max-h-[400px]" />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col px-4 pb-4 bg-white dark:bg-[#1a212e] gap-4">
        <button
          onClick={handleConfirm}
          disabled={confirming || post.confirmedByMe}
          className={`flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-5 text-white gap-3 shadow-lg active:scale-95 transition-transform ${(confirming || post.confirmedByMe)
            ? 'bg-gray-400 cursor-not-allowed active:scale-100 shadow-none'
            : 'bg-success shadow-success/20'
            }`}
        >
          <span className="material-symbols-outlined text-2xl">check_circle</span>
          <span className="text-base font-bold tracking-tight">
            {post.confirmedByMe ? 'Você já confirmou' : (confirming ? 'Confirmando...' : 'Confirmar Validade')}
          </span>
        </button>

        {/* ... (reviewers avatars) ... */}
      </div>

      <div className="h-2 bg-gray-100 dark:bg-gray-900"></div>

      <div className="flex flex-col bg-white dark:bg-[#1a212e] flex-1 pb-24">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Comentários ({post.comments?.length || 0})</h3>
        </div>

        {post.comments && post.comments.length > 0 ? (
          post.comments.map((comment, i) => (
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
          ))
        ) : (
          <div className="p-8 text-center text-gray-400 text-sm">
            Nenhum comentário ainda. Seja o primeiro!
          </div>
        )}

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

      {/* Report Modal */}
      {
        isReportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#1a212e] rounded-xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
              <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Reportar Publicação</h3>

              <div className="space-y-3 mb-4">
                <p className="text-sm text-gray-500 mb-2">Selecione o motivo:</p>
                {['Spam / Irrelevante', 'Informação Incorreta', 'Conteúdo Ofensivo', 'Outro'].map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setReportReason(reason)}
                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${reportReason === reason
                      ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <textarea
                className="w-full h-24 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none resize-none mb-4"
                placeholder="Detalhes adicionais (opcional)..."
                value={reportComment}
                onChange={(e) => setReportComment(e.target.value)}
              ></textarea>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsReportOpen(false)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReport}
                  disabled={!reportReason}
                  className={`flex-1 py-2.5 rounded-lg font-bold text-white transition-colors ${!reportReason ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30'}`}
                >
                  Enviar Report
                </button>
              </div>
            </div>
          </div>
        )
      }
    </>
  );
};

export default DetailView;