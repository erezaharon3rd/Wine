import os,sys
D=os.path.dirname(os.path.abspath(__file__))
import json
from playwright.sync_api import sync_playwright
MOCK=open(D+'/mock.js').read()
src=open(D+'/t2.py').read();exec(src[src.index('def init'):src.index('errs=[]')])
errs=[]
def st(role,org,**k):
    s=init(role,org,**k);d=s['db']
    d['contract_templates']=[{'version':1,'active':True,'created_at':'2026-11-19','body':'1. הצדדים\n{gallery}, בשם האמן {artist}, ו־{winery}.\n\n2. היצירה\nהיצירה "{work}" על "{wine}". {type}, {qty}{exclusive}.\n\n5. תמורה\n{price} לפני מע״מ.'}]
    d['org_invites']=[];d['contracts']=[]
    d['profiles'].append({'id':'p2','email':'w@x','full_name':'יקבן','role':'winery','status':'active','org_id':'w1','created_at':'2026-11-19'})
    return s
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(s,url='http://localhost:8777/'):
        ctx=b.new_context(viewport={'width':390,'height':844},permissions=['clipboard-read','clipboard-write'])
        ctx.route('**/supabase-js@2',lambda r:r.fulfill(body=MOCK,content_type='application/javascript'));ctx.route('**fonts.googleapis**',lambda r:r.abort())
        ctx.add_init_script('if(!localStorage.mockdb)window.MOCK_INIT='+json.dumps(s)+';')
        pg=ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)));pg.goto(url);pg.wait_for_timeout(1800)
        if pg.is_visible('#ov .sheet'):pg.evaluate("closeSheet()")
        return pg
    DB=lambda pg,t:pg.evaluate(f"JSON.stringify(JSON.parse(localStorage.mockdb).db.{t})")
    # admin settings
    pg=page(st('admin','o-adm'));pg.evaluate("go('tab-settings')");pg.wait_for_timeout(500)
    t=pg.inner_text('#m');print('ADMIN has sections:',[x in t for x in ['קובצי יצירות','קישורי הצטרפות','תבנית חוזה הרישוי']])
    print('migrate btn:',pg.inner_text('[data-a=migrate]') if pg.is_visible('[data-a=migrate]') else None)
    pg.click('[data-a=migrate]');pg.wait_for_timeout(2500)
    print('works after migrate:',[ (w['id'],w['image_path'][:14],w.get('preview_path','')[:10]) for w in json.loads(DB(pg,'works'))])
    pg.evaluate("go('tab-settings')");pg.wait_for_timeout(400);print('after:',pg.inner_text('#m').split('קובצי יצירות')[1][:60].replace('\n',' '))
    pg.select_option('#ivo','w1');pg.select_option('#ivr','winery');pg.click('[data-a=invmake]');pg.wait_for_timeout(800)
    print('invite:',DB(pg,'org_invites'));pg.screenshot(path=D+'/out/o_admin.png',full_page=True)
    pg.select_option('#ivo','w1');pg.select_option('#ivr','artist');pg.click('[data-a=invmake]');pg.wait_for_timeout(400);print('bad combo toast:',pg.inner_text('.toast') if pg.is_visible('.toast') else '')
    pg.click('[data-a=ctedit]');pg.wait_for_timeout(300);pg.fill('#ctb','1. הצדדים\nנוסח חדש עם {winery} ו־{artist} ועוד מילים כדי לעבור את המינימום.');pg.click('[data-a=ctsave]');pg.wait_for_timeout(800)
    print('templates:',[(t['version'],t['active']) for t in json.loads(DB(pg,'contract_templates'))])
    print('log view:',pg.evaluate("go('tab-log')") or pg.inner_text('#m')[:120].replace('\n',' | '))
    # join with link
    s=st('customer','w1',pending=True);s['db']['org_invites']=[{'token':'abc','org_id':'w1','role':'winery','revoked':False,'expires_at':'2099-01-01','uses':0}]
    pg=page(s,'http://localhost:8777/?j=abc');print('JOIN:',pg.inner_text('#app')[:90].replace('\n',' | '));print('role now:',json.loads(DB(pg,'profiles'))[0]['role'])
    # customer delete
    pg=page(st('customer','w1'));pg.evaluate("go('tab-orders')");pg.wait_for_timeout(400);print('delete link:',pg.is_visible('[data-a=delme]'))
    pg.click('[data-a=delme]');pg.wait_for_timeout(300);pg.click('#ov .sheet .btn:not(.alt)');pg.wait_for_timeout(1200);print('deleted:',pg.evaluate("JSON.parse(localStorage.mockdb||'{}').deleted||'cleared'"))
    # artist: ai bio button + pre consent
    s=st('artist',None);s['db']['artists'][0]['user_id']='u1'
    pg=page(s);pg.evaluate("go('tab-profile')");pg.wait_for_timeout(400);print('aibio btn:',pg.is_visible('[data-a=aibio]'))
    pg.click('[data-a=pre]');pg.wait_for_timeout(300);pg.click('#ov .sheet .btn:not(.alt)');pg.wait_for_timeout(900);print('pre_consent:',json.loads(DB(pg,'artists'))[0].get('pre_consent'),pg.evaluate('S.pre'))
    pg.screenshot(path=D+'/out/o_artist.png',full_page=True)
    # contract doc from template
    s=st('winery','w1');s['db']['deals']=[{'id':103,'winery_id':'w1','gallery_id':'g1','artist_id':'a1','work_id':1,'wine_id':1,'design_code':'RS01','status':'sign','license_type':'one','qty_tier':'a','exclusive':False,'price_net':2500,'adj_pct':0,'version':3,'created_at':'2026-11-19'}]
    s['db']['contracts']=[{'deal_id':103,'template_version':1,'terms_hash':'abc123','terms':{'template':'1. הצדדים\n{gallery} ו־{winery}, היצירה "{work}".\n\n2. תמורה\n{price}'}}]
    pg=page(s);ctx=pg.context
    with ctx.expect_page() as np: pg.evaluate("A.contractpdf(103)")
    d=np.value;d.wait_for_timeout(600);print('CONTRACT:',d.inner_text('body')[:260].replace('\n',' | '))
    print('deal ver:',pg.evaluate("S.deals[0].ver"))
    print('ERR',errs);b.close()
