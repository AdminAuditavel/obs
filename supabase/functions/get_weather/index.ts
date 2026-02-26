import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { icao } = await req.json();
    if (!icao) {
      throw new Error('ICAO code is required');
    }

    const station = icao.toUpperCase();
    console.log(`Fetching weather for ${station}`);

    let metarData: any = null;
    let tafData: string | null = null;

    // 1. Try REDEMET (Best for Brazil)
    const redemetKey = Deno.env.get('REDEMET_API_KEY');
    
    if (redemetKey && station.startsWith('S')) {
      try {
        console.log('Attempting REDEMET...');
        const date = new Date().toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
        
        // Parallel Fetch for METAR and TAF using new API Key format
        const [metarRes, tafRes] = await Promise.all([
          fetch(`https://api-redemet.decea.mil.br/mensagens/metar/${station}?api_key=${redemetKey}`),
          fetch(`https://api-redemet.decea.mil.br/mensagens/taf/${station}?api_key=${redemetKey}`)
        ]);

        // Process METAR
        if (metarRes.ok) {
           const json = await metarRes.json();
           if (json.status && json.data && json.data.data && json.data.data.length > 0) {
             const messages = json.data.data;
             const msg = messages[0].mens; // Top message
             metarData = parseMetar(msg, station);
             console.log('REDEMET METAR success');
           }
        }

        // Process TAF
        if (tafRes.ok) {
          const json = await tafRes.json();
          if (json.status && json.data && json.data.data && json.data.data.length > 0) {
             const messages = json.data.data;
             tafData = messages[0].mens; // Raw TAF
             console.log('REDEMET TAF success');
          }
        }

      } catch (err) {
        console.error('REDEMET failed:', err);
      }
    }

    // 2. Fallback to AviationWeather.gov (Global, Open)
    // We use this if REDEMET failed to get METAR, OR if we are not using REDEMET (international).
    // If we have METAR from Redemet but no TAF, we might want to try AviationWeather for TAF only? 
    // Usually Redemet has TAF if it has METAR. Let's keep logic simple: if no METAR yet, try AW for everything.

    // 3. Fallback for TAF (If METAR found but TAF missing)
    if (metarData && !tafData) {
       console.log('METAR found but TAF missing. Attempting AviationWeather for TAF...');
       try {
         const tafUrl = `https://aviationweather.gov/api/data/taf?ids=${station}&format=json`;
         const tafRes = await fetch(tafUrl);
         if (tafRes.ok) {
            const json = await tafRes.json();
            if (json && json.length > 0) {
              tafData = json[0].rawOb || json[0].rawTAF;
              console.log('TAF fetched from AviationWeather fallback');
            }
         }
       } catch (err) {
         console.warn('TAF Fallback failed:', err);
       }
    }

    // 2. Fallback to AviationWeather.gov (Global, Open) - Full Fallback if NO METAR
    if (!metarData) {
       console.log('Attempting AviationWeather.gov (Full)...');
       try {
         // Fetch METAR
         const metarUrl = `https://aviationweather.gov/api/data/metar?ids=${station}&format=json`;
         // Fetch TAF
         const tafUrl = `https://aviationweather.gov/api/data/taf?ids=${station}&format=json`;

         const [metarRes, tafRes] = await Promise.all([
           fetch(metarUrl),
           fetch(tafUrl)
         ]);

         if (metarRes.ok) {
           const json = await metarRes.json();
           if (json && json.length > 0) {
              const d = json[0];
              metarData = {
                raw: d.rawOb,
                station_id: d.icaoId,
                observation_time: d.reportTime,
                temp_c: d.temp,
                dewpoint_c: d.dewp,
                wind_dir_degrees: d.wdir,
                wind_speed_kt: d.wspd,
                flight_category: d.flightCategory || calculateFlightCategory(d.visib, d.ceiling),
                visibility_statute_mi: d.visib,
                altim_in_hg: d.altim
              };
           }
         }

         if (tafRes.ok) {
           const json = await tafRes.json();
           if (json && json.length > 0) {
             tafData = json[0].rawOb || json[0].rawTAF; // Check API field name
           }
         }

       } catch (err) {
         console.error('AviationWeather failed:', err);
       }
    }

    if (!metarData) {
      return new Response(
        JSON.stringify({ error: 'Weather data not found' }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Append TAF to data
    if (tafData) {
      metarData.taf = tafData;
    }

    // Return Data
    return new Response(
      JSON.stringify([metarData]),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

// Simple parser for fallback or REDEMET raw strings
function parseMetar(raw: string, station: string) {
  // Extract time: DDHHMMZ
  const timeMatch = raw.match(/(\d{6}Z)/);
  const time = timeMatch ? timeMatch[0] : new Date().toISOString(); 

  // Extract Wind: DDDSSKT or DDDSSGXXKT
  const windMatch = raw.match(/(\d{3}|VRB)(\d{2,3})(G(\d{2,3}))?KT/);
  const windDir = windMatch ? (windMatch[1] === 'VRB' ? 0 : parseInt(windMatch[1])) : 0;
  const windSpd = windMatch ? parseInt(windMatch[2]) : 0;

  // Flight Category (Approximation)
  // Logic: IFR if Vis < 3 miles OR Ceiling < 1000ft
  // VFR otherwise (Simplified)
  // We need to parse visibility and cloud layers... complicated regex.
  // For MVP/Redemet raw, let's default to N/A if we don't want to write a full parser.
  // Or rudimentary check for "CAVOK" -> VFR.
  const isCavok = raw.includes('CAVOK');
  
  return {
    raw: raw,
    station_id: station,
    observation_time: time,
    wind_dir_degrees: windDir,
    wind_speed_kt: windSpd,
    flight_category: isCavok ? 'VFR' : 'N/A' // Placeholder
  };
}

function calculateFlightCategory(vis: number, ceil: number) {
   if (vis < 3 || (ceil && ceil < 1000)) return 'IFR';
   return 'VFR';
}
