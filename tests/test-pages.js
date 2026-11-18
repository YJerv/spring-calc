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
const swJs = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "..", "css", "app.css"), "utf8");
const pages = [1, 2, 3, 4, 5, 6, 7].map(function (n) { return section(html, "step-" + n); });

console.log("Seven-page order\n");

assert(pages[0].indexOf(">1. Overview<") >= 0, "Page 1 is the overview");
assert(pages[0].indexOf('class="brand-logo"') >= 0 && pages[0].indexOf('alt="JET – Jervis Engineering Tools"') >= 0 && pages[0].indexOf("assets/brand/jet-logo.png") >= 0, "The Overview shows the JET logo");
assert(pages[0].indexOf('class="brand-logo"') < pages[0].indexOf(">1. Overview<"), "The logo sits above the Overview heading");
assert(pages[0].indexOf('id="btnNomenclature"') > pages[0].indexOf(">1. Overview<") && pages[0].indexOf(">Nomenclature<") >= 0, "Overview has a Nomenclature button under the introduction");
assert(swJs.indexOf("./assets/brand/jet-logo.png") >= 0, "The service worker precaches the JET logo");
assert(pages[1].indexOf(">2. Design mode<") >= 0 && pages[1].indexOf('name="mode"') >= 0, "Page 2 chooses two points or point and rate");
assert(pages[2].indexOf(">3. Application constraints<") >= 0, "Page 3 is application constraints");
assert(pages[2].indexOf("Application constraints and design constraints are the same") === -1, "The page no longer says the two names are the same limits");
assert(pages[2].indexOf("Leave a box blank for no limit.") >= 0, "The remaining introduction stays");
assert(pages[2].indexOf(">Pocket and guide diameters<") >= 0 && pages[2].indexOf(">Working lengths<") >= 0, "Pocket, guide and working lengths are separate blocks");
assert(pages[2].indexOf('id="pocketFold"') >= 0 && pages[2].indexOf('id="lengthFold"') >= 0 && pages[2].indexOf('id="tempFold"') >= 0, "Those blocks collapse");
assert(pages[2].indexOf('id="pocketFold" open') === -1 && pages[2].indexOf('id="lengthFold" open') === -1 && pages[2].indexOf('id="tempFold" open') === -1, "Constraint sections start collapsed");
assert(pages[2].indexOf('id="workL1"') >= 0 && pages[2].indexOf('id="workL2"') >= 0, "Working lengths are L1 and L2");
assert(pages[2].indexOf("Blank uses the lighter") === -1 && pages[2].indexOf("Blank uses the loaded") === -1, "The old blank-length sentence is gone");
assert(pages[2].indexOf('id="serviceTemp"') >= 0 && pages[2].indexOf(">°C<") >= 0, "Service temperature stays on this page");
assert(pages[2].indexOf('id="btnClearance"') > pages[2].indexOf('id="innerClearance"'), "Suggested clearance sits with the guide inputs");
assert(pages[2].indexOf("same workshop allowance for the pocket and for the guide") >= 0, "The button is described for both clearances");
assert(appJs.indexOf("suggestedClearance(pocket)") >= 0 && appJs.indexOf("suggestedClearance(guide)") >= 0, "The button fills both clearances");
assert(appJs.indexOf("Continue without those limits?") >= 0, "An empty constraints page warns before continuing");
assert(pages[3].indexOf(">4. Design options<") >= 0, "Page 4 is design options");
assert(pages[3].indexOf('id="ends"') >= 0 && pages[3].indexOf('id="grade"') >= 0 && pages[3].indexOf('id="wind"') >= 0, "Ends, grade and wind are design options");
assert(/<details class="fold" id="optionsFold">\s*<summary aria-expanded="false"><span class="fold-title">Ends, grade and wind<\/span>/.test(pages[3]), "Ends, grade and wind start collapsed");
assert(pages[3].indexOf('data-help="ends"') < pages[3].indexOf('id="ends"') && pages[3].indexOf('data-help="grades"') < pages[3].indexOf('id="grade"'), "Ends and grade information sits on that section title");
assert(pages[3].indexOf('id="optionsFold"') < pages[3].indexOf('id="ends"') && pages[3].indexOf('id="wind"') < pages[3].indexOf('id="materialFold"'), "Those three fields sit in the design-options section");
assert(/<details class="fold" id="materialFold">\s*<summary aria-expanded="false"><span class="fold-title">Material<\/span>/.test(pages[3]), "Material starts collapsed");
assert(pages[3].indexOf('data-help="materials"') < pages[3].indexOf('id="material"'), "Material information sits on that section title");
assert(pages[3].indexOf('id="materialFold"') < pages[3].indexOf('id="material"') && pages[3].indexOf('id="material"') < pages[3].indexOf("</details>", pages[3].indexOf('id="material"')), "The material fields sit in the material section");
assert(pages[3].indexOf('id="material"') >= 0 && pages[3].indexOf('name="stressMode"') >= 0 && pages[3].indexOf('id="tauAllowDirect"') >= 0, "Material and the stress limit moved here");
assert(pages[4].indexOf(">5. Duty<") >= 0 && pages[4].indexOf('id="btnCheck"') >= 0 && pages[4].indexOf(">Check<") >= 0, "Page 5 is the duty and the Check button");
assert(pages[4].indexOf('id="modeBPoint"') === -1, "Point and rate does not ask which condition the point is");
assert(pages[4].indexOf('id="Lb"') >= 0 && pages[4].indexOf('id="Fb"') >= 0 && pages[4].indexOf('id="Rb"') >= 0, "Point and rate enters one length, one force and the rate");
assert(pages[4].indexOf('id="modeBNote"') === -1 && pages[4].indexOf("most compressed condition") === -1 && pages[4].indexOf("This point is") === -1, "Point and rate shows only the length, force and rate");
assert(helpJs.indexOf("used as the most compressed condition") >= 0, "The info window explains a missing working-length range");
assert(pages[4].indexOf("btnCalculate") === -1 && pages[4].indexOf(">Calculate<") === -1, "Calculate has been renamed");
assert(pages[4].indexOf('id="loadSummary"') === -1, "Rate, free length and maximum load are not repeated under Check");
assert(pages[4].indexOf('data-help="check"') >= 0, "The Check explanation is an information window");
assert(pages[5].indexOf(">6. Optimization<") >= 0 && pages[5].indexOf('id="optWire"') >= 0 && pages[5].indexOf('id="optCandidates"') >= 0, "Page 6 is Optimization with a wire picker and candidates");
assert(pages[5].indexOf("heatmap") === -1 && html.indexOf('id="heatmapScroll"') === -1, "The heat map is gone");
assert(pages[5].indexOf('id="optCandidates"') < pages[5].indexOf('id="btnOptimise"'), "Optimise sits below the wire list");
assert(pages[5].indexOf(">Optimise<") >= 0 && pages[5].indexOf('id="Dslider"') >= 0 && pages[5].indexOf('id="tradeoffSvg"') >= 0, "The diameter slider and stress graph are on Optimization");
assert(pages[5].indexOf('id="Dslider"') < pages[5].indexOf('id="tradeoffSvg"'), "The stress graph sits under the slider");
assert(pages[5].indexOf('id="coilTune"') >= 0 && pages[5].indexOf('id="coilTune"') < pages[5].indexOf('id="btnOptimise"') && pages[5].indexOf('id="tradeoffSvg"') < pages[5].indexOf("</div>\n        <div class=\"error\" id=\"err4\">"), "Optimise, the slider and the graph are one block");
assert(pages[5].indexOf("No spring will work for this duty") >= 0 && pages[5].indexOf('id="optNone" class="status-banner fail hidden"') >= 0, "The no-option banner is ready and hidden");
assert(appJs.indexOf("setCoilTune(false, screen.message || E.NO_OPTIONS)") >= 0 && appJs.indexOf("setCoilTune(true)") >= 0, "No options hides the tuning controls, and a feasible search shows them again");
assert(appJs.indexOf("viableWires") >= 0 && appJs.indexOf("bestViable") >= 0, "The wire list keeps only sizes with a passing diameter, and an invalid selection is replaced");
assert(appJs.indexOf("function dutyListEmpty") >= 0 && appJs.indexOf("btn.disabled = blocked") >= 0, "A red Duty check disables Next");
assert(appJs.indexOf("step > state.step && dutyForwardBlocked()") >= 0, "Forward navigation, including a step jump, stays on Duty");
assert(appJs.indexOf("function revealDutyBlock") >= 0 && appJs.indexOf("duty-highlight") >= 0, "Trying Next anyway brings the reason into view");
assert(appJs.indexOf("dx < -70") >= 0, "A swipe towards Optimization is stopped while Duty is blocked");
assert(appJs.indexOf("state.step > 1) goTo(state.step - 1)") >= 0, "Back stays available from Duty");
assert(appJs.indexOf("C.renderTradeoff") >= 0 && appJs.indexOf("paintCoil") >= 0, "Moving the slider redraws the stress graph");
assert(appJs.indexOf("passingDiameterSpan") >= 0 && appJs.indexOf("function clampCoilD") >= 0, "The diameter slider stops at the passing range and clamps its value");
assert(appJs.indexOf("wires: [d]") >= 0, "Optimise searches mean diameters for the selected wire");
assert(appJs.indexOf("screen.message || E.NO_OPTIONS") >= 0, "A failed check shows the specific hint");
assert(appJs.indexOf("alter the duty or select another material") === -1, "The generic no-options line is no longer shown");
assert(pages[6].indexOf(">7. Results<") >= 0, "Page 7 is results");
assert(html.indexOf('id="p7"') >= 0, "The progress marks seven pages");

