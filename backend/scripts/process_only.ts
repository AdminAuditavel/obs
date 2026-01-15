
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });

async function main() {
    console.log('Starting processing loop...');
    let remaining = true;
    let totalProcessed = 0;

    while (remaining) {
        // Process 1000 at a time. This should be fast enough to avoid timeout.
        const start = Date.now();
        const { data, error } = await supabase.rpc('process_airport_staging_data', { p_limit: 1000 });

        if (error) {
            console.error('Error invoking RPC:', error);
            // If statement timeout (57014), we could try smaller batch? 
            // For now break to avoid infinite loop of errors.
            break;
        }

        const res = data as any;
        const duration = Date.now() - start;
        console.log(`Batch processed in ${duration}ms:`, res);

        if (res && res.processed_total > 0) {
            totalProcessed += res.processed_total;
        } else {
            remaining = false;
            console.log('No more records to process.');
        }
    }
    console.log(`Total processed in this run: ${totalProcessed}`);
}

main();
