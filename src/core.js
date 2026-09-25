/* ================= constants ================= */
const COLORS=["#0F7B6C","#E9A21F","#D8574B","#7B5CD6","#2F86C9","#6B7C78","#C24F8E"];
const DEFAULT_LISTS=[{id:"personal",name:"Personal",color:"#0F7B6C"},{id:"work",name:"Work",color:"#2F86C9"},{id:"home",name:"Home",color:"#E9A21F"}];
const DEFAULT_CATS=[{id:"food",name:"Food",emoji:"🍔"},{id:"transport",name:"Transport",emoji:"🚌"},{id:"shopping",name:"Shopping",emoji:"🛍️"},{id:"bills",name:"Bills",emoji:"💡"},{id:"fun",name:"Fun",emoji:"🎉"},{id:"health",name:"Health",emoji:"💊"},{id:"other",name:"Other",emoji:"📦"}];
const COLS=["tasks","habits","notes","goals","expenses","shop","links","focus","subs","countdowns","templates"];
const SET_DEFAULT={lists:DEFAULT_LISTS,shopLists:[{id:"groceries",name:"Groceries"}],categories:DEFAULT_CATS,budget:0,catBudgets:{},currency:"",currencySymbol:"",linkCats:[{id:"general",name:"General",emoji:"🌐",color:"#2F86C9"},{id:"work",name:"Work",emoji:"💼",color:"#0F7B6C"},{id:"fun",name:"Fun",emoji:"🎬",color:"#D8574B"}]};
const LS1="planner.v1",LS2="planner.v2";
const JSPDF="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
const JSZIP="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
const CHECK='<svg viewBox="0 0 24 24" fill="none" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const ICONS={
  home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19z"/></svg>',
  plan:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  habits:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c2.5 3 5.5 5.2 5.5 9.5a5.5 5.5 0 0 1-11 0c0-2.2 1-3.8 2.2-4.8.1 2 1 3.2 2.3 3.2 0-3.2-1-5.3 1-7.9z"/></svg>',
  notes:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/></svg>',
  money:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10.5h18M15.5 15h2"/></svg>',
  links:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/></svg>',
  more:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg>'
};

