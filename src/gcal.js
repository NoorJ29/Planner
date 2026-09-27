/* ================= google calendar ================= */
const GCID=String(window.PLANNER_GOOGLE_CLIENT_ID||"").trim();
const GC_SCOPE="https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly";
const GC={token:null,exp:0,months:{},loading:new Set(),stale:false,cals:null};
try{GC.months=JSON.parse(localStorage.getItem("planner.gcalCache")||"{}");}catch(e){}
function gcalOn(){return !!GCID&&lsGet("planner.gcal","0")==="1";}
function gcalHasToken(){if(GC.token&&Date.now()<GC.exp-60000)return true;try{const t=JSON.parse(sessionStorage.getItem("planner.gtok")||"null");if(t&&Date.now()<t.exp-60000){GC.token=t.token;GC.exp=t.exp;return true;}}catch(e){}return false;}
async function gcalToken(){
  if(gcalHasToken())return GC.token;
  await loadScript("https://accounts.google.com/gsi/client");
  return new Promise((res,rej)=>{
    const tc=google.accounts.oauth2.initTokenClient({client_id:GCID,scope:GC_SCOPE,
      callback:r=>{if(r.error){rej(new Error(r.error));return;}GC.token=r.access_token;GC.exp=Date.now()+(Number(r.expires_in)||3600)*1000;try{sessionStorage.setItem("planner.gtok",JSON.stringify({token:GC.token,exp:GC.exp}));}catch(e){}GC.stale=false;res(GC.token);},
      error_callback:e=>rej(new Error(e&&e.type||"popup_closed"))});
    tc.requestAccessToken({prompt:lsGet("planner.gcal","0")==="1"?"":"consent"});
  });
}
async function gapi(path,opt){
  if(!gcalHasToken())throw new Error("auth");
  const r=await fetch("https://www.googleapis.com/calendar/v3/"+path,Object.assign({},opt||{},{headers:{"Authorization":"Bearer "+GC.token,"Content-Type":"application/json"}}));
  if(r.status===401){GC.token=null;try{sessionStorage.removeItem("planner.gtok");}catch(e){}GC.stale=true;throw new Error("auth");}
  if(!r.ok)throw new Error("http "+r.status);return r.status===204?null:r.json();
}
function gcalCals(){try{const v=JSON.parse(lsGet("planner.gcalCals","[]"));return v.length?v:["primary"];}catch(e){return["primary"];}}
async function gcalConnect(){
  if(!GCID){toast("Google Calendar isn't set up yet. See the setup guide.");return;}
  try{await gcalToken();lsSet("planner.gcal","1");GC.months={};toast("Google Calendar connected");gcalEnsure(UI.month,true);gcalEnsure(todayKey().slice(0,7),true);render();}
  catch(e){toast(/popup/.test(e.message)?"The Google window was closed or blocked. Try again.":"Couldn't connect to Google Calendar.");}
}
function gcalDisconnect(){const tok=GC.token;lsSet("planner.gcal","0");GC.token=null;GC.months={};try{sessionStorage.removeItem("planner.gtok");localStorage.removeItem("planner.gcalCache");if(tok&&window.google&&google.accounts)google.accounts.oauth2.revoke(tok,()=>{});}catch(e){}render();toast("Google Calendar disconnected");}
function evDateKeys(ev){
  const s=ev.start||{},e=ev.end||{};
  if(s.date){const out=[];let d=fromKey(s.date);const end=fromKey(e.date||s.date);for(let i=0;i<31&&d<end;i++){out.push(key(d));d=addDays(d,1);}return out.length?out:[s.date];}
  return[key(new Date(s.dateTime))];
}
function toEv(ev,cal){
  const s=ev.start||{},e=ev.end||{};const allDay=!!s.date;const sd=allDay?null:new Date(s.dateTime),ed=allDay?null:new Date(e.dateTime||s.dateTime);
  return{id:ev.id,title:ev.summary||"(No title)",allDay,time:allDay?"":pad(sd.getHours())+":"+pad(sd.getMinutes()),end:allDay?"":pad(ed.getHours())+":"+pad(ed.getMinutes()),mins:allDay?0:Math.max(15,Math.round((ed-sd)/60000)),link:ev.htmlLink||"",loc:ev.location||"",cal,days:evDateKeys(ev)};
}
async function gcalEnsure(mk,force){
  if(!gcalOn())return;const m=GC.months[mk];
  if(!force&&m&&Date.now()-m.at<15*60000)return;
  if(GC.loading.has(mk))return;
  if(!gcalHasToken()){GC.stale=true;return;}
  GC.loading.add(mk);
  try{const [y,mo]=mk.split("-").map(Number);const tMin=new Date(y,mo-1,1).toISOString(),tMax=new Date(y,mo,1).toISOString();const list=[];
    for(const cal of gcalCals()){const r=await gapi("calendars/"+encodeURIComponent(cal)+"/events?singleEvents=true&orderBy=startTime&maxResults=250&timeMin="+encodeURIComponent(tMin)+"&timeMax="+encodeURIComponent(tMax));(r.items||[]).filter(ev=>ev.status!=="cancelled").forEach(ev=>list.push(toEv(ev,cal)));}
    GC.months[mk]={at:Date.now(),list};
    const keys=Object.keys(GC.months).sort().slice(-4);const keep={};keys.forEach(k=>keep[k]=GC.months[k]);GC.months=keep;
    try{localStorage.setItem("planner.gcalCache",JSON.stringify(GC.months));}catch(e){}
    render();
  }catch(e){if(e.message!=="auth")console.error(e);}finally{GC.loading.delete(mk);}
}
function gcalEventsOn(k){if(!gcalOn())return[];const out=[];const seen=new Set();[k.slice(0,7)].forEach(mk=>{const m=GC.months[mk];if(m)m.list.forEach(ev=>{if(ev.days.includes(k)&&!seen.has(ev.id+ev.cal)){seen.add(ev.id+ev.cal);out.push(ev);}});});
  return out.sort((a,b)=>(a.allDay?"":a.time)<(b.allDay?"":b.time)?-1:1);}
