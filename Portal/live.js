/* סדנת התווית · שכבת החיבור ל־Supabase
   נטען רק כשקיים config.js וכתובת האתר אינה ?demo.
   האב־טיפוס נשאר כמו שהוא; כאן מחליפים את מקור הנתונים ואת הפעולות. */
'use strict';
(function(){
const sb=supabase.createClient(window.SB_URL,window.SB_KEY,{auth:{detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}});
window.SB=sb;window.liveHydrate=()=>hydrate();
const LV={state:'boot',email:'',err:'',cool:0};
const one=x=>Array.isArray(x)?x[0]:x;
const tm=t=>t?new Date(t).toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'}):'';
const dt=t=>t?String(t).slice(0,10):'';
async function q(p){const {data,error}=await p;if(error)throw error;return data}
const ROLE_N={winery:'יקב',artist:'אמן',gallery:'גלריה',curator:'אוצר',printer:'שותף דפוס',admin:'מנהל מערכת'};
const ORG_N={winery:'יקב',gallery:'גלריה',printer:'בית דפוס',curator:'אוצרות',admin:'הפלטפורמה'};

function heb(e){
  const m=String(e?.message||e||'');
  if(/rate limit|only request this after|security purposes/i.test(m))return 'נשלחו כבר כמה קישורים. כדאי לחכות דקה ולנסות שוב';
  if(/expired|invalid.*(link|token)|otp/i.test(m))return 'הקישור פג או כבר נוצל. אפשר לבקש קישור חדש';
  if(/Failed to fetch|NetworkError|network/i.test(m))return 'אין חיבור לשרת. כדאי לבדוק את האינטרנט ולנסות שוב';
  if(/row-level security|permission denied/i.test(m))return 'אין הרשאה לפעולה הזו';
  if(/[֐-׿]/.test(m))return m;
  return 'משהו לא הצליח. אפשר לנסות שוב';
}

/* ── UI state that stays in the browser ── */
window.liveSave=function(){try{localStorage.setItem('wl-live-ui',JSON.stringify({seen:S.seen,read:S.read,f:S.f,activeWine:S.activeWine}))}catch(e){}};
Object.assign(S,{works:[],wines:[],designs:[],deals:[],apps:[],renderQ:[],log:[],users:[],role:null,tab:null,view:null,pre:false,restrict:{},renders:0});
try{const o=JSON.parse(localStorage.getItem('wl-live-ui')||'null');if(o)Object.assign(S,o)}catch(e){}
document.head.insertAdjacentHTML('beforeend','<style>.demobadge{display:none}.lv-spin{width:28px;height:28px;border:2px solid var(--line);border-top-color:var(--ink);border-radius:50%;animation:lvs .8s linear infinite;margin:40px auto}@keyframes lvs{to{transform:rotate(360deg)}}.lv-sel{width:100%;min-height:48px;border:1px solid var(--line);border-radius:10px;background:var(--surface);padding:0 12px}</style>');

/* ── async runner ── */
let busy=false;
async function run(fn,ok){
  if(busy)return;busy=true;
  try{await fn();await window.liveHydrate();render();if(ok)toast(ok)}
  catch(e){console.error(e);toast(heb(e));if(/בינתיים/.test(e?.message||''))window.liveHydrate().then(render)}
  finally{busy=false}
}
const rpc=(fn,args)=>q(sb.rpc(fn,args));
const adv=(id,action,adj=0,note=null)=>rpc('advance_deal',{p_deal:+id,p_action:action,p_adj:adj,p_note:note,p_version:S.deals.find(d=>d.id===+id)?.ver??null});

/* ── screens before the app ── */
function vLive(){
  if(LV.state==='boot')return `<div class="login"><div class="lv-spin" role="status" aria-label="טוען"></div></div>`;
  if(LV.state==='login')return `<div class="login"><span class="eyebrow">אמנות אמיתית על בקבוק</span><h1>סדנת התווית</h1><p class="lead">שוק אצור שבו יקבים בוחרים ציורים של אמנים, רואים את הבקבוק המוגמר וסוגרים רישיון במקום אחד.</p>
    ${LV.err?`<div class="panel" style="margin-top:8px;font-size:14.5px">${esc(LV.err)}</div>`:''}
    ${Y()?`<div class="panel" style="margin-top:8px;font-size:14.5px">נכנסים כדי לעצב בקבוק אישי מהיקב.</div>`:''}
    <div class="fld" id="lemf"><label for="lem">דוא״ל</label><input id="lem" type="email" inputmode="email" autocomplete="email" dir="ltr" placeholder="name@example.com" value="${esc(LV.email)}"><span class="err" id="lemerr" hidden>צריך כתובת דוא״ל תקינה</span></div>
    <div class="fld" id="lpwf"><label for="lpw">סיסמה</label><input id="lpw" type="password" autocomplete="current-password" dir="ltr" placeholder="לפחות 8 תווים"><span class="err" id="lpwerr" hidden>צריך סיסמה של 8 תווים לפחות</span></div>
    <div class="row" style="margin-top:14px"><button class="btn alt" data-a="lup">חשבון חדש</button><button class="btn" data-a="lin">להיכנס</button></div>
    <p class="note" style="text-align:center;margin-top:18px">פתיחת חשבון היא הסכמה <a href="privacy.html" style="color:inherit">לתנאי השימוש ולמדיניות הפרטיות</a> · <a href="accessibility.html" style="color:inherit">נגישות</a></p>
    <p class="note">בפעם הראשונה בוחרים "חשבון חדש" עם סיסמה שבוחרים עכשיו. בפעמים הבאות נכנסים עם אותה סיסמה.</p>
    <button class="link" data-a="lsend">לקבל קישור כניסה במייל במקום סיסמה</button></div>`;
  if(LV.state==='sent')return `<div class="login"><span class="eyebrow">כמעט שם</span><h1>בדוק את המייל</h1><p class="lead">שלחנו קישור כניסה ל־<span class="num">${esc(LV.email)}</span>. כדאי לפתוח אותו בטלפון הזה וללחוץ על הקישור. אם המייל לא מגיע תוך דקה, כדאי לבדוק גם בתיקיית הספאם.</p>
    <div class="row" style="justify-content:space-between;margin-top:18px"><button class="link" data-a="lchange">לשנות כתובת</button><button class="link" data-a="lsend">לשלוח שוב</button></div></div>`;
  if(LV.state==='pending')return `<div class="login"><span class="eyebrow">החשבון נוצר</span><h1>ממתין לאישור</h1><p class="lead">נכנסת בהצלחה עם <span class="num">${esc(ME?.email||'')}</span>. ${ME?.status==='blocked'?'החשבון הזה מושהה. לבירור אפשר לפנות למנהל המערכת.':'מנהל המערכת צריך לשייך את החשבון לתפקיד ולארגון. אחרי זה המערכת תיפתח כאן.'}</p>
    <div class="row" style="margin-top:18px"><button class="btn alt" data-a="lrecheck">לבדוק שוב</button><button class="btn alt" data-a="logout">להתנתק</button></div></div>`;
  return `<div class="login"><h1>משהו לא הצליח</h1><p class="lead">${esc(LV.err)}</p><button class="btn wide" data-a="lrecheck">לנסות שוב</button></div>`;
}
const _render=render;
render=function(){if(LV.state!=='ready'){document.getElementById('app').innerHTML=vLive();document.body.classList.remove('hasbar');return}_render()};

Object.assign(A,{
  async lsend(){
    const i=document.getElementById('lem');const em=(i?i.value:LV.email).trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){document.getElementById('lemf')?.classList.add('bad');const er=document.getElementById('lemerr');if(er)er.hidden=false;i?.focus();return}
    if(Date.now()<LV.cool){toast('אפשר לשלוח שוב בעוד דקה');return}
    LV.email=em;LV.err='';
    const {error}=await sb.auth.signInWithOtp({email:em,options:{emailRedirectTo:location.origin+location.pathname,shouldCreateUser:true}});
    if(error){toast(heb(error));return}
    LV.cool=Date.now()+60000;LV.state='sent';render();
  },
  async lin(){const c=creds();if(!c)return;
    /* אחרי חמישה ניסיונות שגויים מחכים דקה. ההגנה העיקרית היא בהגדרות Supabase */
    const L=JSON.parse(localStorage.getItem('wl-lk')||'{"n":0,"t":0}');if(L.n>=5&&Date.now()-L.t<60000){toast('היו כמה ניסיונות שגויים. אפשר לנסות שוב בעוד דקה');return}
    if(window.TURNSTILE_SITEKEY&&!window.__cap){toast('רגע, בודקים שאת או אתה לא רובוט');return}
    const {data,error}=await sb.auth.signInWithPassword({...c,options:window.__cap?{captchaToken:window.__cap}:undefined});window.capReset&&capReset();
    try{localStorage.setItem('wl-lk',JSON.stringify(error?{n:(L.n>=5?0:L.n)+1,t:Date.now()}:{n:0,t:0}))}catch(e){}
    if(error){toast(/invalid login/i.test(error.message)?'המייל או הסיסמה לא נכונים':heb(error));return}LV.state='boot';render();await loadMe(data.user)},
  async lup(){const c=creds();if(!c)return;if(window.TURNSTILE_SITEKEY&&!window.__cap){toast('רגע, בודקים שאת או אתה לא רובוט');return}const {data,error}=await sb.auth.signUp({...c,options:{emailRedirectTo:location.origin+location.pathname+location.search,...(window.__cap?{captchaToken:window.__cap}:{})}});window.capReset&&capReset();
    if(error){toast(/already registered/i.test(error.message)?'כבר יש חשבון עם המייל הזה. אפשר להיכנס':heb(error));return}
    if(!data.session){LV.email=c.email;LV.state='sent';render();return}
    LV.state='boot';render();await loadMe(data.user)},
  lchange(){LV.state='login';render();setTimeout(()=>document.getElementById('lem')?.focus(),50)},
  async lrecheck(){LV.state='boot';render();const {data:{session}}=await sb.auth.getSession();if(!session){LV.state='login';render();return}await loadMe(session.user)},
  async logout(){await sb.auth.signOut();window.ME=null;S.role=null;S.view=null;closeSheet();LV.state='login';history.replaceState(null,'',location.pathname);render()},
  role(v){if(ME?.role!=='admin'&&v!==ME?.role)return;S.role=v;S.view=null;S.tab=TABS[v][0][0];if(S.sheetOpen){S.pending='tab-'+S.tab;closeSheet()}else go('tab-'+S.tab);afterRole()},
  reset(){A.logout()}
});
function creds(){const em=(document.getElementById('lem')?.value||'').trim().toLowerCase(),pw=document.getElementById('lpw')?.value||'';let ok=true;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){document.getElementById('lemf')?.classList.add('bad');document.getElementById('lemerr').hidden=false;ok=false}
  if(pw.length<8){document.getElementById('lpwf')?.classList.add('bad');document.getElementById('lpwerr').hidden=false;ok=false}
  if(!ok)return null;LV.email=em;return {email:em,password:pw}}
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.target.id==='lem'||e.target.id==='lpw'))A.lin()});
/* the winery's customer link: ?y=<slug> */
const YK='wl-y';try{const y=new URLSearchParams(location.search).get('y');if(y)localStorage.setItem(YK,y)}catch(e){}
function Y(){try{return localStorage.getItem(YK)||''}catch(e){return ''}}
/* קישור הצטרפות לארגון: ?j=<token> */
const JK='wl-j';try{const j=new URLSearchParams(location.search).get('j');if(j)localStorage.setItem(JK,j)}catch(e){}
function J(){try{return localStorage.getItem(JK)||''}catch(e){return ''}}

