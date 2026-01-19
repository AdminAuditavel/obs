
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

            // Fetch from Redemet API
            const redemetUrl = `https://redemet.decea.mil.br/api/consulta_automatica/index.php?local=${icao}&msg=metar&data_ini=${dataIni}&data_fim=${dataFim}`;
            console.log(`Fetching from REDEMET for ${icao}: ${redemetUrl}`);
            const redResponse = await fetch(redemetUrl);
            
            if (redResponse.ok) {
                const text = await redResponse.text();
                
                // Check if we have any content
                if (text && text.length > 20) {
                    // REDEMET returns multiple messages concatenated with '='
                    // We split and filter valid ones.
                    const rawMessages = text.split('=').map(m => m.trim()).filter(m => m.length > 10 && !m.includes("não localizada") && !m.includes("Mensagem nao encontrada"));
                    
                    const parsedMessages = rawMessages.map((msg, index) => {
                        let cleanMsg = msg;
                        let timeVal = 0;

                        // 1. Try to extract explicit timestamp from REDEMET prefix: "YYYYMMDDHHmm" or "YYYYMMDDHH"
                        const prefixMatch = msg.match(/^(\d{10,12})\s*-\s*/);
                        let prefixYear = 0, prefixMonth = 0;

                        if (prefixMatch) {
                            const tsStr = prefixMatch[1];
                            prefixYear = parseInt(tsStr.substring(0, 4), 10);
                            prefixMonth = parseInt(tsStr.substring(4, 6), 10) - 1; // JS Month is 0-indexed
                            const day = parseInt(tsStr.substring(6, 8), 10);
                            const hour = parseInt(tsStr.substring(8, 10), 10);
                            // If 10 digits, min is 00. If 12, extract it.
                            const min = tsStr.length === 12 ? parseInt(tsStr.substring(10, 12), 10) : 0;
                            
                            // Initial estimate from prefix
                            timeVal = new Date(Date.UTC(prefixYear, prefixMonth, day, hour, min)).getTime();

                            // Remove the prefix to clean the message
                            cleanMsg = msg.substring(prefixMatch[0].length).trim();
                        }

                        // 2. Try to refine time from the body directly (DDHHMMZ)
                        // This is more accurate for minutes than the prefix which often is just the slot hour
                        const bodyTimeMatch = cleanMsg.match(/\b(\d{2})(\d{2})(\d{2})Z\b/);
                        if (bodyTimeMatch) {
                            const bDay = parseInt(bodyTimeMatch[1], 10);
                            const bHour = parseInt(bodyTimeMatch[2], 10);
                            const bMin = parseInt(bodyTimeMatch[3], 10);
                            
                            // Construct date using the Year/Month we likely know
                            // If we have prefix year/month, utilize them. 
                            // Verify Day match to avoid month boundary errors if prefix is delayed vs body
                            
                            let refYear = prefixYear || now.getUTCFullYear();
                            let refMonth = prefixMatch ? prefixMonth : now.getUTCMonth();
                            
                            // Edge Case: Month Boundary
                            // If Date from body is 01 and Ref Month is Prev Month (e.g. 31), we need to check logic
                            // or if prefix hasn't been parsed, we rely on standard boundary logic
                            
                            const candidate = new Date(Date.UTC(refYear, refMonth, bDay, bHour, bMin));
                            
                            // Validation: If candidate is wildly different from prefix time (if existed), we might have a month issue
                            // But usually Redemet prefix is accurate for Year/Month
                            
                            // Re-calculate if we didn't have a prefix, using standard boundary logic
                            if (!prefixMatch) {
                                const diffDays = (candidate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
                                if (diffDays > 2) candidate.setUTCMonth(candidate.getUTCMonth() - 1);
                                else if (diffDays < -28) candidate.setUTCMonth(candidate.getUTCMonth() + 1);
                            } else {
                                // If we had a prefix, trust its Year/Month but trust the body's Day/Hour/Minute
                                // Just in case the day is different (e.g. prefix 2026010100, body 312355Z)
                                // We should assume the prefix is the delivery slot and body is the observation.
                                // If day differs, adjust month if needed.
                                
                                // Actually, simpliest is: Trust Prefix Year/Month. 
                                // If prefix day is 01 and body day is 28-31 => It's previous month? 
                                // Redemet organizes by file slot. A message from 31st 23:55 could be in 01st 00:00 slot?
                                // Let's check for day rollover.
                                const pDay = parseInt(prefixMatch[1].substring(6, 8), 10);
                                if (pDay === 1 && bDay > 27) {
                                     candidate.setUTCMonth(candidate.getUTCMonth() - 1);
                                } else if (pDay > 27 && bDay === 1) {
                                     // Unlikely for old messages in new slot, but possible in reverse?
                                     candidate.setUTCMonth(candidate.getUTCMonth() + 1);
                                }
                            }
                            
                            timeVal = candidate.getTime();
                        } else if (!prefixMatch) {
                             // Fallback if no prefix AND no body match? (Very unlikely)
                             // Already handled in 'else' block below or timeVal is 0
                             // We'll let it be 0 and it will sort last.
                        }
                        
                        // Ensure cleanMsg starts with METAR/SPECI
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
