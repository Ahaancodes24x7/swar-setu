// Supabase Client Initialization with Active Project URL & Fallbacks
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const DEFAULT_SUPABASE_URL = "https://cfmdqbedwjlkrittozxb.supabase.co";
const DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmbWRxYmVkd2psa3JpdHRvenhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MDU3NTgsImV4cCI6MjEwMDI4MTc1OH0.bSLqKPmkYxJDi7WsriODzgDP2admwSZYrpSBt6KMZ6I";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Edge functions are served by the SwarSetu backend (backend/routes/functions.py) at the same
// paths Supabase uses. Set VITE_FUNCTIONS_URL to use deployed Supabase functions instead.
export const FUNCTIONS_URL =
  import.meta.env.VITE_FUNCTIONS_URL ||
  `${import.meta.env.VITE_AI_API_BASE_URL || window.location.origin}/functions/v1`;
(supabase as unknown as { functionsUrl: URL }).functionsUrl = new URL(FUNCTIONS_URL);