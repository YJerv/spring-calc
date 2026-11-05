#!/usr/bin/env node
/**
 * A3 drawing model and PDF smoke tests.
 * Run: node tests/test-drawing.js
 * WRITE_SAMPLE=1 also writes samples/helical-compression-spring-a3-example.pdf
 */
"use strict";

const fs = require("fs");
const path = require("path");
const E = require(path.join(__dirname, "..", "js", "engine.js"));
const Drawing = require(path.join(__dirname, "..", "js", "drawing.js"));
const Pdf = require(path.join(__dirname, "..", "js", "pdf.js"));

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

function findRow(table, symbol) {
  return table.rows.filter(function (r) { return r.symbol === symbol; })[0];
}

console.log("A3 drawing model\n");

const example = E.evaluateDesign({
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
});
example.wind = "right";
example.materialName = "EN 10270-1 DH";

assertClose(Drawing.chooseScale(example.De, example.L0), 2, "Worked example fits at 2:1 on the A3 view");
assert(Drawing.scaleLabel(2) === "2:1", "Scale label for 2 is 2:1");
assert(Drawing.scaleLabel(0.5) === "1:2", "Scale label for a half scale is 1:2");

const model = Drawing.build(example, {
  grade: 2,
  date: "05 Nov 2026",
  clearance: 1.5
});

assert(model.title === "Helical Compression Spring", "Title is Helical Compression Spring");
assert(model.page.format === "a3" && model.page.orientation === "landscape", "Sheet is A3 landscape");
assertClose(model.page.widthMm, 420, "A3 landscape width is 420 mm");
assertClose(model.page.heightMm, 297, "A3 landscape height is 297 mm");
assert(model.projection === "third-angle", "Projection is third angle");
assert(model.generalNote === "DIMENSIONS IN MILLIMETRES, INTERPRET PER ASME Y14.5",
  "General note quotes the ASME Y14.5 millimetre statement");
assert(model.units === "mm", "Units are millimetres");
assert(model.date === "05 Nov 2026", "Date is passed through to the title block");
assert(model.scaleLabel === "2:1", "Title-block scale is 2:1");
assert(model.drawingNumber.indexOf("HC-") === 0, "Drawing number is allocated");
assert(model.hand === "RH", "Default coil hand on the drawing is right-hand");
assert(model.grade === 2, "Drawing states grade 2");
assert(model.table1.title.indexOf("TABLE 1") >= 0 && model.table1.title.indexOf("SPRING PARTICULARS") >= 0,
  "Table 1 is the spring particulars");
assert(model.table2.title.indexOf("TABLE 2") >= 0 && model.table2.mark === "REFERENCE ONLY",
  "Table 2 is marked REFERENCE ONLY");

const l0 = findRow(model.table1, "L0");
assert(l0 && l0.value.indexOf("REFERENCE ONLY") >= 0, "Two specified loads put L0 on the particulars as reference only");
assert(l0.value.indexOf("±") === -1, "Reference L0 is not given a manufacturing ± tolerance");
const de = findRow(model.table1, "De");
assert(de && de.value.indexOf("± 0.45 mm") >= 0, "Outside diameter carries the grade 2 Table 3 tolerance");
const f1 = findRow(model.table1, "F1");
const f2 = findRow(model.table1, "F2");
assert(f1 && f1.value.indexOf("50.000 N") >= 0 && f1.value.indexOf("±") >= 0, "F1 is toleranced at L1");
assert(f2 && f2.value.indexOf("125.000 N") >= 0 && f2.value.indexOf("±") >= 0, "F2 is toleranced at L2");
assert(findRow(model.table1, "—") || model.table1.rows.some(function (r) {
  return r.particular === "Coil hand" && r.value.indexOf("RH") >= 0;
}), "Coil hand is on the particulars");
assert(model.table1.rows.some(function (r) { return r.particular === "Ends" && r.value.indexOf("Closed and ground") >= 0; }),
  "Ends are closed and ground on the particulars");
assert(model.table1.rows.some(function (r) { return r.particular === "Quality grade" && r.value.indexOf("grade 2") >= 0; }),
  "Selected EN 15800 grade is on the particulars");
assert(findRow(model.table1, "e1").value.indexOf("≤") === 0, "Squareness e1 is stated for ground ends");
assert(findRow(model.table1, "e2").value.indexOf("≤") === 0, "Parallelism e2 is stated for ground ends");
assert(model.table1.rows.some(function (r) { return r.value.indexOf("EN 10270") >= 0; }),
  "Wire-diameter tolerance is referred to the material standard");

