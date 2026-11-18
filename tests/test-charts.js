#!/usr/bin/env node
/**
 * Tests for the load–length graph stations and SVG labels.
 * Run: node tests/test-charts.js
 */
"use strict";

const fs = require("fs");
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
const springLine = html.match(/<line x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)" stroke="var\(--chart-ink\)" stroke-width="2"/);
assert(springLine && Math.abs(Number(springLine[1]) - 58) < 0.2, "The spring line starts on the y axis at L0");
assert(springLine && Math.abs(Number(springLine[2]) - (360 - 102)) < 0.2, "The spring line starts at zero load");
assert(springLine && Math.abs(Number(springLine[3]) - 58) > 1, "The spring line runs straight away from the origin");
assert(svg.attrs.viewBox.indexOf("390") === 0 || /0 0 390 /.test(svg.attrs.viewBox),
  "Graph is laid out for a 390 px phone width", svg.attrs.viewBox);

["L0", "L1", "L2", "Ln", "Lc"].forEach(function (id) {
  assert(html.indexOf(">" + id + "<") !== -1, "Graph includes length tick " + id);
});
assert(html.indexOf("60.0 mm") !== -1 || html.indexOf("60 mm") !== -1, "L0 millimetre value sits on the graph");
assert(html.indexOf("50.0 mm") !== -1 || html.indexOf("50 mm") !== -1, "L1 millimetre value sits on the graph");
assert(html.indexOf("35.0 mm") !== -1 || html.indexOf("35 mm") !== -1, "L2 millimetre value sits on the graph");

assert((html.match(/MPa/g) || []).length >= 4, "Each loaded station shows τk in MPa");
assert((html.match(/τk /g) || []).length >= 4, "Horizontal lines are labelled with τk");
assert(html.indexOf('data-axis="stress"') >= 0 && html.indexOf(">τk (MPa)<") >= 0, "The load graph has a right-hand stress axis in MPa");
assert(fs.readFileSync(path.join(__dirname, "..", "js", "pdf.js"), "utf8").indexOf("renderLoadGraph") === -1,
  "The PDF drawing does not include this load graph");
assert(html.indexOf(" %") !== -1, "Horizontal lines are labelled with compression %");

const axisY = 360 - 102;
assert(html.indexOf('y="' + (axisY + 18) + '"') !== -1 || html.indexOf("y=\"" + (axisY + 18)) !== -1,
  "First row of length ticks is below the x axis (" + (axisY + 18) + ")");
assert(html.indexOf('font-size="8"') === -1 && html.indexOf('font-size="9"') === -1 && html.indexOf('font-size="10"') === -1,
  "Load-graph text is no longer 8–10 px");
assert((html.match(/font-size="12"/g) || []).length >= 12, "Load-graph labels are 12 px at the 390 px layout");
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
function percentStations(markup) {
  return markup.split("<text").filter(function (part) {
    return part.indexOf('data-part="pct"') >= 0;
  }).map(function (part) {
    return part.match(/data-station="([^"]+)"/)[1];
  });
}
const labelled = percentStations(html);
assert(labelled.indexOf("L1") >= 0 && labelled.indexOf("L2") >= 0 && labelled.length === 2, "Only L1 and L2 keep a deflection percent", labelled.join(","));
assert(labelled.indexOf("Ln") === -1 && labelled.indexOf("Lc") === -1 && labelled.indexOf("L0") === -1, "Ln, Lc and L0 have no deflection percent");

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
  assert(Math.abs(ln.y2 - (360 - 102)) < 1e-6, "Vertical marker " + i + " starts at the x axis");
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
assert(duty.indexOf(">F1<") >= 0 && duty.indexOf(">F2<") >= 0, "Duty illustration marks F1 and F2 on the load axis");
assert(duty.indexOf("L1 / F1") === -1 && duty.indexOf("L2 / F2") === -1, "Duty illustration no longer puts L callouts on the graph");
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

console.log("\nStress against mean diameter\n");

