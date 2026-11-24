// אימות טביעת אצבע (WebAuthn / passkey) בלי ספריות חיצוניות: WebCrypto בלבד.
// רץ גם ב-Deno (פונקציית הענן) וגם ב-Node (בבדיקות). הטביעה עצמה לא יוצאת מהטלפון:
// הטלפון חותם בכתב סתרים על "האתגר", והשרת בודק את החתימה מול המפתח הציבורי שנשמר בחיבור הראשון.

const enc = new TextEncoder();
const C = globalThis.crypto;

export const b64u = (buf) => {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = ""; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
export const unb64u = (s) => {
  s = String(s || "").replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "=";
  const t = atob(s); const b = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) b[i] = t.charCodeAt(i); return b;
};
export const sha256 = async (data) => new Uint8Array(await C.subtle.digest("SHA-256", typeof data === "string" ? enc.encode(data) : data));
export const hex = (b) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
export const sha256hex = async (s) => hex(await sha256(s));
export const rand = (n = 32) => C.getRandomValues(new Uint8Array(n));
const eq = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]; return d === 0; };
const cat = (...a) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let p = 0; for (const x of a) { o.set(x, p); p += x.length; } return o; };

// ── CBOR מינימלי: מספיק לנתוני WebAuthn ──
export function cbor(buf, pos = 0) {
  const b = buf, dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  function len(ai) {
    if (ai < 24) return ai;
    if (ai === 24) return b[pos++];
    if (ai === 25) { const v = dv.getUint16(pos); pos += 2; return v; }
    if (ai === 26) { const v = dv.getUint32(pos); pos += 4; return v; }
    if (ai === 27) { const v = Number(dv.getBigUint64(pos)); pos += 8; return v; }
    throw new Error("cbor: אורך לא נתמך");
  }
  function item() {
    const ib = b[pos++], mt = ib >> 5, ai = ib & 31;
    switch (mt) {
      case 0: return len(ai);
      case 1: return -1 - len(ai);
      case 2: { const n = len(ai); const v = b.slice(pos, pos + n); pos += n; return v; }
      case 3: { const n = len(ai); const v = new TextDecoder().decode(b.slice(pos, pos + n)); pos += n; return v; }
      case 4: { const n = len(ai); const a = []; for (let i = 0; i < n; i++) a.push(item()); return a; }
      case 5: { const n = len(ai); const m = new Map(); for (let i = 0; i < n; i++) { const k = item(); m.set(k, item()); } return m; }
      case 6: len(ai); return item();
      case 7: if (ai === 20) return false; if (ai === 21) return true; if (ai === 22 || ai === 23) return null; throw new Error("cbor: ערך לא נתמך");
    }
    throw new Error("cbor: סוג לא נתמך");
  }
  const value = item();
  return { value, end: pos };
}

function authData(ad) {
  if (ad.length < 37) throw new Error("נתוני האימות קצרים מדי");
  const flags = ad[32];
  const out = { rpIdHash: ad.slice(0, 32), up: !!(flags & 1), uv: !!(flags & 4), at: !!(flags & 64),
    count: new DataView(ad.buffer, ad.byteOffset + 33, 4).getUint32(0) };
  if (out.at) {
    const n = (ad[53] << 8) | ad[54];
    out.credId = ad.slice(55, 55 + n);
    out.cose = cbor(ad, 55 + n).value;
  }
  return out;
}

function coseToJwk(m) {
  const kty = m.get(1), alg = m.get(3);
  if (kty === 2 && alg === -7 && m.get(-1) === 1) return { alg, jwk: { kty: "EC", crv: "P-256", x: b64u(m.get(-2)), y: b64u(m.get(-3)), ext: true } };
  if (kty === 3 && alg === -257) return { alg, jwk: { kty: "RSA", n: b64u(m.get(-1)), e: b64u(m.get(-2)), alg: "RS256", ext: true } };
  throw new Error("סוג המפתח של המכשיר לא נתמך");
}

