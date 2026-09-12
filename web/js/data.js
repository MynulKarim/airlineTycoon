// Skyline aircraft + airport data.
// AIRPORTS: OurAirports (https://ourairports.com) public-domain data — real idents/coords.
// AIRCRAFT: 100 fictional game aircraft from 100_fictional_aircraft_airline_tycoon.md
// (fictional manufacturers/names/specs for IP safety; prices = game balance USD).
// Only seats/range/MTOW/price are authored per model — everything else is DERIVED
// below by class, so the whole roster stays consistent. Derivation rules:
// - range: nm -> km (x1.852). lease/mo = 0.8% of price. belly cargo = 8% of MTOW,
//   freighters = 55% of MTOW. fuel/turn/runway/speed/comfort per propulsion class.
window.SKY_DATA = (() => {
// [num, name, class, type, seats, rangeNm, mtowT, priceM]
const RAW = [
[101,"AeroNova R-101","Regional","Twin turboprop",72,740,23,25],
[102,"SkyForge R-102","Regional","Twin turboprop",50,800,18,22],
[103,"Altair R-103","Regional","Twin turboprop",50,1000,19,24],
[104,"Orion R-104","Regional","Twin turboprop",90,1100,31,35],
[105,"Meridian R-105","Regional","Twin turboprop",90,1500,31,38],
[106,"Zenith R-106","Regional","Regional jet",70,1600,38,40],
[107,"Astra R-107","Regional","Regional jet",76,1900,39,43],
[108,"Northstar R-108","Regional","Regional jet",88,1900,47,48],
[109,"CloudWorks R-109","Regional","Regional jet",100,2400,51,52],
[110,"Stratos R-110","Regional","Regional jet",114,2500,52,55],
[111,"AeroNova R-111","Regional","Regional jet",120,2800,56,58],
[112,"SkyForge R-112","Regional","Regional jet",132,2900,61,62],
[113,"Altair R-113","Regional","Regional jet",146,2700,62,65],
[114,"Orion R-114","Regional","Regional jet",90,2400,52,55],
[115,"Meridian R-115","Regional","Regional jet",114,2700,56,60],
[116,"Zenith N-116","Narrowbody","Single-aisle jet",125,3300,61,72],
[117,"Astra N-117","Narrowbody","Single-aisle jet",145,3400,67,80],
[118,"Northstar N-118","Narrowbody","Single-aisle jet",160,3600,72,90],
[119,"CloudWorks N-119","Narrowbody","Single-aisle jet",180,3700,76,100],
[120,"Stratos N-120","Narrowbody","Single-aisle jet",200,3900,79,110],
[121,"AeroNova N-121","Narrowbody","Single-aisle jet",220,3200,88,120],
[122,"SkyForge N-122","Narrowbody","Single-aisle jet",190,3500,81,115],
[123,"Altair N-123","Narrowbody","Single-aisle jet",230,3100,90,125],
[124,"Orion N-124","Narrowbody","Single-aisle jet",130,3600,70,78],
[125,"Meridian N-125","Narrowbody","Single-aisle jet",160,3500,71,92],
[126,"Zenith N-126","Narrowbody","Single-aisle jet",190,3700,79,105],
[127,"Astra N-127","Narrowbody","Single-aisle jet",220,3400,89,118],
[128,"Northstar N-128","Narrowbody","Single-aisle jet",250,4700,101,135],
[129,"CloudWorks N-129","Narrowbody","Single-aisle jet",100,3400,51,65],
[130,"Stratos N-130","Narrowbody","Single-aisle jet",140,3800,61,78],
[131,"AeroNova N-131","Narrowbody","Single-aisle jet",170,4000,70,92],
[132,"SkyForge N-132","Narrowbody","Single-aisle jet",195,4200,76,105],
[133,"Altair N-133","Narrowbody","Single-aisle jet",220,4400,82,118],
[134,"Orion N-134","Narrowbody","Single-aisle jet",250,4500,90,132],
[135,"Meridian W-135","Widebody","Twin-aisle jet",250,5500,242,225],
[136,"Zenith W-136","Widebody","Twin-aisle jet",290,6000,251,250],
[137,"Astra W-137","Widebody","Twin-aisle jet",310,6500,280,275],
[138,"Northstar W-138","Widebody","Twin-aisle jet",330,7000,300,295],
[139,"CloudWorks W-139","Widebody","Twin-aisle jet",350,7500,316,315],
[140,"Stratos W-140","Widebody","Twin-aisle jet",375,7800,320,330],
[141,"AeroNova W-141","Widebody","Twin-aisle jet",400,8000,351,350],
[142,"SkyForge W-142","Widebody","Twin-aisle jet",425,8200,352,365],
[143,"Altair W-143","Widebody","Twin-aisle jet",450,8500,351,380],
[144,"Orion W-144","Widebody","Twin-aisle jet",480,8000,447,410],
[145,"Meridian W-145","Widebody","Twin-aisle jet",550,7500,442,430],
[146,"Zenith W-146","Widebody","Twin-aisle jet",290,6350,242,240],
[147,"Astra W-147","Widebody","Twin-aisle jet",320,7200,275,270],
[148,"Northstar W-148","Widebody","Twin-aisle jet",360,7600,285,300],
[149,"CloudWorks W-149","Widebody","Twin-aisle jet",410,8100,318,340],
[150,"Stratos W-150","Widebody","Twin-aisle jet",470,8500,330,390],
[151,"AeroNova W-151","Widebody","Twin-aisle jet",525,8700,351,420],
[152,"SkyForge W-152","Widebody","Twin-aisle jet",600,8000,450,460],
[153,"Altair R-153","Regional","Turboprop",19,900,7,6],
[154,"Orion R-154","Regional","Turboprop",30,900,9,8],
[155,"Meridian R-155","Regional","Turboprop",50,1000,16,12],
[156,"Zenith R-156","Regional","Turboprop",70,1300,23,25],
[157,"Astra R-157","Regional","Turboprop",80,1400,30,32],
[158,"Northstar R-158","Regional","Regional jet",50,1500,24,25],
[159,"CloudWorks R-159","Regional","Regional jet",70,1700,34,35],
[160,"Stratos R-160","Regional","Regional jet",90,2000,43,45],
[161,"AeroNova R-161","Regional","Regional jet",110,2300,55,58],
[162,"SkyForge R-162","Regional","Regional jet",130,2600,61,65],
[163,"Altair N-163","Narrowbody","Single-aisle jet",120,2900,58,68],
[164,"Orion N-164","Narrowbody","Single-aisle jet",150,3100,68,80],
[165,"Meridian N-165","Narrowbody","Single-aisle jet",180,3300,79,92],
[166,"Zenith N-166","Narrowbody","Single-aisle jet",210,3500,85,105],
[167,"Astra N-167","Narrowbody","Single-aisle jet",240,3700,90,120],
[168,"Northstar W-168","Widebody","Twin-aisle jet",250,6000,200,210],
[169,"CloudWorks W-169","Widebody","Twin-aisle jet",280,6500,240,240],
[170,"Stratos W-170","Widebody","Twin-aisle jet",320,7000,270,275],
[171,"AeroNova W-171","Widebody","Twin-aisle jet",360,7500,300,310],
[172,"SkyForge W-172","Widebody","Twin-aisle jet",400,8000,340,350],
[173,"Altair W-173","Widebody","Twin-aisle jet",450,8500,390,400],
[174,"Orion W-174","Widebody","Twin-aisle jet",500,9000,430,440],
[175,"Meridian C-175","Cargo","Freighter",20,1000,12,15],
[176,"Zenith C-176","Cargo","Freighter",40,1500,22,30],
[177,"Astra C-177","Cargo","Freighter",70,2000,38,55],
[178,"Northstar C-178","Cargo","Freighter",100,3000,75,110],
[179,"CloudWorks C-179","Cargo","Freighter",120,4000,140,180],
[180,"Stratos C-180","Cargo","Freighter",150,4500,180,220],
[181,"AeroNova C-181","Cargo","Freighter",180,5000,230,270],
[182,"SkyForge C-182","Cargo","Freighter",220,6000,280,320],
[183,"Altair C-183","Cargo","Freighter",260,7000,310,360],
[184,"Orion C-184","Cargo","Freighter",300,8000,350,410],
[185,"Meridian C-185","Cargo","Freighter",350,8500,400,450],
[186,"Zenith C-186","Cargo","Freighter",400,9000,450,490],
[187,"Astra P-187","Commuter","Turboprop",19,750,7,5],
[188,"Northstar P-188","Commuter","Turboprop",30,850,10,8],
[189,"CloudWorks P-189","Commuter","Turboprop",50,1100,16,13],
[190,"Stratos P-190","Commuter","Turboprop",70,1350,23,24],
[191,"AeroNova P-191","Commuter","Turboprop",90,1500,30,34],
[192,"SkyForge B-192","Business","Jet",8,1500,5,5],
[193,"Altair B-193","Business","Jet",12,2500,8,8],
[194,"Orion B-194","Business","Jet",16,3500,13,14],
[195,"Meridian B-195","Business","Jet",20,4500,20,22],
[196,"Zenith B-196","Business","Jet",24,5500,30,32],
[197,"Astra R-197","Regional","Turboprop",60,1200,20,18],
[198,"Northstar N-198","Narrowbody","Single-aisle jet",155,3200,68,84],
[199,"CloudWorks W-199","Widebody","Twin-aisle jet",340,7800,290,305],
[200,"Stratos C-200","Cargo","Freighter",200,5500,250,295]
];
function kindOf(type,cls){
  if(cls==="Cargo")return "fr";
  if(cls==="Business")return "bj";
  const t=type.toLowerCase();
  if(t.includes("turboprop")||t==="turboprop")return "tp";
  if(t.includes("regional jet"))return "rj";
  if(t.includes("single-aisle"))return "nb";
  return "wb";
}
function derive(n){
  const [num,name,cls,type,seatsRaw,rangeNm,mtow,priceM]=n;
  const k=kindOf(type,cls);
  const id=(name.split(" ").pop()||("M"+num)).replace("-","");
  const mfr=name.split(" ")[0];
  const P={buy:priceM*1e6,lease:Math.round(priceM*1e6*0.008),range:Math.round(rangeNm*1.852),mtow};
  const belly=Math.round(mtow*0.08*10)/10;
  let d;
  if(k==="tp")d={speed:500,fuel:Math.round(seatsRaw*8.5+80),runway:1150+Math.round(mtow*8),turn:20+Math.round(seatsRaw/6),comfort:3,cargo:belly,seats:seatsRaw};
  else if(k==="rj")d={speed:820,fuel:Math.round(seatsRaw*12+60),runway:1500+Math.round(mtow*6),turn:25+Math.round(seatsRaw/6),comfort:5,cargo:belly,seats:seatsRaw};
  else if(k==="nb")d={speed:840,fuel:Math.round(seatsRaw*14),runway:1800+Math.round(mtow*5),turn:30+Math.round(seatsRaw/7),comfort:6,cargo:belly,seats:seatsRaw};
  else if(k==="wb")d={speed:900,fuel:Math.round(seatsRaw*17+mtow*2),runway:2400+Math.round(mtow*2.5),turn:55+Math.round(seatsRaw/12),comfort:8,cargo:belly,seats:seatsRaw};
  else if(k==="fr")d={speed:890,fuel:Math.round(mtow*22+200),runway:mtow>150?2400+Math.round(mtow*2):1700+Math.round(mtow*6),turn:40+Math.round(mtow/8),comfort:1,cargo:Math.round(mtow*0.55*10)/10,seats:0};
  else d={speed:850,fuel:Math.round(seatsRaw*45+150),runway:1200+Math.round(mtow*40),turn:15+seatsRaw,comfort:9,cargo:0.5,seats:seatsRaw};
  return {id,name,mfr,cls,kind:k,type,seatsRaw,priceM,...P,...d,
    desc:`${type} · ${k==="fr"?d.cargo+"t cargo":seatsRaw+" seats"} · ${P.range}km · MTOW ${mtow}t`};
}
const aircraftModels=RAW.map(derive);
const airports = [
 {id:"DAC",ident:"VGHS",icao:"VGHS",iata:"DAC",name:"Hazrat Shahjalal Intl",city:"Dhaka",country:"BD",tier:2,pop:22e6,gdppc:2600,tourism:30,business:45,feePax:8,feeMov:900,slots:14,runway:3200,lat:23.8433,lon:90.3978,elev:30,type:"large_airport",conn:0.7},
 {id:"DXB",ident:"OMDB",icao:"OMDB",iata:"DXB",name:"Dubai Intl",city:"Dubai",country:"AE",tier:4,pop:3.6e6,gdppc:42000,tourism:95,business:90,feePax:22,feeMov:2800,slots:22,runway:4000,lat:25.2532,lon:55.3657,elev:62,type:"large_airport",conn:1.0},
 {id:"BKK",ident:"VTBS",icao:"VTBS",iata:"BKK",name:"Suvarnabhumi",city:"Bangkok",country:"TH",tier:3,pop:10.7e6,gdppc:7800,tourism:100,business:70,feePax:14,feeMov:1600,slots:20,runway:4000,lat:13.69,lon:100.7501,elev:5,type:"large_airport",conn:0.9},
 {id:"KUL",ident:"WMKK",icao:"WMKK",iata:"KUL",name:"Kuala Lumpur Intl",city:"Kuala Lumpur",country:"MY",tier:3,pop:8.6e6,gdppc:12500,tourism:80,business:75,feePax:12,feeMov:1400,slots:18,runway:4000,lat:2.7456,lon:101.7072,elev:69,type:"large_airport",conn:0.85},
 {id:"SIN",ident:"WSSS",icao:"WSSS",iata:"SIN",name:"Singapore Changi",city:"Singapore",country:"SG",tier:4,pop:6e6,gdppc:65000,tourism:90,business:95,feePax:24,feeMov:2600,slots:20,runway:4000,lat:1.3644,lon:103.9915,elev:22,type:"large_airport",conn:1.0},
 {id:"DEL",ident:"VIDP",icao:"VIDP",iata:"DEL",name:"Indira Gandhi Intl",city:"Delhi",country:"IN",tier:3,pop:32e6,gdppc:2400,tourism:60,business:70,feePax:11,feeMov:1300,slots:20,runway:4430,lat:28.5665,lon:77.1031,elev:777,type:"large_airport",conn:0.85},
 {id:"BOM",ident:"VABB",icao:"VABB",iata:"BOM",name:"Chhatrapati Shivaji Intl",city:"Mumbai",country:"IN",tier:3,pop:21e6,gdppc:3000,tourism:55,business:80,feePax:11,feeMov:1350,slots:18,runway:3445,lat:19.0896,lon:72.8656,elev:37,type:"large_airport",conn:0.85},
 {id:"DOH",ident:"OTHH",icao:"OTHH",iata:"DOH",name:"Hamad Intl",city:"Doha",country:"QA",tier:3,pop:2.8e6,gdppc:60000,tourism:60,business:85,feePax:18,feeMov:2200,slots:18,runway:4850,lat:25.2731,lon:51.6081,elev:13,type:"large_airport",conn:0.95},
 {id:"AUH",ident:"OMAA",icao:"OMAA",iata:"AUH",name:"Zayed Intl",city:"Abu Dhabi",country:"AE",tier:3,pop:1.6e6,gdppc:43000,tourism:65,business:80,feePax:16,feeMov:2000,slots:16,runway:4100,lat:24.433,lon:54.6511,elev:88,type:"large_airport",conn:0.8},
 {id:"IST",ident:"LTFM",icao:"LTFM",iata:"IST",name:"Istanbul Airport",city:"Istanbul",country:"TR",tier:4,pop:16e6,gdppc:11000,tourism:90,business:80,feePax:16,feeMov:1900,slots:22,runway:4100,lat:41.2753,lon:28.7519,elev:325,type:"large_airport",conn:0.95},
 {id:"LHR",ident:"EGLL",icao:"EGLL",iata:"LHR",name:"London Heathrow",city:"London",country:"GB",tier:4,pop:14.3e6,gdppc:46000,tourism:95,business:100,feePax:32,feeMov:3800,slots:24,runway:3902,lat:51.47,lon:-0.4543,elev:83,type:"large_airport",conn:1.0},
 {id:"JFK",ident:"KJFK",icao:"KJFK",iata:"JFK",name:"John F Kennedy Intl",city:"New York",country:"US",tier:4,pop:20e6,gdppc:70000,tourism:90,business:100,feePax:28,feeMov:3500,slots:24,runway:4442,lat:40.6413,lon:-73.7781,elev:13,type:"large_airport",conn:1.0},
 {id:"CDG",ident:"LFPG",icao:"LFPG",iata:"CDG",name:"Paris Charles de Gaulle",city:"Paris",country:"FR",tier:4,pop:12e6,gdppc:45000,tourism:100,business:90,feePax:26,feeMov:3200,slots:22,runway:4215,lat:49.0097,lon:2.5479,elev:392,type:"large_airport",conn:0.95},
 {id:"FRA",ident:"EDDF",icao:"EDDF",iata:"FRA",name:"Frankfurt am Main",city:"Frankfurt",country:"DE",tier:4,pop:5.9e6,gdppc:50000,tourism:70,business:100,feePax:27,feeMov:3300,slots:22,runway:4000,lat:50.0379,lon:8.5622,elev:364,type:"large_airport",conn:0.95},
 {id:"AMS",ident:"EHAM",icao:"EHAM",iata:"AMS",name:"Amsterdam Schiphol",city:"Amsterdam",country:"NL",tier:4,pop:3.4e6,gdppc:58000,tourism:85,business:90,feePax:25,feeMov:3000,slots:22,runway:3800,lat:52.3105,lon:4.7683,elev:-11,type:"large_airport",conn:0.95},
 {id:"HKG",ident:"VHHH",icao:"VHHH",iata:"HKG",name:"Hong Kong Intl",city:"Hong Kong",country:"HK",tier:4,pop:7.5e6,gdppc:49000,tourism:85,business:95,feePax:25,feeMov:3000,slots:20,runway:3800,lat:22.308,lon:113.9185,elev:28,type:"large_airport",conn:0.95},
 {id:"PVG",ident:"ZSPD",icao:"ZSPD",iata:"PVG",name:"Shanghai Pudong Intl",city:"Shanghai",country:"CN",tier:4,pop:29e6,gdppc:22000,tourism:70,business:95,feePax:18,feeMov:2200,slots:22,runway:4000,lat:31.1443,lon:121.8083,elev:13,type:"large_airport",conn:0.95},
 {id:"ICN",ident:"RKSI",icao:"RKSI",iata:"ICN",name:"Incheon Intl",city:"Seoul",country:"KR",tier:4,pop:26e6,gdppc:33000,tourism:75,business:95,feePax:20,feeMov:2400,slots:22,runway:3750,lat:37.4602,lon:126.4407,elev:23,type:"large_airport",conn:0.95},
 {id:"NRT",ident:"RJAA",icao:"RJAA",iata:"NRT",name:"Narita Intl",city:"Tokyo",country:"JP",tier:4,pop:38e6,gdppc:42000,tourism:85,business:95,feePax:27,feeMov:3100,slots:20,runway:4000,lat:35.772,lon:140.3929,elev:141,type:"large_airport",conn:0.95},
 {id:"SYD",ident:"YSSY",icao:"YSSY",iata:"SYD",name:"Sydney Kingsford Smith",city:"Sydney",country:"AU",tier:3,pop:5.3e6,gdppc:55000,tourism:85,business:80,feePax:22,feeMov:2400,slots:16,runway:3962,lat:-33.9399,lon:151.1753,elev:21,type:"large_airport",conn:0.8},
 {id:"CGP",ident:"VGEG",icao:"VGEG",iata:"CGP",name:"Shah Amanat Intl",city:"Chittagong",country:"BD",tier:1,pop:5.2e6,gdppc:2400,tourism:25,business:35,feePax:5,feeMov:500,slots:8,runway:2940,lat:22.2414,lon:91.8135,elev:12,type:"medium_airport",conn:0.3},
 {id:"CCU",ident:"VECC",icao:"VECC",iata:"CCU",name:"Netaji Subhas Chandra Bose Intl",city:"Kolkata",country:"IN",tier:2,pop:15e6,gdppc:2200,tourism:40,business:50,feePax:7,feeMov:800,slots:14,runway:3627,lat:22.6547,lon:88.4467,elev:16,type:"large_airport",conn:0.6},
 {id:"KTM",ident:"VNKT",icao:"VNKT",iata:"KTM",name:"Tribhuvan Intl",city:"Kathmandu",country:"NP",tier:1,pop:3e6,gdppc:1200,tourism:70,business:25,feePax:6,feeMov:600,slots:8,runway:3350,lat:27.6966,lon:85.3591,elev:4390,type:"medium_airport",conn:0.4},
 {id:"MLE",ident:"VRMM",icao:"VRMM",iata:"MLE",name:"Velana Intl",city:"Malé",country:"MV",tier:1,pop:0.6e6,gdppc:9000,tourism:100,business:20,feePax:15,feeMov:1100,slots:8,runway:3400,lat:4.1917,lon:73.5309,elev:6,type:"large_airport",conn:0.5},
 {id:"CMB",ident:"VCBI",icao:"VCBI",iata:"CMB",name:"Bandaranaike Intl",city:"Colombo",country:"LK",tier:2,pop:5.8e6,gdppc:3800,tourism:75,business:45,feePax:9,feeMov:900,slots:12,runway:3500,lat:7.1742,lon:79.8841,elev:30,type:"large_airport",conn:0.6},
 {id:"MAA",ident:"VOMM",icao:"VOMM",iata:"MAA",name:"Chennai Intl",city:"Chennai",country:"IN",tier:2,pop:11e6,gdppc:2600,tourism:50,business:60,feePax:9,feeMov:1000,slots:14,runway:3445,lat:12.9941,lon:80.1709,elev:52,type:"large_airport",conn:0.6},
 {id:"KHI",ident:"OPKC",icao:"OPKC",iata:"KHI",name:"Jinnah Intl",city:"Karachi",country:"PK",tier:2,pop:17e6,gdppc:1800,tourism:25,business:55,feePax:8,feeMov:900,slots:14,runway:3400,lat:24.9065,lon:67.1608,elev:100,type:"large_airport",conn:0.6},
 {id:"RUH",ident:"OERK",icao:"OERK",iata:"RUH",name:"King Khalid Intl",city:"Riyadh",country:"SA",tier:3,pop:7.7e6,gdppc:24000,tourism:40,business:85,feePax:13,feeMov:1500,slots:16,runway:4200,lat:24.9576,lon:46.6988,elev:2049,type:"large_airport",conn:0.75},
 {id:"DMM",ident:"OEDF",icao:"OEDF",iata:"DMM",name:"King Fahd Intl",city:"Dammam",country:"SA",tier:2,pop:2.5e6,gdppc:23000,tourism:30,business:70,feePax:11,feeMov:1100,slots:12,runway:4000,lat:26.4712,lon:49.7979,elev:72,type:"large_airport",conn:0.55},
 {id:"BAH",ident:"OBBI",icao:"OBBI",iata:"BAH",name:"Bahrain Intl",city:"Manama",country:"BH",tier:2,pop:1.6e6,gdppc:26000,tourism:50,business:70,feePax:12,feeMov:1200,slots:12,runway:3964,lat:26.2708,lon:50.6336,elev:6,type:"large_airport",conn:0.65},
 {id:"KWI",ident:"OKKK",icao:"OKKK",iata:"KWI",name:"Kuwait Intl",city:"Kuwait City",country:"KW",tier:2,pop:3e6,gdppc:29000,tourism:30,business:75,feePax:12,feeMov:1250,slots:12,runway:3400,lat:29.2266,lon:47.9689,elev:206,type:"large_airport",conn:0.6},
 {id:"MCT",ident:"OOMS",icao:"OOMS",iata:"MCT",name:"Muscat Intl",city:"Muscat",country:"OM",tier:2,pop:1.7e6,gdppc:21000,tourism:55,business:60,feePax:11,feeMov:1100,slots:12,runway:4000,lat:23.5933,lon:58.2844,elev:15,type:"large_airport",conn:0.6},
 {id:"JED",ident:"OEJN",icao:"OEJN",iata:"JED",name:"King Abdulaziz Intl",city:"Jeddah",country:"SA",tier:3,pop:4.8e6,gdppc:23000,tourism:60,business:65,feePax:12,feeMov:1400,slots:16,runway:4000,lat:21.6811,lon:39.1565,elev:48,type:"large_airport",conn:0.7},
 {id:"SYL",ident:"VGSY",icao:"VGSY",iata:"ZYL",name:"Osmani Intl",city:"Sylhet",country:"BD",tier:1,pop:1e6,gdppc:2000,tourism:30,business:20,feePax:4,feeMov:400,slots:6,runway:3200,lat:24.9632,lon:91.8669,elev:50,type:"medium_airport",conn:0.25},
 {id:"LAX",ident:"KLAX",icao:"KLAX",iata:"LAX",name:"Los Angeles Intl",city:"Los Angeles",country:"US",tier:4,pop:12.5e6,gdppc:70000,tourism:85,business:95,feePax:26,feeMov:3200,slots:24,runway:3685,lat:33.9425,lon:-118.4081,elev:128,type:"large_airport",conn:0.95},
 {id:"SFO",ident:"KSFO",icao:"KSFO",iata:"SFO",name:"San Francisco Intl",city:"San Francisco",country:"US",tier:4,pop:4.7e6,gdppc:80000,tourism:85,business:90,feePax:24,feeMov:3000,slots:20,runway:3618,lat:37.6213,lon:-122.379,elev:13,type:"large_airport",conn:0.9},
 {id:"SEA",ident:"KSEA",icao:"KSEA",iata:"SEA",name:"Seattle-Tacoma Intl",city:"Seattle",country:"US",tier:3,pop:4e6,gdppc:75000,tourism:70,business:85,feePax:20,feeMov:2600,slots:18,runway:3627,lat:47.4502,lon:-122.3088,elev:433,type:"large_airport",conn:0.8},
 {id:"ORD",ident:"KORD",icao:"KORD",iata:"ORD",name:"O'Hare Intl",city:"Chicago",country:"US",tier:4,pop:9.5e6,gdppc:65000,tourism:65,business:95,feePax:24,feeMov:3100,slots:24,runway:3962,lat:41.9742,lon:-87.9073,elev:672,type:"large_airport",conn:0.95},
 {id:"ATL",ident:"KATL",icao:"KATL",iata:"ATL",name:"Hartsfield-Jackson Atlanta Intl",city:"Atlanta",country:"US",tier:4,pop:6e6,gdppc:60000,tourism:60,business:90,feePax:20,feeMov:2800,slots:24,runway:3766,lat:33.6407,lon:-84.4277,elev:1026,type:"large_airport",conn:0.95},
 {id:"DFW",ident:"KDFW",icao:"KDFW",iata:"DFW",name:"Dallas/Fort Worth Intl",city:"Dallas",country:"US",tier:4,pop:7.6e6,gdppc:62000,tourism:55,business:90,feePax:20,feeMov:2800,slots:22,runway:4085,lat:32.8998,lon:-97.0403,elev:607,type:"large_airport",conn:0.9},
 {id:"MIA",ident:"KMIA",icao:"KMIA",iata:"MIA",name:"Miami Intl",city:"Miami",country:"US",tier:3,pop:6.1e6,gdppc:55000,tourism:90,business:75,feePax:22,feeMov:2900,slots:20,runway:3974,lat:25.7932,lon:-80.2906,elev:8,type:"large_airport",conn:0.85},
 {id:"YYZ",ident:"CYYZ",icao:"CYYZ",iata:"YYZ",name:"Toronto Pearson Intl",city:"Toronto",country:"CA",tier:3,pop:6.3e6,gdppc:52000,tourism:70,business:90,feePax:22,feeMov:2800,slots:20,runway:3368,lat:43.6777,lon:-79.6248,elev:569,type:"large_airport",conn:0.9},
 {id:"YVR",ident:"CYVR",icao:"CYVR",iata:"YVR",name:"Vancouver Intl",city:"Vancouver",country:"CA",tier:3,pop:2.6e6,gdppc:48000,tourism:80,business:70,feePax:18,feeMov:2200,slots:14,runway:3500,lat:49.1967,lon:-123.1815,elev:14,type:"large_airport",conn:0.75},
 {id:"MEX",ident:"MMMX",icao:"MMMX",iata:"MEX",name:"Benito Juarez Intl",city:"Mexico City",country:"MX",tier:3,pop:22e6,gdppc:12000,tourism:70,business:80,feePax:12,feeMov:1500,slots:18,runway:3900,lat:19.4363,lon:-99.0721,elev:7316,type:"large_airport",conn:0.8},
 {id:"GRU",ident:"SBGR",icao:"SBGR",iata:"GRU",name:"Sao Paulo-Guarulhos Intl",city:"Sao Paulo",country:"BR",tier:3,pop:22e6,gdppc:11000,tourism:60,business:85,feePax:12,feeMov:1500,slots:18,runway:3700,lat:-23.4356,lon:-46.4731,elev:2459,type:"large_airport",conn:0.85},
 {id:"EZE",ident:"SAEZ",icao:"SAEZ",iata:"EZE",name:"Ministro Pistarini Intl",city:"Buenos Aires",country:"AR",tier:3,pop:15e6,gdppc:13000,tourism:70,business:70,feePax:11,feeMov:1400,slots:14,runway:3300,lat:-34.8222,lon:-58.5358,elev:67,type:"large_airport",conn:0.7},
 {id:"BOG",ident:"SKBO",icao:"SKBO",iata:"BOG",name:"El Dorado Intl",city:"Bogota",country:"CO",tier:3,pop:11e6,gdppc:9000,tourism:55,business:75,feePax:10,feeMov:1300,slots:16,runway:3800,lat:4.7016,lon:-74.4149,elev:8361,type:"large_airport",conn:0.75},
 {id:"LIM",ident:"SPJC",icao:"SPJC",iata:"LIM",name:"Jorge Chavez Intl",city:"Lima",country:"PE",tier:3,pop:11e6,gdppc:7000,tourism:75,business:65,feePax:10,feeMov:1300,slots:14,runway:3480,lat:-12.0219,lon:-77.1143,elev:113,type:"large_airport",conn:0.7},
 {id:"SCL",ident:"SCEL",icao:"SCEL",iata:"SCL",name:"Arturo Merino Benitez Intl",city:"Santiago",country:"CL",tier:3,pop:6.7e6,gdppc:16000,tourism:70,business:75,feePax:11,feeMov:1400,slots:14,runway:3700,lat:-33.393,lon:-70.7858,elev:1554,type:"large_airport",conn:0.7},
 {id:"MAD",ident:"LEMD",icao:"LEMD",iata:"MAD",name:"Adolfo Suarez Madrid-Barajas",city:"Madrid",country:"ES",tier:4,pop:6.6e6,gdppc:40000,tourism:90,business:85,feePax:22,feeMov:2800,slots:22,runway:4300,lat:40.4983,lon:-3.5676,elev:2000,type:"large_airport",conn:0.9},
 {id:"FCO",ident:"LIRF",icao:"LIRF",iata:"FCO",name:"Leonardo da Vinci-Fiumicino",city:"Rome",country:"IT",tier:3,pop:4.3e6,gdppc:38000,tourism:95,business:75,feePax:20,feeMov:2600,slots:20,runway:3900,lat:41.8003,lon:12.2389,elev:16,type:"large_airport",conn:0.85},
 {id:"LIS",ident:"LPPT",icao:"LPPT",iata:"LIS",name:"Humberto Delgado Airport",city:"Lisbon",country:"PT",tier:3,pop:3e6,gdppc:32000,tourism:90,business:65,feePax:16,feeMov:2000,slots:16,runway:3700,lat:38.7742,lon:-9.1342,elev:374,type:"large_airport",conn:0.75},
 {id:"ATH",ident:"LGAV",icao:"LGAV",iata:"ATH",name:"Athens Intl",city:"Athens",country:"GR",tier:3,pop:3.7e6,gdppc:26000,tourism:95,business:60,feePax:15,feeMov:1900,slots:16,runway:4000,lat:37.9364,lon:23.9445,elev:308,type:"large_airport",conn:0.75},
 {id:"CPH",ident:"EKCH",icao:"EKCH",iata:"CPH",name:"Copenhagen Kastrup",city:"Copenhagen",country:"DK",tier:3,pop:2.1e6,gdppc:60000,tourism:75,business:80,feePax:20,feeMov:2400,slots:16,runway:3600,lat:55.618,lon:12.656,elev:17,type:"large_airport",conn:0.8},
 {id:"ARN",ident:"ESSA",icao:"ESSA",iata:"ARN",name:"Stockholm Arlanda",city:"Stockholm",country:"SE",tier:3,pop:2.4e6,gdppc:58000,tourism:70,business:80,feePax:20,feeMov:2400,slots:14,runway:3300,lat:59.6519,lon:17.9186,elev:137,type:"large_airport",conn:0.75},
 {id:"VIE",ident:"LOWW",icao:"LOWW",iata:"VIE",name:"Vienna Intl",city:"Vienna",country:"AT",tier:3,pop:2.9e6,gdppc:52000,tourism:80,business:85,feePax:20,feeMov:2400,slots:16,runway:3600,lat:48.1103,lon:16.5697,elev:600,type:"large_airport",conn:0.8},
 {id:"SVO",ident:"UUEE",icao:"UUEE",iata:"SVO",name:"Sheremetyevo Intl",city:"Moscow",country:"RU",tier:3,pop:12.5e6,gdppc:15000,tourism:60,business:80,feePax:14,feeMov:1700,slots:18,runway:3700,lat:55.9726,lon:37.4146,elev:622,type:"large_airport",conn:0.8},
 {id:"DUB",ident:"EIDW",icao:"EIDW",iata:"DUB",name:"Dublin Airport",city:"Dublin",country:"IE",tier:2,pop:1.4e6,gdppc:70000,tourism:80,business:70,feePax:18,feeMov:2200,slots:12,runway:3100,lat:53.4214,lon:-6.2701,elev:242,type:"large_airport",conn:0.7},
 {id:"CAI",ident:"HECA",icao:"HECA",iata:"CAI",name:"Cairo Intl",city:"Cairo",country:"EG",tier:3,pop:21e6,gdppc:4000,tourism:70,business:70,feePax:10,feeMov:1300,slots:16,runway:4000,lat:30.1219,lon:31.4056,elev:382,type:"large_airport",conn:0.75},
 {id:"ADD",ident:"HAAB",icao:"HAAB",iata:"ADD",name:"Addis Ababa Bole Intl",city:"Addis Ababa",country:"ET",tier:2,pop:5.5e6,gdppc:2500,tourism:55,business:60,feePax:8,feeMov:1000,slots:12,runway:3700,lat:8.9779,lon:38.7993,elev:7656,type:"large_airport",conn:0.65},
 {id:"NBO",ident:"HKJK",icao:"HKJK",iata:"NBO",name:"Jomo Kenyatta Intl",city:"Nairobi",country:"KE",tier:2,pop:5.1e6,gdppc:3000,tourism:75,business:65,feePax:9,feeMov:1100,slots:12,runway:4100,lat:-1.3192,lon:36.927,elev:5327,type:"large_airport",conn:0.65},
 {id:"JNB",ident:"FAOR",icao:"FAOR",iata:"JNB",name:"O.R. Tambo Intl",city:"Johannesburg",country:"ZA",tier:3,pop:6.1e6,gdppc:8000,tourism:75,business:80,feePax:11,feeMov:1400,slots:16,runway:4400,lat:-26.1367,lon:28.2411,elev:5558,type:"large_airport",conn:0.8},
 {id:"LOS",ident:"DNMM",icao:"DNMM",iata:"LOS",name:"Murtala Muhammed Intl",city:"Lagos",country:"NG",tier:2,pop:16e6,gdppc:3000,tourism:45,business:70,feePax:9,feeMov:1100,slots:14,runway:3900,lat:6.5774,lon:3.3212,elev:135,type:"large_airport",conn:0.65},
 {id:"CPT",ident:"FACT",icao:"FACT",iata:"CPT",name:"Cape Town Intl",city:"Cape Town",country:"ZA",tier:2,pop:4.9e6,gdppc:9000,tourism:85,business:60,feePax:12,feeMov:1400,slots:12,runway:3200,lat:-33.9715,lon:18.6021,elev:151,type:"large_airport",conn:0.6},
 {id:"PEK",ident:"ZBAA",icao:"ZBAA",iata:"PEK",name:"Beijing Capital Intl",city:"Beijing",country:"CN",tier:4,pop:22e6,gdppc:20000,tourism:75,business:95,feePax:16,feeMov:2000,slots:22,runway:3800,lat:40.0799,lon:116.6031,elev:116,type:"large_airport",conn:0.95},
 {id:"CAN",ident:"ZGGG",icao:"ZGGG",iata:"CAN",name:"Guangzhou Baiyun Intl",city:"Guangzhou",country:"CN",tier:3,pop:15e6,gdppc:19000,tourism:60,business:85,feePax:14,feeMov:1800,slots:20,runway:3800,lat:23.3924,lon:113.2988,elev:50,type:"large_airport",conn:0.85},
 {id:"TPE",ident:"RCTP",icao:"RCTP",iata:"TPE",name:"Taiwan Taoyuan Intl",city:"Taipei",country:"TW",tier:3,pop:7e6,gdppc:28000,tourism:75,business:85,feePax:15,feeMov:1900,slots:18,runway:3800,lat:25.0797,lon:121.2342,elev:106,type:"large_airport",conn:0.85},
 {id:"CGK",ident:"WIII",icao:"WIII",iata:"CGK",name:"Soekarno-Hatta Intl",city:"Jakarta",country:"ID",tier:3,pop:33e6,gdppc:6000,tourism:55,business:75,feePax:10,feeMov:1300,slots:20,runway:3600,lat:-6.1256,lon:106.6559,elev:34,type:"large_airport",conn:0.85},
 {id:"MNL",ident:"RPLL",icao:"RPLL",iata:"MNL",name:"Ninoy Aquino Intl",city:"Manila",country:"PH",tier:2,pop:14e6,gdppc:4500,tourism:65,business:65,feePax:9,feeMov:1100,slots:16,runway:3410,lat:14.5086,lon:121.0194,elev:75,type:"large_airport",conn:0.7},
 {id:"SGN",ident:"VVTS",icao:"VVTS",iata:"SGN",name:"Tan Son Nhat Intl",city:"Ho Chi Minh City",country:"VN",tier:2,pop:9e6,gdppc:5500,tourism:75,business:70,feePax:10,feeMov:1200,slots:14,runway:3800,lat:10.8188,lon:106.652,elev:33,type:"large_airport",conn:0.7},
 {id:"MEL",ident:"YMML",icao:"YMML",iata:"MEL",name:"Melbourne Airport",city:"Melbourne",country:"AU",tier:3,pop:5e6,gdppc:52000,tourism:80,business:80,feePax:20,feeMov:2300,slots:14,runway:3657,lat:-37.669,lon:144.841,elev:434,type:"large_airport",conn:0.75},
 {id:"AKL",ident:"NZAA",icao:"NZAA",iata:"AKL",name:"Auckland Airport",city:"Auckland",country:"NZ",tier:2,pop:1.7e6,gdppc:45000,tourism:85,business:65,feePax:18,feeMov:2100,slots:12,runway:3420,lat:-37.0082,lon:174.785,elev:23,type:"large_airport",conn:0.65},
 {id:"ANC",ident:"PANC",icao:"PANC",iata:"ANC",name:"Ted Stevens Anchorage Intl",city:"Anchorage",country:"US",tier:2,pop:0.3e6,gdppc:60000,tourism:20,business:55,feePax:7,feeMov:800,slots:12,runway:3500,lat:61.1743,lon:-149.9962,elev:152,type:"large_airport",conn:0.5},
 {id:"MEM",ident:"KMEM",icao:"KMEM",iata:"MEM",name:"Memphis Intl",city:"Memphis",country:"US",tier:2,pop:0.6e6,gdppc:45000,tourism:25,business:60,feePax:7,feeMov:800,slots:12,runway:3400,lat:35.0424,lon:-89.9767,elev:341,type:"large_airport",conn:0.55},
 {id:"LEJ",ident:"EDDP",icao:"EDDP",iata:"LEJ",name:"Leipzig/Halle Airport",city:"Leipzig",country:"DE",tier:2,pop:0.6e6,gdppc:48000,tourism:30,business:50,feePax:8,feeMov:900,slots:12,runway:3600,lat:51.4239,lon:12.2364,elev:466,type:"large_airport",conn:0.5}
];
return {airports, aircraftModels};
})();
