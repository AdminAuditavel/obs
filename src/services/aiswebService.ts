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
    const { data, error } = await supabase.functions.invoke('get_aisweb', {
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

  try {
    const { data, error } = await supabase.functions.invoke('get_aisweb', {
      body: { search: query, area: 'rotaer' },
    });

    if (error) throw error;
    if (!data || !data.xml) return [];

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(data.xml, "text/xml");
    const items = xmlDoc.getElementsByTagName("item");
    const results: any[] = [];

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        results.push({
            id: item.getElementsByTagName("id")[0]?.textContent || Math.random().toString(),
            icao: item.getElementsByTagName("AeroCode")[0]?.textContent || "",
            name: item.getElementsByTagName("AeroName")[0]?.textContent || "",
            city: item.getElementsByTagName("Cidade")[0]?.textContent || "",
            state: item.getElementsByTagName("UF")[0]?.textContent || "",
            lat: parseFloat(item.getElementsByTagName("Lat")[0]?.textContent || "0"),
            lon: parseFloat(item.getElementsByTagName("Lng")[0]?.textContent || "0"),
        });
    }

    return results;
  } catch (error) {
    console.error('AISWEB search error:', error);
    return [];
  }
};
