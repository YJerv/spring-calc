/**
 * A3 drawing content for a helical compression spring.
 * ASME Y14.5 title block and general note, BS EN 15800 particulars,
 * and BS EN 13906-1 reference data. Rendering is in pdf.js.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./engine.js"),
      require("./charts.js"),
      require("./en15800.js")
    );
  } else {
    root.SpringDrawing = factory(root.SpringEngine, root.SpringCharts, root.SpringEn15800);
  }
})(typeof self !== "undefined" ? self : this, function (E, C, EN) {
  "use strict";

  var PAGE = { width: 420, height: 297, margin: 10 };
  var VIEW = { x: 16, y: 16, w: 228, h: 156 };
  var GENERAL_NOTE = "DIMENSIONS IN MILLIMETRES, INTERPRET PER ASME Y14.5";

  function fmt(x, digits) {
    return E.fmt(x, digits);
  }

  function pm(x, digits) {
    if (x == null || !isFinite(Number(x))) return "—";
    return "± " + fmt(x, digits);
  }

  function drawingNumber(design) {
    var d = Math.round(Number(design.d) * 100);
    var de = Math.round(Number(design.De) * 10);
    function pad(n, width) {
      var s = String(Math.abs(n));
      while (s.length < width) s = "0" + s;
      return (n < 0 ? "N" : "") + s;
    }
    return "HC-" + pad(d, 4) + "-" + pad(de, 4);
  }

  function formatDate(date) {
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var d = date instanceof Date ? date : new Date();
    var dd = String(d.getDate());
    if (dd.length < 2) dd = "0" + dd;
    return dd + " " + months[d.getMonth()] + " " + d.getFullYear();
  }

  function chooseScale(De, L0) {
    var availW = VIEW.w - 46;
    var availH = VIEW.h - 30;
    var raw = Math.min(availW / Math.max(De, 1e-6), availH / Math.max(L0, 1e-6));
    var prefs = [10, 5, 4, 2, 1, 0.5, 0.2, 0.1, 0.05];
    for (var i = 0; i < prefs.length; i++) {
      if (prefs[i] <= raw + 1e-9) return prefs[i];
    }
    return raw > 0 ? raw : prefs[prefs.length - 1];
  }

  function scaleLabel(scale) {
    if (!(scale > 0)) return "—";
    if (scale >= 1 - 1e-9) {
      var s = Math.round(scale * 100) / 100;
      return (Math.abs(s - Math.round(s)) < 1e-6 ? String(Math.round(s)) : s.toFixed(2)) + ":1";
    }
    var inv = 1 / scale;
    var r = Math.round(inv * 100) / 100;
    return "1:" + (Math.abs(r - Math.round(r)) < 1e-6 ? String(Math.round(r)) : r.toFixed(2));
  }

  function handLabel(design) {
    return design.wind === "left" ? "Left-hand (LH)" : "Right-hand (RH)";
  }

  function handShort(design) {
    return design.wind === "left" ? "LH" : "RH";
  }

  function stressAt(design, F) {
    if (!C || !C.stressAtLoad) return null;
    return C.stressAtLoad(design, F);
  }

  function compressionAt(design, L) {
    if (!C || !C.travelPercent) return null;
    return C.travelPercent(design, L);
  }

  function row(particular, symbol, value) {
    return { particular: particular, symbol: symbol, value: value };
  }

  function loadCallout(tolRow) {
    if (!tolRow) return "—";
    var len = tolRow.L == null ? "—" : fmt(tolRow.L, 3) + " mm";
    return fmt(tolRow.F, 3) + " N at " + len + "  " + pm(tolRow.AF, 2) + " N";
  }

  function build(design, options) {
    options = options || {};
    var grade = options.grade == null ? 2 : Number(options.grade);
    var tol = options.tolerances || EN.assess(design, grade);
    var date = options.date || formatDate(new Date());
    var number = options.drawingNumber || drawingNumber(design);
    var scale = chooseScale(Number(design.De), Number(design.L0));
    var clearance = options.clearance;
    var ends = design.endsLabel || (design.ends === "closed_ground" ? "Closed and ground" : "—");

    var deVal = fmt(design.De, 3) + " mm  " + (tol.AD == null ? "(AD outside Table 3)" : pm(tol.AD, 2) + " mm");
    var diVal = fmt(design.Di, 3) + " mm  " + (tol.AD == null ? "(AD outside Table 3)" : pm(tol.AD, 2) + " mm");
    var dVal = fmt(design.D, 3) + " mm  " + (tol.AD == null ? "(AD outside Table 3)" : pm(tol.AD, 2) + " mm (same AD)");

    var l0Val;
    if (tol.L0ReferenceOnly) {
      l0Val = fmt(design.L0, 3) + " mm — REFERENCE ONLY (EN 15800 6.7)";
    } else if (isFinite(tol.AL0)) {
      l0Val = fmt(design.L0, 3) + " mm  " + pm(tol.AL0, 2) + " mm";
    } else {
      l0Val = fmt(design.L0, 3) + " mm";
    }

    var byId = {};
    tol.loads.forEach(function (item) { byId[item.id] = item; });

    var e1Val = "Not applicable (ends are not closed and ground)";
    var e2Val = e1Val;
    if (tol.endsClosedGround && tol.squareness) {
      e1Val = "≤ " + fmt(tol.squareness.e1, 3) + " mm (" + fmt(tol.squareness.e1Factor, 3) + " × L0)";
      e2Val = "≤ " + fmt(tol.squareness.e2, 3) + " mm (" + fmt(tol.squareness.e2Factor, 3) + " × De)";
    }

    var fnVal = "—";
    if (tol.fn) {
      fnVal = loadCallout(tol.fn) + " — REF, not a specified duty";
    }

    var scopeNote = tol.inScope
      ? "Within the BS EN 15800 normative scope."
      : "OUTSIDE BS EN 15800 NORMATIVE SCOPE — tolerances below are indicative only.";

    var table1 = {
      title: "TABLE 1 — SPRING PARTICULARS",
      audience: "For the spring manufacturer",
      rows: [
        row("Wire diameter", "d", fmt(design.d, 3) + " mm (tolerance per the material standard, EN 10270)"),
        row("Outside diameter", "De", deVal),
        row("Inside diameter", "Di", diVal),
        row("Mean coil diameter", "D", dVal),
        row("Total coils", "nt", fmt(design.nt, 3)),
        row("Active coils", "n", fmt(design.n, 3)),
        row("Free length", "L0", l0Val),
        row("Load at L1", "F1", byId.F1 ? loadCallout(byId.F1) : "—"),
        row("Load at L2", "F2", byId.F2 ? loadCallout(byId.F2) : "—"),
        row("Load at Ln", "Fn", fnVal),
        row("Coil hand", "—", handLabel(design)),
        row("Ends", "—", ends),
        row("Material", "—", design.materialName || "—"),
        row("Tensile strength", "Rm", fmt(design.Rm, 0) + " N/mm²"),
        row("Quality grade", "—", "BS EN 15800 grade " + tol.grade + " (Q = " + fmt(tol.Q, 2) + ")"),
        row("Coil diameter tolerance", "AD", tol.AD == null ? "Outside Table 3" : pm(tol.AD, 2) + " mm on De, Di and D"),
        row("Squareness", "e1", e1Val),
        row("Parallelism", "e2", e2Val),
        row("Scope", "—", scopeNote)
      ]
    };

    function stressRow(name, symbol, F) {
      var tau = stressAt(design, F);
      return row(name, symbol, tau == null ? "—" : fmt(tau, 1) + " N/mm²");
    }

    function deflRow(name, symbol, s, L) {
      var pct = compressionAt(design, L);
      var text = s == null || !isFinite(Number(s)) ? "—" : fmt(s, 3) + " mm";
      if (pct != null && isFinite(pct)) text += " (" + fmt(pct, 1) + " % of available travel)";
      return row(name, symbol, text);
    }

    var al0Ref = isFinite(tol.AL0) ? pm(tol.AL0, 3) + " mm indicative" : "—";
    if (tol.L0ReferenceOnly) al0Ref += " (not a limit: two loads given)";

    var table2 = {
      title: "TABLE 2 — DESIGN REFERENCE DATA",
      mark: "REFERENCE ONLY",
      audience: "For the designer to recreate the calculation. Not manufacturing acceptance limits.",
      rows: [
        row("Free length", "L0", fmt(design.L0, 3) + " mm"),
        row("Solid length", "Lc", fmt(design.Lc, 3) + " mm"),
        row("Length at F1", "L1", design.L1 == null ? "—" : fmt(design.L1, 3) + " mm"),
        row("Length at F2", "L2", design.L2 == null ? "—" : fmt(design.L2, 3) + " mm"),
        row("Recommended shortest length", "Ln", fmt(design.Ln, 3) + " mm (85 % of available travel)"),
        deflRow("Deflection at F1", "s1", design.s1, design.L1),
        deflRow("Deflection at F2", "s2", design.s2, design.L2),
        deflRow("Deflection to solid", "sc", design.sc, design.Lc),
        deflRow("Deflection at Ln", "sn", design.L0 - design.Ln, design.Ln),
        stressRow("Corrected stress at L0", "τk0", 0),
        stressRow("Corrected stress at L1", "τk1", design.F1),
        stressRow("Corrected stress at L2", "τk2", design.F2),
        stressRow("Corrected stress at Ln", "τkn", design.Fn),
        stressRow("Corrected stress at Lc", "τkc", design.Fc),
        row("Allowable screening stress", "τzul", fmt(design.tauAllow, 1) + " N/mm² (" + fmt(design.tauFactor, 2) + " × Rm)"),
        row("Modulus of rigidity", "G", fmt(design.G, 0) + " N/mm²"),
        row("Tensile strength", "Rm", fmt(design.Rm, 0) + " N/mm²"),
        row("Spring rate", "R", fmt(design.R, 4) + " N/mm"),
        row("Mean coil diameter", "D", fmt(design.D, 3) + " mm"),
        row("Spring index", "w", fmt(design.w, 3)),
        row("Bergsträsser factor", "k", fmt(design.k, 4)),
        row("Sum of minimum gaps", "Sa", fmt(design.Sa, 3) + " mm (app rule: 0.15 × (L0 − Lc))"),
        row("Pocket diametral clearance", "—", clearance == null || clearance === "" ? "—" : fmt(clearance, 3) + " mm"),
        row("Approximate wire length", "Lw", fmt(design.wireLength, 1) + " mm"),
        row("Approximate mass", "m", design.mass ? fmt(design.mass * 1000, 2) + " g" : "—"),
        row("Indicative free-length tolerance", "AL0", al0Ref),
        row("Design method", "—", "BS EN 13906-1")
      ]
    };

    return {
      page: { format: "a3", orientation: "landscape", widthMm: PAGE.width, heightMm: PAGE.height },
      title: "Helical Compression Spring",
      drawingNumber: number,
      date: date,
      units: "mm",
      projection: "third-angle",
      generalNote: GENERAL_NOTE,
      scale: scale,
      scaleLabel: scaleLabel(scale),
      hand: handShort(design),
      handLabel: handLabel(design),
      ends: ends,
      endsClosedGround: tol.endsClosedGround,
      material: design.materialName || "—",
      grade: tol.grade,
      Q: tol.Q,
      view: {
        x: VIEW.x,
        y: VIEW.y,
        w: VIEW.w,
        h: VIEW.h,
        L0: Number(design.L0),
        Lc: Number(design.Lc),
        De: Number(design.De),
        Di: Number(design.Di),
        D: Number(design.D),
        d: Number(design.d),
        n: Number(design.n),
        nt: Number(design.nt)
      },
      tolerances: tol,
      table1: table1,
      table2: table2,
      verificationNote: tol.verificationNote,
      version: "v1.4"
    };
  }

  return {
    PAGE: PAGE,
    VIEW: VIEW,
    GENERAL_NOTE: GENERAL_NOTE,
    chooseScale: chooseScale,
    scaleLabel: scaleLabel,
    drawingNumber: drawingNumber,
    formatDate: formatDate,
    build: build
  };
});
