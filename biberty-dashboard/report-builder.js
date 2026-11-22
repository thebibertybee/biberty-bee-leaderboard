'use strict';
// Separate public, client-side report builder. Uses in-memory account/history data from app.js.
let rbSelected=new Set(),rbReady=false,rbLast=null;
const rbBeeOutline=new Image(); rbBeeOutline.src='biberty-bee-outline.png';
rbBeeOutline.onload=()=>{if(rbLast&&rbLast.format==='summary')rbInfographicDraw(rbLast)};
const rb=(id)=>document.getElementById(id);
const rbType=()=>document.querySelector('input[name="rbType"]:checked').value;
const rbFormat=()=>document.querySelector('input[name="rbFormat"]:checked').value;
const rbDate=(ms)=>new Date(ms).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
const rbShort=(ms)=>new Date(ms).toLocaleDateString('en-US',{month:'short',day:'numeric'});
const rbPct=(n)=>n===null?'—':`${n>=0?'+':''}${n.toFixed(1)}%`;
const rbSigned=(n)=>n===null||!Number.isFinite(n)?'—':`${n>0?'+':''}${fmt(n)}`;
const rbDaily=(n)=>n===null||!Number.isFinite(n)?'—':`${n>0?'+':''}${n.toFixed(1)}/day`;
function rbSchoolStart(year){return new Date(year,7,1).getTime()}
function rbWindow(){
 const v=rb('rbPeriod').value,points=state.history.map(p=>p.time).filter(Number.isFinite),postDates=(typeof postState!=='undefined'&&postState.snapshotsAvailable)?postState.records.map(p=>p.posted):[];
 const now=Math.max(...points,...(postDates.length?postDates:[0]),Date.now());
 const available=[...points,...postDates],latest=available.length?Math.max(...available):now,earliest=available.length?Math.min(...available):now,yr=schoolYearOf(now);
 if(v==='ytd')return {from:rbSchoolStart(yr),to:now,label:`${yr}–${String(yr+1).slice(-2)} School Year to Date`};
 if(v==='all')return {from:earliest,to:latest,label:'All Available Recorded History'};
 if(v==='multi'){let a=+rb('rbFromYear').value,b=+rb('rbToYear').value;return {from:rbSchoolStart(Math.min(a,b)),to:rbSchoolStart(Math.max(a,b)+1)-1,label:`${Math.min(a,b)}–${Math.max(a,b)+1} Multiple Academic Years`}}
 if(v==='custom'){let from=new Date(rb('rbStart').value+'T00:00:00').getTime(),to=new Date(rb('rbEnd').value+'T23:59:59').getTime();return {from,to,label:`${rbDate(from)} – ${rbDate(to)}`}}
 let y=+v;return {from:rbSchoolStart(y),to:rbSchoolStart(y+1)-1,label:`${y}–${String(y+1).slice(-2)} Academic Year`}
}
function rbMetrics(a,window){let r=state.history.filter(p=>p.handle===a.handle&&p.time>=window.from&&p.time<=window.to).sort((x,y)=>x.time-y.time),start=r[0]?.followers??null,end=r.at(-1)?.followers??null,gain=r.length>=2?end-start:null,pct=gain!==null&&start>0?100*gain/start:null;let crossed=[];for(const [limit,label] of [[750,'Bronze'],[2000,'Silver'],[5000,'Gold'],[10000,'Platinum'],[20000,'Double Platinum']]){for(let i=1;i<r.length;i++)if(r[i-1].followers<limit&&r[i].followers>=limit){crossed.push({limit,label,date:r[i].time});break}}const days=r.length>=2?(r.at(-1).time-r[0].time)/86400000:null,daily=days>0?gain/days:null;return {a,r,start,end,gain,pct,crossed,days,daily,coverage:r.length>=2,first:r.length?rbDate(r[0].time):null,last:r.length?rbDate(r.at(-1).time):null}}
function rbPick(){const type=rbType();let accounts=state.accounts.filter(a=>rbSelected.has(a.handle));if(type==='leaderboard'){const c=rb('rbCategory').value,aff=rb('rbAffiliation').value;accounts=state.accounts.filter(a=>accountHasCategory(a,c)&&(aff==='all'||(aff==='official'?a.official:!a.official)))}else if(type==='individual')accounts=accounts.slice(0,1);else accounts=accounts.slice(0,4);return accounts}
function rbPicker(){const type=rbType(),hide=type==='leaderboard';rb('rbAccountGroup').hidden=hide;rb('rbCategoryGroup').hidden=!hide;if(hide)return;const max=type==='individual'?1:4,term=rb('rbSearch').value.trim().toLowerCase();const chosen=state.accounts.filter(a=>rbSelected.has(a.handle));rb('rbSelected').textContent=`${chosen.length} selected · ${type==='individual'?'choose 1 account':'choose 2–4 accounts'}`;rb('rbAccountList').innerHTML=state.accounts.filter(a=>a.name.toLowerCase().includes(term)||a.handle.includes(term)).map(a=>`<label class="builder-account-row"><input type="checkbox" value="${esc(a.handle)}" ${rbSelected.has(a.handle)?'checked':''} ${type==='comparison'&&!rbSelected.has(a.handle)&&chosen.length>=max?'disabled':''}><span class="builder-account-dot" style="background:${colorFor(a.handle)}">${esc(abbreviation(a))}</span><span><b>${esc(a.name)}</b><small>@${esc(a.handle)} · ${fmt(a.followers)} followers</small></span></label>`).join('')||'<p class="builder-note">No matching accounts.</p>'}
function rbRefreshPeriod(){const isMulti=rb('rbPeriod').value==='multi',custom=rb('rbPeriod').value==='custom';rb('rbAcademicCustom').hidden=!isMulti;rb('rbDateCustom').hidden=!custom}
function rbHeadline(){const type=rbType(),fmtName=rbFormat()==='detailed'?'Detailed Report':'One-Page Summary';rb('rbPreviewType').textContent=({individual:'Account Performance',comparison:'Account Comparison',leaderboard:'Leaderboard Analysis'}[type])+' · '+fmtName}
function rbValidate(){const type=rbType(),arr=rbPick(),win=rbWindow();if(type==='individual'&&arr.length!==1)return 'Choose exactly one account.';if(type==='comparison'&&(arr.length<2||arr.length>4))return 'Choose between two and four accounts.';if(!arr.length)return 'No matching accounts were found for these filters.';if(!Number.isFinite(win.from)||!Number.isFinite(win.to)||win.to<win.from)return 'Choose a valid date range (start must be before end).';return null}
function rbDataset(){const window=rbWindow(),accounts=rbPick(),rows=accounts.map(a=>rbMetrics(a,window));const ranked=rows.filter(m=>m.end!==null).sort((a,b)=>b.end-a.end);return {window,rows,ranked,type:rbType(),format:rbFormat(),created:new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}}
const rbCaption=(txt)=>`<span class="rb-caption">${esc(txt)}</span>`;
function rbChart(rows){const eligible=rows.filter(m=>m.r.length>=2).slice(0,8);if(!eligible.length)return '<div class="rb-nohistory">Not enough readings in the chosen period to draw a growth chart.</div>';
 let values=eligible.flatMap(m=>m.r.map(p=>p.followers)),times=eligible.flatMap(m=>m.r.map(p=>p.time)),min=Math.min(...values),max=Math.max(...values),tmin=Math.min(...times),tmax=Math.max(...times),H=290,W=790,L=74,R=35,T=28,B=48;
 if(min===max){min=Math.max(0,min-1);max+=1}if(tmin===tmax)tmax+=86400000;
 const xx=t=>L+(t-tmin)/(tmax-tmin)*(W-L-R),yy=v=>T+(max-v)/(max-min)*(H-T-B);
 let svg=`<svg viewBox="0 0 ${W} ${H}" class="rb-svg" role="img" aria-label="Recorded follower history chart">`;
 for(let i=0;i<5;i++){let y=T+(H-T-B)*i/4;svg+=`<line x1="${L}" x2="${W-R}" y1="${y}" y2="${y}" stroke="#e0e5ef"/><text x="${L-9}" y="${y+5}" font-size="13" text-anchor="end" fill="#64718b">${fmt(max-i*(max-min)/4)}</text>`}
 for(let i=0;i<=3;i++){let t=tmin+(tmax-tmin)*i/3;svg+=`<text x="${xx(t)}" y="${H-12}" text-anchor="middle" fill="#64718b" font-size="12">${esc(rbShort(t))}</text>`}
 eligible.forEach(m=>{let line=m.r.map(p=>`${xx(p.time).toFixed(1)},${yy(p.followers).toFixed(1)}`).join(' ');svg+=`<polyline points="${line}" fill="none" stroke="${colorFor(m.a.handle)}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><title>${esc(m.a.name)}</title></polyline>`});svg+='</svg>';
 svg+=`<div class="rb-chart-legend">${eligible.map(m=>`<span><i style="background:${colorFor(m.a.handle)}"></i>${esc(m.a.name)}</span>`).join('')}</div>`;if(rows.length>8)svg+='<p class="rb-caption">Chart displays the first eight accounts; all matching accounts appear in the table.</p>';return svg}
