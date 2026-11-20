"""החנות הפתוחה (shop.html) ודף אימות התעודה (verify.html), מול מסד מדומה:
גלישה בלי חשבון, ארבעת השלבים, לוגו רק מחוץ לציור, כניסה רק בשליחה, הצעת מחיר לעסק, ההזמנות שלי."""
import os,json
D=os.path.dirname(os.path.abspath(__file__))
from playwright.sync_api import sync_playwright
CAT={'open':True,'lead_days':21,'cutoff':'2027-03-20','vat':18,
 'packages':[{'id':1,'code':'single','name':'בקבוק במארז','level':'case','bottles':1,'box':'קופסה קשיחה','price':35,'includes':{'card':True}},
             {'id':4,'code':'case6','name':'ארגז שישה','level':'case','bottles':6,'box':'ארגז','price':60,'includes':{'card':True}},
             {'id':5,'code':'collector','name':'מהדורת אספנים','level':'collector','bottles':1,'box':'קופסה ממוספרת','price':95,'includes':{'card':True,'certificate':True}}],
 'artists':[{'id':'a1','name':'ארז אהרון','bio':'צייר שמן. מיוצג בגלריה.','country':'ישראל','tier':'senior','levels':['case','collector']}],
 'works':[{'id':1,'artist':'a1','title':'חורשה','year':2024,'size':'60×80','preview':None,'zones':['band','card']},
          {'id':2,'artist':'a1','title':'ים','year':2023,'size':'50×70','preview':None,'zones':[]}],
 'wines':[{'id':1,'name':'אדום','vintage':2024,'type':'red','winery':'יקב הבדיקה','kosher':True,'price':60,'drink_by':2030,'free':40}],
 'series':[{'id':9,'work':1,'wine':None,'kind':'closed','name':'חורשה · מהדורה ראשונה','size':300,'free':299,'levels':['case','collector'],'technique':None,'print_size':None,'print_free':None}]}
