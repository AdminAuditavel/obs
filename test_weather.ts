
const testWeather = async () => {
    try {
        const response = await fetch('https://aviationweather.gov/api/data/metar?ids=SBGR&format=json&hours=1');
        console.log('Status:', response.status);
        if (response.ok) {
            const data = await response.json();
            console.log('Data:', JSON.stringify(data, null, 2));
        } else {
            console.log('Response not ok');
        }
    } catch (err) {
        console.error('Error:', err);
    }
};

testWeather();
