
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
}

export const getWeather = async (icao: string): Promise<MetarData | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('get_weather', {
      body: { icao },
    });

    if (error) {
      console.error('Error invoking function:', error);
      throw error;
    }

    if (Array.isArray(data) && data.length > 0) {
      const d = data[0];
      return {
          raw: d.rawOb || d.raw_text || d.raw,
          station_id: d.icaoId || d.station_id,
          observation_time: d.reportTime || d.observation_time,
          flight_category: d.flightCategory || d.flight_category,
          temp_c: d.temp || d.temp_c,
          // Support multiple potential key formats from checkwx/aviationweather
          wind_dir_degrees: d.wdir ?? d.wind_dir_degrees ?? d.wind_dir,
          wind_speed_kt: d.wspd ?? d.wind_speed_kt ?? d.wind_speed
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return null;
  }
};
