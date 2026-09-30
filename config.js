/* Public site config. The anon (publishable) key is safe to ship: Row Level Security in supabase/schema.sql
   lets each signed-in student reach only their own rows. Never put the service_role key or the DB password here. */
window.GATE_CONFIG = {
  supabaseUrl: 'https://meoktpwcuszqexiiddlw.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lb2t0cHdjdXN6cWV4aWlkZGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NTUxMDUsImV4cCI6MjEwNjMzMTEwNX0.8Zr6d46UXhjPT5Wd9qm5w2Z9WQebI3nuwuIyqgc15oE'  // Supabase Dashboard → Project Settings → API → anon / publishable key
};
