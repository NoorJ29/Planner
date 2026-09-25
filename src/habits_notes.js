/* ================= habits ================= */
const HABIT_EMOJI=["💧","🏃","📚","🧘","😴","🥗","💊","🦷","🙏","✍️","🎸","🧹","🚶","💪","🌱","📵"];
const HABIT_IDEAS=[["Drink water","💧"],["Exercise","🏃"],["Read","📚"],["Meditate","🧘"],["Sleep before 11","😴"],["Eat healthy","🥗"]];
function habitDue(hb,d){return !hb.days||!hb.days.length||hb.days.includes(d.getDay());}
function habitStart(hb){const c=Number(hb.createdAt)>0?key(new Date(hb.createdAt)):todayKey();const first=Object.keys(hb.log||{}).sort()[0];return first&&first<c?first:c;}
function streak(hb){
  const log=hb.log||{};let d=new Date(),n=0;const start=habitStart(hb);
  if(!log[key(d)])d=addDays(d,-1);
  for(let i=0;i<1000;i++){const k=key(d);if(k<start)break;if(habitDue(hb,d)){if(log[k])n++;else break;}d=addDays(d,-1);}
  return n;
}
function bestStreak(hb){const log=hb.log||{};let best=0,cur=0;let d=fromKey(habitStart(hb));const tk=todayKey();for(let i=0;i<2000&&key(d)<=tk;i++){const k=key(d);if(habitDue(hb,d)){if(log[k]){cur++;best=Math.max(best,cur);}else if(k!==tk)cur=0;}d=addDays(d,1);}return best;}
function habitRate(hb,days){const log=hb.log||{};let due=0,hit=0;const start=habitStart(hb);for(let i=0;i<days;i++){const d=addDays(new Date(),-i),k=key(d);if(k<start)break;if(habitDue(hb,d)){due++;if(log[k])hit++;}}return due?hit/due:0;}
function toggleHabit(hb,k){const log=Object.assign({},hb.log||{});if(log[k])delete log[k];else log[k]=true;Store.put("habits",Object.assign(clone(hb),{log}));}
function newHabit(p){return Object.assign({id:uid(),name:"",emoji:"💧",color:COLORS[0],days:[],log:{},createdAt:Date.now(),archived:false},p);}

