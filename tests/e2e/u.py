import os,sys
D=os.path.dirname(os.path.abspath(__file__))
import json
from playwright.sync_api import sync_playwright
MOCK=open(D+'/mock.js').read()
exec(open(D+'/t2.py').read().split('errs=[]')[0].split('MOCK=open')[0])
src=open(D+'/t2.py').read();init_code=src[src.index('def init'):src.index('errs=[]')]
exec(init_code)
PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(st,url):
        ctx=b.new_context(viewport={'width':390,'height':844});ctx.route('**/supabase-js@2',lambda r:r.fulfill(body=MOCK,content_type='application/javascript'));ctx.route('**fonts.googleapis**',lambda r:r.abort())
        if st:ctx.add_init_script('window.MOCK_INIT='+json.dumps(st)+';')
        pg=ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)));pg.goto(url);pg.wait_for_timeout(800);return pg
    def fill(pg):
        pg.evaluate(f"S.upload={{src:'{PNG}',cells:{{}},w:2400,h:3000,e:{{}}}};uploadSheet()");pg.wait_for_timeout(300)
        pg.evaluate("document.querySelectorAll('#ov details').forEach(d=>d.open=true)");pg.fill('#ut','בדיקה');pg.fill('#utc','אקריליק');pg.fill('#uy','2025');pg.fill('#uh','80');pg.fill('#uw','60');pg.select_option('#utn','כחול');pg.fill('#ust','סיפור קצר')
        pg.screenshot(path=D+'/out/up.png',full_page=True)
        pg.click('[data-a=doupload]');pg.wait_for_timeout(800)
    # demo: gallery uploads
    pg=page(None,'http://localhost:8778/?demo');pg.evaluate("localStorage.clear()");pg.reload();pg.wait_for_timeout(400)
    pg.evaluate("S.login=2;render()");pg.click('[data-a=role][data-v=gallery]');pg.wait_for_timeout(600);pg.evaluate("closeSheet()");pg.wait_for_timeout(300)
    pg.evaluate("go('tab-works')");pg.wait_for_timeout(300);fill(pg)
    print('demo new work:',pg.evaluate("JSON.stringify((({t,tech,y,sz,tone,orig})=>({t,tech,y,sz,tone,orig}))(S.works.at(-1)))"))
    pg.evaluate("A.role('winery')");pg.wait_for_timeout(400);pg.evaluate("closeSheet()");pg.evaluate("go('work-1')");pg.wait_for_timeout(300);print('work page:',pg.inner_text('#m')[:200].replace('\n',' | '))
    # live: gallery role
    st=init('gallery','g1');pg=page(st,'http://localhost:8777/');pg.evaluate("closeSheet()");pg.wait_for_timeout(300)
    pg.evaluate("go('tab-works')");pg.wait_for_timeout(300);fill(pg)
    print('live inserted:',pg.evaluate("JSON.stringify(JSON.parse(localStorage.mockdb).db.works.at(-1))")[:300])
    print('ERR',errs);b.close()
