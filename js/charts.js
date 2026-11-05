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
      { id: "L0", L: design.L0, F: 0, colour: "#1b4f72" }
    ];
    if (design.L1 != null && design.F1 != null) {
      stations.push({ id: "L1", L: design.L1, F: design.F1, colour: "#2e7d4f" });
    }
    if (design.L2 != null && design.F2 != null) {
      stations.push({ id: "L2", L: design.L2, F: design.F2, colour: "#8a4b08" });
    }
    if (design.Ln != null && design.Fn != null) {
      stations.push({ id: "Ln", L: design.Ln, F: design.Fn, colour: "#6b4c9a" });
    }
    if (design.Lc != null && design.Fc != null) {
      stations.push({ id: "Lc", L: design.Lc, F: design.Fc, colour: "#8b1e1e" });
    }
    stations.forEach(function (s) {
      s.travelPct = travelPercent(design, s.L);
      s.tauK = stressAtLoad(design, s.F);
    });
    return stations.filter(function (s) {
      return s.L != null && s.F != null && isFinite(s.L) && isFinite(s.F);
    });
  }

  function approxTextWidth(str, fontSize) {
    return String(str).length * fontSize * 0.58;
  }

  function renderLoadGraph(svg, design) {
    var W = 390;
    var H = 336;
    var pad = { l: 58, r: 14, t: 26, b: 78 };
    var L0 = design.L0;
    var Lc = design.Lc;
    var span = Math.max(L0 - Lc, 1);
    var Lleft = L0 + 0.06 * span;
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
    parts.push(empty("rect", { x: 0, y: 0, width: W, height: H, fill: "#fbf8f1" }));

    parts.push(empty("line", {
      x1: pad.l, y1: pad.t, x2: pad.l, y2: H - pad.b,
      stroke: "#0b1f33", "stroke-width": 1.2
    }));
    parts.push(empty("line", {
      x1: pad.l, y1: H - pad.b, x2: W - pad.r, y2: H - pad.b,
      stroke: "#0b1f33", "stroke-width": 1.2
    }));
    parts.push(el("text", {
      x: 12, y: 16, fill: "#0b1f33", "font-size": 11,
      "font-family": "ui-sans-serif, system-ui, sans-serif", "font-weight": 600
    }, ["Load F (N)"]));
    parts.push(el("text", {
      x: pad.l + (W - pad.l - pad.r) / 2, y: H - 8, fill: "#0b1f33", "font-size": 10,
      "text-anchor": "middle",
      "font-family": "ui-sans-serif, system-ui, sans-serif", "font-weight": 600
    }, ["Length L (mm)  →  shorter"]));

    var x0 = xOf(L0);
    var y0 = yOf(0);
    var xc = xOf(Lc);
    var yc = yOf(design.Fc);
    parts.push(empty("line", {
      x1: x0, y1: y0, x2: xc, y2: yc,
      stroke: "#0b1f33", "stroke-width": 2
    }));

    function haloText(attrs, children) {
      attrs = Object.assign({
        stroke: "#fbf8f1",
        "stroke-width": 3,
        "paint-order": "stroke",
        "font-family": "ui-sans-serif, system-ui, sans-serif"
      }, attrs);
      return el("text", attrs, children);
    }

    var loaded = stations.filter(function (s) { return s.id !== "L0"; })
      .slice()
      .sort(function (a, b) { return a.F - b.F; });

    loaded.forEach(function (s, i) {
      var x = xOf(s.L);
      var y = yOf(s.F);
      var yPrev = i === 0 ? yOf(0) : yOf(loaded[i - 1].F);
      var yNext = i === loaded.length - 1 ? pad.t : yOf(loaded[i + 1].F);
      var spaceAbove = y - yNext;
      var spaceBelow = yPrev - y;
      var above = spaceAbove >= spaceBelow;

      parts.push(empty("line", {
        x1: pad.l, y1: y, x2: x, y2: y,
        stroke: s.colour, "stroke-width": 1.15, opacity: 0.95
      }));

      var line1 = (s.travelPct == null ? "—" : E.fmt(s.travelPct, 1) + " %");
      var line2 = s.tauK == null ? "" : "τk " + E.fmt(s.tauK, 0) + " N/mm²";
      var tw = Math.max(approxTextWidth(line1, 8), approxTextWidth(line2, 8));
      var gap = x - pad.l;
      var tx;
      if (gap >= tw + 18) {
        tx = pad.l + gap / 2;
      } else {
        tx = x + 8 + tw / 2;
        if (tx + tw / 2 > W - 6) tx = W - 6 - tw / 2;
        if (tx - tw / 2 < pad.l + 4) tx = pad.l + 4 + tw / 2;
      }
      var y1 = above ? y - 15 : y + 12;
      var y2 = above ? y - 6 : y + 21;
      parts.push(haloText({
        x: tx, y: y1, "text-anchor": "middle", fill: s.colour,
        "font-size": 8, "font-weight": 700
      }, [txt(line1)]));
      if (line2) {
        parts.push(haloText({
          x: tx, y: y2, "text-anchor": "middle", fill: s.colour,
          "font-size": 8, "font-weight": 650
        }, [txt(line2)]));
      }
    });

    stations.forEach(function (s) {
      var x = xOf(s.L);
      var y = yOf(s.F);
      if (H - pad.b - y > 1) {
        parts.push(empty("line", {
          x1: x, y1: y, x2: x, y2: H - pad.b,
          stroke: s.colour, "stroke-width": 1, "stroke-dasharray": "3 3", opacity: 0.8
        }));
      }
      parts.push(empty("circle", {
        cx: x, cy: y, r: 4.2, fill: s.colour, stroke: "#fbf8f1", "stroke-width": 1.4
      }));
    });

    var yLabelItems = [{ F: 0, colour: "#1b4f72", id: "F0" }].concat(loaded.map(function (s) {
      return { F: s.F, colour: s.colour, id: s.id };
    }));
    yLabelItems.sort(function (a, b) { return a.F - b.F; });
    var lastY = Infinity;
    yLabelItems.forEach(function (item) {
      var y = yOf(item.F);
      if (lastY - y < 11) y = lastY - 11;
      lastY = y;
      var label = E.fmt(item.F, item.F >= 100 ? 0 : 1);
      parts.push(el("text", {
        x: pad.l - 7, y: y + 3,
        "text-anchor": "end",
        "font-size": 9,
        fill: item.colour,
        "font-weight": 650,
        "font-family": "ui-sans-serif, system-ui, sans-serif"
      }, [txt(label)]));
    });

    var xSorted = stations.slice().sort(function (a, b) { return b.L - a.L; });
    xSorted.forEach(function (s, i) {
      var x = xOf(s.L);
      var row = i % 2;
      var ySym = H - pad.b + 13 + row * 22;
      var yVal = ySym + 10;
      var xAnchor = x;
      if (i === 0 && x < pad.l + 16) xAnchor = pad.l;
      if (i === xSorted.length - 1 && x > W - pad.r - 16) xAnchor = W - pad.r;
      var anchor = (i === 0 && xAnchor === pad.l) ? "start"
        : (i === xSorted.length - 1 && xAnchor === W - pad.r) ? "end"
        : "middle";
      parts.push(el("text", {
        x: xAnchor, y: ySym, "text-anchor": anchor, fill: s.colour,
        "font-size": 9, "font-weight": 700,
        "font-family": "ui-sans-serif, system-ui, sans-serif"
      }, [txt(s.id)]));
      parts.push(el("text", {
        x: xAnchor, y: yVal, "text-anchor": anchor, fill: "#5c564c",
        "font-size": 8,
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

    var parts = [empty("rect", { x: 0, y: 0, width: W, height: H, fill: "#fbf8f1" })];
    parts.push(el("text", {
      x: pad.l, y: 14, fill: "#8a4b08", "font-size": 9, "font-weight": 700,
      "font-family": "ui-sans-serif, system-ui, sans-serif"
    }, ["Stress % of allowable"]));
    parts.push(el("text", {
      x: W - pad.r, y: 14, fill: "#1b4f72", "font-size": 9, "font-weight": 700,
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
      points: ptsPct.join(" "), fill: "none", stroke: "#8a4b08", "stroke-width": 1.8
    }));
    parts.push(empty("polyline", {
      points: ptsLc.join(" "), fill: "none", stroke: "#1b4f72", "stroke-width": 1.8
    }));
    if (L2) {
      parts.push(empty("line", {
        x1: pad.l, y1: yLc(L2), x2: W - pad.r, y2: yLc(L2),
        stroke: "#8b1e1e", "stroke-width": 1, "stroke-dasharray": "4 3"
      }));
      parts.push(el("text", {
        x: W - pad.r, y: yLc(L2) - 4, "text-anchor": "end", fill: "#8b1e1e",
        "font-size": 8, "font-family": "ui-sans-serif, system-ui, sans-serif"
      }, ["L2"]));
    }
    parts.push(empty("line", {
      x1: pad.l, y1: yPct(100), x2: W - pad.r, y2: yPct(100),
      stroke: "#8a4b08", "stroke-width": 1, "stroke-dasharray": "2 3", opacity: 0.6
    }));
    if (currentD != null) {
      parts.push(empty("line", {
        x1: xOf(currentD), y1: pad.t, x2: xOf(currentD), y2: H - pad.b,
        stroke: "#0b1f33", "stroke-width": 1
      }));
    }
    parts.push(el("text", {
      x: W / 2, y: H - 8, "text-anchor": "middle", fill: "#5c564c", "font-size": 9,
      "font-family": "ui-sans-serif, system-ui, sans-serif"
    }, ["Mean coil diameter D (mm)"]));

    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.innerHTML = parts.join("");
  }

  function renderSpringDiagram(svg, design) {
    var W = 390;
    var H = 420;
    var margin = { l: 74, r: 36, t: 36, b: 56 };
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

    var parts = [empty("rect", { x: 0, y: 0, width: W, height: H, fill: "#fbf8f1" })];

    /* Ground seats */
    var half = (De * scale) / 2;
    parts.push(empty("line", {
      x1: cx - half, y1: yTop, x2: cx + half, y2: yTop,
      stroke: "#0b1f33", "stroke-width": 2
    }));
    parts.push(empty("line", {
      x1: cx - half, y1: yTop + L0 * scale, x2: cx + half, y2: yTop + L0 * scale,
      stroke: "#0b1f33", "stroke-width": 2
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
            stroke: "#8a9aab", "stroke-width": stroke,
            "stroke-linecap": "round", "stroke-linejoin": "round"
          }));
          back = [];
        }
        front.push(pt);
      } else {
        if (front.length) {
          parts.push(empty("polyline", {
            points: front.join(" "), fill: "none",
            stroke: "#0b1f33", "stroke-width": stroke,
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
        stroke: "#8a9aab", "stroke-width": stroke,
        "stroke-linecap": "round", "stroke-linejoin": "round"
      }));
    }
    if (front.length) {
      parts.push(empty("polyline", {
        points: front.join(" "), fill: "none",
        stroke: "#0b1f33", "stroke-width": stroke,
        "stroke-linecap": "round", "stroke-linejoin": "round"
      }));
    }

    /* L0 dimension */
    var dimX = margin.l - 28;
    parts.push(empty("line", {
      x1: dimX, y1: yTop, x2: dimX, y2: yTop + L0 * scale,
      stroke: "#6b4c9a", "stroke-width": 1
    }));
    parts.push(empty("line", {
      x1: dimX - 6, y1: yTop, x2: dimX + 6, y2: yTop,
      stroke: "#6b4c9a", "stroke-width": 1
    }));
    parts.push(empty("line", {
      x1: dimX - 6, y1: yTop + L0 * scale, x2: dimX + 6, y2: yTop + L0 * scale,
      stroke: "#6b4c9a", "stroke-width": 1
    }));
    parts.push(el("text", {
      x: dimX - 10, y: yTop + (L0 * scale) / 2,
      transform: "rotate(-90 " + (dimX - 10) + " " + (yTop + (L0 * scale) / 2) + ")",
      fill: "#6b4c9a", "font-size": 11, "text-anchor": "middle", "font-weight": 600,
      "font-family": "ui-sans-serif, system-ui, sans-serif"
    }, ["L0 = " + E.fmt(L0, 2) + " mm"]));

    /* De dimension */
    var yDe = yTop + L0 * scale + 22;
    parts.push(empty("line", {
      x1: cx - half, y1: yDe, x2: cx + half, y2: yDe,
      stroke: "#1b4f72", "stroke-width": 1
    }));
    parts.push(empty("line", {
      x1: cx - half, y1: yDe - 5, x2: cx - half, y2: yDe + 5,
      stroke: "#1b4f72", "stroke-width": 1
    }));
    parts.push(empty("line", {
      x1: cx + half, y1: yDe - 5, x2: cx + half, y2: yDe + 5,
      stroke: "#1b4f72", "stroke-width": 1
    }));
    parts.push(el("text", {
      x: cx, y: yDe + 16, "text-anchor": "middle", fill: "#1b4f72",
      "font-size": 11, "font-weight": 600,
      "font-family": "ui-sans-serif, system-ui, sans-serif"
    }, ["De = " + E.fmt(De, 2) + " mm"]));

    parts.push(el("text", {
      x: W - margin.r, y: 18, "text-anchor": "end", fill: "#5c564c",
      "font-size": 10,
      "font-family": "ui-sans-serif, system-ui, sans-serif"
    }, ["d = " + E.fmt(d, 2) + " mm   ·   " + (design.wind === "left" ? "LH" : "RH") + " wound"]));
    parts.push(el("text", {
      x: W / 2, y: H - 12, "text-anchor": "middle", fill: "#5c564c",
      "font-size": 10,
      "font-family": "ui-sans-serif, system-ui, sans-serif"
    }, ["Side view at free length  ·  scale " + E.fmt(scale, 2) + " px/mm"]));

    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Scaled side view of the spring at free length");
    svg.innerHTML = parts.join("");
  }

  root.SpringCharts = {
    renderLoadGraph: renderLoadGraph,
    renderTradeoff: renderTradeoff,
    renderSpringDiagram: renderSpringDiagram,
    loadGraphStations: loadGraphStations,
    travelPercent: travelPercent,
    stressAtLoad: stressAtLoad
  };
  if (typeof module === "object" && module.exports) {
    module.exports = root.SpringCharts;
  }
})(typeof self !== "undefined" ? self : this);