function rbTable(rows){return `<div class="rb-table-scroller"><table class="rb-report-table"><thead><tr><th>Account</th><th>Last Recorded Followers</th><th>Net Gain</th><th>Growth %</th><th>Avg. Gain / Day</th><th>Days Observed</th><th>Milestones Passed</th></tr></thead><tbody>${rows.map(m=>`<tr><td><b>${esc(m.a.name)}</b><small>@${esc(m.a.handle)}</small></td><td>${m.end===null?'No records':fmt(m.end)}<small>${m.last||'No date'}</small></td><td>${rbSigned(m.gain)}</td><td>${rbPct(m.pct)}</td><td>${rbDaily(m.daily)}</td><td>${m.days===null?'—':m.days.toFixed(0)}</td><td>${m.crossed.length?esc(m.crossed.map(x=>x.label).join(', ')):'—'}</td></tr>`).join('')}</tbody></table></div>`}
// Post timeline: one point per published post, using the latest available snapshot of that post.
// This is NOT a history of likes accumulating on an individual post.
function rbPostPoints(d){
 return rbPostSummaryRows(d).filter(p=>p.likes!==null).map(p=>({a:p.a,id:p.id,posted:p.posted,seen:p.likesSeen,likes:p.likes,url:p.url}))
  .sort((a,b)=>a.posted-b.posted||a.a.name.localeCompare(b.a.name));
}
function rbLikesChart(d){
 const pts=rbPostPoints(d);if(!pts.length)return '<div class="rb-nohistory">No eligible post-like snapshots were recorded for this reporting period.</div>';
 const W=790,H=320,L=76,R=40,T=30,B=53;
 let lo=Math.min(...pts.map(p=>p.posted)),hi=Math.max(...pts.map(p=>p.posted));if(lo===hi){lo-=86400000;hi+=86400000}
 const max=Math.max(1,...pts.map(p=>p.likes));
 const X=t=>L+(t-lo)/(hi-lo)*(W-L-R),Y=v=>T+(1-v/max)*(H-T-B);
 let svg=`<svg class="rb-svg" role="img" aria-label="Likes per published post, by post date" viewBox="0 0 ${W} ${H}">`;
 for(let i=0;i<=4;i++){const y=T+i*(H-T-B)/4;svg+=`<line x1="${L}" x2="${W-R}" y1="${y}" y2="${y}" stroke="#e2e7f0"/><text x="${L-9}" y="${y+4}" font-size="12" fill="#66718a" text-anchor="end">${esc(fmt(max*(1-i/4)))}</text>`}
 for(let i=0;i<=3;i++){const x=L+i*(W-L-R)/3;svg+=`<text x="${x}" y="${H-15}" font-size="12" fill="#66718a" text-anchor="middle">${esc(rbShort(lo+(hi-lo)*i/3))}</text>`}
 // Small, ordered dots avoid pretending there are observations between publication dates.
 pts.forEach(p=>{const c=colorFor(p.a.handle);svg+=`<circle cx="${X(p.posted).toFixed(1)}" cy="${Y(p.likes).toFixed(1)}" r="5" fill="${c}" stroke="white" stroke-width="1.1"><title>${esc(p.a.name)} · ${esc(rbShort(p.posted))} · ${esc(fmt(p.likes))} likes at ${esc(rbShort(p.seen))} snapshot</title></circle>`});
 svg+='</svg>';
 const accounts=[...new Map(pts.map(p=>[p.a.handle,p.a])).values()];
 const legend=accounts.length>1?`<div class="rb-chart-legend">${accounts.map(a=>`<span><i style="background:${colorFor(a.handle)}"></i>${esc(a.name)}</span>`).join('')}</div>`:'';
 return `<div class="rb-likes-chart">${svg}${legend}<p class="rb-post-note">${fmt(pts.length)} posts with available like counts. Each dot represents a post published on that date; its like count is from the latest available snapshot. Hidden likes are excluded. These are not likes received on that date.</p></div>`;
}

