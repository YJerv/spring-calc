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

  function currentLoads() {
    if (state.mode === "A") {
      return E.deriveModeA(num("L1"), num("F1"), num("L2"), num("F2"));
    }
    return E.deriveModeB(num("Fb"), num("Lb"), num("Rb"), val("modeBPoint"));
  }

  function refreshLoadSummary() {
    var out = currentLoads();
    state.loads = out.ok ? out : null;
    var box = $("loadSummary");
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
    if (clearance == null) clearance = 0;
    return {
      pocket: pocket,
      clearance: clearance,
      innerMin: innerMin,
      DeMax: pocket == null ? null : pocket - clearance,
      ends: val("ends"),
      wind: val("wind"),
      materialId: val("material"),
      G: num("G"),
      Rm: num("Rm"),
      tauFactor: num("tauFactor"),
      useIndicativeRm: $("useIndicativeRm").checked,
      density: E.materialById(val("material")).density
    };
  }

  function refreshGeomSummary() {
    var g = geometry();
    var box = $("geomSummary");
    var note = $("constraintNote");
    var conflict = E.constraintConflict(g.pocket, g.innerMin);
    if (note) note.textContent = conflict || "";
    var tauAllow = g.Rm > 0 && g.tauFactor > 0 ? g.tauFactor * g.Rm : null;
    box.innerHTML =
      "<dt>Allowable corrected stress (screening)</dt><dd>" +
      (tauAllow ? E.fmt(tauAllow, 0) + " N/mm²  (" + E.fmt(g.tauFactor, 2) + " × Rm)" : "—") + "</dd>";
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
      g.pocket, g.innerMin, g.clearance, g.DeMax, g.ends, g.materialId, g.G, g.Rm, g.tauFactor, g.useIndicativeRm
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
    var tone = report.passing > 0 ? (report.showTravelGuide || report.passingAboveExistingTravelWarning ? "warning" : "pass") : "fail";
    var title = report.passing > 0 ? "Feasible springs found" : "No feasible spring";
    var detail = report.passing > 0
      ? report.passing + " of " + report.checked + " screened wire and diameter combinations pass the existing checks."
      : "None of " + report.checked + " screened combinations pass. Nothing was changed.";
    html += "<div class=\"status-banner " + tone + "\"><strong>" + title + "</strong> — " + esc(detail) + "</div>";
    html += "<p class=\"lead\">" + esc(report.solidRule.statement) + "</p>";
    if (report.passing === 0 && report.hardFailures.length) {
      html += "<p><strong>Why they failed</strong></p><ul>" + report.hardFailures.slice(0, 4).map(function (item) {
        return "<li>" + esc(item.reason) + " (" + item.count + ")</li>";
      }).join("") + "</ul>";
    }
    if (report.suggestions.length) {
      html += "<p><strong>What to try</strong></p><ul>" + report.suggestions.map(function (item) {
        return "<li>" + esc(item.text) + "</li>";
      }).join("") + "</ul>";
    } else if (report.passing === 0) {
      html += "<p class=\"lead\">No checked change produced a passing candidate, so none is suggested. Entered values were not changed.</p>";
    }
    if (report.showTravelGuide) {
      html += "<p class=\"lead\">" + esc(report.travelGuide.statement) + "</p>";
    }
    if (report.passingAboveExistingTravelWarning) {
      html += "<p class=\"lead\">Warning, not a failure: at least one passing candidate uses more than 85% of available travel. That is the calculator’s existing warning.</p>";
    }
    if (report.diameterProposal && report.diameterProposal.proposed === false) {
      html += "<p class=\"lead\">" + esc(report.diameterProposal.statement) + "</p>";
    }
    box.innerHTML = html;
  }

  function markFeasibilityStale() {
    if (!state.feasibility) return;
    if (state.feasibility.signature === feasibilitySignature()) return;
    renderFeasibility(state.feasibility.report, "Inputs have changed. Choose Calculate again. The notes below are out of date.");
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
    var conflict = E.constraintConflict(g.pocket, g.innerMin);
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
      innerMin: g.innerMin,
      DeMax: g.DeMax,
      ends: g.ends,
      G: g.G,
      Rm: g.Rm,
      tauFactor: g.tauFactor,
      materialId: g.materialId,
      useIndicativeRm: g.useIndicativeRm,
      density: g.density
    });
    var report = E.assessFeasibility(input, { steps: 8 });
    state.feasibility = { signature: feasibilitySignature(), report: report };
    renderFeasibility(report, "");
  }

  function validateStep(step) {
    if (step === 1) {
      var out = currentLoads();
      showErr("err1", out.ok ? [] : out.errors);
      if (!out.ok) return false;
      var g = geometry();
      var conflict = E.constraintConflict(g.pocket, g.innerMin);
      if (conflict) {
        renderFeasibility({ ready: false, blocked: "conflict", message: conflict }, "");
        return false;
      }
      if (!state.feasibility || state.feasibility.signature !== feasibilitySignature()) {
        renderFeasibility(state.feasibility ? state.feasibility.report : null,
          "Choose Calculate before continuing. The check runs on that click, not while typing.");
        return false;
      }
      return true;
    }
    if (step === 2) {
      var g = geometry();
      var errs = [];
      if (g.pocket != null && !(g.pocket > 0)) errs.push("The pocket maximum must be greater than zero, or left blank for no outer limit.");
      if (g.innerMin != null && !(g.innerMin > 0)) errs.push("The inside-diameter limit must be greater than zero, or left blank.");
      if (g.pocket != null && !(g.clearance >= 0)) errs.push("Clearance must be zero or greater.");
      if (g.pocket != null && !(g.DeMax > 0)) errs.push("Clearance is not smaller than the pocket, so De max is not positive.");
      var conflict = E.constraintConflict(g.pocket, g.innerMin);
      if (conflict) errs.push(conflict);
      if (!(g.G > 0)) errs.push("Enter a modulus of rigidity G.");
      if (!(g.Rm > 0)) errs.push("Enter a tensile strength Rm.");
      if (!(g.tauFactor > 0)) errs.push("Enter an allowable stress factor.");
      showErr("err2", errs);
      return errs.length === 0;
    }
    if (step === 3) {
      if (!state.selectedWire) {
        showErr("err3", ["Select a wire diameter to continue."]);
        return false;
      }
      showErr("err3", []);
      return true;
    }
    if (step === 4) {
      if (!state.design) {
        showErr("err4", ["Adjust the mean diameter, or use auto-optimise."]);
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
    for (var i = 1; i <= 5; i++) {
      var p = $("p" + i);
      p.className = i === step ? "on" : (i < step ? "done" : "");
    }
    $("btnBack").disabled = step === 1;
    $("btnNext").textContent = step === 5 ? "Start again" : (step === 4 ? "Show results" : "Next");
    if (step === 3) {
      renderHeatmap();
      renderWires();
    }
    if (step === 4) setupOptimise();
    if (step === 5) renderResults();
    window.scrollTo(0, 0);
    persist();
  }

  function wireInputBase() {
    var g = loadInputs();
    return {
      DeMax: g.DeMax,
      innerMin: g.innerMin,
      pocket: g.pocket,
      G: g.G,
      Rm: g.Rm,
      tauFactor: g.tauFactor,
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
    if (input.DeMax == null) {
      state.heatmap = null;
      if (bestBox) {
        bestBox.textContent = "No outer limit is set, so the map is not drawn across the whole index range. Each wire below is evaluated at the existing maximum index, D = 16d. A blank pocket does not propose an optimal diameter; that choice is still open.";
      }
      mount.innerHTML = "";
      return;
    }
    var hm = E.buildHeatmap(input, { step: 0.5 });
    state.heatmap = hm;
    if (bestBox) bestBox.textContent = describeBestDiameters(hm);
    if (!hm.rows.length) {
      mount.innerHTML = "<p class=\"lead\">The heat map has no diameters for these limits. A blank pocket is no outer limit; zero or a rod that is not smaller than the pocket is not usable.</p>";
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
    $("wireIntro").innerHTML =
      "<dt>De max</dt><dd>" + (input.DeMax == null ? "No outer limit" : E.fmt(input.DeMax, 3) + " mm") + "</dd>" +
      "<dt>Minimum inside diameter</dt><dd>" + (input.innerMin == null ? "No inner limit" : E.fmt(input.innerMin, 3) + " mm") + "</dd>" +
      "<dt>Maximum working load</dt><dd>" + E.fmt(input.Fmax, 3) + " N</dd>" +
      "<dt>Required rate</dt><dd>" + E.fmt(input.R, 4) + " N/mm</dd>";
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

  function setupOptimise() {
    var input = Object.assign(wireInputBase(), { d: state.selectedWire, Rm: num("Rm") });
    var scan = E.scanDiameters(input, 80);
    state.scan = scan;
    if (!scan.bounds.valid) {
      $("optMetrics").innerHTML = "";
      showErr("err4", ["This wire cannot produce an index between 4 and 16 that also fits the pocket."]);
      return;
    }
    var slider = $("Dslider");
    slider.min = scan.bounds.Dmin.toFixed(3);
    slider.max = scan.bounds.Dmax.toFixed(3);
    slider.step = "0.01";
    var startD;
    if (state.preferredD != null) startD = state.preferredD;
    else if (state.design && state.design.d === input.d) startD = state.design.D;
    else startD = scan.bounds.Dmax;
    startD = Math.min(scan.bounds.Dmax, Math.max(scan.bounds.Dmin, startD));
    slider.value = startD;
    C.renderTradeoff($("tradeoffSvg"), scan.rows, startD);
    updateOptimise(startD);
  }

  function updateOptimise(D) {
    var input = Object.assign(wireInputBase(), { d: state.selectedWire, D: Number(D), Rm: num("Rm") });
    var ev = E.evaluateDesign(input);
    ev.wind = val("wind");
    ev.materialId = val("material");
    ev.materialName = E.materialById(val("material")).shortName;
    state.design = ev;
    $("Dlabel").textContent = E.fmt(ev.D, 3);
    C.renderTradeoff($("tradeoffSvg"), state.scan ? state.scan.rows : [], ev.D);
    $("optMetrics").innerHTML = [
      metric("Index w", E.fmt(ev.w, 2)),
      metric("Active coils n", E.fmt(ev.n, 2)),
      metric("Corrected stress τk", E.fmt(ev.tauK, 1) + " N/mm²"),
      metric("% of allowable", E.fmt(ev.pctAllow, 1) + " %"),
      metric("Solid length Lc", E.fmt(ev.Lc, 2) + " mm"),
      metric("Outside Ø De", E.fmt(ev.De, 2) + " mm")
    ].join("");
    var banner = "<div class=\"status-banner " + ev.status + "\"><strong>" +
      ev.status.toUpperCase() + "</strong> — " +
      (ev.pass
        ? (ev.warnings[0] || "This diameter satisfies the screening checks.")
        : ev.reasons[0]) + "</div>";
    $("optStatus").innerHTML = banner +
      (ev.warnings.length && ev.pass
        ? "<p class=\"lead\">" + ev.warnings.join(" ") + "</p>"
        : "");
    persist();
  }

  function metric(k, v) {
    return "<div class=\"metric\"><div class=\"k\">" + k + "</div><div class=\"v\">" + v + "</div></div>";
  }

  function autoOptimise() {
    var input = Object.assign(wireInputBase(), { d: state.selectedWire, Rm: num("Rm") });
    var opt = E.autoOptimise(input, 80);
    if (!opt.best) return;
    $("Dslider").value = opt.best.D;
    updateOptimise(opt.best.D);
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
    setVal("gradeResult", String(g));
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

  function renderResults() {
    var ev = state.design;
    if (!ev) return;
    ev.wind = val("wind");
    ev.materialName = E.materialById(val("material")).shortName;
    var model = SpringDrawing.build(ev, {
      grade: currentGrade(),
      clearance: geometry().clearance
    });
    state.drawing = model;
    renderToleranceTable(model);
    var banner = $("resultBanner");
    banner.className = "status-banner " + ev.status;
    banner.innerHTML = "<strong>" + ev.status.toUpperCase() + "</strong> — " +
      (ev.pass
        ? "Screening checks are satisfied for static design at the stated allowable stress."
        : ev.reasons.join(" ")) +
      (ev.warnings.length ? "<br>" + ev.warnings.join(" ") : "");

    C.renderLoadGraph($("graphSvg"), ev);
    C.renderSpringDiagram($("springSvg"), ev);
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
      row("Allowable screening stress", "τzul", E.fmt(ev.tauAllow, 1) + " N/mm²  (" + E.fmt(ev.tauFactor, 2) + " × Rm)"),
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
        mode: state.mode,
        values: {
          L1: val("L1"), F1: val("F1"), L2: val("L2"), F2: val("F2"),
          Lb: val("Lb"), Fb: val("Fb"), Rb: val("Rb"), modeBPoint: val("modeBPoint"),
          pocket: val("pocket"), clearance: val("clearance"), innerMin: val("innerMin"),
          ends: val("ends"), wind: val("wind"), grade: val("grade"),
          material: val("material"), G: val("G"), Rm: val("Rm"),
          tauFactor: val("tauFactor"),
          useIndicativeRm: $("useIndicativeRm").checked,
          selectedWire: state.selectedWire,
          preferredD: state.preferredD,
          D: state.design ? state.design.D : null
        }
      };
      localStorage.setItem(STORAGE, JSON.stringify(data));
    } catch (err) { /* ignore quota / private mode */ }
  }

  function restore() {
    try {
      var raw = localStorage.getItem(STORAGE);
      if (!raw) return;
      var data = JSON.parse(raw);
      var v = data.values || {};
      Object.keys(v).forEach(function (k) {
        if (k === "useIndicativeRm") $("useIndicativeRm").checked = !!v[k];
        else if (k === "selectedWire") state.selectedWire = v[k];
        else if (k === "preferredD") state.preferredD = v[k] == null || v[k] === "" ? null : Number(v[k]);
        else if (k === "D") { /* applied after evaluate */ }
        else if ($(k)) setVal(k, v[k]);
      });
      if (data.step) state.step = data.step;
      if (data.mode) {
        var radio = document.querySelector("input[name=mode][value=\"" + data.mode + "\"]");
        if (radio) radio.checked = true;
      }
      if (v.material) $("material").value = v.material;
      if (v.grade) setGrade(v.grade);
      if (v.G) setVal("G", v.G);
      if (v.Rm) setVal("Rm", v.Rm);
      syncModeUI();
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
      r.addEventListener("change", syncModeUI);
    });
    ["L1", "F1", "L2", "F2", "Lb", "Fb", "Rb", "modeBPoint"].forEach(function (id) {
      $(id).addEventListener("input", function () {
        refreshLoadSummary();
        markFeasibilityStale();
      });
      $(id).addEventListener("change", function () {
        refreshLoadSummary();
        markFeasibilityStale();
      });
    });
    ["pocket", "clearance", "ends", "wind", "G", "Rm", "tauFactor"].forEach(function (id) {
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
      setVal("clearance", E.suggestedClearance(num("pocket")));
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
    $("btnCalculate").addEventListener("click", runCalculate);
    $("passOnly").addEventListener("change", renderWires);
    $("wireList").addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-d]");
      if (btn) selectWire(btn.getAttribute("data-d"));
    });
    $("heatmapScroll").addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-wire][data-coil]");
      if (btn) selectHeatmapCell(btn.getAttribute("data-wire"), btn.getAttribute("data-coil"));
    });
    $("Dslider").addEventListener("input", function (ev) {
      updateOptimise(ev.target.value);
    });
    $("btnOptimise").addEventListener("click", autoOptimise);
    function onGradeInput(id) {
      setGrade(val(id));
      if (state.step === 5 && state.design) renderResults();
      persist();
    }
    $("grade").addEventListener("change", function () { onGradeInput("grade"); });
    $("gradeResult").addEventListener("change", function () { onGradeInput("gradeResult"); });
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
      if (state.step === 5) {
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
