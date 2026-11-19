import os,sys
D=os.path.dirname(os.path.abspath(__file__))
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(viewport={'width':390,'height':844},accept_downloads=True);ctx.route('**fonts.googleapis**',lambda r:r.abort())
    pg=ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)));pg.goto('http://localhost:8778/?demo');pg.wait_for_timeout(400)
    pg.evaluate("localStorage.clear()");pg.reload();pg.wait_for_timeout(400)
    pg.evaluate("S.login=2;render()");pg.click('[data-a=role][data-v=winery]');pg.wait_for_timeout(600);pg.evaluate("closeSheet()");pg.wait_for_timeout(300)
    pg.evaluate("go('deal-103')");pg.wait_for_timeout(300)
    with pg.expect_download() as dl: pg.click('[data-a=files]')
    d=dl.value;d.save_as(D+'/out/print.png');print('download',d.suggested_filename)
    with ctx.expect_page() as np: pg.click('[data-a=contractpdf]')
    w=np.value;w.wait_for_load_state();print('contract tab:',w.inner_text('body')[:120].replace('\n',' | '));w.screenshot(path=D+'/out/contract.png',full_page=True)
    with ctx.expect_page() as np: pg.click('[data-a=invoicepdf]')
    w=np.value;w.wait_for_load_state();print('invoice tab:',w.inner_text('body')[:100].replace('\n',' | '))
    print('ERR',errs);b.close()
