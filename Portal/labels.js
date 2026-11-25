/* Grape Arts · הבקבוק והתווית של היקב
   1. קטלוג בקבוקים: צורה, צבע זכוכית וצבע קפסולה, לכל יין בנפרד.
   2. תבנית תווית של היקב: מצלמים בקבוק או תווית, והמערכת מזהה את כל המלל, את הלוגו ואת החלוקה לאזורים.
      הציור של האמן נכנס לאזור הציור, וכל השאר נשאר כמו בתווית המקורית של היקב.
   עובד בהדגמה ובמערכת המחוברת. */
(function(){
'use strict';
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LIVE=()=>!!window.LIVE&&typeof window.ME==='object'&&window.ME&&window.ME.role;
const T=m=>{try{toast(m)}catch(e){}};

/* ── קטלוג הבקבוקים: גוף 0..100 × 0..320, תחתית ב־302 ── */
const SHAPES={
  bordeaux:{n:'בורדו',d:'M42 6h16v58c0 10 4 14 12 18c8 4 12 10 12 20v190c0 6-4 10-10 10H28c-6 0-10-4-10-10V102c0-10 4-16 12-20c8-4 12-8 12-18z',cap:[41,2,18,40],lx:19,lw:62},
  burgundy:{n:'בורגונדי',d:'M42 6h16v16c0 0 0 40 2 52c3 16 22 26 22 52v176c0 6-4 10-10 10H28c-6 0-10-4-10-10V126c0-26 19-36 22-52c2-12 2-52 2-52z',cap:[41,2,18,34],lx:20,lw:60},
  alsace:{n:'אלזס, צר וגבוה',d:'M43 6h14v30c0 30 17 50 17 80v186c0 6-4 10-10 10H36c-6 0-10-4-10-10V116c0-30 17-50 17-80z',cap:[42,2,16,40],lx:27,lw:46},
  sparkling:{n:'מבעבע',d:'M41 6h18v20c0 24 4 34 14 48c7 10 11 18 11 30v198c0 6-4 10-10 10H26c-6 0-10-4-10-10V124c0-12 4-20 11-30c10-14 14-24 14-48z',cap:[38,2,24,46],lx:17,lw:66}
};
const GLASS={dark:['ירוק כהה','#1B231E'],green:['ירוק עתיק','#2F4A35'],black:['שחור','#121212'],amber:['ענבר','#4A2E14'],dead:['ירוק עלה','#9FAF7E'],flint:['שקוף','#D5DED6']};
(function(){const st=document.createElement('style');st.textContent='.lsprev svg{display:block;width:100%;height:auto}';document.head.appendChild(st)})();
const CAPS={black:['שחור','#1E1E1D'],sage:['ירוק מרווה','#C4CEB0'],gold:['זהב','#B99A52'],bordeaux:['בורדו','#6E1F2E'],white:['לבן','#EDEBE4'],silver:['כסף','#B8BBBF'],cork:['פקק טבעי','#C9A97C']};
const FONT={serif:"'Frank Ruhl Libre','David Libre',Georgia,serif",sans:"Heebo,Assistant,Arial,sans-serif"};

const wineById=id=>(S.wines||[]).find(w=>String(w.id)===String(id));
function wineOf(o){if(!o)return null;if(o.wid!=null)return wineById(o.wid);if(o._W)return o._W;
  if(o.name)return (S.wines||[]).find(w=>w.n===o.name&&String(w.y||'')===String(o.year||''))||null;return null}

/* ── ציור הבקבוק עם התבנית של היקב ── */
const _b=window.bottle;
function draw(type,workId,o,W){
  const id='b'+Math.random().toString(36).slice(2,7);
  const bot=W.bot||{},sh=SHAPES[bot.shape]||SHAPES.burgundy;
  const glass=bot.glass||(WINE[type]||WINE.red).glass,cap=bot.cap||'#1E1E1D';
  const t=W.tpl||null;
  const lx=sh.lx,lw=sh.lw,lh=t?lw/(+t.aspect||.6):114*lw/60,ly=t?Math.min(286-lh,280-lh):144;
  const lab=t?tplBody(t,{lx,ly,lw,lh,id,workId,o}):plainBody(type,{lx,ly,lw,lh,id,workId,o});
  const art=workId&&typeof work==='function'?work(workId):null;
  const vb=o.label?`${lx} ${ly} ${lw} ${lh}`:'0 0 100 320';
  return `<svg ${o.big?'class="big"':''} viewBox="${vb}" data-label="${lx} ${ly} ${lw} ${lh}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="בקבוק ${E(W.n||'')}${art?' עם הציור '+E(art.t||''):''}">
  <defs><clipPath id="${id}body"><path d="${sh.d}"/></clipPath>
  <linearGradient id="${id}g" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".3"/><stop offset=".3" stop-color="#fff" stop-opacity=".2"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient></defs>
  <path d="${sh.d}" fill="${glass}"/>
  <rect x="${sh.cap[0]}" y="${sh.cap[1]}" width="${sh.cap[2]}" height="${sh.cap[3]}" rx="2" fill="${cap}"/>
  <g clip-path="url(#${id}body)">${lab}</g>
  ${o.flat?'':`<path d="${sh.d}" fill="url(#${id}g)"/>`}
  </svg>`;
}
function artImage(workId,ax,ay,aw,ah,o,clipId,shape){
  if(!workId||typeof img!=='function')return `<rect x="${ax}" y="${ay}" width="${aw}" height="${ah}" fill="#D9D2C5"/>`;
  const pos=o.pos??50,zoom=(o.zoom??100)/100,iw=aw*zoom,ih=ah*zoom,ix=ax-(iw-aw)/2,iy=ay-(ih-ah)*(pos/100);
  const clip=shape==='oval'?`<ellipse cx="${ax+aw/2}" cy="${ay+ah/2}" rx="${aw/2}" ry="${ah/2}"/>`:shape==='arch'?`<path d="M${ax} ${ay+ah}V${ay+aw/2}a${aw/2} ${aw/2} 0 0 1 ${aw} 0V${ay+ah}z"/>`:`<rect x="${ax}" y="${ay}" width="${aw}" height="${ah}"/>`;
  return `<clipPath id="${clipId}">${clip}</clipPath><g clip-path="url(#${clipId})"><image href="${img(workId)}" x="${ix}" y="${iy}" width="${iw}" height="${ih}" preserveAspectRatio="xMidYMid slice"/></g>`;
}
function wmark(o,cx,cy,s){return o.wm?`<text x="${cx}" y="${cy}" text-anchor="middle" transform="rotate(-24 ${cx} ${cy})" font-family="Arial" font-size="${s}" fill="rgba(255,255,255,.8)" letter-spacing="1">הדמיה</text>`:''}
function tplBody(t,{lx,ly,lw,lh,id,workId,o}){
  const A=t.art||[0,0,1,.3];const ax=lx+A[0]*lw,ay=ly+A[1]*lh,aw=A[2]*lw,ah=A[3]*lh;
  let s=`<rect x="${lx}" y="${ly}" width="${lw}" height="${lh}" fill="${E(t.bg||'#F4F1EA')}"/>`;
  s+=artImage(workId,ax,ay,aw,ah,o,id+'a',o.shape||t.artShape);
  if(t.logo&&t.logo.src){const L=t.logo.box;s+=`<image href="${E(t.logo.src)}" x="${lx+L[0]*lw}" y="${ly+L[1]*lh}" width="${L[2]*lw}" height="${L[3]*lh}" preserveAspectRatio="xMidYMid meet"/>`}
  (t.lines||[]).forEach(l=>{if(!String(l.t||'').trim())return;const B=l.box;const fs=Math.min(B[3]*lh/.74,lh*.12),cx=lx+(B[0]+B[2]/2)*lw,by=ly+(B[1]+B[3])*lh-B[3]*lh*.06;
    const fit=B[2]>.04?`textLength="${(B[2]*lw).toFixed(2)}" lengthAdjust="spacingAndGlyphs"`:'';
    s+=`<text x="${cx.toFixed(2)}" y="${by.toFixed(2)}" text-anchor="middle" font-family="${FONT[l.f]||FONT.serif}" font-weight="${l.w||400}" font-size="${fs.toFixed(2)}" fill="${E(l.c||'#171717')}" ${fit}>${E(l.t)}</text>`});
  /* שם האמן תמיד ליד היצירה */
  const who=o.artist||(workId&&typeof work==='function'&&work(workId)?.artistN)||'';
  if(who)s+=`<text x="${ax+aw/2}" y="${ay+ah-lh*.018}" text-anchor="middle" font-family="Arial" font-size="${(lh*.026).toFixed(2)}" fill="#fff" stroke="rgba(0,0,0,.35)" stroke-width="${(lh*.004).toFixed(2)}" paint-order="stroke">ציור: ${E(who)}</text>`;
  return s+wmark(o,ax+aw/2,ay+ah/2,Math.min(aw,ah)*.2);
}
function plainBody(type,{lx,ly,lw,lh,id,workId,o}){
  const k=lw/60,ax=lx+4*k,ay=ly+6*k,aw=52*k,ah=66*k,cx=lx+lw/2;
  return `<rect x="${lx}" y="${ly}" width="${lw}" height="${lh}" fill="${(WINE[type]||WINE.red).lab}"/>${artImage(workId,ax,ay,aw,ah,o,id+'a',o.shape)}${wmark(o,cx,ay+ah*.6,11*k)}
  <text x="${cx}" y="${ly+86*k}" text-anchor="middle" font-family="${FONT.serif}" font-size="${8.5*k}" fill="#171717">${E(o.name||'')}</text>
  <text x="${cx}" y="${ly+97*k}" text-anchor="middle" font-family="Arial" font-size="${5.5*k}" fill="#444" letter-spacing=".5">${E(o.year||'')}</text>
  <text x="${cx}" y="${ly+107*k}" text-anchor="middle" font-family="Arial" font-size="${3.6*k}" fill="#666">ציור: ${E(o.artist||'ארז אהרון')}</text>`;
}
window.bottle=function(type,workId,o={}){const W=wineOf(o);if(!W||(!W.bot&&!W.tpl))return _b(type,workId,o);return draw(type,workId,o,W)};

/* ── ניתוח הצילום ── */
const PROMPT=`You are given a photo of a wine bottle or of a wine label. Find the FRONT label and describe it precisely so it can be rebuilt.
Return ONLY JSON, exactly this shape:
{"label_box":[x,y,w,h],
 "bottle":{"shape":"bordeaux|burgundy|alsace|sparkling","glass":"#rrggbb","capsule":"#rrggbb"},
 "wine":{"winery":"","series":"","varietal":"","name":"","vintage":2024,"type":"red|white|rose|sparkling|dessert|other"},
 "label":{"background":"#rrggbb","art":[x,y,w,h],"logo":[x,y,w,h],
   "lines":[{"text":"","box":[x,y,w,h],"color":"#rrggbb","font":"serif|sans","weight":400,"role":"winery|name|series|varietal|vintage|other"}]}}
Rules:
- label_box: the front label inside the photo, as fractions 0..1 of the photo width and height.
- art, logo and every line box: fractions 0..1 of the LABEL box (not of the photo). art = the main picture, illustration or texture area; null if there is none. logo = the winery emblem, null if none.
- lines: one entry per printed line, top to bottom. Copy the text EXACTLY as printed, in its own language (Hebrew stays Hebrew, with niqqud if printed). Never translate, never guess, never add text that is not printed. Skip lines you cannot read.
- box must be tight around the line's ink. weight 700 for bold, 400 otherwise. color is the ink color.
- wine.name: the wine's own name as a customer would say it, without the winery name (for example series + varietal).
- vintage: number or null. type: by glass and wine style.`;

let MODEL=null;
async function pickTextModel(){
  if(MODEL)return MODEL;const r=await gfetch('models?pageSize=1000');if(!r.ok)throw new Error('מנוע הניתוח לא זמין כרגע. כדאי לנסות שוב בעוד דקה');
  const ms=(r.data.models||[]).filter(m=>/gemini/i.test(m.name)&&(m.supportedGenerationMethods||[]).includes('generateContent')&&!/image|imagen|tts|embed|audio|live|lite|vision-only|thinking-exp/i.test(m.name)).map(m=>m.name.replace(/^models\//,''));
  const rank=m=>(/pro/i.test(m)?0:/flash/i.test(m)?1:2)-(+(m.match(/(\d+(?:\.\d+)?)/)||[0,0])[1])/10+(/preview|exp/i.test(m)?.05:0);
  if(!ms.length)throw new Error('אין כרגע מודל שיכול לקרוא תוויות');return MODEL=ms.sort((a,b)=>rank(a)-rank(b))[0];
}
async function analyze(jpeg){
  if(window.GA_LABELSCAN)return window.GA_LABELSCAN(jpeg);
  if(!(LIVE()&&typeof gfetch==='function'))throw new Error('בהדגמה אין ניתוח אוטומטי. במערכת המחוברת הצילום נקרא אוטומטית');
  const m=await pickTextModel();const data=jpeg.split(',')[1];
  const r=await gfetch(`models/${m}:generateContent`,{contents:[{parts:[{text:PROMPT},{inline_data:{mime_type:'image/jpeg',data}}]}],generationConfig:{responseMimeType:'application/json',temperature:.1}});
  if(!r.ok){const msg=r.data?.error?.message||'';throw new Error(/[֐-׿]/.test(msg)?msg:r.status===429?'אין כרגע מכסה במנוע. כדאי לנסות מאוחר יותר':'הניתוח לא הצליח ('+r.status+')')}
  const txt=((((r.data.candidates||[])[0]||{}).content||{}).parts||[]).map(p=>p.text||'').join('');
  try{return JSON.parse(txt.replace(/^```(?:json)?|```$/g,'').trim())}catch(e){throw new Error('לא הצלחנו לקרוא את התווית מהצילום. כדאי לצלם שוב, קרוב יותר ובאור טוב')}
}
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,+v||0));
const box4=b=>Array.isArray(b)&&b.length===4?[clamp(b[0]),clamp(b[1]),clamp(b[2],0,1-clamp(b[0])),clamp(b[3],0,1-clamp(b[1]))]:null;
const hex=(c,d)=>/^#[0-9a-f]{6}$/i.test(c||'')?c:d;
function nearestKey(map,h){if(!h)return null;const v=x=>[1,3,5].map(i=>parseInt(x.slice(i,i+2),16));const a=v(h);let best=null,bd=1e9;Object.entries(map).forEach(([k,[,c]])=>{const b=v(c);const d=a.reduce((s,x,i)=>s+(x-b[i])**2,0);if(d<bd){bd=d;best=k}});return best}

async function loadImage(src){const im=new Image();im.crossOrigin='anonymous';await new Promise((ok,bad)=>{im.onload=ok;im.onerror=()=>bad(new Error('לא הצלחנו לפתוח את התמונה'));im.src=src});return im}
async function fileToJpeg(file,max=1600){
  const url=URL.createObjectURL(file);try{const im=await loadImage(url);const k=Math.min(1,max/Math.max(im.naturalWidth,im.naturalHeight));
    const c=document.createElement('canvas');c.width=Math.round(im.naturalWidth*k);c.height=Math.round(im.naturalHeight*k);const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(im,0,0,c.width,c.height);
    return {jpeg:c.toDataURL('image/jpeg',.88),w:c.width,h:c.height}}finally{URL.revokeObjectURL(url)}
}
/* הלוגו נגזר מהצילום, והרקע של התווית נעשה שקוף */
async function cutLogo(jpeg,W,H,lb,box,bg){
  const im=await loadImage(jpeg);const x=(lb[0]+box[0]*lb[2])*W,y=(lb[1]+box[1]*lb[3])*H,w=box[2]*lb[2]*W,h=box[3]*lb[3]*H;
  if(w<4||h<4)return null;const k=Math.min(1,400/Math.max(w,h));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*k));c.height=Math.max(1,Math.round(h*k));
  const g=c.getContext('2d');g.drawImage(im,x,y,w,h,0,0,c.width,c.height);
  try{const d=g.getImageData(0,0,c.width,c.height),p=d.data,B=[1,3,5].map(i=>parseInt((bg||'#ffffff').slice(i,i+2),16));
    for(let i=0;i<p.length;i+=4){const dist=Math.abs(p[i]-B[0])+Math.abs(p[i+1]-B[1])+Math.abs(p[i+2]-B[2]);p[i+3]=Math.max(0,Math.min(255,(dist-60)*2.2))}g.putImageData(d,0,0)}catch(e){}
  return c.toDataURL('image/png');
}
async function toTemplate(a,shot){
  const lb=box4(a.label_box)||[0,0,1,1],L=a.label||{},bg=hex(L.background,'#F4F1EA');
  const aspect=(lb[2]*shot.w)/(Math.max(1,lb[3]*shot.h));
  const logoBox=box4(L.logo);
  const tpl={v:1,aspect:+aspect.toFixed(4),bg,art:box4(L.art)||[0,0,1,.32],
    logo:logoBox?{box:logoBox,src:await cutLogo(shot.jpeg,shot.w,shot.h,lb,logoBox,bg)}:null,
    lines:(L.lines||[]).filter(l=>l&&String(l.text||'').trim()&&box4(l.box)).slice(0,14).map(l=>({t:String(l.text).trim().slice(0,80),box:box4(l.box),c:hex(l.color,'#171717'),f:l.font==='sans'?'sans':'serif',w:+l.weight>=600?700:400,r:l.role||'other'}))};
  if(tpl.logo&&!tpl.logo.src)tpl.logo=null;
  const b=a.bottle||{},w=a.wine||{};
  const bot={shape:SHAPES[b.shape]?b.shape:'bordeaux',glass:hex(b.glass,null)||GLASS.dark[1],cap:hex(b.capsule,null)||CAPS.black[1]};
  const name=String(w.name||[w.series,w.varietal].filter(Boolean).join(' ')||'').trim().slice(0,80);
  const type=['red','white','rose'].includes(w.type)?w.type:'red';
  return {tpl,bot,wine:{winery:String(w.winery||'').trim(),n:name,y:+w.vintage||'',type},lb};
}

