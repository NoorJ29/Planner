/* ================= shared lists (family) ================= */
const Shared={lists:new Map(),items:new Map(),unsub:null,itemUnsubs:new Map(),ready:false,error:""};
function meInfo(){const u=Store.user||{};const e=u.email||"";return{name:(u.displayName||e.split("@")[0]||"Someone").replace(/^./,c=>c.toUpperCase()),email:e};}
function sharedStop(){if(Shared.unsub){try{Shared.unsub();}catch(e){}}Shared.itemUnsubs.forEach(f=>{try{f();}catch(e){}});Shared.itemUnsubs.clear();Shared.lists.clear();Shared.items.clear();Shared.unsub=null;Shared.ready=false;Shared.error="";}
function sharedStart(){
  sharedStop();if(Store.mode!=="cloud"||!Store.user||!fbDb)return;const uid=Store.user.uid;
  Shared.unsub=fbDb.collection("shared").where("members","array-contains",uid).onSnapshot(snap=>{
    snap.docChanges().forEach(ch=>{if(ch.type==="removed"){Shared.lists.delete(ch.doc.id);const f=Shared.itemUnsubs.get(ch.doc.id);if(f){f();Shared.itemUnsubs.delete(ch.doc.id);}Shared.items.delete(ch.doc.id);}else Shared.lists.set(ch.doc.id,Object.assign({id:ch.doc.id},ch.doc.data()));});
    Shared.ready=true;Shared.error="";
    for(const id of Shared.lists.keys())if(!Shared.itemUnsubs.has(id))Shared.itemUnsubs.set(id,fbDb.collection("shared").doc(id).collection("items").onSnapshot(s=>{const m=Shared.items.get(id)||new Map();s.docChanges().forEach(c=>{if(c.type==="removed")m.delete(c.doc.id);else m.set(c.doc.id,Object.assign({id:c.doc.id},c.doc.data()));});Shared.items.set(id,m);render();},()=>{}));
    render();
  },err=>{console.error(err);Shared.ready=true;Shared.error=err&&err.code||"error";render();});
}
const itemsOf=id=>[...(Shared.items.get(id)||new Map()).values()];
function sharedFail(e){console.error(e);toast(e&&e.code==="permission-denied"?"Not allowed. Check the Firebase rules are updated (setup guide).":"Couldn't update the shared list. It will retry when you're online.");}
function makeCode(){const A="ABCDEFGHJKMNPQRSTUVWXYZ23456789";const r=crypto.getRandomValues(new Uint8Array(8));return [...r].map(x=>A[x%A.length]).join("");}
const fmtCode=c=>c.slice(0,4)+"-"+c.slice(4);
function renderShared(main){
  if(!fbAuth||Store.mode!=="cloud"){
    main.append(h("div",{class:"card sec"},h("b",{text:"Share lists with family"}),h("p",{class:"small muted",text:"Shared lists live in your sync account, so everyone who joins needs to sign in to Nova. "+(fbAuth?"Sign in first, then come back here.":"Set up sync first (see the setup guide).")}),fbAuth?h("button",{class:"btn primary",text:"Sign in",onclick:openAccount}):null));return;}
  if(Shared.error==="permission-denied"){main.append(h("div",{class:"card sec"},h("b",{text:"One more setup step"}),h("p",{class:"small muted",text:"Shared lists need the updated security rules. Open Firebase, go to Firestore Database, then Rules, paste the new firestore.rules file, and click Publish. Then reopen this page."})));return;}
  const L=UI.sharedList&&Shared.lists.get(UI.sharedList);
  if(L)return renderSharedList(main,L);
  UI.sharedList=null;
  main.append(h("div",{class:"btnrow"},h("button",{class:"btn primary wide",text:"+ New shared list",onclick:()=>openSharedNew()}),h("button",{class:"btn ghost",text:"Join with a code",onclick:()=>openJoin("")})));
  const lists=[...Shared.lists.values()].sort((a,b)=>(a.name||"").localeCompare(b.name||""));
  if(!Shared.ready)main.append(h("div",{class:"loading",text:"Loading shared lists…"}));
  else if(!lists.length)main.append(h("div",{class:"sec"},h("div",{class:"empty",text:"Create a list, then invite your family with a code. Everyone sees changes instantly: tick off milk at the shop and it's gone from their list too."})));
  else main.append(h("div",{class:"cards grid sec"},lists.map(l=>{const its=itemsOf(l.id),left=its.filter(i=>!i.done).length;
    return h("button",{class:"ncard",onclick:()=>{UI.sharedList=l.id;render();window.scrollTo(0,0);}},h("b",{text:(l.kind==="todo"?"✅ ":"🛒 ")+l.name}),h("p",{text:left?plural(left,"item")+" left":"All done"}),avatars(l));})));
}
function avatars(l){const ids=l.members||[];return h("div",{class:"avs"},ids.slice(0,6).map(id=>{const m=(l.memberInfo||{})[id]||{};const n=m.name||"?";return h("span",{class:"av",style:"--c:"+colorFor(id),title:n+(id===(Store.user||{}).uid?" (you)":""),text:n.charAt(0).toUpperCase()});}),ids.length>6?h("span",{class:"small muted",text:"+"+(ids.length-6)}):null,h("span",{class:"small muted",text:plural(ids.length,"member")}));}
function renderSharedList(main,L){
  const its=itemsOf(L.id).sort((a,b)=>(a.done?1:0)-(b.done?1:0)||(a.createdAt||0)-(b.createdAt||0));const uid=Store.user.uid;
  main.append(h("div",{class:"row",style:"margin-top:12px;justify-content:space-between"},h("button",{class:"back",text:"‹ Shared lists",onclick:()=>{UI.sharedList=null;render();}}),h("button",{class:"btn primary",style:"padding:9px 16px",text:"Invite",onclick:()=>invite(L)})));
  main.append(h("div",{class:"card sec"},h("b",{style:"font-family:var(--display);font-size:20px;display:block",text:(L.kind==="todo"?"✅ ":"🛒 ")+L.name}),avatars(L)));
  if(!its.length)main.append(h("div",{class:"sec"},h("div",{class:"empty",text:"Empty so far. Type below to add "+(L.kind==="todo"?"a to-do":"an item, e.g. 2 kg rice")+"."})));
  else main.append(h("div",{class:"sec"},h("ul",{class:"tasks"},its.map(it=>{
    const cb=h("button",{class:"check","aria-label":(it.done?"Untick ":"Tick ")+it.name,onclick:()=>fbDb.collection("shared").doc(L.id).collection("items").doc(it.id).update({done:!it.done,doneBy:it.done?"":meInfo().name}).catch(sharedFail)});cb.innerHTML=CHECK;
    const meta=[it.qty,it.by?"added by "+(it.byId===uid?"you":it.by):"",it.done&&it.doneBy?"ticked by "+(it.doneBy===meInfo().name?"you":it.doneBy):""].filter(Boolean).join(", ");
    return h("li",{class:"task"+(it.done?" done":"")},cb,h("div",{class:"tbody"},h("span",{class:"ttitle",text:it.name}),meta?h("span",{class:"meta",text:meta}):null),
      h("button",{class:"x","aria-label":"Remove "+it.name,text:"×",onclick:()=>{const prev=clone(it);delete prev.id;fbDb.collection("shared").doc(L.id).collection("items").doc(it.id).delete().catch(sharedFail);toast("Removed "+it.name,{label:"Undo",fn:()=>fbDb.collection("shared").doc(L.id).collection("items").doc(it.id).set(prev).catch(sharedFail)});}}));}))));
  const done=its.filter(i=>i.done);
  const menu=h("div",{class:"sec row",style:"justify-content:space-between"},
    done.length?h("button",{class:"linkbtn danger",text:"Clear "+done.length+" ticked",onclick:()=>{done.forEach(i=>fbDb.collection("shared").doc(L.id).collection("items").doc(i.id).delete().catch(sharedFail));}}):h("span"),
    h("button",{class:"linkbtn",text:"Share as text",onclick:()=>shareText(L.name,its.filter(i=>!i.done).map(i=>"- "+(i.qty?i.qty+" ":"")+i.name).join("\n"))}),
    h("button",{class:"linkbtn",text:L.owner===uid?"Rename or delete":"Leave list",onclick:()=>L.owner===uid?openSharedEdit(L):leaveShared(L)}));
  main.append(menu);
}
async function shareText(title,body){const text=title+"\n"+body;try{if(navigator.share){await navigator.share({title,text});return;}}catch(e){if(e&&e.name==="AbortError")return;}try{await navigator.clipboard.writeText(text);toast("Copied. Paste it into any chat.");}catch(e){toast("Couldn't share from this browser.");}}
function addSharedItem(v){
  const L=Shared.lists.get(UI.sharedList);if(!L)return;const p=L.kind==="todo"?{name:v.trim(),qty:""}:parseItem(v);
  const ref=fbDb.collection("shared").doc(L.id).collection("items").doc();
  ref.set({name:p.name,qty:p.qty,done:false,by:meInfo().name,byId:Store.user.uid,createdAt:Date.now()}).catch(sharedFail);
}
function openSharedNew(){
  let kind="shopping";const name=h("input",{class:"inp title",placeholder:"e.g. Family groceries, House jobs","aria-label":"List name"});
  const go=h("button",{class:"btn primary",text:"Create list"});
  const close=openSheet([h("h3",{text:"New shared list"}),name,h("div",{class:"field"},h("span",{class:"lbl",text:"Type"}),seg([["shopping","🛒 Shopping"],["todo","✅ To-do"]],kind,v=>{kind=v;})),h("div",{class:"actions"},h("button",{class:"btn ghost",text:"Cancel",onclick:()=>close()}),go)]);
  go.onclick=async()=>{const n=name.value.trim();if(!n){name.focus();return;}go.disabled=true;const uid=Store.user.uid;const ref=fbDb.collection("shared").doc();
    try{await ref.set({name:n,kind,owner:uid,members:[uid],memberInfo:{[uid]:meInfo()},createdAt:Date.now()});close();UI.sharedList=ref.id;Shared.lists.set(ref.id,{id:ref.id,name:n,kind,owner:uid,members:[uid],memberInfo:{[uid]:meInfo()}});render();setTimeout(()=>invite(Shared.lists.get(ref.id)),250);}
    catch(e){sharedFail(e);go.disabled=false;}};
  setTimeout(()=>name.focus(),60);
}
async function invite(L){
  const code=makeCode();const url=location.origin+location.pathname+"?join="+code;
  const box=h("div",{class:"codebox",text:"Creating code…"});
  const shareB=h("button",{class:"btn primary wide",text:"Send invite",disabled:true});
  openSheet([h("h3",{text:"Invite to "+L.name}),h("p",{class:"small muted",style:"margin:0 0 12px",text:"Send this code or link to family. They open Nova, sign in with their own account, and join. Anyone with the code can join, so only share it with people you trust. The code works for 7 days."}),box,h("div",{class:"btnrow"},shareB)]);
  try{await fbDb.collection("invites").doc(code).set({listId:L.id,listName:L.name,createdBy:Store.user.uid,createdAt:Date.now()});
    box.textContent=fmtCode(code);shareB.disabled=false;
    shareB.onclick=()=>shareText("Join my list “"+L.name+"” on Nova","Open this link: "+url+"\nOr in Nova go to More, Shared lists, Join with a code, and enter "+fmtCode(code));}
  catch(e){box.textContent="Couldn't create a code.";sharedFail(e);}
}
function openJoin(pre){
  if(Store.mode!=="cloud"){toast("Sign in to join a shared list.");if(fbAuth)openAccount();return;}
  const inp=h("input",{class:"inp codein",value:pre?fmtCode(pre):"",placeholder:"ABCD-2345",autocapitalize:"characters",autocomplete:"off","aria-label":"Invite code"});
  const err=h("div",{class:"small",style:"color:var(--danger);min-height:18px;margin-top:8px"});
  const go=h("button",{class:"btn primary",text:"Join list"});
  const close=openSheet([h("h3",{text:"Join a shared list"}),h("p",{class:"small muted",style:"margin:0 0 10px",text:"Enter the code someone sent you."}),inp,err,h("div",{class:"actions"},h("button",{class:"btn ghost",text:"Cancel",onclick:()=>close()}),go)]);
  go.onclick=async()=>{const code=inp.value.toUpperCase().replace(/[^A-Z0-9]/g,"");err.textContent="";if(code.length!==8){err.textContent="Codes have 8 letters and numbers.";return;}go.disabled=true;
    try{const inv=await fbDb.collection("invites").doc(code).get();if(!inv.exists){err.textContent="That code wasn't found. Check it, or ask for a new one.";go.disabled=false;return;}
      const {listId,listName}=inv.data();const uid=Store.user.uid;
      await fbDb.collection("shared").doc(listId).update({members:firebase.firestore.FieldValue.arrayUnion(uid),["memberInfo."+uid]:meInfo(),joinCode:code});
      close();UI.tab="more";UI.page="shared";UI.sharedList=listId;render();toast("You joined "+(listName||"the list"));}
    catch(e){console.error(e);err.textContent=e&&e.code==="permission-denied"?"That code has expired or the list was deleted. Ask for a new code.":"Couldn't join right now. Check your connection.";go.disabled=false;}};
  setTimeout(()=>inp.focus(),60);
}
function leaveShared(L){
  const go=h("button",{class:"btn primary",style:"background:var(--danger)",text:"Leave"});
  const close=openSheet([h("h3",{text:"Leave “"+L.name+"”?"}),h("p",{class:"muted",text:"It disappears from your lists. Others keep it. You'd need a new invite to rejoin."}),h("div",{class:"actions"},h("button",{class:"btn ghost",text:"Cancel",onclick:()=>close()}),go)]);
  go.onclick=()=>{const FV=firebase.firestore.FieldValue,me=Store.user.uid;fbDb.collection("shared").doc(L.id).update({members:FV.arrayRemove(me),["memberInfo."+me]:FV.delete()}).catch(sharedFail);Shared.lists.delete(L.id);UI.sharedList=null;close();render();toast("You left "+L.name);};
}
function openSharedEdit(L){
  const name=h("input",{class:"inp",value:L.name,"aria-label":"List name"});
  const save=h("button",{class:"btn primary",text:"Save"}),del=h("button",{class:"btn danger",text:"Delete list"});
  const close=openSheet([h("h3",{text:"Edit shared list"}),name,h("p",{class:"small muted",text:"Deleting removes the list for everyone."}),h("div",{class:"actions"},del,h("button",{class:"btn ghost",text:"Cancel",onclick:()=>close()}),save)]);
  save.onclick=()=>{const n=name.value.trim();if(!n)return;fbDb.collection("shared").doc(L.id).update({name:n}).catch(sharedFail);close();};
  twoTap(del,"Tap again to delete for everyone",async()=>{close();try{for(const it of itemsOf(L.id))await fbDb.collection("shared").doc(L.id).collection("items").doc(it.id).delete();await fbDb.collection("shared").doc(L.id).delete();Shared.lists.delete(L.id);UI.sharedList=null;render();toast("List deleted");}catch(e){sharedFail(e);}});
}
