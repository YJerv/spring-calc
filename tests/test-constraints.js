#!/usr/bin/env node
/**
 * SC-005 outer and inner limits. Run: node tests/test-constraints.js
 */
"use strict";

const path = require("path");
const E = require(path.join(__dirname, "..", "js", "engine.js"));

let passed = 0;
let failed = 0;
const failures = [];

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

const duty = {
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
  ends: "closed_ground",
  useIndicativeRm: false,
  wires: [1.6, 2, 2.5]
};

function search(extra) {
  return E.assessFeasibility(Object.assign({}, duty, extra), { steps: 6 });
}

console.log("Either, both, neither\n");

assert(E.constraintConflict(20, null) === null, "Outer only is not a conflict");
assert(E.constraintConflict(null, 10) === null, "Inner only is not a conflict");
assert(E.constraintConflict(null, null) === null, "Neither limit is not a conflict");
assert(E.constraintConflict(20, 20).indexOf("not smaller than the pocket") >= 0,
  "A rod equal to the pocket is a conflict");
assert(E.constraintConflict(20, 21).indexOf("not smaller than the pocket") >= 0,
  "A rod larger than the pocket is a conflict");
assert(E.constraintConflict(20, 12) === null, "A rod smaller than the pocket is allowed");

const outerOnly = search({ DeMax: 18.5, pocket: 20, innerMin: null });
assert(outerOnly.ready && outerOnly.passing > 0, "Outer limit only still finds the worked example", "passing " + outerOnly.passing);
assert(outerOnly.passing === search({ DeMax: 18.5, pocket: 20 }).passing,
  "A blank inner limit does not remove candidates that fit the pocket");

const known = E.evaluateDesign(Object.assign({ d: 2, D: 16.5, DeMax: 18.5 }, duty));
assert(known.pass && known.Di > 10, "Worked example inside diameter is above 10 mm", known.Di);
const tooTight = E.evaluateDesign(Object.assign({ d: 2, D: 16.5, DeMax: 18.5, innerMin: known.Di + 1 }, duty));
assert(!tooTight.pass && tooTight.reasons.some(function (r) {
  return r.indexOf("Inside diameter is below") === 0;
}), "A rod larger than Di rejects that candidate");
const fitsRod = E.evaluateDesign(Object.assign({ d: 2, D: 16.5, DeMax: 18.5, innerMin: known.Di - 0.1 }, duty));
assert(fitsRod.pass, "A rod smaller than Di does not reject that candidate");

const both = search({ DeMax: 18.5, pocket: 20, innerMin: 12 });
assert(both.ready && both.passing > 0, "Both limits can still leave a passing candidate");
const rodTooLarge = E.listWires(Object.assign({}, duty, { DeMax: 18.5, innerMin: known.Di + 1, wires: [2] }));
assert(rodTooLarge.length === 1 && !rodTooLarge[0].pass, "The wire list rejects a rod larger than Di at the pocket-limited diameter");
const rodFits = E.listWires(Object.assign({}, duty, { DeMax: 18.5, innerMin: 10, wires: [2] }));
assert(rodFits.length === 1 && rodFits[0].pass && rodFits[0].Di + 1e-9 >= 10,
  "The wire list keeps a wire whose inside diameter meets the rod");

const neither = search({ DeMax: null, pocket: null, innerMin: null });
assert(neither.ready && neither.passing > 0, "Neither limit still searches within the existing index range");
assert(!neither.hardFailures.some(function (item) {
  return item.reason.indexOf("optimal") >= 0;
}), "A blank outer limit does not invent an optimal diameter");
const atIndex = E.listWires(Object.assign({}, duty, { DeMax: null, wires: [2] }));
assert(atIndex.length === 1 && Math.abs(atIndex[0].D - 32) < 1e-6,
  "With no pocket, the wire is tried at the existing index maximum D = 16d", atIndex[0] && atIndex[0].D);

const conflict = search({ DeMax: 18.5, pocket: 20, innerMin: 20 });
assert(conflict.ready === false && conflict.blocked === "conflict" && conflict.passing === 0,
  "Rod greater than or equal to the pocket does not run a search");
assert(conflict.suggestions.length === 0, "A conflict does not suggest a new diameter");

const innerOnly = search({ DeMax: null, pocket: null, innerMin: 12 });
assert(innerOnly.ready && innerOnly.passing > 0, "An inner limit alone can pass");
const innerWire = E.listWires(Object.assign({}, duty, { DeMax: null, innerMin: 20, wires: [2] }));
assert(innerWire.length === 1 && innerWire[0].Di + 1e-9 >= 20,
  "With no pocket, the chosen diameter still meets the rod", innerWire[0] && innerWire[0].Di);

console.log("\n" + passed + " passed, " + failed + " failed");
if (failed) {
  console.log("\nFailures:");
  failures.forEach(function (f) { console.log(f); });
  process.exit(1);
}
console.log("All constraint tests passed.");
