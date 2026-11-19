import os,sys
D=os.path.dirname(os.path.abspath(__file__))
import json,sys
from playwright.sync_api import sync_playwright
MOCK=open(D+'/mock.js').read()
src=open(D+'/t2.py').read();exec(src[src.index('def init'):src.index('errs=[]')])
CHECK="""()=>{const out=[];const name=e=>(e.getAttribute('aria-label')||e.getAttribute('title')||e.innerText||e.value||e.getAttribute('alt')||'').trim();
 document.querySelectorAll('button,a[href],[role=button]').forEach(e=>{if(!name(e)&&!e.querySelector('img[alt]:not([alt=""])'))out.push('no-name:'+e.outerHTML.slice(0,90))});
 document.querySelectorAll('img').forEach(e=>{if(!e.hasAttribute('alt'))out.push('img-alt:'+e.outerHTML.slice(0,90))});
 document.querySelectorAll('input,select,textarea').forEach(e=>{if(e.type==='hidden')return;const l=e.id&&document.querySelector('label[for="'+e.id+'"]');if(!l&&!e.getAttribute('aria-label')&&!e.closest('label'))out.push('no-label:'+e.outerHTML.slice(0,90))});
 const lum=c=>{const m=c.match(/\\d+(\\.\\d+)?/g);if(!m)return 1;const [r,g,b]=m.slice(0,3).map(x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)});return .2126*r+.7152*g+.0722*b};
 const bg=e=>{while(e){const c=getComputedStyle(e).backgroundColor;if(c&&!/rgba\\(.*, 0\\)|transparent/.test(c))return c;e=e.parentElement}return 'rgb(255,255,255)'};
 document.querySelectorAll('#app *').forEach(e=>{if(!e.childNodes.length||![...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))return;const cs=getComputedStyle(e);if(cs.visibility==='hidden'||cs.display==='none'||e.closest('[disabled]'))return;
  const a=lum(cs.color),b=lum(bg(e));const r=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);const big=parseFloat(cs.fontSize)>=18.6||(parseFloat(cs.fontSize)>=14&&+cs.fontWeight>=700);if(r<(big?3:4.5))out.push('contrast '+r.toFixed(2)+':'+cs.color+' on '+bg(e)+' "'+e.textContent.trim().slice(0,30)+'"')});
 return [...new Set(out)]}"""
res={}
with sync_playwright() as p:
    b=p.chromium.launch()
    for role,org,tabs in [('winery','w1',['home','gallery','designs','deals']),('customer','w1',['artists','orders']),('admin','o-adm',['users','settings','engine']),('gallery','g1',['works']),('artist',None,['profile'])]:
        ctx=b.new_context(viewport={'width':390,'height':844});ctx.route('**/supabase-js@2',lambda r:r.fulfill(body=MOCK,content_type='application/javascript'));ctx.route('**fonts.googleapis**',lambda r:r.abort())
        s=init(role,org)
        if role=='artist':s['db']['artists'][0]['user_id']='u1'
        ctx.add_init_script('window.MOCK_INIT='+json.dumps(s)+';');pg=ctx.new_page();pg.goto('http://localhost:8777/');pg.wait_for_timeout(1500)
        if pg.is_visible('#ov .sheet'):pg.evaluate("closeSheet()")
        for t in tabs:
            pg.evaluate(f"go('tab-{t}')");pg.wait_for_timeout(300)
            for x in pg.evaluate(CHECK):res.setdefault(x,set()).add(f'{role}/{t}')
        ctx.close()
    # login page
    ctx=b.new_context(viewport={'width':390,'height':844});ctx.route('**/supabase-js@2',lambda r:r.fulfill(body=MOCK,content_type='application/javascript'));ctx.route('**fonts.googleapis**',lambda r:r.abort())
    ctx.add_init_script('window.MOCK_INIT='+json.dumps(init('customer','w1',session=False))+';');pg=ctx.new_page();pg.goto('http://localhost:8777/');pg.wait_for_timeout(1200)
    for x in pg.evaluate(CHECK):res.setdefault(x,set()).add('login')
    b.close()
for k,v in sorted(res.items()):print(k[:160],'|',','.join(sorted(v))[:80])
print('TOTAL',len(res))
