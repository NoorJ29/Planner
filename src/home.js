/* ================= home dashboard ================= */
const WIDGETS=[
  ["today","✅","Today's tasks"],["next","🕒","Next up"],["habits","🔥","Habits"],["focus","⏱️","Focus timer"],
  ["money","💰","Money this month"],["bills","🔁","Upcoming bills"],["countdowns","🎉","Countdowns"],["journal","✍️","Journal"],
  ["goals","🎯","Goals"],["links","🔗","Quick links"],["shopping","🛒","Shopping list"],["week","📊","This week"],["note","📌","Pinned note"]];
const WMAP=Object.fromEntries(WIDGETS.map(w=>[w[0],w]));
const DEFAULT_DASH=[["today","full"],["next","full"],["habits","full"],["focus","compact"],["money","compact"],["countdowns","full"],["journal","compact"],["bills","compact"],["links","full"],["goals","off"],["shopping","off"],["week","off"],["note","off"]];
function dashConfig(){
  const cur=Array.isArray(SET.dashboard)&&SET.dashboard.length?SET.dashboard:DEFAULT_DASH.map(([id,size])=>({id,size}));
  const seen=new Set(cur.map(w=>w.id));const out=cur.filter(w=>WMAP[w.id]).map(w=>({id:w.id,size:w.size}));
  DEFAULT_DASH.forEach(([id])=>{if(!seen.has(id))out.push({id,size:"off"});});return out;
}
function greeting(){const hr=new Date().getHours();return hr<5?"Good night":hr<12?"Good morning":hr<18?"Good afternoon":"Good evening";}
function wcard(id,size,body,go){const [,icon,name]=WMAP[id];
  return h("section",{class:"wdg "+size,"data-w":id},h("div",{class:"wdh"},h("span",{class:"wdi",text:icon}),h("b",{text:name}),go?h("button",{class:"wdgo","aria-label":"Open "+name,text:"›",onclick:go}):null),body);}
