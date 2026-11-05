#!/usr/bin/env node
/**
 * Tests for the load–length graph stations and SVG labels.
 * Run: node tests/test-charts.js
 */
"use strict";

const path = require("path");
const E = require(path.join(__dirname, "..", "js", "engine.js"));
const C = require(path.join(__dirname, "..", "js", "charts.js"));

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

function fakeSvg() {
  const s = { attrs: {}, innerHTML: "" };
  s.setAttribute = function (k, v) { s.attrs[k] = v; };
  return s;
}

console.log("Load–length graph\n");

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

const stations = C.loadGraphStations(ev);
assert(stations.length === 5, "Worked example has five stations (L0, L1, L2, Ln, Lc)");
assert(stations.map(function (s) { return s.id; }).join(",") === "L0,L1,L2,Ln,Lc",
  "Stations are in L0–L1–L2–Ln–Lc order");

const byId = {};
stations.forEach(function (s) { byId[s.id] = s; });

assertClose(byId.L0.F, 0, "L0 is at zero load");
assertClose(byId.L0.travelPct, 0, "L0 compression is 0 % of available travel");
assertClose(byId.L0.tauK, 0, "L0 corrected stress is 0");

assertClose(byId.L1.L, 50, "L1 length");
assertClose(byId.L1.F, 50, "L1 load");
assertClose(byId.L1.travelPct, (100 * 10) / ev.sc, "L1 compression = (L0−L1)/(L0−Lc)");
assertClose(byId.L1.tauK, ev.tauK * 50 / 125, "L1 τk scales with load from τk at Fmax");

assertClose(byId.L2.travelPct, ev.deflPct2, "L2 compression matches engine deflPct2");
assertClose(byId.L2.tauK, ev.tauK2, "L2 τk matches engine τk2");

assertClose(byId.Ln.travelPct, 85, "Ln compression is 85 % of available travel", 1e-6);
assertClose(byId.Lc.travelPct, 100, "Lc compression is 100 % of available travel");
assert(byId.Lc.tauK > byId.Ln.tauK, "Solid-length stress is higher than Ln stress");
assert(byId.Ln.tauK > byId.L2.tauK, "Ln stress is higher than L2 stress");

assertClose(C.travelPercent(ev, ev.L0), 0, "travelPercent at L0");
assertClose(C.travelPercent(ev, ev.Lc), 100, "travelPercent at Lc");
assertClose(C.stressAtLoad(ev, 0), 0, "stressAtLoad at zero");
assertClose(C.stressAtLoad(ev, ev.Fmax), ev.tauK, "stressAtLoad at Fmax");

const svg = fakeSvg();
C.renderLoadGraph(svg, ev);
const html = svg.innerHTML;
assert(!!html && html.length > 200, "Graph renders SVG markup");
assert(svg.attrs.viewBox.indexOf("390") === 0 || /0 0 390 /.test(svg.attrs.viewBox),
  "Graph is laid out for a 390 px phone width", svg.attrs.viewBox);

["L0", "L1", "L2", "Ln", "Lc"].forEach(function (id) {
  assert(html.indexOf(">" + id + "<") !== -1, "Graph includes length tick " + id);
});
assert(html.indexOf("60.0 mm") !== -1 || html.indexOf("60 mm") !== -1, "L0 millimetre value sits on the graph");
assert(html.indexOf("50.0 mm") !== -1 || html.indexOf("50 mm") !== -1, "L1 millimetre value sits on the graph");
assert(html.indexOf("35.0 mm") !== -1 || html.indexOf("35 mm") !== -1, "L2 millimetre value sits on the graph");

assert((html.match(/N\/mm²/g) || []).length >= 4, "Each loaded station shows τk in N/mm²");
assert((html.match(/τk /g) || []).length >= 4, "Horizontal lines are labelled with τk");
assert(html.indexOf(" %") !== -1, "Horizontal lines are labelled with compression %");

const axisY = 336 - 78;
assert(html.indexOf('y="' + (axisY + 13) + '"') !== -1 || html.indexOf("y=\"" + (axisY + 13)) !== -1,
  "First row of length ticks is below the x axis (" + (axisY + 13) + ")");
const belowAxisLabels = (html.match(/y="(27[0-9]|28[0-9]|29[0-9]|3[0-3][0-9])"/g) || []).length;
assert(belowAxisLabels >= 8, "Length names and millimetre values are drawn below the axis",
  "found " + belowAxisLabels + " text y-positions below the axis");

["24.1 %", E.fmt(byId.L1.travelPct, 1) + " %"].forEach(function () { /* placeholder */ });
assert(html.indexOf(E.fmt(byId.L1.travelPct, 1) + " %") !== -1, "L1 compression % is written on its line");
assert(html.indexOf(E.fmt(byId.L2.travelPct, 1) + " %") !== -1, "L2 compression % is written on its line");
assert(html.indexOf(E.fmt(byId.Ln.travelPct, 1) + " %") !== -1, "Ln compression % is written on its line");
assert(html.indexOf("100.0 %") !== -1 || html.indexOf("100 %") !== -1, "Lc compression % is written on its line");

const modeB = E.evaluateDesign(Object.assign({}, example, {
  L1: null, F1: null, L2: 35, F2: 125
}));
const stationsB = C.loadGraphStations(modeB);
assert(stationsB.every(function (s) { return s.id !== "L1"; }), "Mode B without F1 omits the L1 station");
assert(stationsB.some(function (s) { return s.id === "L2"; }), "Mode B still includes L2");

const svgB = fakeSvg();
C.renderLoadGraph(svgB, modeB);
assert(svgB.innerHTML.indexOf(">L1<") === -1, "Graph omits an L1 tick when L1 is unset");
assert(svgB.innerHTML.indexOf(">L0<") !== -1 && svgB.innerHTML.indexOf(">L2<") !== -1,
  "Graph still labels L0 and L2 when L1 is unset");

console.log("\n" + passed + " passed, " + failed + " failed");
if (failed) {
  console.log("\nFailures:");
  failures.forEach(function (f) { console.log(f); });
  process.exit(1);
}
console.log("All chart tests passed.");
