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

console.log("\n" + passed + " passed, " + failed + " failed");
if (failed) {
  console.log("\nFailures:");
  failures.forEach(function (f) { console.log(f); });
  process.exit(1);
}
console.log("All tests passed.");
