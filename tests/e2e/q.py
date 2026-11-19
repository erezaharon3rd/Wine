import os,sys,json
D=os.path.dirname(os.path.abspath(__file__))
from playwright.sync_api import sync_playwright
MOCK=open(D+'/mock.js').read()
src=open(D+'/t2.py').read();exec(src[src.index('def init'):src.index('errs=[]')])
errs=[];I=lambda n:D+'/img/'+n
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(viewport={'width':390,'height':844})
    ctx.route('**/supabase-js@2',lambda r:r.fulfill(body=MOCK,content_type='application/javascript'));ctx.route('**fonts.g**',lambda r:r.abort())
    s=init('gallery','g1');ctx.add_init_script('window.MOCK_INIT='+json.dumps(s)+';')
    pg=ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)));pg.goto('http://localhost:8777/');pg.wait_for_timeout(1500)
    if pg.is_visible('#ov .sheet'):pg.evaluate("closeSheet()")
    pg.evaluate("go('tab-works')");pg.wait_for_timeout(300)
    def up(name):
        pg.evaluate("S.upload=null;uploadSheet()");pg.wait_for_timeout(200)
        pg.set_input_files('[data-in=file]',I(name));pg.wait_for_timeout(1800)
        t=pg.inner_text('#ov .sheet [role=status]') if pg.is_visible('#ov .sheet [role=status]') else '';dis=pg.is_disabled('[data-a=doupload]')
        return t.replace('\n',' | ')[:260],dis
    r={}
    for n in ['good.jpg','small.jpg','blur.jpg','fake.heic','lowq.jpg']:
        r[n]=up(n);print(n,'disabled' if r[n][1] else 'enabled','::',r[n][0])
    assert not r['good.jpg'][1] and 'מתאים להדפסה' in r['good.jpg'][0]
    assert r['small.jpg'][1] and 'נמוכה מדי' in r['small.jpg'][0]
    assert r['fake.heic'][1] and 'אייפון' in r['fake.heic'][0]
    assert 'לא חדה' in r['blur.jpg'][0] and r['blur.jpg'][1]
    pg.check('#ackw');pg.wait_for_timeout(300);print('after ack enabled:',not pg.is_disabled('[data-a=doupload]'));assert not pg.is_disabled('[data-a=doupload]')
    pg.screenshot(path=D+'/out/q_blur.png',full_page=True)
    # העלאה טובה נשמרת עם טביעת אצבע, וכפילות נחסמת
    up('good.jpg');pg.fill('#ut','פרח');pg.click('[data-a=doupload]');pg.wait_for_timeout(1500)
    w=json.loads(pg.evaluate("localStorage.mockdb"))['db']['works'][-1];print('saved:',w.get('phash'),w.get('file_check'))
    assert w.get('phash') and w['file_check']['ok']
    pg.evaluate("S.works.push({id:999,t:'פרח',phash:%s,st:'live'})"%json.dumps(w['phash']))
    t,dis=up('good.jpg');print('duplicate:',dis,t[:120]);assert dis and 'כבר נמצאת' in t
    print('ERR',errs);b.close()
