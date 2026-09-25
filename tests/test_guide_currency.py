from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    for w,h,name in [(1440,900,"desk"),(390,844,"mob")]:
        pg=b.new_page(viewport={"width":w,"height":h}); pg.on("pageerror",lambda e:errs.append(str(e)))
        pg.route("**/www.gstatic.com/**",lambda r:r.abort()); pg.route("**/fonts.googleapis.com/**",lambda r:r.abort())
        pg.goto("http://localhost:8765/"); pg.wait_for_timeout(500)
        if name=="desk":
            pg.keyboard.press("?"); pg.wait_for_timeout(300); pg.screenshot(path="tests/out/g_desk.png",full_page=True)
            print("guide title:",pg.inner_text("#bigDate"),"| sidebar hint text gone:", "Ctrl+Enter save" not in pg.inner_text(".side"))
        else:
            pg.click('#nav button[data-tab="more"]'); pg.click('.mi:has-text("Guide")'); pg.wait_for_timeout(300); pg.screenshot(path="tests/out/g_mob.png",full_page=True)
        # currency picker
        pg.click('#nav button[data-tab="money"]') if name=="mob" else pg.keyboard.press("5")
        pg.wait_for_timeout(200); pg.click('button:has-text("Choose currency")'); pg.wait_for_timeout(300)
        n=pg.locator(".sheet .sres button").count(); print(name,"currencies listed:",n)
        if name=="mob": pg.screenshot(path="tests/out/cur1.png")
        for q in ["yen","peso","KES","naira","ZWL"]:
            pg.fill('.sheet input[type="search"]',q); pg.wait_for_timeout(150); print("  search",q,"->",pg.locator(".sheet .sres button b").all_inner_texts()[:3])
        pg.fill('.sheet input[type="search"]',"yen"); pg.wait_for_timeout(150); pg.click('.sheet .sres button:has-text("JPY")'); pg.wait_for_timeout(200)
        pg.click('button:has-text("+ Add expense")'); pg.fill(".sheet .inp.amt","1500"); pg.click('.sheet .actions button:has-text("Add")'); pg.wait_for_timeout(200)
        print("  JPY:",pg.inner_text(".bigamt"))
        pg.click('.linkbtn:has-text("Change")'); pg.wait_for_timeout(200); pg.fill('.sheet input[aria-label="Custom symbol"]',"₿"); pg.click('.sheet button:has-text("Use")'); pg.wait_for_timeout(200)
        print("  custom:",pg.inner_text(".bigamt"),"|",pg.inner_text(".toast span"))
        pg.click('.linkbtn:has-text("Change")'); pg.fill('.sheet input[aria-label="Custom symbol"]',"pts"); pg.click('.sheet button:has-text("Use")'); pg.wait_for_timeout(200); print("  word symbol:",pg.inner_text(".bigamt"))
        if name=="mob": pg.screenshot(path="tests/out/cur2.png")
        pg.close()
    print("ERRORS:",errs); b.close()
