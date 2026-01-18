
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
      return {
          raw: data[0].rawOb || data[0].raw_text,
          station_id: data[0].icaoId || data[0].station_id,
          observation_time: data[0].reportTime || data[0].observation_time,
          flight_category: data[0].flightCategory || data[0].flight_category,
          temp_c: data[0].temp,
          wind_dir_degrees: data[0].wdir,
          wind_speed_kt: data[0].wspd
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return null;
  }
};
