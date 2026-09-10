# SKYLINE TYCOON — Working Title: **"Skyline: Aviation Empire"**
### Professional Game Design Document (GDD) + Technical Design Document (TDD) v0.1
> Assumption log is at bottom. All money in USD unless noted. Tick = 1 game-day = 24 min real time (MVP), tunable to 1hr.

---
## 0. EXECUTIVE DECISION: What we are / are not building

**Pitch (1 paragraph):** Skyline is an async, offline-progression airline tycoon for web (then mobile) where you turn a 2-plane startup into an aviation empire. Plan routes on a living world map, lease the right aircraft for the right niche, configure cabins, set fares or let Auto-RM do it, and wake up to "While you were away..." reports. No micromanaging every takeoff — you design the machine, the simulation runs it, AI rivals + real players + fuel shocks + Olympics keep the meta moving. Sells time/convenience/expression, never victory.

**Genre analysis (why original, not clone):**
Existing games (AirlineSim, Airlines Manager, Air Tycoon) fail on: 1) spreadsheet overwhelm day-1, 2) one optimal aircraft/route forever, 3) P2W or ad-spam, 4) no offline meaning, 5) web≠mobile. Skyline's differentiators:
- CEO vs Analyst dual UX (casual never needs RASK/CASK)
- Niche-based fleet (no strictly-best plane) + dynamic demand + AI personalities
- Network/connecting pax as core, not afterthought
- Server-authoritative tick simulation that scales (no per-second per-airline loop)
- Ethical monetization: Speed + Slots-convenience + Cosmetics

**Core loop:** PLAN → ACQUIRE → CONFIGURE → DEPLOY → OPERATE → EARN → OPTIMIZE → EXPAND → COMPETE → REPEAT
```
[Dashboard alert] -> 5-min decision (price/fleet/route) -> sim runs offline -> report + missions -> rank up -> unlock new strategic layer
```

**Design pillars (constraints §62 enforced):**
1. Simple surface, deep underneath. 2) Consequences > realism. 3) Automate repetition. 4) No permanent optimum. 5) 5-min session must be fun.

---

## 1. CORE PHILOSOPHY
**WHAT:** Casual path = Advisor + "Optimize Route" + Auto-RM + Auto-maintenance. Advanced = full manual.
**WHY:** Widest funnel + deep retention.
**HOW:** Every complex system has `auto` default + `manual override` + `explain` tooltip.
- Player sees: CEO Mode cards; toggle to Analyst Mode.
- Server calculates: same sim, different projection views.
- Economy effect: auto gets ~85% of optimal (intentional skill gap, not punishing).
- Boredom risk: auto plays game for you → counter: auto is good but events/competition require periodic re-opt; mastery leaderboards reward manual.
- Balance lever: `autoEfficiency = 0.85`.

## 2. PROGRESSION (8 tiers)
| Tier | Airline Lvl | Valuation gate | Unlocks new strategy |
|---|---|---|---|
| 1 Startup | 1-4 | $0-2M | 1 hub, leases, Y-only, 30 airports |
| 2 Regional | 5-9 | $2-15M | 2nd aircraft type, Premium Eco, slots at Tier-2, belly cargo |
| 3 National | 10-17 | $15-80M | 2nd hub/focus city, Business cabin, loans, basic RM |
| 4 International | 18-27 | $80-300M | Widebodies, First (on select), alliances (join), cargo contracts |
| 5 Major | 28-39 | $300M-1B | 3rd hub, dynamic pricing API, hedging, codeshares |
| 6 Global | 40-54 | $1-4B | 4th hub, freighters, alliance creation, R&D tier-3 |
| 7 Group | 55-69 | $4-15B | Subsidiaries (2nd brand), slot trading, SAF |
| 8 Empire/Prestige | 70+ | $15B+ | Prestige paths, holding company, seasonal servers |

**XP:** Player XP (account) + Airline Level (per airline). XP from flights, pax, profit, missions, events. Formula: `XP_gain = flights*2 + pax/500 + profit_k/10 + mission_bonus`. Level curve: `XP_needed(L)= 100 * L^1.6`.
**Valuation:** `Valuation = Cash + FleetMarketValue*0.85 + SlotsValue + 3*TTM_profit(avg, floored 0) + Brand(Rep*10k) + Research sunk*0.3`. Prevents cash-hoard exploit.
**Prestige (§32):** At L50+ / $2B+, choose: 1) **Holding Reset** (keep cosmetics+5% permanent revenue buff stacking to 25%, +1 slot priority), 2) **Specialist Charter** (reset map, keep research tree branch + unique livery), 3) **Seasonal Legend** (move to fresh season server with badge). Tradeoff table in TDD §32.

