from playwright.sync_api import sync_playwright
from libroutes import serve_libs
MOCK=open("tests/mockfb2.js").read()
CFG='window.PLANNER_FIREBASE_CONFIG={apiKey:"test",authDomain:"x",projectId:"x",appId:"x"};'
errs=[]
def dev(ctx,name,w=390,h=844):
    pg=ctx.new_page(); pg.set_viewport_size({"width":w,"height":h}); serve_libs(pg)
    pg.on("pageerror",lambda e:errs.append(name+": "+str(e)))
    pg.route("**/www.gstatic.com/**",lambda r:r.fulfill(body=MOCK if "app-compat" in r.request.url else "",content_type="application/javascript"))
    pg.route("**/config.js",lambda r:r.fulfill(body=CFG,content_type="application/javascript"))
    pg.route("**/fonts.googleapis.com/**",lambda r:r.abort())
    return pg
def texts(pg): return pg.locator(".ttitle").all_inner_texts()
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(service_workers="block")
    phone=dev(ctx,"phone"); phone.goto("http://localhost:8765/"); phone.wait_for_timeout(500)
    print("1. sign-in sheet shown:",phone.locator(".sheet h3").inner_text())
    phone.click('button:has-text("Use without syncing")'); phone.wait_for_timeout(200); phone.click('#nav button[data-tab="plan"]'); phone.wait_for_timeout(200)
    phone.fill("#qaInput","Made before signing in"); phone.press("#qaInput","Enter"); phone.wait_for_timeout(400)
    phone.locator(".sync").last.click(); phone.fill('input[type="email"]',"me@example.com"); phone.fill('input[type="password"]',"secret123"); phone.click('button:has-text("Create account")'); phone.wait_for_timeout(800)
    print("2. phone after sign-in:",texts(phone),"| label:",phone.locator("#sync span").inner_text())
    laptop=dev(ctx,"laptop",1400,900); laptop.goto("http://localhost:8765/"); laptop.wait_for_timeout(800)
    laptop.fill('input[type="email"]',"me@example.com"); laptop.fill('input[type="password"]',"secret123"); laptop.click('.sheet button:has-text("Sign in")'); laptop.wait_for_timeout(800)
    laptop.evaluate("document.activeElement.blur()"); laptop.keyboard.press("2"); laptop.wait_for_timeout(300)
    print("3. laptop sees:",texts(laptop))
    laptop.fill("#qaInput","Added on laptop"); laptop.press("#qaInput","Enter"); phone.wait_for_timeout(500)
    print("4. phone sees laptop task:",texts(phone))
    phone.click('button[aria-label="Mark done: Added on laptop"]'); laptop.wait_for_timeout(500)
    print("5. laptop sees it done:",laptop.locator(".task.done .ttitle").all_inner_texts())
    laptop.evaluate("document.activeElement.blur()"); laptop.keyboard.press("5"); laptop.wait_for_timeout(200); laptop.click('button:has-text("Choose currency")'); laptop.fill('.sheet input[type="search"]',"euro"); laptop.wait_for_timeout(200); laptop.click('.sheet .sres button:has-text("EUR")'); phone.wait_for_timeout(400)
    phone.click('#nav button[data-tab="money"]'); phone.wait_for_timeout(300)
    print("6. phone currency after laptop set it:",phone.locator(".bigamt").inner_text())
    # note delete must not resurrect
    phone.click('#nav button[data-tab="notes"]'); phone.click('button:has-text("+ New note")'); phone.fill(".note-title","Temp"); phone.fill(".note-body","to delete"); phone.wait_for_timeout(200)
    phone.click('.sheet .chip:has-text("Delete")'); phone.wait_for_timeout(1200)
    print("7. notes after delete:",phone.locator(".ncard").count(),"| toast:",phone.locator(".toast").inner_text())
    phone.click(".toast-act"); phone.wait_for_timeout(400); print("8. after undo:",phone.locator(".ncard b").all_inner_texts())
    # task delete + undo syncing
    phone.click('#nav button[data-tab="plan"]'); phone.wait_for_timeout(200)
    laptop.evaluate("document.activeElement.blur()"); laptop.keyboard.press("2"); laptop.wait_for_timeout(200)
    phone.click('.tbody:has-text("Made before signing in")'); phone.click('.sheet button:has-text("Delete")'); laptop.wait_for_timeout(400)
    print("9. laptop after phone deleted:",texts(laptop))
    phone.click(".toast-act"); laptop.wait_for_timeout(400); print("10. laptop after undo:",texts(laptop))
    # habit sync
    laptop.evaluate("document.activeElement.blur()"); laptop.keyboard.press("3"); laptop.wait_for_timeout(200); laptop.click('.chip:has-text("Read")'); laptop.wait_for_timeout(300)
    phone.click('#nav button[data-tab="habits"]'); phone.wait_for_timeout(300); phone.click(".hbig"); laptop.wait_for_timeout(400)
    print("11. laptop habit ticked from phone:",laptop.locator(".hbig.on").count())
    # sign out
    phone.locator("#sync").click(); phone.click('button:has-text("Sign out")'); phone.wait_for_timeout(400)
    print("12. after sign out, phone label:",phone.locator("#sync span").inner_text())
    b.close()
print("ERRORS:",errs)
