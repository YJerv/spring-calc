/**
 * Extract visible and hidden PDF text, including Flate-compressed streams.
 * Used to prove unpaid table values are absent from the file, not covered up.
 */
"use strict";

const zlib = require("zlib");

function unescapeLiteral(body) {
  let out = "";
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch !== "\\") {
      out += ch;
      continue;
    }
    const next = body[++i];
    if (next == null) break;
    if (next === "n") out += "\n";
    else if (next === "r") out += "\r";
    else if (next === "t") out += "\t";
    else if (next === "b") out += "\b";
    else if (next === "f") out += "\f";
    else if (next >= "0" && next <= "7") {
      let oct = next;
      for (let k = 0; k < 2 && i + 1 < body.length && body[i + 1] >= "0" && body[i + 1] <= "7"; k++) {
        oct += body[++i];
      }
      out += String.fromCharCode(parseInt(oct, 8));
    } else {
      out += next;
    }
  }
  return out;
}

function decodeHexString(hex) {
  const clean = hex.replace(/\s+/g, "");
  if (clean.length < 4) return "";
  const bytes = [];
  for (let i = 0; i + 1 < clean.length; i += 2) {
    bytes.push(parseInt(clean.slice(i, i + 2), 16));
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    let out = "";
    for (let i = 2; i + 1 < bytes.length; i += 2) {
      out += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
    }
    return out;
  }
  return Buffer.from(bytes).toString("latin1");
}

function stringsFromContent(content) {
  const found = [];
  const lit = /\((?:\\.|[^\\)])*\)/g;
  let m;
  while ((m = lit.exec(content))) {
    found.push(unescapeLiteral(m[0].slice(1, -1)));
  }
  const hex = /<([0-9A-Fa-f\s]+)>/g;
  while ((m = hex.exec(content))) {
    const text = decodeHexString(m[1]);
    if (text) found.push(text);
  }
  return found;
}

function inflateStream(raw) {
  const attempts = [raw];
  if (raw.length > 1) attempts.push(raw.slice(0, -1));
  if (raw.length > 2) attempts.push(raw.slice(0, -2));
  for (let i = 0; i < attempts.length; i++) {
    try {
      return zlib.inflateSync(attempts[i]);
    } catch (err) { /* try the next trim */ }
  }
  return raw;
}

function extractPdfText(bytes) {
  const src = Buffer.from(bytes).toString("latin1");
  const parts = [];
  const re = /stream\r?\n/g;
  let marker;
  while ((marker = re.exec(src))) {
    const start = marker.index + marker[0].length;
    const end = src.indexOf("endstream", start);
    if (end < 0) break;
    let raw = Buffer.from(src.slice(start, end), "latin1");
    while (raw.length && (raw[raw.length - 1] === 0x0a || raw[raw.length - 1] === 0x0d)) {
      raw = raw.slice(0, -1);
    }
    const dictStart = src.lastIndexOf("<<", marker.index);
    const dict = dictStart >= 0 ? src.slice(dictStart, marker.index) : "";
    const data = /FlateDecode/.test(dict) ? inflateStream(raw) : raw;
    parts.push(Buffer.isBuffer(data) ? data.toString("latin1") : String(data));
  }
  const content = parts.join("\n");
  return {
    text: stringsFromContent(content).join("\n"),
    content: content
  };
}

module.exports = { extractPdfText };
