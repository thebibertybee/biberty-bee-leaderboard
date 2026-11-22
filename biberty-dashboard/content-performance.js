"use strict";
// Public post-performance feeds. Data is independently refreshed from follower counts.
const postState={stats:[],top:[],snapshots:[],records:[],statsFeed:[],asOf:null,snapshotsAvailable:false,ready:false,failed:false,selectedList:'likes',audit:null};
const cpNum=v=>number(v);
const cpDate=v=>dateValue(v);
const cpField=(r,...names)=>pick(r,...names);
function cpFindAccount(record){
 const id=String(cpField(record,'Instagram user ID','Instagram User ID')||'').trim();
 const raw=String(cpField(record,'Account','Username')||'').trim();
 const handle=normalizeHandle(raw), k=key(raw);
 return state.accounts.find(a=>a.instagramUserId&&id&&a.instagramUserId===id)
   ||state.accounts.find(a=>a.handle===handle)
   ||state.accounts.find(a=>key(a.name)===k)
   ||state.accounts.find(a=>key(a.handle)===k) ||null;
}
function cpCoverage(value){const txt=String(value||'Unknown');return {name:/^complete/i.test(txt)?'Complete':/^partial/i.test(txt)?'Partial':/^failed/i.test(txt)?'Failed':'Unknown',detail:txt};}
function cpValidUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&/^(www\.)?instagram\.com$/.test(u.hostname)?u.href:null}catch{return null}}
function cpCount(r,keyName){return cpNum(cpField(r,keyName))}
function cpStatsRow(r){
 const a=cpFindAccount(r);if(!a)return null;
 const likesPosts=cpCount(r,'Posts in likes average');const commentsPosts=cpCount(r,'Posts in comments average');
 const avgLikes=cpCount(r,'Average likes per post'),avgComments=cpCount(r,'Average comments per post');
 const posts30=cpCount(r,'Posts in last 30 days'),posts7=cpCount(r,'Posts in last 7 days');
 const cov=cpCoverage(cpField(r,'Coverage'));
 const reportedEngagement=cpNum(cpField(r,'Engagement rate (estimate) %','Engagement rate estimate'));
 return {a,posts30,posts7,likesPosts,commentsPosts,avgLikes,avgComments,reportedEngagement,
  likes:cpCount(r,'Total likes'),comments:cpCount(r,'Total comments'),hidden:cpCount(r,'Posts with hidden likes'),
  cov,updated:cpField(r,'Last updated')||'',topUrl:cpValidUrl(cpField(r,'Top post URL')),topLikes:cpCount(r,'Top post likes')};
}
const cpMetric=x=>x===null?'—':fmt(x);
// Like Rate uses the same latest follower baseline as the weekly summary.
function cpLikeRate(s){return s&&s.likesPosts>0&&s.avgLikes!==null&&s.a.followers>0&&s.cov.name!=='Failed'?100*s.avgLikes/s.a.followers:null}
const cpPercent=x=>x===null?'—':x.toFixed(2)+'%';
const cpDecimal=x=>x===null?'—':Number(x).toLocaleString('en-US',{maximumFractionDigits:1});
function cpEngagement(s){ // Only use reported estimates if at least one eligible sample in each average.
 if(!s||!(s.likesPosts>0)||!(s.commentsPosts>0)||s.cov.name==='Failed')return null;
 // Use the feed's own published estimate to preserve Muse's source calculation.
 return s.reportedEngagement;
}
function cpAvailable(s,mode){if(!s||s.cov.name==='Failed')return null;
 if(mode==='engagement')return cpEngagement(s);
 if(mode==='likeRate')return cpLikeRate(s);
 if(mode==='likes')return s.likesPosts>0?s.avgLikes:null;
 if(mode==='comments')return s.commentsPosts>0?s.avgComments:null;
 if(mode==='activity')return s.posts30;
 if(mode==='followers')return s.a.followers;
 return null;}
