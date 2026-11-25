// מעבר בין חשבונות בדיקה, לדף הבדיקות של מנהל המערכת.
// רק מנהל פעיל (לא חשבון בדיקה) יכול לקרוא לפונקציה, ורק לחשבונות ב־@test.local שמסומנים is_test.
// הפונקציה לא שולחת מייל: היא מחזירה אסימון חד־פעמי שהדפדפן מממש מיד.
import { createClient } from "npm:@supabase/supabase-js@2";

const SITES = ["https://grapearts.com", "https://wine-art.netlify.app"];
const cors = (o: string) => ({
  "Access-Control-Allow-Origin": SITES.includes(o) ? o : SITES[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});

// חשבון בדיקה אחד לכל תפקיד, והארגון שלו (נוצר אם חסר)
const ORGS: Record<string, { name: string; kind: string }> = {
  winery: { name: "יקב 1", kind: "winery" },
  gallery: { name: "גלריה לבדיקה", kind: "gallery" },
  printer: { name: "דפוס1", kind: "printer" },
};
const ACC = [
  { k: "winery", role: "winery", name: "יינן לבדיקה", org: "winery" },
  { k: "gallery", role: "gallery", name: "גלריסטית לבדיקה", org: "gallery" },
  { k: "artist", role: "artist", name: "אמנית לבדיקה", org: "gallery" },
  { k: "curator", role: "curator", name: "אוצר לבדיקה", org: "" },
  { k: "printer", role: "printer", name: "דפוס לבדיקה", org: "printer" },
  { k: "customer", role: "customer", name: "לקוח יקב לבדיקה", org: "winery" },
  { k: "buyer", role: "", name: "קונה לבדיקה", org: "" },
].map((a) => ({ ...a, email: `${a.k}@test.local` }));

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const H = cors(origin);
  if (req.method === "OPTIONS") return new Response("ok", { headers: H });
  const out = (o: unknown, s = 200) => Response.json(o, { status: s, headers: H });
  if (!SITES.includes(origin)) return out({ error: "רק מהאתר של Grape Arts" }, 403);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const tok = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u } = await admin.auth.getUser(tok);
  if (!u?.user) return out({ error: "צריך להיכנס כמנהל המערכת" }, 401);
  const { data: me } = await admin.from("profiles").select("role,status,is_test").eq("id", u.user.id).maybeSingle();
  if (!me || me.role !== "admin" || me.status !== "active" || me.is_test) return out({ error: "רק מנהל המערכת" }, 403);

  let p: { a?: string; k?: string };
  try { p = await req.json(); } catch { return out({ error: "בקשה לא תקינה" }, 400); }

  try {
    if (p.a === "list") {
      // יוצרים מה שחסר: ארגונים וחשבונות
      const orgId: Record<string, string> = {};
      for (const [key, o] of Object.entries(ORGS)) {
        const { data: f } = await admin.from("organizations").select("id").eq("name", o.name).eq("kind", o.kind).limit(1).maybeSingle();
        if (f) orgId[key] = f.id;
        else {
          const { data: c, error } = await admin.from("organizations").insert({ name: o.name, kind: o.kind }).select("id").single();
          if (error) throw error;
          orgId[key] = c.id;
        }
      }
      const res = [];
      for (const a of ACC) {
        let { data: pr } = await admin.from("profiles").select("id,role,is_test,full_name").eq("email", a.email).maybeSingle();
        if (!pr) {
          const { data: cu, error } = await admin.auth.admin.createUser({ email: a.email, email_confirm: true, user_metadata: { test: true } });
          if (error && !/already/i.test(error.message)) throw error;
          const id = cu?.user?.id;
          if (id) pr = { id, role: null, is_test: false, full_name: null };
          else ({ data: pr } = await admin.from("profiles").select("id,role,is_test,full_name").eq("email", a.email).maybeSingle());
        }
        if (!pr) throw new Error("לא הצלחנו ליצור את " + a.email);
        if (!pr.is_test || (pr.role ?? "") !== a.role) {
          const { error } = await admin.rpc("test_mark", { p_user: pr.id, p_role: a.role, p_org: a.org ? orgId[a.org] : null, p_name: a.name });
          if (error) throw error;
        }
        const org = a.org ? ORGS[a.org].name : "";
        res.push({ k: a.k, name: a.name, email: a.email, org });
      }
      return out({ accounts: res });
    }
    if (p.a === "go") {
      const a = ACC.find((x) => x.k === p.k);
      if (!a) return out({ error: "תפקיד לא מוכר" }, 400);
      const { data: pr } = await admin.from("profiles").select("id,is_test").eq("email", a.email).maybeSingle();
      if (!pr?.is_test) return out({ error: "חשבון הבדיקה עוד לא קיים. מרעננים את הדף" }, 409);
      const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: a.email });
      if (error) throw error;
      await admin.from("audit_log").insert({ actor: u.user.id, action: "test_switch", entity: "profile", entity_id: pr.id, data: { to: a.k } }).then(() => {}, () => {});
      return out({ token_hash: data.properties.hashed_token, dest: a.k === "buyer" ? "shop.html" : "./" });
    }
    return out({ error: "פעולה לא מוכרת" }, 400);
  } catch (e) {
    return out({ error: (e as Error).message || "שגיאה" }, 500);
  }
});
