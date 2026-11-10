#!/usr/bin/env node
/**
 * SC-001 theme choice, persistence rules, and contrast of the shared colours.
 * Run: node tests/test-theme.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const Theme = require(path.join(__dirname, "..", "js", "theme.js"));

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

function memoryStorage(initial) {
  const data = Object.assign({}, initial || {});
  return {
    getItem: function (key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem: function (key, value) { data[key] = String(value); }
  };
}

function lin(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map(function (ch) { return ch + ch; }).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a, b) {
  const hi = Math.max(luminance(a), luminance(b));
  const lo = Math.min(luminance(a), luminance(b));
  return (hi + 0.05) / (lo + 0.05);
}

function blockAfter(css, marker) {
  let from = 0;
  while (from < css.length) {
    const start = css.indexOf(marker, from);
    if (start < 0) return "";
    const between = css.slice(start + marker.length);
    const brace = between.match(/^\s*\{/);
    if (!brace) {
      from = start + marker.length;
      continue;
    }
    const open = start + marker.length + brace[0].length - 1;
    let depth = 0;
    for (let i = open; i < css.length; i++) {
      if (css[i] === "{") depth += 1;
      else if (css[i] === "}") {
        depth -= 1;
        if (depth === 0) return css.slice(open + 1, i);
      }
    }
    return "";
  }
  return "";
}

function variables(block) {
  const out = {};
  const re = /--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g;
  let m;
  while ((m = re.exec(block))) out["--" + m[1]] = m[2];
  return out;
}

console.log("Theme choice\n");

assert(Theme.KEY === "spring-calc-theme", "Theme is stored apart from the calculator state");
assert(Theme.normaliseTheme("light") === "light", "Light is a valid choice");
assert(Theme.normaliseTheme("dark") === "dark", "Dark is a valid choice");
assert(Theme.normaliseTheme("system") === "system", "System is a valid choice");
assert(Theme.normaliseTheme(null) === "system", "A missing choice follows the phone or browser");
assert(Theme.normaliseTheme("blue") === "system", "An unknown choice follows the phone or browser");

assert(Theme.resolvedTheme("light", true) === "light", "Light stays light when the phone is dark");
assert(Theme.resolvedTheme("dark", false) === "dark", "Dark stays dark when the phone is light");
assert(Theme.resolvedTheme("system", true) === "dark", "System follows a dark phone or browser");
assert(Theme.resolvedTheme("system", false) === "light", "System follows a light phone or browser");
assert(Theme.resolvedTheme("nope", true) === "dark", "An unknown stored value still follows the system");

const store = memoryStorage();
assert(Theme.readChoice(store) === "system", "Empty storage starts on System");
Theme.writeChoice(store, "dark");
assert(store.getItem(Theme.KEY) === "dark", "A manual choice is written to storage");
assert(Theme.readChoice(store) === "dark", "A saved dark choice is read back");
Theme.writeChoice(store, "light");
assert(Theme.resolvedTheme(Theme.readChoice(store), true) === "light",
  "A saved light choice is not replaced when the system is dark");
Theme.writeChoice(store, "system");
assert(Theme.resolvedTheme(Theme.readChoice(store), true) === "dark",
  "Choosing System again follows a later system change");

const doc = { documentElement: { attrs: {}, setAttribute: function (k, v) { this.attrs[k] = v; } } };
const applied = Theme.apply(doc, "dark", false);
assert(applied.choice === "dark" && applied.resolved === "dark", "Apply records both the choice and the resolved theme");
assert(doc.documentElement.attrs["data-theme"] === "dark", "The saved choice is on the document");
assert(doc.documentElement.attrs["data-resolved"] === "dark", "The resolved theme is on the document");
Theme.apply(doc, "system", false);
assert(doc.documentElement.attrs["data-theme"] === "system" && doc.documentElement.attrs["data-resolved"] === "light",
  "System on a light phone resolves to light without dropping the System choice");

console.log("\nContrast of shared colours\n");

const css = fs.readFileSync(path.join(__dirname, "..", "css", "app.css"), "utf8");
const light = variables(blockAfter(css, ":root"));
const dark = Object.assign({}, light, variables(blockAfter(css, 'html[data-resolved="dark"]')));

const textPairs = [
  ["--ink", "--paper"],
  ["--ink", "--card"],
  ["--ink", "--surface"],
  ["--muted", "--paper"],
  ["--muted", "--card"],
  ["--muted", "--surface"],
  ["--muted", "--surface-2"],
  ["--navy-mid", "--card"],
  ["--navy-mid", "--surface"],
  ["--on-navy", "--navy"],
  ["--pass-ink", "--pass-bg"],
  ["--warn-ink", "--warn-bg"],
  ["--fail-ink", "--fail-bg"],
  ["--chart-ink", "--chart-paper"],
  ["--chart-muted", "--chart-paper"],
  ["--series-l0", "--chart-paper"],
  ["--series-l1", "--chart-paper"],
  ["--series-l2", "--chart-paper"],
  ["--series-ln", "--chart-paper"],
  ["--series-lc", "--chart-paper"],
  ["--btn-secondary-fg", "--surface"],
  ["--ink", "--zebra"],
  ["--ink", "--best-row"],
  ["--navy", "--gold"]
];

function checkPairs(name, tokens) {
  textPairs.forEach(function (pair) {
    const fg = tokens[pair[0]];
    const bg = tokens[pair[1]];
    assert(!!fg && !!bg, name + " defines " + pair[0] + " and " + pair[1], fg + " / " + bg);
    if (!fg || !bg) return;
    const ratio = contrast(fg, bg);
    assert(ratio >= 4.5, name + " " + pair[0] + " on " + pair[1] + " is at least 4.5:1", ratio.toFixed(2));
  });
  const border = contrast(tokens["--line"], tokens["--card"]);
  assert(border >= 3, name + " borders are at least 3:1 on cards", border.toFixed(2));
}

checkPairs("Light", light);
checkPairs("Dark", dark);

assert(light["--paper"] === "#fafbfc", "Light page background is near-white");
assert(light["--card"] === "#ffffff", "Light cards are white");
assert(light["--chart-paper"] === "#ffffff", "Light charts sit on white");
assert(dark["--chart-paper"] !== light["--chart-paper"], "Dark charts are not left on the light paper colour");

console.log("\nSettings markup and graph labels\n");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
assert(html.indexOf('id="btnSettings"') >= 0 && html.indexOf("aria-label=\"Settings\"") >= 0,
  "A Settings button is labelled for assistive technology");
assert(html.indexOf("settings-gear") >= 0, "The Settings control uses the round gear button");
assert(html.indexOf('value="system"') >= 0 && html.indexOf('value="light"') >= 0 && html.indexOf('value="dark"') >= 0,
  "Settings offers System, Light and Dark");
assert(html.indexOf("Further settings") >= 0, "The settings screen leaves room for later settings");
assert(html.indexOf("Colour supports the labels") >= 0,
  "The coil-diameter chart hint does not rely on colour names alone");

const charts = fs.readFileSync(path.join(__dirname, "..", "js", "charts.js"), "utf8");
assert(charts.indexOf('"paint-order": "stroke"') === -1,
  "Results-graph text has no paper-coloured outline (SC-003)");
assert(charts.indexOf("var(--series-l0)") >= 0 && charts.indexOf("var(--chart-ink)") >= 0,
  "Graph series and axis colours come from the shared theme tokens");

console.log("\n" + passed + " passed, " + failed + " failed");
if (failed) {
  console.log("\nFailures:");
  failures.forEach(function (f) { console.log(f); });
  process.exit(1);
}
console.log("All theme tests passed.");
