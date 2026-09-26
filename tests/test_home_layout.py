from playwright.sync_api import sync_playwright
errs=[]
def check(label,ok,got=""):
    print(label,"->","OK" if ok else "FAIL",got if not ok else "")
    if not ok: errs.append(label+" "+str(got)[:200])
def page(b,w,h):
    ctx=b.new_context(viewport={"width":w,"height":h},service_workers="block");pg=ctx.new_page();pg.on("pageerror",lambda e:errs.append(str(e)))
    for pat in ["**/www.gstatic.com/**","**/fonts.googleapis.com/**","**/cdn.jsdelivr.net/**"]: pg.route(pat,lambda r:r.abort())
    pg.route("**/config.js",lambda r:r.fulfill(body="window.PLANNER_FIREBASE_CONFIG={};",content_type="text/javascript"))
    pg.goto("http://localhost:8765/");pg.wait_for_timeout(500);return pg
with sync_playwright() as p:
    b=p.chromium.launch()
    pg=page(b,390,844)
    # a task for today, in the Work list, at a time
    pg.click('#nav button[data-tab="plan"]');pg.fill("#qaInput","Dentist today 3pm #work");pg.press("#qaInput","Enter");pg.wait_for_timeout(200)
    pg.click('#nav button[data-tab="home"]');pg.wait_for_timeout(300)
    check("1. phone: customise icon next to search",pg.is_visible("#homeCustom") and pg.locator('#main button:has-text("Customise")').count()==0)
    box=pg.locator("#homeCustom").bounding_box();sb=pg.locator("#searchBtn").bounding_box()
    check("1. same row as search",abs(box["y"]-sb["y"])<2 and box["x"]<sb["x"],(box,sb))
    row=pg.locator('.task:has-text("Dentist")').first
    check("2. phone: task on one line, time shown, list name hidden","compact" in row.get_attribute("class") and row.locator(".meta").count()==0 and row.locator(".ctime").inner_text()!="" and "Work" not in row.inner_text(),row.inner_text())
    check("2. compact row is short",row.bounding_box()["height"]<48,row.bounding_box()["height"])
    pg.screenshot(path="tests/out/home_phone.png")
    pg.click("#homeCustom");pg.wait_for_selector(".sheet h3")
    check("3. icon opens the customise sheet",pg.inner_text(".sheet h3")=="Customise your home screen");pg.keyboard.press("Escape")
    pg.click('#nav button[data-tab="plan"]');pg.wait_for_timeout(200)
    check("4. icon only on Home",not pg.is_visible("#homeCustom"))
    pg.context.close()
    pg=page(b,1400,900);pg.wait_for_timeout(200)
    check("5. laptop: customise icon at the top right",pg.is_visible("#homeCustom") and pg.locator("#homeCustom").bounding_box()["x"]>1200 and not pg.is_visible("#searchBtn") and not pg.is_visible("#sync"))
    pg.hover("#homeCustom");pg.wait_for_timeout(200)
    tip=pg.evaluate("getComputedStyle(document.querySelector('#homeCustom'),'::after').content")
    check("5. hover shows the label",tip=='"Customise home"',tip)
    pg.screenshot(path="tests/out/home_desk.png")
    pg.context.close();b.close()
print("ERRORS:",errs)
