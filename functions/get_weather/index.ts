
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { icao } = await req.json();

    if (!icao) {
      return new Response(JSON.stringify({ error: 'ICAO code is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    // Helper for fetch with timeout
    const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 8000) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    };


    // Check if it's a Brazilian airport
    const isBrazilian = /^(S[BUSDIJW]|SW)/.test(icao.toUpperCase());

    if (isBrazilian) {

        try {
            // REDEMET API
            // Fetch last 14 hours to be safe and ensure coverage
            const now = new Date();
            const fetchWindowStart = new Date(now.getTime() - 14 * 60 * 60 * 1000);
            
            // Format YYYYMMDDHH - Redemet expects this format
            const formatRedemetDate = (d: Date) => {
                const yyyy = d.getUTCFullYear();
                const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
                const dd = String(d.getUTCDate()).padStart(2, '0');
                const hh = String(d.getUTCHours()).padStart(2, '0');
                return `${yyyy}${mm}${dd}${hh}`;
            };

            const dataIni = formatRedemetDate(fetchWindowStart);
            const dataFim = formatRedemetDate(now);

            // Fetch from Redemet API (Parallel: METAR & TAF)
            const redemetUrlMetar = `https://redemet.decea.mil.br/api/consulta_automatica/index.php?local=${icao}&msg=metar&data_ini=${dataIni}&data_fim=${dataFim}`;
            const redemetUrlTaf = `https://redemet.decea.mil.br/api/consulta_automatica/index.php?local=${icao}&msg=taf&data_ini=${dataIni}&data_fim=${dataFim}`;
            
            console.log(`Fetching from REDEMET for ${icao}`);
            // Use 8s timeout for Redemet
            const [metarRes, tafRes] = await Promise.all([
                fetchWithTimeout(redemetUrlMetar, {}, 8000),
                fetchWithTimeout(redemetUrlTaf, {}, 8000)
            ]);
            
            if (metarRes.ok) {
                const textMetar = await metarRes.text();
                const textTaf = tafRes.ok ? await tafRes.text() : "";
                
                // Helper to parse REDEMET messages
                const parseRedemetMessages = (text: string, typeHint: string) => {
                     if (!text || text.length < 20) return [];
                     return text.split('=').map(m => m.trim()).filter(m => m.length > 10 && !m.includes("não localizada") && !m.includes("Mensagem nao encontrada"));
                };

                const rawMetars = parseRedemetMessages(textMetar, 'METAR');
                const rawTafs = parseRedemetMessages(textTaf, 'TAF');

                // Check if we have metar content
                if (rawMetars.length > 0) {
                    
                   // reuse parsing logic for Metar timestamps...
                   // (Simplified extraction for brevity compared to previous, but retaining robust logic)
                   const parseMsg = (msg: string) => {
                        let cleanMsg = msg;
                        let timeVal = 0;
                        const prefixMatch = msg.match(/^(\d{10,12})\s*-\s*/);
                        let prefixYear = 0, prefixMonth = 0;

                        if (prefixMatch) {
                            const tsStr = prefixMatch[1];
                            prefixYear = parseInt(tsStr.substring(0, 4), 10);
                            prefixMonth = parseInt(tsStr.substring(4, 6), 10) - 1;
                            const day = parseInt(tsStr.substring(6, 8), 10);
                            const hour = parseInt(tsStr.substring(8, 10), 10);
                            const min = tsStr.length === 12 ? parseInt(tsStr.substring(10, 12), 10) : 0;
                            timeVal = new Date(Date.UTC(prefixYear, prefixMonth, day, hour, min)).getTime();
                            cleanMsg = msg.substring(prefixMatch[0].length).trim();
                        }
                        
                        // Refine from body if possible
                        const bodyTimeMatch = cleanMsg.match(/\b(\d{2})(\d{2})(\d{2})Z\b/);
                        if (bodyTimeMatch) {
                             const bDay = parseInt(bodyTimeMatch[1], 10);
                             const bHour = parseInt(bodyTimeMatch[2], 10);
                             const bMin = parseInt(bodyTimeMatch[3], 10);
                             let refYear = prefixYear || now.getUTCFullYear();
                             let refMonth = prefixMatch ? prefixMonth : now.getUTCMonth();
                             const candidate = new Date(Date.UTC(refYear, refMonth, bDay, bHour, bMin));
                             
                             // Month boundary handling
                             if (!prefixMatch) {
                                const diffDays = (candidate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
                                if (diffDays > 2) candidate.setUTCMonth(candidate.getUTCMonth() - 1);
                                else if (diffDays < -28) candidate.setUTCMonth(candidate.getUTCMonth() + 1);
                            } else {
                                const pDay = parseInt(prefixMatch[1].substring(6, 8), 10);
                                if (pDay === 1 && bDay > 27) candidate.setUTCMonth(candidate.getUTCMonth() - 1);
                                else if (pDay > 27 && bDay === 1) candidate.setUTCMonth(candidate.getUTCMonth() + 1);
                            }
                            timeVal = candidate.getTime();
                        }

                        const matchType = cleanMsg.match(/^(METAR|SPECI)/);
                        const type = matchType ? matchType[0] : (cleanMsg.includes('SPECI') ? 'SPECI' : 'METAR');

                        return { raw: cleanMsg, timeVal, type };
                   };

                   const parsedMetars = rawMetars.map(parseMsg).sort((a, b) => {
                       if (b.timeVal !== a.timeVal) return b.timeVal - a.timeVal;
                       if (a.type !== b.type) return a.type === 'SPECI' ? -1 : 1;
                       return 0;
                   });

                    const bestMetar = parsedMetars[0];
                    
                    // Process TAF - Just take the last valid one? TAFs are usually long validity.
                    // Redemet returns sorted? Usually. We can just take the last (most recent) from the list usually
                    // or parse time similarly. TAF timestamp is issue/validity start.
                    let bestTaf = null;
                    if (rawTafs.length > 0) {
                        // Just clean them and take the last one which is usually the latest issued in the slot window
                        // or sort by prefix if available
                        const parsedTafs = rawTafs.map(msg => {
                             // clean prefix
                             const prefixMatch = msg.match(/^(\d{10,12})\s*-\s*/);
                             const clean = prefixMatch ? msg.substring(prefixMatch[0].length).trim() : msg;
                             return { raw: clean, full: msg };
                        });
                        // Assume last is newest for now or first? Redemet usually newest at bottom of file?
                        // Actually let's assume rawTafs order is chronological or whatever Redemet sends. 
                        // But with `data_ini` to `data_fim`, it might be one huge list.
                        // We will trust the API order or check dates if critical. 
                        // For TAF, usually we want the one currently valid or latest issued.
                        // Let's take the last one in the array as "Newest"
                        bestTaf = parsedTafs[parsedTafs.length - 1]; // or [0]? 
                        // Let's rely on standard Redemet behavior: usually appended.
                        // Safest: Parsing the issue time DDHHMMZ in the body.
                    }

                    if (bestMetar && bestMetar.raw) {
                        const result = [{
                            rawOb: bestMetar.raw,
                            rawTaf: bestTaf ? bestTaf.raw : null,
                            station_id: icao,
                            observation_time: new Date(bestMetar.timeVal).toISOString(), 
                        }];

                        return new Response(JSON.stringify(result), {
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        });
                    }
                }
            }
        } catch (err) {
            console.warn("REDEMET fetch failed or timed out, falling back to global source.", err);
        }
    }

    // Fallback or Global Source (AviationWeather)
    // hours=96 (4 days) to capture last report, taf=true for TAF
    const apiUrl = `https://aviationweather.gov/api/data/metar?ids=${icao}&format=json&hours=96&taf=true`;
    console.log(`Fetching METAR/TAF for ${icao} from ${apiUrl}`);

    // Use 10s timeout for AviationWeather
    const response = await fetchWithTimeout(apiUrl, {}, 10000);
    
    if (!response.ok) {
        throw new Error(`AviationWeather API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (Array.isArray(data)) {
        data.sort((a, b) => {
            const timeA = new Date(a.reportTime || a.observation_time).getTime();
            const timeB = new Date(b.reportTime || b.observation_time).getTime();
            return timeB - timeA; 
        });
        
        // AviationWeather puts TAF in `taf` field if requested?
        // Let's check docs: &taf=true adds "taf" string field to JSON object.
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
