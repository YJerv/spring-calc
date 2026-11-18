#!/usr/bin/env node
/**
 * SC-009 contextual help: agreed topics only, closable window, original wording.
 * Run: node tests/test-help.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const Help = require("../js/help.js");

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

function section(html, id) {
  const start = html.indexOf('<section id="' + id + '"');
  const end = html.indexOf("</section>", start);
  return html.slice(start, end);
}

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
const helpSrc = fs.readFileSync(path.join(root, "js/help.js"), "utf8");

const expected = ["duty", "check", "diameters", "grades", "ends", "materials", "stress", "wire", "graph", "export", "lengths", "temperature", "nomenclature", "modeA", "modeB"];
assert(JSON.stringify(Help.ids()) === JSON.stringify(expected), "Help topics are the agreed subjects");

console.log("\nButtons sit on the agreed questions only\n");

const buttons = html.match(/class="info-btn[^"]*"/g) || [];
assert(buttons.length === 14, "There are fourteen circled information buttons", String(buttons.length));
expected.forEach(function (id) {
  assert(html.indexOf('data-help="' + id + '"') >= 0, "A button opens " + id);
  const topic = Help.topic(id);
  assert(topic && topic.title && topic.body.indexOf("<") >= 0, id + " has a title and a body");
});
assert(Help.topic("wind") === null, "Wound direction has no help topic");
assert(section(html, "step-6").indexOf('data-help="wire"') >= 0, "Optimization opens the wire explanation");
assert(section(html, "step-6").indexOf("auto-optimise") === -1, "Optimization does not add the unapproved auto-optimise essay");
assert(section(html, "step-7").indexOf('data-help="graph"') >= 0, "The results page opens the graph explanation");
const windAt = html.indexOf('id="wind"');
const windField = html.slice(html.lastIndexOf("<div class=\"field\">", windAt), html.indexOf("</div>", windAt));
assert(windField.indexOf("info-btn") === -1, "The wind control has no information button");
["G", "Rm"].forEach(function (id) {
  const at = html.indexOf('id="' + id + '"');
  const field = html.slice(html.lastIndexOf("<div class=\"field\">", at), html.indexOf("</select>", at) === -1 ? html.indexOf("</div>", html.indexOf("</div>", at) + 1) : at);
  assert(field.indexOf("info-btn") === -1, "The " + id + " control has no information button");
});
assert(html.indexOf("More info") === -1, "Help is not a More info link");
assert(html.indexOf('id="helpDialog"') >= 0 && html.indexOf('id="btnHelpClose"') >= 0, "The help window has a Close control");
assert(html.indexOf('id="helpDialog" class="settings-backdrop" hidden') >= 0, "The help window starts closed");
["Opening or closing this window does not change what you have typed", "Warnings on the page stay on the page", "does not change what you have typed", "stay on the page", "not replaced by this window"].forEach(function (phrase) {
  assert(html.indexOf(phrase) === -1, "The help window no longer says: " + phrase);
  Help.ids().forEach(function (id) {
    assert(Help.topic(id).body.indexOf(phrase) === -1, id + " no longer says: " + phrase);
  });
});
const nomenclature = Help.topic("nomenclature");
assert(nomenclature && nomenclature.title === "Nomenclature", "Nomenclature has its own window");
assert(section(html, "step-1").indexOf('data-help="nomenclature"') >= 0 && section(html, "step-1").indexOf(">Nomenclature<") >= 0, "Overview opens Nomenclature");
assert(section(html, "step-1").indexOf("drawing export.</p>") < section(html, "step-1").indexOf('id="btnNomenclature"'), "Nomenclature sits under the Overview introduction");
assert(section(html, "step-1").indexOf('class="btn secondary" id="btnNomenclature"') >= 0, "Nomenclature is a secondary button");
["Symbol", "Description", "Units", "help-table-scroll", "help-nomenclature"].forEach(function (phrase) {
  assert(nomenclature.body.indexOf(phrase) >= 0, "Nomenclature table includes " + phrase);
});
const nomenRows = [
  ["L0", "Free length (zero load)", "mm"],
  ["L1", "Most relaxed working length", "mm"],
  ["L2", "Most compressed working length", "mm"],
  ["Ln", "Recommended shortest length (Lc + 15% of available travel)", "mm"],
  ["Lc", "Closed (solid) length", "mm"],
  ["F1", "Load at L1", "N"],
  ["F2", "Load at L2", "N"],
  ["Fn", "Load at Ln", "N"],
  ["Fc", "Theoretical solid load", "N"],
  ["R", "Spring rate", "N/mm"],
  ["s1", "Deflection at F1", "mm"],
  ["s2", "Deflection at F2 (maximum working load)", "mm"],
  ["L0 − Lc", "Available travel", "mm"],
  ["Sa", "Sum of minimum gaps (0.15 × available travel)", "mm"],
  ["d", "Wire diameter", "mm"],
  ["D", "Mean coil diameter", "mm"],
  ["De", "Outside diameter", "mm"],
  ["Di", "Inside diameter", "mm"],
  ["w", "Spring index, D/d", "—"],
  ["n", "Active coils", "—"],
  ["nt", "Total coils", "—"],
  ["p", "Active pitch", "mm"],
  ["k", "Bergsträsser stress correction factor", "—"],
  ["τ", "Uncorrected shear stress at Fmax", "MPa"],
  ["τk", "Corrected stress at Fmax", "MPa"],
  ["τk1", "Corrected stress at F1", "MPa"],
  ["τk2", "Corrected stress at F2", "MPa"],
  ["τkn", "Corrected stress at Ln", "MPa"],
  ["τkc", "Corrected stress at Lc", "MPa"],
  ["τzul", "Allowable screening stress", "MPa"],
  ["Rm", "Tensile strength", "MPa"],
  ["G", "Modulus of rigidity", "MPa"],
  ["e1", "Squareness", "mm"],
  ["e2", "Parallelism", "mm"],
  ["m", "Approximate mass", "g"]
];
nomenRows.forEach(function (row) {
  assert(nomenclature.body.indexOf("<td>" + row[0] + "</td><td>" + row[1] + "</td><td>" + row[2] + "</td>") >= 0,
    "Nomenclature row " + row[0]);
});
assert((nomenclature.body.match(/<tr>/g) || []).length === nomenRows.length + 1, "Nomenclature has one header and one row per symbol");

console.log("\nAgreed content, in original words\n");

const duty = Help.topic("duty").body;
["L0: Free length (zero load)", "L1: Most relaxed working length", "L2: Most compressed working length",
  "Lc: Closed (solid) length", "not necessarily a dead weight",
  ">F1<", ">F2<",
  "Ln (permissible length) = Lc + 15% of available travel; keep L2 at or above Ln."].forEach(function (phrase) {
  assert(duty.indexOf(phrase) >= 0, "Duty help includes: " + phrase);
});
assert(duty.indexOf("L1 / F1") === -1, "Duty help no longer puts an L callout on the graph");
const check = Help.topic("check").body;
["Green", "30%", "70%", "Orange", "20%", "80%", "Red", "solid length",
  "bring the forces closer together", "widen the gap between them to increase the rate",
  "reducing the guide diameter", "increasing the pocket diameter",
  "revisit the working lengths", "alternative material"].forEach(function (phrase) {
  assert(check.indexOf(phrase) >= 0, "Check help includes: " + phrase);
});
assert(check.indexOf("bring the loads closer to cut the rate") === -1, "The old breach advice is gone");
assert(duty.indexOf("help-svg duty-graph") >= 0, "Duty help draws the load graph");
const diameters = Help.topic("diameters").body;
["Pocket", "Clearance", "spring guide", "Leave a box blank for no limit",
  "assets/help/help-diameter-limits.png", "id=\"diameterDiagram\""].forEach(function (phrase) {
  assert(diameters.indexOf(phrase) >= 0, "Diameter help includes: " + phrase);
});
assert(diameters.indexOf("<svg") === -1, "Diameter help uses Yuan's diagram");
assert(helpSrc.indexOf('HELP_DIAMETER_IMAGE = "assets/help/help-diameter-limits.png"') >= 0,
  "HELP_DIAMETER_IMAGE points at Yuan's diameter diagram");
const lengthsHelp = Help.topic("lengths").body;
assert(lengthsHelp.indexOf("help-svg duty-graph") >= 0, "Working-length help uses the same graph as Duty");
assert(lengthsHelp.indexOf(">F1<") >= 0 && lengthsHelp.indexOf(">F2<") >= 0, "Working-length help puts F1 and F2 on the load axis");
assert(lengthsHelp.indexOf("L1 / F1") === -1 && lengthsHelp.indexOf("L2 / F2") === -1, "Working-length help has no length callouts on the plot");
assert(lengthsHelp.indexOf("most relaxed working length") >= 0 && lengthsHelp.indexOf("most compressed working length") >= 0, "Working-length help explains L1 and L2");
assert(lengthsHelp.indexOf("working-length range") >= 0, "Working-length help explains the range");
assert(lengthsHelp.indexOf("Ln (permissible length) = Lc + 15% of available travel") >= 0, "Working-length help keeps the Ln rule");
const temperatureHelp = Help.topic("temperature").body;
assert(temperatureHelp.indexOf("hot-set (presetting) temperature") >= 0, "Service temperature explains why it is asked for");
assert(temperatureHelp.indexOf("compresses the spring to solid, or near solid") >= 0 && temperatureHelp.indexOf("permanent set during manufacture") >= 0, "Service temperature explains hot setting");
assert(Help.topic("wire").body.indexOf("lowest corrected stress") >= 0, "Wire help explains the optimisation search");
assert(Help.topic("wire").body.indexOf("heat map") === -1, "Wire help no longer describes the heat map");
assert(Help.topic("graph").body.indexOf("85 %") >= 0, "Graph help explains the stations");
assert(Help.topic("export").body.indexOf("Upgrade to release drawing table") >= 0, "Export help keeps the unpaid warning");
const grades = Help.topic("grades").body;
["Grade 1 – tightest tolerances; use only when the duty requires it",
  "Grade 2 – standard general engineering",
  "Grade 3 – widest tolerances, lowest cost",
  "BS EN 15800", "does not change the rate"].forEach(function (phrase) {
  assert(grades.indexOf(phrase) >= 0, "Grade help includes: " + phrase);
});
assert(html.indexOf("Grade 1 —") === -1 && html.indexOf(">Grade 1<") >= 0, "Grade menus show the label only");
const ends = Help.topic("ends").body;
["Closed and ground", "Closed, not ground", "Open and ground", "Open, not ground", "solid length"].forEach(function (phrase) {
  assert(ends.indexOf(phrase) >= 0, "End help includes: " + phrase);
});
["help-ends-closed-ground.png", "help-ends-closed-not-ground.png", "help-ends-open-ground.png", "help-ends-open-not-ground.png"].forEach(function (file) {
  assert(ends.indexOf("assets/help/" + file) >= 0, "End help shows " + file);
});
assert((ends.match(/<img/g) || []).length === 4, "End help has four pictures");
assert((ends.match(/<figcaption>/g) || []).length === 4, "Each end diagram has one title");
assert((ends.match(/<h3/g) || []).length === 0, "End diagrams do not add a second heading");
assert(ends.indexOf("<svg") === -1, "End help uses Yuan's photographs");
assert(ends.indexOf("The diagrams show the four end types.") >= 0, "End help leaves the explanation to the diagrams");
assert(ends.indexOf('class="help-zoom"') >= 0 && diameters.indexOf('class="help-zoom"') >= 0,
  "A tap opens the full diagram");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
["help-diameter-limits.png", "help-working-lengths.png", "help-ends-closed-ground.png",
  "help-ends-closed-not-ground.png", "help-ends-open-ground.png", "help-ends-open-not-ground.png"].forEach(function (file) {
  assert(sw.indexOf("./assets/help/" + file) >= 0, "The service worker precaches " + file);
});
const css = fs.readFileSync(path.join(root, "css/app.css"), "utf8");
assert(css.indexOf(".help-diagram") >= 0 && css.indexOf("max-width: 100%") >= 0 && css.indexOf("height: auto") >= 0,
  "Help images scale to the window width");
assert(css.indexOf(".end-grid .help-diagram { width: 65%") >= 0, "End diagrams are about two thirds of the previous size");
assert(css.indexOf(".help-nomenclature th") >= 0 && css.indexOf("position: sticky") >= 0 && css.indexOf(".help-table-scroll") >= 0,
  "The nomenclature table keeps a sticky header and scrolls");
const materials = Help.topic("materials").body;
["EN 10270-1 DH", "EN 10270-1 SH", "EN 10270-1 SM", "VDSiCr", "1.4310", "Custom", "certificate", "rusts"].forEach(function (phrase) {
  assert(materials.indexOf(phrase) >= 0, "Material help includes: " + phrase);
});
const stress = Help.topic("stress").body;
["Bergsträsser", "correction", "Allowable stress factor", "0.5", "0.2", "0.8", "not a certified", "inside"].forEach(function (phrase) {
  assert(stress.indexOf(phrase) >= 0, "Stress help includes: " + phrase);
});

console.log("\nDesign-mode charts\n");

const modeSection = section(html, "step-2");
assert(modeSection.indexOf('data-help="modeA"') >= 0 && modeSection.indexOf('data-help="modeB"') >= 0, "Each design mode has an information button");
assert(modeSection.indexOf('class="mode-card"') >= 0, "Each mode is its own card");
function modeCard(id) {
  const at = modeSection.indexOf('id="' + id + '"');
  return modeSection.slice(modeSection.lastIndexOf('<div class="mode-card">', at), modeSection.indexOf("</div>", at));
}
["modeALabel", "modeBLabel"].forEach(function (id) {
  const card = modeCard(id);
  const labelEnd = card.indexOf("</label>");
  assert(card.indexOf("info-btn") > labelEnd, id + " information button is outside the mode label");
});
assert(app.indexOf("ev.stopPropagation()") >= 0 && app.indexOf("ev.preventDefault()") >= 0, "An information button does not activate the control under it");
const twoCaption = "A spring constrained by two load–length points. The nominal line passes through the origin. Max and Min are parallel to it and show the allowable force band. Max meets the deflection axis at a negative deflection; Min meets it at a positive deflection. The vertical bars at s1 and s2 are the force tolerance ±ΔF.";
const pointCaption = "A spring constrained by one load–length point and the rate. Only that point (s2, F2) is shown. The nominal line passes through the origin and through this point. Max is the largest rate and Min is the smallest, both pivoted about (s2, F2), so the lines fan about it.";
assert(Help.topic("modeA").body.indexOf(twoCaption) >= 0, "Two points uses Yuan's caption");
assert(Help.topic("modeB").body.indexOf(pointCaption) >= 0, "Point and rate uses Yuan's caption");
function chartLines(svg, cls) {
  const re = new RegExp('<line class="' + cls + '" x1="([-0-9.]+)" y1="([-0-9.]+)" x2="([-0-9.]+)" y2="([-0-9.]+)"', "g");
  const out = [];
  let m;
  while ((m = re.exec(svg))) out.push({ x1: +m[1], y1: +m[2], x2: +m[3], y2: +m[4], cls: cls });
  return out;
}
function chartLabels(svg) {
  const widths = { "F1": 16, "F2": 16, "L1": 16, "L2": 16, "F": 10, "L": 10, "±ΔF": 34, "s2, F2": 48 };
  const re = /<text class="mode-label"[^>]* x="([-0-9.]+)" y="([-0-9.]+)"(?: text-anchor="([^"]*)")?>(.*?)<\/text>/g;
  const out = [];
  let m;
  while ((m = re.exec(svg))) {
    const w = widths[m[4]] || 20;
    const x = +m[1];
    const y = +m[2];
    const anchor = m[3] || "start";
    const left = anchor === "end" ? x - w : anchor === "middle" ? x - w / 2 : x;
    out.push({ t: m[4], l: left, r: left + w, top: y - 12, b: y + 3 });
  }
  return out;
}
function gapToSegment(box, seg) {
  let best = 1e9;
  for (let i = 0; i <= 48; i++) {
    const x = seg.x1 + (seg.x2 - seg.x1) * i / 48;
    const y = seg.y1 + (seg.y2 - seg.y1) * i / 48;
    const cx = Math.max(box.l, Math.min(box.r, x));
    const cy = Math.max(box.top, Math.min(box.b, y));
    best = Math.min(best, Math.hypot(x - cx, y - cy));
  }
  return best;
}
["modeA", "modeB"].forEach(function (id) {
  const body = Help.topic(id).body;
  const svg = body.slice(body.indexOf("<svg"), body.indexOf("</svg>") + 6);
  const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const W = +vb[1];
  const H = +vb[2];
  assert(svg.indexOf("Force F (N)") >= 0 && svg.indexOf("Deflection s (mm)") >= 0, id + " names both axes");
  assert(svg.indexOf(">Max<") >= 0 && svg.indexOf(">Nominal<") >= 0 && svg.indexOf(">Min<") >= 0, id + " has the legend");
  assert(svg.indexOf('y="26"') >= 0 && svg.indexOf('y1="22"') >= 0, id + " keeps the legend in the top margin");
  const axes = chartLines(svg, "mode-axis");
  const originX = axes[1].x1;
  const maxCross = (function (line) {
    const t = (axes[0].y1 - line.y1) / (line.y2 - line.y1);
    return line.x1 + t * (line.x2 - line.x1);
  })(chartLines(svg, "mode-max")[0]);
  const minCross = (function (line) {
    const t = (axes[0].y1 - line.y1) / (line.y2 - line.y1);
    return line.x1 + t * (line.x2 - line.x1);
  })(chartLines(svg, "mode-min")[0]);
  if (id === "modeA") {
    assert(maxCross < originX && minCross > originX, "Max crosses left of the origin and Min crosses to the right");
    assert((svg.match(/mode-bar/g) || []).length === 2, "Two points draws both tolerance bars");
    assert(svg.indexOf(">F1<") >= 0 && svg.indexOf(">F2<") >= 0 && svg.indexOf(">L1<") >= 0 && svg.indexOf(">L2<") >= 0 && svg.indexOf(">±ΔF<") >= 0, "Two points labels F1 and F2 on the load axis and L1 and L2 on the deflection axis");
  } else {
    assert((svg.match(/mode-point/g) || []).length === 1, "Point and rate shows one point");
    assert((svg.match(/mode-bar/g) || []).length === 0, "Point and rate has no second tolerance bar");
    assert(svg.indexOf(">F<") >= 0 && svg.indexOf(">L<") >= 0 && svg.indexOf(">s2, F2<") === -1 && svg.indexOf(">F1<") === -1, "Point and rate labels F on the load axis and L on the deflection axis");
  }
  const segs = ["mode-max", "mode-nom", "mode-min", "mode-guide", "mode-bar", "mode-axis", "mode-leader"].reduce(function (all, cls) {
    return all.concat(chartLines(svg, cls));
  }, []);
  chartLabels(svg).forEach(function (box) {
    assert(box.l >= 2 && box.r <= W - 2 && box.top >= 2 && box.b <= H - 2, id + " label " + box.t + " stays inside the chart");
    segs.forEach(function (seg) {
      assert(gapToSegment(box, seg) >= 3, id + " label " + box.t + " stays off the " + seg.cls + " line");
    });
  });
});
assert(css.indexOf(".mode-chart .mode-max") >= 0 && css.indexOf('html[data-resolved="dark"] .mode-chart .mode-max') >= 0, "Mode charts have light and dark strokes");
assert(css.indexOf(".mode-chart .mode-max { stroke: #8a4b08; stroke-width: 2.25; fill: none; stroke-dasharray: 7 4; }") >= 0, "The two-points maximum line is dashed");

console.log("\nBoundaries\n");

assert(helpSrc.indexOf("can only be achieved") === -1, "Grade text is not a copied British Standard sentence");
assert(helpSrc.toLowerCase().indexOf("kilogram") === -1, "Help does not add a kilogram load");
assert(helpSrc.indexOf("localStorage") === -1, "Help does not touch saved calculator state");
assert(app.indexOf("function setupHelp") >= 0, "The page opens and closes the help window");
assert(app.indexOf('ev.key === "Escape"') >= 0, "Escape is handled");
const helpFn = app.slice(app.indexOf("function setupHelp"), app.indexOf("function init"));
assert(helpFn.indexOf("setVal") === -1 && helpFn.indexOf(".value") === -1, "Opening help does not write input values");

console.log("\n" + passed + " passed, " + failed + " failed");
if (failed) {
  console.log("\nFailures:");
  failures.forEach(function (f) { console.log(f); });
  process.exit(1);
}
console.log("All help tests passed.");
