// Script to fetch real data from Redemet for debugging
// using global fetch


// Helper for date
const formatRedemetDate = (d) => {
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const hh = String(d.getUTCHours()).padStart(2, '0');
    return `${yyyy}${mm}${dd}${hh}`;
};

async function checkRedemet() {
    const icao = 'SBSL';
    const now = new Date();
    // 5 hours back
    const fetchWindowStart = new Date(now.getTime() - 5 * 60 * 60 * 1000);

    // Note: Redemet API usually works with YYYYMMDDHH
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
        // The real code uses '=' delimiter
        const rawMessages = text.split('=').map(m => m.trim()).filter(m => m.length > 10);

        console.log("\nParsing Messages:");
        rawMessages.forEach((msg, i) => {
            console.log(`[${i}] ${msg}`);
            const bodyTimeMatch = msg.match(/\b(\d{2})(\d{2})(\d{2})Z\b/);
            if (bodyTimeMatch) {
                console.log(`    -> Time Match: Day ${bodyTimeMatch[1]}, Hour ${bodyTimeMatch[2]}, Min ${bodyTimeMatch[3]}`);
            } else {
                console.log(`    -> NO TIME MATCH FOUND`);
            }
        });

    } catch (e) {
        console.error("Error fetching:", e);
    }
}

checkRedemet();
