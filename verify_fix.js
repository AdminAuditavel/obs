// Verification script using the NEW logic
const icao = "SBIH";

async function verifyLogic() {
    console.log(`Verifying fix for ${icao}...`);

    // Check if it's a Brazilian airport
    const isBrazilian = /^(S[BUSDIJW]|SW)/.test(icao.toUpperCase());

    if (isBrazilian) {
        try {
            // REDEMET API
            const redemetUrl = `https://redemet.decea.gov.br/api/consulta_automatica/index.php?local=${icao}&msg=metar`;
            console.log(`Fetching from REDEMET for ${icao}: ${redemetUrl}`);
            const redResponse = await fetch(redemetUrl);

            if (redResponse.ok) {
                const text = await redResponse.text();
                // REDEMET returns multiple messages concatenated with '='
                // e.g. "METAR...= 2024... SPECI...="
                // We split by '=' to get individual reports

                console.log("Raw Text:\n" + text + "\n");

                if (text && text.length > 20 && !text.includes("Mensagem nao encontrada")) {
                    const rawMessages = text.split('=').map(m => m.trim()).filter(m => m.length > 10);

                    const parsedMessages = rawMessages.map((msg, index) => {
                        let cleanMsg = msg;
                        // Determine type and clean payload
                        const matchType = msg.match(/(METAR|SPECI)[\s\S]*/);
                        if (matchType) {
                            cleanMsg = matchType[0];
                        }

                        // Extract time Z: "181120Z" (DDHHMMZ)
                        let timeVal = -1;
                        const timeMatch = cleanMsg.match(/\b(\d{2})(\d{2})(\d{2})Z\b/);
                        if (timeMatch) {
                            const day = parseInt(timeMatch[1], 10);
                            const hour = parseInt(timeMatch[2], 10);
                            const min = parseInt(timeMatch[3], 10);
                            // Simple minute-based value for comparison
                            // (This assumes all reports are within the same month/year window which is true for current weather)
                            timeVal = (day * 24 * 60) + (hour * 60) + min;
                        }

                        return {
                            raw: cleanMsg,
                            timeVal,
                            originalIndex: index
                        };
                    });

                    // Sort strategies:
                    // 1. Time (Desc) - Newest first
                    // 2. Original Index (Desc) - If times are equal (e.g. COR), assume later in list is newer
                    parsedMessages.sort((a, b) => {
                        if (b.timeVal !== a.timeVal) {
                            return b.timeVal - a.timeVal;
                        }
                        return b.originalIndex - a.originalIndex;
                    });

                    console.log("Parsed & Sorted Messages:");
                    parsedMessages.forEach(m => console.log(`[${m.timeVal}] (idx ${m.originalIndex}): ${m.raw.substring(0, 50)}...`));

                    // Pick the best candidate (must have valid text)
                    const bestCandidate = parsedMessages.length > 0 ? parsedMessages[0].raw : null;

                    console.log("\n------------------------------------------------");
                    console.log("SELECTED MESSAGE (Logic Result):");
                    console.log(bestCandidate);
                    console.log("------------------------------------------------");
                }
            }
        } catch (err) {
            console.warn("REDEMET fetch failed, falling back to global source.", err);
        }
    }
}

verifyLogic();
