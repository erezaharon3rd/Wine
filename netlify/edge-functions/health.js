// בדיקת תקינות לשירות ניטור חיצוני (למשל UptimeRobot), כל 5 דקות.
// מחזירה 200 כשהכל תקין, ו-503 כשמשהו דורש תשומת לב. בלי פרטים אישיים.
const SB_URL_DEFAULT = 'https://qkmdlnarqtjqjnchmjve.supabase.co';
const SB_KEY_DEFAULT = 'sb_publishable_nxs9H3Guf9tw8WHLzyF_vA__MOGvY3W';
const env = (k) => (globalThis.Netlify && Netlify.env.get(k)) || '';

export default async () => {
  const SB_URL = env('SUPABASE_URL') || SB_URL_DEFAULT, SB_KEY = env('SUPABASE_PUBLISHABLE_KEY') || SB_KEY_DEFAULT;
  const out = { site: true, db: false, engine_key: !!env('GEMINI_API_KEY'), engine_breaker: null, engine_budget_used_pct: null, jobs_dead_24h: null, client_errors_1h: null };
  const t0 = Date.now();
  try {
    const r = await fetch(SB_URL + '/rest/v1/rpc/health', { method: 'POST', headers: { apikey: SB_KEY, 'content-type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(8000) });
    if (r.ok) Object.assign(out, await r.json());
  } catch {}
  out.ms = Date.now() - t0;
  const problems = [];
  if (!out.db) problems.push('אין חיבור למסד הנתונים');
  if (!out.engine_key) problems.push('מפתח המנוע חסר');
  if (out.engine_breaker) problems.push('המנוע מושבת בגלל כשלים');
  if (out.engine_budget_used_pct >= 90) problems.push('תקציב המנוע כמעט נוצל');
  if (out.jobs_dead_24h > 0) problems.push('יש עבודות שנכשלו');
  if (out.client_errors_1h > 20) problems.push('הרבה שגיאות אצל משתמשים בשעה האחרונה');
  out.problems = problems;
  return new Response(JSON.stringify(out), { status: problems.length ? 503 : 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
};

export const config = { path: '/api/health' };
