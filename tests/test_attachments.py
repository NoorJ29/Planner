import io,json,math,os,random,string,zipfile
from PIL import Image
from playwright.sync_api import sync_playwright
from libroutes import serve_libs
MOCK=open("tests/mockfb2.js").read()
CFG='window.PLANNER_FIREBASE_CONFIG={apiKey:"test",authDomain:"x",projectId:"x",appId:"x"};'
errs=[]
def check(label,ok,got=""):
    print(label,"->","OK" if ok else "FAIL",got if not ok else "")
    if not ok: errs.append(label+" "+str(got)[:300])
def device(ctx,w=390,h=844,cfg=CFG):
    pg=ctx.new_page(); pg.set_viewport_size({"width":w,"height":h}); pg.on("pageerror",lambda e:errs.append("pageerror: "+str(e)))
    pg.on("dialog",lambda d:(errs.append("dialog: "+d.message),d.dismiss()))
    pg.route("**/www.gstatic.com/**",lambda r:r.fulfill(body=MOCK if "app-compat" in r.request.url else "",content_type="application/javascript"))
    pg.route("**/config.js",lambda r:r.fulfill(body=cfg,content_type="application/javascript"))
    pg.route("**/fonts.googleapis.com/**",lambda r:r.abort()); serve_libs(pg)
    return pg
def sign_in(pg,create=False):
    pg.wait_for_selector(".sheet h3"); pg.fill('input[type="email"]',"me@example.com"); pg.fill('input[type="password"]',"secret123")
    pg.click('.sheet button:has-text("%s")'%("Create account" if create else "Sign in")); pg.wait_for_timeout(700)
def png(w,h):
    im=Image.new("RGB",(w,h)); px=im.load()
    for x in range(0,w,7):
        for y in range(0,h,7): px[x,y]=(x%256,y%256,(x*y)%256)
    b=io.BytesIO(); im.save(b,"PNG"); return b.getvalue()
Q="window.Quill.find(document.querySelector('.sheet .rich-area'))"
def fs(pg): return pg.evaluate("JSON.parse(localStorage.getItem('mockfs'))")
def files(pg): return {k.split("/")[3]:v for k,v in fs(pg).items() if k.startswith("users/u_me/files/") and k.count("/")==3}
def parts(pg,fid): return sorted(k for k in fs(pg) if k.startswith("users/u_me/files/%s/parts/"%fid))
def attach(pg,kind,payload):
    pg.click('.sheet .rtool button[aria-label="Add a picture or file"]')
    with pg.expect_file_chooser() as fc: pg.click('.sheet .rpop button:has-text("%s")'%kind)
    fc.value.set_files(payload); pg.wait_for_timeout(900)
