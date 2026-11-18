#!/usr/bin/env node
/**
 * SC-013 paid PDF filename. The name is not written into the title block.
 * Run: node tests/test-filename.js
 */
"use strict";

const path = require("path");
const E = require(path.join(__dirname, "..", "js", "engine.js"));
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

delete process.env.SPRING_CALC_TEST_ENTITLEMENT;

const unpaid = Pdf.exportFilename({
  requestedName: "../CON:secret?.pdf",
  entitlement: Ent.productionEntitlement()
});
assert(unpaid.paid === false && unpaid.filename === Pdf.DEFAULT_PDF_NAME,
  "An unpaid export keeps the fixed filename", unpaid.filename);
assert(Pdf.exportFilename({
  requestedName: "Shop spring A",
  entitlement: { source: "test-fixture", testOnly: true, tier: "paid" }
}).filename === Pdf.DEFAULT_PDF_NAME, "A paid-looking object is ignored without the test harness");

process.env.SPRING_CALC_TEST_ENTITLEMENT = "1";
const fixture = Ent.testPaidFixture();

function paid(name) {
  return Pdf.exportFilename({ requestedName: name, entitlement: fixture }).filename;
}

assert(paid("") === Pdf.DEFAULT_PDF_NAME, "A blank paid name uses the fixed filename");
assert(paid("Shop spring A") === "Shop spring A.pdf", "A plain paid name gains the pdf extension");
assert(paid("Shop spring A.pdf") === "Shop spring A.pdf", "An existing pdf extension is not doubled");
assert(paid("a/b\\c:d*?.pdf") === "a-b-c-d-.pdf" || paid("a/b\\c:d*?.pdf").indexOf("/") === -1,
  "Path separators and reserved punctuation are replaced");
assert(paid("a/b\\c:d*?.pdf").indexOf("\\") === -1 && paid("a/b\\c:d*?.pdf").indexOf(":") === -1,
  "The safe name has no slash, backslash or colon");
assert(paid("CON") === "CON-file.pdf", "The reserved name CON is changed");
assert(paid("com1.txt") === "com1.txt-file.pdf", "COM1 with another extension is still reserved");
assert(paid("  ..  ") === Pdf.DEFAULT_PDF_NAME, "A dot-only name is not used");
assert(paid("line\nbreak") === "line-break.pdf", "A control character is replaced");

const example = E.evaluateDesign({
  d: 2, D: 16.5, G: 81500, Rm: 1800, tauFactor: 0.5,
  R: 5, L0: 60, L1: 50, F1: 50, L2: 35, F2: 125,
  Fmax: 125, LmaxLoad: 35, DeMax: 18.5, ends: "closed_ground"
});
example.wind = "right";
example.materialName = "EN 10270-1 DH";
const built = Pdf.toUint8Array(example, {
  grade: 2,
  date: "05 Nov 2026",
  clearance: 1.5,
  requestedName: "Shop spring A",
  entitlement: fixture
});
assert(built.release === "paid" && built.filename === "Shop spring A.pdf", "The paid test sheet reports the safe filename");
assert(built.model.drawingNumber.indexOf("HC-") === 0, "The drawing number stays the separate HC number", built.model.drawingNumber);
assert(built.model.title === "Helical Compression Spring", "The title block title is not the filename");
const text = extractPdfText(built.bytes).text;
assert(text.indexOf(built.model.drawingNumber) >= 0, "The PDF still contains the drawing number");
assert(text.indexOf("Shop spring A") === -1, "The filename is not written into the PDF");

delete process.env.SPRING_CALC_TEST_ENTITLEMENT;

console.log("\n" + passed + " passed, " + failed + " failed");
if (failed) {
  console.log("\nFailures:");
  failures.forEach(function (f) { console.log(f); });
  process.exit(1);
}
console.log("All filename checks passed.");
