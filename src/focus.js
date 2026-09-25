/* ================= focus timer ================= */
const FOCUS_KEY="planner.focus";
function focusPrefs(){return{focus:Number(lsGet("planner.focusMin","25"))||25,brk:Number(lsGet("planner.breakMin","5"))||5};}
function focusState(){try{return JSON.parse(localStorage.getItem(FOCUS_KEY)||"null");}catch(e){return null;}}
function setFocusState(st){if(st)lsSet(FOCUS_KEY,JSON.stringify(st));else{try{localStorage.removeItem(FOCUS_KEY);}catch(e){}}refreshFocusUI();}
function focusRemaining(st){const el=st.paused?st.elapsed:st.elapsed+(Date.now()-st.startedAt)/1000;return Math.max(0,st.duration-el);}
const mmss=s=>{s=Math.ceil(s);return pad(Math.floor(s/60))+":"+pad(s%60);};
const hmins=m=>m>=60?Math.floor(m/60)+"h"+(m%60?" "+(m%60)+"m":""):m+"m";
function focusByTask(){const t={};for(const f of D.focus.values())if(f.taskId)t[f.taskId]=(t[f.taskId]||0)+(f.minutes||0);return t;}
function focusToday(){const k=todayKey();let m=0;for(const f of D.focus.values())if(f.date===k)m+=f.minutes||0;return m;}
function startFocus(task,mode,mins){
  const p=focusPrefs();mode=mode||"focus";const len=mins||(mode==="break"?p.brk:p.focus);
  setFocusState({mode,taskId:task?task.id:"",title:task?task.title:(mode==="break"?"Break":"Focus session"),duration:len*60,startedAt:Date.now(),elapsed:0,paused:false,sessionStart:Date.now(),done:false});
  scheduleFocusEnd();
}
function pauseFocus(){const st=focusState();if(!st||st.paused||st.done)return;st.elapsed+=(Date.now()-st.startedAt)/1000;st.paused=true;setFocusState(st);clearTimeout(focusEndTimer);}
function resumeFocus(){const st=focusState();if(!st||!st.paused)return;st.startedAt=Date.now();st.paused=false;setFocusState(st);scheduleFocusEnd();}
function stopFocus(){const st=focusState();if(!st)return;
  if(st.mode==="focus"&&!st.done){const mins=Math.floor((st.duration-focusRemaining(st))/60);if(mins>=1){logFocus(st,mins);toast("Saved "+hmins(mins)+" of focus");}}
  setFocusState(null);clearTimeout(focusEndTimer);}
function logFocus(st,mins){Store.put("focus",{id:"f-"+st.sessionStart,taskId:st.taskId,title:st.title,minutes:mins,date:key(new Date(st.sessionStart)),start:st.sessionStart});}
let focusEndTimer=0;
function scheduleFocusEnd(){clearTimeout(focusEndTimer);const st=focusState();if(!st||st.paused||st.done)return;focusEndTimer=setTimeout(finishFocus,focusRemaining(st)*1000+250);}
function finishFocus(){
  const st=focusState();if(!st||st.paused||st.done||focusRemaining(st)>0.5)return;
  st.done=true;
  if(st.mode==="focus"){logFocus(st,Math.round(st.duration/60));if(Notify.on())Notify.show("Focus session done","Nice work on "+st.title+". Time for a break.","focus");}
  else if(Notify.on())Notify.show("Break's over","Ready for another focus session?","focus");
  if(navigator.vibrate)navigator.vibrate([90,60,90]);
  setFocusState(st);
}
/* live UI: floating pill + open sheet, updated without full re-renders */
let focusTick=0,focusSheetUpdate=null;
function refreshFocusUI(){
  const st=focusState(),pill=$("#focusPill");
  if(pill){if(st&&!$(".scrim.focus")){pill.hidden=false;updatePill();}else pill.hidden=true;}
  clearInterval(focusTick);
  if(st&&!st.paused&&!st.done)focusTick=setInterval(()=>{if(document.hidden)return;updatePill();if(focusSheetUpdate)focusSheetUpdate();const s=focusState();if(s&&!s.paused&&!s.done&&focusRemaining(s)<=0)finishFocus();},500);
  if(focusSheetUpdate)focusSheetUpdate(true);
}
function updatePill(){const st=focusState(),pill=$("#focusPill");if(!st||!pill)return;
  pill.querySelector("b").textContent=st.done?(st.mode==="focus"?"Done ✓":"Break over"):mmss(focusRemaining(st))+(st.paused?" (paused)":"");
  pill.querySelector("span").textContent=st.mode==="break"?"Break":st.title;
  pill.classList.toggle("brk",st.mode==="break");}
