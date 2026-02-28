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
    console.log(`[DEBUG] Invocando função de borda: get_aisweb_v2 para ${icao}`);
    const { data, error } = await supabase.functions.invoke('get_aisweb_v2', {
      body: { icao, area },
    });

    if (error) {
      console.error(`[DEBUG] Erro ao invocar get_aisweb_v2 (${area}):`, error);
      throw error;
    }

    console.log(`[DEBUG] Resposta recebida para ${icao} (${area}):`, data);

    if (data && data.xml) {
      console.log('AISWEB XML:', typeof data.xml === 'string' ? data.xml.substring(0, 1500) : data.xml);
      return data.xml;
    }
    
    return null;
  } catch (error) {
    console.error(`Failed to fetch AISWEB data for ${icao}:`, error);
    return null;
  }
};
