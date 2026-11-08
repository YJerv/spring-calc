#!/usr/bin/env node
/**
 * SC-008 Digital Asset Links. This repo must not publish a guessed fingerprint.
 * Run: node tests/test-assetlinks.js
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

function walk(dir, out) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (entry) {
    if (entry.name === ".git" || entry.name === "node_modules") return;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  });
  return out;
}

const root = path.join(__dirname, "..");
const files = walk(root, []);
const statements = files.filter(function (file) {
  return path.basename(file) === "assetlinks.json";
});
assert(statements.length === 0,
  "No assetlinks.json is shipped from this project path");

const entitlement = fs.readFileSync(path.join(root, "js", "entitlement.js"), "utf8");
assert(entitlement.indexOf("uk.co.yjerv.springcalc") >= 0,
  "The recorded package name is uk.co.yjerv.springcalc");

const sha = /[0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){31}/;
const suspects = files.filter(function (file) {
  if (file.indexOf(path.join("tests", "test-assetlinks.js")) >= 0) return false;
  if (file.indexOf(path.sep + "vendor" + path.sep) >= 0) return false;
  const text = fs.readFileSync(file);
  if (text.includes(0)) return false;
  return sha.test(text.toString("utf8"));
});
assert(suspects.length === 0,
  "No Play signing SHA-256 fingerprint is stored in this repo",
  suspects.map(function (file) { return path.relative(root, file); }).join(", "));

console.log("\n" + passed + " passed, " + failed + " failed");
if (failed) {
  console.log("\nFailures:");
  failures.forEach(function (f) { console.log(f); });
  process.exit(1);
}
console.log("All asset-link checks passed.");
