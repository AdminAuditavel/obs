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

    return <span className="text-[10px] bg-gray-200 rounded px-1">DEBUG</span>;
};
