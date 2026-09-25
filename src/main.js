/* ================= main ================= */
function setHeader(big,sub){$("#bigDate").textContent=big;$("#subDate").textContent=sub||"";}
const TABS=[["home","Home"],["plan","Plan"],["habits","Habits"],["notes","Notes"],["money","Money"],["links","Links"],["more","More"]];
function goTab(t){if(t==="more"&&UI.tab==="more"){UI.page=null;UI.sharedList=null;}if(t!=="links")UI.linkEdit=false;UI.tab=t;if(t!=="more")UI.page=null;UI.sharedList=t==="more"?UI.sharedList:null;render();window.scrollTo(0,0);}
let rafId=0;
function render(){if(rafId)return;rafId=requestAnimationFrame(()=>{rafId=0;draw();});}
function draw(){
  buildIndex();
  const tab=UI.tab,qaOn=tab==="plan"||tab==="links"||(tab==="more"&&(UI.page==="shopping"||(UI.page==="shared"&&!!UI.sharedList&&Shared.lists.has(UI.sharedList))));
  if(tab!=="links")document.body.classList.remove("editing");
  const ae=document.activeElement,refocus=ae&&ae.id&&$("#main").contains(ae)?{id:ae.id,a:ae.selectionStart,b:ae.selectionEnd}:null;
  document.body.classList.toggle("noqa",!qaOn);
  buildNav(true);
  const cur=tab==="more"&&UI.page?UI.page:tab;
  [["#nav","phone"],["#sideNav","desk"]].forEach(([sel,which])=>{const ids=navFull(which),on=ids.includes(cur)?cur:"more";
    document.querySelectorAll(sel+" button").forEach(b=>b.setAttribute("aria-current",b.dataset.tab===on&&!(which==="desk"&&cur==="settings")?"page":"false"));});
  $("#sideSettings").setAttribute("aria-current",cur==="settings"?"page":"false");
  document.body.classList.toggle("desk",UI.desktop);
  const main=$("#main");main.textContent="";
  if(!UI.ready){setHeader("Planner","");main.append(h("div",{class:"loading",text:"Loading your planner…"}));return;}
  ({home:renderHome,plan:renderPlan,habits:renderHabits,notes:renderNotes,money:renderMoney,links:renderLinks,more:renderMore})[tab](main);
  processSubs();updateQaHint();
  if(refocus){const el=document.getElementById(refocus.id);if(el){el.focus({preventScroll:true});try{el.setSelectionRange(refocus.a,refocus.b);}catch(e){}}}
  const qi=$("#qaInput");
  qi.placeholder=tab==="plan"?(UI.planView==="lists"?"Add a task (no date)":"Add a task for "+(UI.planView==="upcoming"?"today":relLow(UI.sel))):tab==="links"?"Paste a link to save it":UI.page==="shared"&&Shared.lists.get(UI.sharedList)&&Shared.lists.get(UI.sharedList).kind==="todo"?"Add a to-do":"Add an item, e.g. 2 kg rice";
  if(tab==="plan")qi.placeholder="Try: Dentist tomorrow 3pm #personal !!";
  scheduleNotify();
  if(pending||sharedText||joinCode)setTimeout(runPending,0);
}

/* quick add */
$("#qaForm").addEventListener("submit",e=>{e.preventDefault();const qi=$("#qaInput");const v=qi.value.trim();if(!v)return;
  if(UI.tab==="links"){if(quickAddLink(v))qi.value="";return;}
  if(UI.tab==="more"&&UI.page==="shared"){addSharedItem(v);qi.value="";updateQaHint();return;}
  if(UI.tab==="more"&&UI.page==="shopping"){const p=parseItem(v);Store.put("shop",{id:uid(),listId:UI.shopList,name:p.name,qty:p.qty,done:false,createdAt:Date.now()});}
  else{const p=parseQuick(v);const defDate=UI.planView==="lists"?null:(UI.planView==="upcoming"?todayKey():UI.sel);
    const t=newTask({title:p.title||v,date:p.date!==undefined?p.date:defDate});["time","duration","listId","priority","repeat","remind"].forEach(k=>{if(p[k]!==undefined)t[k]=p[k];});
    Store.put("tasks",t);const bits=parseChips(p);
    toast("Added"+(t.date?" to "+relLabel(t.date):"")+(t.time?" at "+fmtTime(t.time):"")+(bits.length>2?", with "+plural(bits.length-(t.date?1:0)-(t.time?1:0),"detail"):""),{label:"Edit",fn:()=>openTask(D.tasks.get(t.id))});}
  qi.value="";updateQaHint();});
