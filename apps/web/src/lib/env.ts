function requireEnv(key: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  supabaseUrl: requireEnv(
    'VITE_SUPABASE_URL',
    import.meta.env.VITE_SUPABASE_URL,
  ),
  supabaseAnonKey: requireEnv(
    'VITE_SUPABASE_ANON_KEY',
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  ),
  apiBaseUrl: requireEnv(
    'VITE_API_BASE_URL',
    import.meta.env.VITE_API_BASE_URL,
  ),
};
