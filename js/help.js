/**
 * SC-009 contextual help. Original wording. Standards are named, not quoted.
 * The page warnings stay on the page; this text does not replace them.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.SpringHelp = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* Root-relative so the raw.githack preview and the installed page load the same file. */
  var HELP_DIAMETER_IMAGE = "assets/help/help-diameter-limits.png";
  var HELP_LENGTHS_IMAGE = "assets/help/help-working-lengths.png";

  function helpImage(src, alt, id) {
    var idAttr = id ? ' id="' + id + '"' : "";
    return '<a class="help-zoom" href="' + src + '" target="_blank" rel="noopener">' +
      '<img class="help-diagram"' + idAttr + ' alt="' + alt + '" src="' + src + '">' +
      '</a>';
  }

  function diameterDiagram() {
    return helpImage(HELP_DIAMETER_IMAGE, "Pocket, clearance and spring guide", "diameterDiagram");
  }

  function endPhoto(title, file) {
    var src = "assets/help/" + file;
    return '<figure><figcaption>' + title + '</figcaption>' +
      helpImage(src, title) + '</figure>';
  }

  /* Symbols the results and the drawing actually name. Descriptions follow that wording. */
  var NOMENCLATURE = [
    ["L0", "Free length (zero load)", "mm"],
    ["L1", "Most relaxed working length", "mm"],
    ["L2", "Most compressed working length", "mm"],
    ["Ln", "Recommended shortest length (Lc + 15% of available travel)", "mm"],
    ["Lc", "Closed (solid) length", "mm"],
    ["F1", "Load at L1", "N"],
    ["F2", "Load at L2", "N"],
    ["Fn", "Load at Ln", "N"],
    ["Fc", "Theoretical solid load", "N"],
    ["R", "Spring rate", "N/mm"],
    ["s1", "Deflection at F1", "mm"],
    ["s2", "Deflection at F2 (maximum working load)", "mm"],
    ["L0 − Lc", "Available travel", "mm"],
    ["Sa", "Sum of minimum gaps (0.15 × available travel)", "mm"],
    ["d", "Wire diameter", "mm"],
    ["D", "Mean coil diameter", "mm"],
    ["De", "Outside diameter", "mm"],
    ["Di", "Inside diameter", "mm"],
    ["w", "Spring index, D/d", "—"],
    ["n", "Active coils", "—"],
    ["nt", "Total coils", "—"],
    ["p", "Active pitch", "mm"],
    ["k", "Bergsträsser stress correction factor", "—"],
    ["τ", "Uncorrected shear stress at Fmax", "MPa"],
    ["τk", "Corrected stress at Fmax", "MPa"],
    ["τk1", "Corrected stress at F1", "MPa"],
    ["τk2", "Corrected stress at F2", "MPa"],
    ["τkn", "Corrected stress at Ln", "MPa"],
    ["τkc", "Corrected stress at Lc", "MPa"],
    ["τzul", "Allowable screening stress", "MPa"],
    ["Rm", "Tensile strength", "MPa"],
    ["G", "Modulus of rigidity", "MPa"],
    ["e1", "Squareness", "mm"],
    ["e2", "Parallelism", "mm"],
    ["m", "Approximate mass", "g"]
  ];

  function nomenclatureTable() {
    var rows = NOMENCLATURE.map(function (row) {
      return "<tr><td>" + row[0] + "</td><td>" + row[1] + "</td><td>" + row[2] + "</td></tr>";
    }).join("");
    return '<div class="help-table-scroll"><table class="help-nomenclature">' +
      "<thead><tr><th>Symbol</th><th>Description</th><th>Units</th></tr></thead>" +
      "<tbody>" + rows + "</tbody></table></div>";
  }

  /* Example duty shared by the two design-mode charts. Rates for point-and-rate fan about (s2, F2). */
  var MODE_EXAMPLE = { R: 5, s1: 10, F1: 50, s2: 25, F2: 125, dF: 18, Rhi: 6.2, Rlo: 3.8 };

  function modeChart(kind) {
    var ex = MODE_EXAMPLE;
    var W = 360;
    var H = 340;
    var plot = { l: 58, r: 344, t: 54, b: 292 };
    var sMin = -6;
    var sMax = 34;
    var fMin = -70;
    var fMax = 200;
    function X(s) { return plot.l + (s - sMin) / (sMax - sMin) * (plot.r - plot.l); }
    function Y(f) { return plot.t + (fMax - f) / (fMax - fMin) * (plot.b - plot.t); }
    function n(v) { return Math.round(v * 10) / 10; }
    function span(intercept, slope) {
      var sAtLo = (fMin - intercept) / slope;
      var sAtHi = (fMax - intercept) / slope;
      var lo = Math.max(sMin, Math.min(sAtLo, sAtHi));
      var hi = Math.min(sMax, Math.max(sAtLo, sAtHi));
      return [lo, hi];
    }
    function line(cls, intercept, slope, extra) {
      var ends = span(intercept, slope);
      return '<line class="' + cls + '" x1="' + n(X(ends[0])) + '" y1="' + n(Y(intercept + slope * ends[0])) +
        '" x2="' + n(X(ends[1])) + '" y2="' + n(Y(intercept + slope * ends[1])) + '"' + (extra || "") + '/>';
    }
    function band(a1, b1, a2, b2) {
      var s1 = span(a1, b1);
      var s2 = span(a2, b2);
      var lo = Math.max(s1[0], s2[0]);
      var hi = Math.min(s1[1], s2[1]);
      var steps = 28;
      var fwd = [];
      var back = [];
      var i;
      var s;
      for (i = 0; i <= steps; i++) {
        s = lo + (hi - lo) * i / steps;
        fwd.push(n(X(s)) + "," + n(Y(a1 + b1 * s)));
        back.push(n(X(s)) + "," + n(Y(a2 + b2 * s)));
      }
      back.reverse();
      return '<path class="mode-band" d="M' + fwd.join(" L") + " L" + back.join(" L") + ' Z"/>';
    }
    var two = kind === "two";
    var maxI = two ? ex.dF : ex.F2 - ex.Rhi * ex.s2;
    var maxS = two ? ex.R : ex.Rhi;
    var minI = two ? -ex.dF : ex.F2 - ex.Rlo * ex.s2;
    var minS = two ? ex.R : ex.Rlo;
    var parts = [];
    parts.push('<svg class="help-svg mode-chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-hidden="true">');
    parts.push(band(maxI, maxS, minI, minS));
    parts.push('<line class="mode-axis" x1="' + n(plot.l) + '" y1="' + n(Y(0)) + '" x2="' + n(plot.r) + '" y2="' + n(Y(0)) + '"/>');
    parts.push('<line class="mode-axis" x1="' + n(X(0)) + '" y1="' + n(plot.t) + '" x2="' + n(X(0)) + '" y2="' + n(plot.b) + '"/>');
    [-50, 0, 50, 100, 150, 200].forEach(function (f) {
      parts.push('<text class="mode-tick" x="' + n(plot.l - 6) + '" y="' + n(Y(f) + 4) + '" text-anchor="end">' + f + "</text>");
    });
    [-5, 0, 10, 20, 30].forEach(function (s) {
      parts.push('<text class="mode-tick" x="' + n(X(s)) + '" y="' + n(plot.b + 16) + '" text-anchor="middle">' + s + "</text>");
    });
    parts.push('<text class="mode-axis-title" x="16" y="' + n((plot.t + plot.b) / 2) + '" transform="rotate(-90 16 ' + n((plot.t + plot.b) / 2) + ')" text-anchor="middle">Force F (N)</text>');
    parts.push('<text class="mode-axis-title" x="' + n((plot.l + plot.r) / 2) + '" y="' + n(H - 10) + '" text-anchor="middle">Deflection s (mm)</text>');
    if (two) {
      parts.push('<line class="mode-guide" x1="' + n(X(0)) + '" y1="' + n(Y(ex.F1)) + '" x2="' + n(X(ex.s1)) + '" y2="' + n(Y(ex.F1)) + '"/>');
      parts.push('<line class="mode-guide" x1="' + n(X(ex.s1)) + '" y1="' + n(Y(0)) + '" x2="' + n(X(ex.s1)) + '" y2="' + n(Y(ex.F1)) + '"/>');
      parts.push('<line class="mode-guide" x1="' + n(X(0)) + '" y1="' + n(Y(ex.F2)) + '" x2="' + n(X(ex.s2)) + '" y2="' + n(Y(ex.F2)) + '"/>');
      parts.push('<line class="mode-guide" x1="' + n(X(ex.s2)) + '" y1="' + n(Y(0)) + '" x2="' + n(X(ex.s2)) + '" y2="' + n(Y(ex.F2)) + '"/>');
      parts.push('<line class="mode-bar" x1="' + n(X(ex.s1)) + '" y1="' + n(Y(ex.F1 - ex.dF)) + '" x2="' + n(X(ex.s1)) + '" y2="' + n(Y(ex.F1 + ex.dF)) + '"/>');
      parts.push('<line class="mode-bar" x1="' + n(X(ex.s2)) + '" y1="' + n(Y(ex.F2 - ex.dF)) + '" x2="' + n(X(ex.s2)) + '" y2="' + n(Y(ex.F2 + ex.dF)) + '"/>');
    } else {
      parts.push('<line class="mode-guide" x1="' + n(X(0)) + '" y1="' + n(Y(ex.F2)) + '" x2="' + n(X(ex.s2)) + '" y2="' + n(Y(ex.F2)) + '"/>');
      parts.push('<line class="mode-guide" x1="' + n(X(ex.s2)) + '" y1="' + n(Y(0)) + '" x2="' + n(X(ex.s2)) + '" y2="' + n(Y(ex.F2)) + '"/>');
    }
    parts.push(line("mode-max", maxI, maxS));
    parts.push(line("mode-nom", 0, ex.R));
    parts.push(line("mode-min", minI, minS));
    var markS = two ? [ex.s1, ex.s2] : [ex.s2];
    var markF = two ? [ex.F1, ex.F2] : [ex.F2];
    markS.forEach(function (s, i) {
      parts.push('<circle class="mode-point" cx="' + n(X(s)) + '" cy="' + n(Y(markF[i])) + '" r="3.5"/>');
    });
    parts.push('<line class="mode-key mode-max" x1="62" y1="22" x2="86" y2="22"/>');
    parts.push('<text class="mode-key-label" x="90" y="26">Max</text>');
    parts.push('<line class="mode-key mode-nom" x1="148" y1="22" x2="172" y2="22"/>');
    parts.push('<text class="mode-key-label" x="176" y="26">Nominal</text>');
    parts.push('<line class="mode-key mode-min" x1="250" y1="22" x2="274" y2="22"/>');
    parts.push('<text class="mode-key-label" x="278" y="26">Min</text>');
    if (two) {
      parts.push('<text class="mode-label" data-label="f1" x="112" y="100">F1, s1</text>');
      parts.push('<line class="mode-leader" x1="162" y1="108" x2="176" y2="158"/>');
      parts.push('<text class="mode-label" data-label="df" x="168" y="78">±ΔF</text>');
      parts.push('<line class="mode-leader" x1="185" y1="86" x2="176" y2="150"/>');
      parts.push('<text class="mode-label" data-label="f2" x="196" y="100">F2, s2</text>');
      parts.push('<line class="mode-leader" x1="250" y1="98" x2="274" y2="104"/>');
    } else {
      parts.push('<text class="mode-label" data-label="point" x="292" y="64">s2, F2</text>');
      parts.push('<line class="mode-leader" x1="300" y1="72" x2="286" y2="112"/>');
    }
    parts.push("</svg>");
    return parts.join("");
  }

  var TOPICS = {
    duty: {
      title: "Working loads and lengths",
      body: function () {
        return helpImage(HELP_LENGTHS_IMAGE, "Working lengths L0, L1, L2 and Lc") +
        "<p>Ln (permissible length) = Lc + 15% of available travel; keep L2 at or above Ln.</p>" +
        "<h3>What the letters mean</h3>" +
        "<p>L0: Free length (zero load).</p>" +
        "<p>L1: Most relaxed working length.</p>" +
        "<p>L2: Most compressed working length.</p>" +
        "<p>Lc: Closed (solid) length.</p>" +
        "<p>F1 and F2 are the loads at L1 and L2. A load is not necessarily a dead weight. Two points uses both pairs. Point and rate uses one length, one force and the rate. L1 and L2 are the working lengths, and the loads there follow F + R times (L minus the length). If no working-length range is entered, that length and force are used as the most compressed condition.</p>";
      }
    },
    check: {
      title: "Check",
      body: "<p>Check searches standard wire sizes and mean coil diameters inside the pocket and the spring guide. It does not draw that search here.</p>" +
        "<p>Green means a spring meets every criterion: working deflection between 30% and 70% of available travel, and corrected stress within the active limit.</p>" +
        "<p>Orange means a spring can be found only with the wider band, deflection between 20% and 80%, or with a stress limit 20% higher than the one set. The page states which warning applies.</p>" +
        "<p>Red means those allowances are not enough. Check then gives one line for the cause it found: bring the loads closer to cut the rate, reduce F2 or lengthen L2 when the stress is high, move L1 or L2 when the deflection band is missed, increase L2 when the solid length is too long, or widen the pocket or the spring guide when the diameters are too tight.</p>" +
        "<p>Each candidate is still rejected when L2 is not longer than that candidate’s own solid length. The solid length is calculated from the coils, the wire and the ends.</p>"
    },
    diameters: {
      title: "Diameter limits",
      body: diameterDiagram() +
        "<p>The pocket is the largest outside diameter. Clearance is subtracted only when a pocket is entered.</p>" +
        "<p>The spring guide is the rod through the spring. Clearance is added only when a guide is entered.</p>" +
        "<p>Leave a box blank for no limit. Suggested clearance fills the same workshop allowance for the pocket and the guide.</p>"
    },
    grades: {
      title: "Quality grades",
      body: "<p>These follow BS EN 15800. The grade scales the tolerance band. It does not change the rate, the solid length or the stress check.</p>" +
        "<p>Grade 1 – tightest tolerances; use only when the duty requires it.</p>" +
        "<p>Grade 2 – standard general engineering.</p>" +
        "<p>Grade 3 – widest tolerances, lowest cost.</p>"
    },
    ends: {
      title: "End geometry",
      body: '<div class="end-grid">' +
        endPhoto("Closed and ground", "help-ends-closed-ground.png") +
        endPhoto("Closed, not ground", "help-ends-closed-not-ground.png") +
        endPhoto("Open and ground", "help-ends-open-ground.png") +
        endPhoto("Open, not ground", "help-ends-open-not-ground.png") +
        "</div>" +
        "<p>The diagrams show the four end types. Ends change the solid length.</p>"
    },
    materials: {
      title: "Materials",
      body: "<p>This is a plain guide to the presets on this page, not a material specification and not a copy of EN 10270. The strength filled in for a preset is an indicative minimum that changes with wire diameter. A drawing needs the certificate value. Custom leaves both stiffness and strength for you to enter.</p>" +
        "<p>EN 10270-1 DH is patented cold-drawn carbon steel in the high-tensile grade of that family. It is the usual starting point when a strong carbon-steel spring is wanted. It rusts if left bare.</p>" +
        "<p>EN 10270-1 SH is the same carbon-steel family at a lower tensile grade than DH. It suits a duty that does not need the higher strength. It rusts if left bare.</p>" +
        "<p>EN 10270-1 SM is the medium-tensile grade of that family, lower again than SH. It is the one to consider when the wire must be easier to form and the duty can accept less strength. It rusts if left bare.</p>" +
        "<p>EN 10270-2 VDSiCr is an oil-tempered silicon-chromium alloy. Consider it when the duty is hotter or more cyclic than a plain carbon spring is asked to survive. It is not stainless. The stiffness this app fills in is its oil-tempered value.</p>" +
        "<p>EN 10270-3 1.4310 is an austenitic stainless spring wire. It resists ordinary corrosion better than the carbon grades. Its stiffness is lower, so a spring of the same size is less firm. It is not proof against every environment.</p>" +
        "<p>Custom has no preset advantage or drawback. Enter the modulus and the tensile strength from the certificate.</p>"
    },
    stress: {
      title: "Stress factor",
      body: "<p>Two different factors are easy to mix up. The correction factor is calculated. The allowable factor is the number in the box beside this button.</p>" +
        "<h3>Stress correction factor</h3>" +
        "<p>The wire is curved, so the stress on the inside of the coil is higher than a straight-bar torsion sum. This app multiplies that sum by the Bergsträsser correction from BS EN 13906-1:</p>" +
        "<p>k = (w + 0.5) / (w − 0.75), where w is the spring index D/d.</p>" +
        "<p>It matters because skipping it understates the inside stress, and a spring can then look acceptable when it is not. The factor grows as the coil gets tighter. At the index limits this app already uses, it is about 1.38 at index 4 and about 1.08 at index 16. The expression is not used at index 0.75 or below. This correction is not a fatigue life, not a temperature derating, and not a certified allowable stress.</p>" +
        "<h3>Allowable stress factor</h3>" +
        "<p>The box sets a screening ceiling: allowable corrected stress = this factor × Rm. The page starts at 0.5, so a candidate fails when the corrected stress is above half the tensile strength. The box accepts 0.2 to 0.8. That range belongs to this control. It is not a certified material limit. The fail or warning text stays on the page; it is not replaced by this window. Optimization uses the same active limit.</p>" +
        "<p>Entered stress limit bypasses Rm. When that choice is active, every stress check uses the number in MPa and the page states that the limit was entered directly. The factor × Rm path stays in use until that choice is selected.</p>"
    },
    wire: {
      title: "Standard wire diameters",
      body: "<p>Optimization tries the standard wire sizes at several mean coil diameters inside the pocket, the spring guide and the index limits. The objective is the lowest corrected stress, with working deflection between 30% and 70%. If that finds nothing, the page widens the deflection band to 20–80% and says so. If that still finds nothing, it allows a stress limit 20% higher and says so.</p>" +
        "<p>The wire menu lists standard sizes around the optimum. Pick a row to use that mean diameter and wire. As the spring compresses, the coil diameter increases by the EN 13906-1 expression ΔDe = 0.1(s² − 0.8sd − 0.2d²)/D. The page flags a pocket or guide clearance that is no longer met.</p>"
    },
    graph: {
      title: "Load graph",
      body: "<p>Length stations are labelled under the axis. A horizontal line from each load back to the F axis shows the compression (deflection as a percentage of available travel, L0 − Lc) and the corrected stress τk. Each vertical dotted marker runs from the x-axis up to the spring line, where it meets that horizontal load line. Ln is the length at 85 % of available travel, a workshop recommendation rather than a verbatim clause of the standard.</p>"
    },
    export: {
      title: "A3 drawing export",
      body: "<p>The only export is an A3 PDF drawing. There are no adverts. A one-off permanent Pro unlock for complete drawings is agreed, but the price, Play Billing product and verification server are not configured, so this page cannot unlock one. The file from this button is the unpaid preview: every table value is left out of the PDF, and the sheet carries the line “Upgrade to release drawing table”. The results on this page stay complete.</p>"
    },
    nomenclature: {
      title: "Nomenclature",
      body: nomenclatureTable
    },
    modeA: {
      title: "Two points",
      body: function () {
        return modeChart("two") +
          "<p>A spring constrained by two load–length points. The nominal line passes through the origin. Max and Min are parallel to it and show the allowable force band. Max meets the deflection axis at a negative deflection; Min meets it at a positive deflection. The vertical bars at s1 and s2 are the force tolerance ±ΔF.</p>";
      }
    },
    modeB: {
      title: "Point and rate",
      body: function () {
        return modeChart("point") +
          "<p>A spring constrained by one load–length point and the rate. Only that point (s2, F2) is shown. The nominal line passes through the origin and through this point. Max is the largest rate and Min is the smallest, both pivoted about (s2, F2), so the lines fan about it.</p>";
      }
    }
  };

  function topic(id) {
    var item = TOPICS[id];
    if (!item) return null;
    var body = typeof item.body === "function" ? item.body() : item.body;
    return { title: item.title, body: body };
  }

  function ids() {
    return Object.keys(TOPICS);
  }

  return { topic: topic, ids: ids };
});
