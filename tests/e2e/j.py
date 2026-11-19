import os,sys,json
D=os.path.dirname(os.path.abspath(__file__))
from playwright.sync_api import sync_playwright
MOCK=open(D+'/mock.js').read()
src=open(D+'/t2.py').read();exec(src[src.index('def init'):src.index('errs=[]')])
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(s,vp=(390,844)):
        ctx=b.new_context(viewport={'width':vp[0],'height':vp[1]});ctx.route('**/supabase-js@2',lambda r:r.fulfill(body=MOCK,content_type='application/javascript'));ctx.route('**fonts.g**',lambda r:r.abort())
        ctx.add_init_script('if(!localStorage.mockdb)window.MOCK_INIT='+json.dumps(s)+';');pg=ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)));pg.goto('http://localhost:8777/');pg.wait_for_timeout(1600)
        if pg.is_visible('#ov .sheet'):pg.evaluate("closeSheet()")
        return pg
    DB=lambda pg,t:json.loads(pg.evaluate(f"JSON.stringify(JSON.parse(localStorage.mockdb).db.{t}||[])"))
    # מי שנרשם בלי קישור: טופס הצטרפות במסך ההמתנה
    pg=page(init('customer','w1',pending=True));pg.wait_for_timeout(600)
    assert pg.is_visible('[data-join] #jn'),'join form missing'
    pg.click('[data-a=jkind][data-v=artist]');pg.wait_for_timeout(200)
    assert pg.get_attribute('[data-a=jkind][data-v=artist]','aria-pressed')=='true'
    pg.fill('#jn','נועה לוי');pg.fill('#jd','צבעי מים, בוטני');pg.fill('#js','instagram.com/noa');pg.click('[data-a=jsend]');pg.wait_for_timeout(800)
    a=DB(pg,'applications');print('application:',a[-1]['kind'],a[-1]['name']);assert a[-1]['kind']=='artist'
    print('after send:',pg.inner_text('[data-join]')[:40].replace('\n',' '));assert 'נשלחה' in pg.inner_text('[data-join]')
    pg.screenshot(path=D+'/out/j_join.png',full_page=True)
    # מנהל מאשר
    s=init('admin','o-adm');s['db']['applications']=[{'id':7,'kind':'artist','name':'נועה לוי','details':'צבעי מים','site':'x','contact':'050','status':'new','created_by':'zz'}]
    pg=page(s);pg.evaluate("go('tab-users')");pg.wait_for_timeout(500)
    assert 'בקשות הצטרפות' in pg.inner_text('#m'),'apps block missing'
    pg.click('[data-a=app][data-v="0:ok"]');pg.wait_for_timeout(300);assert pg.is_visible('#apg'),'gallery select missing'
    pg.click('[data-a=appgo]');pg.wait_for_timeout(900);print('decided:',DB(pg,'applications')[0]['status'],DB(pg,'applications')[0].get('gallery'))
    assert DB(pg,'applications')[0]['status']=='approved'
    # מסך המנוע
    pg.evaluate("go('tab-engine')");pg.wait_for_timeout(500);t=pg.inner_text('#m');print('engine:',t[:90].replace('\n',' | '))
    assert '₪42.5' in t and 'מתוך ₪300' in t
    print('tracked:',pg.evaluate("JSON.parse(localStorage.mockdb).track||0"))
    pg.screenshot(path=D+'/out/j_engine.png',full_page=True)
    # מחשב: ניווט בצד
    pg=page(init('winery','w1'),(1366,860));box=pg.locator('.tabbar').bounding_box();print('desktop nav:',int(box['width']),int(box['height']))
    assert box['width']>200 and box['height']>500
    print('ERR',errs);b.close()
