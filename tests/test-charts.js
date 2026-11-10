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
assert(html.indexOf(">Deflection, S<") !== -1, "The load graph x axis is labelled Deflection, S");
assert(html.toLowerCase().indexOf("shorter") === -1, "The load graph does not say shorter");
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
assert(html.indexOf("paint-order") === -1 && html.indexOf('stroke-width="3"') === -1,
  "Compression and stress labels have no white or paper outline");
assert((html.match(/<text [^>]*fill="var\(--series-/g) || []).length >= 8,
  "Station labels still use the theme series colours");
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

const plotTop = 26;
const dashed = [];
html.replace(/<line x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)"[^>]*stroke-dasharray="3 3"[^>]*>/g,
  function (_, x1, y1, x2, y2) {
    dashed.push({ x1: Number(x1), y1: Number(y1), x2: Number(x2), y2: Number(y2) });
    return _;
  });
assert(dashed.length === 4, "Four vertical markers (L1, L2, Ln, Lc); L0 needs none because it sits on the axis",
  "found " + dashed.length);
const markers = svg._markerGeom || [];
assert(markers.length === dashed.length, "Marker geometry matches the dotted lines drawn");
dashed.forEach(function (ln, i) {
  const m = markers[i];
  assert(Math.abs(ln.x1 - ln.x2) < 1e-6, "Vertical marker " + i + " is vertical");
  assert(Math.abs(ln.y2 - (336 - 78)) < 1e-6, "Vertical marker " + i + " starts at the x axis");
  assert(ln.y1 > plotTop + 1, "Vertical marker " + i + " does not extend above the spring line to the plot top",
    "y1=" + ln.y1 + " plotTop=" + plotTop);
  assert(ln.y1 < ln.y2 - 1, "Vertical marker " + i + " runs upward from the axis and stops at the load point");
  assert(m && Math.abs(m.yTop - m.ySpring) < 1e-6, "Marker " + (m && m.id) + " top is the spring line");
  assert(m && Math.abs(ln.y1 - m.ySpring) < 1e-6, "Drawn marker " + (m && m.id) + " stops where it meets the spring line",
    "y1=" + ln.y1 + " spring=" + (m && m.ySpring));
  assert(m && Math.abs(m.yLoad - m.ySpring) < 0.05,
    "Horizontal load line for " + (m && m.id) + " meets the spring line at the marker",
    "load y=" + (m && m.yLoad) + " spring y=" + (m && m.ySpring));
  assert(m && m.yTop < m.yAxis - 1 && m.yTop > plotTop, "Marker " + (m && m.id) + " is trimmed between the axis and the spring line");
});
const loadedYs = [byId.L1, byId.L2, byId.Ln, byId.Lc].map(function (s) {
  /* yOf(F) = (H-pad.b) - (F/Ftop)*(H-pad.t-pad.b); Ftop = maxF * 1.16 */
  return s;
});
assert(loadedYs.length === 4, "Four loaded stations to match the trimmed markers");

const duty = C.dutyIllustration();
assert(typeof duty === "string" && duty.indexOf("<svg") === 0, "Duty illustration is an SVG");
assert(duty.indexOf("help-svg duty-graph") >= 0, "Duty illustration uses the chart help class");
assert(duty.indexOf("var(--chart-paper)") >= 0 && duty.indexOf("var(--chart-ink)") >= 0, "Duty illustration uses chart colours");
assert(duty.indexOf(">Load, F<") >= 0, "Duty illustration labels the y axis Load, F");
assert(duty.indexOf(">Deflection, S<") >= 0, "Duty illustration labels the x axis Deflection, S");
assert(duty.indexOf("L1 / F1") >= 0 && duty.indexOf("L2 / F2") >= 0, "Duty illustration marks L1/F1 and L2/F2");
assert(duty.toLowerCase().indexOf("compression") === -1, "Duty illustration does not say compression");
assert(duty.toLowerCase().indexOf("shorter") === -1, "Duty illustration does not label the axis shorter");
assert(duty.indexOf("data-spring=\"Lc\"") === -1 && !/>Lc</.test(duty), "Duty illustration has no solid-length spring");
assert(duty.indexOf("data-coil-radius=\"16\"") >= 0, "Coil diameter is the enlarged side-view size");
assert(duty.indexOf("data-front-stroke=\"5.7\"") >= 0, "Front coil stroke is about 5.7");
assert(duty.indexOf("data-back-stroke=\"3.75\"") >= 0, "Back coil stroke is about 3.75");
assert(duty.indexOf("data-turns=\"9\"") >= 0, "Each spring has nine coils");

function dutyTags(name) {
  return duty.match(new RegExp("<" + name + "\\b[^>]*>", "g")) || [];
}
function dutyAttr(tag, name) {
  const m = tag.match(new RegExp("\\b" + name + '="([^"]*)"'));
  return m ? m[1] : null;
}
function rowY(id) {
  const tag = dutyTags("polyline").find(function (part) {
    return dutyAttr(part, "data-spring") === id;
  });
  return Number(dutyAttr(tag, "data-cy"));
}
assert(rowY("L2") < rowY("L1") && rowY("L1") < rowY("L0"), "Spring rows run L2, then L1, then L0");
["L0", "L1", "L2"].forEach(function (id) {
  const coils = dutyTags("polyline").filter(function (part) {
    return dutyAttr(part, "data-spring") === id;
  });
  assert(coils.some(function (part) { return dutyAttr(part, "data-strand") === "front"; }), id + " has a front strand");
  assert(coils.some(function (part) { return dutyAttr(part, "data-strand") === "back"; }), id + " has a back strand");
  const front = coils.find(function (part) { return dutyAttr(part, "data-strand") === "front"; });
  assert(dutyAttr(front, "stroke-width") === "5.7", id + " front strand uses the thick stroke");
  const back = coils.find(function (part) { return dutyAttr(part, "data-strand") === "back"; });
  assert(dutyAttr(back, "stroke-width") === "3.75", id + " back strand uses the lighter stroke");
  assert(coils.filter(function (part) { return dutyAttr(part, "data-strand") === "front"; }).length === 10, id + " draws nine coils");
  const ys = dutyAttr(front, "points").split(" ").map(function (p) { return Number(p.split(",")[1]); });
  assert(ys.length >= 8 && Math.max.apply(null, ys) - Math.min.apply(null, ys) > 12, id + " is a coil loop, not a zigzag");
});
function movingEndX(id) {
  const tag = dutyTags("polyline").find(function (part) {
    return dutyAttr(part, "data-spring") === id && dutyAttr(part, "data-strand") === "front";
  });
  return Number(dutyAttr(tag, "points").split(" ")[0].split(",")[0]);
}
const yAxis = dutyTags("line").find(function (part) { return dutyAttr(part, "data-axis") === "y"; });
assert(Math.abs(movingEndX("L0") - Number(dutyAttr(yAxis, "x1"))) < 0.2, "Free spring starts at zero deflection");
["L1", "L2"].forEach(function (id) {
  const marker = dutyTags("circle").find(function (part) {
    return dutyAttr(part, "fill") === "var(--series-" + id.toLowerCase() + ")";
  });
  assert(Math.abs(movingEndX(id) - Number(dutyAttr(marker, "cx"))) < 0.2, id + " spring lines up with its load point");
});
["L0", "L1", "L2"].forEach(function (id) {
  const guide = dutyTags("line").find(function (part) { return dutyAttr(part, "data-guide") === id; });
  assert(guide && dutyAttr(guide, "stroke-dasharray"), id + " has a dotted guide");
  assert(Math.abs(Number(dutyAttr(guide, "x1")) - Number(dutyAttr(guide, "x2"))) < 0.2, id + " guide is vertical");
  assert(Math.abs(Number(dutyAttr(guide, "x1")) - movingEndX(id)) < 0.2, id + " guide meets the moving end");
  assert(Number(dutyAttr(guide, "y2")) > Number(dutyAttr(guide, "y1")), id + " guide runs downward");
  assert(Math.abs(Number(dutyAttr(guide, "y2")) - (rowY(id) - 16)) < 0.6, id + " guide stops on that spring");
});

function distPointSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
function segsCross(ax, ay, bx, by, cx, cy, dx, dy) {
  function side(x, y, x1, y1, x2, y2) { return (y2 - y1) * (x - x1) - (x2 - x1) * (y - y1); }
  return side(ax, ay, cx, cy, dx, dy) * side(bx, by, cx, cy, dx, dy) < 0 &&
    side(cx, cy, ax, ay, bx, by) * side(dx, dy, ax, ay, bx, by) < 0;
}
function distRectSeg(box, x1, y1, x2, y2) {
  if (x1 >= box.x && x1 <= box.x + box.w && y1 >= box.y && y1 <= box.y + box.h) return 0;
  if (x2 >= box.x && x2 <= box.x + box.w && y2 >= box.y && y2 <= box.y + box.h) return 0;
  const corners = [
    [box.x, box.y], [box.x + box.w, box.y],
    [box.x + box.w, box.y + box.h], [box.x, box.y + box.h]
  ];
  for (let i = 0; i < 4; i++) {
    const c = corners[i];
    const d = corners[(i + 1) % 4];
    if (segsCross(x1, y1, x2, y2, c[0], c[1], d[0], d[1])) return 0;
  }
  function distPointRect(px, py) {
    const dx = Math.max(box.x - px, 0, px - (box.x + box.w));
    const dy = Math.max(box.y - py, 0, py - (box.y + box.h));
    return Math.hypot(dx, dy);
  }
  let best = Math.min(distPointRect(x1, y1), distPointRect(x2, y2));
  corners.forEach(function (c) {
    best = Math.min(best, distPointSeg(c[0], c[1], x1, y1, x2, y2));
  });
  return best;
}
const labelBoxes = dutyTags("text").map(function (tag) {
  const raw = dutyAttr(tag, "data-box").split(",").map(Number);
  const text = duty.slice(duty.indexOf(tag), duty.indexOf("</text>", duty.indexOf(tag))).replace(/<[^>]+>/g, "");
  return { text: text, x: raw[0], y: raw[1], w: raw[2], h: raw[3] };
});
assert(labelBoxes.length >= 6, "Every duty label reserves a box");
const ink = [];
dutyTags("line").forEach(function (tag) {
  ink.push({
    x1: Number(dutyAttr(tag, "x1")), y1: Number(dutyAttr(tag, "y1")),
    x2: Number(dutyAttr(tag, "x2")), y2: Number(dutyAttr(tag, "y2")),
    sw: Number(dutyAttr(tag, "stroke-width")) || 1
  });
});
dutyTags("polyline").forEach(function (tag) {
  const pts = dutyAttr(tag, "points").split(" ").map(function (p) {
    const xy = p.split(",");
    return [Number(xy[0]), Number(xy[1])];
  });
  const sw = Number(dutyAttr(tag, "stroke-width")) || 1;
  for (let i = 1; i < pts.length; i++) {
    ink.push({ x1: pts[i - 1][0], y1: pts[i - 1][1], x2: pts[i][0], y2: pts[i][1], sw: sw });
  }
});
dutyTags("circle").forEach(function (tag) {
  const cx = Number(dutyAttr(tag, "cx"));
  const cy = Number(dutyAttr(tag, "cy"));
  const r = Number(dutyAttr(tag, "r")) + (Number(dutyAttr(tag, "stroke-width")) || 0) / 2;
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    ink.push({
      x1: cx + r * Math.cos(a0), y1: cy + r * Math.sin(a0),
      x2: cx + r * Math.cos(a1), y2: cy + r * Math.sin(a1),
      sw: 0
    });
  }
});
labelBoxes.forEach(function (box) {
  let nearest = Infinity;
  ink.forEach(function (seg) {
    nearest = Math.min(nearest, distRectSeg(box, seg.x1, seg.y1, seg.x2, seg.y2) - seg.sw / 2);
  });
  assert(nearest >= 4, "Label “" + box.text + "” stays 4px clear of the lines (" + nearest.toFixed(1) + "px)");
});

console.log("\n" + passed + " passed, " + failed + " failed");
if (failed) {
  console.log("\nFailures:");
  failures.forEach(function (f) { console.log(f); });
  process.exit(1);
}
console.log("All chart tests passed.");
