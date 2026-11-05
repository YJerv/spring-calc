#!/usr/bin/env node
/**
 * BS EN 15800 tolerance tests for quality grades 1, 2 and 3.
 * Run: node tests/test-en15800.js
 */
"use strict";

const path = require("path");
const E = require(path.join(__dirname, "..", "js", "engine.js"));
const EN = require(path.join(__dirname, "..", "js", "en15800.js"));

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
  assert(almostEqual(actual, expected, tol), name, "expected " + expected + " got " + actual);
}

console.log("EN 15800 quality grades\n");

assertClose(EN.qualityFactor(1), 0.63, "Grade 1 quality factor Q = 0.63");
assertClose(EN.qualityFactor(2), 1, "Grade 2 quality factor Q = 1");
assertClose(EN.qualityFactor(3), 1.6, "Grade 3 quality factor Q = 1.60");
assert(EN.qualityFactor(4) == null, "Unknown grade has no Q");

console.log("\nkf (Annex A.1) against published checks");
function kfExpected(n) {
  return -1 / (3 * n * n) + 8 / (5 * n) + 0.803;
}
assertClose(EN.coilFactorKf(2), 1.52, "kf at n = 2 matches the published A.1 value 1.520", 1e-3);
assertClose(EN.coilFactorKf(2), kfExpected(2), "kf at n = 2 is −1/(3n²) + 8/(5n) + 0.803");
assertClose(EN.coilFactorKf(5), kfExpected(5), "kf at n = 5");
assertClose(EN.coilFactorKf(10), 0.96, "kf at n = 10 matches the published A.1 value 0.960", 1e-3);
assertClose(EN.coilFactorKf(100), 0.819, "kf at n = 100 matches the published A.1 value 0.819", 1e-3);
assert(EN.coilFactorKf(2) > EN.coilFactorKf(10), "kf falls as the active-coil count rises");
assert(EN.coilFactorKf(10) > EN.coilFactorKf(100), "kf keeps falling towards the asymptote");

console.log("\naF (Annex A.2, transcribed) and force / length tolerances");
const d = 5;
const D = 20;
const w = D / d;
const x = w / 10;
const poly = -0.84 * x * x * x + 3.781 * x * x - 4.244 * x + 2.274;
const aFExpected = 65.92 * Math.pow(d, 3.3) / Math.pow(D, 1.6) * poly;
assertClose(EN.geometryFactorAf(d, D), aFExpected, "aF at d = 5 mm, D = 20 mm follows the cubic in w/10");
assert(EN.geometryFactorAf(d, D) > 100 && EN.geometryFactorAf(d, D) < 140,
  "aF at d = 5, w = 4 is near the published DIN 2095 diagram reading of 120 N",
  "got " + EN.geometryFactorAf(d, D));
[4, 8, 12, 16, 20].forEach(function (index) {
  const a = EN.geometryFactorAf(5, 5 * index);
  assert(a > 0, "aF stays positive at w = " + index, "got " + a);
});

const example = E.evaluateDesign({
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
});

const aF = EN.geometryFactorAf(example.d, example.D);
const kf = EN.coilFactorKf(example.n);
[1, 2, 3].forEach(function (grade) {
  const Q = EN.qualityFactor(grade);
  const tol = EN.assess(example, grade);
  assert(tol.grade === grade && tol.Q === Q, "Assess grade " + grade);
  assert(tol.twoLoads && tol.L0ReferenceOnly, "Grade " + grade + ": two loads make L0 reference only");
  assert(tol.inScope, "Worked example is inside the EN 15800 scope at grade " + grade);
  assert(tol.endsClosedGround && tol.squareness, "Grade " + grade + " reports squareness for closed and ground ends");
  const f2 = tol.loads.filter(function (item) { return item.id === "F2"; })[0];
  const expectedAF = Math.abs((aF * kf + 1.5 * 125 / 100) * Q);
  assertClose(f2.AF, expectedAF, "Grade " + grade + " force tolerance AF at F2 = (aF·kf + 1.5 F/100)·Q");
  assertClose(tol.AL0, Math.abs(aF * kf * Q / example.R), "Grade " + grade + " free-length tolerance AL0 = aF·kf·Q/R");
  assert(tol.fn && tol.fn.AF > 0, "Grade " + grade + " also evaluates AF at the recommended Fn");
});

