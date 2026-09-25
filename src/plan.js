/* ================= tasks: data ================= */
const REPEATS=[["","Never"],["daily","Daily"],["weekdays","Weekdays"],["weekly","Weekly"],["monthly","Monthly"],["yearly","Yearly"]];
const REPEAT_LABEL=Object.fromEntries(REPEATS);
const REMINDS=[["","No reminder"],["0","At the time"],["5","5 min before"],["15","15 min before"],["30","30 min before"],["60","1 hour before"],["1440","1 day before"]];
const DURS=[15,30,45,60,90,120,180,240];
const durLabel=m=>m<60?m+" min":(m%60?(m/60).toFixed(1).replace(".0","")+" hr":(m/60)+" hr"+(m>60?"s":""));

function newTask(p){return Object.assign({id:uid(),title:"",date:null,time:"",duration:30,listId:SET.lists[0]?SET.lists[0].id:"",priority:0,notes:"",done:false,createdAt:Date.now(),repeat:"",remind:"",subtasks:[],goalId:""},p);}
function nextDate(k,r){
  const step=x=>{const d=fromKey(x);
    if(r==="daily")return key(addDays(d,1));
    if(r==="weekdays"){let y=addDays(d,1);while(y.getDay()===0||y.getDay()===6)y=addDays(y,1);return key(y);}
    if(r==="weekly")return key(addDays(d,7));
    const months=r==="yearly"?12:1;const y=new Date(d.getFullYear(),d.getMonth()+months,1);
    y.setDate(Math.min(d.getDate(),new Date(y.getFullYear(),y.getMonth()+1,0).getDate()));return key(y);};
  let n=step(k),guard=0;const tk=todayKey();
  while(n<tk&&guard++<800)n=step(n);
  return n;
}
function completeTask(t){
  const prev=snap("tasks",t.id)||clone(t);
  if(!t.done&&navigator.vibrate)navigator.vibrate(12);
  if(!t.done&&t.repeat&&t.date){
    const nd=nextDate(t.date,t.repeat),cid=uid();
    Store.put("tasks",Object.assign(clone(t),{id:cid,done:true,doneAt:Date.now(),repeat:"",remind:"",repeatOf:t.id}));
    Store.put("tasks",Object.assign(clone(t),{date:nd,subtasks:(t.subtasks||[]).map(s=>Object.assign({},s,{done:false}))}));
    undoable("Done. Next one: "+relLabel(nd),[["tasks",null,cid],["tasks",prev,t.id]]);
  }else{
    Store.put("tasks",Object.assign(clone(t),{done:!t.done,doneAt:!t.done?Date.now():null}));
    if(!t.done)undoable("Nice, “"+snippetT(t.title)+"” done",[["tasks",prev,t.id]]);
  }
}
const snippetT=s=>s.length>28?s.slice(0,27)+"…":s;
function sortTasks(a,b){if(a.done!==b.done)return a.done?1:-1;const at=a.time||"99",bt=b.time||"99";if(at!==bt)return at<bt?-1:1;if((b.priority||0)!==(a.priority||0))return(b.priority||0)-(a.priority||0);return(a.createdAt||0)-(b.createdAt||0);}

/* index built once per render */
let IDX={byDate:{},open:{},focus:null};
const taskFocus=id=>{if(!IDX.focus)IDX.focus=focusByTask();return IDX.focus[id]||0;};
function buildIndex(){IDX.focus=null;const byDate={},open={};for(const t of D.tasks.values()){if(t.date){(byDate[t.date]||(byDate[t.date]=[])).push(t);if(!t.done)open[t.date]=(open[t.date]||0)+1;}}IDX={byDate,open};}

