import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://hfvsstkfqszpjrsrwhql.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmdnNzdGtmcXN6cGpyc3J3aHFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NDQzOTgsImV4cCI6MjA5OTEyMDM5OH0.Ne5vvKXWsKSv_hbYMeV9NOpiOgIcsOzYjz8xKshhn60';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
    supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl !== 'https://tu-proyecto.supabase.co' && 
    supabaseAnonKey !== 'tu-anon-key'
);

export const supabase = isSupabaseConfigured
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

