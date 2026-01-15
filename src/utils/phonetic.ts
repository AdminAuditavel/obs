export const PHONETIC_ALPHABET: Record<string, string> = {
    'ALPHA': 'A',
    'ALFA': 'A',
    'BRAVO': 'B',
    'CHARLIE': 'C',
    'DELTA': 'D',
    'ECHO': 'E',
    'FOXTROT': 'F',
    'GOLF': 'G',
    'HOTEL': 'H',
    'INDIA': 'I',
    'JULIETT': 'J',
    'JULIET': 'J',
    'KILO': 'K',
    'LIMA': 'L',
    'MIKE': 'M',
    'NOVEMBER': 'N',
    'OSCAR': 'O',
    'PAPA': 'P',
    'QUEBEC': 'Q',
    'ROMEO': 'R',
    'SIERRA': 'S',
    'TANGO': 'T',
    'UNIFORM': 'U',
    'VICTOR': 'V',
    'WHISKEY': 'W',
    'XRAY': 'X',
    'X-RAY': 'X',
    'YANKEE': 'Y',
    'ZULU': 'Z',
    'ZERO': '0',
    'ONE': '1',
    'TWO': '2',
    'THREE': '3',
    'FOUR': '4',
    'FIVE': '5',
    'SIX': '6',
    'SEVEN': '7',
    'EIGHT': '8',
    'NINE': '9',
    'THOUSAND': '000',
    'HUNDRED': '00',
    'DASH': '-',
    'DOT': '.',
    'POINT': '.',
    'DECIMAL': '.'
};

export const parsePhoneticString = (input: string): string => {
    if (!input) return '';

    // Split by words, remove extra spaces
    const words = input.toUpperCase().trim().split(/\s+/);

    return words.map(word => {
        // Check for exact match in phonetic alphabet
        if (PHONETIC_ALPHABET[word]) {
            return PHONETIC_ALPHABET[word];
        }
        // If not a phonetic word, keep it as is (or maybe just the first letter? 
        // The requirement says "using the phonetic alphabet", implying we should translate valid phonetic words.
        // If a word is NOT in the phonetic alphabet, it might be just normal speech or a mistake.
        // However, a robust search usually allows mixed input. 
        // For this specific 'aviation' requirement, let's prioritize phonetic replacement but fallback to the word itself if no match found, 
        // allowing for "Alpha Bravo Curitiba" -> "AB CURITIBA" or similar.
        // BUT usually strict phonetic search implies the whole string is phonetic codes.
        // Let's assume mixed usage: strictly replace known phonetic words, keep others.
        return word;
    }).join('');
};
