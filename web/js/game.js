// Skyline game state + tick engine + AI + missions + save/offline
window.SKY_GAME = (() => {
  const LS="skyline_save_v1";
  const DAY_MS=45000; // 1 game-day = 45s real (fast fun) + manual advance
  let S=null;

  function ap(id){return window.SKY_DATA.airports.find(a=>a.id===id);}
  function model(id){return window.SKY_DATA.aircraftModels.find(m=>m.id===id);}
  function fmt$ (n){const v=Math.round(n);const neg=v<0;const a=Math.abs(v);
    const s=a>=1e9?(a/1e9).toFixed(2)+"B":a>=1e6?(a/1e6).toFixed(2)+"M":a>=1e3?(a/1e3).toFixed(1)+"K":a.toString();
    return (neg?"-$":"$")+s;}
  function fmtN(n){n=Math.round(n);return n>=1e6?(n/1e6).toFixed(2)+"M":n>=1e3?(n/1e3).toFixed(1)+"K":n.toString();}

  function newAirline(name,code,home,arch){
    S={v:1,name,code:(code||"SKY").toUpperCase().slice(0,3),home,arch:arch||"Balanced",
      cash:5e6,rep:55,level:1,xp:0,day:1,fuel:2.85,econ:1,event:null,eventDays:0,
      fleet:[],routes:[],ai:[],history:[],missionsDone:{},daily:{day:0,flights:0,profit:0},
      stats:{pax:0,flights:0,revenue:0,profit:0},lastSeen:Date.now(),awayReport:null,
      advisor:[],story:0,ach:{},usedMarket:genUsed(),fuelLocks:0,loans:[],loanBlacklistUntil:0,created:Date.now()};
    // starter fleet: 2 leased CloudWorks R-109 (100-seat regional jet, DAC-Gulf capable)
    addAircraft("R109","lease",home);addAircraft("R109","lease",home);
    S.ai=genAI();
    save();
    return S;
  }
  function genUsed(){
    const pool=["R157","R160","N164","N129","R153","P189","N198","R107","R107","N163"];const out=[];
    for(let i=0;i<6;i++){const id=pool[Math.floor(Math.random()*pool.length)];const m=model(id);
      const disc=0.35+Math.random()*0.25;out.push({key:"U"+Date.now()+i,modelId:id,price:Math.round(m.buy*(1-disc)),cond:62+Math.round(Math.random()*25),ageY:6+Math.round(Math.random()*8)});}
    return out;
  }
  function genAI(){
    // Each AI has a home base + regional network matching its personality.
    // Titan keeps a DXB–DAC leg so the tutorial corridor stays contested (but winnable).
    const defs=[
      {name:"SwiftGo (LCC)",arch:"LCC",rep:48,fareMul:0.85,freq:3,aggro:0.9,color:"#e11d48",base:"CGK",legs:[["CGK","SIN",3],["CGK","BKK",3],["CGK","KUL",2]]},
      {name:"Royal Meridian (Premium)",arch:"Premium",rep:78,fareMul:1.25,freq:2,aggro:0.4,color:"#7c3aed",base:"LHR",legs:[["LHR","JFK",1],["LHR","DXB",2],["LHR","SIN",1]]},
      {name:"Magnolia Regional",arch:"Regional",rep:60,fareMul:1.0,freq:2,aggro:0.5,color:"#059669",base:"ATL",legs:[["ATL","MIA",2],["ATL","MEX",2],["ATL","YYZ",2]]},
      {name:"Titan Airways (Mega)",arch:"Mega",rep:70,fareMul:1.05,freq:4,aggro:0.7,color:"#0369a1",base:"DXB",legs:[["DXB","DAC",2],["DXB","LHR",1],["DXB","JNB",1]]}];
    return defs.map((d,i)=>({id:"AI"+i,...d,cash:20e6+i*15e6,pax:0,profit:0,
      routes:d.legs.map(l=>({from:l[0],to:l[1],fareMul:d.fareMul,freq:l[2]}))}));
  }
  function addAircraft(modelId,how,base,used){
    const m=model(modelId);
    if(!m)return{err:"Unknown aircraft model."};
    if(how==="lease"){const dep=m.lease;if(S.cash<dep)return{err:"Need "+fmt$(dep)+" deposit."};
      S.cash-=dep;S.fleet.push({id:"AC"+Date.now()+Math.floor(Math.random()*999),modelId,how,base,cond:100,ageY:used?.ageY||0,cycles:0,hours:0,config:{Y:m.seats},status:"ACTIVE",leaseDue:S.day+180});}
    else{const price=used?used.price:m.buy;if(S.cash<price)return{err:"Need "+fmt$(price)};
      S.cash-=price;S.fleet.push({id:"AC"+Date.now()+Math.floor(Math.random()*999),modelId,how,base,cond:used?.cond||100,ageY:used?.ageY||0,cycles:0,hours:0,config:{Y:m.seats},status:"ACTIVE"});}
    save();return{ok:true};
  }
  function commonDisc(){
    // manufacturer commonality: 6+ of one brand = -8% maint, cap -25%
    const fam={};S.fleet.forEach(a=>{const m=model(a.modelId);if(!m)return;fam[m.mfr]=(fam[m.mfr]||0)+1;});
    let d=0;Object.values(fam).forEach(c=>{if(c>5)d+=0.08;});return Math.min(0.25,d);
  }
  function routePreview(fromId,toId,modelId,freq,fareY){
    const A=ap(fromId),B=ap(toId),M=model(modelId);
    if(!A||!B)return{err:"Unknown airport."};
    if(!M)return{err:"Unknown aircraft model."};
    const SIM=window.SKY_SIM;
    const dist=SIM.havKm(A,B);
    if(dist>M.range)return{err:M.name+" range "+M.range+"km < "+Math.round(dist)+"km."};
    if(Math.min(A.runway,B.runway)<M.runway)return{err:"Runway too short (need "+M.runway+"m)."};
    const baseD=SIM.baseDemand(A,B,dist);
    const mFare=SIM.marketFare(dist,A,B);
    const e=1.3,season=1,event=S.event?.demandMul||1;
    // competitors on this O-D: AI with same pair + player share via logit
    const rivals=S.ai.filter(ai=>ai.routes.some(r=>(r.from===fromId&&r.to===toId)||(r.from===toId&&r.to===fromId)));
    // FREIGHTERS: no pax — revenue = carried tons x km x $0.21 (=$0.30/ton-km at 70% load)
    if(M.cls==="Cargo"){
      const tons=Math.round(M.cargo*freq*0.7*10)/10;
      const c=SIM.flightCost({model:M,dist,apA:A,apB:B,fuelPrice:S.fuel,ageY:1,commonDisc:commonDisc(),pax:0,freq,cabinJ:false});
      const rev=Math.round(tons*dist*0.3);
      const cost=Math.round(c.total*freq);
      return{dist:Math.round(dist),baseD:Math.round(baseD),mFare,pax:0,cargoT:tons,lf:0.7,rev,cost,profit:rev-cost,myShare:1,rivals:rivals.length,isCargo:true,
        perFlight:{rev:Math.round(rev/Math.max(1,freq)),cost:Math.round(cost/Math.max(1,freq))}};
    }
    const uP=SIM.util(fareY,freq,S.rep,0.3,0.8,1.2);
    const uR=rivals.map(ai=>SIM.util(mFare*ai.fareMul,2,ai.rep,0.3,0.8,1.2));
    const sh=SIM.share([uP,...uR]);const myShare=sh[0];
    const dem=SIM.demandAtPrice(baseD,fareY,mFare,e,S.rep,freq,season,event,S.econ,myShare);
    const seats=M.seats*freq;
    const pax=Math.min(seats,Math.round(dem));
    const lf=pax/seats;
    const paxSplit={Y:pax};
    const c=SIM.flightCost({model:M,dist,apA:A,apB:B,fuelPrice:S.fuel,ageY:1,commonDisc:commonDisc(),pax,freq,cabinJ:false});
    // daily totals = per-flight * freq
    const rev=pax*fareY + M.cargo*120*freq*0.5;
    const cost=c.total*freq;
    return{dist:Math.round(dist),baseD:Math.round(baseD),mFare,pax,lf,rev:Math.round(rev),cost:Math.round(cost),profit:Math.round(rev-cost),myShare,rivals:rivals.length,
      perFlight:{rev:Math.round(rev/Math.max(1,freq)),cost:Math.round(cost/Math.max(1,freq))}};
  }
  function openRoute(fromId,toId,aircraftId,freq,fareY){
    if(S.routes.length>=2+S.level*2)return{err:"Route limit reached (level up to unlock)."};
    const ac=S.fleet.find(a=>a.id===aircraftId);
    if(!ac)return{err:"Aircraft not found."};
    if(S.routes.some(r=>r.aircraftId===aircraftId&&r.status==="ACTIVE"))return{err:"Aircraft already assigned. Buy/lease another."};
    const pv=routePreview(fromId,toId,ac.modelId,freq,fareY);
    if(pv.err)return pv;
    S.routes.push({id:"R"+Date.now(),from:fromId,to:toId,aircraftId,freq,fareY,status:"ACTIVE",lf7:pv.lf,profit7:pv.profit*7,hist:[]});
    save();return{ok:true,pv};
  }
  function optimizeFare(fromId,toId,modelId,freq){
    const M=model(modelId);
    if(M&&M.cls==="Cargo"){const pv=routePreview(fromId,toId,modelId,freq,0);return{fare:0,profit:pv.profit||-1e18,pv};}
    const A=ap(fromId),B=ap(toId);const SIM=window.SKY_SIM;
    const dist=SIM.havKm(A,B);const mFare=SIM.marketFare(dist,A,B);
    let best={fare:mFare,profit:-1e18,pv:null};
    for(let f=Math.round(mFare*0.6);f<=mFare*1.6;f+=Math.max(2,Math.round(mFare*0.03))){
      const pv=routePreview(fromId,toId,modelId,freq,f);
      if(pv.err)continue;
      if(pv.profit>best.profit)best={fare:f,profit:pv.profit,pv};
    }
    return best;
  }
  function simulateDay(){
    const SIM=window.SKY_SIM;
    S.day++;S.daily={day:S.day,flights:0,profit:0};
    // fuel mean-reversion + shocks
    const rnd=SIM.mulberry(S.day*7919+13)();
    S.fuel=Math.max(1.8,Math.min(4.4,S.fuel+(2.9-S.fuel)*0.06+(rnd-0.5)*0.25));
    if(S.eventDays>0){S.eventDays--;if(S.eventDays===0)S.event=null;}
    else if(rnd>0.93){const evs=[
      {name:"Tourism boom in SE Asia",demandMul:1.3,days:5,desc:"+30% demand on BKK/KUL/SIN/MLE routes"},
      {name:"Fuel spike!",demandMul:0.95,days:4,fuelShock:0.7,desc:"Fuel +$0.70. Consider lower freq."},
      {name:"Holiday surge",demandMul:1.25,days:3,desc:"+25% everywhere"},
      {name:"Business summit DXB/DOH",demandMul:1.2,days:4,desc:"+20% Gulf routes"}];
      const e=evs[Math.floor(rnd*10)%evs.length];S.event=e;S.eventDays=e.days;
      if(e.fuelShock)S.fuel+=e.fuelShock;
      pushAdvisor("Event: "+e.name+" — "+e.desc);
    }
    let dayRev=0,dayCost=0,dayPax=0,dayFlights=0;
    const disc=commonDisc();
    for(const r of S.routes){
      if(r.status!=="ACTIVE")continue;
      const ac=S.fleet.find(a=>a.id===r.aircraftId);
      if(!ac||ac.status!=="ACTIVE")continue;
      const A=ap(r.from),B=ap(r.to),M=model(ac.modelId);
      const pv=routePreview(r.from,r.to,ac.modelId,r.freq,r.fareY);
      if(pv.err){r.status="REVIEW";continue;}
      // ops randomness: delays/cancels from condition
      const rr=SIM.mulberry(S.day*31+r.id.length*77)();
      const delayP=(100-ac.cond)/250;let pax=pv.pax,flown=r.freq;
      let tons=pv.cargoT||0;
      if(rr<Math.max(0,(60-ac.cond))/500){flown=Math.max(0,r.freq-1);pax=Math.round(pax*(flown/Math.max(1,r.freq)));tons=Math.round(tons*(flown/Math.max(1,r.freq))*10)/10;pushAdvisor("Cancellation on "+r.from+"–"+r.to+" (condition "+Math.round(ac.cond)+"%). Maintain!");}
      const isCargo=M.cls==="Cargo";
      const rev=isCargo?Math.round(tons*pv.dist*0.3):pax*r.fareY+M.cargo*120*r.freq*0.5;
      const c=SIM.flightCost({model:M,dist:pv.dist,apA:A,apB:B,fuelPrice:S.fuel,ageY:ac.ageY,commonDisc:disc,pax,freq:r.freq,cabinJ:false});
      const cost=c.total*r.freq;
      const profit=rev-cost;
      const lf=isCargo?0.7:(M.seats?pax/(M.seats*r.freq):0);
      dayRev+=rev;dayCost+=cost;dayPax+=pax;dayFlights+=flown;
      r.hist.push({day:S.day,pax,profit:Math.round(profit),lf,tons});
      if(r.hist.length>14)r.hist.shift();
      r.lf7=r.hist.reduce((x,h)=>x+h.lf,0)/r.hist.length;
      r.profit7=r.hist.reduce((x,h)=>x+h.profit,0)/r.hist.length*7;
      // wear
      ac.cycles+=r.freq;ac.hours+=c.hrs*r.freq;ac.ageY+=1/365;
      ac.cond=Math.max(5,ac.cond-(r.freq*0.8+c.hrs*r.freq*0.3)/3);
      // rep drift
      S.rep=Math.max(5,Math.min(99,S.rep+(profit>0?0.15:-0.3)+(ac.cond<50?-0.4:0.05)+(lf>0.8?0.1:0)));
      // AI reacts: undercut profitable player routes
      if(profit>15000&&rr>0.6){const ai=S.ai[Math.floor(rr*S.ai.length)];if(!ai.routes.some(x=>x.from===r.from&&x.to===r.to)){ai.routes.push({from:r.from,to:r.to,fareMul:Math.max(0.75,ai.fareMul-0.05),freq:2});pushAdvisor(ai.name+" entered "+r.from+"–"+r.to+"! Check your fare.");}}
    }
    // lease + overhead daily
    let fixed=2500+S.fleet.length*400;
    S.fleet.forEach(a=>{if(a.how==="lease"&&S.day>=a.leaseDue){a.leaseDue=S.day+180;fixed+=model(a.modelId).lease*0.1;}});
    dayCost+=fixed;
    dayCost+=processLoans(); // loan installments debit after revenue lands
    const profit=dayRev-dayCost;
    S.cash+=profit;
    S.stats={pax:S.stats.pax+dayPax,flights:S.stats.flights+dayFlights,revenue:S.stats.revenue+dayRev,profit:S.stats.profit+profit};
    S.daily={day:S.day,flights:dayFlights,profit};
    // XP
    const xpGain=dayFlights*2+dayPax/500+Math.max(0,profit)/10000;
    S.xp+=xpGain;
    const need=100*Math.pow(S.level,1.6);
    if(S.xp>=need){S.level++;S.xp=0;pushAdvisor("Level up! Now level "+S.level+". Route limit +2.");}
    S.history.push({day:S.day,rev:Math.round(dayRev),cost:Math.round(dayCost),profit:Math.round(profit),pax:dayPax});
    if(S.history.length>90)S.history.shift();
    // maintenance auto-warning
    S.fleet.forEach(a=>{if(a.cond<45&&!a.warned){a.warned=true;pushAdvisor(model(a.modelId).name+" needs maintenance (cond "+Math.round(a.cond)+"%).");}});
    // bankruptcy protection
    if(S.cash<0){S.cash=500000;S.rep=Math.max(5,S.rep-10);pushAdvisor("Bankruptcy protection: reset to $500K, rep -10. Cut unprofitable routes!");}
    // missions check
    checkMissions(dayRev,profit,dayPax,dayFlights);
    S.lastSeen=Date.now();save();
    return{rev:dayRev,cost:dayCost,profit,pax:dayPax,flights:dayFlights};
  }
  function maintain(acId,kind){
    const a=S.fleet.find(x=>x.id===acId);if(!a)return;
    const cost=kind==="C"?90000:6000;
    if(S.cash<cost)return{err:"Need "+fmt$(cost)};
    S.cash-=cost;a.cond=kind==="C"?100:Math.min(100,a.cond+35);a.warned=false;save();return{ok:true};
  }
  // ---------- BANK LOANS ----------
  // Amortized daily-installment loans. Payments auto-debit each day after route
  // revenue lands. Missed payments escalate: fee+rep hit -> APR penalty ->
  // default (repossession or blacklist).
  const LOAN_PLANS=[
    {id:"express",name:"Express",days:30,apr:0.06},
    {id:"standard",name:"Standard",days:90,apr:0.09},
    {id:"extended",name:"Extended",days:180,apr:0.12}];
  function basePlan(id){return LOAN_PLANS.find(p=>p.id===id);}
  function loanRate(plan){const p=typeof plan==="string"?basePlan(plan):plan;return p.apr+Math.min(0.08,Math.max(0,60-S.rep)*0.002);}
  function loanPlans(){return LOAN_PLANS.map(p=>({id:p.id,name:p.name,days:p.days,baseApr:p.apr,apr:loanRate(p)}));}
  function creditLimit(){return 2e6*S.level;}
  function outstandingDebt(){return (S.loans||[]).filter(l=>l.status==="ACTIVE").reduce((x,l)=>x+l.balance,0);}
  function loanQuote(amount,planId){
    const plan=basePlan(planId);if(!plan)return{err:"Unknown loan plan."};
    amount=Math.floor(Number(amount)||0);
    if(S.day<(S.loanBlacklistUntil||0))return{err:"Bank blacklisted you until day "+S.loanBlacklistUntil+"."};
    if((S.loans||[]).some(l=>l.status==="ACTIVE"&&l.misses>0))return{err:"Catch up on missed payments before borrowing more."};
    if(amount<100000)return{err:"Minimum loan is $100K."};
    if(amount>50e6)return{err:"Maximum single loan is $50M."};
    const avail=creditLimit()-outstandingDebt();
    if(amount>avail)return{err:"Credit limit exceeded — available "+fmt$(Math.max(0,avail))+" (limit = $2M x level)."};
    const apr=loanRate(plan),r=apr/365,n=plan.days;
    const daily=Math.max(1,Math.round(amount*r/(1-Math.pow(1+r,-n))));
    return{amount,planId:plan.id,planName:plan.name,days:n,apr,daily,total:daily*n,interest:daily*n-amount};
  }
  function takeLoan(amount,planId){
    const q=loanQuote(amount,planId);if(q.err)return q;
    S.cash+=q.amount;
    S.loans.push({id:"L"+Date.now()+Math.floor(Math.random()*999),amount:q.amount,balance:q.amount,apr:q.apr,daily:q.daily,plan:q.planId,planName:q.planName,days:q.days,startDay:S.day,paid:0,misses:0,status:"ACTIVE",defaulted:false});
    pushAdvisor("Bank loan: "+fmt$(q.amount)+" ("+q.planName+", "+(q.apr*100).toFixed(1)+"% APR, "+fmt$(q.daily)+"/day for "+q.days+"d).");
    save();return{ok:true,q};
  }
  function payoffLoan(id){
    const l=(S.loans||[]).find(x=>x.id===id&&x.status==="ACTIVE");if(!l)return{err:"Loan not found."};
    if(S.cash<l.balance)return{err:"Need "+fmt$(Math.round(l.balance))+" to clear it."};
    S.cash-=Math.round(l.balance);l.balance=0;l.status="REPAID";
    S.rep=Math.min(99,S.rep+2);
    pushAdvisor("Loan repaid early in full — the bank trusts you more (+2 rep).");
    save();return{ok:true};
  }
  function loanSchedule(l){
    // live amortization from current balance (stays correct after late fees)
    const rows=[];let bal=l.balance;const r=l.apr/365;
    for(let i=1;i<=l.days&&bal>0.5&&i<=400;i++){
      const interest=bal*r;
      const pay=Math.min(l.daily,bal+interest);
      const principal=Math.min(bal,Math.max(0,pay-interest));
      bal=Math.max(0,bal-principal);
      rows.push({day:S.day+i,pay:Math.round(pay),principal:Math.round(principal),interest:Math.round(pay-principal),bal:Math.round(bal)});
    }
    return rows;
  }
  function processLoans(){
    let paidToday=0;
    for(const l of (S.loans||[])){
      if(l.status!=="ACTIVE"||l.balance<=0)continue;
      if(S.day<=l.startDay)continue; // first installment the day after signing
      const r=l.apr/365,interest=l.balance*r,due=Math.min(l.daily,l.balance+interest);
      if(S.cash>=due){
        S.cash-=due;paidToday+=due;
        l.balance=Math.max(0,l.balance-Math.min(l.balance,Math.max(0,due-interest)));
        l.paid++;l.misses=0;
        if(l.balance<=1){l.balance=0;l.status="REPAID";S.rep=Math.min(99,S.rep+1);pushAdvisor("Loan fully repaid ("+l.planName+", "+fmt$(l.amount)+").");}
      }else{
        l.misses++;
        const fee=Math.round(due*0.05);
        l.balance+=fee;
        S.rep=Math.max(5,S.rep-2);
        pushAdvisor("Missed loan payment ("+fmt$(Math.round(due))+")! Late fee "+fmt$(fee)+". Miss #"+l.misses+".");
        if(l.misses===2){l.apr=Math.min(0.30,l.apr+0.02);pushAdvisor("Bank penalty: loan APR raised to "+(l.apr*100).toFixed(1)+"%. No new loans until you catch up.");}
        if(l.misses>=3&&!l.defaulted){l.defaulted=true;defaultLoan(l);}
      }
    }
    return Math.round(paidToday);
  }
  function defaultLoan(l){
    S.rep=Math.max(5,S.rep-8);
    const owned=S.fleet.filter(a=>a.how!=="lease");
    if(owned.length){
      owned.sort((a,b)=>((model(b.modelId)||{buy:0}).buy-((model(a.modelId)||{buy:0}).buy)));
      const a=owned[0],m=model(a.modelId);
      const credit=Math.round((m?m.buy:0)*0.4);
      l.balance=Math.max(0,l.balance-credit);
      S.fleet.splice(S.fleet.indexOf(a),1);
      S.routes.filter(r=>r.aircraftId===a.id).forEach(r=>r.status="REVIEW");
      pushAdvisor("LOAN DEFAULT: bank repossessed your "+(m?m.name:a.modelId)+" ("+fmt$(credit)+" credited).");
      if(l.balance<=0){l.status="REPAID";pushAdvisor("Loan closed by the repossession sale.");}
    }else{
      const penalty=Math.round(l.balance*0.10);
      l.balance+=penalty;S.loanBlacklistUntil=S.day+30;
      pushAdvisor("LOAN DEFAULT: nothing to repossess — 10% penalty ("+fmt$(penalty)+") + no new loans for 30 days.");
    }
  }
  const STORY=[
    {t:"Lease your 3rd aircraft",check:s=>s.fleet.length>=3,rw:150000},
    {t:"Open your first route",check:s=>s.routes.length>=1,rw:100000},
    {t:"Carry 1,000 passengers (total)",check:s=>s.stats.pax>=1000,rw:200000},
    {t:"Reach level 3",check:s=>s.level>=3,rw:300000},
    {t:"Operate 3 active routes",check:s=>s.routes.filter(r=>r.status==="ACTIVE").length>=3,rw:400000},
    {t:"Earn $100K in a single day",check:s=>s.history.some(h=>h.profit>=100000),rw:500000},
    {t:"Reach $8M cash",check:s=>s.cash>=8e6,rw:600000}];
  function checkMissions(dayRev,profit,pax,flights){
    STORY.forEach((m,i)=>{const k="story"+i;
      if(!S.missionsDone[k]&&m.check(S)){S.missionsDone[k]=1;S.cash+=m.rw;S.xp+=50;
        pushAdvisor("Mission complete: "+m.t+" (+$"+fmtN(m.rw)+")");}});
    if(!S.missionsDone.d0&&flights>=10){S.missionsDone.d0=1;S.cash+=50000;pushAdvisor("Daily: 10 flights (+$50K)");}
  }
  function pushAdvisor(msg){S.advisor.unshift("Day "+S.day+": "+msg);if(S.advisor.length>30)S.advisor.pop();}
  function advisorTips(){
    const tips=[];
    const u=S.fleet.filter(a=>!S.routes.some(r=>r.aircraftId===a.id&&r.status==="ACTIVE"));
    if(u.length)tips.push(u.length+" idle aircraft — open a route from "+S.home+".");
    S.routes.forEach(r=>{if(r.hist.length>=3&&r.profit7<0)tips.push(r.from+"–"+r.to+" losing "+fmt$(r.profit7/7)+"/day. Raise fare or cut frequency — or Optimize.");});
    if(S.fuel>3.4)tips.push("Fuel high ($"+S.fuel.toFixed(2)+"). Favor turboprops/neos on short hops.");
    return tips;
  }
  function save(){try{localStorage.setItem(LS,JSON.stringify(S));}catch(e){}}
  function load(){try{const r=localStorage.getItem(LS);if(r){S=JSON.parse(r);migrate();return S;}}catch(e){}return null;}
  function migrate(){
    // v1 saves used the old 12-model roster — map to the 100-aircraft roster
    const MAP={R70:"R157",R90:"R109",N150c:"N164",N150:"N117",N180:"N119",N200:"N128",N170:"N165",W250:"W135",W350:"W143",W220:"W168",F80:"C178",R50:"R155"};
    let bad=false;
    (S.fleet||[]).forEach(a=>{if(!model(a.modelId)){a.modelId=MAP[a.modelId]||"R109";bad=true;}});
    (S.usedMarket||[]).forEach(u=>{if(!model(u.modelId)){u.modelId="R160";u.price=Math.round(model("R160").buy*0.5);bad=true;}});
    if(!Array.isArray(S.usedMarket)||!S.usedMarket.length)S.usedMarket=genUsed();
    if(!Array.isArray(S.loans))S.loans=[];
    if(!S.loanBlacklistUntil)S.loanBlacklistUntil=0;
    // old saves: AI has no home base yet — backfill display bases, keep their routes
    (S.ai||[]).forEach((a,i)=>{if(!a.base){a.base=["CGK","LHR","ATL","DXB"][i%4]||"DAC";bad=true;}});
    if(bad)pushAdvisor("Fleet updated to the new 100-aircraft roster (old models migrated).");
    save();
  }
  function reset(){localStorage.removeItem(LS);S=null;}
  // offline: 1 game-day per 45s away, cap 40 days, degraded after 7
  function catchUp(){
    if(!S)return null;
    const awayS=(Date.now()-(S.lastSeen||Date.now()))/1000;
    let days=Math.floor(awayS/(DAY_MS/1000));
    if(days<=0)return null;
    days=Math.min(40,days);
    let tot={rev:0,cost:0,profit:0,pax:0,flights:0,days:0};
    for(let i=0;i<days;i++){const full=i<7;const d=simulateDay();
      if(!full){S.cash-=d.profit*0.5;tot.profit-=d.profit*0.5;} // degraded: half profit after 7d
      tot.rev+=d.rev;tot.cost+=d.cost;tot.profit+=d.profit;tot.pax+=d.pax;tot.flights+=d.flights;tot.days++;}
    S.awayReport=tot;S.lastSeen=Date.now();save();return tot;
  }
  return{S:()=>S,newAirline,load,reset,save,addAircraft,openRoute,routePreview,optimizeFare,simulateDay,maintain,loanPlans,loanQuote,takeLoan,payoffLoan,loanSchedule,creditLimit,outstandingDebt,checkMissions,pushAdvisor,advisorTips,catchUp,commonDisc,ap,model,fmt$,fmtN,DAY_MS,
    story:()=>STORY};
})();