/* ── identity ── */
async function loadMe(user){
  try{
    const p=await q(sb.from('profiles').select('*, org:organizations(id,name,kind)').eq('id',user.id).maybeSingle());
    if(p&&!p.role&&p.status==='pending'&&J()){const ok=await q(sb.rpc('join_org',{p_token:J()}));try{localStorage.removeItem(JK)}catch(e){}if(ok)return loadMe(user)}
    if(p&&!p.role&&p.status==='pending'&&Y()){const ok=await q(sb.rpc('join_as_customer',{p_slug:Y()}));if(ok)return loadMe(user)}
    if(!p||p.status!=='active'||!p.role){window.ME={id:user.id,email:user.email,status:p?.status};LV.state='pending';render();return}
    const a=await q(sb.from('artists').select('*').eq('user_id',user.id).maybeSingle());
    window.ME={id:user.id,email:user.email,role:p.role,name:p.full_name||user.email.split('@')[0],orgId:p.org_id,orgName:p.org?.name||'',artist:a};
    const first=ME.name.split(' ')[0];
    const r=ROLES[ME.role];r.p=ME.name;r.who=ME.role==='artist'?(a?.name||ME.name):(ME.orgName||r.who);r.hi='שלום, '+first;r.u=ME.name.replace(/[^\p{L} ]/gu,'').split(' ').map(x=>x[0]).join('').slice(0,2)||'?';
    if(a){ROLES.artist.who=a.name;ROLES.artist.p=a.name}
    if(ME.role==='customer'){r.who='דרך '+(ME.orgName||'היקב');ROLES.winery.who=ME.orgName}
    await window.liveHydrate();
    LV.state='ready';S.role=ME.role;S.view=null;S.tab=TABS[S.role][0][0];
    if(location.hash==='#tab-'+S.tab)render();else location.hash='tab-'+S.tab;
    afterRole();
  }catch(e){console.error(e);LV.state='error';LV.err=heb(e);render()}
}

