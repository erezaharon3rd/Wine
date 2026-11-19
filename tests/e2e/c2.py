import os,sys
D=os.path.dirname(os.path.abspath(__file__))
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(viewport={'width':390,'height':844});ctx.route('**fonts.googleapis**',lambda r:r.abort())
    pg=ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)));pg.goto('http://localhost:8778/?demo');pg.wait_for_timeout(400)
    pg.evaluate("localStorage.clear()");pg.reload();pg.wait_for_timeout(400)
    pg.evaluate("S.login=2;render()");pg.click('[data-a=role][data-v=artist]');pg.wait_for_timeout(600);pg.evaluate("closeSheet()");pg.wait_for_timeout(300)
    pg.evaluate("go('tab-profile')");pg.wait_for_timeout(300);pg.fill('#cctry','צרפת');pg.click('[data-a=ccountry]');pg.wait_for_timeout(300)
    pg.evaluate("A.role('customer')");pg.wait_for_timeout(600);pg.evaluate("closeSheet()");pg.wait_for_timeout(300)
    print(pg.inner_text('#m')[:260].replace('\n',' | '))
    pg.click('[data-a=ccf][data-v=צרפת]');pg.wait_for_timeout(200);print('filtered cards:',len(pg.query_selector_all('.acard')))
    pg.click('[data-v=cart-erez]');pg.wait_for_timeout(300);print(pg.inner_text('#m')[:120].replace('\n',' | '))
    print('ERR',errs);b.close()
