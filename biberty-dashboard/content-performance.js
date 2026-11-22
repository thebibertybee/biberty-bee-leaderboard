"use strict";
// Public post-performance feeds. Data is independently refreshed from follower counts.
const postState={stats:[],top:[],snapshots:[],ready:false,failed:false,selectedList:'likes'};
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
function cpAvailable(s,mode){if(s.cov.name==='Failed')return null;
 if(mode==='engagement')return cpEngagement(s);
 if(mode==='likeRate')return cpLikeRate(s);
 if(mode==='likes')return s.likesPosts>0?s.avgLikes:null;
 if(mode==='comments')return s.commentsPosts>0?s.avgComments:null;
 if(mode==='activity')return s.posts30;
 if(mode==='followers')return s.a.followers;
 return null;}
function cpBadge(c){return `<span class="cp-coverage cp-${c.name.toLowerCase()}" title="${esc(c.detail)}">${esc(c.name)}</span>`}
function cpAccountRow(s){const e=cpEngagement(s);return `<tr><td><div class="cp-account">${avatar(s.a)}<span><b>${esc(s.a.name)}</b><small>@${esc(s.a.handle)}</small></span></div></td><td><strong>${cpMetric(s.posts30)}</strong><small>${s.posts7===null?'':'7d: '+fmt(s.posts7)}</small></td><td>${s.likesPosts>0?cpDecimal(s.avgLikes):'—'}<small>${s.likesPosts>0?'n='+fmt(s.likesPosts):'No available likes'}</small></td><td>${s.commentsPosts>0?cpDecimal(s.avgComments):'—'}<small>${s.commentsPosts>0?'n='+fmt(s.commentsPosts):'No available comments'}</small></td><td><strong>${cpPercent(cpLikeRate(s))}</strong><small>${s.likesPosts>0?'n='+fmt(s.likesPosts)+(s.likesPosts<5?' · Small sample':''):'No likes available'}</small></td><td><strong>${cpPercent(e)}</strong><small>${s.likesPosts>0&&s.likesPosts<5?'Small sample':'Estimated, not Insights'}</small></td><td>${cpBadge(s.cov)}</td></tr>`}
function cpRender(){if(!postState.ready)return;
 const mode=$('cpSort').value,q=$('cpSearch').value.trim().toLowerCase(),category=$('cpCategory').value,allowPartial=$('cpPartial').checked;
 const rows=postState.stats.filter(s=>(allowPartial||s.cov.name==='Complete')&&accountHasCategory(s.a,category)&&(s.a.name.toLowerCase().includes(q)||s.a.handle.includes(q)))
  .sort((a,b)=>{const av=cpAvailable(a,mode),bv=cpAvailable(b,mode);return (bv===null?-Infinity:bv)-(av===null?-Infinity:av)||a.a.name.localeCompare(b.a.name)});
 $('cpRows').innerHTML=rows.length?rows.map(cpAccountRow).join(''):'<tr><td colspan="7" class="cp-empty">No matching account statistics. Try another category or include partial coverage.</td></tr>';
 $('cpStatus').textContent=`${rows.length} accounts shown · Weekly post collection · Latest 30-day summary`;
 cpRenderPosts();cpRenderActivity();cpRenderHighlights();
}
function cpRenderHighlights(){const stats=postState.stats,eligible=stats.filter(s=>s.cov.name!=='Failed');
 const posts=eligible.reduce((n,s)=>n+(s.posts30||0),0);
 const topEng=eligible.filter(s=>cpEngagement(s)!==null).sort((a,b)=>cpEngagement(b)-cpEngagement(a))[0];
 const mostActive=eligible.filter(s=>s.posts30!==null).sort((a,b)=>b.posts30-a.posts30)[0];
 const cards=[['Accounts Tracked',String(stats.length),'Post-performance summaries'],['Recorded Posts (30D)',fmt(posts),'Subject to coverage'],['Highest Estimated Engagement',topEng?cpEngagement(topEng).toFixed(2)+'%':'—',topEng?topEng.a.name+' · '+fmt(topEng.likesPosts)+' like samples':'Insufficient data'],['Most Active Account',mostActive?mostActive.a.name:'—',mostActive?fmt(mostActive.posts30)+' posts in 30 days':'Insufficient data']];
 $('cpHighlights').innerHTML=cards.map(([title,value,sub])=>`<div class="cp-highlight"><small>${esc(title)}</small><strong>${esc(value)}</strong><span>${esc(sub)}</span></div>`).join('')}
function cpPostRecords(){
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
 const now=Date.now();if(value==='all')return {from:-Infinity,to:Infinity,label:'All Recorded Posts'};
 if(value==='30')return {from:now-30*86400000,to:now,label:'Last 30 Days'};
 const year=Number(value);return {from:new Date(year,7,1).getTime(),to:new Date(year+1,7,1).getTime()-1,label:`${year}–${String(year+1).slice(-2)} Academic Year`};
}
function cpRenderPosts(){
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
 postState.ready=false;$('cpStatus').textContent='Updating recorded post metrics…';
 // Optional secondary feeds must not block or invalidate the primary follower leaderboard.
 const names=['Account Post Stats','Top Posts','Post Snapshots'];
 const results=await Promise.allSettled(names.map(fetchTab));
 if(results[0].status!=='fulfilled'){
  postState.failed=true;$('cpStatus').textContent='Post-performance data is temporarily unavailable. Follower statistics remain available.';
  $('cpRows').innerHTML='<tr><td colspan="7">Unable to load post metrics. Try Refresh Data later.</td></tr>';return;
 }
 postState.stats=results[0].value.map(cpStatsRow).filter(Boolean);
 postState.top=results[1].status==='fulfilled'?results[1].value:[];
 // Snapshot data can be large; keep it available for future period-specific analyses.
 postState.snapshots=results[2].status==='fulfilled'?results[2].value:[];
 postState.ready=true;postState.failed=false;
 const categorySel=$('cpCategory'),old=categorySel.value;
 categorySel.innerHTML='<option value="all">All Categories</option>'+categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');categorySel.value=[...categorySel.options].some(o=>o.value===old)?old:'all';
 const when=postState.stats.map(s=>cpDate(s.updated)).filter(Number.isFinite);$('cpUpdated').textContent=when.length?'Latest update: '+new Date(Math.max(...when)).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'Weekly post analytics';
 cpRender();
}
for(const id of ['cpSort','cpCategory','cpSearch','cpPartial'])document.getElementById(id).addEventListener('input',cpRender);
document.querySelectorAll('[data-post-list]').forEach(b=>b.addEventListener('click',()=>{postState.selectedList=b.dataset.postList;cpRenderPosts()}));

for(const id of ['cpPostPeriod','cpPostMode'])document.getElementById(id).addEventListener('change',cpRenderPosts);
