import os,sys,json
D=os.path.dirname(os.path.abspath(__file__))
from playwright.sync_api import sync_playwright
MOCK=open(D+'/mock.js').read()
src=open(D+'/t2.py').read();exec(src[src.index('def init'):src.index('errs=[]')])
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(s):
        ctx=b.new_context(viewport={'width':390,'height':844});ctx.route('**/supabase-js@2',lambda r:r.fulfill(body=MOCK,content_type='application/javascript'));ctx.route('**fonts.g**',lambda r:r.abort())
        ctx.add_init_script('if(!localStorage.mockdb)window.MOCK_INIT='+json.dumps(s)+';');pg=ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)));pg.goto('http://localhost:8777/');pg.wait_for_timeout(1600)
        if pg.is_visible('#ov .sheet'):pg.evaluate("closeSheet()")
        return pg
    org=lambda pg,i:[o for o in json.loads(pg.evaluate("localStorage.mockdb"))['db']['organizations'] if o['id']==i][0]
    pg=page(init('gallery','g1'));pg.evaluate("go('tab-more')");pg.wait_for_timeout(400)
    assert 'תמחור אוטומטי' in pg.inner_text('#m')
    pg.check('[data-k=auto_price]');pg.wait_for_timeout(700);print('gallery auto_price:',org(pg,'g1').get('auto_price'));assert org(pg,'g1').get('auto_price') is True
    with pg.context.expect_page() as np: pg.click('[data-a=stmt]')
    d=np.value;d.wait_for_timeout(500);t=d.inner_text('body');print('statement:',t[:90].replace('\n',' | '));assert 'חורשה' in t and '₪6,300' in t
    pg=page(init('winery','w1'));pg.evaluate("go('tab-more')");pg.wait_for_timeout(400)
    assert pg.is_checked('[data-k=auto_print]'),'auto print default on'
    print('no auto approve switch:',pg.locator('[data-k=auto_approve]').count()==0);assert pg.locator('[data-k=auto_approve]').count()==0
    pg=page(init('admin','o-adm'));pg.evaluate("go('tab-settings')");pg.wait_for_timeout(600);t=pg.inner_text('#m')
    print('admin daily:', 'עבודה אוטומטית יומית' in t, 'המלצות לפי פופולריות' in t);assert 'עבודה אוטומטית יומית' in t
    pg.fill('#dsd','4');pg.fill('#dcd','20');pg.click('[data-a=dailysave]');pg.wait_for_timeout(700)
    st=json.loads(pg.evaluate("localStorage.mockdb"))['db'].get('settings',[{}]);print('settings saved:',[ (x.get('stale_days'),x.get('cancel_days')) for x in st])
    # רישיון שהסתיים מסומן
    s=init('winery','w1');s['db']['deals']=[{'id':103,'winery_id':'w1','gallery_id':'g1','artist_id':'a1','work_id':1,'wine_id':1,'design_code':'RS01','status':'active','license_type':'one','qty_tier':'a','exclusive':False,'price_net':2500,'adj_pct':0,'version':3,'created_at':'2025-01-01','ends_at':'2026-01-01','paid_at':'2025-01-02'}]
    pg=page(s);pg.evaluate("S.f.dl='all';go('tab-deals')");pg.wait_for_timeout(500);t=pg.inner_text('#m');print('ended label:', 'הרישיון הסתיים' in t);assert 'הרישיון הסתיים' in t
    print('ERR',errs);b.close()
