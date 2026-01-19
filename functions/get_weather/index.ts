
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

    // Check if it's a Brazilian airport
    const isBrazilian = /^(S[BUSDIJW]|SW)/.test(icao.toUpperCase());

    if (isBrazilian) {
        try {
            // REDEMET API
            const redemetUrl = `https://redemet.decea.gov.br/api/consulta_automatica/index.php?local=${icao}&msg=metar`;
            console.log(`Fetching from REDEMET for ${icao}: ${redemetUrl}`);
            const redResponse = await fetch(redemetUrl);
            
            if (redResponse.ok) {
                const text = await redResponse.text();
                
                if (text && text.length > 20 && !text.includes("Mensagem nao encontrada")) {
                    // REDEMET returns multiple messages concatenated with '='
                    // Example format per message: "202401181030 - SPECI ... ="
                    const rawMessages = text.split('=').map(m => m.trim()).filter(m => m.length > 10);
                    
                    const parsedMessages = rawMessages.map((msg, index) => {
                        let cleanMsg = msg;
                        let timeVal = 0;

                        // 1. Try to extract explicit timestamp from REDEMET prefix: "YYYYMMDDHHmm - "
                        // Regex: Start of string, 12 digits, optional space, hyphen
                        const prefixMatch = msg.match(/^(\d{12})\s*-\s*/);

                        if (prefixMatch) {
                            const tsStr = prefixMatch[1];
                            const year = parseInt(tsStr.substring(0, 4), 10);
                            const month = parseInt(tsStr.substring(4, 6), 10) - 1; // JS Month is 0-indexed
                            const day = parseInt(tsStr.substring(6, 8), 10);
                            const hour = parseInt(tsStr.substring(8, 10), 10);
                            const min = parseInt(tsStr.substring(10, 12), 10);
                            
                            timeVal = new Date(Date.UTC(year, month, day, hour, min)).getTime();

                            // Remove the prefix from the raw message to keep it clean for the frontend
                            // The frontend expects just "METAR SBGL ..."
                            cleanMsg = msg.substring(prefixMatch[0].length).trim();
                        } else {
                            // Fallback to body parsing if prefix is missing (unexpected for REDEMET API)
                            const now = new Date();
                            // ... (Existing fallback logic could go here, but let's keep it simple)
                            // If no prefix, we try to grab the first time-like string from the body
                            const timeMatch = msg.match(/\b(\d{2})(\d{2})(\d{2})Z\b/);
                            if (timeMatch) {
                                const day = parseInt(timeMatch[1], 10);
                                const hour = parseInt(timeMatch[2], 10);
                                const min = parseInt(timeMatch[3], 10);
                                const candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, hour, min));
                                // Handle boundaries roughly
                                const diffDays = (candidate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
                                if (diffDays > 2) candidate.setUTCMonth(candidate.getUTCMonth() - 1);
                                else if (diffDays < -28) candidate.setUTCMonth(candidate.getUTCMonth() + 1);
                                timeVal = candidate.getTime();
                            }
                        }
                        
                        // Ensure cleanMsg starts with METAR/SPECI for consistency if possible, 
                        // though REDEMET prefix removal usually leaves it there.
                        const matchType = cleanMsg.match(/^(METAR|SPECI)/);
                        const type = matchType ? matchType[0] : (cleanMsg.includes('SPECI') ? 'SPECI' : 'METAR');

                        return {
                            raw: cleanMsg,
                            timeVal,
                            type,
                            originalIndex: index
                        };
                    });

                    // Sort strategies:
                    // 1. Time (Desc) - Newest first
                    // 2. Type Priority - SPECI > METAR if times are equal
                    // 3. Original Index (Desc) - Tie-breaker
                    parsedMessages.sort((a, b) => {
                        if (b.timeVal !== a.timeVal) {
                            return b.timeVal - a.timeVal;
                        }
                        // Same time: Prioritize SPECI
                        if (a.type !== b.type) {
                            // If a is SPECI, it should come first (return -1)
                            if (a.type === 'SPECI') return -1;
                            if (b.type === 'SPECI') return 1;
                        }
                        return b.originalIndex - a.originalIndex;
                    });

                    // Pick the best candidate
                    const bestCandidate = parsedMessages.length > 0 ? parsedMessages[0] : null;

                    if (bestCandidate && bestCandidate.raw) {
                        const result = [{
                            rawOb: bestCandidate.raw,
                            station_id: icao,
                            observation_time: new Date(bestCandidate.timeVal).toISOString(), 
                        }];

                        return new Response(JSON.stringify(result), {
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        });
                    }
                }
            }
        } catch (err) {
            console.warn("REDEMET fetch failed, falling back to global source.", err);
        }
    }

    // Fallback or Global Source (AviationWeather)
    // hours=96 (4 days) to capture last report for non-24h airports (e.g. closed weekend)
    const apiUrl = `https://aviationweather.gov/api/data/metar?ids=${icao}&format=json&hours=96&taf=false`;
    console.log(`Fetching METAR for ${icao} from ${apiUrl}`);

    const response = await fetch(apiUrl);
    
    if (!response.ok) {
        throw new Error(`AviationWeather API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Ensure we send the latest report first (SPECI or METAR)
    // AviationWeather API usually sorts, but we force it to be sure.
    if (Array.isArray(data)) {
        data.sort((a, b) => {
            const timeA = new Date(a.reportTime || a.observation_time).getTime();
            const timeB = new Date(b.reportTime || b.observation_time).getTime();
            return timeB - timeA; // Descending
        });
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
