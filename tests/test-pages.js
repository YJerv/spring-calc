#!/usr/bin/env node
/**
 * SC-006 page contents. The wire page markup is fixed here so a later edit is visible.
 * Run: node tests/test-pages.js
 */
"use strict";

const fs = require("fs");
const path = require("path");

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

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const page1 = section(html, "step-1");
const page2 = section(html, "step-2");
const page3 = section(html, "step-3");

const page4 = section(html, "step-4");

console.log("Page order after the design-constraints swap\n");

assert(page1.indexOf(">1. Design constraints<") >= 0, "The first page is design constraints");
assert(page1.indexOf('id="pocket"') >= 0 && page1.indexOf('id="innerMin"') >= 0 && page1.indexOf('id="clearance"') >= 0,
  "The first page has the diameter limits");
assert(page1.indexOf(">Spring guide diameter<") >= 0 && page1.indexOf('id="innerClearance"') >= 0,
  "The first page has a spring guide diameter and its clearance");
assert(page1.indexOf("Used only when a spring guide diameter is entered.") >= 0,
  "The guide clearance hint says when it is used");
assert(page1.indexOf("Suggested clearance is a typical workshop allowance") === -1,
  "The suggested-clearance paragraph is not left on the constraints page");
assert(page1.indexOf('data-help="diameters"') >= 0, "The diameter help button is on the first page");
["L1", "ends", "grade", "wind", "material"].forEach(function (id) {
  assert(page1.indexOf('id="' + id + '"') === -1, "The first page does not contain " + id);
});

assert(page2.indexOf(">2. Working loads and lengths<") >= 0, "The second page is working loads and lengths");
assert(page2.indexOf('id="L1"') >= 0 && page2.indexOf('id="btnCalculate"') >= 0, "The second page has the loads and Calculate");
assert(page2.indexOf('data-help="duty"') >= 0, "The working-loads help button is on the second page");
assert(page2.indexOf('id="ends"') >= 0 && page2.indexOf('id="grade"') >= 0 && page2.indexOf('id="wind"') >= 0,
  "Ends, grade and wind stay with the loads, before Calculate");
["pocket", "innerMin", "clearance", "innerClearance", "material"].forEach(function (id) {
  assert(page2.indexOf('id="' + id + '"') === -1, "The second page does not contain " + id);
});

console.log("\nMaterial is the third page\n");

assert(page3.indexOf(">3. Material<") >= 0, "The third page is titled Material");
assert(page3.indexOf('id="material"') >= 0, "The third page has the material choice");
assert(page3.indexOf('id="G"') >= 0 && page3.indexOf('id="Rm"') >= 0, "The third page has G and Rm");
["ends", "grade", "wind", "pocket", "innerMin", "clearance"].forEach(function (id) {
  assert(page3.indexOf('id="' + id + '"') === -1, "The material page does not contain " + id);
});

console.log("\nEnds, grade and wind are off the wire page\n");

["ends", "grade", "wind", "material", "pocket"].forEach(function (id) {
  assert(page4.indexOf('id="' + id + '"') === -1, "The wire page does not contain " + id);
});

const wirePage = [
  "<h2>4. Standard wire diameters</h2>",
  'id="heatmapLegend"',
  "Well within (τk ≤ 70 % of allowable)",
  "Invalid (pocket, spring guide, index 4–16, solid length or coil count)",
  'id="heatmapScroll"',
  "Swipe the map sideways to see every standard wire.",
  'id="passOnly"',
  "Show passing sizes only",
  'id="wireList"'
];
wirePage.forEach(function (phrase) {
  assert(page4.indexOf(phrase) >= 0, "Wire page still contains: " + phrase.slice(0, 60));
});
const helpJs = fs.readFileSync(path.join(__dirname, "..", "js", "help.js"), "utf8");
assert(helpJs.indexOf("The heat map compares mean coil diameter D") >= 0, "The heat-map explanation is in the help window");
const appJs = fs.readFileSync(path.join(__dirname, "..", "js", "app.js"), "utf8");
const renderAt = appJs.indexOf("function renderHeatmap()");
const renderFn = appJs.slice(renderAt, appJs.indexOf("function selectHeatmapCell"));
assert(renderFn.indexOf("buildHeatmap(input)") >= 0, "The page builds the heat map from the current limits");
assert(renderFn.indexOf("input.DeMax == null) {") === -1, "A blank pocket does not skip the heat map");
assert(renderFn.indexOf("No pocket or spring guide is set") >= 0, "The open map explains the 1 mm to 100 mm range");
assert(helpJs.indexOf("Tap a cell to select that D and d.") >= 0, "The heat-map instruction is in the help window");
assert(page4.indexOf('id="wireIntro"') === -1, "The wire page has no D max summary box");
const page6 = section(html, "step-6");
assert(/<details class="notes">\s*<summary>Spring particulars<\/summary>/.test(page6),
  "Spring particulars are collapsed by default");
assert(page6.indexOf("<details class=\"notes\" open") === -1, "Spring particulars are not open on arrival");
assert(page6.indexOf('id="gradeResult"') === -1, "The results page has no tolerance grade menu");
assert(page4.indexOf('id="heatmapScroll"') >= 0, "The wire matrix stays");

console.log("\n" + passed + " passed, " + failed + " failed");
if (failed) {
  console.log("\nFailures:");
  failures.forEach(function (f) { console.log(f); });
  process.exit(1);
}
console.log("All page tests passed.");
