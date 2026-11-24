"""הזמנה בווטסאפ: יקב מזמין חבר צוות לפי נייד או מאנשי הקשר, קישור אישי והודעה מוכנה; גלריה מזמינה אמן."""
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright
errs=[]
PICK="""window.ContactsManager=function(){};Object.defineProperty(navigator,'contacts',{value:{select:async()=>[{name:['נוי כהן'],tel:['054-123-4567']},{name:['משרד'],tel:['02-6234567']},{name:['דן'],tel:['+972 52 765 4321','03-1111111']}]}});"""
with sync_playwright() as p:
    b=p.chromium.launch()
    c=b.new_context(viewport={'width':390,'height':780});c.route('**fonts.g**',lambda r:r.abort());c.add_init_script('window.GA_GUIDE_TEST=0;'+PICK)
    pg=c.new_page();pg.on('pageerror',lambda e:errs.append(str(e)));pg.goto('http://localhost:8778/');pg.wait_for_timeout(800)
    pg.evaluate("S.role='winery';render()");pg.wait_for_timeout(200);pg.evaluate("go('tab-more')");pg.wait_for_timeout(400)
    assert pg.is_visible('[data-a=invteam]'),'winery invite button'
    pg.click('[data-a=invteam]');pg.wait_for_timeout(300)
    pg.fill('#ivname','יוסי');pg.fill('#ivph','123');pg.click('[data-a=ivadd]');pg.wait_for_timeout(200)
    assert 'לא תקין' in pg.inner_text('#iverr')
    pg.fill('#ivph','050-111-2222');pg.click('[data-a=ivadd]');pg.wait_for_timeout(400)
    href=pg.get_attribute('a.iv-wa','href');u=urlparse(href)
    assert u.netloc=='wa.me' and u.path=='/972501112222',href
    t=parse_qs(u.query)['text'][0];assert 'שלום יוסי' in t and '?j=' in t and '14 יום' in t,t
    pg.click('[data-a=ivpick]');pg.wait_for_timeout(500)
    rows=pg.locator('.sheet .list .li').count();assert rows==4,rows
    txt=pg.inner_text('.sheet');assert 'אין כאן מספר נייד תקין' in txt and '052-765-4321' in txt and '054-123-4567' in txt,txt[-400:]
    hrefs=[pg.locator('a.iv-wa').nth(i).get_attribute('href') for i in range(pg.locator('a.iv-wa').count())]
    assert len(hrefs)==3 and len({parse_qs(urlparse(h).query)['text'][0].split('?j=')[1] for h in hrefs})==3,'distinct personal links'
    pg.screenshot(path='/tmp/iv.png')
    pg.evaluate("closeSheet();S.role='gallery';render()");pg.wait_for_timeout(300);pg.evaluate("go('tab-artists')");pg.wait_for_timeout(400)
    assert pg.is_visible('[data-a=invartist]'),'gallery invite button'
    pg.click('[data-a=invartist]');pg.wait_for_timeout(300)
    assert pg.locator('[data-a=ivrole]').count()==2
    pg.fill('#ivname','רונית');pg.fill('#ivph','0527654321');pg.click('[data-a=ivadd]');pg.wait_for_timeout(300)
    t=parse_qs(urlparse(pg.get_attribute('a.iv-wa','href')).query)['text'][0];assert 'כאמן/ית' in t,t
    print('ERR',errs);assert not errs;b.close()
