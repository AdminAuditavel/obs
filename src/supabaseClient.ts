import { createClient } from '@supabase/supabase-js';

const VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const VITE_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
    console.error('Supabase keys missing. Check .env file.');
}

export const supabase = createClient(
    VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
    VITE_SUPABASE_ANON_KEY || 'placeholder'
);