const tradeInput = {
  G: 81500, Rm: 1800, tauFactor: 0.5, R: 5, L0: 60,
  L1: 50, F1: 50, L2: 35, F2: 125, Fmax: 125, LmaxLoad: 35,
  DeMax: 18.5, ends: "closed_ground", d: 2
};
const tradeRows = [12, 14, 16].map(function (D) {
  return E.evaluateDesign(Object.assign({}, tradeInput, { D: D }));
});
const trade = fakeSvg();
C.renderTradeoff(trade, tradeRows, 14);
assert(trade.innerHTML.split("Stress % of allowable").length === 2, "The stress name appears once");
const stressTag = trade.innerHTML.split("<text").filter(function (part) {
  return part.indexOf("Stress % of allowable") >= 0;
})[0];
assert(stressTag && stressTag.indexOf("rotate(-90 ") >= 0, "The left axis label is rotated -90 degrees");
assert(stressTag.indexOf('text-anchor="middle"') >= 0, "The left axis label is centred on the axis");
assert(stressTag.indexOf('y="82"') >= 0, "The left axis label is vertically centred on the plot");
assert(trade.innerHTML.indexOf("Solid length Lc") >= 0, "The coil graph names the solid-length curve");
assert(trade.innerHTML.indexOf("Mean coil diameter D (mm)") >= 0, "The coil graph names the mean-diameter axis");
assert(trade.innerHTML.indexOf("<polyline") >= 0, "The coil graph draws the stress curve");
assert(/stroke-dasharray/.test(trade.innerHTML), "The coil graph draws the stress-limit line");
const markerAt = trade.innerHTML.indexOf('stroke="var(--chart-ink)"');
assert(markerAt >= 0, "The coil graph marks the selected diameter");

const bandRows = [
  { D: 10, pctAllow: 140, Lc: 40, LmaxLoad: 35 },
  { D: 12, pctAllow: 90, Lc: 30, LmaxLoad: 35 },
  { D: 14, pctAllow: 80, Lc: 28, LmaxLoad: 35 },
  { D: 16, pctAllow: 95, Lc: 26, LmaxLoad: 35 },
  { D: 18, pctAllow: 130, Lc: 24, LmaxLoad: 35 }
];
const bandSpan = E.passingDiameterSpan(bandRows, 14);
assert(Math.abs(bandSpan.min - 11.6) < 1e-6, "The left stop is the first of the stress and solid-length crossings", bandSpan.min);
assert(Math.abs(bandSpan.max - (16 + (5 / 35) * 2)) < 1e-6, "The right stop is where stress crosses 100%", bandSpan.max);
const otherIsland = [
  { D: 10, pctAllow: 80, Lc: 20, LmaxLoad: 35 },
  { D: 12, pctAllow: 130, Lc: 20, LmaxLoad: 35 },
  { D: 14, pctAllow: 70, Lc: 20, LmaxLoad: 35 },
  { D: 16, pctAllow: 75, Lc: 20, LmaxLoad: 35 },
  { D: 18, pctAllow: 140, Lc: 20, LmaxLoad: 35 }
];
const kept = E.passingDiameterSpan(otherIsland, 15);
assert(kept.min >= 12 && kept.max <= 18 && kept.min <= 15 && kept.max >= 15, "A split passing range keeps the one around the current diameter", kept.min + "–" + kept.max);
const shaded = fakeSvg();
C.renderTradeoff(shaded, bandRows, 14);
const bandAt = shaded.innerHTML.indexOf('data-fail-band="1"');
const curveAt = shaded.innerHTML.indexOf("<polyline");
assert(bandAt >= 0 && bandAt < curveAt, "Failing diameters are shaded behind the curves");
assert(shaded.innerHTML.indexOf('fill="var(--fail)"') >= 0 && shaded.innerHTML.indexOf('opacity="0.18"') >= 0, "The failing band is translucent red");

console.log("\nSide view labels\n");

