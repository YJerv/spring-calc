/**
 * Helical compression spring calculation engine
 * Method: BS EN 13906-1 (cylindrical helical compression springs, round wire)
 *
 * Units throughout: mm, N, N/mm, N/mm² (MPa)
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.SpringEngine = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var PI = Math.PI;
  var INDEX_MIN = 4;
  var INDEX_MAX = 16;
  var INDEX_PREF = 8;
  var N_MIN = 2;
  var N_MAX = 30;
  var TRAVEL_WARN = 0.85;
  var N_SNAP = 0.25;

  var STANDARD_WIRES = [
    0.2, 0.22, 0.25, 0.28, 0.3, 0.32, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65,
    0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.25, 1.3, 1.4, 1.5, 1.6, 1.8, 2.0, 2.2,
    2.5, 2.8, 3.0, 3.2, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 8.0, 9.0,
    10.0, 11.0, 12.0
  ];

  /* Indicative minimum Rm (N/mm²) vs diameter — typical of published EN 10270
     supplier tables, for screening only. Not a substitute for the standard. */
  var RM_DH = [
    [0.2, 2730], [0.3, 2570], [0.4, 2480], [0.5, 2410], [0.6, 2360],
    [0.8, 2270], [1.0, 2200], [1.2, 2130], [1.5, 2050], [2.0, 1960],
    [2.5, 1870], [3.0, 1800], [3.5, 1750], [4.0, 1700], [5.0, 1630],
    [6.0, 1570], [7.0, 1520], [8.0, 1480], [10.0, 1410], [12.0, 1360]
  ];
  var RM_SH = [
    [0.2, 2500], [0.3, 2360], [0.4, 2280], [0.5, 2210], [0.6, 2160],
    [0.8, 2080], [1.0, 2010], [1.2, 1950], [1.5, 1880], [2.0, 1800],
    [2.5, 1720], [3.0, 1660], [3.5, 1610], [4.0, 1570], [5.0, 1500],
    [6.0, 1450], [7.0, 1410], [8.0, 1370], [10.0, 1310], [12.0, 1260]
  ];
  var RM_SM = [
    [0.2, 2180], [0.3, 2060], [0.4, 1990], [0.5, 1930], [0.6, 1880],
    [0.8, 1810], [1.0, 1750], [1.2, 1700], [1.5, 1630], [2.0, 1570],
    [2.5, 1500], [3.0, 1450], [3.5, 1410], [4.0, 1370], [5.0, 1310],
    [6.0, 1260], [7.0, 1230], [8.0, 1190], [10.0, 1140], [12.0, 1100]
  ];
  var RM_VDSiCr = [
    [0.5, 2060], [0.8, 1980], [1.0, 1930], [1.5, 1840], [2.0, 1770],
    [2.5, 1710], [3.0, 1660], [4.0, 1570], [5.0, 1510], [6.0, 1460],
    [8.0, 1380], [10.0, 1320], [12.0, 1270]
  ];
  var RM_14310 = [
    [0.2, 2200], [0.3, 2100], [0.5, 2000], [0.8, 1900], [1.0, 1850],
    [1.5, 1750], [2.0, 1670], [2.5, 1600], [3.0, 1550], [4.0, 1470],
    [5.0, 1410], [6.0, 1360], [8.0, 1280], [10.0, 1220], [12.0, 1170]
  ];

  var MATERIALS = [
    {
      id: "10270-1-DH",
      name: "EN 10270-1 DH — patented cold-drawn carbon steel (high tensile)",
      shortName: "EN 10270-1 DH",
      G: 81500,
      density: 7.85e-6,
      rmTable: RM_DH,
      note: "G from EN 13906-1 Table 3. Rm is an indicative minimum that varies with diameter."
    },
    {
      id: "10270-1-SH",
      name: "EN 10270-1 SH — patented cold-drawn carbon steel",
      shortName: "EN 10270-1 SH",
      G: 81500,
      density: 7.85e-6,
      rmTable: RM_SH,
      note: "G from EN 13906-1 Table 3. Rm is an indicative minimum that varies with diameter."
    },
    {
      id: "10270-1-SM",
      name: "EN 10270-1 SM — patented cold-drawn carbon steel (medium tensile)",
      shortName: "EN 10270-1 SM",
      G: 81500,
      density: 7.85e-6,
      rmTable: RM_SM,
      note: "G from EN 13906-1 Table 3. Rm is an indicative minimum that varies with diameter."
    },
    {
      id: "10270-2-VDSiCr",
      name: "EN 10270-2 VDSiCr — oil-tempered SiCr alloy steel",
      shortName: "EN 10270-2 VDSiCr",
      G: 79500,
      density: 7.85e-6,
      rmTable: RM_VDSiCr,
      note: "G from EN 13906-1 Table 3 (oil-tempered spring steel wire)."
    },
    {
      id: "10270-3-14310",
      name: "EN 10270-3 1.4310 (AISI 302) — austenitic stainless spring wire",
      shortName: "EN 10270-3 1.4310",
      G: 70000,
      density: 7.90e-6,
      rmTable: RM_14310,
      note: "G = 70 000 N/mm², EN 13906-1 Table 4 delivery condition (HT condition is about 73 000)."
    },
    {
      id: "custom",
      name: "Custom material",
      shortName: "Custom",
      G: 81500,
      density: 7.85e-6,
      rmTable: null,
      note: "Enter G and Rm from the material certificate."
    }
  ];

  var ENDS = {
    closed_ground: {
      id: "closed_ground",
      label: "Closed and ground",
      dead: 2,
      solidExtra: 0
    },
    closed: {
      id: "closed",
      label: "Closed, not ground",
      dead: 2,
      solidExtra: 1
    },
    open_ground: {
      id: "open_ground",
      label: "Open and ground",
      dead: 0,
      solidExtra: 0
    },
    open: {
      id: "open",
      label: "Open, not ground",
      dead: 0,
      solidExtra: 1
    }
  };

  function lerpTable(table, x) {
    if (!table || !table.length) return null;
    if (x <= table[0][0]) return table[0][1];
    var last = table[table.length - 1];
    if (x >= last[0]) return last[1];
    for (var i = 1; i < table.length; i++) {
      if (x <= table[i][0]) {
        var a = table[i - 1];
        var b = table[i];
        var t = (x - a[0]) / (b[0] - a[0]);
        return a[1] + t * (b[1] - a[1]);
      }
    }
    return last[1];
  }

  function materialById(id) {
    for (var i = 0; i < MATERIALS.length; i++) {
      if (MATERIALS[i].id === id) return MATERIALS[i];
    }
    return MATERIALS[MATERIALS.length - 1];
  }

  function indicativeRm(materialId, d) {
    var mat = materialById(materialId);
    if (!mat.rmTable) return null;
    return lerpTable(mat.rmTable, d);
  }

  function suggestedClearance(pocketDia) {
    var Dh = Number(pocketDia);
    if (!(Dh > 0)) return 1;
    if (Dh <= 5) return 0.4;
    if (Dh <= 10) return 0.6;
    if (Dh <= 15) return 0.8;
    if (Dh <= 20) return 1.0;
    if (Dh <= 25) return 1.25;
    if (Dh <= 30) return 1.5;
    if (Dh <= 40) return 2.0;
    if (Dh <= 50) return 2.5;
    if (Dh <= 65) return 3.0;
    return Math.round(0.05 * Dh * 10) / 10;
  }

  function bergstraesserK(w) {
    if (!(w > 0.75)) return Infinity;
    return (w + 0.5) / (w - 0.75);
  }

  function wahlK(w) {
    if (!(w > 1)) return Infinity;
    return (4 * w - 1) / (4 * w - 4) + 0.615 / w;
  }

  function uncorrectedStress(D, d, F) {
    return (8 * D * F) / (PI * d * d * d);
  }

  function correctedStress(D, d, F) {
    var w = D / d;
    return bergstraesserK(w) * uncorrectedStress(D, d, F);
  }

  function activeCoils(G, d, D, R) {
    var d4 = d * d * d * d;
    var D3 = D * D * D;
    return (G * d4) / (8 * D3 * R);
  }

  function rateFromGeometry(G, d, D, n) {
    var d4 = d * d * d * d;
    var D3 = D * D * D;
    return (G * d4) / (8 * D3 * n);
  }

  function totalCoils(n, ends) {
    var e = typeof ends === "string" ? ENDS[ends] : ends;
    if (!e) e = ENDS.closed_ground;
    return n + e.dead;
  }

  function solidLength(n, d, ends) {
    var e = typeof ends === "string" ? ENDS[ends] : ends;
    if (!e) e = ENDS.closed_ground;
    return (n + e.dead + e.solidExtra) * d;
  }

  function pitch(L0, n, d, ends) {
    var e = typeof ends === "string" ? ENDS[ends] : ends;
    if (!e) e = ENDS.closed_ground;
    if (!(n > 0)) return NaN;
    return (L0 - e.dead * d) / n;
  }

  function deriveModeA(L1, F1, L2, F2) {
    L1 = Number(L1);
    F1 = Number(F1);
    L2 = Number(L2);
    F2 = Number(F2);
    var errors = [];
    if (!(L1 > 0) || !(L2 > 0)) errors.push("Both lengths must be greater than zero.");
    if (!(F1 >= 0) || !(F2 >= 0)) errors.push("Loads must be zero or greater.");
    if (L1 <= L2) errors.push("L1 must be longer than L2 (lighter load at the greater length).");
    if (F2 <= F1) errors.push("F2 must be greater than F1.");
    if (errors.length) return { ok: false, errors: errors };
    var R = (F2 - F1) / (L1 - L2);
    var L0 = L1 + F1 / R;
    return {
      ok: true,
      mode: "A",
      R: R,
      L0: L0,
      L1: L1,
      F1: F1,
      L2: L2,
      F2: F2,
      Fmax: F2,
      LmaxLoad: L2,
      errors: []
    };
  }

  function deriveModeB(F, L, R, asPoint) {
    F = Number(F);
    L = Number(L);
    R = Number(R);
    asPoint = asPoint || "F2";
    var errors = [];
    if (!(F >= 0)) errors.push("Load must be zero or greater.");
    if (!(L > 0)) errors.push("Length must be greater than zero.");
    if (!(R > 0)) errors.push("Spring rate must be greater than zero.");
    if (errors.length) return { ok: false, errors: errors };
    var L0 = L + F / R;
    var out = {
      ok: true,
      mode: "B",
      R: R,
      L0: L0,
      errors: []
    };
    if (asPoint === "F1") {
      out.L1 = L;
      out.F1 = F;
      out.L2 = null;
      out.F2 = null;
      out.Fmax = F;
      out.LmaxLoad = L;
    } else {
      out.L2 = L;
      out.F2 = F;
      out.L1 = null;
      out.F1 = null;
      out.Fmax = F;
      out.LmaxLoad = L;
    }
    return out;
  }

  function roundTo(value, step) {
    return Math.round(value / step) * step;
  }

  function diameterBounds(d, DeMax) {
    var DFitMax = DeMax - d;
    var DwMin = INDEX_MIN * d;
    var DwMax = INDEX_MAX * d;
    var Dmin = DwMin;
    var Dmax = Math.min(DFitMax, DwMax);
    return {
      Dmin: Dmin,
      Dmax: Dmax,
      DFitMax: DFitMax,
      valid: Dmax + 1e-9 >= Dmin && DFitMax > 0
    };
  }

  function evaluateDesign(input) {
    var d = Number(input.d);
    var D = Number(input.D);
    var G = Number(input.G);
    var Rm = Number(input.Rm);
    var tauFactor = input.tauFactor == null ? 0.5 : Number(input.tauFactor);
    var Rreq = Number(input.R);
    var L0 = Number(input.L0);
    var L1 = input.L1 == null || input.L1 === "" ? null : Number(input.L1);
    var F1 = input.F1 == null || input.F1 === "" ? null : Number(input.F1);
    var L2 = input.L2 == null || input.L2 === "" ? null : Number(input.L2);
    var F2 = input.F2 == null || input.F2 === "" ? null : Number(input.F2);
    var Fmax = Number(input.Fmax != null ? input.Fmax : (F2 != null ? F2 : F1));
    var LmaxLoad = input.LmaxLoad != null ? Number(input.LmaxLoad) : (L2 != null ? L2 : L1);
    var DeMax = Number(input.DeMax);
    var ends = input.ends || "closed_ground";
    var e = ENDS[ends] || ENDS.closed_ground;
    var reasons = [];
    var warnings = [];

    if (!(d > 0) || !(D > 0) || !(G > 0) || !(Rreq > 0) || !(L0 > 0)) {
      return { ok: false, pass: false, reasons: ["Incomplete geometry or rate."], warnings: [] };
    }

    var w = D / d;
    var k = bergstraesserK(w);
    var kWahl = wahlK(w);
    var n = activeCoils(G, d, D, Rreq);
    var nPref = roundTo(n, N_SNAP);
    if (nPref < N_MIN) nPref = N_MIN;
    var nt = totalCoils(n, e);
    var Lc = solidLength(n, d, e);
    var De = D + d;
    var Di = D - d;
    var tau = uncorrectedStress(D, d, Fmax);
    var tauK = k * tau;
    var tauAllow = tauFactor * Rm;
    var pctAllow = tauAllow > 0 ? (100 * tauK) / tauAllow : Infinity;
    var p = pitch(L0, n, d, e);
    var sc = L0 - Lc;
    var s1 = L1 != null ? L0 - L1 : null;
    var s2 = L2 != null ? L0 - L2 : (LmaxLoad != null ? L0 - LmaxLoad : Fmax / Rreq);
    var sMax = Fmax / Rreq;
    var deflPct1 = s1 != null && sc > 0 ? (100 * s1) / sc : null;
    var deflPct2 = sc > 0 ? (100 * s2) / sc : null;
    var Sa = 0.15 * Math.max(sc, 0);
    var Ln = Lc + Sa;
    var Fn = Rreq * (L0 - Ln);
    var Fc = sc > 0 ? Rreq * sc : 0;
    var tau1 = F1 != null ? uncorrectedStress(D, d, F1) : null;
    var tauK1 = tau1 != null ? k * tau1 : null;
    var tau2 = F2 != null ? uncorrectedStress(D, d, F2) : tau;
    var tauK2 = k * tau2;
    var density = input.density != null ? Number(input.density) : 7.85e-6;
    var wireLength = PI * D * nt;
    var mass = density * (PI * d * d * 0.25) * wireLength;
    var slenderness = D > 0 ? L0 / D : Infinity;

    if (!(w + 1e-9 >= INDEX_MIN)) reasons.push("Spring index w = D/d is below 4 (difficult to coil; high stress concentration).");
    if (!(w - 1e-9 <= INDEX_MAX)) reasons.push("Spring index w = D/d is above 16 (flimsy and prone to tangle).");
    if (De - 1e-6 > DeMax) reasons.push("Outside diameter exceeds the pocket (De max).");
    if (!(Di > 0)) reasons.push("Inside diameter is not positive.");
    if (!(n + 1e-9 >= N_MIN)) reasons.push("Fewer than two active coils.");
    if (n > N_MAX) reasons.push("More than 30 active coils (consider a larger mean diameter).");
    if (!(tauK <= tauAllow + 1e-6)) {
      reasons.push("Corrected stress exceeds the allowable (τk > " + (100 * tauFactor).toFixed(0) + " % of Rm).");
    }
    if (!(Lc < LmaxLoad - 1e-9)) {
      reasons.push("Solid length is not shorter than the maximum working length.");
    }
    if (!(L0 > Lc + 1e-9)) reasons.push("Free length is not greater than solid length.");
    if (sc > 0 && s2 / sc > TRAVEL_WARN + 1e-9) {
      warnings.push("More than 85 % of available travel is used at the maximum working load.");
    }
    if (w < 6 || w > 12) {
      warnings.push("Index is outside the preferred band of 6 to 12.");
    }
    if (slenderness > 4) {
      warnings.push("Slenderness L0/D is greater than 4; check buckling if the spring is not guided in the pocket.");
    }
    if (p <= d) {
      warnings.push("Active pitch is not greater than the wire diameter.");
    }

    var pass = reasons.length === 0;
    var travelUsed = sc > 0 ? s2 / sc : Infinity;
    var sf = tauK > 0 ? tauAllow / tauK : Infinity;

    var stressScore = isFinite(sf) ? Math.max(0, Math.min(sf / 1.5, 1)) : 0;
    var indexScore = Math.max(0, 1 - Math.abs(w - INDEX_PREF) / INDEX_PREF);
    var coilScore =
      n >= 3 && n <= 15 ? Math.max(0, 1 - Math.abs(n - 8) / 12) : 0.2;
    var solidScore =
      travelUsed <= TRAVEL_WARN
        ? 1
        : Math.max(0, 1 - (travelUsed - TRAVEL_WARN) / 0.15);
    var score = pass
      ? 0.35 * stressScore + 0.25 * indexScore + 0.2 * coilScore + 0.2 * solidScore
      : -1 + 0.01 * (stressScore + solidScore);

    return {
      ok: true,
      pass: pass,
      status: pass ? (warnings.length ? "warning" : "pass") : "fail",
      reasons: reasons,
      warnings: warnings,
      d: d,
      D: D,
      De: De,
      Di: Di,
      w: w,
      k: k,
      kWahl: kWahl,
      n: n,
      nPref: nPref,
      nt: nt,
      Lc: Lc,
      L0: L0,
      L1: L1,
      F1: F1,
      L2: L2,
      F2: F2,
      Fmax: Fmax,
      LmaxLoad: LmaxLoad,
      R: Rreq,
      Rpref: rateFromGeometry(G, d, D, nPref),
      G: G,
      Rm: Rm,
      tauFactor: tauFactor,
      tauAllow: tauAllow,
      tau: tau,
      tauK: tauK,
      tau1: tau1,
      tauK1: tauK1,
      tau2: tau2,
      tauK2: tauK2,
      pctAllow: pctAllow,
      p: p,
      sc: sc,
      s1: s1,
      s2: s2,
      sMax: sMax,
      deflPct1: deflPct1,
      deflPct2: deflPct2,
      Sa: Sa,
      Ln: Ln,
      Fn: Fn,
      Fc: Fc,
      mass: mass,
      wireLength: wireLength,
      slenderness: slenderness,
      DeMax: DeMax,
      ends: e.id,
      endsLabel: e.label,
      score: score,
      sf: sf,
      travelUsed: travelUsed
    };
  }

  function listWires(input) {
    var DeMax = Number(input.DeMax);
    var sizes = input.wires || STANDARD_WIRES;
    var rows = [];
    for (var i = 0; i < sizes.length; i++) {
      var d = sizes[i];
      if (d >= DeMax) continue;
      var D = DeMax - d;
      var rm = input.Rm;
      if (input.useIndicativeRm && input.materialId) {
        var irm = indicativeRm(input.materialId, d);
        if (irm) rm = irm;
      }
      var row = evaluateDesign({
        d: d,
        D: D,
        G: input.G,
        Rm: rm,
        tauFactor: input.tauFactor,
        R: input.R,
        L0: input.L0,
        L1: input.L1,
        F1: input.F1,
        L2: input.L2,
        F2: input.F2,
        Fmax: input.Fmax,
        LmaxLoad: input.LmaxLoad,
        DeMax: DeMax,
        ends: input.ends,
        density: input.density
      });
      row.usedMaxD = true;
      row.indicativeRm = input.useIndicativeRm ? rm : null;
      rows.push(row);
    }
    return rows;
  }

  function scanDiameters(input, steps) {
    steps = steps == null ? 40 : steps;
    var bounds = diameterBounds(input.d, input.DeMax);
    if (!bounds.valid) return { bounds: bounds, rows: [] };
    var rows = [];
    if (steps <= 0) {
      rows.push(evaluateDesign(Object.assign({}, input, { D: bounds.Dmax })));
      return { bounds: bounds, rows: rows };
    }
    for (var i = 0; i <= steps; i++) {
      var D = bounds.Dmin + ((bounds.Dmax - bounds.Dmin) * i) / steps;
      rows.push(evaluateDesign(Object.assign({}, input, { D: D })));
    }
    return { bounds: bounds, rows: rows };
  }

  function autoOptimise(input, steps) {
    var scan = scanDiameters(input, steps == null ? 80 : steps);
    var best = null;
    for (var i = 0; i < scan.rows.length; i++) {
      var row = scan.rows[i];
      if (!best || row.score > best.score) best = row;
    }
    return { bounds: scan.bounds, rows: scan.rows, best: best };
  }

  function fmt(x, digits) {
    if (x == null || x === "" || !isFinite(Number(x))) return "—";
    var n = Number(x);
    var d = digits == null ? 2 : digits;
    var s = n.toFixed(d);
    if (s.indexOf("-0.") === 0 && Number(s) === 0) s = s.slice(1);
    return s;
  }

  return {
    PI: PI,
    INDEX_MIN: INDEX_MIN,
    INDEX_MAX: INDEX_MAX,
    STANDARD_WIRES: STANDARD_WIRES,
    MATERIALS: MATERIALS,
    ENDS: ENDS,
    materialById: materialById,
    indicativeRm: indicativeRm,
    suggestedClearance: suggestedClearance,
    bergstraesserK: bergstraesserK,
    wahlK: wahlK,
    uncorrectedStress: uncorrectedStress,
    correctedStress: correctedStress,
    activeCoils: activeCoils,
    rateFromGeometry: rateFromGeometry,
    totalCoils: totalCoils,
    solidLength: solidLength,
    pitch: pitch,
    deriveModeA: deriveModeA,
    deriveModeB: deriveModeB,
    diameterBounds: diameterBounds,
    evaluateDesign: evaluateDesign,
    listWires: listWires,
    scanDiameters: scanDiameters,
    autoOptimise: autoOptimise,
    fmt: fmt,
    lerpTable: lerpTable
  };
});
