import os,sys
D=os.path.dirname(os.path.abspath(__file__))
import json, sys
from playwright.sync_api import sync_playwright
MOCK=open(D+'/mock.js').read()
def init(role='admin',status='active',session=True,org=None,data=True):
    ADM='u-admin'
    db={'settings':[{'id':1,'comm_pct':15,'render_quota':6,'artist_share':50}],
        'organizations':[{'id':'o-adm','kind':'admin','name':'סדנת התווית'},{'id':'g1','kind':'gallery','name':'הגלריה'},{'id':'w1','kind':'winery','name':'יקב הבדיקה'},{'id':'p1','kind':'printer','name':'דפוס'}],
        'profiles':[{'id':ADM,'email':'erez@x.com','full_name':'ארז אהרון','role':role,'status':status,'org_id':org or ('o-adm' if role=='admin' else None),'created_at':'2026-11-19'},{'id':'u2','email':'new@x.com','role':None,'status':'pending','created_at':'2026-11-19'}],
        'artists':[{'id':'a1','user_id':ADM,'gallery_id':'g1','name':'ארז אהרון','floor_price':2500,'restrict_tags':[],'bio':''}],
        'works':[],'wines':[],'designs':[],'deals':[],'deal_messages':[],'print_orders':[],'applications':[],'audit_log':[]}
    if data:
        db['works']=[{'id':1,'artist_id':'a1','title':'חורשה','status':'live','available':True,'image_path':'x/1.jpg','no_crop':{},'year':2024},{'id':2,'artist_id':'a1','title':'שדה','status':'pending','available':True,'image_path':'x/2.jpg','no_crop':{}},{'id':3,'artist_id':'a1','title':'ים','status':'review','available':True,'image_path':'x/3.jpg','no_crop':{}}]
        db['applications']=[{'id':1,'name':'גלריה ב','status':'new'}]
    return {'db':db,'session':{'user':{'id':ADM,'email':'erez@x.com'}} if session else None,'user':{'id':ADM,'email':'erez@x.com'},'me_role':role,'me_org':org or 'o-adm'}
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(st,url='http://localhost:8777/?'):
        ctx=b.new_context(viewport={'width':390,'height':844})
        ctx.route('**/supabase-js@2',lambda r:r.fulfill(body=MOCK,content_type='application/javascript'))
        ctx.route('**fonts.googleapis**',lambda r:r.abort())
        ctx.add_init_script('window.MOCK_INIT='+json.dumps(st)+';')
        pg=ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)));pg.goto(url);pg.wait_for_timeout(600);return pg
    T=lambda pg:pg.inner_text('#app')[:160].replace('\n',' | ')
    # 1 login
    pg=page(init(session=False));print('LOGIN:',T(pg))
    pg.fill('#lem','bad');pg.click('[data-a=lsend]');print(' bad email err visible:',pg.is_visible('#lemerr'))
    pg.fill('#lem','erez@x.com');pg.click('[data-a=lsend]');pg.wait_for_timeout(200);print('SENT:',T(pg))
    pg.screenshot(path=D+'/out/login.png')
    # 2 pending
    pg=page(init(role=None,status='pending'));print('PENDING:',T(pg))
    # 3 admin empty-ish data, all view-as roles and tabs
    pg=page(init());print('ADMIN:',T(pg))
    pg.screenshot(path=D+'/out/admin.png')
    for role,tabs in {'admin':['users','settings','finance','engine','log'],'winery':['home','bank','designs','deals','more'],'artist':['home','works','requests','income','profile'],'gallery':['home','deals','artists','works','more'],'curator':['intake','review','promote','quality'],'printer':['orders','account']}.items():
        pg.evaluate(f"A.role('{role}')");pg.wait_for_timeout(500)
        if pg.is_visible('#ov .sheet'):pg.evaluate("closeSheet()");pg.wait_for_timeout(300)
        for t in tabs:
            pg.evaluate(f"go('tab-{t}')");pg.wait_for_timeout(150)
            if not pg.inner_text('#m').strip():print(' EMPTY',role,t)
    print('errors after tour:',errs)
    # 4 admin assigns pending user
    pg.evaluate("A.role('admin')");pg.wait_for_timeout(400);pg.evaluate("closeSheet()");pg.wait_for_timeout(300)
    pg.click('[data-a=luser][data-v=u2]');pg.wait_for_timeout(300);pg.select_option('#ur','winery');pg.select_option('#uo','w1');pg.fill('#un','נוי');pg.click('[data-a=luser2]');pg.wait_for_timeout(600)
    print('after assign:',pg.inner_text('#m')[:300].replace('\n',' | '))
    # 5 winery flow
    st=init(role='winery',org='w1');pg=page(st);pg.evaluate("closeSheet()");pg.wait_for_timeout(300)
    print('WINERY HOME:',T(pg))
    pg.click('[data-a=addwine]');pg.wait_for_timeout(300);pg.fill('#wn','אדום');pg.fill('#wy','2024');pg.fill('#wq','2000');pg.click('[data-a=addwine2]');pg.wait_for_timeout(600)
    print('after wine:',T(pg))
    pg.evaluate("S.draft=null;reqSheet(1)");pg.wait_for_timeout(300)
    for i in range(3):
        nx=pg.query_selector('#ov [data-a=reqnext]') or pg.query_selector('#ov [data-a=sendreq]')
        if not nx:break
        a=nx.get_attribute('data-a');nx.click();pg.wait_for_timeout(500)
        if a=='sendreq':break
    print('after request:',pg.inner_text('#m')[:200].replace('\n',' | '))
    pg.fill('#chatin','שלום מהיקב');pg.click('[data-a=chat]');pg.wait_for_timeout(500)
    print('chat:', 'שלום מהיקב' in pg.inner_text('#m'))
    # gallery prices (admin view-as) via fresh page sharing localStorage? use same page: switch identity in mock
    pg.evaluate("(()=>{const s=JSON.parse(localStorage.mockdb);s.db.profiles[0].role='admin';s.db.profiles[0].org_id='o-adm';s.me_role='admin';localStorage.mockdb=JSON.stringify(s)})()")
    pg.reload();pg.wait_for_timeout(700);pg.evaluate("closeSheet()");pg.wait_for_timeout(300)
    pg.evaluate("A.role('gallery')");pg.wait_for_timeout(500);pg.evaluate("closeSheet()");pg.wait_for_timeout(300)
    did=pg.evaluate("S.deals[0].id");pg.evaluate(f"go('deal-{did}')");pg.wait_for_timeout(300)
    pg.click('.actbar [data-a=pricing]');pg.wait_for_timeout(300);pg.click('#ov [data-a=price]');pg.wait_for_timeout(600)
    print('after price:',pg.evaluate("S.deals[0].st"))
    pg.evaluate("A.role('artist')");pg.wait_for_timeout(500);pg.evaluate("closeSheet()");pg.wait_for_timeout(300);pg.evaluate(f"go('deal-{did}')");pg.wait_for_timeout(300)
    pg.click('.actbar [data-a=consentS]');pg.wait_for_timeout(300);pg.click('#ov [data-a=consent]');pg.wait_for_timeout(600)
    print('after consent:',pg.evaluate("S.deals[0].st"))
    # upload work as admin/artist
    pg.evaluate("go('tab-works')");pg.wait_for_timeout(300)
    pg.evaluate("S.upload={src:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',cells:{},w:4000,h:3000,e:{},check:{ok:true,blocks:[],warns:[],info:{w:4000,h:3000,dpi:1000,printCm:[34,25],kb:500,mb:0.5}}};uploadSheet()");pg.wait_for_timeout(300)
    pg.evaluate("document.querySelectorAll('#ov details').forEach(d=>d.open=true)");pg.fill('#ut','חדשה');pg.fill('#uy','2025');pg.click('[data-a=doupload]');pg.wait_for_timeout(800)
    print('works now:',pg.evaluate("S.works.map(w=>w.t+':'+w.st).join(',')"))
    pg.screenshot(path=D+'/out/artist.png')
    # demo mode intact
    pg=page(init(),'http://localhost:8778/?demo');print('DEMO:',T(pg))
    print('ERRORS:',errs)
    b.close()