/* ================= tasks: UI ================= */
function taskRow(t,opts){
  opts=opts||{};const l=listById(t.listId);const c=l?l.color:"var(--muted)";
  const cb=h("button",{class:"check",style:"--c:"+c,"aria-label":(t.done?"Mark not done: ":"Mark done: ")+t.title,onclick:()=>completeTask(t)});cb.innerHTML=CHECK;
  const meta=[];
  if(opts.showDate&&t.date){const late=!t.done&&t.date<todayKey();meta.push(h("span",{class:late?"late":"",text:relLabel(t.date)}));}
  if(t.time)meta.push(h("span",{text:fmtTime(t.time)}));
  if(l&&!opts.hideList)meta.push(h("span",{text:l.name}));
  if(t.repeat)meta.push(h("span",{text:"↻ "+REPEAT_LABEL[t.repeat]}));
  if(t.subtasks&&t.subtasks.length)meta.push(h("span",{text:"☑ "+t.subtasks.filter(s=>s.done).length+"/"+t.subtasks.length}));
  if(t.remind!==""&&t.remind!=null&&!t.done)meta.push(h("span",{text:"🔔","aria-label":"Reminder set"}));
  {const fm=taskFocus(t.id);if(fm)meta.push(h("span",{text:"⏱ "+hmins(fm)}));}
  if(t.goalId&&D.goals.has(t.goalId))meta.push(h("span",{text:"🎯 "+D.goals.get(t.goalId).title}));
  return h("li",{class:"task"+(t.done?" done":"")},cb,
    h("button",{class:"tbody",onclick:()=>openTask(t)},h("span",{class:"ttitle",text:t.title}),meta.length?h("span",{class:"meta"},meta):null),
    t.priority?h("span",{class:"pri"+(t.priority===2?" p2":""),title:t.priority===2?"Urgent":"Important",text:t.priority===2?"!!":"!"}):null);
}
function section(title,items,opts){
  opts=opts||{};
  const head=h("div",{class:"sec-h"+(opts.cls?" "+opts.cls:"")},h("h2",null,opts.dot?h("span",{class:"ldot",style:"background:"+opts.dot}):null,title),opts.right||(items?h("span",{class:"n",text:String(items.filter(t=>!t.done).length)}):null));
  const LIMIT=25,ek=title+"|"+(opts.dot||"");const all=items||[];const shown=all.length>LIMIT&&!UI.expanded.has(ek)?all.slice(0,LIMIT):all;
  const body=all.length?h("ul",{class:"tasks"},shown.map(t=>taskRow(t,opts))):h("div",{class:"empty",text:opts.empty||"Nothing here."});
  const more=shown.length<all.length?h("button",{class:"linkbtn",text:"Show all "+all.length,onclick:()=>{UI.expanded.add(ek);render();}}):null;
  return h("section",{class:"sec"},head,opts.progress||null,body,more);
}
function gcalUrl(t){
  const f=x=>key(x).replace(/-/g,"")+"T"+pad(x.getHours())+pad(x.getMinutes())+"00";let dates;
  if(t.time){const [H,M]=t.time.split(":").map(Number);const s=fromKey(t.date);s.setHours(H,M,0,0);const e=new Date(s.getTime()+(t.duration||30)*60000);dates=f(s)+"/"+f(e);}
  else dates=t.date.replace(/-/g,"")+"/"+key(addDays(fromKey(t.date),1)).replace(/-/g,"");
  let rr="";if(t.repeat){const m={daily:"DAILY",weekdays:"WEEKLY;BYDAY=MO,TU,WE,TH,FR",weekly:"WEEKLY",monthly:"MONTHLY",yearly:"YEARLY"}[t.repeat];rr="&recur="+encodeURIComponent("RRULE:FREQ="+m);}
  let tz="";try{tz="&ctz="+encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone);}catch(e){}
  return "https://calendar.google.com/calendar/render?action=TEMPLATE&text="+encodeURIComponent(t.title)+"&dates="+dates+"&details="+encodeURIComponent(t.notes||"")+rr+tz;
}

