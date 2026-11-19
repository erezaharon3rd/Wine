"""דרגות אמנים: סינון במאגר, המלצה של הגלריה, אישור המנהל, חלק האמן ותוספת לבקבוק."""
import os,sys,json
D=os.path.dirname(os.path.abspath(__file__))
from playwright.sync_api import sync_playwright
MOCK=open(D+'/mock.js').read()
src=open(D+'/t2.py').read();exec(src[src.index('def init'):src.index('errs=[]')])
errs=[]
TIERS=[{'code':'emerging','name':'מתפתח','rank':1,'min_price':800,'max_price':1999,'artist_pct':45,'bottle_addon':8},{'code':'established','name':'מבוסס','rank':2,'min_price':2000,'max_price':3999,'artist_pct':50,'bottle_addon':14},
 {'code':'senior','name':'בכיר','rank':3,'min_price':4000,'max_price':8999,'artist_pct':55,'bottle_addon':25},{'code':'museum','name':'מוזיאלי','rank':4,'min_price':9000,'max_price':30000,'artist_pct':60,'bottle_addon':45}]
def base(role,org):
    s=init(role,org);db=s['db']
    db['artist_tiers']=TIERS
    db['artists'][0].update(tier='senior',floor_price=4500)
    db['artists'].append({'id':'a2','user_id':'zz2','gallery_id':'g1','name':'מאיה רון','floor_price':2000,'tier':'established','restrict_tags':[]})
    db['works'].append({'id':5,'artist_id':'a2','title':'כרם','status':'live','available':True,'image_path':'http://localhost:8777/img/p4.jpg','no_crop':{},'tag':'נוף','tone':'ירוק'})
    db['deals']=[{'id':301,'winery_id':'w1','gallery_id':'g1','artist_id':'a1','work_id':1,'wine_id':1,'design_code':'RS01','status':'pay','license_type':'one','qty_tier':'a','exclusive':False,'price_net':4500,'adj_pct':0,'version':1,'created_at':'2026-11-19','label_round':1,'artist_pct':55}]
    db['organizations'][2]['pricing']={'prices':{'1':110}}
    return s
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(s):
        ctx=b.new_context(viewport={'width':390,'height':844});ctx.route('**/supabase-js@2',lambda r:r.fulfill(body=MOCK,content_type='application/javascript'));ctx.route('**fonts.g**',lambda r:r.abort())
        ctx.add_init_script('if(!localStorage.mockdb)window.MOCK_INIT='+json.dumps(s)+';');pg=ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)));pg.goto('http://localhost:8777/');pg.wait_for_timeout(1600)
        if pg.is_visible('#ov .sheet'):pg.evaluate("closeSheet()")
        return pg
    db=lambda pg:json.loads(pg.evaluate("localStorage.mockdb"))['db']
    # יקב: סינון לפי דרגה, ומחיר התחלתי לפי האמן
    pg=page(base('winery','w1'));pg.evaluate("go('tab-bank')");pg.wait_for_timeout(500)
    n_all=pg.locator('#m .tile').count();pg.click('[data-a=ftier][data-v=senior]');pg.wait_for_timeout(400);n_sen=pg.locator('#m .tile').count()
    t=pg.inner_text('#m');print('bank all/senior:',n_all,n_sen,'| badge:', 'בכיר' in t, '| price 4,500:', '4,500' in t);assert n_sen<n_all and '4,500' in t
    print('winery share in pay deal:',pg.evaluate("price(S.deals.find(d=>d.id===301)).pct"));assert pg.evaluate("price(S.deals.find(d=>d.id===301)).pct")==55
    # גלריה: ממליצה על דרגה
    pg=page(base('gallery','g1'));pg.evaluate("go('tab-artists')");pg.wait_for_timeout(500);t=pg.inner_text('#m');assert 'מבוסס' in t and 'בכיר' in t
    pg.click('[data-a=tierS][data-v=a2]');pg.wait_for_timeout(400);pg.click('#ov [data-a=tsel][data-v="a2:senior"]');pg.wait_for_timeout(300);pg.fill('#tnote','תערוכת יחיד');pg.click('#ov [data-a=tier2]');pg.wait_for_timeout(900)
    a2=[a for a in db(pg)['artists'] if a['id']=='a2'][0];print('proposed:',a2.get('tier_proposed'));assert a2.get('tier_proposed')=='senior'
    t=pg.inner_text('#m');assert 'ממתין לאישור המנהל' in t
    # מנהל: מאשר, ושומר טבלת דרגות
    s=base('admin','o-adm');[a for a in s['db']['artists'] if a['id']=='a2'][0].update(tier_proposed='senior',tier_note='תערוכת יחיד')
    pg=page(s);pg.evaluate("go('tab-settings')");pg.wait_for_timeout(600);t=pg.inner_text('#m');assert 'דרגות אמנים' in t and 'תערוכת יחיד' in t
    pg.click('[data-a=tierok][data-v="a2:1"]');pg.wait_for_timeout(900);a2=[a for a in db(pg)['artists'] if a['id']=='a2'][0];print('approved:',a2['tier'],a2['floor_price']);assert a2['tier']=='senior' and a2['floor_price']==4000
    pg.fill('#tadd-emerging','10');pg.click('[data-a=tiersave]');pg.wait_for_timeout(900);print('saved addon:',[t for t in db(pg)['artist_tiers'] if t['code']=='emerging'][0]['bottle_addon']);assert [t for t in db(pg)['artist_tiers'] if t['code']=='emerging'][0]['bottle_addon']==10
    # לקוח: התוספת לבקבוק לפי הדרגה, כשהיקב לא קבע
    pg=page(base('customer','w1'));print('customer addon a1:',pg.evaluate("addonFor('a1')"));assert pg.evaluate("addonFor('a1')")==25
    print('ERR',errs);b.close()
