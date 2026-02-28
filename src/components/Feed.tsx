import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SunCalc from 'suncalc';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../AppContext';
import { IMAGES } from '../constants';
import { parsePhoneticString } from '../utils/phonetic';
import { supabase } from '../supabaseClient';
import { Airport } from '../AppContext';
import { getWeather } from '../services/weatherService';
import { searchAirports } from '../services/aiswebService';
import { UserBadge } from './UserBadge';
import { parseMetar } from '../utils/metarParser';
import { TimeTimeline } from './TimeTimeline';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { SkeletonPost } from './SkeletonPost';
import { haptics } from '../utils/haptics';
const Feed = () => {
  const navigate = useNavigate();
  const { posts, user, selectedAirport, setSelectedAirport, favoriteAirports, toggleFavorite, toggleLike, fetchPosts } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Airport[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);

  const handleRefresh = async () => {
    haptics.impactMedium();
    await fetchPosts();
    // Simulate a minimum delay for feeling
    await new Promise(r => setTimeout(r, 800));
  };

  const { isRefreshing, pullDistance } = usePullToRefresh(handleRefresh);

  // Refetch posts on mount
  useEffect(() => {
    const load = async () => {
      setIsLoadingFeed(true);
      await fetchPosts();
      setIsLoadingFeed(false);
    };
    load();
  }, []);


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
        try {
          const results = await searchAirports(searchQuery);
          setSearchResults(results);
        } catch (error) {
          console.error("AISWEB search failed:", error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Time State
  const [timeZ, setTimeZ] = useState("");
  const [metar, setMetar] = useState<string | null>(null);
  const [taf, setTaf] = useState<string | null>(null);
  const [isLoadingMetar, setIsLoadingMetar] = useState(false);

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

  // Fetch Weather
  useEffect(() => {
    const fetchMetar = async () => {
      if (!selectedAirport?.icao) return;

      setIsLoadingMetar(true);
      setMetar(null); // Reset while loading
      setTaf(null);

      try {
        const data = await getWeather(selectedAirport.icao);
        if (data) {
          setMetar(data.raw || "METAR não disponível.");
          // Explicitly set TAF if available, otherwise null.
          setTaf(data.taf || null);
        } else {
          setMetar("METAR não disponível no momento.");
        }
      } catch (err) {
        setMetar("Erro ao carregar dados meteorológicos.");
      } finally {
        setIsLoadingMetar(false);
      }
    };

    fetchMetar();
  }, [selectedAirport]);

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

  const displayHour = React.useMemo(() => {
    return selectedTime ? new Date(selectedTime).getHours() : new Date().getHours();
  }, [selectedTime]);

  const isFuture = React.useMemo(() => {
    if (!selectedTime) return false;
    const now = new Date();
    const sel = new Date(selectedTime);
    return sel > now;
  }, [selectedTime]);

  // helper for decay
  const getPostAgeStatus = (createdAt: string) => {
    // If no createdAt (e.g. legacy mocks), fallback to safe default
    if (!createdAt) return 'old';

    // Fix: Ensure we handle potential timezone offsets if string is UTC but Date.now is local? 
    // ISO string is usually handled correctly by new Date().
    const createdTime = new Date(createdAt).getTime();
    const diff = Date.now() - createdTime;
    const minutes = diff / 60000;

    if (minutes < 30) return 'fresh'; // Green
    if (minutes < 120) return 'aging'; // Yellow
    return 'old'; // Gray (< 6h)
  };

  // Calculate Sun Times
  const sunTimes = React.useMemo(() => {
    if (selectedAirport?.lat && selectedAirport?.lon) {
      const times = SunCalc.getTimes(new Date(), selectedAirport.lat, selectedAirport.lon);
      const formatTime = (date: Date) => {
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      };
      return {
        sunrise: formatTime(times.sunrise),
        sunset: formatTime(times.sunset)
      };
    }
    return null;
  }, [selectedAirport]);

  const filteredPosts = posts.filter((post: any) => {
    // 0. Filter Expired (Visual Decay - Focus on NOW)
    // Filter out posts older than 6 hours automatically
    if (post.createdAt) {
      const diff = Date.now() - new Date(post.createdAt).getTime();
      const hours = diff / (1000 * 60 * 60);
      if (hours > 6) return false;
    }

    // 1. Filter by Type
    if (!selectedTypes.includes(post.type)) return false;
    // 2. Filter by Category (if any selected)
    if (selectedCategories.length > 0 && !selectedCategories.includes(post.category || 'Geral')) return false;

    // 3. Filter by Time (if selected)
    if (selectedTime) {
      const selectedDate = new Date(selectedTime);
      const selectedUTCHour = selectedDate.getUTCHours();
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

      if (postHour !== selectedUTCHour) return false;
    }

    return true;
  });

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
      {/* Hero Header */}
      <div className="relative w-full h-[240px] shrink-0">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={(() => {
              if (displayHour >= 6 && displayHour < 9) return '/header-bg-sunrise.png';
              if (displayHour >= 9 && displayHour < 17) return '/header-bg-day.png';
              return '/header-bg-sunset.png';
            })()}
            alt="Airport Background"
            className="w-full h-full object-cover"
          />
          {/* Gradient Overlay for Readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/20 to-black/30"></div>
        </div>

        {/* Top Floating Bar */}
        <div className="absolute top-0 left-0 right-0 z-50 px-4 py-6 flex justify-between items-start">
          {/* Top Left: ICAO & Weather */}
          <div className="flex flex-col items-start gap-2">
            <div className="bg-black/30 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-2">
              <span className="text-white font-mono font-bold text-xs tracking-wider">
                {selectedAirport.icao}
              </span>
            </div>

            {/* Present Weather Badge */}
            {(() => {
              if (!metar) return null;
              const parsed = parseMetar(metar);
              const cond = parsed.condition;
              // Filter non-significant weather
              if (!cond || cond === 'N/A' || cond === 'NSW' || cond === 'No Wx' || cond.includes('CAVOK')) return null;

              const getIcon = (c: string) => {
                if (c.includes('TS')) return 'thunderstorm';
                if (c.includes('SH')) return 'rainy';
                if (c.includes('RA')) return 'rainy';
                if (c.includes('DZ')) return 'rainy_light';
                if (c.includes('SN') || c.includes('SG')) return 'weather_snowy';
                if (c.includes('GR') || c.includes('GS')) return 'weather_hail';
                if (c.includes('FG') || c.includes('BR')) return 'foggy';
                if (c.includes('HZ') || c.includes('FU') || c.includes('VA')) return 'dehaze';
                if (c.includes('SQ') || c.includes('FC') || c.includes('SS')) return 'cyclone';
                return 'cloud';
              };

              return (
                <div className="bg-black/30 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-2 animate-in fade-in slide-in-from-left-2 transition-all">
                  <span className="material-symbols-outlined text-amber-400 !text-[16px] drop-shadow-md">{getIcon(cond)}</span>
                  <span className="text-white text-xs font-medium drop-shadow-md capitalize">
                    {parsed.tooltips.condition}
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Top Right: Search */}
          <div className="flex items-center h-9 rounded-full bg-black/30 backdrop-blur-md border border-white/10 px-3 transition-all focus-within:bg-black/50 focus-within:border-white/20 w-[180px] focus-within:w-[220px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar..."
              className="w-full bg-transparent border-none outline-none text-xs text-white placeholder:text-gray-300 font-medium h-full"
            />
            <div className="flex items-center gap-1">
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-gray-300 hover:text-white">
                  <span className="material-symbols-outlined !text-[16px]">close</span>
                </button>
              )}
              <button
                onClick={startListening}
                className={`flex items-center justify-center ${isListening ? 'text-red-400 animate-pulse' : 'text-gray-300 hover:text-white'}`}
              >
                <span className="material-symbols-outlined !text-[16px]">{isListening ? 'mic' : 'mic'}</span>
              </button>
            </div>

            {/* Search Dropdown Results */}
            {searchResults.length > 0 && (
              <div className="absolute top-10 right-0 left-auto w-[280px] bg-white dark:bg-[#1a2233] rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden max-h-[60vh] overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2">
                {searchResults.map((airport: any) => (
                  <button
                    key={airport.id}
                    onClick={() => handleSelectAirport(airport)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 flex justify-between items-center group transition-colors border-b border-gray-50 dark:border-gray-800/50 last:border-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 shrink-0 rounded-full bg-white border border-gray-100 dark:border-gray-800 flex items-center justify-center overflow-hidden p-[1px]">
                        <img src="/app-logo.png" alt="Logo" className="w-full h-full object-contain" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-[#0c121d] dark:text-white block text-sm truncate">{airport.icao} / {airport.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate block">{airport.city}, {airport.state}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Hero Content (Bottom Aligned) */}
        <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col items-start gap-1 z-20">
          {/* Airport Name & Star */}
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white leading-tight drop-shadow-lg">
              {selectedAirport.name.replace('Aeroporto ', '')}
            </h1>
            <button
              onClick={() => toggleFavorite(selectedAirport)}
              className={`p-1 rounded-full transition-all hover:scale-110 ${isFavorited ? 'text-yellow-500' : 'text-white/50 hover:text-yellow-400'}`}
            >
              <span className={`material-symbols-outlined !text-[20px] ${isFavorited ? 'fill-1' : ''}`}>star</span>
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 pb-32 relative z-30 transition-transform duration-200 ease-out" style={{ transform: `translateY(${pullDistance}px)` }}>
        {/* Pull To Refresh Indicator */}
        <div className="absolute top-[-50px] left-0 right-0 flex justify-center items-center h-[50px]">
          {isRefreshing ? (
            <span className="material-symbols-outlined animate-spin text-primary">sync</span>
          ) : (
            <span className="material-symbols-outlined text-primary/50" style={{ transform: `rotate(${pullDistance * 2}deg)` }}>arrow_downward</span>
          )}
        </div>

        {/* Official Summary Card */}
        {/* Official Summary Card (Conditional TAF or METAR) */}
        <div className="p-4">
          {isFuture && taf ? (
            <div className="flex flex-col items-stretch justify-start rounded-xl shadow-sm border border-indigo-200 dark:border-indigo-900 bg-white dark:bg-[#1a2233] overflow-hidden border-l-4 border-l-indigo-500 animate-in fade-in slide-in-from-bottom-4">
              <div className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-500 !text-[20px]">calendar_clock</span>
                    <p className="text-indigo-900 dark:text-indigo-100 text-sm font-bold uppercase tracking-wider">Previsão TAF</p>
                  </div>
                </div>
                <div className="bg-indigo-50/50 dark:bg-indigo-900/10 rounded-lg p-3 border border-indigo-100 dark:border-indigo-800/30 min-h-[60px] flex items-center">
                  <p className="text-gray-700 dark:text-gray-300 font-mono text-xs leading-relaxed break-all">
                    {taf}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className={`flex flex-col items-stretch justify-start rounded-xl shadow-sm border bg-white dark:bg-[#1a2233] overflow-hidden transition-all duration-500 ${metar ? (
              parseMetar(metar).redemetColor === 'red' ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] dark:shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-pulse-subtle' :
                parseMetar(metar).redemetColor === 'yellow' ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)] dark:shadow-[0_0_20px_rgba(251,191,36,0.2)]' :
                  'border-green-500/50 dark:border-green-500/30'
            ) : 'border-gray-200 dark:border-gray-800'
              }`}>
              <div className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-[#0c121d] dark:text-white text-sm font-bold uppercase tracking-wider">Resumo Oficial</p>
                    {metar && (
                      <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${parseMetar(metar).type === 'SPECI'
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                        }`}>
                        {parseMetar(metar).type}
                      </span>
                    )}
                    {sunTimes && (
                      <div className="flex items-center gap-2 ml-2 border-l border-gray-200 dark:border-gray-700 pl-2">
                        <div className="flex items-center gap-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                          <span className="material-symbols-outlined !text-[14px] text-amber-500">wb_twilight</span>
                          {sunTimes.sunrise}
                        </div>
                        <div className="flex items-center gap-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                          <span className="material-symbols-outlined !text-[14px] text-orange-400">wb_twilight</span>
                          {sunTimes.sunset}
                        </div>
                      </div>
                    )}
                  </div>
                  {metar && (
                    <FlightCategoryBadge category={parseMetar(metar).flightCategory} />
                  )}
                </div>

                <div className="bg-gray-50 dark:bg-background-dark/50 rounded-lg p-3 border border-gray-100 dark:border-gray-800 min-h-[60px] flex items-center mb-0">
                  {isLoadingMetar ? (
                    <div className="flex items-center gap-2 text-gray-400 text-xs animate-pulse">
                      <span className="material-symbols-outlined !text-[16px] animate-spin">sync</span>
                      <span>Atualizando dados...</span>
                    </div>
                  ) : (
                    <p className="text-gray-600 dark:text-gray-300 font-mono text-xs leading-relaxed break-all">
                      {metar || "Aguardando dados..."}
                    </p>
                  )}
                </div>

                {metar && !isLoadingMetar && (
                  <WeatherBadgesGrid rawMetar={metar} />
                )}

                <button onClick={() => navigate(user ? '/official' : '/onboarding')} className="flex w-full cursor-pointer items-center justify-center rounded-lg h-10 bg-primary text-white text-sm font-bold gap-2 active:scale-95 transition-transform mt-3">
                  <span className="truncate">Detalhar Condições</span>
                  <span className="material-symbols-outlined !text-[18px]">arrow_forward</span>
                </button>
              </div>
            </div>
          )}
        </div>
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
          <AnimatePresence mode='popLayout'>
            {isLoadingFeed ? (
              // Skeletons
              <>
                <SkeletonPost />
                <SkeletonPost />
                <SkeletonPost />
              </>
            ) : filteredPosts.length > 0 ? (
              filteredPosts.map((post: any) => (
                <motion.div
                  key={post.id}
                  layout
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                >
                  <PostCard
                    post={post}
                    status={getPostAgeStatus(post.createdAt)}
                    onClick={() => { haptics.impactLight(); navigate(user ? `/detail/${post.id}` : '/onboarding'); }}
                    onLikeToggle={() => { haptics.impactMedium(); toggleLike(post.id); }}
                  />
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-10 text-center text-gray-500"
              >
                <span className="material-symbols-outlined !text-[48px] mb-2 opacity-50">search_off</span>
                <p>Nenhum post ativo encontrado.<br />Mostrando apenas últimas 6 horas.</p>
                <button onClick={() => { haptics.impactLight(); setSelectedTypes(['official', 'collaborative', 'staff']); setSelectedCategories([]); }} className="text-primary text-sm font-bold mt-2">
                  Limpar Filtros
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Filter Modal */}
      <AnimatePresence>
        {
          isFilterOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="w-full max-w-[480px] bg-white dark:bg-[#1a2233] rounded-t-2xl shadow-xl"
              >
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
              </motion.div>
            </motion.div>
          )
        }
      </AnimatePresence >

      {/* Timeline & Floating Actions */}
      <AnimatePresence>
        {
          !isFilterOpen && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-30 pointer-events-none"
            >
              {/* Timeline Bar */}
              <div className="absolute bottom-[70px] left-0 right-0 max-w-[480px] mx-auto">
                <div className="bg-white/95 dark:bg-[#1a2233]/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 pt-3 pb-6 px-4 pointer-events-auto">
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

              {/* Pro Camera Button */}
              <div className="absolute bottom-20 left-0 right-0 max-w-[480px] mx-auto flex justify-end px-6">
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
            </motion.div>
          )
        }
      </AnimatePresence >

      {/* Search Modal */}

    </div >
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

const WeatherBadgesGrid = ({ rawMetar }: { rawMetar: string }) => {
  const parsed = parseMetar(rawMetar);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Visibility Color Logic
  // < 1600m: Dark Red (Critical)
  // < 5000m: Light Red
  // < 10000m: Yellow
  // >= 10000m: Blue
  let visColor = 'blue';
  if (parsed.vis_meters < 1600) visColor = 'red-dark';
  else if (parsed.vis_meters < 5000) visColor = 'red';
  else if (parsed.vis_meters < 10000) visColor = 'yellow';

  // Ceiling Color Logic
  // < 500': Dark Red
  // < 1000': Light Red
  // < 3000': Yellow
  // >= 3000': Blue
  let ceilingColor = 'blue';
  if (parsed.ceiling_ft < 500) ceilingColor = 'red-dark';
  else if (parsed.ceiling_ft < 1000) ceilingColor = 'red';
  else if (parsed.ceiling_ft < 3000) ceilingColor = 'yellow';

  // Condition Logic & Icons
  let condIcon = 'thunderstorm'; // Default fallback
  let condColor = 'blue';
  const c = parsed.condition;

  // Logic for cloud icons based on coverage
  let cloudIcon = 'cloud';
  if (parsed.ceiling.includes('CB') || parsed.ceiling.includes('TCU')) {
    cloudIcon = 'thunderstorm'; // Significant clouds (CB/TCU)
  } else if (parsed.ceiling.includes('FEW') || parsed.ceiling.includes('SCT')) {
    cloudIcon = 'partly_cloudy_day';
  } else if (parsed.ceiling.includes('BKN') || parsed.ceiling.includes('OVC')) {
    cloudIcon = 'cloud'; // darker/fuller cloud
  }

  if (c.includes('TS') || c.includes('CB')) {
    condIcon = 'thunderstorm';
    condColor = 'red-dark'; // Storms are usually critical attention
  } else if (c.includes('RA') || c.includes('DZ') || c.includes('SH')) {
    condIcon = 'rainy';
    condColor = 'blue';
  } else if (c.includes('FG') || c.includes('BR') || c.includes('HZ') || c.includes('FU')) {
    condIcon = 'foggy';
    condColor = 'yellow'; // Reduced vis usually
  } else if (c.includes('SN') || c.includes('SG') || c.includes('IC')) {
    condIcon = 'ac_unit';
    condColor = 'blue';
  } else if (c.includes('No Wx') || c.includes('NSW') || c.includes('CAVOK') || c.includes('CLR') || c.includes('SKC')) {
    condIcon = 'check_circle'; // Clear/Sunny indicator
    condColor = 'blue';
  } else {
    condIcon = 'cloud'; // OVC/BKN general
  }

  const handleBadgeClick = (text: string) => {
    setActiveTooltip(activeTooltip === text ? null : text);
  };

  return (
    <div className="flex flex-col mb-3">
      <div className="grid grid-cols-4 gap-2">
        <WeatherBadgeSmall icon="air" value={parsed.wind} color="blue" tooltip={parsed.tooltips.wind} onClick={() => handleBadgeClick(parsed.tooltips.wind)} />
        <WeatherBadgeSmall icon="visibility" value={parsed.visibility} color={visColor} tooltip={parsed.tooltips.visibility} onClick={() => handleBadgeClick(parsed.tooltips.visibility)} />
        <WeatherBadgeSmall icon={cloudIcon} value={parsed.ceiling_str !== 'N/A' ? parsed.ceiling_str : parsed.ceiling} color={ceilingColor} tooltip={parsed.tooltips.ceiling} onClick={() => handleBadgeClick(parsed.tooltips.ceiling)} />
        <WeatherBadgeSmall icon={condIcon} value={parsed.condition} color={condColor} tooltip={parsed.tooltips.condition} onClick={() => handleBadgeClick(parsed.tooltips.condition)} />
      </div>

      {/* Mobile Tooltip Area */}
      {activeTooltip && (
        <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-md text-xs text-center text-gray-600 dark:text-gray-300 animate-fade-in border border-gray-200 dark:border-gray-700">
          {activeTooltip}
        </div>
      )}
    </div>
  );
}

const WeatherBadgeSmall = ({ icon, value, color = 'blue', tooltip, onClick }: any) => {
  // Container always neutral
  const containerStyle = "bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800";

  // Text/Icon colors
  const textColors: any = {
    'blue': 'text-blue-600 dark:text-blue-400',
    'yellow': 'text-amber-600 dark:text-amber-400',
    'red': 'text-red-500 dark:text-red-400',
    'red-dark': 'text-red-700 dark:text-red-500' // Darker red for critical
  };

  const activeColor = textColors[color] || textColors.blue;

  return (
    <div title={tooltip} onClick={onClick} className={`flex flex-col items-center justify-center p-2.5 rounded-lg border cursor-pointer transition-all hover:bg-white dark:hover:bg-gray-800 active:scale-95 ${containerStyle}`}>
      <span className={`material-symbols-outlined !text-[24px] mb-1 ${activeColor}`}>{icon}</span>
      <span className={`text-[11px] font-bold truncate ${activeColor}`}>{value && value !== 'N/A' ? value : '-'}</span>
    </div>
  );
};

const TimeMarker = ({ time, height, opacity, active }: any) => (
  <div className={`flex flex-col items-center gap-1 snap-center transition-all ${opacity}`}>
    <div className={`${height} w-[2px] ${active ? 'bg-blue-600 dark:bg-blue-400' : 'bg-gray-400'}`}></div>
    <p className={`text-[10px] font-mono ${active ? 'font-bold text-blue-600 dark:text-blue-400' : ''}`}>{time}</p>
  </div>
);

const FlightCategoryBadge = ({ category }: { category: string | null }) => {
  if (!category) return null;

  const config: any = {
    'VFR': { color: 'green', icon: 'sunny', label: 'VFR' },
    'MVFR': { color: 'blue', icon: 'partly_cloudy_day', label: 'MVFR' },
    'IFR': { color: 'red', icon: 'cloud', label: 'IFR' },
    'LIFR': { color: 'purple', icon: 'foggy', label: 'LIFR' },
  };

  const c = config[category] || { color: 'green', icon: 'sunny', label: 'VFR' };

  const styleMap: any = {
    green: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
    blue: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
    red: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
    purple: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
    gray: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
  }

  return (
    <div className={`flex items-center justify-center w-8 h-8 rounded-full border shadow-sm ${styleMap[c.color]} animate-pulse`}>
      <span className="material-symbols-outlined !text-[20px]">{c.icon}</span>
    </div>
  )
}

const PostCard = ({ post, onClick, onLikeToggle, status }: any) => {
  // Note: we can't easily access getPostAgeStatus here without prop or context, 
  // but 'status' prop was passed in the parent map!
  // Wait, I see I missed adding 'status' to the props destructuring in the definition line in previous view
  // Let me fix the definition and use the status prop.
  return <PostCardWithStatus post={post} onClick={onClick} onLikeToggle={onLikeToggle} status={status} />;
};

// Moving to proper component definition
const PostCardWithStatus = ({ post, onClick, onLikeToggle, status }: any) => {
  const isOfficial = post.type === 'official';
  const { confirmPostValidity } = useApp(); // Access confirm action
  const [confirming, setConfirming] = useState(false);

  // Style based on Visual Decay Status
  let borderClass = 'border-gray-200 dark:border-gray-800';
  let badge = null;

  // Timestamp Style Logic
  let timestampStyle = "text-gray-500 dark:text-gray-400 font-normal"; // Default old

  if (!isOfficial) {
    if (status === 'fresh') {
      borderClass = 'border-green-400 shadow-md shadow-green-100 dark:shadow-none';
      badge = <span className="absolute -top-2 right-2 px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full shadow-sm animate-pulse">AGORA</span>;
      timestampStyle = "text-blue-600 dark:text-blue-400 font-bold"; // Fresh: Vivid Blue & Bold
    } else if (status === 'aging') {
      borderClass = 'border-yellow-400';
      timestampStyle = "text-blue-500/80 dark:text-blue-400/80 font-medium"; // Aging: Muted Blue
    } else if (status === 'old') {
      borderClass = 'border-gray-200 dark:border-gray-800 opacity-60 grayscale-[50%]';
      timestampStyle = "text-gray-400 dark:text-gray-500 font-normal"; // Old: Gray
    }
  }

  const cardBg = isOfficial ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50' : `bg-white dark:bg-[#1a2233] ${borderClass}`;

  const handleConfirmClick = async (e: any) => {
    e.stopPropagation();
    haptics.impactMedium(); // Haptic on confirm
    if (post.confirmedByMe || confirming) return; // Prevent double confirm

    setConfirming(true);
    try {
      await confirmPostValidity(post.id);
      haptics.success(); // Success haptic
    } catch (err) {
      console.error(err);
      haptics.error();
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div onClick={onClick} className={`relative flex flex-col gap-3 p-4 rounded-xl border shadow-sm cursor-pointer transition-all hover:bg-opacity-90 ${cardBg}`}>
      {badge}

      <div className="flex items-start justify-between mt-2">
        <div className="flex gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden ${isOfficial ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-gray-100 dark:bg-gray-800'}`}>
            {isOfficial ? <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">verified_user</span> : <img src={post.user?.avatar || IMAGES.profileMain} className="w-full h-full object-cover" alt="" />}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <p className="text-[#0c121d] dark:text-white text-sm font-bold">{post.user?.name || "Desconhecido"}</p>
              {isOfficial ? (
                <span className="material-symbols-outlined text-blue-500 !text-[14px] fill-1">verified</span>
              ) : (
                <UserBadge job_title={post.user?.job_title} />
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <p className="text-gray-500 dark:text-gray-400">{isOfficial ? 'Fonte Oficial' : (post.type === 'staff' ? 'Relato da Equipe' : 'Relato de Usuário')}</p>
              <span className="text-gray-300">•</span>
              <p className={`${timestampStyle}`}>{post.timestamp}</p>
            </div>
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
              <div className="flex items-center gap-1 text-xs font-bold text-green-600 dark:text-green-500">
                <span className="material-symbols-outlined !text-[18px] fill-1">check_circle</span>
                Confirmado: {post.confirmations}
              </div>

              <button className="flex items-center gap-1 text-gray-500 text-xs font-medium hover:text-gray-700">
                <span className="material-symbols-outlined !text-[18px]">chat_bubble</span>
                {post.comments ? post.comments.length : 0}
              </button>

              <motion.button
                whileTap={{ scale: 0.8 }}
                onClick={(e) => { e.stopPropagation(); onLikeToggle(); }}
                className={`flex items-center gap-1 text-xs font-medium transition-colors ${post.likedByMe ? 'text-red-500' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <motion.span
                  initial={false}
                  animate={{ scale: post.likedByMe ? [1, 1.3, 1] : 1 }}
                  transition={{ duration: 0.3 }}
                  className={`material-symbols-outlined !text-[18px] ${post.likedByMe ? 'fill-1' : ''}`}
                >
                  {post.likedByMe ? 'favorite' : 'favorite'}
                </motion.span>
                {post.likes || 0}
              </motion.button>
            </div>
          )}
        </div>
        {post.image && (
          <div className="w-24 h-24 shrink-0 bg-center bg-cover rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 relative group overflow-hidden"
            style={{ backgroundImage: `url('${post.image}')` }}>
            {/* Evidence Watermark icon */}
            <div className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5">
              <span className="material-symbols-outlined text-white !text-[10px]">fingerprint</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


export default Feed;