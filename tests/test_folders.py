import json
from playwright.sync_api import sync_playwright
from libroutes import serve_libs
MOCK=open("tests/mockfb2.js").read()
CFG='window.PLANNER_FIREBASE_CONFIG={apiKey:"test",authDomain:"x",projectId:"x",appId:"x"};'
errs=[]
def check(label,ok,got=""):
    print(label,"->","OK" if ok else "FAIL",got)
    if not ok: errs.append(label+" "+str(got))
def device(ctx,w,h):
    pg=ctx.new_page(); pg.set_viewport_size({"width":w,"height":h}); pg.on("pageerror",lambda e:errs.append(str(e))); serve_libs(pg)
    pg.route("**/www.gstatic.com/**",lambda r:r.fulfill(body=MOCK if "app-compat" in r.request.url else "",content_type="application/javascript"))
    pg.route("**/config.js",lambda r:r.fulfill(body=CFG,content_type="application/javascript"))
    pg.route("**/fonts.googleapis.com/**",lambda r:r.abort())
    return pg
def sign_in(pg,create=False):
    pg.wait_for_selector(".sheet h3"); pg.fill('input[type="email"]',"me@example.com"); pg.fill('input[type="password"]',"secret123")
    pg.click('.sheet button:has-text("%s")'%("Create account" if create else "Sign in")); pg.wait_for_timeout(700)
crumbs=lambda pg:pg.locator(".crumbs button").all_inner_texts()
tiles=lambda pg:pg.locator(".ftile:not(.fnew) b").all_inner_texts()
cards=lambda pg:sorted(pg.locator(".nlist .ncard > b").all_inner_texts())
def tile(pg,name): pg.click('.ftile:has(b:text-is("%s"))'%name); pg.wait_for_timeout(200)
def new_folder(pg,name):
    pg.click(".ftile.fnew"); pg.fill('.sheet input[aria-label="Folder name"]',name); pg.click('.sheet .actions button:has-text("Create")'); pg.wait_for_timeout(200)
def new_note(pg,title,body="x"):
    pg.click('button:has-text("+ New note")'); pg.fill(".note-title",title); pg.fill(".note-body",body); pg.wait_for_timeout(700); pg.click('.sheet button:has-text("Done")'); pg.wait_for_timeout(200)
def folder_menu(pg,action):
    pg.click('button[aria-label="Folder options"]'); pg.click('.sheet button:has-text("%s")'%action); pg.wait_for_timeout(150)
