// Skyline pure sim (browser port of mvp/sim-engine.ts). No DOM, no storage.
window.SKY_SIM = (() => {
  function baseDemand(a,b,distKm,K=0.055){
    const pop=Math.pow(a.pop*b.pop,0.35), gdp=Math.pow(a.gdppc*b.gdppc,0.25);
    const mix=1+0.5*((a.tourism+b.tourism)/2)/100*100*0.01+0; // keep simple below
    const mix2=1+0.5*((a.tourism+b.tourism)/2)/100+0.7*((a.business+b.business)/2)/100;
    return K*pop*gdp*mix2/Math.pow(distKm,0.75);
  }
  function havKm(a,b){const R=6371,t=Math.PI/180;
    const dLa=(b.lat-a.lat)*t,dLo=(b.lon-a.lon)*t;
    const s=Math.sin(dLa/2)**2+Math.cos(a.lat*t)*Math.cos(b.lat*t)*Math.sin(dLo/2)**2;
    return 2*R*Math.asin(Math.sqrt(s));}
  function marketFare(distKm,apA,apB){return Math.round(35+0.12*distKm+(apA.feePax+apB.feePax)/2);}
  function demandAtPrice(baseD,fareAvg,fareRef,e,rep,freq,season,event,econ,share){
    const priceF=Math.pow(Math.max(20,fareRef)/Math.max(20,fareAvg),e);
    const repF=0.6+0.8*(rep/100), freqF=1-Math.exp(-freq/2);
    return baseD*season*event*econ*priceF*repF*freqF*share;
  }
  function util(fare,freq,rep,net,otp,alpha=1.2){
    return -alpha*Math.log(Math.max(20,fare))+0.8*Math.log(Math.max(0.5,freq))+0.03*rep+0.5*net+0.4*otp;
  }
  function share(utils){const e=utils.map(Math.exp),s=e.reduce((x,y)=>x+y,0);return e.map(v=>v/s);}
  function flightTimeH(dist,speed){return dist/speed+0.4;}
  function flightCost(o){ // o: {model,dist,fare class mix,fuelPrice,ageY,commonDisc,pax}
    const hrs=flightTimeH(o.dist,o.model.speed);
    const fuel=o.model.fuel*hrs*o.fuelPrice/1.5; // fuel gal proxy
    const fees=(o.apA.feeMov+o.apB.feeMov)/Math.max(1,o.freq||1)*0 + (o.apA.feePax+o.apB.feePax)/2*o.pax + (o.apA.feeMov+o.apB.feeMov)/2;
    const crew=95*hrs*(o.model.seats/150+0.5);
    let maint=(400+o.model.buy/1e6*22)*(1+Math.pow(o.ageY||0,1.4)*0.04)*(1-(o.commonDisc||0));
    const service=o.pax*(o.cabinJ?9:5);
    const leaseD=o.model.lease/30;
    return {fuel,fees,crew,maint,service,lease:leaseD,overhead:600,
      total:fuel+fees+crew+maint+service+leaseD+600,hrs};
  }
  function mulberry(seed){return function(){seed|=0;seed=(seed+0x6d2b79f5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
  return {baseDemand,havKm,marketFare,demandAtPrice,util,share,flightCost,flightTimeH,mulberry};
})();
