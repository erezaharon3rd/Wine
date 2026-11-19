import os,sys
D=os.path.dirname(os.path.abspath(__file__))
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2);ctx.route('**fonts.googleapis**',lambda r:r.abort())
    pg=ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)));pg.goto('http://localhost:8778/?demo');pg.evaluate("localStorage.clear()");pg.reload();pg.wait_for_timeout(1500)
    pg.screenshot(path=D+'/out/m0.png')
    pg.evaluate("S.login=2;render()");pg.click('[data-a=role][data-v=customer]');pg.wait_for_timeout(700);pg.evaluate("closeSheet()");pg.wait_for_timeout(900)
    pg.screenshot(path=D+'/out/m1.png')
    pg.click('[data-v=cart-erez]');pg.wait_for_timeout(250);pg.screenshot(path=D+'/out/m2a.png');pg.wait_for_timeout(900)
    pg.click('[data-a=cpick][data-v="3"]');pg.wait_for_timeout(300);pg.screenshot(path=D+'/out/m3a.png');pg.wait_for_timeout(1500);pg.screenshot(path=D+'/out/m3.png')
    pg.click('.actbar [data-v=cedit-1]');pg.wait_for_timeout(1200);pg.click('[data-a=cset][data-v="wine:2"]');pg.wait_for_timeout(150);print('rolling price:',pg.inner_text('.pbar .num'));pg.wait_for_timeout(600);print('final:',pg.inner_text('.pbar .num'))
    pg.screenshot(path=D+'/out/m4.png')
    pg.evaluate("toast('ההזמנה נשלחה ליקב')");pg.wait_for_timeout(350);pg.screenshot(path=D+'/out/m5.png')
    print('ERR',errs);b.close()
