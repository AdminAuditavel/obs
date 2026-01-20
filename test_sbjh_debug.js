// Script to fetch real data from Redemet for debugging SBJH
const icao = 'SBJH';

// Helper for date
const formatRedemetDate = (d) => {
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const hh = String(d.getUTCHours()).padStart(2, '0');
    return `${yyyy}${mm}${dd}${hh}`;
};

async function checkRedemet() {
    const now = new Date(); // 
    // 14 hours back as per code
    const fetchWindowStart = new Date(now.getTime() - 14 * 60 * 60 * 1000);

    const dataIni = formatRedemetDate(fetchWindowStart);
    const dataFim = formatRedemetDate(now);

    const redemetUrl = `https://redemet.decea.mil.br/api/consulta_automatica/index.php?local=${icao}&msg=metar&data_ini=${dataIni}&data_fim=${dataFim}`;
    console.log(`Fetching: ${redemetUrl}`);

    try {
        const res = await fetch(redemetUrl);
        const text = await res.text();
        console.log("--- RAW RESPONSE START ---");
        console.log(text);
        console.log("--- RAW RESPONSE END ---");

        // Split simulation
        const rawMessages = text.split('=').map(m => m.trim()).filter(m => m.length > 20 && !m.includes("não localizada"));

        console.log("\nParsing Messages:");
        rawMessages.forEach((msg, i) => {
            console.log(`[${i}] ${msg}`);
        });

        if (rawMessages.length === 0) {
            console.log("WARNING: No valid messages found after filter.");
        }

    } catch (e) {
        console.error("Error fetching:", e);
    }
}

checkRedemet();
