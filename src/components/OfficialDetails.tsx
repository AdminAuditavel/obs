import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { getWeather } from '../services/weatherService';
import { parseMetar, ParsedMetar } from '../utils/metarParser';

const OfficialDetails = () => {
  const navigate = useNavigate();
  const { selectedAirport } = useApp();
  const [metar, setMetar] = useState<string | null>(null);
  const [decoded, setDecoded] = useState<ParsedMetar | null>(null);
  const [obsTime, setObsTime] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      setIsLoading(true);
      try {
        const data = await getWeather(selectedAirport.icao);
        if (data && data.raw) {
          setMetar(data.raw);
          setDecoded(parseMetar(data.raw));

          // Parse Time
          if (data.observation_time) {
            const d = new Date(data.observation_time);
            setObsTime(`${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}Z`);
          } else {
            setObsTime('N/A');
          }
        }
      } catch (error) {
        console.error("Failed to load weather", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (selectedAirport) {
      fetchWeather();
    }
  }, [selectedAirport]);

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark">
      <div className="fixed max-w-[480px] mx-auto inset-x-0 top-0 z-50 bg-background-light dark:bg-background-dark shadow-sm">
        <div className="flex h-5 w-full items-center justify-center">
          <div className="h-1 w-9 rounded-full bg-[#cdd7ea] dark:bg-gray-700"></div>
        </div>
        <div className="flex items-center p-4 pb-2 justify-between">
          <div className="flex size-12 shrink-0 items-center">
            <span className="material-symbols-outlined cursor-pointer" onClick={() => navigate(-1)}>close</span>
          </div>
          <div className="flex flex-col items-center flex-1">
            <h2 className="text-lg font-bold leading-tight tracking-tight">{selectedAirport ? `${selectedAirport.icao} - ${selectedAirport.city}` : 'Carregando...'}</h2>
            <span className="text-xs text-[#4567a1] dark:text-gray-400 font-medium">Ref: {isLoading ? '...' : obsTime}</span>
          </div>
          <div className="flex w-12 items-center justify-end">
            <button className="flex items-center justify-center p-0 bg-transparent">
              <span className="material-symbols-outlined text-primary">share</span>
            </button>
          </div>
        </div>
      </div>

      <main className="mt-20 px-0 pb-32">
        <div className="flex flex-col">
          <h3 className="text-lg font-bold leading-tight tracking-tight px-4 pb-2 pt-4">METAR Decodificado ({isLoading ? '...' : obsTime})</h3>

          {isLoading ? (
            <div className="p-8 text-center text-gray-500">
              <span className="material-symbols-outlined animate-spin text-3xl mb-2">sync</span>
              <p>Carregando dados meteorológicos...</p>
            </div>
          ) : decoded ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
              <WeatherTile icon="air" value={decoded.wind || 'N/A'} label="Vento" />
              <WeatherTile icon="visibility" value={decoded.visibility || 'N/A'} label="Visibilidade" />
              <WeatherTile icon="cloud" value={decoded.ceiling_str || 'N/A'} label={`Nuvens ${decoded.ceiling !== 'N/A' && decoded.ceiling !== 'None' ? `(${decoded.ceiling})` : ''}`} />
              <WeatherTile icon="thermostat" value={decoded.temperature || 'N/A'} label="Temp / Orvalho" />
              <WeatherTile icon="speed" value={decoded.pressure || 'N/A'} label="QNH / Altímetro" />
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <span className="material-symbols-outlined text-3xl mb-2">cloud_off</span>
              <p>Dados não disponíveis.</p>
            </div>
          )}
        </div>

        {/* NOTAMs Section - Disabled for now as requested/backend gap, keeping structure comment */}
        {/* 
        <div className="flex flex-col mt-2">
          <div className="flex items-center justify-between px-4 pb-2 pt-4">
            <h3 className="text-lg font-bold leading-tight tracking-tight">NOTAMs Ativos</h3>
            <span className="bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">0 Mensagens</span>
          </div>
           <div className="p-4 text-center text-gray-400 text-sm italic">
              Sistema de NOTAM em manutenção.
           </div>
        </div>
        */}
      </main>

      <div className="fixed max-w-[480px] mx-auto bottom-0 inset-x-0 bg-background-light dark:bg-background-dark border-t border-[#cdd7ea] dark:border-gray-800 p-4 pb-8 safe-area-inset-bottom">
        <div className="flex flex-col gap-3">
          <button className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98]">
            Confirmar Dados Oficiais
          </button>
          <div className="flex flex-col items-center gap-1">
            <p className="text-[10px] text-gray-500 italic flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px] text-green-500">verified_user</span>
              Fonte: {metar ? (metar.includes('=') ? 'Redemet (EGP)' : 'AviationWeather') : 'Buscando...'}
            </p>
            {metar && (
              <p className="text-[9px] text-gray-400 uppercase tracking-tighter px-4 text-center break-all">
                RAW: {metar}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const WeatherTile = ({ icon, value, label }: any) => (
  <div className="flex flex-1 gap-3 rounded-xl border border-[#cdd7ea] dark:border-gray-800 bg-white dark:bg-background-dark/50 p-4 flex-col">
    <span className="material-symbols-outlined text-primary">{icon}</span>
    <div className="flex flex-col gap-0.5">
      <h2 className="text-base font-bold leading-tight">{value}</h2>
      <p className="text-[#4567a1] dark:text-gray-400 text-xs font-normal">{label}</p>
    </div>
  </div>
);

// NotamCard component removed/commented out for now to clean up unused code warnings if not used.

export default OfficialDetails;