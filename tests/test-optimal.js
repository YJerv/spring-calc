#!/usr/bin/env node
/**
 * SC-011 blank pocket. The objective and search limits are not agreed,
 * so Calculate must not invent a diameter. Run: node tests/test-optimal.js
 */
"use strict";

const fs = require("fs");
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

function noNumber(proposal) {
  return proposal
    && proposal.proposed === false
    && proposal.proposedDiameter == null
    && proposal.objective === "lowest stress"
    && proposal.searchLimitsAgreed === true
    && proposal.implemented === false
    && !/\d/.test(proposal.statement);
}

console.log("Blank pocket does not choose a diameter\n");

assert(E.DIAMETER_PROPOSAL.implemented === false, "A blank pocket still does not fill a diameter in");
assert(E.DIAMETER_PROPOSAL.objective === "lowest stress", "The optimisation objective is lowest stress");
assert(E.DIAMETER_PROPOSAL.searchLimitsAgreed === true, "The search uses the existing index limits");
assert(E.DIAMETER_PROPOSAL.statement.indexOf("lowest stress") >= 0, "The statement names lowest stress");
assert(!/\d/.test(E.DIAMETER_PROPOSAL.statement), "The blank-pocket statement contains no diameter");

const blank = search({ DeMax: null, pocket: null, innerMin: null });
assert(blank.ready && blank.passing > 0, "A blank pocket still runs the existing search");
assert(noNumber(blank.diameterProposal), "A blank pocket proposes no diameter and no numeric limit");
assert(!blank.suggestions.some(function (item) {
  return /optimal|proposed diameter/i.test(item.text);
}), "Suggestions do not invent a proposed diameter");

const inner = search({ DeMax: null, pocket: null, innerMin: 12 });
assert(inner.ready && inner.passing > 0 && noNumber(inner.diameterProposal), "An inner limit does not create a proposed outside diameter");
const innerRows = E.listWires(Object.assign({}, duty, { DeMax: null, innerMin: 12 }));
assert(innerRows.every(function (row) { return !row.pass || row.Di + 1e-9 >= 12; }),
  "Passing wires still meet the inner limit when the pocket is blank");

const outer = search({ DeMax: 18.5, pocket: 20, innerMin: null });
assert(outer.ready && outer.passing > 0 && outer.diameterProposal == null,
  "A pocket that is filled in is not replaced by a proposal");

const both = search({ DeMax: 18.5, pocket: 20, innerMin: 12 });
assert(both.diameterProposal == null, "Both limits set means there is nothing to propose");

const conflict = search({ DeMax: 18.5, pocket: 20, innerMin: 20 });
assert(conflict.ready === false && conflict.diameterProposal == null,
  "A conflict is not turned into a proposed diameter");

const missing = E.assessFeasibility(Object.assign({}, duty, { DeMax: null, G: 0 }), { steps: 4 });
assert(missing.ready === false && noNumber(missing.diameterProposal),
  "A blank pocket still proposes nothing when the search cannot run");

const atIndex = E.listWires(Object.assign({}, duty, { DeMax: null, wires: [2] }));
assert(atIndex.length === 1 && Math.abs(atIndex[0].D - 32) < 1e-6,
  "The existing wire check stays at D = 16d and is not relabelled as optimal");

console.log("\nThe page does not fill the pocket in\n");

const app = fs.readFileSync(path.join(__dirname, "..", "js", "app.js"), "utf8");
const render = app.slice(app.indexOf("function renderFeasibility"), app.indexOf("function markFeasibilityStale"));
assert(render.indexOf("diameterProposal") >= 0, "Calculate shows the blank-pocket statement");
assert(render.indexOf("setVal(\"pocket\"") === -1, "Showing the statement does not write the pocket");
assert(app.indexOf("proposedDiameter") === -1, "The page has no chosen diameter to apply");

console.log("\n" + passed + " passed, " + failed + " failed");
if (failed) {
  console.log("\nFailures:");
  failures.forEach(function (f) { console.log(f); });
  process.exit(1);
}
console.log("All optimal-diameter checks passed.");