function derToRaw(sig) { // ECDSA: DER -> r||s באורך 64
  if (sig[0] !== 0x30) throw new Error("חתימה לא תקינה");
  let p = 2; if (sig[1] & 0x80) p = 2 + (sig[1] & 0x7f);
  const part = () => { if (sig[p++] !== 2) throw new Error("חתימה לא תקינה"); const n = sig[p++]; let v = sig.slice(p, p + n); p += n; while (v.length > 32 && v[0] === 0) v = v.slice(1); if (v.length > 32) throw new Error("חתימה לא תקינה"); const o = new Uint8Array(32); o.set(v, 32 - v.length); return o; };
  return cat(part(), part());
}

function clientData(json, type, challenge, origins) {
  const raw = unb64u(json); const cd = JSON.parse(new TextDecoder().decode(raw));
  if (cd.type !== type) throw new Error("סוג הבקשה לא תואם");
  if (cd.challenge !== challenge) throw new Error("האתגר לא תואם. נסו שוב");
  if (!origins.includes(cd.origin)) throw new Error("האישור הגיע מאתר אחר");
  if (cd.crossOrigin) throw new Error("האישור הגיע ממסגרת זרה");
  return { raw, cd };
}

// חיבור ראשון של המכשיר: שומרים את המפתח הציבורי שלו
export async function verifyRegistration(cred, { challenge, origins, rpId }) {
  const { cd } = clientData(cred?.response?.clientDataJSON, "webauthn.create", challenge, origins);
  const att = cbor(unb64u(cred.response.attestationObject)).value;
  const ad = authData(att.get("authData"));
  if (!eq(ad.rpIdHash, await sha256(rpId))) throw new Error("האתר לא תואם למכשיר");
  if (!ad.up || !ad.uv) throw new Error("צריך אישור בטביעת אצבע או בזיהוי פנים");
  if (!ad.at || !ad.credId) throw new Error("המכשיר לא החזיר מפתח");
  if (b64u(ad.credId) !== cred.rawId && b64u(ad.credId) !== cred.id) throw new Error("מזהה המכשיר לא תואם");
  const { alg, jwk } = coseToJwk(ad.cose);
  await importKey(alg, jwk); // נכשל כאן אם המפתח פגום
  return { id: b64u(ad.credId), alg, jwk, counter: ad.count, origin: cd.origin };
}

async function importKey(alg, jwk) {
  return alg === -7
    ? C.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"])
    : C.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
}

// אישור בטביעת אצבע: המכשיר חתם על האתגר, והאתגר נגזר מהמסמך, מהחתימה ומהשם
export async function verifyAssertion(cred, { challenge, origins, rpId, key }) {
  const { raw } = clientData(cred?.response?.clientDataJSON, "webauthn.get", challenge, origins);
  const adb = unb64u(cred.response.authenticatorData);
  const ad = authData(adb);
  if (!eq(ad.rpIdHash, await sha256(rpId))) throw new Error("האתר לא תואם למכשיר");
  if (!ad.up || !ad.uv) throw new Error("צריך אישור בטביעת אצבע או בזיהוי פנים");
  if ((cred.rawId || cred.id) !== key.id) throw new Error("המכשיר לא תואם");
  const data = cat(adb, await sha256(raw));
  let sig = unb64u(cred.response.signature);
  const k = await importKey(key.alg, key.jwk);
  let ok;
  if (key.alg === -7) ok = await C.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, k, derToRaw(sig), data);
  else ok = await C.subtle.verify({ name: "RSASSA-PKCS1-v1_5" }, k, sig, data);
  if (!ok) throw new Error("האישור לא עבר בדיקה");
  if (key.counter > 0 && ad.count > 0 && ad.count <= key.counter) throw new Error("נראה שהמכשיר הועתק. האישור נחסם");
  return { counter: ad.count };
}

