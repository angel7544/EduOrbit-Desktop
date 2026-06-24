import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseAdminInstance: SupabaseClient | null = null;

export const getSupabaseAdmin = () => {
  if (supabaseAdminInstance) return supabaseAdminInstance;

  // Support both NEXT_PUBLIC_ and EXPO_PUBLIC_ prefixes for convenience
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    // Log missing keys for debugging
    const missing = [];
    if (!supabaseUrl) missing.push('SUPABASE_URL');
    if (!supabaseServiceRoleKey) missing.push('SUPABASE_KEY');
    
    throw new Error(`Missing Supabase environment variables: ${missing.join(', ')}`);
  }

  supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceRoleKey);
  return supabaseAdminInstance;
};

// Export a safe instance for top-level usage if needed, but prefer getSupabaseAdmin()
// This prevents build-time crashes
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get: (_target, prop) => {
    const client = getSupabaseAdmin();
    return (client as any)[prop];
  },
});