// Per-post report detail: deduplicate snapshots and independently preserve each
// metric's latest *available* reading. Blank means unavailable, never zero.
function rbPostSummaryRows(d){
 if(typeof postState==='undefined'||!postState.snapshotsAvailable)return [];
 const handles=new Set(d.rows.map(m=>m.a.handle));
 return postState.records.filter(p=>handles.has(p.a.handle)&&p.posted>=d.window.from&&p.posted<=d.window.to)
  .sort((a,b)=>a.a.name.localeCompare(b.a.name)||b.posted-a.posted||a.id.localeCompare(b.id));
}
function rbPeriodPostSummaries(d){return aqSummaries(rbPostSummaryRows(d),d.rows.map(m=>m.a),d.window,postState.asOf)}
function rbPostBreakdown(d){
 if(typeof postState==='undefined'||!postState.ready)
  return '<div class="rb-nohistory">Post data is currently unavailable. No post metrics have been inferred.</div>';
 const all=rbPostSummaryRows(d);
 if(!all.length)return '<div class="rb-nohistory">No recorded posts for the selected accounts during this reporting period.</div>';
 const groups=d.rows.map(r=>{const every=all.filter(p=>p.a.handle===r.a.handle);return {a:r.a,total:every.length,posts:every.slice(0,20)}}).filter(g=>g.posts.length);
 // Separate scales make comments visible even when likes are much larger.
 const nfmt=v=>v===null?'—':fmt(v);
 let out=`<p class="rb-caption">${fmt(all.length)} recorded post${all.length===1?'':'s'} across ${groups.length} account${groups.length===1?'':'s'}. Up to 20 recent posts per account are shown in the breakdown; all eligible posts are included in the charts and period statistics. Posts are organized by publication date (newest first). Blue bars show likes; red bars show comments. Each metric uses its own scale, so bar lengths are not directly comparable between likes and comments.</p>`;
 for(const g of groups){
  out+=`<h4 class="rb-post-account-title">${esc(g.a.name)} <small>@${esc(g.a.handle)} · ${fmt(g.total)} total posts · ${g.total>20?'20 most recent shown':'all shown'}</small></h4>`;
  for(let k=0;k<g.posts.length;k+=10){
   const batch=g.posts.slice(k,k+10),maxLikes=Math.max(1,...batch.map(p=>p.likes||0)),maxComments=Math.max(1,...batch.map(p=>p.comments||0));
   out+=`<section class="rb-post-panel"><div class="rb-post-panel-head"><span>Posts ${k+1}–${k+batch.length} of ${g.posts.length}</span><span>Like scale: ${fmt(maxLikes)} · Comment scale: ${fmt(maxComments)}</span></div><div class="rb-post-labels"><span>POST</span><span>LIKES</span><span>COMMENTS</span></div>`;
   for(const p of batch){
    const label=rbShort(p.posted),shortId=p.id.replace(/[^a-zA-Z0-9_-]/g,'').slice(-7);
    const link=p.url?`<a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" data-instagram-link>${esc(label)} · ${esc(p.media)}</a>`:`<b>${esc(label)} · ${esc(p.media)}</b>`;
    out+=`<div class="rb-post-line"><div class="rb-post-ident">${link}<small>Post ${esc(shortId)} · ${p.likes===null?'Likes unavailable':p.comments===null?'Comments unavailable':'Recorded metrics'}</small></div>
      <div class="rb-post-metric"><div class="rb-post-track">${p.likes!==null?`<span class="rb-post-bar rb-post-bar-likes" style="width:${Math.max(1,p.likes/maxLikes*100).toFixed(2)}%"></span>`:''}</div><b>${nfmt(p.likes)}</b></div>
      <div class="rb-post-metric"><div class="rb-post-track">${p.comments!==null?`<span class="rb-post-bar rb-post-bar-comments" style="width:${Math.max(1,p.comments/maxComments*100).toFixed(2)}%"></span>`:''}</div><b>${nfmt(p.comments)}</b></div>
      </div>`;
   }
   out+='</section>';
  }
 }
 out+='<p class="rb-post-note">Values are the latest available recorded counts for each post, not the likes or comments received on its publication date. Hidden and missing metrics are shown as —. Bar scales reset for each 10-post group; read the numerical labels for precise comparisons. Post links open Instagram.</p>';
 return out;
}
function rbContentCards(d){
 if(typeof postState==='undefined'||!postState.snapshotsAvailable)return '';
 const rows=rbPeriodPostSummaries(d),postN=rows.reduce((n,r)=>n+r.total,0),all=rows.flatMap(r=>r.rows);
 const like=all.filter(p=>p.likes!==null).map(p=>p.likes),comment=all.filter(p=>p.comments!==null).map(p=>p.comments);
 const items=[['Posts Recorded',fmt(postN),`Published during selected period`],['Average Likes / Post',like.length?cpDecimal(aqMean(like)):'—',`${fmt(like.length)} eligible like counts`],['Median Likes / Post',like.length?cpDecimal(aqMedian(like)):'—',`Less sensitive to one viral post`],['Average Comments / Post',comment.length?cpDecimal(aqMean(comment)):'—',`${fmt(comment.length)} eligible comment counts`]];
 return `<h3 class="rb-chart-title">Post-Performance Summary · Selected Period</h3><p class="rb-caption">All figures below use posts published during ${esc(d.window.label)}. Like and comment counts are their <b>latest recorded values</b>, not their totals on the publication date.</p><div class="rb-content-cards">${items.map(([name,value,sub])=>`<div><small>${esc(name)}</small><strong>${esc(value)}</strong><span>${esc(sub)}</span></div>`).join('')}</div>`;
}
function rbHistoricalContent(d){
 if(typeof postState==='undefined'||!postState.snapshotsAvailable)return '';
 const posts=rbPostSummaryRows(d),postHTML=[];
 for(const m of d.rows){
  const group=posts.filter(p=>p.a.handle===m.a.handle);
  if(!group.length)continue;
  const likes=group.filter(p=>p.likes!==null).map(p=>p.likes),comments=group.filter(p=>p.comments!==null).map(p=>p.comments);
  const avg=xs=>xs.length?xs.reduce((s,n)=>s+n,0)/xs.length:null;
  const aLikes=avg(likes),aComments=avg(comments),median=aqMedian(likes);
  const baseline=m.a.followers>0?m.a.followers:null;
  const likeRate=aLikes!==null&&baseline?100*aLikes/baseline:null;
  const engagement=aLikes!==null&&aComments!==null&&baseline?100*(aLikes+aComments)/baseline:null;
  const flag=likes.length<5?' <small class="rb-small-sample">Small sample</small>':'';
  postHTML.push(`<tr><td><b>${esc(m.a.name)}</b></td><td>${fmt(group.length)}</td><td>${aLikes===null?'—':cpDecimal(aLikes)}<small>n=${likes.length}</small>${flag}</td><td>${median===null?'—':fmt(median)}</td><td>${aComments===null?'—':cpDecimal(aComments)}<small>n=${comments.length}</small></td><td>${likeRate===null?'—':likeRate.toFixed(2)+'%'}</td><td>${engagement===null?'—':engagement.toFixed(2)+'%'}</td></tr>`);
 }
 if(!postHTML.length)return '<h3 class="rb-chart-title">Post Performance During This Period</h3><p class="rb-caption">No recorded posts with a publication date in this period. This does not establish that an account published no posts unless collection coverage is confirmed.</p>';
 return `<h3 class="rb-chart-title">Post Performance During This Period</h3><p class="rb-caption">${fmt(posts.length)} recorded unique posts published in ${esc(d.window.label)}. Likes/comments are their latest recorded counts, not counts at publication. Like Rate and engagement estimates use <b>current followers as the denominator</b>, not historical follower counts. These are not view rates. Small samples (fewer than five posts) are flagged. Historical collection may still be incomplete for some accounts; these rankings reflect collected posts only.</p><div class="rb-table-scroller"><table class="rb-report-table rb-content-table rb-historical-table"><thead><tr><th>Account</th><th>Posts</th><th>Avg. Likes</th><th>Median Likes</th><th>Avg. Comments</th><th>Like Rate</th><th>Engagement Est.</th></tr></thead><tbody>${postHTML.join('')}</tbody></table></div>`;
}
function rbPostRateChart(d){
 if(typeof postState==='undefined'||!postState.snapshotsAvailable)return '';
 const summary=rbPeriodPostSummaries(d).filter(s=>s.likeRate!==null&&s.likeN>0);
 if(!summary.length)return '';
 // Keep comparison graphs legible; rankings remain available in tables for all accounts.
 const chosen=summary.sort((a,b)=>b.likeRate-a.likeRate).slice(0,d.type==='leaderboard'?8:4);
 const W=800,L=200,R=118,T=24,ROW=63,H=T+chosen.length*ROW+43,max=Math.max(1,...chosen.map(s=>s.likeRate)),span=W-L-R;
 let out=`<section class="rb-chart-block"><h3 class="rb-chart-title">Like Rate Relative to Current Followers</h3><p class="rb-caption">Average recorded likes per post ÷ <b>current followers</b> × 100. This is not a like-to-view ratio. Posts with hidden likes are excluded; historical follower counts cannot be inferred. ${d.type==='leaderboard'?'Shows up to eight accounts by observed Like Rate.':''}</p>`;
 let svg=`<svg class="rb-svg rb-post-rate-chart" role="img" aria-label="Audience-adjusted average like rate comparison" viewBox="0 0 ${W} ${H}">`;
 chosen.forEach((s,i)=>{const y=T+i*ROW,bw=Math.max(1,s.likeRate/max*span),name=s.a.name.length>25?s.a.name.slice(0,23)+'…':s.a.name;
  svg+=`<text x="${L-13}" y="${y+22}" fill="#172451" text-anchor="end" font-size="16" font-weight="700">${esc(name)}</text><rect x="${L}" y="${y+3}" width="${span}" height="24" rx="3" fill="#e9edf4"/><rect x="${L}" y="${y+3}" width="${bw.toFixed(2)}" height="24" rx="3" fill="${colorFor(s.a.handle)}"/><text x="${W-4}" y="${y+21}" fill="#14234f" text-anchor="end" font-size="15" font-weight="700">${s.likeRate.toFixed(2)}%</text><text x="${L}" y="${y+46}" fill="#68758e" font-size="12">${s.likeN} post${s.likeN===1?'':'s'} with visible likes${s.likeN<5?' · small sample':''}</text>`;
 });
 svg+='</svg>';return out+svg+'</section>';
}
function rbComparisonAnalysis(d){
 if(d.type!=='comparison')return '';
 const aligned=aqCommonFollower(d.rows,d.window);
 const sizeRows=d.rows.filter(m=>m.end!==null).sort((a,b)=>b.end-a.end);
 let html=`<h3 class="rb-chart-title">Head-to-Head Comparison</h3><p class="rb-caption">Account size and audience-adjusted post performance are separate measures. Relative performance does not equal the percentage of people who viewed a post.</p>`;
 if(sizeRows.length>=2){const lead=sizeRows[0],runner=sizeRows[1];html+=`<div class="rb-comparison-callout"><strong>Largest tracked audience</strong><span>${esc(lead.a.name)} · ${fmt(lead.end)} followers at its last available reading in this period</span><small>${fmt(lead.end-runner.end)} more than ${esc(runner.a.name)} (next-largest), using each account’s latest available date. Check observation dates below.</small></div>`}
 if(aligned.ok){
  html+=`<div class="rb-comparison-callout"><strong>Comparable follower-growth interval</strong><span>${esc(rbDate(aligned.from))} – ${esc(rbDate(aligned.to))}</span><small>Nearest real readings within 36 hours of common start and end. No missing readings are fabricated; times may differ by ${Math.ceil(Math.max(aligned.startSpreadHours,aligned.endSpreadHours))} hours.</small></div>`;
  html+=`<div class="rb-table-scroller"><table class="rb-report-table rb-compare-table"><thead><tr><th>Account</th><th>Starting Followers</th><th>Ending Followers</th><th>Net Change</th><th>Relative Growth</th><th>Per Day</th></tr></thead><tbody>${aligned.rows.map(r=>`<tr><td>${esc(r.a.name)}<small>${esc(rbDate(r.start.time))} – ${esc(rbDate(r.end.time))}</small></td><td>${fmt(r.start.followers)}</td><td>${fmt(r.end.followers)}</td><td>${rbSigned(r.gain)}</td><td>${rbPct(r.pct)}</td><td>${rbDaily(r.perDay)}</td></tr>`).join('')}</tbody></table></div>`;
  const growth=aligned.rows.filter(r=>r.pct!==null).sort((a,b)=>b.pct-a.pct),gain=aligned.rows.sort((a,b)=>b.gain-a.gain);
  if(growth.length){html+=`<div class="rb-comparison-insights"><p><b>Fastest relative follower growth:</b> ${esc(growth[0].a.name)} (${rbPct(growth[0].pct)}) over the shared observation period.</p><p><b>Largest follower increase:</b> ${esc(gain[0].a.name)} (${rbSigned(gain[0].gain)} followers) over that same period.</p></div>`}
 }else html+=`<div class="rb-nohistory"><b>Direct follower growth comparison unavailable.</b> ${esc(aligned.reason)} The account-by-account table below still reports each account’s own observed results, but these should not be interpreted as a synchronized race.</div>`;
 if(typeof postState==='undefined'||!postState.snapshotsAvailable)return html+'<div class="rb-nohistory">Post snapshots could not be loaded; audience-adjusted comparisons cannot be verified.</div>';
 const summaries=rbPeriodPostSummaries(d),withLikes=summaries.filter(s=>s.likeN>=5&&s.likeRate!==null),withPosts=summaries.filter(s=>s.total>0);
 html+=`<h3 class="rb-chart-title">Post-Performance Comparison · Selected Period</h3><p class="rb-caption">Each row summarizes <b>posts published during ${esc(d.window.label)}</b>. Likes and comments are the latest recorded counters; the follower denominator is current (not historical). Eligibility counts exclude missing metrics. Averages are per post, not totals.</p>`;
 if(!withPosts.length)return html+'<div class="rb-nohistory">No recorded posts in this reporting period for the selected accounts.</div>';
 html+=`<div class="rb-table-scroller"><table class="rb-report-table rb-compare-table"><thead><tr><th>Account</th><th>Recorded Posts</th><th>Avg. Likes</th><th>Median Likes</th><th>Avg. Comments</th><th>Like Rate</th><th>Est. Interaction Rate</th></tr></thead><tbody>${summaries.map(s=>`<tr><td>${esc(s.a.name)}<small>@${esc(s.a.handle)}</small></td><td>${fmt(s.total)}</td><td>${s.avgLikes===null?'—':cpDecimal(s.avgLikes)}<small>n=${s.likeN}${s.likeN<5?' · Small sample':''}</small></td><td>${s.medianLikes===null?'—':cpDecimal(s.medianLikes)}</td><td>${s.avgComments===null?'—':cpDecimal(s.avgComments)}<small>n=${s.commentN}</small></td><td>${aqPercent(s.likeRate)}</td><td>${aqPercent(s.engagement)}</td></tr>`).join('')}</tbody></table></div>`;
 if(withLikes.length>=2){const ordered=withLikes.sort((a,b)=>b.likeRate-a.likeRate),p=ordered[0],runner=ordered[1];html+=`<div class="rb-comparison-callout"><strong>Highest audience-adjusted Like Rate</strong><span>${esc(p.a.name)} · ${aqPercent(p.likeRate)}</span><small>${(p.likeRate-runner.likeRate).toFixed(2)} percentage points ahead of ${esc(runner.a.name)} among accounts with at least five recorded like counts. This is likes relative to current followers, not views.</small></div>`}
 else html+='<p class="rb-caption">Insufficient eligible sample sizes to name a fair Like Rate leader (at least two accounts need five posts with visible likes).</p>';
 const activity=summaries.filter(r=>r.total>0).sort((a,b)=>b.total-a.total);
 if(activity.length>=2)html+=`<p class="rb-caption"><b>Most posts in the selected period:</b> ${esc(activity[0].a.name)} (${fmt(activity[0].total)} recorded). A higher posting count does not establish higher per-post engagement.</p>`;
 return html;
}
function rbDetailedHTML(d){const typeTitle=({individual:'Account Performance Report',comparison:'Account Comparison Report',leaderboard:'Leaderboard Analysis Report'}[d.type]),all=d.rows,available=all.filter(x=>x.end!==null),gains=all.filter(x=>x.gain!==null),top=available.toSorted((a,b)=>b.end-a.end)[0],fastest=gains.toSorted((a,b)=>b.gain-a.gain)[0],total=available.reduce((x,m)=>x+m.end,0),histStart=available.length?Math.min(...available.map(m=>m.r[0].time)):null,histEnd=available.length?Math.max(...available.map(m=>m.r.at(-1).time)):null;
 const intro=d.type==='individual'?`Performance summary for ${esc(all[0].a.name)}.`:d.type==='comparison'?`Side-by-side assessment of ${all.length} selected accounts.`:`Category-wide analysis across ${all.length} matching accounts.`;
 const coverAccounts=d.type==='individual'
  ?`<p class="rb-cover-account-heading">FEATURED ACCOUNT</p><div class="rb-cover-account"><strong>${esc(all[0].a.name)}</strong><span>@${esc(all[0].a.handle)}</span></div>`
  :d.type==='comparison'
   ?`<p class="rb-cover-account-heading">ACCOUNTS COMPARED (${all.length})</p><div class="rb-cover-account-list">${all.map((m,i)=>`<div><b>${i+1}. ${esc(m.a.name)}</b><span>@${esc(m.a.handle)}</span></div>`).join('')}</div>`
   :`<p class="rb-cover-account-heading">LEADERBOARD COVERAGE</p><div class="rb-cover-account"><strong>${esc(rb('rbCategory').value==='all'?'All Categories':rb('rbCategory').value)}</strong><span>${esc(rb('rbAffiliation').selectedOptions[0]?.textContent||'All affiliations')} · ${all.length} tracked account${all.length===1?'':'s'}</span></div><div class="rb-cover-list-preview">${esc(all.slice(0,5).map(m=>m.a.name).join(' · '))}${all.length>5?` · +${all.length-5} more in report`:''}</div>`;
 const heads=`<div class="rb-document-cover"><div class="rb-cover-brand"><img src="biberty-bee-symbol.png" alt="Biberty Bee logo"><span>THE BIBERTY BEE PRESENTS</span></div><div class="rb-cover-rule"></div><p class="rb-overline">CAMPUS INSTAGRAM ANALYTICS</p><h1>${esc(typeTitle)}</h1><p class="rb-cover-sub">${esc(d.window.label)}</p><p>${intro}</p>${coverAccounts}<div class="rb-cover-pill">RECORDED PUBLIC METRICS</div><div class="rb-cover-foot">Fueled by The Biberty Bee <span>Premium Fake News. Real Numbers.</span></div></div>`;
 const postSummary=typeof postState!=='undefined'&&postState.snapshotsAvailable?rbPeriodPostSummaries(d):[];
 const postCount=postSummary.reduce((sum,s)=>sum+s.total,0),qual=postSummary.filter(s=>s.likeN>=5&&s.likeRate!==null).sort((a,b)=>b.likeRate-a.likeRate);
 const kpis=d.type==='individual'?[['Last Recorded Followers',all[0].end===null?'—':fmt(all[0].end)],['Recorded Follower Gain',rbSigned(all[0].gain)],['Observed Growth',rbPct(all[0].pct)],['Posts in Selected Period',postSummary.length?String(postCount):'—']]
 :[['Accounts Compared',String(all.length)],['With Follower Readings',String(available.length)],['Posts Recorded in Period',postSummary.length?fmt(postCount):'—'],['Top Like Rate (n≥5)',qual.length?aqPercent(qual[0].likeRate):'—']];
 let narrative='';if(d.type==='individual'){let m=all[0];narrative=`<div class="rb-textpanel"><h3>${esc(m.a.name)} <span>@${esc(m.a.handle)}</span></h3><p>${m.coverage?`Between ${esc(m.first)} and ${esc(m.last)}, the account ${m.gain>=0?'gained':'lost'} ${fmt(Math.abs(m.gain))} followers (${rbPct(m.pct)}).`:'Growth cannot be calculated: fewer than two readings exist within this period.'}</p><p>${m.crossed.length?`Confirmed milestones: ${esc(m.crossed.map(x=>`${x.label} (${rbDate(x.date)})`).join('; '))}.`:'No new follower milestones can be confirmed during the selected reporting period.'}</p></div>`}else{narrative=`<div class="rb-textpanel"><h3>Performance Highlights</h3><p>${top?`Largest measured account: <b>${esc(top.a.name)}</b> with ${fmt(top.end)} followers at its latest recorded point in the period.`:'No accounts have recorded follower counts for the selected period.'}</p><p>${fastest?`Largest recorded follower gain: <b>${esc(fastest.a.name)}</b> (${rbSigned(fastest.gain)}).`:'There are not enough readings to compare growth.'}</p></div>`}
 if(d.type==='comparison'){
  narrative='<div class="rb-textpanel"><h3>How to Read This Comparison</h3><p>Follower totals, follower gains, and interactions per post tell different stories. For fair comparisons, use the synchronized dates and sample sizes below; raw totals alone do not establish which account performs best.</p></div>';
  const comparable=all.filter(m=>m.daily!==null),percent=all.filter(m=>m.pct!==null),growthLeader=percent.toSorted((a,b)=>b.pct-a.pct)[0],speedLeader=comparable.toSorted((a,b)=>b.daily-a.daily)[0];
  const largest=available.toSorted((a,b)=>b.end-a.end);
  const gap=largest.length>=2?largest[0].end-largest[1].end:null;
  narrative+=`<div class="rb-textpanel"><h3>Comparing Accounts Fairly</h3><p>Followers indicate audience size; net growth indicates absolute gain; growth percentage controls for starting audience size. Post Like Rate and estimated interactions use current followers as a reference. The synchronized comparison below only ranks follower growth when sufficiently overlapping observations exist.</p></div>`;
 }
 const contentPerformance=typeof postState!=='undefined'&&postState.snapshotsAvailable
  ?`<p class="rb-caption">Historical content calculations are based on unique posts in your chosen reporting period. Summary figures do not silently switch to a 30-day window.</p>`
  :`<div class="rb-nohistory">Detailed post snapshots are unavailable. Content comparisons cannot be verified, so no substitute figures are shown.</div>`;
 const coverage=`<div class="rb-methodology"><h3>Data Coverage & Methodology</h3><p>Source: The Biberty Bee’s recorded public follower measurements and post snapshots. Period: ${esc(d.window.label)}. ${histStart!==null?`Actual available readings in this selection: ${rbDate(histStart)} to ${rbDate(histEnd)}.`:'No readings are available in the selected period.'}</p><p>Days observed equals elapsed time between the first and last available snapshots for each account; average daily gain divides net gain by days observed. Different accounts may have different observation windows. Follower gains equal the last recorded count minus the first recorded count <b>within the selected range</b>. Growth rate uses the first count as denominator. Milestone crossings are confirmed only when consecutive recorded readings move from below a threshold to at or above it. Missing earlier history can conceal previous milestones. End-of-period totals use the last measurement in the period; no missing measurements are interpolated.</p><p>Follower statistics are recorded public counts. Direct follower comparisons use overlapping measurement windows or report that they cannot be established. Post metrics are latest recorded public counters on posts published in the selected period: they are not engagement measured during that year, impressions, reach, view counts, or Instagram Insights. Historic post inventory may be incomplete while backfilling. Like Rate uses average visible likes divided by current followers; estimated interaction rate adds average visible comments and likewise divides by current followers. Statistics represent tracked snapshots and may omit changes between readings.</p></div>`;
 return `<article class="rb-document">${heads}<div class="rb-document-content"><div class="rb-content-top"><p class="rb-overline">REPORT SUMMARY</p><h2>${esc(typeTitle)}</h2><p>${esc(d.window.label)} · Generated ${esc(d.created)}</p></div><div class="rb-kpis">${kpis.map(([k,v])=>`<div><small>${esc(k)}</small><strong>${esc(v)}</strong></div>`).join('')}</div>${narrative}${rbComparisonAnalysis(d)}<h3 class="rb-chart-title">Follower History</h3>${rbChart(all)}<h3 class="rb-chart-title">Account Breakdown</h3>${rbTable(all)}${rbContentCards(d)}${rbPostRateChart(d)}${contentPerformance}${rbHistoricalContent(d)}<h3 class="rb-chart-title">Likes per Post Over Time</h3><p class="rb-caption">Posts published in the selected report period, using their latest recorded like counts. All post metrics on this report use the selected reporting period. Latest recorded like counts are not likes received on the publication date.</p>${rbLikesChart(d)}<h3 class="rb-chart-title">Post-by-Post Performance</h3>${rbPostBreakdown(d)}${coverage}<footer class="rb-document-footer">THE BIBERTY BEE · PREMIUM FAKE NEWS. REAL NUMBERS. <span>RECORDED PUBLIC METRICS</span></footer></div></article>`;
}
function rbInfographicDraw(d){const cv=rb('rbCanvas'),c=cv.getContext('2d'),w=cv.width,h=cv.height;c.clearRect(0,0,w,h);let g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#111b48');g.addColorStop(.6,'#273a71');g.addColorStop(1,'#101630');c.fillStyle=g;c.fillRect(0,0,w,h);
 let glow=c.createRadialGradient(1050,240,0,1050,240,550);glow.addColorStop(0,'#bf6c6c44');glow.addColorStop(1,'#bf6c6c00');c.fillStyle=glow;c.fillRect(500,0,700,760);
 // The exact outline derived from the uploaded Biberty Bee symbol, in the report background.
 if(rbBeeOutline.complete&&rbBeeOutline.naturalWidth){c.save();c.globalAlpha=.12;c.drawImage(rbBeeOutline,800,45,490,495);c.restore()}
 c.fillStyle='#b7342c';c.fillRect(0,0,1200,18);c.fillRect(0,1534,1200,16);function t(x,y,str,size=38,color='#fff',weight=700,align='left'){c.fillStyle=color;c.font=`${weight} ${size}px Arial,sans-serif`;c.textAlign=align;c.fillText(String(str),x,y)}function panel(x,y,width,height){c.fillStyle='#ffffff16';c.beginPath();c.roundRect(x,y,width,height,22);c.fill();c.strokeStyle='#ffffff26';c.lineWidth=2;c.stroke()}
 t(72,108,'THE BIBERTY BEE PRESENTS',34,'#d9e2ff',800);c.fillStyle='#d65b50';c.fillRect(72,141,180,7);t(72,226,'CAMPUS INSTAGRAM ANALYTICS',25,'#e4b3ac',700);
 const title=({individual:'Account Performance',comparison:'Account Comparison',leaderboard:'Leaderboard Analysis'}[d.type]);t(72,315,title,67,'#fff',800);t(72,374,d.window.label,31,'#d2daf3',500);
 const measured=d.rows.filter(r=>r.end!==null),gainers=d.rows.filter(r=>r.gain!==null),top=measured.toSorted((a,b)=>b.end-a.end)[0];let primary=d.type==='individual'?d.rows[0]:top;
 if(d.type==='individual'){
  if(primary){t(72,472,primary.a.name.slice(0,32),43,'#fff',800);t(72,515,'@'+primary.a.handle,26,'#d3bbbc',500)}
  else t(72,465,'No readings available for this period',31,'#d3bbbc',500);
 }else if(d.type==='comparison'){
  const names=d.rows.map(m=>m.a.name);
  t(72,441,`${names.length} ACCOUNTS COMPARED`,22,'#d3bbbc',800);
  const label=names.join('  •  ');
  let sz=31;while(sz>20){c.font=`700 ${sz}px Arial,sans-serif`;if(c.measureText(label).width<1045)break;sz-=1}
  if(sz>=22)t(72,496,label,sz,'#fff',700);
  else{const mid=Math.ceil(names.length/2);t(72,475,names.slice(0,mid).join('  •  ').slice(0,62),27,'#fff',700);t(72,521,names.slice(mid).join('  •  ').slice(0,62),27,'#fff',700)}
 }else{
  const category=rb('rbCategory').value;
  t(72,462,category==='all'?'All Categories':category,37,'#fff',800);
  t(72,509,`${d.rows.length} tracked accounts · ${rb('rbAffiliation').selectedOptions[0]?.textContent||'All affiliations'}`,25,'#d3bbbc',500);
 }
 const summary=(typeof postState!=='undefined'&&postState.snapshotsAvailable)?rbPeriodPostSummaries(d):[];
 const eligibleRate=summary.filter(r=>r.likeN>=5&&r.likeRate!==null).sort((a,b)=>b.likeRate-a.likeRate),postCount=summary.reduce((n,r)=>n+r.total,0);
 const metrics=d.type==='individual'?[['FOLLOWERS',primary&&primary.end!==null?fmt(primary.end):'—'],['RECORDED GAIN',rbSigned(primary?.gain??null)],['OBSERVED GROWTH',rbPct(primary?.pct??null)],['POSTS IN PERIOD',summary.length?fmt(postCount):'—']]
 :[['ACCOUNTS',String(d.rows.length)],['LARGEST FOLLOWING',top?fmt(top.end):'—'],['RECORDED POSTS',summary.length?fmt(postCount):'—'],['TOP ELIGIBLE LIKE RATE',eligibleRate.length?aqPercent(eligibleRate[0].likeRate):'—']];
 metrics.forEach(([label,value],i)=>{const x=72+(i%2)*545,y=584+Math.floor(i/2)*235;panel(x,y,511,205);t(x+27,y+57,label,23,'#d6ddf0',800);let fontSize=String(value).length>13?32:String(value).length>8?43:62;t(x+27,y+151,value,fontSize,'#fff',800)});
 t(72,1110,d.type==='individual'?'FOLLOWER HISTORY':'PERFORMANCE COMPARISON',29,'#d6ddf0',800);
 let graphed=d.rows.filter(r=>r.r.length>=2).slice(0,5),vals=graphed.flatMap(m=>m.r.map(p=>p.followers)),times=graphed.flatMap(m=>m.r.map(p=>p.time));if(graphed.length){let min=Math.min(...vals),max=Math.max(...vals),t0=Math.min(...times),t1=Math.max(...times);if(min===max){min--;max++}if(t0===t1)t1+=86400000;
 const x0=95,y0=1173,ww=1005,hh=222;c.strokeStyle='#ffffff35';c.lineWidth=1;for(let i=0;i<4;i++){c.beginPath();c.moveTo(x0,y0+i*hh/3);c.lineTo(x0+ww,y0+i*hh/3);c.stroke()};graphed.forEach((m,i)=>{c.strokeStyle=['#faad9d','#b9dbfa','#f2d39c','#b8e1c2','#d5b7ff'][i];c.lineWidth=7;c.lineJoin='round';c.beginPath();m.r.forEach((p,j)=>{let x=x0+ww*(p.time-t0)/(t1-t0),y=y0+hh*(max-p.followers)/(max-min);j?c.lineTo(x,y):c.moveTo(x,y)});c.stroke()})}
 else t(72,1260,'Insufficient historical data to chart.',32,'#c8d3e9',500);
 const label=d.type==='individual'?'1 ACCOUNT':d.type==='comparison'?`${d.rows.length} ACCOUNTS COMPARED`:`${d.rows.length} ACCOUNTS ANALYZED`;
 const cpSummaries=(typeof postState!=='undefined'&&postState.snapshotsAvailable)?rbPeriodPostSummaries(d):[];
 if(cpSummaries.length){
  const count=cpSummaries.reduce((sum,p)=>sum+p.total,0);t(72,1414,`POSTS IN THIS PERIOD: ${fmt(count)} RECORDED`,20,'#d7e3f6',650);
  if(d.type==='comparison'){
   const n=cpSummaries.filter(p=>p.likeN>=5&&p.likeRate!==null).sort((a,b)=>b.likeRate-a.likeRate),top=n[0];
   t(72,1450,top?`TOP ELIGIBLE LIKE RATE: ${top.a.name.slice(0,26)} · ${top.likeRate.toFixed(2)}%`:'NOT ENOUGH POSTS TO RANK LIKE RATE FAIRLY',18,'#d7e3f6',600);
  }
 }else t(72,1414,'Post analytics unavailable for this period.',20,'#d7e3f6',500);t(72,1480,label,27,'#d7e3f6',700);t(1128,1480,'RECORDED PUBLIC METRICS',23,'#dfbcc0',700,'right');
 return cv}
