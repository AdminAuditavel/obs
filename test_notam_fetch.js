
// ESM Script
const formatRedemetDate = (d) => {
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const hh = String(d.getUTCHours()).padStart(2, '0');
    return `${yyyy}${mm}${dd}${hh}`;
};

async function checkAviso() {
    const icao = 'SBGR';
    const now = new Date();
    const fetchWindowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const dataIni = formatRedemetDate(fetchWindowStart);
    const dataFim = formatRedemetDate(now);

    // Try 'aviso_aerodromo'
    const redemetUrl = `https://redemet.decea.mil.br/api/consulta_automatica/index.php?local=${icao}&msg=aviso_aerodromo&data_ini=${dataIni}&data_fim=${dataFim}`;

    console.log(`Fetching Aviso: ${redemetUrl}`);

    try {
        let res = await fetch(redemetUrl);
        let text = await res.text();
        console.log("--- RESPONSE ---");
        console.log(text.substring(0, 1000));
    } catch (e) {
        console.error("Error fetching:", e);
    }
}

checkAviso();