const g1 = EN.assess(example, 1);
const g2 = EN.assess(example, 2);
const g3 = EN.assess(example, 3);
const afOf = function (tol) {
  return tol.loads.filter(function (item) { return item.id === "F2"; })[0].AF;
};
assertClose(afOf(g1), 0.63 * afOf(g2), "Grade 1 force tolerance is 0.63 times grade 2");
assertClose(afOf(g3), 1.6 * afOf(g2), "Grade 3 force tolerance is 1.60 times grade 2");
assertClose(g1.AL0, 0.63 * g2.AL0, "Grade 1 length tolerance scales with Q");
assertClose(g3.AL0, 1.6 * g2.AL0, "Grade 3 length tolerance scales with Q");

console.log("\nSquareness and parallelism (Table 5)");
assertClose(g1.squareness.e1, 0.03 * example.L0, "Grade 1 squareness e1 = 0.03 L0");
assertClose(g2.squareness.e1, 0.05 * example.L0, "Grade 2 squareness e1 = 0.05 L0");
assertClose(g3.squareness.e1, 0.08 * example.L0, "Grade 3 squareness e1 = 0.08 L0");
assertClose(g1.squareness.e2, 0.015 * example.De, "Grade 1 parallelism e2 = 0.015 De");
assertClose(g2.squareness.e2, 0.03 * example.De, "Grade 2 parallelism e2 = 0.03 De");
assertClose(g3.squareness.e2, 0.06 * example.De, "Grade 3 parallelism e2 = 0.06 De");

const openEnds = Object.assign({}, example, { ends: "closed" });
const openTol = EN.assess(openEnds, 2);
assert(!openTol.endsClosedGround && openTol.squareness == null,
  "Squareness and parallelism are not applied unless the ends are closed and ground");

console.log("\nCoil-diameter table (Table 3), not a single Q factor");
assert(EN.diameterBandIndex(0.63) === 0, "D = 0.63 mm is the first band");
assert(EN.diameterBandIndex(1) === 0, "D = 1 mm is still the first band (up to 1)");
assert(EN.diameterBandIndex(1.01) === 1, "D just above 1 mm is the next band");
assert(EN.diameterBandIndex(16) === 6, "D = 16 mm closes the band up to 16");
assert(EN.diameterBandIndex(16.5) === 7, "D = 16.5 mm is the band above 16 up to 25");
assert(EN.diameterBandIndex(200) === 16, "D = 200 mm is the last band");
assert(EN.diameterBandIndex(200.1) === -1, "D above 200 mm is outside Table 3");
assert(EN.indexBand(4) === 0 && EN.indexBand(8) === 0, "Index band 4 to 8 includes w = 8");
assert(EN.indexBand(8.01) === 1 && EN.indexBand(14) === 1, "Index band above 8 to 14 includes w = 14");
assert(EN.indexBand(14.01) === 2 && EN.indexBand(20) === 2, "Index band above 14 to 20 includes w = 20");
assert(EN.indexBand(3) === -1 && EN.indexBand(21) === -1, "Index outside 4 to 20 has no table column");

assertClose(EN.coilDiameterTolerance(0.63, 4, 1), 0.05, "Grade 1, smallest coil, w = 4: AD = 0.05 mm");
assertClose(EN.coilDiameterTolerance(0.63, 4, 2), 0.07, "Grade 2, smallest coil, w = 4: AD = 0.07 mm");
assertClose(EN.coilDiameterTolerance(16, 8, 2), 0.30, "Grade 2, D = 16 mm, w = 8: AD = 0.30 mm");
assertClose(EN.coilDiameterTolerance(20, 8, 2), 0.35, "Grade 2, D = 20 mm, w = 8: AD = 0.35 mm");
assertClose(EN.coilDiameterTolerance(20, 8.01, 2), 0.45, "Grade 2, D = 20 mm, w just over 8: AD = 0.45 mm");
assertClose(EN.coilDiameterTolerance(20, 20, 2), 0.50, "Grade 2, D = 20 mm, w = 20: AD = 0.50 mm");
assertClose(EN.coilDiameterTolerance(example.D, example.w, 1), 0.25, "Worked example grade 1 AD");
assertClose(EN.coilDiameterTolerance(example.D, example.w, 2), 0.45, "Worked example grade 2 AD");
assertClose(EN.coilDiameterTolerance(example.D, example.w, 3), 0.90, "Worked example grade 3 AD");
assertClose(EN.coilDiameterTolerance(200, 20, 1), 1.7, "Grade 1, D = 200 mm, w = 20");
assertClose(EN.coilDiameterTolerance(200, 20, 3), 6.6, "Grade 3, D = 200 mm, w = 20");
assert(EN.coilDiameterTolerance(example.D, example.w, 1) !== g2.AD * 0.63,
  "Diameter tolerance is the Table 3 value, not Q times the grade 2 figure");