function cpBadge(c){return `<span class="cp-coverage cp-${c.name.toLowerCase()}" title="${esc(c.detail)}">${esc(c.name)}</span>`}
function cpAccountRow(s){const e=cpEngagement(s);return `<tr><td><div class="cp-account">${avatar(s.a)}<span><b>${esc(s.a.name)}</b><small>@${esc(s.a.handle)}</small></span></div></td><td><strong>${cpMetric(s.posts30)}</strong><small>${s.posts7===null?'':'7d: '+fmt(s.posts7)}</small></td><td>${s.likesPosts>0?cpDecimal(s.avgLikes):'—'}<small>${s.likesPosts>0?'n='+fmt(s.likesPosts):'No available likes'}</small></td><td>${s.commentsPosts>0?cpDecimal(s.avgComments):'—'}<small>${s.commentsPosts>0?'n='+fmt(s.commentsPosts):'No available comments'}</small></td><td><strong>${cpPercent(cpLikeRate(s))}</strong><small>${s.likesPosts>0?'n='+fmt(s.likesPosts)+(s.likesPosts<5?' · Small sample — unranked':''):'No likes available'}</small></td><td><strong>${cpPercent(e)}</strong><small>${s.likesPosts>0&&s.likesPosts<5?'Small sample — unranked':'Estimated, not Insights'}</small></td><td>${cpBadge(s.cov)}</td></tr>`}
function cpRender(){if(!postState.ready)return;
 const mode=$('cpSort').value,q=$('cpSearch').value.trim().toLowerCase(),category=$('cpCategory').value,allowPartial=$('cpPartial').checked;
 const rows=postState.stats.filter(s=>(allowPartial||s.cov.name==='Complete')&&accountHasCategory(s.a,category)&&(s.a.name.toLowerCase().includes(q)||s.a.handle.includes(q)))
  .sort((a,b)=>{
   const n=x=>mode==='comments'?x.commentsPosts:x.likesPosts;
   const eligibleRate=x=>x.cov.name==='Complete'&&n(x)>=5;
   const needsSample=['engagement','likeRate','likes','comments'].includes(mode);
   if(needsSample&&eligibleRate(a)!==eligibleRate(b))return eligibleRate(a)?-1:1;
   const av=cpAvailable(a,mode),bv=cpAvailable(b,mode);
   return (bv===null?-Infinity:bv)-(av===null?-Infinity:av)||a.a.name.localeCompare(b.a.name)
  });
 $('cpRows').innerHTML=rows.length?rows.map(cpAccountRow).join(''):'<tr><td colspan="7" class="cp-empty">No matching account statistics. Try another category or include partial coverage.</td></tr>';
 $('cpStatus').textContent=`${rows.length} accounts shown · 30-day period ending ${postState.asOf?new Date(postState.asOf).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'last update'} · Likes and comments reflect latest snapshots${['engagement','likeRate','likes','comments'].includes(mode)?' · Complete accounts with ≥5 eligible posts ranked first':''}`;
 cpRenderPosts();cpRenderActivity();cpRenderHighlights();
}
function cpRenderHighlights(){const stats=postState.stats,eligible=stats.filter(s=>s.cov.name!=='Failed');
 const posts=eligible.reduce((n,s)=>n+(s.posts30||0),0);
 const topEng=eligible.filter(s=>s.likesPosts>=5&&s.commentsPosts>=5&&s.cov.name==='Complete'&&cpEngagement(s)!==null).sort((a,b)=>cpEngagement(b)-cpEngagement(a))[0];
 const mostActive=eligible.filter(s=>s.posts30!==null).sort((a,b)=>b.posts30-a.posts30)[0];
 const cards=[['Accounts Tracked',String(stats.length),'Post-performance summaries'],['Recorded Posts (30D)',fmt(posts),'Subject to coverage'],['Highest Estimated Engagement',topEng?cpEngagement(topEng).toFixed(2)+'%':'—',topEng?topEng.a.name+' · '+fmt(topEng.likesPosts)+' like samples':'No complete account with ≥5 eligible posts'],['Most Active Account',mostActive?mostActive.a.name:'—',mostActive?fmt(mostActive.posts30)+' posts in 30 days':'Insufficient data']];
 $('cpHighlights').innerHTML=cards.map(([title,value,sub])=>`<div class="cp-highlight"><small>${esc(title)}</small><strong>${esc(value)}</strong><span>${esc(sub)}</span></div>`).join('')}