function openTask(t,preset){
  const isNew=!t||!D.tasks.has(t.id);
  const d=clone(t||newTask(Object.assign({date:UI.tab==="plan"&&UI.planView==="lists"?null:UI.sel},preset||{})));
  const title=h("input",{class:"inp title",value:d.title,placeholder:"What needs doing?","aria-label":"Task title"});
  const date=h("input",{class:"inp",type:"date",value:d.date||"","aria-label":"Date"});
  const time=h("input",{class:"inp",type:"time",value:d.time||"","aria-label":"Time"});
  const dur=h("select",{class:"inp","aria-label":"How long"},DURS.map(m=>h("option",{value:m,selected:(d.duration||30)===m},durLabel(m))));
  const durRow=h("div",{class:"row",style:"margin-top:8px"},h("span",{class:"lbl-in",text:"Lasts"}),dur);
  const remind=h("select",{class:"inp","aria-label":"Reminder"},REMINDS.map(([v,l])=>h("option",{value:v,selected:String(d.remind??"")===v},l)));
  const remindNote=h("div",{class:"small muted",style:"margin-top:6px"});
  const sync=()=>{durRow.hidden=!time.value;remindNote.textContent=!date.value&&remind.value!==""?"Pick a date so the reminder knows when to go off.":(!time.value&&remind.value!==""?"No time set, so it's based on 9:00 AM.":"");};
  time.addEventListener("input",sync);date.addEventListener("input",sync);remind.addEventListener("change",sync);
  const dchips=[["Today",todayKey()],["Tomorrow",key(addDays(new Date(),1))],["Next week",key(addDays(weekStart(new Date()),7))],["No date",""]].map(([lab,v])=>h("button",{type:"button",class:"chip",text:lab,onclick:()=>{date.value=v;sync();}}));
  let repeat=d.repeat||"",listId=d.listId,pri=d.priority||0;
  let subs=(d.subtasks||[]).map(s=>Object.assign({},s));
  const subBox=h("div");
  const drawSubs=()=>{subBox.textContent="";subs.forEach((s,i)=>{const cb=h("button",{type:"button",class:"check sm"+(s.done?" on":""),"aria-label":(s.done?"Untick ":"Tick ")+s.text,onclick:()=>{s.done=!s.done;drawSubs();}});cb.innerHTML=CHECK;
    subBox.append(h("div",{class:"subrow"},cb,h("input",{class:"inp sub",value:s.text,"aria-label":"Step",oninput:e=>{s.text=e.target.value;}}),h("button",{type:"button",class:"x","aria-label":"Remove step",text:"×",onclick:()=>{subs.splice(i,1);drawSubs();}})));});};
  drawSubs();
  const subNew=h("input",{class:"inp sub",placeholder:"Add a step, then press Enter","aria-label":"New step"});
  const addSub=()=>{const v=subNew.value.trim();if(v){subs.push({id:uid(),text:v,done:false});subNew.value="";drawSubs();}};
  subNew.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addSub();}});
  const goals=vals("goals").filter(g=>!g.done||g.id===d.goalId);
  const goal=h("select",{class:"inp","aria-label":"Goal"},h("option",{value:""},"No goal"),goals.map(g=>h("option",{value:g.id,selected:g.id===d.goalId},g.title)));
  const notes=h("textarea",{class:"inp",placeholder:"Details, links, anything else…","aria-label":"Notes"});notes.value=d.notes||"";
  const gcal=h("button",{type:"button",class:"linkbtn",text:"📅 Add to Google Calendar (for a guaranteed alarm)"});
  const save=h("button",{class:"btn primary",text:isNew?"Add task":"Save"});
  const cancel=h("button",{class:"btn ghost",text:"Cancel"});
  const del=isNew?null:h("button",{class:"btn danger",text:"Delete"});
  const collect=()=>Object.assign(d,{title:title.value.trim(),date:date.value||null,time:time.value||"",duration:Number(dur.value)||30,listId,priority:pri,notes:notes.value.trim(),repeat:date.value?repeat:"",remind:remind.value,subtasks:subs.filter(s=>s.text.trim()),goalId:goal.value});
  const close=openSheet([
    h("div",{class:"shead"},h("h3",{text:isNew?"New task":"Edit task"}),isNew?null:h("div",{class:"row"},taskFocus(d.id)?h("span",{class:"small muted",text:"⏱ "+hmins(taskFocus(d.id))}):null,h("button",{type:"button",class:"chip",text:"▶ Focus",onclick:()=>{close();openFocus(D.tasks.get(d.id));}}))),title,
    h("div",{class:"field"},h("span",{class:"lbl",text:"When"}),h("div",{class:"row"},date,time),h("div",{class:"row",style:"margin-top:8px"},dchips),durRow),
    h("div",{class:"field"},h("span",{class:"lbl",text:"Repeat"}),chips(REPEATS,repeat,v=>{repeat=v;})),
    h("div",{class:"field"},h("label",{text:"Reminder"}),remind,remindNote),
    h("div",{class:"field"},h("span",{class:"lbl",text:"Checklist"}),subBox,subNew),
    h("div",{class:"field"},h("span",{class:"lbl",text:"List"}),chips(SET.lists.map(l=>[l.id,l.name,l.color]),listId,v=>{listId=v;})),
    h("div",{class:"field"},h("span",{class:"lbl",text:"Priority"}),chips([[0,"Normal"],[1,"Important"],[2,"Urgent"]],pri,v=>{pri=Number(v);})),
    goals.length?h("div",{class:"field"},h("label",{text:"Goal"}),goal):null,
    h("div",{class:"field"},h("label",{text:"Notes"}),notes),
    h("div",{class:"field row",style:"justify-content:space-between"},gcal,h("button",{type:"button",class:"linkbtn",text:"Save as template",onclick:()=>{addSub();collect();if(!d.title){toast("Give the task a title first.");return;}Store.put("templates",{id:uid(),name:d.title,emoji:"📋",kind:"task",items:(d.subtasks||[]).map(s=>s.text).filter(Boolean),createdAt:Date.now()});toast("Saved as a template");}})),
    h("div",{class:"actions"},del,cancel,save)
  ]);
  sync();
  cancel.onclick=close;
  gcal.onclick=async()=>{addSub();collect();if(!d.date){toast("Pick a date first.");return;}if(!d.title){toast("Give the task a title first.");return;}
    if(!gcalOn()){window.open(gcalUrl(d),"_blank","noopener");return;}
    gcal.disabled=true;gcal.textContent="Adding to Google Calendar…";
    try{const ev=await gcalPushTask(d);d.gcalId=ev.id;if(D.tasks.has(d.id))Store.put("tasks",Object.assign(clone(D.tasks.get(d.id)),{gcalId:ev.id}));toast(d.gcalId?"Saved to Google Calendar":"Added to Google Calendar",ev.htmlLink?{label:"Open",fn:()=>window.open(ev.htmlLink,"_blank","noopener")}:null);gcal.textContent="✓ In Google Calendar";}
    catch(e){console.error(e);toast("Couldn't reach Google Calendar. Try again.");gcal.textContent="📅 Add to Google Calendar";}gcal.disabled=false;};
  if(d.gcalId)gcal.textContent="📅 Update in Google Calendar";else if(gcalOn())gcal.textContent="📅 Add to Google Calendar";
  if(del)del.onclick=()=>{const prev=snap("tasks",d.id);Store.del("tasks",d.id);close();undoable("Task deleted",[["tasks",prev,d.id]]);};
  save.onclick=()=>{addSub();collect();if(!d.title){title.focus();toast("Give the task a title first.");return;}if(d.remind!==""&&!Notify.on())toast("Saved. Turn on notifications in More, then Settings, to get reminders.");Store.put("tasks",d);close();};
  title.addEventListener("keydown",e=>{if(e.key==="Enter")save.click();});
  if(isNew)setTimeout(()=>title.focus(),60);
  return title;
}

