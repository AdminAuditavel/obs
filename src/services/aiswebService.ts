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
    // 1. Try local airports table first (fast, prefix-based)
    console.log(`[DEBUG] Searching local airports for: ${upperQuery}`);
    const { data: localData, error: localError } = await supabase
      .from('airports')
      .select('icao, name, city, state, latitude, longitude')
      .or(`icao.ilike.${upperQuery}%,name.ilike.%${upperQuery}%,city.ilike.%${upperQuery}%`)
      .limit(10);

    if (!localError && localData && localData.length > 0) {
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

    // 2. Fallback to AISWEB (for new or missing airports)
    console.log(`[DEBUG] Local search empty, falling back to AISWEB`);
    const { data, error } = await supabase.functions.invoke('get_aisweb_v2', {
      body: { search: query, area: 'rotaer' },
    });

    if (error) throw error;
    if (!data || !data.xml) return [];

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(data.xml, "text/xml");
    const items = xmlDoc.getElementsByTagName("item");
    const results: any[] = [];

    const getTagContentFrom = (element: Element | Document, tagNames: string[]) => {
      for (const tagName of tagNames) {
        const elements = element.getElementsByTagName(tagName);
        if (elements.length > 0 && elements[0].textContent) {
          return elements[0].textContent.trim();
        }
      }
      return "";
    };

    if (items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const icao = getTagContentFrom(item, ["indicador", "AeroCode", "id"]);
        if (!icao) continue;

        results.push({
          id: icao,
          icao: icao,
          name: getTagContentFrom(item, ["nome", "AeroName", "name"]) || icao,
          city: getTagContentFrom(item, ["cidade", "Cidade", "city"]),
          state: getTagContentFrom(item, ["uf", "UF", "state"]),
          lat: parseFloat(getTagContentFrom(item, ["lat", "Lat"]) || "0"),
          lon: parseFloat(getTagContentFrom(item, ["lng", "Lng", "Lon"]) || "0"),
        });
      }
    } else {
      const icao = getTagContentFrom(xmlDoc, ["indicador", "AeroCode", "id"]);
      if (icao && icao.length >= 3) {
        results.push({
          id: icao,
          icao: icao,
          name: getTagContentFrom(xmlDoc, ["nome", "AeroName", "name"]) || icao,
          city: getTagContentFrom(xmlDoc, ["cidade", "Cidade", "city"]),
          state: getTagContentFrom(xmlDoc, ["uf", "UF", "state"]),
          lat: parseFloat(getTagContentFrom(xmlDoc, ["lat", "Lat"]) || "0"),
          lon: parseFloat(getTagContentFrom(xmlDoc, ["lng", "Lng", "Lon"]) || "0"),
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
};
