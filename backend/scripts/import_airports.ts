
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
    process.exit(1);
}

// Use Anon key (which now has permissions via RLS modification)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: false
    }
});

const ANAC_URL = 'https://sistemas.anac.gov.br/dadosabertos/Aerodromos/Publicos/Aerodromos%20Publicos.csv';
const OURAIRPORTS_URL = 'https://davidmegginson.github.io/ourairports-data/airports.csv';

interface NormalizedAirport {
    icao_code: string;
    iata_code: string | null;
    name: string;
    city: string | null;
    state: string | null;
    country_code: string;
    lat: number | null;
    lon: number | null;
    type: string;
    source_raw: any;
}

async function downloadCsv(url: string): Promise<string> {
    console.log(`Downloading from ${url}...`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    return await response.text();
}

function parseAnacCoordinate(coord: string): number | null {
    if (!coord) return null;
    const match = coord.match(/(\d+)[°\s]+(\d+)['\s]+([\d\.]+)["\s]*([NSEW])/i);
    if (!match) return null;

    let [_, d, m, s, hem] = match;
    let decimal = parseFloat(d) + parseFloat(m) / 60 + parseFloat(s) / 3600;
    if (hem.toUpperCase() === 'S' || hem.toUpperCase() === 'W') {
        decimal = decimal * -1;
    }
    return decimal;
}

async function processAnacData(csvContent: string) {
    const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ';',
        relax_quotes: true,
        from_line: 1
    });

    console.log(`Parsed ${records.length} records from ANAC.`);

    const airports: NormalizedAirport[] = [];

    for (const record of records) {
        const icao = record['CÓDIGO OACI'] || record['CodigoOACI'];
        if (!icao) continue;

        const lat = parseAnacCoordinate(record['LATITUDE'] || record['Latitude']);
        const lon = parseAnacCoordinate(record['LONGITUDE'] || record['Longitude']);

        airports.push({
            icao_code: icao,
            iata_code: null,
            name: record['NOME'] || record['Nome'] || 'Unknown',
            city: record['MUNICÍPIO'] || record['Municipio'] || record['CIDADE'],
            state: record['UF'],
            country_code: 'BR',
            lat,
            lon,
            type: 'aerodrome',
            source_raw: record
        });
    }
    return airports;
}

async function processOurAirportsData(csvContent: string) {
    const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true
    });

    console.log(`Parsed ${records.length} records from OurAirports.`);

    const airports: NormalizedAirport[] = [];

    for (const record of records) {
        airports.push({
            icao_code: record['ident'],
            iata_code: record['iata_code'] || null,
            name: record['name'],
            city: record['municipality'],
            state: record['iso_region']?.split('-')[1] || null,
            country_code: record['iso_country'],
            lat: parseFloat(record['latitude_deg']),
            lon: parseFloat(record['longitude_deg']),
            type: record['type'],
            source_raw: record
        });
    }
    return airports;
}

async function main() {
    try {
        console.log('Starting import via REST API...');

        // 1. ANAC
        let anacAirports: NormalizedAirport[] = [];
        try {
            const anacCsv = await downloadCsv(ANAC_URL);
            anacAirports = await processAnacData(anacCsv);
        } catch (e) {
            console.error('Error fetching/parsing ANAC data:', e);
        }

        // 2. OurAirports
        let ourAirports: NormalizedAirport[] = [];
        try {
            const oaCsv = await downloadCsv(OURAIRPORTS_URL);
            ourAirports = await processOurAirportsData(oaCsv);
        } catch (e) {
            console.error('Error fetching/parsing OurAirports data:', e);
        }

        // 3. Staging Upload
        const allAirports = [
            ...anacAirports.map(a => ({ source: 'ANAC', data: a })),
            ...ourAirports.map(a => ({ source: 'OurAirports', data: a }))
        ];

        console.log(`Total records to stage: ${allAirports.length}`);

        const CHUNK_SIZE = 1000;
        for (let i = 0; i < allAirports.length; i += CHUNK_SIZE) {
            const chunk = allAirports.slice(i, i + CHUNK_SIZE);

            const rows = chunk.map(item => ({
                source_name: item.source,
                raw_data: item.data,
                processed: false
            }));

            const { error } = await supabase
                .from('staging_airports')
                .insert(rows);

            if (error) {
                console.error('Error inserting chunk:', error);
            } else {
                if (i % 5000 === 0) console.log(`Staged ${i} / ${allAirports.length}`);
            }
        }

        console.log('Staging complete. Triggering processing...');

        // 4. Trigger Processing
        const { data, error } = await supabase.rpc('process_airport_staging_data');

        if (error) {
            console.error('Error processing staging data:', error);
        } else {
            console.log('Processing complete. Report:', data);
        }

    } catch (err) {
        console.error('Fatal error:', err);
    }
}

main();
