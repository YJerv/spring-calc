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

console.log("Page 2 is material only\n");

assert(page2.indexOf(">2. Material<") >= 0, "The second page is titled Material");
assert(page2.indexOf('id="material"') >= 0, "The second page has the material choice");
assert(page2.indexOf('id="G"') >= 0 && page2.indexOf('id="Rm"') >= 0, "The second page has G and Rm");
["ends", "grade", "wind", "pocket", "innerMin", "clearance"].forEach(function (id) {
  assert(page2.indexOf('id="' + id + '"') === -1, "The second page does not contain " + id);
});

console.log("\nEnds, grade and wind are off the wire page\n");

assert(page1.indexOf('id="ends"') >= 0 && page1.indexOf('id="grade"') >= 0 && page1.indexOf('id="wind"') >= 0,
  "Ends, grade and wind are on the first page");
["ends", "grade", "wind", "material", "pocket"].forEach(function (id) {
  assert(page3.indexOf('id="' + id + '"') === -1, "The wire page does not contain " + id);
});

const wirePage = [
  "<h2>3. Standard wire diameters</h2>",
  "The heat map compares mean coil diameter D (rows) with the standard wire diameters (columns).",
  "Tap a cell to select that D and d.",
  'id="heatmapLegend"',
  "Well within (τk ≤ 70 % of allowable)",
  "Invalid (pocket, index 4–16, solid length or coil count)",
  'id="heatmapScroll"',
  "Swipe the map sideways to see every standard wire.",
  "Each size is also listed below, evaluated at the largest mean diameter that still fits the pocket: D = De max − d.",
  'id="passOnly"',
  "Show passing sizes only",
  'id="wireList"'
];
wirePage.forEach(function (phrase) {
  assert(page3.indexOf(phrase) >= 0, "Wire page still contains: " + phrase.slice(0, 60));
});

console.log("\n" + passed + " passed, " + failed + " failed");
if (failed) {
  console.log("\nFailures:");
  failures.forEach(function (f) { console.log(f); });
  process.exit(1);
}
console.log("All page tests passed.");
