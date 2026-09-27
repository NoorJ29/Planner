import json,datetime
from playwright.sync_api import sync_playwright
MOCK=open("tests/mockfb2.js").read(); GIS=open("tests/mockgis.js").read()
CFG='window.PLANNER_FIREBASE_CONFIG={apiKey:"test",authDomain:"x",projectId:"x",appId:"x"};window.PLANNER_GOOGLE_CLIENT_ID="123.apps.googleusercontent.com";'
t=datetime.date.today(); now=datetime.datetime.now()
def iso(d,h,m): return datetime.datetime(d.year,d.month,d.day,h,m).astimezone().isoformat()
EVENTS={"items":[{"id":"e1","summary":"Doctor appointment","start":{"dateTime":iso(t,16,0)},"end":{"dateTime":iso(t,17,0)},"htmlLink":"https://calendar.google.com/e1","location":"Clinic"},
 {"id":"e2","summary":"Bank holiday","start":{"date":t.isoformat()},"end":{"date":(t+datetime.timedelta(days=1)).isoformat()},"htmlLink":"https://calendar.google.com/e2"},
 {"id":"e3","summary":"Team lunch","start":{"dateTime":iso(t+datetime.timedelta(days=1),12,30)},"end":{"dateTime":iso(t+datetime.timedelta(days=1),13,30)},"htmlLink":"https://calendar.google.com/e3"}]}
posted=[]
def api(route):
    r=route.request
    if r.method=="POST": posted.append(json.loads(r.post_data)); return route.fulfill(json={"id":"new1","htmlLink":"https://calendar.google.com/new1"})
    if "calendarList" in r.url: return route.fulfill(json={"items":[{"id":"me@x.com","primary":True,"summary":"Me","backgroundColor":"#4285F4"},{"id":"family@group","summary":"Family","backgroundColor":"#0B8043"}]})
    if r.headers.get("authorization")!="Bearer tok123": return route.fulfill(status=401,json={})
    return route.fulfill(json=EVENTS if "primary" in r.url else {"items":[]})
