#!/usr/bin/env node
/**
 * Unit tests for the BS EN 13906-1 compression-spring engine.
 * Run: node tests/test-engine.js
 */
"use strict";

const path = require("path");
const E = require(path.join(__dirname, "..", "js", "engine.js"));

let passed = 0;
let failed = 0;
const failures = [];

function almostEqual(a, b, tol) {
  tol = tol == null ? 1e-6 : tol;
  if (!isFinite(a) || !isFinite(b)) return false;
  const scale = Math.max(1, Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= tol * scale;
}

function assert(cond, name, detail) {
  if (cond) {
    passed += 1;
    console.log("  PASS  " + name);
  } else {
    failed += 1;
    const msg = "  FAIL  " + name + (detail ? " — " + detail : "");
    failures.push(msg);
    console.log(msg);
  }
}

function assertClose(actual, expected, name, tol) {
  const ok = almostEqual(actual, expected, tol);
  assert(
    ok,
    name,
    "expected " + expected + " got " + actual
  );
}

console.log("Spring engine tests\n");

console.log("Formulas");
assertClose(E.bergstraesserK(6), 6.5 / 5.25, "Bergsträsser k at w = 6");
assertClose(E.bergstraesserK(8), 8.5 / 7.25, "Bergsträsser k at w = 8");
assertClose(E.bergstraesserK(10), 10.5 / 9.25, "Bergsträsser k at w = 10");
assert(E.bergstraesserK(0.75) === Infinity, "Bergsträsser k undefined at w = 0.75");

const tau = E.uncorrectedStress(20, 2, 100);
assertClose(tau, 2000 / Math.PI, "Uncorrected τ = 8DF/(πd³)");
assertClose(
  E.correctedStress(20, 2, 100),
  E.bergstraesserK(10) * tau,
  "Corrected τk = k τ"
);

assertClose(E.solidLength(8, 2, "closed_ground"), 20, "Lc = (n+2)d closed and ground");
assertClose(E.solidLength(8, 2, "closed"), 22, "Lc = (n+3)d closed, not ground");
assertClose(E.totalCoils(8, "closed_ground"), 10, "nt = n+2 closed and ground");
assertClose(E.pitch(60, 8, 2, "closed_ground"), (60 - 4) / 8, "Pitch (L0 − 2d)/n");

const G = 81500;
const d = 4;
const D = 40;
const n = 10;
const R = E.rateFromGeometry(G, d, D, n);
assertClose(R, (81500 * 256) / (8 * 64000 * 10), "Rate R = G d⁴/(8 D³ n)");
assertClose(R, 4.075, "Worked rate ≈ 4.075 N/mm", 1e-4);
assertClose(E.activeCoils(G, d, D, R), n, "n recovered from rate");

console.log("\nMode A derivation");
const modeA = E.deriveModeA(50, 50, 35, 125);
assert(modeA.ok, "Mode A accepts a valid pair of points");
assertClose(modeA.R, 5, "Mode A rate (F2−F1)/(L1−L2)");
assertClose(modeA.L0, 60, "Mode A free length L0 = L1 + F1/R");
assertClose(modeA.Fmax, 125, "Mode A Fmax is F2");

const badA = E.deriveModeA(30, 50, 40, 125);
assert(!badA.ok, "Mode A rejects L1 ≤ L2");

const badA2 = E.deriveModeA(50, 150, 35, 125);
assert(!badA2.ok, "Mode A rejects F2 ≤ F1");

console.log("\nMode B derivation");
const modeB = E.deriveModeB(125, 35, 5, "F2");
assert(modeB.ok, "Mode B accepts F, L, R");
assertClose(modeB.L0, 60, "Mode B L0 = L + F/R");
assertClose(modeB.F2, 125, "Mode B treats the point as F2 by default");
assert(modeB.F1 == null, "Mode B leaves F1 unset");

console.log("\nWorked example (full design)");
/*
  L1 = 50 mm at F1 = 50 N
  L2 = 35 mm at F2 = 125 N
  → R = 5 N/mm, L0 = 60 mm
  Pocket De max = 18.5 mm, d = 2.0 mm → D = 16.5 mm
  G = 81500 N/mm², Rm = 1800 N/mm², τallow = 0.5 Rm = 900
*/
const example = {
  d: 2,
  D: 16.5,
  G: 81500,
  Rm: 1800,
  tauFactor: 0.5,
  R: 5,
  L0: 60,
  L1: 50,
  F1: 50,
  L2: 35,
  F2: 125,
  Fmax: 125,
  LmaxLoad: 35,
  DeMax: 18.5,
  ends: "closed_ground"
};

const ev = E.evaluateDesign(example);
assert(ev.ok && ev.pass, "Worked example passes all checks");
assertClose(ev.w, 8.25, "Index w = 16.5/2");
assertClose(ev.k, 8.75 / 7.5, "Bergsträsser k at w = 8.25");
assertClose(ev.tau, 16500 / (Math.PI * 8), "Uncorrected stress at F2");
assertClose(ev.tauK, ev.k * ev.tau, "Corrected stress at F2");
assertClose(ev.tauAllow, 900, "Allowable = 0.5 Rm");
assertClose(ev.n, 81500 * 16 / (8 * Math.pow(16.5, 3) * 5), "Active coils from rate");
assertClose(ev.Lc, ev.nt * 2, "Solid length nt × d");
assert(ev.Lc < 35, "Solid length shorter than L2");
assertClose(ev.pctAllow, (100 * ev.tauK) / 900, "Percent of allowable");
assert(ev.pctAllow < 100, "Stress below allowable");
assertClose(ev.s2, 25, "Working deflection L0 − L2");
assertClose(ev.deflPct2, (100 * 25) / ev.sc, "Deflection as % of available travel");

console.log("\n  Worked-example snapshot");
console.log("    w      = " + ev.w.toFixed(4));
console.log("    k      = " + ev.k.toFixed(6));
console.log("    τ      = " + ev.tau.toFixed(3) + " N/mm²");
console.log("    τk     = " + ev.tauK.toFixed(3) + " N/mm²");
console.log("    % all. = " + ev.pctAllow.toFixed(2) + " %");
console.log("    n      = " + ev.n.toFixed(5));
console.log("    nt     = " + ev.nt.toFixed(5));
console.log("    Lc     = " + ev.Lc.toFixed(4) + " mm");
console.log("    sc     = " + ev.sc.toFixed(4) + " mm");
console.log("    defl%  = " + ev.deflPct2.toFixed(2) + " %");

console.log("\nWire list and optimisation");
const loads = E.deriveModeA(50, 50, 35, 125);
const rows = E.listWires({
  DeMax: 18.5,
  G: 81500,
  Rm: 1800,
  tauFactor: 0.5,
  R: loads.R,
  L0: loads.L0,
  L1: loads.L1,
  F1: loads.F1,
  L2: loads.L2,
  F2: loads.F2,
  Fmax: loads.Fmax,
  LmaxLoad: loads.LmaxLoad,
  ends: "closed_ground"
});
assert(rows.length > 10, "Wire list returns many standard sizes");
const d2 = rows.find(function (r) { return Math.abs(r.d - 2) < 1e-9; });
assert(!!d2, "Wire list includes 2.00 mm");
assertClose(d2.D, 16.5, "Wire list uses D = De max − d");
assert(d2.pass, "2.00 mm at max D passes in the worked example");

const huge = E.evaluateDesign(Object.assign({}, example, { d: 20, D: -1.5 }));
assert(!huge.pass, "Oversized wire does not pass");

const opt = E.autoOptimise(example, 80);
assert(!!opt.best, "Auto-optimise returns a candidate");
assert(opt.best.D >= opt.bounds.Dmin - 1e-9, "Optimum D at or above Dmin (w = 4)");
assert(opt.best.D <= opt.bounds.Dmax + 1e-9, "Optimum D at or below Dmax");
assert(opt.best.De <= 18.5 + 1e-6, "Optimum still fits the pocket");

const bounds = E.diameterBounds(2, 18.5);
assertClose(bounds.Dmin, 8, "Dmin at w = 4");
assertClose(bounds.Dmax, 16.5, "Dmax = min(De max − d, 16d)");

console.log("\nMaterial helpers");
assertClose(E.suggestedClearance(20), 1.0, "Suggested clearance for a 20 mm pocket");
assertClose(E.suggestedClearance(12), 0.8, "Suggested clearance for a 12 mm pocket");
const rm2 = E.indicativeRm("10270-1-DH", 2.0);
assert(rm2 === 1960, "Indicative DH Rm at 2 mm");
const rm3 = E.indicativeRm("10270-1-DH", 3.0);
assert(rm3 === 1800, "Indicative DH Rm at 3 mm");
assert(E.materialById("10270-1-DH").G === 81500, "EN 10270-1 G = 81 500 N/mm²");
assert(E.materialById("10270-3-14310").G === 70000, "EN 10270-3 1.4310 G = 70 000 N/mm²");
assert(E.materialById("10270-2-VDSiCr").G === 79500, "EN 10270-2 G = 79 500 N/mm²");

console.log("\nMechanixCalc-style rate check (Wahl vs Bergsträsser)");
/* Same geometry as the public worked example: d=4, D=40, n=10, F=200, G=81500 */
const rateCheck = E.rateFromGeometry(81500, 4, 40, 10);
const tau0 = E.uncorrectedStress(40, 4, 200);
const tauK = E.correctedStress(40, 4, 200);
assertClose(rateCheck, 4.075, "Published-style rate", 1e-3);
assertClose(tau0, 64000 / (Math.PI * 64), "Uncorrected τ at 200 N");
assertClose(E.wahlK(10), (39 / 36) + 0.0615, "Wahl k at w = 10 (reference only)");
assertClose(E.bergstraesserK(10), 10.5 / 9.25, "Bergsträsser used for design τk");
assert(E.bergstraesserK(10) !== E.wahlK(10), "Bergsträsser and Wahl are distinct");

console.log("\nHeat map grid and viable counts");
const hmInput = {
  DeMax: 18.5,
  G: 81500,
  Rm: 1800,
  tauFactor: 0.5,
  R: loads.R,
  L0: loads.L0,
  L1: loads.L1,
  F1: loads.F1,
  L2: loads.L2,
  F2: loads.F2,
  Fmax: loads.Fmax,
  LmaxLoad: loads.LmaxLoad,
  ends: "closed_ground"
};
const hm = E.buildHeatmap(hmInput);
assert(hm.step === 1, "Heat map uses 1 mm steps");
assert(hm.wires.indexOf(2) >= 0, "Heat map includes 2.00 mm wire");
assert(hm.wires.every(function (d) { return d < 18.5; }), "Heat map omits wires thicker than De max");
assert(hm.diameters.length > 4, "Heat map has a range of mean diameters");
assertClose(hm.diameters[1] - hm.diameters[0], 1, "Mean diameters step by 1 mm");
assert(Math.abs(hm.Dmin - 1) < 1e-9, "A pocket-only map still starts at 1 mm");
assert(hm.Dmax <= 18.5 - Math.min.apply(null, hm.wires) + 1e-9, "D axis stops at max OD minus the thinnest wire");
assert(hm.diameters.indexOf(16) >= 0, "D = 16 mm is on the 1 mm grid");

function hmCell(grid, D, d) {
  const row = grid.rows.find(function (r) { return Math.abs(r.D - D) < 1e-9; });
  if (!row) return null;
  return row.cells.find(function (c) { return Math.abs(c.d - d) < 1e-9; }) || null;
}

const cellEx = hmCell(hm, 16, 2);
assert(!!cellEx, "Finds the cell D = 16 mm, d = 2 mm");
assert(cellEx.viable && cellEx.geometricOk, "Worked-example cell is viable");
const cellDesign = E.evaluateDesign(Object.assign({}, hmInput, { d: 2, D: 16 }));
assertClose(cellEx.pctAllow, cellDesign.pctAllow, "Heat-map stress matches evaluateDesign", 1e-6);
assert(cellEx.band === "amber" || cellEx.band === "good", "Worked-example cell is coloured by stress, not grey");

const cellThin = hmCell(hm, 16, 0.5);
assert(!!cellThin, "Includes a fine-wire cell at D = 16 mm");
assert(!cellThin.geometricOk && !cellThin.viable, "Fine wire at large D fails the index check");
assert(cellThin.band === "invalid", "Index failure is greyed out");

const cellPocket = hmCell(hm, 16, 3);
assert(!!cellPocket, "Includes 3.00 mm at D = 16 mm");
assert(!cellPocket.geometricOk && cellPocket.band === "invalid", "De above the pocket is greyed out");

const cellIndex = hmCell(hm, 6, 2);
assert(!!cellIndex, "Includes D = 6.0 mm, d = 2 mm");
assert(!cellIndex.geometricOk && cellIndex.band === "invalid", "Index below 4 is greyed out");

const cellOver = hmCell(hm, 16, 1.8);
assert(!!cellOver, "Includes D = 16 mm, d = 1.8 mm");
assert(cellOver.geometricOk, "1.8 mm at D = 16 mm is geometrically valid");
assert(!cellOver.viable, "1.8 mm at D = 16 mm exceeds allowable stress");
assert(cellOver.band === "over", "Stress above allowable is coloured red, not grey");
assert(cellOver.pctAllow > 100, "Over-stress cell has τk above 100 % of allowable");

hm.rows.forEach(function (row) {
  const counted = row.cells.filter(function (c) { return c.viable; }).length;
  assert(row.viableCount === counted, "Viable count for D = " + row.D + " matches passing cells");
});

const countedMax = Math.max.apply(null, hm.rows.map(function (r) { return r.viableCount; }));
assert(hm.maxViable === countedMax, "maxViable is the largest per-row count");
assert(hm.bestDiameters.length >= 1, "At least one coil diameter is marked as having the most options");
assert(hm.bestDiameters.every(function (D) {
  const row = hm.rows.find(function (r) { return Math.abs(r.D - D) < 1e-9; });
  return row && row.isBest && row.viableCount === hm.maxViable;
}), "Highlighted diameters are exactly those with the maximum viable count");
assert(hm.rows.filter(function (r) { return r.isBest; }).length === hm.bestDiameters.length,
  "isBest flags match bestDiameters");

assert(E.heatmapBand(50, true) === "good", "τk at 50 % of allowable is green (well within)");
assert(E.heatmapBand(85, true) === "amber", "τk at 85 % of allowable is amber");
assert(E.heatmapBand(100, true) === "amber", "τk at 100 % of allowable is amber (at the limit)");
assert(E.heatmapBand(120, true) === "over", "τk at 120 % of allowable is red (over)");
assert(E.heatmapBand(40, false) === "invalid", "Geometrically invalid cells are grey regardless of stress");
assert(E.heatmapBand(NaN, true) === "invalid", "Non-finite stress on an otherwise open cell is treated as invalid");

const emptyHm = E.buildHeatmap({ DeMax: 0, R: 5, L0: 60, G: 81500, Rm: 1800 }, { step: 0.5 });
assert(emptyHm.rows.length === 0 && emptyHm.maxViable === 0, "Empty or invalid input yields an empty grid");

const customHm = E.buildHeatmap(Object.assign({}, hmInput, { wires: [2, 1.8, 2.2] }), { step: 0.5 });
assert(customHm.wires.length === 3, "Custom wire list is honoured");
assert(customHm.wires.indexOf(1) === -1, "Custom list does not inject extra standard sizes");

console.log("\nHeat map bounds\n");
const openLoads = {
  G: 81500, Rm: 1800, tauFactor: 0.5,
  R: loads.R, L0: loads.L0, L1: loads.L1, F1: loads.F1,
  L2: loads.L2, F2: loads.F2, Fmax: loads.Fmax, LmaxLoad: loads.LmaxLoad,
  ends: "closed_ground"
};
const tOpen = Date.now();
const openHm = E.buildHeatmap(openLoads);
const openMs = Date.now() - tOpen;
assert(openMs < 500, "A map with no constraints builds quickly", openMs + " ms");
assert(openHm.step === 1 && openHm.diameters.length === 100, "No constraints: D is 1 mm to 100 mm in 1 mm steps");
assert(Math.abs(openHm.diameters[0] - 1) < 1e-9 && Math.abs(openHm.diameters[openHm.diameters.length - 1] - 100) < 1e-9,
  "No constraints: the rows run from 1 mm to 100 mm");
assert(openHm.wires[0] === 0.2 && openHm.wires[openHm.wires.length - 1] === 12,
  "No constraints: wires run from 0.2 mm to 12 mm");
console.log("    No-constraint heat map built in " + openMs + " ms (" + openHm.rows.length + " × " + openHm.wires.length + ")");

const guideOnly = E.buildHeatmap(Object.assign({}, openLoads, { innerMin: 10, innerClearance: 2 }));
const guideThin = Math.min.apply(null, guideOnly.wires);
assert(guideOnly.Dmin + 1e-9 >= 12 + guideThin && guideOnly.Dmin < 12 + guideThin + guideOnly.step,
  "Guide only: bottom row is the first step at guide + clearance + thinnest wire", guideOnly.Dmin);
assert(Math.abs(guideOnly.diameters[guideOnly.diameters.length - 1] - 100) < 1e-9, "Guide only: the top stays at 100 mm");
const guideLow = hmCell(guideOnly, guideOnly.Dmin, 2);
assert(guideLow && guideLow.reasons.some(function (r) { return r.indexOf("Inside diameter is below") === 0; }),
  "A thicker wire on the bottom row is below the spring guide");
const guideOk = hmCell(guideOnly, 20, 2);
assert(guideOk && guideOk.reasons.every(function (r) { return r.indexOf("Inside diameter is below") !== 0; }),
  "D = 20 mm, d = 2 mm clears a 12 mm spring guide");

const bothHm = E.buildHeatmap(Object.assign({}, openLoads, { DeMax: 18.5, innerMin: 8, innerClearance: 2 }));
const bothThin = Math.min.apply(null, bothHm.wires);
assert(bothHm.Dmin + 1e-9 >= 10 + bothThin && bothHm.Dmin < 10 + bothThin + bothHm.step,
  "Both limits: bottom row is the first step at guide + clearance + thinnest wire", bothHm.Dmin);
assert(bothHm.Dmax <= 18.5 - bothThin + 1e-9, "Both limits: top row uses max OD minus the thinnest wire");
assert(bothHm.wires.every(function (d) { return d < 18.5 && 10 + d <= 18.5 - d + 1e-9; }),
  "Both limits: only wires that can fit are listed");
const bothGrey = hmCell(bothHm, bothHm.Dmin, bothHm.wires[bothHm.wires.length - 1]);
assert(bothGrey && !bothGrey.geometricOk, "A wire that misses the spring guide on that row is grey");

const noExtra = E.buildHeatmap(Object.assign({}, openLoads, { innerMin: 10, innerClearance: 0 }));
const blankExtra = E.buildHeatmap(Object.assign({}, openLoads, { innerMin: 10 }));
assert(Math.abs(noExtra.Dmin - blankExtra.Dmin) < 1e-9, "Zero guide clearance adds nothing");

console.log("    Heat map D range " + hm.Dmin + "–" + hm.Dmax + " mm in " + hm.diameters.length + " steps");
console.log("    Most options: D = " + hm.bestDiameters.join(", ") + " mm with " + hm.maxViable + " viable wire sizes");

console.log("\n" + passed + " passed, " + failed + " failed");
if (failed) {
  console.log("\nFailures:");
  failures.forEach(function (f) { console.log(f); });
  process.exit(1);
}
console.log("All tests passed.");
