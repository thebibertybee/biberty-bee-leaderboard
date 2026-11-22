'use strict';
const SHEET='1VWFA9Q0dGfzOgcVFeE_QXfAVbbRc27DRz__paehFrj8';
const feed=name=>`https://docs.google.com/spreadsheets/d/${SHEET}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`;
const $=id=>document.getElementById(id);
const state={accounts:[],history:[],loaded:false};
const fmt=n=>Number.isFinite(n)?Math.round(n).toLocaleString('en-US'):'—';
const number=x=>{if(x===null||x===undefined||String(x).trim()===''||/insufficient|n\/a|unavailable|failed|^—$|^-$|^null$/i.test(String(x)))return null;const v=Number(String(x).replace(/[,\s%+]/g,''));return Number.isFinite(v)?v:null};
const signed=n=>n===null?'—':(n>0?'+':'')+fmt(n);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]/g,'');
const pick=(o,...names)=>{for(const n of names){const k=key(n);if(Object.prototype.hasOwnProperty.call(o,k)&&o[k]!==undefined&&o[k]!=='')return o[k]}return null};
function parseCSV(src){src=src.replace(/^\uFEFF/,'');let rows=[],row=[],val='',quoted=false;for(let i=0;i<src.length;i++){let c=src[i];if(quoted){if(c==='"'&&src[i+1]==='"'){val+='"';i++}else if(c==='"')quoted=false;else val+=c}else if(c==='"')quoted=true;else if(c===','){row.push(val);val=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&src[i+1]==='\n')i++;row.push(val);if(row.some(x=>x.trim()))rows.push(row);row=[];val=''}else val+=c}row.push(val);if(row.some(x=>x.trim()))rows.push(row);if(!rows.length)return [];let headers=rows.shift().map(key);return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,(r[i]||'').trim()])))}
const normalizeHandle=s=>String(s||'').trim().replace(/^@/,'').toLowerCase();
function dateValue(x){if(!x)return null;let s=String(x).trim();let d=new Date(s);if(!isNaN(d))return d.getTime();const m=s.match(/Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)/);if(m)return new Date(+m[1],+m[2],+m[3],+(m[4]||0),+(m[5]||0),+(m[6]||0)).getTime();return null}
async function fetchTab(name){const r=await fetch(feed(name)+'&_='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error(`${name}: HTTP ${r.status}`);const t=await r.text();if(/^\s*<!doctype|^\s*<html|^\s*google\.visualization/i.test(t))throw Error(`${name}: Google returned an HTML page instead of CSV`);return parseCSV(t)}
function processData(leaderboard,accounts,history){const registry=new Map();for(const r of accounts){const handle=normalizeHandle(pick(r,'username','instagram username','handle','account username'));if(!handle)continue;registry.set(handle,{handle,name:pick(r,'display name','name','account name')||handle,followers:number(pick(r,'current follower count','followers','follower count','current followers')),updated:pick(r,'last successful update','last updated','timestamp'),include:pick(r,'include in rankings','include-in-rankings flag','include','ranked')})}let arr=[];for(const r of leaderboard){let handle=normalizeHandle(pick(r,'username','account','instagram username','handle','account username'));if(!handle)continue;let reg=registry.get(handle)||{};const followers=number(pick(r,'followers','follower count','current follower count','current followers'))??reg.followers;const rank=number(pick(r,'rank','current rank','ranking'));const entry={handle,name:reg.name||pick(r,'display name','name')||handle,followers,rank,gain24:number(pick(r,'24h growth','24 hour growth','24h follower growth','24h','daily growth','24h gain','24hr growth')),gain7:number(pick(r,'7d growth','7 day growth','7d follower growth','7d','weekly growth')),gain30:number(pick(r,'30d growth','30 day growth','30d follower growth','30d','monthly growth')),percent:number(pick(r,'24h percentage','24h percentage growth','24h growth %','24h percent','24h %','percentage growth','24h growth percentage')),updated:reg.updated||pick(r,'last updated','timestamp')};if(followers!==null)arr.push(entry)}if(!arr.length){arr=[...registry.values()].filter(a=>a.followers!==null).map(a=>({...a,gain24:null,gain7:null,gain30:null,percent:null,rank:null}))}arr.sort((a,b)=>b.followers-a.followers);arr.forEach((a,i)=>{if(a.rank===null)a.rank=i+1});const points=[];for(const r of history){const handle=normalizeHandle(pick(r,'username','account','instagram username','handle'));const followers=number(pick(r,'count','followers','follower count','exact follower count'));const time=dateValue(pick(r,'timestamp','date and time','date','measurement timestamp','recorded at','checked at'));const status=String(pick(r,'status','collection status')||'success').toLowerCase();if(handle&&followers!==null&&time!==null&&!/fail|error|unavailable/.test(status))points.push({handle,followers,time})}points.sort((a,b)=>a.time-b.time);return {arr,points}}

const photos={}; // Optional: "username":"avatars/username.jpg"
const palette=['#a52b27','#172a68','#247c80','#a36a28','#704e91','#387451','#bc5681','#526a8a','#b55d35','#456c64'];
const colorFor=h=>{let n=0;for(const c of h)n=(n*31+c.charCodeAt(0))>>>0;return palette[n%palette.length]};
const abbreviation=a=>(a.name||a.handle).replace(/[^a-zA-Z0-9 ]/g,' ').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'IG';
function avatar(a,extra=''){let c=colorFor(a.handle),src=photos[a.handle];return `<span class="avatar ${extra}" style="background:${c}">${src?`<img src="${esc(src)}" alt="" onerror="this.remove()">`:esc(abbreviation(a))}</span>`}
const growth=n=>n===null?'—':`<span class="${n<0?'loss':'gain'}">${n>0?'+':''}${fmt(n)}</span>`;
let selected=new Set(),selectionInitialized=false;
function renderCompareSelectors(){
 const a=$('compareA').value,b=$('compareB').value;
 const html=state.accounts.map(x=>`<option value="${esc(x.handle)}">${esc(x.name)}</option>`).join('');
 $('compareA').innerHTML=html;$('compareB').innerHTML=html;
 $('compareA').value=state.accounts.some(x=>x.handle===a)?a:state.accounts[0]?.handle||'';
 $('compareB').value=state.accounts.some(x=>x.handle===b)?b:state.accounts[1]?.handle||'';
 for(const side of ['A','B']){const chosen=state.accounts.find(x=>x.handle===$('compare'+side).value);$('compareSearch'+side).value=chosen?chosen.name+' (@'+chosen.handle+')':'';renderCompareOptions(side)}
}
function renderCompareOptions(side){
 const field=$('compareSearch'+side),panel=$('compareOptions'+side),q=field.value.trim().toLowerCase();
 const current=state.accounts.find(x=>x.handle===$('compare'+side).value);
 const currentLabel=current?current.name+' (@'+current.handle+')':'';
 const filtered=q===currentLabel.toLowerCase()?state.accounts:state.accounts.filter(a=>a.name.toLowerCase().includes(q)||a.handle.includes(q));
 panel.innerHTML=filtered.slice(0,70).map(a=>`<button type="button" class="compare-option" data-value="${esc(a.handle)}"><strong>${esc(a.name)}</strong><small>@${esc(a.handle)}</small></button>`).join('')||'<span class="compare-empty">No matching accounts</span>';
}
function chooseCompare(side,handle){
 const a=state.accounts.find(x=>x.handle===handle);if(!a)return;
 $('compare'+side).value=a.handle;$('compareSearch'+side).value=a.name+' (@'+a.handle+')';
 $('compareOptions'+side).hidden=true;renderCompare();renderCompareChart();
}
for(const side of ['A','B']){
 $('compareSearch'+side).addEventListener('focus',()=>{renderCompareOptions(side);$('compareOptions'+side).hidden=false});
 $('compareSearch'+side).addEventListener('input',()=>{renderCompareOptions(side);$('compareOptions'+side).hidden=false});
 $('compareSearch'+side).addEventListener('keydown',e=>{if(e.key==='Escape')$('compareOptions'+side).hidden=true;if(e.key==='Enter'){e.preventDefault();const first=$('compareOptions'+side).querySelector('button');if(first)chooseCompare(side,first.dataset.value)}});
 $('compareOptions'+side).addEventListener('click',e=>{const el=e.target.closest('button[data-value]');if(el)chooseCompare(side,el.dataset.value)});
}
document.addEventListener('click',e=>{for(const side of ['A','B']){if(!e.target.closest('#comparePicker'+side))$('compareOptions'+side).hidden=true}});

function renderCompare(){let a=state.accounts.find(x=>x.handle===$('compareA').value),b=state.accounts.find(x=>x.handle===$('compareB').value);if(!a||!b)return;const box=x=>`<div class="compbox"><div class="accountcell">${avatar(x)}<b>${esc(x.name)}</b></div><strong>${fmt(x.followers)}</strong><small>Rank #${x.rank} · 24h ${x.gain24===null?'—':signed(x.gain24)} · 7d ${x.gain7===null?'—':signed(x.gain7)}</small></div>`;$('compareResults').innerHTML=box(a)+box(b)+`<p class="compnote">${a.handle===b?'Choose two different accounts.':`${esc(a.followers>=b.followers?a.name:b.name)} leads by ${fmt(Math.abs(a.followers-b.followers))} followers.`}</p>`}
function renderChart(){const days=$('range').value,mode=$('chartMode').value,cutoff=days==='all'?-Infinity:Date.now()-Number(days)*86400000;let groups=[...selected].map(h=>{const a=state.accounts.find(x=>x.handle===h);if(!a)return null;const records=state.history.filter(p=>p.handle===h&&p.time>=cutoff).sort((a,b)=>a.time-b.time);if(!records.length)return null;const first=records[0].followers;return{a,color:colorFor(h),data:records.map(p=>({x:p.time,y:mode==='total'?p.followers:mode==='gain'?p.followers-first:first>0?(p.followers-first)/first*100:0,raw:p.followers}))}}).filter(Boolean);$('legend').innerHTML=groups.map(g=>`<span><i style="background:${g.color}"></i>${esc(g.a.name)}</span>`).join('');const all=groups.flatMap(g=>g.data);if(!all.length){$('chart').innerHTML='<div class="empty">No historical readings for these accounts in this time range. Try “All time” or choose other accounts.</div>';return}let minX=Math.min(...all.map(p=>p.x)),maxX=Math.max(...all.map(p=>p.x)),minY=Math.min(...all.map(p=>p.y)),maxY=Math.max(...all.map(p=>p.y));if(minX===maxX){minX-=43200000;maxX+=43200000}if(minY===maxY){minY-=5;maxY+=5}let padY=(maxY-minY)*.12;minY-=padY;maxY+=padY;const w=900,h=410,L=72,R=50,T=25,B=42,sx=x=>L+(x-minX)/(maxX-minX)*(w-L-R),sy=y=>T+(maxY-y)/(maxY-minY)*(h-T-B);let svg=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Historical follower trends">`;for(let i=0;i<=4;i++){let y=T+i*(h-T-B)/4;svg+=`<line class="gridline" x1="${L}" x2="${w-R}" y1="${y}" y2="${y}"/><text class="axis" x="${L-10}" y="${y+4}" text-anchor="end">${mode==='percent'?(maxY-(maxY-minY)*i/4).toFixed(1)+'%':fmt(maxY-(maxY-minY)*i/4)}</text>`}for(let i=0;i<=4;i++){let x=L+i*(w-L-R)/4;svg+=`<text class="axis" x="${x}" y="${h-12}" text-anchor="middle">${new Date(minX+(maxX-minX)*i/4).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</text>`}for(const g of groups){if(g.data.length>1)svg+=`<polyline points="${g.data.map(p=>sx(p.x)+','+sy(p.y)).join(' ')}" fill="none" stroke="${g.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;for(const p of g.data){svg+=`<circle cx="${sx(p.x)}" cy="${sy(p.y)}" r="3.5" fill="${g.color}"><title>@${esc(g.a.handle)} · ${fmt(p.raw)} followers · ${new Date(p.x).toLocaleString()}</title></circle>`}let last=g.data[g.data.length-1],cx=sx(last.x),cy=sy(last.y);svg+=`<circle cx="${cx}" cy="${cy}" r="14" fill="${g.color}" stroke="white" stroke-width="2"/><text x="${cx}" y="${cy+4}" fill="white" font-size="9" font-weight="bold" text-anchor="middle">${esc(abbreviation(g.a))}</text>`;if(photos[g.a.handle])svg+=`<defs><clipPath id="clip-${key(g.a.handle)}"><circle cx="${cx}" cy="${cy}" r="12"/></clipPath></defs><image href="${esc(photos[g.a.handle])}" x="${cx-12}" y="${cy-12}" width="24" height="24" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip-${key(g.a.handle)})"/>`}svg+='</svg>';$('chart').innerHTML=svg}

function renderCompareChart(){const a=$('compareA').value,b=$('compareB').value,range=$('compareRange').value;const previous=new Set(selected),oldRange=$('range').value,oldMode=$('chartMode').value;selected=new Set([a,b]);$('range').value=range;$('chartMode').value='total';renderChart();$('compareChart').innerHTML=$('chart').innerHTML;selected=previous;$('range').value=oldRange;$('chartMode').value=oldMode;renderChart()}
function latestTimestamp(){const t=state.history.map(p=>p.time);if(t.length)return Math.max(...t);const a=state.accounts.map(x=>dateValue(x.updated)).filter(x=>x!==null);return a.length?Math.max(...a):null}
// Categories are read from the sheet. Until classified, records are labeled Unclassified.
let categories=[];
function accountHasCategory(a,category){return category==='all'||(a.categories||[a.category]).includes(category)}
function splitCategories(raw){const items=String(raw||'').split(/[;|,\n]+/).map(x=>x.trim()).filter(Boolean);return [...new Set(items.length?items:['Unclassified'])]}

let visibleLimit=25;
function eligible(a,scope,category){return(scope==='all'||(scope==='official'?a.official===true:a.official===false))&&(accountHasCategory(a,category))}
function eligibleFor(prefix){return state.accounts.filter(a=>eligible(a,$(prefix+'Scope').value,$(prefix+'Category').value))}
function fillCategories(){for(const id of ['rankCategory','chartCategory']){let el=$(id);let value=el.value;el.innerHTML='<option value="all">All categories</option>'+categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');el.value=[...el.options].some(o=>o.value===value)?value:(categories.includes('Memes & Satire')?'Memes & Satire':'all');}}
function defaultSelection(){const top=eligibleFor('chart').slice(0,5).map(a=>a.handle);if(!top.includes('thebibertybee')&&state.accounts.some(a=>a.handle==='thebibertybee'))top.push('thebibertybee');return top}
function renderInsights(rows){const best=[...rows].filter(a=>a.gain7!==null).sort((a,b)=>b.gain7-a.gain7)[0];const near=rows.find(a=>a.handle==='thebibertybee');$('rankInsights').innerHTML=`<div class="insight"><strong>${rows.length}</strong><span>Accounts matching filters</span></div><div class="insight"><strong>${best?esc(best.name):'—'}</strong><span>Fastest recorded 7-day growth</span></div><div class="insight"><strong>${near?'#'+(rows.findIndex(a=>a.handle==='thebibertybee')+1):'—'}</strong><span>The Biberty Bee in this category</span></div>`}
function milestone(n){return [[20000,'double','Double Platinum','diamond-double'],[10000,'platinum','Platinum','diamond'],[5000,'gold','Gold','medal'],[2000,'silver','Silver','medal'],[750,'bronze','Bronze','medal']].find(x=>n>=x[0])||null}
function medalSVG(level,size=23){const kind=level[3],star=kind==='medal';return `<svg class="milestone-icon ${level[1]}" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><path d="${Array.from({length:32},(_,i)=>{let a=-Math.PI/2+i*Math.PI/16,r=i%2?26:29;return `${i?'L':'M'}${(32+Math.cos(a)*r).toFixed(2)},${(32+Math.sin(a)*r).toFixed(2)}`}).join(' ')} Z" fill="currentColor"/><circle cx="32" cy="32" r="21" fill="none" stroke="white" stroke-opacity=".75" stroke-width="1.6"/>${star?'<path d="M25 18 L29 27 M39 18 L35 27" stroke="white" stroke-width="2"/><path d="M32 24l3.1 7 7.5.8-5.6 5.2 1.5 7.4-6.5-3.7-6.5 3.7 1.5-7.4-5.6-5.2 7.5-.8Z" fill="white"/>':'<path d="M19 29l9-10h9l9 10-14 17Z M19 29h27 M28 19l4 10 5-10 M32 29v17" fill="none" stroke="white" stroke-width="2.2" stroke-linejoin="round"/>'}${kind==='diamond-double'?'<path d="M44 13l2.3 5 5.4 2.3-5.4 2.3-2.3 5-2.3-5-5.4-2.3 5.4-2.3Z" fill="white"/>':''}</svg>`}
function renderMilestoneLegend(){const items=[[750,'Bronze'],[2000,'Silver'],[5000,'Gold'],[10000,'Platinum'],[20000,'Double Platinum']];const el=$('milestoneLegend');if(!el)return;el.innerHTML='<span>Follower milestones:</span>'+items.map(([value,name])=>`<span class="milestone-entry" title="${name} — ${fmt(value)} followers">${medalSVG(milestone(value),22)}<span>${name} · ${value>=1000?(value/1000)+'K':value}</span></span>`).join('')}
function medal(n){const m=milestone(n);return m?`<span class="tier medal ${m[1]}" title="${m[2]} milestone · ${fmt(m[0])} followers" aria-label="${m[2]} milestone">${medalSVG(m)}</span>`:''}

function renderTable(){const q=$('search').value.toLowerCase(),sort=$('sort').value;const eligibleRows=eligibleFor('rank').sort((a,b)=>b.followers-a.followers);eligibleRows.forEach((a,i)=>a.visibleRank=i+1);const rows=eligibleRows.filter(a=>a.handle.includes(q)||a.name.toLowerCase().includes(q)).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):((b[sort]??-Infinity)-(a[sort]??-Infinity)));const shown=rows.slice(0,visibleLimit);$('rankingRows').innerHTML=shown.map(a=>`<tr><td class="rank">${a.visibleRank}</td><td><div class="accountcell">${avatar(a)}<div><b>${esc(a.name)} ${medal(a.followers)}</b><a href="https://www.instagram.com/${encodeURIComponent(a.handle)}/" target="_blank" rel="noopener noreferrer" data-instagram-link>@${esc(a.handle)} ↗</a></div></div></td><td class="right"><b>${fmt(a.followers)}</b></td><td class="right">${growth(a.gain24)}</td><td class="right">${growth(a.gain7)}</td><td class="right">${growth(a.gain30)}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">No matching accounts.</td></tr>';$('resultCount').textContent=`Showing ${shown.length} of ${rows.length} matching accounts · Recorded follower snapshots`;$('showMore').hidden=shown.length>=rows.length;renderInsights(eligibleRows)}
function renderChecks(){const q=$('filterAccounts').value.toLowerCase();const accounts=state.accounts.filter(a=>(eligible(a,$('chartScope').value,$('chartCategory').value)||selected.has(a.handle))&&(a.handle.includes(q)||a.name.toLowerCase().includes(q)));$('accountChecks').innerHTML=accounts.map(a=>`<label><input type="checkbox" data-handle="${esc(a.handle)}" ${selected.has(a.handle)?'checked':''}>${avatar(a)}<span>${esc(a.name)}${!eligible(a,$('chartScope').value,$('chartCategory').value)?' <small>(added)</small>':''}</span></label>`).join('');$('accountChecks').querySelectorAll('input').forEach(el=>el.addEventListener('change',()=>{el.checked?selected.add(el.dataset.handle):selected.delete(el.dataset.handle);renderChart()}));const opts=state.accounts.filter(a=>!eligible(a,$('chartScope').value,$('chartCategory').value)&&!selected.has(a.handle));$('addAccount').innerHTML='<option value="">Choose account…</option>'+opts.map(a=>`<option value="${esc(a.handle)}">${esc(a.name)} · ${esc(a.category)}</option>`).join('')}
function normalizeMeta(accountRows){
 const byHandle=new Map();
 for(const r of accountRows){
  const handle=normalizeHandle(pick(r,'username','instagram username','handle','account username'));
  if(!handle)continue;
  const rawCategory=pick(r,'category','account category','primary category','type','account type');
  const aff=String(pick(r,'affiliation','official affiliation','official/unofficial','is official','official lu','official')??'').trim().toLowerCase();
  const official=/^(yes|true|1|official|official lu|liberty university)$/.test(aff)?true:/^(no|false|0|unofficial|independent)$/.test(aff)?false:null;
  const picture=pick(r,'profile picture url','profile photo url','avatar url','profile image url','photo url');
  const cats=splitCategories(rawCategory);
  const displayName=pick(r,'dashboard display name','dashboard name','website display name');
  byHandle.set(handle,{category:cats[0],categories:cats,official,picture,displayName});
 }
 return byHandle;
}
function observedGain(handle,history,days){
 const points=history.filter(p=>p.handle===handle).sort((a,b)=>a.time-b.time);
 if(points.length<2)return null;
 const end=points.at(-1),target=end.time-days*86400000;
 // For daily snapshots, readings within a 1.5-day window are comparable.
 let prior=null,dist=Infinity;
 for(const p of points.slice(0,-1)){const d=Math.abs(p.time-target);if(d<dist){dist=d;prior=p}}
 if(!prior||dist>1.5*86400000)return null;
 return end.followers-prior.followers;
}
function dateLabel(time){return new Date(time).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})}
async function load(){
 $('connection').textContent='Updating live data…';$('connection').className='connection';$('notice').hidden=true;
 try{
  const [leaderboard,accountRows,historyRows]=await Promise.all([fetchTab('Leaderboard'),fetchTab('Accounts'),fetchTab('Follower History')]);
  const {arr,points}=processData(leaderboard,accountRows,historyRows);
  if(!arr.length)throw new Error('No usable account counts found in the Leaderboard or Accounts tabs. Check the Google Sheets sharing settings and column headers.');
  const meta=normalizeMeta(accountRows);
  state.history=points;
  state.accounts=arr.map(a=>{
   const m=meta.get(a.handle)||{};
   const gain24=a.gain24??observedGain(a.handle,points,1);
   const gain7=a.gain7??observedGain(a.handle,points,7);
   const gain30=a.gain30??observedGain(a.handle,points,30);
   if(m.picture&&(/^(https:\/\/|avatars\/)/.test(m.picture)))photos[a.handle]=m.picture;
   return {...a,name:m.displayName||(a.handle==='thebibertybee'?'The Biberty Bee':a.name),category:m.category||'Unclassified',categories:m.categories||['Unclassified'],official:m.official??null,gain24,gain7,gain30};
  });
  state.accounts.sort((a,b)=>b.followers-a.followers);state.accounts.forEach((a,i)=>a.rank=i+1);
  categories=[...new Set(state.accounts.flatMap(a=>a.categories||[a.category]))].sort();
  // Accounts without a stored category or affiliation must remain discoverable.
  if(!categories.includes('Memes & Satire'))$('rankCategory').value='all';
  for(const id of ['rankScope','chartScope'])$(id).value='all';
  fillCategories();renderMilestoneLegend();state.loaded=true;
  if(!selectionInitialized){selected=new Set(defaultSelection());selectionInitialized=true}
  renderTable();renderChecks();renderCompareSelectors();renderCompare();renderChart();renderCompareChart();
  initRecaps();initReportBuilder();loadContentFeeds();
  const latest=latestTimestamp();
  $('updated').textContent=(latest?'Latest recorded reading: '+dateLabel(latest):'Current follower counts; no usable historical readings')+' · '+state.accounts.length+' accounts';
  $('connection').textContent='Live data · Up to date';$('connection').className='connection good';
  if(!points.length){$('notice').textContent='Follower history is not yet available. Current counts work, but historical growth, reports, and recap achievements may be incomplete.';$('notice').hidden=false}
 }catch(err){
  console.error('Biberty Analytics feed error',err);
  $('connection').textContent='Live data unavailable';$('connection').className='connection';
  $('notice').textContent='Live follower data is temporarily unavailable. Please try Refresh Data shortly. No estimated numbers are displayed.';
  $('notice').hidden=false;
  $('updated').textContent='No verified readings loaded';
  $('rankingRows').innerHTML='<tr><td colspan="6" class="empty">Live data is currently unavailable.</td></tr>';
 }
}
// Each destination is its own navigation page and has a shareable # URL.
const validViews=new Set(['rankings','charts','compare','recaps','reports','content']);
function showPage(view){if(!validViews.has(view))view='rankings';document.querySelectorAll('.tab').forEach(b=>{const active=b.dataset.view===view;b.classList.toggle('active',active);b.setAttribute('aria-current',active?'page':'false')});document.querySelectorAll('.view').forEach(s=>s.hidden=s.id!==view);document.title=({rankings:'Rankings',charts:'Growth Charts',compare:'Compare',recaps:'Instagram Recaps',reports:'Reports',content:'Content Performance'}[view])+' | The Biberty Bee';}
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{const view=b.dataset.view;if(location.hash!=='#'+view)location.hash=view;else showPage(view);window.scrollTo(0,0)}));
window.addEventListener('hashchange',()=>showPage(location.hash.slice(1)));
showPage(location.hash.slice(1));
$('search').addEventListener('input',renderTable);$('sort').addEventListener('change',renderTable);$('filterAccounts').addEventListener('input',renderChecks);
for(const id of ['range','chartMode'])$(id).addEventListener('change',renderChart);
for(const id of ['compareA','compareB'])$(id).addEventListener('change',renderCompare);
$('defaults').onclick=()=>{selected=new Set(defaultSelection());renderChecks();renderChart()};
$('all').onclick=()=>{selected=new Set(state.accounts.map(a=>a.handle));renderChecks();renderChart()};
$('clear').onclick=()=>{selected.clear();renderChecks();renderChart()};
$('refresh').onclick=load;
for(const id of ['rankScope','rankCategory'])$(id).addEventListener('change',()=>{visibleLimit=25;renderTable()});
$('rankReset').onclick=()=>{$('rankScope').value='all';$('rankCategory').value=categories.includes('Memes & Satire')?'Memes & Satire':'all';$('search').value='';$('sort').value='followers';visibleLimit=25;renderTable()};
$('showMore').onclick=()=>{visibleLimit+=25;renderTable()};
for(const id of ['chartScope','chartCategory'])$(id).addEventListener('change',()=>{renderChecks();renderChart()});
$('addAccountButton').onclick=()=>{const h=$('addAccount').value;if(h){selected.add(h);renderChecks();renderChart()}};
for(const id of ['compareA','compareB','compareRange'])$(id).addEventListener('change',renderCompareChart);

// Recap builder: entirely client-side; no account login, server or tracking.
let currentSlide=0;
const ACADEMIC_START_MONTH=7; // August 1, local calendar
function schoolYearStart(y){return new Date(y,ACADEMIC_START_MONTH,1).getTime()}
function schoolYearOf(time){const d=new Date(time);return d.getFullYear()-(d.getMonth()<ACADEMIC_START_MONTH?1:0)}
function selectedWindow(){const v=$('recapPeriod').value,latest=state.history.length?Math.max(...state.history.map(p=>p.time)):Date.now();if(v==='all')return {from:-Infinity,to:Infinity,label:'All available history'};if(v==='ytd'){const y=schoolYearOf(latest);return {from:schoolYearStart(y),to:latest,label:`${y}–${String(y+1).slice(-2)} school year to date`}}if(v==='multi'){const from=Number($('recapFromYear').value),to=Number($('recapToYear').value);return {from:schoolYearStart(Math.min(from,to)),to:schoolYearStart(Math.max(from,to)+1)-1,label:`${Math.min(from,to)}–${Math.max(from,to)+1} academic years`}}const y=Number(v);return {from:schoolYearStart(y),to:schoolYearStart(y+1)-1,label:`${y}–${String(y+1).slice(-2)} academic year`}}
function recapRecords(a){const w=selectedWindow();return state.history.filter(x=>x.handle===a.handle&&x.time>=w.from&&x.time<=w.to).sort((x,y)=>x.time-y.time)}
function recapStats(a){const r=recapRecords(a),start=r[0]?.followers??null,end=r.at(-1)?.followers??null,gain=r.length>=2?end-start:null,pct=r.length>=2&&start>0?gain/start*100:null;const crossed=[];const tiers=[[750,'Bronze'],[2000,'Silver'],[5000,'Gold'],[10000,'Platinum'],[20000,'Double Platinum']];if(r.length>=2){for(const [threshold,name] of tiers){let hit=null;for(let i=1;i<r.length;i++){if(r[i-1].followers<threshold&&r[i].followers>=threshold){hit=r[i];break}}if(hit)crossed.push({threshold,name,time:hit.time})}}return {r,start,end,gain,pct,crossed,from:r.length?new Date(r[0].time).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'No readings',to:r.length?new Date(r.at(-1).time).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'No readings',label:selectedWindow().label}}
function initAcademicPeriods(){const latest=state.history.length?Math.max(...state.history.map(x=>x.time)):Date.now();const yr=schoolYearOf(latest),select=$('recapPeriod');select.innerHTML=`<option value="ytd">School Year to Date (${yr}–${String(yr+1).slice(-2)})</option>`+Array.from({length:6},(_,i)=>{let y=yr-i;return `<option value="${y}">${y}–${String(y+1).slice(-2)} Academic Year${i===0?' (in progress)':''}</option>`}).join('')+'<option value="multi">Multiple Academic Years</option><option value="all">All Available History</option>';select.value='ytd';for(const id of ['recapFromYear','recapToYear'])$(id).innerHTML=Array.from({length:6},(_,i)=>{let y=yr-i;return `<option value="${y}">${y}–${String(y+1).slice(-2)}</option>`}).join('');$('recapFromYear').value=String(yr-1);$('recapToYear').value=String(yr);$('recapMulti').hidden=true}
function currentRecapAccount(){return state.accounts.find(a=>a.handle===$('recapAccount').value)||state.accounts[0]}
function rr(ctx,text,x,y,font,color,align='left'){ctx.font=font;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(text,x,y)}
const bibertyBeeWatermark=new Image();
bibertyBeeWatermark.onload=()=>{if(document.getElementById('storyCanvas'))drawStory()};
bibertyBeeWatermark.src='biberty-bee-outline.png';

function storyNearRank(a,at){
 const w=selectedWindow(),pool=[];
 for(const other of state.accounts){const rows=state.history.filter(p=>p.handle===other.handle&&p.time>=w.from&&p.time<=w.to).sort((x,y)=>x.time-y.time);if(!rows.length)continue;const r=rows.reduce((best,p)=>Math.abs(p.time-at)<Math.abs(best.time-at)?p:best);if(Math.abs(r.time-at)>3*86400000)continue;pool.push({handle:other.handle,followers:r.followers})}
 const got=pool.find(p=>p.handle===a.handle);if(!got||pool.length<2)return null;
 return {rank:1+pool.filter(p=>p.followers>got.followers).length,total:pool.length};
}
function storyGrowthBuckets(a){const data=recapRecords(a);const months=new Map();for(const r of data){const d=new Date(r.time),key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');if(!months.has(key))months.set(key,[]);months.get(key).push(r)}return [...months.entries()].map(([key,rows])=>({key,label:new Date(key+'-01T12:00:00').toLocaleDateString('en-US',{month:'short',year:'2-digit'}),gain:rows.length>=2?rows.at(-1).followers-rows[0].followers:null}));}
function storyBestWindows(a){const rows=recapRecords(a),out={day:null,week:null,month:null};for(const [key,days] of [['day',1],['week',7],['month',30]]){for(let i=1;i<rows.length;i++){let prior=null;for(let j=i-1;j>=0;j--){const delta=rows[i].time-rows[j].time;if(delta>=days*86400000*.95){if(delta<=days*86400000*1.20)prior=rows[j];break}}if(prior){const gain=rows[i].followers-prior.followers;if(out[key]===null||gain>out[key].gain)out[key]={gain,time:rows[i].time,from:prior.time};}}}return out;}
function storyGrowthDateRange(item,kind){
 if(!item)return 'Insufficient observations';
 const end=new Date(item.time),start=new Date(item.from);
 if(kind==='day')return end.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
 const sameYear=start.getFullYear()===end.getFullYear(),sameMonth=sameYear&&start.getMonth()===end.getMonth();
 const begin=start.toLocaleDateString('en-US',{month:'short',day:'numeric',year:sameYear?undefined:'numeric'});
 const finish=end.toLocaleDateString('en-US',{month:sameMonth?undefined:'short',day:'numeric',year:'numeric'});
 return begin+' – '+finish;
}
function storyCompetitors(a){const w=selectedWindow();const seen=state.accounts.filter(x=>accountHasCategory(x,a.category)).map(x=>{const points=state.history.filter(p=>p.handle===x.handle&&p.time>=w.from&&p.time<=w.to).sort((u,v)=>u.time-v.time);return {a:x,ending:points.at(-1)?.followers??null,gain:points.length>=2?points.at(-1).followers-points[0].followers:null}}).filter(x=>x.ending!==null).sort((x,y)=>y.ending-x.ending);return seen;}

function drawStory(slide=currentSlide){
 const a=currentRecapAccount();if(!a)return;
 const s=recapStats(a),cv=$('storyCanvas'),c=cv.getContext('2d'),w=1080,h=1920,theme=$('recapTheme').value;
 const light=theme==='light', charcoal=theme==='charcoal';
 const bg1=light?'#fdfcf9':charcoal?'#16181e':theme==='red'?'#5c1528':'#0d1641';
 const bg2=light?'#e5eaf2':charcoal?'#414650':theme==='red'?'#a52b27':'#283e83';
 const ink=light?'#121d4e':'#ffffff',sub=light?'#5b6580':'#c8d3ee',accent=charcoal?'#e0b2a7':theme==='red'?'#ffd5a1':'#f0b6aa';
 const grad=c.createLinearGradient(0,0,920,1920);grad.addColorStop(0,bg1);grad.addColorStop(.57,bg2);grad.addColorStop(1,bg1);c.fillStyle=grad;c.fillRect(0,0,w,h);
 // Soft gradient glows, clipped by the canvas.
 function glow(x,y,r,color){let g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2)}
 glow(1050,460,660,light?'#a9c2ec55':charcoal?'#9b9fac24':'#e9879a2c');glow(-100,1600,690,light?'#e7a6a52f':charcoal?'#7479872b':'#658edb35');
 c.strokeStyle=light?'#b7c4da66':'#ffffff20';c.lineWidth=2;
 // Monochrome outline traced from the original Biberty Bee artwork; no filled colors.
 if(bibertyBeeWatermark.complete && bibertyBeeWatermark.naturalWidth){
  c.save();
  if(light){
   // Recolor the original transparent outline to dark navy for contrast on paper.
   const mask=document.createElement('canvas');mask.width=bibertyBeeWatermark.naturalWidth;mask.height=bibertyBeeWatermark.naturalHeight;
   const mc=mask.getContext('2d');mc.drawImage(bibertyBeeWatermark,0,0);
   mc.globalCompositeOperation='source-in';mc.fillStyle='#111d50';mc.fillRect(0,0,mask.width,mask.height);
   c.globalAlpha=.22;c.drawImage(mask,680,35,560,583);
  }else{
   c.globalAlpha=charcoal?.20:.14;c.drawImage(bibertyBeeWatermark,680,35,560,583);
  }
  c.restore();
 }
 const font=(size,weight=700)=>`${weight} ${size}px "Google Sans",Arial,sans-serif`;
 function txt(t,x,y,size=32,color=ink,weight=700,align='left'){c.font=font(size,weight);c.textAlign=align;c.fillStyle=color;c.fillText(String(t),x,y)}
 function round(x,y,ww,hh,r,fill,stroke){c.beginPath();c.roundRect(x,y,ww,hh,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.stroke()}}
 function fit(t,maxWidth,size=70){while(size>30){c.font=font(size);if(c.measureText(t).width<=maxWidth)break;size-=2}return size}
 // Keep top 190px clear for Instagram's account name, progress bar and controls.
 txt('THE BIBERTY BEE PRESENTS',74,225,31,sub,800);round(74,258,160,7,4,accent);
 txt('CAMPUS INSTAGRAM RECAP',74,312,26,sub,600);
 // Profile image is placed above the account name, never beside it.
 const ax=540,ay=429,ar=74;
 c.save();c.beginPath();c.arc(ax,ay,ar,0,Math.PI*2);c.clip();
 c.fillStyle=colorFor(a.handle);c.fillRect(ax-ar,ay-ar,ar*2,ar*2);
 const pic=storyPictures[a.handle];if(pic&&pic.complete&&pic.naturalWidth)c.drawImage(pic,ax-ar,ay-ar,ar*2,ar*2);
 else txt(abbreviation(a),ax,ay+21,51,'#ffffff',800,'center');
 c.restore();c.strokeStyle=light?'#bcc5d6':'#ffffffbb';c.lineWidth=5;c.beginPath();c.arc(ax,ay,ar+3,0,Math.PI*2);c.stroke();
 // Name plus a compact verification-style badge only for accounts with a milestone.
 const highest=milestone(a.followers),nameSize=fit(a.name,highest?820:910,72);
 c.font=font(nameSize,800);const nameWidth=c.measureText(a.name).width;
 const nameX=highest?540-23:540;
 txt(a.name,nameX,580,nameSize,ink,800,'center');
 if(highest){
  const bx=nameX+nameWidth/2+29,by=557,r=21;
  const colors={bronze:['#e6b78b','#9c5a35'],silver:['#e9eff8','#8795aa'],gold:['#ffe596','#d48b00'],platinum:['#bfe6ff','#2b84b8'],double:['#e0d2ff','#6d4dff']};
  const shades=colors[highest[1]],g=c.createLinearGradient(bx-r,by-r,bx+r,by+r);g.addColorStop(0,shades[0]);g.addColorStop(1,shades[1]);
  c.fillStyle=g;c.beginPath();for(let j=0;j<32;j++){let t=-Math.PI/2+j*Math.PI/16,rad=j%2?r-3:r+1;j?c.lineTo(bx+Math.cos(t)*rad,by+Math.sin(t)*rad):c.moveTo(bx+Math.cos(t)*rad,by+Math.sin(t)*rad)}c.closePath();c.fill();
  txt(highest[3]==='medal'?'★':highest[3]==='diamond-double'?'✦':'◆',bx,by+9,24,'#ffffff',800,'center');
 }

 txt('@'+a.handle,540,635,33,accent,700,'center');
 txt(`${s.from}  —  ${s.to}`,540,683,26,sub,500,'center');
 const cardFill=light?'#ffffffd9':'#ffffff16',cardStroke=light?'#bdc8db':'#ffffff2c';
 if(slide===0){
  txt('By the Numbers',74,920,54,ink,800);
  round(66,971,948,332,34,cardFill,cardStroke);
  txt('FOLLOWERS',106,1045,27,sub,700);txt(fmt(s.end),106,1198,142,ink,800);
  round(66,1328,455,278,30,cardFill,cardStroke);round(548,1328,466,278,30,cardFill,cardStroke);
  txt('FOLLOWERS GAINED',98,1399,24,sub,700);txt((s.gain>=0?'+':'')+fmt(s.gain),98,1526,78,ink,800);
  txt('GROWTH',582,1399,24,sub,700);txt((s.pct>=0?'+':'')+s.pct.toFixed(1)+'%',582,1526,78,ink,800);

 }
 if(slide===1){
  txt('Follower Growth',74,774,54,ink,800);
  round(66,825,948,715,34,cardFill,cardStroke);
  const data=s.r;let min=data.length?Math.min(...data.map(x=>x.followers)):0,max=data.length?Math.max(...data.map(x=>x.followers)):1;if(min===max){min-=1;max+=1}
  const x0=112,y0=945,ww=845,hh=385;
  for(let i=0;i<4;i++){let yy=y0+hh*i/3;c.strokeStyle=light?'#c4cbdb':'#ffffff30';c.lineWidth=2;c.beginPath();c.moveTo(x0,yy);c.lineTo(x0+ww,yy);c.stroke();txt(fmt(max-(max-min)*i/3),x0,yy-14,22,sub,500)}
  const line=c.createLinearGradient(x0,y0,x0+ww,y0+hh);line.addColorStop(0,accent);line.addColorStop(1,light?'#4764a4':'#b7caff');
  c.strokeStyle=line;c.lineWidth=10;c.lineJoin='round';c.lineCap='round';c.beginPath();
  data.forEach((p,i)=>{let xx=x0+(data.length<=1?0:i/(data.length-1))*ww,yy=y0+(max-p.followers)/(max-min)*hh;i?c.lineTo(xx,yy):c.moveTo(xx,yy)});c.stroke();
  txt(data.length?`${fmt(s.start)}  →  ${fmt(s.end)}`:'No historical readings',108,1460,48,ink,800);
  txt('FOLLOWERS OVER TIME',74,1590,27,sub,700);
  txt(s.gain===null?'Growth cannot be calculated for this period':(s.gain>=0?'+':'')+fmt(s.gain)+' followers during this period',74,1650,30,ink,600);
 }
 if(slide===2){
  txt('Milestones Passed',74,795,54,ink,800);
  round(66,846,948,785,34,cardFill,cardStroke);
  const unlocked=s.crossed;
  if(unlocked.length){
   txt(unlocked.length===1?'1 MILESTONE UNLOCKED':`${unlocked.length} MILESTONES UNLOCKED`,540,936,31,sub,800,'center');
   const n=unlocked.length,spacing=Math.min(210,820/n),left=540-(n-1)*spacing/2;
   unlocked.forEach((m,i)=>{const x=left+i*spacing,y=1085,lv=milestone(m.threshold),isGem=lv&&lv[3]!=='medal';const colors=lv?.[1]==='bronze'?['#e5b48c','#99512c']:lv?.[1]==='silver'?['#edf2fa','#8191a8']:lv?.[1]==='gold'?['#ffe58f','#d08800']:lv?.[1]==='platinum'?['#c3e8ff','#2d85b8']:['#e0d2ff','#6d4dff'];let g=c.createLinearGradient(x-70,y-70,x+70,y+70);g.addColorStop(0,colors[0]);g.addColorStop(1,colors[1]);c.fillStyle=g;c.beginPath();for(let j=0;j<32;j++){const angle=-Math.PI/2+j*Math.PI/16,r=j%2?68:78;j?c.lineTo(x+Math.cos(angle)*r,y+Math.sin(angle)*r):c.moveTo(x+Math.cos(angle)*r,y+Math.sin(angle)*r)}c.closePath();c.fill();c.strokeStyle='#ffffffa8';c.lineWidth=3;c.beginPath();c.arc(x,y,59,0,Math.PI*2);c.stroke();txt(isGem?'◆':'★',x,y+23,66,'#ffffff',800,'center');txt(m.name.toUpperCase(),x,1202,Math.min(25,170/m.name.length*7),ink,800,'center');txt(new Date(m.time).toLocaleDateString('en-US',{month:'short',day:'numeric'}),x,1240,21,sub,500,'center')});
   txt('Confirmed from recorded follower history',540,1344,26,sub,500,'center');
  }else{
   txt('PERIOD HIGHLIGHTS',540,944,28,sub,800,'center');
   txt(s.r.length<2?'Not enough recorded data':s.gain>0?'ON THE RISE':'KEEPING THE MOMENTUM',540,1094,fit(s.r.length<2?'Not enough recorded data':s.gain>0?'ON THE RISE':'KEEPING THE MOMENTUM',790,59),ink,800,'center');
   txt(s.gain===null?'Milestones cannot be verified for this period':`${s.gain>=0?'+':''}${fmt(s.gain)} followers during the selected period`,540,1173,30,sub,600,'center');
   txt('No new milestone crossing confirmed',540,1260,27,sub,500,'center');
  }
  c.strokeStyle=light?'#bdc8db':'#ffffff38';c.lineWidth=2;c.beginPath();c.moveTo(134,1400);c.lineTo(946,1400);c.stroke();
  txt('CURRENT OVERALL LEADERBOARD',540,1470,25,sub,700,'center');
  txt('RANK #'+a.rank,540,1570,78,ink,800,'center');
 }


 if(slide===3){
  txt('Leaderboard Performance',74,790,52,ink,800);
  round(66,839,948,773,34,cardFill,cardStroke);
  const first=s.r[0],last=s.r.at(-1),begin=first?storyNearRank(a,first.time):null,finish=last?storyNearRank(a,last.time):null;
  if(begin&&finish){
   txt('START OF TRACKING',110,940,25,sub,700);txt('MOST RECENT',590,940,25,sub,700);
   txt('#'+begin.rank,108,1100,121,ink,800);txt('→',480,1080,66,accent,800,'center');txt('#'+finish.rank,587,1100,121,ink,800);
   c.strokeStyle=cardStroke;c.beginPath();c.moveTo(110,1170);c.lineTo(966,1170);c.stroke();
   const moved=begin.rank-finish.rank;
   txt(moved>0?`UP ${moved} PLACES`:moved<0?`DOWN ${-moved} PLACES`:'RANK UNCHANGED',540,1300,55,ink,800,'center');
   txt('Ranks among accounts with comparable readings',540,1380,26,sub,500,'center');
   txt(`${begin.total} accounts at start  •  ${finish.total} accounts at end`,540,1500,25,sub,500,'center');
  }else{
   txt('RANKING HISTORY UNAVAILABLE',540,1140,44,ink,800,'center');
   txt('Comparable dated readings are needed.',540,1230,30,sub,500,'center');
  }
 }
 if(slide===4){
  txt('Biggest Growth Moments',74,790,52,ink,800);
  round(66,839,948,773,34,cardFill,cardStroke);
  const best=storyBestWindows(a);const entries=[['BEST RECORDED DAY',best.day,'day'],['BEST 7-DAY STRETCH',best.week,'week'],['BEST 30-DAY STRETCH',best.month,'month']];
  entries.forEach(([label,item,kind],i)=>{const y=980+i*192;
   txt(label,115,y,25,sub,700);
   txt(item?((item.gain>=0?'+':'')+fmt(item.gain)):'—',115,y+93,89,ink,800);
   txt(storyGrowthDateRange(item,kind),935,y+85,24,sub,500,'right');
   if(i<2){c.strokeStyle=cardStroke;c.beginPath();c.moveTo(115,y+135);c.lineTo(960,y+135);c.stroke()}
  });
  txt('Measured from recorded follower snapshots.',540,1560,25,sub,500,'center');
 }
 if(slide===5){
  txt('Milestone Timeline',74,790,54,ink,800);
  round(66,839,948,773,34,cardFill,cardStroke);
  if(s.crossed.length){
   const count=s.crossed.length;
   s.crossed.forEach((m,i)=>{const y=990+i*Math.min(155,500/count);
    c.fillStyle=accent;c.beginPath();c.arc(147,y,17,0,Math.PI*2);c.fill();
    if(i<count-1){c.strokeStyle=accent;c.lineWidth=5;c.beginPath();c.moveTo(147,y+20);c.lineTo(147,y+Math.min(155,500/count)-20);c.stroke()}
    txt(m.name,205,y+13,47,ink,800);txt(`${fmt(m.threshold)} followers`,205,y+49,25,sub,500);
    txt(new Date(m.time).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),930,y+13,24,sub,600,'right');
   });
   txt(`${count} confirmed milestone${count===1?'':'s'} during tracked period`,540,1513,29,ink,700,'center');
  }else{
   txt('NO CONFIRMED MILESTONE CROSSINGS',540,1120,41,ink,800,'center');
   txt('This period may predate tracking or include',540,1225,29,sub,500,'center');
   txt('no newly reached thresholds.',540,1267,29,sub,500,'center');
   txt('Current milestone status is shown by the name.',540,1455,27,sub,500,'center');
  }
 }
 if(slide===6){
  txt('The Competition',74,790,54,ink,800);
  round(66,839,948,773,34,cardFill,cardStroke);
  const rivals=storyCompetitors(a),position=rivals.findIndex(x=>x.a.handle===a.handle),near=position>=0?rivals.slice(Math.max(0,position-2),Math.min(rivals.length,Math.max(0,position-2)+4)):[];
  txt(a.category.toUpperCase(),111,948,26,sub,700);
  if(position>=0){
   txt('#'+(position+1),111,1071,105,ink,800);
   txt(`OF ${rivals.length} TRACKED ACCOUNTS`,345,1052,27,sub,700);
   near.forEach((r,i)=>{let yy=1168+i*92,own=r.a.handle===a.handle;
    if(own)round(100,yy-53,874,77,15,light?'#e3e8f5':'#ffffff26',null);
    txt('#'+(rivals.indexOf(r)+1),123,yy,29,own?accent:sub,800);
    const nm=r.a.name.length>24?r.a.name.slice(0,22)+'…':r.a.name;
    txt(nm,205,yy,31,ink,own?800:600);txt(fmt(r.ending),931,yy,30,ink,700,'right');
   });
   txt('Compared using the latest readings in this period',540,1560,25,sub,500,'center');
  }else{txt('NOT ENOUGH COMPARABLE DATA',540,1210,44,ink,800,'center');}
 }
 if(slide===7){
  txt('Monthly Growth',74,790,54,ink,800);
  round(66,839,948,773,34,cardFill,cardStroke);
  const buckets=storyGrowthBuckets(a).filter(m=>m.gain!==null).slice(-6);
  if(buckets.length){
   const max=Math.max(1,...buckets.map(x=>Math.abs(x.gain)));
   const x=120,y=1010,width=835,plotH=390;
   c.strokeStyle=cardStroke;c.lineWidth=3;c.beginPath();c.moveTo(x,y+plotH);c.lineTo(x+width,y+plotH);c.stroke();
   buckets.forEach((m,i)=>{let bw=Math.min(100,width/buckets.length*.68),cx=x+width*(i+.5)/buckets.length,bh=Math.max(7,Math.abs(m.gain)/max*plotH);
    const fill=c.createLinearGradient(cx,y+plotH-bh,cx,y+plotH);fill.addColorStop(0,accent);fill.addColorStop(1,light?'#6279ac':'#4f6fb3');
    round(cx-bw/2,y+plotH-bh,bw,bh,9,fill,null);
    txt((m.gain>=0?'+':'')+fmt(m.gain),cx,y+plotH-bh-27,26,ink,700,'center');
    txt(m.label,cx,y+plotH+53,22,sub,600,'center');
   });
   txt('Follower change between first and last monthly snapshot',540,1550,24,sub,500,'center');
  }else{
   txt('NOT ENOUGH MONTHLY DATA',540,1190,43,ink,800,'center');
   txt('At least two observations in a month are needed.',540,1280,27,sub,500,'center');
  }
 }

 c.save();c.strokeStyle=light?'#8c99b055':'#ffffff55';c.lineWidth=2;c.globalAlpha=1;c.beginPath();c.moveTo(74,1742);c.lineTo(1006,1742);c.stroke();c.restore();
 txt('Fueled by The Biberty Bee',74,1806,34,ink,800);
 txt('PREMIUM FAKE NEWS. REAL NUMBERS.',74,1851,25,sub,700);
 
 $('slideIndicator').textContent=String(slide+1).padStart(2,'0')+' / 08';
}
function saveCanvas(filename){const a=document.createElement('a');a.download=filename;a.href=$('storyCanvas').toDataURL('image/png');document.body.appendChild(a);a.click();a.remove()}
function recapFileName(slide){return 'Biberty-Recap-'+currentRecapAccount().handle+'-slide-'+(slide+1)+'.png'}
const storyPictures={};
const storyPicturesLoading=new Set();
function ensureStoryPicture(account){
 if(!account||storyPictures[account.handle]||storyPicturesLoading.has(account.handle)||!photos[account.handle])return;
 storyPicturesLoading.add(account.handle);
 const img=new Image();
 img.crossOrigin='anonymous';
 img.onload=()=>{storyPictures[account.handle]=img;storyPicturesLoading.delete(account.handle);if(currentRecapAccount()?.handle===account.handle)drawStory()};
 img.onerror=()=>{storyPicturesLoading.delete(account.handle)};
 img.src=photos[account.handle];
}
function loadStoryPicture(file){if(!file)return;const a=currentRecapAccount();if(!a)return;const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{storyPictures[a.handle]=img;drawStory()};img.src=reader.result};reader.readAsDataURL(file)}
$('recapPhoto').addEventListener('change',e=>loadStoryPicture(e.target.files?.[0]));
function initRecaps(){initAcademicPeriods();const opts=state.accounts.map(a=>`<option value="${esc(a.handle)}">${esc(a.name)} (@${esc(a.handle)})</option>`).join('');$('recapAccount').innerHTML=opts;$('recapAccount').value=state.accounts.some(a=>a.handle==='thebibertybee')?'thebibertybee':state.accounts[0]?.handle;ensureStoryPicture(currentRecapAccount());drawStory()}
for(const id of ['recapAccount','recapPeriod','recapTheme','recapFromYear','recapToYear'])$(id).addEventListener('change',()=>{if(id==='recapAccount'){$('recapPhoto').value='';ensureStoryPicture(currentRecapAccount())}$('recapMulti').hidden=$('recapPeriod').value!=='multi';drawStory()});
$('recapSlide').addEventListener('change',()=>{currentSlide=Number($('recapSlide').value);drawStory()});
function setSlide(n){currentSlide=(n+8)%8;$('recapSlide').value=String(currentSlide);drawStory()}
$('previousSlide').onclick=()=>setSlide(currentSlide-1);$('nextSlide').onclick=()=>setSlide(currentSlide+1);
$('downloadSlide').onclick=()=>{drawStory();saveCanvas(recapFileName(currentSlide))};
$('downloadAll').onclick=()=>{const old=currentSlide;for(let i=0;i<8;i++){drawStory(i);saveCanvas(recapFileName(i))}drawStory(old)};
load();

// Instagram prevents being embedded inside a site iframe. Always open post/profile
// links in a new browsing context rather than navigating the Wix embed itself.
document.addEventListener('click',e=>{const link=e.target.closest('a[data-instagram-link]');if(!link)return;const url=link.href;try{const u=new URL(url);if(!/^(www\.)?instagram\.com$/.test(u.hostname)||u.protocol!=='https:')return;}catch{return;}e.preventDefault();const tab=window.open(url,'_blank');if(tab)try{tab.opener=null}catch{}else{navigator.clipboard?.writeText(url).catch(()=>{});alert('Your browser blocked Instagram from opening. The Instagram link has been copied if clipboard access is allowed. Please allow pop-ups for this dashboard.')}});
