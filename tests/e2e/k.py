import os,sys,json
D=os.path.dirname(os.path.abspath(__file__))
from playwright.sync_api import sync_playwright
MOCK=open(D+'/mock.js').read()
src=open(D+'/t2.py').read();exec(src[src.index('def init'):src.index('errs=[]')])
TS="window.turnstile={render(el,o){el.textContent='בדיקה';setTimeout(()=>o.callback('tok123'),50);return 1},reset(){window.__resets=(window.__resets||0)+1}}"
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    def ctxf(s,extra=''):
        ctx=b.new_context(viewport={'width':390,'height':844});ctx.route('**/supabase-js@2',lambda r:r.fulfill(body=MOCK,content_type='application/javascript'));ctx.route('**fonts.g**',lambda r:r.abort())
        ctx.route('**challenges.cloudflare.com/**',lambda r:r.fulfill(body=TS,content_type='application/javascript'))
        ctx.add_init_script(extra+'if(!localStorage.mockdb)window.MOCK_INIT='+json.dumps(s)+';');return ctx
    # הגנה מרובוטים: כשיש מפתח, הכניסה שולחת את האסימון
    ctx=ctxf(init('winery','w1',session=False),"window.__ks=1;");pg=ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.route('**/config.js',lambda r:r.fulfill(body=open(D+'/../../Portal/config.js').read().replace("TURNSTILE_SITEKEY=''","TURNSTILE_SITEKEY='site-key'"),content_type='application/javascript'))
    pg.goto('http://localhost:8777/');pg.wait_for_timeout(1500)
    print('captcha box:',pg.is_visible('#cap'));assert pg.is_visible('#cap')
    pg.fill('#lem','me@x.com');pg.fill('#lpw','12345678');pg.click('[data-a=lin]');pg.wait_for_timeout(1200)
    cap=pg.evaluate("JSON.parse(localStorage.mockdb).lastCap");print('token sent:',cap);assert cap=='tok123'
    ctx.close()
    # בלי מפתח: אין תיבה, והכניסה עובדת
    ctx=ctxf(init('winery','w1',session=False));pg=ctx.new_page();pg.goto('http://localhost:8777/');pg.wait_for_timeout(1200)
    print('no key box:',pg.is_visible('#cap'));assert not pg.is_visible('#cap')
    ctx.close()
    # שגיאה בדפדפן נשלחת לשרת, ומופיעה למנהל
    ctx=ctxf(init('winery','w1'));pg=ctx.new_page();pg.goto('http://localhost:8777/');pg.wait_for_timeout(1500)
    pg.evaluate("setTimeout(()=>{throw new Error('בדיקת שגיאה')},0)");pg.wait_for_timeout(500)
    e=pg.evaluate("JSON.parse(localStorage.mockdb).db.client_errors||[]");print('reported:',e[0]['message'][:40] if e else None);assert e
    db=json.loads(pg.evaluate("localStorage.mockdb"));ctx.close()
    s=init('admin','o-adm');s['db']['client_errors']=db['db']['client_errors']
    ctx=ctxf(s);pg=ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)));pg.goto('http://localhost:8777/');pg.wait_for_timeout(1600)
    if pg.is_visible('#ov .sheet'):pg.evaluate("closeSheet()")
    pg.evaluate("go('tab-log')");pg.wait_for_timeout(500);t=pg.inner_text('#m');print('admin sees:', 'שגיאות באתר' in t and 'בדיקת שגיאה' in t);assert 'בדיקת שגיאה' in t
    pg.click('[data-a=errok]');pg.wait_for_timeout(700);print('resolved:',json.loads(pg.evaluate("localStorage.mockdb"))['db']['client_errors'][0]['resolved'])
    print('ERR',errs);b.close()
