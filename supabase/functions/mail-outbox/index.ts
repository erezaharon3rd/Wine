// שולח את המיילים שמחכים בתור (mail_outbox) דרך Resend.
// בלי RESEND_API_KEY הפונקציה לא שולחת כלום ולא נוגעת בתור: מוכנה לרגע שמדביקים מפתח.
import { createClient } from "npm:@supabase/supabase-js@2";

const KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("MAIL_FROM") ?? "Grape Arts <hello@grapearts.com>";
const SITE = Deno.env.get("SITE_URL") ?? "https://grapearts.com";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const html = (body: string, link: string) => `<!doctype html><html lang="he" dir="rtl"><body style="margin:0;background:#EDEDEB;font-family:Arial,sans-serif;color:#1F1F1E">
<div style="max-width:520px;margin:0 auto;padding:28px 22px;background:#FAFAF8">
<div style="font-size:20px;margin-bottom:18px">Grape Arts</div>
<p style="font-size:16px;line-height:1.7;margin:0 0 22px">${esc(body).replace(/\n/g, "<br>")}</p>
<a href="${link}" style="display:inline-block;background:#1F1F1E;color:#FAFAF8;text-decoration:none;padding:12px 20px;border-radius:6px">לפרטים</a>
<p style="font-size:13px;color:#6B6B68;margin-top:28px">קיבלת את המייל הזה כי יש לך חשבון ב־Grape Arts. אמנות ישראלית על יין ישראלי.</p>
</div></body></html>`;

Deno.serve(async (req) => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  // רק המתזמן של המסד מכיר את הסוד (שמור בכספת של המסד)
  const ok = await db.rpc("mail_secret_ok", { t: req.headers.get("x-outbox-secret") ?? "" });
  if (ok.error || ok.data !== true) return new Response("forbidden", { status: 403 });
  if (!KEY) return Response.json({ skipped: "no RESEND_API_KEY" });
  const { data: rows, error } = await db.from("mail_outbox").select("*").is("sent_at", null).lt("tries", 5)
    .gt("created_at", new Date(Date.now() - 2 * 864e5).toISOString()) // לא שולחים הודעות ישנות מלפני חיבור הספק
    .order("id").limit(40);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  let sent = 0;
  for (const m of rows ?? []) {
    const link = SITE + (m.link || "/Portal/");
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [m.to_email], subject: m.subject, html: html(m.body, link), text: `${m.body}\n\n${link}` }),
    });
    if (r.ok) { sent++; await db.from("mail_outbox").update({ sent_at: new Date().toISOString(), error: null }).eq("id", m.id); }
    else await db.from("mail_outbox").update({ tries: m.tries + 1, error: (await r.text()).slice(0, 300) }).eq("id", m.id);
  }
  return Response.json({ sent, waiting: (rows ?? []).length - sent });
});
