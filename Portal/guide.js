/* Grape Arts · הדרכה לכל תפקיד
   נפתחת לבד בכניסה הראשונה של כל תפקיד, אפשר לדלג או לסגור, ותמיד אפשר לפתוח שוב (כפתור "?" / "הדרכה").
   מוצג: דמויות, חצים שמעבירים משהו מתפקיד לתפקיד, וצילומי מסך אמיתיים עם סימון. מעט מילים. */
(function(){
'use strict';
const VER='v1';
const C={grape:'#7B4BC4',berry:'#E0457B',gold:'#F5B83D',leaf:'#2FB67C',sky:'#3B8BEB',orange:'#F27B35',teal:'#19A7A8',ink:'#1F1B2D',cream:'#FFF8EE'};
const SKIN=['#F6C9A4','#E8B48C','#C98E62','#8D5A3B'];

/* ───────── דמויות ───────── */
function face(cx,cy,r,skin){return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${skin}"/><circle cx="${cx-r*.36}" cy="${cy-r*.05}" r="${r*.1}" fill="${C.ink}"/><circle cx="${cx+r*.36}" cy="${cy-r*.05}" r="${r*.1}" fill="${C.ink}"/><path d="M${cx-r*.32} ${cy+r*.32} Q${cx} ${cy+r*.62} ${cx+r*.32} ${cy+r*.32}" stroke="${C.ink}" stroke-width="${r*.09}" fill="none" stroke-linecap="round"/><circle cx="${cx-r*.6}" cy="${cy+r*.28}" r="${r*.13}" fill="${C.berry}" opacity=".35"/><circle cx="${cx+r*.6}" cy="${cy+r*.28}" r="${r*.13}" fill="${C.berry}" opacity=".35"/>`}
function body(col){return `<path d="M22 118 Q22 76 60 76 Q98 76 98 118 Z" fill="${col}"/>`}
const CH={
  buyer:{n:'הקונה',c:C.berry,svg:()=>body(C.berry)+face(60,48,24,SKIN[0])+`<path d="M38 30 Q60 6 82 30 Q78 20 60 20 Q42 20 38 30Z" fill="#5A3A2A"/><rect x="66" y="86" width="30" height="26" rx="4" fill="${C.gold}"/><rect x="79" y="86" width="5" height="26" fill="${C.berry}"/><path d="M81 86 q-10 -12 -4 -14 q6 0 4 14 q2 -14 8 -14 q6 2 -8 14" fill="${C.berry}"/>`},
  customer:{n:'לקוח של יקב',c:C.sky,svg:()=>body(C.sky)+face(60,48,24,SKIN[1])+`<path d="M37 40 Q38 18 60 18 Q83 18 83 40 Q78 28 60 28 Q42 28 37 40Z" fill="#2C2C3A"/><path d="M84 82 h14 l-3 14 q-4 6 -8 0 z" fill="#fff" stroke="${C.ink}" stroke-width="1.5"/><path d="M86 88 h10 l-1 6 q-4 4 -8 0z" fill="${C.berry}"/><rect x="90" y="96" width="2" height="12" fill="${C.ink}"/>`},
  winery:{n:'יקב',c:C.leaf,svg:()=>body(C.leaf)+face(60,50,24,SKIN[2])+`<ellipse cx="60" cy="30" rx="34" ry="7" fill="${C.gold}"/><path d="M42 30 Q44 12 60 12 Q76 12 78 30Z" fill="${C.gold}"/><rect x="44" y="24" width="32" height="5" fill="${C.orange}"/><g fill="${C.grape}"><circle cx="90" cy="92" r="5"/><circle cx="98" cy="92" r="5"/><circle cx="94" cy="100" r="5"/><circle cx="86" cy="100" r="5"/><circle cx="90" cy="108" r="5"/></g><path d="M94 86 q4 -8 10 -6" stroke="${C.leaf}" stroke-width="3" fill="none"/>`},
  artist:{n:'אמן',c:C.orange,svg:()=>body(C.orange)+face(60,50,24,SKIN[0])+`<ellipse cx="54" cy="28" rx="26" ry="9" fill="${C.berry}" transform="rotate(-12 54 28)"/><circle cx="70" cy="20" r="3" fill="${C.berry}"/><rect x="88" y="70" width="5" height="38" rx="2" fill="#8B5E3C" transform="rotate(25 90 90)"/><path d="M96 66 q6 -2 6 6 q-6 4 -8 -2z" fill="${C.sky}"/>`},
  gallery:{n:'גלריה',c:C.grape,svg:()=>body(C.grape)+face(60,50,24,SKIN[1])+`<path d="M36 44 Q34 20 60 18 Q86 20 84 44 Q84 30 72 26 Q60 34 40 32Z" fill="#2E2340"/><g fill="none" stroke="${C.ink}" stroke-width="2.4"><circle cx="51" cy="49" r="7"/><circle cx="69" cy="49" r="7"/><path d="M58 49 h4"/></g><rect x="74" y="80" width="28" height="30" rx="2" fill="${C.gold}"/><rect x="79" y="85" width="18" height="20" fill="${C.teal}"/><path d="M79 101 l6 -8 l5 5 l4 -4 l3 7z" fill="${C.leaf}"/>`},
  curator:{n:'אוצר',c:C.teal,svg:()=>body(C.teal)+face(60,50,24,SKIN[3])+`<path d="M38 38 Q40 20 60 20 Q80 20 82 38 Q74 30 60 30 Q46 30 38 38Z" fill="#1E1E1E"/><circle cx="92" cy="90" r="11" fill="#fff" fill-opacity=".6" stroke="${C.ink}" stroke-width="3"/><path d="M84 98 l-10 12" stroke="${C.ink}" stroke-width="5" stroke-linecap="round"/>`},
  printer:{n:'בית דפוס',c:C.sky,svg:()=>body('#4A5BD0')+face(60,50,24,SKIN[2])+`<path d="M36 34 Q38 16 60 16 Q82 16 84 34Z" fill="${C.sky}"/><rect x="52" y="30" width="40" height="6" rx="3" fill="${C.sky}"/><rect x="36" y="84" width="48" height="34" rx="6" fill="#fff" opacity=".9"/><rect x="74" y="88" width="26" height="10" rx="5" fill="${C.orange}"/><rect x="86" y="98" width="3" height="12" fill="${C.ink}"/>`},
  admin:{n:'מנהל המערכת',c:C.ink,svg:()=>body('#3B3355')+face(60,50,24,SKIN[1])+`<path d="M36 40 Q36 18 60 18 Q84 18 84 40" fill="none" stroke="${C.ink}" stroke-width="5"/><rect x="31" y="40" width="9" height="16" rx="4" fill="${C.gold}"/><rect x="80" y="40" width="9" height="16" rx="4" fill="${C.gold}"/><path d="M84 56 q-4 12 -16 12" stroke="${C.ink}" stroke-width="2.5" fill="none"/><g transform="translate(90 96)"><circle r="9" fill="${C.gold}"/><circle r="3.5" fill="#3B3355"/></g>`},
  ga:{n:'Grape Arts',c:C.grape,svg:()=>`<g>${[[60,40],[46,52],[74,52],[60,64],[46,76],[74,76],[60,88],[60,104]].map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="14" fill="${i%2?C.grape:'#9468D9'}"/>`).join('')}<path d="M60 26 q2 -14 14 -16" stroke="${C.leaf}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M66 18 q14 -8 20 4 q-12 6 -20 -4z" fill="${C.leaf}"/><circle cx="54" cy="60" r="2.6" fill="#fff"/><circle cx="66" cy="60" r="2.6" fill="#fff"/><path d="M53 69 q7 6 14 0" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>`}
};
function who(k,cls=''){const c=CH[k];return `<figure class="gd-ch ${cls}"><svg viewBox="0 0 120 120" aria-hidden="true">${c.svg()}</svg><figcaption>${c.n}</figcaption></figure>`}

/* ───────── פריטים שעוברים בין דמויות ───────── */
const IT={
  bottle:`<svg viewBox="0 0 40 40"><rect x="16" y="2" width="8" height="8" rx="1" fill="${C.berry}"/><path d="M15 10h10v6q6 4 6 10v12H9V26q0-6 6-10z" fill="#25402F"/><rect x="11" y="24" width="18" height="10" fill="${C.cream}"/><rect x="14" y="26" width="12" height="6" fill="${C.orange}"/></svg>`,
  painting:`<svg viewBox="0 0 40 40"><rect x="3" y="6" width="34" height="28" rx="2" fill="${C.gold}"/><rect x="7" y="10" width="26" height="20" fill="${C.sky}"/><path d="M7 28l8-9 6 6 5-5 7 8z" fill="${C.leaf}"/><circle cx="26" cy="15" r="3" fill="${C.gold}"/></svg>`,
  coin:`<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="${C.gold}" stroke="#C98F1C" stroke-width="3"/><text x="20" y="27" text-anchor="middle" font-size="18" font-weight="700" fill="#8A5A00" font-family="Arial">₪</text></svg>`,
  cert:`<svg viewBox="0 0 40 40"><rect x="5" y="4" width="30" height="32" rx="3" fill="#fff" stroke="${C.ink}" stroke-width="2"/><path d="M11 12h18M11 17h14M11 22h16" stroke="#B9B2C9" stroke-width="2.4" stroke-linecap="round"/><circle cx="27" cy="29" r="6" fill="${C.berry}"/><path d="M24 34l-2 5 5-2 5 2-2-5" fill="${C.berry}"/></svg>`,
  link:`<svg viewBox="0 0 40 40"><rect x="4" y="9" width="32" height="22" rx="3" fill="#fff" stroke="${C.ink}" stroke-width="2"/><path d="M4 11l16 11 16-11" stroke="${C.ink}" stroke-width="2" fill="none"/><circle cx="32" cy="10" r="6" fill="${C.leaf}"/><path d="M29 10l2 2 4-4" stroke="#fff" stroke-width="2" fill="none"/></svg>`,
  box:`<svg viewBox="0 0 40 40"><rect x="6" y="14" width="28" height="22" rx="2" fill="${C.orange}"/><rect x="4" y="9" width="32" height="8" rx="2" fill="${C.gold}"/><rect x="18" y="9" width="5" height="27" fill="${C.berry}"/></svg>`,
  check:`<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="${C.leaf}"/><path d="M12 20l6 6 11-12" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  star:`<svg viewBox="0 0 40 40"><path d="M20 3l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z" fill="${C.gold}" stroke="#C98F1C" stroke-width="1.5"/></svg>`,
  file:`<svg viewBox="0 0 40 40"><path d="M9 3h16l7 7v27H9z" fill="#fff" stroke="${C.ink}" stroke-width="2"/><path d="M25 3v7h7" fill="none" stroke="${C.ink}" stroke-width="2"/><text x="20" y="29" text-anchor="middle" font-size="9" font-weight="700" fill="${C.berry}" font-family="Arial">PDF</text></svg>`,
  key:`<svg viewBox="0 0 40 40"><circle cx="14" cy="20" r="8" fill="none" stroke="${C.gold}" stroke-width="5"/><path d="M21 20h15M30 20v6M35 20v5" stroke="${C.gold}" stroke-width="5" stroke-linecap="round"/></svg>`
};

/* ───────── תוכן: מעט מילים, הרבה תמונה ───────── */
const S_=(img,t,d,box,c)=>({k:'shot',img,t,d,box,c});
const F_=(a,b,it,t,d)=>({k:'flow',a,b,it,t,d});
const CAST=(list,t,d)=>({k:'cast',list,t,d});
const B={ /* תיבות הסימון בצילומים, ביחס לגודל המסך */
 's1-filter':[.036,.76,.928,.066],'s1b-collector':[.036,.76,.928,.066],'s3-package':[.036,.25,.928,.104],'s3b-price':[.424,.922,.55,.072],'s4-name':[.036,.165,.928,.547],'s5-details':[.03,.617,.94,.096],'s6-login':[.036,.223,.928,.072],
 'a1-admin-paid':[.63,.661,.301,.092],'a2-admin-wines':[.71,.402,.26,.071],'a3-admin-settings':[.5,.396,.474,.082],'g1-levels':[.428,.361,.541,.071],'g2-edition':[.026,.522,.949,.066],'r1-frame':[.767,.443,.225,.11],'w1-clients':[.026,.658,.949,.048]};
const G={
 buyer:{t:'איך מזמינים',s:[
   CAST(['buyer','artist','winery','ga'],'ברוכים הבאים ל־Grape Arts','ציור של אמן ישראלי, על יין של יקב ישראלי'),
   S_('s1-filter','בוחרים מוצר','מארז, מהדורה ממוספרת או מהדורה + הדפס',B['s1-filter'],'buyer'),
   S_('s2-painting','בוחרים ציור','לכל ציור יש סיפור ואמן',null,'buyer'),
   S_('s3-package','בוחרים מארז ויין','בקבוק, זוג, שלישייה או ארגז',B['s3-package'],'buyer'),
   S_('s3b-price','המחיר מתעדכן לבד','כולל מע״מ, בלי הפתעות',B['s3b-price'],'buyer'),
   S_('s4-name','שם, הקדשה או לוגו','תמיד מחוץ לציור עצמו',B['s4-name'],'artist'),
   S_('s5-details','אישור גיל ותנאים','מעל גיל 18, ההזמנה כוללת יין',B['s5-details'],'buyer'),
   F_('buyer','ga','coin','משלמים','ורק אז מתחילים להכין את הבקבוק'),
   F_('artist','buyer','cert','תעודה חתומה','מספר במהדורה שלא חוזר'),
   F_('ga','buyer','box','המארז בדרך','ההזמנה מגיעה עד הבית'),
   S_('s8-orders','"ההזמנות שלי"','רואים איפה כל הזמנה עומדת',null,'buyer')]},
 customer:{t:'לקוח של יקב',s:[
   CAST(['customer','winery','artist'],'ברוכים הבאים','מעצבים בקבוק אישי עם היקב שלך'),
   F_('winery','customer','link','הקישור מהיקב','מעכשיו אתה לקוח של היקב הזה'),
   F_('artist','customer','painting','בוחרים אמן וציור','ומקבלים מיד הצעה מוכנה'),
   F_('customer','winery','bottle','שולחים ליקב','שם, הקדשה, צורה וכמות'),
   F_('winery','customer','check','היקב מאשר','או מציע שינוי, זה מול זה'),
   F_('artist','winery','check','גם האמן מאשר','רק אז מדפיסים'),
   F_('winery','customer','box','משלמים ליקב','והבקבוקים בדרך אליך')]},
 winery:{t:'מדריך ליקב',s:[
   CAST(['winery','customer','artist','printer'],'ברוכים הבאים, יקב','שלוש דרכים לעבוד איתנו'),
   F_('winery','ga','bottle','יקב שותף','מספקים יין ובקבוקים בלי תווית'),
   S_('w1-clients','הזמנות מהחנות','על היין שלך, בלשונית "לקוחות"',B['w1-clients'],'winery'),
   F_('winery','customer','link','קישור ללקוחות','הם מעצבים, אתם מאשרים'),
   F_('winery','gallery','painting','רישיון לתווית','בוחרים ציור לתווית של יין שלכם'),
   F_('gallery','winery','check','מחיר, אישור וחתימה','הכל בתוך המערכת'),
   F_('printer','winery','box','תוויות מוכנות','ישר מבית הדפוס')]},
 artist:{t:'מדריך לאמן',s:[
   CAST(['artist','gallery','buyer'],'ברוכים הבאים, אמן','הציורים שלך, בשליטה שלך'),
   F_('artist','ga','painting','מעלים ציור','קובץ לא מתאים נחסם לבד, עם הסבר'),
   S_('r1-frame','מסגרת ללוגו','בוחרים איפה מותר לכתוב. אף פעם לא על הציור',B['r1-frame'],'artist'),
   F_('artist','gallery','check','מאשרים מוצרים','יחד עם הגלריה'),
   F_('gallery','artist','painting','בקשת רישיון','מאשרים, מבקשים שינוי או דוחים'),
   F_('artist','buyer','cert','חותמים על תעודות','אחרי כל תשלום'),
   F_('buyer','artist','star','ביקור בסטודיו','רק למהדורה + הדפס, כמה שתחליט')]},
 gallery:{t:'מדריך לגלריה',s:[
   CAST(['gallery','artist','winery'],'ברוכים הבאים, גלריה','מייצגים את האמנים'),
   F_('artist','gallery','painting','מאשרים ציורים','או מחזירים עם הערה'),
   S_('g1-levels','מסכימים למוצרים','אמן מופיע רק כששניכם אישרתם',B['g1-levels'],'gallery'),
   S_('g2-edition','פותחים מהדורה','גודל קבוע שלא גדל לעולם',B['g2-edition'],'gallery'),
   F_('winery','gallery','coin','מתמחרים רישיון','המחיר מחושב, אפשר להתאים עד 15%'),
   F_('gallery','buyer','cert','חותמת על תעודה','אחרי חתימת האמן'),
   F_('buyer','gallery','star','אספנים שהסכימו','רק מי שסימן הסכמה')]},
 curator:{t:'מדריך לאוצר',s:[
   CAST(['curator','artist','winery'],'ברוכים הבאים, אוצר','שומרים על האיכות'),
   F_('curator','winery','star','בחירות האוצר','ציורים מומלצים מופיעים ראשונים'),
   F_('winery','curator','painting','בדיקת הדמיות','מסמנים אם הצילום לא תואם'),
   F_('artist','curator','link','בקשות הצטרפות','מאשרים או דוחים, עם סיבה')]},
 printer:{t:'מדריך לבית דפוס',s:[
   CAST(['printer','winery','buyer'],'ברוכים הבאים, בית דפוס','מכאן הבקבוקים יוצאים'),
   F_('ga','printer','file','הזמנה עם קובץ מוכן','מידות, גלישה וקווי חיתוך'),
   F_('printer','winery','link','חסר משהו?','כותבים מה, וזה מגיע לשיחה'),
   F_('printer','buyer','box','מסמנים מוכן','כולם מקבלים עדכון')]},
 admin:{t:'מדריך למנהל',s:[
   CAST(['admin','gallery','artist','winery','printer'],'ברוכים הבאים, מנהל','כל המערכת מול העיניים'),
   F_('admin','gallery','link','קישור הזמנה אישי','מייל אחד, שימוש מוגבל'),
   S_('a2-admin-wines','יקבים שותפים ויינות','מחיר ובקבוקים בלי תווית',B['a2-admin-wines'],'admin'),
   S_('a1-admin-paid','סימון תשלום','רק אז נכנסים להפקה ומספרים',B['a1-admin-paid'],'admin'),
   S_('a3-admin-settings','הגדרות החנות','זמן הכנה, תאריך אחרון והנחות',B['a3-admin-settings'],'admin'),
   F_('admin','winery','key','העברת לקוח','רק עם סיבה שנרשמת ביומן'),
   CAST(['gallery','artist','winery','printer'],'צפייה בתור','רואים כל מסך כמו כל תפקיד')]}
};

/* ───────── עיצוב ───────── */
const CSS=`
.gd{position:fixed;inset:0;z-index:9999;background:radial-gradient(120% 70% at 50% 0%,#FFFFFF 0%,${C.cream} 55%,#FCEBD9 100%);color:${C.ink};font-family:'Heebo','IBM Plex Sans Hebrew',Arial,sans-serif;display:flex;flex-direction:column;direction:rtl;padding:max(10px,env(safe-area-inset-top)) 14px max(14px,env(safe-area-inset-bottom));box-sizing:border-box;animation:gdIn .35s ease}
.gd *{box-sizing:border-box}
.gd{align-items:center}.gd>*{width:100%;max-width:520px}.gd:focus{outline:none}
.gd-top{display:flex;align-items:center;gap:10px;min-height:44px}
.gd-top b{font-size:15px;font-weight:700;color:${C.grape}}
.gd-sp{flex:1}
.gd-skip,.gd-x{background:none;border:0;font:inherit;color:#6E667F;min-height:44px;min-width:44px;padding:0 8px;cursor:pointer;border-radius:12px}
.gd-skip{font-size:15px;text-decoration:underline;text-underline-offset:3px}
.gd-x{font-size:24px;line-height:1}
.gd-skip:focus-visible,.gd-x:focus-visible,.gd-nav button:focus-visible,.gd-dots button:focus-visible{outline:3px solid ${C.sky};outline-offset:2px}
.gd-bar{height:6px;border-radius:9px;background:#EFE4D6;overflow:hidden;margin:2px 0 6px}
.gd-bar i{display:block;height:100%;border-radius:9px;background:linear-gradient(90deg,${C.berry},${C.gold});transition:width .4s ease}
.gd-stage{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;position:relative}
.gd-scene{width:100%;height:100%;display:flex;align-items:center;justify-content:center;animation:gdSlide .45s cubic-bezier(.2,.8,.2,1)}
.gd-scene.back{animation-name:gdSlideB}
.gd-cap{text-align:center;padding:8px 6px 4px;min-height:86px}
.gd-cap h2{margin:0;font-size:clamp(22px,6.4vw,30px);line-height:1.15;font-weight:800;letter-spacing:-.01em}
.gd-cap p{margin:6px auto 0;font-size:16px;line-height:1.45;color:#5A5268;max-width:340px}
.gd-nav{display:flex;gap:10px;align-items:center;margin-top:6px}
.gd-nav button{min-height:52px;border-radius:16px;border:0;font:inherit;font-size:17px;font-weight:700;cursor:pointer}
.gd-next{flex:1;background:${C.ink};color:#fff;box-shadow:0 6px 0 #00000026}
.gd-next:active{transform:translateY(3px);box-shadow:0 3px 0 #00000026}
.gd-prev{width:56px;background:#fff;color:${C.ink};border:2px solid #E7DCCF!important}
.gd-prev[disabled]{opacity:.35}
.gd-dots{display:flex;justify-content:center;gap:2px;margin-top:8px;flex-wrap:wrap}
.gd-dots button{width:24px;height:24px;border:0;background:none;padding:0;cursor:pointer;display:grid;place-items:center}
.gd-dots button i{display:block;width:8px;height:8px;border-radius:9px;background:#DCCFBF;transition:.3s}
.gd-dots button[aria-current] i{width:20px;background:${C.berry}}
/* דמויות */
.gd-ch{margin:0;display:flex;flex-direction:column;align-items:center;gap:2px;flex:none}
.gd-ch svg{width:var(--s,96px);height:var(--s,96px);overflow:visible;animation:gdBob 3s ease-in-out infinite;filter:drop-shadow(0 6px 6px #0000001a)}
.gd-ch figcaption{font-size:13px;font-weight:700;color:#5A5268;background:#fff;border-radius:99px;padding:2px 10px;box-shadow:0 2px 0 #0000000f}
.gd-pop{animation:gdPop .55s cubic-bezier(.3,1.6,.5,1) both}
/* קאסט */
.gd-cast{display:flex;flex-wrap:wrap;justify-content:center;align-content:center;gap:14px 10px;max-width:380px}
.gd-cast .gd-ch{--s:min(25vw,104px)}
.gd-cast .gd-ch:nth-child(2){animation-delay:.08s}.gd-cast .gd-ch:nth-child(3){animation-delay:.16s}.gd-cast .gd-ch:nth-child(4){animation-delay:.24s}.gd-cast .gd-ch:nth-child(5){animation-delay:.32s}
.gd-cast .gd-ch:nth-child(2) svg{animation-delay:-.7s}.gd-cast .gd-ch:nth-child(3) svg{animation-delay:-1.4s}.gd-cast .gd-ch:nth-child(4) svg{animation-delay:-2.1s}
/* העברה */
.gd-flow{position:relative;width:100%;max-width:400px;height:min(100%,330px);display:flex;align-items:center;justify-content:space-between}
.gd-flow .gd-ch{--s:min(30vw,124px);z-index:2}
.gd-flow .gd-b{animation-delay:.15s}
.gd-lane{position:absolute;inset:0;pointer-events:none}
.gd-lane svg{position:absolute;left:22%;right:22%;top:18%;width:56%;height:46%;overflow:visible}
.gd-lane path{stroke:${C.ink};stroke-width:3;fill:none;stroke-dasharray:6 9;stroke-linecap:round;animation:gdDash 1.1s linear infinite}
.gd-lane .hd{fill:${C.ink};stroke:none;animation:none}
.gd-item{position:absolute;top:24%;width:58px;height:58px;right:22%;z-index:3;animation:gdTravel 2.6s cubic-bezier(.45,.05,.4,1) .4s infinite;filter:drop-shadow(0 6px 6px #00000026)}
.gd-item svg{width:100%;height:100%}
/* צילום מסך */
.gd-shot{position:relative;display:flex;align-items:flex-end;justify-content:center;height:100%;width:100%}
.gd-phone{position:relative;height:100%;max-height:520px;aspect-ratio:390/844;border-radius:30px;background:${C.ink};padding:7px;box-shadow:0 18px 30px #2a14402e;animation:gdPop .5s cubic-bezier(.3,1.4,.5,1) both}
.gd-scr{position:relative;width:100%;height:100%;border-radius:24px;overflow:hidden;background:#eee}
.gd-scr img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
.gd-ring{position:absolute;border:3.5px solid ${C.berry};border-radius:12px;box-shadow:0 0 0 999px #1F1B2D59;animation:gdRing 1.8s ease-in-out .5s infinite;opacity:0;animation-fill-mode:both}
.gd-tap{position:absolute;width:30px;height:30px;border-radius:50%;background:${C.gold};border:3px solid #fff;box-shadow:0 3px 8px #0004;transform:translate(-50%,-50%);animation:gdTap 1.8s ease-in-out .6s infinite}
.gd-peek{position:absolute;bottom:-4px;inset-inline-start:max(-6px,calc(50% - 230px));z-index:4}
.gd-peek .gd-ch{--s:min(22vw,88px)}
.gd-peek figcaption{display:none}
@keyframes gdIn{from{opacity:0}to{opacity:1}}
@keyframes gdSlide{from{opacity:0;transform:translateX(-40px)}to{opacity:1;transform:none}}
@keyframes gdSlideB{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:none}}
@keyframes gdPop{from{opacity:0;transform:scale(.6) translateY(16px)}to{opacity:1;transform:none}}
@keyframes gdBob{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-5px) rotate(-1.5deg)}}
@keyframes gdDash{to{stroke-dashoffset:-30}}
@keyframes gdTravel{0%{right:22%;transform:translateY(10px) scale(.4);opacity:0}12%{opacity:1;right:22%;transform:none}50%{right:calc(50% - 29px);transform:translateY(-26px) rotate(-8deg)}88%{opacity:1;right:calc(78% - 58px);transform:none}100%{opacity:0;right:calc(78% - 58px);transform:translateY(12px) scale(.5)}}
@keyframes gdRing{0%{opacity:0;transform:scale(1.15)}25%,80%{opacity:1;transform:scale(1)}100%{opacity:1;transform:scale(1)}}
@keyframes gdTap{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(.75)}}
@media (prefers-reduced-motion:reduce){.gd,.gd *{animation-duration:.01s!important;animation-iteration-count:1!important}.gd-item{animation:none;right:calc(50% - 29px)}.gd-ring{opacity:1}}
@media (min-height:760px){.gd-cap p{font-size:17px}}
.gd-help{display:inline-flex;align-items:center;justify-content:center;gap:6px}
`;

/* ───────── מנוע ───────── */
let st=null;
const key=r=>`ga-guide-${VER}-${r}`;
const seen=r=>{try{return navigator.webdriver&&!window.GA_GUIDE_TEST?true:localStorage.getItem(key(r))==='1'}catch(e){return true}}; /* בבדיקות אוטומטיות לא נפתח לבד */
const mark=r=>{try{localStorage.setItem(key(r),'1')}catch(e){}};
function css(){if(document.getElementById('gd-css'))return;const s=document.createElement('style');s.id='gd-css';s.textContent=CSS;document.head.appendChild(s)}
function base(){const p=document.querySelector('script[src*="guide.js"]');return p?p.src.replace(/guide\.js.*$/,''):''}
function scene(sc){
  if(sc.k==='cast')return `<div class="gd-cast">${sc.list.map(k=>who(k,'gd-pop')).join('')}</div>`;
  if(sc.k==='flow')return `<div class="gd-flow">${who(sc.a,'gd-pop gd-a')}${who(sc.b,'gd-pop gd-b')}
    <div class="gd-lane"><svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><path d="M100 30 Q50 -6 4 30"/><path class="hd" d="M0 32 L10 25 L8 35Z"/></svg></div>
    <div class="gd-item" aria-hidden="true">${IT[sc.it]}</div></div>`;
  const b=sc.box,ring=b?`<div class="gd-ring" style="left:${b[0]*100}%;top:${b[1]*100}%;width:${Math.min(b[2],1-b[0])*100}%;height:${b[3]*100}%"></div><div class="gd-tap" style="left:${(b[0]+Math.min(b[2],1-b[0])/2)*100}%;top:${(b[1]+b[3]/2)*100}%"></div>`:'';
  return `<div class="gd-shot"><div class="gd-phone"><div class="gd-scr"><img src="${base()}img/guide/${sc.img}.jpg" alt="${sc.t}" loading="eager">${ring}</div></div>${sc.c?`<div class="gd-peek">${who(sc.c,'gd-pop')}</div>`:''}</div>`;
}
function draw(dir){
  const g=G[st.role],sc=g.s[st.i],n=g.s.length,last=st.i===n-1,el=st.el;
  el.querySelector('.gd-bar i').style.width=((st.i+1)/n*100)+'%';
  el.querySelector('.gd-stage').innerHTML=`<div class="gd-scene ${dir<0?'back':''}">${scene(sc)}</div>`;
  el.querySelector('.gd-cap').innerHTML=`<h2 id="gd-t">${sc.t}</h2><p>${sc.d}</p>`;
  el.querySelector('.gd-prev').disabled=st.i===0;
  el.querySelector('.gd-next').textContent=last?'יאללה, מתחילים':'הבא';
  el.querySelector('.gd-skip').hidden=last;
  el.querySelector('.gd-dots').innerHTML=g.s.map((_,i)=>`<button type="button" data-i="${i}" aria-label="שלב ${i+1} מתוך ${n}" ${i===st.i?'aria-current="step"':''}><i></i></button>`).join('');
}
function go(d){const n=G[st.role].s.length,i=st.i+d;if(i<0)return;if(i>=n)return close();st.i=i;draw(d)}
function close(){if(!st)return;mark(st.role);st.el.remove();document.removeEventListener('keydown',key2);document.documentElement.style.overflow=st.ov;const f=st.focus;st=null;try{f&&f.focus()}catch(e){}}
function key2(e){if(!st)return;if(e.key==='Escape')close();else if(e.key==='ArrowLeft')go(1);else if(e.key==='ArrowRight')go(-1)}
function open(role){
  role=G[role]?role:'buyer';css();if(st)close();
  const el=document.createElement('div');el.className='gd';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','gd-t');
  el.innerHTML=`<div class="gd-top"><b>${G[role].t}</b><span class="gd-sp"></span><button type="button" class="gd-skip">דלג</button><button type="button" class="gd-x" aria-label="לסגור את ההדרכה">×</button></div>
   <div class="gd-bar" aria-hidden="true"><i></i></div><div class="gd-stage"></div><div class="gd-cap" aria-live="polite"></div>
   <div class="gd-nav"><button type="button" class="gd-prev" aria-label="הקודם">›</button><button type="button" class="gd-next">הבא</button></div><div class="gd-dots"></div>`;
  document.body.appendChild(el);
  st={role,i:0,el,ov:document.documentElement.style.overflow,focus:document.activeElement};document.documentElement.style.overflow='hidden';
  el.querySelector('.gd-x').onclick=close;el.querySelector('.gd-skip').onclick=close;
  el.querySelector('.gd-next').onclick=()=>go(1);el.querySelector('.gd-prev').onclick=()=>go(-1);
  el.querySelector('.gd-dots').onclick=e=>{const b=e.target.closest('[data-i]');if(b){const i=+b.dataset.i,d=i>st.i?1:-1;st.i=i;draw(d)}};
  let x0=null;el.addEventListener('touchstart',e=>{x0=e.touches[0].clientX},{passive:true});
  el.addEventListener('touchend',e=>{if(x0==null)return;const dx=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(dx)>50)go(dx<0?1:-1)},{passive:true});
  document.addEventListener('keydown',key2);draw(1);el.tabIndex=-1;setTimeout(()=>el.focus(),60);
}
const roleNow=()=>{try{return (typeof S!=='undefined'&&S&&S.role)||null}catch(e){return null}};
window.GAGuide={open,close,seen,roles:Object.keys(G)};

/* ───────── חיבור לאתר ───────── */
const ICO=`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M9.5 9.3a2.6 2.6 0 1 1 3.6 2.4c-.8.4-1.1.9-1.1 1.8"/><circle cx="12" cy="16.8" r=".6" fill="currentColor"/></svg>`;
window.GAGuideIcon=ICO;
if(typeof window.introSheet==='function'){ /* המערכת לצוות וללקוחות של יקבים */
  window.introSheet=()=>{if(roleNow())open(roleNow())};
  try{if(typeof A!=='undefined')A.introshow=window.introSheet}catch(e){}
  window.afterRole=()=>{const r=roleNow();if(r&&!seen(r))setTimeout(()=>{if(roleNow()===r&&!seen(r))open(r)},500)};
}else if(/shop/.test(location.pathname)){ /* החנות */
  const b=document.getElementById('nav-guide');if(b)b.onclick=()=>open('buyer');
  if(!seen('buyer')&&!/^#d-/.test(location.hash))setTimeout(()=>{if(!seen('buyer')&&!document.querySelector('.gd'))open('buyer')},900);
}
})();
