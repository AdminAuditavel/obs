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

  try {
    const { data, error } = await supabase.functions.invoke('get_aisweb_v2', {
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
        
        // Helper to get text content from multiple potential tag names
        const getTagContent = (tagNames: string[]) => {
            for (const tagName of tagNames) {
                const elements = item.getElementsByTagName(tagName);
                if (elements.length > 0 && elements[0].textContent) {
                    return elements[0].textContent.trim();
                }
            }
            return "";
        };

        const icao = getTagContent(["indicador", "AeroCode", "id"]);
        const name = getTagContent(["nome", "AeroName", "name"]);
        const city = getTagContent(["cidade", "Cidade", "city"]);
        const state = getTagContent(["uf", "UF", "state"]);
        const lat = getTagContent(["lat", "Lat"]);
        const lon = getTagContent(["lng", "Lng", "Lon"]);

        // Skip items without an ICAO code
        if (!icao) continue;

        results.push({
            id: icao || Math.random().toString(),
            icao: icao,
            name: name || icao,
            city: city,
            state: state,
            lat: parseFloat(lat || "0"),
            lon: parseFloat(lon || "0"),
        });
    }

    console.log(`[DEBUG] AISWEB search results found: ${results.length}`);
    return results;
  } catch (error) {
    console.error('AISWEB search error:', error);
    return [];
  }
};