function gcalStaleChip(){
  if(!gcalOn()||gcalHasToken())return null;
  return h("button",{class:"chip gcchip",onclick:async()=>{try{await gcalToken();GC.months={};gcalEnsure(UI.month,true);if(UI.month!==todayKey().slice(0,7))gcalEnsure(todayKey().slice(0,7),true);render();}catch(e){toast("Couldn't refresh Google Calendar.");}}},"📅 Tap to refresh Google Calendar");
}
function evRow(ev){return h("a",{class:"evrow",href:ev.link||"#",target:"_blank",rel:"noopener noreferrer"},h("span",{class:"evbar"}),h("span",{class:"mid"},h("b",{text:ev.title}),h("span",{class:"small muted",text:(ev.allDay?"All day":fmtTime(ev.time)+" to "+fmtTime(ev.end))+(ev.loc?", "+ev.loc:"")})),h("span",{class:"small muted",text:"Google"}));}
async function gcalPushTask(t){
  const body={summary:t.title,description:(t.notes||"")+(t.subtasks&&t.subtasks.length?"\n\n"+t.subtasks.map(s=>(s.done?"☑ ":"☐ ")+s.text).join("\n"):""),reminders:{useDefault:true}};
  let tz="UTC";try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone;}catch(e){}
  if(t.time){const [H,M]=t.time.split(":").map(Number);const s=fromKey(t.date);s.setHours(H,M,0,0);const e=new Date(s.getTime()+(t.duration||30)*60000);
    const f=x=>key(x)+"T"+pad(x.getHours())+":"+pad(x.getMinutes())+":00";body.start={dateTime:f(s),timeZone:tz};body.end={dateTime:f(e),timeZone:tz};}
  else{body.start={date:t.date};body.end={date:key(addDays(fromKey(t.date),1))};}
  if(t.repeat){const m={daily:"DAILY",weekdays:"WEEKLY;BYDAY=MO,TU,WE,TH,FR",weekly:"WEEKLY",monthly:"MONTHLY",yearly:"YEARLY"}[t.repeat];body.recurrence=["RRULE:FREQ="+m];}
  if(!gcalHasToken())await gcalToken();
  let ev;
  if(t.gcalId){try{ev=await gapi("calendars/primary/events/"+encodeURIComponent(t.gcalId),{method:"PATCH",body:JSON.stringify(body)});}catch(e){if(e.message==="http 404"||e.message==="http 410")ev=null;else throw e;}}
  if(!ev)ev=await gapi("calendars/primary/events",{method:"POST",body:JSON.stringify(body)});
  GC.months[t.date.slice(0,7)]=null;gcalEnsure(t.date.slice(0,7),true);
  return ev;
}
async function gcalLoadCalendars(){try{if(!gcalHasToken())await gcalToken();const r=await gapi("users/me/calendarList?minAccessRole=reader");GC.cals=(r.items||[]).map(c=>({id:c.primary?"primary":c.id,name:c.summaryOverride||c.summary,color:c.backgroundColor}));render();}catch(e){toast("Couldn't load your calendars.");}}
function renderGcalSettings(box,row){
  if(!GCID){box.append(row("Google Calendar","Not set up yet. Follow the Google Calendar steps in the setup guide, then add your client ID to config.js.",h("span")));return;}
  if(!gcalOn()){box.append(row("Google Calendar","Show your Google events in Plan and add tasks to your calendar.",h("button",{class:"btn primary",text:"Connect",onclick:gcalConnect})));return;}
  box.append(row("Google Calendar",gcalHasToken()?"Connected":"Connected. Tap Refresh to update events.",h("button",{class:"chip",text:"Disconnect",onclick:gcalDisconnect})));
  box.append(row("Refresh events","",h("button",{class:"chip",text:"Refresh",onclick:async()=>{try{if(!gcalHasToken())await gcalToken();GC.months={};await gcalEnsure(UI.month,true);toast("Events updated");}catch(e){toast("Couldn't refresh.");}}})));
  const chosen=new Set(gcalCals());
  if(!GC.cals)box.append(row("Calendars to show",[...chosen].join(", ").replace("primary","Main calendar"),h("button",{class:"chip",text:"Choose",onclick:gcalLoadCalendars})));
  else box.append(h("div",{class:"setrow",style:"display:block"},h("b",{text:"Calendars to show"}),h("div",{class:"row",style:"margin-top:8px"},GC.cals.map(c=>h("button",{class:"chip","aria-pressed":String(chosen.has(c.id)),onclick:()=>{chosen.has(c.id)?chosen.delete(c.id):chosen.add(c.id);if(!chosen.size)chosen.add("primary");lsSet("planner.gcalCals",JSON.stringify([...chosen]));GC.months={};gcalEnsure(UI.month,true);render();}},h("span",{class:"ldot",style:"background:"+(c.color||"#888")}),c.name)))));
}
