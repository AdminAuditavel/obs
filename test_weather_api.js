async function testWeather() {
    const station = 'SBEG'; // Check SBEG specifically
    const url = `https://aviationweather.gov/api/data/taf?ids=${station}&format=json`;

    console.log(`Fetching TAF for ${station} from: ${url}`);

    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.error('Fetch failed:', res.status, res.statusText);
            return;
        }

        const text = await res.text();
        console.log('Raw Response length:', text.length);

        try {
            const json = JSON.parse(text);
            console.log('JSON parsed successfully.');
            console.log('Is Array?', Array.isArray(json));
            if (Array.isArray(json) && json.length > 0) {
                console.log('First item keys:', Object.keys(json[0]));
                console.log('rawOb:', json[0].rawOb);
                console.log('rawTAF:', json[0].rawTAF);
                console.log('taf:', json[0].taf);
            } else {
                console.log('JSON is empty or not an array:', json);
            }
        } catch (e) {
            console.error('JSON parse error:', e);
            console.log('First 100 chars:', text.substring(0, 100));
        }

    } catch (err) {
        console.error('Network error:', err);
    }
}

testWeather();
