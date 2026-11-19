/* סדנת התווית · מסמכים וקבצים: קובץ דפוס לתווית, חוזה וחשבונית להורדה כ־PDF.
   עובד גם בהדגמה וגם במערכת המחוברת. */
'use strict';
(function(){
const PRINT={w:80,h:152,bleed:3,dpi:300};   // מ״מ: תווית 80×152, גלישה 3 מ״מ מכל צד
const px=mm=>Math.round(mm/25.4*PRINT.dpi);

async function toDataUrl(url){
  if(!url||url.startsWith('data:'))return url;
  const b=await (await fetch(url)).blob();
  return await new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(b)});
}
window.toDataUrl=toDataUrl;

/* label only, as a stand-alone SVG with the painting inlined (so the canvas stays clean) */
async function labelSvg(type,workId,o){
  let svg=bottle(type,workId,{...o,label:true,wm:false,flat:true});
  const m=svg.match(/<image href="([^"]+)"/);
  if(m)svg=svg.replace(m[1],await toDataUrl(m[1]));
  return svg.replace('viewBox="18 140 64 118"','viewBox="20 144 60 114" width="600" height="1140"');
}
window.labelSvg=labelSvg;

async function svgToCanvas(svg,w,h){
  const img=new Image();const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
  await new Promise((ok,bad)=>{img.onload=ok;img.onerror=bad;img.src=url});
  const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
  g.fillStyle='#fff';g.fillRect(0,0,w,h);g.drawImage(img,0,0,w,h);URL.revokeObjectURL(url);return c;
}
window.svgToPng=async(svg,w,h)=>(await svgToCanvas(svg,w,h)).toDataURL('image/png');

function download(dataUrl,name){const a=document.createElement('a');a.href=dataUrl;a.download=name;document.body.appendChild(a);a.click();a.remove()}

/* print file: the label at 300dpi, with bleed, crop marks and a slug line */
async function printFile(spec,name){
  toast('מכין קובץ דפוס…');
  /* מידת התווית של היקב, וקובץ המקור המלא במקום התצוגה המקדימה */
  const keep={...PRINT},size=(spec.wid&&S._orgLabel?.[spec.wid])||S.wset?.label;if(size?.w&&size?.h)Object.assign(PRINT,{w:+size.w,h:+size.h});
  const wk=(S.works||[]).find(x=>x.id===spec.work),src=wk?.src;if(wk?.full)wk.src=wk.full;
  try{
    const W=px(PRINT.w+2*PRINT.bleed),H=px(PRINT.h+2*PRINT.bleed),b=px(PRINT.bleed),m=px(10);
    const label=await svgToCanvas(await labelSvg(spec.type,spec.work,spec.o),W,H);
    const c=document.createElement('canvas');c.width=W+2*m;c.height=H+2*m+px(8);const g=c.getContext('2d');
    g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(label,m,m);
    g.strokeStyle='#000';g.lineWidth=2;const L=px(6),x0=m+b,y0=m+b,x1=m+W-b,y1=m+H-b;
    [[x0,y0],[x1,y0],[x0,y1],[x1,y1]].forEach(([x,y])=>{g.beginPath();g.moveTo(x,y<c.height/2?y-b-L:y+b+L);g.lineTo(x,y<c.height/2?y-b:y+b);g.moveTo(x<c.width/2?x-b-L:x+b+L,y);g.lineTo(x<c.width/2?x-b:x+b,y);g.stroke()});
    g.fillStyle='#000';g.font=`${px(2.4)}px Arial`;g.textAlign='left';g.direction='ltr';
    g.fillText(`${name} · ${PRINT.w}x${PRINT.h} mm + ${PRINT.bleed} mm bleed · ${PRINT.dpi} dpi`,m,c.height-px(4));
    /* PDF לדפוס: עמוד עיצוב עם קווי חיתוך ותיבות חיתוך וגלישה, ועמוד נפרד לכל שכבת זהב והבלטה */
    let pdf=null;try{pdf=await printPdf(spec,name,label,W,H)}catch(e){console.warn('pdf',e)}
    if(pdf)download(pdf,`${name}-print.pdf`);else download(c.toDataURL('image/png'),`${name}-print-${PRINT.dpi}dpi.png`);
    toast(pdf?'קובץ הדפוס ירד (PDF)':'קובץ הדפוס ירד');
  }catch(e){console.error(e);toast('לא הצלחנו להכין את הקובץ. כדאי לנסות שוב')}
  finally{Object.assign(PRINT,keep);if(wk)wk.src=src}
}
window.printFile=printFile;

