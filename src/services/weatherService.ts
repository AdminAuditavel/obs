
import { supabase } from '../supabaseClient';

export interface MetarData {
  raw: string;
  station_id: string;
  observation_time: string;
  temp_c?: number;
  dewpoint_c?: number;
  wind_dir_degrees?: number;
  wind_speed_kt?: number;
  altim_in_hg?: number;
  flight_category?: string;
  taf?: string;
}

const calculateFlightCategory = (raw: string): string => {
  if (!raw) return 'UNK';
  const r = raw.toUpperCase();
  if (r.includes('CAVOK')) return 'VFR';

  // Visibility (Meters - 4 digits)
  let visMeters = 10000;
  // Match 4 digits not followed by Z or / (to avoid time or temp)
  // Usually vis is first 4 digit number after wind?
  // Regex: 4 digits, optional space. simple heuristic:
  const visMatch = r.match(/\b(\d{4})\b/);
  if (visMatch) {
     const val = parseInt(visMatch[1], 10);
     // Filter out likely years/times if context check missing, 
     // but METAR usually has vis clearly. 9999, 4000, 0800.
     // Also check for 5000 (meters) vs 2000 (time? no, time is Z).
     visMeters = val;
     if (visMeters === 9999) visMeters = 10000;
  }

  // Ceiling (BKN, OVC, VV)
  let ceilingFt = 10000;
  const clouds = [...r.matchAll(/(BKN|OVC|VV)(\d{3})/g)];
  if (clouds.length > 0) {
    const heights = clouds.map(m => parseInt(m[2], 10) * 100);
    ceilingFt = Math.min(...heights);
  }

  // Categories
  if (ceilingFt < 500 || visMeters < 1600) return 'LIFR';
  if (ceilingFt < 1000 || visMeters < 5000) return 'IFR';
  if (ceilingFt <= 3000 || visMeters <= 8000) return 'MVFR';
  return 'VFR';
};

export const getWeather = async (icao: string): Promise<MetarData | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('get_weather', {
      body: { icao },
    });

    if (error) {
      console.error('Error invoking function:', error);
      throw error;
    }

    let d: any = null;
    
    if (Array.isArray(data) && data.length > 0) {
      d = data[0];
    } else if (data && typeof data === 'object' && !Array.isArray(data) && (data.raw || data.raw_text)) {
      d = data;
    }

    if (d) {
      const result: MetarData = {
          raw: d.rawOb || d.raw_text || d.raw,
          station_id: d.icaoId || d.station_id || icao,
          observation_time: d.reportTime || d.observation_time || new Date().toISOString(),
          flight_category: d.flightCategory || d.flight_category,
          temp_c: d.temp || d.temp_c,
          // Support multiple potential key formats from checkwx/aviationweather
          wind_dir_degrees: d.wdir ?? d.wind_dir_degrees ?? d.wind_dir,
          wind_speed_kt: d.wspd ?? d.wind_speed_kt ?? d.wind_speed,
          taf: d.rawTaf || d.taf
      };

      // Patch category if missing
      if (!result.flight_category || result.flight_category === 'UNK') {
          result.flight_category = calculateFlightCategory(result.raw);
      }
      
      return result;
    }
    
    return null;
    return null;
  } catch (error) {
    console.warn('Edge Function failed, trying fallback:', error);
    
    // Client-side Fallback
    try {
      // 1. Try to fetch METAR (VATSIM is reliable for METAR text)
      const metarPromise = fetch(`https://metar.vatsim.net/metar.php?id=${icao}`).then(res => res.text());
      
      // 2. Try to fetch TAF (AviationWeather JSON is good for this)
      // Note: This might be subject to CORS depending on the brower/environment, but it's a best-effort fallback.
      // AviationWeather JSON format: https://aviationweather.gov/api/data/taf?ids=SBGR&format=json
      const tafPromise = fetch(`https://aviationweather.gov/api/data/taf?ids=${icao}&format=json`)
        .then(res => {
          if (res.ok) return res.json();
          return null;
        })
        .catch(() => null);

      const [metarText, tafJson] = await Promise.all([metarPromise, tafPromise]);

      if (metarText && metarText.trim().length > 0) {
         const raw = metarText.trim();
         
         let tafRaw = null;
         if (tafJson && Array.isArray(tafJson) && tafJson.length > 0) {
            tafRaw = tafJson[0].rawOb || tafJson[0].rawTAF;
         }

         return {
           raw,
           station_id: icao,
           observation_time: new Date().toISOString(),
           flight_category: calculateFlightCategory(raw),
           taf: tafRaw
         };
      }
    } catch (fallbackError) {
       console.error('Fallback weather failed:', fallbackError);
    }
    return null;
  }
};