function openLists(){
  let draft=SET.lists.map(l=>Object.assign({},l));
  const box=h("div");
  const draw=()=>{box.textContent="";draft.forEach((l,i)=>{
    const sw=h("div",{class:"swatches",style:"margin-top:8px"},COLORS.map(c=>h("button",{type:"button",class:"sw",style:"background:"+c,"aria-label":"Colour","aria-pressed":String(c===l.color),onclick:()=>{l.color=c;draw();}})));
    box.append(h("div",{class:"field"},h("div",{class:"listrow"},h("input",{class:"inp",value:l.name,"aria-label":"List name",oninput:e=>{l.name=e.target.value;}}),draft.length>1?h("button",{type:"button",class:"x","aria-label":"Remove "+l.name,text:"×",onclick:()=>{draft.splice(i,1);draw();}}):null),sw));});};
  draw();
  const save=h("button",{class:"btn primary",text:"Save lists"}),cancel=h("button",{class:"btn ghost",text:"Cancel"});
  const close=openSheet([h("h3",{text:"Task lists"}),box,h("div",{style:"margin-top:14px"},h("button",{class:"linkbtn",text:"+ Add a list",onclick:()=>{draft.push({id:uid(),name:"New list",color:COLORS[draft.length%COLORS.length]});draw();}})),h("p",{class:"small muted",text:"Removing a list keeps its tasks. They move to “No list”."}),h("div",{class:"actions"},cancel,save)]);
  cancel.onclick=close;
  save.onclick=()=>{Store.settings({lists:draft.map(l=>({id:l.id,name:l.name.trim()||"Untitled",color:l.color}))});close();};
}

