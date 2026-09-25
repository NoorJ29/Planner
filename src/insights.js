/* ================= insights ================= */
function svgBars(vals_,labels,opts){
  opts=opts||{};const W=320,H=opts.h||120,pb=18,pt=14,n=vals_.length,max=Math.max(...vals_,opts.min||1);
  const bw=W/n,gap=Math.min(6,bw*.25);let bars="",lbl="";const every=Math.ceil(n/(opts.maxLabels||8));
  vals_.forEach((v,i)=>{const bh=v?Math.max(2,(H-pb-pt)*v/max):0,x=i*bw+gap/2,y=H-pb-bh;
    bars+=`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw-gap).toFixed(1)}" height="${bh.toFixed(1)}" rx="3" class="${opts.hi===i?"hi":""}"><title>${esc((opts.titles||labels)[i])}: ${esc(opts.fmt?opts.fmt(v):v)}</title></rect>`;
    if(i%every===0||i===n-1)lbl+=`<text x="${(x+(bw-gap)/2).toFixed(1)}" y="${H-4}" text-anchor="middle">${esc(labels[i])}</text>`;});
  const el=h("div",{class:"chart"});el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(opts.label||"Chart")}"><line x1="0" x2="${W}" y1="${H-pb}" y2="${H-pb}" class="axis"/>${bars}${lbl}</svg>`;return el;
}
function svgLine(points,labels,opts){
  opts=opts||{};const W=320,H=120,pb=18,pt=12,n=points.length,lo=opts.lo??1,hi=opts.hi??5;
  const xy=points.map((v,i)=>v==null?null:[n<2?W/2:i*(W-12)/(n-1)+6,pt+(H-pb-pt)*(1-(v-lo)/(hi-lo))]);
  let path="",started=false;xy.forEach(p=>{if(!p){started=false;return;}path+=(started?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)+" ";started=true;});
  const dots=xy.map((p,i)=>p?`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3"><title>${esc((opts.titles||labels)[i])}: ${esc(opts.fmt?opts.fmt(points[i]):points[i])}</title></circle>`:"").join("");
  const every=Math.ceil(n/8);const lbl=labels.map((l,i)=>i%every===0||i===n-1?`<text x="${(n<2?W/2:i*(W-12)/(n-1)+6).toFixed(1)}" y="${H-4}" text-anchor="middle">${esc(l)}</text>`:"").join("");
  const el=h("div",{class:"chart line"});el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(opts.label||"Chart")}"><line x1="0" x2="${W}" y1="${H-pb}" y2="${H-pb}" class="axis"/><path d="${path}"/>${dots}${lbl}</svg>`;return el;
}
function hbars(rows,fmt){return h("div",{class:"hbars"},rows.map(([label,v,max,color])=>h("div",{class:"hbar"},h("span",{class:"hl",text:label}),h("span",{class:"hv",text:fmt?fmt(v):v}),h("div",{class:"progress"},h("b",{style:"width:"+Math.round(Math.min(1,max?v/max:0)*100)+"%"+(color?";background:"+color:"")})))));}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);}
function insightRange(){
  const p=UI.insPeriod||"30",t=new Date();
  if(p==="year"){const months=[];for(let i=11;i>=0;i--){const d=new Date(t.getFullYear(),t.getMonth()-i,1);months.push({k:d.getFullYear()+"-"+pad(d.getMonth()+1),label:d.toLocaleDateString(undefined,{month:"narrow"}),full:d.toLocaleDateString(undefined,{month:"long",year:"numeric"})});}return{kind:"month",buckets:months,start:months[0].k+"-01",end:todayKey()};}
  const n=Number(p),days=[];for(let i=n-1;i>=0;i--){const d=addDays(t,-i);days.push({k:key(d),label:n<=7?d.toLocaleDateString(undefined,{weekday:"narrow"}):String(d.getDate()),full:d.toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short"})});}
  return{kind:"day",buckets:days,start:days[0].k,end:days[days.length-1].k};
}
function renderInsights(main){
  const R=insightRange(),bk=k=>R.kind==="month"?k.slice(0,7):k,idx={};R.buckets.forEach((b,i)=>idx[b.k]=i);
  const inR=k=>k&&k>=R.start&&k<=R.end;const zero=()=>R.buckets.map(()=>0);
  main.append(h("div",{class:"row",style:"margin-top:16px;justify-content:space-between"},seg([["7","7 days"],["30","30 days"],["year","12 months"]],UI.insPeriod||"30",v=>{UI.insPeriod=v;render();})));
  // tasks
  const done=zero(),wd=[0,0,0,0,0,0,0];let doneN=0;
  for(const t of D.tasks.values()){if(!t.done||!t.doneAt)continue;const k=key(new Date(t.doneAt));if(!inR(k))continue;const i=idx[bk(k)];if(i!=null){done[i]++;doneN++;wd[(new Date(t.doneAt).getDay()+6)%7]++;}}
  const openLate=vals("tasks").filter(t=>!t.done&&t.date&&inR(t.date)&&t.date<todayKey()).length;
  // focus
  const foc=zero();let focN=0;for(const f of D.focus.values()){if(!inR(f.date))continue;const i=idx[bk(f.date)];if(i!=null){foc[i]+=f.minutes||0;focN+=f.minutes||0;}}
  // money
  const spend=zero();let spent=0;const byCat={};for(const x of D.expenses.values()){if(x.type==="income"||!inR(x.date))continue;const i=idx[bk(x.date)];if(i!=null){const a=Number(x.amount)||0;spend[i]+=a;spent+=a;byCat[x.catId]=(byCat[x.catId]||0)+a;}}
  // mood
  const moodSum=zero(),moodN=zero();let mAll=0,mCnt=0;for(const n of D.notes.values()){if(n.type!=="journal"||!n.mood||!inR(n.date))continue;const i=idx[bk(n.date)];if(i!=null){moodSum[i]+=+n.mood;moodN[i]++;mAll+=+n.mood;mCnt++;}}
  const mood=moodSum.map((s,i)=>moodN[i]?s/moodN[i]:null);
  // habits
  const hrows=vals("habits").filter(x=>!x.archived).map(hb=>{let due=0,hit=0;const start=habitStart(hb);let d=fromKey(R.start<start?start:R.start);const end=todayKey();for(let g=0;g<400&&key(d)<=end;g++){const k=key(d);if(habitDue(hb,d)){due++;if(hb.log&&hb.log[k])hit++;}d=addDays(d,1);}return[hb.emoji+" "+hb.name,due?hit/due:0,1,hb.color];}).sort((a,b)=>b[1]-a[1]);
  const best=hrows[0];
  const pct=v=>Math.round(v*100)+"%";
  main.append(h("div",{class:"stats two sec"},
    h("div",{class:"stat"},h("b",{text:doneN}),h("span",{text:"Tasks done"})),
    h("div",{class:"stat"},h("b",{text:hmins(focN)}),h("span",{text:"Focus time"})),
    h("div",{class:"stat"},h("b",{text:money(spent)}),h("span",{text:"Spent"})),
    h("div",{class:"stat"},h("b",{text:mCnt?(MOODS[Math.round(mAll/mCnt)-1]||[])[1]+" "+(mAll/mCnt).toFixed(1):"–"}),h("span",{text:"Average mood"})),
    h("div",{class:"stat"},h("b",{text:best?pct(best[1]):"–"}),h("span",{text:best?"Best habit: "+best[0].replace(/^\S+\s/,""):"Habits kept"})),
    h("div",{class:"stat"},h("b",{text:openLate}),h("span",{text:"Overdue in this period"}))));
  const labels=R.buckets.map(b=>b.label),full=R.buckets.map(b=>b.full);
  const card=(title,sub,body)=>h("section",{class:"sec"},h("div",{class:"sec-h"},h("h2",{text:title}),sub?h("span",{class:"n",text:sub}):null),h("div",{class:"card"},body));
  const grid=h("div",{class:"insgrid"});
  const busiest=wd.indexOf(Math.max(...wd));const wdl=Array.from({length:7},(_,i)=>new Date(2024,0,1+i).toLocaleDateString(undefined,{weekday:"short"}));
  grid.append(card("Tasks completed",doneN?plural(doneN,"task"):"",doneN?svgBars(done,labels,{titles:full,fmt:v=>plural(v,"task"),label:"Tasks completed"}):h("p",{class:"muted small",text:"Tick off some tasks and they'll show up here."})));
  grid.append(card("Your most productive days",doneN?"Busiest: "+wdl[busiest]:"",doneN?svgBars(wd,wdl,{hi:busiest,fmt:v=>plural(v,"task"),label:"Tasks by weekday"}):h("p",{class:"muted small",text:"Not enough data yet."})));
  grid.append(card("Focus time",focN?hmins(focN)+" total":"",focN?svgBars(foc,labels,{titles:full,fmt:hmins,label:"Focus minutes"}):h("p",{class:"muted small",text:"Use the focus timer and your sessions appear here."})));
  grid.append(card("Spending",spent?money(spent):"",spent?h("div",null,svgBars(spend,labels,{titles:full,fmt:money,label:"Spending"}),h("div",{style:"margin-top:14px"},hbars(Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([c,v])=>[catById(c).emoji+" "+catById(c).name,v,Math.max(...Object.values(byCat))]),money))):h("p",{class:"muted small",text:"No spending logged in this period."})));
  grid.append(card("Habit consistency","",hrows.length?hbars(hrows,pct):h("p",{class:"muted small",text:"Add habits to see how consistent you are."})));
  grid.append(card("Mood from your journal",mCnt?plural(mCnt,"entry").replace("entrys","entries"):"",mCnt?svgLine(mood,labels,{titles:full,fmt:v=>v==null?"":(MOODS[Math.round(v)-1]||[])[2]+" ("+v.toFixed(1)+")",label:"Mood"}):h("p",{class:"muted small",text:"Pick a mood in your journal entries to see trends."})));
  main.append(grid);
}
