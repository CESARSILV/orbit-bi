import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create a mock client or real client based on key availability to prevent crashes
export const isSupabaseConfigured =
  supabaseUrl &&
  supabaseUrl !== "your-supabase-project-url" &&
  supabaseAnonKey &&
  supabaseAnonKey !== "your-supabase-anon-key";

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
