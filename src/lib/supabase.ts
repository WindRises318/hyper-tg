import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fllyjnlffcarlkuwmajk.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'sb_publishable_G8qvkQK9R0owb0pjIqey2Q_V4BEXVSM';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY in your environment.');
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
