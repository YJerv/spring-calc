#!/usr/bin/env node
/**
 * SC-002 unpaid and test-fixture paid A3 PDFs.
 * Run: node tests/test-pdf-release.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const E = require(path.join(__dirname, "..", "js", "engine.js"));
const Drawing = require(path.join(__dirname, "..", "js", "drawing.js"));
const Ent = require(path.join(__dirname, "..", "js", "entitlement.js"));
const Pdf = require(path.join(__dirname, "..", "js", "pdf.js"));
const { extractPdfText } = require(path.join(__dirname, "pdf-text.js"));

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

function normalise(text) {
  return String(text).replace(/\x97/g, "\u2014").replace(/\x96/g, "\u2013");
}

function pdfWords(bytes) {
  return normalise(extractPdfText(bytes).text);
}

delete process.env.SPRING_CALC_TEST_ENTITLEMENT;

console.log("Fail closed\n");

const production = Ent.productionEntitlement();
assert(production.tier === "unpaid" && production.verified === false && production.source === "fail-closed",
  "Production entitlement is unpaid and unverified");
assert(production.price == null && production.productId == null,
  "Price and Play product id are left unset");
assert(Ent.OPEN.verificationUrl == null && Ent.OPEN.existingCustomers === "not specified",
  "Verification server and existing-customer treatment are recorded as open");
assert(Ent.releaseTier({}) === "unpaid", "A missing entitlement stays unpaid");
assert(Ent.releaseTier({ entitlement: { tier: "paid", verified: true } }) === "unpaid",
  "A client paid object is not accepted");
assert(Ent.releaseTier({ entitlement: { source: "localStorage", tier: "paid", testOnly: true } }) === "unpaid",
  "A localStorage-shaped object is not accepted");
assert(Ent.releaseTier({
  entitlement: { source: "test-fixture", testOnly: true, tier: "paid" }
}) === "unpaid", "The test fixture is refused when the Node harness flag is off");

let threw = false;
try { Ent.testPaidFixture(); } catch (err) { threw = true; }
assert(threw, "The test fixture helper throws outside the harness");

const appJs = fs.readFileSync(path.join(__dirname, "..", "js", "app.js"), "utf8");
const entJs = fs.readFileSync(path.join(__dirname, "..", "js", "entitlement.js"), "utf8");
const pdfJs = fs.readFileSync(path.join(__dirname, "..", "js", "pdf.js"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
assert(appJs.indexOf("productionEntitlement") >= 0, "The page asks for the production entitlement");
assert(appJs.indexOf("spring-calc-paid") === -1 && entJs.indexOf("localStorage") === -1,
  "No paid flag is stored in the browser");
assert(html.indexOf("btnExportTxt") === -1 && html.indexOf("btnExportJson") === -1 && html.indexOf("btnPrint") === -1,
  "Text, JSON and print exports are not offered");
assert(html.indexOf("Export A3 drawing (PDF)") >= 0, "A3 PDF remains the export");
assert(html.indexOf("no adverts") >= 0 || html.indexOf("There are no adverts") >= 0, "The page states there are no adverts");
assert(pdfJs.indexOf("redactValues") >= 0, "Table drawing can omit values");

console.log("\nWorked-example sheets\n");

const example = E.evaluateDesign({
  d: 2, D: 16.5, G: 81500, Rm: 1800, tauFactor: 0.5,
  R: 5, L0: 60, L1: 50, F1: 50, L2: 35, F2: 125,
  Fmax: 125, LmaxLoad: 35, DeMax: 18.5, ends: "closed_ground"
});
example.wind = "right";
example.materialName = "EN 10270-1 DH";
const sheet = { grade: 2, date: "05 Nov 2026", clearance: 1.5 };
const model = Drawing.build(example, sheet);

const forged = Pdf.toUint8Array(example, Object.assign({}, sheet, {
  entitlement: { tier: "paid", verified: true, source: "browser" }
}));
assert(forged.release === "unpaid", "A forged browser entitlement still builds the unpaid PDF");

const unpaid = Pdf.toUint8Array(example, Object.assign({}, sheet, {
  entitlement: Ent.productionEntitlement()
}));
const unpaidText = pdfWords(unpaid.bytes);
assert(unpaid.release === "unpaid", "Production export is marked unpaid");
assert(unpaidText.indexOf(Ent.WATERMARK) >= 0, "Unpaid PDF contains the exact watermark", Ent.WATERMARK);
assert(unpaidText.indexOf("Upgrade to release drawing") >= 0 && unpaidText.indexOf("blur") === -1,
  "The watermark is real text, not a blur instruction");
assert(unpaidText.indexOf(Ent.PREVIEW_WARNING) >= 0,
  "Unpaid PDF keeps the preview warning", Ent.PREVIEW_WARNING);

process.env.SPRING_CALC_TEST_ENTITLEMENT = "1";
let paid;
try {
  paid = Pdf.toUint8Array(example, Object.assign({}, sheet, {
    entitlement: Ent.testPaidFixture()
  }));
} finally {
  delete process.env.SPRING_CALC_TEST_ENTITLEMENT;
}
const paidText = pdfWords(paid.bytes);
assert(paid.release === "paid", "The Node test fixture builds the paid PDF");
assert(paidText.indexOf(Ent.WATERMARK) === -1, "Paid PDF does not contain the watermark");
assert(paidText.indexOf(Ent.PREVIEW_WARNING) === -1, "Paid PDF does not carry the unpaid preview warning");

const knownOutsideTables = {
  "Closed and ground": "side-view end note",
  "EN 10270-1 DH": "title-block material",
  "BS EN 13906-1": "title-block design line"
};

model.table1.rows.concat(model.table2.rows).forEach(function (row) {
  const name = normalise(Pdf.toPdfText(row.particular));
  const symbol = normalise(Pdf.toPdfText(row.symbol));
  const value = normalise(Pdf.toPdfText(row.value));
  assert(unpaidText.indexOf(name) >= 0, "Unpaid PDF keeps row name " + row.particular);
  assert(paidText.indexOf(name) >= 0, "Paid PDF keeps row name " + row.particular);
  if (symbol && symbol !== "-") {
    assert(unpaidText.indexOf(symbol) >= 0, "Unpaid PDF keeps symbol " + row.symbol);
  }
  if (!value || value === "-" || value.length < 4) return;
  assert(paidText.indexOf(value) >= 0, "Paid PDF includes table value " + row.symbol, value.slice(0, 70));
  if (knownOutsideTables[value]) {
    assert(unpaidText.indexOf(value) >= 0,
      "Non-table field still shows " + value + " (" + knownOutsideTables[value] + ")");
  } else {
    assert(unpaidText.indexOf(value) === -1,
      "Unpaid PDF omits table value " + row.symbol, value.slice(0, 70));
  }
});

["Particular", "Sym.", "Value", "TABLE 1", "TABLE 2", "MANUFACTURER", "REFERENCE ONLY"].forEach(function (label) {
  assert(unpaidText.indexOf(label) >= 0, "Unpaid PDF keeps column or table label " + label);
  assert(paidText.indexOf(label) >= 0, "Paid PDF keeps column or table label " + label);
});

assert(model.table1.rows.some(function (row) { return row.value.indexOf("125.000") >= 0; }),
  "The on-screen drawing model still has the full F2 value");
assert(unpaidText.indexOf("125.000") === -1, "Unpaid PDF does not contain 125.000");
assert(paidText.indexOf("125.000") >= 0, "Paid test PDF contains 125.000");
assert(unpaidText.indexOf("18.500") === -1 && unpaidText.indexOf("18.50") >= 0,
  "Unpaid PDF drops the table outside diameter but keeps the view dimension");

const artifactDir = "/opt/cursor/artifacts";
if (fs.existsSync(artifactDir)) {
  fs.writeFileSync(path.join(artifactDir, "sc002_unpaid_a3.pdf"), Buffer.from(unpaid.bytes));
  fs.writeFileSync(path.join(artifactDir, "sc002_paid_a3_TEST_FIXTURE_ONLY.pdf"), Buffer.from(paid.bytes));
  console.log("  WROTE unpaid and test-fixture paid PDFs");
}

console.log("\n" + passed + " passed, " + failed + " failed");
if (failed) {
  console.log("\nFailures:");
  failures.forEach(function (f) { console.log(f); });
  process.exit(1);
}
console.log("All PDF release tests passed.");
