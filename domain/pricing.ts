/**
 * תמחור · מקור האמת המשותף.
 * אותן נוסחאות קיימות ב-SQL (deal_price, corder_price) ובדפדפן (price, cprice).
 * הבדיקות ב-tests/ מוודאות שכל השלוש מחזירות אותו מספר.
 */

export type LicenseType = 'one' | 'series';
export type QtyTier = 'a' | 'b' | 'c';

export const LICENSE = {
  typeMul: { one: 1, series: 2.2 } as Record<LicenseType, number>,
  qtyMul: { a: 1, b: 1.5, c: 2 } as Record<QtyTier, number>,
  exclusiveMul: 1.6,
  adjMax: 15,
  vatPct: 18,
} as const;

const to50 = (n: number) => Math.round(n / 50) * 50;

/** מחיר רישיון לפני מע״מ: רצפה × סוג × כמות × בלעדיות, מעוגל ל-50, ואז התאמת הגלריה ±15%. */
export function licensePrice(floor: number, type: LicenseType, qty: QtyTier, exclusive: boolean, adjPct = 0): number {
  const base = to50(floor * LICENSE.typeMul[type] * LICENSE.qtyMul[qty] * (exclusive ? LICENSE.exclusiveMul : 1));
  const adj = Math.max(-LICENSE.adjMax, Math.min(LICENSE.adjMax, adjPct));
  return to50(base * (1 + adj / 100));
}

/** חלוקת הכסף: עמלת פלטפורמה, ומה שנשאר מתחלק חצי לאמן וחצי לגלריה. */
export function licenseSplit(net: number, commPct: number, artistShare = 50) {
  const platform = Math.round(net * commPct / 100);
  const artist = Math.round((net - platform) * artistShare / 100);
  return { platform, artist, gallery: net - platform - artist, vat: Math.round(net * LICENSE.vatPct) / 100, gross: Math.round(net * (100 + LICENSE.vatPct)) / 100 };
}

export interface WineryPricing {
  prices?: Record<string, number>;
  artist?: Record<string, number>;
  shape?: Partial<Record<Shape, number>>;
  foil?: number; emboss?: number;
  caseDisc?: number; t1?: number; d1?: number; t2?: number; d2?: number;
}
export type Shape = 'rect' | 'oval' | 'arch';
export interface Design { wine: number | string; artist: string; work: number; shape?: Shape; foil?: boolean; emboss?: boolean; qty: number; name?: string; ded?: string; pos?: number; zoom?: number }

export const PRICING_DEFAULTS: Required<Omit<WineryPricing, 'prices' | 'artist'>> = {
  shape: { rect: 0, oval: 2, arch: 3 }, foil: 6, emboss: 4, caseDisc: 5, t1: 24, d1: 10, t2: 60, d2: 15,
};

/** מחיר הזמנת לקוח, כולל מע״מ, כפי שהיקב קבע. */
export function customerPrice(p: WineryPricing, d: Design) {
  const w = { ...PRICING_DEFAULTS, ...p, shape: { ...PRICING_DEFAULTS.shape, ...(p.shape || {}) } };
  const base = p.prices?.[String(d.wine)] ?? 100;
  const art = p.artist?.[d.artist] ?? 0;
  const shp = w.shape[d.shape || 'rect'] ?? 0;
  const unit = base + art + shp + (d.foil ? w.foil : 0) + (d.emboss ? w.emboss : 0);
  const q = Math.max(1, Math.floor(d.qty || 1));
  const disc = q >= w.t2 ? w.d2 : q >= w.t1 ? w.d1 : q >= 6 ? w.caseDisc : 0;
  const unitNet = Math.round(unit * (1 - disc / 100));
  return { unit, disc, unitNet, q, total: unitNet * q };
}

/** בדיקות קלט שהשרת אוכף (corder_check). מחזיר רשימת בעיות, ריקה אם הכל תקין. */
export function designProblems(d: Design): string[] {
  const out: string[] = [];
  if (!(d.qty >= 1 && d.qty <= 10000)) out.push('כמות לא תקינה');
  if ((d.name || '').length > 24) out.push('השם על התווית ארוך מדי');
  if ((d.ded || '').length > 40) out.push('ההקדשה ארוכה מדי');
  if (d.shape && !['rect', 'oval', 'arch'].includes(d.shape)) out.push('צורת תווית לא מוכרת');
  if ((d.pos ?? 50) < 0 || (d.pos ?? 50) > 100 || (d.zoom ?? 100) < 100 || (d.zoom ?? 100) > 200) out.push('מיקום לא תקין');
  return out;
}
