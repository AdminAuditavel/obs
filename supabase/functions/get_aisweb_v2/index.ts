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
    const body = await req.json();
    const { icao, icaoCode, area = 'rotaer', row = 10, search } = body;

    const API_KEY = Deno.env.get('AISWEB_API_KEY');
    const API_PASS = Deno.env.get('AISWEB_API_PASS');

    if (!API_KEY || !API_PASS) {
      throw new Error('AISWEB credentials not configured.');
    }

    const params = new URLSearchParams({
      apiKey: API_KEY,
      apiPass: API_PASS,
      area,
      row: row.toString(),
    });

    // Support both 'icao' and 'icaoCode'
    const finalIcao = icao || icaoCode;
    if (finalIcao) params.append('icaoCode', finalIcao.toUpperCase());
    
    // Support search query fallback
    if (search && !finalIcao) {
        const query = search.toUpperCase();
        if (query.length >= 2 && query.length <= 4 && (query.startsWith('S') || query.startsWith('O'))) {
            params.append('icaoCode', query);
        } else {
            params.append('name', query);
        }
    }

    const url = `https://aisweb.decea.mil.br/api/?${params.toString()}`;
    console.log(`[DEBUG] AISWEB Proxy Fetch: ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`AISWEB returned ${response.status}`);
        }

        const xmlData = await response.text();
        return new Response(
            JSON.stringify({ xml: xmlData }), 
            { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
    } catch (err) {
        clearTimeout(timeoutId);
        throw err;
    }

  } catch (error) {
    console.error('[DEBUG] AISWEB Proxy Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
