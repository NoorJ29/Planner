/* ================= attachments: pictures and files in notes ================= */
// Stored in Firestore (Cloud Storage needs the paid Blaze plan). users/{uid}/files/{id} holds the details;
// users/{uid}/files/{id}/parts/{n} hold the content as base64 pieces under Firestore's 1 MiB document limit.
const FILE_MAX=5*1024*1024,FILE_PART=700000,PIC_SIDE=1600,PIC_TYPES=["image/jpeg","image/png","image/webp","image/gif"];
const fileCache=new Map(); // id -> Promise<{blob,url,meta}>
const okFileId=id=>typeof id==="string"&&/^[a-z0-9]{4,32}$/.test(id);
const filesCol=()=>Store.base.collection("files");
const fmtSize=n=>n<1024?n+" B":n<1048576?Math.round(n/1024)+" KB":(n/1048576).toFixed(1)+" MB";
function canAttach(){return Store.mode==="cloud"&&!!Store.user&&!!Store.base;}
const blobToB64=blob=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(",")[1]||"");r.onerror=()=>rej(r.error);r.readAsDataURL(blob);});
function b64ToBlob(b64,type){const bin=atob(b64),a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return new Blob([a],{type});}
function imageOf(blob){return new Promise((res,rej)=>{const url=URL.createObjectURL(blob),img=new Image();img.onload=()=>res({img,url});img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error("That picture couldn't be read. Try a JPEG or PNG."));};img.src=url;});}
// Pictures: longest side 1600 px, JPEG, white behind any transparency. GIFs stay as they are (they may be animated).
async function shrinkPicture(file){
  const {img,url}=await imageOf(file);URL.revokeObjectURL(url);
  if(file.type==="image/gif")return{blob:file,type:"image/gif",w:img.naturalWidth,h:img.naturalHeight};
  const k=Math.min(1,PIC_SIDE/Math.max(img.naturalWidth,img.naturalHeight)),pw=Math.max(1,Math.round(img.naturalWidth*k)),ph=Math.max(1,Math.round(img.naturalHeight*k));
  const c=h("canvas",{width:pw,height:ph}),x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,pw,ph);x.drawImage(img,0,0,pw,ph);
  const blob=await new Promise(r=>c.toBlob(r,"image/jpeg",.82));return{blob,type:"image/jpeg",w:pw,h:ph};
}
async function saveAttachment(file,noteId){
  if(!canAttach())throw new Error("Sign in to add pictures and files. They're kept in your account.");
  let blob=file,type=file.type||"application/octet-stream",name=String(file.name||"file").slice(0,200),pw=0,ph=0;
  const pic=PIC_TYPES.includes(type);
  if(pic){const r=await shrinkPicture(file);blob=r.blob;type=r.type;pw=r.w;ph=r.h;if(type==="image/jpeg")name=name.replace(/\.[a-z0-9]+$/i,"")+".jpg";}
  if(blob.size>FILE_MAX)throw new Error("“"+name+"” is "+fmtSize(blob.size)+". Files can be up to 5 MB.");
  const b64=await blobToB64(blob),parts=Math.max(1,Math.ceil(b64.length/FILE_PART)),id=uid();
  const meta={name,type,size:blob.size,noteId:noteId||"",parts,w:pw,h:ph,createdAt:Date.now()};
  const batch=fbDb.batch(),ref=filesCol().doc(id);
  for(let i=0;i<parts;i++)batch.set(ref.collection("parts").doc(String(i)),{d:b64.slice(i*FILE_PART,(i+1)*FILE_PART)});
  batch.set(ref,meta);
  batch.commit().catch(e=>{console.error(e);toast("Couldn't save “"+name+"” yet. It will retry when you're online.");}); // not awaited: works offline
  fileCache.set(id,Promise.resolve({blob,url:URL.createObjectURL(blob),meta}));
  return{id,pic,name,size:blob.size};
}
function loadAttachment(id){
  if(!okFileId(id))return Promise.reject(new Error("Unknown file"));
  if(!fileCache.has(id))fileCache.set(id,(async()=>{
    if(!canAttach())throw new Error("Sign in to see pictures and files.");
    const ref=filesCol().doc(id),m=await ref.get();if(!m.exists)throw new Error("This file isn't available any more.");
    const meta=m.data(),parts=await Promise.all(Array.from({length:meta.parts||1},(_,i)=>ref.collection("parts").doc(String(i)).get()));
    const blob=b64ToBlob(parts.map(p=>p.exists?p.data().d:"").join(""),PIC_TYPES.includes(meta.type)?meta.type:meta.type==="application/pdf"?"application/pdf":"application/octet-stream");
    return{blob,url:URL.createObjectURL(blob),meta};})().catch(e=>{fileCache.delete(id);throw e;}));
  return fileCache.get(id);
}
// Only pictures are ever shown and only PDFs are opened; everything else downloads, so a file can't run as a page inside the app.
async function openAttachment(id,name){
  try{const a=await loadAttachment(id);
    if(a.blob.type==="application/pdf"){const w=window.open(a.url,"_blank","noopener");if(!w)download(a.blob,a.meta.name||name||"file.pdf");return;}
    if(PIC_TYPES.includes(a.blob.type)){openPicture(a);return;}
    download(new Blob([a.blob],{type:"application/octet-stream"}),a.meta.name||name||"file");}
  catch(e){toast(e.message||"Couldn't open that file.");}
}
function openPicture(a){
  const close=openSheet([h("div",{class:"shead"},h("b",{text:a.meta.name||"Picture"}),h("button",{class:"x","aria-label":"Close",text:"×",onclick:()=>close()})),
    h("img",{class:"picview",src:a.url,alt:a.meta.name||"Picture"}),
    h("div",{class:"actions"},h("button",{class:"btn ghost",text:"Download",onclick:()=>download(a.blob,a.meta.name||"picture.jpg")}))],{full:true});
}
// Attach chosen, pasted or dropped files to a note's editor.
async function attachFiles(q,files,noteId,at){
  if(!canAttach()){toast("Sign in to add pictures and files. They're kept in your account.");return;}
  let index=at==null?(q.getSelection(true)||{index:q.getLength()-1}).index:at;
  for(const f of Array.from(files||[])){
    try{toast("Adding “"+String(f.name||"file").slice(0,40)+"”…");const r=await saveAttachment(f,noteId());
      if(r.pic){q.insertEmbed(index,"pic",{id:r.id},"user");index+=1;}
      else{q.insertEmbed(index,"file",{id:r.id,name:r.name,size:r.size},"user");q.insertText(index+1," ","user");index+=2;}
      q.setSelection(index,0,"silent");toast("Added “"+r.name+"”");}
    catch(e){console.error(e);toast(e.message||"Couldn't add that file.");}
  }
}
function pickFiles(accept,fn){const i=h("input",{type:"file",accept,multiple:true,style:"display:none",onchange:()=>{fn(i.files);i.remove();}});document.body.append(i);i.click();}
// Ids of attachments used by a note.
function noteFileIds(n){const ids=new Set();const d=n&&n.doc&&Array.isArray(n.doc.ops)?n.doc.ops:[];
  for(const op of d){const x=op&&op.insert;if(x&&typeof x==="object"){const f=x.pic||x.file;if(f&&okFileId(f.id))ids.add(f.id);}}return ids;}
