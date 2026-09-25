import json,datetime,re
from playwright.sync_api import sync_playwright
LIB={"jspdf":open("tests/libs/node_modules/jspdf/dist/jspdf.umd.min.js").read(),"jszip":open("tests/libs/node_modules/jszip/dist/jszip.min.js").read()}
errs=[]
def newpage(b,url="http://localhost:8765/",scheme="light"):
    ctx=b.new_context(viewport={"width":390,"height":844},device_scale_factor=2,color_scheme=scheme,accept_downloads=True,service_workers="block")
    pg=ctx.new_page()
    pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.on("console",lambda m:m.type=="error" and "gstatic" not in m.text and "fonts" not in m.text and "Failed to load resource" not in m.text and errs.append("console:"+m.text))
    pg.route("**/cdnjs.cloudflare.com/**",lambda r:r.fulfill(body=LIB["jspdf" if "jspdf" in r.request.url else "jszip"],content_type="application/javascript"))
    pg.route("**/www.gstatic.com/**",lambda r:r.abort()); pg.route("**/config.js",lambda r:r.fulfill(body="window.PLANNER_FIREBASE_CONFIG={};",content_type="text/javascript"))
    pg.route("**/fonts.googleapis.com/**",lambda r:r.abort())
    pg.goto(url); pg.wait_for_timeout(700)
    return pg
