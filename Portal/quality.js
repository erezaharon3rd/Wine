/* quality.js · בדיקת קובץ אוטומטית בהעלאת יצירה
   מחליפה את בדיקת הקובץ הידנית של האוצרת: סוג, גודל, פיקסלים, DPI בתווית,
   חדות, חשיפה, דחיסה וכפילות. בעיה שחוסמת הדפסה עוצרת את ההעלאה עם הסבר. */
(function(){
'use strict';
/* אזור הציור על תווית רגילה: כ-72×93 מ״מ (התווית 80×152). בדפוס צריך 300 DPI */
const AREA={w:72/25.4,h:93/25.4},DPI_OK=300,DPI_MIN=240,MAX_MB=40;
const OK_TYPES=['image/jpeg','image/png','image/webp','image/tiff'];
const TYPE_HELP={'image/heic':'קובץ HEIC של אייפון','image/heif':'קובץ HEIF של אייפון','image/gif':'קובץ GIF','image/bmp':'קובץ BMP','application/pdf':'קובץ PDF'};

function jfifDpi(buf){const b=new Uint8Array(buf.slice(0,64));if(b[0]!==0xFF||b[1]!==0xD8)return null;
  for(let i=2;i<b.length-16;i++){if(b[i]===0xFF&&b[i+1]===0xE0&&b[i+4]===0x4A&&b[i+5]===0x46&&b[i+6]===0x49&&b[i+7]===0x46){const u=b[i+11],x=(b[i+12]<<8)|b[i+13];return u===1?x:u===2?Math.round(x*2.54):null}}return null}

function pixels(im,max){const k=Math.min(1,max/Math.max(im.naturalWidth,im.naturalHeight)),c=document.createElement('canvas');
  c.width=Math.max(1,Math.round(im.naturalWidth*k));c.height=Math.max(1,Math.round(im.naturalHeight*k));const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0,c.width,c.height);
  const d=g.getImageData(0,0,c.width,c.height).data,L=new Float32Array(c.width*c.height);for(let i=0,j=0;i<d.length;i+=4,j++)L[j]=.299*d[i]+.587*d[i+1]+.114*d[i+2];return {L,w:c.width,h:c.height}}

/* חדות: שונות של לפלסיאן לפי אזורים. ציור עם רקע חלק עדיין חד באזור של הפרטים, לכן לוקחים את האזורים החדים */
function sharpness({L,w,h}){const T=6,vals=[];
  for(let ty=0;ty<T;ty++)for(let tx=0;tx<T;tx++){let s=0,s2=0,n=0;
    const x0=Math.max(1,Math.floor(tx*w/T)),x1=Math.min(w-1,Math.floor((tx+1)*w/T)),y0=Math.max(1,Math.floor(ty*h/T)),y1=Math.min(h-1,Math.floor((ty+1)*h/T));
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=y*w+x,v=4*L[i]-L[i-1]-L[i+1]-L[i-w]-L[i+w];s+=v;s2+=v*v;n++}
    if(n)vals.push(s2/n-(s/n)**2)}
  vals.sort((a,b)=>a-b);return vals[Math.floor(vals.length*.9)]||0}

function exposure({L}){let s=0,hi=0,lo=0;for(const v of L){s+=v;if(v>=253)hi++;if(v<=2)lo++}const n=L.length;return {mean:s/n,hi:hi/n,lo:lo/n}}

/* טביעת אצבע של התמונה (dHash, 64 ביט): זהה גם אחרי שינוי גודל או דחיסה */
function dhash(im){const c=document.createElement('canvas');c.width=9;c.height=8;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0,9,8);
  const d=g.getImageData(0,0,9,8).data,L=[];for(let i=0;i<d.length;i+=4)L.push(.299*d[i]+.587*d[i+1]+.114*d[i+2]);
  let bits='';for(let y=0;y<8;y++)for(let x=0;x<8;x++)bits+=L[y*9+x]>L[y*9+x+1]?'1':'0';
  let hex='';for(let i=0;i<64;i+=4)hex+=parseInt(bits.slice(i,i+4),2).toString(16);return hex}
