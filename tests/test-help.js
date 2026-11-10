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

const expected = ["duty", "diameters", "grades", "ends", "materials", "stress"];
assert(JSON.stringify(Help.ids()) === JSON.stringify(expected), "Help topics are the six agreed subjects");

console.log("\nButtons sit on the agreed questions only\n");

const buttons = html.match(/class="info-btn[^"]*"/g) || [];
assert(buttons.length === 6, "There are six circled information buttons", String(buttons.length));
expected.forEach(function (id) {
  assert(html.indexOf('data-help="' + id + '"') >= 0, "A button opens " + id);
  const topic = Help.topic(id);
  assert(topic && topic.title && topic.body.indexOf("<") >= 0, id + " has a title and a body");
});
assert(Help.topic("wind") === null, "Wound direction has no help topic");
["step-3", "step-4", "step-5"].forEach(function (id) {
  assert(section(html, id).indexOf("info-btn") === -1, id + " has no information button");
});
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
assert(html.indexOf("does not change what you have typed") >= 0, "The window says typed values stay");

console.log("\nAgreed content, in original words\n");

const duty = Help.topic("duty").body;
["L1", "L2", "F1", "F2", "operating lengths", "not necessarily a dead weight",
  "calculated", "solid length", "70%", "80%", "not a rejection rule", "not defined",
  "does not fail", "<svg"].forEach(function (phrase) {
  assert(duty.indexOf(phrase) >= 0, "Duty help includes: " + phrase);
});
assert(duty.indexOf("L1 / F1") >= 0 && duty.indexOf("L2 / F2") >= 0, "Duty help marks L1 and L2 on the graph");
assert((duty.match(/data-spring="L0"/g) || []).length === 2, "Duty help draws the free spring");
assert((duty.match(/data-spring="L1"/g) || []).length === 2, "Duty help draws the spring at L1");
assert((duty.match(/data-spring="L2"/g) || []).length === 2, "Duty help draws the spring at L2");
const dutySvg = duty.slice(duty.indexOf("<svg"), duty.indexOf("</svg>") + 6);
assert(dutySvg.toLowerCase().indexOf("shorter") === -1, "The duty picture does not say shorter");
const diameters = Help.topic("diameters").body;
["Pocket", "Clearance", "Inside diameter", "Blank box", "not defined", "not agreed", "<svg"].forEach(function (phrase) {
  assert(diameters.indexOf(phrase) >= 0, "Diameter help includes: " + phrase);
});
const grades = Help.topic("grades").body;
["Grade 1", "0.63", "Grade 2", "1.00", "Grade 3", "1.60", "BS EN 15800", "not a copy", "does not change the rate"].forEach(function (phrase) {
  assert(grades.indexOf(phrase) >= 0, "Grade help includes: " + phrase);
});
const ends = Help.topic("ends").body;
["Closed and ground", "Closed, not ground", "Open and ground", "Open, not ground", "solid length"].forEach(function (phrase) {
  assert(ends.indexOf(phrase) >= 0, "End help includes: " + phrase);
});
assert((ends.match(/<svg/g) || []).length === 4, "End help has four pictures");
const materials = Help.topic("materials").body;
["EN 10270-1 DH", "EN 10270-1 SH", "EN 10270-1 SM", "VDSiCr", "1.4310", "Custom", "certificate", "rusts"].forEach(function (phrase) {
  assert(materials.indexOf(phrase) >= 0, "Material help includes: " + phrase);
});
const stress = Help.topic("stress").body;
["Bergsträsser", "correction", "Allowable stress factor", "0.5", "0.2", "0.8", "not a certified", "inside"].forEach(function (phrase) {
  assert(stress.indexOf(phrase) >= 0, "Stress help includes: " + phrase);
});

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
