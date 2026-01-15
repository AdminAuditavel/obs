
import { Client } from 'pg';
import { parse } from 'csv-parse/sync';
import fetch from 'node-fetch';

// CONFIGURATION
const DATABASE_URL = process.env.DATABASE_URL;
const ANAC_PUBLIC_URL = "https://sistemas.anac.gov.br/dadosabertos/Aerodromos/Aerodromos%20Publicos/AerodromosPublicos.csv";
const ANAC_PRIVATE_URL = "https://sistemas.anac.gov.br/dadosabertos/Aerodromos/Aerodromos%20Privados/AerodromosPrivados.csv";
const OURAIRPORTS_URL = "https://davidmegginson.github.io/ourairports-data/airports.csv";

if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable is required.");
    process.exit(1);
}

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    await client.connect();
    console.log("✅ Connected to database");

    try {
        // 1. ANAC PUBLIC
        console.log("⬇️ Downloading ANAC Public...");
        await processAnac(ANAC_PUBLIC_URL, 'ANAC_PUBLIC', 'public_airport');

        // 2. ANAC PRIVATE
        console.log("⬇️ Downloading ANAC Private...");
        await processAnac(ANAC_PRIVATE_URL, 'ANAC_PRIVATE', 'private_airport');

        // 3. OURAIRPORTS (Enrichment)
        console.log("⬇️ Downloading OurAirports...");
        await processOurAirports();

        console.log("✅ Sync completed successfully.");
    } catch (err) {
        console.error("❌ Sync failed:", err);
    } finally {
        await client.end();
    }
}

async function processAnac(url: string, sourceName: string, defaultType: string) {
    const csvText = await downloadText(url);
    // ANAC CSVs are usually ISO-8859-1 and semicolon separated, and skip 1 line header usually
    // But let's check format. It is usually header on line 1.

    // NOTE: ANAC CSV layout changes often. We assume a standard layout mapping.
    // We will need to map columns dynamically or assume positions.

    const records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ';',
        relax_quotes: true,
        encoding: 'latin1' // csv-parse handles buffers if passed, but here we passed text. 
        // node-fetch returns utf8 by default unless buffer used.
        // ANAC is definitely latin1. We should fetch buffer.
    });

    console.log(`ℹ️ Parsed ${records.length} records from ${sourceName}`);

    let processed = 0;
    let skipped = 0;

    for (const record of records) {
        if (!record.CodigoOACI || record.CodigoOACI.length !== 4) {
            skipped++;
            continue;
        }

        // Map Fields (Adapt based on actual CSV header names)
        const icao = record.CodigoOACI;
        const name = record.Nome || record.NOME;
        const city = record.Municipio || record.MUNICIPIO;
        const state = record.UF;
        const lat = parseCoord(record.Latitude || record.LATITUDE);
        const lon = parseCoord(record.Longitude || record.LONGITUDE);
        const elevation = parseInt(record.Altitude || record.ALTITUDE || '0');

        await client.query(`
        INSERT INTO airports (
            icao, name, city, state, country_code, latitude, longitude, elevation_ft, type, source_data, created_at, updated_at
        ) VALUES (
            $1, $2, $3, $4, 'BR', $5, $6, $7, $8, $9, now(), now()
        )
        ON CONFLICT (icao) DO UPDATE SET
            name = EXCLUDED.name,
            city = EXCLUDED.city,
            state = EXCLUDED.state,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            elevation_ft = EXCLUDED.elevation_ft,
            type = EXCLUDED.type,
            source_data = EXCLUDED.source_data,
            updated_at = now();
      `, [
            icao,
            name,
            city,
            state,
            lat,
            lon,
            elevation, // ANAC is usually meters, schema expects feet? 
            // Wait, plan said elevation_ft. ANAC is meters.
            // Multiply by 3.28084
            Math.round(elevation * 3.28084),
            defaultType,
            JSON.stringify({ source: sourceName, original: record, url })
        ]);
        processed++;
    }
    console.log(`✅ ${sourceName}: Processed ${processed}, Skipped ${skipped}`);
}

async function processOurAirports() {
    // OurAirports is standard CSV UTF8
    const csvText = await downloadText(OURAIRPORTS_URL);
    const records = parse(csvText, {
        columns: true,
        skip_empty_lines: true
    });

    console.log(`ℹ️ Parsed ${records.length} records from OurAirports`);

    let processed = 0;
    let skipped = 0;

    for (const record of records) {
        if (record.iso_country !== 'BR') continue; // BR ONLY
        if (!record.ident || record.ident.length !== 4) continue; // Only legitimate ICAOs

        // Check if exists (Priority to ANAC)
        const res = await client.query("SELECT id FROM airports WHERE icao = $1", [record.ident]);
        if (res.rowCount > 0) {
            // EXISTS. We can enrich if needed? 
            // For now, let's SKIP to respect ANAC priority.
            // Or maybe update 'type' if ANAC didn't have it?
            skipped++;
            continue;
        }

        // INSERT NEW (Missing in ANAC?)
        await client.query(`
            INSERT INTO airports (
                icao, iata, name, city, state, country_code, latitude, longitude, elevation_ft, type, source_data, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, 'BR', $6, $7, $8, $9, $10, now(), now()
            )
            ON CONFLICT (icao) DO NOTHING;
        `, [
            record.ident,
            record.iata_code || null,
            record.name,
            record.municipality,
            record.iso_region.replace('BR-', ''), // remove prefix
            parseFloat(record.latitude_deg),
            parseFloat(record.longitude_deg),
            record.elevation_ft ? parseInt(record.elevation_ft) : null,
            record.type,
            JSON.stringify({ source: 'OURAIRPORTS', original: record })
        ]);

        processed++;
    }
    console.log(`✅ OurAirports: Inserted ${processed} new records (Skipped ${skipped} existing)`);
}

async function downloadText(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);

    // Handle ANAC Latin1
    if (url.includes('anac.gov.br')) {
        const arrayBuffer = await res.arrayBuffer();
        const decoder = new TextDecoder('iso-8859-1');
        return decoder.decode(arrayBuffer);
    }

    return res.text();
}

function parseCoord(coord: string): number {
    // ANAC format might be deg/min/sec or decimal. 
    // Recent CSVs are usually decimal but sometimes with comma.
    // E.g. -23,432 or -23.432
    if (!coord) return 0;
    return parseFloat(coord.replace(',', '.'));
}

main().catch(console.error);
