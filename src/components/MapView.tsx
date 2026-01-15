import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { IMAGES } from '../constants';

const MapView = () => {
  const navigate = useNavigate();
  const { posts } = useApp();

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-hidden bg-slate-200 dark:bg-slate-900">
      {/* Map Background Simulation */}
      <div className="absolute inset-0 z-0 bg-[#e5e5f7] dark:bg-[#0f1623] opacity-80" 
           style={{ 
             backgroundImage: 'radial-gradient(#444cf7 0.5px, transparent 0.5px), radial-gradient(#444cf7 0.5px, #e5e5f7 0.5px)',
             backgroundSize: '20px 20px',
             backgroundPosition: '0 0, 10px 10px'
           }}>
      </div>
      
      {/* Fake Map Content (River/Runway) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-32 bg-slate-300 dark:bg-slate-800 rotate-45 transform border-y-4 border-slate-400/30"></div>

      {/* Pins */}
      <div className="absolute top-1/3 left-1/4 z-0 flex flex-col items-center cursor-pointer animate-bounce" style={{ animationDuration: '2s' }}>
        <div className="bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg mb-1 whitespace-nowrap">
            FOD (Pista)
        </div>
        <span className="material-symbols-outlined text-primary text-4xl drop-shadow-lg fill-1">location_on</span>
      </div>

      <div className="absolute bottom-1/3 right-1/4 z-0 flex flex-col items-center cursor-pointer">
        <div className="bg-warning-orange text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg mb-1 whitespace-nowrap">
            Manutenção
        </div>
        <span className="material-symbols-outlined text-warning-orange text-4xl drop-shadow-lg fill-1">location_on</span>
      </div>

      {/* Floating Header (Search) */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 pt-4 bg-gradient-to-b from-white/80 via-white/40 to-transparent dark:from-black/80 dark:via-black/40">
        <div className="bg-white dark:bg-card-dark shadow-lg rounded-xl flex items-center p-3 gap-3 border border-slate-200 dark:border-slate-800">
            <span className="material-symbols-outlined text-slate-400">search</span>
            <input 
                type="text" 
                placeholder="Buscar reporte ou local..." 
                className="flex-1 bg-transparent outline-none text-slate-800 dark:text-white placeholder:text-slate-400 text-sm font-medium"
            />
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
            <button className="text-primary font-bold text-xs uppercase tracking-wide">Filtros</button>
        </div>
        
        <div className="flex gap-2 mt-3 overflow-x-auto hide-scrollbar pb-2">
             <FilterPill icon="warning" label="Alertas" active />
             <FilterPill icon="flight" label="Aeronaves" />
             <FilterPill icon="group" label="Equipes" />
             <FilterPill icon="cloud" label="METAR" />
        </div>
      </div>

      {/* Bottom Sheet Preview */}
      <div className="absolute bottom-24 left-4 right-4 z-20">
        <div className="bg-white dark:bg-card-dark rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 p-4 flex items-center gap-4">
             <div className="h-12 w-12 rounded-lg bg-cover bg-center shrink-0" style={{ backgroundImage: `url('${IMAGES.fogRunway}')` }}></div>
             <div className="flex-1 min-w-0">
                 <h4 className="font-bold text-slate-900 dark:text-white truncate">Fog forming on Rwy 15</h4>
                 <p className="text-xs text-slate-500 dark:text-slate-400">Reportado há 12m • PR-GUZ</p>
             </div>
             <button onClick={() => navigate('/detail/2')} className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-primary">
                 <span className="material-symbols-outlined">arrow_forward</span>
             </button>
        </div>
      </div>

      {/* Current Location FAB */}
      <button className="absolute bottom-44 right-4 z-20 h-12 w-12 bg-white dark:bg-card-dark rounded-full shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-800 active:scale-90 transition-transform">
          <span className="material-symbols-outlined">my_location</span>
      </button>
    </div>
  );
};

const FilterPill = ({ icon, label, active }: any) => (
    <button className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm whitespace-nowrap transition-colors ${active ? 'bg-primary text-white' : 'bg-white dark:bg-card-dark text-slate-600 dark:text-slate-300'}`}>
        <span className="material-symbols-outlined !text-[16px]">{icon}</span>
        {label}
    </button>
)

export default MapView;