/* ── המסך: מצלמים, בודקים, שומרים ── */
const firstWork=()=>((S.works||[]).find(w=>w.st==='live')||(S.works||[])[0]||{}).id;
function preview(st){const fake={n:st.wine.n,bot:st.bot,tpl:st.tpl};return window.bottle(st.wine.type||'red',firstWork(),{_W:fake,wm:true,big:true})}
function overlay(st){if(!st.shot)return '';const lb=st.lb,R=(b,c)=>`<rect x="${(lb[0]+b[0]*lb[2])*100}" y="${(lb[1]+b[1]*lb[3])*100}" width="${b[2]*lb[2]*100}" height="${b[3]*lb[3]*100}" fill="none" stroke="${c}" stroke-width=".6" vector-effect="non-scaling-stroke"/>`;
  return `<div style="position:relative;max-width:220px;margin:0 auto"><img src="${st.shot.jpeg}" alt="הצילום שהעלית" style="display:block;width:100%;border-radius:10px"><svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%" aria-hidden="true">
  <rect x="${lb[0]*100}" y="${lb[1]*100}" width="${lb[2]*100}" height="${lb[3]*100}" fill="none" stroke="#171717" stroke-width="1.2" vector-effect="non-scaling-stroke" stroke-dasharray="4 3"/>${R(st.tpl.art,'#C0392B')}${st.tpl.logo?R(st.tpl.logo.box,'#2E6BD8'):''}${st.tpl.lines.map(l=>R(l.box,'#2E8B57')).join('')}</svg></div>
  <p class="note" style="text-align:center;margin-top:6px"><span style="color:#C0392B">■</span> אזור הציור &nbsp; <span style="color:#2E6BD8">■</span> לוגו &nbsp; <span style="color:#2E8B57">■</span> מלל</p>`}