errs=[]
def dev(ctx,name,w=390,h=844):
    pg=ctx.new_page(); pg.set_viewport_size({"width":w,"height":h})
    pg.on("pageerror",lambda e:errs.append(name+": "+str(e)))
    return pg
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(service_workers="block",device_scale_factor=2)
    ctx.route("**/www.gstatic.com/**",lambda r:r.fulfill(body=MOCK if "app-compat" in r.request.url else "",content_type="application/javascript"))
    ctx.route("**/accounts.google.com/gsi/client",lambda r:r.fulfill(body=GIS,content_type="application/javascript"))
    ctx.route("**/www.googleapis.com/calendar/**",api)
    ctx.route("**/config.js",lambda r:r.fulfill(body=CFG,content_type="application/javascript"))
    ctx.route("**/fonts.googleapis.com/**",lambda r:r.abort()); ctx.route("**/www.google.com/**",lambda r:r.abort())
    mum=dev(ctx,"mum"); mum.goto("http://localhost:8765/"); mum.wait_for_timeout(600)
    mum.fill('input[type="email"]',"mum@family.com"); mum.fill('input[type="password"]',"secret123"); mum.click('button:has-text("Create account")'); mum.wait_for_timeout(700)
    mum.click('#nav button[data-tab="more"]'); mum.click('.mi:has-text("Shared lists")'); mum.wait_for_timeout(300)
    mum.click('button:has-text("+ New shared list")'); mum.fill('.sheet .inp.title',"Family groceries"); mum.click('.sheet button:has-text("Create list")'); mum.wait_for_timeout(900)
    code=mum.inner_text(".codebox"); print("1. invite code:",code)
    mum.screenshot(path="tests/out/s_invite.png"); mum.keyboard.press("Escape"); mum.wait_for_timeout(200)
    for it in ["2 kg rice","Milk","Bananas"]: mum.fill("#qaInput",it); mum.press("#qaInput","Enter"); mum.wait_for_timeout(150)
    print("2. mum's items:",mum.locator(".ttitle").all_inner_texts())
    dad=dev(ctx,"dad"); dad.goto("http://localhost:8765/?join="+code.replace("-","")); dad.wait_for_timeout(700)
    dad.fill('input[type="email"]',"dad@family.com"); dad.fill('input[type="password"]',"secret123"); dad.click('button:has-text("Create account")'); dad.wait_for_timeout(900)
    print("3. join sheet prefilled:",dad.input_value(".codein") if dad.locator(".codein").count() else "none")
    dad.click('.sheet button:has-text("Join list")'); dad.wait_for_timeout(900)
    print("4. dad sees:",dad.locator(".ttitle").all_inner_texts(),"| toast:",dad.inner_text(".toast span"))
    dad.click('button[aria-label="Tick Milk"]'); dad.fill("#qaInput","Coffee"); dad.press("#qaInput","Enter"); mum.wait_for_timeout(700)
    print("5. mum sees:",[x.replace("\n"," | ") for x in mum.locator(".task").all_inner_texts()])
    print("6. members:",mum.inner_text(".avs").replace("\n"," "))
    mum.screenshot(path="tests/out/s_shared.png")
    dad.click('button:has-text("Leave list")'); dad.click('.sheet button:has-text("Leave")'); mum.wait_for_timeout(600)
    print("7. after dad leaves, mum members:",mum.inner_text(".avs").replace("\n"," "),"| dad lists:",dad.locator(".ncard").count())
    # bad code
    dad.click('button:has-text("Join with a code")'); dad.fill(".codein","ZZZZ-9999"); dad.click('.sheet button:has-text("Join list")'); dad.wait_for_timeout(400); print("8. bad code:",dad.locator(".sheet .small").last.inner_text()); dad.keyboard.press("Escape")
    # forgot PIN with account password
    dad.click('#nav button[data-tab="more"]'); dad.click('.mi:has-text("Settings")'); dad.wait_for_timeout(400)
    dad.click('.setrow:has-text("App lock") button:has-text("Set PIN")'); ins=dad.locator(".sheet .pinin"); ins.nth(0).fill("1357"); ins.nth(1).fill("1357"); dad.click('.sheet button:has-text("Save PIN")'); dad.wait_for_timeout(1200)
    dad.click('.setrow:has-text("Lock now") button'); dad.wait_for_timeout(300); dad.click('#lockScreen .linkbtn'); dad.fill('.scrim.overlock input[type="password"]',"wrong"); dad.click('.scrim.overlock button:has-text("Remove app lock")'); dad.wait_for_timeout(300)
    print("9. wrong password:",dad.locator(".scrim.overlock .small").last.inner_text())
    dad.fill('.scrim.overlock input[type="password"]',"secret123"); dad.click('.scrim.overlock button:has-text("Remove app lock")'); dad.wait_for_timeout(500)
    print("10. unlocked via password:",not dad.is_visible("#lockScreen"),"| lock removed:",dad.evaluate("localStorage.getItem('planner.lock')") is None)
    # Google Calendar on mum
    mum.click('#nav button[data-tab="more"]'); mum.click('.mi:has-text("Settings")'); mum.wait_for_timeout(400)
    mum.click('.setrow:has-text("Google Calendar") button:has-text("Connect")'); mum.wait_for_timeout(1200)
    print("11. connect toast:",mum.inner_text(".toast span"))
    mum.click('.setrow:has-text("Calendars to show") button'); mum.wait_for_timeout(500); print("12. calendars:",mum.locator('.setrow:has-text("Calendars to show") .chip').all_inner_texts())
    mum.click('#nav button[data-tab="plan"]'); mum.wait_for_timeout(900)
    print("13. day view calendar:",[x.replace("\n"," | ") for x in mum.locator(".evrow").all_inner_texts()])
    mum.click('.tabs button:has-text("Schedule")'); mum.wait_for_timeout(300); print("14. schedule event block:",mum.locator(".blk.ev").all_inner_texts(),"| all-day chip:",mum.locator(".evchip").all_inner_texts())
    mum.screenshot(path="tests/out/s_gcal.png",full_page=True)
    mum.click('#nav button[data-tab="home"]'); mum.wait_for_timeout(400); print("15. home next up:",[x.replace("\n"," ") for x in mum.locator(".nrow").all_inner_texts()])
    mum.click('#nav button[data-tab="plan"]'); mum.click('.tabs button:has-text("Day")'); mum.fill("#qaInput","Pick up parcel tomorrow 5pm"); mum.press("#qaInput","Enter"); mum.wait_for_timeout(200)
    mum.click('.toast-act'); mum.wait_for_timeout(300); print("16. editor gcal button:",mum.inner_text('.sheet .linkbtn >> nth=0'))
    mum.click('.sheet .linkbtn >> nth=0'); mum.wait_for_timeout(800)
    print("17. posted to Google:",posted[-1]["summary"],posted[-1]["start"],"| toast:",mum.inner_text(".toast span"))
    # expired token -> refresh chip
    mum.evaluate("sessionStorage.removeItem('planner.gtok')"); mum.reload(); mum.wait_for_timeout(800)
    print("18. refresh chip after token expiry:",mum.locator(".gcchip").all_inner_texts(),"| cached events still shown on home:",mum.locator(".nrow").count())
    b.close()
print("ERRORS:",errs)