["L0", "Lc", "L1", "L2", "Ln", "s1", "s2", "sc", "τk0", "τk1", "τk2", "τkn", "τkc", "τzul", "G", "Rm", "R", "D", "w", "k", "Sa"].forEach(function (sym) {
  const found = findRow(model.table2, sym);
  assert(!!found && found.value !== "—" && found.value !== "", "Reference table includes " + sym, found && found.value);
});
assert(findRow(model.table2, "τkc").value.indexOf("N/mm²") >= 0, "Corrected stress at solid length is numeric");
assert(findRow(model.table2, "—") && findRow(model.table2, "—").particular === "Pocket diametral clearance"
  ? true
  : model.table2.rows.some(function (r) { return r.particular.indexOf("clearance") >= 0 && r.value.indexOf("1.500 mm") >= 0; }),
  "Diametral clearance is shown when it was supplied");
assert(model.table2.rows.some(function (r) { return r.value.indexOf("BS EN 13906-1") >= 0; }),
  "Reference table cites BS EN 13906-1");
assert(findRow(model.table2, "Lw").value.indexOf("mm") >= 0, "Wire length is on the reference table");
assert(model.table2.rows.some(function (r) { return r.particular.indexOf("mass") >= 0 && r.value.indexOf("g") >= 0; }),
  "Mass is on the reference table");
const al0 = findRow(model.table2, "AL0");
assert(al0 && al0.value.indexOf("not a limit") >= 0, "Indicative AL0 is kept off the acceptance limits when two loads are given");
assert(model.verificationNote.indexOf("transcribed") >= 0 || model.verificationNote.indexOf("not re-read") >= 0,
  "Drawing carries the verification caveat for Table 3 and aF");

const single = E.evaluateDesign(Object.assign({}, example, { L1: null, F1: null }));
single.materialName = example.materialName;
const one = Drawing.build(single, { grade: 1, date: "05 Nov 2026" });
const oneL0 = findRow(one.table1, "L0");
assert(oneL0.value.indexOf("REFERENCE ONLY") === -1, "One specified load does not mark L0 reference-only");
assert(oneL0.value.indexOf("±") >= 0, "One specified load tolerances L0 with AL0");
assert(one.grade === 1, "Grade 1 is carried onto the drawing");
assert(findRow(one.table1, "e1").value.indexOf("0.030 × L0") >= 0 || findRow(one.table1, "e1").value.indexOf("0.03") >= 0,
  "Grade 1 squareness factor is on the drawing");

const unground = Object.assign({}, example, { ends: "open", endsLabel: "Open, not ground" });
const plain = Drawing.build(unground, { grade: 3, date: "05 Nov 2026" });
assert(findRow(plain.table1, "e1").value.indexOf("Not applicable") >= 0, "Open ends omit squareness");
assert(plain.grade === 3, "Grade 3 is carried onto the drawing");

console.log("\nPDF bytes");
const built = Pdf.toUint8Array(example, { grade: 2, date: "05 Nov 2026", clearance: 1.5 });
const buf = Buffer.from(built.bytes);
assert(buf.slice(0, 4).toString("latin1") === "%PDF", "Export starts with a PDF header", buf.slice(0, 8).toString("latin1"));
assert(buf.length > 4000, "PDF is more than an empty shell", "bytes " + buf.length);
assertClose(built.doc.internal.pageSize.getWidth(), 420, "jsPDF page width is 420 mm");
assertClose(built.doc.internal.pageSize.getHeight(), 297, "jsPDF page height is 297 mm");
assert(built.doc.internal.getNumberOfPages() === 1, "Drawing is a single sheet");
assert(built.model.generalNote.indexOf("ASME Y14.5") >= 0, "PDF model still carries the ASME note");

[1, 2, 3].forEach(function (grade) {
  const out = Pdf.toUint8Array(example, { grade: grade, date: "05 Nov 2026" });
  assert(out.model.grade === grade && Buffer.from(out.bytes).slice(0, 4).toString("latin1") === "%PDF",
    "Grade " + grade + " produces a PDF");
});

if (process.env.WRITE_SAMPLE === "1") {
  const dest = path.join(__dirname, "..", "samples", "helical-compression-spring-a3-example.pdf");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  console.log("  WROTE " + dest);
}

console.log("\n" + passed + " passed, " + failed + " failed");
if (failed) {
  console.log("\nFailures:");
  failures.forEach(function (f) { console.log(f); });
  process.exit(1);
}
console.log("All drawing tests passed.");
