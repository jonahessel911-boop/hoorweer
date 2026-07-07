export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      key &&
      url !== 'https://your-project.supabase.co' &&
      key !== 'your-anon-key' &&
      !url.includes('placeholder')
  );
}
