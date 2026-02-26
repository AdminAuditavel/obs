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
  try {
    const { data, error } = await supabase.functions.invoke('get_aisweb', {
      body: { icao, area },
    });

    if (error) {
      console.error(`Error invoking get_aisweb (${area}):`, error);
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
