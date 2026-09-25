from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={"width":390,"height":844},device_scale_factor=2,service_workers="block")
    ctx.route("**/www.google.com/**",lambda r:r.abort()); ctx.route("**/www.gstatic.com/**",lambda r:r.abort()); ctx.route("**/config.js",lambda r:r.fulfill(body="window.PLANNER_FIREBASE_CONFIG={};",content_type="text/javascript")); ctx.route("**/fonts.googleapis.com/**",lambda r:r.abort())
    ctx.route("https://*/**",lambda r:r.fulfill(body="<title>site</title>ok",content_type="text/html") if "localhost" not in r.request.url else r.continue_())
    pg=ctx.new_page(); pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("http://localhost:8765/"); pg.wait_for_timeout(500)
    print("nav:",pg.locator("#nav button span").all_inner_texts())
    pg.click('#nav button[data-tab="more"]'); pg.wait_for_timeout(200); pg.click('.mi:has-text("Links")'); pg.wait_for_timeout(200)
    print("empty:",pg.locator(".empty p").inner_text()[:50])
    pg.screenshot(path="tests/out/l_empty.png")
    for v in ["github.com","https://www.youtube.com/","wikipedia.org  and also bbc.co.uk/news"]:
        pg.fill("#qaInput",v); pg.press("#qaInput","Enter"); pg.wait_for_timeout(150)
    print("after quick add:",pg.locator(".lt .ln").all_inner_texts())
    pg.fill("#qaInput","not a link"); pg.press("#qaInput","Enter"); pg.wait_for_timeout(150); print("bad input toast:",pg.inner_text(".toast span"),"| input kept:",pg.input_value("#qaInput"))
    pg.fill("#qaInput","")
    # add via sheet with new category
    pg.click('.ltools button:has-text("+ Add")'); pg.fill('.sheet input[aria-label="Web address"]',"docs.google.com/document/u/0"); pg.wait_for_timeout(400)
    print("auto name:",pg.input_value('.sheet input[aria-label="Name"]'))
    pg.click('.sheet .chip:has-text("+ New")'); pg.fill('.sheet input[aria-label="New category"]',"Study"); pg.press('.sheet input[aria-label="New category"]',"Enter"); pg.wait_for_timeout(200)
    pg.click('.sheet button:has-text("Save link")'); pg.wait_for_timeout(200)
    # bulk into Work
    pg.click('.ltools button:has-text("+ Add")'); pg.click('.sheet button:has-text("Paste several")')
    pg.fill('.sheet textarea',"My tools:\nhttps://mail.google.com\nnotion.so, https://slack.com/intl/en-gb and figma.com")
    pg.click('.sheet .chip:has-text("Work")'); pg.click('.sheet button:has-text("Add links")'); pg.wait_for_timeout(300)
    print("bulk toast:",pg.inner_text(".toast span"))
    print("sections:",[x.strip() for x in pg.locator(".lhbtn b").all_inner_texts()])
    pg.screenshot(path="tests/out/l_full.png",full_page=True)
    # duplicate warning
    pg.click('.ltools button:has-text("+ Add")'); pg.fill('.sheet input[aria-label="Web address"]',"github.com"); pg.wait_for_timeout(400); print("dup warn:",pg.locator(".sheet .small").first.inner_text()); pg.keyboard.press("Escape")
    # click tile opens new tab + visit count
    with ctx.expect_page() as np: pg.click('.lt:has-text("Github")')
    newp=np.value; newp.wait_for_load_state(); print("opened tab:",newp.url); newp.close()
    # open all Work (4) -> all open
    before=len(ctx.pages)
    pg.click('.lsec:has(.lhbtn b:text("Work")) .openall'); pg.wait_for_timeout(800)
    print("open all opened tabs:",len(ctx.pages)-before,"| toast:",pg.inner_text(".toast span"))
    for x in ctx.pages[1:]: x.close()
    # simulate popup blocker
    pg.evaluate("(()=>{let n=0;const o=window.open.bind(window);window.open=(...a)=>{n++;return n===1?o(...a):null;};})()")
    pg.click('.lsec:has(.lhbtn b:text("Work")) .openall'); pg.wait_for_timeout(500)
    print("blocked sheet:",pg.locator(".sheet h3").inner_text(),"| rows:",pg.locator(".oborow").count())
    pg.screenshot(path="tests/out/l_blocked.png")
    pg.locator(".oborow").first.click(); pg.wait_for_timeout(300); print("row marked:",pg.locator(".oborow.done").count())
    for x in ctx.pages[1:]: x.close()
    pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
    # search filter (DOM, keeps focus)
    pg.fill("#linkQ","goo"); pg.wait_for_timeout(200)
    print("search 'goo' visible:",[t for t in pg.locator(".lt:visible .ln").all_inner_texts()],"| focus kept:",pg.evaluate("document.activeElement.id"))
    pg.fill("#linkQ","zzz"); pg.wait_for_timeout(100); print("no match shown:",pg.locator(".lnone").is_visible()); pg.fill("#linkQ","")
    # category chip filter
    pg.click('.lchips .chip:has-text("Study")'); pg.wait_for_timeout(200); print("filtered:",pg.locator(".lhbtn b").all_inner_texts()); pg.click('.lchips .chip:has-text("All")')
    # collapse
    pg.click('.lhbtn:has-text("General")'); pg.wait_for_timeout(200); print("collapsed tiles visible in General:",pg.locator('.lsec:has(.lhbtn b:text("General")) .lt:visible').count())
    pg.click('.lhbtn:has-text("General")'); pg.wait_for_timeout(200)
    # edit mode -> tap tile opens editor, move to Fun
    pg.click('.ltools .chip:has-text("Edit")'); pg.wait_for_timeout(200)
    pg.click('.lt:has-text("Youtube")'); pg.wait_for_timeout(200); print("edit sheet:",pg.locator(".sheet h3").inner_text())
    pg.fill('.sheet input[aria-label="Name"]',"YouTube"); pg.click('.sheet .chip:has-text("Fun")'); pg.click('.sheet .actions button:has-text("Save")'); pg.wait_for_timeout(200)
    pg.click('.lt:has-text("Wikipedia")'); pg.click('.sheet button:has-text("Delete")'); pg.wait_for_timeout(200); print("deleted, toast:",pg.inner_text(".toast span"))
    pg.click(".toast-act"); pg.wait_for_timeout(200); print("after undo has Wikipedia:",pg.locator('.lt:has-text("Wikipedia")').count())
    pg.click('.ltools .chip:has-text("Done")'); pg.wait_for_timeout(200)
    # categories manager: reorder
    pg.click('.lsort .linkbtn'); pg.wait_for_timeout(200); pg.locator('.sheet button[aria-label="Move up"]').nth(2).click(); pg.click('.sheet .actions button:has-text("Save")'); pg.wait_for_timeout(200)
    print("order after moving:",pg.locator(".lhbtn b").all_inner_texts())
    # sort most used
    pg.click('.lsort .seg button:has-text("Most used")'); pg.wait_for_timeout(200)
    # global search
    pg.click("#searchBtn"); pg.fill('.sheet input[type="search"]',"slack"); pg.wait_for_timeout(300); print("global search:",pg.locator(".sres .sgroup").all_inner_texts()); pg.keyboard.press("Escape")
    pg.screenshot(path="tests/out/l_mob.png",full_page=True)
    # share target
    p2=ctx.new_page(); p2.on("pageerror",lambda e:errs.append(str(e)))
    p2.goto("http://localhost:8765/?title=Great%20article&text=https%3A%2F%2Fexample.com%2Fpost%2F42"); p2.wait_for_timeout(600)
    print("shared ->",p2.inner_text("#bigDate"),"| toast:",p2.inner_text(".toast span"),"| tile:",p2.locator('.lt:has-text("Great article")').count())
    p2.click(".toast-act"); p2.wait_for_timeout(300); print("as note instead ->",p2.inner_text("#bigDate"))
    b.close()
print("ERRORS:",errs)
