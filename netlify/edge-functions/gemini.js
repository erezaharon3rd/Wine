// מנוע הצילום של סדנת התווית.
// המפתח של Google נשמר רק ב־Netlify (משתנה GEMINI_API_KEY) ולא מגיע לדפדפן.
// כל קריאה דורשת משתמש מחובר. כל שימוש נרשם במסד הנתונים, ושם נבדקות המכסה והקצב.
const GAPI = 'https://generativelanguage.googleapis.com/v1beta/';
const OK_PATH = /^models\?pageSize=1000$|^models\/[\w.\-]+:generateContent$/;
// כתובת ומפתח ציבוריים של Supabase (מותרים בקוד). אפשר לדרוס במשתני סביבה.
const SB_URL_DEFAULT = 'https://qkmdlnarqtjqjnchmjve.supabase.co';
const SB_KEY_DEFAULT = 'sb_publishable_nxs9H3Guf9tw8WHLzyF_vA__MOGvY3W';
const MAX_BODY = 12 * 1024 * 1024; // 12MB: תווית ותמונת ציור מוקטנת

const env = (k) => (globalThis.Netlify && Netlify.env.get(k)) || '';

export default async (req) => {
  const key = env('GEMINI_API_KEY');
  const SB_URL = env('SUPABASE_URL') || SB_URL_DEFAULT;
  const SB_KEY = env('SUPABASE_PUBLISHABLE_KEY') || SB_KEY_DEFAULT;
  const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  const fail = (status, message) => json({ status, data: { error: { message } } }, status);

  if (req.method === 'GET') return json({ ok: !!key });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  if (!key) return fail(503, 'מנוע הצילום לא מוגדר בשרת');

  // רק הדפים של האתר עצמו
  const origin = req.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(req.url).host) return fail(403, 'הבקשה לא הגיעה מהאתר');

  // משתמש מחובר: האסימון נבדק מול Supabase
  const auth = req.headers.get('authorization') || '';
  if (!/^Bearer\s+\S+/.test(auth)) return fail(401, 'צריך להתחבר כדי להשתמש במנוע');
  const sb = (path, init = {}) => fetch(SB_URL + path, { ...init, headers: { apikey: SB_KEY, authorization: auth, 'content-type': 'application/json', ...(init.headers || {}) } });
  const who = await sb('/auth/v1/user').catch(() => null);
  if (!who || !who.ok) return fail(401, 'החיבור פג. כדאי להיכנס שוב');

  const len = +(req.headers.get('content-length') || 0);
  if (len > MAX_BODY) return fail(413, 'הקבצים גדולים מדי');

  let input;
  try { input = await req.json(); } catch { return fail(400, 'בקשה לא תקינה'); }
  const path = String(input.path || '');
  if (!OK_PATH.test(path)) return fail(400, 'הבקשה הזו אינה מותרת');

  // רשימת המודלים לא נספרת. יצירה נספרת: תמונה מול המכסה החודשית, ניתוח מול מכסה יומית
  if (input.body) {
    const kind = /image/i.test(path) ? 'image' : 'text';
    const r = await sb('/rest/v1/rpc/engine_take', { method: 'POST', body: JSON.stringify({ p_kind: kind }) }).catch(() => null);
    if (!r) return fail(503, 'אין חיבור למסד הנתונים');
    if (!r.ok) {
      let m = 'אין הרשאה להשתמש במנוע';
      try { const e = await r.json(); if (/[֐-׿]/.test(e.message || '')) m = e.message; } catch {}
      return fail(429, m);
    }
  }

  // מתחילים לענות מיד ושולחים רווח כל כמה שניות, כדי שהחיבור לא ייסגר בזמן שהתמונה נוצרת
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      ctrl.enqueue(enc.encode(' '));
      const beat = setInterval(() => { try { ctrl.enqueue(enc.encode(' ')); } catch {} }, 5000);
      try {
        const r = await fetch(GAPI + path, input.body
          ? { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(input.body) }
          : { headers: { 'x-goog-api-key': key } });
        const txt = await r.text();
        clearInterval(beat);
        ctrl.enqueue(enc.encode('{"status":' + r.status + ',"data":' + (txt.trim() || '{}') + '}'));
      } catch (e) {
        clearInterval(beat);
        ctrl.enqueue(enc.encode(JSON.stringify({ status: 502, data: { error: { message: String(e && e.message || e) } } })));
      }
      ctrl.close();
    }
  });
  return new Response(stream, { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
};

export const config = { path: '/api/gemini' };
