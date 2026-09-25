/* ================= app lock ================= */
const LOCK_KEY="planner.lock";
function lockCfg(){try{return JSON.parse(localStorage.getItem(LOCK_KEY)||"null");}catch(e){return null;}}
const b64=buf=>btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function hashPin(pin,salt){
  const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(pin),"PBKDF2",false,["deriveBits"]);
  return b64(await crypto.subtle.deriveBits({name:"PBKDF2",salt:unb64(salt),iterations:150000,hash:"SHA-256"},k,256));
}
async function setPin(pin){const salt=b64(crypto.getRandomValues(new Uint8Array(16)));const old=lockCfg()||{};lsSet(LOCK_KEY,JSON.stringify({salt,hash:await hashPin(pin,salt),len:pin.length,after:old.after??1,cred:old.cred||null}));}
async function checkPin(pin){const c=lockCfg();return !!c&&(await hashPin(pin,c.salt))===c.hash;}
async function bioAvailable(){try{return !!(window.PublicKeyCredential&&await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());}catch(e){return false;}}
async function registerBio(){
  const cred=await navigator.credentials.create({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),rp:{name:"Planner"},user:{id:crypto.getRandomValues(new Uint8Array(16)),name:"planner-app-lock",displayName:"Planner app lock"},
    pubKeyCredParams:[{type:"public-key",alg:-7},{type:"public-key",alg:-257}],authenticatorSelection:{authenticatorAttachment:"platform",userVerification:"required",residentKey:"discouraged"},timeout:60000}});
  const c=lockCfg();c.cred=b64(cred.rawId);lsSet(LOCK_KEY,JSON.stringify(c));
}
async function bioVerify(){const c=lockCfg();if(!c||!c.cred)return false;
  await navigator.credentials.get({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),allowCredentials:[{type:"public-key",id:unb64(c.cred),transports:["internal"]}],userVerification:"required",timeout:60000}});return true;}
