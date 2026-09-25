/* ================= links ================= */
const LINK_EMOJI=["🌐","⭐","💼","📚","🎓","🛒","🎬","🎵","📰","💻","🧰","💬","✈️","🍳","💪","🏠","💰","🎮","🎨","🧠"];
const logoOK=new Set(),logoBad=new Set();
function domainOf(u){try{return new URL(u).hostname.replace(/^www\./,"");}catch(e){return String(u||"");}}
function normalizeUrl(s){
  s=String(s||"").trim().replace(/[)\].,;!]+$/,"");if(!s)return null;
  if(!/^[a-z][a-z0-9+.-]*:/i.test(s))s="https://"+s;
  try{const u=new URL(s);if(!/^https?:$/.test(u.protocol))return null;if(!u.hostname.includes(".")&&u.hostname!=="localhost")return null;return u.href;}catch(e){return null;}
}
function extractUrls(text){const m=String(text||"").match(/https?:\/\/[^\s<>"']+|\b(?:www\.)?[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:\/[^\s<>"']*)?/gi)||[];return [...new Set(m.map(normalizeUrl).filter(Boolean))];}
const capW=w=>!w?w:w.length<=3?w.toUpperCase():w.charAt(0).toUpperCase()+w.slice(1);
function niceName(u){
  const d=domainOf(u);const parts=d.split(".");if(parts.length<2)return capW(d);
  let i=parts.length-2;if(parts.length>2&&/^(co|com|org|net|ac|gov|edu)$/.test(parts[i]))i--;
  const main=capW(parts[i]),sub=i>0&&!/^(www|m|app|web|en)$/.test(parts[0])?capW(parts[0]):"";
  return sub?main+" "+sub:main;
}
function colorFor(s){let n=0;for(const c of String(s))n=(n*31+c.charCodeAt(0))>>>0;return COLORS[n%COLORS.length];}
function logo(l,size){
  const d=domainOf(l.url),ok=logoOK.has(d);
  const box=h("span",{class:"lg"+(ok?" has":""),style:"--lc:"+colorFor(d)+(size?";--ls:"+size+"px":""),"aria-hidden":"true"},h("span",{class:"lgl",text:(l.name||d).trim().charAt(0).toUpperCase()||"•"}));
  if(!logoBad.has(d)){
    const img=h("img",{src:"https://www.google.com/s2/favicons?domain="+encodeURIComponent(d)+"&sz=128",alt:"",loading:"lazy",decoding:"async",referrerpolicy:"no-referrer"});
    if(!ok){img.onload=()=>{if(img.naturalWidth>=24){logoOK.add(d);box.classList.add("has");}else{logoBad.add(d);img.remove();}};img.onerror=()=>{logoBad.add(d);img.remove();};}
    box.append(img);
  }
  return box;
}
const linkCatById=id=>SET.linkCats.find(c=>c.id===id);
function linkSorter(){const m=lsGet("planner.linkSort","az");
  if(m==="used")return(a,b)=>(b.visits||0)-(a.visits||0)||(b.lastVisited||0)-(a.lastVisited||0)||(a.name||"").localeCompare(b.name||"");
  if(m==="new")return(a,b)=>(b.createdAt||0)-(a.createdAt||0);
  return(a,b)=>(a.name||"").localeCompare(b.name||"",undefined,{sensitivity:"base"});}
function visit(l){const c=D.links.get(l.id);if(c)Store.put("links",Object.assign(clone(c),{visits:(c.visits||0)+1,lastVisited:Date.now()}));}
function collapsed(){try{return new Set(JSON.parse(lsGet("planner.linkCollapsed","[]")));}catch(e){return new Set();}}

function linkTile(l){
  const d=domainOf(l.url);
  const edit=h("button",{class:"ledit","aria-label":"Edit "+l.name,text:"✎",onclick:e=>{e.preventDefault();e.stopPropagation();openLink(l);}});
  return h("a",{class:"lt",href:l.url,target:"_blank",rel:"noopener noreferrer",title:l.name+"\n"+d+(l.note?"\n"+l.note:""),"data-q":((l.name||"")+" "+l.url+" "+(l.note||"")).toLowerCase(),
    onclick:e=>{if(document.body.classList.contains("editing")){e.preventDefault();openLink(l);return;}setTimeout(()=>visit(l),50);}},
    logo(l),h("span",{class:"ln",text:l.name||d}),edit);
}
function renderLinks(main){
  const links=vals("links"),cats=SET.linkCats,sorter=linkSorter(),col=collapsed();
  setHeader("Links",links.length?plural(links.length,"saved website"):"Your favourite websites, one tap away");
  document.body.classList.toggle("editing",!!UI.linkEdit);
  const q=h("input",{id:"linkQ",class:"inp",type:"search",placeholder:"Search your links",value:UI.linkQuery||"","aria-label":"Search links",oninput:e=>{UI.linkQuery=e.target.value;applyLinkFilter();}});
  main.append(h("div",{class:"ltools"},q,
    h("button",{class:"chip","aria-pressed":String(!!UI.linkEdit),text:UI.linkEdit?"Done":"Edit",onclick:()=>{UI.linkEdit=!UI.linkEdit;render();}}),
    h("button",{class:"btn primary",style:"padding:10px 16px",text:"+ Add",onclick:()=>openLink(null)})));
  if(!links.length){
    main.append(h("div",{class:"sec"},h("div",{class:"empty"},h("div",{style:"font-size:34px",text:"🔗"}),h("p",{style:"margin:6px 0 14px",text:"Save websites you use often and open them in one tap. Paste a link in the bar below, or tap Add."}),h("button",{class:"btn primary",text:"Add your first link",onclick:()=>openLink(null)}))));
    return;
  }
  const counts={};links.forEach(l=>counts[l.catId]=(counts[l.catId]||0)+1);
  const orphans=links.filter(l=>!linkCatById(l.catId));
  const chipList=[["","All ("+links.length+")"]].concat(cats.filter(c=>counts[c.id]).map(c=>[c.id,c.emoji+" "+c.name+" ("+counts[c.id]+")"]));
  if(!chipList.some(([v])=>v===UI.linkCat))UI.linkCat="";
  main.append(h("div",{class:"lchips"},chipList.map(([v,l])=>h("button",{class:"chip","aria-pressed":String(UI.linkCat===v),text:l,onclick:()=>{UI.linkCat=v;render();window.scrollTo({top:0,behavior:"smooth"});}}))));
  main.append(h("div",{class:"lsort"},h("span",{class:"small muted",text:"Sort"}),seg([["az","A–Z"],["used","Most used"],["new","Newest"]],lsGet("planner.linkSort","az"),v=>{lsSet("planner.linkSort",v);render();}),
    h("button",{class:"linkbtn",text:"Categories",onclick:openLinkCats})));
  const box=h("div",{class:"lsecs"});
  if(!UI.linkCat){
    const top=links.filter(l=>(l.visits||0)>=2).sort((a,b)=>(b.visits||0)-(a.visits||0)||(b.lastVisited||0)-(a.lastVisited||0)).slice(0,8);
    if(top.length>=3)box.append(h("section",{class:"lsec quick","data-sec":"1"},h("div",{class:"lhead"},h("span",{class:"lemo",style:"--lc:var(--sun)",text:"⚡"}),h("b",{text:"Most used"})),h("div",{class:"lgrid"},top.map(linkTile))));
  }
  const groups=cats.filter(c=>!UI.linkCat||c.id===UI.linkCat).map(c=>[c,links.filter(l=>l.catId===c.id)]);
  if(!UI.linkCat&&orphans.length)groups.push([{id:"_none",name:"No category",emoji:"📁",color:"#6B7C78"},orphans]);
  groups.forEach(([c,items])=>{
    if(!items.length)return;
    items.sort(sorter);
    const shut=col.has(c.id)&&!UI.linkCat;
    const toggle=()=>{const s=collapsed();s.has(c.id)?s.delete(c.id):s.add(c.id);lsSet("planner.linkCollapsed",JSON.stringify([...s]));render();};
    box.append(h("section",{class:"lsec"+(shut?" shut":""),"data-sec":"1"},
      h("div",{class:"lhead"},
        h("button",{class:"lhbtn","aria-expanded":String(!shut),onclick:toggle},h("span",{class:"lemo",style:"--lc:"+(c.color||"#6B7C78"),text:c.emoji||"📁"}),h("b",{text:c.name}),h("span",{class:"n",text:String(items.length)}),h("span",{class:"chev",text:"›"})),
        h("button",{class:"chip openall",title:"Open all "+items.length+" in new tabs",onclick:()=>openAll(items,c.name)},"Open all ",h("span",{text:"↗"}))),
      h("div",{class:"lgrid"},items.map(linkTile))));
  });
  box.append(h("div",{class:"empty lnone",hidden:true,text:"No links match your search."}));
  main.append(box);
  applyLinkFilter();
}
function applyLinkFilter(){
  const s=(UI.linkQuery||"").trim().toLowerCase();const root=$(".lsecs");if(!root)return;let any=false;
  root.classList.toggle("searching",!!s);
  root.querySelectorAll(".lsec").forEach(sec=>{
    if(sec.classList.contains("quick")){sec.hidden=!!s;return;}
    let vis=0;sec.querySelectorAll(".lt").forEach(t=>{const ok=!s||t.dataset.q.includes(s);t.hidden=!ok;if(ok)vis++;});
    sec.hidden=!!s&&!vis;if(vis)any=true;});
  const none=root.querySelector(".lnone");if(none)none.hidden=!s||any;
}

/* open every link in a category */
function openAll(items,catName){
  if(items.length>8&&!openAll.confirmed){
    const go=h("button",{class:"btn primary",text:"Open all "+items.length});
    const close=openSheet([h("h3",{text:"Open "+items.length+" tabs?"}),h("p",{class:"muted",text:"This opens every link in "+catName+" in its own tab."}),h("div",{class:"actions"},h("button",{class:"btn ghost",text:"Cancel",onclick:()=>close()}),go)]);
    go.onclick=()=>{close();openAll.confirmed=true;openAll(items,catName);openAll.confirmed=false;};return;
  }
  const opened=[],blocked=[];
  items.forEach(l=>{let w=null;try{w=window.open(l.url,"_blank");}catch(e){}if(w){try{w.opener=null;}catch(e){}opened.push(l);}else blocked.push(l);});
  opened.forEach(visit);
  if(!blocked.length){toast("Opened "+plural(opened.length,"tab"));return;}
  openOneByOne(blocked,opened.length,catName);
}
function openOneByOne(list,openedN,catName){
  const done=new Set();
  const rows=h("div",{class:"obo"});
  const next=h("button",{class:"btn primary"});
  const draw=()=>{rows.textContent="";list.forEach(l=>{const isDone=done.has(l.id);
      rows.append(h("a",{class:"oborow"+(isDone?" done":""),href:l.url,target:"_blank",rel:"noopener noreferrer",onclick:()=>{done.add(l.id);visit(l);setTimeout(draw,0);}},logo(l,34),h("span",{class:"mid"},h("b",{text:l.name}),h("span",{class:"small muted",text:domainOf(l.url)})),h("span",{class:"obost",text:isDone?"✓ Opened":"Open ↗"})));});
    const left=list.filter(l=>!done.has(l.id));next.textContent=left.length?"Open next: "+left[0].name:"All opened";next.disabled=!left.length;};
  next.onclick=()=>{const l=list.find(x=>!done.has(x.id));if(!l)return;window.open(l.url,"_blank","noopener");done.add(l.id);visit(l);draw();};
  draw();
  openSheet([h("h3",{text:openedN?"Opened "+openedN+", "+list.length+" more to go":"Open "+catName}),
    h("p",{class:"small muted",style:"margin:0 0 12px",text:"Your browser stopped the rest from opening at once, which it does to block pop-ups. Tap each one below. To open them all in one tap next time, allow pop-ups for this site: on a laptop, click the blocked pop-up icon at the right of the address bar and choose Always allow."}),
    next,rows]);
}

/* add / edit a link */
function openLink(l,preset){
  const isNew=!l||!D.links.has(l.id);
  const d=clone(l||Object.assign({id:uid(),url:"",name:"",catId:UI.linkCat||(SET.linkCats[0]&&SET.linkCats[0].id)||"",note:"",visits:0,createdAt:Date.now()},preset||{}));
  let nameTouched=!isNew||!!d.name,catId=d.catId,bulk=false;
  const url=h("input",{class:"inp",type:"url",inputmode:"url",autocomplete:"off",autocapitalize:"off",spellcheck:"false",placeholder:"Paste or type a web address",value:d.url,"aria-label":"Web address"});
  const name=h("input",{class:"inp",placeholder:"Name",value:d.name,"aria-label":"Name",oninput:()=>{nameTouched=true;}});
  const prevBox=h("div",{class:"lprev"});
  const warn=h("div",{class:"small",style:"min-height:18px;margin-top:6px;color:var(--muted)"});
  const refresh=()=>{const u=normalizeUrl(url.value);prevBox.textContent="";
    if(u){if(!nameTouched)name.value=niceName(u);prevBox.append(logo({url:u,name:name.value||niceName(u)},48),h("div",{class:"mid"},h("b",{text:name.value||niceName(u)}),h("span",{class:"small muted",text:domainOf(u)})));
      const dup=vals("links").find(x=>x.id!==d.id&&x.url===u);warn.textContent=dup?"You've already saved this in "+((linkCatById(dup.catId)||{}).name||"another category")+".":"";}
    else{prevBox.append(h("span",{class:"small muted",text:url.value.trim()?"That doesn't look like a web address yet.":"The logo and name appear here."}));warn.textContent="";}};
  const refreshD=debounce(refresh,250);url.addEventListener("input",refreshD);name.addEventListener("input",refreshD);
  const catBox=h("div");
  const drawCats=()=>{catBox.textContent="";catBox.append(chips(SET.linkCats.map(c=>[c.id,c.emoji+" "+c.name]),catId,v=>{catId=v;}));
    catBox.firstChild.append(h("button",{type:"button",class:"chip",text:"+ New",onclick:()=>newCatInline()}));};
  const newCatInline=()=>{const inp=h("input",{class:"inp",placeholder:"Category name, e.g. Work tools","aria-label":"New category"});
    const add=()=>{const n=inp.value.trim();if(!n){inp.focus();return;}const c={id:uid(),name:n,emoji:LINK_EMOJI[(SET.linkCats.length+1)%LINK_EMOJI.length],color:COLORS[SET.linkCats.length%COLORS.length]};Store.settings({linkCats:[...SET.linkCats,c]});catId=c.id;drawCats();};
    inp.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();add();}});
    catBox.append(h("div",{class:"listrow"},inp,h("button",{type:"button",class:"chip",text:"Add",onclick:add})));setTimeout(()=>inp.focus(),30);};
  drawCats();
  const note=h("input",{class:"inp",placeholder:"Note (optional)",value:d.note||"","aria-label":"Note"});
  const many=h("textarea",{class:"inp",placeholder:"Paste several links, one per line (or any text with links in it)","aria-label":"Several links"});
  const single=h("div",null,h("div",{class:"field"},h("label",{text:"Web address"}),url,warn),prevBox,h("div",{class:"field"},h("label",{text:"Name"}),name));
  const bulkBox=h("div",{class:"field",hidden:true},h("label",{text:"Links"}),many,h("div",{class:"small muted",style:"margin-top:6px",text:"Names are filled in from each address. You can rename them after."}));
  const bulkToggle=isNew?h("button",{type:"button",class:"linkbtn",text:"Adding lots? Paste several at once",onclick:()=>{bulk=!bulk;single.hidden=bulk;bulkBox.hidden=!bulk;noteF.hidden=bulk;bulkToggle.textContent=bulk?"Add just one instead":"Adding lots? Paste several at once";save.textContent=bulk?"Add links":"Save link";(bulk?many:url).focus();}}):null;
  const noteF=h("div",{class:"field"},h("label",{text:"Note"}),note);
  const save=h("button",{class:"btn primary",text:isNew?"Save link":"Save"}),cancel=h("button",{class:"btn ghost",text:"Cancel"}),del=isNew?null:h("button",{class:"btn danger",text:"Delete"});
  const openBtn=isNew?null:h("a",{class:"chip",href:d.url,target:"_blank",rel:"noopener noreferrer",text:"Open ↗",onclick:()=>setTimeout(()=>visit(d),50)});
  const close=openSheet([h("div",{class:"shead"},h("h3",{text:isNew?"Add a link":"Edit link"}),openBtn),single,bulkBox,bulkToggle,
    h("div",{class:"field"},h("span",{class:"lbl",text:"Category"}),catBox),noteF,h("div",{class:"actions"},del,cancel,save)]);
  refresh();
  cancel.onclick=close;
  if(del)del.onclick=()=>{const prev=snap("links",d.id);Store.del("links",d.id);close();undoable("Link deleted",[["links",prev,d.id]]);};
  save.onclick=()=>{
    if(!catId&&SET.linkCats[0])catId=SET.linkCats[0].id;
    if(bulk){const us=extractUrls(many.value);if(!us.length){many.focus();toast("No web addresses found in that text.");return;}
      const have=new Set(vals("links").filter(x=>x.catId===catId).map(x=>x.url));const fresh=us.filter(u=>!have.has(u));const now=Date.now();
      const ch=fresh.map((u,i)=>{const x={id:uid(),url:u,name:niceName(u),catId,note:"",visits:0,createdAt:now+i};Store.put("links",x);return["links",null,x.id];});
      close();undoable("Added "+plural(fresh.length,"link")+(us.length>fresh.length?" ("+(us.length-fresh.length)+" already saved)":""),ch);return;}
    const u=normalizeUrl(url.value);if(!u){url.focus();toast("Enter a web address, like example.com");return;}
    Object.assign(d,{url:u,name:name.value.trim()||niceName(u),catId,note:note.value.trim()});Store.put("links",d);close();
    if(isNew)toast("Saved to "+((linkCatById(catId)||{}).name||"Links"));
  };
  url.addEventListener("keydown",e=>{if(e.key==="Enter")save.click();});
  if(isNew&&!d.url)setTimeout(()=>url.focus(),60);
}
function quickAddLink(text){
  const us=extractUrls(text);if(!us.length){toast("That doesn't look like a web address.");return false;}
  const catId=UI.linkCat||(SET.linkCats[0]&&SET.linkCats[0].id)||"";const now=Date.now();
  const made=us.map((u,i)=>{const x={id:uid(),url:u,name:niceName(u),catId,note:"",visits:0,createdAt:now+i};Store.put("links",x);return x;});
  const cn=(linkCatById(catId)||{}).name||"Links";
  if(made.length===1)toast("Saved to "+cn,{label:"Edit",fn:()=>openLink(D.links.get(made[0].id))});
  else undoable("Saved "+made.length+" links to "+cn,made.map(x=>["links",null,x.id]));
  return true;
}