with sync_playwright() as p:
    b=p.chromium.launch()
    pg=newpage(b)
    pg.click('#nav button[data-tab="plan"]'); pg.wait_for_timeout(200)
    # quick add tasks
    for t in ["Buy groceries","Call mum"]:
        pg.fill("#qaInput",t); pg.press("#qaInput","Enter"); pg.wait_for_timeout(150)
    # detailed task: repeat daily, time, checklist, reminder
    pg.click("#qaMore"); pg.wait_for_timeout(200)
    pg.fill(".sheet .inp.title","Morning workout")
    pg.fill('.sheet input[type="time"]',"07:30")
    pg.click('.sheet .chip:has-text("Daily")')
    pg.select_option('.sheet select[aria-label="Reminder"]',"15")
    pg.fill('.sheet input[aria-label="New step"]',"Stretch"); pg.press('.sheet input[aria-label="New step"]',"Enter")
    pg.fill('.sheet input[aria-label="New step"]',"Run 5k"); pg.press('.sheet input[aria-label="New step"]',"Enter")
    pg.click('.sheet .chip:has-text("Urgent")')
    pg.click('.sheet button:has-text("Add task")'); pg.wait_for_timeout(300)
    # timed task for schedule
    pg.click("#qaMore"); pg.fill(".sheet .inp.title","Team meeting"); pg.fill('.sheet input[type="time"]',"10:00"); pg.select_option('.sheet select[aria-label="How long"]',"90"); pg.click('.sheet button:has-text("Add task")'); pg.wait_for_timeout(300)
    pg.click("#qaMore"); pg.fill(".sheet .inp.title","Lunch with Sam"); pg.fill('.sheet input[type="time"]',"10:30"); pg.click('.sheet button:has-text("Add task")'); pg.wait_for_timeout(300)
    pg.screenshot(path="tests/out/s_day.png",full_page=True)
    # complete repeating task
    pg.click('button[aria-label="Mark done: Morning workout"]'); pg.wait_for_timeout(400)
    print("toast:",pg.inner_text(".toast"))
    # schedule
    pg.click('.tabs button:has-text("Schedule")'); pg.wait_for_timeout(300)
    blk=pg.locator(".blk",has_text="Team meeting").first; g=blk.locator(".grip"); g.evaluate("e=>e.scrollIntoView({block:'center'})"); pg.wait_for_timeout(100); bb=g.bounding_box()
    pg.mouse.move(bb["x"]+10,bb["y"]+10); pg.mouse.down(); pg.mouse.move(bb["x"]+10,bb["y"]+10+56*3,steps=6); pg.mouse.up(); pg.wait_for_timeout(400)
    print("after drag:",pg.inner_text(".toast"))
    pg.screenshot(path="tests/out/s_sched.png",full_page=True)
    # month
    pg.click('.seg button:has-text("Month")'); pg.wait_for_timeout(300)
    pg.click('.tabs button:has-text("Day")'); pg.wait_for_timeout(200)
    pg.screenshot(path="tests/out/s_month.png")
    # habits
    pg.click('#nav button[data-tab="habits"]'); pg.wait_for_timeout(200)
    pg.click('.chip:has-text("Drink water")'); pg.wait_for_timeout(300)
    pg.click('button:has-text("+ New habit")'); pg.fill('.sheet .inp.title',"Read 20 pages"); pg.click('.sheet .emojis button:has-text("📚")'); pg.click('.sheet .chip:has-text("Mon")'); pg.click('.sheet .chip:has-text("Wed")'); pg.click('.sheet .chip:has-text("Fri")'); pg.click('.sheet button:has-text("Add habit")'); pg.wait_for_timeout(300)
    pg.locator(".hbig").first.click(); pg.wait_for_timeout(200)
    pg.wait_for_timeout(200)
    pg.screenshot(path="tests/out/s_habits.png",full_page=True)
    pg.locator(".hname").first.click(); pg.wait_for_timeout(300); pg.screenshot(path="tests/out/s_habit_edit.png"); pg.keyboard.press("Escape")
    # notes
    pg.click('#nav button[data-tab="notes"]'); pg.wait_for_timeout(200)
    pg.click('button:has-text("+ New note")'); pg.wait_for_timeout(200)
    pg.fill(".note-title","Trip ideas"); pg.fill(".note-body","Lisbon in spring\nTry the pastéis de nata 🥐\nBook flights early"); pg.wait_for_timeout(800)
    pg.click('.sheet button:has-text("Done")'); pg.wait_for_timeout(300)
    # journal
    pg.click('.seg button:has-text("Journal")'); pg.wait_for_timeout(200)
    pg.locator(".ncard").first.click(); pg.wait_for_timeout(200)
    pg.click('.moods button:has-text("Great")'); pg.fill(".note-body","Good day. Finished the report and went for a run."); pg.wait_for_timeout(800)
    # export docx and pdf from journal entry
    pg.click('.sheet .chip:has-text("Export")'); pg.wait_for_timeout(200)
    with pg.expect_download() as d: pg.click('button:has-text("Word (.docx)")')
    d.value.save_as("tests/out/j.docx")
    with pg.expect_download() as d: pg.click('button:has-text("PDF")')
    d.value.save_as("tests/out/j.pdf")
    pg.keyboard.press("Escape"); pg.wait_for_timeout(100); pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
    pg.screenshot(path="tests/out/s_journal.png",full_page=True)
    # money
    pg.click('#nav button[data-tab="money"]'); pg.wait_for_timeout(200)
    pg.click('button:has-text("Choose currency")'); pg.fill('.sheet input[type="search"]',"pound"); pg.wait_for_timeout(200); pg.click('.sheet .sres button:has-text("GBP")'); pg.wait_for_timeout(200)
    for amt,cat,note in [("12.50","Food","Lunch"),("45","Transport","Train pass"),("80","Bills","Phone bill")]:
        pg.click('button:has-text("+ Add expense")'); pg.fill(".sheet .inp.amt",amt); pg.click(f'.sheet .chip:has-text("{cat}")'); pg.fill('.sheet input[aria-label="Note"]',note); pg.click('.sheet button:has-text("Add")'); pg.wait_for_timeout(200)
    pg.click('button:has-text("Budget")'); pg.fill('.sheet input[aria-label="Monthly budget"]',"500"); pg.fill('.sheet input[aria-label="Food limit"]',"150"); pg.click('.sheet button:has-text("Save")'); pg.wait_for_timeout(300)
    pg.screenshot(path="tests/out/s_money.png",full_page=True)
    # more: goals
    pg.click('#nav button[data-tab="more"]'); pg.wait_for_timeout(200); pg.screenshot(path="tests/out/s_more.png")
    pg.click('.mi:has-text("Goals")'); pg.click('button:has-text("+ New goal")'); pg.fill(".sheet .inp.title","Save for a holiday")
    pg.click('.sheet .seg button:has-text("A number")'); pg.fill('.sheet input[aria-label="Current"]',"300"); pg.fill('.sheet input[aria-label="Target"]',"1000"); pg.fill('.sheet input[aria-label="Unit"]',"GBP")
    pg.click('.sheet button:has-text("Add goal")'); pg.wait_for_timeout(200)
    pg.click('button:has-text("+ New goal")'); pg.fill(".sheet .inp.title","Get fit"); pg.click('.sheet button:has-text("+ Add a task for this goal")'); pg.wait_for_timeout(200)
    pg.fill(".sheet .inp.title","Sign up for the gym"); pg.click('.sheet button:has-text("Add task")'); pg.wait_for_timeout(300)
    pg.screenshot(path="tests/out/s_goals.png",full_page=True)
    # shopping
    pg.click('.back'); pg.click('.mi:has-text("Shopping")'); pg.wait_for_timeout(200)
    for it in ["2 kg rice","Milk","6 eggs"]:
        pg.fill("#qaInput",it); pg.press("#qaInput","Enter"); pg.wait_for_timeout(120)
    pg.click('button[aria-label="Mark bought: Milk"]'); pg.wait_for_timeout(200)
    pg.screenshot(path="tests/out/s_shop.png",full_page=True)
    # review
    pg.click('.back'); pg.click('.mi:has-text("Weekly review")'); pg.wait_for_timeout(300); pg.screenshot(path="tests/out/s_review.png",full_page=True)
    pg.click('button:has-text("Write your weekly reflection")'); pg.wait_for_timeout(300); pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
    # backup
    pg.click('.back'); pg.click('.mi:has-text("Backup")'); pg.wait_for_timeout(200)
    with pg.expect_download() as d: pg.click('button:has-text("Download backup")')
    d.value.save_as("tests/out/backup.json")
    # settings
    pg.click('.back'); pg.click('.mi:has-text("Settings")'); pg.wait_for_timeout(200); pg.screenshot(path="tests/out/s_settings.png",full_page=True)
    # search
    pg.click("#searchBtn"); pg.fill('.sheet input[type="search"]',"ri"); pg.wait_for_timeout(400); pg.screenshot(path="tests/out/s_search.png"); pg.keyboard.press("Escape")
    # restore into a fresh page
    ls=pg.evaluate("localStorage.getItem('planner.v2')")
    print("stored bytes:",len(ls))
    pg.close()
    # shortcut
    pg2=newpage(b,"http://localhost:8765/?a=expense"); pg2.wait_for_timeout(600); print("shortcut sheet:",pg2.locator(".sheet h3").first.inner_text())
    pg3=newpage(b,"http://localhost:8765/?title=Recipe&text=Pasta%20with%20pesto&url=https%3A%2F%2Fexample.com"); pg3.wait_for_timeout(600); print("shared page ->",pg3.inner_text("#bigDate"),pg3.locator('.lt:has-text("Recipe")').count())
    # restore backup in fresh context
    pg4=newpage(b); pg4.click('#nav button[data-tab="more"]'); pg4.click('.mi:has-text("Backup")'); pg4.set_input_files('input[type="file"]',"tests/out/backup.json"); pg4.wait_for_timeout(300); pg4.click('.sheet button:has-text("Restore")'); pg4.wait_for_timeout(400); print("restore toast:",pg4.inner_text(".toast"))
    # dark mode check
    pg5=newpage(b,scheme="dark"); pg5.evaluate("localStorage.setItem('planner.v2',%s)"%json.dumps(ls)); pg5.reload(); pg5.wait_for_timeout(600); pg5.keyboard.press("Escape"); pg5.click('#nav button[data-tab="habits"]'); pg5.wait_for_timeout(300); pg5.screenshot(path="tests/out/s_dark.png")
    b.close()
print("ERRORS:",errs)
