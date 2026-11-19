/* סדנת התווית · שכבת חוויה: גוונים, תנועה עדינה ורגעי הצלחה.
   עיקרון: הכל שקט ואפור, הבקבוק הוא הגיבור, וזהב מופיע רק כשמשהו הושג. */
'use strict';
(function(){
document.head.insertAdjacentHTML('beforeend',`<style>
:root{--bg:#EEEDEA;--surface:#FBFBF9;--ink:#1D1D1B;--muted:#5E5D59;--soft:#77766F;--line:#DCDBD7;--gold:#A6884A;--gold2:#C9AE72;--goldsoft:rgba(166,136,74,.13);--ease:cubic-bezier(.2,.8,.2,1);--spring:cubic-bezier(.2,.9,.25,1.12)}
body{background:#E2E1DD}
.app{box-shadow:0 0 0 1px rgba(0,0,0,.03),0 30px 80px -40px rgba(0,0,0,.25)}
h1{font-size:34px;letter-spacing:-.015em}
.login h1{font-size:46px;letter-spacing:-.02em}
::selection{background:var(--goldsoft)}
:focus-visible{outline:2px solid var(--gold);outline-offset:2px}

/* touch: everything answers the finger */
.btn,.chip,.li,.tile,.acard,.role,.tabbar button,.hero,.ib{transition:transform .14s var(--ease),box-shadow .2s var(--ease),border-color .2s,background-color .2s,color .2s}
.btn:active:not(:disabled),.chip:active,.li:active,.tile:active,.acard:active:not([disabled]),.role:active{transform:scale(.975)}
.btn:not(.alt):not(.danger){background:linear-gradient(#2A2A28,#1D1D1B);box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 1px 2px rgba(0,0,0,.12)}
.tile,.acard,.li{box-shadow:0 1px 0 rgba(0,0,0,.02)}
@media (hover:hover){.tile:hover,.acard:hover:not([disabled]),.li:hover{border-color:#C9C8C3;box-shadow:0 8px 22px -14px rgba(0,0,0,.28)}}

/* screens arrive: a short settle, deeper screens come in from the side */
main.enter>*{animation:mSettle .42s var(--ease) both}
main.enter.deep>*{animation-name:mSlide}
main.enter>*:nth-child(2){animation-delay:.03s}main.enter>*:nth-child(3){animation-delay:.06s}main.enter>*:nth-child(4){animation-delay:.09s}main.enter>*:nth-child(n+5){animation-delay:.12s}
main.enter .list>*,main.enter .grid>*,main.enter .acard{animation:mSettle .5s var(--ease) both;animation-delay:calc(.08s + var(--i,0)*.035s)}
@keyframes mSettle{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes mSlide{from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:none}}

/* the bottle is the hero: it rises once, and light passes over the glass */
.hero{overflow:hidden;background:radial-gradient(120% 90% at 50% 20%,#F6F5F2 0%,#E7E6E2 60%,#DEDDD8 100%)}
.hero::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.55) 50%,transparent 65%);transform:translateX(-120%)}
main.enter .hero svg,main.enter .hero img{animation:bRise .9s var(--spring) both .08s}
main.enter .hero::after{animation:sweep 1.4s var(--ease) .5s both}
.hero svg{filter:drop-shadow(0 18px 14px rgba(0,0,0,.16)) drop-shadow(0 3px 3px rgba(0,0,0,.12))}
@keyframes bRise{from{opacity:0;transform:translateY(22px) scale(.96)}to{opacity:1;transform:none}}
@keyframes sweep{from{transform:translateX(-120%)}to{transform:translateX(120%)}}
#cprev svg,#tryh svg{transition:filter .3s}
.hero.foil::after{background:linear-gradient(105deg,transparent 30%,rgba(201,174,114,.65) 48%,rgba(255,244,214,.8) 50%,rgba(201,174,114,.6) 52%,transparent 70%);animation:sweep 1.1s var(--ease) both}

/* choices: a soft gold check pops in */
.chip[aria-pressed="true"]{border-color:var(--ink);background:var(--surface)}
.chip[aria-pressed="true"]::before{color:var(--gold);animation:pop .32s var(--spring)}
@keyframes pop{from{transform:scale(.2);opacity:0}to{transform:none;opacity:1}}

/* progress reads like levels: finished stages in ink, the current one in gold */
.stages i{position:relative;overflow:hidden}
.stages i.done{background:var(--line)}
.stages i.done::after{content:"";position:absolute;inset:0;background:var(--ink);transform-origin:right;animation:fill .5s var(--ease) both;animation-delay:calc(var(--i,0)*.08s + .15s)}
.stages i.done:last-of-type::after,.stages i.done.now::after{background:var(--gold)}
@keyframes fill{from{transform:scaleX(0)}to{transform:none}}
.steps button{transition:border-color .3s,color .3s}
.steps button[aria-current="step"]{border-color:var(--gold)}
.steps button.done{border-color:var(--ink)}

/* tabbar: a gold point marks where you are */
.tabbar{background:rgba(238,237,234,.92);backdrop-filter:saturate(1.2) blur(10px);-webkit-backdrop-filter:saturate(1.2) blur(10px)}
.tabbar button{position:relative}
.tabbar button[aria-current="page"]::after{content:"";position:absolute;bottom:2px;width:4px;height:4px;border-radius:50%;background:var(--gold);animation:pop .35s var(--spring)}
.top{background:rgba(238,237,234,.92);backdrop-filter:saturate(1.2) blur(10px);-webkit-backdrop-filter:saturate(1.2) blur(10px)}

/* sheets rise with a little spring, the room behind dims */
.ov{animation:ovIn .25s ease both}
.ov .sheet{animation:shUp .42s var(--spring) both;box-shadow:0 -20px 50px -30px rgba(0,0,0,.35)}
@keyframes ovIn{from{background:rgba(0,0,0,0)}}
@keyframes shUp{from{transform:translateY(40px);opacity:.4}to{transform:none;opacity:1}}

/* toast: slides up, a hairline counts down */
.toast{transition:opacity .25s,transform .35s var(--spring);transform:translate(-50%,12px)}
.toast.on{transform:translate(-50%,0)}
.toast::after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--gold2);transform-origin:right;transform:scaleX(0)}
.toast.on::after{animation:count 2.6s linear both}
.toast.win{background:linear-gradient(#24231F,#1A1916);box-shadow:0 0 0 1px rgba(201,174,114,.5),0 12px 30px -12px rgba(166,136,74,.5)}
@keyframes count{from{transform:scaleX(1)}to{transform:scaleX(0)}}

/* the price: numbers roll instead of jumping */
.pbar{background:rgba(251,251,249,.94);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
.pbar .dlt{animation:pop .35s var(--spring)}
main.enter~.actbar{animation:barUp .45s var(--spring) both}
@keyframes barUp{from{transform:translate(-50%,100%)}to{transform:translate(-50%,0)}}

/* the moment something is achieved: a small burst of gold leaf */
.burst{position:fixed;z-index:40;pointer-events:none;width:0;height:0}
.burst i{position:absolute;width:6px;height:6px;border-radius:1px;background:var(--gold2);animation:leaf .9s var(--ease) forwards;transform:rotate(var(--r)) translate(0) }
.burst i:nth-child(odd){background:var(--gold);width:4px;height:8px}
@keyframes leaf{0%{opacity:1;transform:rotate(var(--r)) translateY(0) scale(1)}100%{opacity:0;transform:rotate(var(--r)) translateY(calc(-1*var(--d))) scale(.4)}}
.seal{position:fixed;z-index:41;pointer-events:none;left:50%;top:38%;width:76px;height:76px;margin:-38px 0 0 -38px;border-radius:50%;display:grid;place-items:center;
  background:radial-gradient(circle at 35% 30%,#E6D3A2,#B8995A 55%,#8E7238);color:#FFF8E6;font-family:var(--display);font-size:30px;box-shadow:0 10px 30px -10px rgba(120,95,40,.6),inset 0 1px 2px rgba(255,255,255,.5);animation:seal 1.3s var(--spring) forwards}
@keyframes seal{0%{opacity:0;transform:scale(.3) rotate(-25deg)}25%{opacity:1;transform:scale(1.06) rotate(4deg)}40%{transform:scale(1) rotate(0)}80%{opacity:1}100%{opacity:0;transform:scale(.96) translateY(-14px)}}

/* login: one orchestrated entrance */
.login>*{animation:mSettle .7s var(--ease) both}
.login>*:nth-child(2){animation-delay:.08s}.login>*:nth-child(3){animation-delay:.16s}.login>*:nth-child(n+4){animation-delay:.24s}
.login h1{background:linear-gradient(100deg,var(--ink) 40%,#6F5C33 50%,var(--ink) 60%);background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:mSettle .7s var(--ease) both,ink 2.4s var(--ease) .5s both}
@keyframes ink{from{background-position:100% 0}to{background-position:0 0}}

/* artists as characters to choose */
.acard .face{transition:transform .3s var(--spring)}
.acard:active .face{transform:scale(1.06)}
.face{box-shadow:0 0 0 3px var(--surface),0 0 0 4px var(--line)}
main.enter .face:not(.sm){animation:bRise .8s var(--spring) both}

@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}.login h1{color:var(--ink);background:none}}
</style>`);

/* ── screen changes: settle, or slide when going deeper ── */
let lastKey='',lastDepth=0;
const _render=render;
render=function(){
  const key=JSON.stringify([S.role,S.tab,S.view]),depth=S.view?1:0,changed=key!==lastKey;
  const prevNum=readPrice();
  _render();
  const m=document.getElementById('m');
  if(m&&changed){m.classList.remove('enter','deep');void m.offsetWidth;m.classList.add('enter');if(depth>lastDepth)m.classList.add('deep');
    m.querySelectorAll('.list,.grid').forEach(l=>[...l.children].forEach((c,i)=>c.style.setProperty('--i',Math.min(i,10))));
    m.querySelectorAll('.acard').forEach((c,i)=>c.style.setProperty('--i',i));
    m.querySelectorAll('.stages').forEach(st=>{const d=[...st.children];d.forEach((c,i)=>c.style.setProperty('--i',i));const last=d.filter(x=>x.classList.contains('done')).pop();if(last)last.classList.add('now')});
    clearTimeout(window._enterT);window._enterT=setTimeout(()=>m.classList.remove('enter','deep'),1600)}
  else if(m){m.querySelectorAll('.stages').forEach(st=>{const last=[...st.children].filter(x=>x.classList.contains('done')).pop();if(last)last.classList.add('now')})}
  if(!changed&&prevNum!=null)rollPrice(prevNum);
  lastKey=key;lastDepth=depth;
};

/* ── price roll ── */
function priceEl(){return document.querySelector('.pbar .t b .num')}
function readPrice(){const e=priceEl();if(!e)return null;const n=+e.textContent.replace(/[^\d]/g,'');return isNaN(n)?null:n}
function rollPrice(from){const e=priceEl();if(!e)return;const to=+e.textContent.replace(/[^\d]/g,'');if(!to||from===to)return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const t0=performance.now(),dur=420;const step=t=>{const k=Math.min(1,(t-t0)/dur),ek=1-Math.pow(1-k,3);e.textContent=nis(from+(to-from)*ek);if(k<1)requestAnimationFrame(step)};requestAnimationFrame(step)}

/* ── achievements: gold leaf, a seal, a soft double tap ── */
const WINS=['הבקשה נשלחה','החוזה נחתם','התשלום אושר','ההזמנה נשלחה','הצילום מוכן','ההזמנה אושרה','אישרת','נשלח לבית הדפוס','היצירה במאגר','ההסכמה נשמרה','סומן ששולם','נשמר כעיצוב','נשלח ללקוח לאישור','היצירה נשלחה לאישור'];
function celebrate(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  try{navigator.vibrate&&navigator.vibrate([10,40,14])}catch(e){}
  const seal=document.createElement('div');seal.className='seal';seal.textContent='✦';document.body.appendChild(seal);setTimeout(()=>seal.remove(),1400);
  const b=document.createElement('div');b.className='burst';b.style.left='50%';b.style.top='38%';
  for(let i=0;i<14;i++){const l=document.createElement('i');l.style.setProperty('--r',(i*360/14+Math.random()*14)+'deg');l.style.setProperty('--d',(54+Math.random()*46)+'px');l.style.animationDelay=(Math.random()*.08)+'s';b.appendChild(l)}
  document.body.appendChild(b);setTimeout(()=>b.remove(),1200);
  const h=document.querySelector('#m .hero');if(h){h.classList.remove('foil');void h.offsetWidth;h.classList.add('foil');setTimeout(()=>h.classList.remove('foil'),1300)}
}
window.celebrate=celebrate;
const _toast=toast;
toast=function(t,undo){_toast(t,undo);const e=document.getElementById('toast');const win=WINS.some(w=>String(t).startsWith(w));
  e.classList.toggle('win',win);e.classList.remove('on');void e.offsetWidth;e.classList.add('on');if(win)setTimeout(celebrate,120)};

/* ── a light tap under the finger on primary actions (Android) ── */
document.addEventListener('pointerdown',e=>{const b=e.target.closest('.btn:not(.alt):not(:disabled),.chip');if(b){try{navigator.vibrate&&navigator.vibrate(b.classList.contains('chip')?4:7)}catch(x){}}},{passive:true});
})();
