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
      advisor:[],story:0,ach:{},usedMarket:genUsed(),fuelLocks:0,loans:[],loanBlacklistUntil:0,gazetteClosed:false,
      pendingEvent:null,disruption:{days:0,ap:null},promoDays:0,fuelLock:null,contracts:{offers:[],active:[]},eventSeen:false,
      prestige:{n:0,perks:{rev:0,dem:0,mnt:0}},hof:[],livery:{c1:"#0ea5e9",c2:"#f8fafc"},hqStyle:"modern",
      alliance:null,invite:null,crew:{pilots:2,wage:"std",morale:70},created:Date.now()};
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
      {name:"SwiftGo (LCC)",arch:"LCC",rep:48,fareMul:0.85,freq:3,aggro:0.9,color:"#e11d48",base:"CGK",legs:[["CGK","SIN",3],["CGK","BKK",3],["CGK","KUL",2]],
       ceo:"Maya Chen",face:"🧑‍✈️",
       taunts:["Cute little route. We'll take it from here.","You call that a fare? Watch this.","Three daily flights. Try to keep up."],
       praise:["OK, you win this one. Enjoy it while it lasts.","Your load factors… annoyingly good. Well flown."]},
      {name:"Royal Meridian (Premium)",arch:"Premium",rep:78,fareMul:1.25,freq:2,aggro:0.4,color:"#7c3aed",base:"LHR",legs:[["LHR","JFK",1],["LHR","DXB",2],["LHR","SIN",1]],
       ceo:"Lord Ashworth",face:"🤵",
       taunts:["Luxury cannot be discounted, darling.","We don't compete on price. We compete on everything else."],
       praise:["A worthy rival. Champagne?","One almost admires your audacity. Almost."]},
      {name:"Magnolia Regional",arch:"Regional",rep:60,fareMul:1.0,freq:2,aggro:0.5,color:"#059669",base:"ATL",legs:[["ATL","MIA",2],["ATL","MEX",2],["ATL","YYZ",2]],
       ceo:"Dolly Ray",face:"👩‍✈️",
       taunts:["Bless your heart, we'll match that fare.","Honey, we've flown this hop since before you were listed."],
       praise:["Well flown, sugar. You earned that one.","Alright, alright — that was some fine schedulin'."]},
      {name:"Titan Airways (Mega)",arch:"Mega",rep:70,fareMul:1.05,freq:4,aggro:0.7,color:"#0369a1",base:"DXB",legs:[["DXB","DAC",2],["DXB","LHR",1],["DXB","JNB",1]],
       ceo:"Omar Haddad",face:"🧔",
       taunts:["We have 400 aircraft. You have opinions.","This corridor is ours. It was always ours."],
       praise:["Impressive. We may acquire you one day.","Our analysts flagged you as 'annoying'. Respect."]}];
    return defs.map((d,i)=>({id:"AI"+i,...d,cash:20e6+i*15e6,pax:0,profit:0,
      routes:d.legs.map(l=>({from:l[0],to:l[1],fareMul:d.fareMul,freq:l[2]}))}));
  }
  // Newspaper headlines: collected only during offline catch-up (collecting=true),
  // notable live events always go to the advisor feed via pushAdvisor.
  let collecting=false;const NEWS=[];
  function headline(t){if(collecting){NEWS.push("Day "+S.day+": "+t);if(NEWS.length>40)NEWS.shift();}}
  function ceoLine(ai,list){const l=(ai[list]&&ai[list].length?ai[list]:["..."]);return l[Math.floor(Math.random()*l.length)];}
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
  function routePreview(fromId,toId,modelId,freq,fareY,aircraftId){
    const A=ap(fromId),B=ap(toId),M=model(modelId);
    if(!A||!B)return{err:"Unknown airport."};
    if(!M)return{err:"Unknown aircraft model."};
    const AC=aircraftId?((S.fleet||[]).find(a=>a.id===aircraftId)||null):null;
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
      const c=SIM.flightCost({model:M,dist,apA:A,apB:B,fuelPrice:effFuel(),ageY:1,commonDisc:commonDisc(),pax:0,freq,cabinJ:false});
      const rev=Math.round(tons*dist*0.3*prestigeRev());
      const cost=Math.round((c.total-c.maint)*freq + c.maint*freq*prestigeMntF());
      return{dist:Math.round(dist),baseD:Math.round(baseD),mFare,pax:0,cargoT:tons,lf:0.7,rev,cost,profit:rev-cost,myShare:1,rivals:rivals.length,isCargo:true,
        perFlight:{rev:Math.round(rev/Math.max(1,freq)),cost:Math.round(cost/Math.max(1,freq))}};
    }
    const uP=SIM.util(fareY,freq,S.rep,0.3,0.8,1.2);
    const uR=rivals.map(ai=>SIM.util(mFare*ai.fareMul,2,ai.rep,0.3,0.8,1.2));
    const sh=SIM.share([uP,...uR]);const myShare=sh[0];
    const allyF=(S.alliance&&S.alliance.members&&rivals.some(ai=>S.alliance.members.includes(ai.id)))?1.12:1;
    const dem=SIM.demandAtPrice(baseD,fareY,mFare,e,S.rep,freq,season,event,S.econ,myShare)*(S.promoDays>0?1.15:1)*prestigeDem()*allyF;
    const cfg=cfgOf(AC,M),cap=(cfg.y+cfg.j)*freq;
    const tot=Math.min(cap,Math.round(dem));
    const cr=cabinRev(AC,M,tot,fareY);
    const pax=cr.yPax+cr.jPax,lf=cap?pax/cap:0;
    const c=SIM.flightCost({model:M,dist,apA:A,apB:B,fuelPrice:effFuel(),ageY:1,commonDisc:commonDisc(),pax,freq,cabinJ:false});
    // daily totals = per-flight * freq (J pax pay 2.6x, cost extra catering)
    const rev=Math.round((cr.rev + M.cargo*120*freq*0.5)*prestigeRev());
    const cost=Math.round((c.total-c.maint)*freq + c.maint*freq*prestigeMntF() + cr.jPax*17*freq);
    return{dist:Math.round(dist),baseD:Math.round(baseD),mFare,pax,lf,yPax:cr.yPax,jPax:cr.jPax,fareJ:cr.fareJ,rev,cost,profit:rev-cost,myShare,rivals:rivals.length,
      perFlight:{rev:Math.round(rev/Math.max(1,freq)),cost:Math.round(cost/Math.max(1,freq))}};
  }
  function openRoute(fromId,toId,aircraftId,freq,fareY){
    if(S.routes.length>=2+S.level*2)return{err:"Route limit reached (level up to unlock)."};
    const ac=S.fleet.find(a=>a.id===aircraftId);
    if(!ac)return{err:"Aircraft not found."};
    if(S.routes.some(r=>r.aircraftId===aircraftId&&r.status==="ACTIVE"))return{err:"Aircraft already assigned. Buy/lease another."};
    const pv=routePreview(fromId,toId,ac.modelId,freq,fareY,aircraftId);
    if(pv.err)return pv;
    S.routes.push({id:"R"+Date.now()+"_"+Math.floor(Math.random()*1e6),from:fromId,to:toId,aircraftId,freq,fareY,status:"ACTIVE",lf7:pv.lf,profit7:pv.profit*7,conn7:0,hist:[],reviews:[]});
    const inc=S.ai.filter(ai=>ai.routes.some(x=>(x.from===fromId&&x.to===toId)||(x.from===toId&&x.to===fromId)));
    if(inc.length){const ai=inc[0],line=ceoLine(ai,"taunts");pushAdvisor("💬 "+(ai.ceo||"Rival CEO")+" ("+ai.name+"): \""+line+"\"");}
    save();return{ok:true,pv};
  }
  function optimizeFare(fromId,toId,modelId,freq,aircraftId){
    const M=model(modelId);
    if(M&&M.cls==="Cargo"){const pv=routePreview(fromId,toId,modelId,freq,0);return{fare:0,profit:pv.profit||-1e18,pv};}
    const A=ap(fromId),B=ap(toId);const SIM=window.SKY_SIM;
    const dist=SIM.havKm(A,B);const mFare=SIM.marketFare(dist,A,B);
    let best={fare:mFare,profit:-1e18,pv:null};
    for(let f=Math.round(mFare*0.6);f<=mFare*1.6;f+=Math.max(2,Math.round(mFare*0.03))){
      const pv=routePreview(fromId,toId,modelId,freq,f,aircraftId);
      if(pv.err)continue;
      if(pv.profit>best.profit)best={fare:f,profit:pv.profit,pv};
    }
    return best;
  }
  function mkStrikeEv(){return{id:"strike",title:"Strike vote at "+S.home,desc:"Ground crews demand a bonus before the holiday rush.",
    opts:[{label:"Pay $50K bonus",sub:"+2 reputation"},{label:"Refuse",sub:"2-day walkout, rep -2"}]};}
  function simulateDay(){
    const SIM=window.SKY_SIM;
    S.day++;S.daily={day:S.day,flights:0,profit:0};
    // fuel mean-reversion + shocks
    const rnd=SIM.mulberry(S.day*7919+13)();
    S.fuel=Math.max(1.8,Math.min(4.4,S.fuel+(2.9-S.fuel)*0.06+(rnd-0.5)*0.25));
    if(S.eventDays>0){S.eventDays--;if(S.eventDays===0)S.event=null;}
    if(S.promoDays>0)S.promoDays--;
    if(S.disruption&&S.disruption.days>0){S.disruption.days--;if(S.disruption.days===0){S.disruption.ap=null;pushAdvisor("Operations back to normal after the disruption.");}}
    if(S.fuelLock&&S.fuelLock.left>0)S.fuelLock.left--;
    else if(!S.pendingEvent&&(rnd>0.90||(S.day>=3&&!S.eventSeen&&S.routes.some(r=>r.status==="ACTIVE")))){
      // choice events: the player decides, the world reacts
      const served=[...new Set(S.routes.filter(r=>r.status==="ACTIVE").flatMap(r=>[r.from,r.to]))];
      const ap=served.length?served[Math.floor(SIM.mulberry(S.day*77+3)()*served.length)]:null;
      const pool=[];
      if(ap){const nAff=Math.max(1,S.routes.filter(r=>r.status==="ACTIVE"&&(r.from===ap||r.to===ap)).length);
        pool.push({id:"ash",ap,n:nAff,title:"Volcanic ash closes "+ap,
          desc:`Eruption grounds traffic at ${ap}. ${nAff} of your routes touch it — ash lasts 2 days.`,
          opts:[{label:`Reroute everything ($${fmtN(nAff*15000)})`,sub:"No disruption"},{label:"Cancel flights",sub:"Rep -3, 2-day disruption"}]});
        pool.push(mkStrikeEv());}
      pool.push({id:"promo",title:"Tourism board proposal",desc:"A tourism board offers a joint campaign: +15% demand for 5 days.",
        opts:[{label:"Fund it ($30K)",sub:"+15% demand, 5 days"},{label:"Decline",sub:"Nothing happens"}]});
      pool.push({id:"fuel",title:"Refinery outage",desc:"A refinery fire will push fuel +$0.50/gal unless you stock reserves.",
        opts:[{label:"Buy reserves ($60K)",sub:"Spike halved to +$0.25"},{label:"Ride it out",sub:"Fuel +$0.50"}]});
      pool.push({id:"viral",title:"Crew video goes viral",desc:"A heartwarming video of your crew hit 10M views overnight.",
        opts:[{label:"Promote it ($20K)",sub:"+3 reputation"},{label:"Let it ride",sub:"+1 reputation"}]});
      S.pendingEvent=pool[Math.floor(SIM.mulberry(S.day*55+7)()*pool.length)];
      S.eventSeen=true;
      pushAdvisor("📰 Decision needed: "+S.pendingEvent.title+" — check the alert!");
    }
    let dayRev=0,dayCost=0,dayPax=0,dayFlights=0;
    const disc=commonDisc();
    const needCrew0=new Set(S.routes.filter(r=>r.status==="ACTIVE").map(r=>r.aircraftId)).size;
    const shortCrew=S.crew.pilots<needCrew0;
    for(const r of S.routes){
      if(r.status!=="ACTIVE")continue;
      const ac=S.fleet.find(a=>a.id===r.aircraftId);
      if(!ac||ac.status!=="ACTIVE")continue;
      const A=ap(r.from),B=ap(r.to),M=model(ac.modelId);
      const pv=routePreview(r.from,r.to,ac.modelId,r.freq,r.fareY,ac.id);
      if(pv.err){r.status="REVIEW";continue;}
      // ops randomness: delays/cancels from condition
      const rr=SIM.mulberry(S.day*31+r.id.length*77)();
      const delayP=(100-ac.cond)/250;let pax=pv.pax,flown=r.freq;
      let tons=pv.cargoT||0;
      if(rr<Math.max(0,(60-ac.cond))/500){flown=Math.max(0,r.freq-1);pax=Math.round(pax*(flown/Math.max(1,r.freq)));tons=Math.round(tons*(flown/Math.max(1,r.freq))*10)/10;pushAdvisor("Cancellation on "+r.from+"–"+r.to+" (condition "+Math.round(ac.cond)+"%). Maintain!");}
      // strike/ash disruption grounds extra flights touching the affected airport
      if(S.disruption&&S.disruption.days>0&&(!S.disruption.ap||r.from===S.disruption.ap||r.to===S.disruption.ap)&&flown>0){flown--;pax=Math.round(pax*(flown/Math.max(1,r.freq)));tons=Math.round(tons*(flown/Math.max(1,r.freq))*10)/10;}
      // crew shortage grounds flights too
      if(shortCrew&&rr<0.35&&flown>0){flown--;pax=Math.round(pax*(flown/Math.max(1,r.freq)));tons=Math.round(tons*(flown/Math.max(1,r.freq))*10)/10;}
      const isCargo=M.cls==="Cargo";
      const cr=isCargo?null:cabinRev(ac,M,pax,r.fareY);
      if(cr)pax=cr.yPax+cr.jPax;
      let rev=isCargo?Math.round(tons*pv.dist*0.3):(cr.rev + M.cargo*120*r.freq*0.5);
      rev=Math.round(rev*prestigeRev());
      const c=SIM.flightCost({model:M,dist:pv.dist,apA:A,apB:B,fuelPrice:effFuel(),ageY:ac.ageY,commonDisc:disc,pax,freq:r.freq,cabinJ:false});
      const cost=(c.total-c.maint)*r.freq + c.maint*r.freq*prestigeMntF() + (cr?cr.jPax*17*r.freq:0);
      // hub through-tickets: pax connect onto your other departures from r.to
      let conn=0;
      if(!isCargo){
        const onward=S.routes.filter(q=>q.status==="ACTIVE"&&q.id!==r.id&&q.from===r.to).length;
        if(onward>0){conn=Math.round(pax*Math.min(0.35,0.12*onward));rev+=Math.round(conn*r.fareY*0.8);dayPax+=conn;}
      }
      // hedge P/L tracking (market minus locked price on actual burn)
      if(S.fuelLock&&S.fuelLock.left>0)S.fuelLock.saved=(S.fuelLock.saved||0)+(S.fuel-S.fuelLock.price)*(M.fuel*c.hrs*r.freq)/1.5;
      const profit=rev-cost;
      const lf=isCargo?0.7:(M.seats?pax/(M.seats*r.freq):0);
      dayRev+=rev;dayCost+=cost;dayPax+=pax;dayFlights+=flown;
      r.hist.push({day:S.day,pax,profit:Math.round(profit),lf,tons,conn});
      if(r.hist.length>14)r.hist.shift();
      r.lf7=r.hist.reduce((x,h)=>x+h.lf,0)/r.hist.length;
      r.profit7=r.hist.reduce((x,h)=>x+h.profit,0)/r.hist.length*7;
      r.conn7=r.hist.reduce((x,h)=>x+(h.conn||0),0)/r.hist.length;
      // wear
      ac.cycles+=r.freq;ac.hours+=c.hrs*r.freq;ac.ageY+=1/365;
      ac.cond=Math.max(5,ac.cond-(r.freq*0.8+c.hrs*r.freq*0.3)/3);
      // rep drift
      S.rep=Math.max(5,Math.min(99,S.rep+(profit>0?0.15:-0.3)+(ac.cond<50?-0.4:0.05)+(lf>0.8?0.1:0)));
      // AI reacts: undercut profitable player routes (with CEO trash-talk)
      if(profit>15000&&rr>0.6&&S.ai.length){const ai=S.ai[Math.floor(rr*S.ai.length)];if(ai&&!ai.routes.some(x=>x.from===r.from&&x.to===r.to)){ai.routes.push({from:r.from,to:r.to,fareMul:Math.max(0.75,ai.fareMul-0.05),freq:2});pushAdvisor(ai.name+" entered "+r.from+"–"+r.to+"! Check your fare.");
        const line=ceoLine(ai,"taunts");pushAdvisor("💬 "+(ai.ceo||"Rival CEO")+" ("+ai.name+"): \""+line+"\"");headline("🛩 "+ai.name+" muscles onto "+r.from+"–"+r.to+" — "+(ai.ceo||"its CEO")+": \""+line+"\"");}}
      // Dominated rivals concede praise (once per route)
      const pairRivals=S.ai.filter(ai=>ai.routes.some(x=>(x.from===r.from&&x.to===r.to)||(x.from===r.to&&x.to===r.from)));
      if(!r.conceded&&r.hist.length>=5&&(r.lf7||0)>0.75&&(r.profit7||0)>0&&pairRivals.length&&rr<0.2){
        r.conceded=true;const ai2=pairRivals[Math.floor(rr*pairRivals.length)%pairRivals.length];
        const pline=ceoLine(ai2,"praise");pushAdvisor("🤝 "+(ai2.ceo||"Rival CEO")+" ("+ai2.name+"): \""+pline+"\"");headline("🤝 "+(ai2.ceo||"Rival CEO")+" concedes "+r.from+"–"+r.to+": \""+pline+"\"");}
      // passenger reviews: segments talk back about price/schedule/comfort/reliability
      if(!r.reviews)r.reviews=[];
      const rv=SIM.mulberry(S.day*131+r.id.length*17+5)();
      if(rv<0.65){
        const mf2=SIM.marketFare(pv.dist,A,B),opts=[];
        if(!isCargo){
          if(r.fareY>mf2*1.15)opts.push({seg:"Budget flyers",stars:2,t:"“$"+r.fareY+" for THIS? Never again.”"});
          else if(r.fareY<mf2*0.9)opts.push({seg:"Budget flyers",stars:5,t:"“Cheapest seat in the sky — telling everyone!”"});
          if(r.freq<2)opts.push({seg:"Business travelers",stars:2,t:"“One flight a day isn't a schedule. Do better.”"});
          else if(r.freq>=3)opts.push({seg:"Business travelers",stars:5,t:"“Proper hourly options. My assistant approves.”"});
          if(lf>0.85&&profit>0)opts.push({seg:"Economy cabin",stars:5,t:"“Full flight, happy crew!”"});
        }
        if(ac.cond<60||ac.ageY>8)opts.push({seg:"Premium cabin",stars:2,t:"“The seats creak louder than the engines.”"});
        else if(!isCargo&&S.rep>70&&M.comfort>=6)opts.push({seg:"Premium cabin",stars:5,t:"“A cabin worthy of the fare.”"});
        if(flown<r.freq)opts.push({seg:"Families",stars:1,t:"“Stranded with kids. Thanks for nothing.”"});
        if(opts.length){r.reviews.unshift(opts[Math.floor(rv*97)%opts.length]);if(r.reviews.length>4)r.reviews.pop();}
      }
    }
    // lease + overhead daily
    let fixed=2500+S.fleet.length*400;
    S.fleet.forEach(a=>{if(a.how==="lease"&&S.day>=a.leaseDue){a.leaseDue=S.day+180;fixed+=(model(a.modelId)||{lease:0}).lease*0.1;}});
    dayCost+=fixed;
    dayCost+=processLoans(); // loan installments debit after revenue lands
    refreshOffers();processContracts(); // sponsors top up offers, weekly checks run
    // alliance dues + invitations
    if(S.alliance&&S.day>S.alliance.since&&(S.day-S.alliance.since)%7===0&&S.cash>0){const dues=Math.min(50000,S.cash);S.cash-=dues;dayCost+=dues;}
    if(S.level>=5&&!S.alliance&&!S.invite){
      const ir=SIM.mulberry(S.day*91+5)();
      if(ir<0.12){const al=ALLIANCES[Math.floor(ir*100)%ALLIANCES.length];S.invite={...al,dues:50000};pushAdvisor("✉️ Invitation: join the "+al.name+"? See Ranks.");}
    }
    // crew payroll + morale + shortage
    const needCrew=new Set(S.routes.filter(r=>r.status==="ACTIVE").map(r=>r.aircraftId)).size;
    const wageP={budget:500,std:800,premium:1200}[S.crew.wage]||800;
    dayCost+=S.crew.pilots*wageP;
    const mTgt=S.crew.wage==="premium"?90:S.crew.wage==="budget"?30:65;
    S.crew.morale=Math.max(5,Math.min(99,S.crew.morale+Math.max(-4,Math.min(4,(mTgt-S.crew.morale)*0.2))));
    if(S.crew.pilots<needCrew&&S.crewWarn!==S.day){S.crewWarn=S.day;pushAdvisor(`Crew shortage! ${S.crew.pilots}/${needCrew} crews employed — hire or face delays.`);}
    if(S.crew.morale<25&&!S.pendingEvent){S.pendingEvent=mkStrikeEv();pushAdvisor("📰 Decision needed: Strike vote at "+S.home+" — check the alert!");}
    const profit=dayRev-dayCost;
    S.cash+=profit;
    S.stats={pax:S.stats.pax+dayPax,flights:S.stats.flights+dayFlights,revenue:S.stats.revenue+dayRev,profit:S.stats.profit+profit};
    S.daily={day:S.day,flights:dayFlights,profit};
    // XP
    const xpGain=dayFlights*2+dayPax/500+Math.max(0,profit)/10000;
    S.xp+=xpGain;
    const need=100*Math.pow(S.level,1.6);
    if(S.xp>=need){S.level++;S.xp=0;pushAdvisor("Level up! Now level "+S.level+". Route limit +2.");headline("⭐ "+S.name+" certified as a Level "+S.level+" carrier!");}
    S.history.push({day:S.day,rev:Math.round(dayRev),cost:Math.round(dayCost),profit:Math.round(profit),pax:dayPax});
    if(S.history.length>90)S.history.shift();
    // maintenance auto-warning
    S.fleet.forEach(a=>{if(a.cond<45&&!a.warned){a.warned=true;pushAdvisor(((model(a.modelId)||{}).name||a.modelId)+" needs maintenance (cond "+Math.round(a.cond)+"%).");}});
    // bankruptcy protection
    if(S.cash<0){S.cash=500000;S.rep=Math.max(5,S.rep-10);pushAdvisor("Bankruptcy protection: reset to $500K, rep -10. Cut unprofitable routes!");headline("💸 "+S.name+" rescued from bankruptcy — back to $500K, reputation dented.");}
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
      headline("🚨 Bank seizes "+S.name+"'s "+(m?m.name:"aircraft")+" over unpaid debt ("+fmt$(credit)+" credited).");
      if(l.balance<=0){l.status="REPAID";pushAdvisor("Loan closed by the repossession sale.");}
    }else{
      const penalty=Math.round(l.balance*0.10);
      l.balance+=penalty;S.loanBlacklistUntil=S.day+30;
      pushAdvisor("LOAN DEFAULT: nothing to repossess — 10% penalty ("+fmt$(penalty)+") + no new loans for 30 days.");
      headline("🚨 "+S.name+" defaults with no assets to seize — blacklisted by lenders for 30 days.");
    }
  }
  // ---------- PRESTIGE / CABINS / CREW / ALLIANCE helpers ----------
  function prestigeRev(){return 1+0.08*(((S.prestige||{}).perks||{}).rev||0);}
  function prestigeDem(){return 1+0.08*(((S.prestige||{}).perks||{}).dem||0);}
  function prestigeMntF(){return Math.max(0.6,1-0.12*(((S.prestige||{}).perks||{}).mnt||0));}
  function prestigeInfo(){
    return{eligible:S.level>=10&&S.cash>=10e6,need:"Reach level 10 holding $10M cash",
      n:(S.prestige&&S.prestige.n)||0,
      perks:[{k:"rev",name:"Fleet Legacy",desc:"+8% all revenue per prestige"},{k:"dem",name:"Brand Power",desc:"+8% demand per prestige"},{k:"mnt",name:"Maintenance Culture",desc:"-12% maintenance cost per prestige"}],
      hof:S.hof||[]};
  }
  function doPrestige(perk){
    const info=prestigeInfo();if(!info.eligible)return{err:"Not eligible yet ("+info.need+")."};
    if(!{rev:1,dem:1,mnt:1}[perk])return{err:"Pick a legacy."};
    const prev={n:((S.prestige||{}).n||0)+1,days:S.day,profit:Math.round(S.stats.profit),pax:S.stats.pax,level:S.level};
    const keep={name:S.name,code:S.code,home:S.home,arch:S.arch,livery:S.livery,hqStyle:S.hqStyle};
    const hof=[...(S.hof||[]),prev].slice(-5);
    const P={n:prev.n,perks:{rev:0,dem:0,mnt:0,...((S.prestige||{}).perks||{})}};P.perks[perk]=(P.perks[perk]||0)+1;
    newAirline(keep.name,keep.code,keep.home,keep.arch);
    S.prestige=P;S.hof=hof;S.livery=keep.livery||{c1:"#0ea5e9",c2:"#f8fafc"};S.hqStyle=keep.hqStyle||"modern";
    pushAdvisor("🏛️ "+keep.name+" Group founded (Prestige "+P.n+", legacy: "+perk+"). A new fleet, the same name.");
    headline("🏛️ "+keep.name+" becomes an aviation group (Prestige "+P.n+")!");
    save();return{ok:true};
  }
  // cabin config: J seats each displace 1.5 Y seats; J fare = 2.6x Y
  function cfgOf(ac,M){const c=(ac&&ac.config)||{};return{y:(c.y==null?M.seats:c.y),j:c.j||0};}
  function cabinRev(ac,M,total,fareY){
    const cfg=cfgOf(ac,M),fareJ=Math.round(fareY*2.6);
    const js=Math.min(0.4,Math.max(0.05,0.05+S.rep*0.002+(M.comfort-5)*0.02));
    const jPax=Math.min(cfg.j,Math.round(total*js));
    const yPax=Math.min(cfg.y,total-jPax);
    return{yPax,jPax,fareJ,rev:yPax*fareY+jPax*fareJ};
  }
  function setCabins(acId,j){
    const a=S.fleet.find(x=>x.id===acId);if(!a)return{err:"Aircraft not found."};
    const m=model(a.modelId);if(!m||m.cls==="Cargo")return{err:"Freighters have no cabins."};
    j=Math.max(0,Math.min(Math.floor(m.seats/2),Math.round(Number(j)||0)));
    const y=m.seats-Math.ceil(j*1.5);
    if(y<10)return{err:"Too many business seats (min 10 economy)."};
    a.config={y,j};save();return{ok:true,y,j};
  }
  function hireCrew(){if(S.cash<20000)return{err:"Signing bonus is $20K per crew."};S.cash-=20000;S.crew.pilots++;pushAdvisor("Hired a flight crew ($20K signing).");save();return{ok:true};}
  function fireCrew(){if(S.crew.pilots<=0)return{err:"Nobody left to fire."};S.crew.pilots--;save();return{ok:true};}
  function setWage(w){if(!{budget:1,std:1,premium:1}[w])return{err:"Bad tier."};S.crew.wage=w;save();return{ok:true};}
  const ALLIANCES=[{id:"star",name:"Starlight Alliance",led:"AI0",other:"AI2"},{id:"meridian",name:"Meridian Circle",led:"AI1",other:"AI3"},{id:"gulf",name:"Gulf Pact",led:"AI3",other:"AI0"}];
  function joinAlliance(){if(!S.invite)return{err:"No invitation."};if(S.alliance)return{err:"Already allied."};
    S.alliance={...S.invite,since:S.day,members:[S.invite.led,S.invite.other]};S.invite=null;pushAdvisor("Joined the "+S.alliance.name+"! +12% demand vs member routes, $50K/wk dues.");save();return{ok:true};}
  function leaveAlliance(){if(!S.alliance)return{err:"Not allied."};pushAdvisor("Left the "+S.alliance.name+".");S.alliance=null;save();return{ok:true};}
  function declineInvite(){S.invite=null;save();return{ok:true};}
  // ---------- CHOICE EVENTS ----------
  function resolveEvent(idx){
    const ev=S.pendingEvent;if(!ev)return{err:"No pending decision."};
    if(!ev.opts[idx])return{err:"Bad option."};
    if(applyEvent(ev.id,idx,ev)===false)return{err:"Can't afford it — earn more cash first."};
    S.pendingEvent=null;save();return{ok:true};
  }
  function applyEvent(id,idx,ev){
    if(id==="ash"){const n=ev.n||1;
      if(idx===0){S.cash-=15000*n;pushAdvisor("Rerouted around the ash ($"+fmtN(15000*n)+"). Flights operate.");headline("✈️ "+S.name+" reroutes around the ash cloud ($"+fmtN(15000*n)+").");}
      else{S.rep=Math.max(5,S.rep-3);S.disruption={days:2,ap:ev.ap};pushAdvisor("Cancelled through the ash. Rep -3, 2-day disruption at "+ev.ap+".");headline("🌋 Ash chaos: "+S.name+" cancels at "+ev.ap+".");}}
    else if(id==="strike"){
      if(idx===0){if(S.cash<50000)return false;S.cash-=50000;S.rep=Math.min(99,S.rep+2);pushAdvisor("Bonus paid. Crews stand down. Rep +2.");headline("🤝 "+S.name+" buys labor peace ($50K bonus).");}
      else{S.rep=Math.max(5,S.rep-2);S.disruption={days:2,ap:null};pushAdvisor("Walkout! All routes disrupted 2 days. Rep -2.");headline("✊ Strike grounds "+S.name+" for two days.");}}
    else if(id==="promo"){
      if(idx===0){if(S.cash<30000)return false;S.cash-=30000;S.promoDays=5;pushAdvisor("Campaign live: +15% demand for 5 days.");headline("📣 "+S.name+" launches a tourism campaign.");}
      else pushAdvisor("Declined the tourism campaign.");}
    else if(id==="fuel"){
      if(idx===0){if(S.cash<60000)return false;S.cash-=60000;S.fuel=Math.min(5,S.fuel+0.25);pushAdvisor("Reserves stocked. Fuel only +$0.25.");}
      else{S.fuel=Math.min(5,S.fuel+0.5);pushAdvisor("Fuel spiked +$0.50/gal.");headline("⛽ Refinery outage spikes fuel to $"+S.fuel.toFixed(2)+".");}}
    else if(id==="viral"){
      if(idx===0){if(S.cash<20000)return false;S.cash-=20000;S.rep=Math.min(99,S.rep+3);pushAdvisor("Video promoted worldwide. Rep +3.");headline("📱 "+S.name+"'s crew charms 10M viewers.");}
      else{S.rep=Math.min(99,S.rep+1);pushAdvisor("The video spreads on its own. Rep +1.");}
    }
    return true;
  }
  // ---------- FUEL HEDGE ----------
  function effFuel(){const l=S.fuelLock;return (l&&l.left>0)?l.price:S.fuel;}
  function lockFuel(){
    if(S.fuelLock&&S.fuelLock.left>0)return{err:"A hedge is already active."};
    const price=Math.round(S.fuel*1.05*100)/100;
    S.fuelLock={price,left:30,saved:0};
    pushAdvisor("Fuel hedged at $"+price.toFixed(2)+" for 30 days (+5% premium).");
    save();return{ok:true};
  }
  // ---------- CONTRACTS ----------
  const SPONSORS=["GulfTech Industries","Meridian Bank","World Athletics Council","SunFest Tourism Board","Pacific Freight Forwarders","Global MedEvac Alliance","EuroCup Committee","Hajj Travel Services"];
  const CARGOSPONSORS=["Pacific Freight Forwarders","Global MedEvac Alliance","TransContinental Post","FreshChain Logistics"];
  function refreshOffers(){
    const act=S.routes.filter(r=>r.status==="ACTIVE");
    if(!act.length)return;
    let guard=0;
    while(S.contracts.offers.length<3&&guard++<20){
      const wantCargo=!S.contracts.offers.some(o=>o.type==="cargo");
      const r=act[Math.floor(Math.random()*act.length)];
      const ac=S.fleet.find(a=>a.id===r.aircraftId);
      const m=model(((ac||{}).modelId));
      const isF=m&&m.cls==="Cargo";
      if(isF||wantCargo||Math.random()<0.35){
        // cargo offer on belly capacity
        const tons=Math.max(1,Math.round((m?m.cargo:2)*r.freq));
        S.contracts.offers.push({id:"C"+Date.now()+Math.floor(Math.random()*9999),type:"cargo",
          sponsor:CARGOSPONSORS[Math.floor(Math.random()*CARGOSPONSORS.length)],
          from:r.from,to:r.to,weeks:3,tons,
          pay:Math.max(4000,tons*300),bonus:Math.max(6000,tons*350)});
      }else{
        const seats=(m?m.seats:100)*r.freq;
        S.contracts.offers.push({id:"C"+Date.now()+Math.floor(Math.random()*9999),type:"pax",
          sponsor:SPONSORS[Math.floor(Math.random()*SPONSORS.length)],
          from:r.from,to:r.to,need:0.7,weeks:3,
          pay:Math.max(5000,Math.round(seats*15)),bonus:Math.max(8000,Math.round(seats*20))});
      }
    }
  }
  function acceptContract(id){
    const i=S.contracts.offers.findIndex(o=>o.id===id);if(i<0)return{err:"Offer expired."};
    if(S.contracts.active.filter(c=>c.status==="ACTIVE").length>=2)return{err:"Max 2 active contracts."};
    const o=S.contracts.offers[i];
    const route=S.routes.find(r=>r.status==="ACTIVE"&&((r.from===o.from&&r.to===o.to)||(r.from===o.to&&r.to===o.from)));
    if(!route)return{err:"You no longer fly that route."};
    S.contracts.offers.splice(i,1);
    S.contracts.active.push({...o,routeId:route.id,paidWeeks:0,strikes:0,nextCheck:S.day+7,status:"ACTIVE"});
    pushAdvisor("Signed: "+o.sponsor+" on "+o.from+"–"+o.to+" ("+fmt$(o.pay)+"/wk x"+o.weeks+", keep LF 70%+).");
    save();return{ok:true};
  }
  function processContracts(){
    for(const c of S.contracts.active){
      if(c.status!=="ACTIVE"||S.day<c.nextCheck)continue;
      const r=S.routes.find(x=>x.id===c.routeId);
      const ok=c.type==="cargo"
        ?(r&&r.status==="ACTIVE")
        :(r&&r.status==="ACTIVE"&&(r.lf7||0)>=(c.need||0.7));
      if(ok){
        S.cash+=c.pay;c.paidWeeks++;c.nextCheck=S.day+7;
        pushAdvisor("Contract payout: "+c.sponsor+" paid "+fmt$(c.pay)+".");
        if(c.paidWeeks>=c.weeks){c.status="DONE";S.cash+=c.bonus;S.rep=Math.min(99,S.rep+2);
          pushAdvisor("Contract complete: bonus "+fmt$(c.bonus)+", +2 rep.");headline("🤝 "+c.sponsor+" completes its contract with "+S.name+".");}
      }else{
        c.strikes++;c.nextCheck=S.day+7;
        pushAdvisor("Contract warning: "+c.sponsor+" ("+c.strikes+" strike"+(c.strikes>1?"s":"")+") — "+(c.type==="cargo"?"keep flying that route.":"keep LF above 70%."));
        if(c.strikes>=2){c.status="LOST";S.rep=Math.max(5,S.rep-3);
          pushAdvisor("Contract LOST: "+c.sponsor+" walked away. Rep -3.");headline("📉 "+c.sponsor+" dumps "+S.name+" over empty seats.");}
      }
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
        pushAdvisor("Mission complete: "+m.t+" (+$"+fmtN(m.rw)+")");headline("🏅 Milestone: "+m.t+" (+"+fmt$(m.rw)+")");}});
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
    if(S.gazetteClosed===undefined)S.gazetteClosed=false;
    if(!S.pendingEvent)S.pendingEvent=null;
    if(S.eventSeen===undefined)S.eventSeen=false;
    if(!S.prestige)S.prestige={n:0,perks:{rev:0,dem:0,mnt:0}};
    if(!Array.isArray(S.hof))S.hof=[];
    if(!S.livery)S.livery={c1:"#0ea5e9",c2:"#f8fafc"};
    if(!S.hqStyle)S.hqStyle="modern";
    if(!("alliance"in S))S.alliance=null;
    if(!("invite" in S))S.invite=null;
    if(!S.crew)S.crew={pilots:2,wage:"std",morale:70};
    (S.fleet||[]).forEach(a=>{if(a.config&&a.config.Y!=null&&a.config.y==null)a.config={y:a.config.Y,j:0};});
    if(!S.disruption)S.disruption={days:0,ap:null};
    if(!S.promoDays)S.promoDays=0;
    if(!S.fuelLock)S.fuelLock=null;
    if(!S.contracts)S.contracts={offers:[],active:[]};
    (S.routes||[]).forEach(r=>{if(!r.reviews)r.reviews=[];if(r.conn7===undefined)r.conn7=0;});
    // old saves: AI has no CEO persona yet — backfill display data, keep their routes
    const CEOFB=[{ceo:"Maya Chen",face:"🧑‍✈️",base:"CGK"},{ceo:"Lord Ashworth",face:"🤵",base:"LHR"},{ceo:"Dolly Ray",face:"👩‍✈️",base:"ATL"},{ceo:"Omar Haddad",face:"🧔",base:"DXB"}];
    (S.ai||[]).forEach((a,i)=>{const f=CEOFB[i%4];if(!a.ceo)a.ceo=f.ceo;if(!a.face)a.face=f.face;if(!a.base)a.base=f.base;
      if(!a.taunts)a.taunts=["We fly here now."];if(!a.praise)a.praise=["Well flown."];if(!a.name)a.name="Rival "+(i+1);});
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
    const fuel0=S.fuel,rep0=S.rep;
    let best={profit:-1e18,day:S.day+1},worst={profit:1e18,day:S.day+1};
    let tot={rev:0,cost:0,profit:0,pax:0,flights:0,days:0};
    collecting=true;NEWS.length=0;
    for(let i=0;i<days;i++){const full=i<7;const d=simulateDay();
      if(!full){S.cash-=d.profit*0.5;tot.profit-=d.profit*0.5;} // degraded: half profit after 7d
      if(d.profit>best.profit)best={profit:d.profit,day:S.day};
      if(d.profit<worst.profit)worst={profit:d.profit,day:S.day};
      tot.rev+=d.rev;tot.cost+=d.cost;tot.profit+=d.profit;tot.pax+=d.pax;tot.flights+=d.flights;tot.days++;}
    collecting=false;
    tot.headlines=NEWS.slice(-10);NEWS.length=0;
    tot.fuel0=fuel0;tot.fuel1=S.fuel;tot.rep0=rep0;tot.rep1=S.rep;tot.best=best;tot.worst=worst;
    S.awayReport=tot;S.lastSeen=Date.now();save();return tot;
  }
  return{S:()=>S,newAirline,load,reset,save,addAircraft,openRoute,routePreview,optimizeFare,simulateDay,maintain,loanPlans,loanQuote,takeLoan,payoffLoan,loanSchedule,creditLimit,outstandingDebt,effFuel,lockFuel,resolveEvent,acceptContract,setCabins,hireCrew,fireCrew,setWage,joinAlliance,leaveAlliance,declineInvite,doPrestige,prestigeInfo,checkMissions,pushAdvisor,advisorTips,catchUp,commonDisc,ap,model,fmt$,fmtN,DAY_MS,
    story:()=>STORY};
})();
