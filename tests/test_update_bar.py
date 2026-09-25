import os,re,shutil,subprocess,sys,tempfile,time
from playwright.sync_api import sync_playwright
# Serves a copy of the app on its own port so we can "publish" a new version mid-test by editing sw.js.
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
site=tempfile.mkdtemp()
for f in os.listdir(root):
    if os.path.isfile(os.path.join(root,f)):shutil.copy(os.path.join(root,f),site)
open(os.path.join(site,"config.js"),"w").write("window.PLANNER_FIREBASE_CONFIG={};")  # this-device mode, no sign-in prompt
PORT=8766;URL=f"http://localhost:{PORT}/"
srv=subprocess.Popen([sys.executable,"-m","http.server",str(PORT)],cwd=site,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
def publish(v):
    p=os.path.join(site,"sw.js");s=open(p,encoding="utf8").read()
    open(p,"w",encoding="utf8").write(re.sub(r'const VERSION = "[^"]*"',f'const VERSION = "{v}"',s))
errs=[]
try:
    time.sleep(1)
    with sync_playwright() as p:
        b=p.chromium.launch();ctx=b.new_context(viewport={"width":390,"height":844});pg=ctx.new_page()
        pg.on("pageerror",lambda e:errs.append(str(e)))
        pg.route("**/www.gstatic.com/**",lambda r:r.abort());pg.route("**/fonts.googleapis.com/**",lambda r:r.abort())
        pg.goto(URL);pg.wait_for_function("navigator.serviceWorker.controller!==null",timeout=10000);pg.wait_for_timeout(500)
        bar=lambda:pg.locator(".updbar").count()
        print("1. first install shows no update bar:",bar()==0);bar()==0 or errs.append("bar shown on first install")
        pg.click('#nav button[data-tab="more"]');pg.click('.mi:has-text("Settings")');pg.wait_for_timeout(200)
        ver=pg.inner_text('.setrow:has-text("App version") span');print("2. settings version:",ver);re.fullmatch(r"v\d+",ver) or errs.append("version label: "+ver)
        pg.click('button:has-text("Check for updates")');pg.wait_for_selector(".toast");t=pg.inner_text(".toast span")
        print("3. check with nothing new:",t);t=="You're up to date." or errs.append("up-to-date toast: "+t)
        publish("planner-v9-test")
        pg.evaluate("document.dispatchEvent(new Event('visibilitychange'))")  # like switching back to the app
        pg.wait_for_selector(".updbar",timeout=10000);print("4. new version found on return to app:",pg.inner_text(".updbar span"))
        pg.click('.updbar button:has-text("Update now")');pg.wait_for_load_state("load");pg.wait_for_timeout(800)
        print("5. after tapping Update now, bar gone:",bar()==0);bar()==0 or errs.append("bar still shown after reload")
        pg.click('#nav button[data-tab="more"]');pg.click('.mi:has-text("Settings")');pg.wait_for_timeout(300)
        ver=pg.inner_text('.setrow:has-text("App version") span');print("6. settings version now:",ver);"v9-test" in ver or errs.append("version after update: "+ver)
        publish("planner-v10-test")
        pg.click('button:has-text("Check for updates")');pg.wait_for_selector(".updbar",timeout=10000)
        print("7. Check for updates finds the next version:",pg.inner_text(".updbar span"))
        pg.screenshot(path=os.path.join(root,"tests","out","update_bar.png"))
        b.close()
finally:
    srv.terminate();shutil.rmtree(site,ignore_errors=True)
print("ERRORS:",errs)
