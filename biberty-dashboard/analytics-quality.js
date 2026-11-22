'use strict';
/* Shared normalization and comparison logic. Public, non-generative statistics only. */
const AQ_DAY=86400000;
function aqMean(v){return v.length?v.reduce((s,n)=>s+n,0)/v.length:null}
function aqMedian(v){if(!v.length)return null;const a=v.slice().sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
function aqRate(n,f){return n!==null&&Number.isFinite(n)&&Number.isFinite(f)&&f>0?100*n/f:null}
function aqPercent(n){return n===null?'—':Number(n).toFixed(2)+'%'}
function aqRecords(raw,resolve,parseDate,parseNumber,field,validUrl){
 const posts=new Map(),rejected={unmatched:0,missingId:0,invalidDate:0,failedStatus:0};
 for(const row of raw){
  if(/fail|error|unavailable/i.test(String(field(row,'Collection status')||''))){rejected.failedStatus++;continue}
  const account=resolve(row);if(!account){rejected.unmatched++;continue}
  const id=String(field(row,'Post ID','Post URL')||'').trim();if(!id){rejected.missingId++;continue}
  const published=parseDate(field(row,'Post date'));const snapshot=parseDate(field(row,'Snapshot date'));
  if(!Number.isFinite(published)||!Number.isFinite(snapshot)){rejected.invalidDate++;continue}
  const k=account.handle+'|'+id;
  const likes=parseNumber(field(row,'Likes')),comments=parseNumber(field(row,'Comments'));
  let p=posts.get(k);
  if(!p){p={a:account,account,id,posted:published,postDate:published,snapshot:-Infinity,seen:-Infinity,likes:null,comments:null,likesDate:-Infinity,commentsDate:-Infinity,likesSeen:-Infinity,commentsSeen:-Infinity,url:null,media:'Post',source:''};posts.set(k,p)}
  // The newest snapshot establishes post metadata. Missing counters never overwrite a known reading.
  if(snapshot>=p.snapshot){p.snapshot=snapshot;p.seen=snapshot;p.posted=published;p.postDate=published;p.media=String(field(row,'Media type')||'Post');p.url=validUrl(field(row,'Post URL'))||p.url;p.source=String(field(row,'Data source')||'')}
  if(likes!==null&&likes>=0&&snapshot>=p.likesDate){p.likes=likes;p.likesDate=snapshot;p.likesSeen=snapshot}
  if(comments!==null&&comments>=0&&snapshot>=p.commentsDate){p.comments=comments;p.commentsDate=snapshot;p.commentsSeen=snapshot}
 }
 return {posts:[...posts.values()].sort((a,b)=>a.posted-b.posted||a.a.name.localeCompare(b.a.name)||a.id.localeCompare(b.id)),rejected};
}
function aqSummaries(posts,accounts,win,asOf=null){
 const arr=[];
 for(const a of accounts){
  const rows=posts.filter(p=>p.a.handle===a.handle&&p.posted>=win.from&&p.posted<=win.to);
  const lv=rows.filter(p=>p.likes!==null).map(p=>p.likes),cv=rows.filter(p=>p.comments!==null).map(p=>p.comments);
  const avgLikes=aqMean(lv),avgComments=aqMean(cv),f=a.followers;
  const first=rows.length?Math.min(...rows.map(p=>p.posted)):null,last=rows.length?Math.max(...rows.map(p=>p.posted)):null;
  const latest=rows.length?Math.max(...rows.map(p=>p.snapshot)):null;
  arr.push({a,rows,total:rows.length,likeN:lv.length,commentN:cv.length,missingLikes:rows.length-lv.length,missingComments:rows.length-cv.length,avgLikes,avgComments,medianLikes:aqMedian(lv),medianComments:aqMedian(cv),likeRate:aqRate(avgLikes,f),engagement:avgLikes===null||avgComments===null?null:aqRate(avgLikes+avgComments,f),first,last,latest,asOf});
 }
 return arr;
}
function aqCommonFollower(rows,window,dayTolerance=1.5){
 const sets=rows.map(m=>m.r||[]);if(sets.some(r=>r.length<2))return {ok:false,reason:'Not every account has two follower readings in this period.'};
 const targetStart=Math.max(...sets.map(r=>r[0].time));const targetEnd=Math.min(...sets.map(r=>r.at(-1).time));
 if(targetEnd-targetStart<AQ_DAY)return {ok:false,reason:'Accounts do not share at least one day of tracked follower history.'};
 const chosen=sets.map(r=>{
  const st=r.reduce((a,b)=>Math.abs(b.time-targetStart)<Math.abs(a.time-targetStart)?b:a);
  const en=r.reduce((a,b)=>Math.abs(b.time-targetEnd)<Math.abs(a.time-targetEnd)?b:a);
  if(Math.abs(st.time-targetStart)>dayTolerance*AQ_DAY||Math.abs(en.time-targetEnd)>dayTolerance*AQ_DAY||en.time<=st.time)return null;
  const gain=en.followers-st.followers,days=(en.time-st.time)/AQ_DAY;
  return {start:st,end:en,gain,pct:st.followers>0?gain/st.followers*100:null,perDay:days>0?gain/days:null,days};
 });
 if(chosen.some(x=>!x))return {ok:false,reason:'A comparable start/end reading is missing within 36 hours of the shared dates.'};
 const tolerance=Math.max(...chosen.map(r=>r.start.time))-Math.min(...chosen.map(r=>r.start.time));
 const toleranceEnd=Math.max(...chosen.map(r=>r.end.time))-Math.min(...chosen.map(r=>r.end.time));
 return {ok:true,from:targetStart,to:targetEnd,rows:rows.map((m,i)=>({...chosen[i],a:m.a})),startSpreadHours:tolerance/3600000,endSpreadHours:toleranceEnd/3600000};
}
// The 30-day window is anchored to the most recent successful post-collection timestamp,
// not an arbitrary synthetic number of observations. Report that anchor explicitly.
function aqWindow(asOf,days){return {from:asOf-days*AQ_DAY,to:asOf,label:`${days} Days to ${new Date(asOf).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`}}
