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

  function dutyDiagram() {
    var charts = null;
    if (typeof SpringCharts !== "undefined") charts = SpringCharts;
    else if (typeof require === "function") charts = require("./charts.js");
    if (charts && typeof charts.dutyIllustration === "function") return charts.dutyIllustration();
    return "";
  }

  function diameterDiagram() {
    return '' +
      '<svg class="help-svg" viewBox="0 0 360 200" role="img" aria-label="End view: pocket around the spring, diametral clearance, and a spring guide through the inside.">' +
      '<circle cx="100" cy="100" r="86" class="help-pocket"/>' +
      '<circle cx="100" cy="100" r="68" class="help-wire"/>' +
      '<circle cx="100" cy="100" r="40" class="help-wire"/>' +
      '<circle cx="100" cy="100" r="24" class="help-rod"/>' +
      '<text x="198" y="36">Pocket</text>' +
      '<text x="198" y="52">maximum outside</text>' +
      '<text x="198" y="84">Clearance</text>' +
      '<text x="198" y="100">pocket minus spring</text>' +
      '<text x="198" y="132">Spring guide</text>' +
      '<text x="198" y="148">plus its clearance</text>' +
      '<text x="198" y="180">Blank box = no limit</text>' +
      '</svg>';
  }

  function endSketch(title, kind) {
    var closed = kind === "closed_ground" || kind === "closed";
    var ground = kind === "closed_ground" || kind === "open_ground";
    var coils = "";
    var i;
    for (i = 0; i < 5; i++) {
      var y = 36 + i * 16;
      var tight = closed && (i === 0 || i === 4);
      if (!closed && (i === 0 || i === 4)) {
        coils += '<path d="M' + (i === 0 ? "24 34 C44 22 64 34 70 34" : "18 100 C40 112 64 100 70 100") + '" class="help-wire"/>';
      } else {
        coils += '<ellipse cx="44" cy="' + y + '" rx="26" ry="' + (tight ? 3.5 : 7) + '" class="help-wire"/>';
      }
    }
    var top = ground ? '<line x1="16" y1="22" x2="72" y2="22" class="help-solid"/>' : "";
    var bottom = ground ? '<line x1="16" y1="114" x2="72" y2="114" class="help-solid"/>' : "";
    return '<figure><figcaption>' + title + '</figcaption>' +
      '<svg class="help-svg" viewBox="0 0 88 132" role="img" aria-label="' + title + '">' +
      top + coils + bottom + '</svg></figure>';
  }

  var TOPICS = {
    duty: {
      title: "Working loads and lengths",
      body: function () {
        return dutyDiagram() +
        "<h3>Two ways to set the duty</h3>" +
        "<p>Two points: enter the longer operating length L1 with its load F1, and the shorter operating length L2 with its load F2. The rate is the change in load divided by the change in length.</p>" +
        "<p>Point and rate: enter one operating length, the load at that length, and the rate R. Say whether that point is the lighter load F1 or the heavier load F2. The other point is worked out from the rate. Design constraints can also set the most compressed and most relaxed working lengths. The stress check then includes the most compressed of those lengths.</p>" +
        "<h3>What the letters mean</h3>" +
        "<p>L1 and L2 are operating lengths set by the application: how long the spring is at each working position. They are not the free length, and they are not the solid length.</p>" +
        "<p>F1 and F2 are the operating loads, in newtons. A load is not necessarily a dead weight.</p>" +
        "<p>The number of coils is calculated from the rate, the wire and the coil diameter. It is not chosen on this page.</p>" +
        "<h3>Solid length and the working range</h3>" +
        "<p>Solid length, Lc, is the length when the coils are pressed together. It is calculated for each candidate from that candidate’s coils, wire diameter and end type. Calculate rejects a candidate when L2 is not longer than that candidate’s own solid length. No further working clearance is added, because a validated clearance beyond L2 greater than Lc is not defined in this calculator.</p>" +
        "<p>Loads become less predictable as a spring nears solid. Keep the operating lengths clear of solid length. A workshop guide, not a rejection rule and not a validated limit, is that operating deflection is ideally about 70% of the available travel, and not beyond about 80%. Available travel is the free length minus the solid length. Calculate does not fail a spring for that guide. Warnings from Calculate stay on the page.</p>";
      }
    },
    diameters: {
      title: "Diameter limits",
      body: diameterDiagram() +
        "<p>The pocket is the largest outside diameter the hole will accept. Diametral clearance is subtracted from the pocket only when a pocket is entered. Leave the pocket blank when there is no outer limit.</p>" +
        "<p>The spring guide diameter is the rod or component that must pass through the spring. Diametral clearance is added to it only when a spring guide diameter is entered. A blank or zero clearance adds nothing. Leave the guide blank when there is no inner limit.</p>" +
        "<p>If the spring guide diameter, including that clearance, is not smaller than the pocket, the page says so before any search. That message stays on the page.</p>" +
        "<p>No extra allowance is added for the outside diameter growing under compression. That allowance is not defined.</p>" +
        "<p>Leaving the pocket blank does not make this app propose a diameter. How a diameter would be chosen is not agreed yet.</p>" +
        "<p>Set an outer pocket, a spring guide diameter, both, or neither. Leave a box blank for no limit.</p>" +
        "<p>Suggested clearance is a typical workshop allowance for a spring working in a hole. Set it to zero if the pocket value is already the maximum outside diameter. No extra allowance is added for the diameter growing under compression; that allowance is not defined.</p>"
    },
    grades: {
      title: "Quality grades",
      body: "<p>These are plain descriptions of the three manufacturing grades this app can apply. They are not a copy of BS EN 15800, and they are not a substitute for it. The grade scales the tolerance band. It does not change the rate, the solid length or the stress check.</p>" +
        "<p>Grade 1, Q = 0.63, is the fine band. Force, length and coil-diameter scatter come out smaller than for the other two grades. Use it only when the duty needs that closer band. Conditions for grade 1 still appear on the results page when they apply. They are not moved into this window.</p>" +
        "<p>Grade 2, Q = 1.00, is the ordinary band. This app starts on grade 2. It is also the grade used here when the drawing does not name one. Grade 1 is only for duties that need it. The standard is BS EN 15800, not BS EN 15000.</p>" +
        "<p>Grade 3, Q = 1.60, is the coarse band. The tolerance scatter is wider. Use it when the assembly can accept that.</p>" +
        "<p>The grade is chosen here, before Calculate. The tolerance figures and any grade warning stay on the results page.</p>"
    },
    ends: {
      title: "End geometry",
      body: '<div class="end-grid">' +
        endSketch("Closed and ground", "closed_ground") +
        endSketch("Closed, not ground", "closed") +
        endSketch("Open and ground", "open_ground") +
        endSketch("Open, not ground", "open") +
        "</div>" +
        "<p>Closed ends finish with coils wound down to touch the previous coil. Open ends do not. Ground ends are flattened so the spring can stand on a face square to its axis. Ends that are not ground keep the wire’s round end.</p>" +
        "<p>The pictures are sketches of those four choices. They are not manufacturing drawings.</p>" +
        "<p>Ends change the solid length. Closed ends add inactive coils. An end that is not ground adds a further wire diameter to the solid length in this calculator. Set the ends before Calculate. The choice does not alter numbers you have already typed.</p>" +
        "<p>Ends, grade and wind are not material properties, so they are not on the material page, and they are not on the wire page. This place is not a final decision.</p>"
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
        "<p>The box sets a screening ceiling: allowable corrected stress = this factor × Rm. The page starts at 0.5, so a candidate fails when the corrected stress is above half the tensile strength. The box accepts 0.2 to 0.8. That range belongs to this control. It is not a certified material limit. The fail or warning text stays on the page; it is not replaced by this window. The wire page still shows its own stress bands.</p>" +
        "<p>Entered stress limit bypasses Rm. When that choice is active, every stress check uses the number in N/mm² and the page states that the limit was entered directly. The factor × Rm path stays in use until that choice is selected.</p>"
    },
    wire: {
      title: "Standard wire diameters",
      body: "<p>The heat map compares mean coil diameter D (rows) with the standard wire diameters (columns). With no pocket and no spring guide, D runs from 1 mm to 100 mm in 1 mm steps and the wires run from 0.2 mm to 12 mm. A pocket limits the top row to the maximum outside diameter minus the thinnest wire, and a spring guide limits the bottom row to the guide plus its clearance plus that wire. Colour follows corrected stress τk as a percentage of allowable; grey cells fail a pocket, spring guide, index, solid-length or coil-count check. Tap a cell to select that D and d.</p>" +
        "<p>Each size is also listed below, evaluated at the largest mean diameter that still fits the pocket: D = De max − d. Corrected stress τk uses the Bergsträsser factor from BS EN 13906-1.</p>"
    },
    graph: {
      title: "Load graph",
      body: "<p>Length stations are labelled under the axis. A horizontal line from each load back to the F axis shows the compression (deflection as a percentage of available travel, L0 − Lc) and the corrected stress τk. Each vertical dotted marker runs from the x-axis up to the spring line, where it meets that horizontal load line. Ln is the length at 85 % of available travel, a workshop recommendation rather than a verbatim clause of the standard.</p>"
    },
    export: {
      title: "A3 drawing export",
      body: "<p>The only export is an A3 PDF drawing. There are no adverts. A one-off permanent Pro unlock for complete drawings is agreed, but the price, Play Billing product and verification server are not configured, so this page cannot unlock one. The file from this button is the unpaid preview: every table value is left out of the PDF, and the sheet carries the line “Upgrade to release drawing table”. The results on this page stay complete.</p>"
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
