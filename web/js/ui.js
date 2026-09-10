// Skyline UI controller
(function(){
const G=window.SKY_GAME,D=window.SKY_DATA;
let tab="dash",auto=true,timer=null,routeDraft={from:"DAC",to:"DXB",freq:2,fareY:299},skyMap=null,skyFx=[];
window.SKY_UI={setFrom(id){routeDraft.from=id;tab="routes";document.querySelectorAll("#tabs button").forEach(x=>x.classList.toggle("on",x.dataset.t==="routes"));render();},
 setTo(id){routeDraft.to=id;tab="routes";document.querySelectorAll("#tabs button").forEach(x=>x.classList.toggle("on",x.dataset.t==="routes"));render();}};
// --- SFX: tiny synthesized WebAudio sounds, no assets ---
const SFX=(()=>{let ctx=null,muted=false;
 try{muted=localStorage.getItem("skyline_mute")==="1";}catch(e){}
 function ac(){if(!ctx)ctx=new (window.AudioContext||window.webkitAudioContext)();if(ctx.state==="suspended")ctx.resume();return ctx;}
 function tone(f,t0,dur,type,vol){const c=ac(),o=c.createOscillator(),g=c.createGain();o.type=type||"sine";o.frequency.value=f;g.gain.setValueAtTime(vol||0.12,t0);g.gain.exponentialRampToValueAtTime(0.001,t0+dur);o.connect(g);g.connect(c.destination);o.start(t0);o.stop(t0+dur+0.02);}
 function seq(notes,type,vol,step){if(muted)return;try{const c=ac(),t=c.currentTime;notes.forEach((f,i)=>tone(f,t+i*(step||0.09),0.14,type||"sine",vol||0.1));}catch(e){}}
 return{cash(){seq([880,1174,1568],"square",0.05);},chime(){seq([660,990],"sine",0.1);},
  fanfare(){seq([523,659,784,1046,1318],"triangle",0.12,0.11);},alertS(){seq([196,147],"sawtooth",0.12,0.18);},
  isMuted:()=>muted,toggle(){muted=!muted;try{localStorage.setItem("skyline_mute",muted?"1":"0");}catch(e){}return muted;}};
})();
function flashRed(){const b=document.body;b.classList.remove("flash-red");void b.offsetWidth;b.classList.add("flash-red");setTimeout(()=>b.classList.remove("flash-red"),800);}
// Advance one game-day with sound + juice. Returns the day result.
function advanceDay(manual){
  const s=G.S();if(!s)return null;
  const L0=s.level;
  const d=G.simulateDay();render();
  const s2=G.S();
  if(s2.level>L0){SFX.fanfare();flash("Level "+s2.level+"! New routes + credit unlocked.");}
  else if(manual&&d.profit>0){SFX.cash();}
  const latest=s2.advisor[0]||"";
  if(/DEFAULT|Bankruptcy/.test(latest)){SFX.alertS();flashRed();}
  if(manual)flash((d.profit>=0?"+":"")+G.fmt$(d.profit)+" · "+d.pax+" pax");
  return d;
}
function $ (s){return document.querySelector(s);}
function esc(s){return String(s).replace(/[<>"]/g,c=>({"<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
function init(){
  const homeSel=$("#inHome");
  homeSel.innerHTML=D.airports.map(a=>`<option value="${a.id}">${a.iata||a.id} — ${esc(a.city)}, ${esc(a.country)} · ${esc(a.name)} (tier ${a.tier})</option>`).join("");
  homeSel.value="DAC";
  const saved=G.load();
  if(saved&&saved.name){enter();if(G.catchUp()){const st=G.S();st.gazetteClosed=false;G.save();render();}}
  else{$("#setup").classList.remove("hidden");}
  $("#btnStart").onclick=()=>{G.newAirline($("#inName").value||"Skyline Air",$("#inCode").value||"SKY",homeSel.value,$("#inArch").value);enter();};
  document.querySelectorAll("#tabs button[data-t]").forEach(b=>b.onclick=()=>{tab=b.dataset.t;document.querySelectorAll("#tabs button").forEach(x=>x.classList.remove("on"));b.classList.add("on");render();});
  $("#btnDay").onclick=()=>advanceDay(true);
  $("#btnAuto").onclick=e=>{auto=!auto;e.target.textContent=auto?"⏸ Auto":"▶ Auto";loop();};
  const bm=$("#btnMute");if(bm){bm.textContent=SFX.isMuted()?"🔇":"🔊";bm.onclick=()=>{bm.textContent=SFX.toggle()?"🔇":"🔊";};}
  $("#btnReset").onclick=()=>{if(confirm("Reset airline?")){G.reset();location.reload();}};
  loop();
}
function enter(){$("#setup").classList.add("hidden");$("#main").classList.remove("hidden");render();}
function loop(){clearInterval(timer);if(auto)timer=setInterval(()=>{try{if(!G.S())return;advanceDay(false);}catch(err){console.error(err);}},G.DAY_MS);}
function flash(msg){$("#tickInfo").textContent=msg;setTimeout(()=>$("#tickInfo").textContent="",3000);}
// --- Skyline Gazette: front page lives on the dashboard ---
function gazetteData(s){
  if(s.awayReport&&s.awayReport.days>0)return{...s.awayReport};
  const h=s.history.slice(-7);
  const sum=k=>h.reduce((x,y)=>x+(y[k]||0),0);
  let best=null,worst=null;
  h.forEach(y=>{if(!best||y.profit>best.profit)best={profit:y.profit,day:y.day};if(!worst||y.profit<worst.profit)worst={profit:y.profit,day:y.day};});
  return{days:h.length,flights:sum("flights"),pax:sum("pax"),rev:sum("rev"),profit:sum("profit"),
    fuel0:s.fuel,fuel1:s.fuel,rep0:s.rep,rep1:s.rep,
    best:best||{profit:0,day:"—"},worst:worst||{profit:0,day:"—"},
    headlines:s.advisor.slice(0,8),live:true};
}
function paperBody(a){
  const H=(a.headlines||[]);
  return `<div class="masthead">📰 THE SKYLINE GAZETTE</div>
  <div class="tiny" style="text-align:center;opacity:.7">Day ${G.S().day} · ${a.live?("last "+a.days+" day(s) · live edition"):(a.days+" day(s) away")} · all times local-ish</div>
  ${H.length?H.map(h=>`<div class="headline">${esc(h)}</div>`).join(""):'<div class="headline">🕊️ Quiet days in the sky — your crews kept the schedule without incident.</div>'}
  <div class="papergrid">
   <div>🛫 <b>${a.flights}</b> flights</div><div>🧍 <b>${a.pax.toLocaleString()}</b> pax</div>
   <div>💰 Revenue <b>${G.fmt$(a.rev)}</b></div><div>${a.profit>=0?"📈":"📉"} Profit <b>${G.fmt$(a.profit)}</b></div>
   <div>🏆 Best: Day ${a.best?a.best.day:"—"} (${G.fmt$(a.best?a.best.profit:0)})</div><div>🌧️ Worst: Day ${a.worst?a.worst.day:"—"} (${G.fmt$(a.worst?a.worst.profit:0)})</div>
   <div>⛽ Fuel $${(a.fuel0||0).toFixed(2)} → $${(a.fuel1||0).toFixed(2)}</div><div>😊 Rep ${Math.round(a.rep0||0)} → ${Math.round(a.rep1||0)}</div>
  </div><p class="tiny" style="opacity:.7">After 7 days away, earnings degrade — come back daily!</p>`;
}
function gazetteSeg(s){
  // Folded: just the cover. Unfolded: the full front page.
  if(s.gazetteClosed){const a=gazetteData(s);
    return `<div class="gazcover" data-gazopen role="button" title="Unfold the Gazette"><div class="coverline">EST. DAY 1 · PRICE: ONE GOOD LANDING</div><div class="covername">The Skyline Gazette</div><div class="coverline">Day ${s.day} morning edition · ${a.days} day(s) of news inside</div><span class="opentag">Tap to unfold 📰</span></div>`;}
  return `<div class="paper"><div class="row" style="justify-content:flex-end"><button data-gazclose title="Fold the paper away">Fold ✕</button></div>${paperBody(gazetteData(s))}</div>`;
}
function spark(hist,key){
  if(!hist||hist.length<2)return '<span class="muted">—</span>';
  const vals=hist.map(h=>h[key]||0);
  const mn=Math.min(...vals,0),mx=Math.max(...vals,0),rg=(mx-mn)||1,W=90,H=28;
  const pts=vals.map((v,i)=>`${(i/(vals.length-1)*W).toFixed(1)},${(H-2-((v-mn)/rg)*(H-4)).toFixed(1)}`).join(" ");
  const col=vals[vals.length-1]>=vals[0]?"#4ade80":"#f87171";
  const zy=(H-2-((0-mn)/rg)*(H-4)).toFixed(1);
  return `<svg class="spark" width="${W}" height="${H}"><line x1="0" y1="${zy}" x2="${W}" y2="${zy}" stroke="#a89f8d" stroke-width="1"/><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2"/></svg>`;
}
function hud(){const s=G.S();if(!s)return;$("#hud").innerHTML=
 `<span class="pill">💰 <b>${G.fmt$(s.cash)}</b></span><span class="pill">⭐ Lvl ${s.level} ${esc(s.name)} (${esc(s.code)})</span>
  <span class="pill">😊 Rep ${Math.round(s.rep)}</span><span class="pill">📅 Day ${s.day}</span>
  <span class="pill">⛽ $${s.fuel.toFixed(2)}</span>  <span class="pill">✈️ ${s.fleet.length} · 🗺 ${s.routes.filter(r=>r.status==="ACTIVE").length}</span>${G.outstandingDebt()>0?`<span class="pill">💳 Debt <b>${G.fmt$(G.outstandingDebt())}</b></span>`:""}
  ${s.event?`<span class="pill">📣 ${esc(s.event.name)} (${s.eventDays}d)</span>`:""}`;}
function render(){hud();const s=G.S();if(!s)return;const v=$("#view");
  // Tear down the Leaflet map before its container is replaced (else its
  // async code throws after the div is gone).
  if(tab!=="map"){stopFlights();if(skyMap){try{skyMap.remove();}catch(e){}skyMap=null;}}
  if(tab==="dash")v.innerHTML=dash(s);
  if(tab==="map")v.innerHTML=`<div class="card"><h3>Your live network</h3><div id="map"></div><p class="muted">Home ${s.home} · <span style="color:#38bdf8">—blue—</span> your routes · ✈️ your flights in real relative speed (click one) · shaded half is night right now</p><p class="tiny">Airport positions: <a href="https://ourairports.com/data/" target="_blank" rel="noopener">OurAirports</a> (public domain) · tiles: © OpenStreetMap contributors, Esri World Imagery — same base layers as <a href="https://ourairports.com/big-map.html" target="_blank" rel="noopener">The Big Map</a></p></div>`+dash(s),drawMap();
  if(tab==="fleet")v.innerHTML=fleetV(s);
  if(tab==="routes")v.innerHTML=routesV(s);
  if(tab==="fin")v.innerHTML=finV(s);
  if(tab==="mis")v.innerHTML=misV(s);
  if(tab==="board")v.innerHTML=boardV(s);
  bind(v);
}
function dash(s){
  const last=[...s.history].slice(-1)[0]||{rev:0,profit:0,pax:0};
  const tips=G.advisorTips();
  return `<div style="margin-bottom:12px">${gazetteSeg(s)}</div><div class="grid g3">
   <div class="card"><div class="muted">Cash</div><div class="kpi">${G.fmt$(s.cash)}</div><div class="muted">Today ${last.profit>=0?'<span class="profit">': '<span class="loss">'}${G.fmt$(last.profit)}</span> · ${G.fmtN(last.pax)} pax</div></div>
   <div class="card"><div class="muted">Airline</div><div class="kpi">Lvl ${s.level}</div><div class="bar"><i style="width:${Math.min(100,s.xp/(100*Math.pow(s.level,1.6))*100)}%"></i></div><div class="muted">${Math.round(s.xp)}/${Math.round(100*Math.pow(s.level,1.6))} XP · Rep ${Math.round(s.rep)} · ${s.arch}</div></div>
   <div class="card"><div class="muted">All-time</div><div class="kpi">${G.fmtN(s.stats.pax)} pax</div><div class="muted">${G.fmtN(s.stats.flights)} flights · ${G.fmt$(s.stats.profit)} profit</div></div></div>
  <div class="grid g2" style="margin-top:12px">
   <div class="card"><h3>🧑‍✈️ Advisor (CFO/CCO)</h3>${tips.length?tips.map(t=>`<div class="alert">${esc(t)}</div>`).join(""):'<p class="muted">All good. Expand or optimize a fare.</p>'}${s.advisor.slice(0,4).map(a=>`<div class="alert">${esc(a)}</div>`).join("")}</div>
   <div class="card"><h3>Top routes</h3>${s.routes.length?s.routes.map(r=>`<div>✈️ ${r.from}–${r.to} · LF ${Math.round((r.lf7||0)*100)}% · <span class="${(r.profit7||0)>=0?'profit':'loss'}">${G.fmt$((r.profit7||0)/7)}/d</span> ${spark(r.hist,"profit")}</div>`).join(""):'<p class="muted">No routes yet — open one in Routes tab. Try DAC → DXB with an R-109.</p>'}</div></div>`;
}
function fleetV(s){
  const idle=s.fleet.filter(a=>!s.routes.some(r=>r.aircraftId===a.id&&r.status==="ACTIVE"));
  return `<div class="card"><h3>Fleet (${s.fleet.length}) · commonality discount ${(G.commonDisc()*100).toFixed(0)}% · fuel $${s.fuel.toFixed(2)}</h3>
  <table><tr><th>Aircraft</th><th>Base</th><th>Cond</th><th>Age</th><th>Status</th><th></th></tr>
  ${s.fleet.map(a=>{const m=G.model(a.modelId)||{name:"Retired ("+a.modelId+")",cls:"",seats:0,cargo:0,range:"?"};const cap=m.cls==="Cargo"?m.cargo+"t cargo":m.seats+" seats";return `<tr><td><b>${m.name}</b> <span class="muted">${a.how} · ${cap} · ${m.range}km</span></td><td>${a.base}</td><td>${Math.round(a.cond)}%</td><td>${a.ageY.toFixed(1)}y</td><td>${s.routes.some(r=>r.aircraftId===a.id&&r.status==="ACTIVE")?"🟢 flying":"🟡 idle"}</td><td><button data-maint="${a.id}">A-check $6K</button> <button data-maintC="${a.id}">C-check $90K</button> ${a.how==="lease"?`<button data-return="${a.id}" title="Return to lessor (no payout)">Return</button>`:`<button data-sell="${a.id}">Sell</button>`}</td></tr>`;}).join("")}</table>
  <p class="muted">${idle.length} idle aircraft.</p></div>
  <div class="grid g2"><div class="card"><h3>Lease / Buy new (100 models)</h3><div class="row"><select id="buyModel">${["Regional","Commuter","Narrowbody","Widebody","Cargo","Business"].map(c=>`<optgroup label="${c}">${D.aircraftModels.filter(m=>m.cls===c).map(m=>`<option value="${m.id}">${m.name} — ${m.cls==="Cargo"?m.cargo+"t":m.seats+" seats"} · ${m.range}km · lease ${G.fmt$(m.lease)}/mo · buy ${G.fmt$(m.buy)}</option>`).join("")}</optgroup>`).join("")}</select><select id="buyHow"><option value="lease">Lease (deposit 1 mo)</option><option value="buy">Buy cash</option></select><button id="doBuy" class="primary">Acquire</button></div><p class="muted">Lease = cheap start, no asset. Buy = equity + resale. Same manufacturer ×6+ = maintenance discount.</p></div>
  <div class="card"><h3>Used market (refreshes)</h3>${s.usedMarket.map(u=>{const m=G.model(u.modelId);if(!m)return "";return `<div class="row">🛩 ${m.name} · ${G.fmt$(u.price)} · cond ${u.cond}% · ${u.ageY}y <button data-used="${u.key}">Buy</button></div>`;}).join("")}</div></div>`;
}
function routesV(s){
  const idle=s.fleet.filter(a=>!s.routes.some(r=>r.aircraftId===a.id&&r.status==="ACTIVE"));
  const apOpts=D.airports.map(a=>`<option value="${a.id}">${a.iata||a.id} ${a.city} (${a.country})</option>`).join("");
  const pv=G.routePreview(routeDraft.from,routeDraft.to,(idle[0]&&idle[0].modelId)||"R109",routeDraft.freq,routeDraft.fareY);
  return `<div class="card"><h3>Open route (limit ${2+s.level*2})</h3>
   <div class="row">From <select id="rFrom">${apOpts}</select> To <select id="rTo">${apOpts}</select>
   Aircraft <select id="rAc">${idle.length?idle.map(a=>`<option value="${a.id}">${(G.model(a.modelId)||{name:a.modelId}).name} @${a.base}</option>`).join(""):'<option value="">— no idle aircraft, buy one —</option>'}</select>
   Freq <select id="rFreq"><option>1</option><option>2</option><option>3</option><option>4</option></select>
   Fare Y $<input id="rFare" type="number" value="${routeDraft.fareY}" style="width:90px"></div>
   <div class="row" style="margin-top:8px"><button id="doPreview">Preview</button><button id="doOpt">✨ Optimize fare</button><button id="doOpen" class="primary">Launch route</button></div>
   <div id="pv" style="margin-top:8px">${pv.err?`<span class="loss">${esc(pv.err)}</span>`:pv.isCargo?`Dist ${pv.dist}km · Freighter · Cargo <b>${pv.cargoT}t</b> · Profit <b class="${pv.profit>=0?'profit':'loss'}">${G.fmt$(pv.profit)}/day</b>`: `Dist ${pv.dist}km · Mkt $${pv.mFare} · Share ${Math.round(pv.myShare*100)}% vs ${pv.rivals} AI · Pax <b>${pv.pax}</b> · LF <b>${Math.round(pv.lf*100)}%</b> · Profit <b class="${pv.profit>=0?'profit':'loss'}">${G.fmt$(pv.profit)}/day</b>`}</div></div>
  <div class="card"><h3>Your routes</h3><table><tr><th>Route</th><th>Freq/Fare</th><th>LF 7d</th><th>Profit/d</th><th>Trend</th><th></th></tr>
  ${s.routes.map(r=>`<tr><td><b>${r.from}–${r.to}</b> <span class="muted">${(G.model((s.fleet.find(a=>a.id===r.aircraftId)||{}).modelId)||{name:r.status==="REVIEW"?"— aircraft sold —":"?" }).name}</span></td><td>${r.freq}× · $${r.fareY}</td><td>${Math.round((r.lf7||0)*100)}%</td><td class="${(r.profit7||0)>=0?'profit':'loss'}">${G.fmt$((r.profit7||0)/7)}</td><td>${spark(r.hist,"profit")}</td><td><button data-susp="${r.id}">${r.status==="ACTIVE"?"Suspend":"Resume"}</button> <button data-close="${r.id}" class="danger">Close</button></td></tr>`).join("")||'<tr><td colspan="6" class="muted">None yet.</td></tr>'}</table></div>`;
}
function finV(s){
  const h=[...s.history].slice(-14).reverse();
  const totR=h.reduce((x,y)=>x+y.rev,0),totP=h.reduce((x,y)=>x+y.profit,0);
  const lf=s.routes.length?s.routes.reduce((x,r)=>x+(r.lf7||0),0)/s.routes.length:0;
  return `<div class="grid g3"><div class="card"><div class="muted">Cash</div><div class="kpi">${G.fmt$(s.cash)}</div></div>
  <div class="card"><div class="muted">14-day revenue</div><div class="kpi">${G.fmt$(totR)}</div></div>
  <div class="card"><div class="muted">14-day profit / avg LF</div><div class="kpi ${totP>=0?'profit':'loss'}">${G.fmt$(totP)}</div><div class="muted">${Math.round(lf*100)}% LF</div></div></div>
  <div class="card"><h3>Analyst view (last 14 days)</h3><table><tr><th>Day</th><th>Pax</th><th>Revenue</th><th>Profit</th></tr>${h.map(x=>`<tr><td>${x.day}</td><td>${x.pax.toLocaleString()}</td><td>${G.fmt$(x.rev)}</td><td class="${x.profit>=0?'profit':'loss'}">${G.fmt$(x.profit)}</td></tr>`).join("")||'<tr><td colspan="4">Advance a day to generate data.</td></tr>'}</table></div>`+loansV(s);
}
function loansV(s){
  const plans=G.loanPlans();
  const active=(s.loans||[]).filter(l=>l.status==="ACTIVE");
  const past=(s.loans||[]).filter(l=>l.status!=="ACTIVE").slice(-4);
  const avail=G.creditLimit()-G.outstandingDebt();
  return `<div class="card"><h3>🏦 Bank loans</h3>
  <p class="muted">Credit limit <b>${G.fmt$(G.creditLimit())}</b> ($2M x level) · available <b>${G.fmt$(Math.max(0,avail))}</b> · outstanding <b>${G.fmt$(G.outstandingDebt())}</b>${s.loanBlacklistUntil>s.day?` · <span class="loss">blacklisted till day ${s.loanBlacklistUntil}</span>`:""}</p>
  <div class="row">Amount $<input id="loanAmt" type="number" value="1000000" step="100000" min="100000" style="width:130px">
  <select id="loanPlan">${plans.map(p=>`<option value="${p.id}">${p.name} — ${p.days}d · ${(p.apr*100).toFixed(1)}% APR (your rate)</option>`).join("")}</select>
  <button id="doQuote">Quote</button><button id="doLoan" class="primary">Take loan</button></div>
  <div id="loanQuote" class="muted" style="margin-top:6px">Express 30d/6% · Standard 90d/9% · Extended 180d/12% base APR (low rep = higher rate). Missed payments: 5% late fee + rep loss, then +2pp APR penalty, then repossession of your most valuable owned aircraft (or 10% penalty + 30-day blacklist).</div>
  ${active.length?active.map(l=>{const rows=G.loanSchedule(l);return `<div class="alert">💳 <b>${G.fmt$(l.amount)}</b> ${esc(l.planName)} · ${(l.apr*100).toFixed(1)}% APR · balance <b>${G.fmt$(Math.round(l.balance))}</b> · <b>${G.fmt$(l.daily)}/day</b> · paid ${l.paid}d${l.misses?` · <span class="loss">${l.misses} missed!</span>`:""}${l.defaulted?` · <span class="loss">IN DEFAULT</span>`:""} <button data-payoff="${l.id}">Pay off ${G.fmt$(Math.round(l.balance))}</button>
  <div class="tiny">Next: ${rows.slice(0,6).map(r=>`D${r.day} ${G.fmt$(r.pay)}`).join(" · ")}${rows.length>6?` · … (${rows.length} to go)`:""}</div></div>`;}).join(""):'<p class="muted">No active loans. Borrowing accelerates growth — if the daily installment fits your profit.</p>'}
  ${past.length?`<p class="tiny">History: ${past.map(l=>`✅ ${G.fmt$(l.amount)} ${esc(l.planName)} (${l.status})`).join(" · ")}</p>`:""}</div>`;
}
function misV(s){
  const story=G.story();
  return `<div class="grid g2"><div class="card"><h3>Story missions</h3>${story.map((m,i)=>`<div>${s.missionsDone["story"+i]?"✅":"⬜"} ${esc(m.t)} <span class="muted">+${G.fmt$(m.rw)}</span></div>`).join("")}</div>
  <div class="card"><h3>Achievements</h3><div>🛫 First route: ${s.routes.length?"✅":"⬜"}</div><div>🧍 10K pax: ${s.stats.pax>=10000?"✅":"⬜"} (${G.fmtN(s.stats.pax)})</div><div>💰 $10M cash: ${s.cash>=10e6?"✅":"⬜"}</div><div>🌍 5 routes: ${s.routes.length>=5?"✅":"⬜"}</div><div>⭐ Level 5: ${s.level>=5?"✅":"⬜"}</div></div></div>`;
}
function boardV(s){
  const rows=[{n:"⭐ "+s.name+" (YOU · "+s.home+")",p:s.stats.profit,px:s.stats.pax,c:"#0ea5e9"},...s.ai.map(a=>({n:(a.face||"🛩")+" "+a.name+" ("+(a.ceo||"CEO")+" · "+(a.base||"?")+")",p:a.profit+Math.round(Math.random()*20000)+s.day*800,px:a.pax+s.day*400,c:"#f87171"}))].sort((a,b)=>b.p-a.p);
  return `<div class="card"><h3>Leaderboard — profit (you vs AI)</h3><table><tr><th>#</th><th>Airline</th><th>Score</th></tr>${rows.map((r,i)=>`<tr><td>${i+1}</td><td style="color:${r.c}">${esc(r.n)}</td><td>${G.fmt$(r.p)}</td></tr>`).join("")}</table><p class="muted">AI personalities: SwiftGo (LCC, SE Asia) undercuts · Royal Meridian (premium long-haul) holds high fare · Magnolia (US regional) nips thin routes · Titan (mega, Gulf) spams frequency. Enter their routes to steal share with better fare/frequency/rep.</p></div>`;
}
function drawMap(){
  // Leaflet Big-Map clone: OSM + Esri Satellite base layers (same as OurAirports oamap.js),
  // markers from OurAirports-sourced data.js, routes as polylines.
  const el=$("#map");if(!el)return;const s=G.S();
  if(typeof L==="undefined"){el.innerHTML='<p class="muted">Map needs internet (Leaflet CDN). Routes tab still works offline.</p>';return;}
  if(skyMap){try{skyMap.remove();}catch(e){}skyMap=null;}try{
  const osm=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',maxZoom:18});
  const sat=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{attribution:'Imagery: Esri, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, GIS Community',maxZoom:18});
  skyMap=L.map("map",{layers:[osm],worldCopyJump:true});
  L.control.layers({"Map":osm,"Satellite":sat}).addTo(skyMap);
  L.control.scale({position:"bottomleft"}).addTo(skyMap);
  const served=new Set();s.routes.filter(r=>r.status==="ACTIVE").forEach(r=>{served.add(r.from);served.add(r.to);});
  // player network (blue) — rival AI stays invisible on the map (intel via advisor)
  const pts=[];
  s.routes.filter(r=>r.status==="ACTIVE").forEach(r=>{const A=D.airports.find(a=>a.id===r.from),B=D.airports.find(a=>a.id===r.to);
    if(A&&B){L.polyline([[A.lat,A.lon],[B.lat,B.lon]],{color:"#0ea5e9",weight:3,opacity:.9}).addTo(skyMap);pts.push([A.lat,A.lon],[B.lat,B.lon]);}});
  // airport markers, sized by tier like OurAirports large/medium icons
  D.airports.forEach(a=>{
    const isHome=a.id===s.home, isServed=served.has(a.id);
    const m=L.circleMarker([a.lat,a.lon],{radius:a.tier>=4?8:a.tier===3?6:a.tier===2?5:4,
      color:isHome?"#4ade80":isServed?"#0ea5e9":"#94a3b8",weight:2,fillColor:isHome?"#4ade80":isServed?"#0ea5e9":"#334155",fillOpacity:.9});
    const codes=[a.icao,a.iata].filter(Boolean).map(c=>`<span class="code">${esc(c)}</span>`).join(" ");
    m.bindPopup(`<div>${codes}<br><b>${esc(a.name)}</b><br>${esc(a.city)}, ${esc(a.country)} · elev ${a.elev}ft · tier ${a.tier}<br>`+
      `<a href="https://ourairports.com/airports/${esc(a.ident)}/" target="_blank" rel="noopener">OurAirports page ↗</a><br>`+
      `<button onclick="window.SKY_UI.setFrom('${a.id}')">Set From</button> <button onclick="window.SKY_UI.setTo('${a.id}')">Set To</button></div>`);
    if(isHome)m.bindTooltip("HOME "+a.id,{permanent:true,direction:"top"});
    m.addTo(skyMap);});
  startFlights(s);
  if(pts.length)skyMap.fitBounds(pts,{padding:[30,30]});
  else{const h=D.airports.find(a=>a.id===s.home);skyMap.setView(h?[h.lat,h.lon]:[22,75],4);}
  setTimeout(()=>{try{skyMap&&skyMap.invalidateSize();}catch(e){}},60);
  }catch(err){el.innerHTML='<p class="muted">Map failed to start. Everything else still works.</p>';skyMap=null;}
}
// --- Living map: animated flights + day/night shade ---
let nightLayer=null;
function stopFlights(){skyFx.forEach(id=>{try{clearInterval(id);}catch(e){}});skyFx=[];}
function startFlights(s){
  // Player flights only. Crossing time is scaled from REAL cruise speed:
  // 12 animation-seconds per real flight hour, so relative speeds are true
  // (a 900 km/h widebody visibly outruns a 500 km/h turboprop).
  stopFlights();
  const SCALE=12, planes=[], SIM=window.SKY_SIM;
  const addPlane=(A,B,popup,dist,speed)=>{
    if(!A||!B)return;
    const mk=L.marker([A.lat,A.lon],{icon:L.divIcon({className:"plane",html:"✈️",iconSize:[18,18],iconAnchor:[9,9]}),keyboard:false});
    mk.bindPopup(popup);mk.addTo(skyMap);
    const D=Math.max(5,(dist/Math.max(300,speed||800))*SCALE); // seconds, one-way
    planes.push({mk,A,B,t:Math.random(),v:0.24/D*(Math.random()<0.5?-1:1)});
  };
  s.routes.filter(r=>r.status==="ACTIVE").forEach(r=>{
    const A=D.airports.find(a=>a.id===r.from),B=D.airports.find(a=>a.id===r.to);
    if(!A||!B)return;
    const ac=(s.fleet||[]).find(a=>a.id===r.aircraftId);
    const m=ac?G.model(ac.modelId):null;
    const dist=SIM.havKm(A,B),speed=m?m.speed:800;
    const info=m?`<br>${esc(m.name)} · ${m.speed} km/h cruise`:"";
    const lastH=r.hist&&r.hist.length?r.hist[r.hist.length-1]:null;
    const body=(m&&m.cls==="Cargo")
      ?`🚚 <b>${r.from}–${r.to}</b><br>${lastH&&lastH.tons!=null?lastH.tons+"t last day":"no flights yet"} · <b>${G.fmt$((r.profit7||0)/7)}/day</b>${info}`
      :`✈️ <b>${r.from}–${r.to}</b><br>LF ${Math.round((r.lf7||0)*100)}% · <b>${G.fmt$((r.profit7||0)/7)}/day</b>${info}`;
    const n=Math.min(2,r.freq||1);
    for(let i=0;i<n;i++)addPlane(A,B,body+`<br>${esc(s.name)}`,dist,speed);
  });
  skyFx.push(setInterval(()=>{planes.forEach(p=>{p.t+=p.v;if(p.t>1){p.t=1;p.v*=-1;}if(p.t<0){p.t=0;p.v*=-1;}
    try{p.mk.setLatLng([p.A.lat+(p.B.lat-p.A.lat)*p.t,p.A.lon+(p.B.lon-p.A.lon)*p.t]);}catch(e){}});},240));
  updateNight();
  skyFx.push(setInterval(updateNight,60000));
}
function updateNight(){
  if(!skyMap||typeof L==="undefined")return;
  try{
    const now=new Date(),utcH=now.getUTCHours()+now.getUTCMinutes()/60;
    let nc=(((180-utcH*15+180)+180)%360+360)%360-180; // night-side center longitude
    if(nightLayer){try{skyMap.removeLayer(nightLayer);}catch(e){}}
    nightLayer=L.layerGroup();
    const draw=(w,e)=>{if(e-w>0.01)L.rectangle([[72,w],[-55,e]],{stroke:false,fillColor:"#000",fillOpacity:0.28,interactive:false}).addTo(nightLayer);};
    if(nc-90<-180){draw(nc-90+360,180);draw(-180,nc+90);}
    else if(nc+90>180){draw(nc-90,180);draw(-180,nc+90-360);}
    else draw(nc-90,nc+90);
    nightLayer.addTo(skyMap);
    try{nightLayer.bringToBack();}catch(e){}
  }catch(e){}
}
function bind(v){
  const s=G.S();
  v.querySelectorAll("[data-maint]").forEach(b=>b.onclick=()=>{G.maintain(b.dataset.maint,"A");render();});
  v.querySelectorAll("[data-maintC]").forEach(b=>b.onclick=()=>{G.maintain(b.dataset.maintC,"C");render();});
  v.querySelectorAll("[data-sell]").forEach(b=>b.onclick=()=>{const i=s.fleet.findIndex(a=>a.id===b.dataset.sell);if(i>=0){const a=s.fleet[i];if(a.how==="lease"){alert("Leased aircraft can't be sold — return it instead.");return;}s.cash+=Math.round(G.model(a.modelId).buy*0.5);s.fleet.splice(i,1);s.routes.filter(r=>r.aircraftId===a.id).forEach(r=>r.status="REVIEW");G.save();render();}});
  v.querySelectorAll("[data-return]").forEach(b=>b.onclick=()=>{const i=s.fleet.findIndex(a=>a.id===b.dataset.return);if(i>=0){const a=s.fleet[i];const m=G.model(a.modelId);s.fleet.splice(i,1);s.routes.filter(r=>r.aircraftId===a.id).forEach(r=>r.status="REVIEW");G.pushAdvisor("Returned leased "+(m?m.name:a.modelId)+" to lessor (no payout).");G.save();render();}});
  v.querySelectorAll("[data-used]").forEach(b=>b.onclick=()=>{const u=s.usedMarket.find(x=>x.key===b.dataset.used);const r=G.addAircraft(u.modelId,"buy",s.home,u);if(r.err)alert(r.err);else{s.usedMarket=s.usedMarket.filter(x=>x.key!==u.key);G.save();render();}});
  const doBuy=v.querySelector("#doBuy");if(doBuy)doBuy.onclick=()=>{const r=G.addAircraft(v.querySelector("#buyModel").value,v.querySelector("#buyHow").value,s.home);if(r.err)alert(r.err);else render();};
  const doQuote=v.querySelector("#doQuote");if(doQuote)doQuote.onclick=()=>{const q=G.loanQuote(+v.querySelector("#loanAmt").value,v.querySelector("#loanPlan").value);v.querySelector("#loanQuote").innerHTML=q.err?`<span class="loss">${esc(q.err)}</span>`:`Borrow <b>${G.fmt$(q.amount)}</b> → <b>${G.fmt$(q.daily)}/day</b> x ${q.days}d · total ${G.fmt$(q.total)} (interest ${G.fmt$(q.interest)}, ${(q.apr*100).toFixed(1)}% APR)`;};
  const doLoan=v.querySelector("#doLoan");if(doLoan)doLoan.onclick=()=>{const r=G.takeLoan(+v.querySelector("#loanAmt").value,v.querySelector("#loanPlan").value);if(r.err)alert(r.err);else render();};
  v.querySelectorAll("[data-payoff]").forEach(b=>b.onclick=()=>{const r=G.payoffLoan(b.dataset.payoff);if(r.err)alert(r.err);else render();});
  const rf=v.querySelector("#rFrom");if(rf){rf.value=routeDraft.from;v.querySelector("#rTo").value=routeDraft.to;v.querySelector("#rFreq").value=String(routeDraft.freq);
    rf.onchange=()=>routeDraft.from=rf.value;v.querySelector("#rTo").onchange=e=>routeDraft.to=e.target.value;
    v.querySelector("#rFreq").onchange=e=>routeDraft.freq=+e.target.value;v.querySelector("#rFare").oninput=e=>routeDraft.fareY=+e.target.value||200;
    v.querySelector("#doPreview").onclick=()=>render();
    v.querySelector("#doOpt").onclick=()=>{const acId=v.querySelector("#rAc").value;const ac=s.fleet.find(a=>a.id===acId);if(!ac){alert("No idle aircraft");return;}
      const b=G.optimizeFare(routeDraft.from,routeDraft.to,ac.modelId,routeDraft.freq);routeDraft.fareY=b.fare;render();flash("Optimal fare $"+b.fare+" → "+G.fmt$(b.profit)+"/day");};
    v.querySelector("#doOpen").onclick=()=>{const acId=v.querySelector("#rAc").value;if(!acId){alert("Buy/lease an aircraft first (Fleet tab).");return;}
      const r=G.openRoute(routeDraft.from,routeDraft.to,acId,routeDraft.freq,routeDraft.fareY);if(r.err)alert(r.err);else{flash("Route launched! +1 Day to fly it.");tab="dash";document.querySelectorAll("#tabs button").forEach(x=>x.classList.toggle("on",x.dataset.t==="dash"));render();}};}
  v.querySelectorAll("[data-susp]").forEach(b=>b.onclick=()=>{const r=s.routes.find(x=>x.id===b.dataset.susp);r.status=r.status==="ACTIVE"?"SUSPENDED":"ACTIVE";G.save();render();});
  v.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>{s.routes=s.routes.filter(x=>x.id!==b.dataset.close);G.save();render();});
  v.querySelectorAll("[data-gazclose]").forEach(b=>b.onclick=()=>{s.gazetteClosed=true;G.save();render();});
  const go=v.querySelector("[data-gazopen]");if(go)go.onclick=()=>{s.gazetteClosed=false;G.save();render();};
}
window.addEventListener("DOMContentLoaded",init);
})();