Each tier introduces a *verb*, not just number: Regional=connect, National=hub, International=widebody ETOPS, Major=hedge/alliance, Global=freighter, Group=multi-brand, Empire=rule-change.

## 3. CORE OPERATING LOOP (17 steps)
Create airline (name/code/logo/colors/home) → $5M cash + 2 leased 70-90 seaters (choice of 3) → Tutorial mission chain (lease→configure Y-only→open DAC-DXB style short route→set fare via slider with live profit preview→launch→ fast-forward 1 game-day→ collect). Full formulas §42.
State machine per route: `DRAFT -> EVALUATING -> ACTIVE -> SUSPENDED`. Per aircraft: `ORDERED -> DELIVERY -> ACTIVE -> MAINT -> RETIRED/SOLD`.

## 4. AIRCRAFT SYSTEM
Roster = the 100 fictional aircraft in `100_fictional_aircraft_airline_tycoon.md` (fictional manufacturers/names/specs for IP safety; prices = balance values). Only seats/range/MTOW/price are authored per model; fuel/lease/runway/speed/turn/comfort/cargo derive per propulsion class in `web/js/data.js` (lease = 0.8%/mo, belly = 8% MTOW, freighters = 55% MTOW, range nm→km). Original 14-model example table kept below for the identity/balance rationale:
| Model | Class | Seats(max) | Range km | Fuel kg/h | Speed | Buy $M | Lease $k/mo | Turn min | Comfort | Cargo t | Runway |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Lark R70 | Reg TP | 78 | 1,800 | 650 | 500 | 12 | 95 | 25 | 3 | 2 | 1200m |
| Lark R90 | Reg Jet | 92 | 2,800 | 1,100 | 780 | 22 | 165 | 30 | 5 | 3 | 1500m |
| Falcon N150 | NB | 150 | 3,800 | 2,100 | 820 | 48 | 340 | 35 | 6 | 6 | 1800m |
| Falcon N180neo | NBneo | 180 | 5,200 | 2,050 | 830 | 62 | 420 | 35 | 7 | 7 | 1900m |
| Condor W250 | WB | 250 | 9,500 | 4,800 | 870 | 140 | 920 | 70 | 8 | 18 | 2400m |
| Condor W350 | WB ULH | 350 | 13,000 | 6,200 | 880 | 220 | 1450 | 85 | 8 | 25 | 2600m |
... + 8 more (cargo variants, old cheap/ thirsty classics).
**Identity rule:** No domination: R70 has 40% lower trip cost <800km; neo 18% fuel save but 30% higher capital; classic (e.g. Falcon N150c used $18M) cheap capex, +25% fuel+maint, great for thin/low-util. Enforced via `CASK curves` crossing at different stage lengths.
**Age:** `condition 100→0`; maint cost `* (1+age^1.4*0.04)`; fuel `+ age*0.3%/yr`; value `Buy*(0.82^years)` first 5y then linear. Old planes viable on short, low-cycle? No—on low-util, low-fee airports.

## 5. ACQUISITION
- **Buy cash:** instant equity, slow start. **Loan:** 20-30% down, 5-12% APR by rep+level, 3-7y term. **Dry lease:** 0 down + deposit (1 mo), 6-36 mo, higher monthly, no residual, return penalty if early. **Used market:** rotating 10 listings, discount 30-60%, higher wear, delivery 1 day vs new 3-7 days.
- Fleet commonality: `maint cost -8% per same-family aircraft >5, cap -25%; +12% per extra family >3`. UI shows meter.
- Manufacturer Rep (Boeing-like "AeroDynamics" vs "EuroSky"): discounts to -12% at high standing, delivery priority.
- MVP: lease + cash buy + used + resale only. Loans phase-2.

## 6. CABIN CONFIG
Layouts per airframe define floor-space units. E.g. N180: 180 Y (=1u each) OR 150Y+12J (J=3u) OR 120Y+12J+8F (F=5u). Effects: `capacity↓, yield↑, weight↑ (+40kg/seat J, +80 F), service cost↑ ($3 Y, $9 PY, $28 J, $60 F per pax), demand mix shift`. Rule: F only unlocks Intl+, only viable >3000km + high business/tourism + rep>70. Prevents F-spam.

