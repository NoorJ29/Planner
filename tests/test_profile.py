import json
from playwright.sync_api import sync_playwright
MOCK=open("tests/mockfb2.js").read()
CFG='window.PLANNER_FIREBASE_CONFIG={apiKey:"test",authDomain:"x",projectId:"x",appId:"x"};'
# A list someone else owns, which "me" belongs to.
SEED={"shared/LX":{"name":"Neighbours","kind":"todo","owner":"u_other","members":["u_other","u_me"],"memberInfo":{"u_other":{"name":"Other","email":"other@x.com"},"u_me":{"name":"Me","email":"me@example.com"}},"createdAt":1},
      "shared/LX/items/i1":{"name":"Mow lawn","done":False,"by":"Other","byId":"u_other","createdAt":1}}
errs=[]
def check(label,ok,got=""):
    print(label,"->","OK" if ok else "FAIL",got)
    if not ok: errs.append(label+" "+str(got))
def fs(pg): return pg.evaluate("JSON.parse(localStorage.getItem('mockfs')||'{}')")
def toast(pg): pg.wait_for_selector(".toast"); return pg.inner_text(".toast span")
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(service_workers="block",viewport={"width":390,"height":844})
    ctx.add_init_script("if(!localStorage.getItem('mockfs'))localStorage.setItem('mockfs',"+json.dumps(json.dumps(SEED))+")")
    ctx.route("**/www.gstatic.com/**",lambda r:r.fulfill(body=MOCK if "app-compat" in r.request.url else "",content_type="application/javascript"))
    ctx.route("**/config.js",lambda r:r.fulfill(body=CFG,content_type="application/javascript"))
    ctx.route("**/fonts.googleapis.com/**",lambda r:r.abort())
    pg=ctx.new_page(); pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("http://localhost:8765/"); pg.wait_for_selector(".sheet h3")
    check("1. signed out: label",pg.inner_text("#sync span")=="Sign in to sync",pg.inner_text("#sync span"))
    check("1. signed out: no avatar",not pg.locator("#sync .pav").is_visible())
    pg.fill('input[type="email"]',"me@example.com"); pg.fill('input[type="password"]',"short"); pg.click('button:has-text("Create account")')
    check("2. short password refused",pg.inner_text(".sheet [role=alert]")=="Use a password with at least 8 characters.",pg.inner_text(".sheet [role=alert]"))
    pg.fill('input[type="password"]',"secret123"); pg.click('button:has-text("Create account")'); pg.wait_for_timeout(800)
    check("3. avatar shows initial",pg.locator("#sync .pav").is_visible() and pg.inner_text("#sync .pav")=="M",pg.inner_text("#sync .pav"))
    check("3. avatar label",pg.get_attribute("#sync","aria-label")=="Your profile: Synced",pg.get_attribute("#sync","aria-label"))
    # some data: a finished task and a shared list I own
    pg.click('#nav button[data-tab="plan"]'); pg.fill("#qaInput","Test task"); pg.press("#qaInput","Enter"); pg.wait_for_timeout(300)
    pg.click('button[aria-label="Mark done: Test task"]'); pg.wait_for_timeout(300)
    pg.click('#nav button[data-tab="more"]'); pg.click('.mi:has-text("Shared lists")'); pg.click('button:has-text("+ New shared list")')
    pg.fill('.sheet input[aria-label="List name"]',"Family shop"); pg.click('.sheet button:has-text("Create list")'); pg.wait_for_timeout(600); pg.keyboard.press("Escape")
    own=[k for k,v in fs(pg).items() if k.startswith("shared/") and k.count("/")==1 and v.get("owner")=="u_me"]
    check("4. own list created",len(own)==1,own)
    # profile page
    pg.click("#sync"); pg.wait_for_timeout(300)
    check("5. avatar opens profile",pg.inner_text("#bigDate")=="Profile",pg.inner_text("#bigDate"))
    check("5. name and email",pg.inner_text(".pname")=="Me" and "me@example.com" in pg.inner_text(".prof"),pg.inner_text(".prof"))
    check("5. sync status",pg.inner_text(".pstat")=="Synced across your devices",pg.inner_text(".pstat"))
    stats=dict(zip(pg.locator(".pstats .stat span").all_inner_texts(),pg.locator(".pstats .stat b").all_inner_texts()))
    check("5. stats",stats.get("Tasks done")=="1" and "Member since" in pg.inner_text(".sec-h:has-text('Your stats')"),stats)
    check("5. warns about owned list",'Family shop' in pg.inner_text(".dz"),pg.inner_text(".dz"))
    # rename
    pg.fill('input[aria-label="Your name"]',"Noor"); pg.click('.sec:has-text("Your name") button:has-text("Save")')
    check("6. rename toast",toast(pg)=="Name saved")
    pg.wait_for_timeout(300)
    check("6. avatar updated",pg.inner_text("#sync .pav")=="N" and pg.inner_text(".pname")=="Noor",pg.inner_text("#sync .pav"))
    d=fs(pg); check("6. name on shared lists",d["shared/LX"]["memberInfo"]["u_me"]["name"]=="Noor" and d[own[0]]["memberInfo"]["u_me"]["name"]=="Noor")
    pg.set_viewport_size({"width":1400,"height":900}); pg.wait_for_timeout(300)
    check("6. laptop sidebar",pg.inner_text(".side-foot .sync span")=="Noor · Synced",pg.inner_text(".side-foot .sync span"))
    pg.screenshot(path="tests/out/profile_desk.png"); pg.set_viewport_size({"width":390,"height":844}); pg.wait_for_timeout(300)
    pg.screenshot(path="tests/out/profile_mob.png",full_page=True)
    # password
    cur,new,btn,perr='input[aria-label="Current password"]','input[aria-label="New password"]','button:has-text("Change password")','.sec:has-text("Password") [role=alert]'
    pg.fill(cur,"wrong"); pg.fill(new,"newpass123"); pg.click(btn); pg.wait_for_timeout(200)
    check("7. wrong current password",pg.inner_text(perr)=="Your current password isn't right.",pg.inner_text(perr))
    pg.fill(cur,"secret123"); pg.fill(new,"short"); pg.click(btn)
    check("7. short new password",pg.inner_text(perr)=="Use at least 8 characters for your new password.",pg.inner_text(perr))
    pg.fill(new,"newpass123"); pg.click(btn); check("7. password changed",toast(pg)=="Password changed")
    # sign out, then sign in with old and new password
    pg.click('.setrow:has-text("Sign out") button'); pg.wait_for_timeout(400)
    check("8. signed out",pg.inner_text("#sync span")=="Sign in to sync" and "not signed in" in pg.inner_text("#main"),pg.inner_text("#sync span"))
    pg.click("#sync"); pg.fill('input[type="email"]',"me@example.com"); pg.fill('input[type="password"]',"secret123"); pg.click('.sheet button:has-text("Sign in")'); pg.wait_for_timeout(300)
    check("8. old password rejected","don't match" in pg.inner_text(".sheet [role=alert]"),pg.inner_text(".sheet [role=alert]"))
    pg.fill('input[type="password"]',"newpass123"); pg.click('.sheet button:has-text("Sign in")'); pg.wait_for_timeout(800)
    check("8. new password works",pg.inner_text("#sync .pav")=="N",pg.inner_text("#sync .pav"))
    # delete account
    pg.click("#sync"); pg.wait_for_timeout(300); pg.click('button:has-text("Delete my account")')
    go='.sheet button:has-text("Delete forever")'
    check("9. delete disabled until DELETE typed",pg.is_disabled(go))
    pg.fill('.sheet input[aria-label="Your password"]',"wrong"); pg.fill('.sheet input[aria-label="Type DELETE to confirm"]',"delete")
    check("9. enabled after typing DELETE",not pg.is_disabled(go))
    pg.click(go); pg.wait_for_timeout(300)
    check("9. wrong password stops it",pg.inner_text(".sheet [role=alert]")=="Your current password isn't right." and any(k.startswith("users/u_me/") for k in fs(pg)),pg.inner_text(".sheet [role=alert]"))
    pg.fill('.sheet input[aria-label="Your password"]',"newpass123")
    with pg.expect_navigation(): pg.click(go)
    check("10. deleted message",toast(pg)=="Your account and its data have been deleted.")
    d=fs(pg)
    check("10. all my data gone",not any(k=="users/u_me" or k.startswith("users/u_me/") for k in d),[k for k in d if "u_me" in k])
    check("10. my own list deleted for everyone",own[0] not in d)
    check("10. removed from others' list",d["shared/LX"]["members"]==["u_other"] and "u_me" not in d["shared/LX"]["memberInfo"] and "shared/LX/items/i1" in d,d["shared/LX"])
    check("10. login deleted","me@example.com" in pg.evaluate("localStorage.getItem('mockdeleted')"))
    check("10. signed out after",pg.inner_text("#sync span")=="Sign in to sync")
    b.close()
print("ERRORS:",errs)