MOCK="""window.supabase={createClient(){
 const st=JSON.parse(localStorage.getItem('shopmock')||'null')||{session:null,role:null,orders:[],calls:[]};
 const P=()=>localStorage.setItem('shopmock',JSON.stringify(st));
 const CAT=%s;
 const quote=d=>{const p=CAT.packages.find(x=>x.id===+d.package),n=(d.qty||1)*p.bottles,w=60*n,a=Math.round((25*n+(d.qty||1)*p.price)*(n>=24?0.95:1));return {packages:d.qty||1,bottles:n,wine_unit:60,wine_total:w,art_total:a,discount_pct:n>=24?5:0,total:w+a,wine_seller_name:'יקב הבדיקה'}};
 const B=t=>{let ins=null;const b={select(){return b},eq(){return b},order(){return b},maybeSingle(){return b},single(){return b},insert(x){ins=x;return b},
   then(r){if(t==='profiles')return r({data:st.session?{role:st.role,status:st.role?'active':'pending',org_id:null}:null,error:null});
     if(t==='customer_orders')return r({data:st.orders,error:null});if(t==='order_drafts'){st.calls.push(['draft',ins]);P();return r({data:{token:'tok123'},error:null})}
     return r({data:[],error:null})}};return b};
 return {from:B,storage:{from(){return {async upload(p){st.calls.push(['upload',p]);P();return {data:{path:p},error:null}}}}},
  async rpc(fn,a){st.calls.push([fn,a]);P();
   if(fn==='catalog')return {data:CAT,error:null};
   if(fn==='direct_quote')return {data:quote(a.d),error:null};
   if(fn==='join_direct'){st.role='customer';P();return {data:true,error:null}}
   if(fn==='my_card')return {data:st.session?{channel:'direct'}:null,error:null};
   if(fn==='place_order'){if(!a.p.delivery)return {data:null,error:{message:'תאריך האספקה המוקדם ביותר הוא 11.12.2026'}};const id=6000+st.orders.length+1;
     st.orders.unshift({id,status:a.p.quote?'quote':'approved',total:quote(a.p.design).total,bottles:quote(a.p.design).bottles,delivery_date:a.p.delivery,quote_until:'2026-12-04',design:a.p.design,package_id:a.p.design.package,log:[]});P();return {data:id,error:null}}
   if(fn==='direct_action'){const o=st.orders.find(x=>x.id===a.p_id);o.status=a.p_action==='qaccept'?'approved':'cancel';P();return {data:o.status,error:null}}
   if(fn==='get_draft')return {data:{work:1,artist:'a1',package:4,wine:1,qty:3,zone:'band',name:'חברת בדיקה',biz:true,bn:'חברת בדיקה'},error:null};
   if(fn==='verify_certificate')return {data:a.p_code==='abc123'?{ok:true,kind:'bottle',no:7,of:300,work:'חורשה',year:2024,artist:'ארז אהרון',wine:'אדום',vintage:2024,winery:'יקב הבדיקה',drink_by:2030,signed:true,stamped:false,issued:'2026-11-20'}:null,error:null};
   return {data:null,error:null}},
  auth:{async getSession(){return {data:{session:st.session}}},onAuthStateChange(){},async signOut(){st.session=null;P();return {}},
   async signInWithPassword(c){st.session={user:{id:'u9',email:c.email}};P();return {data:{session:st.session},error:null}},
   async signUp(c){st.session={user:{id:'u9',email:c.email}};P();return {data:{session:st.session},error:null}},async signInWithOtp(){return {error:null}}}}}};""" % json.dumps(CAT)
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(url,w=390,h=844):
        ctx=b.new_context(viewport={'width':w,'height':h});ctx.route('**/supabase-js@2',lambda r:r.fulfill(body=MOCK,content_type='application/javascript'));ctx.route('**fonts.g**',lambda r:r.abort())
        pg=ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)));pg.goto(url);pg.wait_for_timeout(800);return pg
    calls=lambda pg:json.loads(pg.evaluate("localStorage.shopmock"))['calls']
    pg=page('http://localhost:8777/shop.html')
    t=pg.inner_text('main');assert 'אמנות ישראלית על יין ישראלי' in t and 'חורשה' in t and 'שלב 1 מתוך 4' in t,t[:300]
    pg.screenshot(path=D+'/out/sh-home.png',full_page=True)
    pg.click('[data-go="work-1"]');pg.wait_for_timeout(400);assert pg.is_disabled('#next')
    pg.click('[data-pk="4"]');pg.wait_for_timeout(300);pg.click('[data-wn="1"]');pg.wait_for_timeout(300);pg.fill('#qty','5');pg.wait_for_timeout(600)
    s=pg.inner_text('#barsum');print('price bar:',s.replace('\n',' '));assert '30 בקבוקים' in s and 'הנחת כמות 5%' in s
    pg.screenshot(path=D+'/out/sh-work.png',full_page=True)
    pg.click('#next');pg.wait_for_timeout(400);t=pg.inner_text('main');assert 'שלב 3 מתוך 4' in t and 'פס מתחת לציור' in t and 'תווית צוואר' not in t,t
    pg.click('[data-z=band]');pg.wait_for_timeout(300);pg.fill('#nm','חברת בדיקה');pg.wait_for_timeout(200)
    assert 'חברת בדיקה' in pg.inner_html('.stage')
    pg.screenshot(path=D+'/out/sh-make.png',full_page=True)
    pg.click('#next');pg.wait_for_timeout(500);t=pg.inner_text('main');assert 'סיכום' in t and 'נמכר על ידי יקב הבדיקה' in t,t
    pg.check('#biz');pg.wait_for_timeout(300);pg.fill('#bn','חברת בדיקה בע"מ');pg.fill('#cn','מיכל לוי');pg.fill('#cp','0521234567');pg.fill('#ce','m@x.com');pg.fill('#ca','הרצל 1 תל אביב');pg.fill('#dd','2027-03-01')
    pg.dispatch_event('#dd','change');assert pg.inner_text('#send')=='לבקש הצעת מחיר'
    pg.screenshot(path=D+'/out/sh-details.png',full_page=True)
    pg.click('#send');pg.wait_for_timeout(500);assert 'כניסה' in pg.inner_text('main'),'login expected'
    pg.fill('#le','m@x.com');pg.fill('#lp','password123');pg.click('#lin');pg.wait_for_timeout(900)
    t=pg.inner_text('main');assert 'סיכום' in t,'back to details'
    assert pg.input_value('#bn')=='חברת בדיקה בע"מ'
    pg.click('#send');pg.wait_for_timeout(900);t=pg.inner_text('main');print(t[:80].replace('\n',' '));assert 'בקשת הצעת המחיר התקבלה' in t
    po=[c for c in calls(pg) if c[0]=='place_order'][-1][1]['p'];print('order:',po['design'],po['buyer'],po['quote']);assert po['design']['zone']=='band' and po['design']['name']=='חברת בדיקה' and po['quote'] and po['buyer_kind']=='business'
    assert any(c[0]=='join_direct' for c in calls(pg))
    pg.click('a[href="#orders"]');pg.wait_for_timeout(600);t=pg.inner_text('main');assert 'הצעת מחיר' in t and 'לאשר את ההצעה' in t,t
    pg.click('[data-acc]');pg.wait_for_timeout(700);t=pg.inner_text('main');print('after accept:', 'ממתינה לתשלום' in t);assert 'ממתינה לתשלום' in t
    pg.screenshot(path=D+'/out/sh-orders.png',full_page=True)
    # ציור בלי מסגרת מאושרת: אין אפשרות ללוגו
    pg.goto('http://localhost:8777/shop.html#work-2');pg.wait_for_timeout(600);pg.click('[data-pk="1"]');pg.click('[data-wn="1"]');pg.wait_for_timeout(300);pg.click('#next');pg.wait_for_timeout(400)
    assert 'עוד אין אזור מאושר' in pg.inner_text('main')
    # מהדורת אספנים דורשת מהדורה
    pg.goto('http://localhost:8777/shop.html#work-1');pg.wait_for_timeout(600);pg.click('[data-pk="5"]');pg.wait_for_timeout(300);pg.click('[data-wn="1"]');pg.wait_for_timeout(300)
    assert pg.is_disabled('#next');pg.click('[data-sr="9"]');pg.wait_for_timeout(300);assert not pg.is_disabled('#next');assert 'נותרו 299 מתוך 300' in pg.inner_text('main')
    # טיוטה ששותפה עם מאשר בחברה
    pg=page('http://localhost:8777/shop.html#d-tok123');t=pg.inner_text('main');assert 'טיוטה לאישור' in t and 'ארגז שישה' in t,t
    # אימות תעודה
    pg=page('http://localhost:8777/verify.html?c=abc123');pg.wait_for_timeout(500);t=pg.inner_text('#out');print('verify:',t[:60].replace('\n',' '));assert 'מתוך 300' in t and 'ארז אהרון' in t and 'נחתמה' in t
    pg.screenshot(path=D+'/out/sh-verify.png',full_page=True)
    pg.fill('#c','zzz');pg.click('button');pg.wait_for_timeout(500);assert 'לא נמצא' in pg.inner_text('#out')
    # מחשב
    pg=page('http://localhost:8777/shop.html',1280,900);pg.screenshot(path=D+'/out/sh-desktop.png')
    print('ERR',errs);b.close()