def ops(pg): return pg.evaluate(Q+".getContents().ops")
def done(pg): pg.wait_for_timeout(750); pg.click('.sheet button:has-text("Done")'); pg.wait_for_timeout(300)
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(service_workers="block",accept_downloads=True)
    popups=[]; ctx.on("page",lambda pgx:popups.append(pgx.url))
    pg=device(ctx); pg.goto("http://localhost:8765/"); sign_in(pg,create=True)
    pg.click('#nav button[data-tab="notes"]'); pg.click('button:has-text("+ New note")'); pg.wait_for_selector(".sheet .ql-editor"); pg.fill(".note-title","Trip")
    pg.click(".sheet .ql-editor"); pg.keyboard.type("Photos from the trip")
    # 1. a big picture is shrunk and shown
    attach(pg,"Picture",{"name":"beach.png","mimeType":"image/png","buffer":png(3000,2000)})
    f=files(pg); pic=next((k for k,v in f.items() if v["name"]=="beach.jpg"),None)
    check("1. picture saved as a JPEG, 1600 px wide",pic and f[pic]["type"]=="image/jpeg" and f[pic]["w"]==1600 and f[pic]["h"]==1067,f)
    check("1. picture stored in parts",pic and len(parts(pg,pic))==f[pic]["parts"]>=1,pic and parts(pg,pic))
    check("1. picture shown in the note",pg.evaluate("[...document.querySelectorAll('.sheet .npic img')].some(i=>i.complete&&i.naturalWidth===1600)"))
    # 2. a 1.2 MB file is split into several parts
    big="".join(random.choice(string.ascii_letters) for _ in range(1_200_000)).encode()
    pg.keyboard.press("Control+End"); attach(pg,"File",{"name":"notes.txt","mimeType":"text/plain","buffer":big})
    f=files(pg); txt=next((k for k,v in f.items() if v["name"]=="notes.txt"),None)
    want=math.ceil(math.ceil(len(big)/3)*4/700000)
    check("2. big file split into parts",txt and f[txt]["parts"]==want==len(parts(pg,txt)),(want,txt and f[txt]["parts"]))
    chip=pg.locator('.sheet .ql-editor .nfile[data-name="notes.txt"]')
    check("2. file chip shown",chip.count()==1 and "notes.txt · 1.1 MB" in chip.inner_text(),chip.inner_text() if chip.count() else None)
    with pg.expect_download() as dl: chip.click()
    check("2. tapping the chip downloads it",dl.value.suggested_filename=="notes.txt" and open(dl.value.path(),"rb").read()==big)
    # 3. risky types are downloaded, never opened
    pg.keyboard.press("Control+End"); attach(pg,"File",{"name":"evil.html","mimeType":"text/html","buffer":b"<script>opener.document.title='hacked'</script>"})
    pg.keyboard.press("Control+End"); attach(pg,"Picture",{"name":"logo.svg","mimeType":"image/svg+xml","buffer":b'<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="9" height="9"/></svg>'})
    check("3. SVG kept as a file, not shown as a picture",pg.locator('.sheet .nfile[data-name="logo.svg"]').count()==1)
    n_pop=len(popups)
    with pg.expect_download() as dl: pg.click('.sheet .nfile[data-name="evil.html"]')
    pg.wait_for_timeout(300)
    check("3. HTML file downloaded, not opened",dl.value.suggested_filename=="evil.html" and len(popups)==n_pop and pg.title()!="hacked",popups)
    # 4. the 5 MB limit
    before=len(files(pg)); pg.keyboard.press("Control+End"); attach(pg,"File",{"name":"huge.bin","mimeType":"application/octet-stream","buffer":b"\0"*(6*1024*1024)})
    check("4. files over 5 MB refused",len(files(pg))==before and "up to 5 MB" in pg.inner_text(".toast span"),pg.inner_text(".toast span"))
    # 5. paste a picture
    pg.keyboard.press("Control+End")
    pg.evaluate("""async()=>{const c=document.createElement('canvas');c.width=40;c.height=30;c.getContext('2d').fillRect(0,0,40,30);
      const blob=await new Promise(r=>c.toBlob(r,'image/png'));const dt=new DataTransfer();dt.items.add(new File([blob],'pasted.png',{type:'image/png'}));
      document.querySelector('.sheet .ql-editor').dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}));}""")
    pg.wait_for_timeout(900)
    check("5. pasted picture attached",pg.locator(".sheet .npic").count()==2 and any(v["name"]=="pasted.jpg" for v in files(pg).values()))
    # 6. picture viewer
    pg.click(".sheet .npic >> nth=0"); pg.wait_for_timeout(300)
    check("6. tapping a picture opens it",pg.locator(".sheet img.picview").count()==1); pg.keyboard.press("Escape")
    pg.screenshot(path="tests/out/attach_phone.png")
    # 7. remove the text file from the note: its file is cleaned up when the note closes
    pg.evaluate(Q+".getContents().ops.forEach(()=>{})")
    pg.evaluate("()=>{const q="+Q+";let i=0;for(const op of q.getContents().ops){if(op.insert&&op.insert.file&&op.insert.file.name==='notes.txt'){q.deleteText(i,1,'user');break;}i+=typeof op.insert==='string'?op.insert.length:1;}}")
    done(pg); pg.wait_for_timeout(2500)
    f=files(pg)
    check("7. removed file deleted with its parts",txt not in f and not parts(pg,txt),list(f))
    check("7. files still used are kept",pic in f and len(f)==4,[v["name"] for v in f.values()])
    note=next(v for k,v in fs(pg).items() if k.startswith("users/u_me/notes/") and v.get("title")=="Trip")
    check("7. note stores picture and file references",any("pic" in o["insert"] for o in note["doc"]["ops"] if isinstance(o["insert"],dict)) and any("file" in o["insert"] for o in note["doc"]["ops"] if isinstance(o["insert"],dict)))
    # 8. tampered references are dropped
    pg.evaluate("""()=>{const d=JSON.parse(localStorage.getItem('mockfs'));const k=Object.keys(d).find(k=>d[k].title==='Trip');
      d[k].doc.ops.push({insert:{pic:{id:'../../etc'}}},{insert:{file:{id:'ok1234',name:'<img src=x onerror=alert(1)>',size:5}}},{insert:'\\n'});
      localStorage.setItem('mockfs',JSON.stringify(d));new BroadcastChannel('mockfs').postMessage(1);}""")
    pg.wait_for_timeout(500); pg.click('.nlist .ncard:has(b:text-is("Trip"))'); pg.wait_for_selector(".sheet .ql-editor"); pg.wait_for_timeout(400)
    check("8. bad picture id dropped, bad name shown as text",pg.locator('.sheet .npic[data-id="../../etc"]').count()==0 and pg.locator(".sheet .nfile img").count()==0 and pg.locator('.sheet .nfile[data-id="ok1234"]').count()==1)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
    # 9. profile shows storage use
    pg.click("#sync"); pg.wait_for_timeout(800)
    check("9. profile shows storage use","Pictures and files: 4" in pg.inner_text(".pusage"),pg.inner_text(".pusage"))
    # 10. another device loads the pictures and exports them
    lap=device(ctx,1400,900); lap.goto("http://localhost:8765/"); sign_in(lap); lap.evaluate("document.activeElement&&document.activeElement.blur()")
    lap.click('#sideNav button[data-tab="notes"]'); lap.wait_for_timeout(300); lap.click('.crumbs button:has-text("All notes")'); lap.click('.nlist .ncard:has(b:text-is("Trip"))'); lap.wait_for_timeout(1200)
    check("10. picture loads on the other device",lap.evaluate("[...document.querySelectorAll('.sheet .npic img')].filter(i=>i.complete&&i.naturalWidth>0).length")==2)
    lap.screenshot(path="tests/out/attach_desk.png")
    lap.click('.sheet .chip:has-text("Export")')
    with lap.expect_download() as dl: lap.click('.sheet button:has-text("Word")')
    z=zipfile.ZipFile(dl.value.path()); names=z.namelist(); doc=z.read("word/document.xml").decode()
    check("10. Word export includes pictures","word/media/image1.jpeg" in names and "word/media/image2.jpeg" in names and "<wp:inline" in doc and "📎 evil.html" in doc,names)
    with lap.expect_download() as dl: lap.click('.sheet button:has-text("PDF")')
    check("10. PDF export includes pictures",open(dl.value.path(),"rb").read().count(b"/Subtype /Image")>=2)
    lap.keyboard.press("Escape"); lap.keyboard.press("Escape")
    # 11. deleting the note removes its files after the undo window
    pg.click('#nav button[data-tab="notes"]'); pg.click('.nlist .ncard:has(b:text-is("Trip"))'); pg.wait_for_selector(".sheet .ql-editor"); pg.click('.sheet .chip:has-text("Delete")')
    pg.wait_for_timeout(16500)
    check("11. deleted note's files removed",not files(pg) and not any("/parts/" in k for k in fs(pg)),list(files(pg)))
    # 12. journal entries can hold pictures too; deleting the account removes them
    pg.click('.seg button:has-text("Journal")'); pg.click('.ncard:has-text("How was today")'); pg.wait_for_selector(".sheet .ql-editor"); pg.click(".sheet .ql-editor")
    attach(pg,"Picture",{"name":"sunset.png","mimeType":"image/png","buffer":png(200,100)}); done(pg)
    j=next((v for v in fs(pg).values() if v.get("type")=="journal"),None)
    check("12. journal entry with only a picture is kept",j is not None and len(files(pg))==1,j)
    pg.click("#sync"); pg.wait_for_timeout(300); pg.click('button:has-text("Delete my account")')
    pg.fill('.sheet input[aria-label="Your password"]',"secret123"); pg.fill('.sheet input[aria-label="Type DELETE to confirm"]',"DELETE")
    with pg.expect_navigation(): pg.click('.sheet button:has-text("Delete forever")')
    check("12. account deletion removes files",not any(k.startswith("users/u_me") for k in fs(pg)),[k for k in fs(pg) if "u_me" in k][:5])
    b.close()
    # 13. signed out: the paperclip explains
    b=p.chromium.launch(); ctx=b.new_context(service_workers="block",viewport={"width":390,"height":844})
    loc=device(ctx,cfg="window.PLANNER_FIREBASE_CONFIG={};"); loc.goto("http://localhost:8765/"); loc.wait_for_timeout(400)
    loc.click('#nav button[data-tab="notes"]'); loc.click('button:has-text("+ New note")'); loc.wait_for_selector(".sheet .ql-editor")
    loc.click('.sheet .rtool button[aria-label="Add a picture or file"]')
    check("13. signed out: explains sign-in is needed","Sign in to add pictures" in loc.inner_text(".sheet .rpop"))
    b.close()
print("ERRORS:",errs)