document.addEventListener("visibilitychange",()=>{if(!document.hidden){const st=focusState();if(st&&!st.paused&&!st.done&&focusRemaining(st)<=0)finishFocus();else refreshFocusUI();}});

function openFocus(task){
  const R=110,C=2*Math.PI*R;
  const ring=h("div",{class:"fring"});
  ring.innerHTML=`<svg viewBox="0 0 260 260" aria-hidden="true"><circle cx="130" cy="130" r="${R}" class="ftrack"/><circle cx="130" cy="130" r="${R}" class="fprog" stroke-dasharray="${C}" stroke-dashoffset="0" transform="rotate(-90 130 130)"/></svg>`;
  const time=h("div",{class:"ftime"}),label=h("div",{class:"flabel"});
  ring.append(h("div",{class:"fcenter"},time,label));
  const ctrls=h("div",{class:"fctrls"}),setup=h("div",{class:"fsetup"}),stats=h("div",{class:"small muted",style:"text-align:center;margin-top:14px"});
  let pickTask=task||null,pickLen=focusPrefs().focus;
  const drawSetup=()=>{setup.textContent="";
    const open=(IDX.byDate[todayKey()]||[]).filter(t=>!t.done).concat(vals("tasks").filter(t=>!t.done&&t.date&&t.date<todayKey())).slice(0,30);
    if(pickTask&&!open.some(t=>t.id===pickTask.id))open.unshift(pickTask);
    const sel=h("select",{class:"inp","aria-label":"Task",onchange:e=>{pickTask=D.tasks.get(e.target.value)||null;}},h("option",{value:""},"Just focus (no task)"),open.map(t=>h("option",{value:t.id,selected:!!pickTask&&pickTask.id===t.id},t.title)));
    setup.append(h("div",{class:"field"},h("label",{text:"What are you working on?"}),sel),
      h("div",{class:"field"},h("span",{class:"lbl",text:"Length"}),chips([15,25,45,60,90].map(m=>[m,m+" min"]),pickLen,v=>{pickLen=Number(v);time.textContent=mmss(pickLen*60);})));
  };
  const btn=(t,cls,fn)=>h("button",{class:"btn "+cls,text:t,onclick:fn});
  const update=(full)=>{
    const st=focusState();
    if(!st){setup.hidden=false;if(full){drawSetup();ctrls.textContent="";ctrls.append(btn("Start focus","primary wide",()=>{startFocus(pickTask,"focus",pickLen);}));}
      time.textContent=mmss(pickLen*60);label.textContent="Ready";ring.querySelector(".fprog").style.strokeDashoffset="0";ring.classList.remove("brk");}
    else{setup.hidden=true;const rem=focusRemaining(st);
      time.textContent=st.done?"00:00":mmss(rem);label.textContent=st.done?(st.mode==="focus"?"Session complete":"Break over"):st.paused?"Paused":(st.mode==="break"?"Break":st.title);
      ring.querySelector(".fprog").style.strokeDashoffset=String(C*(1-rem/st.duration));ring.classList.toggle("brk",st.mode==="break");
      if(full){ctrls.textContent="";
        if(st.done&&st.mode==="focus")ctrls.append(btn("Take a "+focusPrefs().brk+" min break","primary wide",()=>startFocus(D.tasks.get(st.taskId)||null,"break")),btn("Focus again","ghost",()=>startFocus(D.tasks.get(st.taskId)||null,"focus")),btn("Finish","ghost",()=>{setFocusState(null);close();}));
        else if(st.done)ctrls.append(btn("Start focusing","primary wide",()=>startFocus(D.tasks.get(st.taskId)||null,"focus")),btn("Finish","ghost",()=>{setFocusState(null);close();}));
        else ctrls.append(st.paused?btn("Resume","primary wide",resumeFocus):btn("Pause","primary wide",pauseFocus),btn(st.mode==="break"?"Skip break":"Stop","ghost",()=>{stopFocus();}));
      }}
    const today=focusToday(),t=focusByTask();const cur=st&&st.taskId?t[st.taskId]:(pickTask?t[pickTask.id]:0);
    stats.textContent="Focused today: "+hmins(today)+(cur?". On this task: "+hmins(cur):"");
  };
  const close=openSheet([h("div",{class:"shead"},h("h3",{text:"Focus"}),h("button",{class:"x","aria-label":"Close",text:"×",onclick:()=>close()})),ring,setup,ctrls,stats],{full:true,onClose:()=>{focusSheetUpdate=null;setTimeout(refreshFocusUI,0);}});
  [...document.querySelectorAll(".scrim")].pop().classList.add("focus");
  focusSheetUpdate=update;update(true);refreshFocusUI();
}
