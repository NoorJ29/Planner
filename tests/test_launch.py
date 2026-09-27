from playwright.sync_api import sync_playwright
errs=[]
def check(label,ok,got=""):
    print(label,"->","OK" if ok else "FAIL",got if not ok else "")
    if not ok: errs.append(label+" "+str(got)[:200])
def page(b,url="http://localhost:8765/",motion="no-preference",standalone=False):
    ctx=b.new_context(viewport={"width":390,"height":844},service_workers="block",reduced_motion=motion);pg=ctx.new_page();pg.on("pageerror",lambda e:errs.append(str(e)))
    for pat in ["**/www.gstatic.com/**","**/fonts.googleapis.com/**","**/cdn.jsdelivr.net/**"]: pg.route(pat,lambda r:r.abort())
    pg.route("**/config.js",lambda r:r.fulfill(body="window.PLANNER_FIREBASE_CONFIG={};",content_type="text/javascript"))
    if standalone: pg.add_init_script("""const mm=window.matchMedia.bind(window);window.matchMedia=q=>q.includes('display-mode: standalone')?{matches:true,media:q,addEventListener(){},removeEventListener(){}}:mm(q);""")
    pg.goto(url);return pg
gone=lambda pg:pg.locator("#launch").count()==0
with sync_playwright() as p:
    b=p.chromium.launch()
    pg=page(b); pg.wait_for_timeout(300)
    check("1. no launch screen in a normal browser tab",not pg.is_visible("#launch") and pg.is_visible("#nav"))
    pg.context.close()
    pg=page(b,standalone=True); pg.wait_for_timeout(300)
    check("2. installed app: launch screen shows",pg.is_visible("#launch") and pg.locator("#launch .lsky i").count()>20)
    pg.wait_for_timeout(1500)
    check("2. logo, name and tagline appear",pg.evaluate("getComputedStyle(document.querySelector('.lword')).opacity")=="1" and pg.inner_text(".ltag")=="Plan your day. Shine brighter.")
    check("2. still showing before the minimum time",not gone(pg))
    pg.wait_for_timeout(1600)
    check("3. then it leaves and the app is usable",gone(pg) and pg.is_visible("#nav") and "launching" not in (pg.get_attribute("html","class") or ""))
    pg.click('#nav button[data-tab="plan"]'); check("3. app responds",pg.inner_text("#bigDate")!="")
    pg.context.close()
    pg=page(b,"http://localhost:8765/?launch=1"); pg.wait_for_timeout(400); pg.click("#launch"); pg.wait_for_timeout(800)
    check("4. ?launch=1 previews it, and a tap skips it",gone(pg))
    pg.context.close()
    pg=page(b,"http://localhost:8765/?launch=1",motion="reduce"); pg.wait_for_timeout(1300)
    check("5. reduce motion: short and still",gone(pg))
    pg.context.close(); b.close()
print("ERRORS:",errs)