const hamming=(a,b)=>{let n=0;for(let i=0;i<16;i++){let x=parseInt(a[i],16)^parseInt(b[i],16);while(x){n+=x&1;x>>=1}}return n};

const cm=px=>Math.round(px/DPI_OK*2.54);
window.labelDpi=(w,h)=>Math.round(Math.min(w/AREA.w,h/AREA.h));

/* הבדיקה עצמה. מחזירה חסימות (אי אפשר להעלות) והערות (אפשר להעלות אחרי שקוראים) */
window.fileCheck=async function(file,src){
  const ext=(file?.name||'').split('.').pop().toLowerCase(),EXT={heic:'image/heic',heif:'image/heif',gif:'image/gif',bmp:'image/bmp',pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',tif:'image/tiff',tiff:'image/tiff'};
  const type=file?(file.type||EXT[ext]||''):'';const blocks=[],warns=[],info={type,mb:file?+(file.size/1048576).toFixed(1):null,kb:file?Math.round(file.size/1024):null};
  if(file&&!OK_TYPES.includes(type)){
    blocks.push({k:'type',t:'סוג הקובץ לא מתאים',d:`${TYPE_HELP[type]||'הקובץ הזה'} לא מתאים להדפסה. כדאי לשמור או לייצא את התמונה כ-JPEG או PNG, ולהעלות שוב.`});
    return {ok:false,blocks,warns,info}}
  if(file&&info.mb>MAX_MB)blocks.push({k:'mb',t:'הקובץ גדול מדי',d:`הקובץ שוקל ${info.mb} מגה, והמקסימום הוא ${MAX_MB}. אפשר לשמור אותו כ-JPEG באיכות גבוהה (90%) ולהעלות שוב.`});
  let im;try{im=await new Promise((ok,bad)=>{const x=new Image();x.onload=()=>ok(x);x.onerror=bad;x.src=src})}
  catch(e){blocks.push({k:'open',t:'הקובץ לא נפתח',d:'ייתכן שהוא פגום או שמור בצבעי דפוס (CMYK). כדאי לשמור אותו מחדש כ-JPEG רגיל (RGB) ולהעלות שוב.'});return {ok:false,blocks,warns,info}}
  const w=im.naturalWidth,h=im.naturalHeight,dpi=labelDpi(w,h);Object.assign(info,{w,h,dpi,printCm:[cm(w),cm(h)]});
  if(file&&/jpe?g/.test(type)){try{info.metaDpi=jfifDpi(await file.slice(0,64).arrayBuffer())}catch(e){}}
  if(dpi<DPI_MIN){const need=[Math.ceil(AREA.w*DPI_OK),Math.ceil(AREA.h*DPI_OK)];
    blocks.push({k:'dpi',t:'הרזולוציה נמוכה מדי להדפסה',d:`בתמונה ${w.toLocaleString()}×${h.toLocaleString()} פיקסלים. על התווית זה יוצא ${dpi} DPI, וצריך לפחות ${DPI_MIN} (מומלץ ${DPI_OK}). בהדפסה הציור ייראה מטושטש ומפוקסל. כדאי לצלם שוב במצלמה טובה או לסרוק, כך שיהיו לפחות ${need[0].toLocaleString()}×${need[1].toLocaleString()} פיקסלים, ולהעלות את הקובץ המקורי ולא צילום מסך או תמונה מוואטסאפ.`})}
  else if(dpi<DPI_OK)warns.push({k:'dpi',t:'רזולוציה גבולית',d:`על התווית זה יוצא ${dpi} DPI. ההדפסה תהיה סבירה, אבל לא חדה לגמרי, במיוחד אם מגדילים את הציור בעורך. מומלץ ${DPI_OK} DPI ומעלה.`});
  if(Math.max(w,h)/Math.min(w,h)>4)warns.push({k:'ratio',t:'צורה צרה מאוד',d:'הציור ארוך וצר מאוד, ועל התווית ייכנס רק חלק ממנו.'});
  const px=pixels(im,640),sh=sharpness(px),ex=exposure(px);Object.assign(info,{sharp:Math.round(sh),mean:Math.round(ex.mean)});
  if(sh<18)warns.push({k:'blur',t:'התמונה נראית לא חדה',d:'אולי המצלמה זזה, או שהפוקוס לא היה על הציור. כדאי לצלם שוב עם חצובה או באור טוב יותר.'});
  if(ex.mean<45||ex.lo>.25)warns.push({k:'dark',t:'התמונה כהה מאוד',d:'ייתכן שהצילום היה באור חלש. בדפוס ציור כהה נראה עוד יותר כהה.'});
  if(ex.mean>235||ex.hi>.2)warns.push({k:'bright',t:'יש אזורים שרופים מאור',d:'חלק מהתמונה לבן לגמרי, כנראה מהבזק או מאור חזק. הפרטים שם לא יודפסו.'});
  if(file&&/jpe?g/.test(type)&&file.size/(w*h)<.06)warns.push({k:'comp',t:'הקובץ דחוס מאוד',d:'נראה שהתמונה עברה דחיסה, למשל בוואטסאפ או ברשת חברתית. עדיף להעלות את הקובץ המקורי מהמצלמה.'});
  info.metaNote=info.metaDpi&&info.metaDpi<300?`בקובץ רשום ${info.metaDpi} DPI. זה לא משנה: מה שקובע הוא מספר הפיקסלים, והוא נבדק כאן.`:'';
  const hash=dhash(im);info.phash=hash;
  const dup=((typeof S!=='undefined'&&S.works)||[]).find(x=>x.phash&&hamming(x.phash,hash)<=5);
  if(dup)blocks.push({k:'dup',t:'היצירה כבר נמצאת במאגר',d:`זו נראית אותה תמונה כמו "${dup.t}". אם זו יצירה אחרת שדומה מאוד, אפשר לפנות למנהל המערכת.`});
  return {ok:!blocks.length,blocks,warns,info};
};

/* תצוגת התוצאה בטופס ההעלאה */
window.checkHtml=function(c){if(!c)return '<p class="note" style="margin-top:4px">בודקים את הקובץ…</p>';
  const i=c.info,row=(sym,cls,x)=>`<div style="display:flex;gap:10px;align-items:flex-start;margin-top:8px"><span class="${cls}" aria-hidden="true" style="flex:none;font-weight:700">${sym}</span><div><b style="font-weight:600">${x.t}</b><div class="note" style="margin:2px 0 0">${x.d}</div></div></div>`;
  const ok=!c.blocks.length&&!c.warns.length;
  return `<div class="panel" role="status" style="margin-top:10px">
    <b style="font-weight:600">${c.blocks.length?'אי אפשר להעלות את הקובץ הזה':c.warns.length?'הקובץ מתאים, עם כמה הערות':'✓ הקובץ מתאים להדפסה'}</b>
    ${i.w?`<div class="note" style="margin:4px 0 0"><span class="num">${i.w.toLocaleString()}×${i.h.toLocaleString()}</span> פיקסלים · <span class="num">${i.dpi}</span> DPI על התווית${i.kb!=null?` · <span class="num">${i.kb>=1024?i.mb+'</span> מגה':i.kb+'</span> ק״ב'}`:''}${ok?` · אפשר להדפיס עד ${i.printCm[0]}×${i.printCm[1]} ס״מ באיכות מלאה`:''}</div>`:''}
    ${c.blocks.map(x=>row('✗','bad',x)).join('')}${c.warns.map(x=>row('!','',x)).join('')}
    ${i.metaNote?`<p class="note" style="margin:8px 0 0">${i.metaNote}</p>`:''}
    ${c.warns.length&&!c.blocks.length?`<label style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:14.5px"><input type="checkbox" id="ackw" ${(typeof S!=='undefined'&&S.upload?._ack)?'checked':''} data-in="ackw"> קראתי, להעלות בכל זאת</label>`:''}
  </div>`};
window.checkPass=c=>!!c&&c.ok&&(!c.warns.length||!!(typeof S!=='undefined'&&S.upload?._ack));
})();
