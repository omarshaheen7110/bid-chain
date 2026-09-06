// ============================================================
// SUPABASE CONFIGURATION
// ------------------------------------------------------------
// Replace the two placeholder values below with the ones from
// your Supabase project: Project Settings -> API
//   - Project URL          -> SUPABASE_URL
//   - Project API keys ->
//     "anon" "public" key  -> SUPABASE_ANON_KEY
//
// These are safe to expose in frontend code — they are the
// public keys, not the secret service_role key. Never put the
// service_role key in any file that ships to the browser.
// ============================================================

const SUPABASE_URL = "https://goxjsvksllvieirtskss.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_UzxUs5miRS_SDUarrLQ4gw_tGexy5yb";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
