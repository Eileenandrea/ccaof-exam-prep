export default function handler(_req, res) {
  res.status(200).json({
    ok: true,
    time: new Date().toISOString(),
    hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
    hasSupabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    vercelEnv: process.env.VERCEL_ENV ?? null,
  });
}
