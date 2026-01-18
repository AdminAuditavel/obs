import React from 'react';

interface UserBadgeProps {
    job_title?: string;
    className?: string;
    showLabel?: boolean;
}

export const UserBadge = ({ job_title, className = '', showLabel = true }: UserBadgeProps) => {
    // Roles: pilot, mech, atc, ground, registered (default)

    let icon = '';
    let label = '';
    let color = 'text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400';

    // Normalize role string just in case
    const r = job_title?.toLowerCase() || '';

    if (r === 'pilot') {
        icon = '✈️';
        label = 'Piloto';
        color = 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300';
    } else if (r === 'mech') {
        icon = '🔧';
        label = 'Mecânico';
        color = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    } else if (r === 'atc') {
        icon = '📡';
        label = 'Torre/ATC';
        color = 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    } else if (r === 'ground') {
        icon = '🚜';
        label = 'Solo';
        color = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    } else if (r === 'staff' || r === 'admin') {
        icon = '🛡️';
        label = 'Equipe';
        color = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    } else {
        // Default / Registered / Unknown
        return null;
    }

    return (
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight ${color} ${className}`}>
            <span className="text-[12px]">{icon}</span>
            {showLabel && <span>{label}</span>}
        </span>
    );
};