function renderHabits(main){
  const tk=todayKey(),now=new Date();
  const hs=vals("habits").filter(x=>!x.archived).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
  const due=hs.filter(x=>habitDue(x,now)),doneN=due.filter(x=>x.log&&x.log[tk]).length;
  setHeader("Habits",hs.length?doneN+" of "+due.length+" done today":"Build routines that stick");
  if(!hs.length){
    main.append(h("div",{class:"sec"},h("div",{class:"empty"},h("p",{style:"margin:0 0 12px",text:"No habits yet. Tap one to start, or create your own."}),h("div",{class:"row",style:"justify-content:center"},HABIT_IDEAS.map(([n,e],i)=>h("button",{class:"chip",text:e+" "+n,onclick:()=>{Store.put("habits",newHabit({name:n,emoji:e,color:COLORS[i%COLORS.length]}));toast("Added "+n);}}))))));
  }else{
    if(due.length)main.append(h("div",{class:"sec"},bar(doneN/due.length)));
    const list=h("div",{class:"cards grid sec"});
    const days=Array.from({length:7},(_,i)=>addDays(now,i-6));
    hs.forEach(hb=>{
      const isDue=habitDue(hb,now),on=!!(hb.log&&hb.log[tk]),st=streak(hb);
      const big=h("button",{class:"hbig"+(on?" on":"")+(!isDue&&!on?" off":""),"aria-label":(on?"Undo today: ":"Done today: ")+hb.name,"aria-pressed":String(on),onclick:()=>{toggleHabit(hb,tk);if(!on&&navigator.vibrate)navigator.vibrate(15);}});big.innerHTML=CHECK;
      list.append(h("div",{class:"hcard",style:"--c:"+hb.color},
        h("div",{class:"htop"},h("div",{class:"hemo",text:hb.emoji}),h("button",{class:"hname",onclick:()=>openHabit(hb)},h("b",{text:hb.name}),h("span",{text:(st?"🔥 "+plural(st,"day")+" streak":"No streak yet")+(isDue?"":", rest day today")})),big),
        h("div",{class:"week7"},days.map(d=>{const k=key(d),o=!!(hb.log&&hb.log[k]),du=habitDue(hb,d),before=k<habitStart(hb);
          return h("div",null,h("small",{text:d.toLocaleDateString(undefined,{weekday:"narrow"})}),h("button",{class:"hd"+(o?" on":"")+(!du&&!o?" na":"")+(before&&!o?" fut":""),"aria-label":d.toLocaleDateString(undefined,{weekday:"long",day:"numeric"})+(o?", done":", not done"),onclick:()=>toggleHabit(hb,k)}));}))));
    });
    main.append(list);
  }
  main.append(h("div",{class:"btnrow"},h("button",{class:"btn primary wide",text:"+ New habit",onclick:()=>openHabit(null)})));
}
function openHabit(hb){
  const isNew=!hb;const d=clone(hb||newHabit({color:COLORS[vals("habits").length%COLORS.length]}));
  const name=h("input",{class:"inp title",value:d.name,placeholder:"e.g. Walk 10,000 steps","aria-label":"Habit name"});
  const emo=h("div",{class:"emojis"});const drawE=()=>{emo.textContent="";HABIT_EMOJI.forEach(e=>emo.append(h("button",{type:"button","aria-pressed":String(e===d.emoji),text:e,onclick:()=>{d.emoji=e;drawE();}})));};drawE();
  const sw=h("div",{class:"swatches"});const drawS=()=>{sw.textContent="";COLORS.forEach(c=>sw.append(h("button",{type:"button",class:"sw",style:"background:"+c,"aria-label":"Colour","aria-pressed":String(c===d.color),onclick:()=>{d.color=c;drawS();}})));};drawS();
  const dayBox=h("div",{class:"row"});
  const order=[1,2,3,4,5,6,0];
  const drawD=()=>{dayBox.textContent="";const every=!d.days.length;
    dayBox.append(h("button",{type:"button",class:"chip","aria-pressed":String(every),text:"Every day",onclick:()=>{d.days=[];drawD();}}));
    order.forEach(n=>{const on=!every&&d.days.includes(n);dayBox.append(h("button",{type:"button",class:"chip","aria-pressed":String(on),text:new Date(2024,0,7+n).toLocaleDateString(undefined,{weekday:"short"}),onclick:()=>{if(every)d.days=[n];else if(on)d.days=d.days.filter(x=>x!==n);else d.days=[...d.days,n];if(d.days.length===7)d.days=[];drawD();}}));});};drawD();
  let statsEl=null;
  if(!isNew){
    const cells=[];const end=new Date(),start=addDays(weekStart(end),-7*11);const hs=habitStart(d);
    for(let i=0;i<84;i++){const x=addDays(start,i),k=key(x);const cls=k>todayKey()||k<hs?"none":d.log&&d.log[k]?"on":habitDue(d,x)&&k<todayKey()?"miss":"";cells.push(h("i",{class:cls,title:k}));}
    statsEl=h("div",{class:"field",style:"--c:"+d.color},h("span",{class:"lbl",text:"Last 12 weeks"}),h("div",{class:"heat","aria-hidden":"true"},cells),
      h("div",{class:"stats"},h("div",{class:"stat"},h("b",{text:streak(d)}),h("span",{text:"Current streak"})),h("div",{class:"stat"},h("b",{text:bestStreak(d)}),h("span",{text:"Best streak"})),h("div",{class:"stat"},h("b",{text:Math.round(habitRate(d,30)*100)+"%"}),h("span",{text:"Last 30 days"}))));
  }
  const save=h("button",{class:"btn primary",text:isNew?"Add habit":"Save"}),cancel=h("button",{class:"btn ghost",text:"Cancel"});
  const del=isNew?null:h("button",{class:"btn danger",text:"Delete"});
  const close=openSheet([h("h3",{text:isNew?"New habit":"Edit habit"}),name,statsEl,
    h("div",{class:"field"},h("span",{class:"lbl",text:"Which days"}),dayBox),
    h("div",{class:"field"},h("span",{class:"lbl",text:"Icon"}),emo),
    h("div",{class:"field"},h("span",{class:"lbl",text:"Colour"}),sw),
    h("div",{class:"actions"},del,cancel,save)]);
  cancel.onclick=close;
  if(del)del.onclick=()=>{const prev=snap("habits",d.id);Store.del("habits",d.id);close();undoable("Habit deleted",[["habits",prev,d.id]]);};
  save.onclick=()=>{d.name=name.value.trim();if(!d.name){name.focus();toast("Give the habit a name.");return;}Store.put("habits",d);close();};
  if(isNew)setTimeout(()=>name.focus(),60);
}

