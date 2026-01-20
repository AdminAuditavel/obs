
// Mock REDEMET response text
// Scenario: METAR at 10:00, SPECI at 10:30.
// REDEMET usually outputs older first? "202401181000 - METAR ... = 202401181030 - SPECI ..."
// Let's test both orders.

const rawTextOldFirst = `202401181000 - METAR SBGL 181000Z 12005KT 9999 FEW020 25/20 Q1012=
202401181030 - SPECI SBGL 181030Z 18015G25KT 5000 TSRA SCT015CB BKN030 24/22 Q1010=`;

const rawTextNewFirst = `202401181030 - SPECI SBGL 181030Z 18015G25KT 5000 TSRA SCT015CB BKN030 24/22 Q1010=
202401181000 - METAR SBGL 181000Z 12005KT 9999 FEW020 25/20 Q1012=`;

// Logic from get_weather/index.ts
function parse(text: string) {
    const rawMessages = text.split('=').map(m => m.trim()).filter(m => m.length > 10);
    const now = new Date("2024-01-18T11:00:00Z"); // Set Fixed "Now"

    const parsedMessages = rawMessages.map((msg, index) => {
        let cleanMsg = msg;
        // Determine type and clean payload
        const matchType = msg.match(/(METAR|SPECI)[\s\S]*/);
        if (matchType) {
            cleanMsg = matchType[0];
        } 

        // Extract time Z: "181120Z" (DDHHMMZ)
        let timeVal = -1;
        // Logic from file
        const timeMatch = cleanMsg.match(/\b(\d{2})(\d{2})(\d{2})Z\b/);
        
        if (timeMatch) {
                const day = parseInt(timeMatch[1], 10);
                const hour = parseInt(timeMatch[2], 10);
                const min = parseInt(timeMatch[3], 10);
                
                // Robust Date Construction
                // Start with current Year/Month/Day
                // Note: File uses now.getUTCFullYear()...
                const candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, hour, min));
                
                // Handle Month Boundaries
                const diffDays = (candidate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

                if (diffDays > 2) {
                    candidate.setUTCMonth(candidate.getUTCMonth() - 1);
                } else if (diffDays < -28) {
                    candidate.setUTCMonth(candidate.getUTCMonth() + 1);
                }

                timeVal = candidate.getTime();
        }

        return {
            raw: cleanMsg,
            timeVal,
            originalIndex: index,
            debugTime: new Date(timeVal).toISOString()
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

    return parsedMessages;
}

console.log("--- Test 1: Oldest First (Standard Log) ---");
const res1 = parse(rawTextOldFirst);
console.log("Winner:", res1[0].raw.substring(0, 20));
console.log("All:", res1.map(r => `${r.raw.substring(0,10)}... ${r.debugTime}`));

console.log("\n--- Test 2: Newest First ---");
const res2 = parse(rawTextNewFirst);
console.log("Winner:", res2[0].raw.substring(0, 20));
console.log("All:", res2.map(r => `${r.raw.substring(0,10)}... ${r.debugTime}`));
