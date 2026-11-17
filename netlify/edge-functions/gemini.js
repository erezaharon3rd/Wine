// מנוע הצילום של סדנת התווית. המפתח של Google נשמר רק ב־Netlify (משתנה GEMINI_API_KEY) ולא מגיע לדפדפן.
const GAPI = 'https://generativelanguage.googleapis.com/v1beta/';
const OK_PATH = /^models\?pageSize=1000$|^models\/[\w.\-]+:generateContent$/;

export default async (req) => {
  const key = Netlify.env.get('GEMINI_API_KEY');
  const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
  if (req.method === 'GET') return json({ ok: !!key });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  if (!key) return json({ status: 503, data: { error: { message: 'GEMINI_API_KEY is not set on Netlify' } } });

  // רק הדפים של האתר עצמו יכולים להשתמש במנוע
  const origin = req.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(req.url).host) return json({ error: 'origin' }, 403);

  let input;
  try { input = await req.json(); } catch { return json({ status: 400, data: { error: { message: 'bad request' } } }); }
  const path = String(input.path || '');
  if (!OK_PATH.test(path)) return json({ status: 400, data: { error: { message: 'path not allowed' } } });

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
