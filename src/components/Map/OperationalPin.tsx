import React from 'react';
import { Marker } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { Post } from '..\/..\/types';

interface OperationalPinProps {
    post: Post;
    onClick: (post: Post) => void;
}

const getPinColor = (type: string, category?: string) => {
    // Critical (Red)
    if (category === 'FOD' || category === 'Acidente' || category === 'Interdição') return 'bg-red-500 border-red-200';
    // Caution (Orange)
    if (category === 'Manutenção' || category === 'Fauna' || category === 'Meteorologia') return 'bg-amber-500 border-amber-200';
    // Info (Blue)
    return 'bg-blue-500 border-blue-200';
};

const getPinIcon = (type: string) => {
    switch (type) {
        case 'official': return 'campaign';
        case 'staff': return 'construction';
        default: return 'visibility';
    }
};

export const OperationalPin: React.FC<OperationalPinProps> = ({ post, onClick }) => {
    // Check for decay
    const isOld = (Date.now() - new Date(post.createdAt).getTime()) > 1000 * 60 * 60 * 2; // > 2 hours
    const opacityClass = isOld ? 'opacity-50 grayscale' : 'opacity-100';

    const colorClass = getPinColor(post.type, post.category);
    const iconName = getPinIcon(post.type);

    const customIcon = divIcon({
        className: 'custom-icon',
        html: `
            <div class="flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 ${opacityClass} transition-all duration-300 hover:scale-110">
               <div class="h-8 w-8 rounded-full ${colorClass} border-2 flex items-center justify-center shadow-lg text-white">
                  <span class="material-symbols-outlined !text-[18px] font-bold">${iconName}</span>
               </div>
               <div class="mt-1 px-1.5 py-0.5 bg-black/70 backdrop-blur-md rounded text-[9px] font-bold text-white whitespace-nowrap hidden sm:block">
                  ${post.category || 'Relato'}
               </div>
            </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20] // Center
    });

    if (!post.latitude || !post.longitude) return null;

    return (
        <Marker
            position={[post.latitude, post.longitude]}
            icon={customIcon}
            eventHandlers={{
                click: () => onClick(post)
            }}
        />
    );
};