/* שכבה לדפוס מיוחד: רק הטקסט שבזהב או בהבלטה, בשחור מלא על לבן */
function plateSvg(svg,kind){
  const vb=(svg.match(/viewBox="([^"]+)"/)||[])[1]||'20 144 60 114';
  const re=kind==='foil'?/<text[^>]*fill="#9A7B2F"[^>]*>[\s\S]*?<\/text>/g:/<text[^>]*fill="rgba\(0,0,0,\.18\)"[^>]*>[\s\S]*?<\/text>/g;
  const t=(svg.match(re)||[]).map(x=>x.replace(/fill="[^"]+"/,'fill="#000"').replace(/x="50\.5" y="230\.6"/,'x="50" y="230"'));
  if(!t.length)return null;
  const [x,y,w,h]=vb.split(/\s+/);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="600" height="1140"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff"/>${t.join('')}</svg>`;
}
let _pdfLib=null;
function loadPdfLib(){return _pdfLib||(_pdfLib=window.PDFLib?Promise.resolve(window.PDFLib):new Promise((ok,bad)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';s.onload=()=>ok(window.PDFLib);s.onerror=()=>{_pdfLib=null;bad(new Error('pdf-lib'))};document.head.appendChild(s)}))}
async function printPdf(spec,name,label,W,H){
  const {PDFDocument,rgb,StandardFonts}=await loadPdfLib();
  const mm=v=>v*72/25.4,M=10,T={w:PRINT.w,h:PRINT.h},B=PRINT.bleed;
  const doc=await PDFDocument.create();doc.setTitle(name);doc.setCreator('סדנת התווית');doc.setProducer('Sadnat Hatavit');
  const font=await doc.embedFont(StandardFonts.Helvetica);
  const svg=await labelSvg(spec.type,spec.work,spec.o);
  const layers=[['ARTWORK',label]];
  for(const [k,n] of [['foil','FOIL plate'],['emboss','EMBOSS plate']]){
    if(!spec.o?.[k])continue;const ps=plateSvg(svg,k);if(ps)layers.push([n,await svgToCanvas(ps,W,H)])}
  const pw=mm(T.w+2*B+2*M),ph=mm(T.h+2*B+2*M)+mm(8);
  for(const [i,[title,cv]] of layers.entries()){
    const png=await doc.embedPng(await (await fetch(cv.toDataURL('image/png'))).arrayBuffer());
    const pg=doc.addPage([pw,ph]),x0=mm(M),y0=mm(M)+mm(8);
    pg.drawImage(png,{x:x0,y:y0,width:mm(T.w+2*B),height:mm(T.h+2*B)});
    pg.setBleedBox(x0,y0,mm(T.w+2*B),mm(T.h+2*B));pg.setTrimBox(x0+mm(B),y0+mm(B),mm(T.w),mm(T.h));
    const L=mm(6),g=mm(B),k=rgb(0,0,0),tx=[x0+mm(B),x0+mm(B+T.w)],ty=[y0+mm(B),y0+mm(B+T.h)];
    for(const X of tx)for(const Y of ty){const dx=X<pw/2?-1:1,dy=Y<ph/2?-1:1;
      pg.drawLine({start:{x:X,y:Y+dy*g},end:{x:X,y:Y+dy*(g+L)},thickness:.3,color:k});
      pg.drawLine({start:{x:X+dx*g,y:Y},end:{x:X+dx*(g+L),y:Y},thickness:.3,color:k})}
    pg.drawText(`${name} | ${T.w}x${T.h}mm +${B}mm bleed | ${PRINT.dpi}dpi`,{x:x0,y:mm(5.5),size:5.5,font,color:k});pg.drawText(`${i+1}/${layers.length} ${title}${i?' - 100% black':''}`,{x:x0,y:mm(2.5),size:5.5,font,color:k});
  }
  const bytes=await doc.save();let bin='';const u=new Uint8Array(bytes);for(let i=0;i<u.length;i+=32768)bin+=String.fromCharCode.apply(null,u.subarray(i,i+32768));
  return 'data:application/pdf;base64,'+btoa(bin);
}
window.printPdf=printPdf;

/* a printable document in a new tab: the phone's print dialog saves it as PDF */
function openDoc(title,body){
  const html=`<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
  <style>body{font-family:"IBM Plex Sans Hebrew",Arial,sans-serif;color:#171717;max-width:720px;margin:0 auto;padding:28px 22px;line-height:1.6}h1{font-family:"Frank Ruhl Libre",serif;font-weight:500;font-size:26px;margin:0 0 4px}
  .meta{color:#666;font-size:13px;margin-bottom:18px}h2{font-size:15px;margin:18px 0 4px}p{margin:0 0 8px}table{width:100%;border-collapse:collapse;margin:10px 0}td{padding:7px 0;border-bottom:1px solid #ddd}td:last-child{text-align:left;font-family:monospace;direction:ltr}
  .tot td{font-weight:700;border-top:2px solid #171717}.sig{display:flex;gap:40px;margin-top:36px}.sig div{flex:1;border-top:1px solid #171717;padding-top:6px;font-size:13px;color:#555}
  .note{font-size:12.5px;color:#666;margin-top:20px}.bar{position:sticky;top:0;background:#fff;padding:8px 0;margin-bottom:12px;border-bottom:1px solid #ddd}.bar button{font:inherit;padding:10px 16px;background:#171717;color:#fff;border:0;cursor:pointer}
  @media print{.bar{display:none}body{padding:0}}</style></head><body><div class="bar"><button onclick="print()">לשמור כ־PDF או להדפיס</button></div>${body}</body></html>`;
  const w=window.open(URL.createObjectURL(new Blob([html],{type:'text/html'})),'_blank');
  if(!w)toast('הדפדפן חסם חלון חדש. כדאי לאפשר חלונות קופצים לאתר');
}
window.openDoc=openDoc;
const today=()=>new Date().toLocaleDateString('he-IL');
const row=(l,v,cls='')=>`<tr class="${cls}"><td>${l}</td><td>${v}</td></tr>`;

function contractDoc(d){const w=work(d.work),p=price(d),an=d.artistN||'ארז אהרון',gn=d.galleryN||'הגלריה';
  openDoc(`חוזה רישוי ${d.id}`,`<h1>הסכם רישוי לשימוש ביצירה</h1><div class="meta">עסקה ${d.id} · דגם ${esc(d.code)} · הופק ${today()} · טיוטה לבדיקת עורך דין</div>
  <h2>1. הצדדים</h2><p>${esc(gn)}, בשם האמן ${esc(an)} ("הגלריה"), ו־${esc(d.winery)} ("היקב").</p>
  <h2>2. היצירה והשימוש</h2><p>היצירה "${esc(w?.t||'')}" על תווית היין "${esc(d.wineN)}", על הקרטון ובשיווק הבקבוק בלבד. שימוש נוסף, כמו מוצרי משנה, דורש רישיון נפרד.</p>
  <h2>3. תקופה וכמות</h2><p>${TYPES[d.lt].n}, ${QTY[d.q].n} בקבוקים, בישראל${d.ex?', בבלעדיות':''}. ${d.ends?`בתוקף עד ${fmtD(d.ends)}. `:''}בסוף הרישיון יש שישה חודשים למכירת מלאי שכבר הודפס.</p>
  <h2>4. זכויות</h2><p>זכות היוצרים נשארת בידי האמן. שם האמן מופיע על התווית. חיתוך או שינוי צבע מעבר לאזורים שהאמן סימן מחייבים את אישורו.</p>
  <h2>5. תמורה</h2><table>${row('מחיר הרישיון',nis(p.total))}${row(`מע״מ ${VAT}%`,nis(p.vat))}${row('סה״כ לתשלום',nis(p.gross),'tot')}</table><p>התשלום לפי חשבונית הגלריה. הקבצים נמסרים אחרי שהתשלום מאושר.</p>
  <h2>6. ביטול ומחלוקות</h2><p>ביטול לפני חתימה ללא עלות. קבצים פגומים שלא תוקנו מזכים בביטול ובהחזר. מחלוקת נפתרת בגישור, ולאחר מכן לפי הדין בישראל.</p>
  <div class="sig"><div>בשם הגלריה</div><div>בשם היקב${['pay','active'].includes(d.st)?' · נחתם במערכת':''}</div></div>
  <p class="note">נוסח לדוגמה. הנוסח הסופי ייקבע עם עורך דין.</p>`)}
window.contractDoc=contractDoc;window.DX={openDoc,row,today};

function invoiceDoc(d){const p=price(d),w=work(d.work);
  openDoc(`דרישת תשלום ${d.inv||d.id}`,`<h1>דרישת תשלום</h1><div class="meta">${d.inv?`מספר חשבונית ${esc(d.inv)} · `:''}עסקה ${d.id} · הופק ${today()}</div>
  <table>${row('מאת',esc(d.galleryN||'הגלריה'))}${row('אל',esc(d.winery))}${row('עבור',`רישיון ${TYPES[d.lt].n} · "${esc(w?.t||'')}" · ${esc(d.wineN)}`)}</table>
  <table>${row('מחיר הרישיון',nis(p.total))}${row(`מע״מ ${VAT}%`,nis(p.vat))}${row('לתשלום',nis(p.gross),'tot')}${d.paid?row('שולם',fmtD(d.paid)):''}</table>
  <p class="note">מסמך מסכם מהמערכת. חשבונית מס מופקת על ידי הגלריה במערכת הנהלת החשבונות שלה.</p>`)}
window.invoiceDoc=invoiceDoc;

/* deal room: files and documents */
A.files=function(v){const d=deal(+v);const nm=d.wineN.replace(/\s\d{4}$/,''),yr=(d.wineN.match(/\d{4}$/)||[''])[0];
  const ds=S.designs.find(x=>x.code===d.code)||{};
  printFile({type:d.type,work:d.work,wid:d.wid,o:{pos:ds.pos,zoom:ds.zoom,shape:ds.shape,name:nm,year:yr,artist:d.artistN}},`deal-${d.id}`)};
const _contract=A.contract;
A.contract=function(v){if(!deal(+v)){_contract(v);return}_contract(v);const s=document.querySelector('#ov .sheet');
  s?.querySelector('.btn.wide')?.insertAdjacentHTML('beforebegin',`<button class="btn alt wide" style="margin-top:12px" data-a="contractpdf" data-v="${v}">להוריד כ־PDF</button>`)};
A.contractpdf=v=>(window.contractDoc||contractDoc)(deal(+v));
const _inv=A.invoice;
A.invoice=function(v){_inv(v);document.querySelector('#ov .sheet')?.insertAdjacentHTML('beforeend',`<button class="btn alt wide" style="margin-top:10px" data-a="invoicepdf" data-v="${v}">להוריד כ־PDF</button>`)};
A.invoicepdf=v=>invoiceDoc(deal(+v));
/* the "download invoice" link in the deal room opens the PDF instead of a toast */
const _vd=window.vDeal;
vDeal=function(d){const r=_vd(d);if(r&&r.html)r.html=r.html.replace('data-a="toast" data-v="החשבונית ירדה כ־PDF"',`data-a="invoicepdf" data-v="${d.id}"`)
  .replace('<button class="link" data-a="contract" data-v="'+d.id+'">לקרוא את החוזה המלא</button>',`<button class="link" data-a="contract" data-v="${d.id}">לקרוא את החוזה המלא</button> · <button class="link" data-a="contractpdf" data-v="${d.id}">PDF</button>`);return r};

/* customer orders: print file for the winery and the printer, order summary as PDF */
A.cprint=function(v){const o=S.corders.find(x=>x.id===+v);const d=o.wv||o.d;const wi=wine(d.wine);
  printFile({type:wi?.type||'red',work:d.work,wid:o.wid,o:{pos:d.pos,zoom:d.zoom,shape:d.shape,name:d.name||wi?.n,year:wi?.y,ded:d.ded,foil:d.foil,emboss:d.emboss,artist:window.artistName?artistName(d.artist):''}},`order-${o.id}`)};
A.cdoc=function(v){const o=S.corders.find(x=>x.id===+v);const d=o.wv||o.d;const wi=wine(d.wine)||{};const p=window.cprice?cprice(d):{total:0,q:d.qty,unitNet:0};
  openDoc(`הזמנה ${o.id}`,`<h1>סיכום הזמנה ${o.id}</h1><div class="meta">${fmtD(o.at)} · ${esc(ROLES.winery.who)}</div>
  <table>${row('לקוח',esc(o.cust.n))}${row('טלפון',esc(o.cust.ph))}${row('דוא״ל',esc(o.cust.em))}</table>
  <table>${row('יצירה',esc(work(d.work)?.t||''))}${row('יין',`${esc(wi.n||'')} ${wi.y||''}`)}${row('שם על התווית',esc(d.name||''))}${row('הקדשה',esc(d.ded||'ללא'))}${row('גימור',[d.foil?'זהב':'',d.emboss?'הבלטה':''].filter(Boolean).join(', ')||'רגיל')}${row('כמות',d.qty+' בקבוקים')}${row('לבקבוק',nis(p.unitNet))}${row('סה״כ כולל מע״מ',nis(p.total),'tot')}</table>
  <p class="note">התשלום נעשה ישירות מול היקב.</p>`)};
const _vco=VX.corder;
VX.corder=function(id){const r=_vco(id);const o=S.corders.find(x=>x.id===+id);if(!o||!r.html)return r;
  const canFile=['approved','print','done'].includes(o.st)&&['winery','admin','printer'].includes(S.role);
  r.html+=`<h3>מסמכים</h3><div class="list">${canFile?`<div class="li"><span class="mt"><b>קובץ דפוס</b><small>PNG ב־300dpi, עם גלישה של 3 מ״מ וסימני חיתוך</small></span><button class="btn sm alt" data-a="cprint" data-v="${o.id}">להוריד</button></div>`:''}<div class="li"><span class="mt"><b>סיכום ההזמנה</b><small>להורדה כ־PDF</small></span><button class="btn sm alt" data-a="cdoc" data-v="${o.id}">לפתוח</button></div></div>`;
  if(S.role==='printer'&&o.st==='print')r.bar=`<div class="actbar"><div class="t"><b>בהדפסה</b><span>כשהבקבוקים מוכנים</span></div><button class="btn sm" data-a="cdone" data-v="${o.id}">לסמן שמוכן</button></div>`;
  return r};
A.cdone=v=>{const o=S.corders.find(x=>x.id===+v);o.st='done';o.log.push({t:'הבקבוקים מוכנים',at:now()});toast('סומן שמוכן');render()};

/* printer: customer orders appear next to licence orders */
const _po=V.printer_orders;
V.printer_orders=()=>{const L=S.corders.filter(o=>['print','done'].includes(o.st));
  return _po()+`<h3>הזמנות לקוחות</h3><p class="note" style="margin-top:0">בקבוקים אישיים בכמות קטנה, בהדפסה דיגיטלית.</p>${L.length?`<div class="list">${L.map(o=>{const d=o.wv||o.d;return `<button class="li ${o.st==='print'?'unread':''}" data-a="go" data-v="corder-${o.id}"><span class="mt"><b>הזמנה ${o.id} · ${esc(o.cust.n)}</b><small>${d.qty} בקבוקים · ${esc(work(d.work)?.t||'')}</small><small><span class="pill ${o.st==='print'?'solid':'on'}">${o.st==='print'?'להדפסה':'מוכנה'}</span></small></span><span class="end">←</span></button>`}).join('')}</div>`:empty('אין הזמנות לקוחות להדפסה','')}`};

/* ── catalog for a winery, as a printable document ── */
A.catmake=function(){const c=S._cat;const ids=Object.keys(c.sel).filter(k=>c.sel[k]).map(Number);if(!ids.length){toast('צריך לבחור לפחות יצירה אחת');return}
  const abs=u=>new URL(u,location.href).href;const wi=S.wines[0];
  const items=ids.map(id=>{const w=work(id);if(!w)return '';const svg=bottle(wi?.type||'red',id,{name:wi?.n||'',year:wi?.y||'',artist:w.artistN}).replace(/href="([^"]+)"/g,(m,u)=>`href="${abs(u)}"`);
    return `<div style="display:flex;gap:16px;align-items:center;margin:18px 0;page-break-inside:avoid"><img src="${abs(img(id))}" style="width:46%;height:auto;border:1px solid #ddd"><div style="width:22%">${svg.replace('<svg ','<svg style="width:100%;height:auto" ')}</div><div style="flex:1"><b style="font-size:17px">${esc(w.t)}</b><p style="margin:4px 0;color:#555">${esc(w.artistN||'')}${w.y?' · '+w.y:''}${w.tag?' · '+esc(w.tag):''}</p>${S.stories&&S.stories[id]?`<p style="font-size:14px">${esc(S.stories[id])}</p>`:''}</div></div>`}).join('');
  closeSheet();openDoc(`קטלוג ל${c.w}`,`<h1>קטלוג התאמה ל${esc(c.w)}</h1><div class="meta">${ids.length} יצירות · הופק ${today()} · ההדמיות להמחשה בלבד</div>${items}<p class="note">רישיון לכל יצירה מתבקש דרך המערכת. המחיר נקבע לפי סוג הרישיון וכמות הבקבוקים.</p>`)};

/* ── deals export for the accountant (CSV, opens in Excel) ── */
A.csvexp=function(){const head=['עסקה','יקב','יצירה','יין','סוג רישיון','כמות','מחיר הרישיון','מע״מ','סה״כ','עמלת פלטפורמה','חלק האמן','חלק הגלריה','סטטוס','תאריך תשלום','חשבונית'];
  const rows=S.deals.filter(d=>d.st!=='rejected').map(d=>{const p=price(d);return [d.id,d.winery,work(d.work)?.t||'',d.wineN,TYPES[d.lt].n,QTY[d.q].n,Math.round(p.total),Math.round(p.vat),Math.round(p.gross),Math.round(p.comm),Math.round(p.artist),Math.round(p.gallery),ST[d.st]||d.st,d.paid||'',d.inv||'']});
  const csv='﻿'+[head,...rows].map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\r\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=`deals-${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();a.remove();toast('הקובץ ירד')};
})();