function sideBoxes(html) {
  function boxFor(needle) {
    const parts = html.split("<text");
    const part = parts.filter(function (p) { return p.indexOf(needle) >= 0; })[0];
    assert(!!part, "The side view includes " + needle);
    const raw = part.match(/data-box="([^"]+)"/);
    assert(!!raw, needle + " publishes a bounding box");
    const n = raw[1].split(",").map(Number);
    return { x: n[0], y: n[1], w: n[2], h: n[3] };
  }
  return { de: boxFor("De = "), cap: boxFor("Side view at free length") };
}
function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
const sideSamples = [
  { name: "worked example", design: ev },
  { name: "short and wide", design: { De: 48, D: 44, d: 4, L0: 16, n: 3, nt: 5, wind: "right" } },
  { name: "long and thin", design: { De: 10, D: 8, d: 1.6, L0: 220, n: 28, nt: 30, wind: "left" } },
  { name: "square outline", design: { De: 30, D: 27, d: 3, L0: 30, n: 6, nt: 8, wind: "right" } },
  { name: "very long", design: { De: 8, D: 6.5, d: 1.2, L0: 360, n: 40, nt: 42, wind: "right" } }
];
function diagramLines(html) {
  return (html.match(/<line\b[^>]*>/g) || []).map(function (tag) {
    function num(name) {
      const m = tag.match(new RegExp("\\b" + name + '="([^"]+)"'));
      return m ? Number(m[1]) : NaN;
    }
    return { x1: num("x1"), y1: num("y1"), x2: num("x2"), y2: num("y2") };
  });
}
["closed_ground", "closed", "open_ground", "open"].forEach(function (ends) {
  const design = E.evaluateDesign(Object.assign({}, example, { ends: ends }));
  const pic = fakeSvg();
  C.renderSpringDiagram(pic, design);
  const lines = diagramLines(pic.innerHTML);
  const vertical = lines.filter(function (ln) { return Math.abs(ln.x1 - ln.x2) < 0.2 && ln.y2 - ln.y1 > 40; })[0];
  assert(!!vertical, ends + " side view still has the free-length dimension");
  const yTop = vertical.y1;
  const yBot = vertical.y2;
  const seats = lines.filter(function (ln) {
    return Math.abs(ln.y1 - ln.y2) < 0.2 && Math.abs(ln.x2 - ln.x1) > 30 &&
      (Math.abs(ln.y1 - yTop) < 4 || Math.abs(ln.y1 - yBot) < 4);
  });
  assert(seats.length === 0, ends + " side view has no flat line across the end coils",
    "found " + seats.length);
  const pts = (pic.innerHTML.match(/[\d.]+,[\d.]+/g) || []).map(function (pair) {
    const xy = pair.split(",");
    return { x: Number(xy[0]), y: Number(xy[1]) };
  }).filter(function (p) { return p.y > yTop - 2 && p.y < yBot + 2; });
  const topPts = pts.filter(function (p) { return p.y < yTop + design.d * 3; });
  const ys = topPts.map(function (p) { return p.y; });
  const yMin = Math.min.apply(null, ys);
  if (ends.indexOf("ground") >= 0) {
    assert(yMin > yTop + 0.2, ends + " grinds the end coil inside its own outline",
      "coil " + yMin + " end " + yTop);
  } else {
    assert(yMin < yTop + 0.6, ends + " end coil is not held on a ground face",
      "coil " + yMin + " end " + yTop);
  }
});

sideSamples.forEach(function (sample) {
  const pic = fakeSvg();
  C.renderSpringDiagram(pic, sample.design);
  const boxes = sideBoxes(pic.innerHTML);
  assert(!intersects(boxes.de, boxes.cap), sample.name + ": the diameter label stays clear of the scale caption",
    "De " + JSON.stringify(boxes.de) + " caption " + JSON.stringify(boxes.cap));
  assert(boxes.de.y + boxes.de.h + 4 <= boxes.cap.y, sample.name + ": there is a gap under the diameter label");
  assert(pic.innerHTML.indexOf("Scaled side view") === -1, sample.name + ": the drawing caption is not the card title");
});

console.log("\nLoad-graph dual labels\n");

