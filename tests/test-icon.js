#!/usr/bin/env node
/**
 * SC-007 Concept A icon, used as supplied.
 * Run: node tests/test-icon.js
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

const root = path.join(__dirname, "..");
const svg = fs.readFileSync(path.join(root, "icons", "icon.svg"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

assert(svg.indexOf('fill="#202630"') >= 0, "Icon background is the supplied #202630");
assert(svg.indexOf('stroke="#2457C5"') >= 0, "Foreground bands stay #2457C5");
assert(svg.indexOf('stroke="#DCE2EA"') >= 0 && svg.indexOf('stroke-opacity=".55"') >= 0,
  "The pale bands stay #DCE2EA at 0.55 opacity");
assert(svg.indexOf("scale(0.85)") >= 0, "The supplied 0.85 scale is unchanged");
assert(svg.indexOf("#0b1f33") === -1 && svg.indexOf("#c4a35a") === -1,
  "The previous navy and gold mark is gone");
assert(html.indexOf('href="icons/icon.svg"') >= 0, "The favicon is the SVG icon");
assert(html.indexOf('href="icons/icon-192.png"') >= 0, "The Apple touch icon is the 192 PNG");

manifest.icons.forEach(function (icon) {
  assert(icon.purpose === "any", icon.src + " is purpose any, so the full square is not masked");
  const buf = fs.readFileSync(path.join(root, icon.src));
  if (icon.src.endsWith(".png")) {
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    const expected = icon.src.indexOf("512") >= 0 ? 512 : 192;
    assert(w === expected && h === expected, icon.src + " is " + expected + " px", w + "x" + h);
  }
});

const android = fs.readdirSync(root).some(function (name) {
  return name === "android" || name === "twa" || name === "app";
});
assert(android === false, "This repo has no Android or TWA project to rebuild");

console.log("\n" + passed + " passed, " + failed + " failed");
if (failed) {
  console.log("\nFailures:");
  failures.forEach(function (f) { console.log(f); });
  process.exit(1);
}
console.log("All icon tests passed.");