def pick(pg,name): pg.click('.sheet .fpick button:has-text("%s")'%name); pg.wait_for_timeout(200)
def toggle(pg): pg.click(".deepsw input"); pg.wait_for_timeout(200)
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(service_workers="block",accept_downloads=True)
    pg=device(ctx,390,844); pg.goto("http://localhost:8765/"); sign_in(pg,create=True)
    pg.click('#nav button[data-tab="notes"]'); pg.wait_for_timeout(200)
    check("1. starts at All notes",crumbs(pg)==["All notes"],crumbs(pg))
    new_folder(pg,"Work"); new_note(pg,"Groceries")
    check("2. folder tile and root note",tiles(pg)==["Work"] and cards(pg)==["Groceries"],(tiles(pg),cards(pg)))
    tile(pg,"Work"); new_note(pg,"Plan A")
    new_folder(pg,"Project X"); tile(pg,"Project X"); new_note(pg,"Spec","the spec text")
    check("3. breadcrumbs",crumbs(pg)==["All notes","Work","Project X"],crumbs(pg))
    pg.click('.crumbs button:has-text("Work")'); pg.wait_for_timeout(200)
    check("4. folder shows only its own notes",cards(pg)==["Plan A"] and pg.inner_text('.ftile:has(b:text-is("Project X")) span')=="1 note",(cards(pg),pg.inner_text('.ftile:has(b:text-is("Project X")) span')))
    toggle(pg)
    check("5. include subfolders",cards(pg)==["Plan A","Spec"] and "Work › Project X" in pg.inner_text('.nlist .ncard:has(b:text-is("Spec"))'),cards(pg))
    toggle(pg); pg.click('.crumbs button:has-text("All notes")'); pg.wait_for_timeout(200)
    check("6. root shows unfiled notes",cards(pg)==["Groceries"],cards(pg))
    check("6. tile counts everything inside",pg.inner_text('.ftile:has(b:text-is("Work")) span')=="2 notes",pg.inner_text('.ftile:has(b:text-is("Work")) span'))
    toggle(pg); check("6. show notes from all folders",cards(pg)==["Groceries","Plan A","Spec"],cards(pg)); toggle(pg)
    # move a note
    pg.click('.nlist .ncard:has(b:text-is("Groceries"))'); pg.wait_for_timeout(200)
    check("7. note shows its folder",pg.inner_text(".sheet .fchip")=="📁 No folder",pg.inner_text(".sheet .fchip"))
    pg.click(".sheet .fchip"); pick(pg,"Project X")
    check("7. chip updated",pg.inner_text(".sheet .fchip")=="📁 Work › Project X",pg.inner_text(".sheet .fchip"))
    pg.click('.sheet button:has-text("Done")'); pg.wait_for_timeout(200)
    check("7. note moved out of root",cards(pg)==[],cards(pg))
    # rename and recolour
    tile(pg,"Work"); folder_menu(pg,"Rename")
    pg.fill('.sheet input[aria-label="Folder name"]',"Job"); pg.click(".sheet .sw >> nth=2"); pg.click('.sheet .actions button:has-text("Save")'); pg.wait_for_timeout(200)
    check("8. renamed",crumbs(pg)==["All notes","Job"],crumbs(pg))
    # move folder: can't go inside itself; move Project X to top level
    tile(pg,"Project X"); folder_menu(pg,"Move")
    check("9. can't move into itself",pg.is_disabled('.sheet .fpick button:has-text("Project X")'))
    pick(pg,"Top level")
    check("9. folder moved to top",crumbs(pg)==["All notes","Project X"],crumbs(pg))
    # delete, keeping notes
    new_folder(pg,"Temp"); tile(pg,"Temp"); new_note(pg,"T1")
    folder_menu(pg,"Delete"); pg.click('.sheet button:has-text("Keep the notes")'); pg.wait_for_timeout(300)
    check("10. keep: back in parent with note",crumbs(pg)==["All notes","Project X"] and "T1" in cards(pg) and "Temp" not in tiles(pg),(crumbs(pg),cards(pg),tiles(pg)))
    pg.click(".toast-act"); pg.wait_for_timeout(300)
    check("10. undo restores the folder",tiles(pg)==["Temp"] and "T1" not in cards(pg),(tiles(pg),cards(pg)))
    # delete everything
    tile(pg,"Temp"); folder_menu(pg,"Delete"); pg.click('.sheet button:has-text("Delete everything")'); pg.wait_for_timeout(300)
    n=pg.evaluate("Object.keys(JSON.parse(localStorage.getItem('mockfs'))).filter(k=>k.startsWith('users/u_me/notes/')).length")
    check("11. everything deleted",tiles(pg)==[] and n==3,(tiles(pg),n))
    pg.click(".toast-act"); pg.wait_for_timeout(300); tile(pg,"Temp")
    check("11. undo brings it all back",cards(pg)==["T1"],cards(pg))
    # search shows the folder
    pg.click("#searchBtn"); pg.fill('.sheet input[type="search"]',"spec"); pg.wait_for_timeout(300)
    check("12. search shows folder",("Project X" in pg.inner_text(".sheet .sres")),pg.inner_text(".sheet .sres"))
    pg.keyboard.press("Escape")
    # laptop tree
    pg.set_viewport_size({"width":1400,"height":900}); pg.wait_for_timeout(300)
    tree=pg.locator(".ftree button.fname").all_inner_texts()
    check("13. laptop folder tree",tree[:1]==["All notes"] and "Job" in tree and "Project X" in tree,tree)
    pg.click('.ftree button.fname:has-text("Job")'); pg.wait_for_timeout(200)
    check("13. tree opens folder",crumbs(pg)==["All notes","Job"] and cards(pg)==["Plan A"],(crumbs(pg),cards(pg)))
    pg.screenshot(path="tests/out/folders_desk.png")
    # backup includes folders
    pg.evaluate("document.activeElement&&document.activeElement.blur()"); pg.click('#sideNav button[data-tab="more"]'); pg.click('.mi:has-text("Backup")')
    with pg.expect_download() as dl: pg.click('button:has-text("Download backup")')
    data=json.load(open(dl.value.path(),encoding="utf8"))
    check("14. backup has folders",sorted(f["name"] for f in data.get("folders",[]))==["Job","Project X","Temp"],data.get("folders"))
    # a second device sees the folders
    lap=device(ctx,1400,900); lap.goto("http://localhost:8765/"); sign_in(lap); lap.evaluate("document.activeElement&&document.activeElement.blur()")
    lap.click('#sideNav button[data-tab="notes"]'); lap.wait_for_timeout(300); lap.click('.crumbs button:has-text("All notes")'); lap.wait_for_timeout(200)
    check("15. folders synced",sorted(tiles(lap))==["Job","Project X"],tiles(lap))
    pg.set_viewport_size({"width":390,"height":844}); pg.click('#nav button[data-tab="notes"]'); pg.wait_for_timeout(200); pg.screenshot(path="tests/out/folders_phone.png")
    b.close()
print("ERRORS:",errs)
