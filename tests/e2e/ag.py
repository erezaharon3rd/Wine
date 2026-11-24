"""הסכם אמן: אמן שלא חתם לא מגיע להעלאה, חותם על משטח לרוחב (ביטול צעד, התחלה מחדש), ורואה את החתימה על תווית."""
import os
from playwright.sync_api import sync_playwright
errs=[]
def draw(pg,pts):
    pg.mouse.move(*pts[0]);pg.mouse.down()
    for x,y in pts[1:]:pg.mouse.move(x,y,steps=4)
    pg.mouse.up()
with sync_playwright() as p:
    b=p.chromium.launch()
    for vw,vh in [(390,760),(900,600)]:
        c=b.new_context(viewport={'width':vw,'height':vh});c.route('**fonts.g**',lambda r:r.abort());c.add_init_script('window.GA_GUIDE_TEST=0;')
        pg=c.new_page();pg.on('pageerror',lambda e:errs.append(str(e)));pg.goto('http://localhost:8778/');pg.wait_for_timeout(800)
        pg.evaluate("S.role='artist';S.tab='works';S.agree=null;S.sig=null;localStorage.removeItem('ga-agree-demo');render()");pg.wait_for_timeout(300)
        pg.evaluate("A.upload()");pg.wait_for_timeout(300)
        assert pg.is_visible('.ag-why'),'agreement opens instead of upload'
        assert not pg.is_visible('#ut'),'no upload form before signing'
        pg.click('[data-a=agpad]');pg.wait_for_timeout(200);assert not pg.is_visible('.sg'),'needs checks first'
        for i in range(3):pg.check(f'#ag{i}')
        pg.fill('#agn','ארז אהרון');pg.click('[data-a=agpad]');pg.wait_for_timeout(400)
        assert pg.is_visible('.sg'),'pad opens'
        rot=pg.evaluate("getComputedStyle(document.querySelector('.sg-box')).transform!=='none'")
        assert rot==(vh>vw),('rotation',rot)
        box=pg.locator('.sg-pad canvas').bounding_box()
        x0,y0,w,h=box['x'],box['y'],box['width'],box['height']
        line=[(x0+w*.2,y0+h*.3),(x0+w*.3,y0+h*.6),(x0+w*.45,y0+h*.35),(x0+w*.55,y0+h*.65),(x0+w*.75,y0+h*.4)]
        draw(pg,[(x0+w*.3,y0+h*.3),(x0+w*.32,y0+h*.31)])
        pg.click('.sg-go');pg.wait_for_timeout(300);assert pg.is_visible('.sg'),'too short is refused'
        assert 'קצרה' in pg.inner_text('.sg-msg')
        pg.click('[data-k=c]');pg.wait_for_timeout(100);assert pg.is_disabled('.sg-go')
        pg.click('[data-k=r]');pg.wait_for_timeout(100);assert not pg.is_disabled('.sg-go'),'redo after clear'
        pg.click('[data-k=u]');draw(pg,line);draw(pg,[(x0+w*.5,y0+h*.5),(x0+w*.8,y0+h*.55)]);pg.click('[data-k=u]')
        pg.screenshot(path=f'/tmp/ag-pad-{vw}.png')
        pg.click('.sg-go');pg.wait_for_timeout(400);assert not pg.is_visible('.sg')
        assert pg.locator('.ag-labels .ag-sig').count()==2,'preview on two labels'
        pg.screenshot(path=f'/tmp/ag-prev-{vw}.png',full_page=False)
        pg.click('[data-a=agsubmit]');pg.wait_for_timeout(500)
        assert 'ההסכם חתום' in pg.inner_text('.sheet')
        pg.click('[data-a=agup]');pg.wait_for_timeout(300);assert pg.is_visible('#ut'),'upload after signing'
        st=pg.evaluate("[S.agree&&S.agree.v,S.agree&&S.agree.hash&&S.agree.hash.length,S.sig&&S.sig.d.length>20,/^[MQLZa0-9 .\\-]+$/.test(S.sig.d)]")
        assert st[0]=='2026-11' and st[1]==64 and st[2] and st[3],st
        pg.evaluate("closeSheet()");pg.wait_for_timeout(200);pg.evaluate("go('tab-profile')");pg.wait_for_timeout(300)
        assert pg.is_visible('[data-a=agcopy]') and pg.is_visible('[data-a=agresign]')
        pg.reload();pg.wait_for_timeout(800);ok=pg.evaluate("!!(S.agree&&S.agree.v)");assert ok,pg.evaluate("[localStorage.length,(localStorage.getItem(KEY)||'').length,Object.keys(JSON.parse(localStorage.getItem(KEY)||'{}')).join()]")
        print(vw,'ok')
    q=b.new_page();q.on('pageerror',lambda e:errs.append(str(e)));q.goto('http://localhost:8778/agreement.html');q.wait_for_timeout(500)
    assert q.locator('.ag-sec').count()==13;print('page ok')
    print('ERR',errs);assert not errs;b.close()