/* ================= planner tab ================= */
function pickDay(k){UI.sel=k;UI.month=k.slice(0,7);if(UI.planView!=="schedule")UI.planView="day";render();}
const WEEKDAYS=Array.from({length:7},(_,i)=>new Date(2024,0,1+i).toLocaleDateString(undefined,{weekday:"narrow"}));

function renderPlan(main){
  const d=fromKey(UI.sel),tk=todayKey(),pv=UI.planView;
  if(pv==="day"||pv==="schedule")setHeader(UI.sel===tk?"Today":d.toLocaleDateString(undefined,{weekday:"long"}),d.toLocaleDateString(undefined,{weekday:UI.sel===tk?"long":undefined,day:"numeric",month:"long",year:"numeric"}));
  else{const open=vals("tasks").filter(t=>!t.done).length;setHeader(pv==="upcoming"?"Upcoming":"Lists",plural(open,"open task"));}
  const jump=h("button",{class:"jump",text:"Today",onclick:()=>{UI.stripScroll=null;UI.month=tk.slice(0,7);pickDay(tk);}});
  const cal=h("div",{class:"pcal"}),list=h("div",{class:"plist"});
  cal.append(h("div",{class:"calbar"},seg([["week","Week"],["month","Month"]],UI.cal,v=>{UI.cal=v;lsSet("planner.cal",v);UI.month=UI.sel.slice(0,7);UI.stripScroll=null;render();}),jump));
  cal.append(UI.cal==="week"?renderStrip():renderMonth());
  list.append(h("nav",{class:"tabs",role:"tablist"},[["day","Day"],["schedule","Schedule"],["upcoming","Upcoming"],["lists","Lists"]].map(([v,l])=>h("button",{role:"tab","aria-selected":String(pv===v),text:l,onclick:()=>{UI.planView=v;render();}}))));
  if(pv==="day")renderDay(list);else if(pv==="schedule")renderSchedule(list);else if(pv==="upcoming")renderUpcoming(list);else renderLists(list);
  main.append(h("div",{class:"pgrid"},list,cal));
  gcalEnsure(UI.month);if(UI.cal==="week"&&UI.month!==todayKey().slice(0,7))gcalEnsure(todayKey().slice(0,7));
}
function renderStrip(){
  const strip=h("div",{class:"strip",role:"listbox","aria-label":"Pick a day"});
  const t0=new Date(),tk=todayKey();
  for(let i=-7;i<=28;i++){
    const d=addDays(t0,i),k=key(d),cnt=(IDX.open[k]||0)+gcalEventsOn(k).length,n=Math.min(cnt,3);
    strip.append(h("button",{class:"day"+(k===tk?" today":"")+(k===UI.sel?" sel":"")+(k<tk?" past":""),role:"option","aria-selected":String(k===UI.sel),"data-k":k,"aria-label":d.toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"})+(cnt?", "+cnt+" open":""),onclick:()=>pickDay(k)},
      h("span",{class:"wd",text:d.toLocaleDateString(undefined,{weekday:"short"})}),h("span",{class:"dn",text:d.getDate()}),h("span",{class:"dots"},Array.from({length:n},()=>h("b")))));
  }
  strip.addEventListener("scroll",()=>{UI.stripScroll=strip.scrollLeft;},{passive:true});
  requestAnimationFrame(()=>{if(UI.stripScroll!=null)strip.scrollLeft=UI.stripScroll;else{const el=strip.querySelector('[data-k="'+UI.sel+'"]');if(el)strip.scrollLeft=el.offsetLeft-strip.clientWidth/2+el.clientWidth/2;UI.stripScroll=strip.scrollLeft;}});
  return h("div",{class:"strip-row"},strip);
}
function shiftMonth(n){const [y,m]=UI.month.split("-").map(Number);const d=new Date(y,m-1+n,1);UI.month=d.getFullYear()+"-"+pad(d.getMonth()+1);render();}
function renderMonth(){
  const [y,mo]=UI.month.split("-").map(Number);
  const first=new Date(y,mo-1,1),dim=new Date(y,mo,0).getDate();
  const offset=(first.getDay()+6)%7,rows=Math.ceil((offset+dim)/7),start=addDays(first,-offset),tk=todayKey();
  let openN=0,lateN=0;const cells=[];
  for(let i=0;i<rows*7;i++){
    const d=addDays(start,i),k=key(d),inMonth=d.getMonth()===mo-1;
    const items=IDX.byDate[k]||[];const open=items.filter(t=>!t.done);
    if(inMonth){openN+=open.length;if(k<tk)lateN+=open.length;}
    const dots=open.slice(0,3).map(t=>{const l=listById(t.listId);return h("b",{style:"background:"+(l?l.color:"var(--muted)")});});
    const evn=gcalEventsOn(k).length;
    const marks=open.length?[dots,open.length>3?h("i",{text:"+"+(open.length-3)}):null,evn?h("b",{class:"evdot"}):null]:(items.length?h("span",{class:"mdone",text:"✓"}):evn?h("b",{class:"evdot"}):null);
    cells.push(h("button",{class:"mc"+(inMonth?"":" out")+(items.length?" has":"")+(k===tk?" today":"")+(k===UI.sel?" sel":"")+(open.length&&k<tk?" late":""),"aria-label":d.toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"})+(open.length?", "+open.length+" to do":items.length?", all done":""),"aria-current":k===tk?"date":null,onclick:()=>pickDay(k)},
      h("span",{class:"num",text:d.getDate()}),h("span",{class:"mdots"},marks)));
  }
  const box=h("div",{class:"month"},
    h("div",{class:"mhead"},h("button",{class:"mnav","aria-label":"Previous month",text:"‹",onclick:()=>shiftMonth(-1)}),h("h2",{text:first.toLocaleDateString(undefined,{month:"long",year:"numeric"})}),h("button",{class:"mnav","aria-label":"Next month",text:"›",onclick:()=>shiftMonth(1)})),
    h("div",{class:"mgrid"},WEEKDAYS.map(w=>h("div",{class:"mwd","aria-hidden":"true",text:w})),cells),
    h("div",{class:"msum",text:openN?plural(openN,"open task")+" this month"+(lateN?", "+lateN+" overdue":""):"Nothing planned this month yet."}));
  let x0=null,y0=0;
  box.addEventListener("touchstart",e=>{x0=e.touches[0].clientX;y0=e.touches[0].clientY;},{passive:true});
  box.addEventListener("touchend",e=>{if(x0==null)return;const dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;x0=null;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5)shiftMonth(dx<0?1:-1);},{passive:true});
  return box;
}
function overdueSection(){const tk=todayKey();const over=vals("tasks").filter(t=>!t.done&&t.date&&t.date<tk).sort((a,b)=>a.date<b.date?-1:1);return over.length?section("Overdue",over,{cls:"overdue",showDate:true}):null;}
function dayExtras(main){
  const chip=gcalStaleChip();if(chip)main.append(h("div",{style:"margin-top:14px"},chip));
  const cds=countdownsSorted().filter(c=>c.next===UI.sel);
  if(cds.length)main.append(h("div",{class:"row",style:"margin-top:14px"},cds.map(c=>h("button",{class:"chip cdchip",style:"--c:"+(c.color||COLORS[0]),onclick:()=>openCountdown(c),text:(c.emoji||"🎉")+" "+c.title}))));
}
function renderDay(main){
  dayExtras(main);
  const evs=gcalEventsOn(UI.sel);
  if(evs.length)main.append(h("section",{class:"sec"},h("div",{class:"sec-h"},h("h2",{text:"Calendar"}),h("span",{class:"n",text:plural(evs.length,"event")})),h("div",{class:"box"},evs.map(evRow))));
  if(UI.sel===todayKey()){const o=overdueSection();if(o)main.append(o);}
  const items=(IDX.byDate[UI.sel]||[]).slice().sort(sortTasks);
  const done=items.filter(t=>t.done).length;
  main.append(section(UI.sel===todayKey()?"To do today":"Planned",items,{progress:items.length?bar(done/items.length):null,right:items.length?h("span",{class:"n",text:done+" of "+items.length+" done"}):null,empty:"Nothing planned. Type below to add a task for "+relLow(UI.sel)+"."}));
}
function renderUpcoming(main){
  const tk=todayKey();const open=vals("tasks").filter(t=>!t.done);
  {const o=overdueSection();if(o)main.append(o);}
  const byDate={};open.filter(t=>t.date&&t.date>=tk).forEach(t=>(byDate[t.date]=byDate[t.date]||[]).push(t));
  const keys=Object.keys(byDate).sort();
  if(!keys.length&&!main.querySelector(".overdue"))main.append(h("div",{class:"sec"},h("div",{class:"empty",text:"No dated tasks coming up. Add one and give it a date."})));
  keys.slice(0,60).forEach(k=>main.append(section(relLabel(k),byDate[k].sort(sortTasks),{})));
  const some=open.filter(t=>!t.date).sort(sortTasks);
  if(some.length)main.append(section("Someday",some,{}));
}
function renderLists(main){
  const all=vals("tasks");
  SET.lists.forEach(l=>{
    const items=all.filter(t=>t.listId===l.id&&!t.done).sort((a,b)=>{const ad=a.date||"9999",bd=b.date||"9999";return ad!==bd?(ad<bd?-1:1):sortTasks(a,b);});
    main.append(section(l.name,items,{dot:l.color,hideList:true,showDate:true,empty:"No open tasks in "+l.name+"."}));
  });
  const orphan=all.filter(t=>!t.done&&!listById(t.listId));
  if(orphan.length)main.append(section("No list",orphan.sort(sortTasks),{showDate:true}));
  const doneN=all.filter(t=>t.done).length;
  const clear=h("button",{class:"linkbtn danger",text:"Delete "+plural(doneN,"finished task"),onclick:()=>{const gone=all.filter(t=>t.done);const ch=gone.map(t=>["tasks",clone(t),t.id]);gone.forEach(t=>Store.del("tasks",t.id));undoable("Deleted "+plural(gone.length,"finished task"),ch);}});
  main.append(h("div",{class:"sec row",style:"justify-content:space-between"},h("button",{class:"linkbtn",text:"Edit lists",onclick:openLists}),doneN?clear:null));
}

/* time-blocked schedule */
const HOUR=56;
function renderSchedule(main){
  const items=IDX.byDate[UI.sel]||[];
  const timed=items.filter(t=>t.time).map(t=>{const [H,M]=t.time.split(":").map(Number);const s=H*60+M;return{t,s,e:Math.min(s+Math.max(15,t.duration||30),24*60)};}).sort((a,b)=>a.s-b.s||b.e-a.e);
  const untimed=items.filter(t=>!t.time&&!t.done).sort(sortTasks);
  dayExtras(main);
  const dayEvs=gcalEventsOn(UI.sel),allDayEvs=dayEvs.filter(e=>e.allDay);
  const evBlocks=dayEvs.filter(e=>!e.allDay).map(ev=>{const [H,M]=ev.time.split(":").map(Number);const s=H*60+M;return{ev,s,e:Math.min(s+ev.mins,24*60)};});
  const all=timed.concat(evBlocks).sort((a,b)=>a.s-b.s||b.e-a.e);
  let startH=7,endH=22;all.forEach(x=>{startH=Math.min(startH,Math.floor(x.s/60));endH=Math.max(endH,Math.ceil(x.e/60));});endH=Math.min(endH,24);
  let cluster=[],cEnd=-1;
  const flush=()=>{const cols=[];cluster.forEach(x=>{let i=cols.findIndex(end=>end<=x.s);if(i<0){i=cols.length;cols.push(0);}cols[i]=x.e;x.col=i;});cluster.forEach(x=>x.cols=cols.length);cluster=[];};
  all.forEach(x=>{if(cluster.length&&x.s>=cEnd){flush();cEnd=-1;}cluster.push(x);cEnd=Math.max(cEnd,x.e);});flush();

  const sec=h("section",{class:"sec"});
  sec.append(h("div",{class:"sec-h"},h("h2",{text:"Anytime"}),h("span",{class:"n",text:untimed.length?"Tap one to give it a time":""})));
  if(allDayEvs.length)sec.append(h("div",{class:"anytime",style:"margin-bottom:8px"},allDayEvs.map(e=>h("a",{class:"chip evchip",href:e.link,target:"_blank",rel:"noopener noreferrer",text:"📅 "+e.title}))));
  sec.append(untimed.length?h("div",{class:"anytime"},untimed.map(t=>{const l=listById(t.listId);return h("button",{class:"chip",onclick:()=>openTask(t)},h("span",{class:"ldot",style:"background:"+(l?l.color:"var(--muted)")}),t.title);})):h("div",{class:"small muted",text:"No unscheduled tasks for this day."}));
  main.append(sec);

  const tl=h("div",{class:"tl",style:"height:"+((endH-startH)*HOUR)+"px","aria-label":"Day schedule. Tap an empty slot to add a task."});
  for(let hr=startH;hr<endH;hr++){const d=new Date();d.setHours(hr,0,0,0);tl.append(h("div",{class:"hr",style:"top:"+((hr-startH)*HOUR)+"px"},h("span",{text:d.toLocaleTimeString(undefined,{hour:"numeric"})})));}
  const LEFT=56;
  timed.forEach(x=>{
    const l=listById(x.t.listId);const top=(x.s-startH*60)/60*HOUR,hgt=Math.max(22,(x.e-x.s)/60*HOUR-2);
    const lab=h("span",{text:fmtTime(minToHHMM(x.s))+" to "+fmtTime(minToHHMM(x.e%1440))});
    const grip=h("button",{class:"grip","aria-label":"Drag to move "+x.t.title,text:"⠿"});
    const blk=h("div",{class:"blk"+(x.t.done?" done":""),role:"button",tabindex:"0",style:`--c:${l?l.color:"#6B7C78"};top:${top}px;height:${hgt}px;left:calc(${LEFT}px + (100% - ${LEFT+6}px) * ${x.col} / ${x.cols});width:calc((100% - ${LEFT+6}px) / ${x.cols} - 4px)`},h("b",{text:x.t.title}),hgt>34?lab:null,grip);
    blk.addEventListener("click",e=>{if(e.target===grip||blk.dataset.dragged)return;e.stopPropagation();openTask(x.t);});
    blk.addEventListener("keydown",e=>{if(e.key==="Enter")openTask(x.t);});
    let y0=0,moved=0;
    grip.addEventListener("pointerdown",e=>{e.preventDefault();e.stopPropagation();grip.setPointerCapture(e.pointerId);y0=e.clientY;moved=0;blk.classList.add("drag");});
    grip.addEventListener("pointermove",e=>{if(!blk.classList.contains("drag"))return;const dm=Math.round((e.clientY-y0)/HOUR*60/15)*15;const ns=Math.max(startH*60,Math.min(endH*60-15,x.s+dm));moved=ns-x.s;blk.style.top=((ns-startH*60)/60*HOUR)+"px";lab.textContent=fmtTime(minToHHMM(ns))+" to "+fmtTime(minToHHMM((ns+x.e-x.s)%1440));});
    const end=()=>{if(!blk.classList.contains("drag"))return;blk.classList.remove("drag");if(moved){blk.dataset.dragged="1";const nt=minToHHMM(x.s+moved);Store.put("tasks",Object.assign(clone(x.t),{time:nt}));toast("Moved to "+fmtTime(nt));}};
    grip.addEventListener("pointerup",end);grip.addEventListener("pointercancel",end);
    grip.addEventListener("click",e=>e.stopPropagation());
    tl.append(blk);
  });
  evBlocks.forEach(x=>{const top=(x.s-startH*60)/60*HOUR,hgt=Math.max(22,(x.e-x.s)/60*HOUR-2);
    tl.append(h("a",{class:"blk ev",href:x.ev.link||"#",target:"_blank",rel:"noopener noreferrer",style:`top:${top}px;height:${hgt}px;left:calc(${LEFT}px + (100% - ${LEFT+6}px) * ${x.col} / ${x.cols});width:calc((100% - ${LEFT+6}px) / ${x.cols} - 4px)`},h("b",{text:x.ev.title}),hgt>34?h("span",{text:fmtTime(x.ev.time)+" to "+fmtTime(x.ev.end)+", Google"}):null));});
  if(UI.sel===todayKey()){const n=new Date(),m=n.getHours()*60+n.getMinutes();if(m>=startH*60&&m<=endH*60)tl.append(h("div",{class:"now",style:"top:"+((m-startH*60)/60*HOUR)+"px"}));}
  tl.addEventListener("click",e=>{if(e.target!==tl)return;const y=e.clientY-tl.getBoundingClientRect().top;const m=Math.floor((startH*60+y/HOUR*60)/30)*30;openTask(null,{date:UI.sel,time:minToHHMM(Math.min(m,23*60+30)),duration:60});});
  main.append(h("section",{class:"sec"},h("div",{class:"sec-h"},h("h2",{text:"Schedule"}),h("span",{class:"n",text:"Tap a slot to add, drag ⠿ to move"})),tl));
}
