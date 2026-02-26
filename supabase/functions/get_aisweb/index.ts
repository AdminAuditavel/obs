import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { icao, area = 'rotaer' } = await req.json();

    if (!icao) {
      throw new Error('ICAO code is required');
    }

    const API_KEY = Deno.env.get('AISWEB_API_KEY');
    const API_PASS = Deno.env.get('AISWEB_API_PASS');

    if (!API_KEY || !API_PASS) {
      throw new Error('AISWEB credentials not configured.');
    }

    const url = `http://www.aisweb.aer.mil.br/api/?apiKey=${API_KEY}&apiPass=${API_PASS}&area=${area}&row=10&icaoCode=${icao}`;
    console.log(`Fetching from AISWEB: ${area} for ${icao}`);

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`AISWEB returned ${response.status}`);
    }

    // AISWEB returns XML natively. We will return the raw XML string and let the client parse it,
    // OR we could parse it here, but keeping it simple proxy is often safest for AISWEB standard format.
    const xmlData = await response.text();

    return new Response(
      JSON.stringify({ xml: xmlData }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('AISWEB Function Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
