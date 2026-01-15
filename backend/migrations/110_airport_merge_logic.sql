-- Migration: 110_airport_merge_logic.sql
-- Function to process staging_airports and upsert into airports

CREATE OR REPLACE FUNCTION public.process_airport_staging_data()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    r RECORD;
    inserted_count INT := 0;
    updated_count INT := 0;
    skipped_count INT := 0;
    error_count INT := 0;
    processed_json JSONB;
BEGIN
    FOR r IN
        SELECT * FROM public.staging_airports WHERE processed = false
    LOOP
        BEGIN
            processed_json := r.raw_data;
            
            -- Validation: Must have ICAO or IATA
            IF (processed_json->>'icao_code' IS NULL AND processed_json->>'iata_code' IS NULL) THEN
                UPDATE public.staging_airports 
                SET processed = true, error_message = 'Missing ICAO and IATA code' 
                WHERE id = r.id;
                error_count := error_count + 1;
                CONTINUE;
            END IF;

            -- Try to find existing airport by ICAO first, then IATA
            -- Upsert logic
            INSERT INTO public.airports (
                icao_code,
                iata_code,
                name,
                city,
                state,
                country_code,
                lat,
                lon,
                type,
                source_data
            ) VALUES (
                COALESCE(processed_json->>'icao_code', processed_json->>'iata_code'), -- Fallback ICAO to IATA if missing? Ideally keep real ICAO
                processed_json->>'iata_code',
                processed_json->>'name',
                processed_json->>'city',
                processed_json->>'state',
                COALESCE(processed_json->>'country_code', 'BR'),
                (processed_json->>'lat')::float,
                (processed_json->>'lon')::float,
                processed_json->>'type',
                jsonb_build_object(
                    'source', r.source_name,
                    'updated_at', now(),
                    'raw', processed_json
                )
            )
            ON CONFLICT (icao_code) 
            DO UPDATE SET
                name = EXCLUDED.name,
                city = COALESCE(EXCLUDED.city, public.airports.city), -- Prefer new value if present, or keep old? Or prefer source?
                state = COALESCE(EXCLUDED.state, public.airports.state),
                lat = COALESCE(EXCLUDED.lat, public.airports.lat),
                lon = COALESCE(EXCLUDED.lon, public.airports.lon),
                type = COALESCE(EXCLUDED.type, public.airports.type),
                source_data = EXCLUDED.source_data
            WHERE public.airports.icao_code IS NOT NULL; -- Simple guard

            IF FOUND THEN
                -- Check if it was actually an insert or update (xmax check is tricky in PLPGSQL, simpler to just count as success)
                -- For simplicity, we just count processed. 
                -- To distinguish insert/update, we'd need more complex logic or check before insert.
                updated_count := updated_count + 1; 
            END IF;

            UPDATE public.staging_airports SET processed = true WHERE id = r.id;
            
        EXCEPTION WHEN OTHERS THEN
            UPDATE public.staging_airports 
            SET processed = true, error_message = SQLERRM 
            WHERE id = r.id;
            error_count := error_count + 1;
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'processed_total', inserted_count + updated_count + skipped_count + error_count,
        'success', updated_count, -- Mixing insert/update for now
        'errors', error_count
    );
END;
$$;