/* ================= helpers ================= */
const clone=o=>JSON.parse(JSON.stringify(o));
const $=(s,r=document)=>r.querySelector(s);
function h(tag,attrs,...kids){const el=document.createElement(tag);for(const [k,v] of Object.entries(attrs||{})){if(v==null||v===false)continue;if(k==="class")el.className=v;else if(k==="text")el.textContent=v;else if(k==="style")el.style.cssText=v;else if(k.startsWith("on"))el.addEventListener(k.slice(2),v);else el.setAttribute(k,v===true?"":v);}for(const c of kids.flat(Infinity)){if(c==null||c===false)continue;el.append(c instanceof Node?c:document.createTextNode(String(c)));}return el;}
function ico(n){const s=document.createElement("span");s.className="ico";s.innerHTML=ICONS[n];return s;}
const pad=n=>String(n).padStart(2,"0");
const key=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const fromKey=k=>{const [y,m,d]=k.split("-").map(Number);return new Date(y,m-1,d);};
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x;};
const todayKey=()=>key(new Date());
const weekStart=d=>{const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-((x.getDay()+6)%7));return x;};
function relLabel(k){const t=new Date();if(k===key(t))return"Today";if(k===key(addDays(t,1)))return"Tomorrow";if(k===key(addDays(t,-1)))return"Yesterday";return fromKey(k).toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short"});}
function relLow(k){const l=relLabel(k);return /^(Today|Tomorrow|Yesterday)$/.test(l)?l.toLowerCase():l;}
function longDate(k){return fromKey(k).toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long",year:"numeric"});}
function fmtTime(t){if(!t)return"";const [H,M]=t.split(":").map(Number);const d=new Date();d.setHours(H,M,0,0);return d.toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"});}
const minToHHMM=m=>pad(Math.floor(m/60))+":"+pad(m%60);
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const plural=(n,w)=>n+" "+w+(n===1?"":"s");
function lsGet(k,def){try{const v=localStorage.getItem(k);return v==null?def:v;}catch(e){return def;}}
function lsSet(k,v){try{localStorage.setItem(k,v);}catch(e){}}
function debounce(fn,ms){let t=null,args=[];const f=(...a)=>{args=a;clearTimeout(t);t=setTimeout(()=>{t=null;fn(...args);},ms);};f.flush=()=>{if(t){clearTimeout(t);t=null;fn(...args);}};f.cancel=()=>{clearTimeout(t);t=null;};return f;}
let toastTimer=0;
function toast(msg,action){const old=$(".toast");if(old)old.remove();clearTimeout(toastTimer);
  const t=h("div",{class:"toast",role:"status"},h("span",{text:msg}),action?h("button",{class:"toast-act",text:action.label,onclick:()=>{t.remove();action.fn();}}):null);
  document.body.append(t);toastTimer=setTimeout(()=>t.remove(),action?5500:2800);}
const snap=(c,id)=>D[c].has(id)?clone(D[c].get(id)):null;
function undoable(msg,changes){toast(msg,{label:"Undo",fn:()=>{changes.forEach(([c,prev,id])=>prev?Store.put(c,prev):Store.del(c,id));}});}
function twoTap(btn,label,fn){let armed=false,timer;btn.addEventListener("click",()=>{if(armed){clearTimeout(timer);armed=false;fn();return;}armed=true;const orig=btn.textContent;btn.textContent=label;timer=setTimeout(()=>{armed=false;btn.textContent=orig;},3000);});}
const numFmt=new Intl.NumberFormat(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtCache={};
function money(n){
  n=Number(n)||0;
  if(SET.currencySymbol){const neg=n<0?"-":"";return neg+SET.currencySymbol+(/^[A-Za-z]{2,}$/.test(SET.currencySymbol)?" ":"")+numFmt.format(Math.abs(n));}
  const c=SET.currency;if(!c)return numFmt.format(n);
  try{const f=fmtCache[c]||(fmtCache[c]=(()=>{try{return new Intl.NumberFormat(undefined,{style:"currency",currency:c,currencyDisplay:"narrowSymbol"});}catch(e){return new Intl.NumberFormat(undefined,{style:"currency",currency:c});}})());return f.format(n);}
  catch(e){return c+" "+numFmt.format(n);}
}
function download(blob,name){const u=URL.createObjectURL(blob);const a=h("a",{href:u,download:name});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),5000);}
const scripts={};
function loadScript(src){return scripts[src]||(scripts[src]=new Promise((res,rej)=>{const s=h("script",{src});s.onload=res;s.onerror=()=>{delete scripts[src];rej(new Error("Couldn't load a component. Check your connection."));};document.head.append(s);}));}
function seg(options,value,onPick){const wrap=h("div",{class:"seg",role:"group"});options.forEach(([v,l])=>wrap.append(h("button",{type:"button","aria-pressed":String(v===value),text:l,onclick:()=>{wrap.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed","false"));wrap.querySelector(`[data-v="${v}"]`).setAttribute("aria-pressed","true");onPick(v);},"data-v":v})));return wrap;}
function chips(options,value,onPick){const row=h("div",{class:"row"});const bs=options.map(([v,l,dot])=>h("button",{type:"button",class:"chip","aria-pressed":String(v===value),onclick:()=>{bs.forEach(x=>x.setAttribute("aria-pressed",String(x===b(v))));onPick(v);},"data-v":v},dot?h("span",{class:"ldot",style:"background:"+dot}):null,l));const b=v=>bs.find(x=>x.dataset.v===String(v));row.append(...bs);return row;}
function bar(pct,over){return h("div",{class:"progress"+(over?" over":""),"aria-hidden":"true"},h("b",{style:"width:"+Math.max(0,Math.min(100,Math.round(pct*100)))+"%"}));}

/* ================= state ================= */
const D={};COLS.forEach(c=>D[c]=new Map());
let SET=clone(SET_DEFAULT);
const MQ=window.matchMedia("(min-width: 1000px)");
const UI={desktop:MQ.matches,ready:false,tab:"home",sharedList:null,insPeriod:"30",planView:"day",sel:todayKey(),cal:lsGet("planner.cal",MQ.matches?"month":"week"),month:todayKey().slice(0,7),stripScroll:null,notesSeg:"notes",moneyMonth:todayKey().slice(0,7),page:null,shopList:"groceries",reviewWeek:0,expanded:new Set(),linkCat:"",linkQuery:"",linkEdit:false};
const vals=c=>[...D[c].values()];
const listById=id=>SET.lists.find(l=>l.id===id);
const catById=id=>SET.categories.find(c=>c.id===id)||{id,name:"Other",emoji:"📦"};

/* ================= sheets ================= */
function openSheet(content,opts){
  opts=opts||{};
  const scrim=h("div",{class:"scrim"+(opts.cls?" "+opts.cls:""),onclick:e=>{if(e.target===scrim)close();}});
  const sheet=h("div",{class:"sheet"+(opts.full?" full":""),role:"dialog","aria-modal":"true"},content);
  scrim.append(sheet);document.body.append(scrim);document.body.style.overflow="hidden";
  let closed=false;
  function close(){if(closed)return;closed=true;if(opts.onClose)opts.onClose();scrim.remove();document.removeEventListener("keydown",esc);if(!$(".scrim"))document.body.style.overflow="";}
  function esc(e){if(e.key==="Escape"&&scrim===[...document.querySelectorAll(".scrim")].pop())close();}
  document.addEventListener("keydown",esc);
  return close;
}

/* ================= sync store ================= */
const CFG=window.PLANNER_FIREBASE_CONFIG||{};
const WANT_FB=!!(CFG.apiKey&&!/PASTE/.test(CFG.apiKey));
let fbAuth=null,fbDb=null,fbFailed=false;
const FB="https://www.gstatic.com/firebasejs/10.12.2/firebase-";
async function loadFirebase(){
  await loadScript(FB+"app-compat.js");
  await Promise.all([loadScript(FB+"auth-compat.js"),loadScript(FB+"firestore-compat.js")]);
  firebase.initializeApp(CFG);fbDb=firebase.firestore();fbDb.enablePersistence({synchronizeTabs:true}).catch(()=>{});fbAuth=firebase.auth();
}
function clean(x){const o=JSON.parse(JSON.stringify(x));delete o.id;return o;}

const Store={
  mode:"local",user:null,base:null,unsubs:[],
  async init(){
    if(WANT_FB){try{await loadFirebase();}catch(e){console.error(e);fbFailed=true;}}
    if(!fbAuth){this.goLocal();if(fbFailed)toast("Couldn't reach sync right now. Showing what's saved on this device.");return;}
    let first=true;
    fbAuth.onAuthStateChanged(u=>{
      if(u)this.goCloud(u);
      else{this.goLocal();if(first&&lsGet("planner.skipSync","0")!=="1")setTimeout(openAccount,400);}
      first=false;
    });
  },
  stop(){this.unsubs.forEach(f=>{try{f();}catch(e){}});this.unsubs=[];if(typeof sharedStop==="function")sharedStop();},
  reset(){COLS.forEach(c=>D[c]=new Map());SET=clone(SET_DEFAULT);},
  readLocal(){
    let d=null;try{d=JSON.parse(localStorage.getItem(LS2)||"null");}catch(e){}
    if(!d){try{const v1=JSON.parse(localStorage.getItem(LS1)||"null");if(v1)d={tasks:v1.tasks||[],settings:v1.lists?{lists:v1.lists}:{}};}catch(e){}}
    return d;
  },
  goLocal(){
    this.stop();this.mode="local";this.user=null;this.reset();
    const d=this.readLocal();
    if(d){COLS.forEach(c=>(d[c]||[]).forEach(x=>x&&x.id&&D[c].set(x.id,x)));if(d.settings)SET=Object.assign(clone(SET_DEFAULT),d.settings);if(!Array.isArray(SET.linkCats)||!SET.linkCats.length)SET.linkCats=clone(SET_DEFAULT.linkCats);}
    UI.ready=true;updateSync();render();
  },
  _persist:debounce(()=>{
    try{const out={settings:SET};COLS.forEach(c=>out[c]=vals(c));localStorage.setItem(LS2,JSON.stringify(out));localStorage.removeItem(LS1);}
    catch(e){toast("Couldn't save on this device. Its storage may be full.");}
  },250),
  async goCloud(u){
    this.stop();this.mode="cloud";this.user=u;this.reset();UI.ready=false;updateSync();render();
    this.base=fbDb.collection("users").doc(u.uid);
    await this.migrateLocal();
    COLS.forEach(c=>{
      this.unsubs.push(this.base.collection(c).onSnapshot(snap=>{
        snap.docChanges().forEach(ch=>{if(ch.type==="removed")D[c].delete(ch.doc.id);else D[c].set(ch.doc.id,Object.assign({id:ch.doc.id},ch.doc.data()));});
        if(c==="tasks"&&!UI.ready){UI.ready=true;updateSync();}
        render();
      },err=>{console.error(err);UI.ready=true;updateSync("error");render();}));
    });
    try{sharedStart();}catch(e){console.error(e);}
    this.unsubs.push(this.base.onSnapshot(s=>{
      const d=s.exists?s.data():{};SET=Object.assign(clone(SET_DEFAULT),d);
      if(!Array.isArray(SET.lists)||!SET.lists.length)SET.lists=clone(DEFAULT_LISTS);
      if(!Array.isArray(SET.categories)||!SET.categories.length)SET.categories=clone(DEFAULT_CATS);
      if(!Array.isArray(SET.shopLists)||!SET.shopLists.length)SET.shopLists=clone(SET_DEFAULT.shopLists);
      if(!Array.isArray(SET.linkCats)||!SET.linkCats.length)SET.linkCats=clone(SET_DEFAULT.linkCats);
      render();
    },()=>{}));
  },
  async migrateLocal(){
    const d=this.readLocal();if(!d)return;
    const items=[];COLS.forEach(c=>(d[c]||[]).forEach(x=>x&&x.id&&items.push([c,x])));
    try{
      if(items.length)await this.writeMany(items);
      if(d.settings&&Object.keys(d.settings).length){const snap=await this.base.get().catch(()=>null);if(!(snap&&snap.exists))await this.base.set(clean(d.settings),{merge:true});}
      localStorage.removeItem(LS2);localStorage.removeItem(LS1);
      if(items.length)toast("Moved "+plural(items.length,"item")+" from this device into your account");
    }catch(e){console.error(e);}
  },
  async writeMany(items){for(let i=0;i<items.length;i+=400){const b=fbDb.batch();items.slice(i,i+400).forEach(([c,x])=>b.set(this.base.collection(c).doc(x.id),clean(x)));await b.commit();}},
  fail(e){console.error(e);toast(e&&e.code==="permission-denied"?"Sync was refused. Check the database rules in Firebase (setup guide, step 1).":"Couldn't sync that change yet. It will retry when you're back online.");},
  put(c,x){D[c].set(x.id,x);render();if(this.mode==="cloud")this.base.collection(c).doc(x.id).set(clean(x)).catch(e=>this.fail(e));else this._persist();},
  del(c,id){D[c].delete(id);render();if(this.mode==="cloud")this.base.collection(c).doc(id).delete().catch(e=>this.fail(e));else this._persist();},
  settings(patch){Object.assign(SET,patch);render();if(this.mode==="cloud")this.base.set(clean(patch),{mergeFields:Object.keys(patch)}).catch(e=>this.fail(e));else this._persist();},
  async importAll(data){
    const items=[];COLS.forEach(c=>(Array.isArray(data[c])?data[c]:[]).forEach(x=>{if(x&&x.id){D[c].set(x.id,x);items.push([c,x]);}}));
    const st=data.settings&&typeof data.settings==="object"?data.settings:null;
    if(st)Object.assign(SET,st);
    render();
    if(this.mode==="cloud"){await this.writeMany(items);if(st)await this.base.set(clean(st),{merge:true});}else this._persist();
    return items.length;
  }
};

function updateSync(forced){
  let mode,label;
  if(forced==="error"){mode="error";label="Sync problem";}
  else if(Store.mode==="cloud"){if(navigator.onLine){mode="cloud";label=UI.ready?"Synced":"Syncing…";}else{mode="offline";label="Offline";}}
  else{mode="local";label=fbAuth?"Sign in to sync":fbFailed?"Offline":"This device only";}
  document.querySelectorAll(".sync").forEach(el=>{el.className="sync "+mode;el.querySelector("span").textContent=label;});
}
window.addEventListener("online",()=>updateSync());window.addEventListener("offline",()=>updateSync());

function authMsg(e){const c=(e&&e.code)||"";
  if(c.includes("invalid-credential")||c.includes("wrong-password")||c.includes("user-not-found"))return"That email and password don't match. Check them, or create an account.";
  if(c.includes("email-already-in-use"))return"There's already an account with that email. Sign in instead.";
  if(c.includes("weak-password"))return"Use a password with at least 6 characters.";
  if(c.includes("invalid-email"))return"That doesn't look like an email address.";
  if(c.includes("network"))return"No internet connection. Connect and try again.";
  if(c.includes("too-many-requests"))return"Too many attempts. Wait a minute and try again.";
  if(c.includes("operation-not-allowed"))return"Email sign-in isn't switched on in Firebase yet (setup guide, step 1).";
  return"Couldn't sign in: "+(e&&e.message||"unknown error");}

function openAccount(){
  if($(".scrim.acct"))return;
  if(!fbAuth){
    const close=openSheet(fbFailed?[h("h3",{text:"Can't reach sync"}),h("p",{class:"muted",text:"The app couldn't connect to sync, so it's using what's saved on this device. Check your internet, then close and reopen the app."}),h("div",{class:"actions"},h("button",{class:"btn primary",text:"OK",onclick:()=>close()}))]:[h("h3",{text:"Sync isn't set up yet"}),h("p",{class:"muted",text:"Everything is saved on this device only. To sync your phone and laptop, add your Firebase details to config.js. The setup guide walks you through it."}),h("div",{class:"actions"},h("button",{class:"btn primary",text:"OK",onclick:()=>close()}))],{cls:"acct"});return;
  }
  if(Store.user){
    const out=h("button",{class:"btn ghost",text:"Sign out"});
    const close=openSheet([h("h3",{text:"Your account"}),h("p",{class:"muted",text:"Signed in as "+(Store.user.email||"")+". Sign in with the same email on your other devices and everything stays in sync."}),h("p",{class:"muted",text:navigator.onLine?"Status: connected and syncing.":"Status: offline. Changes are saved and will sync when you reconnect."}),h("div",{class:"actions"},out,h("button",{class:"btn primary",text:"Done",onclick:()=>close()}))],{cls:"acct"});
    out.onclick=()=>{fbAuth.signOut();close();toast("Signed out");};return;
  }
  const email=h("input",{class:"inp",type:"email",placeholder:"you@example.com",autocomplete:"email","aria-label":"Email"});
  const pass=h("input",{class:"inp",type:"password",placeholder:"At least 6 characters",autocomplete:"current-password","aria-label":"Password"});
  const err=h("div",{class:"small",style:"color:var(--danger);min-height:20px;margin-top:10px",role:"alert"});
  const signin=h("button",{class:"btn primary",text:"Sign in"}),create=h("button",{class:"btn ghost",text:"Create account"});
  const forgot=h("button",{class:"linkbtn",text:"Forgot password?"}),skip=h("button",{class:"linkbtn",text:"Use without syncing"});
  const close=openSheet([h("h3",{text:"Sync your planner"}),
    h("p",{class:"muted",text:"Sign in with the same email on your phone and laptop, and everything stays in sync. First time? Create an account."}),
    h("div",{class:"field"},h("label",{text:"Email"}),email),h("div",{class:"field"},h("label",{text:"Password"}),pass),err,
    h("div",{class:"actions",style:"margin-top:8px"},create,signin),h("div",{class:"row",style:"justify-content:space-between;margin-top:12px"},forgot,skip)],{cls:"acct"});
  async function go(fn,btn){err.textContent="";const e=email.value.trim(),p=pass.value;if(!e||!p){err.textContent="Enter your email and password.";return;}
    btn.disabled=true;try{await fn(e,p);lsSet("planner.skipSync","0");close();toast("Signed in. Syncing is on.");}catch(x){err.textContent=authMsg(x);}btn.disabled=false;}
  signin.onclick=()=>go((e,p)=>fbAuth.signInWithEmailAndPassword(e,p),signin);
  create.onclick=()=>go((e,p)=>fbAuth.createUserWithEmailAndPassword(e,p),create);
  pass.addEventListener("keydown",e=>{if(e.key==="Enter")signin.click();});
  forgot.onclick=async()=>{const e=email.value.trim();if(!e){err.textContent="Type your email first, then tap Forgot password.";return;}try{await fbAuth.sendPasswordResetEmail(e);err.textContent="";toast("Reset link sent to "+e);}catch(x){err.textContent=authMsg(x);}};
  skip.onclick=()=>{lsSet("planner.skipSync","1");close();};
}

/* ================= notifications ================= */
function remindAt(t){const [H,M]=(t.time||"09:00").split(":").map(Number);const d=fromKey(t.date);d.setHours(H,M,0,0);return d.getTime()-Number(t.remind)*60000;}
const Notify={
  timers:[],
  ok(){return "Notification" in window;},
  on(){return this.ok()&&Notification.permission==="granted"&&lsGet("planner.notif","0")==="1";},
  async enable(){
    if(!this.ok()){toast("This browser can't show notifications.");return;}
    let p=Notification.permission;if(p!=="granted")p=await Notification.requestPermission();
    if(p==="granted"){lsSet("planner.notif","1");this.schedule();this.show("Notifications are on","Task reminders and check-ins will appear here.","test");}
    else toast("Notifications are blocked. Allow them for this app in your phone's settings.");
    render();
  },
  disable(){lsSet("planner.notif","0");this.clear();render();},
  clear(){this.timers.forEach(clearTimeout);this.timers=[];},
  show(title,body,tag){
    const opts={body,tag,icon:"icon-192.png",badge:"icon-192.png",data:{url:"./"}};
    const plain=()=>{try{new Notification(title,opts);}catch(e){}};
    if("serviceWorker" in navigator&&navigator.serviceWorker.controller)navigator.serviceWorker.ready.then(r=>r.showNotification(title,opts)).catch(plain);else plain();
  },
  fired(){try{return new Set(JSON.parse(localStorage.getItem("planner.fired")||"[]"));}catch(e){return new Set();}},
  mark(k){lsSet("planner.fired",JSON.stringify([...this.fired(),k].slice(-300)));},
  schedule(){
    this.clear();if(!this.on())return;
    const now=Date.now(),hz=now+36*3600e3,fired=this.fired();
    const add=(at,k,fn)=>{if(at<now-60000||at>hz||fired.has(k))return;this.timers.push(setTimeout(()=>{if(this.fired().has(k))return;this.mark(k);fn();},Math.max(0,at-now)));};
    for(const t of D.tasks.values()){
      if(t.done||t.remind==null||t.remind===""||!t.date)continue;
      const at=remindAt(t);
      add(at,"t:"+t.id+":"+at,()=>{const c=D.tasks.get(t.id);if(c&&!c.done)this.show(c.title,[c.time?fmtTime(c.time):"",relLabel(c.date)].filter(Boolean).join(", "),"t-"+c.id);});
    }
    const nudge=(pref,tag,fn)=>{const v=lsGet(pref,"");if(!v)return;const [H,M]=v.split(":").map(Number);for(const off of [0,1]){const d=addDays(new Date(),off);d.setHours(H,M,0,0);add(d.getTime(),tag+":"+key(d),fn);}};
    nudge("planner.habitNudge","h",()=>{const left=vals("habits").filter(x=>!x.archived&&habitDue(x,new Date())&&!(x.log&&x.log[todayKey()]));if(left.length)this.show("Habit check-in",plural(left.length,"habit")+" left today: "+left.slice(0,3).map(x=>x.name).join(", "),"habits");});
    for(const s of D.subs.values()){if(s.paused||s.remind===""||s.remind==null||!s.nextDate)continue;const d=addDays(fromKey(s.nextDate),-Number(s.remind));d.setHours(9,0,0,0);add(d.getTime(),"s:"+s.id+":"+s.nextDate,()=>this.show(s.name+(Number(s.remind)?" due "+relLow(s.nextDate):" due today"),money(s.amount)+(s.autoLog?", logged automatically":""),"sub-"+s.id));}
    for(const c of D.countdowns.values()){const n=cdNext(c);const d=fromKey(n);d.setHours(9,0,0,0);add(d.getTime(),"c:"+c.id+":"+n,()=>this.show((c.emoji||"🎉")+" Today: "+c.title,"Your countdown has arrived.","cd-"+c.id));}
    nudge("planner.journalNudge","j",()=>{if(!D.notes.has("j-"+todayKey()))this.show("Journal","How was your day? Take two minutes to write it down.","journal");});
  }
};
const scheduleNotify=debounce(()=>Notify.schedule(),1000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)scheduleNotify();});
