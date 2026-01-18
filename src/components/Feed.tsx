import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { IMAGES } from '../constants';
import { parsePhoneticString } from '../utils/phonetic';
import { supabase } from '../supabaseClient';
import { Airport } from '../AppContext';

const Feed = () => {
  const navigate = useNavigate();
  const { posts, user, selectedAirport, setSelectedAirport, favoriteAirports, toggleFavorite, toggleLike } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Airport[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Filter States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['official', 'collaborative', 'staff']);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const isFavorited = favoriteAirports?.some(a => a.id === selectedAirport.id);

  // Get unique categories from current posts
  const uniqueCategories = Array.from(new Set(posts.map(p => p.category || 'Geral').filter(Boolean))) as string[];

  // Debounce search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 1) {
        setIsSearching(true);
        const { data, error } = await supabase
          .from('airports')
          .select('*')
          .or(`icao.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`)
          .limit(10);

        if (!error && data) {
          setSearchResults(data);
        }
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Time State
  const [timeZ, setTimeZ] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getUTCHours().toString().padStart(2, '0');
      const minutes = now.getUTCMinutes().toString().padStart(2, '0');
      setTimeZ(`${hours}:${minutes}Z`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const startListening = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        const parsed = parsePhoneticString(transcript);
        setSearchQuery(prev => (prev ? prev + ' ' + parsed : parsed));
      };

      recognition.start();
    } else {
      alert('Reconhecimento de voz não suportado neste navegador.');
    }
  };

  const handleSelectAirport = (airport: Airport) => {
    setSelectedAirport(airport);
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const toggleTypeFilter = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleCategoryFilter = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  // Time Filter State
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const filteredPosts = posts.filter((post: any) => {
    // 1. Filter by Type
    if (!selectedTypes.includes(post.type)) return false;
    // 2. Filter by Category (if any selected)
    if (selectedCategories.length > 0 && !selectedCategories.includes(post.category || 'Geral')) return false;

    // 3. Filter by Time (if selected)
    if (selectedTime) {
      const selectedHour = parseInt(selectedTime); // e.g., "10" from "10Z"
      let postHour = -1;

      if (post.timestamp.toLowerCase().includes('ago') || post.timestamp.toLowerCase().includes('atrás') || post.timestamp.toLowerCase().includes('há')) {
        // Relative time: estimate based on current time
        const minutes = parseInt(post.timestamp.replace(/\D/g, '')) || 0;
        const now = new Date();
        const postDate = new Date(now.getTime() - (minutes * 60000));
        postHour = postDate.getUTCHours();
      } else if (post.timestamp.endsWith('Z')) {
        // Absolute time: "14:30Z"
        postHour = parseInt(post.timestamp.split(':')[0]);
      }

      if (postHour !== selectedHour) return false;
    }

    return true;
  });

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
      {/* TopAppBar */}
      <header className="sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white overflow-hidden p-0.5">
            <img src="/app-logo.png" alt="Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <h1 className="text-lg font-bold leading-tight tracking-tight">{selectedAirport.icao} - {selectedAirport.city}</h1>
              <button
                onClick={() => toggleFavorite(selectedAirport)}
                className={`p-1 transition-colors ${isFavorited ? 'text-yellow-500' : 'text-gray-500 hover:text-yellow-500'}`}
              >
                <span className={`material-symbols-outlined !text-[20px] ${isFavorited ? 'fill-1' : ''}`}>star</span>
              </button>
            </div>
            <p className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">{selectedAirport.name}</p>
          </div>
        </div>

        {/* Search Bar - Right Aligned */}
        {/* Search Trigger */}
        <div className="flex items-center justify-end">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="p-2 text-gray-500 hover:text-primary transition-colors flex items-center justify-center rounded-full active:bg-gray-100 dark:active:bg-gray-800"
          >
            <span className="material-symbols-outlined !text-[24px]">search</span>
          </button>
        </div>
      </header>

      <main className="flex-1 pb-32">
        {/* Official Summary Card */}
        <div className="p-4">
          <div className="flex flex-col items-stretch justify-start rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a2233] overflow-hidden">
            <div className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                  <p className="text-[#0c121d] dark:text-white text-sm font-bold uppercase tracking-wider">Resumo Oficial</p>
                </div>
                <p className="text-primary text-sm font-mono font-bold">{timeZ}</p>
              </div>

              <div className="flex gap-2 flex-wrap">
                <StatusChip color="red" icon="warning" label="CRÍTICO" />
                <StatusChip color="blue" icon="air" label="VENTO" />
                <StatusChip color="gray" icon="visibility" label="VIS" />
              </div>

              <div className="bg-gray-50 dark:bg-background-dark/50 rounded-lg p-3 border border-gray-100 dark:border-gray-800">
                <p className="text-gray-600 dark:text-gray-300 font-mono text-xs leading-relaxed break-all">
                  SBCT 241200Z 11012KT 9999 BKN020 22/15 Q1018 NOSIG
                </p>
              </div>

              <button onClick={() => navigate(user ? '/official' : '/onboarding')} className="flex w-full cursor-pointer items-center justify-center rounded-lg h-10 bg-primary text-white text-sm font-bold gap-2 active:scale-95 transition-transform">
                <span className="truncate">Detalhar Condições</span>
                <span className="material-symbols-outlined !text-[18px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>

        {/* Feed Section */}
        <div className="flex items-center justify-between px-4 pt-2">
          <h3 className="text-[#0c121d] dark:text-white text-lg font-bold tracking-tight">Feed de Atividade</h3>
          <button
            onClick={() => setIsFilterOpen(true)}
            className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-lg transition-colors ${(selectedCategories.length > 0 || selectedTypes.length < 3) ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:text-primary'
              }`}
          >
            <span className="material-symbols-outlined !text-[18px]">filter_list</span>
            Filtrar
            {(selectedCategories.length > 0 || selectedTypes.length < 3) && (
              <span className="flex h-2 w-2 rounded-full bg-primary ml-1"></span>
            )}
          </button>
        </div>

        <div className="flex flex-col gap-4 p-4">
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post: any) => (
              <PostCard
                key={post.id}
                post={post}
                onClick={() => navigate(user ? `/detail/${post.id}` : '/onboarding')}
                onLikeToggle={() => toggleLike(post.id)}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center text-gray-500">
              <span className="material-symbols-outlined !text-[48px] mb-2 opacity-50">search_off</span>
              <p>Nenhum post encontrado com os filtros atuais.</p>
              <button onClick={() => { setSelectedTypes(['official', 'collaborative', 'staff']); setSelectedCategories([]); }} className="text-primary text-sm font-bold mt-2">
                Limpar Filtros
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Filter Modal */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-[480px] bg-white dark:bg-[#1a2233] rounded-t-2xl shadow-xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Filtrar Feed</h3>
              <button onClick={() => setIsFilterOpen(false)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Type Filter */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Mostrar Publicações de</p>
                <div className="space-y-3">
                  <FilterCheckbox
                    label="Fontes Oficiais (METAR/TAF)"
                    checked={selectedTypes.includes('official')}
                    onChange={() => toggleTypeFilter('official')}
                    icon="verified"
                    iconColor="text-blue-500"
                  />
                  <FilterCheckbox
                    label="Colaborações de Usuários"
                    checked={selectedTypes.includes('collaborative')}
                    onChange={() => toggleTypeFilter('collaborative')}
                    icon="group"
                    iconColor="text-green-500"
                  />
                  <FilterCheckbox
                    label="Equipe / Staff"
                    checked={selectedTypes.includes('staff')}
                    onChange={() => toggleTypeFilter('staff')}
                    icon="badge"
                    iconColor="text-purple-500"
                  />
                </div>
              </div>

              {/* Category Filter */}
              {uniqueCategories.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Categorias</p>
                  <div className="flex flex-wrap gap-2">
                    {uniqueCategories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => toggleCategoryFilter(cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${selectedCategories.includes(cat)
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-primary/50'
                          }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex gap-3">
              <button
                onClick={() => {
                  setSelectedTypes(['official', 'collaborative', 'staff']);
                  setSelectedCategories([]);
                }}
                className="flex-1 py-3 text-sm font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl"
              >
                Limpar
              </button>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="flex-[2] py-3 text-sm font-bold text-white bg-primary rounded-xl shadow-lg shadow-primary/30"
              >
                Ver Resultados
              </button>
            </div>

            {/* Safe Area for Mobile */}
            <div className="h-6"></div>
          </div>
        </div>
      )}

      {/* Timeline */}
      {!isFilterOpen && (
        <>
          <div className="fixed bottom-[70px] left-0 right-0 z-30 max-w-[480px] mx-auto">
            <div className="bg-white/95 dark:bg-[#1a2233]/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 pt-3 pb-6 px-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Timeline Zulu (Histórico / Forecast)</p>
              </div>
              <div className="relative h-16 flex items-center overflow-x-auto hide-scrollbar snap-x">
                <div className="flex gap-6 items-end min-w-full px-10">
                  {/* Dynamic Timeline Generation */}
                  {Array.from({ length: 5 }).map((_, i) => {
                    const now = new Date();
                    const currentHour = now.getUTCHours();
                    const hour = (currentHour - 2 + i + 24) % 24; // Range: -2 to +2 hours
                    const isCurrent = i === 2; // Center item
                    const timeLabel = `${hour.toString().padStart(2, '0')}Z`;
                    const isSelected = selectedTime === timeLabel;

                    if (isCurrent) {
                      return (
                        <div
                          key={i}
                          onClick={() => setSelectedTime(isSelected ? null : timeLabel)}
                          className={`flex flex-col items-center gap-1 snap-center cursor-pointer transition-all ${isSelected ? 'scale-110' : 'hover:scale-105'}`}
                        >
                          <div className={`h-10 w-[3px] rounded-full relative transition-colors ${isSelected ? 'bg-blue-600 dark:bg-blue-400' : 'bg-primary'}`}>
                            <div className={`absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white dark:border-[#1a2233] transition-colors ${isSelected ? 'bg-blue-600 dark:bg-blue-400' : 'bg-primary'}`}></div>
                          </div>
                          <p className={`text-[12px] font-mono font-bold transition-colors ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-primary'}`}>{timeLabel}</p>
                        </div>
                      );
                    }

                    return (
                      <div key={i} onClick={() => setSelectedTime(isSelected ? null : timeLabel)} className="cursor-pointer">
                        <TimeMarker
                          time={timeLabel}
                          height={i % 2 === 0 ? "h-4" : "h-6"}
                          opacity={isSelected ? "opacity-100 text-blue-600 dark:text-blue-400 scale-110" : (Math.abs(i - 2) === 1 ? "opacity-60" : "opacity-40")}
                          active={isSelected}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="fixed bottom-20 left-0 right-0 z-50 max-w-[480px] mx-auto pointer-events-none flex justify-end px-6">
            <div className="group relative pointer-events-auto flex flex-col items-center">
              <div className="mb-2 font-bold text-primary text-sm whitespace-nowrap bg-white/80 dark:bg-black/80 backdrop-blur-sm px-2 py-0.5 rounded-full shadow-sm">
                {timeZ}
              </div>

              <button
                onClick={() => {
                  if (user?.role === 'registered') {
                    alert('Recurso disponível apenas para Colaboradores.');
                    return;
                  }
                  navigate(user ? '/create' : '/onboarding');
                }}
                className={`flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-xl hover:bg-blue-600 transition-colors active:scale-90 duration-150 ${user?.role === 'registered' ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
              >
                <span className="material-symbols-outlined !text-[28px]">photo_camera</span>
              </button>

              {user?.role === 'registered' && (
                <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 text-center z-50 pointer-events-none">
                  Recurso restrito a Colaboradores.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => { setIsSearchOpen(false); setSearchQuery(''); setSearchResults([]); }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchResults}
        handleSelectAirport={handleSelectAirport}
        startListening={startListening}
        isListening={isListening}
      />
    </div>
  );
};


// Helper Components
const FilterCheckbox = ({ label, checked, onChange, icon, iconColor }: any) => (
  <label className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
    <div className="flex items-center gap-3">
      <div className={`flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-[#1a2233] shadow-sm ${iconColor}`}>
        <span className="material-symbols-outlined !text-[18px]">{icon}</span>
      </div>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
    </div>
    <div className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${checked ? 'bg-primary border-primary' : 'border-gray-300 dark:border-gray-600'}`}>
      {checked && <span className="material-symbols-outlined !text-[14px] text-white">check</span>}
    </div>
    <input type="checkbox" className="hidden" checked={checked} onChange={onChange} />
  </label>
);

const StatusChip = ({ color, icon, label }: any) => {
  const colors: any = {
    red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    gray: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
  };
  const iconColors: any = {
    red: 'text-red-600 dark:text-red-400',
    blue: 'text-blue-600 dark:text-blue-400',
    gray: 'text-gray-600 dark:text-gray-400'
  };
  return (
    <div className={`flex h-7 shrink-0 items-center justify-center gap-x-1.5 rounded-lg pl-2 pr-3 ${colors[color]}`}>
      <span className={`material-symbols-outlined !text-[16px] ${iconColors[color]}`}>{icon}</span>
      <p className="text-[11px] font-bold">{label}</p>
    </div>
  )
}

const TimeMarker = ({ time, height, opacity, active }: any) => (
  <div className={`flex flex-col items-center gap-1 snap-center transition-all ${opacity}`}>
    <div className={`${height} w-[2px] ${active ? 'bg-blue-600 dark:bg-blue-400' : 'bg-gray-400'}`}></div>
    <p className={`text-[10px] font-mono ${active ? 'font-bold text-blue-600 dark:text-blue-400' : ''}`}>{time}</p>
  </div>
);

const PostCard = ({ post, onClick, onLikeToggle }: any) => {
  const isOfficial = post.type === 'official';
  const cardBg = isOfficial ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50' : 'bg-white dark:bg-[#1a2233] border-gray-200 dark:border-gray-800';

  const handleLikeClick = (e: any) => {
    e.stopPropagation();
    if (onLikeToggle) {
      onLikeToggle();
    }
  };

  return (
    <div onClick={onClick} className={`flex flex-col gap-3 p-4 rounded-xl border shadow-sm cursor-pointer transition-all hover:bg-opacity-90 ${cardBg}`}>
      <div className="flex items-start justify-between">
        <div className="flex gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden ${isOfficial ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-gray-100 dark:bg-gray-800'}`}>
            {isOfficial ? <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">verified_user</span> : <img src={post.user?.avatar || IMAGES.profileMain} className="w-full h-full object-cover" alt="" />}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <p className="text-[#0c121d] dark:text-white text-sm font-bold">{post.user?.name || "Desconhecido"}</p>
              {isOfficial && <span className="material-symbols-outlined text-blue-500 !text-[14px] fill-1">verified</span>}
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-[11px]">{isOfficial ? 'Fonte Oficial' : (post.type === 'staff' ? 'Relato da Equipe' : 'Relato de Usuário')} • {post.timestamp}</p>
          </div>
        </div>
        {post.category && <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase tracking-tight">{post.category}</span>}
        {isOfficial && <span className="px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-[10px] font-bold uppercase tracking-tight">METAR</span>}
      </div>

      <div className="flex gap-4">
        <div className="flex-1 flex flex-col gap-2">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{post.title}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">{post.description}</p>
          {!isOfficial && (
            <div className="flex gap-4 mt-2">
              <button
                onClick={handleLikeClick}
                className={`flex items-center gap-1 text-xs font-medium transition-colors ${post.likedByMe ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <span className={`material-symbols-outlined !text-[18px] ${post.likedByMe ? 'fill-1' : ''}`}>thumb_up</span>
                {post.likes > 0 ? post.likes : '0'}
              </button>
              <button className="flex items-center gap-1 text-gray-500 text-xs font-medium hover:text-gray-700">
                <span className="material-symbols-outlined !text-[18px]">chat_bubble</span>
                {post.comments ? post.comments.length : 0}
              </button>
            </div>
          )}
        </div>
        {post.image && (
          <div className="w-24 h-24 shrink-0 bg-center bg-cover rounded-lg shadow-sm border border-gray-100 dark:border-gray-700"
            style={{ backgroundImage: `url('${post.image}')` }}></div>
        )}
      </div>
    </div>
  );
};




function SearchModal({ isOpen, onClose, searchQuery, setSearchQuery, searchResults, handleSelectAirport, startListening, isListening }: any) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 pt-20 px-4" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="w-full max-w-[600px] relative flex flex-col gap-2 animate-in slide-in-from-top-4 duration-300">

        {/* Search Bar - Google Style */}
        <div className={`relative flex items-center w-full h-14 rounded-full bg-white dark:bg-[#1a2233] shadow-2xl border border-gray-200 dark:border-gray-700 px-5 transition-shadow hover:shadow-3xl ${searchResults.length > 0 ? 'rounded-b-none rounded-t-3xl border-b-0' : ''}`}>
          <span className="material-symbols-outlined text-gray-400 text-[24px]">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Busque por ICAO, Cidade ou Aeroporto..."
            className="flex-1 bg-transparent border-none outline-none text-lg text-[#0c121d] dark:text-white placeholder:text-gray-400 font-medium h-full px-4"
            autoFocus
          />

          <div className="flex items-center gap-2">
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                <span className="material-symbols-outlined !text-[24px]">close</span>
              </button>
            )}

            <div className="h-6 w-[1px] bg-gray-300 dark:bg-gray-700 mx-1"></div>

            <button
              onClick={startListening}
              className={`p-2 rounded-full transition-all ${isListening
                ? 'bg-red-100 text-red-500 animate-pulse'
                : 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
              title="Pesquisa por voz"
            >
              <span className="material-symbols-outlined !text-[24px]">{isListening ? 'mic' : 'mic'}</span>
            </button>
          </div>
        </div>

        {/* Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-14 left-0 right-0 bg-white dark:bg-[#1a2233] rounded-b-3xl shadow-2xl border border-gray-200 dark:border-gray-700 border-t-0 overflow-hidden max-h-[60vh] overflow-y-auto">
            <div className="h-[1px] bg-gray-100 dark:bg-gray-800 mx-4 mb-2"></div>
            {searchResults.map((airport: any) => (
              <button
                key={airport.id}
                onClick={() => handleSelectAirport(airport)}
                className="w-full text-left px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 flex justify-between items-center group transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 group-hover:text-primary transition-colors">
                    <span className="material-symbols-outlined !text-[20px]">flight_takeoff</span>
                  </div>
                  <div>
                    <span className="font-bold text-[#0c121d] dark:text-white block text-sm">{airport.icao}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{airport.city}</span>
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 max-w-[120px] truncate ml-2 font-medium bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{airport.name}</span>
              </button>
            ))}
            <div className="h-4"></div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Feed;