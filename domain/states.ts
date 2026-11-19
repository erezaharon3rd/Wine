/**
 * מצבי עסקת רישוי והמעברים המותרים.
 * העותק כאן זהה לטבלת deal_transitions במסד. הבדיקות משוות ביניהם.
 */
export type DealStatus = 'sent' | 'priced' | 'sign' | 'pay' | 'active' | 'rejected' | 'cancelled';
export type DealAction = 'price' | 'approve' | 'change' | 'reject' | 'sign' | 'paid' | 'order' | 'cancel';
export type Who = 'admin' | 'gallery:own' | 'winery:own' | 'artist:own';

export const DEAL_TRANSITIONS: ReadonlyArray<readonly [DealStatus, DealAction, DealStatus, readonly Who[]]> = [
  ['sent', 'price', 'priced', ['gallery:own', 'admin']],
  ['priced', 'approve', 'sign', ['artist:own', 'admin']],
  ['priced', 'change', 'sent', ['artist:own', 'admin']],
  ['sent', 'reject', 'rejected', ['gallery:own', 'artist:own', 'admin']],
  ['priced', 'reject', 'rejected', ['gallery:own', 'artist:own', 'admin']],
  ['sign', 'sign', 'pay', ['winery:own']],
  ['pay', 'paid', 'active', ['gallery:own', 'admin']],
  ['active', 'order', 'active', ['winery:own', 'admin']],
  ['sent', 'cancel', 'cancelled', ['winery:own', 'admin']],
  ['priced', 'cancel', 'cancelled', ['winery:own', 'admin']],
  ['sign', 'cancel', 'cancelled', ['winery:own', 'admin']],
];

export function nextStatus(from: DealStatus, action: DealAction, who: Who[]): DealStatus | null {
  const t = DEAL_TRANSITIONS.find(([f, a]) => f === from && a === action);
  return t && t[3].some(r => who.includes(r)) ? t[2] : null;
}

/** הסכמה מראש של האמן: בקשה קטנה עוברת ישר לחתימה. */
export const preConsentApplies = (d: { type: string; qty: string; exclusive: boolean; adjPct: number }) =>
  d.type === 'one' && d.qty === 'a' && !d.exclusive && d.adjPct === 0;

export type OrderStatus = 'sent' | 'review' | 'approved' | 'print' | 'done' | 'cancel';
export const ORDER_FLOW: Record<string, [OrderStatus[], OrderStatus | null, 'winery' | 'customer' | 'both' | 'printer']> = {
  wsend: [['sent'], 'review', 'winery'],
  wok: [['sent'], 'approved', 'winery'],
  cok: [['review'], 'approved', 'customer'],
  cchange: [['review'], 'sent', 'customer'],
  wprint: [['approved'], 'print', 'winery'],
  done: [['print'], 'done', 'printer'],
  cancel: [['sent', 'review'], 'cancel', 'both'],
};