async function deleteFileNow(id,meta){const ref=filesCol().doc(id),b=fbDb.batch();for(let i=0;i<(meta.parts||1);i++)b.delete(ref.collection("parts").doc(String(i)));b.delete(ref);await b.commit();fileCache.delete(id);}
// Remove files whose note is gone or no longer uses them. forNote: only that note's files, with no waiting period.
async function sweepFiles(forNote){
  if(!canAttach()||!UI.ready)return 0;let n=0;
  try{const snap=await(forNote?filesCol().where("noteId","==",forNote):filesCol()).get(),now=Date.now();
    for(const d of snap.docs){const m=d.data();if(forNote&&m.noteId!==forNote)continue;if(!forNote&&now-(m.createdAt||0)<600000)continue;
      const note=D.notes.get(m.noteId);if(note&&noteFileIds(note).has(d.id))continue;
      await deleteFileNow(d.id,m);n++;}}
  catch(e){console.error(e);}
  return n;
}
async function filesUsage(){if(!canAttach())return null;const s=await filesCol().get();let size=0;s.docs.forEach(d=>size+=Number(d.data().size)||0);return{count:s.size,size};}
// For export: every picture used by these docs, re-encoded as JPEG. Missing pictures are skipped.
async function exportPictures(docs){
  const ids=new Set();docs.forEach(e=>docBlocks(e).forEach(b=>{if(b.kind==="pic")ids.add(b.id);}));const out=new Map();
  await Promise.all([...ids].map(async id=>{try{const a=await loadAttachment(id),{img,url}=await imageOf(a.blob);
    const c=h("canvas",{width:img.naturalWidth,height:img.naturalHeight}),x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0);URL.revokeObjectURL(url);
    out.set(id,{dataUrl:c.toDataURL("image/jpeg",.85),w:c.width,h:c.height});}catch(e){console.error(e);}}));
  return out;
}
