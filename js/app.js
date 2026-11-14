/* global SpringEngine, SpringCharts */
(function () {
  "use strict";
  var E = SpringEngine;
  var C = SpringCharts;
  var STORAGE = "spring-calc-state-v1";

  var state = {
    step: 1,
    mode: "A",
    loads: null,
    selectedWire: null,
    preferredD: null,
    design: null,
    scan: null,
    heatmap: null,
    feasibility: null
  };

  var $ = function (id) { return document.getElementById(id); };

  function val(id) {
    var el = $(id);
    if (!el) return "";
    return el.value;
  }
  function num(id) {
    var n = Number(val(id));
    return n;
  }
  function setVal(id, v) {
    var el = $(id);
    if (el) el.value = v == null ? "" : v;
  }

  function showErr(id, msgs) {
    var el = $(id);
    if (!el) return;
    if (msgs && msgs.length) {
      el.textContent = msgs.join(" ");
      el.classList.add("show");
    } else {
      el.textContent = "";
      el.classList.remove("show");
    }
  }

  function populateMaterials() {
    var sel = $("material");
    sel.innerHTML = E.MATERIALS.map(function (m) {
      return "<option value=\"" + m.id + "\">" + m.name + "</option>";
    }).join("");
    sel.value = "10270-1-DH";
    onMaterialChange();
  }

  function onMaterialChange() {
    var mat = E.materialById(val("material"));
    $("matNote").textContent = mat.note || "";
    setVal("G", mat.G);
    if (mat.rmTable) {
      setVal("Rm", Math.round(E.indicativeRm(mat.id, 2)));
    }
  }

  function syncModeUI() {
    var mode = document.querySelector("input[name=mode]:checked").value;
    state.mode = mode;
    $("modeAFields").classList.toggle("hidden", mode !== "A");
    $("modeBFields").classList.toggle("hidden", mode !== "B");
    $("modeALabel").classList.toggle("selected", mode === "A");
    $("modeBLabel").classList.toggle("selected", mode === "B");
    refreshLoadSummary();
  }

  function stressMode() {
    var checked = document.querySelector("input[name=stressMode]:checked");
    return checked ? checked.value : "factor";
  }

  function serviceRange() {
    var Lcomp = optionalNum("workL2");
    var Lrel = optionalNum("workL1");
    if (Lcomp == null && Lrel == null) return null;
    return { Lcomp: Lcomp, Lrel: Lrel };
  }

  var syncingLengths = false;

  function syncLengths(from) {
    if (syncingLengths) return;
    syncingLengths = true;
    if (state.mode === "A") {
      if (from === "duty") {
        setVal("workL1", val("L1"));
        setVal("workL2", val("L2"));
      } else {
        setVal("L1", val("workL1"));
        setVal("L2", val("workL2"));
      }
    } else if (val("modeBPoint") === "F1") {
      if (from === "duty") setVal("workL1", val("Lb"));
      else setVal("Lb", val("workL1"));
    } else if (from === "duty") {
      setVal("workL2", val("Lb"));
    } else {
      setVal("Lb", val("workL2"));
    }
    syncingLengths = false;
  }

  function currentLoads() {
    var range = serviceRange();
    var complete = range && range.Lcomp != null && range.Lrel != null;
    if (complete && !(range.Lrel > range.Lcomp)) {
      return { ok: false, errors: ["The most relaxed working length must be longer than the most compressed length."] };
    }
    if (state.mode === "A") {
      var out = E.deriveModeA(num("L1"), num("F1"), num("L2"), num("F2"));
      if (out.ok && complete) {
        out.Lcomp = range.Lcomp;
        out.Lrel = range.Lrel;
        if (out.R > 0) out.Fcomp = out.R * (out.L0 - range.Lcomp);
      } else if (out.ok && range && range.Lcomp != null) {
        out.Lcomp = range.Lcomp;
        if (out.R > 0) out.Fcomp = out.R * (out.L0 - range.Lcomp);
      }
      return out;
    }
    var modeB = E.deriveModeB(num("Fb"), num("Lb"), num("Rb"), val("modeBPoint"), complete ? range : null);
    if (modeB.ok && range && range.Lcomp != null && modeB.Lcomp == null) {
      modeB.Lcomp = range.Lcomp;
      if (modeB.R > 0) modeB.Fcomp = modeB.R * (modeB.L0 - range.Lcomp);
    }
    if (modeB.ok && range && range.Lrel != null && modeB.Lrel == null) modeB.Lrel = range.Lrel;
    return modeB;
  }

  function refreshLoadSummary() {
    var out = currentLoads();
    state.loads = out.ok ? out : null;
    var box = $("loadSummary");
    if (!box) return;
    if (!out.ok) {
      box.innerHTML = "";
      return;
    }
    box.innerHTML =
      "<dt>Spring rate R</dt><dd>" + E.fmt(out.R, 4) + " N/mm</dd>" +
      "<dt>Free length L0</dt><dd>" + E.fmt(out.L0, 3) + " mm</dd>" +
      "<dt>Maximum working load</dt><dd>" + E.fmt(out.Fmax, 3) + " N at " +
      E.fmt(out.LmaxLoad, 3) + " mm</dd>";
  }

  function optionalNum(id) {
    var raw = val(id);
    if (raw == null || String(raw).trim() === "") return null;
    var n = Number(raw);
    return isFinite(n) ? n : null;
  }

  function geometry() {
    var pocket = optionalNum("pocket");
    var clearance = optionalNum("clearance");
    var innerMin = optionalNum("innerMin");
    var innerClearance = optionalNum("innerClearance");
    if (clearance == null) clearance = 0;
    if (innerClearance == null) innerClearance = 0;
    return {
      pocket: pocket,
      clearance: clearance,
      innerMin: innerMin,
      innerClearance: innerClearance,
      DeMax: pocket == null ? null : pocket - clearance,
      ends: val("ends"),
      wind: val("wind"),
      materialId: val("material"),
      G: num("G"),
      Rm: num("Rm"),
      tauFactor: num("tauFactor"),
      useDirectStress: stressMode() === "direct",
      tauAllowDirect: optionalNum("tauAllowDirect"),
      serviceTemp: optionalNum("serviceTemp"),
      Lcomp: optionalNum("workL2"),
      Lrel: optionalNum("workL1"),
      useIndicativeRm: $("useIndicativeRm").checked,
      density: E.materialById(val("material")).density
    };
  }

  function activeStressText(g) {
    var direct = g.useDirectStress && g.tauAllowDirect > 0;
    var tauAllow = direct ? g.tauAllowDirect : (g.Rm > 0 && g.tauFactor > 0 ? g.tauFactor * g.Rm : null);
    if (!(tauAllow > 0)) return null;
    var how = direct ? "entered directly" : E.fmt(g.tauFactor, 2) + " × Rm";
    return E.fmt(tauAllow, 0) + " N/mm² (" + how + ")";
  }

  function refreshGeomSummary() {
    var g = geometry();
    var box = $("geomSummary");
    var note = $("constraintNote");
    var conflict = E.constraintConflict(g.pocket, E.springGuideLimit(g));
    if (note) note.textContent = conflict || "";
    var active = activeStressText(g);
    box.innerHTML =
      "<dt>Active stress limit</dt><dd>" + (active || "—") + "</dd>";
    var line = $("stressActive");
    if (line) line.textContent = active ? "Active limit: " + active + "." : "No stress limit is active yet.";
  }

  function syncStressMode() {
    var direct = stressMode() === "direct";
    $("tauAllowDirect").disabled = !direct;
    $("tauFactor").disabled = direct;
    refreshGeomSummary();
  }

  function loadInputs() {
    return Object.assign({}, state.loads, geometry());
  }

  function esc(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function feasibilitySignature() {
    var g = geometry();
    return [
      state.mode, val("L1"), val("F1"), val("L2"), val("F2"),
      val("Lb"), val("Fb"), val("Rb"), val("modeBPoint"),
      g.pocket, g.innerMin, g.innerClearance, g.clearance, g.DeMax, g.ends, g.materialId, g.G, g.Rm, g.tauFactor,
      g.useDirectStress, g.tauAllowDirect, g.serviceTemp, g.Lcomp, g.Lrel, g.useIndicativeRm
    ].join("|");
  }

  function renderFeasibility(report, note) {
    var box = $("calcResult");
    if (!box) return;
    if (!report) {
      box.innerHTML = note ? "<p class=\"lead\">" + esc(note) + "</p>" : "";
      return;
    }
    var html = "";
    if (note) html += "<p class=\"lead\">" + esc(note) + "</p>";
    if (!report.ready) {
      var blocked = report.blocked === "conflict"
        ? "<div class=\"status-banner fail\"><strong>Limits conflict</strong> — " + esc(report.message) + " Nothing was changed.</div>"
        : "<div class=\"status-banner warning\"><strong>Cannot check yet</strong> — Enter a material modulus and tensile strength before the wire search can run. Nothing was changed.</div>";
      html += blocked;
      box.innerHTML = html;
      return;
    }
    var screen = report.screen || { level: "fail", message: E.NO_OPTIONS, warning: "" };
    var tone = screen.level === "pass" ? "pass" : (screen.level === "warning" ? "warning" : "fail");
    var title = screen.level === "pass" ? "Feasible" : (screen.level === "warning" ? "Feasible with a warning" : "No options available");
    var detail = screen.level === "pass"
      ? "Working deflection is between 30% and 70%, and the stress is within the active limit."
      : (screen.level === "warning"
        ? screen.warning
        : (screen.message || E.NO_OPTIONS));
    html += "<div class=\"status-banner " + tone + "\"><strong>" + title + "</strong> — " + esc(detail) + "</div>";
    if (screen.level !== "pass" && report.suggestions && report.suggestions.length) {
      html += "<p><strong>What to try</strong></p><ul>" + report.suggestions.map(function (item) {
        return "<li>" + esc(item.text) + "</li>";
      }).join("") + "</ul>";
    }
    if (report.diameterProposal && report.diameterProposal.proposed === false) {
      html += "<p class=\"lead\">" + esc(report.diameterProposal.statement) + "</p>";
    }
    box.innerHTML = html;
  }

  function markFeasibilityStale() {
    if (!state.feasibility) return;
    if (state.feasibility.signature === feasibilitySignature()) return;
    renderFeasibility(state.feasibility.report, "Inputs have changed. Choose Check again.");
  }

  function runCalculate() {
    var out = currentLoads();
    showErr("err1", out.ok ? [] : out.errors);
    if (!out.ok) {
      state.feasibility = null;
      renderFeasibility(null, out.errors.join(" "));
      return;
    }
    var g = geometry();
    var conflict = E.constraintConflict(g.pocket, E.springGuideLimit(g));
    if (conflict) {
      var blockedReport = {
        ready: false,
        blocked: "conflict",
        message: conflict,
        passing: 0,
        suggestions: []
      };
      state.feasibility = { signature: feasibilitySignature(), report: blockedReport };
      renderFeasibility(blockedReport, "");
      return;
    }
    var input = Object.assign({}, out, {
      pocket: g.pocket,
      clearance: g.clearance,
      innerMin: g.innerMin,
      innerClearance: g.innerClearance,
      DeMax: g.DeMax,
      ends: g.ends,
      G: g.G,
      Rm: g.Rm,
      tauFactor: g.tauFactor,
      useDirectStress: g.useDirectStress,
      tauAllowDirect: g.tauAllowDirect,
      serviceTemp: g.serviceTemp,
      Lcomp: g.Lcomp,
      Lrel: g.Lrel,
      materialId: g.materialId,
      useIndicativeRm: g.useIndicativeRm,
      density: g.density
    });
    var report = E.assessFeasibility(input, { steps: 8 });
    report.screen = E.searchOptimisation(input);
    state.screen = report.screen;
    state.feasibility = { signature: feasibilitySignature(), report: report };
    renderFeasibility(report, "");
  }

  function constraintErrors() {
    var g = geometry();
    var errs = [];
    if (g.pocket != null && !(g.pocket > 0)) errs.push("The pocket maximum must be greater than zero, or left blank for no outer limit.");
    if (g.innerMin != null && !(g.innerMin > 0)) errs.push("The spring guide diameter must be greater than zero, or left blank.");
    if (g.innerMin != null && !(g.innerClearance >= 0)) errs.push("The spring guide clearance must be zero or greater.");
    if (g.pocket != null && !(g.clearance >= 0)) errs.push("Clearance must be zero or greater.");
    if (g.pocket != null && !(g.DeMax > 0)) errs.push("Clearance is not smaller than the pocket, so De max is not positive.");
    var conflict = E.constraintConflict(g.pocket, E.springGuideLimit(g));
    if (conflict) errs.push(conflict);
    if (g.Lcomp != null && g.Lrel != null && !(g.Lrel > g.Lcomp)) {
      errs.push("The most relaxed working length must be longer than the most compressed length.");
    }
    return errs;
  }

  function constraintsBlank() {
    var g = geometry();
    return g.pocket == null && g.innerMin == null && g.Lcomp == null && g.Lrel == null && g.serviceTemp == null;
  }

  function validateStep(step) {
    if (step === 1 || step === 2) return true;
    if (step === 3) {
      var constraintErrs = constraintErrors();
      showErr("errConstraints", constraintErrs);
      if (constraintErrs.length) return false;
      if (constraintsBlank()) {
        var proceed = window.confirm("Nothing is entered for the pocket, the spring guide, the working lengths or the service temperature. Continue without those limits?");
        if (!proceed) return false;
      }
      return true;
    }
    if (step === 4) {
      var g = geometry();
      var errs = [];
      if (!(g.G > 0)) errs.push("Enter a modulus of rigidity G.");
      if (g.useDirectStress) {
        if (!(g.tauAllowDirect > 0)) errs.push("Enter a stress limit in N/mm².");
      } else {
        if (!(g.Rm > 0)) errs.push("Enter a tensile strength Rm.");
        if (!(g.tauFactor > 0)) errs.push("Enter an allowable stress factor.");
      }
      showErr("err2", errs);
      return errs.length === 0;
    }
    if (step === 5) {
      var out = currentLoads();
      showErr("err1", out.ok ? [] : out.errors);
      if (!out.ok) return false;
      var conflict = E.constraintConflict(geometry().pocket, E.springGuideLimit(geometry()));
      if (conflict) {
        renderFeasibility({ ready: false, blocked: "conflict", message: conflict }, "");
        return false;
      }
      if (!state.feasibility || state.feasibility.signature !== feasibilitySignature()) {
        renderFeasibility(state.feasibility ? state.feasibility.report : null,
          "Choose Check before continuing. The check runs on that click, not while typing.");
        return false;
      }
      return true;
    }
    if (step === 6) {
      if (!state.design) {
        showErr("err4", [E.NO_OPTIONS]);
        return false;
      }
      showErr("err4", []);
      return true;
    }
    return true;
  }

  function goTo(step) {
    state.step = step;
    document.querySelectorAll(".step").forEach(function (sec) {
      sec.classList.toggle("active", Number(sec.getAttribute("data-step")) === step);
    });
    for (var i = 1; i <= 7; i++) {
      var p = $("p" + i);
      if (p) p.className = i === step ? "on" : (i < step ? "done" : "");
    }
    $("btnBack").disabled = step === 1;
    $("btnNext").textContent = step === 7 ? "Start again" : (step === 6 ? "Show results" : "Next");
    if (step === 5) alignLengths();
    if (step === 6) renderOptimise();
    if (step === 7) renderResults();
    window.scrollTo(0, 0);
    persist();
  }

  function alignLengths() {
    if (state.mode === "A") {
      if (val("L1") === "" && val("L2") === "" && (val("workL1") !== "" || val("workL2") !== "")) syncLengths("work");
      else if (val("L1") !== "" || val("L2") !== "") syncLengths("duty");
    } else if (val("Lb") === "" && (val("workL2") !== "" || val("workL1") !== "")) {
      syncLengths("work");
    } else if (val("Lb") !== "") {
      syncLengths("duty");
    }
  }

  function wireInputBase() {
    var g = loadInputs();
    return {
      DeMax: g.DeMax,
      innerMin: g.innerMin,
      innerClearance: g.innerClearance,
      pocket: g.pocket,
      clearance: g.clearance,
      G: g.G,
      Rm: g.Rm,
      tauFactor: g.tauFactor,
      useDirectStress: g.useDirectStress,
      tauAllowDirect: g.tauAllowDirect,
      serviceTemp: g.serviceTemp,
      Lcomp: g.Lcomp,
      Lrel: g.Lrel,
      Fcomp: g.Fcomp,
      R: g.R,
      L0: g.L0,
      L1: g.L1,
      F1: g.F1,
      L2: g.L2,
      F2: g.F2,
      Fmax: g.Fmax,
      LmaxLoad: g.LmaxLoad,
      ends: g.ends,
      density: g.density,
      useIndicativeRm: g.useIndicativeRm,
      materialId: g.materialId
    };
  }

  function formatList(items) {
    if (!items.length) return "";
    if (items.length === 1) return items[0];
    if (items.length === 2) return items[0] + " and " + items[1];
    return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
  }

  function describeBestDiameters(hm) {
    if (!hm || !hm.maxViable) {
      return "No combination of mean diameter and standard wire passes every screening check. Try easing the pocket, load or allowable stress.";
    }
    var labels = hm.bestDiameters.map(function (D) { return E.fmt(D, 1); });
    var n = hm.maxViable;
    var sizes = n === 1 ? "1 viable wire size" : n + " viable wire sizes";
    var verb = hm.bestDiameters.length === 1 ? "gives" : "give";
    return "Most wire options: D = " + formatList(labels) + " mm " + verb + " " + sizes + ".";
  }

  function cellLabel(cell) {
    var d = E.fmt(cell.d, 2);
    var D = E.fmt(cell.D, 1);
    if (cell.band === "invalid") {
      var why = (cell.reasons && cell.reasons[0]) || "fails a geometry or coil-count check";
      return "Wire " + d + " mm at D " + D + " mm: invalid — " + why;
    }
    var stress = "τk " + E.fmt(cell.pctAllow, 1) + " % of allowable";
    if (cell.band === "over") return "Wire " + d + " mm at D " + D + " mm: " + stress + " (over)";
    if (cell.viable) return "Wire " + d + " mm at D " + D + " mm: " + stress + (cell.status === "warning" ? " (pass with warning)" : " (viable)");
    return "Wire " + d + " mm at D " + D + " mm: " + stress;
  }

  function renderHeatmap() {
    var mount = $("heatmapScroll");
    var bestBox = $("heatmapBest");
    if (!mount) return;
    var input = wireInputBase();
    var hm = E.buildHeatmap(input);
    state.heatmap = hm;
    if (bestBox) {
      var openMap = input.DeMax == null && !(E.springGuideLimit(input) > 0);
      bestBox.textContent = (openMap
        ? "No pocket or spring guide is set, so mean diameter runs from 1 mm to 100 mm in 1 mm steps. A blank pocket does not propose an optimal diameter; that choice is still open. "
        : "") + describeBestDiameters(hm);
    }
    if (!hm.rows.length) {
      mount.innerHTML = "<p class=\"lead\">The heat map has no diameters for these limits.</p>";
      return;
    }
    var selectedD = state.preferredD;
    var selectedWire = state.selectedWire;
    var head = "<th class=\"sticky-col\">D, mm</th>" +
      hm.wires.map(function (d) {
        return "<th scope=\"col\"><span>" + E.fmt(d, d >= 1 ? 2 : 2) + "</span></th>";
      }).join("") +
      "<th class=\"sticky-end\">Options</th>";
    var displayRows = hm.rows.slice().reverse();
    var body = displayRows.map(function (row) {
      var best = row.isBest ? " best" : "";
      var cells = row.cells.map(function (cell) {
        var sel = (selectedWire != null && selectedD != null &&
          Math.abs(selectedWire - cell.d) < 1e-9 &&
          Math.abs(selectedD - cell.D) < 1e-9) ? " selected" : "";
        return "<td><button type=\"button\" class=\"hm-cell " + cell.band + sel +
          "\" data-wire=\"" + cell.d + "\" data-coil=\"" + cell.D +
          "\" title=\"" + cellLabel(cell).replace(/"/g, "&quot;") +
          "\" aria-label=\"" + cellLabel(cell).replace(/"/g, "&quot;") +
          "\"></button></td>";
      }).join("");
      return "<tr class=\"" + best.trim() + "\">" +
        "<th class=\"sticky-col\" scope=\"row\">" + E.fmt(row.D, 1) +
        (row.isBest ? " <span class=\"best-mark\" title=\"Most wire options\">★</span>" : "") +
        "</th>" + cells +
        "<td class=\"sticky-end count\">" + row.viableCount + "</td></tr>";
    }).join("");
    mount.innerHTML =
      "<table class=\"heatmap\" id=\"heatmapTable\">" +
      "<caption class=\"sr-only\">Mean coil diameter versus standard wire diameter</caption>" +
      "<thead><tr>" + head + "</tr></thead>" +
      "<tbody>" + body + "</tbody></table>";
    var focus = mount.querySelector(".hm-cell.selected") ||
      mount.querySelector("tr.best .hm-cell.good, tr.best .hm-cell.amber") ||
      mount.querySelector("tr.best");
    if (focus) {
      var focusBox = focus.getBoundingClientRect();
      var view = mount.getBoundingClientRect();
      if (view.height && view.width) {
        mount.scrollTop += (focusBox.top + focusBox.bottom) / 2 - (view.top + view.bottom) / 2;
        mount.scrollLeft += (focusBox.left + focusBox.right) / 2 - (view.left + view.right) / 2;
      }
    }
  }

  function selectHeatmapCell(d, D) {
    state.selectedWire = Number(d);
    state.preferredD = Number(D);
    var g = geometry();
    if (g.useIndicativeRm) {
      var irm = E.indicativeRm(g.materialId, state.selectedWire);
      if (irm) setVal("Rm", Math.round(irm));
    }
    showErr("err3", []);
    renderHeatmap();
    renderWires();
    persist();
  }

  function renderWires() {
    var input = wireInputBase();
    var rows = E.listWires(input);
    state.wireRows = rows;
    var passOnly = $("passOnly").checked;
    var shown = rows.filter(function (r) { return passOnly ? r.pass : true; });
    $("wireCount").textContent = shown.length + " of " + rows.length + " sizes";
    if (!shown.length) {
      $("wireList").innerHTML = "<p class=\"lead\">No standard wire in this range satisfies every check at maximum D. Clear “Show passing sizes only” to inspect near-misses, or go back and ease the pocket, load or allowable stress.</p>";
      return;
    }
    $("wireList").innerHTML = shown.map(function (r) {
      var selected = state.selectedWire && Math.abs(state.selectedWire - r.d) < 1e-9;
      var why = r.pass
        ? (r.warnings[0] || "Fits the pocket at D max, with stress and solid length inside limits.")
        : r.reasons[0];
      var rmNote = r.indicativeRm ? " · Rm " + E.fmt(r.indicativeRm, 0) + " N/mm²" : "";
      return "<button type=\"button\" class=\"wire-card " + r.status + (selected ? " selected" : "") +
        "\" data-d=\"" + r.d + "\">" +
        "<div class=\"top\"><span class=\"d\">" + E.fmt(r.d, 2) + " mm wire</span>" +
        "<span class=\"badge " + r.status + "\">" + r.status + "</span></div>" +
        "<div class=\"meta\">τk " + E.fmt(r.tauK, 1) + " N/mm²  (" + E.fmt(r.pctAllow, 1) +
        "% of allowable) · n = " + E.fmt(r.n, 2) + " · Lc = " + E.fmt(r.Lc, 2) +
        " mm · w = " + E.fmt(r.w, 2) + rmNote + "</div>" +
        "<div class=\"why\">" + why + "</div></button>";
    }).join("");
  }

  function selectWire(d) {
    state.selectedWire = Number(d);
    var g = geometry();
    if (g.useIndicativeRm) {
      var irm = E.indicativeRm(g.materialId, state.selectedWire);
      if (irm) setVal("Rm", Math.round(irm));
    }
    renderWires();
    renderHeatmap();
    persist();
  }

  var fillingWires = false;

  function candidateStress(ev) {
    return ev.tauKcomp != null && isFinite(ev.tauKcomp) ? Math.max(ev.tauK, ev.tauKcomp) : ev.tauK;
  }

  function fillOptWires(around) {
    var sel = $("optWire");
    if (!sel || !(around > 0)) return;
    fillingWires = true;
    var current = sel.value;
    var wires = E.nearbyStandardWires(around);
    sel.innerHTML = "<option value=\"\">Best wire at each diameter</option>" + wires.map(function (d) {
      return "<option value=\"" + d + "\">" + E.fmt(d, 2) + " mm</option>";
    }).join("");
    if (current && [].some.call(sel.options, function (opt) { return opt.value === current; })) sel.value = current;
    fillingWires = false;
  }

  function applyCandidate(ev) {
    state.selectedWire = ev.d;
    state.preferredD = ev.D;
    ev.wind = val("wind");
    ev.materialId = val("material");
    ev.materialName = E.materialById(val("material")).shortName;
    state.design = ev;
    persist();
  }

  function renderOptimise() {
    var input = wireInputBase();
    var same = state.screen && state.feasibility && state.feasibility.signature === feasibilitySignature();
    if (!same) {
      state.design = null;
      state.coilChosen = false;
      state.coilNote = "";
    }
    var screen = same ? state.screen : E.searchOptimisation(input);
    state.screen = screen;
    var status = $("optStatus");
    var list = $("optCandidates");
    var metrics = $("optMetrics");
    var note = $("optClearance");
    if (!screen.best) {
      state.design = null;
      if (status) status.innerHTML = "<div class=\"status-banner fail\"><strong>No options available</strong> — " + esc(screen.message || E.NO_OPTIONS) + "</div>";
      if (metrics) metrics.innerHTML = "";
      if (list) list.innerHTML = "";
      if (note) note.textContent = "";
      if ($("optWire")) $("optWire").innerHTML = "";
      showErr("err4", []);
      return;
    }
    showErr("err4", []);
    var tone = screen.level === "pass" ? "pass" : "warning";
    var best = screen.best;
    if (!state.design) applyCandidate(best);
    fillOptWires(best.d);
    var filter = $("optWire") && $("optWire").value !== "" ? Number($("optWire").value) : null;
    var rows = filter
      ? screen.candidates.filter(function (row) { return Math.abs(row.d - filter) < 1e-9; })
      : screen.perDiameter.slice();
    if (!rows.length) rows = [best];
    if (status) {
      status.innerHTML = "<div class=\"status-banner " + tone + "\"><strong>" +
        (screen.level === "pass" ? "Optimum" : "Optimum with a warning") +
        "</strong> — wire " + E.fmt(best.d, 2) + " mm, mean diameter " + E.fmt(best.D, 2) +
        " mm, τk " + E.fmt(candidateStress(best), 1) + " N/mm²." +
        (screen.warning ? " " + esc(screen.warning) : "") + "</div>";
    }
    if (metrics) {
      metrics.innerHTML = [
        metric("Wire d", E.fmt(best.d, 2) + " mm"),
        metric("Mean diameter D", E.fmt(best.D, 2) + " mm"),
        metric("Corrected stress τk", E.fmt(candidateStress(best), 1) + " N/mm²"),
        metric("Deflection L1", best.deflPct1 == null ? "—" : E.fmt(best.deflPct1, 1) + " %"),
        metric("Deflection L2", best.deflPct2 == null ? "—" : E.fmt(best.deflPct2, 1) + " %"),
        metric("Outside Ø De", E.fmt(best.De, 2) + " mm")
      ].join("");
    }
    var growth = best.growth;
    if (note) {
      if (growth && growth.flags && growth.flags.length) note.textContent = growth.flags.join(" ");
      else if (growth && growth.delta != null) note.textContent = "At the most compressed length the outside diameter changes by " + E.fmt(growth.delta, 2) + " mm.";
      else note.textContent = "";
    }
    if (list) {
      list.innerHTML = rows.map(function (row) {
        var on = state.design && Math.abs(state.design.d - row.d) < 1e-9 && Math.abs(state.design.D - row.D) < 1e-4;
        var flag = row.growth && row.growth.flags && row.growth.flags.length ? " · " + row.growth.flags[0] : "";
        return "<button type=\"button\" class=\"wire-card " + (on ? "selected " : "") + tone + "\" data-opt-d=\"" + row.d + "\" data-opt-D=\"" + row.D + "\">" +
          "<div class=\"top\"><strong>D " + E.fmt(row.D, 2) + " mm</strong><span>d " + E.fmt(row.d, 2) + " mm</span></div>" +
          "<div class=\"meta\">τk " + E.fmt(candidateStress(row), 1) + " N/mm² · L1 " +
          (row.deflPct1 == null ? "—" : E.fmt(row.deflPct1, 0) + "%") + " · L2 " +
          (row.deflPct2 == null ? "—" : E.fmt(row.deflPct2, 0) + "%") + esc(flag) + "</div></button>";
        }).join("");
    }
    setupCoilControls(false);
  }

  function activeOptWire() {
    var sel = $("optWire");
    if (sel && sel.value !== "" && Number(sel.value) > 0) return Number(sel.value);
    if (state.selectedWire > 0) return state.selectedWire;
    if (state.screen && state.screen.best) return state.screen.best.d;
    return null;
  }

  function bandNote(ev) {
    if (!ev || !ev.ok || !E.geometricOk(ev)) return "";
    var pcts = [];
    if (ev.deflPct1 != null && isFinite(ev.deflPct1)) pcts.push(ev.deflPct1);
    if (ev.deflPct2 != null && isFinite(ev.deflPct2)) pcts.push(ev.deflPct2);
    function inBand(lo, hi) {
      return pcts.length && pcts.every(function (p) { return p >= lo - 1e-6 && p <= hi + 1e-6; });
    }
    var limit = ev.tauAllow;
    var stress = candidateStress(ev);
    var within = limit > 0 && stress <= limit + 1e-6;
    var raised = limit > 0 && stress <= limit * 1.2 + 1e-6;
    if (inBand(30, 70) && within) return "";
    if (inBand(20, 80) && within) {
      return "Working deflection is outside 30–70 % of available travel. These candidates are between 20 % and 80 %.";
    }
    if (inBand(20, 80) && raised) {
      return "No candidate met the stress limit inside the deflection band. These candidates allow a stress limit 20 % higher than the one set.";
    }
    return "";
  }

  function setupCoilControls(fromUser) {
    var d = activeOptWire();
    var slider = $("Dslider");
    var svg = $("tradeoffSvg");
    if (!slider || !svg || !(d > 0)) return;
    var input = Object.assign(wireInputBase(), { d: d, Rm: num("Rm") });
    var scan = E.scanDiameters(input, 80);
    state.coilScan = scan;
    if (!scan.bounds.valid) {
      svg.innerHTML = "";
      if ($("coilMetrics")) $("coilMetrics").innerHTML = "";
      return;
    }
    slider.min = scan.bounds.Dmin.toFixed(3);
    slider.max = scan.bounds.Dmax.toFixed(3);
    slider.step = "0.01";
    var startD = null;
    if (state.design && Math.abs(state.design.d - d) < 1e-9) startD = state.design.D;
    else if (state.preferredD != null) startD = state.preferredD;
    else startD = scan.bounds.Dmax;
    startD = Math.min(scan.bounds.Dmax, Math.max(scan.bounds.Dmin, Number(startD)));
    slider.value = startD;
    paintCoil(startD, fromUser);
  }

  function paintCoil(D, fromUser) {
    var d = activeOptWire();
    if (!(d > 0)) return;
    var input = Object.assign(wireInputBase(), { d: d, D: Number(D), Rm: num("Rm") });
    var ev = E.evaluateDesign(input);
    ev.wind = val("wind");
    ev.materialId = val("material");
    ev.materialName = E.materialById(val("material")).shortName;
    ev.growth = E.compressedClearance(ev, input);
    state.selectedWire = d;
    state.preferredD = ev.D;
    state.design = ev;
    if (fromUser || state.coilChosen) {
      state.coilChosen = true;
      state.coilNote = bandNote(ev);
    }
    if ($("Dlabel")) $("Dlabel").textContent = E.fmt(ev.D, 3);
    if ($("tradeoffSvg")) C.renderTradeoff($("tradeoffSvg"), state.coilScan ? state.coilScan.rows : [], ev.D);
    if ($("coilMetrics")) {
      $("coilMetrics").innerHTML = [
        metric("Index w", E.fmt(ev.w, 2)),
        metric("Active coils n", E.fmt(ev.n, 2)),
        metric("Corrected stress τk", E.fmt(ev.tauK, 1) + " N/mm²"),
        metric("% of allowable", E.fmt(ev.pctAllow, 1) + " %"),
        metric("Solid length Lc", E.fmt(ev.Lc, 2) + " mm"),
        metric("Outside Ø De", E.fmt(ev.De, 2) + " mm")
      ].join("");
    }
    persist();
  }

  function optimiseCoil() {
    var d = activeOptWire();
    if (!(d > 0)) {
      showErr("err4", ["Pick a standard wire, then optimise its mean diameter."]);
      return;
    }
    var found = E.searchOptimisation(Object.assign(wireInputBase(), { wires: [d], Rm: num("Rm") }));
    if (!found.best) {
      showErr("err4", [found.message || E.NO_OPTIONS]);
      if ($("coilStatus")) {
        $("coilStatus").innerHTML = "<div class=\"status-banner fail\"><strong>No options available</strong> — " + esc(found.message || E.NO_OPTIONS) + "</div>";
      }
      return;
    }
    showErr("err4", []);
    state.coilChosen = true;
    state.coilNote = found.warning || "";
    applyCandidate(found.best);
    if ($("coilStatus")) {
      var tone = found.level === "pass" ? "pass" : "warning";
      $("coilStatus").innerHTML = "<div class=\"status-banner " + tone + "\"><strong>" +
        (found.level === "pass" ? "Optimum for this wire" : "Optimum for this wire, with a warning") +
        "</strong> — D " + E.fmt(found.best.D, 2) + " mm, τk " + E.fmt(candidateStress(found.best), 1) + " N/mm²." +
        (found.warning ? " " + esc(found.warning) : "") + "</div>";
    }
    setupCoilControls(false);
  }

  function metric(k, v) {
    return "<div class=\"metric\"><div class=\"k\">" + k + "</div><div class=\"v\">" + v + "</div></div>";
  }


  function travelPct(ev, L) {
    if (L == null || !(ev.sc > 0)) return null;
    return (100 * (ev.L0 - L)) / ev.sc;
  }

  function renderGraphLegend(ev) {
    var body = $("graphLegend").querySelector("tbody");
    var extras = { L0: "free", L1: "", L2: "max. working", Ln: "85 % travel", Lc: "solid" };
    var stations = C.loadGraphStations(ev);
    body.innerHTML = stations.map(function (s) {
      var extra = extras[s.id] || "";
      return "<tr><td>" + s.id + (extra ? " <span class=\"hint\">" + extra + "</span>" : "") +
        "</td><td>" + E.fmt(s.L, 2) + " mm</td><td>" + E.fmt(s.F, 1) + " N</td><td>" +
        (s.travelPct == null ? "—" : E.fmt(s.travelPct, 1) + " %") + "</td><td>" +
        (s.tauK == null ? "—" : E.fmt(s.tauK, 0) + " N/mm²") + "</td></tr>";
    }).join("");
  }

  function row(name, sym, value) {
    return "<tr><td>" + name + "</td><td class=\"sym\">" + sym + "</td><td>" + value + "</td></tr>";
  }

  function currentGrade() {
    var g = Number(val("grade"));
    if (g !== 1 && g !== 2 && g !== 3) g = 2;
    return g;
  }

  function setGrade(g) {
    g = Number(g);
    if (g !== 1 && g !== 2 && g !== 3) g = 2;
    setVal("grade", String(g));
    return g;
  }

  function renderToleranceTable(model) {
    var body = $("tolerances").querySelector("tbody");
    body.innerHTML = model.table1.rows.map(function (r) {
      return row(r.particular, r.symbol, r.value);
    }).join("");
    var note = $("tolNote");
    if (model.tolerances.notes.length) {
      note.classList.remove("hidden");
      note.innerHTML = model.tolerances.notes.join("<br>");
    } else {
      note.classList.add("hidden");
      note.innerHTML = "";
    }
    $("tolVerify").textContent = model.verificationNote;
  }

  function syncResultFold(card) {
    var summary = card.querySelector("summary");
    if (summary) summary.setAttribute("aria-expanded", card.open ? "true" : "false");
  }

  function bindResultFolds() {
    document.querySelectorAll("#step-6 details.result-fold").forEach(function (card) {
      if (card.getAttribute("data-bound") === "1") {
        syncResultFold(card);
        return;
      }
      card.setAttribute("data-bound", "1");
      syncResultFold(card);
      card.addEventListener("toggle", function () {
        syncResultFold(card);
        if (!card.open || !state.design) return;
        if (card.id === "loadFold") C.renderLoadGraph($("graphSvg"), state.design);
        if (card.id === "springFold") C.renderSpringDiagram($("springSvg"), state.design);
      });
    });
  }

  function renderResults() {
    var ev = state.design;
    if (!ev) return;
    ev.wind = val("wind");
    ev.serviceTemp = geometry().serviceTemp;
    ev.materialName = E.materialById(val("material")).shortName;
    var model = SpringDrawing.build(ev, {
      grade: currentGrade(),
      clearance: geometry().clearance
    });
    state.drawing = model;
    renderToleranceTable(model);
    var banner = $("resultBanner");
    var tierText = state.coilChosen ? (state.coilNote || "") : (state.screen && state.screen.level === "warning" ? state.screen.warning : "");
    var tierWarning = !!tierText;
    banner.className = "status-banner " + (tierWarning ? "warning" : ev.status);
    banner.innerHTML = "<strong>" + (tierWarning ? "WARNING" : ev.status.toUpperCase()) + "</strong> — " +
      (ev.pass
        ? "Screening checks are satisfied for static design at the stated allowable stress."
        : ev.reasons.join(" ")) +
      (tierWarning ? "<br>" + esc(tierText) : "") +
      (ev.warnings.length ? "<br>" + ev.warnings.join(" ") : "");

    C.renderLoadGraph($("graphSvg"), ev);
    C.renderSpringDiagram($("springSvg"), ev);
    bindResultFolds();
    renderGraphLegend(ev);

    var body = $("particulars").querySelector("tbody");
    var windLabel = ev.wind === "left" ? "Left-hand" : "Right-hand";
    body.innerHTML = [
      row("Wire diameter", "d", E.fmt(ev.d, 3) + " mm"),
      row("Mean coil diameter", "D", E.fmt(ev.D, 3) + " mm"),
      row("Outside diameter", "De", E.fmt(ev.De, 3) + " mm"),
      row("Inside diameter", "Di", E.fmt(ev.Di, 3) + " mm"),
      row("Spring index", "w = D/d", E.fmt(ev.w, 3)),
      row("Active coils", "n", E.fmt(ev.n, 3)),
      row("Preferred coils (¼ turns)", "n pref.", E.fmt(ev.nPref, 2) +
        "  (rate would become " + E.fmt(ev.Rpref, 4) + " N/mm)"),
      row("Total coils", "nt", E.fmt(ev.nt, 3)),
      row("Free length", "L0", E.fmt(ev.L0, 3) + " mm"),
      row("Length at F1", "L1", ev.L1 != null ? E.fmt(ev.L1, 3) + " mm" : "—"),
      row("Load F1", "F1", ev.F1 != null ? E.fmt(ev.F1, 3) + " N" : "—"),
      row("Corrected stress at F1", "τk1", ev.tauK1 != null ? E.fmt(ev.tauK1, 1) + " N/mm²" : "—"),
      row("Length at F2", "L2", ev.L2 != null ? E.fmt(ev.L2, 3) + " mm" : "—"),
      row("Load F2", "F2", ev.F2 != null ? E.fmt(ev.F2, 3) + " N" : "—"),
      row("Corrected stress at F2", "τk2", E.fmt(ev.tauK2, 1) + " N/mm²"),
      row("Recommended shortest length", "Ln", E.fmt(ev.Ln, 3) + " mm  (85 % of available travel)"),
      row("Load at Ln", "Fn", E.fmt(ev.Fn, 3) + " N"),
      row("Solid length", "Lc", E.fmt(ev.Lc, 3) + " mm"),
      row("Theoretical solid load", "Fc", E.fmt(ev.Fc, 3) + " N"),
      row("Spring rate", "R", E.fmt(ev.R, 4) + " N/mm"),
      row("Active pitch", "p", E.fmt(ev.p, 3) + " mm"),
      row("Available travel", "L0 − Lc", E.fmt(ev.sc, 3) + " mm"),
      row("Deflection at max. working load", "s", E.fmt(ev.s2, 3) + " mm  (" + E.fmt(ev.deflPct2, 1) + " % of available travel)"),
      row("Bergsträsser factor", "k", E.fmt(ev.k, 4)),
      row("Uncorrected stress at Fmax", "τ", E.fmt(ev.tau, 1) + " N/mm²"),
      row("Corrected stress at Fmax", "τk", E.fmt(ev.tauK, 1) + " N/mm²"),
      row("Allowable screening stress", "τzul", E.fmt(ev.tauAllow, 1) + " N/mm²  (" +
        (ev.stressSource === "direct" ? "entered directly" : E.fmt(ev.tauFactor, 2) + " × Rm") + ")"),
      row("Stress ratio", "τk / τzul", E.fmt(ev.pctAllow, 1) + " %"),
      row("Tensile strength", "Rm", E.fmt(ev.Rm, 0) + " N/mm²"),
      row("Modulus of rigidity", "G", E.fmt(ev.G, 0) + " N/mm²"),
      row("Material", "—", ev.materialName || "—"),
      row("Ends", "—", ev.endsLabel),
      row("Wound direction", "—", windLabel),
      row("Slenderness", "L0 / D", E.fmt(ev.slenderness, 2)),
      row("Approximate mass", "m", ev.mass ? E.fmt(ev.mass * 1000, 2) + " g" : "—"),
      row("Approximate wire length", "—", E.fmt(ev.wireLength, 1) + " mm")
    ].join("");
  }

  function loadExample() {
    document.querySelector("input[name=mode][value=A]").checked = true;
    syncModeUI();
    setVal("L1", 50);
    setVal("F1", 50);
    setVal("L2", 35);
    setVal("F2", 125);
    setVal("pocket", 20);
    setVal("clearance", 1.5);
    setVal("innerMin", "");
    setVal("innerClearance", "");
    setVal("workL1", 50);
    setVal("workL2", 35);
    setVal("serviceTemp", "");
    document.querySelector("input[name=stressMode][value=factor]").checked = true;
    setVal("tauAllowDirect", "");
    syncStressMode();
    setVal("ends", "closed_ground");
    setVal("wind", "right");
    setGrade(2);
    setVal("material", "10270-1-DH");
    onMaterialChange();
    setVal("G", 81500);
    setVal("Rm", 1800);
    setVal("tauFactor", 0.5);
    $("useIndicativeRm").checked = false;
    state.selectedWire = null;
    state.preferredD = null;
    state.design = null;
    state.heatmap = null;
    refreshLoadSummary();
    refreshGeomSummary();
  }

  function persist() {
    try {
      var data = {
        step: state.step,
        pageOrder: "r3-01",
        mode: state.mode,
        values: {
          L1: val("L1"), F1: val("F1"), L2: val("L2"), F2: val("F2"),
          Lb: val("Lb"), Fb: val("Fb"), Rb: val("Rb"), modeBPoint: val("modeBPoint"),
          pocket: val("pocket"), clearance: val("clearance"), innerMin: val("innerMin"),
          innerClearance: val("innerClearance"),
          workL1: val("workL1"), workL2: val("workL2"), serviceTemp: val("serviceTemp"),
          ends: val("ends"), wind: val("wind"), grade: val("grade"),
          material: val("material"), G: val("G"), Rm: val("Rm"),
          tauFactor: val("tauFactor"), tauAllowDirect: val("tauAllowDirect"),
          stressMode: stressMode(),
          useIndicativeRm: $("useIndicativeRm").checked,
          selectedWire: state.selectedWire,
          preferredD: state.preferredD,
          D: state.design ? state.design.D : null
        }
      };
      localStorage.setItem(STORAGE, JSON.stringify(data));
    } catch (err) { /* ignore quota / private mode */ }
  }

  function restoredStep(data) {
    var step = Number(data.step) || 1;
    if (data.pageOrder === "r3-01") return Math.min(7, Math.max(1, step));
    if (data.pageOrder === "r2-01") {
      var map = { 1: 3, 2: 5, 3: 4, 4: 6, 5: 6, 6: 7 };
      return map[step] || 1;
    }
    return 1;
  }

  function restore() {
    try {
      var raw = localStorage.getItem(STORAGE);
      if (!raw) return;
      var data = JSON.parse(raw);
      var v = data.values || {};
      Object.keys(v).forEach(function (k) {
        if (k === "useIndicativeRm") $("useIndicativeRm").checked = !!v[k];
        else if (k === "stressMode") {
          var modeRadio = document.querySelector("input[name=stressMode][value=\"" + v[k] + "\"]");
          if (modeRadio) modeRadio.checked = true;
        }
        else if (k === "Lcomp") setVal("workL2", v[k]);
        else if (k === "Lrel") setVal("workL1", v[k]);
        else if (k === "selectedWire") state.selectedWire = v[k];
        else if (k === "preferredD") state.preferredD = v[k] == null || v[k] === "" ? null : Number(v[k]);
        else if (k === "D") { /* applied after evaluate */ }
        else if ($(k)) setVal(k, v[k]);
      });
      if (data.step) {
        state.step = restoredStep(data);
      }
      if (data.mode) {
        var radio = document.querySelector("input[name=mode][value=\"" + data.mode + "\"]");
        if (radio) radio.checked = true;
      }
      if (v.material) $("material").value = v.material;
      if (v.grade) setGrade(v.grade);
      if (v.G) setVal("G", v.G);
      if (v.Rm) setVal("Rm", v.Rm);
      syncModeUI();
      syncStressMode();
      refreshGeomSummary();
      if (v.preferredD != null && v.preferredD !== "") {
        state.preferredD = Number(v.preferredD);
      } else if (v.D != null && v.D !== "") {
        state.preferredD = Number(v.D);
      }
      if (v.selectedWire && v.D) {
        state.selectedWire = Number(v.selectedWire);
        if (state.loads && (geometry().DeMax == null || geometry().DeMax > 0)) {
          var ev = E.evaluateDesign(Object.assign(wireInputBase(), {
            d: state.selectedWire, D: Number(v.D), Rm: num("Rm")
          }));
          ev.wind = val("wind");
          ev.materialName = E.materialById(val("material")).shortName;
          state.design = ev;
        }
      }
    } catch (err) { /* ignore */ }
  }

  function setupSettings() {
    if (typeof SpringTheme === "undefined") return;
    var theme = SpringTheme.attach(document, window);
    var backdrop = $("settingsDialog");
    var panel = $("settingsPanel");
    var openBtn = $("btnSettings");
    var closeBtn = $("btnSettingsClose");
    if (!backdrop || !panel || !openBtn || !closeBtn) return;
    var lastFocus = null;

    function syncRadios() {
      var choice = theme.getChoice();
      document.querySelectorAll('input[name="themeChoice"]').forEach(function (r) {
        r.checked = r.value === choice;
      });
    }

    function isShown(el) {
      return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    }

    function focusable() {
      return Array.prototype.slice.call(panel.querySelectorAll(
        "button, [href], input, select, textarea"
      )).filter(function (el) {
        return !el.disabled && isShown(el);
      });
    }

    function setPageInert(on) {
      document.querySelectorAll(".app-header, .progress, main, .step-nav").forEach(function (n) {
        if (on) n.setAttribute("inert", "");
        else n.removeAttribute("inert");
      });
    }

    function openSettings() {
      lastFocus = document.activeElement;
      backdrop.hidden = false;
      openBtn.setAttribute("aria-expanded", "true");
      document.body.classList.add("settings-open");
      setPageInert(true);
      syncRadios();
      var checked = panel.querySelector('input[name="themeChoice"]:checked');
      var radios = panel.querySelectorAll('input[name="themeChoice"]');
      (checked || radios[0] || closeBtn).focus();
    }

    function closeSettings() {
      if (backdrop.hidden) return;
      backdrop.hidden = true;
      openBtn.setAttribute("aria-expanded", "false");
      var helpOpen = $("helpDialog") && !$("helpDialog").hidden;
      if (!helpOpen) {
        document.body.classList.remove("settings-open");
        setPageInert(false);
      }
      if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
      else openBtn.focus();
    }

    openBtn.addEventListener("click", openSettings);
    closeBtn.addEventListener("click", closeSettings);
    backdrop.addEventListener("click", function (ev) {
      if (ev.target === backdrop) closeSettings();
    });
    document.addEventListener("keydown", function (ev) {
      if (backdrop.hidden) return;
      if (ev.key === "Escape") {
        ev.preventDefault();
        closeSettings();
        return;
      }
      if (ev.key !== "Tab") return;
      var items = focusable();
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (ev.shiftKey && document.activeElement === first) {
        ev.preventDefault();
        last.focus();
      } else if (!ev.shiftKey && document.activeElement === last) {
        ev.preventDefault();
        first.focus();
      }
    });
    document.querySelectorAll('input[name="themeChoice"]').forEach(function (r) {
      r.addEventListener("change", function () {
        if (r.checked) theme.setChoice(r.value);
      });
    });
    syncRadios();
  }

  function setupHelp() {
    if (typeof SpringHelp === "undefined") return;
    var backdrop = $("helpDialog");
    var panel = $("helpPanel");
    var closeBtn = $("btnHelpClose");
    if (!backdrop || !panel || !closeBtn) return;
    var opener = null;

    function isShown(el) {
      return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    }

    function focusable() {
      return Array.prototype.slice.call(panel.querySelectorAll(
        "button, [href], input, select, textarea"
      )).filter(function (el) {
        return !el.disabled && isShown(el);
      });
    }

    function setPageInert(on) {
      document.querySelectorAll(".app-header, .progress, main, .step-nav").forEach(function (n) {
        if (on) n.setAttribute("inert", "");
        else n.removeAttribute("inert");
      });
    }

    function openHelp(btn) {
      if ($("settingsDialog") && !$("settingsDialog").hidden) return;
      var topic = SpringHelp.topic(btn.getAttribute("data-help"));
      if (!topic) return;
      if (opener) opener.setAttribute("aria-expanded", "false");
      opener = btn;
      $("helpTitle").textContent = topic.title;
      $("helpBody").innerHTML = topic.body;
      backdrop.hidden = false;
      btn.setAttribute("aria-expanded", "true");
      document.body.classList.add("settings-open");
      setPageInert(true);
      closeBtn.focus();
    }

    function closeHelp() {
      if (backdrop.hidden) return;
      backdrop.hidden = true;
      if (opener) opener.setAttribute("aria-expanded", "false");
      var settingsOpen = $("settingsDialog") && !$("settingsDialog").hidden;
      if (!settingsOpen) {
        document.body.classList.remove("settings-open");
        setPageInert(false);
      }
      if (opener && typeof opener.focus === "function") opener.focus();
    }

    document.querySelectorAll(".info-btn[data-help]").forEach(function (btn) {
      btn.addEventListener("click", function () { openHelp(btn); });
    });
    closeBtn.addEventListener("click", closeHelp);
    backdrop.addEventListener("click", function (ev) {
      if (ev.target === backdrop) closeHelp();
    });
    document.addEventListener("keydown", function (ev) {
      if (backdrop.hidden) return;
      if (ev.key === "Escape") {
        ev.preventDefault();
        closeHelp();
        return;
      }
      if (ev.key !== "Tab") return;
      var items = focusable();
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (ev.shiftKey && document.activeElement === first) {
        ev.preventDefault();
        last.focus();
      } else if (!ev.shiftKey && document.activeElement === last) {
        ev.preventDefault();
        first.focus();
      }
    });
  }

  function init() {
    populateMaterials();
    setupSettings();
    setupHelp();
    document.querySelectorAll("input[name=mode]").forEach(function (r) {
      r.addEventListener("change", function () {
        syncModeUI();
        alignLengths();
        markFeasibilityStale();
      });
    });
    ["L1", "F1", "L2", "F2", "Lb", "Fb", "Rb", "modeBPoint"].forEach(function (id) {
      $(id).addEventListener("input", function () {
        if (id === "L1" || id === "L2" || id === "Lb" || id === "modeBPoint") syncLengths("duty");
        refreshLoadSummary();
        markFeasibilityStale();
      });
      $(id).addEventListener("change", function () {
        if (id === "L1" || id === "L2" || id === "Lb" || id === "modeBPoint") syncLengths("duty");
        refreshLoadSummary();
        markFeasibilityStale();
      });
    });
    ["workL1", "workL2", "serviceTemp"].forEach(function (id) {
      $(id).addEventListener("input", function () {
        if (id === "workL1" || id === "workL2") syncLengths("work");
        refreshLoadSummary();
        refreshGeomSummary();
        markFeasibilityStale();
      });
      $(id).addEventListener("change", function () {
        if (id === "workL1" || id === "workL2") syncLengths("work");
        refreshLoadSummary();
        refreshGeomSummary();
        markFeasibilityStale();
      });
    });
    ["pocket", "clearance", "innerMin", "innerClearance", "ends", "wind", "G", "Rm", "tauFactor", "tauAllowDirect"].forEach(function (id) {
      $(id).addEventListener("input", function () {
        refreshGeomSummary();
        markFeasibilityStale();
      });
      $(id).addEventListener("change", function () {
        refreshGeomSummary();
        markFeasibilityStale();
      });
    });
    $("material").addEventListener("change", function () {
      onMaterialChange();
      refreshGeomSummary();
      markFeasibilityStale();
    });
    $("useIndicativeRm").addEventListener("change", markFeasibilityStale);
    $("btnClearance").addEventListener("click", function () {
      var pocket = num("pocket");
      var guide = num("innerMin");
      if (!(pocket > 0) && !(guide > 0)) {
        showErr("errConstraints", ["Enter a pocket or a spring guide diameter before using the suggested clearance."]);
        return;
      }
      showErr("errConstraints", []);
      if (pocket > 0) setVal("clearance", E.suggestedClearance(pocket));
      if (guide > 0) setVal("innerClearance", E.suggestedClearance(guide));
      refreshGeomSummary();
      markFeasibilityStale();
    });
    $("pocket").addEventListener("change", function () {
      if (val("clearance") === "") {
        setVal("clearance", E.suggestedClearance(num("pocket")));
      }
      refreshGeomSummary();
    });
    $("btnExample").addEventListener("click", function () {
      loadExample();
      markFeasibilityStale();
    });
    $("btnCheck").addEventListener("click", runCalculate);
    $("optWire").addEventListener("change", function () {
      if (fillingWires) return;
      renderOptimise();
    });
    $("Dslider").addEventListener("input", function (ev) {
      paintCoil(ev.target.value, true);
    });
    $("btnOptimise").addEventListener("click", optimiseCoil);
    $("optCandidates").addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-opt-d]");
      if (!btn || !state.screen) return;
      var d = Number(btn.getAttribute("data-opt-d"));
      var D = Number(btn.getAttribute("data-opt-D"));
      var row = (state.screen.candidates || []).filter(function (item) {
        return Math.abs(item.d - d) < 1e-9 && Math.abs(item.D - D) < 1e-4;
      })[0];
      if (!row) return;
      applyCandidate(row);
      renderOptimise();
    });
    document.querySelectorAll("input[name=stressMode]").forEach(function (r) {
      r.addEventListener("change", function () {
        syncStressMode();
        markFeasibilityStale();
      });
    });
    function onGradeInput(id) {
      setGrade(val(id));
      if (state.step === 7 && state.design) renderResults();
      persist();
    }
    $("grade").addEventListener("change", function () { onGradeInput("grade"); });
    function refreshExportName() {
      if (!$("exportFilename") || typeof SpringPdf === "undefined" || typeof SpringEntitlement === "undefined") return;
      var naming = SpringPdf.exportFilename({
        requestedName: val("exportName"),
        entitlement: SpringEntitlement.productionEntitlement()
      });
      $("exportFilename").textContent = "This file will be saved as " + naming.filename + ".";
    }
    $("exportName").addEventListener("input", refreshExportName);
    refreshExportName();
    $("btnExportA3").addEventListener("click", function () {
      if (!state.design || typeof SpringPdf === "undefined") return;
      state.design.wind = val("wind");
      state.design.serviceTemp = geometry().serviceTemp;
      state.design.materialName = E.materialById(val("material")).shortName;
      var entitlement = (typeof SpringEntitlement !== "undefined")
        ? SpringEntitlement.productionEntitlement()
        : undefined;
      var naming = SpringPdf.exportFilename({
        requestedName: val("exportName"),
        entitlement: entitlement
      });
      if ($("exportFilename")) {
        $("exportFilename").textContent = "This file will be saved as " + naming.filename + ".";
      }
      SpringPdf.save(state.design, {
        grade: currentGrade(),
        clearance: geometry().clearance,
        outerLimit: geometry().pocket != null,
        innerLimit: geometry().innerMin != null,
        requestedName: naming.paid ? val("exportName") : "",
        entitlement: entitlement
      });
    });
    $("btnBack").addEventListener("click", function () {
      if (state.step > 1) goTo(state.step - 1);
    });
    $("btnNext").addEventListener("click", function () {
      if (state.step === 7) {
        goTo(1);
        return;
      }
      if (!validateStep(state.step)) return;
      goTo(state.step + 1);
    });
    syncModeUI();
    restore();
    goTo(state.step || 1);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(function () { /* offline later */ });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