let appLocked=false,hiddenAt=0;
function lockNow(){if(!lockCfg()||appLocked)return;appLocked=true;document.body.classList.add("locked");showLockScreen();}
function unlockApp(){appLocked=false;document.body.classList.remove("locked");render();const el=$("#lockScreen");if(el){el.classList.add("out");setTimeout(()=>el.remove(),200);}}
document.addEventListener("visibilitychange",()=>{const c=lockCfg();if(!c)return;if(document.hidden)hiddenAt=Date.now();else if(hiddenAt&&Date.now()-hiddenAt>=(Number(c.after)||0)*60000)lockNow();});
function showLockScreen(){
  const c=lockCfg();if(!c)return;const old=$("#lockScreen");if(old)old.remove();
  let pin="",busy=false,fails=Number(sessionStorage.getItem("planner.lockFails")||0),waitUntil=Number(sessionStorage.getItem("planner.lockWait")||0);
  const dots=h("div",{class:"pdots","aria-hidden":"true"}),msg=h("div",{class:"pmsg",role:"status"});
  const drawDots=()=>{dots.textContent="";for(let i=0;i<c.len;i++)dots.append(h("i",{class:i<pin.length?"on":""}));};
  const shake=()=>{dots.classList.remove("shake");void dots.offsetWidth;dots.classList.add("shake");if(navigator.vibrate)navigator.vibrate(120);};
  const tryPin=async()=>{if(busy)return;busy=true;
    if(await checkPin(pin)){sessionStorage.removeItem("planner.lockFails");unlockApp();return;}
    fails++;sessionStorage.setItem("planner.lockFails",String(fails));pin="";drawDots();shake();busy=false;
    if(fails%5===0){waitUntil=Date.now()+30000;sessionStorage.setItem("planner.lockWait",String(waitUntil));}
    msg.textContent=Date.now()<waitUntil?"Too many tries. Wait 30 seconds.":"Wrong PIN. Try again.";};
  const press=d=>{if(busy)return;if(Date.now()<waitUntil){msg.textContent="Too many tries. Wait "+Math.ceil((waitUntil-Date.now())/1000)+" seconds.";return;}
    if(d==="del"){pin=pin.slice(0,-1);drawDots();return;}if(pin.length>=c.len)return;pin+=d;msg.textContent="";drawDots();if(pin.length===c.len)setTimeout(tryPin,90);};
  const bio=async()=>{try{if(await bioVerify())unlockApp();}catch(e){msg.textContent="Use your PIN instead.";}};
  const key_=(d,label)=>h("button",{class:"pkey"+(d==="del"||d==="bio"?" fn":""),"aria-label":label||d,onclick:()=>d==="bio"?bio():press(d)},label&&d!=="del"&&d!=="bio"?label:d==="del"?"⌫":d==="bio"?"👆":d);
  const pad_=h("div",{class:"pkeys"},["1","2","3","4","5","6","7","8","9"].map(n=>key_(n)),c.cred?key_("bio","Use fingerprint or face"):h("span"),key_("0"),key_("del","Delete"));
  const scr=h("div",{id:"lockScreen",role:"dialog","aria-modal":"true","aria-label":"Planner is locked"},
    h("img",{src:"icon-192.png",alt:"",width:"64",height:"64",class:"plogo"}),h("h2",{text:"Enter your PIN"}),dots,msg,pad_,
    h("button",{class:"linkbtn",text:"Forgot PIN?",onclick:forgotPin}));
  document.body.append(scr);drawDots();
  scr.addEventListener("keydown",e=>{e.stopPropagation();if(/^[0-9]$/.test(e.key)){e.preventDefault();press(e.key);}else if(e.key==="Backspace")press("del");});
  scr.tabIndex=-1;setTimeout(()=>scr.focus(),50);
  if(c.cred)setTimeout(bio,350);
}
function forgotPin(){
  if(fbAuth&&Store.user&&Store.user.email){
    const pw=h("input",{class:"inp",type:"password",placeholder:"Your account password",autocomplete:"current-password","aria-label":"Password"});
    const err=h("div",{class:"small",style:"color:var(--danger);min-height:18px;margin-top:8px"});
    const go=h("button",{class:"btn primary",text:"Remove app lock"});
    const close=openSheet([h("h3",{text:"Forgot your PIN?"}),h("p",{class:"muted",text:"Enter the password for "+Store.user.email+" to remove the app lock on this device. You can set a new PIN afterwards."}),pw,err,h("div",{class:"actions"},h("button",{class:"btn ghost",text:"Cancel",onclick:()=>close()}),go)]);
    [...document.querySelectorAll(".scrim")].pop().classList.add("overlock");
    go.onclick=async()=>{go.disabled=true;err.textContent="";try{const cred=firebase.auth.EmailAuthProvider.credential(Store.user.email,pw.value);await Store.user.reauthenticateWithCredential(cred);localStorage.removeItem(LOCK_KEY);close();unlockApp();toast("App lock removed. Set a new PIN in Settings.");}catch(e){err.textContent=e&&e.code&&e.code.includes("network")?"No internet connection. Connect and try again.":"That password isn't right.";go.disabled=false;}};
    setTimeout(()=>pw.focus(),60);return;
  }
  const conf=h("input",{class:"inp",placeholder:"Type ERASE to confirm","aria-label":"Confirm"});
  const go=h("button",{class:"btn primary",style:"background:var(--danger)",text:"Erase and unlock"});
  const close=openSheet([h("h3",{text:"Forgot your PIN?"}),h("p",{class:"muted",text:"You're not signed in to sync, so the only way to remove the lock is to erase everything saved on this device. This can't be undone."}),conf,h("div",{class:"actions"},h("button",{class:"btn ghost",text:"Cancel",onclick:()=>close()}),go)]);
  [...document.querySelectorAll(".scrim")].pop().classList.add("overlock");
  go.onclick=()=>{if(conf.value.trim().toUpperCase()!=="ERASE"){conf.focus();return;}Object.keys(localStorage).filter(k=>k.startsWith("planner.")).forEach(k=>localStorage.removeItem(k));location.reload();};
}
function openPinSetup(mode){
  const inp=()=>h("input",{class:"inp pinin",type:"password",inputmode:"numeric",pattern:"[0-9]*",maxlength:"6",autocomplete:"off",placeholder:"••••"});
  const cur=mode==="change"||mode==="off"?inp():null,a=mode==="off"?null:inp(),b=mode==="off"?null:inp();
  const err=h("div",{class:"small",style:"color:var(--danger);min-height:18px;margin-top:8px"});
  const go=h("button",{class:"btn primary",text:mode==="off"?"Turn off app lock":"Save PIN"});
  const close=openSheet([h("h3",{text:mode==="off"?"Turn off app lock":mode==="change"?"Change PIN":"Set up app lock"}),
    mode==="new"?h("p",{class:"small muted",style:"margin:0",text:"Choose a 4 to 6 digit PIN. You'll need it to open Planner on this device."}):null,
    cur?h("div",{class:"field"},h("label",{text:"Current PIN"}),cur):null,a?h("div",{class:"field"},h("label",{text:"New PIN"}),a):null,b?h("div",{class:"field"},h("label",{text:"Type it again"}),b):null,err,
    h("div",{class:"actions"},h("button",{class:"btn ghost",text:"Cancel",onclick:()=>close()}),go)]);
  go.onclick=async()=>{err.textContent="";go.disabled=true;
    try{
      if(cur&&!(await checkPin(cur.value))){err.textContent="Current PIN isn't right.";return;}
      if(mode==="off"){localStorage.removeItem(LOCK_KEY);close();toast("App lock turned off");render();return;}
      if(!/^\d{4,6}$/.test(a.value)){err.textContent="Use 4 to 6 digits.";return;}
      if(a.value!==b.value){err.textContent="The two PINs don't match.";return;}
      await setPin(a.value);close();toast(mode==="change"?"PIN changed":"App lock is on");render();
    }finally{go.disabled=false;}};
  setTimeout(()=>(cur||a).focus(),60);
}
async function renderLockSettings(box,row){
  const c=lockCfg();const bioOk=await bioAvailable();
  box.append(row("App lock",c?"On. Asks for your PIN"+(c.cred?" or fingerprint":"")+" when you open Planner.":"Off. Anyone with your unlocked phone can open Planner.",
    c?h("button",{class:"chip",text:"Turn off",onclick:()=>openPinSetup("off")}):h("button",{class:"btn primary",text:"Set PIN",onclick:()=>openPinSetup("new")})));
  if(!c)return;
  box.append(row("Change PIN","",h("button",{class:"chip",text:"Change",onclick:()=>openPinSetup("change")})));
  if(bioOk)box.append(row("Fingerprint or face unlock",c.cred?"On":"Unlock without typing your PIN",
    h("button",{class:"chip",text:c.cred?"Turn off":"Turn on",onclick:async()=>{try{if(c.cred){const x=lockCfg();x.cred=null;lsSet(LOCK_KEY,JSON.stringify(x));}else{await registerBio();toast("Fingerprint unlock is on");}}catch(e){toast("Couldn't set that up on this device.");}render();}})));
  box.append(row("Lock after","When you leave the app",h("select",{class:"inp","aria-label":"Lock after",onchange:e=>{const x=lockCfg();x.after=Number(e.target.value);lsSet(LOCK_KEY,JSON.stringify(x));}},[[0,"Immediately"],[1,"1 minute"],[5,"5 minutes"],[15,"15 minutes"],[60,"1 hour"]].map(([v,l])=>h("option",{value:v,selected:Number(c.after)===v},l)))));
  box.append(row("Lock now","",h("button",{class:"chip",text:"Lock",onclick:lockNow})));
}
