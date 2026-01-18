
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