## 7. AIRPORT SYSTEM
MVP 28 airports (DAC hub example + DXB,BKK,KUL,SIN,DEL,BOM,DOH,IST,LHR,JFK...). Attributes: tier 1-4, pop/GDP/tourism/business (1-100), fees ($/pax + $/movement), slots/hour, curfew, runway, connection index, seasonality curve, reputation, expansion events.
Airports are resources: LHR Tier-4: huge demand, slot-capped, peak premium; secondary (LTN/STN analogue "Iris Field"): low fees, free slots, -15% demand. Strategy = where to base.

## 8. ROUTE SYSTEM
Route = (A,B,aircraft, config, freq/day, fares per cabin). Profit preview uses §9-11. Suitability score: range margin, runway, turn vs freq, ETOPS. Frequency > monopoly bonus but slot cost. Seasonality multiplies weekly.

## 9-10. DEMAND MODEL + SEGMENTS
`BaseDemand_day(A,B) = K * (PopA*PopB)^0.35 * (GDPpcA*GDPpcB)^0.25 * (1+Tourism*0.5+Business*0.7) / Dist^0.75`
`K` calibrated so DAC-DXB ~ 900/day. Then: `* Season(month,route) * Event * EconCycle * CompetitionSplit`.
Price elasticity by segment: Budget -2.0, Tourist -1.4, Family -1.2, VFR -1.0, Business -0.4, Premium -0.5, Cargo -0.8. Formula: `D(P)=D0*(P0/P)^e * RepFactor * FreqFactor * ComfortFactor`.
`FreqFactor = 1 - exp(-freq/ freq0)` (diminishing; freq0=2). `RepFactor=0.6+Rep/100*0.8` (±). `Comfort: +8% per comfort point above market avg for premium segs`.
Split among N competitors via logit: `Share_i = exp(U_i)/Σexp(U_j)`, `U = -α*ln(P) + β*ln(freq) + γ*Rep + δ*Network(connections) + ε*OnTime`. α varies by segment (budget high).
Connecting pax: if hub H with min-connect 60-90m and load <85%, add `0.25* D(A,H)*D(H,B)/D(H)` capped.
Example calc in §42 full.

## 11. PRICING
Show market avg fare `P0 = 0.12*Dist + 35 + fee pass` (economy). Slider ±50% with live LF/profit curve. Auto-RM (default ON casual): nightly re-price `P* = argmax R` via elasticity + LF target 78-85%. Advanced: per-cabin, seasonal, event multiplier, competitor undercut toggle. "Optimize" button runs server sim and applies.

## 12. FLIGHT OPS (automated)
Once ACTIVE, scheduler generates flights per freq; each flight lifecycle: `SCHEDULED->BOARDING->DEPARTED->ARRIVED->TURNAROUND`. Tick engine resolves in batch (not realtime per-flight loop). Delays prob from maint/crew/weather/slot congestion; cancellations rare (<1% unless condition<40). Utilization = block hrs/24. Player never clicks "fly".

## 13. TIME + OFFLINE
Game clock: 1 game-day = 24-60 min real (tunable per server speed). Flights resolve at day-tick + hourly mini-ticks. Offline: on login, `catchUp(airline, lastSeen)` idempotently replays day buckets (max 7 days full, then degraded 50% to prevent infinite hoard + encourage return). "While you were away" modal: flights, pax, revenue, profit, rep delta, alerts. Secure: all in server worker, client only requests report ID.

## 14. MAINTENANCE
Condition 0-100 decays `cycles*0.8 + hours*0.3 + ageFactor`. A-check every 3 days (30m game, $2-8k), C-check every 30 days (1 day, $80-300k by size). If deferred: delayP `=(100-cond)/200`, failure/cancel `=(60-cond)/500` if <60. Old planes cost more but fly if maintained—strategic for backup fleet.

## 15. CREW (pools, not individuals)
Pools per base: pilots, cabin, engineers, ground. Staffing ratio per aircraft/day. Levels: understaffed → fatigue↑ delay↑; optimal → nominal; overstaffed → cost↑ OTP↑ small. Training ($ + 3 days) +5% productivity. MVP simplifies to `CrewLevel 1-5` per hub affecting OTP/service, not 100s of rows.

## 16. HUBS + NETWORK
Primary free, 2nd $2M + L10, 3rd $15M + L28, etc. Hub bonus: connecting pax +20%, turn -10%, crew -10% if based. Congestion: >40 dep/day → delay +2%/10 flights. Spoke strategy beats point-to-point when connection index high. Map UI shows hub-spoke tree.

## 17. SLOTS
Each airport: slots/hour buckets (peak/offpeak). Newbies protected: Tier-3/4 grant 2 free offpeak starter slots; peak must earn (level/rep/auction) or buy secondary airports. Retain via use-it-or-lose-it 80% rule; trade in Group tier; expansion events add slots. No frustration: always an alternate airport/time.

