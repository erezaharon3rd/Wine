"""בדיקות דפדפן לכל הסבבים: יקב, גלריה, אמן, אוצר, מנהל, לקוח, מסמכים ונגישות.
רצות מול האתר עם מסד מדומה (mock.js), כך שלא נוגעות בנתונים אמיתיים.
הרצה: python3 tests/e2e/run.py   (צריך playwright ו-chromium)"""
import os, sys, subprocess, shutil, tempfile, time, json, re
D = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(D, '..', '..'))
PORTAL = os.path.join(ROOT, 'Portal')

demo = tempfile.mkdtemp()
for f in os.listdir(PORTAL):
    if f == 'config.js': continue           # בלי config.js האתר רץ במצב הדגמה
    p = os.path.join(PORTAL, f)
    (shutil.copytree if os.path.isdir(p) else shutil.copy)(p, os.path.join(demo, f))
os.makedirs(os.path.join(D, 'out'), exist_ok=True)
srv = [subprocess.Popen([sys.executable, '-m', 'http.server', port, '-d', d], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
       for port, d in (('8777', PORTAL), ('8778', demo))]
time.sleep(1.2)

fails = []
try:
    for name in ['t', 't2', 'c', 'c2', 'd', 'u', 'm', 'o', 'j', 'p', 'k', 'q', 'a2', 'lb', 'g9', 'tr', 'ch', 'sh', 'gd', 'ag', 'wa']:
        r = subprocess.run([sys.executable, os.path.join(D, name + '.py')], capture_output=True, text=True, timeout=400)
        out = r.stdout + r.stderr
        errs = re.findall(r"^(?:ERR|ERRORS):? (.*)$", out, re.M)
        bad = r.returncode != 0 or any(e.strip() != '[]' for e in errs)
        print(('✗ ' if bad else '✓ ') + name)
        if bad: fails.append(name); print(out[-1500:])

    # כותרות אבטחה: האתר עובד תחת מדיניות התוכן שב-_headers, בלי הפרות
    csp = re.search(r"/Portal/\*\n(?:.*\n)*?\s+Content-Security-Policy: (.*)", open(os.path.join(ROOT, '_headers')).read()).group(1)
    csp = csp.replace("https://qkmdlnarqtjqjnchmjve.supabase.co", "https://qkmdlnarqtjqjnchmjve.supabase.co http://localhost:8777")
    from playwright.sync_api import sync_playwright
    src = open(os.path.join(D, 't2.py')).read(); exec(src[src.index('def init'):src.index('errs=[]')])
    MOCK = open(os.path.join(D, 'mock.js')).read()
    with sync_playwright() as p:
        b = p.chromium.launch(); viol = []
        for role, org, tabs in [('winery', 'w1', ['home', 'gallery', 'designs', 'clients', 'deals']), ('customer', 'w1', ['artists', 'orders']), ('admin', 'o-adm', ['users', 'settings', 'engine', 'log'])]:
            ctx = b.new_context(viewport={'width': 390, 'height': 844})
            def doc(route):
                r = route.fetch(); h = dict(r.headers); h['content-security-policy'] = csp
                route.fulfill(response=r, headers=h)
            ctx.route('http://localhost:8777/', doc)
            ctx.route('**/supabase-js@2', lambda r: r.fulfill(body=MOCK, content_type='application/javascript'))
            ctx.route('**fonts.g**', lambda r: r.abort())
            ctx.add_init_script("document.addEventListener('securitypolicyviolation',e=>{(window.__v=window.__v||[]).push(e.violatedDirective+' '+e.blockedURI)});window.MOCK_INIT=" + json.dumps(init(role, org)) + ";")
            pg = ctx.new_page(); pg.goto('http://localhost:8777/'); pg.wait_for_timeout(1500)
            for t in tabs: pg.evaluate(f"go('tab-{t}')"); pg.wait_for_timeout(250)
            viol += [f"{role}: {v}" for v in (pg.evaluate('window.__v||[]') or [])]
            ctx.close()
        b.close()
    print(('✗ ' if viol else '✓ ') + 'csp'); 
    if viol: fails.append('csp'); print('\n'.join(sorted(set(viol))))
finally:
    for s in srv: s.terminate()
    shutil.rmtree(demo, ignore_errors=True)
print('\nכל בדיקות הדפדפן עברו' if not fails else f'\nנכשלו: {", ".join(fails)}')
sys.exit(1 if fails else 0)
