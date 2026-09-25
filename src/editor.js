/* ================= rich text editor (notes & journal) ================= */
// Quill 2 (quilljs.com), loaded on demand. A note keeps its formatting as a Quill Delta in note.doc and a plain-text copy in note.body.
const QUILL_BASE="https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/";
const TXT_COLORS=[["red","Red"],["orange","Orange"],["green","Green"],["blue","Blue"],["purple","Purple"],["grey","Grey"]];
const HL_COLORS=[["yellow","Yellow"],["green","Green"],["blue","Blue"],["pink","Pink"],["orange","Orange"]];
const TXT_HEX={red:"C62828",orange:"C2610C",green:"2E7D32",blue:"1565C0",purple:"6A1B9A",grey:"5F6B6A"};
const BG_HEX={yellow:"FFF3A3",green:"C8F2D0",blue:"CFE3FF",pink:"FFD1E8",orange:"FFE0B8"};
const SIZE_MUL={small:.85,large:1.3,huge:1.7};
const RICH_FORMATS=["bold","italic","underline","strike","link","color","background","size","header","list","indent","blockquote","align","divider","table"];
const NOTE_MAX=800000; // Firestore's limit per document is 1 MiB

function loadCss(href){return scripts[href]||(scripts[href]=new Promise((res,rej)=>{const l=h("link",{rel:"stylesheet",href});l.onload=res;l.onerror=()=>{delete scripts[href];l.remove();rej(new Error("Couldn't load the editor styles."));};document.head.append(l);}));}
let quillReady=null;
function loadEditor(){return quillReady||(quillReady=Promise.all([loadScript(QUILL_BASE+"quill.js"),loadCss(QUILL_BASE+"quill.core.css")]).then(setupQuill).catch(e=>{quillReady=null;throw e;}));}
function setupQuill(){
  const Q=window.Quill,P=Q.import("parchment");
  const cls=(name,prefix,list,scope)=>new P.ClassAttributor(name,prefix,{scope,whitelist:list});
  Q.register({"formats/color":cls("color","ql-color",TXT_COLORS.map(c=>c[0]),P.Scope.INLINE),"formats/background":cls("background","ql-bg",HL_COLORS.map(c=>c[0]),P.Scope.INLINE),
    "formats/size":cls("size","ql-size",Object.keys(SIZE_MUL),P.Scope.INLINE),"formats/align":cls("align","ql-align",["center","right","justify"],P.Scope.BLOCK)},true);
  const Embed=Q.import("blots/block/embed");
  class Divider extends Embed{}Divider.blotName="divider";Divider.tagName="hr";Q.register(Divider,true);
  Q.import("formats/link").PROTOCOL_WHITELIST=["http","https","mailto"];
  return Q;
}