console.log("\nResults cards\n");

assert(/<details class="notes result-fold" id="particularsFold">\s*<summary aria-expanded="false">Spring particulars<\/summary>/.test(pages[6]),
  "Spring particulars are collapsed by default");
assert(pages[6].indexOf('id="particularsFold" open') === -1, "Spring particulars are not open on arrival");
assert(pages[6].indexOf('id="particularsFold"') < pages[6].indexOf('id="tolFold"'),
  "Spring particulars come before manufacturing tolerances");
assert(/<details class="notes result-fold" id="tolFold">\s*<summary aria-expanded="false">Manufacturing tolerances \(BS EN 15800\)<\/summary>/.test(pages[6]),
  "Manufacturing tolerances are collapsed by default");
assert(pages[6].indexOf('id="tolFold" open') === -1, "Manufacturing tolerances are not open on arrival");
assert(appJs.indexOf("function collapseStepFolds") >= 0 && appJs.indexOf("collapseStepFolds(step)") >= 0,
  "Showing a page closes every section on it");
assert(appJs.indexOf("function revealFoldsForMessages") >= 0 && appJs.indexOf('id: "pocket"') >= 0 && appJs.indexOf('id: "G"') >= 0 && appJs.indexOf('id: "workL2"') >= 0,
  "A message that names a hidden field opens that section");
["loadFold", "exportFold", "springFold", "particularsFold", "tolFold"].forEach(function (id) {
  assert(pages[6].indexOf('id="' + id + '" open') === -1, id + " starts collapsed");
});
assert(!/<details[^>]*\sopen[\s>]/.test(html), "No collapsible section is open in the page markup");
assert(pages[6].indexOf(">Drawing export<") >= 0, "The export card is named Drawing export");
assert(pages[6].indexOf('id="exportFold"') < pages[6].indexOf('id="springFold"'), "The scaled side view sits below the drawing export");
assert(pages[6].indexOf(">Scaled side view at free length<") >= 0, "The side view keeps its own heading at the bottom");
assert(appJs.indexOf('summary.setAttribute("aria-expanded"') >= 0, "Result cards expose aria-expanded");
assert(css.indexOf("details > summary") >= 0 && css.indexOf("font-size: 18px") >= 0 && css.indexOf("font-weight: 600") >= 0, "Section titles are 18 px and semibold");
assert(css.indexOf("width: 32px") >= 0 && css.indexOf("height: 32px") >= 0 && css.indexOf("details[open] > summary::after { transform: rotate(180deg); }") >= 0, "The section chevron is a 32 px control that rotates when open");
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
