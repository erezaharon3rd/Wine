import os,sys,json
D=os.path.dirname(os.path.abspath(__file__))
from playwright.sync_api import sync_playwright
MOCK=open(D+'/mock.js').read();PDFLIB=open(D+'/vendor/pdf-lib.min.js').read()
src=open(D+'/t2.py').read();exec(src[src.index('def init'):src.index('errs=[]')])
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(viewport={'width':390,'height':844},accept_downloads=True)
    ctx.route('**/supabase-js@2',lambda r:r.fulfill(body=MOCK,content_type='application/javascript'));ctx.route('**fonts.g**',lambda r:r.abort())
    ctx.route('**/pdf-lib*',lambda r:r.fulfill(body=PDFLIB,content_type='application/javascript'))
    s=init('winery','w1');s['db']['organizations'][2]['pricing']={'label':{'w':90,'h':140}}
    ctx.add_init_script('window.MOCK_INIT='+json.dumps(s)+';');pg=ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)));pg.goto('http://localhost:8777/');pg.wait_for_timeout(1600)
    with pg.expect_download() as dl: pg.evaluate("printFile({type:'red',work:1,wid:'w1',o:{pos:50,zoom:100,shape:'arch',name:'יין אדום',year:2024,foil:true,emboss:true,artist:'ארז אהרון'}},'order-9')")
    f=D+'/out/print.pdf';dl.value.save_as(f);print('file',dl.value.suggested_filename)
    from pypdf import PdfReader
    r=PdfReader(f);mm=lambda v:round(float(v)*25.4/72,1)
    print('pages',len(r.pages));t=r.pages[0].trimbox;bb=r.pages[0].bleedbox
    print('trim mm',mm(t.width),mm(t.height),'bleed mm',mm(bb.width),mm(bb.height))
    assert len(r.pages)==3 and (mm(t.width),mm(t.height))==(90.0,140.0) and (mm(bb.width),mm(bb.height))==(96.0,146.0)
    print('slug',r.pages[1].extract_text()[-60:])
    with pg.expect_download() as dl: pg.evaluate("printFile({type:'red',work:1,o:{name:'בלי זהב',year:2024}},'order-10')")
    f2=D+'/out/print2.pdf';dl.value.save_as(f2);print('plain pages',len(PdfReader(f2).pages));assert len(PdfReader(f2).pages)==1
    print('ERR',errs);b.close()