/* ---- safety: only known formats and safe links ever get stored or shown ---- */
function safeUrl(u){
  u=String(u||"").trim();if(!u||/\s/.test(u))return null;
  if(/^mailto:/i.test(u))return /^mailto:[^\s<>"@]+@[^\s<>"@]+\.[^\s<>"@]+$/i.test(u)?u:null;
  if(!/^[a-z][a-z0-9+.-]*:/i.test(u)){if(/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(u))return"mailto:"+u;u="https://"+u;}
  try{const x=new URL(u);return /^https?:$/.test(x.protocol)&&(x.hostname.includes(".")||x.hostname==="localhost")?x.href:null;}catch(e){return null;}
}
const LINE_RULES={header:v=>[1,2,3].includes(v),list:v=>["ordered","bullet","checked","unchecked"].includes(v),indent:v=>Number.isInteger(v)&&v>=1&&v<=8,blockquote:v=>v===true,
  align:v=>["center","right","justify"].includes(v),table:v=>typeof v==="string"&&/^row-[a-z0-9]{1,16}$/i.test(v)};
const INLINE_RULES={bold:v=>v===true,italic:v=>v===true,underline:v=>v===true,strike:v=>v===true,color:v=>v in TXT_HEX,background:v=>v in BG_HEX,size:v=>v in SIZE_MUL,link:v=>!!safeUrl(v)};
function validateDoc(doc){
  if(!doc||!Array.isArray(doc.ops))return null;const ops=[];
  for(const op of doc.ops.slice(0,200000)){
    if(!op||typeof op!=="object")continue;let ins=op.insert;
    if(typeof ins==="string"){if(!ins)continue;}else if(ins&&typeof ins==="object"&&ins.divider===true)ins={divider:true};else continue;
    const rules=typeof ins==="string"&&/^\n+$/.test(ins)?LINE_RULES:typeof ins==="string"?INLINE_RULES:{};
    const attrs={},a=op.attributes&&typeof op.attributes==="object"?op.attributes:{};
    for(const k of Object.keys(a))if(rules[k]&&rules[k](a[k]))attrs[k]=k==="link"?safeUrl(a[k]):a[k];
    ops.push(Object.keys(attrs).length?{insert:ins,attributes:attrs}:{insert:ins});
  }
  if(!ops.length)return null;
  const last=ops[ops.length-1];if(typeof last.insert!=="string"||!last.insert.endsWith("\n"))ops.push({insert:"\n"});
  return{ops};
}
const deltaFromText=t=>({ops:[{insert:String(t||"").replace(/\r/g,"")+"\n"}]});
const noteDelta=n=>(n&&validateDoc(n.doc))||deltaFromText(n&&n.body);
function checkProgress(n){if(!n.doc||!Array.isArray(n.doc.ops))return null;let d=0,t=0;
  for(const op of n.doc.ops){const l=op&&op.attributes&&op.attributes.list;if(typeof op.insert==="string"&&(l==="checked"||l==="unchecked")){const k=(op.insert.match(/\n/g)||[]).length;t+=k;if(l==="checked")d+=k;}}
  return t?{d,t}:null;}

/* ---- Delta -> blocks (used by export and the read-only view) ---- */
function docToBlocks(doc){
  const blocks=[];let runs=[];
  const endLine=a=>{a=a||{};const line=runs;runs=[];
    if(a.table){const last=blocks[blocks.length-1];if(last&&last.kind==="table"){const row=last.rows.find(r=>r.id===a.table);if(row)row.cells.push(line);else last.rows.push({id:a.table,cells:[line]});}
      else blocks.push({kind:"table",rows:[{id:a.table,cells:[line]}]});return;}
    blocks.push({kind:a.header?"h"+a.header:a.list?"li":a.blockquote?"quote":"p",list:a.list||"",indent:a.indent||0,align:a.align||"",runs:line});};
  for(const op of doc.ops){
    if(typeof op.insert!=="string"){if(runs.length)endLine();blocks.push({kind:"hr"});continue;}
    const a=op.attributes||{},parts=op.insert.split("\n");
    parts.forEach((t,i)=>{if(t)runs.push({text:t,b:!!a.bold,i:!!a.italic,u:!!a.underline,s:!!a.strike,color:a.color||"",bg:a.background||"",size:a.size||"",link:a.link||""});if(i<parts.length-1)endLine(a);});
  }
  if(runs.length)endLine();
  return blocks;
}
// Numbers for ordered lists: restart after any non-list line; deeper levels restart under a new parent.
function listNumbers(blocks){const nums=[];let c=[];blocks.forEach((b,i)=>{if(b.kind!=="li"){c=[];return;}c.length=b.indent+1;if(b.list==="ordered"){c[b.indent]=(c[b.indent]||0)+1;nums[i]=c[b.indent];}else c[b.indent]=0;});return nums;}
function renderDocReadOnly(doc){
  const box=h("div",{class:"rich-ro"}),blocks=docToBlocks(doc),nums=listNumbers(blocks);
  const runEl=r=>{let el=r.link&&safeUrl(r.link)?h("a",{href:safeUrl(r.link),target:"_blank",rel:"noopener noreferrer"},r.text):h("span",{text:r.text});
    el.className=[r.color?"ql-color-"+r.color:"",r.bg?"ql-bg-"+r.bg:"",r.size?"ql-size-"+r.size:""].filter(Boolean).join(" ");
    el.style.cssText=(r.b?"font-weight:700;":"")+(r.i?"font-style:italic;":"")+(r.u||r.s?"text-decoration:"+(r.u?"underline ":"")+(r.s?"line-through":"")+";":"");return el;};
  blocks.forEach((b,i)=>{
    if(b.kind==="hr"){box.append(h("hr"));return;}
    if(b.kind==="table"){box.append(h("table",null,h("tbody",null,b.rows.map(r=>h("tr",null,r.cells.map(c=>h("td",null,c.map(runEl))))))));return;}
    const tag=b.kind==="quote"?"blockquote":/^h\d$/.test(b.kind)?b.kind:"p";
    const mark=b.kind==="li"?(b.list==="bullet"?"• ":b.list==="ordered"?nums[i]+". ":b.list==="checked"?"☑ ":"☐ "):"";
    const el=h(tag,{class:(b.align?"ql-align-"+b.align:"")+(b.list==="checked"?" done":""),style:b.indent||b.kind==="li"?"padding-left:"+(b.indent*1.5+(b.kind==="li"?1.5:0))+"em":null},mark?h("span",{class:"romark",text:mark}):null,b.runs.length?b.runs.map(runEl):h("br"));
    box.append(el);});
  return box;
}

/* ---- the editor ---- */
function mountEditor(Q,host,start,ph,changed){
  host.textContent="";
  const area=h("div",{class:"rich-area"}),bar=h("div",{class:"rtool",role:"toolbar","aria-label":"Formatting"}),linkBar=h("div",{class:"rlink",hidden:true});
  const wrap=h("div",{class:"rtool-wrap"},bar,linkBar);host.append(wrap,area);
  const q=new Q(area,{formats:RICH_FORMATS,placeholder:ph,modules:{table:true,history:{userOnly:true},keyboard:{bindings:richBindings()}}});
  q.root.classList.add("note-body");q.root.setAttribute("aria-label","Text");
  q.setContents(start,"silent");q.history.clear();
  const sync=buildToolbar(q,wrap,bar,linkBar);
  q.on("editor-change",()=>sync());
  let fixing=false;
  q.on("text-change",(d,o,src)=>{if(src==="user"&&!fixing){fixing=true;try{autoFormat(q,d);}finally{fixing=false;}}changed();});
  q.root.addEventListener("click",e=>{const a=e.target.closest("a");if(a&&(e.ctrlKey||e.metaKey)){e.preventDefault();window.open(a.href,"_blank","noopener");}});
  keepToolbarAboveKeyboard(q,wrap);
  return q;
}
// On phones the toolbar rides just above the on-screen keyboard while typing.
function keepToolbarAboveKeyboard(q,wrap){
  const vv=window.visualViewport;if(!vv||UI.desktop)return;
  const place=()=>{const kb=window.innerHeight-vv.height-vv.offsetTop;const on=q.hasFocus()&&kb>120;wrap.classList.toggle("kb",on);wrap.style.bottom=on?kb+"px":"";};
  vv.addEventListener("resize",place);vv.addEventListener("scroll",place);q.root.addEventListener("focus",place);q.root.addEventListener("blur",()=>setTimeout(place,50));
}
function toggleList(q,v){const cur=q.getFormat().list;if(v==="check")q.format("list",cur==="checked"||cur==="unchecked"?false:"unchecked","user");else q.format("list",cur===v?false:v,"user");}
function richBindings(){
  const key=(k,mods,fn)=>Object.assign({key:k,shortKey:true,handler(){fn(this.quill);return false;}},mods);
  return{
    "list autofill":null, // replaced by autoFormat(), which also works with phone keyboards
    "rt link":key("k",{},q=>richLink(q)),
    "rt ordered":key(55,{shiftKey:true},q=>toggleList(q,"ordered")),"rt bullet":key(56,{shiftKey:true},q=>toggleList(q,"bullet")),"rt check":key(57,{shiftKey:true},q=>toggleList(q,"check")),
    "rt h0":key(48,{altKey:true},q=>q.format("header",false,"user")),"rt h1":key(49,{altKey:true},q=>q.format("header",1,"user")),
    "rt h2":key(50,{altKey:true},q=>q.format("header",2,"user")),"rt h3":key(51,{altKey:true},q=>q.format("header",3,"user"))};
}
// Typing shortcuts. They work from the text change itself (not key presses), so they also work with phone keyboards:
// "# " "## " "### " "- " "* " "1. " "[] " "[x] " "> " at the start of a line, "---" then Enter, and **bold** *italic* ~~strike~~.
const LINE_SHORTCUTS=[[/^(#{1,3}) $/,m=>["header",m[1].length]],[/^[-*] $/,()=>["list","bullet"]],[/^1\. $/,()=>["list","ordered"]],
  [/^\[ ?\] $/,()=>["list","unchecked"]],[/^\[x\] $/i,()=>["list","checked"]],[/^> $/,()=>["blockquote",true]]];
function autoFormat(q,delta){
  let at=0,ins=null;
  for(const op of delta.ops){if(op.retain&&!op.attributes)at+=op.retain;else if(typeof op.insert==="string"&&ins===null)ins=op.insert;else return;}
  if(ins===null||ins.length!==1)return;
  const pos=at+1,[line,off]=q.getLine(ins==="\n"?at:pos);if(!line)return;
  const f=line.formats(),start=(ins==="\n"?at:pos)-off,text=q.getText(start,off);
  if(f.table)return;
  if(ins==="\n"){if(text==="---"){q.deleteText(start,4,"user");q.insertEmbed(start,"divider",true,"user");q.setSelection(start+1,0,"silent");}return;}
  if(ins===" "){for(const [re,get] of LINE_SHORTCUTS){const m=text.match(re);if(!m)continue;const [name,val]=get(m);
    q.deleteText(start,off,"user");q.formatLine(start,1,name,val,"user");q.setSelection(start,0,"silent");return;}}
  for(const [re,fmt,n] of [[/\*\*([^*\n]+)\*\*$/,"bold",2],[/~~([^~\n]+)~~$/,"strike",2],[/(?:^|[^*])\*([^*\s][^*\n]*)\*$/,"italic",1]]){
    if(ins!==(fmt==="strike"?"~":"*"))continue;const m=text.match(re);if(!m)continue;
    const inner=m[1],from=pos-n-inner.length-n;
    q.deleteText(pos-n,n,"user");q.deleteText(from,n,"user");q.formatText(from,inner.length,fmt,true,"user");q.setSelection(from+inner.length,0,"silent");q.format(fmt,false,"silent");return;}
}
function linkRange(q,index){const [leaf]=q.getLeaf(index);let b=leaf;while(b&&b.statics&&b.statics.blotName!=="link")b=b.parent;if(!b||!b.statics||b.statics.blotName!=="link")return null;return{index:q.getIndex(b),length:b.length()};}
function richLink(q){
  const r=q.getSelection(true)||{index:q.getLength()-1,length:0};const at=r.length?null:linkRange(q,Math.max(0,r.index-1))||linkRange(q,r.index);
  const cur=q.getFormat(r).link||"";
  const inp=h("input",{class:"inp",value:cur,placeholder:"example.com or name@email.com",autocapitalize:"off",autocomplete:"off","aria-label":"Link address"});
  const err=h("div",{class:"small",role:"alert",style:"color:var(--danger);min-height:18px;margin-top:6px"});
  const save=h("button",{class:"btn primary",text:"Save"}),rm=cur?h("button",{class:"btn danger",text:"Remove link"}):null;
  const close=openSheet([h("h3",{text:cur?"Edit link":"Add a link"}),inp,err,h("div",{class:"actions"},rm,h("button",{class:"btn ghost",text:"Cancel",onclick:()=>close()}),save)],{onClose:()=>setTimeout(()=>q.focus(),0)});
  save.onclick=()=>{const u=safeUrl(inp.value);if(!u){err.textContent="Only web and email links are allowed, like example.com or name@email.com.";inp.focus();return;}close();
    if(r.length)q.formatText(r.index,r.length,"link",u,"user");else if(at)q.formatText(at.index,at.length,"link",u,"user");
    else{const label=u.replace(/^mailto:/,"").replace(/^https?:\/\//,"").replace(/\/$/,"");q.insertText(r.index,label,{link:u},"user");q.insertText(r.index+label.length," ",{link:false},"user");q.setSelection(r.index+label.length+1,0,"user");}};
  if(rm)rm.onclick=()=>{close();if(r.length)q.formatText(r.index,r.length,"link",false,"user");else if(at)q.formatText(at.index,at.length,"link",false,"user");};
  inp.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();save.click();}});
  setTimeout(()=>inp.focus(),60);
}
function buildToolbar(q,wrap,bar,linkBar){
  const keep=e=>e.preventDefault(); // keep the cursor in the text while using the toolbar
  const fmt=()=>{const r=q.getSelection();return r?q.getFormat(r):{};};
  let pop=null;const closePop=()=>{if(pop){pop.remove();pop=null;}};
  const outside=e=>{if(!wrap.isConnected){document.removeEventListener("mousedown",outside);return;}if(pop&&!pop.contains(e.target)&&!e.target.closest(".rb.rmenu"))closePop();};
  document.addEventListener("mousedown",outside);
  const btn=(label,title,fn,extra)=>{const b=h("button",Object.assign({type:"button",class:"rb","aria-label":title,title,onmousedown:keep,onclick:e=>{closePop();fn(e);sync();}},extra||{}),label);bar.append(b);return b;};
  const sep=()=>bar.append(h("span",{class:"rsep","aria-hidden":"true"}));
  const menu=(label,title,items)=>{const b=h("button",{type:"button",class:"rb rmenu","aria-label":title,title,"aria-haspopup":"true",onmousedown:keep,onclick:()=>{
      if(pop&&pop.dataset.for===title){closePop();return;}closePop();pop=h("div",{class:"rpop",role:"menu","data-for":title},items());
      pop.style.left=Math.max(0,Math.min(b.offsetLeft-bar.scrollLeft,wrap.clientWidth-190))+"px";wrap.append(pop);}},label);bar.append(b);return b;};
  const item=(label,fn,o)=>h("button",Object.assign({type:"button",role:"menuitem",onmousedown:keep,onclick:()=>{closePop();fn();sync();}},o||{}),label);
  const swatches=(list,f,none)=>[h("div",{class:"swrow"},list.map(([v,l])=>h("button",{type:"button",class:"swb "+(f==="color"?"ql-color-"+v:"ql-bg-"+v),"aria-label":l,title:l,"aria-pressed":String(fmt()[f]===v),onmousedown:keep,onclick:()=>{closePop();q.format(f,v,"user");sync();}},f==="color"?"A":""))),
    item(none,()=>q.format(f,false,"user"))];
  const toggle=f=>q.format(f,!fmt()[f],"user");
  btn("↶","Undo (Ctrl+Z)",()=>q.history.undo());btn("↷","Redo (Ctrl+Y)",()=>q.history.redo());sep();
  const style=h("select",{class:"rsel","aria-label":"Text style",onchange:e=>{q.format("header",e.target.value?Number(e.target.value):false,"user");q.focus();}},
    [["","Normal"],["1","Heading 1"],["2","Heading 2"],["3","Heading 3"]].map(([v,l])=>h("option",{value:v},l)));bar.append(style);sep();
  const marks=[["bold","B","Bold (Ctrl+B)","font-weight:800"],["italic","I","Italic (Ctrl+I)","font-style:italic;font-family:Georgia,serif"],["underline","U","Underline (Ctrl+U)","text-decoration:underline"],["strike","S","Strikethrough","text-decoration:line-through"]]
    .map(([f,l,t,css])=>{const b=btn(l,t,()=>toggle(f));b.style.cssText=css;b.dataset.f=f;return b;});sep();
  menu(h("span",{class:"rcolor"},"A"),"Text colour",()=>swatches(TXT_COLORS,"color","Default colour"));
  menu(h("span",{class:"rhl"},"🖍"),"Highlight",()=>swatches(HL_COLORS,"background","No highlight"));sep();
  const lists=[["bullet","•≡","Bulleted list (Ctrl+Shift+8)"],["ordered","1≡","Numbered list (Ctrl+Shift+7)"],["check","☑","Checklist (Ctrl+Shift+9)"]].map(([v,l,t])=>{const b=btn(l,t,()=>toggleList(q,v));b.dataset.list=v;return b;});
  btn("⇤","Outdent (Shift+Tab)",()=>q.format("indent","-1","user"));btn("⇥","Indent (Tab)",()=>q.format("indent","+1","user"));sep();
  const quote=btn("❝","Quote",()=>toggle("blockquote"));
  menu("≡","Alignment",()=>[["","Left"],["center","Centre"],["right","Right"],["justify","Justify"]].map(([v,l])=>item(l,()=>q.format("align",v||false,"user"),{"aria-pressed":String((fmt().align||"")===v)})));
  menu("Aa","Text size",()=>[["small","Small"],["","Normal"],["large","Large"],["huge","Huge"]].map(([v,l])=>item(l,()=>q.format("size",v||false,"user"),{"aria-pressed":String((fmt().size||"")===v),class:v?"ql-size-"+v:""})));sep();
  btn("🔗","Link (Ctrl+K)",()=>richLink(q));
  btn("―","Divider line",()=>{const r=q.getSelection(true),[line,off]=q.getLine(r.index);const at=r.index-off+(line?line.length():1);q.insertEmbed(at,"divider",true,"user");q.setSelection(Math.min(at+1,q.getLength()-1),0,"user");});
  const tbl=()=>q.getModule("table");
  menu("▦","Table",()=>fmt().table?[["Add row above",t=>t.insertRowAbove()],["Add row below",t=>t.insertRowBelow()],["Add column left",t=>t.insertColumnLeft()],["Add column right",t=>t.insertColumnRight()],
      ["Delete row",t=>t.deleteRow()],["Delete column",t=>t.deleteColumn()],["Delete table",t=>t.deleteTable()]].map(([l,fn])=>item(l,()=>{q.focus();fn(tbl());}))
    :[item("Insert table (3 × 3)",()=>{q.focus();tbl().insertTable(3,3);})]);sep();
  btn("⌫","Clear formatting",()=>{const r=q.getSelection(true);if(r.length){q.removeFormat(r.index,r.length,"user");return;}const [line,off]=q.getLine(r.index);if(line)q.removeFormat(r.index-off,line.length(),"user");});
  function sync(){
    const f=fmt();marks.forEach(b=>b.setAttribute("aria-pressed",String(!!f[b.dataset.f])));
    lists.forEach(b=>{const v=b.dataset.list;b.setAttribute("aria-pressed",String(v==="check"?f.list==="checked"||f.list==="unchecked":f.list===v));});
    quote.setAttribute("aria-pressed",String(!!f.blockquote));style.value=f.header?String(f.header):"";
    const r=q.getSelection(),lr=r&&(r.length?(f.link?r:null):linkRange(q,Math.max(0,r.index-1))||linkRange(q,r.index));
    linkBar.textContent="";linkBar.hidden=!(lr&&f.link);
    if(!linkBar.hidden){const u=safeUrl(f.link);linkBar.append(h("span",{class:"rlurl",text:"🔗 "+String(f.link).replace(/^mailto:/,"").replace(/^https?:\/\//,"")}),
      u?h("a",{href:u,target:"_blank",rel:"noopener noreferrer",text:"Open ↗"}):null,h("button",{type:"button",class:"linkbtn",text:"Edit",onmousedown:keep,onclick:()=>richLink(q)}));}
  }
  return sync;
}
