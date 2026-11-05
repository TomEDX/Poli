// Supabase only authenticates editors; the app reads and writes the database through Drizzle.
export function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set. Copy .env.example to .env.");
  }
  return { url, publishableKey };
}
