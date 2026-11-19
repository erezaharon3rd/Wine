"""שלב 9: לכל החלטה של אדם יש המשך. דחייה בגלריה, ביטול ביקב, שליחה חוזרת של יצירה, בקשת תיקון מהדפוס."""
import os,sys,json
D=os.path.dirname(os.path.abspath(__file__))
from playwright.sync_api import sync_playwright
MOCK=open(D+'/mock.js').read()
src=open(D+'/t2.py').read();exec(src[src.index('def init'):src.index('errs=[]')])
errs=[]
def base(role,org):
    s=init(role,org)
    d0={'winery_id':'w1','gallery_id':'g1','artist_id':'a1','work_id':1,'wine_id':1,'design_code':'RS01','license_type':'one','qty_tier':'a','exclusive':False,'price_net':2500,'adj_pct':0,'version':1,'created_at':'2026-11-19','label_round':1}
    s['db']['deals']=[dict(d0,id=201,status='sent'),dict(d0,id=202,status='priced'),dict(d0,id=203,status='active',paid_at='2026-11-10')]
    s['db']['print_orders']=[{'id':1,'deal_id':203,'printer_id':'p1','stage':1,'due':'2026-12-01'}]
    s['db']['works'][1].update(status='rejected',review_note='הקובץ מטושטש')
    if role=='artist':s['db']['artists'][0]['user_id']='u1'
    return s
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(s):
        ctx=b.new_context(viewport={'width':390,'height':844});ctx.route('**/supabase-js@2',lambda r:r.fulfill(body=MOCK,content_type='application/javascript'));ctx.route('**fonts.g**',lambda r:r.abort())
        ctx.add_init_script('if(!localStorage.mockdb)window.MOCK_INIT='+json.dumps(s)+';');pg=ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)));pg.goto('http://localhost:8777/');pg.wait_for_timeout(1600)
        if pg.is_visible('#ov .sheet'):pg.evaluate("closeSheet()")
        return pg
    db=lambda pg:json.loads(pg.evaluate("localStorage.mockdb"))['db']
    # גלריה: אפשר לדחות כבר בתמחור
    pg=page(base('gallery','g1'));pg.evaluate("go('deal-201')");pg.wait_for_timeout(600)
    pg.click('.actbar [data-a=pricing]');pg.wait_for_timeout(500);assert pg.is_visible('#ov [data-a=rejectS]')
    pg.click('#ov [data-a=rejectS]');pg.wait_for_timeout(400);print('reject note:',pg.inner_text('#ov .note')[:30]);assert 'היקב והאמן' in pg.inner_text('#ov')
    pg.click('#ov [data-a=rsn]');pg.wait_for_timeout(300);pg.click('#ov [data-a=reject]');pg.wait_for_timeout(900)
    st=[d['status'] for d in db(pg)['deals'] if d['id']==201][0];print('gallery reject ->',st);assert st=='rejected'
    # יקב: לבטל בקשה פתוחה
    pg=page(base('winery','w1'));pg.evaluate("go('deal-202')");pg.wait_for_timeout(600)
    pg.click('[data-a=dcancel]');pg.wait_for_timeout(400);pg.fill('#dcx','שינינו תוכנית');pg.click('#ov [data-a=dcancel2]');pg.wait_for_timeout(900)
    st=[d['status'] for d in db(pg)['deals'] if d['id']==202][0];print('winery cancel ->',st);assert st=='cancelled'
    pg.evaluate("go('deal-203')");pg.wait_for_timeout(500);assert not pg.is_visible('[data-a=dcancel]'),'no cancel on active'
    # אמן: רואה למה הוחזרה ושולח שוב
    pg=page(base('artist',None));pg.evaluate("go('tab-works')");pg.wait_for_timeout(500);assert 'הוחזרה לתיקון' in pg.inner_text('#m')
    pg.evaluate("go('aw-3')");pg.wait_for_timeout(500);t=pg.inner_text('#m');print('artist sees note:', 'הקובץ מטושטש' in t);assert 'הקובץ מטושטש' in t
    pg.click('[data-a=wresend]');pg.wait_for_timeout(900);w=[w for w in db(pg)['works'] if w['id']==3][0];print('resend ->',w['status']);assert w['status']=='pending'
    # דפוס: בקשת תיקון קבצים אמיתית
    pg=page(base('printer','p1'));pg.evaluate("go('order-203')");pg.wait_for_timeout(600)
    pg.click('[data-a=pfix]');pg.wait_for_timeout(400);pg.click('#ov [data-a=pfix2]');pg.wait_for_timeout(300);assert pg.is_visible('#ov .sheet'),'empty note blocked'
    pg.fill('#pfx','חסר מרווח גלישה');pg.click('#ov [data-a=pfix2]');pg.wait_for_timeout(900)
    m=[x for x in db(pg)['deal_messages'] if x['deal_id']==203];print('printer msg:',m and m[-1]['body'][:30]);assert m
    print('ERR',errs);b.close()
