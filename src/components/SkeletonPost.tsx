import React from 'react';

export const SkeletonPost = () => {
    return (
        <div className="bg-white dark:bg-[#1a2233] p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse shrink-0" />
                <div className="flex flex-col gap-1.5 w-full">
                    {/* Name */}
                    <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    {/* Tag */}
                    <div className="h-2 w-20 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                </div>
            </div>

            {/* Body */}
            <div className="space-y-2">
                <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-2.5 w-3/4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            </div>

            {/* Image Placeholder */}
            <div className="w-full h-48 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />

            {/* Footer */}
            <div className="flex items-center justify-between pt-2">
                <div className="flex gap-4">
                    <div className="h-5 w-12 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse" />
                    <div className="h-5 w-12 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse" />
                </div>
                <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            </div>
        </div>
    );
};
