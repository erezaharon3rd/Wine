"""הדרכה לפי תפקיד: נפתחת לבד בפעם הראשונה, אפשר לדלג ולסגור, לא חוזרת לבד, ותמיד נפתחת מהכפתור."""
import os,json
D=os.path.dirname(os.path.abspath(__file__))
from playwright.sync_api import sync_playwright
MOCK=open(D+'/mock.js').read()
src=open(D+'/t2.py').read();exec(src[src.index('def init'):src.index('errs=[]')])
sh=open(D+'/sh.py').read();SHOPMOCK=sh[sh.index('MOCK="""')+8:sh.index('""" % json.dumps(CAT)')]%json.dumps({'open':True,'lead_days':21,'packages':[],'artists':[],'works':[],'wines':[],'series':[]})
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    def ctx(body):
        c=b.new_context(viewport={'width':390,'height':760});c.route('**/supabase-js@2',lambda r:r.fulfill(body=body,content_type='application/javascript'));c.route('**fonts.g**',lambda r:r.abort())
        c.add_init_script('window.GA_GUIDE_TEST=1;');return c
    pg=ctx(SHOPMOCK).new_page();pg.on('pageerror',lambda e:errs.append(str(e)));pg.goto('http://localhost:8777/shop.html');pg.wait_for_timeout(1600)
    assert pg.is_visible('.gd'),'shop guide should open on first visit'
    n=pg.locator('.gd-dots button').count();assert n>=8,n
    pg.click('.gd-next');pg.wait_for_timeout(200);assert pg.locator('.gd-dots [aria-current]').get_attribute('data-i')=='1'
    pg.keyboard.press('Escape');pg.wait_for_timeout(200);assert not pg.is_visible('.gd')
    pg.reload();pg.wait_for_timeout(1500);assert not pg.is_visible('.gd'),'should not reopen by itself'
    pg.click('#nav-guide');pg.wait_for_timeout(300);assert pg.is_visible('.gd');pg.click('button.gd-skip');assert not pg.is_visible('.gd')
    for role,org in [('artist',''),('admin','o-adm')]:
        c=ctx(MOCK);c.add_init_script('if(!localStorage.mockdb)window.MOCK_INIT='+json.dumps(init(role,org))+';')
        q=c.new_page();q.on('pageerror',lambda e:errs.append(str(e)));q.goto('http://localhost:8777/');q.wait_for_timeout(2400)
        assert q.is_visible('.gd'),role+': guide should open on first login';assert 'מדריך' in q.inner_text('.gd-top')
        q.click('.gd-x');q.wait_for_timeout(200);assert not q.is_visible('.gd')
        q.click('header [data-a=introshow]');q.wait_for_timeout(300);assert q.is_visible('.gd'),role+': help button'
        print(role,'ok')
    print('ERR',errs);b.close()
