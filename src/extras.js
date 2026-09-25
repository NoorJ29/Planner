/* ================= subscriptions & bills ================= */
const CYCLES=[["weekly","Weekly"],["monthly","Monthly"],["quarterly","Every 3 months"],["yearly","Yearly"]];
const CYCLE_SHORT={weekly:"/wk",monthly:"/mo",quarterly:"/qtr",yearly:"/yr"};
function subAdvance(k,cycle,day){
  const d=fromKey(k);if(cycle==="weekly")return key(addDays(d,7));
  const m=cycle==="yearly"?12:cycle==="quarterly"?3:1;const y=new Date(d.getFullYear(),d.getMonth()+m,1);
  y.setDate(Math.min(day||d.getDate(),new Date(y.getFullYear(),y.getMonth()+1,0).getDate()));return key(y);
}
function subMonthly(s){const a=Number(s.amount)||0;return s.cycle==="weekly"?a*52/12:s.cycle==="quarterly"?a/3:s.cycle==="yearly"?a/12:a;}
const processSubs=debounce(()=>{
  if(!UI.ready)return;const tk=todayKey();
  for(const s of vals("subs")){
    if(!s.autoLog||!s.nextDate||s.nextDate>tk||s.paused)continue;
    let n=s.nextDate,guard=0;
    while(n<=tk&&guard++<36){const id="sub-"+s.id+"-"+n;if(!D.expenses.has(id))Store.put("expenses",{id,amount:Number(s.amount)||0,type:"expense",catId:s.catId||"bills",note:s.name,date:n,createdAt:Date.now(),subId:s.id});n=subAdvance(n,s.cycle,s.day);}
    Store.put("subs",Object.assign(clone(s),{nextDate:n}));
  }
},1500);
function renderSubs(main){
  const subs=vals("subs").sort((a,b)=>(a.nextDate||"9")<(b.nextDate||"9")?-1:1);
  const monthly=subs.filter(s=>!s.paused).reduce((a,s)=>a+subMonthly(s),0);
  const soon=key(addDays(new Date(),7));
  const box=h("section",{class:"sec"},h("div",{class:"sec-h"},h("h2",{text:"Subscriptions & bills"}),h("span",{class:"n",text:subs.length?"≈ "+money(monthly)+" a month":""})));
  if(!subs.length)box.append(h("div",{class:"empty"},h("p",{style:"margin:0 0 10px",text:"Track rent, phone, streaming and other regular payments. They're logged automatically on their due date."}),h("button",{class:"btn ghost",text:"+ Add a subscription or bill",onclick:()=>openSub(null)})));
  else{box.append(h("div",{class:"box"},subs.map(s=>h("button",{class:"txn",onclick:()=>openSub(s)},h("span",{class:"em",text:s.emoji||"🔁"}),
      h("span",{class:"mid"},h("b",{text:s.name+(s.paused?" (paused)":"")}),h("span",{class:"small "+(s.nextDate<=soon&&!s.paused?"due":"muted"),text:s.paused?"Paused":"Next: "+relLabel(s.nextDate)+(s.autoLog?"":", not auto-logged")})),
      h("span",{class:"amt",text:money(s.amount)+CYCLE_SHORT[s.cycle]})))),
      h("button",{class:"linkbtn",text:"+ Add a subscription or bill",onclick:()=>openSub(null)}));}
  main.append(box);
}
function openSub(x){
  const isNew=!x;const d=clone(x||{id:uid(),name:"",amount:0,cycle:"monthly",nextDate:todayKey(),catId:"bills",emoji:"🔁",autoLog:true,remind:"1",paused:false,createdAt:Date.now()});
  const name=h("input",{class:"inp title",value:d.name,placeholder:"e.g. Netflix, Rent, Phone","aria-label":"Name"});
  const amt=h("input",{class:"inp",inputmode:"decimal",value:d.amount||"",placeholder:"Amount","aria-label":"Amount"});
  const next=h("input",{class:"inp",type:"date",value:d.nextDate,"aria-label":"Next payment"});
  const emo=h("select",{class:"inp emsel","aria-label":"Icon"},["🔁","🏠","📱","📺","🎵","💡","🚗","🛡️","☁️","🏋️","📰","🎮","💳","🌐"].map(e=>h("option",{value:e,selected:e===d.emoji},e)));
  const rem=h("select",{class:"inp","aria-label":"Reminder"},[["","No reminder"],["0","On the day"],["1","1 day before"],["3","3 days before"],["7","1 week before"]].map(([v,l])=>h("option",{value:v,selected:String(d.remind??"")===v},l)));
  const auto=h("input",{type:"checkbox",checked:!!d.autoLog,"aria-label":"Log automatically"});
  const save=h("button",{class:"btn primary",text:isNew?"Add":"Save"}),cancel=h("button",{class:"btn ghost",text:"Cancel"}),del=isNew?null:h("button",{class:"btn danger",text:"Delete"});
  const pause=isNew?null:h("button",{type:"button",class:"chip","aria-pressed":String(!!d.paused),text:d.paused?"Paused":"Pause",onclick:()=>{d.paused=!d.paused;pause.textContent=d.paused?"Paused":"Pause";pause.setAttribute("aria-pressed",String(d.paused));}});
  const close=openSheet([h("h3",{text:isNew?"New subscription or bill":"Edit"}),h("div",{class:"listrow"},emo,name),
    h("div",{class:"field"},h("label",{text:"Amount and how often"}),h("div",{class:"row"},amt),h("div",{style:"margin-top:8px"},chips(CYCLES,d.cycle,v=>{d.cycle=v;}))),
    h("div",{class:"field"},h("label",{text:"Next payment date"}),next),
    h("div",{class:"field"},h("span",{class:"lbl",text:"Category"}),chips(SET.categories.map(c=>[c.id,c.emoji+" "+c.name]),d.catId,v=>{d.catId=v;})),
    h("div",{class:"field"},h("label",{class:"row",style:"gap:10px;cursor:pointer"},auto,h("span",{text:"Log it as an expense automatically on the due date"}))),
    h("div",{class:"field"},h("label",{text:"Reminder"}),rem),pause?h("div",{class:"field"},pause):null,
    h("div",{class:"actions"},del,cancel,save)]);
  cancel.onclick=close;
  if(del)del.onclick=()=>{const prev=snap("subs",d.id);Store.del("subs",d.id);close();undoable("Deleted",[["subs",prev,d.id]]);};
  save.onclick=()=>{const v=parseFloat(amt.value.replace(",","."));d.name=name.value.trim();if(!d.name){name.focus();toast("Give it a name.");return;}if(!(v>0)){amt.focus();toast("Enter an amount above zero.");return;}
    Object.assign(d,{amount:Math.round(v*100)/100,nextDate:next.value||todayKey(),day:fromKey(next.value||todayKey()).getDate(),emoji:emo.value,remind:rem.value,autoLog:auto.checked});
    if(!SET.currency&&!SET.currencySymbol)setTimeout(openCurrencyPicker,300);
    Store.put("subs",d);close();};
  if(isNew)setTimeout(()=>name.focus(),60);
}

