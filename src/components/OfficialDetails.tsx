import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { getWeather } from '../services/weatherService';
import { parseMetar, ParsedMetar } from '../utils/metarParser';

const OfficialDetails = () => {
  const navigate = useNavigate();
  const { selectedAirport } = useApp();
  const [metar, setMetar] = useState<string | null>(null);
  const [taf, setTaf] = useState<string | null>(null);
  const [decoded, setDecoded] = useState<ParsedMetar | null>(null);
  const [obsTime, setObsTime] = useState<string>('');
  const [fetchTime, setFetchTime] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      setIsLoading(true);
      try {
        const now = new Date();
        setFetchTime(`${now.getUTCHours().toString().padStart(2, '0')}:${now.getUTCMinutes().toString().padStart(2, '0')}Z`);

        const data = await getWeather(selectedAirport.icao);
        if (data && data.raw) {
          setMetar(data.raw);
          setTaf(data.taf || null);
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

  const getSourceUrl = () => {
    if (!selectedAirport) return '#';
    if (selectedAirport.country_code === 'BR' || selectedAirport.icao.startsWith('SB') || selectedAirport.icao.startsWith('SD') || selectedAirport.icao.startsWith('SI') || selectedAirport.icao.startsWith('SJ') || selectedAirport.icao.startsWith('SN') || selectedAirport.icao.startsWith('SS') || selectedAirport.icao.startsWith('SW')) {
      return `https://aisweb.decea.mil.br/?i=aerodromos&codigo=${selectedAirport.icao}`;
    }
    return `https://www.aviationweather.gov/metar/data?ids=${selectedAirport.icao}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Boletim copiado para a área de transferência.');
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark font-sans text-[#0c121d] dark:text-gray-100">

      {/* 1. Header: Boletim Oficial */}
      <div className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-[480px] mx-auto w-full px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <span className="material-symbols-outlined text-[#0c121d] dark:text-white">arrow_back</span>
          </button>
          <div className="flex flex-col items-center">
            <h1 className="text-base font-bold leading-tight">Boletim Oficial</h1>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">DECEA / REDEMET · Fonte Oficial</p>
          </div>
          <div className="w-10"></div> {/* Spacer for alignment */}
        </div>
      </div>

      <main className="flex-1 max-w-[480px] mx-auto w-full pb-32">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <span className="material-symbols-outlined text-4xl animate-spin mb-3">sync</span>
            <p className="text-sm font-medium">Sincronizando dados...</p>
          </div>
        ) : !metar ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <span className="material-symbols-outlined text-4xl mb-3">cloud_off</span>
            <p className="text-sm font-medium">Boletim não disponível</p>
          </div>
        ) : (
          <>
            {/* 2. Technical Identification Block */}
            <div className="px-4 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase text-gray-500 font-bold mb-0.5">Aeródromo</span>
                  <span className="font-mono font-bold">{selectedAirport?.icao} <span className="font-sans font-normal text-gray-600 dark:text-gray-400">– {selectedAirport?.city}</span></span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase text-gray-500 font-bold mb-0.5">Tipo</span>
                  <span className="font-bold flex items-center gap-2">
                    {parseMetar(metar).type}
                    {taf && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded font-bold">TAF</span>}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase text-gray-500 font-bold mb-0.5">Emitido (Zulu)</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{obsTime}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase text-gray-500 font-bold mb-0.5">Fonte</span>
                  <a href={getSourceUrl()} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline decoration-blue-500">
                    <span className="font-bold truncate">{metar.includes('=') ? 'REDEMET' : 'NOAA/AW'}</span>
                    <span className="material-symbols-outlined !text-[14px] text-gray-400">open_in_new</span>
                  </a>
                </div>
              </div>
            </div>

            {/* 3. Raw Content (The Core) */}
            <div className="p-4 space-y-6">

              {/* METAR Block */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">Observação Real (METAR)</h3>
                  <button onClick={() => copyToClipboard(metar)} className="text-[10px] font-bold text-primary hover:bg-blue-50 dark:hover:bg-blue-900/30 px-2 py-1 rounded transition-colors uppercase">
                    Copiar
                  </button>
                </div>
                <div className="bg-[#f5f7fa] dark:bg-[#0d1117] p-4 rounded-lg border-l-4 border-blue-500 shadow-sm">
                  <p className="font-mono text-sm leading-relaxed text-[#24292f] dark:text-[#c9d1d9] break-all whitespace-pre-wrap">
                    {metar}
                  </p>
                </div>
              </div>



            </div>

            <div className="h-px bg-gray-200 dark:bg-gray-800 mx-4 my-2"></div>

            {/* 4. Decoded Reference (Secondary) */}
            <div className="px-4 py-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Referência Decodificada</h3>
              {decoded && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <WeatherTile icon="air" value={decoded.wind || 'N/A'} label="Vento" />
                  <WeatherTile icon="visibility" value={decoded.visibility || 'N/A'} label="Visibilidade" />
                  <WeatherTile icon="cloud" value={decoded.ceiling_str || 'N/A'} label={`Nuvens ${decoded.ceiling !== 'N/A' && decoded.ceiling !== 'None' ? `(${decoded.ceiling})` : ''}`} />
                  <WeatherTile icon="thermostat" value={decoded.temperature || 'N/A'} label="Temp / Orvalho" />
                  <WeatherTile icon="speed" value={decoded.pressure || 'N/A'} label="QNH / Altímetro" />
                  <WeatherTile icon="thunderstorm" value={decoded.tooltips.condition || 'N/A'} label="Condições" />
                </div>
              )}
              <p className="text-[10px] text-gray-400 mt-4 text-center">
                * A decodificação é apenas para referência rápida. Sempre confirme no texto oficial acima.
              </p>
            </div>

            {/* TAF Block (Moved) */}
            {taf && (
              <div className="flex flex-col mt-4 px-4 pb-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">Previsão (TAF)</h3>
                  <button onClick={() => copyToClipboard(taf)} className="text-[10px] font-bold text-primary hover:bg-blue-50 dark:hover:bg-blue-900/30 px-2 py-1 rounded transition-colors uppercase">
                    Copiar
                  </button>
                </div>
                <div className="bg-[#f5f7fa] dark:bg-[#0d1117] p-4 rounded-lg border-l-4 border-amber-500 shadow-sm">
                  <p className="font-mono text-sm leading-relaxed text-[#24292f] dark:text-[#c9d1d9] break-all whitespace-pre-wrap">
                    {taf}
                  </p>
                </div>
              </div>
            )}

            {/* NOTAMs Section - Keep valid but simplified style */}
            <div className="flex flex-col mt-2 px-4 pb-4">
              <div className="flex items-center justify-between py-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">NOTAMs Vigentes</h3>
                <span className="bg-gray-100 dark:bg-gray-800 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full">3 Ativos</span>
              </div>
              <div className="flex flex-col gap-3">
                <NotamCard color="red" type="Crítico" title="RWY 15/33 CLSD" body="A0412/24 - RWY 15/33 CLOSED DUE TO MAINT." />
                <NotamCard color="amber" type="Aviso" title="PAPI RWY 15 U/S" body="A0405/24 - PAPI U/S." />
              </div>
            </div>

          </>
        )}
      </main>

      {/* 5. Fixed Actions Footer */}
      <div className="fixed max-w-[480px] mx-auto bottom-0 inset-x-0 bg-white/90 dark:bg-background-dark/90 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 p-4 pb-8 safe-area-inset-bottom z-40">
        <div className="flex gap-3">
          <button onClick={() => copyToClipboard(`${metar}\n\n${taf || ''}`)} className="flex-1 flex items-center justify-center gap-2 bg-primary text-white font-bold h-12 rounded-xl shadow-lg active:scale-95 transition-transform">
            <span className="material-symbols-outlined">content_copy</span>
            Copiar Boletim Completo
          </button>
        </div>
        {/* DEBUG BLOCK - REMOVE LATER */}
        <details className="mt-2 text-[10px] text-gray-500">
          <summary>Dados de Debug</summary>
          <pre className="p-2 bg-gray-100 rounded mt-1 overflow-auto max-h-40">
            {JSON.stringify({ metar, taf, isLoading }, null, 2)}
          </pre>
        </details>
      </div>

    </div>
  );
};

const WeatherTile = ({ icon, value, label }: any) => (
  <div className="flex flex-1 gap-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-background-dark/50 p-3 flex-col shadow-sm">
    <span className="material-symbols-outlined text-gray-400 !text-[20px]">{icon}</span>
    <div className="flex flex-col gap-0.5">
      <h2 className="text-sm font-bold leading-tight text-gray-800 dark:text-gray-200">{value}</h2>
      <p className="text-gray-400 dark:text-gray-500 text-[10px] font-normal uppercase">{label}</p>
    </div>
  </div>
);

const NotamCard = ({ color, type, title, body }: any) => {
  // Simplified card for technical view
  const colors: any = {
    red: 'border-l-red-500',
    amber: 'border-l-amber-500',
    gray: 'border-l-gray-400'
  };

  return (
    <div className={`relative flex flex-col gap-1 rounded bg-gray-50 dark:bg-gray-900 p-3 border border-gray-200 dark:border-gray-800 border-l-4 ${colors[color]}`}>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase text-gray-500">{type}</span>
      </div>
      <p className="font-mono text-xs font-bold text-gray-800 dark:text-gray-200">{title}</p>
      <p className="font-mono text-xs text-gray-500">{body}</p>
    </div>
  )
}
export default OfficialDetails;
