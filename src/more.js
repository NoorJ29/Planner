/* ================= money ================= */
const POPULAR=["USD","EUR","GBP","INR","JPY","CNY","CAD","AUD","CHF","AED","SAR","SGD","MYR","NGN","ZAR","BRL","MXN","PKR","BDT","PHP","IDR","KES","TRY","KRW"];
const EXTRA_CODES=["AFN","ALL","AMD","ANG","AOA","ARS","AWG","AZN","BAM","BBD","BGN","BHD","BIF","BMD","BND","BOB","BSD","BTN","BWP","BYN","BZD","CDF","CLP","COP","CRC","CUP","CVE","CZK","DJF","DKK","DOP","DZD","EGP","ERN","ETB","FJD","FKP","GEL","GHS","GIP","GMD","GNF","GTQ","GYD","HKD","HNL","HTG","HUF","ILS","IQD","IRR","ISK","JMD","JOD","KGS","KHR","KMF","KPW","KWD","KYD","KZT","LAK","LBP","LKR","LRD","LSL","LYD","MAD","MDL","MGA","MKD","MMK","MNT","MOP","MRU","MUR","MVR","MWK","MZN","NAD","NIO","NOK","NPR","NZD","OMR","PAB","PEN","PGK","PLN","PYG","QAR","RON","RSD","RUB","RWF","SBD","SCR","SDG","SEK","SHP","SLE","SOS","SRD","SSP","STN","SYP","SZL","THB","TJS","TMT","TND","TOP","TTD","TWD","TZS","UAH","UGX","UYU","UZS","VES","VND","VUV","WST","XAF","XCD","XOF","XPF","YER","ZMW","ZWL"];
let ALL_CODES=null;
function allCurrencies(){
  if(ALL_CODES)return ALL_CODES;
  let list=[];try{list=Intl.supportedValuesOf("currency");}catch(e){}
  ALL_CODES=[...new Set([...POPULAR,...list,...EXTRA_CODES])];return ALL_CODES;
}
let DN=null;
function currencyName(c){try{DN=DN||new Intl.DisplayNames(undefined,{type:"currency"});const n=DN.of(c);return n&&n!==c?n:c;}catch(e){return c;}}
function currencySymbol(c){try{const p=new Intl.NumberFormat(undefined,{style:"currency",currency:c,currencyDisplay:"narrowSymbol"}).formatToParts(0).find(x=>x.type==="currency");return p?p.value:c;}catch(e){return c;}}
function currencyLabel(){return SET.currencySymbol?"Custom: "+SET.currencySymbol:SET.currency?currencyName(SET.currency)+" ("+SET.currency+")":"Not set";}
function currencyButton(){return h("button",{type:"button",class:"chip",text:SET.currency||SET.currencySymbol?"Change":"Choose",onclick:openCurrencyPicker});}
function openCurrencyPicker(){
  const q=h("input",{class:"inp",type:"search",placeholder:"Search by name or code, e.g. yen, peso, KES","aria-label":"Search currencies"});
  const list=h("div",{class:"sres",style:"margin-top:8px"});
  const custom=h("input",{class:"inp",placeholder:"Any symbol or code, e.g. ₿, pts, Coins",maxlength:"8","aria-label":"Custom symbol",value:SET.currencySymbol||""});
  const pick=patch=>{const had=!!(SET.currency||SET.currencySymbol);Store.settings(patch);close();toast(had?"Currency changed. Amounts you've logged keep their numbers; only the symbol changes.":"Currency set to "+currencyLabel());};
  const row=c=>h("button",{onclick:()=>pick({currency:c,currencySymbol:""}),"aria-pressed":String(c===SET.currency&&!SET.currencySymbol),style:c===SET.currency&&!SET.currencySymbol?"background:var(--sunken)":null},
    h("b",{},currencySymbol(c)+"  "+currencyName(c)+(c===SET.currency&&!SET.currencySymbol?"  ✓":"")),h("span",{text:c}));
  const draw=()=>{
    const s=q.value.trim().toLowerCase();list.textContent="";
    const codes=allCurrencies();
    if(!s){list.append(h("div",{class:"sgroup",text:"Popular"}),...POPULAR.map(row),h("div",{class:"sgroup",text:"All currencies"}),...codes.filter(c=>!POPULAR.includes(c)).sort((a,b)=>currencyName(a).localeCompare(currencyName(b))).map(row));return;}
    const hits=codes.filter(c=>c.toLowerCase().includes(s)||currencyName(c).toLowerCase().includes(s)||currencySymbol(c).toLowerCase()===s);
    if(hits.length)list.append(...hits.map(row));
    else if(/^[a-z]{3}$/i.test(s))list.append(h("button",{onclick:()=>pick({currency:s.toUpperCase(),currencySymbol:""})},h("b",{text:"Use code "+s.toUpperCase()}),h("span",{text:"Not in the list, but you can still use it"})));
    else list.append(h("p",{class:"small muted",text:"No match. Try the currency code, or use a custom symbol below."}));
  };
  const close=openSheet([h("div",{class:"shead"},h("h3",{text:"Currency"}),h("button",{class:"x","aria-label":"Close",text:"×",onclick:()=>close()})),
    h("p",{class:"small muted",style:"margin:0 0 10px",text:"Now using: "+currencyLabel()}),q,list,
    h("div",{class:"field"},h("span",{class:"lbl",text:"Or use your own symbol"}),h("div",{class:"listrow"},custom,h("button",{type:"button",class:"btn primary",text:"Use",onclick:()=>{const v=custom.value.trim();if(!v){custom.focus();return;}pick({currency:"",currencySymbol:v});}})))],{full:true});
  q.addEventListener("input",debounce(draw,80));draw();setTimeout(()=>q.focus(),80);
}
function monthTxns(mk){return vals("expenses").filter(x=>x.date&&x.date.slice(0,7)===mk);}
function renderMoney(main){
  const mk=UI.moneyMonth,[y,m]=mk.split("-").map(Number),label=new Date(y,m-1,1).toLocaleDateString(undefined,{month:"long",year:"numeric"});
  const tx=monthTxns(mk),spent=tx.filter(x=>x.type!=="income").reduce((s,x)=>s+Number(x.amount||0),0),income=tx.filter(x=>x.type==="income").reduce((s,x)=>s+Number(x.amount||0),0);
  setHeader("Money",label);
  const shift=n=>{const d=new Date(y,m-1+n,1);UI.moneyMonth=d.getFullYear()+"-"+pad(d.getMonth()+1);render();};
  const outer=main;main=h("div",{class:"mcol"});const right=h("div",{class:"mcol"});outer.append(h("div",{class:"cols2"},main,right));
  main.append(h("div",{class:"mhead",style:"margin-top:14px;padding:0"},h("button",{class:"mnav","aria-label":"Previous month",text:"‹",onclick:()=>shift(-1)}),h("h2",{text:label}),h("button",{class:"mnav","aria-label":"Next month",text:"›",onclick:()=>shift(1)})));
  if(!SET.currency&&!SET.currencySymbol)main.append(h("div",{class:"card sec"},h("b",{text:"Which currency do you use?"}),h("p",{class:"small muted",style:"margin:4px 0 10px",text:"Pick any currency in the world, or your own symbol."}),h("button",{class:"btn primary",text:"Choose currency",onclick:openCurrencyPicker})));
  else main.append(h("div",{class:"small muted",style:"text-align:center;margin-top:6px"},"Currency: "+currencyLabel()+" ",h("button",{class:"linkbtn",text:"Change",onclick:openCurrencyPicker})));
  const budget=Number(SET.budget)||0;
  const sum=h("div",{class:"card sec"},h("div",{class:"small muted",text:"Spent this month"}),h("div",{class:"bigamt",text:money(spent)}));
  if(budget){const left=budget-spent;sum.append(h("div",{style:"margin:10px 0 6px",class:"small",text:left>=0?money(left)+" left of "+money(budget):money(-left)+" over your "+money(budget)+" budget"}),bar(spent/budget,left<0));}
  else sum.append(h("button",{class:"linkbtn",text:"Set a monthly budget",onclick:openBudget}));
  if(income)sum.append(h("div",{class:"small muted",style:"margin-top:8px",text:"Income: "+money(income)+", balance: "+money(income-spent)}));
  main.append(sum);
  main.append(h("div",{class:"btnrow"},h("button",{class:"btn primary wide",text:"+ Add expense",onclick:()=>openExpense(null)}),h("button",{class:"btn ghost",text:"Budget",onclick:openBudget})));
  const byCat={};tx.filter(x=>x.type!=="income").forEach(x=>byCat[x.catId]=(byCat[x.catId]||0)+Number(x.amount||0));
  const cats=SET.categories.filter(c=>byCat[c.id]||(SET.catBudgets||{})[c.id]).concat(Object.keys(byCat).filter(id=>!SET.categories.some(c=>c.id===id)).map(catById)).sort((a,b)=>(byCat[b.id]||0)-(byCat[a.id]||0));
  if(cats.length){const max=Math.max(...cats.map(c=>byCat[c.id]||0),1);
    main.append(h("section",{class:"sec"},h("div",{class:"sec-h"},h("h2",{text:"By category"})),h("div",{class:"card",style:"padding:4px 16px"},cats.map(c=>{const s=byCat[c.id]||0,cb=Number((SET.catBudgets||{})[c.id])||0;
      return h("div",{class:"cat"},h("span",{style:"font-size:20px",text:c.emoji}),h("span",{text:c.name}),h("b",{text:money(s)+(cb?" / "+money(cb):"")}),bar(cb?s/cb:s/max,cb&&s>cb));}))));}
  renderSubs(main);
  main=right;
  const byDay={};tx.forEach(x=>(byDay[x.date]=byDay[x.date]||[]).push(x));
  const days=Object.keys(byDay).sort().reverse();
  if(!days.length)main.append(h("div",{class:"sec"},h("div",{class:"empty",text:"No spending logged in "+label+"."})));
  days.forEach(k=>{const list=byDay[k].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));const tot=list.filter(x=>x.type!=="income").reduce((s,x)=>s+Number(x.amount||0),0);
    main.append(h("section",{class:"sec"},h("div",{class:"sec-h"},h("h2",{style:"font-size:17px",text:relLabel(k)}),h("span",{class:"n",text:tot?money(tot):""})),h("div",{class:"box"},list.map(x=>{const c=catById(x.catId),inc=x.type==="income";
      return h("button",{class:"txn",onclick:()=>openExpense(x)},h("span",{class:"em",text:inc?"💰":c.emoji}),h("span",{class:"mid"},h("b",{text:x.note||(inc?"Income":c.name)}),h("span",{class:"small muted",text:inc?"Income":c.name})),h("span",{class:"amt"+(inc?" in":""),text:(inc?"+":"")+money(x.amount)}));}))));});
}
function openExpense(x){
  const isNew=!x||!D.expenses.has(x.id);
  const d=clone(x||{id:uid(),amount:0,type:"expense",catId:SET.categories[0].id,note:"",date:todayKey(),createdAt:Date.now()});
  const amt=h("input",{class:"inp amt",inputmode:"decimal",placeholder:"0.00",value:d.amount?String(d.amount):"","aria-label":"Amount"});
  const catRow=h("div",{class:"field"},h("span",{class:"lbl",text:"Category"}),chips(SET.categories.map(c=>[c.id,c.emoji+" "+c.name]),d.catId,v=>{d.catId=v;}));
  catRow.hidden=d.type==="income";
  const note=h("input",{class:"inp",value:d.note||"",placeholder:"What was it for? (optional)","aria-label":"Note"});
  const date=h("input",{class:"inp",type:"date",value:d.date,"aria-label":"Date"});
  const save=h("button",{class:"btn primary",text:isNew?"Add":"Save"}),cancel=h("button",{class:"btn ghost",text:"Cancel"}),del=isNew?null:h("button",{class:"btn danger",text:"Delete"});
  const close=openSheet([h("h3",{text:isNew?"Add expense":"Edit"}),!SET.currency&&!SET.currencySymbol?h("div",{class:"field row",style:"justify-content:space-between;margin:0 0 14px"},h("span",{class:"small muted",text:"No currency chosen yet"}),currencyButton()):null,
    h("div",{style:"text-align:center;margin-bottom:12px"},seg([["expense","Expense"],["income","Income"]],d.type,v=>{d.type=v;catRow.hidden=v==="income";})),amt,catRow,
    h("div",{class:"field"},h("label",{text:"Note"}),note),h("div",{class:"field"},h("label",{text:"Date"}),date),h("div",{class:"actions"},del,cancel,save)]);
  cancel.onclick=close;
  if(del)del.onclick=()=>{const prev=snap("expenses",d.id);Store.del("expenses",d.id);close();undoable("Deleted",[["expenses",prev,d.id]]);};
  save.onclick=()=>{const v=parseFloat(amt.value.replace(/[^\d.,-]/g,"").replace(",","."));if(!(v>0)){amt.focus();toast("Enter an amount above zero.");return;}
    Object.assign(d,{amount:Math.round(v*100)/100,note:note.value.trim(),date:date.value||todayKey()});Store.put("expenses",d);close();};
  amt.addEventListener("keydown",e=>{if(e.key==="Enter")save.click();});
  if(isNew)setTimeout(()=>amt.focus(),60);
}
function openBudget(){
  const cats=clone(SET.categories),cb=Object.assign({},SET.catBudgets||{});
  const total=h("input",{class:"inp",inputmode:"decimal",value:SET.budget||"",placeholder:"e.g. 1500","aria-label":"Monthly budget"});
  const box=h("div");
  const draw=()=>{box.textContent="";cats.forEach((c,i)=>box.append(h("div",{class:"listrow"},h("span",{style:"font-size:20px;width:28px",text:c.emoji}),h("input",{class:"inp",value:c.name,"aria-label":"Category name",oninput:e=>{c.name=e.target.value;}}),h("input",{class:"inp",style:"max-width:110px",inputmode:"decimal",placeholder:"Limit",value:cb[c.id]||"","aria-label":c.name+" limit",oninput:e=>{cb[c.id]=e.target.value;}}),cats.length>1?h("button",{type:"button",class:"x","aria-label":"Remove "+c.name,text:"×",onclick:()=>{cats.splice(i,1);draw();}}):null)));};draw();
  const newEmoji=h("input",{class:"inp",style:"max-width:64px;text-align:center",value:"🏷️","aria-label":"Emoji"}),newName=h("input",{class:"inp",placeholder:"New category","aria-label":"New category name"});
  const save=h("button",{class:"btn primary",text:"Save"}),cancel=h("button",{class:"btn ghost",text:"Cancel"});
  const close=openSheet([h("h3",{text:"Budget"}),h("div",{class:"field"},h("label",{text:"Monthly budget (optional)"}),total),h("div",{class:"field row",style:"justify-content:space-between"},h("span",{class:"small muted",text:"Currency: "+currencyLabel()}),currencyButton()),
    h("div",{class:"field"},h("span",{class:"lbl",text:"Categories and limits (limits optional)"}),box,h("div",{class:"listrow"},newEmoji,newName,h("button",{type:"button",class:"chip",text:"Add",onclick:()=>{const n=newName.value.trim();if(!n)return;cats.push({id:uid(),name:n,emoji:newEmoji.value.trim()||"🏷️"});newName.value="";draw();}}))),
    h("div",{class:"actions"},cancel,save)]);
  cancel.onclick=close;
  save.onclick=()=>{const num=v=>{const f=parseFloat(String(v||"").replace(",","."));return f>0?Math.round(f*100)/100:0;};const clean={};cats.forEach(c=>{const v=num(cb[c.id]);if(v)clean[c.id]=v;});
    Store.settings({budget:num(total.value),categories:cats.map(c=>({id:c.id,name:c.name.trim()||"Untitled",emoji:c.emoji})),catBudgets:clean});close();};
}

