import json,random,datetime
from playwright.sync_api import sync_playwright
t=datetime.date.today(); random.seed(1)
tasks=[{"id":f"t{i}","title":f"Task {i}","date":(t+datetime.timedelta(days=random.randint(-400,120))).isoformat(),"time":random.choice(["","09:00","13:30"]),"listId":random.choice(["work","home","personal"]),"priority":0,"notes":"","done":random.random()<.7,"doneAt":0,"createdAt":i,"repeat":"","remind":"","subtasks":[],"goalId":""} for i in range(3000)]
exp=[{"id":f"e{i}","amount":round(random.uniform(2,90),2),"type":"expense","catId":"food","note":"x","date":(t-datetime.timedelta(days=random.randint(0,400))).isoformat(),"createdAt":i} for i in range(2000)]
habits=[{"id":f"h{i}","name":f"Habit {i}","emoji":"💧","color":"#0F7B6C","days":[],"log":{(t-datetime.timedelta(days=d)).isoformat():True for d in range(0,365,2)},"createdAt":0,"archived":False} for i in range(8)]
notes=[{"id":f"n{i}","type":"note","title":f"Note {i}","body":"lorem ipsum "*40,"pinned":False,"createdAt":i,"updatedAt":i} for i in range(500)]
data=json.dumps({"tasks":tasks,"expenses":exp,"habits":habits,"notes":notes,"settings":{"currency":"USD"}})
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":390,"height":844})
    pg.route("**/www.gstatic.com/**",lambda r:r.abort())
    pg.add_init_script(f"localStorage.setItem('planner.v2',{json.dumps(data)})")
    pg.goto("http://localhost:8765/"); pg.wait_for_timeout(800)
    for tab in ["home","plan","habits","notes","money","plan"]:
        ms=pg.evaluate(f"""()=>new Promise(r=>{{const t=performance.now();document.querySelector('#nav button[data-tab="{tab}"]').click();requestAnimationFrame(()=>requestAnimationFrame(()=>r(performance.now()-t)));}})""")
        print(tab, round(ms), "ms")
    ms=pg.evaluate("""()=>new Promise(r=>{const t=performance.now();document.querySelector('.check').click();requestAnimationFrame(()=>requestAnimationFrame(()=>r(performance.now()-t)));})""")
    print("tick a task:",round(ms),"ms")
    b.close()
