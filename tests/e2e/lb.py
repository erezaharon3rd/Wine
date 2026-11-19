import os,sys,json
D=os.path.dirname(os.path.abspath(__file__))
from playwright.sync_api import sync_playwright
MOCK=open(D+'/mock.js').read()
src=open(D+'/t2.py').read();exec(src[src.index('def init'):src.index('errs=[]')])
errs=[]
def base(role,org):
    s=init(role,org)
    s['db']['deals']=[{'id':103,'winery_id':'w1','gallery_id':'g1','artist_id':'a1','work_id':1,'wine_id':1,'design_code':'RS01','status':'sign','license_type':'one','qty_tier':'a','exclusive':False,'price_net':2500,'adj_pct':0,'version':3,'created_at':'2026-11-19','label_round':1}]
    s['db']['customer_orders']=[{'id':5001,'winery_id':'w1','customer_id':'cx','cust':{'n':'דנה','ph':'050','em':'d@x'},'design':{'artist':'a1','work':1,'wine':1,'shape':'arch','pos':50,'zoom':100,'name':'דנה 40','qty':6},'status':'label','label_round':1,'label_ok_w':1,'log':[],'created_at':'2026-11-19T10:00:00Z','total':582}]
    return s
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(s):
        ctx=b.new_context(viewport={'width':390,'height':844});ctx.route('**/supabase-js@2',lambda r:r.fulfill(body=MOCK,content_type='application/javascript'));ctx.route('**fonts.g**',lambda r:r.abort())
        ctx.add_init_script('if(!localStorage.mockdb)window.MOCK_INIT='+json.dumps(s)+';');pg=ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)));pg.goto('http://localhost:8777/');pg.wait_for_timeout(1600)
        if pg.is_visible('#ov .sheet'):pg.evaluate("closeSheet()")
        return pg
    db=lambda pg:json.loads(pg.evaluate("localStorage.mockdb"))['db']
    # יקב: חדר העסקה, חתימה חסומה עד ששני הצדדים מאשרים
    pg=page(base('winery','w1'));pg.evaluate("go('deal-103')");pg.wait_for_timeout(600);t=pg.inner_text('#m');bar=pg.inner_text('.actbar') if pg.is_visible('.actbar') else ''
    print('winery panel:', 'אישור התווית' in t,'| bar:',bar[:50].replace('\n',' '));assert 'אישור התווית' in t and 'לפני החתימה' in bar
    pg.fill('#lnb','להזיז את השם למטה');pg.click('[data-a=lact][data-v="deal:103:change"]');pg.wait_for_timeout(900)
    d=db(pg)['deals'][0];print('after change round:',d['label_round']);assert d['label_round']==2
    pg.wait_for_timeout(300);t=pg.inner_text('#m');print('thread shows change:', 'ביקש שינוי' in t and 'להזיז את השם' in t);assert 'להזיז את השם' in t
    pg.click('[data-a=lact][data-v="deal:103:approve"]');pg.wait_for_timeout(300);pg.click('#ov .sheet .btn:not(.alt)');pg.wait_for_timeout(900)
    print('winery ok:',db(pg)['deals'][0].get('label_ok_w'));assert db(pg)['deals'][0].get('label_ok_w')==2
    pg.screenshot(path=D+'/out/lb_deal.png',full_page=True)
    # גלריה: רואה תווית של לקוח שמחכה לה, ומאשרת
    pg=page(base('gallery','g1'));pg.evaluate("go('tab-home')");pg.wait_for_timeout(500);t=pg.inner_text('#m')
    print('gallery list:', 'תוויות של לקוחות לאישור' in t);assert 'תוויות של לקוחות לאישור' in t
    pg.click('[data-v=corder-5001]');pg.wait_for_timeout(600);bar=pg.inner_text('.actbar') if pg.is_visible('.actbar') else '';print('gallery bar:',bar[:40].replace('\n',' '));assert 'תורך' in bar
    pg.fill('#lnb','יפה מאוד');pg.click('[data-a=lact][data-v="corder:5001:comment"]');pg.wait_for_timeout(800)
    pg.click('[data-a=lact][data-v="corder:5001:approve"]');pg.wait_for_timeout(300);pg.click('#ov .sheet .btn:not(.alt)');pg.wait_for_timeout(900)
    o=db(pg)['customer_orders'][0];print('order status:',o['status'],'notes:',len(db(pg).get('label_notes',[])));assert o['status']=='approved'
    pg.screenshot(path=D+'/out/lb_order.png',full_page=True)
    print('ERR',errs);b.close()
