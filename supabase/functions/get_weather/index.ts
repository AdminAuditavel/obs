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

    let metarData = null;

    // 1. Try REDEMET (Best for Brazil)
    // Note: User must set REDEMET_API_KEY secret in Supabase Dashboard
    const redemetKey = Deno.env.get('REDEMET_API_KEY');
    
    if (redemetKey && station.startsWith('S')) { // Optimize: only try Redemet for South American codes usually? Or just always if key exists?
      try {
        console.log('Attempting REDEMET...');
        const date = new Date().toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
        const url = `https://api-redemet.decea.mil.br/mensagens/metar/${station}?api_key=${redemetKey}`;
        
        const res = await fetch(url);
        if (res.ok) {
           const json = await res.json();
           // REDEMET Response Structure: { data: { data: [ { id_localidade: "SBCT", mens: "METAR..." } ] } }
           if (json.data && json.data.data && json.data.data.length > 0) {
             const messages = json.data.data;
             // Sort by validade_inicial desc (latest first) to capture latest SPECI or METAR
             messages.sort((a: any, b: any) => {
                 const dateA = new Date(a.validade_inicial).getTime();
                 const dateB = new Date(b.validade_inicial).getTime();
                 return dateB - dateA;
             });

             const msg = messages[0].mens;
             // Parse basic info from raw string since Redemet doesn't give parsed fields
             metarData = parseMetar(msg, station);
             console.log('REDEMET success');
           }
        }
      } catch (err) {
        console.error('REDEMET failed:', err);
      }
    }

    // 2. Fallback to AviationWeather.gov (Global, Open)
    if (!metarData) {
       console.log('Attempting AviationWeather.gov...');
       try {
         // New API format
         const url = `https://aviationweather.gov/api/data/metar?ids=${station}&format=json`;
         const res = await fetch(url);
         if (res.ok) {
           const json = await res.json();
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
       } catch (err) {
         console.error('AviationWeather failed:', err);
       }
    }

    if (!metarData) {
      // Final fallback attempting NOAA text if JSON fails? No, let's just return null/error.
      return new Response(
        JSON.stringify({ error: 'Weather data not found' }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Return Data
    return new Response(
      JSON.stringify([metarData]), // Return as array to match service expectation or just object? Service expects data[0]
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
