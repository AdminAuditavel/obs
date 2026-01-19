
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
                    const rawMessages = text.split('=').map(m => m.trim()).filter(m => m.length > 10);
                    
                    const now = new Date();

                    const parsedMessages = rawMessages.map((msg, index) => {
                        let cleanMsg = msg;
                        // Determine type and clean payload
                        const matchType = msg.match(/(METAR|SPECI)[\s\S]*/);
                        if (matchType) {
                            cleanMsg = matchType[0];
                        } 

                        // Extract time Z: "181120Z" (DDHHMMZ)
                        let timeVal = -1;
                        const timeMatch = cleanMsg.match(/\b(\d{2})(\d{2})(\d{2})Z\b/);
                        
                        if (timeMatch) {
                             const day = parseInt(timeMatch[1], 10);
                             const hour = parseInt(timeMatch[2], 10);
                             const min = parseInt(timeMatch[3], 10);
                             
                             // Robust Date Construction
                             // Start with current Year/Month/Day
                             const candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, hour, min));
                             
                             // Handle Month Boundaries
                             // If candidate is > 2 days in the future relative to now, assume previous month
                             const diffDays = (candidate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

                             if (diffDays > 2) {
                                 // Likely from previous month (e.g. Now Feb 1, Msg Jan 31 -> parsed as Feb 31 -> Mar 3)
                                 candidate.setUTCMonth(candidate.getUTCMonth() - 1);
                             } else if (diffDays < -28) {
                                 // Likely from next month (e.g. Now Jan 31, Msg Feb 1 -> parsed as Jan 1)
                                 // This case is rare for "latest weather" but handled for correctness
                                 candidate.setUTCMonth(candidate.getUTCMonth() + 1);
                             }

                             timeVal = candidate.getTime();
                        }

                        return {
                            raw: cleanMsg,
                            timeVal,
                            originalIndex: index
                        };
                    });

                    // Sort strategies:
                    // 1. Time (Desc) - Newest first
                    // 2. Original Index (Desc) - If times are equal (e.g. COR), assume later in list is newer
                    parsedMessages.sort((a, b) => {
                        if (b.timeVal !== a.timeVal) {
                            return b.timeVal - a.timeVal;
                        }
                        return b.originalIndex - a.originalIndex;
                    });

                    // Pick the best candidate (must have valid text)
                    const bestCandidate = parsedMessages.length > 0 ? parsedMessages[0].raw : null;

                    if (bestCandidate) {
                        // Construct a response object compatible with what we expect
                        const result = [{
                            rawOb: bestCandidate,
                            station_id: icao,
                            observation_time: new Date().toISOString(), 
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