/* ── load everything this user is allowed to see ── */
async function hydrate(){
  const R=ME.role,adm=R==='admin';
  const [st,artists,works,wines,designs,deals]=await Promise.all([
    q(sb.from('settings').select('*').eq('id',1).maybeSingle()),
    q(sb.from('artists').select('*')),
    q(sb.from('works').select('*').order('id')),
    q(sb.from('wines').select('*').order('id')),
    q(sb.from('designs').select('*')),
    q(sb.from('deals').select('*, winery:organizations!deals_winery_id_fkey(name), gallery:organizations!deals_gallery_id_fkey(name), wine:wines(name,vintage,type), invoices(number,total), print_orders(stage,qty,due), deal_messages(sender_role,body,created_at)').order('id',{ascending:false}))
  ]);
  if(st){S.comm=+st.comm_pct;S.commDraft=S.comm;S.quota=st.render_quota;S.artistShare=+st.artist_share}
  const AR={};(artists||[]).forEach(a=>AR[a.id]=a);S._artists=AR;S.pre=!!(artists||[]).find(a=>a.user_id===ME.id)?.pre_consent;
  const me=ME.artist?AR[ME.artist.id]||ME.artist:(artists||[])[0];
  S.floor=+(me?.floor_price||2500);S.bio=me?.bio||'';S.country=me?.country||'ישראל';S.restrict={};(me?.restrict_tags||[]).forEach(k=>S.restrict[k]=true);
  /* תמונות: קובץ המקור פרטי. מי שמורשה מקבל קישור חתום; כל השאר רואים תצוגה מקדימה עם סימן מים */
  const paths=(works||[]).map(w=>w.image_path).filter(x=>x&&!/^https?:/.test(x));let urls={},full={};
  (works||[]).forEach(w=>{if(/^https?:/.test(w.image_path||''))urls[w.image_path]=full[w.image_path]=w.image_path;
    if(w.preview_path)urls['p:'+w.id]=sb.storage.from('previews').getPublicUrl(w.preview_path).data.publicUrl;
    if(w.thumb_path)urls['t:'+w.id]=sb.storage.from('previews').getPublicUrl(w.thumb_path).data.publicUrl});
  if(paths.length){try{const {data:r}=await sb.storage.from('works').createSignedUrls(paths,3600);(r||[]).forEach(x=>{if(x.signedUrl&&!x.error)full[x.path]=x.signedUrl})}catch(e){console.warn(e)}}
  (works||[]).forEach(w=>{urls[w.image_path]=urls['p:'+w.id]||full[w.image_path]||urls[w.image_path]});
  S.works=(works||[]).map(w=>({rej:false,id:w.id,t:w.title,tag:w.tag||'אחר',tone:w.tone||'—',st:w.status==='paused'?'live':w.status==='rejected'?'pending':w.status,rej:w.status==='rejected',note:w.review_note,av:w.available&&w.status!=='paused',pick:w.pick_rank||0,y:w.year,sz:w.size||'',tech:w.technique||'',orig:w.orig_status||'',cells:w.no_crop||{},phash:w.phash||null,rights:!!(w.rights_ok&&w.rights_commission_ok),src:urls[w.image_path]||BLANK,full:full[w.image_path]||null,thumb:urls['t:'+w.id]||null,path:w.image_path,prev:w.preview_path,artist:w.artist_id,artistN:AR[w.artist_id]?.name}));
  S.wines=(wines||[]).map(w=>({id:w.id,n:w.name,y:w.vintage||'',type:WINE[w.type]?w.type:'red',q:w.bottles||0,org:w.winery_id}));
  if(!S.wines.some(w=>w.id===S.activeWine))S.activeWine=S.wines[0]?.id;
  S.designs=(designs||[]).map(d=>({code:d.code,wine:d.wine_id,work:d.work_id,pos:d.pos,zoom:d.zoom,shape:d.layout?.shape}));
  S.deals=(deals||[]).map(d=>{const inv=one(d.invoices),o=one(d.print_orders),wi=d.wine;return {
    id:d.id,ver:d.version,wid:d.winery_id,lr:d.label_round,okw:d.label_ok_w,oka:d.label_ok_a,ended:d.status==='active'&&!!d.ends_at&&d.ends_at<new Date().toISOString().slice(0,10),winery:d.winery?.name||'',galleryN:d.gallery?.name||'',artistN:AR[d.artist_id]?.name||'',fl:+(AR[d.artist_id]?.floor_price||S.floor),aid:d.artist_id,share:d.artist_pct!=null?+d.artist_pct:null,
    wineN:d.wine_label||(wi?`${wi.name} ${wi.vintage||''}`.trim():''),type:WINE[wi?.type]?wi.type:'red',work:d.work_id,lt:d.license_type,q:d.qty_tier,ex:d.exclusive,
    st:d.status==='cancelled'?'rejected':d.status,adj:d.adj_pct,code:d.design_code||'—',note:d.status==='rejected'||d.status==='cancelled'?'':d.note,reason:d.status==='rejected'||d.status==='cancelled'?(d.note||(d.status==='cancelled'?'בוטלה':'')):'',
    paid:dt(d.paid_at),ends:dt(d.ends_at),inv:inv?.number||'',order:o?{st:o.stage,qty:o.qty,due:dt(o.due)}:null,
    chat:(d.deal_messages||[]).sort((a,b)=>a.created_at.localeCompare(b.created_at)).map(m=>({w:m.sender_role||'sys',t:m.body,at:tm(m.created_at)}))}});
  S.deals.forEach(d=>{if(!S.works.some(w=>w.id===d.work))S.works.push({id:d.work,t:'יצירה',tag:'',st:'hidden',av:false,cells:{},src:BLANK})});
  /* organizations: names, details, pricing */
  const orgs=await q(sb.from('organizations').select('*'));S._orgL=orgs;S._orgN={};S._orgLabel={};orgs.forEach(o=>{S._orgN[o.id]=o.name;if(o.pricing?.label)S._orgLabel[o.id]=o.pricing.label});
  const mo=orgs.find(o=>o.id===ME.orgId);S._myOrg=mo||null;
  S.wset={prices:{},caseDisc:5,t1:24,d1:10,t2:60,d2:15,foil:6,emboss:4,shape:{rect:0,oval:2,arch:3},artist:{},min:1,...(mo?.pricing||{}),link:mo?.slug||''};
  S.wset.shape={rect:0,oval:2,arch:3,...(S.wset.shape||{})};
  /* artists: faces, stories, sizes */
  S._faces={};const fp=(artists||[]).filter(a=>a.face_path);
  if(fp.length){try{const r=await q(sb.storage.from('works').createSignedUrls(fp.map(a=>a.face_path),3600));r.forEach((x,i)=>{if(x.signedUrl)S._faces[fp[i].id]=x.signedUrl})}catch(e){}}
  const meA=ME.artist&&AR[ME.artist.id];S.face=meA?S._faces[meA.id]||null:null;
  S.stories={};(works||[]).forEach(w=>{if(w.story)S.stories[w.id]=w.story});
  S._px={};(works||[]).forEach(w=>{if(w.px_w)S._px[w.id]=[w.px_w,w.px_h]});
  /* customer orders */
  const co=await q(sb.from('customer_orders').select('*').order('id',{ascending:false}));
  S.corders=co.map(o=>({id:o.id,ver:o.version,wid:o.winery_id,lr:o.label_round,okw:o.label_ok_w,oka:o.label_ok_a,at:dt(o.created_at),cust:o.cust||{},d:o.design,wv:o.winery_design,wnote:o.winery_note,st:o.status,paid:dt(o.paid_at),winery:S._orgN[o.winery_id]||'',log:(o.log||[]).map(l=>({t:l.t,at:tm(l.at)}))}));
  S._rurl=S._rurl||{};const rp=[...new Set(co.flatMap(o=>[o.design?.render,o.winery_design?.render]).filter(x=>x&&!S._rurl[x]))];
  if(rp.length){try{const r=await q(sb.storage.from('renders').createSignedUrls(rp,3600));r.forEach(x=>{if(x.signedUrl)S._rurl[x.path]=x.signedUrl})}catch(e){}}
  /* notifications and my organization's people */
  S._notifs=await q(sb.from('notifications').select('*').order('id',{ascending:false}).limit(50));
  S._orgUsers=ME.orgId?await q(sb.from('profiles').select('id,full_name,email,role').eq('org_id',ME.orgId).neq('role','customer')):[];
  if(adm){try{const {count}=await sb.from('renders').select('id',{count:'exact',head:true}).gte('created_at',new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString());S.renders=count||0}catch(e){}}
  if(adm||R==='curator'){
    const ap=await q(sb.from('applications').select('*').order('id',{ascending:false}));
    S.apps=ap.map(a=>({id:a.id,n:a.name,d:a.details||'',site:a.site||'',why:a.why||'',st:a.status==='approved'?'ok':a.status==='rejected'?'no':'new'}));
  }
  if(adm){
    const [pr,og,lg]=await Promise.all([q(sb.from('profiles').select('*').order('created_at')),q(sb.from('organizations').select('*').order('created_at')),q(sb.from('audit_log').select('*').order('id',{ascending:false}).limit(200))]);
    S.profiles=pr;S.orgs=og;
    const PN={};pr.forEach(p=>PN[p.id]=p.full_name||p.email);
    const AN={price:'הגלריה תמחרה',approve:'האמן הסכים',sign:'היקב חתם',paid:'התשלום אושר',reject:'בקשה נדחתה',change:'האמן ביקש שינוי',order:'הוזמן דפוס',cancel:'בקשה בוטלה',request:'בקשת רישיון חדשה'};
    const EN={works:'יצירה',organizations:'ארגון',profiles:'משתמש',settings:'הגדרות',artists:'אמן',wines:'יין'},OP={insert:'נוסף',update:'עודכן',delete:'נמחק'},FN={status:'מצב',role:'תפקיד',title:'שם',comm_pct:'עמלה',pricing:'מחירון',pre_consent:'הסכמה מראש',floor_price:'מחיר רצפה',image_path:'קובץ',preview_path:'תצוגה',available:'זמינות',name:'שם',org_id:'ארגון'};
    const say=l=>{if(AN[l.action])return `${AN[l.action]} · עסקה ${l.entity_id}`;const m=/^(insert|update|delete):(\w+)$/.exec(l.action||'');if(!m)return l.action;
      const ch=Object.keys(l.data||{}).slice(0,3).map(k=>FN[k]||k).join(', ');return `${EN[m[2]]||m[2]} ${OP[m[1]]}${m[1]==='update'&&ch?`: ${ch}`:''}`};
    S.log=lg.map(l=>({t:say(l),type:l.entity==='deal'?'deal':['work','works'].includes(l.entity)?'work':'admin',when:new Date(l.created_at).toLocaleString('he-IL',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'}),who:PN[l.actor]||'מערכת'}));
  }
}
const BLANK='data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 5"><rect width="4" height="5" fill="#E4E4E2"/></svg>');

/* ── log: shown locally, written to the audit log ── */
log=function(t,type='deal'){S.log.unshift({t,type,when:now(),who:ME?.name||'מערכת'})};  /* היומן נכתב בשרת בלבד */
sys=function(d,t){};

/* ── confirm-sheet actions: keep the original sheet, replace what "ok" does ── */
function liveOk(name,fn){const orig=A[name];A[name]=function(v){orig.call(A,v);S._ok=()=>run(()=>fn(v),null)}}
liveOk('signS',async v=>{await adv(v,'sign');toast('החוזה נחתם. החשבונית בדרך')});
liveOk('porder',async v=>{await adv(v,'order');toast('ההזמנה נשלחה לבית הדפוס')});
liveOk('app',async v=>{const [i,s]=v.split(':');await q(sb.from('applications').update({status:s==='ok'?'approved':'rejected'}).eq('id',S.apps[+i].id));log(`בקשת הצטרפות: ${S.apps[+i].n} ${s==='ok'?'התקבלה':'נדחתה'}`,'admin')});
liveOk('deld',async code=>{await q(sb.from('designs').delete().eq('code',code));toast('העיצוב נמחק');go('tab-designs')});
liveOk('savecomm',async()=>{await q(sb.from('settings').update({comm_pct:S.commDraft,updated_at:new Date().toISOString()}).eq('id',1));log(`עמלת פלטפורמה: ${S.comm}% ← ${S.commDraft}%`,'admin');toast('העמלה עודכנה')});
const _avail=A.avail;
A.avail=function(v){const w=work(+v);if(w.av){_avail(v);S._ok=()=>run(async()=>{await q(sb.from('works').update({available:false}).eq('id',+v));log(`"${w.t}" הוסתרה מהמאגר`,'work')},'היצירה הוסתרה')}else run(async()=>{await q(sb.from('works').update({available:true}).eq('id',+v))},'היצירה זמינה שוב לרישוי')};

/* ── deal flow ── */
A.price=function(v){const note=document.getElementById('pnote').value.trim();if(S._adj&&!note){document.getElementById('pnote').closest('.fld').classList.add('bad');document.getElementById('pnote').focus();return}
  const adj=S._adj||0;closeSheet();run(async()=>{await adv(v,'price',adj,note||null);if(note)await q(sb.from('deal_messages').insert({deal_id:+v,body:note}))},'ההצעה עברה לאמן')};
A.consent=v=>{closeSheet();run(()=>adv(v,'approve'),'ההסכמה נשמרה. החוזה נשלח ליקב')};
A.reject=v=>{const r=(S._rsn||'')+((document.getElementById('rtx')?.value.trim())?': '+document.getElementById('rtx').value.trim():'');S._rsn=null;closeSheet();run(()=>adv(v,'reject',0,r||null),'הבקשה נדחתה')};
A.change=v=>{const t=document.getElementById('chx').value.trim();if(!t){document.getElementById('chx').focus();return}closeSheet();run(async()=>{await q(sb.from('deal_messages').insert({deal_id:+v,body:t}));await adv(v,'change')},'הבקשה חזרה לגלריה')};
A.paid=v=>{const d=deal(+v);const amt=+(document.getElementById('pam').value.replace(/\D/g,''));if(Math.abs(amt-price(d).gross)>1){document.getElementById('pam').closest('.fld').classList.add('bad');toast('הסכום שונה מהחשבונית. כדאי לבדוק');return}
  const inv=document.getElementById('pin').value.trim();closeSheet();run(()=>adv(v,'paid',0,inv||null),'התשלום אושר. הקבצים נפתחו ליקב')};
A.chat=v=>{const i=document.getElementById('chatin');const t=i.value.trim();if(!t)return;i.value='';run(()=>q(sb.from('deal_messages').insert({deal_id:+v,body:t})))};
A.pre=()=>{const on=!S.pre;confirmSheet({t:on?'להפעיל הסכמה מראש?':'לבטל הסכמה מראש?',body:`<p class="note">${on?'בקשות קטנות, לבציר אחד, עד 3,000 בקבוקים, בלי בלעדיות ובמחיר הבסיס, יעברו ישר לחתימה בלי לחכות לאישורך. תמיד אפשר לבטל.':'כל בקשה תחכה שוב לאישורך.'}</p>`,l:on?'להפעיל':'לבטל',ok(){run(()=>q(sb.from('artists').update({pre_consent:on}).eq('user_id',ME.id)),on?'הסכמה מראש פעילה':'הסכמה מראש בוטלה')}})};
A.sendreq=function(){const D=S.draft,wi=wine(D.wine);const note=document.getElementById('rnote')?.value.trim();
  run(async()=>{
    let ex=S.designs.find(d=>d.code===D.code)||S.designs.find(d=>d.work===D.work&&d.wine===D.wine);
    if(!ex)ex={code:await insertDesign(D)};
    const id=await rpc('request_license',{p_work:D.work,p_wine:D.wine,p_design:ex.code,p_label:`${wi.n} ${wi.y}`.trim(),p_type:D.lt,p_qty:D.q,p_exclusive:!!D.ex,p_key:D._key||(D._key=crypto.randomUUID())});
    if(note)await q(sb.from('deal_messages').insert({deal_id:id,body:note}));
    S.draft=null;S._go='deal-'+id;
  },'הבקשה נשלחה לגלריה').then(()=>{if(S._go){const g=S._go;S._go=null;go(g)}});
};

/* design codes are unique across the whole system; another winery may already hold one */
async function insertDesign(D){
  const pre={red:'R',white:'W',rose:'RS'}[wine(D.wine).type]||'X';
  for(let n=1;n<1000;n++){const code=pre+String(n).padStart(2,'0');if(S.designs.some(d=>d.code===code))continue;
    const {error}=await sb.from('designs').insert({code,wine_id:D.wine,work_id:D.work,pos:D.pos||50,zoom:D.zoom||100,layout:{shape:D.shape||null},created_by:ME.id});
    if(!error)return code;if(error.code!=='23505')throw error}
  throw new Error('לא נמצא קוד פנוי לעיצוב');
}
/* ── designs ── */
A.savedesign=function(){const D=S.draft;
  run(async()=>{
    if(D.code&&S.designs.find(x=>x.code===D.code)){await q(sb.from('designs').update({wine_id:D.wine,pos:D.pos,zoom:D.zoom,layout:{shape:D.shape||null}}).eq('code',D.code));S._msg=`העיצוב ${D.code} עודכן`}
    else{const code=await insertDesign(D);S._msg=`נשמר כעיצוב ${code}`}
    S.f.dz=wine(D.wine).type;S.draft=null;
  }).then(()=>{if(S._msg){toast(S._msg);S._msg=null;go('tab-designs')}});
};
A.dupd=function(code){const d=S.designs.find(x=>x.code===code);run(async()=>{S._msg=`נוצר עותק ${await insertDesign(d)}`}).then(()=>{if(S._msg){toast(S._msg);S._msg=null}})};
A.addwine2=function(){const n=document.getElementById('wn').value.trim(),y=+document.getElementById('wy').value,qq=+document.getElementById('wq').value.replace(/\D/g,'');if(!n||!y||!qq){toast('צריך שם, בציר וכמות');return}
  if(!ME.orgId||ME.role!=='winery'&&ME.role!=='admin'){toast('רק יקב יכול להוסיף יין');return}
  const t=document.getElementById('wt').value;closeSheet();run(async()=>{const r=await q(sb.from('wines').insert({winery_id:ME.orgId,name:n,vintage:y,type:t,bottles:qq}).select('id').single());S.activeWine=r.id},'היין נוסף')};

/* ── works ── */
A.doupload=function(){const u=readUpload();if(!u)return;
  const aid=u.a||ME.artist?.id;if(!aid){toast('צריך לבחור אמן');return}
  closeSheet();toast('מעלה את היצירה…');
  run(async()=>{const blob=await (await fetch(u.src)).blob();const ext=(blob.type.split('/')[1]||'jpg').replace('jpeg','jpg');const path=`${ME.id}/${Date.now()}.${ext}`;
    await q(sb.storage.from('works').upload(path,blob,{contentType:blob.type,upsert:false}));
    await q(sb.from('works').insert({artist_id:aid,title:u.t,year:u.y?+u.y:null,size:u.s||null,tag:u.g,tone:u.tn,technique:u.tc,orig_status:u.o,story:u.st||null,no_crop:u.cells||{},image_path:path,px_w:u.w||null,px_h:u.h||null}));
    log(`הועלתה יצירה: "${u.t}"`,'work');S.upload=null},'היצירה נשלחה לאישור הגלריה')};
const wst=(id,st,msg,extra={})=>run(()=>q(sb.from('works').update({status:st,...extra}).eq('id',+id)),msg);
A.gapprove=v=>wst(v,'review','עברה לבדיקת קובץ אצל האוצר');
A.greturn2=v=>{const t=document.getElementById('gn').value.trim();if(!t){document.getElementById('gn').focus();return}closeSheet();wst(v,'rejected','הוחזרה לאמן עם ההערה',{review_note:t})};
A.creturn=v=>wst(v,'pending','הוחזרה לגלריה');
A.cok=v=>wst(v,'live','היצירה במאגר');
A.pick=v=>{const w=work(+v);run(async()=>{if(w.pick){const p=w.pick;await q(sb.from('works').update({pick_rank:null}).eq('id',w.id));for(const x of S.works.filter(x=>x.pick>p))await q(sb.from('works').update({pick_rank:x.pick-1}).eq('id',x.id))}else await q(sb.from('works').update({pick_rank:S.works.filter(x=>x.pick).length+1}).eq('id',w.id))})};
A.mv=v=>{const [id,dir]=v.split(':');const w=work(+id);const o=S.works.find(x=>x.pick===w.pick+(+dir));if(!o)return;run(async()=>{await q(sb.from('works').update({pick_rank:w.pick}).eq('id',o.id));await q(sb.from('works').update({pick_rank:o.pick}).eq('id',w.id))})};
A.savecells=v=>{const c={...S._cells};closeSheet();run(()=>q(sb.from('works').update({no_crop:c}).eq('id',+v)),'האזורים נשמרו')};

/* ── artist profile and price list ── */
const artistId=()=>ME.artist?.id||Object.keys(S._artists||{})[0];
A.ccountry=()=>{const c=document.getElementById('cctry').value.trim();if(!c){document.getElementById('cctry').focus();return}run(()=>q(sb.from('artists').update({country:c}).eq('id',artistId())),'המדינה נשמרה')};
A.savebio=()=>{const b=document.getElementById('bio').value.trim();run(()=>q(sb.from('artists').update({bio:b}).eq('id',artistId())),'הביוגרפיה נשמרה')};
A.restrict=v=>{const r={...S.restrict,[v]:!S.restrict[v]};const tags=Object.keys(r).filter(k=>r[k]);run(()=>q(sb.from('artists').update({restrict_tags:tags}).eq('id',artistId())),r[v]?'ההגבלה נשמרה. יקבים יראו אותה':'ההגבלה הוסרה')};
A.savefloor=()=>{const f=S.floorDraft;if(!f||f<500){toast('מחיר רצפה נמוך מדי');return}closeSheet();run(async()=>{await q(sb.from('artists').update({floor_price:f}).eq('id',artistId()));log(`מחירון: ${nis(S.floor)} ← ${nis(f)}`,'admin')},'המחירון נשמר')};
A.savequota=()=>{const n=+document.getElementById('quota').value.replace(/\D/g,'');if(!n){toast('צריך מספר');return}run(()=>q(sb.from('settings').update({render_quota:n}).eq('id',1)),'המכסה נשמרה')};

/* ── printer ── */
A.ost=v=>{const d=deal(+v);if(d.order.st>=4)return;run(()=>q(sb.from('print_orders').update({stage:d.order.st+1}).eq('deal_id',+v)),`עודכן ל: ${OST[d.order.st+1]}`)};
A.qty=v=>{const n=+document.getElementById('qq').value.replace(/\D/g,'');if(!n){document.getElementById('qq').focus();return}run(()=>q(sb.from('print_orders').update({qty:n}).eq('deal_id',+v)),'הכמות דווחה')};

/* ── empty states for a real, still-empty system ── */
const _wh=V.winery_home;
V.winery_home=()=>S.wines.length?_wh():`<span class="eyebrow">${ROLES.winery.hi}</span><h1>${esc(MYW())}</h1><div class="panel empty"><b>עוד לא הוספת יין</b>מתחילים מהיין שעליו עובדים: שם, בציר וכמות בקבוקים. אחרי זה בוחרים ציור מהמאגר.</div><button class="btn wide" style="margin-top:14px" data-a="addwine">להוסיף יין</button><h3>מהמאגר</h3><div class="grid">${S.works.filter(x=>x.st==='live'&&x.av).slice(0,4).map(tileWork).join('')||empty('המאגר מתמלא','יצירות שהאוצרות אישרו יופיעו כאן.')}</div>`;
const _try=window.tryOn;
tryOn=function(wid){if(!S.wines.length){toast('קודם מוסיפים יין');A.addwine();return}return _try(wid)};
const _req=window.reqSheet;
reqSheet=function(wid,step){if(!S.wines.length){toast('קודם מוסיפים יין');A.addwine();return}return _req(wid,step)};
V.gallery_artists=()=>{const L=Object.values(S._artists||{});return `<h1>אמנים</h1><div class="list">${L.map(a=>`<button class="li" data-a="pricelist"><span class="mt"><b>${esc(a.name)}</b><small>${S.works.filter(w=>w.artist===a.id).length} יצירות · מחיר רצפה <span class="num">${nis(+a.floor_price)}</span></small></span><span class="end">מחירון ←</span></button>`).join('')||empty('אין עדיין אמנים')}</div><p class="note">אמן חדש נכנס עם המייל שלו, ומנהל המערכת משייך אותו לגלריה.</p>`};
const _ap=V.artist_profile;
V.artist_profile=()=>_ap().replace('<dd>ארז אהרון</dd>',`<dd>${esc(ME.artist?.name||ME.name)}</dd>`).replace('<dd>גלריה לדוגמה</dd>',`<dd>${esc((S.orgs||[]).find(o=>o.id===ME.artist?.gallery_id)?.name||'הגלריה')}</dd>`);

/* ── admin: real users and organizations ── */
V.admin_users=()=>{const P=S.profiles||[],O=S.orgs||[];const on=id=>O.find(o=>o.id===id)?.name||'';const qq=(S.uq||'').trim();
  const pend=P.filter(p=>p.status==='pending'||!p.role);
  const L=P.filter(p=>!qq||[p.email,p.full_name,on(p.org_id)].join(' ').includes(qq));
  const li=p=>`<button class="li ${p.status==='pending'?'unread':''}" data-a="luser" data-v="${p.id}"><span class="mt"><b>${esc(p.full_name||p.email)}</b><small><span class="num">${esc(p.email||'')}</span></small><small>${p.role?ROLE_N[p.role]:'ללא תפקיד'}${on(p.org_id)?' · '+esc(on(p.org_id)):''}</small></span>${p.status==='active'?'':`<span class="pill solid">${p.status==='blocked'?'מושהה':'ממתין'}</span>`}</button>`;
  return `<h1>משתמשים וארגונים</h1><p class="lead">כל מי שנכנס עם מייל מופיע כאן. כדי שהמערכת תיפתח לו, צריך לקבוע לו תפקיד, ולרוב גם ארגון.</p>
  ${pend.length?`<h3>ממתינים לשיוך</h3><p class="note" style="margin-top:0">נכנסו לאתר ורואים מסך המתנה. לוחצים על שם כדי לקבוע תפקיד וארגון.</p><div class="list">${pend.map(li).join('')}</div>`:''}
  <h3>כל המשתמשים</h3><label class="search">${ICON.search}<input placeholder="לחפש לפי שם, מייל או ארגון" data-in="uq" value="${esc(S.uq||'')}" aria-label="חיפוש משתמש"></label>
  <div class="list">${L.map(li).join('')||empty('לא נמצא משתמש')}</div>
  <h3>ארגונים</h3><p class="note" style="margin-top:0">ארגון הוא העסק שהמשתמש עובד בשמו: יקב, גלריה או בית דפוס. כמה אנשים מאותו יקב רואים את אותם יינות, עיצובים ועסקאות. כל ארגון רואה רק את מה ששייך לו. אמן ואוצר לא צריכים ארגון.</p>
  <div class="list">${O.map(o=>`<div class="li"><span class="mt"><b>${esc(o.name)}</b><small>${ORG_N[o.kind]||o.kind} · ${P.filter(p=>p.org_id===o.id).length} משתמשים</small></span></div>`).join('')}</div>
  <button class="btn alt wide" style="margin-top:14px" data-a="lorg">להוסיף ארגון</button>`};
A.luser=id=>{const p=(S.profiles||[]).find(x=>x.id===id);const O=S.orgs||[];
  sheet(`<span class="eyebrow num">${esc(p.email||'')}</span><h2>${esc(p.full_name||'משתמש חדש')}</h2>
  <div class="fld"><label for="un">שם מלא</label><input id="un" value="${esc(p.full_name||'')}"></div>
  <div class="fld"><label for="ur">תפקיד</label><select id="ur" class="lv-sel"><option value="">ללא תפקיד</option>${Object.entries(ROLE_N).map(([k,n])=>`<option value="${k}" ${p.role===k?'selected':''}>${n}</option>`).join('')}</select></div>
  <div class="fld"><label for="uo">ארגון</label><select id="uo" class="lv-sel"><option value="">ללא ארגון</option>${O.map(o=>`<option value="${o.id}" ${p.org_id===o.id?'selected':''}>${esc(o.name)} · ${ORG_N[o.kind]||''}</option>`).join('')}</select></div>
  <p class="note">מספיק לבחור ארגון: התפקיד נקבע לפי סוג הארגון. יקב, גלריה ובית דפוס חייבים ארגון מאותו סוג. אם הארגון עוד לא ברשימה, מוסיפים אותו קודם בתחתית המסך. לאמן נוצר פרופיל אמן אוטומטית, תחת הגלריה הראשונה ברשימה.</p>
  <div class="row"><button class="btn alt" data-a="close">ביטול</button><button class="btn" data-a="luser2" data-v="${p.id}">לשמור ולהפעיל</button></div>
  ${p.id!==ME.id?`<button class="link" data-a="lblock" data-v="${p.id}">${p.status==='blocked'?'להחזיר את החשבון':'להשהות את החשבון'}</button>`:''}`)};
A.luser2=id=>{let role=document.getElementById('ur').value||null;const org=document.getElementById('uo').value||null,name=document.getElementById('un').value.trim()||null;
  const o=(S.orgs||[]).find(x=>x.id===org);if(!role&&o&&['winery','gallery','printer'].includes(o.kind))role=o.kind;
  if(['winery','gallery','printer'].includes(role)&&(!o||o.kind!==role)){toast(`צריך לבחור ארגון מסוג ${ORG_N[role]}`);return}
  if(id===ME.id&&role!=='admin'){toast('אי אפשר להוריד לעצמך את תפקיד המנהל');return}
  closeSheet();run(async()=>{
    await q(sb.from('profiles').update({role,org_id:org,full_name:name,status:role?'active':'pending'}).eq('id',id));
    if(role==='artist'&&!Object.values(S._artists||{}).some(a=>a.user_id===id)){const g=(S.orgs||[]).find(x=>x.kind==='gallery');if(!g)throw new Error('צריך קודם להוסיף גלריה');await q(sb.from('artists').insert({user_id:id,gallery_id:g.id,name:name||'אמן'}))}
    log(`משתמש עודכן: ${name||''} · ${role?ROLE_N[role]:'ללא תפקיד'}`,'admin');
  },'המשתמש עודכן')};
A.lblock=id=>{const p=S.profiles.find(x=>x.id===id);const to=p.status==='blocked'?'active':'blocked';closeSheet();run(async()=>{await q(sb.from('profiles').update({status:to}).eq('id',id));log(`${p.full_name||p.email}: ${to==='blocked'?'הושהה':'הוחזר'}`,'admin')},to==='blocked'?'החשבון הושהה':'החשבון הוחזר')};
A.lorg=()=>sheet(`<h2>ארגון חדש</h2><p class="note">למשל יקב שמצטרף לפיילוט. אחרי שיוצרים אותו, משייכים אליו את האנשים שלו במסך המשתמשים.</p><div class="fld"><label for="onm">שם</label><input id="onm" placeholder="למשל: יקב הגליל"></div><div class="fld"><label for="okd">סוג</label><select id="okd" class="lv-sel">${['winery','gallery','printer'].map(k=>`<option value="${k}">${ORG_N[k]}</option>`).join('')}</select></div><div class="row"><button class="btn alt" data-a="close">ביטול</button><button class="btn" data-a="lorg2">להוסיף</button></div>`);
A.lorg2=()=>{const n=document.getElementById('onm').value.trim();if(!n){document.getElementById('onm').focus();return}const k=document.getElementById('okd').value;closeSheet();run(async()=>{await q(sb.from('organizations').insert({name:n,kind:k}));log(`ארגון חדש: ${n}`,'admin')},'הארגון נוסף')};

/* ── account sheet ── */
accountSheet=function(){const adm=ME.role==='admin';
  sheet(`<div style="display:flex;gap:12px;align-items:center"><span class="av" style="width:46px;height:46px">${ROLES[ME.role].u}</span><div><b style="font-weight:500">${esc(ME.name)}</b><div style="font-size:14px;color:var(--muted)">${ROLE_N[ME.role]}${ME.orgName?' · '+esc(ME.orgName):''}</div><div class="num" style="font-size:13px;color:var(--soft)">${esc(ME.email)}</div></div></div>
  ${adm?`<h3>לצפות כ…</h3><p class="note" style="margin-top:0">מנהל רואה את כל הנתונים. פעולות של יקב, כמו חתימה, נעשות רק מחשבון של יקב.</p><div class="roles">${Object.entries(ROLES).map(([k,r])=>`<button class="role ${k===S.role?'cur':''}" data-a="role" data-v="${k}" style="padding:10px 14px"><b style="font-size:17px">${r.n}${k===S.role?' · כאן עכשיו':''}</b></button>`).join('')}</div>`:''}
  <div class="row" style="margin-top:16px"><button class="btn alt" data-a="introshow">איך זה עובד</button><button class="btn alt" data-a="logout">להתנתק</button></div>`)};

/* ── boot ── */
sb.auth.onAuthStateChange(ev=>{if(ev==='SIGNED_OUT'&&LV.state==='ready'){window.ME=null;S.role=null;LV.state='login';render()}});
(async function boot(){
  render();
  const h=window.AUTH_HASH||'';
  history.replaceState(null,'',location.pathname+location.search);
  if(h){const p=new URLSearchParams(h.slice(1));
    if(p.get('error_description')){LV.err=heb(p.get('error_description'))}
    else if(p.get('access_token')){const {error}=await sb.auth.setSession({access_token:p.get('access_token'),refresh_token:p.get('refresh_token')});if(error)LV.err=heb(error)}}
  const {data:{session}}=await sb.auth.getSession();
  if(!session){LV.state='login';render();return}
  await loadMe(session.user);
window.LX=window.LX||{};try{window.LX.sb=window.LX.sb||sb}catch(e){}try{window.LX.q=window.LX.q||q}catch(e){}try{window.LX.run=window.LX.run||run}catch(e){}try{window.LX.run2=window.LX.run2||run2}catch(e){}try{window.LX.heb2=window.LX.heb2||heb2}catch(e){}try{window.LX.textModel=window.LX.textModel||textModel}catch(e){}try{window.LX.gfetch=window.LX.gfetch||gfetch}catch(e){}try{window.LX.shootReal=window.LX.shootReal||shootReal}catch(e){}
})();
window.LX=window.LX||{};try{window.LX.sb=window.LX.sb||sb}catch(e){}try{window.LX.q=window.LX.q||q}catch(e){}try{window.LX.run=window.LX.run||run}catch(e){}try{window.LX.run2=window.LX.run2||run2}catch(e){}try{window.LX.heb2=window.LX.heb2||heb2}catch(e){}try{window.LX.textModel=window.LX.textModel||textModel}catch(e){}try{window.LX.gfetch=window.LX.gfetch||gfetch}catch(e){}try{window.LX.shootReal=window.LX.shootReal||shootReal}catch(e){}
})();

/* ════════ stage 2: customer flow, render engine, notifications, real data ════════ */
(function(){
const sb=window.SB;
const q=async p=>{const {data,error}=await p;if(error)throw error;return data};
const heb2=e=>{const m=String(e?.message||e||'');return /[֐-׿]/.test(m)?m:'משהו לא הצליח. אפשר לנסות שוב'};
async function run2(fn,ok){try{await fn();await window.liveHydrate();render();if(ok)toast(ok)}catch(e){console.error(e);toast(heb2(e))}}
const corder=(id,action,design=null,note=null,total=null)=>q(sb.rpc('corder_action',{p_id:+id,p_action:action,p_design:design,p_note:note,p_total:total}));
const liveOk2=(name,fn)=>{const orig=A[name];A[name]=function(v){orig.call(A,v);S._ok=()=>run2(()=>fn(v))}};

/* customer sends the order */
window.submitOrder=o=>run2(async()=>{const key=S._ckey||(S._ckey=crypto.randomUUID());
  let {data:r,error}=await sb.from('customer_orders').insert({winery_id:ME.orgId,cust:o.cust,design:o.d,total:cprice(o.d).total,client_key:key}).select('id,total').single();
  if(error&&error.code==='23505')r=await q(sb.from('customer_orders').select('id,total').eq('client_key',key).single());   /* נשלח כבר, למשל אחרי ניתוק */
  else if(error)throw error;
  S._ckey=null;S.cd=null;S._lastDelta=0;S._go='corder-'+r.id},'ההזמנה נשלחה ליקב').then(()=>{if(S._go){const g=S._go;S._go=null;go(g)}});
/* winery edits are saved as they happen */
let wvT=null;window.onWv=o=>{clearTimeout(wvT);wvT=setTimeout(()=>corder(o.id,'wsave',o.wv,null,cprice(o.wv).total).catch(e=>toast(heb2(e))),700)};
liveOk2('cwundo',v=>corder(v,'wundo').then(()=>{S.cd=null;toast('חזרנו לעיצוב של הלקוח')}));
liveOk2('cwok',v=>corder(v,'wok').then(()=>toast('ההזמנה אושרה')));
liveOk2('ccok',v=>corder(v,'cok').then(()=>toast('אישרת. היקב ייצור קשר לתשלום')));
liveOk2('cwprint',v=>corder(v,'wprint').then(()=>toast('נשלח לבית הדפוס')));
A.cwsend2=v=>{const o=S.corders.find(x=>x.id===+v);const n=document.getElementById('wn2').value.trim();closeSheet();
  run2(async()=>{clearTimeout(wvT);await corder(v,'wsave',o.wv,null,cprice(o.wv).total);await corder(v,'wsend',null,n||null);S.cd=null},'נשלח ללקוח לאישור')};
A.ccchg2=v=>{const t=document.getElementById('ccx').value.trim();if(!t){document.getElementById('ccx').focus();return}closeSheet();run2(()=>corder(v,'cchange',null,t),'הבקשה נשלחה ליקב')};
A.cdone=v=>run2(()=>corder(v,'done'),'סומן שמוכן');
const _cps=A.cpsave;A.cpsave=function(){_cps();const {link,...pr}=S.wset;if(!ME.orgId)return;run2(()=>q(sb.from('organizations').update({pricing:pr}).eq('id',ME.orgId)))};
/* artist: face photo and stories */
window.saveFace=f=>run2(async()=>{const aid=ME.artist?.id;if(!aid)throw new Error('לחשבון הזה אין פרופיל אמן');const ext=(f.type.split('/')[1]||'jpg').replace('jpeg','jpg');const path=`${ME.id}/face-${Date.now()}.${ext}`;
  await q(sb.storage.from('works').upload(path,f,{contentType:f.type}));await q(sb.from('artists').update({face_path:path}).eq('id',aid))},'הצילום נשמר');
window.saveStory=(id,t)=>run2(()=>q(sb.from('works').update({story:t||null}).eq('id',id)),'הסיפור נשמר. לקוחות יראו אותו');
/* upload keeps the pixel size, for the curator's file check */

const _ins=sb.from.bind(sb);

/* ── render engine: the site's own /api/gemini ── */
async function gfetch(path,body){const {data:{session}}=await sb.auth.getSession();const r=await fetch('/api/gemini',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+(session?.access_token||'')},body:JSON.stringify({path,body})});
  const t=await r.text();let j={};try{j=JSON.parse(t)}catch(e){j={status:r.status||502,data:{}}}const st=j.status||r.status;return {status:st,ok:st>=200&&st<300,data:j.data||{}}}
let MODEL=null;
async function pickModel(){if(MODEL)return MODEL;const r=await gfetch('models?pageSize=1000');if(!r.ok){const m=r.data?.error?.message||'';throw new Error(/[\u0590-\u05FF]/.test(m)?m:'מנוע הצילום לא זמין כרגע. כדאי לנסות שוב בעוד דקה')}
  const ms=(r.data.models||[]).filter(m=>/image/i.test(m.name)&&!/imagen/i.test(m.name)&&(m.supportedGenerationMethods||[]).includes('generateContent')).map(m=>m.name.replace(/^models\//,''));
  const rank=m=>(/3[.-]?\d*-pro-image/i.test(m)?-1:/pro/i.test(m)?0:/flash/i.test(m)&&!/lite/i.test(m)?1:2)+(/preview|exp/i.test(m)?.5:0);
  if(!ms.length)throw new Error('למנוע הצילום אין כרגע גישה למודל שיוצר תמונות');return MODEL=ms.sort((a,b)=>rank(a)-rank(b))[0]}
const PROMPT=(spec)=>`Photorealistic studio product photograph of a single 750 ml Bordeaux wine bottle of ${({red:'red',white:'white',rose:'rosé'})[spec.type]||'red'} wine, standing on a pale limestone surface against a soft warm-grey seamless backdrop, soft large softbox light from the left. The FIRST attached image is the exact front label: reproduce it on the bottle faithfully, same layout, same painting, same text, wrapped naturally around the glass curvature. The SECOND attached image is the original oil painting used on the label, for fine detail of the brushwork. ${spec.o.foil?'The wine name is printed in hot-stamped gold foil. ':''}${spec.o.emboss?'The wine name is blind-embossed into the paper. ':''}Textured cotton label paper. Vertical 4:5 frame, bottle centred and filling most of the height. Must look like an unretouched professional photograph: no illustration, no CGI look, no added text, logos or watermarks.`;
async function specHash(spec){const w=(S.works||[]).find(x=>x.id===spec.work);const t=JSON.stringify([spec.type,spec.work,w?.path||'',spec.o]);
  const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t));return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function shootReal(spec){
  /* אותו עיצוב כבר צולם? משתמשים בצילום הקיים ולא מבזבזים מכסה */
  const h=await specHash(spec);
  try{const {data:hit}=await sb.from('renders').select('image_path').eq('design_hash',h).order('id',{ascending:false}).limit(1).maybeSingle();
    if(hit){const {data:su}=await sb.storage.from('renders').createSignedUrl(hit.image_path,3600);if(su?.signedUrl){S._rurl=S._rurl||{};S._rurl[hit.image_path]=su.signedUrl;return {path:hit.image_path,url:su.signedUrl,cached:true}}}}catch(e){console.warn(e)}
  const left=await q(sb.rpc('render_quota_left'));if(left<=0)throw new Error('מכסת הצילומים לחודש הזה נגמרה. מנהל המערכת יכול להגדיל אותה');
  /* למנוע שולחים גרסה נקייה, בלי סימן המים של התצוגה המקדימה */
  const wk=(S.works||[]).find(x=>x.id===spec.work),keep=wk?.src;if(wk&&(wk.thumb||wk.full))wk.src=wk.thumb||wk.full;
  let label,painting;try{label=(await svgToPng(await labelSvg(spec.type,spec.work,spec.o),600,1140)).split(',')[1];painting=await toDataUrl(img(spec.work))}finally{if(wk)wk.src=keep}const pm=painting.match(/^data:([^;]+);base64,(.*)$/);
  const parts=[{text:PROMPT(spec)},{inline_data:{mime_type:'image/png',data:label}}];if(pm)parts.push({inline_data:{mime_type:pm[1],data:pm[2]}});
  const m=await pickModel();const call=hq=>gfetch(`models/${m}:generateContent`,{contents:[{parts}],generationConfig:Object.assign({responseModalities:['TEXT','IMAGE']},hq?{imageConfig:{aspectRatio:'4:5'}}:{})});
  let r=await call(true);if(r.status===400)r=await call(false);
  if(!r.ok){const m=r.data?.error?.message||'';throw new Error(/[\u0590-\u05FF]/.test(m)?m:r.status===429?'אין כרגע מכסה במנוע של Google. כדאי לנסות מאוחר יותר':'מנוע הצילום החזיר שגיאה '+r.status)}
  const ps=(((r.data.candidates||[])[0]||{}).content||{}).parts||[];const im=ps.map(x=>x.inlineData||x.inline_data).find(Boolean);
  if(!im)throw new Error('המנוע לא החזיר תמונה. כדאי לנסות שוב');
  const url=`data:${im.mimeType||im.mime_type||'image/png'};base64,${im.data}`;
  const blob=await (await fetch(url)).blob();const path=`${ME.id}/${Date.now()}.${blob.type.includes('png')?'png':'jpg'}`;
  await q(sb.storage.from('renders').upload(path,blob,{contentType:blob.type}));
  await q(sb.from('renders').insert({image_path:path,design_code:spec.code||null,deal_id:spec.deal||null,created_by:ME.id,design_hash:h}));
  S._rurl=S._rurl||{};S._rurl[path]=url;
  renderCheck(path,label,url).catch(e=>console.warn('render check',e));
  return {path,url};
}
/* בדיקה אוטומטית שהצילום תואם לתווית. תואם: מאושר. לא תואם: נשאר לבדיקת האוצרת */
async function renderCheck(path,labelB64,url){
  const m=await textModel(),img=await small(url,768);
  const prompt='Image 1 is a wine label design. Image 2 is a photo of a bottle that should carry exactly this label. Answer only JSON {"match":true|false,"reason":"short Hebrew reason"}. match=false if the painting on the bottle differs, is distorted, cropped wrongly, or extra text was invented.';
  const r=await gfetch(`models/${m}:generateContent`,{contents:[{parts:[{text:prompt},{inline_data:{mime_type:'image/png',data:labelB64}},{inline_data:{mime_type:'image/jpeg',data:img}}]}],generationConfig:{temperature:0,responseMimeType:'application/json'}});
  if(!r.ok)return;const t=((((r.data.candidates||[])[0]||{}).content||{}).parts||[]).map(x=>x.text||'').join('');
  let j;try{j=JSON.parse(t)}catch(e){return}
  await q(sb.rpc('render_auto_check',{p_path:path,p_match:!!j.match,p_reason:String(j.reason||'').slice(0,200)}));
}
/* ── artwork analysis: fills title, subject, technique, tone and a short description ── */
let TMODEL=null;
async function textModel(){if(TMODEL)return TMODEL;const r=await gfetch('models?pageSize=1000');if(!r.ok)throw new Error('engine');
  const ms=(r.data.models||[]).map(m=>({id:m.name.replace(/^models\//,''),ok:(m.supportedGenerationMethods||[]).includes('generateContent')})).filter(m=>m.ok&&/gemini/i.test(m.id)&&!/image|tts|audio|live|embed|vision|thinking-exp/i.test(m.id)).map(m=>m.id);
  const rank=m=>(/flash/i.test(m)&&!/lite/i.test(m)?0:/flash/i.test(m)?1:/pro/i.test(m)?2:3)+(/preview|exp/i.test(m)?.5:0)-(parseFloat((m.match(/gemini-(\d+(\.\d+)?)/)||[])[1]||0)/100);
  if(!ms.length)throw new Error('no model');return TMODEL=ms.sort((a,b)=>rank(a)-rank(b))[0]}
async function small(src,max=768){const im=new Image();await new Promise((ok,bad)=>{im.onload=ok;im.onerror=bad;im.src=src});const k=Math.min(1,max/Math.max(im.width,im.height));
  const c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.85).split(',')[1]}
const SUBJ=['נוף','טבע דומם','בוטני','סמלי','דיוקן','עירוני','מופשט','אחר'],TECH=['שמן על בד','שמן על עץ','אקריליק','צבעי מים','גואש','פסטל','רישום','הדפס','צילום','מדיה מעורבת','דיגיטלי'],TON=['ירוק','חום','בז׳','כחול','אפור','אדום','סגול','צהוב','שחור','לבן','צבעוני'];
window.aiAnalyze=async function(src){
  const m=await textModel();
  const prompt=`You are helping an art gallery catalogue an artwork from a photo. Look only at what is visible. Reply with JSON only, in Hebrew, with these keys:
"title": a short, plain working title in Hebrew (2-4 words) that names what is depicted, no quotes, no artist name;
"subject": exactly one of ${JSON.stringify(SUBJ)};
"technique": exactly one of ${JSON.stringify(TECH)}, your best visual guess;
"tone": the dominant colour of the painting itself (not a plain background), exactly one of ${JSON.stringify(TON)};
"description": two short Hebrew sentences describing what is visible (composition, light, colour), in a calm gallery tone. Do not invent facts about the artist, the place, the date, the meaning or the story.`;
  const r=await gfetch(`models/${m}:generateContent`,{contents:[{parts:[{text:prompt},{inline_data:{mime_type:'image/jpeg',data:await small(src)}}]}],generationConfig:{responseMimeType:'application/json',temperature:.3}});
  if(!r.ok)throw new Error('engine '+r.status);
  const txt=((((r.data.candidates||[])[0]||{}).content||{}).parts||[]).map(x=>x.text||'').join('');
  const j=JSON.parse(txt.replace(/^```json|```$/g,'').trim());
  return {title:String(j.title||'').slice(0,40),subject:SUBJ.includes(j.subject)?j.subject:'',technique:TECH.includes(j.technique)?j.technique:'',tone:TON.includes(j.tone)?j.tone:'',description:String(j.description||'').slice(0,400)};
};
let shooting=false;
function shootUI(where,spec,done){if(shooting)return;shooting=true;const h=document.querySelector(where);if(h)h.innerHTML=wait('מצלמים את הבקבוק','בדרך כלל עד דקה. אפשר להמשיך לחכות כאן');
  shootReal(spec).then(r=>{done(r);if(!r.cached&&window.track)track('render_done');toast(r.cached?'הצילום הזה כבר היה מוכן':'הצילום מוכן')}).catch(e=>{console.error(e);toast(heb2(e));render()}).finally(()=>{shooting=false})}
A.cshoot=function(){const d=S.cd;if(!d)return;const wi=wine(d.wine);
  shootUI('.hero',{type:wi.type,work:d.work,o:{pos:d.pos,zoom:d.zoom,shape:d.shape,name:d.name||wi.n,year:wi.y,ded:d.ded,foil:d.foil,emboss:d.emboss,artist:artistName(d.artist)}},r=>{d.render=r.path;save();render()})};
A.shoot=function(){const D=S.draft,wi=wine(D.wine);
  shootUI('#tryh',{type:wi.type,work:D.work,code:D.code,o:{pos:D.pos,zoom:D.zoom,shape:D.shape,name:wi.n,year:wi.y,artist:work(D.work)?.artistN}},r=>{const h=document.getElementById('tryh');if(h)h.innerHTML=`<img src="${r.url}" alt="צילום הבקבוק" style="max-height:300px;width:auto">`})};

/* ── notifications in the bell ── */
const _todos=todos;
todos=function(r){const out=_todos(r);(S._notifs||[]).filter(n=>!n.read_at).forEach(n=>out.push({k:'n'+n.id,t:n.body,s:new Date(n.created_at).toLocaleString('he-IL',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'}),go:n.deal_id?'deal-'+n.deal_id:'tab-'+TABS[S.role][0][0],cta:'לפתוח'}));return out};
const _bell=bellSheet;bellSheet=function(){_bell();const un=(S._notifs||[]).filter(n=>!n.read_at);if(un.length){un.forEach(n=>n.read_at=new Date().toISOString());sb.from('notifications').update({read_at:new Date().toISOString()}).is('read_at',null).eq('user_id',ME.id).then(()=>{})}
  document.querySelector('#ov .note')?.replaceWith(Object.assign(document.createElement('p'),{className:'note',textContent:'בינתיים ההתראות מופיעות רק כאן. התראות במייל יתווספו עם שירות המיילים.'}))};

/* ── real data where the prototype showed samples ── */
const det=o=>o?.details||{};
V.winery_more=()=>{const o=S._myOrg,d=det(o);const inv=S.deals.filter(x=>x.winery===MYW()&&['pay','active'].includes(x.st));
  return `<h1>היקב</h1><h3>היינות</h3><div class="list">${S.wines.map(w=>`<div class="li"><span class="mt"><b>${esc(w.n)} ${w.y}</b><small>${WINE[w.type].n} · <span class="num">${(w.q||0).toLocaleString('en-US')}</span> בקבוקים</small></span></div>`).join('')||empty('עוד אין יינות','')}</div><button class="btn alt wide" style="margin-top:10px" data-a="addwine">להוסיף יין</button>
  <h3>פרטי היקב</h3><div class="panel"><dl><dt>שם</dt><dd>${esc(o?.name||'')}</dd><dt>אזור</dt><dd>${esc(d.region||'—')}</dd><dt>כתובת למשלוח</dt><dd>${esc(d.address||'—')}</dd><dt>איש קשר</dt><dd>${esc(d.contact||'—')}</dd><dt>טלפון</dt><dd class="num">${esc(d.phone||'—')}</dd><dt>כשרות</dt><dd>${esc(d.kosher||'—')}</dd></dl><button class="btn sm alt wide" style="margin-top:10px" data-a="orged">לעדכן פרטים</button></div>
  <h3>משתמשים</h3><div class="list">${(S._orgUsers||[]).map(u=>`<div class="li"><span class="av" style="width:38px;height:38px">${esc((u.full_name||u.email||'?').slice(0,2))}</span><span class="mt"><b>${esc(u.full_name||u.email)}</b><small class="num">${esc(u.email||'')}</small></span></div>`).join('')}</div><p class="note">משתמש נוסף נכנס עם המייל שלו, ומנהל המערכת משייך אותו ליקב.</p>
  <h3>חשבוניות</h3><div class="list">${inv.map(x=>`<button class="li" data-a="invoicepdf" data-v="${x.id}"><span class="mt"><b>עסקה ${x.id}${x.inv?' · '+esc(x.inv):''}</b><small>${x.st==='active'?'שולם':'פתוחה'} · כולל מע״מ</small></span><span class="end num">${nis(price(x).gross)}</span></button>`).join('')||empty('עדיין אין חשבוניות','')}</div>`};
A.orged=()=>{const d=det(S._myOrg);const f=(k,l,ph='')=>`<div class="fld"><label for="od-${k}">${l}</label><input id="od-${k}" value="${esc(d[k]||'')}" placeholder="${ph}"></div>`;
  sheet(`<h2>פרטי ${esc(S._myOrg?.name||'')}</h2>${f('region','אזור','למשל: הרי יהודה')}${f('address','כתובת למשלוח')}${f('contact','איש קשר')}${f('phone','טלפון','050-0000000')}${f('kosher','כשרות','למשל: כן, בד״ץ')}<p class="note">בית הדפוס רואה את הכתובת, איש הקשר והטלפון בהזמנות.</p><div class="row"><button class="btn alt" data-a="close">ביטול</button><button class="btn" data-a="orged2">לשמור</button></div>`)};
A.orged2=()=>{const d={...det(S._myOrg)};['region','address','contact','phone','kosher'].forEach(k=>d[k]=document.getElementById('od-'+k).value.trim());closeSheet();run2(()=>q(sb.from('organizations').update({details:d}).eq('id',ME.orgId)),'הפרטים נשמרו')};
V.printer_account=()=>{const o=S._myOrg,d=det(o);const done=S.deals.filter(x=>x.order&&x.order.st===4);
  return `<h1>החשבון</h1><div class="panel"><dl><dt>בית דפוס</dt><dd>${esc(o?.name||'')}</dd><dt>איש קשר</dt><dd>${esc(d.contact||'—')}</dd><dt>טלפון</dt><dd class="num">${esc(d.phone||'—')}</dd><dt>כתובת לאיסוף</dt><dd>${esc(d.address||'—')}</dd></dl><button class="btn sm alt wide" style="margin-top:10px" data-a="orged">לעדכן פרטים</button></div>
  <h3>הזמנות שהושלמו</h3><div class="list">${done.map(x=>`<div class="li"><span class="mt"><b>הזמנה ${x.id} · ${esc(x.winery)}</b><small>${x.order.qty?x.order.qty+' הודפסו':''}</small></span></div>`).join('')||empty('עדיין אין','')}</div>`};
/* the print brief: the winery's real address and contact */
const _vo=window.vOrder;vOrder=function(d){const wo=(S._orgL||[]).find(o=>o.name===d.winery),w=det(wo);
  return _vo(d).replace('יקב הגבעה, הרי יהודה',esc(w.address||d.winery)).replace('נוי · 050-1234567',`${esc(w.contact||'—')} · ${esc(w.phone||'—')}`)};
/* gallery: real income by month, real wineries in the catalog */
V.gallery_more=()=>{const now=new Date();const ms=[...Array(5)].map((_,i)=>{const t=new Date(now.getFullYear(),now.getMonth()-4+i,1);return [t.toLocaleDateString('he-IL',{month:'short'}),`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}`]});
  const v=ms.map(([l,k])=>[l,S.deals.filter(d=>d.st==='active'&&(d.paid||'').startsWith(k)).reduce((a,d)=>a+price(d).gallery,0)]);const mx=Math.max(1,...v.map(x=>x[1]));
  return `<h1>עוד</h1><h3>קטלוג התאמה ליקב</h3><div class="panel"><p style="margin:0 0 10px;font-size:14.5px">כלי מכירה יזום: בוחרים יקב ויצירות, והמערכת מפיקה קטלוג עם הדמיות.</p><button class="btn sm wide" data-a="catalog">לבנות קטלוג</button></div>
  <h3>חלק הגלריה לפי חודש</h3><div class="panel">${v.map(([l,x])=>`<div style="display:flex;align-items:center;gap:8px;margin:6px 0;font-size:13.5px"><span style="width:44px">${l}</span><span style="flex:1;background:var(--line);height:10px"><span style="display:block;height:10px;background:var(--ink);width:${Math.round(x/mx*100)}%"></span></span><span class="num" style="width:76px;text-align:left">${nis(x)}</span></div>`).join('')}</div>`};
A.catalog=()=>{const ws=(S._orgL||[]).filter(o=>o.kind==='winery').map(o=>o.name);S._cat=S._cat||{w:ws[0]||'',sel:{}};window.CATW=ws;catSheet()};
/* curator: the file's real pixel size */
V.curator_review=()=>{const r=S.works.filter(w=>w.st==='review');return `<h1>בדיקת קבצים</h1><p class="lead">איכות קובץ ורזולוציה. את היצירה עצמה הגלריה כבר אישרה.</p>${r.length?r.map(w=>{const p=S._px[w.id];const cm=p?Math.round(Math.max(...p)/300*2.54):0;return `<div class="panel" style="margin-top:10px"><div style="display:flex;gap:12px"><span class="th sq" style="width:72px;height:72px;background-image:url(${img(w.id)})"></span><div style="flex:1"><b style="font-weight:500">${esc(w.t)}</b><div class="note" style="margin:2px 0 0">${p?`<span class="num">${p[0]}×${p[1]}</span> פיקסלים · בהדפסה 300dpi עד ${cm} ס״מ ${Math.max(...p)>=3000?'✓':'· קטן מהנדרש'}`:'גודל הקובץ לא נשמר'}</div></div></div><div class="row" style="margin-top:10px"><button class="btn alt sm" data-a="creturn" data-v="${w.id}">להחזיר לגלריה</button><button class="btn sm" data-a="cok" data-v="${w.id}">לפרסם במאגר</button></div></div>`}).join(''):empty('הכול נבדק','יצירה חדשה תגיע אחרי אישור הגלריה.')}`};
window.LX=window.LX||{};try{window.LX.sb=window.LX.sb||sb}catch(e){}try{window.LX.q=window.LX.q||q}catch(e){}try{window.LX.run=window.LX.run||run}catch(e){}try{window.LX.run2=window.LX.run2||run2}catch(e){}try{window.LX.heb2=window.LX.heb2||heb2}catch(e){}try{window.LX.textModel=window.LX.textModel||textModel}catch(e){}try{window.LX.gfetch=window.LX.gfetch||gfetch}catch(e){}try{window.LX.shootReal=window.LX.shootReal||shootReal}catch(e){}
})();

(function(){
const sb=window.SB;
const q=async p=>{const {data,error}=await p;if(error)throw error;return data};
const heb2=e=>{const m=String(e?.message||e||'');return /[֐-׿]/.test(m)?m:'משהו לא הצליח. אפשר לנסות שוב'};
async function run3(fn,ok){try{await fn();await window.liveHydrate();render();if(ok)toast(ok)}catch(e){console.error(e);toast(heb2(e))}}
const corder=(id,action)=>q(sb.rpc('corder_action',{p_id:+id,p_action:action}));
const okWrap=(name,fn)=>{const orig=A[name];A[name]=function(v){orig.call(A,v);S._ok=()=>run3(()=>fn(v))}};
okWrap('cwpaid',v=>corder(v,'wpaid').then(()=>toast('סומן ששולם')));
okWrap('ccancel',v=>corder(v,'cancel').then(()=>toast('ההזמנה בוטלה')));
/* work details */
window.saveWork=(id,f)=>run3(()=>q(sb.from('works').update(f).eq('id',id)),'הפרטים נשמרו');
/* pre-consent is not active yet: hide it from the artist profile */
/* הסכמה מראש פעילה: נשמרת בשרת (ops.js / A.pre) */
/* admin: rename an organization */
const _au=V.admin_users;V.admin_users=()=>_au().replace(/<div class="li"><span class="mt"><b>([^<]*)<\/b><small>([^<]*)<\/small><\/span><\/div>/g,(m,n,k)=>{const o=(S.orgs||[]).find(x=>esc(x.name)===n);return o?`<button class="li" data-a="orgren" data-v="${o.id}"><span class="mt"><b>${n}</b><small>${k}</small></span><span class="end">לשנות שם ←</span></button>`:m});
A.orgren=id=>{const o=S.orgs.find(x=>x.id===id);sheet(`<h2>שם הארגון</h2><div class="fld"><label for="orn">שם</label><input id="orn" value="${esc(o.name)}"></div>${o.kind==='winery'?`<p class="note">הקישור ללקוחות של היקב: <span class="num">${esc(location.origin+location.pathname)}?y=${esc(o.slug||'')}</span></p>`:''}<div class="row"><button class="btn alt" data-a="close">ביטול</button><button class="btn" data-a="orgren2" data-v="${id}">לשמור</button></div>`)};
A.orgren2=id=>{const n=document.getElementById('orn').value.trim();if(!n){document.getElementById('orn').focus();return}closeSheet();run3(async()=>{await q(sb.from('organizations').update({name:n}).eq('id',id));log(`ארגון שונה ל־${n}`,'admin')},'השם נשמר')};
/* winery link: the real address */
const _wc=V.winery_clients;V.winery_clients=()=>_wc().replace(/wine-art\.netlify\.app\/Portal\/\?y=/,esc(location.host+location.pathname)+'?y=').replace('data-a="toast" data-v="הקישור הועתק"','data-a="copylink"');
A.copylink=()=>{const u=location.origin+location.pathname+'?y='+(S.wset.link||'');(navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(()=>toast('הקישור הועתק'),()=>toast(u))};
/* curator: queue of renders to review */
V.curator_quality=()=>{const L=(S._rq||[]);const f=S.f.qq||'todo';const show=L.filter(r=>f==='todo'?r.approved===null:r.approved!==null);
  return `<h1>הדמיות</h1><p class="lead">כל צילום ריאליסטי שנוצר במערכת. בפיילוט כדאי לבדוק שהתווית בצילום תואמת לעיצוב: שם היין, הבציר ושם האמן.</p>
  <div class="tabs"><button data-a="fq" data-v="todo" aria-selected="${f==='todo'}">לבדיקה (${L.filter(r=>r.approved===null).length})</button><button data-a="fq" data-v="done" aria-selected="${f==='done'}">נבדקו</button></div>
  ${show.length?show.map(r=>`<div class="panel" style="margin-top:10px">${r.url?`<img src="${r.url}" alt="צילום" style="width:100%;height:auto;display:block">`:''}<p class="note">${new Date(r.created_at).toLocaleString('he-IL',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'})} · ${esc(r.who||'')}${r.approved!==null?` · ${r.approved?'אושר':'נדחה'}`:''}</p>${r.approved===null?`<div class="row"><button class="btn alt sm" data-a="rq2" data-v="${r.id}:0">לא תואם</button><button class="btn sm" data-a="rq2" data-v="${r.id}:1">תואם</button></div>`:''}</div>`).join(''):empty(f==='todo'?'אין צילומים שממתינים לבדיקה':'עדיין לא נבדקו צילומים','')}`};
A.rq2=v=>{const [id,ok]=v.split(':');run3(()=>q(sb.from('renders').update({approved:ok==='1',reviewed_by:ME.id}).eq('id',+id)),ok==='1'?'סומן כתואם':'סומן כלא תואם')};
const _h=window.liveHydrate;window.liveHydrate=async()=>{await _h();if(['curator','admin'].includes(ME.role)){const r=await q(sb.from('renders').select('*').order('id',{ascending:false}).limit(60));
  const P={};(S.profiles||[]).forEach(p=>P[p.id]=p.full_name||p.email);let urls={};const ps=r.map(x=>x.image_path).filter(Boolean);
  if(ps.length){try{const u=await q(sb.storage.from('renders').createSignedUrls(ps,3600));u.forEach(x=>{if(x.signedUrl)urls[x.path]=x.signedUrl})}catch(e){}}
  S._rq=r.map(x=>({...x,url:urls[x.image_path],who:P[x.created_by]}))}};
window.LX=window.LX||{};try{window.LX.sb=window.LX.sb||sb}catch(e){}try{window.LX.q=window.LX.q||q}catch(e){}try{window.LX.run=window.LX.run||run}catch(e){}try{window.LX.run2=window.LX.run2||run2}catch(e){}try{window.LX.heb2=window.LX.heb2||heb2}catch(e){}try{window.LX.textModel=window.LX.textModel||textModel}catch(e){}try{window.LX.gfetch=window.LX.gfetch||gfetch}catch(e){}try{window.LX.shootReal=window.LX.shootReal||shootReal}catch(e){}
})();
