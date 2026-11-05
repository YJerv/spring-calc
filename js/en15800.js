/**
 * BS EN 15800:2008 manufacturing tolerances for cold-coiled
 * cylindrical helical compression springs of round wire.
 *
 * Verification status (see VERIFICATION):
 * - Scope, Q, kf (Annex A.1), AF (clause 6.4), AL0 (clause 6.5) and
 *   e1/e2 (Table 5) were checked against published clause values
 *   (EN 15800 text as publicly reproduced, Filame, and HEXAGON's
 *   published kf correction, which matches Futterknecht's tabulated
 *   "Formel A.1" values).
 * - Coil-diameter table AD is EN 15800 Table 3 transcribed from one
 *   public copy of the standard. It was sanity-checked (17 diameter
 *   bands × 3 index bands × 3 grades, monotonic, grade 1 tighter than
 *   grade 2 tighter than grade 3) but not re-read from a licensed PDF.
 * - aF is Annex A equation (A.2) transcribed from that same copy.
 *   Parsed as a cubic in (w/10), it lies within a few percent of
 *   published DIN 2095 diagram readings (Futterknecht, d = 5 mm).
 *   The coefficient decimals were not confirmed from a clean print.
 *
 * Not a substitute for the published standard.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.SpringEn15800 = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var Q_BY_GRADE = { 1: 0.63, 2: 1, 3: 1.6 };

  /** Upper edges of the Table 3 diameter bands. First band starts at 0.63. */
  var D_EDGES = [0.63, 1, 1.6, 2.5, 4, 6.3, 10, 16, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200];

  /**
   * Table 3 permissible variation AD (mm), half-width of the ± tolerance.
   * Index: [grade 0..2][spring-index band 0..2][diameter band 0..16]
   * Index bands: 4–8, above 8 to 14, above 14 to 20.
   * TRANSCRIBED — see file header.
   */
  var AD_TABLE = [
    [
      [0.05, 0.05, 0.07, 0.10, 0.10, 0.15, 0.15, 0.20, 0.25, 0.25, 0.30, 0.40, 0.50, 0.60, 0.70, 0.90, 1.20],
      [0.07, 0.07, 0.10, 0.10, 0.15, 0.15, 0.20, 0.25, 0.30, 0.30, 0.40, 0.50, 0.70, 0.80, 1.00, 1.20, 1.50],
      [0.10, 0.10, 0.15, 0.15, 0.20, 0.20, 0.25, 0.30, 0.35, 0.35, 0.50, 0.60, 0.80, 0.90, 1.10, 1.40, 1.70]
    ],
    [
      [0.07, 0.08, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.50, 0.60, 0.80, 1.00, 1.20, 1.40, 1.80, 2.10],
      [0.10, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.45, 0.50, 0.60, 0.80, 1.00, 1.20, 1.50, 1.90, 2.30, 2.90],
      [0.15, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.50, 0.60, 0.70, 0.90, 1.10, 1.40, 1.70, 2.20, 2.70, 3.30]
    ],
    [
      [0.10, 0.15, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 1.00, 1.20, 1.50, 1.80, 2.30, 2.80, 3.50, 4.20],
      [0.15, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.90, 1.00, 1.20, 1.50, 2.00, 2.40, 3.00, 3.70, 4.60, 5.70],
      [0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 1.00, 1.20, 1.50, 1.80, 2.30, 2.80, 3.50, 4.40, 5.40, 6.60]
    ]
  ];

  var VERIFICATION = {
    scope: "verified",
    Q: "verified",
    kf: "verified",
    AF: "verified",
    AL0: "verified",
    e1e2: "verified",
    AD: "transcribed",
    aF: "transcribed"
  };

  var VERIFICATION_NOTE =
    "BS EN 15800 grade factor Q, coil factor kf (Annex A.1), force tolerance AF, " +
    "free-length tolerance AL0, squareness e1, parallelism e2 and the scope limits " +
    "were checked against published clause values. Coil-diameter tolerances are " +
    "Table 3 transcribed from a public copy of EN 15800:2008 (not re-read from a " +
    "licensed PDF). The geometry factor aF is Annex A (A.2) from that same copy; " +
    "as a cubic in (w/10) it lies within a few percent of published DIN 2095 diagram " +
    "readings, but the coefficient decimals were not confirmed from a clean print. " +
    "This is a design aid, not a certified copy of the standard.";

  function qualityFactor(grade) {
    var q = Q_BY_GRADE[Number(grade)];
    return q == null ? null : q;
  }

  /**
   * Annex A equation (A.1).
   * kf = −1/(3 n²) + 8/(5 n) + 0.803
   * Checked against HEXAGON Info Letter 148 and Futterknecht's A.1 table
   * (n = 2 → 1.520, n = 10 → 0.960, n = 100 → 0.819).
   */
  function coilFactorKf(n) {
    n = Number(n);
    if (!(n > 0)) return NaN;
    return -1 / (3 * n * n) + 8 / (5 * n) + 0.803;
  }

  /**
   * Annex A equation (A.2), with (A.3) w = D/d.
   * aF = 65.92 · d^3.3 / D^1.6 · [−0.84 x³ + 3.781 x² − 4.244 x + 2.274],
   * x = w/10.
   * TRANSCRIBED — see file header.
   */
  function geometryFactorAf(d, D) {
    d = Number(d);
    D = Number(D);
    if (!(d > 0) || !(D > 0)) return NaN;
    var x = (D / d) / 10;
    var poly = -0.84 * x * x * x + 3.781 * x * x - 4.244 * x + 2.274;
    return 65.92 * Math.pow(d, 3.3) / Math.pow(D, 1.6) * poly;
  }

  /** Clause 6.4 equation (4): AF = ± (aF · kf + 1.5 F / 100) · Q */
  function forceTolerance(aF, kf, F, Q) {
    return Math.abs((Number(aF) * Number(kf) + 1.5 * Number(F) / 100) * Number(Q));
  }

  /** Clause 6.5 equation (5): AL0 = ± aF · kf · Q / R */
  function lengthTolerance(aF, kf, Q, R) {
    R = Number(R);
    if (!(R > 0)) return NaN;
    return Math.abs(Number(aF) * Number(kf) * Number(Q) / R);
  }

  /** Table 5. e1 is a length (fraction of L0); e2 is a length (fraction of De). */
  function endTolerances(grade, L0, De) {
    var g = Number(grade);
    var e1Factor = g === 1 ? 0.03 : g === 2 ? 0.05 : g === 3 ? 0.08 : null;
    var e2Factor = g === 1 ? 0.015 : g === 2 ? 0.03 : g === 3 ? 0.06 : null;
    if (e1Factor == null) return null;
    return {
      e1: e1Factor * Number(L0),
      e2: e2Factor * Number(De),
      e1Factor: e1Factor,
      e2Factor: e2Factor
    };
  }

  function diameterBandIndex(D) {
    D = Number(D);
    if (!(D >= D_EDGES[0] - 1e-9) || D > D_EDGES[D_EDGES.length - 1] + 1e-9) return -1;
    for (var i = 0; i < D_EDGES.length - 1; i++) {
      var lo = D_EDGES[i];
      var hi = D_EDGES[i + 1];
      if (i === 0) {
        if (D <= hi + 1e-9) return 0;
      } else if (D > lo + 1e-9 && D <= hi + 1e-9) {
        return i;
      }
    }
    return -1;
  }

  /** 0: 4 ≤ w ≤ 8; 1: 8 < w ≤ 14; 2: 14 < w ≤ 20. */
  function indexBand(w) {
    w = Number(w);
    if (!(w >= 4 - 1e-9) || w > 20 + 1e-9) return -1;
    if (w <= 8 + 1e-9) return 0;
    if (w <= 14 + 1e-9) return 1;
    return 2;
  }

  function coilDiameterTolerance(D, w, grade) {
    var gi = Number(grade) - 1;
    var di = diameterBandIndex(D);
    var wi = indexBand(w);
    if (gi < 0 || gi > 2 || di < 0 || wi < 0) return null;
    return AD_TABLE[gi][wi][di];
  }

  function scopeIssues(design) {
    var issues = [];
    var d = Number(design.d);
    var D = Number(design.D);
    var L0 = Number(design.L0);
    var n = Number(design.n);
    var w = Number(design.w);
    if (!(d >= 0.07 && d <= 16)) {
      issues.push("Wire diameter d is outside the BS EN 15800 scope (0.07 mm to 16 mm).");
    }
    if (!(D >= 0.63 && D <= 200)) {
      issues.push("Mean coil diameter D is outside the BS EN 15800 scope (0.63 mm to 200 mm).");
    }
    if (!(L0 <= 630)) {
      issues.push("Free length L0 is outside the BS EN 15800 scope (L0 ≤ 630 mm).");
    }
    if (!(n >= 2)) {
      issues.push("Active coils n are outside the BS EN 15800 scope (n ≥ 2).");
    }
    if (!(w >= 4 && w <= 20)) {
      issues.push("Spring index w is outside the BS EN 15800 scope (4 to 20).");
    }
    return issues;
  }

  function grade1Notes(design) {
    var notes = [];
    var w = Number(design.w);
    var lambda = Number(design.D) > 0 ? Number(design.L0) / Number(design.D) : Infinity;
    if (w > 12 + 1e-9) {
      notes.push("BS EN 15800 states that quality grade 1 can only be achieved when the spring index w is 12 or less.");
    }
    if (lambda > 5 + 1e-9) {
      notes.push("BS EN 15800 states that quality grade 1 can only be achieved when the slenderness ratio L0/D is 5 or less.");
    }
    return notes;
  }

  function finiteOrNull(v) {
    if (v == null || v === "") return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }

  /**
   * Full tolerance set for a design from the calculation engine.
   * grade defaults to 2 (the standard's default when the drawing is silent).
   */
  function assess(design, grade) {
    design = design || {};
    grade = Number(grade);
    if (!Q_BY_GRADE[grade]) grade = 2;
    var Q = Q_BY_GRADE[grade];
    var d = Number(design.d);
    var D = Number(design.D);
    var w = Number(design.w);
    var n = Number(design.n);
    var R = Number(design.R);
    var L0 = Number(design.L0);
    var De = Number(design.De);
    var scope = scopeIssues(design);
    var kf = coilFactorKf(n);
    var aF = geometryFactorAf(d, D);
    var AD = coilDiameterTolerance(D, w, grade);
    var F1 = finiteOrNull(design.F1);
    var F2 = finiteOrNull(design.F2);
    var twoLoads = F1 != null && F2 != null;
    var AL0 = lengthTolerance(aF, kf, Q, R);
    var closedGround = design.ends === "closed_ground";
    var ends = closedGround ? endTolerances(grade, L0, De) : null;
    var notes = scope.slice();
    if (grade === 1) notes = notes.concat(grade1Notes(design));
    if (!scope.length && (AD == null || !isFinite(aF) || !isFinite(kf))) {
      notes.push("EN 15800 tolerances could not be evaluated for this geometry.");
    }

    function loadRow(id, F, L) {
      if (F == null) return null;
      return {
        id: id,
        F: F,
        L: L,
        AF: forceTolerance(aF, kf, F, Q)
      };
    }

    var loads = [];
    var row1 = loadRow("F1", F1, finiteOrNull(design.L1));
    var row2 = loadRow("F2", F2, finiteOrNull(design.L2));
    if (row1) loads.push(row1);
    if (row2) loads.push(row2);
    var Fn = finiteOrNull(design.Fn);
    var fnRow = loadRow("Fn", Fn, finiteOrNull(design.Ln));

    return {
      grade: grade,
      Q: Q,
      kf: kf,
      aF: aF,
      AD: AD,
      AL0: AL0,
      twoLoads: twoLoads,
      L0ReferenceOnly: twoLoads,
      endsClosedGround: closedGround,
      squareness: ends,
      loads: loads,
      fn: fnRow,
      lambda: Number(design.D) > 0 ? L0 / Number(design.D) : null,
      inScope: scope.length === 0,
      scopeWarnings: scope,
      notes: notes,
      verification: VERIFICATION,
      verificationNote: VERIFICATION_NOTE
    };
  }

  return {
    Q_BY_GRADE: Q_BY_GRADE,
    D_EDGES: D_EDGES,
    AD_TABLE: AD_TABLE,
    VERIFICATION: VERIFICATION,
    VERIFICATION_NOTE: VERIFICATION_NOTE,
    qualityFactor: qualityFactor,
    coilFactorKf: coilFactorKf,
    geometryFactorAf: geometryFactorAf,
    forceTolerance: forceTolerance,
    lengthTolerance: lengthTolerance,
    endTolerances: endTolerances,
    diameterBandIndex: diameterBandIndex,
    indexBand: indexBand,
    coilDiameterTolerance: coilDiameterTolerance,
    scopeIssues: scopeIssues,
    grade1Notes: grade1Notes,
    assess: assess
  };
});