function updateQaHint(){const el=$("#qaHint");if(!el)return;const v=$("#qaInput").value.trim();el.textContent="";
  if(UI.tab!=="plan"||!v){el.hidden=true;return;}const c=parseChips(parseQuick(v));el.hidden=!c.length;c.forEach(x=>el.append(h("span",{text:x})));}
$("#qaInput").addEventListener("input",updateQaHint);
$("#qaMore").addEventListener("click",()=>{const qi=$("#qaInput");const v=qi.value.trim();
  if(UI.tab==="more"&&UI.page==="shopping"){$("#qaForm").requestSubmit();return;}
  if(UI.tab==="links"){qi.value="";openLink(null,v?{url:normalizeUrl(v)||v}:null);return;}
  const ti=openTask(null);if(v){ti.value=v;qi.value="";}});

/* nav */
const nav=$("#nav"),sideNav=$("#sideNav");
let navBuilt="";
function buildNav(onlyIfChanged){
  const sig=JSON.stringify([navFull("phone"),navFull("desk")]);if(onlyIfChanged&&sig===navBuilt)return;navBuilt=sig;
  nav.textContent="";navFull("phone").forEach(t=>{const l=navName(t);nav.append(h("button",{"data-tab":t,"aria-label":l,onclick:()=>goNav(t)},navIcon(t),h("span",{text:l})));});
  sideNav.textContent="";navFull("desk").forEach((t,i)=>{sideNav.append(h("button",{"data-tab":t,onclick:()=>goNav(t)},navIcon(t),h("span",{text:navName(t)}),i<9?h("kbd",{text:String(i+1)}):null));});
}
buildNav();
$("#searchBtn").append(ico("search"));$("#searchBtn").addEventListener("click",openSearch);
$("#sideSearch").prepend(ico("search"));$("#sideSearch").addEventListener("click",openSearch);
document.querySelectorAll(".sync").forEach(b=>b.addEventListener("click",openAccount));
MQ.addEventListener("change",()=>{UI.desktop=MQ.matches;render();});
function openGuide(){UI.tab="more";UI.page="guide";render();window.scrollTo(0,0);}
$("#sideGuide").addEventListener("click",openGuide);
$("#sideSettings").addEventListener("click",()=>goNav("settings"));
$("#sync").addEventListener("contextmenu",e=>{if(!Store.user)return;e.preventDefault();toast(syncState().tip);}); // long-press on a phone shows the sync status

/* keyboard shortcuts (laptop) */
function newInSection(){
  const t=UI.tab;
  if(t==="plan")openTask(null);
  else if(t==="habits")openHabit(null);
  else if(t==="notes"){if(UI.notesSeg==="journal")openJournal(todayKey());else openNote(null);}
  else if(t==="money")openExpense(null);
  else if(t==="links")openLink(null);
  else if(t==="more"&&UI.page==="goals")openGoal(null);
  else if(t==="more"&&UI.page==="shopping")$("#qaInput").focus();
  else openTask(null);
}
document.addEventListener("keydown",e=>{
  if(appLocked)return;
  const el=e.target,typing=el&&(/^(input|textarea|select)$/i.test(el.tagName)||el.isContentEditable);
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();if(!$(".scrim"))openSearch();return;}
  if((e.metaKey||e.ctrlKey)&&e.key==="Enter"){const sc=[...document.querySelectorAll(".scrim")].pop();const p=sc&&sc.querySelector(".btn.primary");if(p){e.preventDefault();p.click();}return;}
  if(typing||e.metaKey||e.ctrlKey||e.altKey||$(".scrim"))return;
  const k=e.key;
  if(k==="/"){e.preventDefault();openSearch();}
  else if(k==="n"||k==="N"){e.preventDefault();newInSection();}
  else if(/^[1-9]$/.test(k)){const id=navFull("desk")[Number(k)-1];if(id)goNav(id);}
  else if(k==="f"||k==="F"){e.preventDefault();openFocus();}
  else if(UI.tab==="plan"&&(k==="t"||k==="T")){UI.stripScroll=null;pickDay(todayKey());}
  else if(UI.tab==="plan"&&(k==="ArrowLeft"||k==="ArrowRight")){e.preventDefault();UI.stripScroll=null;pickDay(key(addDays(fromKey(UI.sel),k==="ArrowLeft"?-1:1)));}
  else if(k==="q"&&!document.body.classList.contains("noqa")){e.preventDefault();$("#qaInput").focus();}
  else if(k==="?"){e.preventDefault();openGuide();}
});