## 18. FUEL + OPEX
Opex list per flight: fuel (`burn*hrs*price`), fees, crew ($/block hr), maint reserve, catering, handling, lease/finance daily slice, insurance, HQ overhead, tax on profit. Fuel price: mean-reverting random walk $2.20-4.00/gal + shocks; contracts: lock 30d at +5% premium; hedging (Major+): futures, protects but caps upside. Neo/SAF reduce exposure.

## 19. FINANCE (CEO + Analyst)
CEO: Cash, Revenue, Profit, Value, Burn runway. Analyst: RASK, CASK, Yield, LF, BELF (`BELF=CASK/Yield`), utilization, profit/route, per-airframe. Bankruptcy: cash<0 → 7d protection (can't expand, auto-sell option), then reset to $2M starter at -1 tier + rep -10 (soft, not delete).

## 20. REPUTATION (0-100)
`Rep += w1*OTP + w2*Service(comfort+catering+crew) + w3*Value(price vs market) - w4*cancels - w5*oldFleetPenalty + events`. Affects demand (§9) + loan APR + slot priority. Slow to build, fast to lose (asymmetric).

## 21. AI COMPETITORS (personality FSM, not random)
4 archetypes with utility weights (LCC price-aggressive, Premium service, Regional thin, Mega hub-spam). Tick daily: evaluate 3 worst routes, undercut/expand/exit by personality + react to player entry within 3 days (LCC cuts 10%, Premium holds + adds freq). Cap AI so player can win niches. Difficulty scales with tier.

## 22. PvP (non-toxic share battle)
Same route can host many airlines; share via logit (§9). No stealing/sabotage. Leaderboards: profit, pax, OTP, network. Contracts (§25) competitive bids (highest reliability-adjusted value wins, not just price).

## 23. ALLIANCES
Join at Intl (5-20 members), create at Global. Benefits: +10% connecting between members, shared lounge (+rep premium), joint events ranking. Roles: Founder/Admin/Member; dues + contribution score (flights+OTP); governance: vote kick, season goals. Anti-dead-alliance: decay if inactive.

## 24-25. CARGO + CONTRACTS
Belly cargo from Regional (auto, `cargoRev = bellyT * load% * $/kg*dist`). Freighters at Global. Contracts: corps/govts post (e.g. "120 J seats DAC-DOH 14d, min OTP 85%, $180k + bonus/penalty"). Bid with reliability score. Rotating board, 3 active max early.

## 26-27. R&D + LOYALTY
3 trees × 4 tiers (Ops/Commercial/Customer/Fleet/Sustain). Each node = verb (e.g. "Turn -10%", "Auto-RM +5% yield", "Lounge unlock") not +2% stats. Cost time+$. Loyalty: Miles liability tracked, tiers Silver/Gold/Plat (+3/6/10% premium retention), lounge (+rep).

## 28-29. RANDOM + LIVE EVENTS
Deck with weights + cooldowns + pity (no 2 punishments in row). Examples table + effect + counterplay (fuel spike → hedge/neo; tourism boom → add freq). Live ops calendar: Olympics/World Cup/Expo/Hajj/Holiday/Euro-summer — 2-week windows, boosted O-Ds, special contracts + event leaderboard. Rotation schedule in LiveOps doc.

## 30-31. MISSIONS + ACHIEVEMENTS
Daily (3, rerollable), Weekly (5), Monthly (3), Story chain (20 steps, teaches loop, grants 2nd aircraft + $1M). Achievements 60+ (progression, skill, hidden e.g. "Fly full F cabin at 100% LF", empire "Billionaire"). Grants XP + cosmetics + small cash (never P2W).

## 32. PRESTIGE (anti-finish)
See §2 table. Permanent buffs small (+5% to +25% cap) + exclusive liveries/HQ skins + leaderboard badge. Multiple paths viable; seasonal server prevents whale lock.

## 33. ARCHETYPES (balanced)
LCC: -20% service cost, +10% turn speed, -rep cap 80, J/F penalty. Premium: +15% premium demand, +20% service cost. Regional: -30% fees at Tier-1/2, WB penalty. Long-haul: -10% fuel long, +slot priority Intl. Cargo: +20% cargo yield. Charter: event bonus. Pick 1 affinity at L5 (respec $), none dominates (rock-paper-scissors by map/event).

## 34-35. HQ + BRANDING
HQ visual 5 stages + skins (monetized cosmetic only, +0 power except +1% morale cap—negligible). Branding: name/code (ICAO uniqueness check), logo picker + custom SVG upload (moderated), livery editor (3 zones colors), cabin branding. Shareable airline card.

## 36-37. UX (CEO/Analyst + Advisor)
CEO dashboard: Cash, today profit, fleet status dots, top alerts (3), missions, "Collect/Optimize" CTA. Analyst: sortable route table (LF/yield/RASK/CASK/BELF), fleet utilization heatmap, demand curves. Advisor: rule engine ("Util 68% → add freq KUL") with [Apply] [Explain] [Dismiss]; never auto-applies unless toggle. Mobile: bottom nav 5 tabs, one-thumb actions.

## 38-39. MONETIZATION (ethical) + MOBILE
**Sell time+convenience+expression.** Premium currency SkyCredits (SC):
- Sinks: instant delivery, extra contract slot, livery/HQ skins, season pass tiers, slot-peak priority pass (time-limited, not permanent ownership), research boost (max -30% time, never exclusive tech).
- NOT sold: cash directly (only small starter, capped), permanent peak slots, demand buffs, win buttons.
- Battle Pass $8/season (free track viable), VIP $5/mo (QoL: +1 mission slot, ad-free, extra report detail, priority queue—no profit buff >3%), Starter $3 (2nd lease discount + skin), Rewarded ads (opt-in: +2h fast-forward, capped 3/day, never forced).
- Pricing psych + risks table in TDD. Mobile: daily reward streak, push opt-in categories, quick actions, 3-min loop.
**Anti-P2W guardrails:** all purchasable boosts capped ≤10% and time-boxed; leaderboards split F2P/overall? No—same board but boosts disclosed; whale can't buy slots permanently.

## 40-41. RETENTION + ANTI-BOREDOM
Minute: decisions with previews. Hourly: tick completions. Daily: missions/streak/offline report. Weekly: events/alliance goals. Monthly: tier unlock. Seasonal: new meta/aircraft/map. Anti-boredom matrix: optimal-route rot (dynamic demand+AI undercut), obsolete fleet (niches+used market), finish (prestige+seasons), repetition (events+contracts+archetype alts). No dark patterns: caps, transparent odds, no loss-aversion spam (max 2 pushes/day default).

## 42. ECONOMIC FORMULAS (core, with example)
```
BaseD = K*(PopA*PopB)^0.35*(GDP_A*GDP_B)^0.25*(1+0.5*Tour+0.7*Biz)/Dist^0.75
D(P) = BaseD*Season*Event*Econ * (P0/P)^e * (0.6+0.8*Rep/100) * (1-exp(-freq/2)) * ComfortAdj
Share_i = exp(U_i)/Σexp(U_j), U=-α lnP +β lnfreq +γRep +δNet +εOTP
LF = min(1, D*Share / (Seats*freq))
Rev = Σ_cab Pax_c*Fare_c + CargoRev
Fuel = Burn*Hours*FuelPrice ; CASK = TotalCost/ASK ; RASK=Rev/ASK ; BELF=CASK/Yield
Profit = Rev - (Fuel+Fees+Crew+Maint+Catering+Handling+LeaseDaily+Overhead+Tax)
Cond -= cycles*0.8+hrs*0.3 ; MaintCost = base*(1+age^1.4*0.04)*(1-commonalityDisc)
Valuation = Cash+0.85*FleetMV+SlotsV+3*avgProfit+Rep*10k
```
**Example DAC(30M, $2.5k, Tour .3 Biz .4)-DXB(3.5M,$4k,T .8 B .7) 2200km:** BaseD≈880/d. P0_Y=$299. At P=$279 (e=1.4 blended), Rep70, freq2: D≈880*1.08*1.12*0.86≈917. Seats 150*2=300/day? Wait freq2 N150 =300 seats → LF 100%+ spill → need freq3 (450 seats, LF~78% after share 65% vs AI). Rev≈ 300*279≈$83k/d/route, costs≈$58k → profit ~$25k/d. Numbers tunable via K.

## 43. BALANCING (targets)
Start $5M, 2 leases (~$260k/mo), Day1 profit $15-40k, D7 fleet 3-4, $100k/d, D30 6-8 ac $300k/d, D90 national $1M/d, D365 $3-5M/d top 5%. Tables + inflation controls: dynamic fee scaling, AI undercut, fuel mean-reversion, slot scarcity, degraded offline >7d, season reset. Premium SC drip 20-40/d F2P (pass needs 60d or pay).

---
*Continue in TDD.md for DB/backend/sim/API/security/web/mobile/notifications/social/report/MVP/roadmap/team/cost/analytics/liveops/psychology + assumptions.*
