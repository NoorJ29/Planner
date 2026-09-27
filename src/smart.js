/* ================= smart quick add ================= */
const US_DATES=/^(en-US|en-PH|es-US)/i.test(navigator.language||"");
const MONTHS=["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
const WD_FULL={sunday:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6};
const WD_SHORT={sun:0,mon:1,tue:2,tues:2,wed:3,thu:4,thur:4,thurs:4,fri:5,sat:6};
function nextWd(idx,forceNext){const d=new Date();let diff=(idx-d.getDay()+7)%7;if(forceNext&&diff===0)diff=7;return key(addDays(d,diff));}
function nearestRemind(m){const o=[0,5,15,30,60,1440];return String(o.reduce((a,b)=>Math.abs(b-m)<Math.abs(a-m)?b:a));}
function validDate(y,m,d){const x=new Date(y,m,d);return x.getFullYear()===y&&x.getMonth()===m&&x.getDate()===d?x:null;}
function futureDate(m,d,y){const t=new Date();t.setHours(0,0,0,0);if(y!=null){if(y<100)y+=2000;return validDate(y,m,d);}let x=validDate(t.getFullYear(),m,d);if(x&&x<t)x=validDate(t.getFullYear()+1,m,d);return x;}
function parseQuick(input){
  let s=" "+String(input).replace(/\s+/g," ").trim()+" ";const o={};
  const take=(re,fn)=>{const m=s.match(re);if(!m)return false;const r=fn(...m);if(r===false)return false;s=s.slice(0,m.index)+" "+s.slice(m.index+m[0].length);return true;};
  // priority
  take(/\s(!!|!2|p1)(?=\s)/i,()=>{o.priority=2;})||take(/\s(!|!1|p2)(?=\s)/i,()=>{o.priority=1;});
  // list
  take(/\s#([\p{L}\p{N}_-]+)(?=\s)/iu,(m,tag)=>{const t=tag.toLowerCase();const l=SET.lists.find(x=>x.name.toLowerCase().replace(/\s+/g,"")===t)||SET.lists.find(x=>x.name.toLowerCase().startsWith(t));if(!l)return false;o.listId=l.id;});
  // repeat
  take(/\s(every\s?day|daily)(?=\s)/i,()=>{o.repeat="daily";})||
  take(/\s(every\s?weekday|weekdays)(?=\s)/i,()=>{o.repeat="weekdays";})||
  take(/\severy\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tues|tue|wed|thurs|thur|thu|fri|sat|sun)(?=\s)/i,(m,d)=>{const i=WD_FULL[d.toLowerCase()]??WD_SHORT[d.toLowerCase()];o.repeat="weekly";o.date=nextWd(i);})||
  take(/\s(every\s?week|weekly)(?=\s)/i,()=>{o.repeat="weekly";})||
  take(/\s(every\s?month|monthly)(?=\s)/i,()=>{o.repeat="monthly";})||
  take(/\s(every\s?year|yearly|annually)(?=\s)/i,()=>{o.repeat="yearly";});
  // reminder
  take(/\sremind(?:\s+me)?(?:\s+(\d+)\s*(m|min|mins|minutes?|h|hr|hrs|hours?|d|days?))?(?:\s+before)?(?=\s)/i,(m,n,u)=>{let mins=0;if(n){n=+n;u=u.toLowerCase();mins=u.startsWith("h")?n*60:u.startsWith("d")?n*1440:n;}o.remind=nearestRemind(mins);});
  // duration
  take(/\sfor\s+(\d+(?:\.\d+)?)\s*(m|min|mins|minutes?|h|hr|hrs|hours?)(?=\s)/i,(m,n,u)=>{const mins=u.toLowerCase().startsWith("h")?Math.round(parseFloat(n)*60):Math.round(parseFloat(n));o.duration=DURS.reduce((a,b)=>Math.abs(b-mins)<Math.abs(a-mins)?b:a);});
  // dates
  const setD=d=>{if(!d)return false;o.date=key(d);};
  if(!o.date){
    take(/\s(?:on\s+)?(\d{4})-(\d{2})-(\d{2})(?=\s)/,(m,y,mo,d)=>setD(validDate(+y,+mo-1,+d)))||
    take(/\s(?:on\s+|by\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?(?:\s+(\d{4}))?(?=\s)/i,(m,d,mo,y)=>setD(futureDate(MONTHS.indexOf(mo.slice(0,3).toLowerCase()),+d,y?+y:null)))||
    take(/\s(?:on\s+|by\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?(?=\s)/i,(m,mo,d,y)=>setD(futureDate(MONTHS.indexOf(mo.slice(0,3).toLowerCase()),+d,y?+y:null)))||
    take(/\s(?:on\s+|by\s+)?(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?(?=\s)/,(m,a,b,y)=>{const [mo,d]=US_DATES?[+a,+b]:[+b,+a];return setD(futureDate(mo-1,d,y?+y:null));})||
    take(/\s(?:the\s+)?day\s+after\s+tomorrow(?=\s)/i,()=>setD(addDays(new Date(),2)))||
    take(/\s(tomorrow|tmrw|tmr|tomorow)(?=\s)/i,()=>setD(addDays(new Date(),1)))||
    take(/\s(today|tdy)(?=\s)/i,()=>setD(new Date()))||
    take(/\sin\s+(\d+|a|an|one|two|three)\s+(days?|weeks?|months?)(?=\s)/i,(m,n,u)=>{n={a:1,an:1,one:1,two:2,three:3}[n.toLowerCase()]||+n;const d=new Date();if(/^d/i.test(u))return setD(addDays(d,n));if(/^w/i.test(u))return setD(addDays(d,7*n));return setD(new Date(d.getFullYear(),d.getMonth()+n,d.getDate()));})||
    take(/\snext\s+week(?=\s)/i,()=>setD(addDays(weekStart(new Date()),7)))||
    take(/\snext\s+month(?=\s)/i,()=>{const d=new Date();return setD(new Date(d.getFullYear(),d.getMonth()+1,1));})||
    take(/\s(?:this\s+)?weekend(?=\s)/i,()=>{o.date=nextWd(6);})||
    take(/\s(?:on\s+|by\s+|this\s+)?(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?=\s)/i,(m,nx,d)=>{o.date=nextWd(WD_FULL[d.toLowerCase()],!!nx);})||
    take(/\s(?:(on|by|next|this)\s+)(mon|tues|tue|wed|thurs|thur|thu|fri|sat|sun)(?=\s)/i,(m,pre,d)=>{o.date=nextWd(WD_SHORT[d.toLowerCase()],pre.toLowerCase()==="next");});
  }
  // times
  const setT=(hh,mm)=>{if(hh>23||mm>59)return false;o.time=pad(hh)+":"+pad(mm);};
  take(/\s(?:at\s+|@\s*)?(\d{1,2})(?::|\.)?(\d{2})?\s*(am|pm|a\.m\.|p\.m\.)(?=\s)/i,(m,hh,mm,ap)=>{hh=+hh;mm=+(mm||0);if(hh<1||hh>12)return false;const pm=/^p/i.test(ap);return setT(hh%12+(pm?12:0),mm);})||
  take(/\s(?:at\s+|@\s*)?([01]?\d|2[0-3]):([0-5]\d)(?=\s)/,(m,hh,mm)=>setT(+hh,+mm))||
  take(/\s(?:at|@)\s*(\d{1,2})(?=\s)/i,(m,hh)=>{hh=+hh;if(hh>23)return false;return setT(hh>=1&&hh<=7?hh+12:hh,0);})||
  take(/\s(?:at\s+)?(noon|midday)(?=\s)/i,()=>setT(12,0))||
  take(/\s(tonight)(?=\s)/i,()=>{setT(20,0);if(!o.date)o.date=todayKey();})||
  take(/\s(?:in\s+the\s+|this\s+)?(morning|afternoon|evening)(?=\s)/i,(m,w)=>{const t={morning:9,afternoon:14,evening:18}[w.toLowerCase()];return setT(t,0);});
  if((o.time||o.repeat)&&!o.date)o.date=todayKey();
  o.title=s.replace(/\s+/g," ").replace(/\s(on|at|by|due)\s*$/i,"").trim();
  return o;
}
function parseChips(p){
  const c=[];
  if(p.date)c.push("📅 "+relLabel(p.date));
  if(p.time)c.push("🕒 "+fmtTime(p.time)+(p.duration?" for "+durLabel(p.duration):""));
  else if(p.duration)c.push("⏳ "+durLabel(p.duration));
  if(p.listId){const l=listById(p.listId);if(l)c.push("# "+l.name);}
  if(p.priority)c.push(p.priority===2?"!! Urgent":"! Important");
  if(p.repeat)c.push("↻ "+REPEAT_LABEL[p.repeat]);
  if(p.remind!=null)c.push("🔔 "+REMINDS.find(r=>r[0]===p.remind)[1]);
  return c;
}