function cpPostRecords(){return postState.snapshotsAvailable?postState.records:[]}
function cpSummariesForWindow(win,accounts=state.accounts){return postState.snapshotsAvailable?aqSummaries(postState.records,accounts,win,postState.asOf):[]}
function cpReconcile(){
 if(!postState.snapshotsAvailable)return;
 const summaries=cpSummariesForWindow(aqWindow(postState.asOf,30));
 postState.stats=summaries.map(m=>{
  const fed=postState.statsFeed.find(x=>x.a.handle===m.a.handle);
  let coverage=fed?fed.cov:cpCoverage('Unknown: account missing from weekly summary');
  // Source coverage must be retained; any discrepancy is an additional warning.
  const disagreement=fed&&fed.posts30!==null&&fed.posts30!==m.total;
  if(disagreement)coverage={name:'Partial',detail:`Source mismatch: ${m.total} unique snapshot posts vs ${fed.posts30} in weekly summary; verify collection dates and 30-day window.`};
  const last=fed?.updated||new Date(postState.asOf).toISOString();
  return {a:m.a,posts30:fed&&fed.cov.name!=='Failed'?m.total:null,posts7:fed&&fed.cov.name!=='Failed'?m.rows.filter(r=>r.posted>=postState.asOf-7*AQ_DAY).length:null,likesPosts:m.likeN,commentsPosts:m.commentN,avgLikes:m.avgLikes,avgComments:m.avgComments,reportedEngagement:m.engagement,likes:m.rows.reduce((s,p)=>s+(p.likes||0),0),comments:m.rows.reduce((s,p)=>s+(p.comments||0),0),hidden:m.missingLikes,cov:coverage,updated:last,topUrl:(m.rows.filter(r=>r.likes!==null).sort((a,b)=>b.likes-a.likes)[0]?.url)||null,topLikes:Math.max(0,...m.rows.map(r=>r.likes||0)),fromSnapshots:true};
 });
 const nMismatch=postState.stats.filter(s=>/Source mismatch/i.test(s.cov.detail)).length;
 const ignored=postState.audit.rejected;
 $('cpAudit').innerHTML=`<b>Data check:</b> ${postState.records.length.toLocaleString('en-US')} unique recorded posts · ${new Date(postState.asOf).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})} snapshot reference date. ${nMismatch?`${nMismatch} account summaries need review; conflicting counts are flagged Partial.`:'Latest-30-day figures use a consistent snapshot window.'} ${ignored.unmatched||ignored.invalidDate||ignored.missingId?`Excluded source rows: ${ignored.unmatched} unmatched accounts, ${ignored.invalidDate} invalid dates, ${ignored.missingId} missing post IDs, ${ignored.failedStatus} failed-status rows.`:''}`;
}
function cpOldPostRecords(){
 const unique=new Map();
 for(const r of postState.snapshots){
  const account=cpFindAccount(r);if(!account)continue;
  const id=String(cpField(r,'Post ID')||cpField(r,'Post URL')||'').trim();if(!id)continue;
  const postDate=cpDate(cpField(r,'Post date'));if(!Number.isFinite(postDate))continue;
  const snapshot=cpDate(cpField(r,'Snapshot date'));if(!Number.isFinite(snapshot))continue;
  const k=account.handle+'|'+id;
  let obj=unique.get(k);
  if(!obj){obj={account,id,postDate,snapshot:-Infinity,likes:null,comments:null,likesDate:-Infinity,commentsDate:-Infinity,url:null,media:'Post'};unique.set(k,obj)}
  const likes=cpNum(cpField(r,'Likes')),comments=cpNum(cpField(r,'Comments'));
  if(snapshot>=obj.snapshot){obj.postDate=postDate;obj.snapshot=snapshot;obj.url=cpValidUrl(cpField(r,'Post URL'))||obj.url;obj.media=String(cpField(r,'Media type')||'Post')}
  if(likes!==null&&snapshot>=obj.likesDate){obj.likes=likes;obj.likesDate=snapshot}
  if(comments!==null&&snapshot>=obj.commentsDate){obj.comments=comments;obj.commentsDate=snapshot}
 }
 return [...unique.values()];
}
function cpPostWindow(value){
 const now=postState.asOf||Date.now();if(value==='all')return {from:-Infinity,to:Infinity,label:'All Recorded Posts'};
 if(value==='30')return {from:now-30*86400000,to:now,label:'Last 30 Days'};
 const year=Number(value);return {from:new Date(year,7,1).getTime(),to:new Date(year+1,7,1).getTime()-1,label:`${year}–${String(year+1).slice(-2)} Academic Year`};
}
function cpRenderPosts(){
 if(!postState.snapshotsAvailable){$('cpTopNote').textContent='Detailed post snapshots are unavailable.';$('cpTopPosts').innerHTML='<p class="cp-empty">Top Posts cannot be verified until the snapshot feed is available.</p>';return}
 const type=postState.selectedList,period=$('cpPostPeriod').value,mode=$('cpPostMode').value,win=cpPostWindow(period);
 const field=type==='likes'?'likes':'comments';
 const available=cpPostRecords().filter(p=>p.postDate>=win.from&&p.postDate<=win.to&&p[field]!==null);
 available.sort((a,b)=>b[field]-a[field]||b.postDate-a.postDate||a.account.name.localeCompare(b.account.name));
 const seen=new Set(),selected=[];
 for(const p of available){if(mode==='unique'&&seen.has(p.account.handle))continue;seen.add(p.account.handle);selected.push(p);if(selected.length===10)break}
 $('cpTopNote').textContent=`${win.label} · ${available.length.toLocaleString()} eligible posts · ${mode==='unique'?'One highest-ranked post per account':'Overall top posts'} · Latest recorded counts`;
 $('cpTopPosts').innerHTML=selected.length?selected.map((p,i)=>{
  const likes=p.likes,comments=p.comments;
  return `<div class="cp-post"><span class="cp-post-rank">${i+1}</span><div><b>${esc(p.account.name)}</b><small>${esc(p.media)} · ${esc(new Date(p.postDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}))}</small><span>${likes===null?'Likes unavailable':fmt(likes)+' likes'} · ${comments===null?'Comments unavailable':fmt(comments)+' comments'}</span></div>${p.url?`<a data-instagram-link href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">Open post ↗</a>`:''}</div>`;
 }).join(''):'<p class="cp-empty">No recorded posts with available '+(field==='likes'?'likes':'comments')+' for this period.</p>';
 document.querySelectorAll('[data-post-list]').forEach(b=>b.classList.toggle('cp-active',b.dataset.postList===type));
}
function cpRenderActivity(){const entries=postState.stats.filter(s=>s.posts30!==null&&s.cov.name!=='Failed').sort((a,b)=>b.posts30-a.posts30).slice(0,8),max=Math.max(1,...entries.map(s=>s.posts30));
 $('cpActivity').innerHTML=entries.length?entries.map(s=>`<div class="cp-activity-row"><span>${esc(s.a.name)}</span><div class="cp-track"><i style="width:${Math.max(0,s.posts30/max*100)}%"></i></div><b>${fmt(s.posts30)}</b></div>`).join(''):'<p class="cp-empty">No verified posting data available.</p>'}