/* ================= goals ================= */
function goalProgress(g){
  if(g.kind==="number"){const t=Number(g.target)||0;return{pct:t?Math.min(1,(Number(g.current)||0)/t):0,text:(Number(g.current)||0)+" / "+t+(g.unit?" "+g.unit:"")};}
  const ts=vals("tasks").filter(t=>t.goalId===g.id&&!(t.repeat&&!t.done&&false));const done=ts.filter(t=>t.done).length;
  return{pct:ts.length?done/ts.length:0,text:ts.length?done+" of "+plural(ts.length,"task")+" done":"No tasks linked yet"};
}
function renderGoals(main){
  const gs=vals("goals").sort((a,b)=>(a.due||"9999")<(b.due||"9999")?-1:1);
  const active=gs.filter(g=>!g.done),done=gs.filter(g=>g.done);
  main.append(h("div",{class:"btnrow"},h("button",{class:"btn primary wide",text:"+ New goal",onclick:()=>openGoal(null)})));
  if(!gs.length){main.append(h("div",{class:"sec"},h("div",{class:"empty",text:"Set a goal, then link tasks to it or track a number, like savings or kilometres run."})));return;}
  const card=g=>{const p=goalProgress(g);return h("div",{class:"card"},h("button",{class:"hname",onclick:()=>openGoal(g)},h("b",{style:"font-size:17px",text:"🎯 "+g.title}),h("span",{text:(g.due?"By "+fromKey(g.due).toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"})+". ":"")+p.text})),
    h("div",{style:"margin-top:10px"},bar(p.pct)),g.kind==="number"&&!g.done?h("div",{class:"row",style:"margin-top:10px"},h("button",{class:"chip",text:"+1",onclick:()=>Store.put("goals",Object.assign(clone(g),{current:(Number(g.current)||0)+1}))}),h("button",{class:"chip",text:"Update",onclick:()=>openGoal(g)})):null);};
  main.append(h("div",{class:"cards grid sec"},active.map(card)));
  if(done.length)main.append(h("section",{class:"sec"},h("div",{class:"sec-h"},h("h2",{text:"Achieved"})),h("div",{class:"cards grid"},done.map(card))));
}
function openGoal(g){
  const isNew=!g;const d=clone(g||{id:uid(),title:"",why:"",due:"",kind:"tasks",current:0,target:10,unit:"",done:false,createdAt:Date.now()});
  const title=h("input",{class:"inp title",value:d.title,placeholder:"e.g. Run a half marathon","aria-label":"Goal"});
  const why=h("textarea",{class:"inp",placeholder:"Why does this matter to you?","aria-label":"Why"});why.value=d.why||"";
  const due=h("input",{class:"inp",type:"date",value:d.due||"","aria-label":"Target date"});
  const cur=h("input",{class:"inp",inputmode:"decimal",value:d.current,"aria-label":"Current"}),tgt=h("input",{class:"inp",inputmode:"decimal",value:d.target,"aria-label":"Target"}),unit=h("input",{class:"inp",value:d.unit||"",placeholder:"km, pages…","aria-label":"Unit"});
  const numRow=h("div",{class:"field"},h("span",{class:"lbl",text:"Progress: now, target, unit"}),h("div",{class:"row"},cur,tgt,unit));
  const linked=isNew?[]:vals("tasks").filter(t=>t.goalId===d.id).sort(sortTasks);
  const taskBox=h("div",{class:"field"},h("span",{class:"lbl",text:"Linked tasks"}),linked.length?h("ul",{class:"tasks"},linked.map(t=>taskRow(t,{showDate:true}))):h("div",{class:"small muted",text:"None yet. Add one below, or pick this goal when editing any task."}),
    h("button",{class:"linkbtn",text:"+ Add a task for this goal",onclick:()=>{collect();if(!d.title){toast("Name the goal first.");return;}Store.put("goals",d);close();openTask(null,{goalId:d.id,date:null});}}));
  const sync=()=>{numRow.hidden=d.kind!=="number";taskBox.hidden=d.kind!=="tasks";};
  const collect=()=>Object.assign(d,{title:title.value.trim(),why:why.value.trim(),due:due.value,current:parseFloat(cur.value)||0,target:parseFloat(tgt.value)||0,unit:unit.value.trim()});
  const save=h("button",{class:"btn primary",text:isNew?"Add goal":"Save"}),cancel=h("button",{class:"btn ghost",text:"Cancel"}),del=isNew?null:h("button",{class:"btn danger",text:"Delete"});
  const ach=isNew?null:h("button",{class:"chip","aria-pressed":String(!!d.done),text:d.done?"✓ Achieved":"Mark achieved",onclick:()=>{collect();d.done=!d.done;Store.put("goals",d);close();if(d.done)toast("Goal achieved. Nice work!");}});
  const close=openSheet([h("h3",{text:isNew?"New goal":"Goal"}),title,h("div",{class:"field"},h("label",{text:"Why"}),why),h("div",{class:"field"},h("label",{text:"Target date (optional)"}),due),
    h("div",{class:"field"},h("span",{class:"lbl",text:"Track progress by"}),seg([["tasks","Tasks"],["number","A number"]],d.kind,v=>{d.kind=v;sync();})),numRow,taskBox,ach?h("div",{class:"field"},ach):null,h("div",{class:"actions"},del,cancel,save)]);
  sync();cancel.onclick=close;
  if(del)del.onclick=()=>{const prev=snap("goals",d.id);Store.del("goals",d.id);close();undoable("Goal deleted",[["goals",prev,d.id]]);};
  save.onclick=()=>{collect();if(!d.title){title.focus();toast("Name the goal first.");return;}Store.put("goals",d);close();};
}

/* ================= shopping ================= */
function parseItem(s){const m=s.match(/^(\d+(?:[.,]\d+)?\s*(?:x|kg|g|lb|lbs|l|ml|pcs|pack|packs|dozen)?)\s+(.+)$/i);const cap=x=>x.charAt(0).toUpperCase()+x.slice(1);return m?{qty:m[1].trim(),name:cap(m[2].trim())}:{qty:"",name:cap(s.trim())};}
function renderShopping(main){
  if(!SET.shopLists.some(l=>l.id===UI.shopList))UI.shopList=SET.shopLists[0].id;
  const L=SET.shopLists.find(l=>l.id===UI.shopList);
  main.append(h("div",{class:"row sec",style:"margin-top:14px"},SET.shopLists.map(l=>h("button",{class:"chip","aria-pressed":String(l.id===UI.shopList),text:l.name+" ("+vals("shop").filter(i=>i.listId===l.id&&!i.done).length+")",onclick:()=>{UI.shopList=l.id;render();}})),h("button",{class:"chip",text:"+ New list",onclick:()=>openShopList(null)})));
  const items=vals("shop").filter(i=>i.listId===UI.shopList).sort((a,b)=>(a.done?1:0)-(b.done?1:0)||(a.createdAt||0)-(b.createdAt||0));
  if(!items.length)main.append(h("div",{class:"sec"},h("div",{class:"empty",text:"Your "+L.name+" list is empty. Type below to add items. Try “2 kg rice”."})));
  else main.append(h("div",{class:"sec"},h("ul",{class:"tasks"},items.map(it=>{const cb=h("button",{class:"check","aria-label":(it.done?"Unmark ":"Mark bought: ")+it.name,onclick:()=>Store.put("shop",Object.assign(clone(it),{done:!it.done}))});cb.innerHTML=CHECK;
    const rm=h("button",{class:"x","aria-label":"Remove "+it.name,text:"×",onclick:()=>{const prev=clone(it);Store.del("shop",it.id);undoable("Removed "+it.name,[["shop",prev,it.id]]);}});
    return h("li",{class:"task"+(it.done?" done":"")},cb,h("div",{class:"tbody"},h("span",{class:"ttitle",text:it.name}),it.qty?h("span",{class:"meta",text:it.qty}):null),rm);}))));
  const bought=items.filter(i=>i.done);
  const share=async()=>{const text=L.name+"\n"+items.filter(i=>!i.done).map(i=>"- "+(i.qty?i.qty+" ":"")+i.name).join("\n");
    try{if(navigator.share){await navigator.share({title:L.name,text});return;}}catch(e){if(e&&e.name==="AbortError")return;}
    try{await navigator.clipboard.writeText(text);toast("List copied. Paste it into any chat.");}catch(e){toast("Couldn't share from this browser.");}};
  const clr=h("button",{class:"linkbtn danger",text:"Clear "+bought.length+" bought",onclick:()=>{const ch=bought.map(i=>["shop",clone(i),i.id]);bought.forEach(i=>Store.del("shop",i.id));undoable("Cleared "+plural(bought.length,"item"),ch);}});
  main.append(h("div",{class:"sec row",style:"justify-content:space-between"},h("button",{class:"linkbtn",text:"Share list",onclick:share}),h("button",{class:"linkbtn",text:"Rename or delete",onclick:()=>openShopList(L)}),bought.length?clr:null));
}
function openShopList(L){
  const name=h("input",{class:"inp",value:L?L.name:"",placeholder:"e.g. Pharmacy","aria-label":"List name"});
  const save=h("button",{class:"btn primary",text:"Save"}),cancel=h("button",{class:"btn ghost",text:"Cancel"});
  const del=L&&SET.shopLists.length>1?h("button",{class:"btn danger",text:"Delete list"}):null;
  const close=openSheet([h("h3",{text:L?"Edit list":"New shopping list"}),name,h("div",{class:"actions"},del,cancel,save)]);
  cancel.onclick=close;
  if(del)twoTap(del,"Confirm",()=>{vals("shop").filter(i=>i.listId===L.id).forEach(i=>Store.del("shop",i.id));Store.settings({shopLists:SET.shopLists.filter(l=>l.id!==L.id)});close();});
  save.onclick=()=>{const n=name.value.trim();if(!n){name.focus();return;}if(L)Store.settings({shopLists:SET.shopLists.map(l=>l.id===L.id?{id:l.id,name:n}:l)});else{const id=uid();Store.settings({shopLists:[...SET.shopLists,{id,name:n}]});UI.shopList=id;}close();};
  setTimeout(()=>name.focus(),60);
}

/* ================= weekly review ================= */
function renderReview(main){
  const ws=addDays(weekStart(new Date()),7*UI.reviewWeek),we=addDays(ws,6),s=key(ws),e=key(we),tk=todayKey();
  const inWeek=k=>k&&k>=s&&k<=e;
  const lbl=ws.toLocaleDateString(undefined,{day:"numeric",month:"short"})+" to "+we.toLocaleDateString(undefined,{day:"numeric",month:"short"});
  main.append(h("div",{class:"mhead",style:"margin-top:14px;padding:0"},h("button",{class:"mnav","aria-label":"Previous week",text:"‹",onclick:()=>{UI.reviewWeek--;render();}}),h("h2",{style:"font-size:18px",text:UI.reviewWeek===0?"This week":UI.reviewWeek===-1?"Last week":lbl}),h("button",{class:"mnav","aria-label":"Next week",text:"›",disabled:UI.reviewWeek>=0,onclick:()=>{if(UI.reviewWeek<0){UI.reviewWeek++;render();}}})));
  main.append(h("div",{class:"small muted",style:"text-align:center;margin-top:4px",text:lbl}));
  const tasks=vals("tasks");
  const done=tasks.filter(t=>t.done&&t.doneAt&&inWeek(key(new Date(t.doneAt))));
  const open=tasks.filter(t=>!t.done&&inWeek(t.date)&&t.date<=tk);
  const rate=done.length+open.length?done.length/(done.length+open.length):0;
  let hDue=0,hHit=0;vals("habits").filter(x=>!x.archived).forEach(hb=>{for(let i=0;i<7;i++){const d=addDays(ws,i),k=key(d);if(k>tk||k<habitStart(hb))continue;if(habitDue(hb,d)){hDue++;if(hb.log&&hb.log[k])hHit++;}}});
  const spent=vals("expenses").filter(x=>x.type!=="income"&&inWeek(x.date)).reduce((a,x)=>a+Number(x.amount||0),0);
  const jn=vals("notes").filter(n=>n.type==="journal"&&inWeek(n.date)).length;
  main.append(h("div",{class:"stats two sec"},
    h("div",{class:"stat"},h("b",{text:done.length}),h("span",{text:"Tasks done"})),h("div",{class:"stat"},h("b",{text:Math.round(rate*100)+"%"}),h("span",{text:"Completion rate"})),
    h("div",{class:"stat"},h("b",{text:hDue?Math.round(hHit/hDue*100)+"%":"–"}),h("span",{text:"Habits kept"})),h("div",{class:"stat"},h("b",{text:money(spent)}),h("span",{text:"Spent"})),
    h("div",{class:"stat"},h("b",{text:jn}),h("span",{text:"Journal entries"})),h("div",{class:"stat"},h("b",{text:vals("goals").filter(g=>!g.done).length}),h("span",{text:"Active goals"}))));
  const rid="wr-"+s,rv=D.notes.get(rid);
  main.append(h("div",{class:"btnrow"},h("button",{class:rv?"btn ghost wide":"btn primary wide",text:rv?"Open your reflection":"Write your weekly reflection",onclick:()=>{if(!D.notes.has(rid))Store.put("notes",newNote({id:rid,title:"Weekly review: "+lbl,body:"Wins:\n\n\nWhat was hard:\n\n\nFocus for next week:\n"}));openNote(D.notes.get(rid));}})));
  if(open.length){const nm=key(addDays(weekStart(new Date()),7));const mv=h("button",{class:"linkbtn",text:"Move all to next Monday",onclick:()=>{const ch=open.map(t=>["tasks",clone(t),t.id]);open.forEach(t=>Store.put("tasks",Object.assign(clone(t),{date:nm})));undoable("Moved "+plural(open.length,"task"),ch);}});
    main.append(section("Still open",open.sort(sortTasks),{showDate:true,right:mv}));}
  if(done.length)main.append(section("Done",done.sort((a,b)=>b.doneAt-a.doneAt).slice(0,15),{showDate:false,right:h("span",{class:"n",text:done.length>15?"Latest 15":""})}));
  if(UI.reviewWeek===0){const ns=key(addDays(ws,7)),ne=key(addDays(ws,13));const next=tasks.filter(t=>!t.done&&t.date>=ns&&t.date<=ne).sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:sortTasks(a,b));main.append(section("Coming up next week",next,{showDate:true,empty:"Nothing planned for next week yet."}));}
  const lb=Number(lsGet("planner.lastBackup","0"));
  if(!lb||Date.now()-lb>14*864e5)main.append(h("div",{class:"card sec"},h("b",{text:"💾 Time for a backup?"}),h("p",{class:"small muted",style:"margin:6px 0 0",text:lb?"Your last backup was "+new Date(lb).toLocaleDateString()+".":"You haven't downloaded a backup on this device yet."}),h("button",{class:"linkbtn",text:"Download backup now",onclick:downloadBackup})));
}

/* ================= backup ================= */
function downloadBackup(){
  const out={app:"planner",version:2,exportedAt:new Date().toISOString(),settings:SET};COLS.forEach(c=>out[c]=vals(c));
  download(new Blob([JSON.stringify(out,null,1)],{type:"application/json"}),"nova-backup-"+todayKey()+".json");
  lsSet("planner.lastBackup",String(Date.now()));toast("Backup downloaded");render();
}
function renderBackup(main){
  const lb=Number(lsGet("planner.lastBackup","0"));
  const counts=COLS.map(c=>D[c].size).reduce((a,b)=>a+b,0);
  main.append(h("div",{class:"card sec"},h("b",{text:"Download a backup"}),h("p",{class:"small muted",text:"Saves all "+plural(counts,"item")+" (tasks, habits, notes, goals, money and shopping lists) into one file. "+(lb?"Last backup: "+new Date(lb).toLocaleString()+".":"No backup yet on this device.")}),h("button",{class:"btn primary",text:"Download backup",onclick:downloadBackup})));
  const fi=h("input",{type:"file",accept:"application/json,.json",hidden:true,onchange:async e=>{const f=e.target.files[0];e.target.value="";if(!f)return;
    let data;try{data=JSON.parse(await f.text());}catch(x){toast("That file isn't a Nova backup.");return;}
    if(!data||data.app!=="planner"){toast("That file isn't a Nova backup.");return;}
    const n=COLS.reduce((a,c)=>a+(Array.isArray(data[c])?data[c].length:0),0);
    const go=h("button",{class:"btn primary",text:"Restore"});const close=openSheet([h("h3",{text:"Restore this backup?"}),h("p",{class:"muted",text:"It contains "+plural(n,"item")+" from "+new Date(data.exportedAt).toLocaleString()+". Items are added back or updated. Nothing you've added since is deleted."}),h("div",{class:"actions"},h("button",{class:"btn ghost",text:"Cancel",onclick:()=>close()}),go)]);
    go.onclick=async()=>{go.disabled=true;try{const k=await Store.importAll(data);close();toast("Restored "+plural(k,"item"));}catch(x){console.error(x);toast("Restore failed. Try again.");go.disabled=false;}};}});
  main.append(h("div",{class:"card sec"},h("b",{text:"Restore from a backup"}),h("p",{class:"small muted",text:"Pick a planner-backup .json file you downloaded earlier."}),h("button",{class:"btn ghost",text:"Choose file",onclick:()=>fi.click()}),fi));
  main.append(h("p",{class:"small muted sec",text:"When you're signed in, everything is also stored safely in your Firebase account. Backups are an extra copy you control."}));
}

/* ================= settings ================= */
function renderSettings(main){
  const row=(title,sub,ctrl)=>h("div",{class:"setrow"},h("div",null,h("b",{text:title}),sub?h("span",{text:sub}):null),ctrl);
  const nOn=Notify.on(),perm=Notify.ok()?Notification.permission:"unsupported";
  const times=(k,opts)=>h("select",{class:"inp","aria-label":"Time",onchange:e=>{lsSet(k,e.target.value);scheduleNotify();}},h("option",{value:""},"Off"),opts.map(t=>h("option",{value:t,selected:lsGet(k,"")===t},fmtTime(t))));
  main.append(h("section",{class:"sec"},h("div",{class:"sec-h"},h("h2",{text:"Notifications"})),h("div",{class:"card",style:"padding:2px 16px"},
    row("Reminders",perm==="unsupported"?"Not supported in this browser":perm==="denied"?"Blocked. Allow notifications for this app in your phone's settings.":nOn?"On for this device":"Off",
      perm==="unsupported"||perm==="denied"?h("span"):nOn?h("button",{class:"chip",text:"Turn off",onclick:()=>Notify.disable()}):h("button",{class:"btn primary",text:"Turn on",onclick:()=>Notify.enable()})),
    nOn?row("Send a test","Check that notifications show up",h("button",{class:"chip",text:"Test",onclick:()=>Notify.show("Nova","Notifications are working.","test")})):null,
    row("Habit check-in","Nudge if habits are left",times("planner.habitNudge",["08:00","12:00","18:00","20:00","21:00"])),
    row("Journal nudge","If you haven't written today",times("planner.journalNudge",["20:00","21:00","22:00"])))),
    h("p",{class:"small muted",text:"Web apps can only notify you while the app is open or was used recently. For alarms you can't miss, open the task and tap “Add to Google Calendar”."}));
  const secLock=h("div",{class:"card",style:"padding:2px 16px"});renderLockSettings(secLock,row);
  main.append(h("section",{class:"sec"},h("div",{class:"sec-h"},h("h2",{text:"Privacy"})),secLock),h("p",{class:"small muted",text:"App lock is a privacy screen for this device. It doesn't encrypt your data."}));
  const secG=h("div",{class:"card",style:"padding:2px 16px"});renderGcalSettings(secG,row);
  main.append(h("section",{class:"sec"},h("div",{class:"sec-h"},h("h2",{text:"Calendar"})),secG));
  const fp=focusPrefs();const sel=(k,opts,cur)=>h("select",{class:"inp","aria-label":"Minutes",onchange:e=>lsSet(k,e.target.value)},opts.map(m=>h("option",{value:m,selected:m===cur},m+" min")));
  main.append(h("section",{class:"sec"},h("div",{class:"sec-h"},h("h2",{text:"Focus timer"})),h("div",{class:"card",style:"padding:2px 16px"},
    row("Focus length","",sel("planner.focusMin",[15,20,25,30,45,50,60,90],fp.focus)),row("Break length","",sel("planner.breakMin",[3,5,10,15,20],fp.brk)))));
  const theme=lsGet("planner.theme","auto");
  main.append(h("section",{class:"sec"},h("div",{class:"sec-h"},h("h2",{text:"General"})),h("div",{class:"card",style:"padding:2px 16px"},
    row("Account",Store.user?Store.user.email:(fbAuth?"Not signed in":"Sync not set up"),h("button",{class:"chip",text:Store.user?"Open profile":"Sign in",onclick:openAccount})),
    row("Currency",currencyLabel(),currencyButton()),
    row("Task lists",plural(SET.lists.length,"list"),h("button",{class:"chip",text:"Edit",onclick:openLists})),
    row("Home screen widgets","Choose what the Home tab shows",h("button",{class:"chip",text:"Customise",onclick:openDashEditor})),
    row("Bottom bar (phone)",navFull("phone").map(navName).join(", "),h("button",{class:"chip",text:"Change",onclick:()=>openNavEditor("phone")})),
    row("Sidebar (laptop)",navFull("desk").map(navName).join(", "),h("button",{class:"chip",text:"Change",onclick:()=>openNavEditor("desk")})),
    row("Appearance","",h("select",{class:"inp","aria-label":"Theme",onchange:e=>{lsSet("planner.theme",e.target.value);applyTheme();}},[["auto","Match phone"],["light","Light"],["dark","Dark"]].map(([v,l])=>h("option",{value:v,selected:theme===v},l)))))));
  const st=Updates.state,when=Updates.checked?new Date(Updates.checked).toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"}):"";
  const upd=updateReady()?row("Version "+Updates.latest+" is available","You're on version "+APP_VERSION+". Updating takes a second and keeps all your data.",h("button",{class:"btn primary",style:"white-space:nowrap",text:"Update now",onclick:applyUpdate}))
    :row("Nova version "+APP_VERSION,st==="checking"?"Checking for updates…":st==="offline"?"Couldn't check: you're offline.":st==="error"?"Couldn't check right now. Try again later.":when?"You're up to date. Last checked at "+when+".":"",
      h("button",{class:"chip",text:st==="checking"?"Checking…":"Check for updates",disabled:st==="checking",onclick:()=>checkForUpdateNow()}));
  const inst=canOfferInstall()?h("div",{class:"setrow"},h("div",null,h("b",{text:"Install Nova on this device"}),h("span",{text:"Get its own icon, full screen, and offline use."})),h("button",{class:"btn primary",style:"white-space:nowrap",text:"Install",onclick:installApp})):null;
  main.append(h("section",{class:"sec"},h("div",{class:"sec-h"},h("h2",{text:"Updates"})),h("div",{class:"card upcard",style:"padding:2px 16px"},upd,inst)),
    h("p",{class:"small muted",text:"Nova checks for updates when you open it and every 30 minutes, and shows a bar at the top when one is ready."}));
  main.append(h("section",{class:"sec"},h("div",{class:"sec-h"},h("h2",{text:"Home screen"})),h("div",{class:"card"},
    h("p",{style:"margin:0 0 10px",text:"⚡ Quick actions: long-press the Nova icon on your home screen to add a task, log an expense, write a note or open today's journal."}),
    h("p",{style:"margin:0 0 10px",text:"📤 Share to Nova: in any app, tap Share and pick Nova to save text or links as a note."}),
    h("p",{class:"small muted",style:"margin:0",text:"Home-screen widgets need a native Android app, so installed web apps can't show them. Quick actions are the closest option."}))));
}
function applyTheme(){const t=lsGet("planner.theme","auto");if(t==="auto")document.documentElement.removeAttribute("data-theme");else document.documentElement.setAttribute("data-theme",t);}

/* ================= guide ================= */
function renderGuide(main){
  const keyRow=(keys,what)=>h("div",{class:"setrow"},h("div",null,h("b",{text:what})),h("span",{class:"keys"},keys.map((grp,i)=>[i?h("span",{class:"plus",text:"or"}):null,grp.map((k,j)=>[j?h("span",{class:"plus",text:"+"}):null,h("kbd",{text:k})])])));
  const tipRow=(icon,title,text)=>h("div",{class:"setrow",style:"align-items:flex-start"},h("div",null,h("b",{text:icon+"  "+title}),h("span",{text:text})));
  const card=(title,sub,rows)=>h("section",{class:"sec"},h("div",{class:"sec-h"},h("h2",{text:title}),sub?h("span",{class:"n",text:sub}):null),h("div",{class:"card",style:"padding:2px 16px"},rows));
  main.append(h("p",{class:"muted",style:"margin:16px 0 0",text:"Everything Nova can do, and the fastest ways to do it."}));
  const MAC=/Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent),CTRL=MAC?"⌘":"Ctrl";
  const kb=card("Keyboard shortcuts","On a laptop",[
    keyRow([["N"]],"New item in the section you're in"),
    keyRow([["F"]],"Open the focus timer"),
    keyRow([["/"],[CTRL,"K"]],"Search everything"),
    keyRow([["Q"]],"Jump to the quick-add bar"),
    keyRow([["1"],["2"],["…"],["9"]],"Go to the pages in your sidebar, in order ("+navFull("desk").slice(0,9).map(navName).join(", ")+")"),
    keyRow([["T"]],"Jump to today (in Plan)"),
    keyRow([["←"],["→"]],"Previous or next day (in Plan)"),
    keyRow([[CTRL,"Enter"]],"Save the open form"),
    keyRow([["Enter"]],"Save a task or amount from its first box"),
    keyRow([["Esc"]],"Close the open window"),
    keyRow([["?"]],"Open this guide")]);
  const phone=card("On your phone","Touch and gestures",[
    tipRow("⚡","Quick actions","Long-press the Nova icon on your home screen to add a task, log an expense, write a note or open today's journal."),
    tipRow("📤","Share to Nova","In any app, tap Share and choose Nova to save text or a link as a note."),
    tipRow("👆","Swipe the calendar","In Month view, swipe left or right to change month."),
    tipRow("↩️","Undo","Deleted or ticked something by mistake? Tap Undo on the message at the bottom.")]);
  if(UI.desktop)main.append(kb,phone);else main.append(phone,kb);
  main.append(card("Formatting notes","Notes and journal",[
    tipRow("🖋️","Toolbar","Select text, then use the toolbar above your note: headings, bold, colours, lists, checkboxes, indent, alignment, links, dividers and tables."),
    keyRow([["#"],["##"],["###"]],"Type at the start of a line, then a space, for a heading"),
    keyRow([["-"],["1."],["[]"]],"Type at the start of a line, then a space, for a bullet, numbered list or checkbox"),
    keyRow([[">"]],"Then a space, for a quote"),
    keyRow([["---"],["Enter"]],"A divider line"),
    keyRow([["**bold**"],["*italic*"],["~~strike~~"]],"Type the marks around text"),
    keyRow([[CTRL,"B"],[CTRL,"I"],[CTRL,"U"]],"Bold, italic, underline"),
    keyRow([[CTRL,"K"]],"Add a link (select text first)"),
    keyRow([[CTRL,"Shift","7"],[CTRL,"Shift","8"],[CTRL,"Shift","9"]],"Numbered list, bullet list, checklist"),
    keyRow([[CTRL,"Alt","1"],[CTRL,"Alt","2"],[CTRL,"Alt","3"]],"Heading 1, 2, 3 (Alt+0 for normal text)"),
    keyRow([["Tab"],["Shift","Tab"]],"Indent or outdent a list item"),
    keyRow([[CTRL,"Z"],[CTRL,"Y"]],"Undo, redo")]));
  main.append(card("Planning","",[
    tipRow("✨","Smart quick add","Type naturally: “Dentist tomorrow 3pm #personal !!” sets the date, time, list and priority. Also try “every monday”, “in 3 days”, “for 1h”, “remind 15m” and “25 dec”. The chips above the bar show what was understood."),
    tipRow("📅","Google Calendar","Connect it in Settings to see your events in Plan and Home, and send tasks to your calendar for real phone alarms."),
    tipRow("🗓️","Schedule","Tap an empty time slot to add a task there. Drag the ⠿ handle to move a task to a new time."),
    tipRow("↻","Repeating tasks","Tick a repeating task and the next one appears on its next date automatically."),
    tipRow("☑","Checklists","Break a task into steps in its Checklist. The task shows how many steps are done."),
    tipRow("🔔","Reminders","Turn on notifications in More, then Settings. For alarms you can't miss, open the task and tap Add to Google Calendar."),
    tipRow("🎯","Goals","Link tasks to a goal from the task's Goal box, and the goal's progress bar fills as you finish them.")]));
  main.append(card("Everything else","",[
    tipRow("🔥","Habits","Tap the big circle to tick today. Tap the small circles to fill in days you forgot."),
    tipRow("📝","Journal","One entry per day with a mood. Export your notes or journal as PDF or Word from the Export button."),
    tipRow("🛒","Shopping","Type “2 kg rice” and the amount is split out for you. Share a list straight to WhatsApp."),
    tipRow("🔗","Links","Paste a web address into the bar at the bottom to save it. Tap a logo to open the site, or Open all to open a whole category. Tap Edit to rename or move links."),
    tipRow("📤","Links from other apps","Share a web page to Nova from your browser and it's saved to Links."),
    tipRow("💰","Money","Pick any world currency, or your own symbol, in More, then Settings. Set limits per category in Budget."),
    tipRow("🏠","Home screen","Tap Customise on Home to choose widgets, make them small or large, and reorder them."),
    tipRow("⏱️","Focus timer","Start from a task (▶ Focus) or press F. Time spent is saved on the task and in Insights."),
    tipRow("🔁","Subscriptions","Add regular payments in Money. They're logged automatically when due, with an optional reminder."),
    tipRow("👨‍👩‍👧","Shared lists","In More, Shared lists, create a list and tap Invite. Family join with the code and see changes instantly."),
    tipRow("🔒","App lock","Set a PIN (and fingerprint) in Settings. Forgot it? Sign in with your account password to reset."),
    tipRow("💾","Backup","Download a backup file every few weeks from More, then Backup. The weekly review reminds you.")]));
}

/* ================= profile ================= */
function openProfile(){UI.tab="more";UI.page="profile";UI.sharedList=null;render();window.scrollTo(0,0);}
function reauth(pw){return Store.user.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(Store.user.email,pw));}
function acctMsg(e){const c=(e&&e.code)||"";
  if(c.includes("wrong-password")||c.includes("invalid-credential")||c.includes("invalid-login"))return"Your current password isn't right.";
  if(c.includes("weak-password")||c.includes("password-does-not-meet-requirements"))return"That password is too weak. Use at least 8 characters.";
  if(c.includes("requires-recent-login"))return"For safety, sign out, sign in again, then try once more.";
  if(c.includes("too-many-requests"))return"Too many attempts. Wait a minute and try again.";
  if(c.includes("network")||!navigator.onLine)return"No internet connection. Connect and try again.";
  return"Something went wrong. Try again.";}
function renderProfile(main){
  const u=Store.user;
  if(!u){main.append(h("div",{class:"card sec"},h("b",{text:"You're not signed in"}),h("p",{class:"small muted",text:fbAuth?"Sign in to sync Nova between your phone and laptop.":"Sync isn't set up, so everything is saved on this device only."}),fbAuth?h("button",{class:"btn primary",text:"Sign in",onclick:openAccount}):null));return;}
  const me=meInfo(),st=syncState(),row=(title,sub,ctrl)=>h("div",{class:"setrow"},h("div",null,h("b",{text:title}),sub?h("span",{text:sub}):null),ctrl);
  main.append(h("div",{class:"card sec prof"},h("span",{class:"pav big",style:"--c:"+colorFor(u.uid),text:me.name.charAt(0).toUpperCase()}),
    h("div",{class:"pinfo"},h("b",{class:"pname",text:me.name}),h("span",{class:"small muted",text:u.email||""}),h("span",{class:"pstat "+st.dot},h("i"),st.long))));
  // stats
  const created=u.metadata&&u.metadata.creationTime?new Date(u.metadata.creationTime):null,notes=vals("notes");
  const focusMin=vals("focus").reduce((s,f)=>s+(Number(f.minutes)||0),0),best=vals("habits").reduce((m,x)=>Math.max(m,bestStreak(x)),0);
  const stat=(n,l)=>h("div",{class:"stat"},h("b",{text:String(n)}),h("span",{text:l}));
  main.append(h("section",{class:"sec"},h("div",{class:"sec-h"},h("h2",{text:"Your stats"}),created?h("span",{class:"n",text:"Member since "+created.toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"})}):null),
    h("div",{class:"card stats pstats"},stat(vals("tasks").filter(t=>t.done).length,"Tasks done"),stat(vals("habits").filter(x=>!x.archived).length,"Habits"),stat(best,"Best streak"),
      stat(notes.filter(n=>n.type!=="journal").length,"Notes"),stat(notes.filter(n=>n.type==="journal").length,"Journal entries"),stat(focusMin?hmins(focusMin):"0m","Focus time")),
    h("p",{class:"small muted pusage",style:"margin:10px 2px 0",text:"Pictures and files: checking…"})));
  filesUsage().then(u=>{const el=main.querySelector(".pusage");if(el&&u)el.textContent="Pictures and files: "+u.count+" ("+fmtSize(u.size)+" of about 1 GB free space)";}).catch(()=>{const el=main.querySelector(".pusage");if(el)el.remove();});
  // name
  const nm=h("input",{class:"inp",value:u.displayName||"",placeholder:me.name,maxlength:"40",autocomplete:"name","aria-label":"Your name"});
  const saveN=h("button",{class:"btn primary",text:"Save"});
  saveN.onclick=async()=>{const n=nm.value.trim().replace(/\s+/g," ");if(!n){nm.focus();toast("Type your name first.");return;}if(n===(u.displayName||"")){toast("That's already your name.");return;}
    saveN.disabled=true;try{await u.updateProfile({displayName:n});await Promise.all([...Shared.lists.keys()].map(id=>fbDb.collection("shared").doc(id).update({["memberInfo."+u.uid]:meInfo()}).catch(()=>{})));updateSync();render();toast("Name saved");}
    catch(e){console.error(e);toast("Couldn't save your name. "+acctMsg(e));}saveN.disabled=false;};
  nm.addEventListener("keydown",e=>{if(e.key==="Enter")saveN.click();});
  main.append(h("section",{class:"sec"},h("div",{class:"sec-h"},h("h2",{text:"Your name"})),h("div",{class:"card"},h("div",{class:"row",style:"flex-wrap:nowrap"},nm,saveN),
    h("p",{class:"small muted",style:"margin:8px 0 0",text:"Shown to family on shared lists, like “added by "+me.name+"”."}))));
  // password
  const cur=h("input",{class:"inp",type:"password",autocomplete:"current-password",placeholder:"Current password","aria-label":"Current password"});
  const nw=h("input",{class:"inp",type:"password",autocomplete:"new-password",placeholder:"New password (at least 8 characters)","aria-label":"New password"});
  const perr=h("div",{class:"small",role:"alert",style:"color:var(--danger);min-height:18px;margin-top:6px"});
  const saveP=h("button",{class:"btn primary",text:"Change password"});
  saveP.onclick=async()=>{perr.textContent="";if(!cur.value){cur.focus();perr.textContent="Enter your current password.";return;}
    if(nw.value.length<8){nw.focus();perr.textContent="Use at least 8 characters for your new password.";return;}
    if(nw.value===cur.value){perr.textContent="Choose a password that's different from your current one.";return;}
    saveP.disabled=true;try{await reauth(cur.value);await u.updatePassword(nw.value);cur.value="";nw.value="";toast("Password changed");}catch(e){console.error(e);perr.textContent=acctMsg(e);}saveP.disabled=false;};
  main.append(h("section",{class:"sec"},h("div",{class:"sec-h"},h("h2",{text:"Password"})),h("div",{class:"card"},h("div",{class:"pform"},cur,nw),perr,h("div",{class:"row",style:"justify-content:flex-end"},saveP))));
  // sign out
  main.append(h("section",{class:"sec"},h("div",{class:"card",style:"padding:2px 16px"},row("Sign out","Your data stays safe in your account. Sign in again any time.",h("button",{class:"chip",style:"white-space:nowrap",text:"Sign out",onclick:()=>{fbAuth.signOut();toast("Signed out");}})))));
  // danger zone
  const owned=[...Shared.lists.values()].filter(l=>l.owner===u.uid).map(l=>l.name);
  main.append(h("section",{class:"sec"},h("div",{class:"sec-h"},h("h2",{style:"color:var(--danger)",text:"Delete account"})),h("div",{class:"card dz"},
    h("p",{style:"margin:0 0 8px",text:"Permanently deletes your account and everything synced to it: tasks, habits, notes, journal, money, links and more. This can't be undone."}),
    owned.length?h("p",{class:"small",style:"margin:0 0 8px;color:var(--danger)",text:"Shared lists you own will be deleted for everyone: "+owned.join(", ")+"."}):null,
    h("p",{class:"small muted",style:"margin:0 0 12px",text:"You'll also be removed from lists other people own. Want a copy first? Download a backup from More, then Backup."}),
    h("button",{class:"btn dzbtn",text:"Delete my account…",onclick:openDeleteAccount}))));
}
function openDeleteAccount(){
  const pw=h("input",{class:"inp",type:"password",autocomplete:"current-password",placeholder:"Your password","aria-label":"Your password"});
  const conf=h("input",{class:"inp",autocomplete:"off",autocapitalize:"characters",placeholder:"Type DELETE","aria-label":"Type DELETE to confirm"});
  const err=h("div",{class:"small",role:"alert",style:"color:var(--danger);min-height:18px;margin-top:8px"});
  const go=h("button",{class:"btn primary",style:"background:var(--danger)",text:"Delete forever",disabled:true});
  conf.addEventListener("input",()=>{go.disabled=conf.value.trim().toUpperCase()!=="DELETE";});
  const close=openSheet([h("h3",{text:"Delete your account?"}),h("p",{class:"muted",style:"margin:0 0 12px",text:"Everything in your account is erased for good. Enter your password and type DELETE to confirm."}),
    h("div",{class:"field"},h("label",{text:"Password"}),pw),h("div",{class:"field"},h("label",{text:"Type DELETE"}),conf),err,
    h("div",{class:"actions"},h("button",{class:"btn ghost",text:"Cancel",onclick:()=>close()}),go)],{cls:"acct"});
  go.onclick=async()=>{err.textContent="";if(!pw.value){pw.focus();err.textContent="Enter your password.";return;}
    go.disabled=true;go.textContent="Deleting…";
    try{await deleteAccount(pw.value);}catch(e){console.error(e);err.textContent=e&&e.stage==="login"?"Your data was deleted, but the login couldn't be removed. Sign in and try again.":acctMsg(e);go.textContent="Delete forever";go.disabled=false;}};
  setTimeout(()=>pw.focus(),60);
}
async function deleteAccount(pw){
  const u=Store.user,uid=u.uid,FV=firebase.firestore.FieldValue;
  await reauth(pw); // proves it's you before anything is touched
  const lists=[...Shared.lists.values()].map(L=>({L,items:itemsOf(L.id)}));
  const base=fbDb.collection("users").doc(uid);
  Store.stop();
  for(const {L,items} of lists){const ref=fbDb.collection("shared").doc(L.id);
    if(L.owner===uid){for(const it of items)await ref.collection("items").doc(it.id).delete();await ref.delete();}
    else await ref.update({members:FV.arrayRemove(uid),["memberInfo."+uid]:FV.delete()});}
  for(const c of COLS){const snap=await base.collection(c).get();const refs=snap.docs.map(d=>d.ref);
    for(let i=0;i<refs.length;i+=400){const b=fbDb.batch();refs.slice(i,i+400).forEach(r=>b.delete(r));await b.commit();}}
  const files=await base.collection("files").get();
  for(const d of files.docs){const m=d.data(),b=fbDb.batch();for(let i=0;i<(m.parts||1);i++)b.delete(d.ref.collection("parts").doc(String(i)));b.delete(d.ref);await b.commit();}
  await base.delete();
  try{await u.delete();}catch(e){e.stage="login";throw e;}
  try{Object.keys(localStorage).filter(k=>k.startsWith("planner.")).forEach(k=>localStorage.removeItem(k));}catch(e){}
  try{sessionStorage.setItem("planner.deleted","1");}catch(e){}
  try{await fbDb.terminate();await fbDb.clearPersistence();}catch(e){}
  location.reload();
}

/* ================= more tab ================= */
const PAGES={insights:["📈","Insights","Charts of your progress"],review:["📊","Weekly review","See how the week went"],goals:["🎯","Goals","Track big things"],countdowns:["🎉","Countdowns","Days until what matters"],templates:["📋","Templates","Reusable checklists"],
  shopping:["🛒","Shopping","Your shopping lists"],shared:["👨‍👩‍👧","Shared lists","Lists with family, live"],guide:["📖","Guide","Shortcuts, gestures and tips"],backup:["💾","Backup","Download or restore"],settings:["⚙️","Settings","Lock, calendar, reminders"],profile:["👤","Profile","Your account, name and password"]};
const MENU=[["Tools",["focus","insights","review","goals","countdowns","templates"]],["Lists",["shopping","shared"]],["App",["profile","guide","backup","settings"]]];
function renderMore(main){
  if(UI.page&&PAGES[UI.page]){
    const [e,t]=PAGES[UI.page];setHeader(t,"");
    if(!(UI.page==="shared"&&UI.sharedList&&Shared.lists.has(UI.sharedList)))main.append(h("div",{style:"margin-top:14px"},h("button",{class:"back",text:"‹ More",onclick:()=>{UI.page=null;render();window.scrollTo(0,0);}})));
    const box=h("div",{class:["goals","review","insights","countdowns","templates","shared"].includes(UI.page)?"":"narrow"});main.append(box);
    ({insights:renderInsights,countdowns:renderCountdowns,templates:renderTemplates,shared:renderShared,guide:renderGuide,goals:renderGoals,shopping:renderShopping,review:renderReview,backup:renderBackup,settings:renderSettings,profile:renderProfile})[UI.page](box);return;
  }
  setHeader("More","Everything else in one place");
  const open=k=>{if(k==="focus"){openFocus();return;}UI.page=k;render();window.scrollTo(0,0);};
  const item=(k,e,t,s,fn)=>h("button",{class:"mi",onclick:fn||(()=>open(k))},h("span",{class:"e",text:e}),h("b",{text:t}),h("span",{text:s}));
  {const hidden=NAV_CHOICES.filter(c=>!navLayout(UI.desktop?"desk":"phone").includes(c[0]));
    const SEC={plan:["🗓️","Your tasks and calendar"],habits:["🔥","Daily habits and streaks"],notes:["📝","Notes and journal"],money:["💰","Spending and budget"],links:["🔗","Your saved websites"]};
    if(hidden.length)main.append(h("div",{class:"sgroup",style:"margin:20px 2px 8px",text:"Sections"}),h("div",{class:"menu"},hidden.map(([id,nm])=>item(id,SEC[id][0],nm,SEC[id][1],()=>goTab(id)))));}
  MENU.forEach(([g,keys])=>{main.append(h("div",{class:"sgroup",style:"margin:20px 2px 8px",text:g}),h("div",{class:"menu"},keys.map(k=>k==="focus"?item("focus","⏱️","Focus timer",focusState()?"Session running":"Pomodoro-style focus"):item(k,...PAGES[k]))));});
}

/* ================= search ================= */
function openSearch(){
  const q=h("input",{class:"inp",type:"search",placeholder:"Search everything…","aria-label":"Search"});
  const res=h("div",{class:"sres"});
  const close=openSheet([h("div",{class:"shead"},h("h3",{text:"Search"}),h("button",{class:"x","aria-label":"Close",text:"×",onclick:()=>close()})),q,res],{full:true});
  const go=(fn)=>()=>{close();fn();};
  const run=debounce(()=>{
    const s=q.value.trim().toLowerCase();res.textContent="";if(s.length<2){res.append(h("p",{class:"small muted",text:"Type at least 2 letters. Searches tasks, checklists, notes, journal, habits, goals, shopping, links and spending."}));return;}
    const has=(...f)=>f.some(x=>x&&String(x).toLowerCase().includes(s));
    const groups=[
      ["Tasks",vals("tasks").filter(t=>has(t.title,t.notes,...(t.subtasks||[]).map(x=>x.text))).sort((a,b)=>(a.done?1:0)-(b.done?1:0)),t=>[t.title+(t.done?" ✓":""),t.date?relLabel(t.date):"No date",go(()=>openTask(t))]],
      ["Notes",vals("notes").filter(n=>n.type!=="journal"&&has(n.title,n.body)),n=>[n.title||"Untitled",(noteFolderOf(n)?"📁 "+folderLabel(noteFolderOf(n))+" · ":"")+snippet(n.body,70),go(()=>{UI.tab="notes";UI.notesSeg="notes";render();openNote(n);})]],
      ["Journal",vals("notes").filter(n=>n.type==="journal"&&has(n.body)),n=>[longDate(n.date),snippet(n.body,70),go(()=>{UI.tab="notes";UI.notesSeg="journal";render();openJournal(n.date);})]],
      ["Habits",vals("habits").filter(x=>has(x.name)),x=>[x.emoji+" "+x.name,"Habit",go(()=>{UI.tab="habits";render();openHabit(x);})]],
      ["Goals",vals("goals").filter(g=>has(g.title,g.why)),g=>["🎯 "+g.title,goalProgress(g).text,go(()=>openGoal(g))]],
      ["Shopping",vals("shop").filter(i=>has(i.name)),i=>[i.name+(i.done?" ✓":""),(SET.shopLists.find(l=>l.id===i.listId)||{name:"List"}).name,go(()=>{UI.tab="more";UI.page="shopping";UI.shopList=i.listId;render();})]],
      ["Countdowns",vals("countdowns").filter(c=>has(c.title)),c=>[(c.emoji||"🎉")+" "+c.title,cdLabel(daysUntil(cdNext(c))),go(()=>openCountdown(c))]],
      ["Templates",vals("templates").filter(t=>has(t.name,...(t.items||[]))),t=>[(t.emoji||"📋")+" "+t.name,plural(t.items.length,"item"),go(()=>openTemplate(t))]],
      ["Links",vals("links").filter(l=>has(l.name,l.url,l.note)),l=>[l.name,domainOf(l.url),go(()=>{window.open(l.url,"_blank","noopener");visit(l);})]],
      ["Money",vals("expenses").filter(x=>has(x.note,catById(x.catId).name)),x=>[(x.note||catById(x.catId).name)+", "+money(x.amount),relLabel(x.date),go(()=>openExpense(x))]]];
    let any=false;
    groups.forEach(([g,items,fmt])=>{if(!items.length)return;any=true;res.append(h("div",{class:"sgroup",text:g+" ("+items.length+")"}));items.slice(0,8).forEach(it=>{const [a,b,fn]=fmt(it);res.append(h("button",{onclick:fn},h("b",{text:a}),h("span",{text:b})));});});
    if(!any)res.append(h("p",{class:"muted",text:"Nothing found for “"+q.value.trim()+"”."}));
  },120);
  q.addEventListener("input",run);run();setTimeout(()=>q.focus(),80);
}