/* manage categories */
function openLinkCats(){
  let draft=SET.linkCats.map(c=>Object.assign({},c));
  const box=h("div");
  const counts={};vals("links").forEach(l=>counts[l.catId]=(counts[l.catId]||0)+1);
  const draw=()=>{box.textContent="";draft.forEach((c,i)=>{
    const emo=h("select",{class:"inp emsel","aria-label":"Icon",onchange:e=>{c.emoji=e.target.value;}},[...new Set([c.emoji,...LINK_EMOJI])].map(e=>h("option",{value:e,selected:e===c.emoji},e)));
    const sw=h("div",{class:"swatches",style:"margin-top:8px"},COLORS.map(col=>h("button",{type:"button",class:"sw",style:"background:"+col,"aria-label":"Colour","aria-pressed":String(col===c.color),onclick:()=>{c.color=col;draw();}})));
    box.append(h("div",{class:"field catedit"},h("div",{class:"listrow"},emo,h("input",{class:"inp",value:c.name,"aria-label":"Category name",oninput:e=>{c.name=e.target.value;}}),
      h("button",{type:"button",class:"x","aria-label":"Move up",text:"↑",disabled:i===0,onclick:()=>{draft.splice(i-1,0,draft.splice(i,1)[0]);draw();}}),
      h("button",{type:"button",class:"x","aria-label":"Move down",text:"↓",disabled:i===draft.length-1,onclick:()=>{draft.splice(i+1,0,draft.splice(i,1)[0]);draw();}}),
      draft.length>1?h("button",{type:"button",class:"x","aria-label":"Remove "+c.name,text:"×",onclick:()=>{draft.splice(i,1);draw();}}):null),
      h("div",{class:"row",style:"justify-content:space-between"},sw,h("span",{class:"small muted",text:plural(counts[c.id]||0,"link")}))));});};
  draw();
  const save=h("button",{class:"btn primary",text:"Save"}),cancel=h("button",{class:"btn ghost",text:"Cancel"});
  const close=openSheet([h("h3",{text:"Link categories"}),h("p",{class:"small muted",style:"margin:0",text:"Rename, reorder, recolour or remove. Links in a removed category move to “No category”."}),box,
    h("div",{style:"margin-top:12px"},h("button",{class:"linkbtn",text:"+ Add a category",onclick:()=>{draft.push({id:uid(),name:"New category",emoji:LINK_EMOJI[draft.length%LINK_EMOJI.length],color:COLORS[draft.length%COLORS.length]});draw();}})),
    h("div",{class:"actions"},cancel,save)]);
  cancel.onclick=close;
  save.onclick=()=>{Store.settings({linkCats:draft.map(c=>({id:c.id,name:c.name.trim()||"Untitled",emoji:c.emoji||"📁",color:c.color}))});close();};
}
