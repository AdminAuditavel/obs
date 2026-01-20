
// ESM script
async function testEndpoint() {
    const url = 'https://cigxkvwijmmxjllqqgmh.supabase.co/functions/v1/get_weather';
    const icao = 'SBJH';

    console.log(`Testing endpoint: ${url} for ${icao}`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ icao })
        });

        console.log(`Status: ${response.status} ${response.statusText}`);
        const text = await response.text();
        console.log('--- Body Start ---');
        console.log(text);
        console.log('--- Body End ---');

    } catch (error) {
        console.error('Fetch error:', error);
    }
}

testEndpoint();
