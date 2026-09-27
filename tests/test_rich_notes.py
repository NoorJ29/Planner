import io,json,re,zipfile,zlib
from playwright.sync_api import sync_playwright
from libroutes import serve_libs
MOCK=open("tests/mockfb2.js").read()
CFG='window.PLANNER_FIREBASE_CONFIG={apiKey:"test",authDomain:"x",projectId:"x",appId:"x"};'
errs=[]
def check(label,ok,got=""):
    print(label,"->","OK" if ok else "FAIL",got if not ok else "")
    if not ok: errs.append(label+" "+str(got)[:300])
def device(ctx,w=390,h=844,libs=True):
    pg=ctx.new_page(); pg.set_viewport_size({"width":w,"height":h}); pg.on("pageerror",lambda e:errs.append("pageerror: "+str(e)))
    pg.on("dialog",lambda d:(errs.append("dialog opened: "+d.message),d.dismiss()))
    pg.route("**/www.gstatic.com/**",lambda r:r.fulfill(body=MOCK if "app-compat" in r.request.url else "",content_type="application/javascript"))
    pg.route("**/config.js",lambda r:r.fulfill(body=CFG,content_type="application/javascript"))
    pg.route("**/fonts.googleapis.com/**",lambda r:r.abort())
    if libs: serve_libs(pg)
    else: pg.route("**/cdn.jsdelivr.net/**",lambda r:r.abort()); pg.route("**/cdnjs.cloudflare.com/**",lambda r:r.abort())
    return pg
def sign_in(pg,create=False):
    pg.wait_for_selector(".sheet h3"); pg.fill('input[type="email"]',"me@example.com"); pg.fill('input[type="password"]',"secret123")
    pg.click('.sheet button:has-text("%s")'%("Create account" if create else "Sign in")); pg.wait_for_timeout(700)
ED=".sheet .ql-editor"
def contents(pg): return pg.evaluate("()=>{const q=document.querySelector('.sheet .rich-area').__quill||window.Quill.find(document.querySelector('.sheet .rich-area'));return q.getContents().ops;}")
def lines(pg):
    """[(text, line attributes)] for each line in the editor."""
    out=[];cur=""
    for op in contents(pg):
        ins=op["insert"]
        if not isinstance(ins,str): out.append(("<divider>",{}));continue
        parts=ins.split("\n")
        for i,t in enumerate(parts):
            cur+=t
            if i<len(parts)-1: out.append((cur,op.get("attributes",{})));cur=""
    return out
def fresh(pg):
    """Empty the editor and put the cursor in it."""
    pg.evaluate("()=>{const q=window.Quill.find(document.querySelector('.sheet .rich-area'));q.setContents([{insert:'\\n'}],'user');q.setSelection(0,0,'user');}"); pg.click(ED)
def select_all(pg): pg.evaluate("()=>{const q=window.Quill.find(document.querySelector('.sheet .rich-area'));q.setSelection(0,q.getLength()-1,'user');}")
def tb(pg,label): pg.click('.sheet .rtool button[aria-label^="%s"]'%label)
def menu(pg,label,item): tb(pg,label); pg.click('.sheet .rpop button:has-text("%s")'%item)
def stored(pg,title):
    d=pg.evaluate("JSON.parse(localStorage.getItem('mockfs'))")
    return next((v for k,v in d.items() if k.startswith("users/u_me/notes/") and v.get("title")==title),None)