async function loadContentFeeds(){
 postState.ready=false;postState.failed=false;$('cpStatus').textContent='Updating recorded post metrics…';
 $('cpAudit').textContent='';
 const results=await Promise.allSettled(['Account Post Stats','Top Posts','Post Snapshots'].map(fetchTab));
 const summaryOK=results[0].status==='fulfilled',snapOK=results[2].status==='fulfilled';
 if(!summaryOK&&!snapOK){postState.failed=true;$('cpStatus').textContent='Post data is temporarily unavailable. No engagement figures are being estimated.';$('cpRows').innerHTML='<tr><td colspan="7">Unable to load post metrics.</td></tr>';return}
 postState.statsFeed=summaryOK?results[0].value.map(cpStatsRow).filter(Boolean):[];
 postState.stats=postState.statsFeed;
 postState.top=results[1].status==='fulfilled'?results[1].value:[];
 postState.snapshots=snapOK?results[2].value:[];
 postState.snapshotsAvailable=snapOK;
 if(snapOK){
  postState.audit=aqRecords(postState.snapshots,cpFindAccount,cpDate,cpNum,cpField,cpValidUrl);
  postState.records=postState.audit.posts;
  const validSnapshots=postState.records.map(p=>p.snapshot).filter(Number.isFinite);
  const summaryTimes=postState.statsFeed.map(s=>cpDate(s.updated)).filter(Number.isFinite);
  postState.asOf=Math.max(...validSnapshots,...summaryTimes,0)||Date.now();
  cpReconcile();
 }else{
  postState.records=[];postState.asOf=Math.max(...postState.statsFeed.map(s=>cpDate(s.updated)).filter(Number.isFinite),0)||null;
  $('cpAudit').textContent='Detailed post snapshots could not be loaded. Rankings use the weekly summary feed; historical Top Posts and post-by-post charts are unavailable.';
 }
 postState.ready=true;
 const categorySel=$('cpCategory'),old=categorySel.value;
 categorySel.innerHTML='<option value="all">All Categories</option>'+categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
 categorySel.value=[...categorySel.options].some(o=>o.value===old)?old:'all';
 $('cpUpdated').textContent=postState.asOf?'Recorded through '+new Date(postState.asOf).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'Weekly post analytics';
 cpRender();if(typeof renderCompare==='function')renderCompare();
}
for(const id of ['cpSort','cpCategory','cpSearch','cpPartial'])document.getElementById(id).addEventListener('input',cpRender);
document.querySelectorAll('[data-post-list]').forEach(b=>b.addEventListener('click',()=>{postState.selectedList=b.dataset.postList;cpRenderPosts()}));

for(const id of ['cpPostPeriod','cpPostMode'])document.getElementById(id).addEventListener('change',cpRenderPosts);