/* home-screen shortcuts & share target */
const params=new URLSearchParams(location.search);
let pending=params.get("a");
let sharedText=[params.get("text"),params.get("url")].filter(Boolean).join("\n");
const sharedTitle=params.get("title");
if(pending||sharedText||sharedTitle)history.replaceState(null,"",location.pathname);
if(sharedTitle&&!sharedText)sharedText=sharedTitle;
let joinCode=(params.get("join")||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
if(joinCode)history.replaceState(null,"",location.pathname);
function runPending(){
  if(!UI.ready||$(".scrim")||appLocked)return;
  if(joinCode){if(Store.mode!=="cloud"){if(fbAuth)openAccount();return;}const c=joinCode;joinCode="";UI.tab="more";UI.page="shared";render();openJoin(c);return;}
  if(sharedText){
    const urls=extractUrls(sharedText),rest=sharedText.replace(/https?:\/\/\S+/g,"").trim();
    if(urls.length===1&&rest.length<80){const u=urls[0];const x={id:uid(),url:u,name:(sharedTitle&&sharedTitle.length<60&&!/^https?:/.test(sharedTitle))?sharedTitle:niceName(u),catId:(SET.linkCats[0]||{}).id||"",note:rest.slice(0,200),visits:0,createdAt:Date.now()};
      const txt=sharedText;sharedText="";Store.put("links",x);UI.tab="links";render();
      toast("Saved to Links",{label:"Save as note instead",fn:()=>{Store.del("links",x.id);const n=newNote({title:x.name,body:txt});Store.put("notes",n);UI.tab="notes";UI.notesSeg="notes";render();}});return;}
    const n=newNote({title:sharedTitle&&sharedTitle!==sharedText?sharedTitle:"Saved "+new Date().toLocaleDateString(),body:sharedText});sharedText="";Store.put("notes",n);UI.tab="notes";UI.notesSeg="notes";render();toast("Saved to Notes");openNote(n);return;}
  const a=pending;pending=null;
  if(a==="task"){UI.tab="plan";render();openTask(null);}
  else if(a==="expense"){UI.tab="money";render();openExpense(null);}
  else if(a==="note"){UI.tab="notes";UI.notesSeg="notes";render();openNote(null);}
  else if(a==="journal"){UI.tab="notes";UI.notesSeg="journal";render();openJournal(todayKey());}
}

applyTheme();
if(lockCfg())lockNow();
render();
Store.init();
{const pre=()=>{if(navigator.onLine)loadEditor().catch(()=>{});};"requestIdleCallback" in window?requestIdleCallback(pre,{timeout:4000}):setTimeout(pre,4000);} // so notes can be edited offline later
try{if(sessionStorage.getItem("planner.deleted")){sessionStorage.removeItem("planner.deleted");setTimeout(()=>toast("Your account and its data have been deleted."),300);}}catch(e){}
refreshFocusUI();{const st=focusState();if(st&&!st.paused&&!st.done&&focusRemaining(st)<=0)finishFocus();else scheduleFocusEnd();}
$("#focusPill").addEventListener("click",()=>openFocus());

/* app updates: sw.js installs new versions straight away; offer a one-tap reload into them */
const Updates={reg:null,shown:false,version:""};
function readVersion(){if(!("caches" in window))return;caches.keys().then(ks=>{const v=(ks.find(k=>/^planner-/.test(k))||"").replace(/^planner-/,"");if(v!==Updates.version){Updates.version=v;if(UI.page==="settings")render();}}).catch(()=>{});}
function showUpdateBar(){if(Updates.shown)return;Updates.shown=true;
  document.body.append(h("div",{class:"updbar",role:"status"},h("span",{text:"A new version of Planner is ready."}),h("button",{class:"toast-act",text:"Update now",onclick:()=>location.reload()})));}
function checkForUpdate(){return Updates.reg?Updates.reg.update():Promise.reject(new Error("no service worker"));}
async function checkForUpdateNow(btn){
  btn.disabled=true;
  try{await checkForUpdate();const r=Updates.reg;if(!r.installing&&!r.waiting&&!Updates.shown)toast("You're up to date.");}
  catch(e){toast(Updates.reg?"Couldn't check for updates. Are you online?":"Updates aren't available in this browser.");}
  btn.disabled=false;
}
if("serviceWorker" in navigator&&location.protocol.startsWith("http")){
  let firstInstall=!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange",()=>{if(firstInstall){firstInstall=false;readVersion();return;}showUpdateBar();});
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").then(r=>{Updates.reg=r;readVersion();}).catch(()=>{}));
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)checkForUpdate().catch(()=>{});});
  setInterval(()=>checkForUpdate().catch(()=>{}),30*60*1000);
}