function sw(map,key,cur,act){return `<div class="chips">${Object.entries(map).map(([k,[n,c]])=>`<button class="chip" data-a="${act}" data-v="${k}" aria-pressed="${cur===c||cur===k}" title="${n}"><span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${c};border:1px solid rgba(0,0,0,.25);vertical-align:-2px;margin-inline-end:6px"></span>${n}</button>`).join('')}</div>`}
function review(){
  const st=S._ls;if(!st)return;const org=LIVE()?(ME.orgName||''):(typeof MYW==='function'?MYW():'');
  const other=st.wine.winery&&org&&!st.wine.winery.includes(org)&&!org.includes(st.wine.winery);
  sheet(`<span class="eyebrow">${st.wid?'התווית של היין':'יין חדש מצילום'}</span><h2>${E(st.wine.n||'היין מהצילום')}</h2>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start;margin-top:8px"><div class="lsprev" style="width:100%;max-width:170px;margin:0 auto">${preview(st)}</div><div>${overlay(st)||'<p class="note">אין צילום. אפשר לצלם בכל רגע</p>'}</div></div>
  <p class="note">כך הציור של האמן ייכנס לתווית של היקב. כל המלל, הלוגו והצבעים נשארים כמו בתווית המקורית.</p>
  ${other?`<div class="panel" style="font-size:14.5px;margin-top:8px">בתווית כתוב <b>${E(st.wine.winery)}</b>, והחשבון הוא של <b>${E(org)}</b>. כדאי לוודא שזה היין הנכון.</div>`:''}
  <h3>היין</h3>
  <div class="fld"><label for="lsn">שם היין</label><input id="lsn" value="${E(st.wine.n)}"></div>
  <div class="two"><div class="fld"><label for="lsy">בציר</label><input id="lsy" inputmode="numeric" value="${E(st.wine.y)}"></div><div class="fld"><label for="lsq">כמות בקבוקים</label><input id="lsq" inputmode="numeric" placeholder="3,000" value="${E(st.wine.q||'')}"></div></div>
  <div class="fld"><label for="lst">סוג</label><select id="lst">${['red','white','rose'].map(k=>`<option value="${k}" ${st.wine.type===k?'selected':''}>${WINE[k].n}</option>`).join('')}</select></div>
  <h3>המלל בתווית</h3><p class="note" style="margin-top:0">כפי שנקרא מהצילום. אפשר לתקן כל שורה.</p>
  ${st.tpl.lines.map((l,i)=>`<div class="fld" style="display:flex;gap:6px;align-items:center"><input id="lsl${i}" value="${E(l.t)}" aria-label="שורה ${i+1}" style="flex:1;font-weight:${l.w}"><button class="ib" data-a="lsdel" data-v="${i}" aria-label="למחוק את השורה">✕</button></div>`).join('')||'<p class="note">לא נמצא מלל</p>'}
  <h3>אזור הציור</h3><div class="fld"><label for="lsah">גובה האזור, ${Math.round(st.tpl.art[3]*100)}% מהתווית</label><input id="lsah" type="range" min="15" max="100" value="${Math.round(st.tpl.art[3]*100)}" data-in="lsah"></div>
  <div class="chips">${[['top','למעלה'],['bottom','למטה']].map(([k,n])=>`<button class="chip" data-a="lsapos" data-v="${k}" aria-pressed="${(st.tpl.art[1]<.01)===(k==='top')}">${n}</button>`).join('')}</div>
  <h3>הבקבוק</h3><div class="chips">${Object.entries(SHAPES).map(([k,s])=>`<button class="chip" data-a="lsshape" data-v="${k}" aria-pressed="${st.bot.shape===k}">${s.n}</button>`).join('')}</div>
  <div class="fld"><label>צבע הזכוכית</label>${sw(GLASS,'glass',st.bot.glass,'lsglass')}</div>
  <div class="fld"><label>הקפסולה</label>${sw(CAPS,'cap',st.bot.cap,'lscap')}</div>
  <div class="fld"><label for="lsbg">צבע התווית</label><input id="lsbg" type="color" value="${E(st.tpl.bg)}" data-in="lsbg" style="height:44px;width:100%"></div>
  <p class="note" id="lserr" role="alert" style="color:#9B2C2C"></p>
  <div class="row" style="margin-top:12px"><button class="btn alt" data-a="lspick">לצלם שוב</button><button class="btn" data-a="lssave">${st.wid?'לשמור':'להוסיף את היין'}</button></div>
  <input type="file" id="lsfile" accept="image/*" hidden>`);
}
function readForm(){const st=S._ls;if(!st)return;const v=id=>document.getElementById(id);
  if(v('lsn'))st.wine.n=v('lsn').value.trim();if(v('lsy'))st.wine.y=+v('lsy').value.replace(/\D/g,'')||'';if(v('lsq'))st.wine.q=+v('lsq').value.replace(/\D/g,'')||'';if(v('lst'))st.wine.type=v('lst').value;
  st.tpl.lines.forEach((l,i)=>{const x=v('lsl'+i);if(x)l.t=x.value})}
function pick(){let f=document.getElementById('lsfile');if(!f){f=document.createElement('input');f.type='file';f.accept='image/*';f.id='lsfile';f.hidden=true;document.body.appendChild(f)}
  f.value='';f.onchange=()=>{const file=f.files&&f.files[0];if(file)scan(file)};f.click()}
async function scan(file){
  const keep=S._ls;readForm();
  sheet(`<span class="eyebrow">קוראים את התווית</span><h2>רגע…</h2><div class="lv-spin" role="status" aria-label="טוען" style="margin:24px auto"></div><p class="note" style="text-align:center">מזהים את המלל, הלוגו, הצבעים והחלוקה לאזורים</p>`);
  try{
    const shot=await fileToJpeg(file);const a=await analyze(shot.jpeg);const r=await toTemplate(a,shot);
    const base=keep&&keep.wid?keep:{wid:null};
    const match=!base.wid&&(S.wines||[]).find(w=>w.n===r.wine.n&&String(w.y)===String(r.wine.y));
    S._ls={wid:base.wid||match?.id||null,shot,lb:r.lb,tpl:r.tpl,bot:r.bot,wine:{...r.wine,q:(match||wineById(base.wid)||{}).q||''}};
    if(match)T('היין הזה כבר ברשימה. התווית שלו תתעדכן');
    review();
  }catch(e){console.error(e);S._ls=keep;sheet(`<h2>לא הצלחנו לקרוא את הצילום</h2><p class="lead">${E(e.message||'')}</p><p class="note">טיפ: מצלמים את הבקבוק ישר מקדימה, באור יום, כשהתווית ממלאת את רוב התמונה.</p><div class="row" style="margin-top:12px"><button class="btn alt" data-a="close">סגירה</button><button class="btn" data-a="lspick">לנסות שוב</button></div>`)}
}
async function save(){
  readForm();const st=S._ls,err=t=>{const e=document.getElementById('lserr');if(e)e.textContent=t;T(t)};
  if(!st.wine.n)return err('צריך שם ליין');if(!st.wine.y||st.wine.y<1900||st.wine.y>2100)return err('צריך שנת בציר');
  if(!st.wid&&!st.wine.q)return err('צריך כמות בקבוקים');
  st.tpl.lines=st.tpl.lines.filter(l=>String(l.t).trim());
  const tpl=st.tpl,bot=st.bot;
  if(!LIVE()){
    let w=wineById(st.wid);if(w)Object.assign(w,{n:st.wine.n,y:st.wine.y,type:st.wine.type,bot,tpl});
    else{w={id:Math.max(0,...(S.wines||[]).map(x=>+x.id||0))+1,n:st.wine.n,y:st.wine.y,type:st.wine.type,q:st.wine.q,bot,tpl};S.wines.push(w)}
    S._ls=null;closeSheet();T(st.wid?'התווית נשמרה':'היין נוסף עם התווית של היקב');try{save_()}catch(e){}render();return;
  }
  if(!ME.orgId||!['winery','admin'].includes(ME.role))return err('רק יקב יכול להוסיף יין');
  const row={name:st.wine.n,vintage:st.wine.y,type:st.wine.type,bottle:bot,label_tpl:tpl};
  const sz=JSON.stringify(tpl).length;if(sz>550000)return err('הלוגו גדול מדי. כדאי לצלם שוב קרוב יותר לתווית');
  closeSheet();const wid=st.wid;S._ls=null;
  run(async()=>{if(wid)await q(sb.from('wines').update(row).eq('id',wid));else{const r=await q(sb.from('wines').insert({...row,winery_id:ME.orgId,bottles:st.wine.q}).select('id').single());S.activeWine=r.id}},wid?'התווית נשמרה':'היין נוסף עם התווית של היקב');
}
function save_(){if(typeof window.save==='function')window.save()}
function openWine(id){const w=wineById(id);if(!w)return;
  S._ls={wid:w.id,shot:null,lb:[0,0,1,1],tpl:JSON.parse(JSON.stringify(w.tpl||{v:1,aspect:.6,bg:(WINE[w.type]||WINE.red).lab,art:[0,0,1,.55],logo:null,lines:[{t:w.n,box:[.1,.66,.8,.08],c:'#171717',f:'serif',w:700},{t:String(w.y||''),box:[.4,.78,.2,.05],c:'#444',f:'sans',w:400}]})),
    bot:{shape:'burgundy',glass:(WINE[w.type]||WINE.red).glass,cap:CAPS.black[1],...(w.bot||{})},wine:{n:w.n,y:w.y,type:w.type,q:w.q,winery:''}};review()}

Object.assign(A,{
  lscan(){S._ls=null;pick()},
  lspick(){pick()},
  lwine:v=>openWine(v),
  lsdel(v){readForm();S._ls.tpl.lines.splice(+v,1);review()},
  lsapos(v){readForm();const a=S._ls.tpl.art;a[1]=v==='top'?0:+(1-a[3]).toFixed(3);review()},
  lsshape(v){readForm();S._ls.bot.shape=v;review()},
  lsglass(v){readForm();S._ls.bot.glass=GLASS[v][1];review()},
  lscap(v){readForm();S._ls.bot.cap=CAPS[v][1];review()},
  lssave(){save()}
});
document.addEventListener('input',e=>{const st=S._ls;if(!st)return;
  if(e.target.id==='lsah'){const a=st.tpl.art,top=a[1]<.01;a[3]=+e.target.value/100;if(!top)a[1]=+(1-a[3]).toFixed(3);const p=document.querySelector('.lsprev');if(p)p.innerHTML=preview(st);const lb=e.target.previousElementSibling;if(lb)lb.textContent=`גובה האזור, ${e.target.value}% מהתווית`}
  if(e.target.id==='lsbg'){st.tpl.bg=e.target.value;const p=document.querySelector('.lsprev');if(p)p.innerHTML=preview(st)}});

/* ── רשימת היינות במסך "היקב": תמונה של הבקבוק, ולחיצה פותחת את התווית ── */
function list(){const wk=firstWork();
  return `<div class="list">${(S.wines||[]).map(w=>`<button class="li" data-a="lwine" data-v="${w.id}"><span style="width:22px;height:70px;flex:none;display:block">${window.bottle(w.type,wk,{wid:w.id,flat:false})}</span><span class="mt"><b>${E(w.n)} ${E(w.y)}</b><small>${(WINE[w.type]||WINE.red).n} · <span class="num">${(+w.q||0).toLocaleString('en-US')}</span> בקבוקים · ${w.tpl?'התווית של היקב':'תווית בסיסית'}</small></span></button>`).join('')||'<p class="note">עוד אין יינות</p>'}</div>
  <button class="btn wide" style="margin-top:10px" data-a="lscan">להוסיף יין מצילום של הבקבוק או התווית</button>`}
function wrap(){const W=V.winery_more;if(!W||W._ls)return;
  V.winery_more=function(){const h=W.apply(this,arguments);return h.replace(/(<h3>היינות[^<]*<\/h3>)[\s\S]*?(<button class="btn alt wide" style="margin-top:10px" data-a="addwine">)/,(m,a,b)=>a+list()+b)};V.winery_more._ls=1}
wrap();document.addEventListener('DOMContentLoaded',()=>{wrap()});

window.GALabels={SHAPES,GLASS,CAPS,draw,toTemplate,analyze,wineOf,wrap};
})();
