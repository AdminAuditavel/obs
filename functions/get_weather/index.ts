
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
                // REDEMET often returns raw text like: "202401181400 METAR SBGR 181400Z ...="
                // Or sometimes just empty if no data.
                if (text && text.length > 20 && !text.includes("Mensagem nao encontrada")) {
                    // REDEMET can return multiple messages concatenated with '='
                    // e.g. "METAR...= 2024... SPECI...="
                    // We split by '=' to get individual reports
                    const rawMessages = text.split('=').map(m => m.trim()).filter(m => m.length > 10);
                    
                    let latestMessage = "";
                    let latestTimeVal = -1;

                    for (const msg of rawMessages) {
                        // Clean prefix if present: "2026011811 - METAR"
                        let cleanMsg = msg;
                        const matchType = msg.match(/(METAR|SPECI)[\s\S]*/);
                        if (matchType) {
                            cleanMsg = matchType[0];
                        } 

                        // Extract time Z: "181120Z" (DDHHMMZ)
                        const timeMatch = cleanMsg.match(/\b(\d{2})(\d{2})(\d{2})Z\b/);
                        if (timeMatch) {
                            // Convert to comparable minutes value (Day * 1440 + Hour * 60 + Min)
                            // Assumes same month which is safe for current METARs
                            const day = parseInt(timeMatch[1], 10);
                            const hour = parseInt(timeMatch[2], 10);
                            const min = parseInt(timeMatch[3], 10);
                            const timeVal = (day * 24 * 60) + (hour * 60) + min;
                            
                            // If this message is newer (higher value), pick it.
                            // Note: Edge case of month rollover (day 31 -> 01) is rare for "current" weather 
                            // but simpler logic suffices for 99% of cases.
                            if (timeVal > latestTimeVal) {
                                latestTimeVal = timeVal;
                                latestMessage = cleanMsg;
                            }
                        } else {
                            // If we can't parse time but haven't found anything else, keep it candidate
                            if (!latestMessage) latestMessage = cleanMsg;
                        }
                    }

                    // Fallback: if logic failed to pick by time, blindly take the last non-empty one
                    // (REDEMET usually appends new ones at the end)
                    if (!latestMessage && rawMessages.length > 0) {
                        latestMessage = rawMessages[rawMessages.length - 1].replace(/^\d+ - /, '');
                    }
                    
                    // Construct a response object compatible with what we expect
                    const result = [{
                        rawOb: latestMessage,
                        station_id: icao,
                        observation_time: new Date().toISOString(), 
                    }];

                    return new Response(JSON.stringify(result), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
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
