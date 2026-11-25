"""דף הבדיקות: מנהל רואה את כל התפקידים, עובר לחשבון בדיקה בלחיצה, וחוזר לחשבון שלו. בלי מנהל אין מעבר."""
import os,json
from playwright.sync_api import sync_playwright
STUB=r"""(function(){
const L=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}};
const P={adm:{role:'admin',full_name:'ארז',is_test:false,email:'erez@x.com',status:'active'},winery:{role:'winery',full_name:'יינן לבדיקה',is_test:true,email:'winery@test.local',status:'active'}};
window.__calls=[];
window.supabase={createClient:(u,k,o)=>{const mem=o&&o.auth&&o.auth.persistSession===false;let sess=mem?null:L('stubsess');
 const c={auth:{
  async getSession(){return {data:{session:sess}}},
  async setSession(s){__calls.push(['set',s.refresh_token]);if(!/^r-adm/.test(s.refresh_token))return {data:{session:null},error:{message:'bad'}};sess={access_token:'a-adm2',refresh_token:'r-adm2',user:{id:'adm'}};if(!mem)localStorage.setItem('stubsess',JSON.stringify(sess));return {data:{session:sess},error:null}},
  async verifyOtp(x){__calls.push(['otp',x.token_hash,x.type]);sess={access_token:'a-w',refresh_token:'r-w',user:{id:'winery'}};localStorage.setItem('stubsess',JSON.stringify(sess));return {data:{session:sess},error:null}}},
 from:()=>({select:()=>({eq:(c2,id)=>({maybeSingle:async()=>({data:P[id]||null})})})}),
 functions:{async invoke(n,{body}){__calls.push(['fn',n,body.a,body.k||'',sess&&sess.access_token]);if(!sess||!/adm/.test(sess.access_token))return {data:{error:'רק מנהל המערכת'}};
   if(body.a==='list')return {data:{accounts:['winery','gallery','artist','curator','printer','customer','buyer'].map(k=>({k,name:k+' לבדיקה',email:k+'@test.local',org:k==='winery'?'יקב 1':''}))}};
   return {data:{token_hash:'th-'+body.k,dest:body.k==='buyer'?'shop.html':'./'}}}}};return c}};})();"""
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch();c=b.new_context(viewport={'width':390,'height':844})
    c.route('**/supabase-js@2',lambda r:r.fulfill(body=STUB,content_type='application/javascript'));c.route('**fonts.g**',lambda r:r.abort())
    c.route('http://localhost:8777/',lambda r:r.fulfill(body='<html><body>APP</body></html>',content_type='text/html'))
    pg=c.new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
    # no session: asks to sign in as admin
    pg.goto('http://localhost:8777/test.html');pg.wait_for_timeout(700)
    assert 'כמנהל המערכת' in pg.inner_text('#body'),pg.inner_text('#body')
    # admin
    pg.evaluate("localStorage.setItem('stubsess',JSON.stringify({access_token:'a-adm',refresh_token:'r-adm',user:{id:'adm'}}))")
    pg.reload();pg.wait_for_timeout(800)
    assert pg.locator('.role').count()==8 and pg.locator('.role[aria-current=true][data-k=admin]').count()==1
    assert pg.locator('.role svg').count()>=8,'characters drawn'
    pg.screenshot(path=os.path.join(os.path.dirname(__file__),'out','tt.png'))
    pg.click('.role[data-k=winery]');pg.wait_for_url('http://localhost:8777/');
    assert pg.evaluate("JSON.parse(localStorage.getItem('ga-test-admin')).refresh_token")=='r-adm'
    # as the test winery: back button, switching uses the saved admin session
    pg.goto('http://localhost:8777/test.html');pg.wait_for_timeout(800)
    assert 'יינן לבדיקה' in pg.inner_text('#now') and pg.is_visible('#back')
    assert pg.locator('.role[aria-current=true][data-k=winery]').count()==1
    pg.click('.role[data-k=gallery]');pg.wait_for_url('http://localhost:8777/')
    pg.goto('http://localhost:8777/test.html');pg.wait_for_timeout(800)
    pg.click('#back');pg.wait_for_url('http://localhost:8777/')
    assert pg.evaluate("localStorage.getItem('ga-test-admin')") is None
    assert pg.evaluate("JSON.parse(localStorage.getItem('stubsess')).refresh_token")=='r-adm2'
    print('ERR',errs);assert not errs;b.close()