def open_note(pg,title): pg.click('.nlist .ncard:has(b:text-is("%s"))'%title); pg.wait_for_selector(ED); pg.wait_for_timeout(200)
def done(pg): pg.wait_for_timeout(750); pg.click('.sheet button:has-text("Done")'); pg.wait_for_timeout(250)
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(service_workers="block",accept_downloads=True)
    pg=device(ctx); pg.goto("http://localhost:8765/"); sign_in(pg,create=True)
    pg.click('#nav button[data-tab="notes"]'); pg.click('button:has-text("+ New note")'); pg.wait_for_selector(ED)
    pg.fill(".note-title","Formatting test")
    # 1. inline marks via toolbar
    fresh(pg); pg.keyboard.type("Hello world"); select_all(pg)
    for lbl in ["Bold","Italic","Underline","Strikethrough"]: tb(pg,lbl)
    ops=contents(pg)
    check("1. B/I/U/S applied",ops[0].get("attributes")=={"bold":True,"italic":True,"underline":True,"strike":True},ops[0])
    check("1. buttons show state",all(pg.get_attribute('.sheet .rtool button[aria-label^="%s"]'%l,"aria-pressed")=="true" for l in ["Bold","Italic","Underline","Strikethrough"]))
    tb(pg,"Text colour"); pg.click('.sheet .rpop .swb[aria-label="Red"]'); tb(pg,"Highlight"); pg.click('.sheet .rpop .swb[aria-label="Yellow"]')
    menu(pg,"Text size","Large")
    a=contents(pg)[0].get("attributes",{})
    check("1. colour, highlight, size",a.get("color")=="red" and a.get("background")=="yellow" and a.get("size")=="large",a)
    tb(pg,"Clear formatting"); check("1. clear formatting",not contents(pg)[0].get("attributes"),contents(pg)[0])
    # 2. line formats via toolbar
    pg.select_option('.sheet .rtool select[aria-label="Text style"]',"2"); check("2. heading 2",lines(pg)[0][1].get("header")==2,lines(pg))
    pg.select_option('.sheet .rtool select[aria-label="Text style"]',""); menu(pg,"Alignment","Centre"); check("2. centre",lines(pg)[0][1].get("align")=="center",lines(pg))
    menu(pg,"Alignment","Left"); tb(pg,"Quote"); check("2. quote",lines(pg)[0][1].get("blockquote") is True,lines(pg)); tb(pg,"Quote")
    for lbl,val in [("Bulleted list","bullet"),("Numbered list","ordered"),("Checklist","unchecked")]:
        tb(pg,lbl); check("2. "+val,lines(pg)[0][1].get("list")==val,lines(pg)); tb(pg,lbl)
    tb(pg,"Bulleted list"); tb(pg,"Indent"); check("2. indent",lines(pg)[0][1].get("indent")==1,lines(pg)); tb(pg,"Outdent"); tb(pg,"Bulleted list")
    # 3. typing shortcuts
    fresh(pg)
    for text in ["# Big","## Medium","### Small","- bullet","1. first","[] todo","[x] done","> quoted","---"]:
        pg.keyboard.type(text); pg.keyboard.press("Enter")
        if text[0] in "-1[>": pg.keyboard.press("Enter")  # an empty list/quote line ends it
    pg.keyboard.type("a **bold** and *slanted* and ~~gone~~ end"); pg.wait_for_timeout(200)
    L=lines(pg); got={t:a for t,a in L}
    check("3. heading shortcuts",got.get("Big",{}).get("header")==1 and got.get("Medium",{}).get("header")==2 and got.get("Small",{}).get("header")==3,L[:3])
    check("3. list shortcuts",got.get("bullet",{}).get("list")=="bullet" and got.get("first",{}).get("list")=="ordered" and got.get("todo",{}).get("list")=="unchecked" and got.get("done",{}).get("list")=="checked",L)
    check("3. quote and divider",got.get("quoted",{}).get("blockquote") is True and ("<divider>",{}) in L,L)
    inl={op["insert"]:op.get("attributes",{}) for op in contents(pg) if isinstance(op["insert"],str)}
    check("3. inline marks",inl.get("bold",{}).get("bold") and inl.get("slanted",{}).get("italic") and inl.get("gone",{}).get("strike") and "a  and" not in "".join(inl),inl)
    # 4. checkbox tick
    box=pg.locator('.sheet .ql-editor li[data-list="unchecked"]').first; bb=box.bounding_box(); pg.mouse.click(bb["x"]+8,bb["y"]+bb["height"]/2); pg.wait_for_timeout(150)
    check("4. tapping a checkbox ticks it",{t:a for t,a in lines(pg)}.get("todo",{}).get("list")=="checked",lines(pg))
    # 5. table
    pg.keyboard.press("Control+End"); pg.keyboard.press("Enter")
    menu(pg,"Table","Insert table"); pg.keyboard.type("A1")
    for act in ["Add row below","Add column right"]: menu(pg,"Table",act)
    t=[a.get("table") for _,a in lines(pg) if a.get("table")]; rows=len(set(t)); cells=len(t)
    check("5. table 4x4 after adding",rows==4 and cells==16,(rows,cells))
    menu(pg,"Table","Delete row"); menu(pg,"Table","Delete column")
    t=[a.get("table") for _,a in lines(pg) if a.get("table")]; check("5. table 3x3 after deleting",len(set(t))==3 and len(t)==9,(len(set(t)),len(t)))
    # 6. link
    pg.keyboard.press("Control+End"); pg.keyboard.press("Enter"); pg.keyboard.type("docs")
    pg.keyboard.press("Shift+Home"); pg.keyboard.press("Control+k"); pg.fill('.sheet input[aria-label="Link address"]',"javascript:alert(1)"); pg.click('.sheet .actions button:has-text("Save")')
    check("6. javascript: link refused",pg.locator('.sheet [role=alert]:has-text("Only web and email links")').count()==1)
    pg.fill('.sheet input[aria-label="Link address"]',"example.com/help"); pg.click('.sheet .actions button:has-text("Save")'); pg.wait_for_timeout(200)
    lk=[op.get("attributes",{}).get("link") for op in contents(pg) if isinstance(op["insert"],str) and op["insert"]=="docs"]
    check("6. link saved as https",lk==["https://example.com/help"],lk)
    pg.screenshot(path="tests/out/rich_phone.png")
    done(pg)
    # 7. saved, preview, progress, search, reopen
    n=stored(pg,"Formatting test")
    check("7. saved with doc and plain body",n and isinstance(n.get("doc",{}).get("ops"),list) and "Medium" in n.get("body","") and "**" not in n.get("body",""),n and n.get("body"))
    card=pg.inner_text('.nlist .ncard:has(b:text-is("Formatting test"))')
    check("7. card shows checklist progress","☑ 2/2" in card,card)
    pg.click("#searchBtn"); pg.fill('.sheet input[type="search"]',"slanted"); pg.wait_for_timeout(300)
    check("7. search finds formatted text","Formatting test" in pg.inner_text(".sheet .sres"),pg.inner_text(".sheet .sres")); pg.keyboard.press("Escape")
    open_note(pg,"Formatting test"); check("7. reopen keeps formatting",{t:a for t,a in lines(pg)}.get("Big",{}).get("header")==1)
    # 8. paste attack
    fresh(pg)
    pg.evaluate("""()=>{const dt=new DataTransfer();dt.setData('text/html','<p>safe<script>window.__x=1<\\/script><img src=x onerror="window.__x=2"><a href="javascript:window.__x=3">bad</a><span style="color:#ff00ff;font-family:Comic Sans">styled</span><iframe src="https://evil.example"></iframe></p>');dt.setData('text/plain','safe');
      document.querySelector('.sheet .ql-editor').dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}));}""")
    pg.wait_for_timeout(300)
    ops=contents(pg); flat=json.dumps(ops)
    check("8. nothing ran",pg.evaluate("window.__x")is None)
    check("8. no scripts, images, frames, bad links or styles stored","javascript" not in flat and "image" not in flat and "iframe" not in flat and "ff00ff" not in flat and "font" not in flat and "safe" in flat,flat)
    check("8. no unsafe elements in the editor",pg.locator(".sheet .ql-editor script, .sheet .ql-editor img, .sheet .ql-editor iframe, .sheet .ql-editor a[href^=javascript]").count()==0)
    pg.keyboard.press("Control+z"); done(pg)
    # 9. tampered data is cleaned
    pg.evaluate("""()=>{const d=JSON.parse(localStorage.getItem('mockfs'));const k=Object.keys(d).find(k=>d[k].title==='Formatting test');
      d[k].doc={ops:[{insert:'x',attributes:{bold:true,onclick:'alert(1)',color:'#123456',link:'javascript:alert(1)'}},{insert:{image:'https://evil.example/a.png'}},{insert:'\\n',attributes:{header:9,list:'bullet'}}]};
      localStorage.setItem('mockfs',JSON.stringify(d));new BroadcastChannel('mockfs').postMessage(1);}""")
    pg.wait_for_timeout(500); open_note(pg,"Formatting test"); ops=contents(pg)
    check("9. tampered doc cleaned",ops==[{"insert":"x","attributes":{"bold":True}},{"insert":"\n","attributes":{"list":"bullet"}}],ops)
    check("9. nothing ran",pg.evaluate("window.__x")is None); done(pg)
    # 10. export
    pg.click('#nav button[data-tab="notes"]'); pg.click('button:has-text("+ New note")'); pg.wait_for_selector(ED); pg.fill(".note-title","Export me")
    fresh(pg)
    for text in ["# Title here","- point","1. step","[x] ticked"]: pg.keyboard.type(text); pg.keyboard.press("Enter")
    pg.keyboard.press("Enter"); pg.keyboard.type("plain **strong** words"); pg.keyboard.press("Enter")
    menu(pg,"Table","Insert table"); pg.keyboard.type("cell text")
    pg.keyboard.press("Control+End"); pg.keyboard.press("Enter"); pg.keyboard.type("site"); pg.keyboard.press("Shift+Home"); pg.keyboard.press("Control+k"); pg.fill('.sheet input[aria-label="Link address"]',"https://example.org"); pg.keyboard.press("Enter"); pg.wait_for_timeout(200)
    pg.click('.sheet .chip:has-text("Export")');
    with pg.expect_download() as dl: pg.click('.sheet button:has-text("Word")')
    z=zipfile.ZipFile(dl.value.path()); docx=z.read("word/document.xml").decode("utf8"); rels=z.read("word/_rels/document.xml.rels").decode("utf8")
    missing=[x for x in ['w:val="Heading1"',"<w:numPr>","<w:tbl>","<w:b/>","☑","<w:hyperlink"] if x not in docx]+([] if "https://example.org" in rels else ["link target"])+([] if "word/numbering.xml" in z.namelist() else ["numbering"])
    check("10. Word: heading, list, table, bold, checkbox, link",not missing,missing)
    with pg.expect_download() as dl: pg.click('.sheet button:has-text("PDF")')
    raw=open(dl.value.path(),"rb").read(); text=b""
    for m in re.finditer(rb"stream\r?\n(.*?)\r?\nendstream",raw,re.S):
        try: text+=zlib.decompress(m.group(1))
        except Exception: text+=m.group(1)
    text=b"".join(re.findall(rb"\((.*?)\) Tj",text))  # the PDF draws word by word
    check("10. PDF has the text and link",raw.startswith(b"%PDF") and b"Title here" in text and b"cell text" in text and b"example.org" in raw,len(raw))
    pg.keyboard.press("Escape"); done(pg)
    # 11. a second device sees the formatting; journal uses the editor too
    lap=device(ctx,1400,900); lap.goto("http://localhost:8765/"); sign_in(lap); lap.evaluate("document.activeElement&&document.activeElement.blur()")
    lap.click('#sideNav button[data-tab="notes"]'); lap.wait_for_timeout(300); lap.click('.crumbs button:has-text("All notes")'); open_note(lap,"Export me")
    check("11. formatting synced",{t:a for t,a in lines(lap)}.get("Title here",{}).get("header")==1,lines(lap)[:2])
    lap.screenshot(path="tests/out/rich_desk.png"); lap.keyboard.press("Escape")
    lap.click('.seg button:has-text("Journal")'); lap.click('.ncard:has-text("How was today")'); lap.wait_for_selector(".sheet .ql-editor")
    lap.click(".sheet .ql-editor"); lap.keyboard.type("## Good day"); lap.keyboard.press("Enter"); lap.keyboard.type("[] call mum"); lap.wait_for_timeout(900)
    j=lap.evaluate("Object.values(JSON.parse(localStorage.getItem('mockfs'))).find(v=>v.type==='journal')")
    check("11. journal formatting saved",j and any(o.get("attributes",{}).get("header")==2 for o in j["doc"]["ops"]) and "call mum" in j["body"],j and j.get("body"))
    lap.keyboard.press("Escape")
    # 12. colours readable in light and dark
    def colour_check(page,scheme):
        page.emulate_media(color_scheme=scheme); page.wait_for_timeout(100)
        return page.evaluate("""()=>{const lum=c=>{const m=c.match(/\\d+(\\.\\d+)?/g).map(Number).slice(0,3).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*m[0]+.7152*m[1]+.0722*m[2]};
          const host=document.createElement('div');host.className='rich-ro';document.body.append(host);const bg=getComputedStyle(document.body).getPropertyValue('--surface');
          const out={};for(const c of ['red','orange','green','blue','purple','grey']){const s=document.createElement('span');s.className='ql-color-'+c;s.textContent='x';host.append(s);
            const a=lum(getComputedStyle(s).color),t=document.createElement('div');t.style.color=bg;document.body.append(t);const b2=lum(getComputedStyle(t).color);t.remove();out[c]=+(((Math.max(a,b2)+.05)/(Math.min(a,b2)+.05)).toFixed(2));}
          host.remove();return out;}""")
    light,dark=colour_check(lap,"light"),colour_check(lap,"dark")
    check("12. text colours readable in light mode (3:1)",min(light.values())>=3,light)
    check("12. text colours readable in dark mode (3:1)",min(dark.values())>=3,dark)
    lap.emulate_media(color_scheme="light")
    # 13. size guard
    lap.click('.seg button:has-text("Notes")'); lap.click('button:has-text("+ New note")'); lap.wait_for_selector(ED); lap.fill(".note-title","Huge")
    lap.evaluate("()=>{const q=window.Quill.find(document.querySelector('.sheet .rich-area'));q.setText('x'.repeat(900000),'user');}"); lap.wait_for_timeout(900)
    check("13. too-big note isn't saved",stored(lap,"Huge") is None or len(stored(lap,"Huge").get("body",""))<1000)
    check("13. warning shown","too big" in lap.inner_text(".toast span"),lap.inner_text(".toast span"))
    lap.evaluate("()=>{const q=window.Quill.find(document.querySelector('.sheet .rich-area'));q.setText('small again','user');}"); lap.wait_for_timeout(900); lap.keyboard.press("Escape")
    b.close()
    # 14. offline: editor unavailable -> read-only
    b=p.chromium.launch(); ctx2=b.new_context(service_workers="block",viewport={"width":390,"height":844})
    off=ctx2.new_page(); off.on("pageerror",lambda e:errs.append("pageerror: "+str(e)))
    off.route("**/config.js",lambda r:r.fulfill(body="window.PLANNER_FIREBASE_CONFIG={};",content_type="text/javascript"))
    off.route("**/cdn.jsdelivr.net/**",lambda r:r.abort()); off.route("**/fonts.googleapis.com/**",lambda r:r.abort())
    note={"id":"n1","type":"note","title":"Offline note","body":"Heading\nitem","doc":{"ops":[{"insert":"Heading"},{"insert":"\n","attributes":{"header":1}},{"insert":"item"},{"insert":"\n","attributes":{"list":"checked"}}]},"pinned":False,"createdAt":1,"updatedAt":1}
    off.add_init_script("localStorage.setItem('planner.v2',%s)"%json.dumps(json.dumps({"notes":[note]})))
    off.goto("http://localhost:8765/"); off.wait_for_timeout(500); off.click('#nav button[data-tab="notes"]'); off.click('.ncard:has-text("Offline note")'); off.wait_for_selector(".sheet .rbanner")
    check("14. read-only with banner",off.locator(".sheet .rich-ro h1:has-text('Heading')").count()==1 and off.locator(".sheet .rich-ro .done").count()==1 and off.locator(".sheet [contenteditable=true]").count()==0)
    off.wait_for_timeout(500); off.screenshot(path="tests/out/rich_offline.png")
    b.close()
print("ERRORS:",errs)
