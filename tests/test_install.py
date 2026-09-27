from playwright.sync_api import sync_playwright
errs=[]
def check(label,ok,got=""):
    print(label,"->","OK" if ok else "FAIL",got if not ok else "")
    if not ok: errs.append(label+" "+str(got)[:200])
IPHONE="Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
ANDROID="Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"
FAKE_PROMPT="""()=>{const e=new Event('beforeinstallprompt',{cancelable:true});e.prompt=()=>{window.__prompted=(window.__prompted||0)+1};e.userChoice=Promise.resolve({outcome:'accepted'});window.dispatchEvent(e);}"""
def page(b,w=390,h=844,ua=None,standalone=False):
    ctx=b.new_context(viewport={"width":w,"height":h},user_agent=ua,service_workers="block")
    pg=ctx.new_page(); pg.on("pageerror",lambda e:errs.append("pageerror: "+str(e)))
    for pat in ["**/www.gstatic.com/**","**/fonts.googleapis.com/**","**/cdn.jsdelivr.net/**"]: pg.route(pat,lambda r:r.abort())
    pg.route("**/config.js",lambda r:r.fulfill(body="window.PLANNER_FIREBASE_CONFIG={};",content_type="text/javascript"))
    if standalone: pg.add_init_script("""const mm=window.matchMedia.bind(window);window.matchMedia=q=>q.includes('display-mode: standalone')?{matches:true,media:q,addEventListener(){},removeEventListener(){}}:mm(q);""")
    pg.goto("http://localhost:8765/"); pg.wait_for_timeout(500); return pg
with sync_playwright() as p:
    b=p.chromium.launch()
    # 1. phone, in a browser tab
    pg=page(b,ua=ANDROID)
    check("1. Install button at the top on a phone",pg.is_visible("#installBtn") and pg.inner_text("#installBtn").endswith("Install"))
    pg.click("#installBtn"); pg.wait_for_selector(".sheet h3")
    check("1. without a browser prompt: Chrome-on-Android steps","Install app" in pg.inner_text(".sheet ol"),pg.inner_text(".sheet ol"))
    pg.screenshot(path="tests/out/install_help_android.png"); pg.click('.sheet button:has-text("Got it")')
    # 2. the browser offers installing: our button opens its prompt
    pg.evaluate(FAKE_PROMPT); pg.click("#installBtn"); pg.wait_for_timeout(200)
    check("2. button opens the real install prompt",pg.evaluate("window.__prompted")==1 and pg.locator(".sheet").count()==0)
    pg.evaluate("window.dispatchEvent(new Event('appinstalled'))"); pg.wait_for_timeout(200)
    check("2. hidden once installed, with a message",not pg.is_visible("#installBtn") and "Nova is installed" in pg.inner_text(".toast span"))
    pg.context.close()
    # 3. laptop: button in the sidebar; Settings row
    pg=page(b,1400,900)
    check("3. Install button in the laptop sidebar",pg.is_visible("#sideInstall"))
    pg.click("#sideInstall"); pg.wait_for_selector(".sheet h3")
    check("3. laptop Chrome steps","address bar" in pg.inner_text(".sheet ol"),pg.inner_text(".sheet ol"))
    pg.keyboard.press("Escape"); pg.click("#sideSettings"); pg.wait_for_timeout(300)
    check("3. Settings offers Install",pg.locator('.upcard .setrow:has-text("Install Nova on this device") button:has-text("Install")').count()==1)
    pg.screenshot(path="tests/out/install_desk.png"); pg.context.close()
    # 4. iPhone Safari: steps for Add to Home Screen
    pg=page(b,ua=IPHONE); pg.click("#installBtn"); pg.wait_for_selector(".sheet h3")
    check("4. iPhone steps","Add to Home Screen" in pg.inner_text(".sheet ol") and "Share" in pg.inner_text(".sheet ol"),pg.inner_text(".sheet ol"))
    pg.screenshot(path="tests/out/install_help_iphone.png"); pg.context.close()
    # 5. already running as the installed app: no button anywhere
    pg=page(b,ua=ANDROID,standalone=True)
    check("5. no Install button inside the installed app",not pg.is_visible("#installBtn"))
    pg.click('#nav button[data-tab="more"]'); pg.click('.mi:has-text("Settings")'); pg.wait_for_timeout(300)
    check("5. no Install row in Settings",pg.locator('.setrow:has-text("Install Nova on this device")').count()==0)
    pg.context.close(); b.close()
print("ERRORS:",errs)
