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
  var VIEW = { x: 214, y: 18, w: 108, h: 158 };
  var LAYOUT = {
    table: { x: 16, y: 16, w: 188, gap: 3.5 },
    side: { x: 214, y: 14, w: 108, h: 140 },
    end: { w: 78, h: 60 },
    notes: { x: 214, w: 190, h: 14 },
    title: { x: 214, y: 232, w: 190, h: 50 },
    border: { x: 10, y: 10, w: 400, h: 277 }
  };
  LAYOUT.notes.y = LAYOUT.title.y - LAYOUT.notes.h - 1.5;
  LAYOUT.axisX = LAYOUT.side.x + 58 + (LAYOUT.side.w - 70) / 2;
  LAYOUT.end.x = LAYOUT.axisX - LAYOUT.end.w / 2;
  LAYOUT.end.y = LAYOUT.side.y + LAYOUT.side.h + 2;
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

    var deVal = fmt(design.De, 3) + " mm";
    var diVal = fmt(design.Di, 3) + " mm";
    var dVal = fmt(design.D, 3) + " mm";
    var outerSet = options.outerLimit != null ? !!options.outerLimit : !E.outerIsBlank(design.DeMax);
    var innerSet = options.innerLimit != null ? !!options.innerLimit : !E.outerIsBlank(design.innerMin);
    var diameterOnTable1 = [];
    var diameterOnTable2 = [];
    if (outerSet && innerSet) {
      diameterOnTable1.push(row("Outside diameter", "De", deVal));
      diameterOnTable1.push(row("Inside diameter", "Di", diVal));
    } else if (innerSet) {
      diameterOnTable1.push(row("Inside diameter", "Di", diVal));
      diameterOnTable2.push(row("Outside diameter", "De", deVal));
    } else {
      diameterOnTable1.push(row("Outside diameter", "De", deVal));
      diameterOnTable2.push(row("Inside diameter", "Di", diVal));
    }

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

    var table1 = {
      title: "TABLE 1 — SPRING PARTICULARS",
      audience: "For the spring manufacturer",
      rows: [
        row("Wire diameter", "d", fmt(design.d, 3) + " mm (tolerance per the material standard, EN 10270)")
      ].concat(diameterOnTable1).concat([
        row("Total coils", "nt", fmt(design.nt, 3)),
        row("Active coils", "n", fmt(design.n, 3)),
        row("Length at F1", "L1", design.L1 == null ? "—" : fmt(design.L1, 3) + " mm"),
        row("Length at F2", "L2", design.L2 == null ? "—" : fmt(design.L2, 3) + " mm"),
        row("Load at L1", "F1", byId.F1 ? loadCallout(byId.F1) : "—"),
        row("Load at L2", "F2", byId.F2 ? loadCallout(byId.F2) : "—"),
        row("Coil hand", "—", handLabel(design)),
        row("Ends", "—", ends),
        row("Quality grade", "—", "BS EN 15800 grade " + tol.grade + " (Q = " + fmt(tol.Q, 2) + ")"),
        row("Squareness", "e1", e1Val),
        row("Parallelism", "e2", e2Val)
      ])
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

    var table2 = {
      title: "TABLE 2 — DESIGN REFERENCE DATA",
      mark: "REFERENCE ONLY",
      audience: "For the designer to recreate the calculation. Not manufacturing acceptance limits.",
      rows: [
        row("Mean coil diameter", "D", dVal),
        row("Free length", "L0", l0Val),
        row("Solid length", "Lc", fmt(design.Lc, 3) + " mm")
      ].concat(diameterOnTable2).concat([
        row("Load at Ln", "Fn", fnVal),
        deflRow("Deflection at F1", "s1", design.s1, design.L1),
        deflRow("Deflection at F2", "s2", design.s2, design.L2),
        stressRow("Corrected stress at L1", "τk1", design.F1),
        stressRow("Corrected stress at L2", "τk2", design.F2),
        stressRow("Corrected stress at Ln", "τkn", design.Fn),
        stressRow("Corrected stress at Lc", "τkc", design.Fc),
        row("Allowable screening stress", "τzul", fmt(design.tauAllow, 1) + " N/mm² (" + fmt(design.tauFactor, 2) + " × Rm)"),
        row("Modulus of rigidity", "G", fmt(design.G, 0) + " N/mm²"),
        row("Tensile strength", "Rm", fmt(design.Rm, 0) + " N/mm²"),
        row("Material", "—", design.materialName || "—"),
        row("Spring rate", "R", fmt(design.R, 4) + " N/mm"),
        row("Spring index", "w", fmt(design.w, 3)),
        row("Bergsträsser factor", "k", fmt(design.k, 4)),
        row("Sum of minimum gaps", "Sa", fmt(design.Sa, 3) + " mm (app rule: 0.15 × (L0 − Lc))"),
        row("Design method", "—", "BS EN 13906-1")
      ])
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
        x: LAYOUT.side.x,
        y: LAYOUT.side.y,
        w: LAYOUT.side.w,
        h: LAYOUT.side.h,
        L0: Number(design.L0),
        Lc: Number(design.Lc),
        De: Number(design.De),
        Di: Number(design.Di),
        D: Number(design.D),
        d: Number(design.d),
        n: Number(design.n),
        nt: Number(design.nt),
        ends: design.ends || "closed_ground"
      },
      layout: LAYOUT,
      notes: [
        { n: 1, text: GENERAL_NOTE },
        { n: 2, text: "Tolerances on De, Di and D are the same AD from BS EN 15800 Table 3; control one coil diameter." },
        { n: 3, text: "Coil hand " + handShort(design) + ", default right-hand when not stated." }
      ],
      travelPercentOnDeflection: "provisional",
      travelPercentNote: "Not confirmed. The percent of available travel stays on deflection at F1 and F2. Only Ln was asked to be deleted.",
      diameterPlacement: {
        outerSet: outerSet,
        innerSet: innerSet,
        bothSet: outerSet && innerSet,
        bothSetNote: outerSet && innerSet
          ? "Not specified. Both diameters stay on Table 1 so neither set constraint is dropped."
          : ""
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
    LAYOUT: LAYOUT,
    GENERAL_NOTE: GENERAL_NOTE,
    chooseScale: chooseScale,
    scaleLabel: scaleLabel,
    drawingNumber: drawingNumber,
    formatDate: formatDate,
    build: build
  };
});
