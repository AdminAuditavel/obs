import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { OperationalMapContainer } from './Map/MapContainer';
import { OperationalPin } from './Map/OperationalPin';
import { MapBottomSheet } from './Map/MapBottomSheet';
import { MapMetarLayer } from './Map/MapMetarLayer';
import { Post } from '../types';

const MapView = () => {
  const navigate = useNavigate();
  const { posts } = useApp();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Filter States
  const [showAlerts, setShowAlerts] = useState(true);
  const [showStaff, setShowStaff] = useState(true);
  const [showOfficial, setShowOfficial] = useState(true);
  const [showMetar, setShowMetar] = useState(true);

  // Filter posts with valid coordinates
  const mapPosts = useMemo(() => {
    return posts.filter(p => {
      if (!p.latitude || !p.longitude) return false;

      // Visual Filters
      if (p.type === 'official' && !showOfficial) return false;
      if (p.type === 'staff' && !showStaff) return false;
      // "Alerts" captures user reports + critical stuff generally?
      // For now let's map "collaborative" to Alerts if we want a simple toggle
      if (p.type === 'collaborative' && !showAlerts) return false;

      return true;
    });
  }, [posts, showAlerts, showStaff, showOfficial]);

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-hidden bg-slate-900">
      <OperationalMapContainer>
        {showMetar && <MapMetarLayer />}
        {mapPosts.map(post => (
          <OperationalPin
            key={post.id}
            post={post}
            onClick={(p) => setSelectedPost(p)}
          />
        ))}
      </OperationalMapContainer>

      {/* Floating Header (Search & Filters) */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pt-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
        <div className="bg-white dark:bg-[#1a2233] shadow-lg rounded-xl flex items-center p-3 gap-3 border border-slate-200 dark:border-slate-800 pointer-events-auto">
          <span className="material-symbols-outlined text-slate-400">search</span>
          <input
            type="text"
            placeholder="Buscar reporte ou local..."
            className="flex-1 bg-transparent outline-none text-slate-800 dark:text-white placeholder:text-slate-400 text-sm font-medium"
          />
        </div>

        <div className="flex gap-2 mt-3 overflow-x-auto hide-scrollbar pb-2 pointer-events-auto">
          <FilterPill
            icon="warning"
            label="Alertas"
            active={showAlerts}
            onClick={() => setShowAlerts(!showAlerts)}
          />
          <FilterPill
            icon="campaign"
            label="Oficial"
            active={showOfficial}
            onClick={() => setShowOfficial(!showOfficial)}
          />
          <FilterPill
            icon="construction"
            label="Equipes"
            active={showStaff}
            onClick={() => setShowStaff(!showStaff)}
          />
          <FilterPill
            icon="cloud"
            label="Meteorologia"
            active={showMetar}
            onClick={() => setShowMetar(!showMetar)}
          />
        </div>
      </div>

      <MapBottomSheet
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
      />

      {/* Current Location FAB (Bottom Right) */}
      <div className="absolute bottom-24 right-4 z-[1000]">
        <button className="h-12 w-12 bg-white dark:bg-[#1a2233] rounded-full shadow-lg flex items-center justify-center text-slate-700 dark:text-gray-200 border border-slate-100 dark:border-slate-800 active:scale-90 transition-transform">
          <span className="material-symbols-outlined">my_location</span>
        </button>
      </div>

    </div>
  );
};

const FilterPill = ({ icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm whitespace-nowrap transition-colors border ${active
        ? 'bg-primary text-white border-primary'
        : 'bg-white dark:bg-[#1a2233] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-800'
      }`}
  >
    <span className="material-symbols-outlined !text-[16px]">{icon}</span>
    {label}
  </button>
)

export default MapView;