
// ESM Script
async function checkAisweb() {
    const icao = 'SBSL';
    const url = `https://aisweb.decea.mil.br/?i=notam&codigo=${icao}`;
    console.log(`Fetching AISWEB: ${url}`);

    try {
        let res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        let text = await res.text();

        // Count E) occurrences (simple heuristic)
        // NOTAM E field: "E) Description..."
        const regex = /E\)\s+/g;
        const matches = [...text.matchAll(regex)];

        console.log(`Found ${matches.length} occurrences of 'E) '.`);

        if (matches.length > 0) {
            // Dump the first one's context
            const idx = matches[0].index;
            console.log("--- CONTEXT AROUND FIRST E) ---");
            console.log(text.substring(idx - 100, idx + 400));
        } else {
            console.log("No 'E)' fields found. Page might be just a summary.");
            // Dump the end of the summary table to see what's after
            const tableEnd = text.indexOf('</table>');
            if (tableEnd > 0) {
                console.log("--- AFTER TABLE ---");
                console.log(text.substring(tableEnd, tableEnd + 1000));
            }
        }

    } catch (e) {
        console.error("Error fetching:", e);
    }
}
checkAisweb();