/* ================= notes & journal ================= */
const MOODS=[["1","😞","Rough"],["2","😕","Meh"],["3","😐","Okay"],["4","🙂","Good"],["5","😄","Great"]];
const moodOf=v=>MOODS.find(m=>m[0]===String(v));
function newNote(p){return Object.assign({id:uid(),type:"note",title:"",body:"",pinned:false,createdAt:Date.now(),updatedAt:Date.now()},p);}
function snippet(s,n){s=(s||"").replace(/\s+/g," ").trim();return s.length>n?s.slice(0,n)+"…":s;}
function ago(ts){const d=new Date(ts);return key(d)===todayKey()?d.toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"}):d.toLocaleDateString(undefined,{day:"numeric",month:"short",year:d.getFullYear()===new Date().getFullYear()?undefined:"numeric"});}

function renderNotes(main){
  const notes=vals("notes");
  const nn=notes.filter(n=>n.type!=="journal"),jj=notes.filter(n=>n.type==="journal").sort((a,b)=>a.date<b.date?1:-1);
  setHeader(UI.notesSeg==="journal"?"Journal":"Notes",UI.notesSeg==="journal"?plural(jj.length,"entry").replace("entrys","entries"):plural(nn.length,"note"));
  main.append(h("div",{class:"calbar"},seg([["notes","Notes"],["journal","Journal"]],UI.notesSeg,v=>{UI.notesSeg=v;render();}),
    h("button",{class:"jump",text:"Export",onclick:()=>{if(UI.notesSeg==="journal"){openJournalExport();return;}const cf=curFolder(),list=notesInView(nn,cf);
      openExport(list.sort((a,b)=>b.updatedAt-a.updatedAt).map(noteDoc),cf?D.folders.get(cf).name:"My notes",cf?D.folders.get(cf).name:"notes");}})));
  if(UI.notesSeg==="notes")renderNoteFolder(main,nn);
  else{
    const tk=todayKey(),today=D.notes.get("j-"+tk);
    let jst=0;for(let i=0;i<400;i++){const k=key(addDays(new Date(),-i));if(D.notes.has("j-"+k))jst++;else if(i>0)break;}
    const m=today&&moodOf(today.mood);
    main.append(h("div",{class:"sec"},h("button",{class:"ncard",style:"padding:18px",onclick:()=>openJournal(tk)},
      h("b",{style:"font-family:var(--display);font-size:19px",text:today?(m?m[1]+" ":"")+"Today's entry":"How was today?"}),
      h("p",{text:today?snippet(today.body,160)||"Tap to keep writing.":"Tap to write today's entry. A few lines is plenty."}),
      jst?h("div",{class:"small muted",text:"✍️ "+plural(jst,"day")+" in a row"}):null)));
    const past=jj.filter(j=>j.date!==tk);
    if(past.length){
      let curM="";const box=h("div",{class:"cards"});
      past.slice(0,120).forEach(j=>{const mk=j.date.slice(0,7);if(mk!==curM){curM=mk;box.append(h("div",{class:"sgroup",style:"margin:10px 2px 0",text:fromKey(j.date).toLocaleDateString(undefined,{month:"long",year:"numeric"})}));}
        const mm=moodOf(j.mood);box.append(h("button",{class:"ncard",onclick:()=>openJournal(j.date)},h("b",{text:(mm?mm[1]+" ":"")+fromKey(j.date).toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"})}),j.body?h("p",{text:snippet(j.body,140)}):null));});
      main.append(h("section",{class:"sec"},h("div",{class:"sec-h"},h("h2",{text:"Past entries"})),box));
    }
  }
}
function noteDoc(n){return{title:n.title||"Untitled",meta:"Last edited "+new Date(n.updatedAt).toLocaleString(),body:n.body||""};}
function journalDoc(j){const m=moodOf(j.mood);return{title:longDate(j.date),meta:m?"Mood: "+m[2]:"",body:j.body||""};}

/* ================= note folders ================= */
// A folder is {id,name,parentId,color}. A note's folderId points at one; "" (or a deleted folder) means top level.
const byName=(a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:"base",numeric:true});
const folderKids=pid=>vals("folders").filter(f=>(D.folders.has(f.parentId)?f.parentId:"")===(pid||"")).sort(byName);
function folderPath(id){const out=[];let f=D.folders.get(id);while(f&&out.length<50&&!out.includes(f)){out.unshift(f);f=D.folders.get(f.parentId);}return out;}
const folderLabel=id=>folderPath(id).map(f=>f.name).join(" › ");
function folderTree(id){const out=new Set([id]);let grew=true;while(grew){grew=false;for(const f of D.folders.values())if(out.has(f.parentId)&&!out.has(f.id)){out.add(f.id);grew=true;}}return out;} // the folder and everything inside it
const noteFolderOf=n=>n.folderId&&D.folders.has(n.folderId)?n.folderId:"";
function curFolder(){if(UI.noteFolder&&!D.folders.has(UI.noteFolder))UI.noteFolder="";return UI.noteFolder;}
function notesInView(nn,cf){if(!UI.noteDeep)return nn.filter(n=>noteFolderOf(n)===cf);if(!cf)return nn;const t=folderTree(cf);return nn.filter(n=>t.has(noteFolderOf(n)));}
function openFolder(id){UI.noteFolder=id||"";lsSet("planner.noteFolder",UI.noteFolder);folderPath(id).forEach(f=>UI.folderOpen.add(f.parentId||""));render();window.scrollTo(0,0);}
function renderNoteFolder(main,nn){
  const cf=curFolder(),f=cf&&D.folders.get(cf),path=folderPath(cf);
  const crumbs=h("nav",{class:"crumbs","aria-label":"Folders"},h("button",{text:"All notes","aria-current":cf?"false":"page",onclick:()=>openFolder("")}),
    path.map((p,i)=>[h("span",{class:"sep","aria-hidden":"true",text:"›"}),h("button",{text:p.name,"aria-current":i===path.length-1?"page":"false",onclick:()=>openFolder(p.id)})]));
  const top=h("div",{class:"fbar"},crumbs,f?h("button",{class:"x fmenu","aria-label":"Folder options",text:"⋯",onclick:()=>openFolderMenu(f)}):null);
  const count=id=>{const t=folderTree(id);return nn.filter(n=>t.has(noteFolderOf(n))).length;};
  const kids=folderKids(cf);
  const tiles=h("div",{class:"ftiles"},kids.map(k=>{const c=count(k.id);return h("button",{class:"ftile",style:"--c:"+(k.color||COLORS[0]),onclick:()=>openFolder(k.id)},h("i",{"aria-hidden":"true",text:"📁"}),h("b",{text:k.name}),h("span",{text:c?plural(c,"note"):"Empty"}));}),
    h("button",{class:"ftile fnew",onclick:()=>openFolderEdit(null,cf)},h("i",{"aria-hidden":"true",text:"＋"}),h("b",{text:"Folder"}),h("span",{text:cf?"Inside "+f.name:"New folder"})));
  const deep=h("label",{class:"deepsw"},h("input",{type:"checkbox",checked:UI.noteDeep,"aria-label":cf?"Include subfolders":"Show notes from all folders",onchange:e=>{UI.noteDeep=e.target.checked;lsSet("planner.noteDeep",UI.noteDeep?"1":"0");render();}}),h("span",{text:cf?"Include subfolders":"Show notes from all folders"}));
  const list=notesInView(nn,cf).sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0)||b.updatedAt-a.updatedAt);
  const body=h("div",{class:"fmain"},top,tiles,h("div",{class:"frow"},deep),h("div",{class:"btnrow",style:"margin-top:10px"},h("button",{class:"btn primary wide",text:"+ New note",onclick:()=>openNote(null)})));
  if(!list.length)body.append(h("div",{class:"sec"},h("div",{class:"empty",text:nn.length?(cf?"No notes in "+f.name+" yet.":UI.noteDeep?"No notes yet.":"No notes outside folders. Open a folder above, or switch on “Show notes from all folders”."):"No notes yet. Ideas, lists, links, anything. Tip: share text from any app to Planner to save it here."})));
  else{
    const shown=UI.expanded.has("notes")?list:list.slice(0,40);
    body.append(h("div",{class:"cards grid sec nlist"},shown.map(n=>{const nf=noteFolderOf(n);return h("button",{class:"ncard",onclick:()=>openNote(n)},h("b",{text:(n.pinned?"📌 ":"")+(n.title||"Untitled")}),n.body?h("p",{text:snippet(n.body,160)}):null,
      h("div",{class:"small muted",text:(nf!==cf&&nf?"📁 "+folderLabel(nf)+" · ":"")+"Edited "+ago(n.updatedAt)}));})));
    if(shown.length<list.length)body.append(h("button",{class:"linkbtn",text:"Show all "+list.length,onclick:()=>{UI.expanded.add("notes");render();}}));
  }
  if(!UI.desktop){main.append(body);return;}
  main.append(h("div",{class:"flayout"},folderTreeNav(cf),body));
}
function folderTreeNav(cf){
  const box=h("nav",{class:"ftree","aria-label":"Folder tree"});
  const row=(id,name,depth,hasKids)=>h("div",{class:"frow2",style:"--d:"+depth},
    hasKids&&id?h("button",{class:"ftog","aria-expanded":String(UI.folderOpen.has(id)),"aria-label":(UI.folderOpen.has(id)?"Collapse ":"Expand ")+name,text:"›",onclick:()=>{UI.folderOpen.has(id)?UI.folderOpen.delete(id):UI.folderOpen.add(id);render();}}):h("span",{class:"ftog"}),
    h("button",{class:"fname","aria-current":id===cf?"page":"false",text:name,onclick:()=>openFolder(id)}));
  UI.folderOpen.add("");box.append(row("","All notes",0,folderKids("").length>0));
  const walk=(pid,depth)=>{if(!UI.folderOpen.has(pid))return;folderKids(pid).forEach(k=>{box.append(row(k.id,k.name,depth,folderKids(k.id).length>0));walk(k.id,depth+1);});};
  walk("",1);return box;
}
function openFolderEdit(f,parentId){
  const isNew=!f;const d=f?clone(f):{id:uid(),name:"",parentId:parentId||"",color:COLORS[vals("folders").length%COLORS.length],createdAt:Date.now()};
  const name=h("input",{class:"inp",value:d.name,maxlength:"60",placeholder:"e.g. Work, Recipes, Uni","aria-label":"Folder name"});
  const sw=h("div",{class:"swatches",style:"margin-top:8px"});
  const drawSw=()=>{sw.textContent="";COLORS.forEach(c=>sw.append(h("button",{type:"button",class:"sw",style:"background:"+c,"aria-label":"Colour","aria-pressed":String(c===d.color),onclick:()=>{d.color=c;drawSw();}})));};drawSw();
  const save=h("button",{class:"btn primary",text:isNew?"Create":"Save"});
  const close=openSheet([h("h3",{text:isNew?(d.parentId?"New folder in "+D.folders.get(d.parentId).name:"New folder"):"Rename folder"}),name,h("div",{class:"field"},h("span",{class:"lbl",text:"Colour"}),sw),
    h("div",{class:"actions"},h("button",{class:"btn ghost",text:"Cancel",onclick:()=>close()}),save)]);
  save.onclick=()=>{const n=name.value.trim().replace(/\s+/g," ");if(!n){name.focus();toast("Give the folder a name.");return;}d.name=n;Store.put("folders",d);close();};
  name.addEventListener("keydown",e=>{if(e.key==="Enter")save.click();});
  setTimeout(()=>name.focus(),60);
}
// Folder picker: shows the tree; "exclude" folders can't be chosen (a folder can't go inside itself).
function pickFolder(title,current,exclude,onPick){
  const list=h("div",{class:"fpick"});
  const opt=(id,label,depth)=>list.append(h("button",{type:"button",style:"--d:"+depth,"aria-pressed":String(id===current),disabled:exclude.has(id),onclick:()=>{close();onPick(id);}},label));
  opt("",current===undefined?"Top level":"📁 No folder (top level)",0);
  const walk=(pid,depth)=>folderKids(pid).forEach(k=>{opt(k.id,"📁 "+k.name,depth);walk(k.id,depth+1);});walk("",1);
  if(current!==undefined&&!D.folders.size)list.append(h("p",{class:"small muted",text:"No folders yet. Create one from the Notes page with + Folder."}));
  const close=openSheet([h("h3",{text:title}),list,h("div",{class:"actions"},h("button",{class:"btn ghost",text:"Cancel",onclick:()=>close()}))]);
}
function openFolderMenu(f){
  const act=(label,fn)=>h("button",{class:"mi",onclick:()=>{close();fn();}},h("b",{text:label}));
  const close=openSheet([h("h3",{text:"📁 "+f.name}),h("div",{class:"menu alist"},
    act("Rename or change colour",()=>openFolderEdit(f)),
    act("Move to another folder",()=>{const ex=folderTree(f.id);if(!f.parentId)ex.add("");pickFolder("Move “"+f.name+"” to…",undefined,ex,to=>{Store.put("folders",Object.assign(clone(f),{parentId:to}));openFolder(f.id);toast("Moved to "+(to?D.folders.get(to).name:"the top level"));});}),
    act("Delete folder",()=>deleteFolder(f)))]);
}
function deleteFolder(f){
  const t=folderTree(f.id),notes=vals("notes").filter(n=>n.type!=="journal"&&t.has(noteFolderOf(n))),subs=t.size-1,parent=D.folders.has(f.parentId)?f.parentId:"";
  const what=[notes.length?plural(notes.length,"note"):"",subs?plural(subs,"subfolder"):""].filter(Boolean).join(" and ");
  const done=changes=>{if(t.has(UI.noteFolder))openFolder(parent);else render();return changes;};
  const keep=()=>{const ch=[];
    for(const k of folderKids(f.id)){ch.push(["folders",snap("folders",k.id),k.id]);Store.put("folders",Object.assign(clone(k),{parentId:parent}));}
    for(const n of vals("notes"))if(n.type!=="journal"&&noteFolderOf(n)===f.id){ch.push(["notes",snap("notes",n.id),n.id]);Store.put("notes",Object.assign(clone(n),{folderId:parent}));}
    ch.push(["folders",snap("folders",f.id),f.id]);Store.del("folders",f.id);undoable("Folder deleted. Its contents moved up.",done(ch));};
  const all=()=>{const ch=[];
    for(const n of notes){ch.push(["notes",snap("notes",n.id),n.id]);Store.del("notes",n.id);}
    for(const id of t){ch.push(["folders",snap("folders",id),id]);Store.del("folders",id);}
    undoable("Deleted "+f.name+(what?" and "+what:""),done(ch));};
  if(!what){close0();return;}
  function close0(){const ch=[["folders",snap("folders",f.id),f.id]];Store.del("folders",f.id);undoable("Folder deleted",done(ch));}
  const close=openSheet([h("h3",{text:"Delete “"+f.name+"”?"}),h("p",{class:"muted",text:"It has "+what+" inside. What should happen to them?"}),
    h("div",{class:"menu alist"},h("button",{class:"mi",onclick:()=>{close();keep();}},h("b",{text:"Keep the notes"}),h("span",{text:"Move everything up to "+(parent?D.folders.get(parent).name:"the top level")})),
      h("button",{class:"mi",onclick:()=>{close();all();}},h("b",{style:"color:var(--danger)",text:"Delete everything inside"}),h("span",{text:"Deletes "+what}))),
    h("div",{class:"actions"},h("button",{class:"btn ghost",text:"Cancel",onclick:()=>close()}))]);
}

function editorSheet({titleVal,titlePh,bodyVal,bodyPh,head,extra,onChange,onClose,exportFn,deleteFn}){
  const status=h("span",{class:"saved",text:""});
  const title=titlePh!=null?h("input",{class:"note-title",value:titleVal||"",placeholder:titlePh,"aria-label":"Title"}):null;
  const body=h("textarea",{class:"note-body",placeholder:bodyPh,"aria-label":"Text"});body.value=bodyVal||"";
  const saveNow=debounce(()=>{onChange({title:title?title.value:undefined,body:body.value});status.textContent="Saved";},600);
  const changed=()=>{status.textContent="Saving…";saveNow();};
  if(title)title.addEventListener("input",changed);body.addEventListener("input",changed);
  const done=h("button",{class:"btn primary",style:"padding:8px 16px",text:"Done"});
  let deleted=false;
  const tools=h("div",{class:"row"},exportFn?h("button",{class:"chip",text:"Export",onclick:()=>{saveNow.flush();exportFn();}}):null,deleteFn?h("button",{class:"chip",text:"Delete",onclick:()=>{saveNow.flush();saveNow.cancel();deleted=true;close();deleteFn();}}):null);
  const close=openSheet([h("div",{class:"shead"},h("div",{style:"min-width:0"},head,status),done),extra||null,title,body,h("div",{style:"padding-top:10px"},tools)],{full:true,onClose:()=>{if(deleted)return;saveNow.flush();onClose&&onClose();}});
  done.onclick=close;
  return {title,body,close,changed};
}
function openNote(n){
  let cur=n?clone(n):null,folderId=cur?noteFolderOf(cur):(UI.tab==="notes"?curFolder():"");
  const pin=h("button",{class:"chip","aria-pressed":String(!!(cur&&cur.pinned)),text:"📌 Pin"});
  const fchip=h("button",{class:"chip fchip",title:"Move to a folder"});
  const drawF=()=>{fchip.textContent="📁 "+(folderId?folderLabel(folderId):"No folder");};drawF();
  fchip.onclick=()=>pickFolder("Move note to…",folderId,new Set(),id=>{folderId=id;drawF();if(cur){cur.folderId=id;Store.put("notes",cur);}});
  const ed=editorSheet({titleVal:cur&&cur.title,titlePh:"Title",bodyVal:cur&&cur.body,bodyPh:"Start writing…",
    head:h("b",{style:"font-family:var(--display);font-size:18px;display:block",text:n?"Note":"New note"}),
    extra:h("div",{class:"row",style:"margin-bottom:6px"},pin,fchip),
    onChange:({title,body})=>{if(!cur){if(!title.trim()&&!body.trim())return;cur=newNote({folderId});}cur.title=title;cur.body=body;cur.updatedAt=Date.now();Store.put("notes",cur);},
    onClose:()=>{if(cur&&!cur.title.trim()&&!cur.body.trim())Store.del("notes",cur.id);},
    exportFn:()=>{if(cur)openExport([noteDoc(cur)],cur.title||"Note",(cur.title||"note"));else toast("Write something first.");},
    deleteFn:()=>{if(cur&&D.notes.has(cur.id)){const prev=snap("notes",cur.id);Store.del("notes",cur.id);undoable("Note deleted",[["notes",prev,cur.id]]);}}});
  pin.onclick=()=>{if(!cur){toast("Write something first.");return;}cur.pinned=!cur.pinned;pin.setAttribute("aria-pressed",String(cur.pinned));Store.put("notes",Object.assign(cur,{updatedAt:Date.now()}));};
  if(!n)setTimeout(()=>ed.body.focus(),80);
}
function openJournal(k){
  const id="j-"+k;let cur=D.notes.has(id)?clone(D.notes.get(id)):null;
  const moods=h("div",{class:"moods",role:"group","aria-label":"Mood"});
  const drawM=()=>{moods.textContent="";MOODS.forEach(([v,e,l])=>moods.append(h("button",{type:"button","aria-pressed":String(!!cur&&String(cur.mood)===v),onclick:()=>{cur=cur||newNote({id,type:"journal",date:k,body:ed.body.value});cur.mood=v;cur.updatedAt=Date.now();Store.put("notes",cur);drawM();}},e,h("small",{text:l}))));};
  const ed=editorSheet({bodyVal:cur&&cur.body,bodyPh:"What happened today? What went well? What are you grateful for?",
    head:h("b",{style:"font-family:var(--display);font-size:18px;display:block",text:k===todayKey()?"Today":fromKey(k).toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"})}),
    extra:h("div",{style:"margin:4px 0 10px"},moods),
    onChange:({body})=>{if(!cur){if(!body.trim())return;cur=newNote({id,type:"journal",date:k});}cur.body=body;cur.updatedAt=Date.now();Store.put("notes",cur);},
    onClose:()=>{if(cur&&!cur.body.trim()&&!cur.mood)Store.del("notes",id);},
    exportFn:()=>{if(cur)openExport([journalDoc(cur)],"Journal: "+longDate(k),"journal-"+k);else toast("Write something first.");},
    deleteFn:()=>{if(D.notes.has(id)){const prev=snap("notes",id);Store.del("notes",id);undoable("Entry deleted",[["notes",prev,id]]);}}});
  drawM();
  if(!cur)setTimeout(()=>ed.body.focus(),80);
}
function openJournalExport(){
  const all=vals("notes").filter(n=>n.type==="journal").sort((a,b)=>a.date<b.date?-1:1);
  if(!all.length){toast("No journal entries yet.");return;}
  const tk=todayKey();let range="month";
  const ranges={month:["This month",j=>j.date.slice(0,7)===tk.slice(0,7)],three:["Last 3 months",j=>j.date>=key(addDays(new Date(),-92))],year:["This year",j=>j.date.slice(0,4)===tk.slice(0,4)],all:["Everything",()=>true]};
  const close=openSheet([h("h3",{text:"Export journal"}),h("div",{class:"field"},h("span",{class:"lbl",text:"Which entries"}),chips(Object.entries(ranges).map(([k,v])=>[k,v[0]]),range,v=>{range=v;})),
    h("div",{class:"actions"},h("button",{class:"btn ghost",text:"Cancel",onclick:()=>close()}),h("button",{class:"btn primary",text:"Next",onclick:()=>{const list=all.filter(ranges[range][1]);if(!list.length){toast("No entries in that range.");return;}close();openExport(list.map(journalDoc),"My journal","journal-"+range);}}))]);
}
function openExport(docs,docTitle,fileBase){
  if(!docs.length){toast("Nothing to export yet.");return;}
  const fname=(fileBase||"export").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,50)||"export";
  const status=h("div",{class:"small muted",style:"min-height:20px;margin-top:10px"});
  const go=async(fmt,btn)=>{btn.disabled=true;status.textContent="Preparing your file…";
    try{const blob=fmt==="pdf"?await makePdf(docs,docTitle):await makeDocx(docs,docTitle);download(blob,fname+"."+fmt);status.textContent="Downloaded "+fname+"."+fmt;}
    catch(e){console.error(e);status.textContent=navigator.onLine?"Something went wrong making the file. Try again.":"Connect to the internet once so the exporter can load, then try again.";}
    btn.disabled=false;};
  const pdf=h("button",{class:"btn primary wide",text:"PDF"}),docx=h("button",{class:"btn primary wide",text:"Word (.docx)"});
  pdf.onclick=()=>go("pdf",pdf);docx.onclick=()=>go("docx",docx);
  openSheet([h("h3",{text:"Export "+plural(docs.length,"page")}),h("p",{class:"small muted",text:"PDF works best for English text. Choose Word if you've used emoji or other alphabets."}),h("div",{class:"btnrow"},pdf,docx),status]);
}
function pdfSafe(s){return String(s).replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"').replace(/[\u2013\u2014]/g,"-").replace(/\u2026/g,"...").replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u00FF]/g,"");}
async function makePdf(docs,docTitle){
  await loadScript(JSPDF);const {jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:"pt",format:"a4"});const W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight(),M=56;let y=M;
  const ensure=hh=>{if(y+hh>H-M){doc.addPage();y=M;}};
  doc.setTextColor(22,48,43);doc.setFont("helvetica","bold");doc.setFontSize(22);doc.text(pdfSafe(docTitle),M,y+6);y+=34;
  docs.forEach((e,i)=>{
    if(i>0){y+=10;ensure(30);doc.setDrawColor(210);doc.line(M,y,W-M,y);y+=24;}
    doc.setFont("helvetica","bold");doc.setFontSize(15);doc.setTextColor(22,48,43);
    doc.splitTextToSize(pdfSafe(e.title),W-2*M).forEach(l=>{ensure(20);doc.text(l,M,y);y+=20;});
    if(e.meta){doc.setFont("helvetica","normal");doc.setFontSize(10);doc.setTextColor(110);ensure(16);doc.text(pdfSafe(e.meta),M,y);y+=20;}
    doc.setFont("helvetica","normal");doc.setFontSize(11.5);doc.setTextColor(30);
    (e.body||"").split("\n").forEach(par=>{const lines=par.trim()?doc.splitTextToSize(pdfSafe(par),W-2*M):[""];lines.forEach(l=>{ensure(16);doc.text(l,M,y);y+=16;});});
  });
  return doc.output("blob");
}
async function makeDocx(docs,docTitle){
  await loadScript(JSZIP);const zip=new window.JSZip();
  const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,"");
  const p=(text,o)=>{o=o||{};return `<w:p><w:pPr><w:spacing w:after="${o.after==null?120:o.after}"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>${o.b?"<w:b/>":""}${o.color?`<w:color w:val="${o.color}"/>`:""}<w:sz w:val="${o.sz||23}"/></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;};
  let body=p(docTitle,{b:1,sz:40,after:240,color:"16302B"});
  docs.forEach(e=>{body+=p(e.title,{b:1,sz:30,after:60,color:"16302B"});if(e.meta)body+=p(e.meta,{sz:20,color:"6B6B6B",after:160});(e.body||"").split("\n").forEach(par=>body+=p(par,{after:80}));body+=p("",{after:240});});
  zip.file("[Content_Types].xml",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file("_rels/.rels",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file("word/document.xml",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+body+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>');
  return zip.generateAsync({type:"blob",mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
}
