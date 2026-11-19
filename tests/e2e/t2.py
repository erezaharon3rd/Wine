import os,sys
D=os.path.dirname(os.path.abspath(__file__))
import json
from playwright.sync_api import sync_playwright
MOCK=open(D+'/mock.js').read()
def init(role,org,session=True,pending=False):
    U='u1'
    db={'settings':[{'id':1,'comm_pct':15,'render_quota':6,'artist_share':50}],
     'organizations':[{'id':'o-adm','kind':'admin','name':'סדנת התווית','pricing':{},'details':{}},{'id':'g1','kind':'gallery','name':'הגלריה','pricing':{},'details':{}},{'id':'w1','kind':'winery','name':'יקב הבדיקה','slug':'wtest','pricing':{'prices':{'1':110}},'details':{'address':'רחוב היין 1','contact':'נוי','phone':'050-1111111'}},{'id':'p1','kind':'printer','name':'דפוס','pricing':{},'details':{}}],
     'profiles':[{'id':U,'email':'me@x.com','full_name':'בודק','role':None if pending else role,'status':'pending' if pending else 'active','org_id':None if pending else org,'created_at':'2026-11-19'}],
     'artists':[{'id':'a1','user_id':'zz','gallery_id':'g1','name':'ארז אהרון','floor_price':2500,'restrict_tags':[],'bio':'ציור שמן','country':'ישראל'}],
     'works':[{'id':1,'artist_id':'a1','title':'חורשה','status':'live','available':True,'image_path':'http://localhost:8777/img/p3.jpg','no_crop':{},'year':2024,'tag':'נוף','tone':'ירוק','story':'סיפור'},{'id':3,'artist_id':'a1','title':'ים','status':'review','available':True,'image_path':'x/3.jpg','no_crop':{},'px_w':4000,'px_h':3000}],
     'wines':[{'id':1,'winery_id':'w1','name':'אדום','vintage':2024,'type':'red','bottles':3000}],
     'designs':[],'deals':[],'deal_messages':[],'print_orders':[],'applications':[],'audit_log':[],'customer_orders':[],'notifications':[{'id':1,'user_id':U,'body':'התראה לבדיקה','created_at':'2026-11-19T00:00:00Z','read_at':None}],'renders':[{'id':7,'image_path':'u1/r.jpg','approved':None,'created_by':'u1','created_at':'2026-11-19T00:00:00Z'}]}
    return {'db':db,'session':{'user':{'id':U,'email':'me@x.com'}} if session else None,'user':{'id':U,'email':'me@x.com'},'me_role':role,'me_org':org}
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(st,url='http://localhost:8777/'):
        ctx=b.new_context(viewport={'width':390,'height':844})
        ctx.route('**/supabase-js@2',lambda r:r.fulfill(body=MOCK,content_type='application/javascript'))
        ctx.route('**fonts.googleapis**',lambda r:r.abort())
        ctx.add_init_script('window.MOCK_INIT='+json.dumps(st)+';')
        pg=ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)));pg.goto(url);pg.wait_for_timeout(800);return pg,ctx
    T=lambda pg:pg.inner_text('#app')[:200].replace('\n',' | ')
    pg,ctx=page(init('customer','w1',session=False),'http://localhost:8777/?y=wtest');print('LOGIN:',T(pg))
    pg.fill('#lem','me@x.com');pg.fill('#lpw','12345678');pg.click('[data-a=lup]');pg.wait_for_timeout(900)
    # profile pending -> join -> customer
    print('AFTER SIGNUP:',T(pg))
    pg,ctx=page(init('customer','w1',pending=True),'http://localhost:8777/?y=wtest');pg.wait_for_timeout(500)
    if pg.is_visible('#ov .sheet'):pg.evaluate("closeSheet()");pg.wait_for_timeout(300)
    print('JOINED:',T(pg))
    pg.click('[data-v=cart-a1]');pg.wait_for_timeout(300);print('ARTIST:',pg.inner_text('#m')[:150].replace('\n',' | '))
    pg.click('[data-a=cpick][data-v="1"]');pg.wait_for_timeout(300);print('PROPOSAL:',pg.inner_text('#m')[:200].replace('\n',' | '))
    pg.click('.actbar [data-v=cedit-1]');pg.wait_for_timeout(200);pg.evaluate("go('csum-0')");pg.wait_for_timeout(300)
    pg.fill('#cn','דנה');pg.fill('#cph','0501234567');pg.fill('#cem','d@x.com')
    for c in pg.query_selector_all('[data-in=cck]'):c.check()
    pg.click('#csend');pg.wait_for_timeout(900);print('SENT:',pg.inner_text('#m')[:120].replace('\n',' | '))
    st=pg.evaluate("localStorage.mockdb")
    # winery side with same db
    s=json.loads(st);s['db']['profiles'][0].update(role='winery',org_id='w1');s['me_role']='winery'
    pg2,c2=page(s);pg2.evaluate("closeSheet()");pg2.wait_for_timeout(300)
    pg2.evaluate("go('tab-clients')");pg2.wait_for_timeout(300);print('CLIENTS:',pg2.inner_text('#m')[:200].replace('\n',' | '))
    oid=pg2.evaluate("S.corders[0].id");pg2.evaluate(f"go('corder-{oid}')");pg2.wait_for_timeout(300)
    pg2.click('[data-a=cwedit]');pg2.wait_for_timeout(300);pg2.click('[data-v=cedit-2]');pg2.wait_for_timeout(200);pg2.click('[data-a=cset][data-v="shape:oval"]');pg2.wait_for_timeout(1000)
    pg2.evaluate(f"go('corder-{oid}')");pg2.wait_for_timeout(400);pg2.click('.actbar [data-a=cwsend]');pg2.wait_for_timeout(300);pg2.click('[data-a=cwsend2]');pg2.wait_for_timeout(900)
    print('WINERY SENT st:',pg2.evaluate("S.corders[0].st"),'wv shape:',pg2.evaluate("S.corders[0].wv&&S.corders[0].wv.shape"))
    pg2.evaluate("go('tab-more')");pg2.wait_for_timeout(300);print('MORE:',pg2.inner_text('#m')[:260].replace('\n',' | '))
    pg2.click('[data-a=bell]');pg2.wait_for_timeout(300);print('BELL:',pg2.inner_text('#ov')[:150].replace('\n',' | '));pg2.evaluate("closeSheet()")
    # admin tour
    s=json.loads(pg2.evaluate("localStorage.mockdb"));s['db']['profiles'][0].update(role='admin',org_id='o-adm');s['me_role']='admin'
    pg3,c3=page(s);pg3.evaluate("closeSheet()");pg3.wait_for_timeout(300)
    for role in ['admin','winery','artist','gallery','curator','printer','customer']:
        pg3.evaluate(f"A.role('{role}')");pg3.wait_for_timeout(400);pg3.evaluate("closeSheet()");pg3.wait_for_timeout(200)
        for t in [x[0] for x in pg3.evaluate(f"TABS['{role}']")]:
            pg3.evaluate(f"go('tab-{t}')");pg3.wait_for_timeout(150)
            if not pg3.inner_text('#m').strip():print(' EMPTY',role,t)
    pg3.evaluate("A.role('curator')");pg3.wait_for_timeout(400);pg3.evaluate("closeSheet()");pg3.evaluate("go('tab-review')");pg3.wait_for_timeout(200);print('REVIEW:',pg3.inner_text('#m')[:200].replace('\n',' | '))
    pg3.evaluate("go('tab-quality')");pg3.wait_for_timeout(200);print('QUALITY:',pg3.inner_text('#m')[:160].replace('\n',' | '))
    pg3.click('[data-a=rq2][data-v="7:1"]');pg3.wait_for_timeout(500);print('rq after:',pg3.evaluate("S._rq[0].approved"))
    pg3.evaluate("A.role('artist')");pg3.wait_for_timeout(400);pg3.evaluate("closeSheet()");pg3.evaluate("go('aw-1')");pg3.wait_for_timeout(300)
    pg3.click('[data-a=wedit]');pg3.wait_for_timeout(200);pg3.fill('#we-t','חורשה בבוקר');pg3.fill('#we-y','2024');pg3.click('[data-a=wedit2]');pg3.wait_for_timeout(600)
    print('title:',pg3.evaluate("work(1).t"))
    pg3.evaluate("A.role('admin')");pg3.wait_for_timeout(400);pg3.evaluate("closeSheet()");pg3.evaluate("go('tab-users')");pg3.wait_for_timeout(300)
    print('orgren buttons:',len(pg3.query_selector_all('[data-a=orgren]')))
    pg3.evaluate("A.role('winery')");pg3.wait_for_timeout(400);pg3.evaluate("closeSheet()");oid=pg3.evaluate("S.corders[0]&&S.corders[0].id")
    pg3.evaluate(f"SB.rpc('corder_action',{{p_id:{oid},p_action:'cok'}}).then(()=>liveHydrate()).then(render)");pg3.wait_for_timeout(400)
    pg3.evaluate(f"go('corder-{oid}')");pg3.wait_for_timeout(500);t=pg3.inner_text('#m');print('label panel:', 'אישור התווית' in t, 'ממתין' in t);assert 'אישור התווית' in t
    pg3.evaluate(f"(async()=>{{window.__mockst.me_role='artist';await SB.rpc('label_action',{{p_entity:'corder',p_id:{oid},p_action:'approve'}});window.__mockst.me_role='winery';await liveHydrate();render()}})()");pg3.wait_for_timeout(700)
    print('after artist approved:',pg3.evaluate(f"S.corders.find(o=>o.id=={oid}).st"))
    pg3.evaluate(f"go('corder-{oid}')");pg3.wait_for_timeout(300);print('bar:',pg3.inner_text('.actbar')[:60].replace('\n',' '))
    pg3.click('.actbar [data-a=cwpaid]');pg3.wait_for_timeout(200);pg3.click('#cfok');pg3.wait_for_timeout(600);print('paid:',pg3.evaluate(f"S.corders.find(o=>o.id=={oid}).paid"))
    print('ERRORS:',errs);b.close()