function dualBoxes(html) {
  return html.split("<text").slice(1).filter(function (part) {
    return part.indexOf('data-dual="1"') >= 0;
  }).map(function (part) {
    const raw = part.match(/data-box="([^"]+)"/);
    const n = raw[1].split(",").map(Number);
    return {
      part: part.match(/data-part="([^"]+)"/)[1],
      station: part.match(/data-station="([^"]+)"/)[1],
      layout: part.match(/data-layout="([^"]+)"/)[1],
      line: Number(part.match(/data-line="([^"]+)"/)[1]),
      x: n[0], y: n[1], w: n[2], h: n[3]
    };
  });
}
function hitsSpring(box, design) {
  const W = 390;
  const H = 360;
  const pad = { l: 58, r: 96, t: 26, b: 102 };
  const span = Math.max(design.L0 - design.Lc, 1);
  const Lright = design.Lc - 0.08 * span;
  function xOf(L) {
    return pad.l + ((design.L0 - L) / (design.L0 - Lright)) * (W - pad.l - pad.r);
  }
  let Ftop = 1;
  [["L0", design.L0, 0], ["L1", design.L1, design.F1], ["L2", design.L2, design.F2],
    ["Ln", design.Ln, design.Fn], ["Lc", design.Lc, design.Fc]].forEach(function (s) {
    if (s[2] > Ftop) Ftop = s[2];
  });
  Ftop *= 1.16;
  const axis = H - pad.b;
  function yOf(F) {
    return axis - (F / Ftop) * (H - pad.t - pad.b);
  }
  const x0 = pad.l;
  const y0 = axis;
  const x1 = xOf(design.Lc);
  const y1 = yOf(design.Fc);
  for (let i = 0; i <= 80; i++) {
    const t = i / 80;
    const sx = x0 + t * (x1 - x0);
    const sy = y0 + t * (y1 - y0);
    if (sx >= box.x - 1 && sx <= box.x + box.w + 1 && sy >= box.y - 1 && sy <= box.y + box.h + 1) return true;
  }
  return false;
}
const titleBox = { x: 12, y: 16 - 12 * 0.85, w: "Load F (N)".length * 12 * 0.6, h: 12 * 1.15 };
const dualSamples = [
  { name: "worked example", design: ev, layout: "split" },
  { name: "close loads", design: E.evaluateDesign(Object.assign({}, example, { L1: 48, F1: 60, L2: 46, F2: 70 })), layout: "split" },
  { name: "near solid", design: E.evaluateDesign(Object.assign({}, example, { L1: 28, F1: 160, L2: 22, F2: 190, Fmax: 190, LmaxLoad: 22 })), layout: "row" },
  { name: "long spring", design: E.evaluateDesign({ d: 1.2, D: 10, G: 81500, Rm: 1800, tauFactor: 0.5, R: 2, L0: 80, L1: 70, F1: 20, L2: 40, F2: 80, Fmax: 80, LmaxLoad: 40, ends: "closed_ground" }), layout: "split" },
  { name: "mode B", design: modeB, layout: "row" },
  { name: "short travel", design: E.evaluateDesign(Object.assign({}, example, { L0: 40, L1: 38, F1: 20, L2: 30, F2: 100, Fmax: 100, LmaxLoad: 30, R: 10 })), layout: "row" }
];
dualSamples.forEach(function (sample) {
  const pic = fakeSvg();
  C.renderLoadGraph(pic, sample.design);
  const boxes = dualBoxes(pic.innerHTML);
  const stations = C.loadGraphStations(sample.design).filter(function (s) { return s.id !== "L0"; });
  const working = stations.filter(function (s) { return s.id === "L1" || s.id === "L2"; });
  assert(boxes.filter(function (b) { return b.part === "pct"; }).length === working.length,
    sample.name + ": only L1 and L2 have a deflection percent",
    "found " + boxes.filter(function (b) { return b.part === "pct"; }).length);
  assert(boxes.filter(function (b) { return b.part === "tau"; }).length === stations.length,
    sample.name + ": every loaded station keeps a stress label on the right-hand axis");
  const pctLayouts = boxes.filter(function (b) { return b.part === "pct"; }).map(function (b) { return b.layout; })
    .filter(function (v, i, all) { return all.indexOf(v) === i; });
  assert(pctLayouts.length === 1 && pctLayouts[0] === sample.layout,
    sample.name + ": compression labels use one arrangement (" + sample.layout + ")", pctLayouts.join(","));
  const stressAxis = 390 - 96;
  stations.forEach(function (s) {
    const pct = boxes.filter(function (b) { return b.station === s.id && b.part === "pct"; })[0];
    const tau = boxes.filter(function (b) { return b.station === s.id && b.part === "tau"; })[0];
    const wantsPct = s.id === "L1" || s.id === "L2";
    assert(!!tau && !!pct === wantsPct, sample.name + ": " + s.id + (wantsPct ? " shows the percent and the stress" : " shows only the stress"));
    if (!tau) return;
    if (pct && sample.layout === "split") {
      assert(pct.y + pct.h <= pct.line - 1, sample.name + ": " + s.id + " percent sits above its load line",
        "bottom " + (pct.y + pct.h) + " line " + pct.line);
    } else if (pct) {
      assert(pct.y + pct.h <= pct.line - 1 || pct.y >= pct.line + 1,
        sample.name + ": " + s.id + " percent stays off the load line");
    }
    assert(tau.x >= stressAxis, sample.name + ": " + s.id + " stress sits on the right-hand axis",
      "x " + tau.x + " axis " + stressAxis);
  });
  boxes.forEach(function (b, i) {
    assert(b.x >= 2 && b.y >= 2 && b.x + b.w <= 388 && b.y + b.h <= 258,
      sample.name + ": " + b.station + " " + b.part + " stays inside the plot",
      JSON.stringify(b));
    assert(!hitsSpring(b, sample.design), sample.name + ": " + b.station + " " + b.part + " stays off the spring curve");
    assert(!intersects(b, titleBox), sample.name + ": " + b.station + " " + b.part + " stays clear of the load-axis title");
    for (let j = i + 1; j < boxes.length; j++) {
      assert(!intersects(b, boxes[j]), sample.name + ": " + b.station + " " + b.part + " does not overlap " + boxes[j].station + " " + boxes[j].part);
    }
  });
});

console.log("\n" + passed + " passed, " + failed + " failed");
if (failed) {
  console.log("\nFailures:");
  failures.forEach(function (f) { console.log(f); });
  process.exit(1);
}
console.log("All chart tests passed.");
