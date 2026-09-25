(function(){
 const bc=new BroadcastChannel("mockfs");
 const load=()=>JSON.parse(localStorage.getItem("mockfs")||"{}");
 let db=load(); const L=[];
 const save=()=>{localStorage.setItem("mockfs",JSON.stringify(db));bc.postMessage(1);notify();};
 bc.onmessage=()=>{db=load();notify();};
 const colDocs=(p,where)=>{const pre=p+"/";return Object.keys(db).filter(k=>k.startsWith(pre)&&!k.slice(pre.length).includes("/")).filter(k=>!where||where(db[k])).map(k=>[k.slice(pre.length),k]);};
 function fire(l){
   if(l.kind==="doc"){const s=JSON.stringify(db[l.path]||null);if(l.init&&l.last===s)return;l.init=true;l.last=s;const d=db[l.path];l.cb({exists:!!d,data:()=>d?JSON.parse(s):undefined});return;}
   const now=new Map(colDocs(l.path,l.where).map(([id,k])=>[id,JSON.stringify(db[k])]));const ch=[];
   now.forEach((v,id)=>{if(!l.known.has(id))ch.push(["added",id]);else if(l.known.get(id)!==v)ch.push(["modified",id]);});
   l.known.forEach((v,id)=>{if(!now.has(id))ch.push(["removed",id]);});
   if(l.init&&!ch.length)return;const old=l.known;l.init=true;l.known=now;
   l.cb({docChanges:()=>ch.map(([t,id])=>({type:t,doc:{id,data:()=>JSON.parse(now.get(id)||old.get(id))}})),forEach(fn){now.forEach((v,id)=>fn({id,data:()=>JSON.parse(v)}));}});
 }
 const notify=()=>L.slice().forEach(fire);
 const listen=l=>{L.push(l);setTimeout(()=>fire(l),5);return()=>{const i=L.indexOf(l);if(i>=0)L.splice(i,1);};};
 const FV={arrayUnion:(...v)=>({__op:"union",v}),arrayRemove:(...v)=>({__op:"remove",v}),delete:()=>({__op:"del"})};
 const applyOp=(cur,val)=>{if(val&&val.__op==="union"){const a=Array.isArray(cur)?cur.slice():[];val.v.forEach(x=>{if(!a.includes(x))a.push(x);});return a;}if(val&&val.__op==="remove"){return (Array.isArray(cur)?cur:[]).filter(x=>!val.v.includes(x));}return JSON.parse(JSON.stringify(val));};
 let n=0;const autoId=()=>"id"+Date.now().toString(36)+(n++)+Math.random().toString(36).slice(2,6);
 const docRef=path=>({path,id:path.split("/").pop(),collection:c=>colRef(path+"/"+c),
   async set(data,opt){data=JSON.parse(JSON.stringify(data));if(opt&&opt.mergeFields){const c=db[path]||{};opt.mergeFields.forEach(f=>c[f]=data[f]);db[path]=c;}else if(opt&&opt.merge)db[path]=Object.assign({},db[path]||{},data);else db[path]=data;save();},
   async update(data){if(!db[path]){const e=new Error("not found");e.code="not-found";throw e;}const d=db[path];for(const [k,v] of Object.entries(data)){const parts=k.split(".");let o=d;for(let i=0;i<parts.length-1;i++){o[parts[i]]=o[parts[i]]||{};o=o[parts[i]];}const last=parts[parts.length-1];if(v&&v.__op==="del")delete o[last];else o[last]=applyOp(o[last],v);}save();},
   async delete(){delete db[path];save();},async get(){const d=db[path];return{exists:!!d,data:()=>d};},
   onSnapshot(cb){return listen({kind:"doc",path,cb});}});
 const colRef=path=>({doc:id=>docRef(path+"/"+(id||autoId())),onSnapshot(cb){return listen({kind:"col",path,cb,known:new Map()});},
   async get(){const docs=colDocs(path).map(([id,k])=>({id,ref:docRef(k),data:()=>JSON.parse(JSON.stringify(db[k]))}));return{docs,size:docs.length,forEach:f=>docs.forEach(f)};},
   where(f,op,v){const w=d=>op==="array-contains"?Array.isArray(d[f])&&d[f].includes(v):op==="=="?d[f]===v:false;
     return{onSnapshot(cb){return listen({kind:"col",path,cb,known:new Map(),where:w});},
       async get(){const docs=colDocs(path,w).map(([id,k])=>({id,ref:docRef(k),data:()=>JSON.parse(JSON.stringify(db[k]))}));return{docs,size:docs.length,forEach:f=>docs.forEach(f)};}};}});
 const fs={collection:c=>colRef(c),batch(){const ops=[];return{set(r,d){ops.push(()=>r.set(d));},delete(r){ops.push(()=>r.delete());},async commit(){for(const o of ops)await o();}};},enablePersistence:()=>Promise.resolve(),
   terminate:()=>Promise.resolve(),clearPersistence:()=>Promise.resolve()};
 // Accounts: passwords live in localStorage "mockpw" (like a server); default password is secret123.
 const pws=()=>JSON.parse(localStorage.getItem("mockpw")||"{}"),setPw=(e,p)=>{const m=pws();if(p==null)delete m[e];else m[e]=p;localStorage.setItem("mockpw",JSON.stringify(m));};
 const pwOf=e=>pws()[e]||"secret123";
 const err=c=>{const x=new Error(c);x.code=c;return x;};
 const persist=()=>{if(user)sessionStorage.setItem("mockuser",JSON.stringify({uid:user.uid,email:user.email,displayName:user.displayName||null,metadata:user.metadata}));else sessionStorage.removeItem("mockuser");};
 let user=JSON.parse(sessionStorage.getItem("mockuser")||"null");const cbs=[];
 const mk=u=>u&&Object.assign(u,{
   metadata:u.metadata||{creationTime:new Date(2026,0,15).toUTCString()},
   async reauthenticateWithCredential(c){if(c.pw!==pwOf(u.email))throw err("auth/wrong-password");},
   async updateProfile(p){Object.assign(u,p);persist();const m=JSON.parse(localStorage.getItem("mocknames")||"{}");m[u.email]=u.displayName;localStorage.setItem("mocknames",JSON.stringify(m));},
   async updatePassword(p){if(p.length<6)throw err("auth/weak-password");setPw(u.email,p);},
   async reload(){},
   async delete(){setPw(u.email,null);const m=JSON.parse(localStorage.getItem("mockdeleted")||"[]");m.push(u.email);localStorage.setItem("mockdeleted",JSON.stringify(m));user=null;persist();cbs.forEach(c=>c(null));}});
 user=mk(user);
 const auth={onAuthStateChanged(cb){cbs.push(cb);setTimeout(()=>cb(user),5);return()=>{};},
   async signInWithEmailAndPassword(e,p){if(p!==undefined&&p!==pwOf(e))throw err("auth/invalid-credential");user=mk({uid:"u_"+e.split("@")[0],email:e,displayName:JSON.parse(localStorage.getItem("mocknames")||"{}")[e]||null});persist();cbs.forEach(c=>c(user));return{user};},
   async createUserWithEmailAndPassword(e,p){setPw(e,p);return this.signInWithEmailAndPassword(e,p);},
   async signOut(){user=null;persist();cbs.forEach(c=>c(null));},async sendPasswordResetEmail(){}};
 const fsf=()=>fs;fsf.FieldValue=FV;
 const af=()=>auth;af.EmailAuthProvider={credential:(e,pw)=>({e,pw})};
 window.firebase={initializeApp(){},firestore:fsf,auth:af};
})();
