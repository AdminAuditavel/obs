import { supabase } from '../supabaseClient';
import { parseString } from 'xml2js'; // We might need this, or just parse simple XML with DOMParser

// Simplified XML parsing helper for browser
const parseXml = (xmlString: string) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");
  return xmlDoc;
};

export interface AiswebRotaer {
  icaoCode: string;
  name: string;
  city: string;
  type: string;
  lat: string;
  lng: string;
  elevation: string;
  fir: string;
}

export const getAiswebData = async (icao: string, area: string = 'rotaer'): Promise<any> => {
  console.log(`[DEBUG] getAiswebData ingressando para ${icao}, área: ${area}`);
  try {
    const { data, error } = await supabase.functions.invoke('get_aisweb_v2', {
      body: { icaoCode: icao, area },
    });

    if (error) {
      console.error(`[DEBUG] Erro ao invocar get_aisweb (${area}):`, error);
      throw error;
    }

    if (data && data.xml) {
      return data.xml;
    }
    
    return null;
  } catch (error) {
    console.error(`Failed to fetch AISWEB data for ${icao}:`, error);
    return null;
  }
};

export const searchAirports = async (query: string): Promise<any[]> => {
  if (!query || query.length < 2) return [];

  const upperQuery = query.toUpperCase();

  try {
    console.log(`[DEBUG] Searching local airports for: ${upperQuery}`);
    const { data: localData, error: localError } = await supabase
      .from('airports')
      .select('icao, name, city, state, latitude, longitude')
      .or(`icao.ilike.${upperQuery}%,name.ilike.%${upperQuery}%,city.ilike.%${upperQuery}%`)
      .order('icao')
      .limit(15);

    if (localError) throw localError;

    if (localData) {
      console.log(`[DEBUG] Local search found ${localData.length} results`);
      return localData.map(a => ({
        id: a.icao,
        icao: a.icao,
        name: a.name,
        city: a.city,
        state: a.state,
        lat: a.latitude,
        lon: a.longitude
      }));
    }

    return [];
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
};
