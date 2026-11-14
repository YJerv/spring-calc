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
        "<p>F1 and F2 are the loads at L1 and L2. A load is not necessarily a dead weight. Two points uses both pairs. Point and rate uses one pair and the rate, and the other end is worked out from that rate.</p>";
      }
    },
    check: {
      title: "Check",
      body: "<p>Check searches standard wire sizes and mean coil diameters inside the pocket and the spring guide. It does not draw that search here.</p>" +
        "<p>Green means a spring meets every criterion: working deflection between 30% and 70% of available travel, and corrected stress within the active limit.</p>" +
        "<p>Orange means a spring can be found only with the wider band, deflection between 20% and 80%, or with a stress limit 20% higher than the one set. The page states which warning applies.</p>" +
        "<p>Red means those allowances are not enough. If the stress would be more than 20% over the limit, or the most compressed length uses more than the available travel, Check says there are no options. Relax the application constraints, alter the duty or select another material.</p>" +
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
        "<p>Entered stress limit bypasses Rm. When that choice is active, every stress check uses the number in N/mm² and the page states that the limit was entered directly. The factor × Rm path stays in use until that choice is selected.</p>"
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
