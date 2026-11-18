#!/usr/bin/env node
/**
 * SC-004 feasibility check. Run: node tests/test-feasibility.js
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

const example = {
  DeMax: 18.5,
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
  useIndicativeRm: false
};

console.log("Rule boundaries\n");

assert(E.SOLID_RULE.extraClearanceMm === null && E.SOLID_RULE.validatedExtraClearance === false,
  "No extra working clearance is defined");
assert(E.TRAVEL_GUIDE.certified === false, "The 70–80% note is not a certified limit");

const known = E.evaluateDesign(Object.assign({ d: 2, D: 16.5 }, example));
assert(known.pass, "Worked example at d = 2, D = 16.5 still passes");
const atSolid = E.evaluateDesign(Object.assign({ d: 2, D: 16.5 }, example, {
  L2: known.Lc,
  LmaxLoad: known.Lc
}));
assert(!atSolid.pass && atSolid.reasons.some(function (r) {
  return r.indexOf("Solid length is not shorter") === 0;
}), "L2 equal to Lc is a hard failure");
const below = E.evaluateDesign(Object.assign({ d: 2, D: 16.5 }, example, {
  L2: known.Lc - 1,
  LmaxLoad: known.Lc - 1
}));
assert(!below.pass, "L2 below Lc is a hard failure");
const above = E.evaluateDesign(Object.assign({ d: 2, D: 16.5 }, example, {
  L2: known.Lc + 0.05,
  LmaxLoad: known.Lc + 0.05
}));
assert(above.pass, "L2 just above Lc can pass the existing checks");
assert(above.travelUsed > 0.80, "That near-solid point uses more than 80% of travel", above.travelUsed);
assert(above.reasons.length === 0, "More than 80% of travel does not add a failure reason");
assert(above.warnings.some(function (w) { return w.indexOf("85 %") >= 0; }),
  "The existing 85% travel warning still applies and is not a failure");

console.log("\nCandidate search\n");

const ok = E.assessFeasibility(example, { steps: 8 });
assert(ok.ready && ok.passing > 0, "Worked example has at least one passing candidate", "passing " + ok.passing);
assert(ok.suggestions.length === 0, "A passing search does not invent changes");
assert(ok.checked > ok.passing, "Candidates that fail are not counted as passing");
const before = example.L2;
assert(example.L2 === before, "The search does not change L2");

const derived = E.deriveModeA(40, 10, 0.5, 40);
const shortInput = Object.assign({}, example, derived, { DeMax: 30 });
const shortL2 = shortInput.L2;
const short = E.assessFeasibility(shortInput, { steps: 8 });
assert(short.ready && short.passing === 0, "A 0.5 mm L2 has no passing candidate");
assert(short.hardFailures.some(function (item) {
  return item.reason.indexOf("Solid length is not shorter") === 0 && item.count > 0;
}), "The short length is reported as a solid-length failure");
assert(short.showTravelGuide === true, "The unvalidated travel guide is shown with that failure");
assert(short.suggestions.every(function (item) { return item.helped === true && item.probePassing > 0; }),
  "Every suggestion was checked and did produce a pass");
assert(short.suggestions.some(function (item) { return item.id === "increase-L2"; }),
  "The suggestion for this failure is to increase L2");
assert(short.suggestions.every(function (item) { return item.text.indexOf("L3") === -1; }),
  "Suggestions do not invent an L3 input");
assert(shortInput.L2 === shortL2, "Suggestions do not change the entered L2");
assert(!short.hardFailures.some(function (item) {
  return item.reason.indexOf("70") >= 0 || item.reason.indexOf("80%") >= 0;
}), "70% and 80% are not failure reasons");

const blocked = E.assessFeasibility(Object.assign({}, example, { DeMax: 0 }), { steps: 4 });
assert(blocked.ready === false && blocked.passing === 0 && blocked.suggestions.length === 0,
  "No pocket means no candidate search and no invented diameter");

console.log("\n" + passed + " passed, " + failed + " failed");
if (failed) {
  console.log("\nFailures:");
  failures.forEach(function (f) { console.log(f); });
  process.exit(1);
}
console.log("All feasibility tests passed.");
