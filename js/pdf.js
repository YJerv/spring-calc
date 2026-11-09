/**
 * Client-side A3 landscape drawing (ASME Y14.5 frame) using jsPDF.
 * The library is vendored so the PWA works offline.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./drawing.js"),
      require("../vendor/jspdf.umd.min.js"),
      require("./entitlement.js")
    );
  } else {
    root.SpringPdf = factory(root.SpringDrawing, root.jspdf, root.SpringEntitlement);
  }
})(typeof self !== "undefined" ? self : this, function (Drawing, jspdfNs, Entitlement) {
  "use strict";

  function JsPDF() {
    if (jspdfNs && typeof jspdfNs.jsPDF === "function") return jspdfNs.jsPDF;
    if (typeof jspdfNs === "function") return jspdfNs;
    throw new Error("jsPDF is not loaded");
  }

  /* Built-in PDF fonts are WinAnsi. Greek tau, ≤ and typographic dashes do not draw. */
  function pdfText(value) {
    return String(value)
      .replace(/τk/g, "tk")
      .replace(/τzul/g, "tzul")
      .replace(/τ/g, "tau")
      .replace(/≤/g, "<=")
      .replace(/≥/g, ">=")
      .replace(/\u2014/g, "\x97")
      .replace(/\u2013/g, "\x96")
      .replace(/\u2212/g, "-")
      .replace(/×/g, "x")
      .replace(/·/g, "|");
  }

  function usePdfText(doc) {
    var rawText = doc.text.bind(doc);
    var rawSplit = doc.splitTextToSize.bind(doc);
    doc.text = function (text, x, y, options) {
      if (Array.isArray(text)) text = text.map(pdfText);
      else text = pdfText(text);
      return rawText(text, x, y, options);
    };
    doc.splitTextToSize = function (text, size) {
      return rawSplit(pdfText(text), size);
    };
    return doc;
  }

  function drawThirdAngle(doc, x, y) {
    var r = 3.1;
    var cx = x + r;
    var cy = y;
    doc.setDrawColor(11, 31, 51);
    doc.setLineWidth(0.25);
    doc.circle(cx, cy, r, "S");
    var x0 = cx + r + 1.5;
    var hL = r;
    var hR = r * 0.46;
    var w = 8.2;
    doc.line(x0, cy - hL, x0 + w, cy - hR);
    doc.line(x0 + w, cy - hR, x0 + w, cy + hR);
    doc.line(x0 + w, cy + hR, x0, cy + hL);
    doc.line(x0, cy + hL, x0, cy - hL);
  }

  function arrow(doc, x1, y1, x2, y2) {
    doc.line(x1, y1, x2, y2);
    var ang = Math.atan2(y2 - y1, x2 - x1);
    var len = 2.0;
    var spread = 0.38;
    doc.line(x2, y2, x2 - len * Math.cos(ang - spread), y2 - len * Math.sin(ang - spread));
    doc.line(x2, y2, x2 - len * Math.cos(ang + spread), y2 - len * Math.sin(ang + spread));
  }

  function dimArrow(doc, x1, y1, x2, y2) {
    arrow(doc, x1, y1, x2, y2);
    arrow(doc, x2, y2, x1, y1);
  }

  function drawHelix(doc, model) {
    var v = model.view;
    var scale = model.scale;
    var De = v.De;
    var d = v.d;
    var D = v.D;
    var L0 = v.L0;
    var n = v.n;
    var nt = v.nt;
    var cx = model.layout && model.layout.axisX != null
      ? model.layout.axisX
      : v.x + 58 + (v.w - 70) / 2;
    var drawnH = L0 * scale;
    var yTop = v.y + 10;
    var half = (De * scale) / 2;
    var stroke = Math.max(0.25, d * scale * 0.85);

    var ground = String(v.ends || "").indexOf("ground") >= 0;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.35);
    if (ground) {
      doc.line(cx - half - 1.5, yTop, cx + half + 1.5, yTop);
      doc.line(cx - half - 1.5, yTop + drawnH, cx + half + 1.5, yTop + drawnH);
    }

    var turns = Math.max(nt, 2);
    var steps = Math.max(48, Math.round(turns * 20));
    var dead = Math.max(nt - n, 0);
    function yAtTurn(t) {
      if (dead >= 1.5) {
        var endRise = d * 0.55;
        var midRise = Math.max(L0 - 2 * endRise, 0);
        if (t <= 1) return t * endRise;
        if (t >= nt - 1) return endRise + midRise + (t - (nt - 1)) * endRise;
        return endRise + ((t - 1) / Math.max(n, 1e-9)) * midRise;
      }
      return (t / turns) * L0;
    }

    var front = [];
    var back = [];
    function flush(buf, grey) {
      if (buf.length < 2) return;
      doc.setDrawColor(grey ? 150 : 0, grey ? 150 : 0, grey ? 150 : 0);
      doc.setLineWidth(stroke);
      doc.setLineCap("round");
      doc.setLineJoin("round");
      for (var i = 1; i < buf.length; i++) {
        doc.line(buf[i - 1][0], buf[i - 1][1], buf[i][0], buf[i][1]);
      }
    }
    var prevFront = true;
    for (var i = 0; i <= steps; i++) {
      var t = (i / steps) * turns;
      var ang = t * 2 * Math.PI;
      var x = cx + (D * 0.5 * scale) * Math.sin(ang);
      var y = yTop + yAtTurn(t) * scale;
      var isFront = Math.cos(ang) >= 0;
      if (i > 0 && isFront !== prevFront) {
        flush(isFront ? back : front, !isFront);
        if (isFront) back = [];
        else front = [];
      }
      (isFront ? front : back).push([x, y]);
      prevFront = isFront;
    }
    flush(back, true);
    flush(front, false);

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.25);
    var dimX = cx - half - 12;
    dimArrow(doc, dimX, yTop, dimX, yTop + drawnH);
    doc.line(cx - half, yTop, dimX - 1.5, yTop);
    doc.line(cx - half, yTop + drawnH, dimX - 1.5, yTop + drawnH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text("L0 = " + trimNum(L0) + " mm", dimX - 2.6, yTop + drawnH / 2, { angle: 90, align: "center" });

    var yDe = yTop + drawnH + 5;
    dimArrow(doc, cx - half, yDe, cx + half, yDe);
    doc.line(cx - half, yTop + drawnH, cx - half, yDe + 1.2);
    doc.line(cx + half, yTop + drawnH, cx + half, yDe + 1.2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("De = " + trimNum(De) + " mm", cx, yDe + 3.2, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("d = " + trimNum(d) + " mm", cx + half + 3, yTop + 4);
    doc.text(model.hand + "  ·  " + model.ends, v.x + 2, v.y + 7.2);

    doc.setFontSize(7);
    doc.text("Side view at free length", v.x + 2, v.y + 3.5);
  }

  function drawEndView(doc, model) {
    var box = model.layout.end;
    var v = model.view;
    var cx = model.layout.axisX;
    var capStep = 3.4;
    var limit = Math.min(box.y + box.h, model.layout.notes.y - 1.5);
    var capLast = limit - 0.6;
    var ringLimit = capLast - capStep * 3 - 1.4;
    var rOuter = Math.min(box.w / 2 - 4.2, (ringLimit - (box.y + 5.6)) / 2);
    var cy = box.y + 5.4 + rOuter;
    var rInner = rOuter * (v.Di / Math.max(v.De, 0.1));
    if (!(rInner > 1) || rInner >= rOuter - 0.8) rInner = rOuter * 0.78;
    var rMid = (rOuter + rInner) / 2;
    var ring = rOuter - rInner;

    doc.setFillColor(226, 226, 226);
    doc.circle(cx, cy, rOuter, "F");
    doc.setFillColor(255, 255, 255);
    doc.circle(cx, cy, rInner, "F");

    var aStart = -22 * Math.PI / 180;
    var aEnd = -248 * Math.PI / 180;
    var steps = 72;
    var i;
    function bandRadii(u) {
      var taper = u > 0.9 ? Math.max(0.03, (1 - u) / 0.1) : 1;
      var half = ring * 0.22 * taper;
      return { inner: rMid - half, outer: rMid + half };
    }
    doc.setFillColor(55, 55, 55);
    doc.setDrawColor(55, 55, 55);
    doc.setLineWidth(0.35);
    for (i = 0; i < steps; i++) {
      var u0 = i / steps;
      var u1 = (i + 1) / steps;
      var g0 = aStart + (aEnd - aStart) * u0;
      var g1 = aStart + (aEnd - aStart) * u1;
      var p0 = bandRadii(u0);
      var p1 = bandRadii(u1);
      var o0x = cx + p0.outer * Math.cos(g0);
      var o0y = cy + p0.outer * Math.sin(g0);
      var o1x = cx + p1.outer * Math.cos(g1);
      var o1y = cy + p1.outer * Math.sin(g1);
      var i0x = cx + p0.inner * Math.cos(g0);
      var i0y = cy + p0.inner * Math.sin(g0);
      var i1x = cx + p1.inner * Math.cos(g1);
      var i1y = cy + p1.inner * Math.sin(g1);
      doc.triangle(o0x, o0y, o1x, o1y, i0x, i0y, "FD");
      doc.triangle(i0x, i0y, o1x, o1y, i1x, i1y, "FD");
    }

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.28);
    doc.circle(cx, cy, rOuter, "S");
    doc.circle(cx, cy, rInner, "S");

    var reach = rOuter + 2.6;
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.18);
    doc.setLineDashPattern([1.8, 0.7, 0.28, 0.7], 0);
    doc.line(cx - reach, cy, cx + reach, cy);
    doc.line(cx, cy - reach, cx, cy + reach);
    doc.setLineDashPattern([], 0);

    var side = ring;
    doc.setFillColor(75, 75, 75);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(cx + rInner, cy - side / 2, ring, side, "FD");

    var rightHand = model.hand !== "LH";
    var dirx = 0.9;
    var diry = rightHand ? 1 : -1;
    var mag = Math.sqrt(dirx * dirx + diry * diry);
    dirx /= mag;
    diry /= mag;
    var px = -diry;
    var py = dirx;
    var bx = cx + rMid + ring * 0.08;
    var by = cy + (rightHand ? side / 2 + 0.15 : -side / 2 - 0.15);
    doc.setFillColor(0, 0, 0);
    doc.triangle(
      bx + px * 1.05, by + py * 1.05,
      bx - px * 1.05, by - py * 1.05,
      bx + dirx * 2.7, by + diry * 2.7,
      "F"
    );

    var endName = v.ends === "closed_ground" ? "Square and ground" : (model.ends || "—");
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("End view", cx, box.y + 3.6, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    var capY = cy + rOuter + 4.4;
    doc.text("De = " + trimNum(v.De) + " mm", cx, capY, { align: "center" });
    doc.text("Di = " + trimNum(v.Di) + " mm", cx, capY + 3.4, { align: "center" });
    doc.text(endName, cx, capY + 6.8, { align: "center" });
  }

  function trimNum(x) {
    var n = Number(x);
    if (!isFinite(n)) return "—";
    var s = n.toFixed(2);
    return s;
  }

  function drawTable(doc, x, y, w, maxH, title, banner, rows, redactValues) {
    var titleH = 6.2;
    var headH = 5.2;
    var n = rows.length;
    var col0 = Math.min(78, w * 0.46);
    var col1 = 16;
    var maxW = w - col0 - col1 - 2.4;
    var lineH = 2.7;
    var heights = [];
    var i;
    for (i = 0; i < n; i++) {
      var wrapped = redactValues ? [""] : doc.splitTextToSize(String(rows[i].value), maxW);
      if (!wrapped.length) wrapped = [""];
      heights.push(Math.max(4.2, wrapped.length * lineH + 1.3));
      rows[i].wrapped = wrapped;
    }
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(title, x + 1.4, y + 4.2);
    if (banner) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.text(banner, x + w - 1.4, y + 4.2, { align: "right" });
    }
    var hy = y + titleH;
    doc.setFontSize(6.5);
    doc.text("Particular", x + 1.2, hy + 3.6);
    doc.text("Sym.", x + col0 + 1, hy + 3.6);
    doc.text("Value", x + col0 + col1 + 1, hy + 3.6);
    var bodyY = hy + headH;
    doc.setFont("helvetica", "normal");
    var cursor = bodyY;
    for (i = 0; i < n; i++) {
      var rowH = heights[i];
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(6.2);
      var baseline = cursor + 3.3;
      doc.text(String(rows[i].particular), x + 1.2, baseline);
      doc.text(String(rows[i].symbol), x + col0 + 1, baseline);
      if (!redactValues) doc.text(rows[i].wrapped, x + col0 + col1 + 1, baseline);
      cursor += rowH;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.15);
      doc.line(x, cursor, x + w, cursor);
    }
    var bodyH = cursor - bodyY;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.15);
    doc.line(x, hy, x + w, hy);
    doc.line(x, bodyY, x + w, bodyY);
    doc.setLineWidth(0.25);
    doc.rect(x, y, w, titleH + headH + bodyH);
    doc.line(x + col0, hy, x + col0, bodyY + bodyH);
    doc.line(x + col0 + col1, hy, x + col0 + col1, bodyY + bodyH);
    return titleH + headH + bodyH;
  }

  function drawTitleBlock(doc, model) {
    var box = model.layout.title;
    var x = box.x;
    var w = box.w;
    var h = box.h;
    var y = box.y;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.rect(x, y, w, h);
    var rows = [7.2, 6.2, 6.2, 11.2, 6.2, 13];
    var yy = y;
    for (var i = 0; i < rows.length - 1; i++) {
      yy += rows[i];
      doc.setLineWidth(0.15);
      doc.line(x, yy, x + w, yy);
    }
    doc.line(x + w / 2, y + rows[0], x + w / 2, y + rows[0] + rows[1] + rows[2] + rows[3]);

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(model.title.toUpperCase(), x + w / 2, y + 5.2, { align: "center" });

    function field(label, value, fx, fy, fw) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.5);
      doc.setTextColor(92, 86, 76);
      doc.text(label, fx + 1.2, fy + 2.3);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(String(value), fx + 1.2, fy + 5.4);
      return fw;
    }

    var y1 = y + rows[0];
    field("DRAWING NO.", model.drawingNumber, x, y1, w / 2);
    field("DATE", model.date, x + w / 2, y1, w / 2);
    var y2 = y1 + rows[1];
    field("UNITS", "MILLIMETRES (mm)", x, y2, w / 2);
    field("SCALE", model.scaleLabel, x + w / 2, y2, w / 2);
    var y3 = y2 + rows[2];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(92, 86, 76);
    doc.text("PROJECTION", x + 1.2, y3 + 2.3);
    drawThirdAngle(doc, x + 4, y3 + 7.4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(0, 0, 0);
    doc.text("THIRD ANGLE", x + 22, y3 + 6.6);
    field("QUALITY", "BS EN 15800 GR " + model.grade + "  (Q = " + Number(model.Q).toFixed(2) + ")", x + w / 2, y3, w / 2);
    var y4 = y3 + rows[3];
    field("MATERIAL", model.material, x, y4, w);
    var y5 = y4 + rows[4];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(0, 0, 0);
    doc.text("GENERAL NOTE", x + 1.2, y5 + 2.4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.4);
    var noteLines = doc.splitTextToSize(model.generalNote, w - 3);
    doc.text(noteLines, x + 1.2, y5 + 5.6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.text("Spring Designer " + (model.version || "v1.4") + "  ·  design to BS EN 13906-1", x + 1.2, y5 + 10.4);
  }

  function releaseOf(options) {
    if (Entitlement && typeof Entitlement.releaseTier === "function") {
      return Entitlement.releaseTier(options);
    }
    return "unpaid";
  }

  var DEFAULT_PDF_NAME = "helical-compression-spring-a3.pdf";
  var RESERVED_PDF_NAMES = {
    CON: true, PRN: true, AUX: true, NUL: true,
    COM1: true, COM2: true, COM3: true, COM4: true, COM5: true, COM6: true, COM7: true, COM8: true, COM9: true,
    LPT1: true, LPT2: true, LPT3: true, LPT4: true, LPT5: true, LPT6: true, LPT7: true, LPT8: true, LPT9: true
  };

  function safePdfFilename(requested) {
    var raw = String(requested == null ? "" : requested);
    var cleaned = raw.replace(/[\\/]/g, "-").replace(/[<>:"|?*\u0000-\u001f]/g, "-");
    cleaned = cleaned.replace(/^\s+|\s+$/g, "").replace(/[. ]+$/g, "");
    cleaned = cleaned.replace(/-+/g, "-").replace(/^-+/, "");
    if (/\.pdf$/i.test(cleaned)) cleaned = cleaned.slice(0, -4).replace(/[. ]+$/g, "");
    if (!cleaned || cleaned === "." || cleaned === "..") return DEFAULT_PDF_NAME;
    if (cleaned.length > 120) cleaned = cleaned.slice(0, 120).replace(/[. -]+$/g, "");
    if (!cleaned) return DEFAULT_PDF_NAME;
    var upper = cleaned.toUpperCase();
    var head = upper.split(".")[0];
    if (RESERVED_PDF_NAMES[upper] || RESERVED_PDF_NAMES[head]) cleaned += "-file";
    return cleaned + ".pdf";
  }

  function exportFilename(options) {
    if (releaseOf(options) !== "paid") {
      return { filename: DEFAULT_PDF_NAME, paid: false, named: false };
    }
    var filename = safePdfFilename(options && options.requestedName);
    return {
      filename: filename,
      paid: true,
      named: filename !== DEFAULT_PDF_NAME
    };
  }

  function drawPreviewWarning(doc) {
    var warning = (Entitlement && Entitlement.PREVIEW_WARNING) ||
      "Preview — incomplete; not for manufacture";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(139, 30, 30);
    doc.text(warning, 16, 14.2);
  }

  function drawWatermark(doc) {
    var text = (Entitlement && Entitlement.WATERMARK) || "Upgrade to release drawing table";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(74, 74, 74);
    doc.text(text, 48, 168, { angle: 28 });
    doc.text(text, 78, 268);
  }

  function build(design, options) {
    var model = Drawing.build(design, options);
    var release = releaseOf(options);
    var redactValues = release !== "paid";
    var Ctor = JsPDF();
    var doc = usePdfText(new Ctor({
      orientation: "landscape",
      unit: "mm",
      format: "a3",
      compress: true
    }));
    doc.setProperties({
      title: model.title + " " + model.drawingNumber,
      subject: "BS EN 13906-1 design, BS EN 15800 grade " + model.grade,
      creator: "Helical Spring Designer v1.4"
    });

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);
    doc.rect(10, 10, 400, 277);
    doc.setLineWidth(0.15);
    doc.rect(12, 12, 396, 273);

    drawHelix(doc, model);
    drawEndView(doc, model);

    var place = model.layout;
    var t1 = drawTable(
      doc, place.table.x, place.table.y, place.table.w, 120,
      model.table1.title, "MANUFACTURER", model.table1.rows, redactValues
    );
    var t2y = place.table.y + t1 + place.table.gap;
    var t2 = drawTable(
      doc, place.table.x, t2y, place.table.w, 140,
      model.table2.title, model.table2.mark, model.table2.rows, redactValues
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(0, 0, 0);
    var disclaimer = doc.splitTextToSize("Note  " + model.verificationNote, place.table.w);
    var noteY = t2y + t2 + 3.2;
    doc.text(disclaimer, place.table.x, noteY);
    place.drawn = {
      table1: { x: place.table.x, y: place.table.y, w: place.table.w, h: t1 },
      table2: { x: place.table.x, y: t2y, w: place.table.w, h: t2 },
      disclaimer: { x: place.table.x, y: noteY, w: place.table.w, h: disclaimer.length * 3.1 }
    };

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    var noteLines = model.notes.map(function (item) { return item.n + "  " + item.text; });
    doc.text(noteLines, place.notes.x, place.notes.y + 3.2);

    drawTitleBlock(doc, model);
    if (redactValues) {
      drawWatermark(doc);
      drawPreviewWarning(doc);
    }
    return { doc: doc, model: model, release: release };
  }

  function toUint8Array(design, options) {
    var built = build(design, options);
    var naming = exportFilename(options);
    var buf = built.doc.output("arraybuffer");
    return {
      bytes: new Uint8Array(buf),
      model: built.model,
      doc: built.doc,
      release: built.release,
      filename: naming.filename,
      paid: naming.paid
    };
  }

  function save(design, options) {
    var built = build(design, options);
    var naming = exportFilename(options);
    built.doc.save(naming.filename);
    return { model: built.model, filename: naming.filename, paid: naming.paid, release: built.release };
  }

  return {
    build: build,
    toUint8Array: toUint8Array,
    save: save,
    exportFilename: exportFilename,
    safePdfFilename: safePdfFilename,
    DEFAULT_PDF_NAME: DEFAULT_PDF_NAME,
    drawThirdAngle: drawThirdAngle,
    toPdfText: pdfText,
    releaseOf: releaseOf
  };
});