function stat(big,small,onclick){return h(onclick?"button":"div",{class:"wstat",onclick},h("b",{text:big}),h("span",{text:small}));}
function nextUp(limit){
  const now=new Date(),nowK=todayKey(),nowT=pad(now.getHours())+":"+pad(now.getMinutes()),tom=key(addDays(now,1));const out=[];
  [nowK,tom].forEach(k=>{(IDX.byDate[k]||[]).filter(t=>!t.done&&t.time&&(k>nowK||t.time>=nowT)).forEach(t=>out.push({k,time:t.time,title:t.title,task:t}));
    gcalEventsOn(k).filter(e=>!e.allDay&&(k>nowK||e.end>=nowT)).forEach(e=>out.push({k,time:e.time,title:e.title,ev:e}));});
  return out.sort((a,b)=>(a.k+a.time)<(b.k+b.time)?-1:1).slice(0,limit);
}
const W={
  today(size){const items=(IDX.byDate[todayKey()]||[]).slice().sort(sortTasks),done=items.filter(t=>t.done).length,open=items.filter(t=>!t.done);
    const over=vals("tasks").filter(t=>!t.done&&t.date&&t.date<todayKey()).length;
    if(size==="compact")return stat(String(open.length),open.length===1?"task left today":"tasks left today"+(over?", "+over+" overdue":""),()=>goTab("plan"));
    return h("div",null,items.length?h("div",{class:"small muted",style:"margin-bottom:8px",text:done+" of "+items.length+" done"+(over?", "+over+" overdue":"")}):null,items.length?bar(done/items.length):null,
      open.length?h("ul",{class:"tasks",style:"margin-top:10px"},open.slice(0,5).map(t=>taskRow(t,{compact:!UI.desktop}))):h("p",{class:"muted small",text:items.length?"All done for today. Nice!":"Nothing planned today."}),
      open.length>5?h("button",{class:"linkbtn",text:"+"+(open.length-5)+" more",onclick:()=>goTab("plan")}):null);},
  next(size){const n=nextUp(size==="compact"?1:4);
    if(size==="compact")return n.length?stat(fmtTime(n[0].time),n[0].title,()=>goTab("plan")):stat("–","Nothing else scheduled");
    return n.length?h("div",{class:"nlist"},n.map(x=>h(x.ev?"a":"button",x.ev?{class:"nrow",href:x.ev.link,target:"_blank",rel:"noopener noreferrer"}:{class:"nrow",onclick:()=>openTask(x.task)},h("span",{class:"ntime",text:(x.k===todayKey()?"":"Tmrw ")+fmtTime(x.time)}),h("span",{class:"ntitle",text:x.title}),x.ev&&UI.desktop?h("span",{class:"small muted",text:"Google"}):null))):h("p",{class:"muted small",text:"Nothing else scheduled today or tomorrow."});},
  habits(size){const now=new Date(),tk=todayKey(),hs=vals("habits").filter(x=>!x.archived&&habitDue(x,now)),d=hs.filter(x=>x.log&&x.log[tk]).length;
    if(size==="compact")return stat(d+"/"+hs.length,"habits done today",()=>goTab("habits"));
    if(!hs.length)return h("p",{class:"muted small",text:"No habits due today."});
    return h("div",{class:"hmini"},hs.map(hb=>{const on=!!(hb.log&&hb.log[tk]);const b=h("button",{class:"hbig"+(on?" on":""),style:"--c:"+hb.color,"aria-label":(on?"Undo ":"Done: ")+hb.name,onclick:()=>toggleHabit(hb,tk)});b.innerHTML=CHECK;return h("div",{class:"hm"},b,h("span",{text:hb.emoji+" "+hb.name}));}));},
  focus(size){const st=focusState(),today=focusToday();
    if(size==="compact")return stat(st&&!st.done?mmss(focusRemaining(st)):hmins(today),st&&!st.done?(st.paused?"paused":"left in session"):"focused today",()=>openFocus());
    return h("div",{class:"row",style:"justify-content:space-between"},h("div",null,h("b",{style:"font-family:var(--display);font-size:26px",text:hmins(today)}),h("div",{class:"small muted",text:"focused today"})),h("button",{class:"btn primary",text:st?"Open timer":"Start focusing",onclick:()=>openFocus()}));},
  money(size){const mk=todayKey().slice(0,7),tx=monthTxns(mk).filter(x=>x.type!=="income"),spent=tx.reduce((a,x)=>a+Number(x.amount||0),0),b=Number(SET.budget)||0;
    if(size==="compact")return stat(money(spent),b?money(b-spent)+" left":"spent this month",()=>goTab("money"));
    return h("div",null,h("div",{class:"bigamt",style:"font-size:30px",text:money(spent)}),b?h("div",{style:"margin:8px 0 6px",class:"small muted",text:money(Math.max(0,b-spent))+" left of "+money(b)}):null,b?bar(spent/b,spent>b):null,
      h("div",{class:"row",style:"margin-top:12px"},h("button",{class:"btn primary",text:"+ Add expense",onclick:()=>openExpense(null)})));},
  bills(size){const soon=key(addDays(new Date(),30)),up=vals("subs").filter(s=>!s.paused&&s.nextDate&&s.nextDate<=soon).sort((a,b)=>a.nextDate<b.nextDate?-1:1);
    if(size==="compact")return up.length?stat(relLabel(up[0].nextDate),up[0].name+", "+money(up[0].amount),()=>goTab("money")):stat("–","No bills due soon",()=>goTab("money"));
    return up.length?h("div",{class:"box"},up.slice(0,4).map(s=>h("button",{class:"txn",onclick:()=>openSub(s)},h("span",{class:"em",text:s.emoji||"🔁"}),h("span",{class:"mid"},h("b",{text:s.name}),h("span",{class:"small muted",text:relLabel(s.nextDate)})),h("span",{class:"amt",text:money(s.amount)})))):h("p",{class:"muted small",text:"No bills in the next 30 days."});},
  countdowns(size){const c=countdownsSorted().filter(x=>x.days>=0);
    if(size==="compact")return c.length?stat(c[0].days===0?"Today":c[0].days+"d",c[0].emoji+" "+c[0].title,()=>openCountdown(c[0])):stat("–","No countdowns",()=>{UI.tab="more";UI.page="countdowns";render();});
    return c.length?h("div",{class:"cards"},c.slice(0,3).map(x=>cdCard(x,true))):h("p",{class:"muted small",text:"Nothing to count down to yet."});},
  journal(size){const j=D.notes.get("j-"+todayKey()),m=j&&moodOf(j.mood);
    if(size==="compact")return stat(m?m[1]:"✍️",j?"Today's entry written":"Write today's entry",()=>openJournal(todayKey()));
    return h("div",null,h("div",{class:"moods"},MOODS.map(([v,e,l])=>h("button",{"aria-pressed":String(!!j&&String(j.mood)===v),onclick:()=>{const cur=D.notes.get("j-"+todayKey())||newNote({id:"j-"+todayKey(),type:"journal",date:todayKey()});Store.put("notes",Object.assign(clone(cur),{mood:v,updatedAt:Date.now()}));}},e,h("small",{text:l})))),
      h("button",{class:"linkbtn",text:j&&j.body?"Keep writing today's entry":"Write today's entry",onclick:()=>openJournal(todayKey())}));},
  goals(size){const g=vals("goals").filter(x=>!x.done);
    if(size==="compact"){const avg=g.length?g.reduce((a,x)=>a+goalProgress(x).pct,0)/g.length:0;return stat(g.length?Math.round(avg*100)+"%":"–",g.length?"average across "+plural(g.length,"goal"):"No goals yet",()=>{UI.tab="more";UI.page="goals";render();});}
    return g.length?h("div",{class:"glist"},g.slice(0,4).map(x=>{const p=goalProgress(x);return h("button",{class:"grow",onclick:()=>openGoal(x)},h("span",{class:"row",style:"justify-content:space-between"},h("b",{text:"🎯 "+x.title}),h("span",{class:"small muted",text:Math.round(p.pct*100)+"%"})),bar(p.pct));})):h("p",{class:"muted small",text:"No active goals."});},
  links(size){const ls=vals("links").sort((a,b)=>(b.visits||0)-(a.visits||0)||(a.name||"").localeCompare(b.name||"")).slice(0,size==="compact"?4:8);
    return ls.length?h("div",{class:"lgrid wlinks"},ls.map(linkTile)):h("p",{class:"muted small",text:"Save websites in Links and your favourites show here."});},
  shopping(size){const L=SET.shopLists.find(l=>l.id===UI.shopList)||SET.shopLists[0],its=vals("shop").filter(i=>i.listId===L.id&&!i.done);
    if(size==="compact")return stat(String(its.length),"left on "+L.name,()=>{UI.tab="more";UI.page="shopping";render();});
    return its.length?h("ul",{class:"tasks"},its.slice(0,6).map(it=>{const cb=h("button",{class:"check","aria-label":"Bought "+it.name,onclick:()=>Store.put("shop",Object.assign(clone(it),{done:true}))});cb.innerHTML=CHECK;return h("li",{class:"task"},cb,h("div",{class:"tbody"},h("span",{class:"ttitle",text:it.name}),it.qty?h("span",{class:"meta",text:it.qty}):null));})):h("p",{class:"muted small",text:L.name+" is empty."});},
  week(size){const ws=weekStart(new Date()),counts=Array.from({length:7},(_,i)=>{const k=key(addDays(ws,i));let n=0;for(const t of D.tasks.values())if(t.done&&t.doneAt&&key(new Date(t.doneAt))===k)n++;return n;});const tot=counts.reduce((a,b)=>a+b,0);
    if(size==="compact")return stat(String(tot),"tasks done this week",()=>{UI.tab="more";UI.page="review";render();});
    const wdl=Array.from({length:7},(_,i)=>new Date(2024,0,1+i).toLocaleDateString(undefined,{weekday:"narrow"}));
    return h("div",null,h("div",{class:"small muted",text:plural(tot,"task")+" done this week, "+hmins(vals("focus").filter(f=>f.date>=key(ws)).reduce((a,f)=>a+(f.minutes||0),0))+" focused"}),svgBars(counts,wdl,{h:90,hi:(new Date().getDay()+6)%7,fmt:v=>plural(v,"task")}));},
  note(size){const n=vals("notes").filter(x=>x.pinned&&x.type!=="journal").sort((a,b)=>b.updatedAt-a.updatedAt)[0];
    if(!n)return h("p",{class:"muted small",text:"Pin a note and it shows here."});
    return h("button",{class:"ncard",style:"border:0;padding:0;background:none",onclick:()=>openNote(n)},h("b",{text:n.title||"Untitled"}),h("p",{text:snippet(n.body,size==="compact"?60:220)}));},
};
const WGO={today:()=>goTab("plan"),next:()=>goTab("plan"),habits:()=>goTab("habits"),money:()=>goTab("money"),bills:()=>goTab("money"),links:()=>goTab("links"),journal:()=>{UI.notesSeg="journal";goTab("notes");},
  countdowns:()=>{UI.tab="more";UI.page="countdowns";render();},goals:()=>{UI.tab="more";UI.page="goals";render();},shopping:()=>{UI.tab="more";UI.page="shopping";render();},week:()=>{UI.tab="more";UI.page="insights";render();},focus:()=>openFocus(),note:()=>{UI.notesSeg="notes";goTab("notes");}};
