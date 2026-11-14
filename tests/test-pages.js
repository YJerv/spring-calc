#!/usr/bin/env node
/**
 * Page order after R3-01. Run: node tests/test-pages.js
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
const appJs = fs.readFileSync(path.join(__dirname, "..", "js", "app.js"), "utf8");
const helpJs = fs.readFileSync(path.join(__dirname, "..", "js", "help.js"), "utf8");
const pages = [1, 2, 3, 4, 5, 6, 7].map(function (n) { return section(html, "step-" + n); });

console.log("Seven-page order\n");

assert(pages[0].indexOf(">1. Overview<") >= 0, "Page 1 is the overview");
assert(pages[1].indexOf(">2. Design mode<") >= 0 && pages[1].indexOf('name="mode"') >= 0, "Page 2 chooses two points or point and rate");
assert(pages[2].indexOf(">3. Application constraints<") >= 0, "Page 3 is application constraints");
assert(pages[2].indexOf("Application constraints and design constraints are the same") >= 0, "The heading says the two names once");
assert(pages[2].indexOf(">Pocket and guide diameters<") >= 0 && pages[2].indexOf(">Working lengths<") >= 0, "Pocket, guide and working lengths are separate blocks");
assert(pages[2].indexOf('id="pocketFold"') >= 0 && pages[2].indexOf('id="lengthFold"') >= 0, "Those blocks collapse");
assert(pages[2].indexOf('id="workL1"') >= 0 && pages[2].indexOf('id="workL2"') >= 0, "Working lengths are L1 and L2");
assert(pages[2].indexOf("Blank uses the lighter") === -1 && pages[2].indexOf("Blank uses the loaded") === -1, "The old blank-length sentence is gone");
assert(pages[2].indexOf('id="serviceTemp"') >= 0 && pages[2].indexOf(">°C<") >= 0, "Service temperature stays on this page");
assert(pages[2].indexOf('id="btnClearance"') > pages[2].indexOf('id="innerClearance"'), "Suggested clearance sits with the guide inputs");
assert(pages[2].indexOf("same workshop allowance for the pocket and for the guide") >= 0, "The button is described for both clearances");
assert(appJs.indexOf("suggestedClearance(pocket)") >= 0 && appJs.indexOf("suggestedClearance(guide)") >= 0, "The button fills both clearances");
assert(appJs.indexOf("Continue without those limits?") >= 0, "An empty constraints page warns before continuing");
assert(pages[3].indexOf(">4. Design options<") >= 0, "Page 4 is design options");
assert(pages[3].indexOf('id="ends"') >= 0 && pages[3].indexOf('id="grade"') >= 0 && pages[3].indexOf('id="wind"') >= 0, "Ends, grade and wind are design options");
assert(pages[3].indexOf('id="material"') >= 0 && pages[3].indexOf('name="stressMode"') >= 0 && pages[3].indexOf('id="tauAllowDirect"') >= 0, "Material and the stress limit moved here");
assert(pages[4].indexOf(">5. Duty<") >= 0 && pages[4].indexOf('id="btnCheck"') >= 0 && pages[4].indexOf(">Check<") >= 0, "Page 5 is the duty and the Check button");
assert(pages[4].indexOf("btnCalculate") === -1 && pages[4].indexOf(">Calculate<") === -1, "Calculate has been renamed");
assert(pages[4].indexOf('id="loadSummary"') === -1, "Rate, free length and maximum load are not repeated under Check");
assert(pages[4].indexOf('data-help="check"') >= 0, "The Check explanation is an information window");
assert(pages[5].indexOf(">6. Optimization<") >= 0 && pages[5].indexOf('id="optWire"') >= 0 && pages[5].indexOf('id="optCandidates"') >= 0, "Page 6 is Optimization with a wire picker and candidates");
assert(pages[5].indexOf("heatmap") === -1 && html.indexOf('id="heatmapScroll"') === -1, "The heat map is gone");
assert(pages[6].indexOf(">7. Results<") >= 0, "Page 7 is results");
assert(html.indexOf('id="p7"') >= 0, "The progress marks seven pages");

console.log("\nResults cards\n");

assert(/<details class="notes result-fold" id="particularsFold">\s*<summary aria-expanded="false">Spring particulars<\/summary>/.test(pages[6]),
  "Spring particulars are collapsed by default");
assert(pages[6].indexOf('id="particularsFold" open') === -1, "Spring particulars are not open on arrival");
["loadFold", "tolFold", "exportFold", "springFold"].forEach(function (id) {
  assert(pages[6].indexOf('id="' + id + '" open') >= 0, id + " starts expanded");
});
assert(pages[6].indexOf(">Drawing export<") >= 0, "The export card is named Drawing export");
assert(pages[6].indexOf('id="exportFold"') < pages[6].indexOf('id="springFold"'), "The scaled side view sits below the drawing export");
assert(pages[6].indexOf(">Scaled side view at free length<") >= 0, "The side view keeps its own heading at the bottom");
assert(appJs.indexOf('summary.setAttribute("aria-expanded"') >= 0, "Result cards expose aria-expanded");
assert(appJs.indexOf('card.id === "loadFold"') >= 0 && appJs.indexOf("renderLoadGraph($(\"graphSvg\")") >= 0, "Opening the load card redraws the graph");
assert(pages[6].indexOf('id="gradeResult"') === -1, "The results page has no tolerance grade menu");
assert(html.indexOf("If your phone is set to dark mode, some screens may not display correctly.") >= 0, "Settings uses the short dark-mode line");
assert(html.indexOf("Two phones can therefore look different") === -1, "Settings no longer explains Appearance");
assert(helpJs.indexOf("HELP_DIAMETER_IMAGE") >= 0, "The diameter diagram has a hook for a replacement image");

console.log("\n" + passed + " passed, " + failed + " failed");
if (failed) {
  console.log("\nFailures:");
  failures.forEach(function (f) { console.log(f); });
  process.exit(1);
}
console.log("All page tests passed.");
