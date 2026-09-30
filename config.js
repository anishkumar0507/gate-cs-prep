/* Public site config. The anon (publishable) key is safe to ship: Row Level Security in supabase/schema.sql
   lets each signed-in student reach only their own rows. Never put the service_role key or the DB password here. */
window.GATE_CONFIG = {
  supabaseUrl: 'https://meoktpwcuszqexiiddlw.supabase.co',
  supabaseAnonKey: ''  // Supabase Dashboard → Project Settings → API → anon / publishable key
};
