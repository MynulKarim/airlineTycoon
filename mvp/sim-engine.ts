// packages/sim — pure, server-authoritative, no I/O. Shared by API workers + tests.
// Money in cents (int), demand in pax/day.
export interface AirportAttr { pop: number; gdppc: number; tourism: number; business: number; }
export interface RouteInput { distKm: number; baseK: number; season: number; event: number; econ: number; fareY: number; fareAvg: number; elasticity: number; rep: number; freq: number; seatsPerDay: number; share: number; }

export function baseDemand(a: AirportAttr, b: AirportAttr, distKm: number, K = 0.055): number {
  // §9: K calibrated so DAC-DXB ~900/d
  const pop = Math.pow(a.pop * b.pop, 0.35);
  const gdp = Math.pow(a.gdppc * b.gdppc, 0.25);
  const mix = 1 + 0.5 * (a.tourism + b.tourism) / 2 + 0.7 * (a.business + b.business) / 2;
  return K * pop * gdp * mix / Math.pow(distKm, 0.75);
}
export function demandAtPrice(r: RouteInput, baseD: number): number {
  const priceF = Math.pow(r.fareAvg / Math.max(1, r.fareY), r.elasticity);
  const repF = 0.6 + 0.8 * (r.rep / 100);
  const freqF = 1 - Math.exp(-r.freq / 2);
  return baseD * r.season * r.event * r.econ * priceF * repF * freqF * r.share;
}
export function logitShare(utils: number[]): number[] {
  const e = utils.map(Math.exp); const s = e.reduce((x, y) => x + y, 0);
  return e.map((v) => v / s);
}
export function routeUtil(u: { fare: number; freq: number; rep: number; net: number; otp: number }, segAlpha = 1.2): number {
  return -segAlpha * Math.log(u.fare) + 0.8 * Math.log(u.freq) + 0.03 * u.rep + 0.5 * u.net + 0.4 * u.otp;
}
export interface FlightCost { fuelCents: number; feeCents: number; crewCents: number; maintCents: number; serviceCents: number; leaseDailyCents: number; overheadCents: number; }
export function flightProfit(paxY: number, fareYCents: number, cargoCents: number, c: FlightCost): { rev: number; cost: number; profit: number } {
  const rev = Math.round(paxY * fareYCents + cargoCents);
  const cost = c.fuelCents + c.feeCents + c.crewCents + c.maintCents + c.serviceCents + c.leaseDailyCents + c.overheadCents;
  return { rev, cost, profit: rev - cost };
}
export function conditionDecay(cond: number, cycles: number, hours: number): number {
  return Math.max(0, cond - (cycles * 0.8 + hours * 0.3));
}
export function maintCost(baseCents: number, ageYears: number, commonalityDisc = 0): number {
  return Math.round(baseCents * (1 + Math.pow(ageYears, 1.4) * 0.04) * (1 - commonalityDisc));
}
// Deterministic RNG for idempotent day ticks: mulberry32 seeded by (airline, day)
export function rng(seed: number) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