function renderHome(main){
  const d=new Date();setHeader(greeting(),d.toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"}));
  const chip=gcalStaleChip();
  if(chip)main.append(h("div",{class:"row",style:"margin-top:14px"},chip)); // Customise is the sliders button next to search
  const grid=h("div",{class:"dash"});
  dashConfig().filter(w=>w.size!=="off").forEach(w=>{try{grid.append(wcard(w.id,w.size,W[w.id](w.size),WGO[w.id]));}catch(e){console.error(e);}});
  if(!grid.children.length)grid.append(h("div",{class:"empty",style:"grid-column:1/-1",text:"Your home screen is empty. Tap the sliders button at the top to add widgets."}));
  main.append(grid);
  gcalEnsure(todayKey().slice(0,7));
}
function openDashEditor(){
  let draft=dashConfig();const box=h("div");
  const draw=()=>{box.textContent="";draft.forEach((w,i)=>{const [,icon,name]=WMAP[w.id];
    box.append(h("div",{class:"dashrow"+(w.size==="off"?" off":"")},h("span",{class:"wdi",text:icon}),h("b",{text:name}),
      seg([["off","Off"],["compact","Small"],["full","Large"]],w.size,v=>{w.size=v;draw();}),
      h("span",{class:"arrows"},h("button",{type:"button",class:"x","aria-label":"Move up",text:"↑",disabled:i===0,onclick:()=>{draft.splice(i-1,0,draft.splice(i,1)[0]);draw();}}),h("button",{type:"button",class:"x","aria-label":"Move down",text:"↓",disabled:i===draft.length-1,onclick:()=>{draft.splice(i+1,0,draft.splice(i,1)[0]);draw();}}))));});};
  draw();
  const save=h("button",{class:"btn primary",text:"Save"}),cancel=h("button",{class:"btn ghost",text:"Cancel"});
  const close=openSheet([h("h3",{text:"Customise your home screen"}),h("p",{class:"small muted",style:"margin:0 0 6px",text:"Choose what to show and how big. Small shows one key number; Large shows the details. Use the arrows to reorder."}),box,
    h("button",{class:"linkbtn",text:"Reset to default",onclick:()=>{draft=DEFAULT_DASH.map(([id,size])=>({id,size}));draw();}}),h("div",{class:"actions"},cancel,save)]);
  cancel.onclick=close;save.onclick=()=>{Store.settings({dashboard:draft});close();toast("Home screen updated");};
}

/* ================= menu layout (phone bottom bar & laptop sidebar) ================= */
// Home is always first and More always last; in between, any sections or More pages, in your order.
const NAV_CHOICES=[["plan","Plan"],["habits","Habits"],["notes","Notes"],["money","Money"],["links","Links"]];
const NAV_LAYOUTS={phone:{key:"navPhone",max:4,def:["plan","habits","notes","money"],title:"Bottom bar (phone)"},desk:{key:"navDesk",max:0,def:["plan","habits","notes","money","links"],title:"Sidebar (laptop)"}};
function navPinnable(){return[...NAV_CHOICES,...MENU.flatMap(g=>g[1]).map(k=>[k,k==="focus"?"Focus timer":PAGES[k][1]])];}
const navName=id=>id==="home"?"Home":id==="more"?"More":id==="focus"?"Focus":((navPinnable().find(c=>c[0]===id)||[])[1]||id);
function navIcon(id){return ICONS[id]?ico(id):h("span",{class:"ico emo",text:id==="focus"?"⏱️":(PAGES[id]||["•"])[0]});}
function navValid(v,max){const ok=navPinnable().map(c=>c[0]);return Array.isArray(v)&&v.every(x=>ok.includes(x))&&new Set(v).size===v.length&&(max?v.length===max:true);}
function navLayout(which){const L=NAV_LAYOUTS[which],v=SET[L.key];if(navValid(v,L.max))return v.slice();
  if(which==="phone"){try{const old=JSON.parse(lsGet("planner.nav","null"));if(navValid(old,4))return old;}catch(e){}} // older per-device choice
  return L.def.slice();}
const navFull=which=>["home",...navLayout(which),"more"];
function goNav(id){if(id==="focus"){openFocus();return;}if(TABS.some(t=>t[0]===id)){goTab(id);return;}UI.tab="more";UI.page=id;UI.sharedList=null;if(id!=="links")UI.linkEdit=false;render();window.scrollTo(0,0);}
function openNavEditor(which){
  which=which==="desk"?"desk":"phone";const L=NAV_LAYOUTS[which];let pick=navLayout(which);const box=h("div"),preview=h("p",{class:"small navprev"});
  const draw=()=>{box.textContent="";preview.textContent=["Home",...pick.map(navName),"More"].join(" · ");
    box.append(h("div",{class:"dashrow"},h("span",{class:"wdi"},ico("home")),h("b",{text:"Home"}),h("span",{class:"small muted",text:"Always first"})));
    pick.forEach((id,i)=>{const nm=navName(id);box.append(h("div",{class:"dashrow"},h("span",{class:"wdi"},navIcon(id)),h("b",{text:nm}),h("span",{class:"arrows"},
      h("button",{type:"button",class:"x","aria-label":"Move "+nm+" up",text:"↑",disabled:i===0,onclick:()=>{pick.splice(i-1,0,pick.splice(i,1)[0]);draw();}}),h("button",{type:"button",class:"x","aria-label":"Move "+nm+" down",text:"↓",disabled:i===pick.length-1,onclick:()=>{pick.splice(i+1,0,pick.splice(i,1)[0]);draw();}}),
      h("button",{type:"button",class:"x","aria-label":"Remove "+nm,text:"×",onclick:()=>{pick.splice(i,1);draw();}}))));});
    box.append(h("div",{class:"dashrow"},h("span",{class:"wdi"},ico("more")),h("b",{text:"More"}),h("span",{class:"small muted",text:"Always last"})));
    const rest=navPinnable().filter(c=>!pick.includes(c[0])),full=L.max&&pick.length>=L.max;
    if(rest.length)box.append(h("div",{class:"field"},h("span",{class:"lbl",text:L.max?(pick.length<L.max?"Add "+(L.max-pick.length)+" more":"Remove one to add another"):"Add to the sidebar"}),
      h("div",{class:"row"},rest.map(([id,nm])=>h("button",{type:"button",class:"chip",disabled:!!full,text:"+ "+nm,onclick:()=>{pick.push(id);draw();}})))));
    save.disabled=!!L.max&&pick.length!==L.max;};
  const save=h("button",{class:"btn primary",text:"Save"}),cancel=h("button",{class:"btn ghost",text:"Cancel"});
  const close=openSheet([h("h3",{text:which==="phone"?"Bottom bar":"Sidebar"}),
    h("p",{class:"small muted",style:"margin:0 0 6px",text:(which==="phone"?"Pick the 4 pages you use most, in the order you want them.":"Pick the pages to show in the laptop sidebar, in your order. Number keys 1 to 9 follow this order.")+" Everything else stays one tap away in More."+(Store.user?" Saved to your account.":"")}),
    preview,box,h("div",{class:"actions"},cancel,save)]);
  draw();cancel.onclick=close;save.onclick=()=>{Store.settings({[L.key]:pick});buildNav();close();render();};
}
