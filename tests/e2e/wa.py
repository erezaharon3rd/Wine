"""אישור בטביעת אצבע: מכשיר וירטואלי עם טביעת אצבע, חיבור ראשון, אישור החתימה, ומה שנחסם (מסמך אחר, אתר אחר, בלי אימות)."""
import os
from playwright.sync_api import sync_playwright
D=os.path.dirname(os.path.abspath(__file__))
CORE=open(os.path.join(D,'..','..','supabase','functions','webauthn','core.js')).read()
INIT="""
window.GA_GUIDE_TEST=0;window.__mem={creds:[],ch:[],proofs:[],signs:0};
window.GA_WEBAUTHN_API=async (p)=>{const m=await import('/__core.js');const M=window.__mem;
 const ctx={uid:'u1',email:'a@t',name:'אמן',rpId:location.hostname,origins:[location.origin],
  async creds(){return M.creds},async putChallenge(c){M.ch.push({...c,at:Date.now()})},
  async takeChallenge(pp,ttl){for(let i=M.ch.length-1;i>=0;i--){const c=M.ch[i];if(c.purpose===pp&&!c.used&&Date.now()-c.at<ttl){c.used=1;return c}}return null},
  async saveCred(c){M.creds.push(c)},async touchCred(id,n){M.creds.find(c=>c.id===id).counter=n},
  async sign(s){M.signs++;return {id:M.signs,hash:'h',at:new Date().toISOString()}},async saveProof(id,pr){M.proofs.push({id,...pr})}};
 try{return await m.handle(p,ctx)}catch(e){return {error:e.message}}};
"""
def draw(pg,pts):
    pg.mouse.move(*pts[0]);pg.mouse.down()
    for x,y in pts[1:]:pg.mouse.move(x,y,steps=4)
    pg.mouse.up()
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    c=b.new_context(viewport={'width':900,'height':640});c.route('**fonts.g**',lambda r:r.abort())
    c.route('**/__core.js',lambda r:r.fulfill(body=CORE,content_type='application/javascript'))
    c.add_init_script(INIT)
    pg=c.new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
    cdp=c.new_cdp_session(pg);cdp.send('WebAuthn.enable')
    auth=cdp.send('WebAuthn.addVirtualAuthenticator',{'options':{'protocol':'ctap2','transport':'internal','hasResidentKey':True,'hasUserVerification':True,'isUserVerified':True,'automaticPresenceSimulation':True}})['authenticatorId']
    pg.goto('http://localhost:8778/');pg.wait_for_timeout(800)
    pg.evaluate("localStorage.removeItem('ga-agree-demo');S.role='artist';S.agree=null;S.sig=null;render()")
    pg.evaluate("A.agree()");pg.wait_for_timeout(300)
    for i in range(3):pg.check(f'#ag{i}')
    pg.fill('#agn','ארז אהרון');pg.click('[data-a=agpad]');pg.wait_for_timeout(400)
    bx=pg.locator('.sg-pad canvas').bounding_box();x0,y0,w,h=bx['x'],bx['y'],bx['width'],bx['height']
    draw(pg,[(x0+w*.2,y0+h*.3),(x0+w*.3,y0+h*.6),(x0+w*.45,y0+h*.35),(x0+w*.55,y0+h*.65),(x0+w*.75,y0+h*.4)])
    pg.click('.sg-go');pg.wait_for_timeout(600)
    assert pg.is_visible('[data-a=agsubmit][data-v=bio]'),'fingerprint button shown'
    pg.click('[data-a=agsubmit][data-v=bio]');pg.wait_for_timeout(2500)
    txt=pg.inner_text('.sheet');assert 'ההסכם חתום' in txt and 'טביעת אצבע' in txt,txt[:300]
    m=pg.evaluate("({c:__mem.creds.length,p:__mem.proofs.length,s:__mem.signs,alg:__mem.creds[0]&&__mem.creds[0].alg,bind:__mem.proofs[0]&&__mem.proofs[0].bind.length,ctr:__mem.creds[0].counter})")
    assert m['c']==1 and m['p']==1 and m['s']==1 and m['alg']==-7 and m['bind']==64,m
    print('signed with fingerprint',m)
    # מסמך אחר מזה שאושר: נחסם
    r=pg.evaluate("""(async()=>{const T=GAAgree._t;const sig=JSON.stringify(S.sig);
      const o=await T.api({a:'sign-options',body:'A',sig,name:'x'});
      const c=await navigator.credentials.get({publicKey:{challenge:T.u2b(o.challenge),rpId:o.rpId,allowCredentials:o.allowCredentials.map(x=>({...x,id:T.u2b(x.id)})),userVerification:'required'}});
      const R=c.response,cred={id:c.id,rawId:T.b2u(c.rawId),type:c.type,response:{clientDataJSON:T.b2u(R.clientDataJSON),authenticatorData:T.b2u(R.authenticatorData),signature:T.b2u(R.signature)}};
      const bad=await T.api({a:'sign',version:'x',body:'B',sig,name:'x',cred});
      const again=await T.api({a:'sign',version:'x',body:'A',sig,name:'x',cred});
      const m=await import('/__core.js');let other='';
      try{await m.verifyAssertion(cred,{challenge:o.challenge,origins:['https://grapearts.com'],rpId:location.hostname,key:__mem.creds[0]})}catch(e){other=e.message}
      return {bad:bad.error,again:again.error,other,signs:__mem.signs}})()""")
    assert r['bad'] and 'לא תואם' in r['bad'],r
    assert r['again'],r  # אותו אתגר לא עובד פעמיים
    assert 'אתר אחר' in r['other'],r
    assert r['signs']==1,r
    print('blocked:',r)
    # מכשיר בלי אימות משתמש: נחסם
    cdp.send('WebAuthn.setUserVerified',{'authenticatorId':auth,'isUserVerified':False})
    r2=pg.evaluate("""(async()=>{const T=GAAgree._t;try{return await T.bioSign({version:'x',body:'C',name:'x',sig:JSON.stringify(S.sig)})}catch(e){return {error:e.name+':'+e.message}}})()""")
    assert r2.get('error'),r2;print('no UV:',r2['error'][:80])
    print('ERR',errs);assert not errs
    b.close()
