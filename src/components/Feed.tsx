import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { IMAGES } from '../constants';
import { parsePhoneticString } from '../utils/phonetic';
import { supabase } from '../supabaseClient';
import { Airport } from '../AppContext';

const Feed = () => {
  const navigate = useNavigate();
  const { posts, user, selectedAirport, setSelectedAirport, favoriteAirports, toggleFavorite } = useApp();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Airport[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const isFavorited = favoriteAirports?.some(a => a.id === selectedAirport.id);

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
      alert('Voice recognition not supported in this browser.');
    }
  };

  const handleSelectAirport = (airport: Airport) => {
    setSelectedAirport(airport);
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const filteredPosts = posts.filter((post: any) => {
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
        <div className={`flex items-center justify-end transition-all duration-300 ${isSearchOpen ? 'flex-1 ml-4' : ''}`}>
          {isSearchOpen ? (
            <div className="relative flex-1">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Busque por ICAO, Cidade..."
                  className="w-full h-9 pl-3 pr-8 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  autoFocus
                />
                <button
                  onClick={startListening}
                  className={`absolute right-2 p-1 rounded-full ${isListening ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}
                >
                  <span className="material-symbols-outlined !text-[18px]">mic</span>
                </button>
              </div>

              {/* Dropdown Results */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1a2233] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto z-50">
                  {searchResults.map(airport => (
                    <button
                      key={airport.id}
                      onClick={() => handleSelectAirport(airport)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 last:border-0 flex justify-between items-center"
                    >
                      <div>
                        <span className="font-bold text-primary block">{airport.icao}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{airport.city}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 max-w-[120px] truncate ml-2">{airport.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setIsSearchOpen(true)} className="p-2 text-gray-500 hover:text-primary transition-colors">
              <span className="material-symbols-outlined">search</span>
            </button>
          )}
          {isSearchOpen && (
            <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); setSearchResults([]); }} className="ml-2 p-1 text-gray-500">
              <span className="material-symbols-outlined !text-[18px]">close</span>
            </button>
          )}
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
                <p className="text-primary text-sm font-mono font-bold">12:00Z</p>
              </div>

              <div className="flex gap-2 flex-wrap">
                <StatusChip color="red" icon="warning" label="CRITICAL" />
                <StatusChip color="blue" icon="air" label="WIND" />
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
          <button className="flex items-center gap-1 text-primary text-sm font-medium">
            <span className="material-symbols-outlined !text-[18px]">filter_list</span>
            Filtrar
          </button>
        </div>

        <div className="flex flex-col gap-4 p-4">
          {filteredPosts.map((post: any) => (
            <PostCard key={post.id} post={post} onClick={() => navigate(user ? `/detail/${post.id}` : '/onboarding')} />
          ))}
        </div>
      </main>

      {/* Timeline */}
      <div className="fixed bottom-[70px] left-0 right-0 z-30 max-w-[480px] mx-auto">
        <div className="bg-white/95 dark:bg-[#1a2233]/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 pt-3 pb-6 px-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Timeline Zulu (Histórico / Forecast)</p>
          </div>
          <div className="relative h-12 flex items-center overflow-x-auto hide-scrollbar snap-x">
            <div className="flex gap-6 items-end min-w-full px-10">
              <TimeMarker time="09Z" height="h-4" opacity="opacity-40" />
              <TimeMarker time="10Z" height="h-4" opacity="opacity-40" />
              <TimeMarker time="11Z" height="h-6" opacity="opacity-60" />

              <div className="flex flex-col items-center gap-1 snap-center">
                <div className="h-10 w-[3px] bg-primary rounded-full relative">
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full border-2 border-white dark:border-[#1a2233]"></div>
                </div>
                <p className="text-[12px] font-mono font-bold text-primary">12Z</p>
              </div>

              <TimeMarker time="13Z" height="h-6" opacity="opacity-40" />
              <TimeMarker time="14Z" height="h-4" opacity="opacity-20" />
            </div>
          </div>
        </div>
      </div>

      {/* FAB - Adjusted to stay within the max-w-[480px] container */}
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
    </div>
  );
};

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

const TimeMarker = ({ time, height, opacity }: any) => (
  <div className={`flex flex-col items-center gap-1 snap-center ${opacity}`}>
    <div className={`${height} w-[2px] bg-gray-400`}></div>
    <p className="text-[10px] font-mono">{time}</p>
  </div>
);

const PostCard = ({ post, onClick }: any) => {
  const isOfficial = post.type === 'official';
  const cardBg = isOfficial ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50' : 'bg-white dark:bg-[#1a2233] border-gray-200 dark:border-gray-800';

  return (
    <div onClick={onClick} className={`flex flex-col gap-3 p-4 rounded-xl border shadow-sm cursor-pointer ${cardBg}`}>
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
            <p className="text-gray-500 dark:text-gray-400 text-[11px]">{isOfficial ? 'Official Source' : (post.type === 'staff' ? 'Staff Report' : 'User Report')} • {post.timestamp}</p>
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
            <div className="flex gap-3 mt-2">
              <button className="flex items-center gap-1 text-gray-500 text-xs">
                <span className="material-symbols-outlined !text-[16px]">thumb_up</span> {post.likes}
              </button>
              <button className="flex items-center gap-1 text-gray-500 text-xs">
                <span className="material-symbols-outlined !text-[16px]">chat_bubble</span> {post.comments.length}
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

export default Feed;