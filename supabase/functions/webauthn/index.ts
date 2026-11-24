// אישור בטביעת אצבע לחתימת האמן. האימות עצמו ב-core.js; כאן רק הגישה למסד.
// מזהים את המשתמש לפי ה-JWT שלו, והחתימה עצמה נרשמת דרך sign_artist_agreement בשמו.
import { createClient } from "npm:@supabase/supabase-js@2";
import { handle } from "./core.js";

const SITES: Record<string, string> = {
  "https://grapearts.com": "grapearts.com",
  "https://wine-art.netlify.app": "wine-art.netlify.app",
};
const cors = (origin: string) => ({
  "Access-Control-Allow-Origin": SITES[origin] ? origin : "https://grapearts.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const H = cors(origin);
  if (req.method === "OPTIONS") return new Response("ok", { headers: H });
  const out = (o: unknown, s = 200) => Response.json(o, { status: s, headers: H });
  const rpId = SITES[origin];
  if (!rpId) return out({ error: "האישור עובד רק מהאתר של Grape Arts" }, 403);
  const auth = req.headers.get("authorization") ?? "";
  const URL_ = Deno.env.get("SUPABASE_URL")!;
  const asUser = createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const admin = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: u } = await admin.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
  const uid = u?.user?.id;
  if (!uid) return out({ error: "צריך להתחבר מחדש" }, 401);
  let p: Record<string, unknown>;
  try { p = await req.json(); } catch { return out({ error: "בקשה לא תקינה" }, 400); }
  const { data: prof } = await admin.from("profiles").select("full_name").eq("id", uid).maybeSingle();

  const ctx = {
    uid, rpId, origins: [origin], email: u.user!.email, name: prof?.full_name,
    async creds() {
      const { data, error } = await admin.from("webauthn_credentials").select("id,alg,public_key,counter,transports").eq("user_id", uid).eq("rp_id", rpId);
      if (error) throw error;
      return (data ?? []).map((c) => ({ id: c.id, alg: c.alg, jwk: c.public_key, counter: Number(c.counter), transports: c.transports }));
    },
    async putChallenge(c: { purpose: string; challenge: string; bind: string | null }) {
      const { error } = await admin.from("webauthn_challenges").insert({ user_id: uid, rp_id: rpId, ...c });
      if (error) throw error;
    },
    async takeChallenge(purpose: string, ttl: number) { // האתגר האחרון, פעם אחת בלבד
      const since = new Date(Date.now() - ttl).toISOString();
      const { data } = await admin.from("webauthn_challenges").select("id,challenge,bind").eq("user_id", uid).eq("rp_id", rpId)
        .eq("purpose", purpose).is("used_at", null).gt("created_at", since).order("id", { ascending: false }).limit(1).maybeSingle();
      if (!data) return null;
      const { data: upd } = await admin.from("webauthn_challenges").update({ used_at: new Date().toISOString() }).eq("id", data.id).is("used_at", null).select("id");
      return upd && upd.length ? data : null;
    },
    async saveCred(c: { id: string; alg: number; jwk: unknown; counter: number; transports: string[] }) {
      const { error } = await admin.from("webauthn_credentials").insert({ id: c.id, user_id: uid, rp_id: rpId, alg: c.alg, public_key: c.jwk, counter: c.counter, transports: c.transports });
      if (error) throw error;
    },
    async touchCred(id: string, counter: number) {
      await admin.from("webauthn_credentials").update({ counter, last_used_at: new Date().toISOString() }).eq("id", id).eq("user_id", uid);
    },
    async sign(s: { version: string; body: string; name: string; sig: string; ua: string }) {
      const { data, error } = await asUser.rpc("sign_artist_agreement", { p_version: s.version, p_body: s.body, p_name: s.name, p_sig: s.sig, p_ua: String(s.ua ?? "").slice(0, 300) });
      if (error) throw new Error(error.message);
      return data as { id: number; hash: string; at: string };
    },
    async saveProof(id: number, proof: unknown) {
      const { error } = await admin.from("artist_signatures").update({ webauthn_cred: (proof as { cred: string }).cred, webauthn_proof: proof, webauthn_at: new Date().toISOString() }).eq("id", id).eq("user_id", uid);
      if (error) throw error;
    },
  };
  try { return out(await handle(p, ctx)); }
  catch (e) { return out({ error: (e as Error).message || "האישור לא הצליח" }); }
});
