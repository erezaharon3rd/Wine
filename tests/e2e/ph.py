"""כניסה עם נייד: מספר לא תקין נחסם, קוד ב־SMS נשלח למספר המנורמל, קוד שגוי מוצג כשגיאה, קוד נכון נכנס."""
import os,json
D=os.path.dirname(os.path.abspath(__file__))
from playwright.sync_api import sync_playwright
MOCK=open(D+'/mock.js').read()
src=open(D+'/t2.py').read();exec(src[src.index('def init'):src.index('errs=[]')])
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={'width':390,'height':844});ctx.route('**/supabase-js@2',lambda r:r.fulfill(body=MOCK,content_type='application/javascript'));ctx.route('**fonts.g**',lambda r:r.abort())
    ctx.add_init_script('window.GA_GUIDE_TEST=0;if(!localStorage.mockdb)window.MOCK_INIT='+json.dumps(init('winery','w1',session=False))+';')
    pg=ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)));pg.goto('http://localhost:8777/');pg.wait_for_timeout(1500)
    assert pg.is_visible('#lph') and pg.is_visible('#lem'),'phone and email both offered'
    pg.fill('#lph','02-6234567');pg.click('[data-a=lsms]');pg.wait_for_timeout(300)
    assert pg.is_visible('#lpherr'),'landline refused'
    pg.fill('#lph','054-123 4567');pg.press('#lph','Enter');pg.wait_for_timeout(600)
    o=pg.evaluate("JSON.parse(localStorage.mockdb).lastOtp");assert o['phone']=='+972541234567' and o['options']['channel']=='sms',o
    assert '054-123-4567' in pg.inner_text('.login')
    pg.fill('#lotp','111111');pg.wait_for_timeout(700)
    assert pg.is_visible('#lotperr') and 'לא נכון' in pg.inner_text('#lotperr')
    pg.click('[data-a=lsms]');pg.wait_for_timeout(300)
    pg.fill('#lotp','123456');pg.wait_for_timeout(2000)
    assert pg.evaluate("window.LIVE&&ME&&ME.role")=='winery','signed in'
    print('ERR',errs);assert not errs;b.close()
