"""תווית מצילום: מעלים צילום של בקבוק, המלל והאזורים נקראים, הלוגו נגזר מהצילום, והיין נשמר עם התבנית של היקב."""
import os,json
from playwright.sync_api import sync_playwright
D=os.path.dirname(os.path.abspath(__file__))
FX=os.path.join(D,'fixtures','bar.jpg')
SCAN={"label_box":[.236,.597,.51,.242],"bottle":{"shape":"bordeaux","glass":"#1b231e","capsule":"#c4ceb0"},
 "wine":{"winery":"יקב הרי גליל","series":"בר","varietal":"קברנה סוביניון","name":"","vintage":2025,"type":"red"},
 "label":{"background":"#f2f3e2","art":[0,0,1,.3],"logo":[.331,.37,.306,.23],"lines":[
  {"text":"יקב הרי גליל","box":[.255,.61,.462,.068],"color":"#3a46a6","font":"sans","weight":400,"role":"winery"},
  {"text":"בר","box":[.398,.72,.169,.062],"color":"#1e1e1e","font":"serif","weight":700,"role":"series"},
  {"text":"קברנה סוביניון","box":[.274,.805,.43,.042],"color":"#1e1e1e","font":"serif","weight":700,"role":"varietal"},
  {"text":"Cabernet Sauvignon","box":[.162,.86,.653,.037],"color":"#2a2a2a","font":"serif","weight":400,"role":"varietal"},
  {"text":"2025","box":[.443,.92,.102,.032],"color":"#2a2a2a","font":"serif","weight":700,"role":"vintage"}]}}
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch();c=b.new_context(viewport={'width':390,'height':844});c.route('**fonts.g**',lambda r:r.abort())
    c.add_init_script('window.GA_GUIDE_TEST=0;window.__scans=0;window.GA_LABELSCAN=async j=>{window.__scans++;if(!/^data:image\\/jpeg;base64,/.test(j))throw new Error("bad");return '+json.dumps(SCAN)+'};')
    pg=c.new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8778/');pg.wait_for_timeout(900)
    pg.evaluate("S.role='winery';S.wines=S.wines.filter(w=>w.id!==4);render()");pg.wait_for_timeout(200);pg.evaluate("go('tab-more')");pg.wait_for_timeout(500)
    with pg.expect_file_chooser() as fc: pg.click('[data-a=lscan]')
    fc.value.set_files(FX);pg.wait_for_timeout(2500)
    t=pg.inner_text('.sheet');assert 'יין חדש מצילום' in t and 'בר קברנה סוביניון' in pg.input_value('#lsn'),t[:200]
    assert pg.input_value('#lsl0')=='יקב הרי גליל' and pg.input_value('#lsl3')=='Cabernet Sauvignon'
    assert 'יקב הרי גליל' in t and 'החשבון הוא של' in t,'winery mismatch warning'
    assert pg.locator('.lsprev svg image').count()>=2,'painting and logo in preview'
    pg.click('[data-a=lssave]');pg.wait_for_timeout(300);assert 'כמות' in pg.inner_text('#lserr')
    pg.fill('#lsq','3000');pg.click('[data-a=lsglass][data-v=green]');pg.wait_for_timeout(200)
    pg.fill('#lsl1','בַּר');pg.click('[data-a=lssave]');pg.wait_for_timeout(600)
    w=pg.evaluate("S.wines.find(w=>w.n==='בר קברנה סוביניון')")
    assert w and w['y']==2025 and w['q']==3000 and w['bot']['shape']=='bordeaux' and w['bot']['glass']=='#2F4A35',w and w.get('bot')
    assert w['tpl']['logo']['src'].startswith('data:image/png') and len(w['tpl']['lines'])==5 and w['tpl']['lines'][1]['t']=='בַּר'
    assert 0.7<w['tpl']['aspect']<0.9,w['tpl']['aspect']
    # the label file for print/AI carries the logo inline
    svg=pg.evaluate("labelSvg('red',1,{wid:%d})"%w['id'])
    assert 'data-label' in svg and 'href="img/' not in svg and svg.count('data:image')>=2,svg[:200]
    # scanning again for the same wine updates it instead of adding a duplicate
    n=pg.evaluate("S.wines.length")
    with pg.expect_file_chooser() as fc: pg.click('[data-a=lscan]')
    fc.value.set_files(FX);pg.wait_for_timeout(2500)
    assert pg.evaluate("S._ls.wid")==w['id'];pg.click('[data-a=lssave]');pg.wait_for_timeout(500)
    assert pg.evaluate("S.wines.length")==n,'no duplicate'
    pg.screenshot(path=os.path.join(D,'out','ls.png'))
    print('ERR',errs);assert not errs;b.close()
