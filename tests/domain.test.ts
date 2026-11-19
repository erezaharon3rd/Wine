import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import { licensePrice, customerPrice, designProblems, nextStatus, preConsentApplies, DEAL_TRANSITIONS, type WineryPricing, type Design } from '../domain/index.js';

const root = new URL('..', import.meta.url).pathname;
const read = (p: string) => readFileSync(root + p, 'utf8');

/* מחולל מקרים קבוע, כדי שכל ריצה תבדוק את אותם מקרים */
function rng(seed: number) { return () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31); }
const pick = <T,>(r: () => number, a: readonly T[]) => a[Math.floor(r() * a.length)];

/* ── הפונקציות של הדפדפן, נטענות מתוך הקבצים עצמם ── */
function clientFns() {
  const html = read('Portal/index.html'), cj = read('Portal/customer.js');
  const grab = (src: string, start: string) => { const i = src.indexOf(start); let d = 0, j = src.indexOf('{', i); for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && !--d) break; } return src.slice(i, j + 1); };
  const line = (src: string, start: string) => src.slice(src.indexOf(start), src.indexOf('\n', src.indexOf(start)));
  const ctx: any = { S: { floor: 2500, comm: 15, artistShare: 50, wset: {} }, VAT: 18 };
  vm.createContext(ctx);
  vm.runInContext([line(html, 'const TYPES='), line(html, 'const QTY='), grab(html, 'function price(d)'), 'const W=()=>S.wset;', line(cj, 'const addonFor='), grab(cj, 'function cprice(d)'), 'this.price=price;this.cprice=cprice;'].join('\n'), ctx);
  return ctx;
}

test('מחיר רישיון: הדפדפן והקוד המשותף מסכימים', () => {
  const c = clientFns(), r = rng(7);
  for (let i = 0; i < 2000; i++) {
    const fl = 500 + Math.floor(r() * 300) * 50, lt = pick(r, ['one', 'series'] as const), q = pick(r, ['a', 'b', 'c'] as const), ex = r() < .5, adj = Math.round(r() * 30) - 15;
    assert.equal(c.price({ fl, lt, q, ex, adj }).total, licensePrice(fl, lt, q, ex, adj), JSON.stringify({ fl, lt, q, ex, adj }));
  }
  assert.equal(licensePrice(2500, 'one', 'b', true, 5), 6300);
});

const cases = (n: number) => {
  const r = rng(11), out: [WineryPricing, Design][] = [];
  for (let i = 0; i < n; i++) {
    const p: WineryPricing = { prices: { '1': 60 + Math.floor(r() * 200) }, artist: { a: Math.floor(r() * 40) }, foil: Math.floor(r() * 12), emboss: Math.floor(r() * 9), caseDisc: Math.floor(r() * 10), t1: 12 + Math.floor(r() * 30), d1: Math.floor(r() * 20), t2: 60 + Math.floor(r() * 100), d2: 10 + Math.floor(r() * 20), shape: { rect: 0, oval: Math.floor(r() * 5), arch: Math.floor(r() * 6) } };
    out.push([p, { wine: 1, artist: 'a', work: 1, shape: pick(r, ['rect', 'oval', 'arch'] as const), foil: r() < .5, emboss: r() < .5, qty: 1 + Math.floor(r() * 200) }]);
  }
  return out;
};

test('מחיר הזמנת לקוח: הדפדפן והקוד המשותף מסכימים', () => {
  const c = clientFns();
  for (const [p, d] of cases(2000)) {
    c.S.wset = { prices: {}, artist: {}, ...p };
    assert.equal(c.cprice(d).total, customerPrice(p, d).total, JSON.stringify({ p, d }));
  }
});

test('בדיקות קלט של עיצוב', () => {
  assert.deepEqual(designProblems({ wine: 1, artist: 'a', work: 1, qty: 6 }), []);
  assert.ok(designProblems({ wine: 1, artist: 'a', work: 1, qty: 0 }).length);
  assert.ok(designProblems({ wine: 1, artist: 'a', work: 1, qty: 1, ded: 'x'.repeat(41) }).length);
});

test('טבלת המעברים זהה לזו שבמסד', () => {
  const sql = read('supabase/setup.sql');
  const block = sql.slice(sql.indexOf('insert into deal_transitions values'), sql.indexOf('on conflict (from_status, action)'));
  const rows = [...block.matchAll(/\('(\w+)',\s*'(\w+)',\s*'(\w+)',\s*'\{([^}]*)\}'\)/g)].map(m => [m[1], m[2], m[3], m[4].split(',')]);
  assert.deepEqual(rows, DEAL_TRANSITIONS.map(t => [t[0], t[1], t[2], [...t[3]]]));
  assert.equal(nextStatus('sent', 'price', ['gallery:own']), 'priced');
  assert.equal(nextStatus('sent', 'price', ['winery:own']), null);
  assert.equal(nextStatus('active', 'sign', ['winery:own']), null);
  assert.ok(preConsentApplies({ type: 'one', qty: 'a', exclusive: false, adjPct: 0 }));
  assert.ok(!preConsentApplies({ type: 'one', qty: 'b', exclusive: false, adjPct: 0 }));
});

/* מול המסד עצמו, כשיש חיבור (ב-CI תמיד יש) */
const PG = process.env.PGURL;
test('מחירים: המסד והקוד המשותף מסכימים', { skip: !PG && 'אין PGURL' }, () => {
  const all = cases(300), lic: [number, 'one' | 'series', 'a' | 'b' | 'c', boolean, number][] = [];
  const r = rng(3);
  for (let i = 0; i < 300; i++) lic.push([500 + Math.floor(r() * 300) * 50, pick(r, ['one', 'series'] as const), pick(r, ['a', 'b', 'c'] as const), r() < .5, Math.round(r() * 30) - 15]);
  const q1 = all.map(([p, d], i) => `select ${i}, corder_price_of('${JSON.stringify(p)}'::jsonb, '${JSON.stringify(d)}'::jsonb)`).join(' union all ');
  const q2 = lic.map(([f, t, q, e, a], i) => `select ${i}, round(round(${f} * case '${t}' when 'series' then 2.2 else 1 end * case '${q}' when 'b' then 1.5 when 'c' then 2 else 1 end * case when ${e} then 1.6 else 1 end / 50) * 50 * (1 + ${a} / 100.0) / 50) * 50`).join(' union all ');
  const run = (sql: string) => execFileSync('psql', [PG!, '-At', '-F', ',', '-c', sql], { encoding: 'utf8' }).trim().split('\n').map(l => l.split(',').map(Number));
  for (const [i, v] of run(q1)) assert.equal(v, customerPrice(all[i][0], all[i][1]).total, JSON.stringify(all[i]));
  for (const [i, v] of run(q2)) assert.equal(v, licensePrice(...lic[i]), JSON.stringify(lic[i]));
});
