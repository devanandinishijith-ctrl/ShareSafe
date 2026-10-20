import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables or user-configured credentials
const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Stored credentials from localStorage (if user configured via UI)
const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('sharesafe_supabase_url') || '' : '';
const storedKey = typeof window !== 'undefined' ? localStorage.getItem('sharesafe_supabase_anon_key') || '' : '';

export const supabaseUrl = storedUrl || envUrl;
export const supabaseAnonKey = storedKey || envAnonKey;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('placeholder')
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export const saveSupabaseCredentials = (url: string, anonKey: string) => {
  if (url && anonKey) {
    localStorage.setItem('sharesafe_supabase_url', url.trim());
    localStorage.setItem('sharesafe_supabase_anon_key', anonKey.trim());
    window.location.reload();
  }
};

export const clearSupabaseCredentials = () => {
  localStorage.removeItem('sharesafe_supabase_url');
  localStorage.removeItem('sharesafe_supabase_anon_key');
  window.location.reload();
};
