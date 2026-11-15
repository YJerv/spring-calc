/**
 * SVG charts and the scaled side-view spring diagram.
 */
(function (root) {
  "use strict";
  var E = root.SpringEngine;
  if (!E && typeof require === "function") {
    E = require("./engine.js");
  }

  function el(tag, attrs, children) {
    var a = "";
    Object.keys(attrs || {}).forEach(function (k) {
      if (attrs[k] == null || attrs[k] === false) return;
      a += " " + k + "=\"" + String(attrs[k]).replace(/"/g, "&quot;") + "\"";
    });
    var inner = (children || []).join("");
    return "<" + tag + a + ">" + inner + "</" + tag + ">";
  }

  function empty(tag, attrs) {
    var a = "";
    Object.keys(attrs || {}).forEach(function (k) {
      if (attrs[k] == null || attrs[k] === false) return;
      a += " " + k + "=\"" + String(attrs[k]).replace(/"/g, "&quot;") + "\"";
    });
    return "<" + tag + a + " />";
  }

  function txt(x) {
    return String(x)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function travelPercent(design, L) {
    if (L == null || !isFinite(L) || !(design.sc > 0)) return null;
    return (100 * (design.L0 - L)) / design.sc;
  }

  function stressAtLoad(design, F) {
    if (F == null || !isFinite(F)) return null;
    if (!(F > 0)) return 0;
    if (design.Fmax > 0 && isFinite(design.tauK)) return design.tauK * (F / design.Fmax);
    return null;
  }

  function loadGraphStations(design) {
    var stations = [
      { id: "L0", L: design.L0, F: 0, colour: "var(--series-l0)" }
    ];
    if (design.L1 != null && design.F1 != null) {
      stations.push({ id: "L1", L: design.L1, F: design.F1, colour: "var(--series-l1)" });
    }
    if (design.L2 != null && design.F2 != null) {
      stations.push({ id: "L2", L: design.L2, F: design.F2, colour: "var(--series-l2)" });
    }
    if (design.Ln != null && design.Fn != null) {
      stations.push({ id: "Ln", L: design.Ln, F: design.Fn, colour: "var(--series-ln)" });
    }
    if (design.Lc != null && design.Fc != null) {
      stations.push({ id: "Lc", L: design.Lc, F: design.Fc, colour: "var(--series-lc)" });
    }
    stations.forEach(function (s) {
      s.travelPct = travelPercent(design, s.L);
      s.tauK = stressAtLoad(design, s.F);
    });
    return stations.filter(function (s) {
      return s.L != null && s.F != null && isFinite(s.L) && isFinite(s.F);
    });
  }

  function renderLoadGraph(svg, design) {
    var W = 390;
    var H = 360;
    var pad = { l: 58, r: 14, t: 26, b: 102 };
    var L0 = design.L0;
    var Lc = design.Lc;
    var span = Math.max(L0 - Lc, 1);
    var Lleft = L0;
    var Lright = Lc - 0.08 * span;
    var stations = loadGraphStations(design);
    var Ftop = 1;
    stations.forEach(function (s) {
      if (s.F > Ftop) Ftop = s.F;
    });
    Ftop = Ftop * 1.16 || 1;

    function xOf(L) {
      return pad.l + ((Lleft - L) / (Lleft - Lright)) * (W - pad.l - pad.r);
    }
    function yOf(F) {
      return H - pad.b - (F / Ftop) * (H - pad.t - pad.b);
    }

    var parts = [];
    parts.push(empty("rect", { x: 0, y: 0, width: W, height: H, fill: "var(--chart-paper)" }));

    parts.push(empty("line", {
      x1: pad.l, y1: pad.t, x2: pad.l, y2: H - pad.b,
      stroke: "var(--chart-ink)", "stroke-width": 1.2
    }));
    parts.push(empty("line", {
      x1: pad.l, y1: H - pad.b, x2: W - pad.r, y2: H - pad.b,
      stroke: "var(--chart-ink)", "stroke-width": 1.2
    }));
    parts.push(el("text", {
      x: 12, y: 16, fill: "var(--chart-ink)", "font-size": 12,
      "font-family": "ui-sans-serif, system-ui, sans-serif", "font-weight": 600
    }, ["Load F (N)"]));
    parts.push(el("text", {
      x: pad.l + (W - pad.l - pad.r) / 2, y: H - 14, fill: "var(--chart-ink)", "font-size": 12,
      "text-anchor": "middle",
      "font-family": "ui-sans-serif, system-ui, sans-serif", "font-weight": 600
    }, ["Deflection, S"]));

    var x0 = xOf(L0);
    var y0 = yOf(0);
    var xc = xOf(Lc);
    var yc = yOf(design.Fc);
    function ySpringAt(L) {
      var denom = L0 - Lc;
      var t = denom !== 0 ? (L0 - L) / denom : 0;
      return y0 + t * (yc - y0);
    }
    parts.push(empty("line", {
      x1: x0, y1: y0, x2: xc, y2: yc,
      stroke: "var(--chart-ink)", "stroke-width": 2
    }));

    function labelText(attrs, children) {
      attrs = Object.assign({
        "font-family": "ui-sans-serif, system-ui, sans-serif"
      }, attrs);
      return el("text", attrs, children);
    }

    var loaded = stations.filter(function (s) { return s.id !== "L0"; })
      .slice()
      .sort(function (a, b) { return a.F - b.F; });

    loaded.forEach(function (s) {
      var x = xOf(s.L);
      var y = yOf(s.F);
      parts.push(empty("line", {
        x1: pad.l, y1: y, x2: x, y2: y,
        stroke: s.colour, "stroke-width": 1.15, opacity: 0.95
      }));
    });

    /* Side by side on the load line when the pair fits there without meeting
       the spring. Otherwise the percent sits above the line and the corrected
       stress sits below it. If that split pair would cross the axis, both
       values share one line in the open part of the plot. Every station uses
       the same arrangement. */
    var axisY = H - pad.b;
    var labelFont = 12;
    /* System UI at 12px draws about 13.1px above the baseline and 3.8px below.
       The gap keeps that ink off the load line. */
    var labelAscent = 13.1;
    var labelDescent = 3.8;
    var labelH = labelAscent + labelDescent;
    var labelGap = 4;
    function dualBox(text, left, top) {
      var width = String(text).length * labelFont * 0.6;
      return {
        x: left, y: top, w: width, h: labelH,
        baseline: top + labelAscent, cx: left + width / 2, text: text
      };
    }
    function boxesHit(a, b, padPx) {
      var p = padPx || 0;
      return a.x < b.x + b.w + p && a.x + a.w + p > b.x &&
        a.y < b.y + b.h + p && a.y + a.h + p > b.y;
    }
    function hitsSpring(b) {
      var steps = 64;
      var i;
      for (i = 0; i <= steps; i++) {
        var t = i / steps;
        var sx = x0 + t * (xc - x0);
        var sy = y0 + t * (yc - y0);
        if (sx >= b.x - 3 && sx <= b.x + b.w + 3 && sy >= b.y - 3 && sy <= b.y + b.h + 3) return true;
      }
      return false;
    }
    var titleBox = labelBox("Load F (N)", 12, 16, labelFont, "start");
    function blocked(b, placed) {
      if (b.x < pad.l + 2 || b.y < 2 || b.x + b.w > W - 2 || b.y + b.h > axisY - 2) return true;
      if (hitsSpring(b) || boxesHit(b, titleBox, 2)) return true;
      var i;
      for (i = 0; i < placed.length; i++) {
        if (boxesHit(b, placed[i], 2)) return true;
      }
      return false;
    }
    function findBox(text, top, preferCx, placed) {
      var width = String(text).length * labelFont * 0.6;
      var best = null;
      var left;
      for (left = pad.l + 2; left <= W - 2 - width; left += 2) {
        var b = dualBox(text, left, top);
        if (blocked(b, placed)) continue;
        var dist = Math.abs(b.cx - preferCx);
        if (!best || dist < best.dist) best = { box: b, dist: dist };
      }
      return best ? best.box : null;
    }
    function stationTexts(s) {
      return {
        pct: s.travelPct == null ? "—" : E.fmt(s.travelPct, 1) + " %",
        tau: s.tauK == null ? "" : "τk " + E.fmt(s.tauK, 0) + " MPa"
      };
    }
    function trySplit() {
      var placed = [];
      var specs = [];
      var ordered = loaded.slice().sort(function (a, b) { return b.F - a.F; });
      var i;
      for (i = 0; i < ordered.length; i++) {
        var s = ordered[i];
        var texts = stationTexts(s);
        if (!texts.tau) return null;
        var x = xOf(s.L);
        var y = yOf(s.F);
        var tauW = texts.tau.length * labelFont * 0.6;
        var pctW = texts.pct.length * labelFont * 0.6;
        var tauBox = findBox(texts.tau, y + labelGap, x + 6 + tauW / 2, placed);
        var pctBox = tauBox && findBox(texts.pct, y - labelGap - labelH,
          Math.min((pad.l + x) / 2, x - 6 - pctW / 2), placed.concat([tauBox]));
        if (!tauBox || !pctBox) return null;
        placed.push(tauBox, pctBox);
        specs.push({ s: s, y: y, pct: pctBox, tau: tauBox, layout: "split" });
      }
      return specs.length ? specs : null;
    }
    function tryRow(above, onSegment) {
      var placed = [];
      var specs = [];
      var ordered = loaded.slice().sort(function (a, b) { return b.F - a.F; });
      var inner = 8;
      var i;
      for (i = 0; i < ordered.length; i++) {
        var s = ordered[i];
        var texts = stationTexts(s);
        if (!texts.tau) return null;
        var x = xOf(s.L);
        var y = yOf(s.F);
        var pctW = texts.pct.length * labelFont * 0.6;
        var tauW = texts.tau.length * labelFont * 0.6;
        var pairW = pctW + inner + tauW;
        var top = above ? y - labelGap - labelH : y + labelGap;
        var best = null;
        var leftMax = onSegment ? Math.min(W - 2 - pairW, x - 4 - pairW) : W - 2 - pairW;
        var left;
        for (left = pad.l + 2; left <= leftMax; left += 2) {
          var pctBox = dualBox(texts.pct, left, top);
          var tauBox = dualBox(texts.tau, left + pctW + inner, top);
          if (blocked(pctBox, placed) || blocked(tauBox, placed.concat([pctBox]))) continue;
          var dist = Math.abs(left + pairW / 2 - (pad.l + x) / 2);
          if (!best || dist < best.dist) best = { pct: pctBox, tau: tauBox, dist: dist };
        }
        if (!best) return null;
        placed.push(best.pct, best.tau);
        specs.push({ s: s, y: y, pct: best.pct, tau: best.tau, layout: "row" });
      }
      return specs.length ? specs : null;
    }
    var dualSpecs = tryRow(true, true) || trySplit() || tryRow(true, false) || tryRow(false, false) || [];
    function r1(n) { return Math.round(n * 10) / 10; }
    dualSpecs.forEach(function (spec) {
      function paint(part, box, weight) {
        parts.push(labelText({
          x: box.cx, y: r1(box.baseline), "text-anchor": "middle", fill: spec.s.colour,
          "font-size": labelFont, "font-weight": weight,
          "data-dual": "1", "data-part": part, "data-station": spec.s.id,
          "data-layout": spec.layout, "data-line": r1(spec.y),
          "data-box": [r1(box.x), r1(box.y), r1(box.w), r1(box.h)].join(",")
        }, [txt(box.text)]));
      }
      paint("pct", spec.pct, 700);
      paint("tau", spec.tau, 650);
    });

    var markerGeom = [];
    stations.forEach(function (s) {
      var x = xOf(s.L);
      var yLoad = yOf(s.F);
      var ySpring = ySpringAt(s.L);
      var yTop = ySpring;
      var yAxis = H - pad.b;
      if (yAxis - yTop > 1) {
        parts.push(empty("line", {
          x1: x, y1: yTop, x2: x, y2: yAxis,
          stroke: s.colour, "stroke-width": 1, "stroke-dasharray": "3 3", opacity: 0.8
        }));
        markerGeom.push({
          id: s.id,
          x: x,
          yTop: yTop,
          ySpring: ySpring,
          yLoad: yLoad,
          yAxis: yAxis
        });
      }
      parts.push(empty("circle", {
        cx: x, cy: yLoad, r: 4.2, fill: s.colour, stroke: "var(--chart-paper)", "stroke-width": 1.4
      }));
    });
    svg._markerGeom = markerGeom;

    var yLabelItems = [{ F: 0, colour: "var(--series-l0)", id: "F0" }].concat(loaded.map(function (s) {
      return { F: s.F, colour: s.colour, id: s.id };
    }));
    yLabelItems.sort(function (a, b) { return a.F - b.F; });
    var lastY = Infinity;
    yLabelItems.forEach(function (item) {
      var y = yOf(item.F);
      if (lastY - y < 16) y = lastY - 16;
      lastY = y;
      var label = E.fmt(item.F, item.F >= 100 ? 0 : 1);
      parts.push(el("text", {
        x: pad.l - 7, y: y + 4,
        "text-anchor": "end",
        "font-size": 12,
        fill: item.colour,
        "font-weight": 650,
        "font-family": "ui-sans-serif, system-ui, sans-serif"
      }, [txt(label)]));
    });

    var xSorted = stations.slice().sort(function (a, b) { return b.L - a.L; });
    xSorted.forEach(function (s, i) {
      var x = xOf(s.L);
      var row = i % 2;
      var ySym = H - pad.b + 18 + row * 32;
      var yVal = ySym + 16;
      var xAnchor = x;
      if (i === 0 && x < pad.l + 16) xAnchor = pad.l;
      if (i === xSorted.length - 1 && x > W - pad.r - 16) xAnchor = W - pad.r;
      var anchor = (i === 0 && xAnchor === pad.l) ? "start"
        : (i === xSorted.length - 1 && xAnchor === W - pad.r) ? "end"
        : "middle";
      parts.push(el("text", {
        x: xAnchor, y: ySym, "text-anchor": anchor, fill: s.colour,
        "font-size": 12, "font-weight": 700,
        "font-family": "ui-sans-serif, system-ui, sans-serif"
      }, [txt(s.id)]));
      parts.push(el("text", {
        x: xAnchor, y: yVal, "text-anchor": anchor, fill: "var(--chart-muted)",
        "font-size": 12,
        "font-family": "ui-sans-serif, system-ui, sans-serif"
      }, [txt(E.fmt(s.L, 1) + " mm")]));
    });

    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Load against length for the designed spring, with compression and corrected stress at each station");
    svg.innerHTML = parts.join("");
  }

  function renderTradeoff(svg, rows, currentD) {
    var W = 390;
    var H = 170;
    var pad = { l: 42, r: 42, t: 22, b: 28 };
    if (!rows || !rows.length) {
      svg.innerHTML = "";
      return;
    }
    var Dmin = rows[0].D;
    var Dmax = rows[rows.length - 1].D;
    var pctMax = 130;
    var LcMax = 0;
    var L2 = rows[0].LmaxLoad;
    rows.forEach(function (r) {
      if (r.Lc > LcMax) LcMax = r.Lc;
    });
    LcMax = Math.max(LcMax, L2 || 0) * 1.15 || 1;

    function xOf(D) {
      return pad.l + ((D - Dmin) / Math.max(Dmax - Dmin, 1e-9)) * (W - pad.l - pad.r);
    }
    function yPct(p) {
      return pad.t + (1 - p / pctMax) * (H - pad.t - pad.b);
    }
    function yLc(L) {
      return pad.t + (1 - L / LcMax) * (H - pad.t - pad.b);
    }

    var parts = [empty("rect", { x: 0, y: 0, width: W, height: H, fill: "var(--chart-paper)" })];
    var span = E.passingDiameterSpan ? E.passingDiameterSpan(rows, currentD != null ? currentD : Dmax) : null;
    if (span && span.failBands) {
      span.failBands.forEach(function (band) {
        var x1 = xOf(band.from);
        var x2 = xOf(band.to);
        if (x2 < x1) { var swap = x1; x1 = x2; x2 = swap; }
        if (x2 - x1 < 0.4) return;
        parts.push(empty("rect", {
          x: x1.toFixed(1), y: pad.t, width: (x2 - x1).toFixed(1), height: H - pad.t - pad.b,
          fill: "var(--fail)", opacity: 0.18, "data-fail-band": "1"
        }));
      });
    }
    var stressLabelX = 13;
    var stressLabelY = pad.t + (H - pad.t - pad.b) / 2;
    parts.push(el("text", {
      x: stressLabelX,
      y: stressLabelY,
      fill: "var(--series-l2)",
      "font-size": 9,
      "font-weight": 700,
      "text-anchor": "middle",
      "font-family": "ui-sans-serif, system-ui, sans-serif",
      transform: "rotate(-90 " + stressLabelX + " " + stressLabelY + ")"
    }, ["Stress % of allowable"]));
    parts.push(el("text", {
      x: W - pad.r, y: 14, fill: "var(--series-l0)", "font-size": 9, "font-weight": 700,
      "text-anchor": "end",
      "font-family": "ui-sans-serif, system-ui, sans-serif"
    }, ["Solid length Lc"]));

    var ptsPct = [];
    var ptsLc = [];
    rows.forEach(function (r) {
      ptsPct.push(xOf(r.D).toFixed(1) + "," + yPct(Math.min(r.pctAllow, pctMax)).toFixed(1));
      ptsLc.push(xOf(r.D).toFixed(1) + "," + yLc(r.Lc).toFixed(1));
    });
    parts.push(empty("polyline", {
      points: ptsPct.join(" "), fill: "none", stroke: "var(--series-l2)", "stroke-width": 1.8
    }));
    parts.push(empty("polyline", {
      points: ptsLc.join(" "), fill: "none", stroke: "var(--series-l0)", "stroke-width": 1.8
    }));
    if (L2) {
      parts.push(empty("line", {
        x1: pad.l, y1: yLc(L2), x2: W - pad.r, y2: yLc(L2),
        stroke: "var(--series-lc)", "stroke-width": 1, "stroke-dasharray": "4 3"
      }));
      parts.push(el("text", {
        x: W - pad.r, y: yLc(L2) - 4, "text-anchor": "end", fill: "var(--series-lc)",
        "font-size": 8, "font-family": "ui-sans-serif, system-ui, sans-serif"
      }, ["L2"]));
    }
    parts.push(empty("line", {
      x1: pad.l, y1: yPct(100), x2: W - pad.r, y2: yPct(100),
      stroke: "var(--series-l2)", "stroke-width": 1, "stroke-dasharray": "2 3", opacity: 0.6
    }));
    if (currentD != null) {
      parts.push(empty("line", {
        x1: xOf(currentD), y1: pad.t, x2: xOf(currentD), y2: H - pad.b,
        stroke: "var(--chart-ink)", "stroke-width": 1
      }));
    }
    parts.push(el("text", {
      x: W / 2, y: H - 8, "text-anchor": "middle", fill: "var(--chart-muted)", "font-size": 9,
      "font-family": "ui-sans-serif, system-ui, sans-serif"
    }, ["Mean coil diameter D (mm)"]));

    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.innerHTML = parts.join("");
  }

  function labelBox(text, x, baseline, fontSize, anchor) {
    var width = text.length * fontSize * 0.6;
    var ascent = fontSize * 0.85;
    var descent = fontSize * 0.3;
    var left = anchor === "end" ? x - width : (anchor === "middle" ? x - width / 2 : x);
    return { x: left, y: baseline - ascent, w: width, h: ascent + descent };
  }

  function renderSpringDiagram(svg, design) {
    var W = 390;
    var H = 456;
    var margin = { l: 74, r: 36, t: 36, b: 92 };
    var De = design.De;
    var d = design.d;
    var L0 = design.L0;
    var n = design.n;
    var nt = design.nt;
    var innerW = W - margin.l - margin.r;
    var innerH = H - margin.t - margin.b;
    var scale = Math.min(innerW / Math.max(De, 1), innerH / Math.max(L0, 1));
    var cx = margin.l + innerW / 2;
    var yTop = margin.t + (innerH - L0 * scale) / 2;
    var stroke = Math.max(1.2, d * scale);

    var parts = [empty("rect", { x: 0, y: 0, width: W, height: H, fill: "var(--chart-paper)" })];

    /* Ground seats */
    var half = (De * scale) / 2;
    parts.push(empty("line", {
      x1: cx - half, y1: yTop, x2: cx + half, y2: yTop,
      stroke: "var(--chart-ink)", "stroke-width": 2
    }));
    parts.push(empty("line", {
      x1: cx - half, y1: yTop + L0 * scale, x2: cx + half, y2: yTop + L0 * scale,
      stroke: "var(--chart-ink)", "stroke-width": 2
    }));

    var turns = Math.max(nt, 2);
    var steps = Math.max(80, Math.round(turns * 48));
    var front = [];
    var back = [];
    var dead = Math.max(nt - n, 0);
    function yAtTurn(t) {
      /* Closed ends: first and last inactive turns take up roughly d each. */
      if (dead >= 2) {
        var endRise = d;
        var midRise = L0 - 2 * endRise;
        if (t <= 1) return (t / 1) * endRise;
        if (t >= nt - 1) return endRise + midRise + ((t - (nt - 1)) / 1) * endRise;
        return endRise + ((t - 1) / Math.max(n, 1e-9)) * midRise;
      }
      return (t / turns) * L0;
    }

    for (var i = 0; i <= steps; i++) {
      var t = (i / steps) * turns;
      var ang = t * 2 * Math.PI;
      var x = cx + (design.D * 0.5 * scale) * Math.sin(ang);
      var y = yTop + yAtTurn(t) * scale;
      var z = Math.cos(ang);
      var pt = x.toFixed(2) + "," + y.toFixed(2);
      if (z >= 0) {
        if (back.length) {
          parts.push(empty("polyline", {
            points: back.join(" "), fill: "none",
            stroke: "var(--coil-back)", "stroke-width": stroke,
            "stroke-linecap": "round", "stroke-linejoin": "round"
          }));
          back = [];
        }
        front.push(pt);
      } else {
        if (front.length) {
          parts.push(empty("polyline", {
            points: front.join(" "), fill: "none",
            stroke: "var(--chart-ink)", "stroke-width": stroke,
            "stroke-linecap": "round", "stroke-linejoin": "round"
          }));
          front = [];
        }
        back.push(pt);
      }
    }
    if (back.length) {
      parts.push(empty("polyline", {
        points: back.join(" "), fill: "none",
        stroke: "var(--coil-back)", "stroke-width": stroke,
        "stroke-linecap": "round", "stroke-linejoin": "round"
      }));
    }
    if (front.length) {
      parts.push(empty("polyline", {
        points: front.join(" "), fill: "none",
        stroke: "var(--chart-ink)", "stroke-width": stroke,
        "stroke-linecap": "round", "stroke-linejoin": "round"
      }));
    }

    /* L0 dimension */
    var dimX = margin.l - 28;
    parts.push(empty("line", {
      x1: dimX, y1: yTop, x2: dimX, y2: yTop + L0 * scale,
      stroke: "var(--series-ln)", "stroke-width": 1
    }));
    parts.push(empty("line", {
      x1: dimX - 6, y1: yTop, x2: dimX + 6, y2: yTop,
      stroke: "var(--series-ln)", "stroke-width": 1
    }));
    parts.push(empty("line", {
      x1: dimX - 6, y1: yTop + L0 * scale, x2: dimX + 6, y2: yTop + L0 * scale,
      stroke: "var(--series-ln)", "stroke-width": 1
    }));
    parts.push(el("text", {
      x: dimX - 10, y: yTop + (L0 * scale) / 2,
      transform: "rotate(-90 " + (dimX - 10) + " " + (yTop + (L0 * scale) / 2) + ")",
      fill: "var(--series-ln)", "font-size": 11, "text-anchor": "middle", "font-weight": 600,
      "font-family": "ui-sans-serif, system-ui, sans-serif"
    }, ["L0 = " + E.fmt(L0, 2) + " mm"]));

    /* De dimension */
    var yDe = yTop + L0 * scale + 22;
    parts.push(empty("line", {
      x1: cx - half, y1: yDe, x2: cx + half, y2: yDe,
      stroke: "var(--series-l0)", "stroke-width": 1
    }));
    parts.push(empty("line", {
      x1: cx - half, y1: yDe - 5, x2: cx - half, y2: yDe + 5,
      stroke: "var(--series-l0)", "stroke-width": 1
    }));
    parts.push(empty("line", {
      x1: cx + half, y1: yDe - 5, x2: cx + half, y2: yDe + 5,
      stroke: "var(--series-l0)", "stroke-width": 1
    }));
    var deText = "De = " + E.fmt(De, 2) + " mm";
    var deBaseline = yDe + 16;
    var deBox = labelBox(deText, cx, deBaseline, 11, "middle");
    parts.push(el("text", {
      x: cx, y: deBaseline, "text-anchor": "middle", fill: "var(--series-l0)",
      "font-size": 11, "font-weight": 600,
      "font-family": "ui-sans-serif, system-ui, sans-serif",
      "data-box": [deBox.x, deBox.y, deBox.w, deBox.h].map(function (n) { return n.toFixed(1); }).join(",")
    }, [deText]));

    parts.push(el("text", {
      x: W - margin.r, y: 18, "text-anchor": "end", fill: "var(--chart-muted)",
      "font-size": 10,
      "font-family": "ui-sans-serif, system-ui, sans-serif"
    }, ["d = " + E.fmt(d, 2) + " mm   ·   " + (design.wind === "left" ? "LH" : "RH") + " wound"]));
    var capText = "Side view at free length  ·  scale " + E.fmt(scale, 2) + " px/mm";
    var capBaseline = H - 18;
    var capBox = labelBox(capText, W / 2, capBaseline, 10, "middle");
    parts.push(el("text", {
      x: W / 2, y: capBaseline, "text-anchor": "middle", fill: "var(--chart-muted)",
      "font-size": 10,
      "font-family": "ui-sans-serif, system-ui, sans-serif",
      "data-box": [capBox.x, capBox.y, capBox.w, capBox.h].map(function (n) { return n.toFixed(1); }).join(",")
    }, [capText]));

    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Scaled side view of the spring at free length");
    svg.innerHTML = parts.join("");
  }

  function dutyIllustration() {
    /* 390 user units is the design width the coil strokes are sized for. */
    var W = 390;
    var pad = { l: 48, r: 14, t: 26 };
    var plotW = W - pad.l - pad.r;
    var plotH = 98;
    var ox = pad.l;
    var oy = 124;
    var radius = 16;
    var frontW = 5.7;
    var backW = 3.75;
    var turns = 9;
    var gap = 6;
    var xFix = 368;
    var font = "ui-sans-serif, system-ui, sans-serif";
    var labelW = {
      "Load, F": 50,
      "Deflection, S": 86,
      "L0": 20,
      "L1": 20,
      "L2": 20,
      "L1 / F1": 48,
      "L2 / F2": 48
    };
    var ascent = 10;
    var descent = 3;
    function r1(n) { return Math.round(n * 10) / 10; }
    function xOf(u) { return ox + u * plotW; }
    function yOf(f) { return oy - f * plotH; }

    var u1 = 0.36;
    var u2 = 0.68;
    var x1 = xOf(u1);
    var y1 = yOf(u1);
    var x2 = xOf(u2);
    var y2 = yOf(u2);
    var cy2 = 172;
    var cy1 = 218;
    var cy0 = 264;
    var H = cy0 + radius + frontW + 8;

    var parts = [];
    parts.push(empty("rect", {
      x: 0, y: 0, width: W, height: H, fill: "var(--chart-paper)"
    }));
    parts.push(empty("line", {
      x1: r1(ox), y1: pad.t, x2: r1(ox), y2: r1(oy),
      stroke: "var(--chart-ink)", "stroke-width": 1.2, "data-axis": "y"
    }));
    parts.push(empty("line", {
      x1: r1(ox), y1: r1(oy), x2: W - pad.r, y2: r1(oy),
      stroke: "var(--chart-ink)", "stroke-width": 1.2, "data-axis": "x"
    }));

    function addLabel(text, x, baseline, anchor, fill) {
      var w = labelW[text];
      var left = anchor === "end" ? x - w : anchor === "middle" ? x - w / 2 : x;
      var box = { x: r1(left), y: r1(baseline - ascent), w: w, h: ascent + descent };
      parts.push(el("text", {
        x: r1(x), y: r1(baseline), fill: fill, "font-size": 11, "font-weight": 700,
        "text-anchor": anchor, "font-family": font,
        "data-box": box.x + "," + box.y + "," + box.w + "," + box.h
      }, [text]));
    }

    addLabel("Load, F", 8, 14, "start", "var(--chart-ink)");
    addLabel("Deflection, S", (x1 + x2) / 2, oy + gap + ascent + 1, "middle", "var(--chart-ink)");

    var xEnd = xOf(0.9);
    var yEnd = yOf(0.9);
    parts.push(empty("line", {
      x1: r1(ox), y1: r1(oy), x2: r1(xEnd), y2: r1(yEnd),
      stroke: "var(--chart-ink)", "stroke-width": 2, "data-spring-line": "1"
    }));

    function hGuide(x, y, colour) {
      parts.push(empty("line", {
        x1: r1(ox), y1: r1(y), x2: r1(x), y2: r1(y),
        stroke: colour, "stroke-width": 1.15, "stroke-dasharray": "3 3"
      }));
    }
    function vGuide(id, x, yFrom, yTo, colour) {
      parts.push(empty("line", {
        x1: r1(x), y1: r1(yFrom), x2: r1(x), y2: r1(yTo),
        stroke: colour, "stroke-width": 1.15, "stroke-dasharray": "3 3",
        "data-guide": id
      }));
    }
    hGuide(x1, y1, "var(--series-l1)");
    hGuide(x2, y2, "var(--series-l2)");
    vGuide("L1", x1, y1, cy1 - radius, "var(--series-l1)");
    vGuide("L2", x2, y2, cy2 - radius, "var(--series-l2)");
    vGuide("L0", ox, oy + 3, cy0 - radius, "var(--series-l0)");

    parts.push(empty("circle", {
      cx: r1(x1), cy: r1(y1), r: 4.2, fill: "var(--series-l1)",
      stroke: "var(--chart-paper)", "stroke-width": 1.4
    }));
    parts.push(empty("circle", {
      cx: r1(x2), cy: r1(y2), r: 4.2, fill: "var(--series-l2)",
      stroke: "var(--chart-paper)", "stroke-width": 1.4
    }));
    addLabel("L0", ox - gap - 1, oy - gap - descent - 1, "end", "var(--series-l0)");
    addLabel("L1 / F1", x1 - gap - 5, y1 - gap - descent - 1, "end", "var(--series-l1)");
    addLabel("L2 / F2", x2 - gap - 5, y2 - gap - descent - 1, "end", "var(--series-l2)");

    function addHelix(id, x0, cy, colour) {
      var steps = turns * 36;
      var back = [];
      var front = [];
      function flush(buf, stroke, width, strand) {
        if (buf.length < 2) { buf.length = 0; return; }
        parts.push(empty("polyline", {
          points: buf.join(" "),
          fill: "none",
          stroke: stroke,
          "stroke-width": width,
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
          "data-spring": id,
          "data-strand": strand,
          "data-cy": String(cy)
        }));
        buf.length = 0;
      }
      var i;
      var prevFront = null;
      for (i = 0; i <= steps; i++) {
        var t = i / steps;
        var ang = t * turns * 2 * Math.PI;
        var x = x0 + t * (xFix - x0);
        var y = cy + radius * Math.sin(ang);
        var pt = r1(x) + "," + r1(y);
        var isFront = Math.cos(ang) >= 0;
        if (prevFront !== null && isFront !== prevFront) {
          if (isFront) {
            back.push(pt);
            flush(back, "var(--coil-back)", backW, "back");
            front.push(pt);
          } else {
            front.push(pt);
            flush(front, "var(--chart-ink)", frontW, "front");
            back.push(pt);
          }
        } else if (isFront) front.push(pt);
        else back.push(pt);
        prevFront = isFront;
      }
      flush(back, "var(--coil-back)", backW, "back");
      flush(front, "var(--chart-ink)", frontW, "front");
      [x0, xFix].forEach(function (seatX) {
        parts.push(empty("line", {
          x1: r1(seatX), y1: r1(cy - radius), x2: r1(seatX), y2: r1(cy + radius),
          stroke: "var(--chart-ink)", "stroke-width": 2.2,
          "data-seat": id
        }));
      });
      addLabel(id, 8, cy + (ascent - descent) / 2, "start", colour);
    }

    /* L2 (shortest) on top, then L1, then L0. Fixed end on the right. */
    addHelix("L2", x2, cy2, "var(--series-l2)");
    addHelix("L1", x1, cy1, "var(--series-l1)");
    addHelix("L0", ox, cy0, "var(--series-l0)");

    return el("svg", {
      class: "help-svg duty-graph",
      viewBox: "0 0 " + W + " " + H,
      xmlns: "http://www.w3.org/2000/svg",
      role: "img",
      "data-coil-radius": String(radius),
      "data-front-stroke": String(frontW),
      "data-back-stroke": String(backW),
      "data-turns": String(turns),
      "aria-label": "Load, F against deflection, S, with horizontal springs at L0, L1 and L2"
    }, parts);
  }

  root.SpringCharts = {
    renderLoadGraph: renderLoadGraph,
    renderTradeoff: renderTradeoff,
    renderSpringDiagram: renderSpringDiagram,
    loadGraphStations: loadGraphStations,
    travelPercent: travelPercent,
    stressAtLoad: stressAtLoad,
    dutyIllustration: dutyIllustration
  };
  if (typeof module === "object" && module.exports) {
    module.exports = root.SpringCharts;
  }
})(typeof self !== "undefined" ? self : this);
