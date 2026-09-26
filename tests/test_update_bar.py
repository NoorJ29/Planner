import os,re,shutil,subprocess,sys,tempfile,time
from playwright.sync_api import sync_playwright
# Serves a copy of the app on its own port so we can "publish" a new version mid-test,
# the way a real release does: a higher number in sw.js and the same number built into index.html.
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
site=tempfile.mkdtemp()
for f in os.listdir(root):
    if os.path.isfile(os.path.join(root,f)):shutil.copy(os.path.join(root,f),site)
open(os.path.join(site,"config.js"),"w").write("window.PLANNER_FIREBASE_CONFIG={};")  # this-device mode, no sign-in prompt
PORT=8766;URL=f"http://localhost:{PORT}/"
CUR=int(re.search(r'VERSION = "planner-v(\d+)"',open(os.path.join(root,"sw.js")).read()).group(1))
srv=subprocess.Popen([sys.executable,"-m","http.server",str(PORT)],cwd=site,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
def publish(v,page_too=True):
    p=os.path.join(site,"sw.js");s=open(p,encoding="utf8").read()
    open(p,"w",encoding="utf8").write(re.sub(r'const VERSION = "[^"]*"',f'const VERSION = "planner-v{v}"',s))
    if page_too:
        p=os.path.join(site,"index.html");s=open(p,encoding="utf8").read()
        open(p,"w",encoding="utf8").write(re.sub(r'APP_VERSION=Number\("\d+"\)',f'APP_VERSION=Number("{v}")',s))
errs=[]
def check(label,ok,got=""):
    print(label,"->","OK" if ok else "FAIL",got)
    if not ok: errs.append(label+" "+str(got))
try:
    time.sleep(1)
    with sync_playwright() as p:
        b=p.chromium.launch();ctx=b.new_context(viewport={"width":390,"height":844});pg=ctx.new_page()
        pg.on("pageerror",lambda e:errs.append(str(e)))
        pg.route("**/www.gstatic.com/**",lambda r:r.abort());pg.route("**/fonts.googleapis.com/**",lambda r:r.abort());pg.route("**/cdn.jsdelivr.net/**",lambda r:r.abort())
        pg.goto(URL);pg.wait_for_function("navigator.serviceWorker.controller!==null",timeout=10000);pg.wait_for_timeout(3600)
        bar=lambda:pg.locator(".updbar").count()
        row='.upcard .setrow'
        def settings():
            pg.click('#nav button[data-tab="more"]');pg.click('.mi:has-text("Settings")');pg.wait_for_timeout(300)
        check("1. first install shows no update bar",bar()==0)
        settings()
        check("2. Settings shows this version",pg.inner_text(row+" b")==f"Nova version {CUR}",pg.inner_text(row+" b"))
        check("2. and that it's up to date","You're up to date. Last checked at" in pg.inner_text(row+" span"),pg.inner_text(row+" span"))
        pg.click(row+' button:has-text("Check for updates")');pg.wait_for_selector(".toast")
        check("3. manual check with nothing new",pg.inner_text(".toast span")==f"You're on the latest version ({CUR}).",pg.inner_text(".toast span"))
        ctx.set_offline(True);pg.click(row+' button:has-text("Check for updates")');pg.wait_for_timeout(600)
        check("3. offline check says so","Couldn't check: you're offline." in pg.inner_text(row+" span"),pg.inner_text(row+" span"))
        ctx.set_offline(False)
        publish(998)
        pg.evaluate("document.dispatchEvent(new Event('visibilitychange'))")  # like switching back to the app
        pg.wait_for_selector(".updbar",timeout=10000)
        check("4. bar names both versions",pg.inner_text(".updbar span")==f"Nova version 998 is ready (you have {CUR}).",pg.inner_text(".updbar span"))
        pg.wait_for_timeout(300)
        check("5. Settings shows the available version",pg.inner_text(row+" b")=="Version 998 is available" and f"You're on version {CUR}" in pg.inner_text(row+" span") and pg.locator(row+' button:has-text("Update now")').count()==1,pg.inner_text(row))
        pg.screenshot(path=os.path.join(root,"tests","out","update_settings.png"))
        pg.click(row+' button:has-text("Update now")');pg.wait_for_load_state("load");pg.wait_for_timeout(3800)
        check("6. after updating, no bar",bar()==0)
        settings()
        check("6. Settings shows the new version, up to date",pg.inner_text(row+" b")=="Nova version 998" and "up to date" in pg.inner_text(row+" span"),pg.inner_text(row))
        publish(999,page_too=False)
        pg.click(row+' button:has-text("Check for updates")');pg.wait_for_selector(".updbar",timeout=10000)
        check("7. Check for updates finds the next version",pg.inner_text(".updbar span")=="Nova version 999 is ready (you have 998).",pg.inner_text(".updbar span"))
        b.close()
finally:
    srv.terminate();shutil.rmtree(site,ignore_errors=True)
print("ERRORS:",errs)
