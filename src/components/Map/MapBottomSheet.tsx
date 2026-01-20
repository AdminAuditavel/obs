import React from 'react';
import { Post } from '..\/..\/types';
import { useNavigate } from 'react-router-dom';

interface MapBottomSheetProps {
    post: Post | null;
    onClose: () => void;
}

export const MapBottomSheet: React.FC<MapBottomSheetProps> = ({ post, onClose }) => {
    const navigate = useNavigate();

    if (!post) return null;

    const timeAgo = (date: string) => {
        const diff = Date.now() - new Date(date).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m atrás`;
        const hours = Math.floor(mins / 60);
        return `${hours}h atrás`;
    };

    return (
        <div className="absolute bottom-24 left-4 right-4 z-[9999] animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="bg-white dark:bg-[#1a2233] rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 p-4 flex items-center gap-4 relative overflow-hidden">
                {/* Close Button */}
                <button
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                    <span className="material-symbols-outlined !text-[16px]">close</span>
                </button>

                <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-700">
                    {post.image ? (
                        <img src={post.image} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                        <span className="material-symbols-outlined text-gray-400">image_not_supported</span>
                    )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${post.type === 'official' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                            {post.category || 'Geral'}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                            {timeAgo(post.createdAt)}
                        </span>
                    </div>
                    <h4 className="font-bold text-[#0c121d] dark:text-white truncate text-sm">
                        {post.title}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {post.description}
                    </p>
                </div>

                <button
                    onClick={() => navigate(`/detail/${post.id}`)}
                    className="h-10 w-10 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
                >
                    <span className="material-symbols-outlined !text-[20px]">arrow_forward</span>
                </button>
            </div>
        </div>
    );
};