// הקשר בין האישור למסמך: מה שהאמן ראה, מה שצייר ואיך קרא לעצמו
export async function bindOf(body, sig, name) {
  return sha256hex((await sha256hex(body)) + "|" + sig + "|" + String(name || "").trim());
}
export async function challengeFor(bind) { // אקראי + המסמך, כדי שאישור אחד לא ישמש פעמיים ולא למסמך אחר
  const n = rand(16);
  return b64u(cat(n, await sha256(n.length + ":" + bind)));
}
export async function challengeMatches(challenge, bind) {
  const b = unb64u(challenge); if (b.length !== 48) return false;
  const n = b.slice(0, 16);
  return eq(b.slice(16), await sha256(n.length + ":" + bind));
}

// ── הלוגיקה של הפונקציה, בלי תלות במסד: ctx מספק גישה לנתונים ──
const TTL = 5 * 60 * 1000;
export async function handle(p, ctx) {
  const rpId = ctx.rpId, origins = ctx.origins;
  if (!ctx.uid) throw new Error("צריך להתחבר");
  if (p.a === "status") {
    const creds = await ctx.creds();
    return { has: creds.length > 0 };
  }
  if (p.a === "reg-options") {
    const challenge = b64u(rand(32));
    await ctx.putChallenge({ purpose: "reg", challenge, bind: null });
    const creds = await ctx.creds();
    return {
      challenge, rp: { name: "Grape Arts", id: rpId },
      user: { id: b64u(enc.encode(ctx.uid)), name: ctx.email || "artist", displayName: ctx.name || ctx.email || "Grape Arts" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" },
      excludeCredentials: creds.map((c) => ({ type: "public-key", id: c.id })),
      timeout: 90000, attestation: "none",
    };
  }
  if (p.a === "reg") {
    const ch = await ctx.takeChallenge("reg", TTL);
    if (!ch) throw new Error("פג הזמן. נסו שוב");
    const r = await verifyRegistration(p.cred, { challenge: ch.challenge, origins, rpId });
    await ctx.saveCred({ id: r.id, alg: r.alg, jwk: r.jwk, counter: r.counter, transports: Array.isArray(p.cred.transports) ? p.cred.transports.slice(0, 6).map(String) : [] });
    return { ok: true };
  }
  if (p.a === "sign-options") {
    const creds = await ctx.creds();
    if (!creds.length) throw new Error("עוד לא חיברת את המכשיר");
    const bind = await bindOf(String(p.body || ""), String(p.sig || ""), p.name);
    const challenge = await challengeFor(bind);
    await ctx.putChallenge({ purpose: "sign", challenge, bind });
    return { challenge, rpId, allowCredentials: creds.map((c) => ({ type: "public-key", id: c.id, transports: c.transports || [] })), userVerification: "required", timeout: 90000 };
  }
  if (p.a === "sign") {
    const ch = await ctx.takeChallenge("sign", TTL);
    if (!ch) throw new Error("פג הזמן. נסו שוב");
    const bind = await bindOf(String(p.body || ""), String(p.sig || ""), p.name);
    if (bind !== ch.bind || !(await challengeMatches(ch.challenge, bind))) throw new Error("המסמך שאושר לא תואם למה שנשלח");
    const id = p.cred && (p.cred.rawId || p.cred.id);
    const key = (await ctx.creds()).find((c) => c.id === id);
    if (!key) throw new Error("המכשיר הזה לא מחובר לחשבון");
    const r = await verifyAssertion(p.cred, { challenge: ch.challenge, origins, rpId, key });
    await ctx.touchCred(key.id, r.counter);
    const signed = await ctx.sign({ version: p.version, body: p.body, name: p.name, sig: p.sig, ua: p.ua });
    await ctx.saveProof(signed.id, {
      cred: key.id, rp: rpId, challenge: ch.challenge, bind,
      clientDataJSON: p.cred.response.clientDataJSON, authenticatorData: p.cred.response.authenticatorData,
      signature: p.cred.response.signature, alg: key.alg, jwk: key.jwk,
    });
    return { ...signed, webauthn: true };
  }
  throw new Error("פעולה לא מוכרת");
}
