import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { IMAGES } from '../constants';
import { User } from '../types';
import { UserBadge } from './UserBadge';

const DetailView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { posts, createComment, confirmPostValidity, reportPost, toggleLike, user, fetchPosts } = useApp();
  const [commentText, setCommentText] = useState('');
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportComment, setReportComment] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const post = posts.find(p => p.id === id);

  if (!post) return <div>Post não encontrado</div>;

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
    if (confirming) return;
    setConfirming(true);
    try {
      const result = await confirmPostValidity(post.id);
      if (result && result.success) {
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
      alert("Report enviado com sucesso. Obrigado por colaborar.");
    } catch (error: any) {
      console.error("Failed to report:", error);
      alert("Falha ao enviar report.");
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
          <button
            onClick={() => user ? setIsReportOpen(true) : navigate('/onboarding')}
            className="text-white text-sm font-bold bg-red-500/80 hover:bg-red-600 px-4 py-1.5 rounded-full transition-colors"
          >
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
            {post.type === 'official' ? (
              <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Fonte Oficial</span>
            ) : (
              <UserBadge job_title={post.user.job_title} />
            )}
          </div>
          <p className="text-[#4567a1] dark:text-gray-400 text-xs font-medium mt-1 uppercase">{post.timestamp} • 5.2nm away</p>
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

        {/* Like Button Removed as per request. Confirmation is the primary action now. */}

      </div>

      <div className="flex flex-col px-4 py-4 bg-white dark:bg-[#1a212e] gap-4">
        {/* Helper text explaining the rule */}
        <p className="text-xs text-gray-400 text-center italic">
          Você pode confirmar este relato novamente após 1 hora se a condição persistir.
        </p>

        {(() => {
          const now = Date.now();
          const lastConf = post.myLastConfirmationAt ? new Date(post.myLastConfirmationAt).getTime() : 0;
          const diffHours = (now - lastConf) / (1000 * 60 * 60);
          const canConfirm = !post.confirmedByMe || diffHours >= 1;

          // If confirmedByMe is true BUT it was < 1 hour ago => Read-Only (Disabled state)
          // If confirmedByMe is true BUT it was > 1 hour ago => Enabled (Re-confirm state)
          // If confirming state => disabled

          const isCooldown = post.confirmedByMe && diffHours < 1;

          return (
            <button
              onClick={canConfirm ? handleConfirm : undefined}
              disabled={confirming || isCooldown}
              className={`flex w-full items-center justify-center overflow-hidden rounded-xl h-14 px-5 text-white gap-3 shadow-lg transition-transform ${isCooldown
                ? 'bg-gray-400 cursor-not-allowed shadow-none' // Read-only look
                : confirming
                  ? 'bg-gray-400 cursor-wait'
                  : canConfirm && post.confirmedByMe
                    ? 'bg-blue-600 shadow-blue-600/20 cursor-pointer active:scale-95' // Re-confirm (Actionable)
                    : 'bg-green-600 shadow-green-600/20 cursor-pointer active:scale-95' // First confirm
                }`}
            >
              <span className="material-symbols-outlined text-2xl">check_circle</span>
              <span className="text-base font-bold tracking-tight">
                {confirming
                  ? 'Confirmando...'
                  : isCooldown
                    ? 'Confirmado'
                    : (post.confirmedByMe ? 'Confirmar Novamente' : 'Confirmar Validade')}
              </span>
            </button>
          );
        })()}


        {/* Facepile of commenters - Only show if there are comments */}
        {post.comments.length > 0 && (() => {
          // Get unique users from comments
          const uniqueCommenters = Array.from(
            new Map(post.comments.map((c: any) => [c.user.id, c.user])).values()
          ) as User[];
          const displayUsers = uniqueCommenters.slice(0, 3);
          const remainingCount = uniqueCommenters.length - 3;

          return (
            <div className="flex items-center gap-3 py-1">
              <div className="flex -space-x-3 overflow-hidden">
                {displayUsers.map((u) => (
                  <div
                    key={u.id}
                    className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-[#1a212e] bg-cover bg-center"
                    style={{ backgroundImage: `url('${u.avatar || IMAGES.avatar1}')` }}
                    title={u.callsign || u.name}
                  ></div>
                ))}

                {remainingCount > 0 && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-white dark:ring-[#1a212e] bg-gray-200 dark:bg-gray-700">
                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">+{remainingCount}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {uniqueCommenters.length === 1
                  ? `${(uniqueCommenters[0].callsign || uniqueCommenters[0].name).split(' ')[0]} comentou isso`
                  : `Outros pilotos comentaram`}
              </p>
            </div>
          );
        })()}
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
                <span className="text-sm font-bold">{comment.user.callsign || comment.user.name}</span>
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

      {/* Report Modal */}
      {isReportOpen && (
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
      )}

    </div>
  );
};

export default DetailView;