function rbRender(){const error=rbValidate();if(error){rb('rbStatus').textContent=error;return}rbLast=rbDataset();rb('rbPlaceholder').hidden=true;const detailed=rbLast.format==='detailed';rb('rbDetailed').hidden=!detailed;rb('rbInfographic').hidden=detailed;rb('rbPrint').disabled=false;rb('rbPNG').disabled=detailed;if(detailed)rb('rbDetailed').innerHTML=rbDetailedHTML(rbLast);else rbInfographicDraw(rbLast);rb('rbStatus').textContent=`Ready: ${rbLast.rows.length} account${rbLast.rows.length===1?'':'s'} · ${rbLast.window.label}. ${rbLast.rows.every(m=>!m.coverage)?'Historical growth is unavailable for this period.':''}`;rbHeadline();rb('rbPreviewType').textContent+=` · ${rbLast.window.label}`;rb('rbPlaceholder').closest('.builder-output').scrollIntoView({behavior:'smooth',block:'start'})}
function rbSavePNG(){if(!rbLast||rbLast.format!=='summary')return;const a=document.createElement('a');a.href=rb('rbCanvas').toDataURL('image/png');a.download=`Biberty-${rbLast.type}-summary.png`;document.body.appendChild(a);a.click();a.remove()}
function rbPrint(){
 if(!rbLast){rb('rbStatus').textContent='Generate a preview first.';return}
 // Printing a Wix embed can target the parent editor rather than the dashboard iframe.
 // Open a standalone print document instead. Do not inherit the legacy global print CSS.
 const win=window.open('','_blank');
 if(!win){rb('rbStatus').textContent='Your browser blocked the report tab. Allow pop-ups for this site and try again.';return}
 const cssURL=new URL('report-builder.css',document.baseURI).href;
 const reportHTML=rbLast.format==='detailed'?rb('rbDetailed').innerHTML:
  `<div class="rb-print-summary"><img alt="Biberty Analytics summary" src="${rb('rbCanvas').toDataURL('image/png')}"></div>`;
 const title='The Biberty Bee — '+(rbLast.type==='individual'?'Account Performance':rbLast.type==='comparison'?'Account Comparison':'Leaderboard')+' Report';
 win.document.open();
 win.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><link rel="stylesheet" href="${cssURL}"><style>
 @page{size:A4;margin:12mm}
 *,*:before,*:after{box-sizing:border-box}
 html,body{margin:0;padding:0;background:#e6e9f1;color:#172451;font:14px/1.5 Arial,sans-serif}
 .print-toolbar{position:sticky;top:0;z-index:10;background:#101a50;color:white;padding:13px 24px;display:flex;justify-content:space-between;align-items:center;gap:12px;font:13px Arial,sans-serif}
 .print-toolbar button{border:0;background:#fff;color:#101a50;padding:10px 18px;border-radius:5px;font-weight:700;cursor:pointer}
 .print-body{max-width:210mm;background:white;margin:18px auto;box-shadow:0 8px 35px #101a5028}
 .rb-document{box-shadow:none}.rb-document-cover{min-height:252mm;break-after:page;page-break-after:always;padding:18mm 13mm!important;print-color-adjust:exact;-webkit-print-color-adjust:exact}
 .rb-document-content{padding:12mm}.rb-print-summary{padding:0}.rb-print-summary img{display:block;width:100%;height:auto;max-height:260mm;object-fit:contain}
 .rb-document,.rb-document-content,.rb-table-scroller{min-width:0!important;max-width:100%!important;box-sizing:border-box}
 .rb-report-table,.rb-content-table{table-layout:fixed!important;width:100%!important;min-width:0!important;max-width:100%!important;border-collapse:collapse}
 .rb-report-table th,.rb-report-table td{overflow-wrap:anywhere!important;white-space:normal!important;box-sizing:border-box!important;vertical-align:top;padding:6px 4px!important;font-size:9px!important;line-height:1.4}
 .rb-report-table th:first-child,.rb-report-table td:first-child{width:19%}
 .rb-content-table th:first-child,.rb-content-table td:first-child{width:18%}
 .rb-content-table th:last-child,.rb-content-table td:last-child{width:24%}
 .rb-table-scroller{overflow:visible!important;max-height:none!important;width:100%!important;min-width:0!important}
 @media print{html,body{background:white!important}.print-toolbar{display:none!important}.print-body{box-shadow:none!important;max-width:none!important;width:100%!important;margin:0!important}.rb-document-content{padding:0!important}.rb-document-cover{min-height:245mm!important}.rb-report-table tr,.rb-textpanel,.rb-kpis{break-inside:avoid}.rb-print-summary img{max-height:255mm}}
 </style></head><body><div class="print-toolbar"><span>Biberty Analytics Report</span><button type="button" onclick="window.print()">Print / Save as PDF</button></div><main class="print-body">${reportHTML}</main></body></html>`);
 win.document.close();win.focus();
 rb('rbStatus').textContent='Opened a full-size printable report in a new tab. Click Print / Save as PDF there.';
}
function initReportBuilder(){if(rbReady){rbPicker();return}rbReady=true;const latest=state.history.length?Math.max(...state.history.map(p=>p.time)):Date.now(),earliest=state.history.length?Math.min(...state.history.map(p=>p.time)):latest,yr=schoolYearOf(latest);
 rb('rbPeriod').innerHTML=`<option value="ytd">School Year to Date (${yr}–${String(yr+1).slice(-2)})</option>`+Array.from({length:7},(_,i)=>{const y=yr-i;return `<option value="${y}">${y}–${String(y+1).slice(-2)} Academic Year</option>`}).join('')+'<option value="multi">Multiple Academic Years</option><option value="custom">Custom Date Range</option><option value="all">All Available History</option>';
 for(const id of ['rbFromYear','rbToYear'])rb(id).innerHTML=Array.from({length:7},(_,i)=>{const y=yr-i;return `<option value="${y}">${y}–${String(y+1).slice(-2)}</option>`}).join('');rb('rbFromYear').value=String(yr-1);rb('rbToYear').value=String(yr);
 rb('rbStart').value=new Date(earliest).toISOString().slice(0,10);rb('rbEnd').value=new Date(latest).toISOString().slice(0,10);
 rb('rbCategory').innerHTML='<option value="all">All Categories</option>'+[...new Set(state.accounts.flatMap(a=>a.categories||[a.category]))].sort().map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
 const bb=state.accounts.find(a=>a.handle==='thebibertybee')||state.accounts[0];if(bb)rbSelected.add(bb.handle);
 rb('rbAccountList').addEventListener('change',e=>{const t=e.target;if(t.tagName!=='INPUT')return;if(t.checked){if(rbType()==='individual')rbSelected.clear();rbSelected.add(t.value)}else rbSelected.delete(t.value);rbPicker();rb('rbStatus').textContent='Selections changed. Generate the preview to update your report.'});
 rb('rbSearch').addEventListener('input',rbPicker);document.querySelectorAll('input[name="rbType"]').forEach(x=>x.addEventListener('change',()=>{if(x.checked&&x.value==='individual'&&rbSelected.size>1){rbSelected=new Set([rbSelected.values().next().value])}rbPicker();rbHeadline()}));document.querySelectorAll('input[name="rbFormat"]').forEach(x=>x.addEventListener('change',rbHeadline));rb('rbPeriod').addEventListener('change',rbRefreshPeriod);
 rb('rbGenerate').onclick=rbRender;rb('rbPrint').onclick=rbPrint;rb('rbPNG').onclick=rbSavePNG;window.addEventListener('afterprint',()=>document.body.classList.remove('rb-print-active'));
 rbRefreshPeriod();rbHeadline();rbPicker();}
