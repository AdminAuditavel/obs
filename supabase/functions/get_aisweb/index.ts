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
    const { area = 'rotaer', row = 10 } = body;

    const API_KEY = Deno.env.get('AISWEB_API_KEY');
    const API_PASS = Deno.env.get('AISWEB_API_PASS');

    if (!API_KEY || !API_PASS) {
      throw new Error('AISWEB credentials not configured.');
    }

    // Build the query string dynamically based on provided fields
    const params = new URLSearchParams({
      apiKey: API_KEY,
      apiPass: API_PASS,
      area,
      row: row.toString(),
    });

    // Add search filters if provided
    if (body.icaoCode) params.append('icaoCode', body.icaoCode);
    if (body.name) params.append('name', body.name);
    if (body.loc) params.append('loc', body.loc);
    if (body.state) params.append('state', body.state);

    // If providing a search query but no specific field, we'll try icaoCode as default or search logic
    if (body.search && !body.icaoCode && !body.name && !body.loc) {
        const query = body.search.toUpperCase();
        // Heuristic: if starts with S/O/P/N and 2-4 chars, likely ICAO (Brazil uses S- prefix, some others too)
        // Or if it's alphanumeric and short. 
        if (query.length >= 2 && query.length <= 4 && (query.startsWith('S') || query.startsWith('O'))) {
            params.append('icaoCode', query);
        } else {
            params.append('name', query); // name search is usually broader than loc
        }
    }

    const url = `http://www.aisweb.aer.mil.br/api/?${params.toString()}`;
    console.log(`Fetching from AISWEB: ${url}`);

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
