// Node.js version of the debug script

const icao = "SBIH";

async function debugWeather() {
    console.log(`Checking weather for ${icao}...`);
    
    // Check if it's a Brazilian airport
    const isBrazilian = /^(S[BUSDIJW]|SW)/.test(icao.toUpperCase());
    console.log(`isBrazilian: ${isBrazilian}`);

    if (isBrazilian) {
        try {
            // REDEMET API
            const redemetUrl = `https://redemet.decea.gov.br/api/consulta_automatica/index.php?local=${icao}&msg=metar`;
            console.log(`Fetching from REDEMET for ${icao}: ${redemetUrl}`);
            const redResponse = await fetch(redemetUrl);
            
            if (redResponse.ok) {
                const text = await redResponse.text();
                console.log("RAW REDEMET RESPONSE:");
                console.log(text);
                console.log("------------------------");

                if (text && text.length > 20 && !text.includes("Mensagem nao encontrada")) {
                    const rawMessages = text.split('=').map(m => m.trim()).filter(m => m.length > 10);
                    
                    console.log(`Found ${rawMessages.length} messages.`);
                    
                    let latestMessage = "";
                    let latestTimeVal = -1;

                    for (const msg of rawMessages) {
                        console.log(`\nProcessing message: "${msg}"`);
                        
                        // Clean prefix if present: "2026011811 - METAR"
                        let cleanMsg = msg;
                        const matchType = msg.match(/(METAR|SPECI)[\s\S]*/);
                        if (matchType) {
                            cleanMsg = matchType[0];
                            console.log(`  Identified type: ${matchType[1]}, cleanMsg: "${cleanMsg.substring(0, 20)}..."`);
                        } else {
                            console.log("  No METAR/SPECI prefix found in regex match.");
                        }

                        // Extract time Z: "181120Z" (DDHHMMZ)
                        const timeMatch = cleanMsg.match(/\b(\d{2})(\d{2})(\d{2})Z\b/);
                        if (timeMatch) {
                            const day = parseInt(timeMatch[1], 10);
                            const hour = parseInt(timeMatch[2], 10);
                            const min = parseInt(timeMatch[3], 10);
                            const timeVal = (day * 24 * 60) + (hour * 60) + min;
                            
                            console.log(`  Time found: Day ${day}, ${hour}:${min}Z (Val: ${timeVal})`);
                            console.log(`  Current Max Val: ${latestTimeVal}`);

                            // If this message is newer (higher value), pick it.
                            if (timeVal > latestTimeVal) {
                                console.log("  -> New latest message candidate!");
                                latestTimeVal = timeVal;
                                latestMessage = cleanMsg;
                            } else {
                                console.log("  -> Older or same time as current latest.");
                            }
                        } else {
                            console.log("  NO TIME FOUND in message.");
                            if (!latestMessage) {
                                console.log("  -> Using as default because no latestMessage yet.");
                                latestMessage = cleanMsg;
                            }
                        }
                    }

                    // Fallback
                    if (!latestMessage && rawMessages.length > 0) {
                        console.log("Falling back to last message in list.");
                        latestMessage = rawMessages[rawMessages.length - 1].replace(/^\d+ - /, '');
                    }
                    
                    console.log("\nFINAL SELECTED MESSAGE:");
                    console.log(latestMessage);
                } else {
                    console.log("Text too short or not found.");
                }
            } else {
                console.log("REDEMET response not OK");
            }
        } catch (err) {
            console.warn("REDEMET fetch failed", err);
        }
    }
}

debugWeather();
