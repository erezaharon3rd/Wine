"""הערוץ החיצוני במסכי הצוות: מנהל (הזמנות, אמנים ומהדורות, יינות, מארזים, לקוחות, הגדרות),
גלריה ואמן (רמות, מסגרת לוגו, מהדורות, ביקורים), יקב (הזמנות מהחנות על היין שלו, לקריאה בלבד)."""
import os,sys,json
D=os.path.dirname(os.path.abspath(__file__))
from playwright.sync_api import sync_playwright
MOCK=open(D+'/mock.js').read()
src=open(D+'/t2.py').read();exec(src[src.index('def init'):src.index('errs=[]')])
errs=[]
def base(role,org):
    s=init(role,org);db=s['db']
    db['packages']=[{'id':1,'code':'single','name':'בקבוק במארז','level':'case','bottles':1,'box':'קופסה','price':35,'active':True,'sort':1},
                    {'id':5,'code':'collector','name':'מהדורת אספנים','level':'collector','bottles':1,'box':'קופסה ממוספרת','price':95,'active':True,'sort':5}]
    db['artist_levels']=[{'artist_id':'a1','level':'case','artist_ok':True,'gallery_ok':False}]
    db['series']=[];db['edition_items']=[{'id':1,'series_id':9,'kind':'bottle','no':1,'order_id':6001,'verify':'abc','signed_at':None,'gallery_stamped_at':None}]
    db['studio_visits']=[{'id':3,'order_id':6001,'artist_id':'a1','status':'requested','note':'נשמח לבקר'}]
    db['order_contacts']=[{'order_id':6001,'cust':{'n':'דנה כהן','ph':'0501234567','em':'d@x.com'}}]
    db['settings'][0].update(direct_open=True,lead_days=21,order_cutoff=None,direct_pricing={'t1':24,'d1':5,'t2':60,'d2':10},vat_pct=18)
    db['organizations'][2].update(partner=False,kosher=False)
    db['wines'][0].update(direct=False,direct_price=None,shiners=0)
    db['profiles'].append({'id':'c9','full_name':'לקוחה','email':'c@x.com','role':'customer','org_id':'w1','acq_channel':'winery_link','acq_ref':'wtest','acq_at':'2026-11-20'})
    db['customer_orders']=[{'id':6001,'channel':'direct','winery_id':'w1','owner_winery_id':None,'customer_id':'c9','buyer_kind':'collector','cust':{'n':'דנה'},'design':{'wine':1,'work':1,'artist':'a1','package':5,'series':9},
        'package_id':5,'series_id':9,'bottles':1,'status':'approved','total':180,'split':{'wine_total':60,'art_total':120,'wine_seller_name':'יקב הבדיקה'},'delivery_date':'2026-12-20','log':[],'created_at':'2026-11-20T10:00:00Z'}]
    return s
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(s,tab):
        ctx=b.new_context(viewport={'width':390,'height':844});ctx.route('**/supabase-js@2',lambda r:r.fulfill(body=MOCK,content_type='application/javascript'));ctx.route('**fonts.g**',lambda r:r.abort())
        ctx.add_init_script('if(!localStorage.mockdb)window.MOCK_INIT='+json.dumps(s)+';');pg=ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)));pg.goto('http://localhost:8777/');pg.wait_for_timeout(1600)
        if pg.is_visible('#ov .sheet'):pg.evaluate("closeSheet()")
        pg.evaluate(f"go('tab-{tab}')");pg.wait_for_timeout(600);return pg
    db=lambda pg:json.loads(pg.evaluate("localStorage.mockdb"))['db']
    # מנהל
    pg=page(base('admin','o-adm'),'channel');t=pg.inner_text('#m')
    assert 'ערוץ חיצוני' in t and '#6001' in t and 'חיצוני · אספן' in t and 'דנה כהן' in t, t[:500]
    pg.screenshot(path=D+'/out/ch-admin.png',full_page=True)
    pg.click('[data-a=dact][data-v="6001:paid"]');pg.wait_for_timeout(800);o=db(pg)['customer_orders'][0];print('paid:',o['status']);assert o['status']=='print'
    pg.click('[data-a=chs][data-v=artists]');pg.wait_for_timeout(400);t=pg.inner_text('#m');assert 'ממתין לגלריה' in t,t
    pg.click('[data-a=lvset][data-v="a1:collector:1"]');pg.wait_for_timeout(700);l=[x for x in db(pg)['artist_levels'] if x['level']=='collector'][0];print('admin sets both:',l);assert l['artist_ok'] and l['gallery_ok']
    pg.click('summary:has-text("לפתוח מהדורה חדשה")');pg.fill('#ss','120');pg.check('#sl-collector');pg.once('dialog',lambda d:d.accept());pg.click('[data-a=sernew]');pg.wait_for_timeout(700)
    print('series:',db(pg)['series'][0]);assert db(pg)['series'][0]['size']==120 and 'collector' in db(pg)['series'][0]['levels']
    pg.click('[data-a=chs][data-v=wines]');pg.wait_for_timeout(400);pg.click('[data-a=orgflag][data-v="w1:partner:1"]');pg.wait_for_timeout(600)
    pg.fill('#wp-1','60');pg.fill('#ws-1','40');pg.check('#wx-1');pg.click('[data-a=winesave][data-v="1"]');pg.wait_for_timeout(600)
    w=db(pg)['wines'][0];o=[x for x in db(pg)['organizations'] if x['id']=='w1'][0];print('wine:',w['direct'],w['direct_price'],w['shiners'],'partner:',o['partner']);assert w['direct'] and w['direct_price']==60 and w['shiners']==40 and o['partner']
    pg.click('[data-a=chs][data-v=packages]');pg.wait_for_timeout(400);pg.fill('#pp-1','40');pg.click('[data-a=pksave][data-v="1"]');pg.wait_for_timeout(600);assert db(pg)['packages'][0]['price']==40
    pg.click('[data-a=chs][data-v=customers]');pg.wait_for_timeout(400);t=pg.inner_text('#m');assert 'לקוח של יקב הבדיקה' in t and 'קישור של יקב' in t,t
    pg.click('[data-a=cxfer][data-v=c9]');pg.wait_for_timeout(400);pg.click('#ov [data-a=cxfer2][data-v=c9]');pg.wait_for_timeout(400);assert [x for x in db(pg)['profiles'] if x['id']=='c9'][0]['org_id']=='w1'  # בלי סיבה לא עובר
    pg.fill('#xr','עבר לגור ליד יקב אחר');pg.select_option('#xw','');pg.click('#ov [data-a=cxfer2][data-v=c9]');pg.wait_for_timeout(800);print('transfer:',[x for x in db(pg)['profiles'] if x['id']=='c9'][0]['org_id']);assert [x for x in db(pg)['profiles'] if x['id']=='c9'][0]['org_id'] is None
    pg.click('[data-a=chs][data-v=settings]');pg.wait_for_timeout(400);pg.fill('#ld','28');pg.fill('#co','2027-03-20');pg.click('[data-a=dsave]');pg.wait_for_timeout(600);st=db(pg)['settings'][0];print('settings:',st['lead_days'],st['order_cutoff']);assert st['lead_days']==28 and st['order_cutoff']=='2027-03-20'
    # גלריה
    pg=page(base('gallery','g1'),'editions');t=pg.inner_text('#m');assert 'מהדורות ומארזים' in t and 'ארז אהרון' in t and 'ביקורי סטודיו' in t,t
    pg.click('[data-a=lvset][data-v="a1:case:1"]');pg.wait_for_timeout(700);l=[x for x in db(pg)['artist_levels'] if x['level']=='case'][0];print('gallery consent:',l);assert l['gallery_ok']
    pg.fill('#va-3','2026-12-15T11:00');pg.click('[data-a=visit][data-v="3:1"]');pg.wait_for_timeout(700);print('visit:',db(pg)['studio_visits'][0]['status']);assert db(pg)['studio_visits'][0]['status']=='accepted'
    pg.screenshot(path=D+'/out/ch-gallery.png',full_page=True)
    # אמן
    s=base('artist','');s['db']['artists'][0]['user_id']='u1';pg=page(s,'editions');t=pg.inner_text('#m');assert 'מסגרת לוגו' in t and 'חורשה' in t,t
    pg.check('#fz-1-band');pg.uncheck('#fz-1-neck');pg.uncheck('#fz-1-back');pg.uncheck('#fz-1-card');pg.click('[data-a=frame][data-v="1"]');pg.wait_for_timeout(700)
    w=db(pg)['works'][0];print('frame:',w.get('frame_zones'),w.get('frame_ok'));assert w['frame_zones']==['band'] and w['frame_ok']
    pg.screenshot(path=D+'/out/ch-artist.png',full_page=True)
    # יקב: רואה את ההזמנה על היין שלו, בלי פרטי קשר
    pg=page(base('winery','w1'),'clients');t=pg.inner_text('#m');print('winery sees:', 'הזמנות מהחנות על היין שלך' in t, '0501234567' in t);assert 'הזמנות מהחנות על היין שלך' in t and '0501234567' not in t
    print('ERR',errs);b.close()
