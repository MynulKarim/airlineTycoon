# Skyline: Aviation Empire — Playable Web MVP

No build step. Just open in a browser.

## Run
- Double-click `web/index.html`, or serve: `npx serve web` / `python3 -m http.server -d web 8000`
- Save lives in `localStorage` (`skyline_save_v1`). Reset via ↺ in nav.

## Play (2 min to first profit)
1. Found airline (DAC default, $5M + 2× Lark R90 leased).
2. Routes → From DAC To DXB → Preview → Optimize → Launch.
3. Press ▶ +1 Day (or wait 45s = 1 game-day, auto-ticks).
4. Fleet → A-check when condition <60%. Dashboard → follow Advisor.
5. Story missions pay cash. Watch fuel price. AI will undercut good routes — re-optimize fare/freq.

## What's simulated (per GDD §42)
Base demand, elasticity, logit market share vs 4 AI personalities, fare/freq/rep effects, fuel random-walk + events, wear/maint, XP/levels, bankruptcy protection, offline catch-up (45s=1 day away, cap 40d, degraded after 7d) with "While you were away…" report.

## Depth systems
- Passenger voices: per-route segment reviews (budget/business/premium/family) react to your fare, frequency, aircraft age, condition, and cancellations.
- Hubs: through-tickets — routes feeding your other departures from the same airport earn connecting pax (12% per onward flight, cap 35%); hub card + per-route counters.
- Visible wear: livery dirties with condition/age (Factory fresh → Rust bucket); C-checks include a repaint; old jets draw premium-cabin complaints.
- Choice events: ash closures, strikes, promo deals, refinery outages, viral videos — each with 2 priced options (ash/strike can disrupt flights). Ignored alerts wait; event modal blocks stacking.
- Contracts: sponsors offer weekly payouts on your active routes (keep LF ≥70%, 3 weeks + bonus); strikes, termination, and rep effects included.
- Fuel desk: hedge today's price +5% for 30 days, with live P/L tracked on actual burn.

## Feel features
- Living map: your flights animate at true relative cruise speeds (click a plane for LF/profit + aircraft/speed), day/night shade from real UTC time, airport popups link to OurAirports + plan From/To. Rivals stay off the map — you'll hear from them instead.
- Skyline Gazette: front page on the dashboard (offline headlines, best/worst day, fuel/rep deltas). Fold it away to a stylish cover ("The Skyline Gazette" — tap to unfold); unfolds automatically with fresh news after time away.
- AI CEOs with faces/quotes: Maya Chen (SwiftGo), Lord Ashworth (Royal Meridian), Dolly Ray (Magnolia), Omar Haddad (Titan) — taunts on entry, praise when you dominate, leaderboard bios.
- Sound (WebAudio, no files): cash chime on profitable days, fanfare on level-up, alarm + red screen flash on default/bankruptcy. Mute button in the top bar (persisted).
- Sparklines: per-route daily-profit trend in Routes table + dashboard.

## Map + airports (OurAirports)
- Positions/names/codes/elevations: [OurAirports](https://ourairports.com/data/) public-domain data (`airports.csv` via https://davidmegginson.github.io/ourairports-data/airports.csv). Each airport stores its OurAirports `ident` and links to its page (`ourairports.com/airports/{ident}/`).
- Map: [Leaflet](https://leafletjs.com) with OpenStreetMap + Esri World Imagery base layers and layer/scale controls — the same stack as [The Big Map](https://ourairports.com/big-map.html) (`oamap.js`: `L.tileLayer` OSM/Esri, airport marker layers, popups). Markers sized by tier; popups show ICAO/IATA, elev, tier + Set-From/Set-To planning.
- Refresh data: download `airports.csv`, filter `type=large_airport` (+ a few medium), keep `ident/icao/iata/name/municipality/iso_country/latitude_deg/longitude_deg/elevation_ft`, paste into `web/js/data.js`.
- Needs internet for Leaflet CDN + tiles; all sim still runs offline (map tab shows fallback note).

## Files
- `web/js/data.js` — 72 real airports worldwide (OurAirports idents), 100 fictional aircraft (specs from `100_fictional_aircraft_airline_tycoon.md`; fuel/lease/runway/etc. derived per class in-file)
- `web/js/sim.js` — pure sim (port of `mvp/sim-engine.ts`, no DOM)
- `web/js/game.js` — state, day tick, AI, missions, save/offline
- `web/js/ui.js` — dashboard, Leaflet map, fleet, routes, finance, missions, leaderboard
- `GDD.md` / `TDD.md` — full design + backend plan (server-authoritative Fastify+Postgres when going online; this MVP runs the same sim client-side for playtesting)
