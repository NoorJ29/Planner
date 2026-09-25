import json,datetime
from playwright.sync_api import sync_playwright
t=datetime.date.today(); k=lambda n:(t+datetime.timedelta(days=n)).isoformat()
T=lambda i,title,n,tm="",l="work",done=False,p=0,rep="",subs=0,dur=30:dict(id=f"t{i}",title=title,date=k(n) if n is not None else None,time=tm,duration=dur,listId=l,priority=p,notes="",done=done,doneAt=0,createdAt=i,repeat=rep,remind="15" if tm else "",subtasks=[{"id":f"s{j}","text":f"Step {j}","done":j==0} for j in range(subs)],goalId="")
tasks=[T(1,"Morning workout",0,"07:00","personal",False,1,"daily",3,45),T(2,"Team stand-up",0,"09:30","work",True,0,"weekdays",0,15),T(3,"Finish Q3 report",0,"11:00","work",False,2,"",4,120),T(4,"Lunch with Sam",0,"13:00","personal",dur:=0) if False else T(4,"Lunch with Sam",0,"13:00","personal",dur=60),T(5,"Pay electricity bill",-1,"","home",False,1),T(6,"Buy groceries",0,"","home"),T(7,"Call mum",1,"19:00","personal"),T(8,"Dentist",3,"10:15","personal"),T(9,"Book flights",5,"","personal"),T(10,"Prepare slides",2,"","work",False,1),T(11,"Clean garage",None,"","home"),T(12,"Quarterly review",8,"10:00","work",False,2)]
habits=[dict(id=f"h{i}",name=n,emoji=e,color=c,days=[],log={(t-datetime.timedelta(days=d)).isoformat():True for d in range(0,40) if (d*7+i)%5!=0},createdAt=0,archived=False) for i,(n,e,c) in enumerate([("Drink water","💧","#2F86C9"),("Exercise","🏃","#0F7B6C"),("Read 20 pages","📚","#E9A21F"),("Meditate","🧘","#7B5CD6")])]
notes=[dict(id="n1",type="note",title="Trip ideas",body="Lisbon in spring. Try the custard tarts. Book flights early for cheaper fares.",pinned=True,createdAt=1,updatedAt=5),dict(id="n2",type="note",title="Gift list",body="Mum: scarf. Sam: book about coffee. Dad: tools.",pinned=False,createdAt=1,updatedAt=4),dict(id="n3",type="note",title="Project ideas",body="Budget tracker widget, reading log, meal planner.",pinned=False,createdAt=1,updatedAt=3),dict(id="j-"+k(0),type="journal",date=k(0),mood="4",body="Productive day. Finished most of the report.",createdAt=1,updatedAt=6),dict(id="j-"+k(-1),type="journal",date=k(-1),mood="5",body="Great run in the morning, dinner with friends.",createdAt=1,updatedAt=6)]
exp=[dict(id=f"e{i}",amount=a,type=ty,catId=c,note=nn,date=k(-d),createdAt=i) for i,(a,ty,c,nn,d) in enumerate([(12.5,"expense","food","Lunch",0),(45,"expense","transport","Train pass",1),(80,"expense","bills","Phone bill",2),(2400,"income","other","Salary",3),(32.9,"expense","shopping","Shoes",4),(18,"expense","fun","Cinema",5),(64.2,"expense","food","Groceries",6)])]
goals=[dict(id="g1",title="Save for a holiday",why="",due=k(90),kind="number",current=420,target=1000,unit="GBP",done=False,createdAt=1),dict(id="g2",title="Get fit",why="",due=k(60),kind="tasks",current=0,target=0,unit="",done=False,createdAt=2)]
tasks[0]["goalId"]="g2"
data=json.dumps({"tasks":tasks,"habits":habits,"notes":notes,"expenses":exp,"goals":goals,"shop":[],"settings":{"currency":"GBP","budget":900,"catBudgets":{"food":250}}})
open("tests/out/demo.json","w").write(data)
def shots(scheme,prefix,w=1440,h=900):
    with sync_playwright() as p:
        b=p.chromium.launch(); ctx=b.new_context(viewport={"width":w,"height":h},device_scale_factor=1,color_scheme=scheme,service_workers="block"); pg=ctx.new_page()
        errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
        pg.route("**/www.gstatic.com/**",lambda r:r.abort()); pg.route("**/fonts.googleapis.com/**",lambda r:r.abort())
        pg.add_init_script(f"if(!sessionStorage.getItem('seeded')){{localStorage.setItem('planner.v2',{json.dumps(data)});sessionStorage.setItem('seeded','1');}}")
        pg.goto("http://localhost:8765/"); pg.wait_for_timeout(700)
        pg.screenshot(path=f"tests/out/{prefix}_home.png"); pg.keyboard.press("2"); pg.wait_for_timeout(300)
        pg.screenshot(path=f"tests/out/{prefix}_plan.png")
        pg.keyboard.press("s") ; pg.click('.tabs button:has-text("Schedule")'); pg.wait_for_timeout(300); pg.screenshot(path=f"tests/out/{prefix}_sched.png")
        for i,n in [("3","habits"),("4","notes"),("5","money"),("7","more")]:
            pg.keyboard.press(i); pg.wait_for_timeout(300); pg.screenshot(path=f"tests/out/{prefix}_{n}.png")
        pg.keyboard.press("2"); pg.wait_for_timeout(200); pg.click('.tabs button:has-text("Day")'); pg.click('.tbody:has-text("Finish Q3 report")'); pg.wait_for_timeout(300); pg.screenshot(path=f"tests/out/{prefix}_sheet.png")
        print(prefix,errs); b.close()
shots("light","d"); shots("dark","dd")
