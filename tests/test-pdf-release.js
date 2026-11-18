#!/usr/bin/env node
/**
 * SC-002 unpaid and test-fixture paid A3 PDFs.
 * Run: node tests/test-pdf-release.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
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
const helpJs = fs.readFileSync(path.join(__dirname, "..", "js", "help.js"), "utf8");
assert(appJs.indexOf("productionEntitlement") >= 0, "The page asks for the production entitlement");
assert(appJs.indexOf("spring-calc-paid") === -1 && entJs.indexOf("localStorage") === -1,
  "No paid flag is stored in the browser");
assert(html.indexOf("btnExportTxt") === -1 && html.indexOf("btnExportJson") === -1 && html.indexOf("btnPrint") === -1,
  "Text, JSON and print exports are not offered");
assert(html.indexOf("Export A3 drawing (PDF)") >= 0, "A3 PDF remains the export");
assert((html + helpJs).indexOf("no adverts") >= 0, "The page states there are no adverts");
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
assert(unpaidText.indexOf("Set for relaxation") === -1 && paidText.indexOf("Set for relaxation") === -1,
  "A blank service temperature omits the relaxation note on both exports");
assert(Pdf.toPdfText("Set for relaxation at 130 °C").indexOf("\xB0") >= 0,
  "The degree sign is mapped into the PDF encoding");
const hotDesign = Object.assign({}, example, { serviceTemp: 80 });
const hotUnpaid = Pdf.toUint8Array(hotDesign, Object.assign({}, sheet, {
  entitlement: Ent.productionEntitlement()
}));
assert(pdfWords(hotUnpaid.bytes).indexOf("Set for relaxation at 130") >= 0,
  "The unpaid drawing includes the relaxation note");
process.env.SPRING_CALC_TEST_ENTITLEMENT = "1";
let hotPaid;
try {
  hotPaid = Pdf.toUint8Array(hotDesign, Object.assign({}, sheet, {
    entitlement: Ent.testPaidFixture()
  }));
} finally {
  delete process.env.SPRING_CALC_TEST_ENTITLEMENT;
}
assert(pdfWords(hotPaid.bytes).indexOf("Set for relaxation at 130") >= 0,
  "The paid drawing includes the relaxation note");

console.log("\nEnd views\n");

function pdfStreams(bytes) {
  const raw = Buffer.from(bytes).toString("latin1");
  const re = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;
  let out = "";
  while ((match = re.exec(raw))) {
    const body = Buffer.from(match[1], "latin1");
    let decoded = body;
    try { decoded = zlib.inflateSync(body); } catch (err) { /* already plain */ }
    out += decoded.toString("latin1") + "\n";
  }
  return out;
}

function tipRect(stream) {
  const pt = 72 / 25.4;
  const rects = [];
  const re = /([\d.]+) ([\d.]+) ([\d.-]+) ([\d.-]+) re/g;
  let match;
  while ((match = re.exec(stream))) {
    const w = Math.abs(Number(match[3])) / pt;
    const h = Math.abs(Number(match[4])) / pt;
    if (w > 0.8 && h > 0.8 && w < 12 && h < 12) {
      rects.push({ x: Number(match[1]) / pt, w: w, h: h });
    }
  }
  return rects;
}

const endCases = [
  { id: "closed_ground", caption: "Closed and ground", ground: true, closedTip: true },
  { id: "closed", caption: "Closed, not ground", ground: false, closedTip: true },
  { id: "open_ground", caption: "Open and ground", ground: true, closedTip: false },
  { id: "open", caption: "Open, not ground", ground: false, closedTip: false }
];
const endBase = {
  d: 2, D: 16.5, G: 81500, Rm: 1800, tauFactor: 0.5,
  R: 5, L0: 60, L1: 50, F1: 50, L2: 35, F2: 125,
  Fmax: 125, LmaxLoad: 35, DeMax: 18.5
};
const captions = endCases.map(function (item) { return item.caption; });
endCases.forEach(function (item) {
  const design = E.evaluateDesign(Object.assign({}, endBase, { ends: item.id }));
  design.wind = "right";
  design.materialName = "EN 10270-1 DH";
  const drawn = Drawing.build(design, sheet);
  const e1 = drawn.table1.rows.filter(function (row) { return row.symbol === "e1"; })[0];
  const e2 = drawn.table1.rows.filter(function (row) { return row.symbol === "e2"; })[0];
  if (item.id === "closed_ground") {
    assert(e1.value.indexOf("Not applicable") === -1 && e2.value.indexOf("Not applicable") === -1,
      "Closed and ground keeps squareness and parallelism");
  } else {
    assert(e1.value.indexOf("Not applicable") >= 0 && e2.value.indexOf("Not applicable") >= 0,
      item.caption + " leaves squareness and parallelism not applicable");
  }
  const file = Pdf.toUint8Array(design, Object.assign({}, sheet, {
    entitlement: Ent.productionEntitlement()
  }));
  const words = pdfWords(file.bytes);
  assert(words.indexOf(item.caption) >= 0, "The end-view caption reads " + item.caption);
  captions.forEach(function (other) {
    if (other === item.caption) return;
    assert(words.indexOf(other) === -1, item.caption + " sheet does not use the caption " + other);
  });
  assert(words.indexOf("Square and ground") === -1, "The end view does not say Square and ground");
  assert(words.indexOf("End view") >= 0 && words.indexOf("De = ") >= 0 && words.indexOf("Di = ") >= 0,
    item.caption + " keeps the end-view title and the diameter captions");
  const stream = pdfStreams(file.bytes);
  const hasBand = stream.indexOf("0.22 g") >= 0;
  assert(hasBand === item.ground, item.caption + (item.ground ? " draws the ground band" : " omits the ground band"));
  const tips = tipRect(stream);
  assert(tips.length === 1, item.caption + " draws one wire tip", "found " + tips.length);
});
const closedTip = tipRect(pdfStreams(Pdf.toUint8Array(
  Object.assign(E.evaluateDesign(Object.assign({}, endBase, { ends: "closed" })), { wind: "right" }),
  Object.assign({}, sheet, { entitlement: Ent.productionEntitlement() })
).bytes))[0];
const openTip = tipRect(pdfStreams(Pdf.toUint8Array(
  Object.assign(E.evaluateDesign(Object.assign({}, endBase, { ends: "open" })), { wind: "right" }),
  Object.assign({}, sheet, { entitlement: Ent.productionEntitlement() })
).bytes))[0];
assert(openTip.x > closedTip.x + 2, "The open cut tip leaves a wider gap than the closed tip",
  "closed x " + closedTip.x.toFixed(2) + " open x " + openTip.x.toFixed(2));
const groundSquare = tipRect(pdfStreams(Pdf.toUint8Array(
  Object.assign(E.evaluateDesign(Object.assign({}, endBase, { ends: "closed_ground" })), { wind: "right" }),
  Object.assign({}, sheet, { entitlement: Ent.productionEntitlement() })
).bytes))[0];
const openGroundSquare = tipRect(pdfStreams(Pdf.toUint8Array(
  Object.assign(E.evaluateDesign(Object.assign({}, endBase, { ends: "open_ground" })), { wind: "right" }),
  Object.assign({}, sheet, { entitlement: Ent.productionEntitlement() })
).bytes))[0];
assert(groundSquare.w > openGroundSquare.w + 0.8, "The closed ground tip spans the ring; the open ground tip stops short",
  groundSquare.w.toFixed(2) + " vs " + openGroundSquare.w.toFixed(2));

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