[1, 2, 3].forEach(function (grade) {
  assert(g1.AD < g2.AD && g2.AD < g3.AD, "On the worked example, grade " + grade + " ordering is fine");
});
assert(g1.AD < g2.AD && g2.AD < g3.AD, "Worked-example AD gets wider from grade 1 to 3");

console.log("\nNormative scope");
assert(EN.scopeIssues(example).length === 0, "Worked example raises no scope warning");
function issuesOf(over) {
  return EN.scopeIssues(Object.assign({ d: 2, D: 16, L0: 60, n: 5, w: 8 }, over)).join(" | ");
}
assert(issuesOf({ d: 0.05 }).indexOf("Wire diameter") >= 0, "d below 0.07 mm is outside scope");
assert(issuesOf({ d: 17 }).indexOf("Wire diameter") >= 0, "d above 16 mm is outside scope");
assert(issuesOf({ D: 0.5 }).indexOf("Mean coil diameter") >= 0, "D below 0.63 mm is outside scope");
assert(issuesOf({ D: 210 }).indexOf("Mean coil diameter") >= 0, "D above 200 mm is outside scope");
assert(issuesOf({ L0: 631 }).indexOf("Free length") >= 0, "L0 above 630 mm is outside scope");
assert(issuesOf({ n: 1.5 }).indexOf("Active coils") >= 0, "n below 2 is outside scope");
assert(issuesOf({ w: 3 }).indexOf("Spring index") >= 0, "w below 4 is outside scope");
assert(issuesOf({ w: 21 }).indexOf("Spring index") >= 0, "w above 20 is outside scope");

const outside = EN.assess(Object.assign({}, example, { d: 20, D: 20, w: 1, L0: 700, n: 1 }), 2);
assert(!outside.inScope && outside.notes.length >= 3, "A design outside several limits collects scope warnings");
assert(outside.AD == null, "AD is withheld when D, w or the grade has no Table 3 cell");

const grade1Tight = EN.assess(Object.assign({}, example, { w: 13, L0: 100, D: 10 }), 1);
assert(grade1Tight.notes.some(function (n) { return n.indexOf("spring index w is 12") >= 0; }),
  "Grade 1 warns when w is above 12");
assert(grade1Tight.notes.some(function (n) { return n.indexOf("slenderness") >= 0; }),
  "Grade 1 warns when L0/D is above 5");
assert(EN.assess(example, 2).notes.every(function (n) { return n.indexOf("grade 1") === -1; }),
  "Grade 2 does not carry the grade 1 achievability notes");

assert(EN.VERIFICATION.AD === "transcribed" && EN.VERIFICATION.aF === "transcribed",
  "AD table and aF coefficients are flagged as transcribed, not fully re-verified");
assert(EN.VERIFICATION.kf === "verified" && EN.VERIFICATION.Q === "verified",
  "Q and kf are flagged as checked against published clause values");
assert(g2.verificationNote.indexOf("not re-read") >= 0, "The user-facing note says the table was not re-read from a licensed PDF");

const oneLoad = E.evaluateDesign(Object.assign({}, example, { L1: null, F1: null }));
const one = EN.assess(oneLoad, 2);
assert(!one.twoLoads && !one.L0ReferenceOnly, "A single specified load does not force L0 to reference-only");
assert(one.loads.length === 1 && one.loads[0].id === "F2", "Single-load design tolerances the specified force");

console.log("\n" + passed + " passed, " + failed + " failed");
if (failed) {
  console.log("\nFailures:");
  failures.forEach(function (f) { console.log(f); });
  process.exit(1);
}
console.log("All EN 15800 tests passed.");
