"use strict";
// Public post-performance feeds. Data is independently refreshed from follower counts.
const postState={stats:[],top:[],snapshots:[],records:[],statsFeed:[],asOf:null,summaryAsOf:null,snapshotsAvailable:false,ready:false,failed:false,selectedList:'likes',audit:null,loadSeq:0};
const cpNum=v=>number(v);
const cpDate=v=>dateValue(v);
const cpField=(r,...names)=>pick(r,...names);
function cpFindAccount(record){
 const id=String(cpField(record,'Instagram user ID','Instagram User ID')||'').trim();
 const raw=String(cpField(record,'Account','Username')||'').trim();
 const handle=normalizeHandle(raw);
 if(id){const matches=state.accounts.filter(a=>a.instagramUserId&&a.instagramUserId===id);if(matches.length===1)return matches[0];if(matches.length>1)return null;
  // In partially migrated registries, accept an exact handle only if that account has no ID.
  const byHandle=state.accounts.filter(a=>!a.instagramUserId&&(a.handle===handle||(a.aliases||[]).includes(handle)));
  return byHandle.length===1?byHandle[0]:null;
 }
 const exact=state.accounts.filter(a=>a.handle===handle||(a.aliases||[]).includes(handle));
 if(exact.length===1)return exact[0];
 if(exact.length>1)return null;
 // Legacy source sheets sometimes use display names: only accept a unique exact match.
 const byName=state.accounts.filter(a=>a.name.toLowerCase()===raw.toLowerCase());
 return byName.length===1?byName[0]:null;
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
 return {a,posts30,posts7,likesPosts,commentsPosts,interactionN:0,avgLikes,avgComments,reportedEngagement:null,
  likes:cpCount(r,'Total likes'),comments:cpCount(r,'Total comments'),hidden:cpCount(r,'Posts with hidden likes'),
  cov,updated:cpField(r,'Last updated')||'',topUrl:cpValidUrl(cpField(r,'Top post URL')),topLikes:cpCount(r,'Top post likes')};
}
const cpMetric=x=>x===null?'—':fmt(x);
// Like Rate uses the same latest follower baseline as the weekly summary.
function cpLikeRate(s){return s&&s.likesPosts>0&&s.avgLikes!==null&&s.a.followers>0&&s.cov.name!=='Failed'?100*s.avgLikes/s.a.followers:null}
const cpPercent=x=>x===null?'—':x.toFixed(2)+'%';
const cpDecimal=x=>x===null?'—':Number(x).toLocaleString('en-US',{maximumFractionDigits:1});
function cpEngagement(s){
 // Do not use the source's combined independent averages as a paired-interaction rate.
 return s&&s.cov.name!=='Failed'&&s.interactionN>0&&Number.isFinite(s.reportedEngagement)?s.reportedEngagement:null;
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
function cpAccountRow(s){const e=cpEngagement(s);return `<tr><td><div class="cp-account">${avatar(s.a)}<span><b>${esc(s.a.name)}</b><small>@${esc(s.a.handle)}</small></span></div></td><td><strong>${cpMetric(s.posts30)}</strong><small>${s.posts7===null?'':'7d: '+fmt(s.posts7)}</small></td><td>${s.likesPosts>0?cpDecimal(s.avgLikes):'—'}<small>${s.likesPosts>0?'n='+fmt(s.likesPosts):'No available likes'}</small></td><td>${s.commentsPosts>0?cpDecimal(s.avgComments):'—'}<small>${s.commentsPosts>0?'n='+fmt(s.commentsPosts):'No available comments'}</small></td><td><strong>${cpPercent(cpLikeRate(s))}</strong><small>${s.likesPosts>0?'n='+fmt(s.likesPosts)+(s.likesPosts<5?' · Small sample — unranked':''):'No likes available'}</small></td><td><strong>${cpPercent(e)}</strong><small>${s.interactionN>0?'n='+fmt(s.interactionN)+(s.interactionN<5?' · Small sample':''):'Paired counts unavailable'}</small></td><td>${cpBadge(s.cov)}</td></tr>`}
function cpRender(){if(!postState.ready)return;
 const mode=$('cpSort').value,q=$('cpSearch').value.trim().toLowerCase(),category=$('cpCategory').value,allowPartial=$('cpPartial').checked;
 const rows=postState.stats.filter(s=>(allowPartial||s.cov.name==='Complete')&&accountHasCategory(s.a,category)&&(s.a.name.toLowerCase().includes(q)||s.a.handle.includes(q)))
  .sort((a,b)=>{
   const n=x=>mode==='comments'?x.commentsPosts:mode==='engagement'?x.interactionN:x.likesPosts;
   const eligibleRate=x=>x.cov.name==='Complete'&&n(x)>=5;
   const needsSample=['engagement','likeRate','likes','comments'].includes(mode);
   if(needsSample&&eligibleRate(a)!==eligibleRate(b))return eligibleRate(a)?-1:1;
   const av=cpAvailable(a,mode),bv=cpAvailable(b,mode);
   return (bv===null?-Infinity:bv)-(av===null?-Infinity:av)||a.a.name.localeCompare(b.a.name)
  });
 $('cpRows').innerHTML=rows.length?rows.map(cpAccountRow).join(''):'<tr><td colspan="7" class="cp-empty">No matching account statistics. Try another category or include partial coverage.</td></tr>';
 $('cpStatus').textContent=`${rows.length} accounts shown · 30-day window ending ${postState.asOf?new Date(postState.asOf).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'last update'} · Likes and comments reflect latest available snapshots${['engagement','likeRate','likes','comments'].includes(mode)?' · Complete accounts with ≥5 eligible posts ranked first':''}`;
 cpRenderPosts();cpRenderActivity();cpRenderHighlights();
}
function cpRenderHighlights(){const stats=postState.stats,eligible=stats.filter(s=>s.cov.name!=='Failed');
 const posts=eligible.reduce((n,s)=>n+(s.posts30||0),0);
 const topEng=eligible.filter(s=>s.interactionN>=5&&s.cov.name==='Complete'&&cpEngagement(s)!==null).sort((a,b)=>cpEngagement(b)-cpEngagement(a))[0];
 const mostActive=eligible.filter(s=>s.posts30!==null).sort((a,b)=>b.posts30-a.posts30)[0];
 const cards=[['Accounts Tracked',String(stats.length),'Post-performance summaries'],['Recorded Posts (30D)',fmt(posts),'Subject to coverage'],['Highest Observed Interaction Rate',topEng?cpEngagement(topEng).toFixed(2)+'%':'—',topEng?topEng.a.name+' · '+fmt(topEng.interactionN)+' paired samples':'No complete account with ≥5 eligible posts'],['Most Active Account',mostActive?mostActive.a.name:'—',mostActive?fmt(mostActive.posts30)+' posts in 30 days':'Insufficient data']];
 $('cpHighlights').innerHTML=cards.map(([title,value,sub])=>`<div class="cp-highlight"><small>${esc(title)}</small><strong>${esc(value)}</strong><span>${esc(sub)}</span></div>`).join('')}
function cpPostRecords(){return postState.snapshotsAvailable?postState.records:[]}
function cpSummariesForWindow(win,accounts=state.accounts){return postState.snapshotsAvailable?aqSummaries(postState.records,accounts,win,postState.asOf):[]}
function cpReconcile(){
 if(!postState.snapshotsAvailable||!Number.isFinite(postState.asOf))return;
 const summaries=cpSummariesForWindow(aqWindow(postState.asOf,30));
 postState.stats=summaries.map(m=>{
  const fed=postState.statsFeed.find(x=>x.a.handle===m.a.handle);
  let coverage=fed?fed.cov:cpCoverage('Unknown: account missing from weekly summary');
  // Compare counts only when the weekly summary and snapshot anchors are close enough.
  const fedTime=fed?cpDate(fed.updated):null;
  const samePeriod=Number.isFinite(fedTime)&&Math.abs(fedTime-postState.asOf)<=1.5*AQ_DAY;
  const disagreement=samePeriod&&fed.posts30!==null&&fed.posts30!==m.total;
  if(disagreement)coverage={name:'Partial',detail:`Source mismatch: ${m.total} unique snapshot posts vs ${fed.posts30} in weekly summary; verify coverage.`};
  else if(fed&&!samePeriod)coverage={name:coverage.name==='Complete'?'Unknown':coverage.name,detail:`Weekly summary and snapshots were checked at different times; coverage not independently confirmed. Source: ${coverage.detail}`};
  const latestAccount=m.latest;
  if(Number.isFinite(latestAccount)&&postState.asOf-latestAccount>9*AQ_DAY&&coverage.name==='Complete')coverage={name:'Unknown',detail:`Account's most recent post snapshot is over nine days older than the overall snapshot date. ${coverage.detail}`};
  const last=new Date(postState.asOf).toISOString();
  return {a:m.a,posts30:!fed||fed.cov.name!=='Failed'?m.total:null,posts7:!fed||fed.cov.name!=='Failed'?m.rows.filter(r=>r.posted>=postState.asOf-7*AQ_DAY).length:null,likesPosts:m.likeN,commentsPosts:m.commentN,interactionN:m.interactionN,avgLikes:m.avgLikes,avgComments:m.avgComments,reportedEngagement:m.engagement,likes:m.rows.reduce((s,p)=>s+(p.likes||0),0),comments:m.rows.reduce((s,p)=>s+(p.comments||0),0),hidden:m.missingLikes,cov:coverage,updated:last,topUrl:(m.rows.filter(r=>r.likes!==null).sort((a,b)=>b.likes-a.likes)[0]?.url)||null,topLikes:m.rows.reduce((max,r)=>Math.max(max,r.likes??0),0),fromSnapshots:true};
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
 if(['7','14','30','90'].includes(value)){const days=Number(value);return {from:now-days*86400000,to:now,label:`Last ${days} Days`}}
 if(value==='previous'){const d=new Date(now),start=Date.UTC(d.getUTCFullYear(),d.getUTCMonth()-1,1),end=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1);return {from:start,to:end-1,label:'Previous Calendar Month ('+new Date(start).toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'})+')'}};
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
 $('cpTopNote').textContent=`${win.label} · ${available.length.toLocaleString()} eligible posts · ${mode==='unique'?'One highest-ranked post per account':'Overall top posts'} · Ranked by latest recorded ${field==='likes'?'likes':'comments'}, not interactions gained during the publication window · Snapshot date: ${postState.asOf?new Date(postState.asOf).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'unknown'}`;
 $('cpTopPosts').innerHTML=selected.length?selected.map((p,i)=>{
  const likes=p.likes,comments=p.comments;
  const title=aqDisplayTitle(p),thumb=p.thumbnailUrl?`<img class="cp-post-thumbnail" loading="lazy" src="${esc(p.thumbnailUrl)}" alt="" referrerpolicy="no-referrer" onerror="this.hidden=true">`:'';
  return `<div class="cp-post"><span class="cp-post-rank">${i+1}</span>${thumb}<div class="cp-post-copy"><b>${esc(title)}</b><small>${esc(p.account.name)} · ${esc(new Date(p.postDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}))}</small><span>${likes===null?'Likes unavailable':fmt(likes)+' likes'} · ${comments===null?'Comments unavailable':fmt(comments)+' comments'}</span></div>${p.url?`<a data-instagram-link href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">Open post ↗</a>`:''}</div>`;
 }).join(''):'<p class="cp-empty">No recorded posts with available '+(field==='likes'?'likes':'comments')+' for this period.</p>';
 document.querySelectorAll('[data-post-list]').forEach(b=>b.classList.toggle('cp-active',b.dataset.postList===type));
}
function cpRenderActivity(){const entries=postState.stats.filter(s=>s.posts30!==null&&s.cov.name!=='Failed').sort((a,b)=>b.posts30-a.posts30).slice(0,8),max=Math.max(1,...entries.map(s=>s.posts30));
 $('cpActivity').innerHTML=entries.length?entries.map(s=>`<div class="cp-activity-row"><span>${esc(s.a.name)}</span><div class="cp-track"><i style="width:${Math.max(0,s.posts30/max*100)}%"></i></div><b>${fmt(s.posts30)}</b></div>`).join(''):'<p class="cp-empty">No verified posting data available.</p>'}
async function loadContentFeeds(){
 const seq=++postState.loadSeq;
 postState.ready=false;postState.failed=false;$('cpStatus').textContent='Updating recorded post metrics…';
 $('cpAudit').textContent='';
 const results=await Promise.allSettled(['Account Post Stats','Top Posts','Post Snapshots'].map(fetchTab));
 if(seq!==postState.loadSeq)return; // Ignore older refresh responses.
 const summaryOK=results[0].status==='fulfilled',snapOK=results[2].status==='fulfilled';
 if(!summaryOK&&!snapOK){postState.failed=true;$('cpStatus').textContent='Post data is temporarily unavailable. No interaction rates are being inferred.';$('cpRows').innerHTML='<tr><td colspan="7">Unable to load post metrics.</td></tr>';return}
 postState.statsFeed=summaryOK?results[0].value.map(cpStatsRow).filter(Boolean):[];
 postState.summaryAsOf=postState.statsFeed.reduce((max,s)=>Math.max(max,cpDate(s.updated)||0),0)||null;
 postState.stats=postState.statsFeed;
 postState.top=results[1].status==='fulfilled'?results[1].value:[];
 postState.snapshots=snapOK?results[2].value:[];
 postState.snapshotsAvailable=snapOK;
 if(snapOK){
  postState.audit=aqRecords(postState.snapshots,cpFindAccount,cpDate,cpNum,cpField,cpValidUrl);
  postState.records=postState.audit.posts;
  const validSnapshots=postState.records.map(p=>p.snapshot).filter(Number.isFinite);
  const summaryTimes=postState.statsFeed.map(s=>cpDate(s.updated)).filter(Number.isFinite);
  postState.asOf=validSnapshots.reduce((max,t)=>Math.max(max,t),0)||null;
  if(!postState.asOf){postState.snapshotsAvailable=false;postState.records=[];postState.stats=postState.statsFeed;postState.asOf=postState.summaryAsOf;}
  cpReconcile();
 }else{
  postState.records=[];postState.asOf=postState.summaryAsOf;
  $('cpAudit').textContent='Detailed post snapshots could not be loaded. Rankings use the weekly summary feed; historical Top Posts and post-by-post charts are unavailable.';
 }
 postState.ready=true;
 const categorySel=$('cpCategory'),old=categorySel.value;
 categorySel.innerHTML='<option value="all">All Categories</option>'+categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
 categorySel.value=[...categorySel.options].some(o=>o.value===old)?old:'all';
 const freshness=aqFreshness(postState.asOf,Date.now(),9);
 $('cpUpdated').textContent=postState.asOf?`Post snapshots: ${freshness.text}${postState.summaryAsOf?' · Weekly summary: '+new Date(postState.summaryAsOf).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):''}`:'Post update date unavailable';
 $('cpUpdated').dataset.freshness=freshness.status;
 if(!postState.snapshotsAvailable)$('cpStatus').textContent='Detailed snapshots unavailable · Weekly summary only. Paired interaction rates cannot be verified.';
 cpRender();if(typeof renderCompare==='function')renderCompare();if(typeof renderPulse==='function'&&state.loaded)renderPulse();
}
for(const id of ['cpSort','cpCategory','cpSearch','cpPartial'])document.getElementById(id).addEventListener('input',cpRender);
document.querySelectorAll('[data-post-list]').forEach(b=>b.addEventListener('click',()=>{postState.selectedList=b.dataset.postList;cpRenderPosts()}));

for(const id of ['cpPostPeriod','cpPostMode'])document.getElementById(id).addEventListener('change',cpRenderPosts);

// Distinct first-class subviews so Top Posts and Activity are never buried below a long table.
function cpShowPanel(which){if(!['overview','posts','activity'].includes(which))which='overview';
 for(const [name,id,btn] of [['overview','cpPanelOverview','cpTabOverview'],['posts','cpPanelPosts','cpTabPosts'],['activity','cpPanelActivity','cpTabActivity']]){const on=name===which;$(id).hidden=!on;$(btn).classList.toggle('cp-page-active',on);$(btn).setAttribute('aria-selected',String(on));$(btn).tabIndex=on?0:-1}
}
document.querySelectorAll('[data-cp-page]').forEach(b=>{b.addEventListener('click',()=>cpShowPanel(b.dataset.cpPage));b.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){const names=['overview','posts','activity'],index=names.indexOf(b.dataset.cpPage),next=names[(index+(e.key==='ArrowRight'?1:2))%3];cpShowPanel(next);document.querySelector('[data-cp-page="'+next+'"]').focus();e.preventDefault()}})});

// Curated, evidence-grounded post highlights for The Pulse.
function cpPulseHotPosts(){
 if(!postState.ready||!postState.snapshotsAvailable||!Number.isFinite(postState.asOf))return [];
 if(Date.now()-postState.asOf>9*86400000||postState.asOf-Date.now()>86400000)return [];
 const cutoff=postState.asOf-14*86400000;
 const eligible=postState.records.filter(p=>p.a&&p.a.inRankings!==false&&p.postDate>=cutoff&&p.postDate<=postState.asOf&&p.url);
 const likes=eligible.filter(p=>p.likes!==null).sort((a,b)=>b.likes-a.likes||b.postDate-a.postDate)[0];
 const comments=eligible.filter(p=>p.comments!==null&&!(likes&&p.account.handle===likes.account.handle&&p.id===likes.id)).sort((a,b)=>b.comments-a.comments||b.postDate-a.postDate)[0];
 return [{post:likes,metric:'likes',label:'HOT POST · LAST 14 DAYS'},{post:comments,metric:'comments',label:'MOST COMMENTED · LAST 14 DAYS'}].filter(x=>x.post&&x.post[x.metric]>0);
}