/* ================= countdowns ================= */
function cdNext(c){if(!c.yearly)return c.date;const t=todayKey(),d=fromKey(c.date);let y=new Date().getFullYear();let n=key(new Date(y,d.getMonth(),d.getDate()));if(n<t)n=key(new Date(y+1,d.getMonth(),d.getDate()));return n;}
function daysUntil(k){const a=fromKey(todayKey()),b=fromKey(k);return Math.round((b-a)/864e5);}
function cdLabel(n){return n===0?"Today!":n===1?"Tomorrow":n>0?n+" days":Math.abs(n)+" days ago";}
function countdownsSorted(){return vals("countdowns").map(c=>Object.assign({},c,{next:cdNext(c)})).map(c=>Object.assign(c,{days:daysUntil(c.next)})).sort((a,b)=>a.days-b.days);}
function cdCard(c,compact){
  const years=c.yearly&&c.showAge?fromKey(c.next).getFullYear()-fromKey(c.date).getFullYear():null;
  return h("button",{class:"cdcard"+(compact?" compact":""),style:"--c:"+(c.color||COLORS[0]),onclick:()=>openCountdown(c)},
    h("span",{class:"cde",text:c.emoji||"🎉"}),
    h("span",{class:"cdm"},h("b",{text:c.title}),h("span",{text:fromKey(c.next).toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short",year:fromKey(c.next).getFullYear()===new Date().getFullYear()?undefined:"numeric"})+(years?", turns "+years:"")+(c.yearly?" ↻":"")})),
    h("span",{class:"cdn"},h("b",{text:c.days===0?"🎉":String(Math.abs(c.days))}),h("span",{text:c.days===0?"Today":c.days<0?"days ago":c.days===1?"day":"days"})));
}
function renderCountdowns(main){
  const all=countdownsSorted(),up=all.filter(c=>c.days>=0),past=all.filter(c=>c.days<0);
  main.append(h("div",{class:"btnrow"},h("button",{class:"btn primary wide",text:"+ New countdown",onclick:()=>openCountdown(null)})));
  if(!all.length){main.append(h("div",{class:"sec"},h("div",{class:"empty",text:"Count down to birthdays, holidays, exams and trips. Birthdays can repeat every year."})));return;}
  if(up.length)main.append(h("div",{class:"cards grid sec"},up.map(c=>cdCard(c))));
  if(past.length)main.append(h("section",{class:"sec"},h("div",{class:"sec-h"},h("h2",{text:"Past"})),h("div",{class:"cards grid"},past.map(c=>cdCard(c)))));
}
function openCountdown(c){
  const isNew=!c;const d=clone(c?(D.countdowns.get(c.id)||c):{id:uid(),title:"",date:key(addDays(new Date(),30)),emoji:"🎉",color:COLORS[vals("countdowns").length%COLORS.length],yearly:false,showAge:false,createdAt:Date.now()});
  delete d.next;delete d.days;
  const title=h("input",{class:"inp title",value:d.title,placeholder:"e.g. Mum's birthday, Holiday in Lisbon","aria-label":"Title"});
  const date=h("input",{class:"inp",type:"date",value:d.date,"aria-label":"Date"});
  const emo=h("div",{class:"emojis"});const drawE=()=>{emo.textContent="";["🎉","🎂","✈️","🎓","💍","🎄","🏖️","📚","💼","🏃","❤️","👶","🎁","🎤","⚽","🏠"].forEach(e=>emo.append(h("button",{type:"button","aria-pressed":String(e===d.emoji),text:e,onclick:()=>{d.emoji=e;drawE();}})));};drawE();
  const yearly=h("input",{type:"checkbox",checked:!!d.yearly}),age=h("input",{type:"checkbox",checked:!!d.showAge});
  const ageRow=h("label",{class:"row",style:"gap:10px;margin-top:8px;cursor:pointer"},age,h("span",{text:"Show the age they're turning (use their birth date)"}));
  const sync=()=>{ageRow.hidden=!yearly.checked;};yearly.addEventListener("change",sync);
  const save=h("button",{class:"btn primary",text:isNew?"Add":"Save"}),cancel=h("button",{class:"btn ghost",text:"Cancel"}),del=isNew?null:h("button",{class:"btn danger",text:"Delete"});
  const close=openSheet([h("h3",{text:isNew?"New countdown":"Edit countdown"}),title,h("div",{class:"field"},h("label",{text:"Date"}),date),
    h("div",{class:"field"},h("label",{class:"row",style:"gap:10px;cursor:pointer"},yearly,h("span",{text:"Repeats every year (birthdays, anniversaries)"})),ageRow),
    h("div",{class:"field"},h("span",{class:"lbl",text:"Icon"}),emo),h("div",{class:"actions"},del,cancel,save)]);
  sync();cancel.onclick=close;
  if(del)del.onclick=()=>{const prev=snap("countdowns",d.id);Store.del("countdowns",d.id);close();undoable("Countdown deleted",[["countdowns",prev,d.id]]);};
  save.onclick=()=>{d.title=title.value.trim();if(!d.title){title.focus();toast("Give it a name.");return;}Object.assign(d,{date:date.value||todayKey(),yearly:yearly.checked,showAge:yearly.checked&&age.checked});Store.put("countdowns",d);close();};
  if(isNew)setTimeout(()=>title.focus(),60);
}

/* ================= templates ================= */
const TEMPLATE_IDEAS=[["Packing list","🧳","task",["Passport","Phone charger","Toiletries","Clothes","Medication","Headphones"]],["Morning routine","🌅","task",["Glass of water","Stretch 5 minutes","Plan the day","Check calendar"]],["Weekly groceries","🛒","shopping",["Milk","Bread","Eggs","Fruit","Vegetables","Coffee"]]];
function renderTemplates(main){
  const ts=vals("templates").sort((a,b)=>(a.name||"").localeCompare(b.name||""));
  main.append(h("div",{class:"btnrow"},h("button",{class:"btn primary wide",text:"+ New template",onclick:()=>openTemplate(null)})));
  if(!ts.length){main.append(h("div",{class:"sec"},h("div",{class:"empty"},h("p",{style:"margin:0 0 12px",text:"Save checklists you reuse, then add them in one tap. Start with one of these:"}),
    h("div",{class:"row",style:"justify-content:center"},TEMPLATE_IDEAS.map(([n,e,k,items])=>h("button",{class:"chip",text:e+" "+n,onclick:()=>{Store.put("templates",{id:uid(),name:n,emoji:e,kind:k,items,createdAt:Date.now()});toast("Template added");}}))))));return;}
  main.append(h("div",{class:"cards grid sec"},ts.map(t=>h("div",{class:"card tplcard"},
    h("button",{class:"hname",onclick:()=>openTemplate(t)},h("b",{text:(t.emoji||"📋")+" "+t.name}),h("span",{text:(t.kind==="shopping"?"Shopping list, ":"Task checklist, ")+plural(t.items.length,"item")})),
    h("p",{class:"small muted",style:"margin:8px 0 12px",text:t.items.slice(0,5).join(", ")+(t.items.length>5?"…":"")}),
    h("button",{class:"btn primary",text:t.kind==="shopping"?"Add to shopping list":"Use as a task",onclick:()=>useTemplate(t)})))));
}
function useTemplate(t){
  if(t.kind==="shopping"){
    const L=SET.shopLists.find(l=>l.id===UI.shopList)||SET.shopLists[0];const have=new Set(vals("shop").filter(i=>i.listId===L.id&&!i.done).map(i=>i.name.toLowerCase()));const now=Date.now();
    const ch=[];t.items.forEach((txt,i)=>{const p=parseItem(txt);if(have.has(p.name.toLowerCase()))return;const it={id:uid(),listId:L.id,name:p.name,qty:p.qty,done:false,createdAt:now+i};Store.put("shop",it);ch.push(["shop",null,it.id]);});
    undoable("Added "+plural(ch.length,"item")+" to "+L.name,ch);return;
  }
  openTask(null,{title:t.name,subtasks:t.items.map(x=>({id:uid(),text:x,done:false})),date:todayKey()});
}
function openTemplate(t){
  const isNew=!t;const d=clone(t||{id:uid(),name:"",emoji:"📋",kind:"task",items:[],createdAt:Date.now()});
  const name=h("input",{class:"inp title",value:d.name,placeholder:"e.g. Packing list","aria-label":"Template name"});
  const emo=h("select",{class:"inp emsel","aria-label":"Icon"},["📋","🧳","🌅","🛒","🧹","🏋️","📚","💼","🎉","🍳","🧺","🚗"].map(e=>h("option",{value:e,selected:e===d.emoji},e)));
  const items=h("textarea",{class:"inp",style:"min-height:150px",placeholder:"One item per line","aria-label":"Items"});items.value=d.items.join("\n");
  const save=h("button",{class:"btn primary",text:isNew?"Save template":"Save"}),cancel=h("button",{class:"btn ghost",text:"Cancel"}),del=isNew?null:h("button",{class:"btn danger",text:"Delete"});
  const close=openSheet([h("h3",{text:isNew?"New template":"Edit template"}),h("div",{class:"listrow"},emo,name),
    h("div",{class:"field"},h("span",{class:"lbl",text:"Use it for"}),seg([["task","A task with a checklist"],["shopping","A shopping list"]],d.kind,v=>{d.kind=v;})),
    h("div",{class:"field"},h("label",{text:"Items"}),items),h("div",{class:"actions"},del,cancel,save)]);
  cancel.onclick=close;
  if(del)del.onclick=()=>{const prev=snap("templates",d.id);Store.del("templates",d.id);close();undoable("Template deleted",[["templates",prev,d.id]]);};
  save.onclick=()=>{d.name=name.value.trim();d.items=items.value.split("\n").map(x=>x.trim()).filter(Boolean);if(!d.name){name.focus();toast("Name the template.");return;}if(!d.items.length){items.focus();toast("Add at least one item.");return;}d.emoji=emo.value;Store.put("templates",d);close();};
  if(isNew)setTimeout(()=>name.focus(),60);
}
