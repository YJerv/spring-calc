/**
 * Client-side A3 landscape drawing (ASME Y14.5 frame) using jsPDF.
 * The library is vendored so the PWA works offline.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./drawing.js"), require("../vendor/jspdf.umd.min.js"));
  } else {
    root.SpringPdf = factory(root.SpringDrawing, root.jspdf);
  }
})(typeof self !== "undefined" ? self : this, function (Drawing, jspdfNs) {
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
      .replace(/[—–−]/g, "-")
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
    var cx = v.x + 58 + (v.w - 70) / 2;
    var drawnH = L0 * scale;
    var yTop = v.y + 8 + Math.max(0, (v.h - 26 - drawnH) / 2);
    var half = (De * scale) / 2;
    var stroke = Math.max(0.25, d * scale * 0.85);

    doc.setDrawColor(11, 31, 51);
    doc.setLineWidth(0.35);
    doc.line(cx - half, yTop, cx + half, yTop);
    doc.line(cx - half, yTop + drawnH, cx + half, yTop + drawnH);

    var turns = Math.max(nt, 2);
    var steps = Math.max(48, Math.round(turns * 20));
    var dead = Math.max(nt - n, 0);
    function yAtTurn(t) {
      if (dead >= 1.5) {
        var endRise = d;
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
      doc.setDrawColor(grey ? 150 : 11, grey ? 158 : 31, grey ? 170 : 51);
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

    doc.setDrawColor(107, 76, 154);
    doc.setLineWidth(0.25);
    var dimX = cx - half - 14;
    dimArrow(doc, dimX, yTop, dimX, yTop + drawnH);
    doc.line(cx - half, yTop, dimX - 2, yTop);
    doc.line(cx - half, yTop + drawnH, dimX - 2, yTop + drawnH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(107, 76, 154);
    doc.text("L0 = " + trimNum(L0) + " mm", dimX - 3.2, yTop + drawnH / 2, { angle: 90, align: "center" });

    var yDe = yTop + drawnH + 8;
    doc.setDrawColor(27, 79, 114);
    doc.setTextColor(27, 79, 114);
    dimArrow(doc, cx - half, yDe, cx + half, yDe);
    doc.line(cx - half, yTop + drawnH, cx - half, yDe + 1.5);
    doc.line(cx + half, yTop + drawnH, cx + half, yDe + 1.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("De = " + trimNum(De) + " mm", cx, yDe + 4.2, { align: "center" });

    doc.setTextColor(11, 31, 51);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("d = " + trimNum(d) + " mm", cx + half + 4, yTop + 4);
    doc.text(model.hand + "  ·  " + model.ends, v.x + 4, v.y + v.h - 2);

    doc.setFontSize(7);
    doc.setTextColor(92, 86, 76);
    doc.text("Side view at free length", v.x + 4, v.y + 4);
  }

  function trimNum(x) {
    var n = Number(x);
    if (!isFinite(n)) return "—";
    var s = n.toFixed(2);
    return s;
  }

  function drawTable(doc, x, y, w, maxH, title, banner, rows) {
    var titleH = 6.2;
    var headH = 5.2;
    var n = rows.length;
    var rowH = Math.min(4.55, (maxH - titleH - headH - 1) / Math.max(n, 1));
    if (rowH < 3.15) rowH = 3.15;
    var col0 = Math.min(62, w * 0.38);
    var col1 = 18;
    doc.setFillColor(11, 31, 51);
    doc.rect(x, y, w, titleH, "F");
    doc.setTextColor(247, 241, 228);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(title, x + 1.4, y + 4.2);
    if (banner) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.text(banner, x + w - 1.4, y + 4.2, { align: "right" });
    }
    var hy = y + titleH;
    doc.setFillColor(22, 50, 79);
    doc.rect(x, hy, w, headH, "F");
    doc.setFontSize(6.5);
    doc.setTextColor(247, 241, 228);
    doc.text("Particular", x + 1.2, hy + 3.6);
    doc.text("Sym.", x + col0 + 1, hy + 3.6);
    doc.text("Value", x + col0 + col1 + 1, hy + 3.6);
    var bodyY = hy + headH;
    doc.setFont("helvetica", "normal");
    for (var i = 0; i < n; i++) {
      var ry = bodyY + i * rowH;
      if (i % 2 === 0) {
        doc.setFillColor(243, 238, 228);
        doc.rect(x, ry, w, rowH, "F");
      }
      doc.setTextColor(26, 24, 20);
      doc.setFontSize(rowH < 3.6 ? 5.6 : 6.2);
      var baseline = ry + rowH - 1.05;
      doc.text(String(rows[i].particular), x + 1.2, baseline);
      doc.setTextColor(92, 86, 76);
      doc.text(String(rows[i].symbol), x + col0 + 1, baseline);
      doc.setTextColor(26, 24, 20);
      var value = String(rows[i].value);
      var maxW = w - col0 - col1 - 2.4;
      var lines = doc.splitTextToSize(value, maxW);
      doc.text(lines[0], x + col0 + col1 + 1, baseline);
    }
    var bodyH = n * rowH;
    doc.setDrawColor(11, 31, 51);
    doc.setLineWidth(0.2);
    doc.rect(x, y, w, titleH + headH + bodyH);
    doc.line(x + col0, hy, x + col0, bodyY + bodyH);
    doc.line(x + col0 + col1, hy, x + col0 + col1, bodyY + bodyH);
    return titleH + headH + bodyH;
  }

  function drawTitleBlock(doc, model) {
    var x = 248;
    var w = 162;
    var bottom = 287;
    var h = 68;
    var y = bottom - h;
    doc.setDrawColor(11, 31, 51);
    doc.setLineWidth(0.4);
    doc.rect(x, y, w, h);
    var rows = [10, 8, 8, 16, 8, 18];
    var yy = y;
    for (var i = 0; i < rows.length - 1; i++) {
      yy += rows[i];
      doc.setLineWidth(0.15);
      doc.line(x, yy, x + w, yy);
    }
    doc.line(x + w / 2, y + rows[0], x + w / 2, y + rows[0] + rows[1] + rows[2] + rows[3]);

    doc.setTextColor(11, 31, 51);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(model.title.toUpperCase(), x + w / 2, y + 6.6, { align: "center" });

    function field(label, value, fx, fy, fw) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.5);
      doc.setTextColor(92, 86, 76);
      doc.text(label, fx + 1.4, fy + 3.1);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(11, 31, 51);
      doc.text(String(value), fx + 1.4, fy + 7.2);
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
    doc.text("PROJECTION", x + 1.4, y3 + 3.1);
    drawThirdAngle(doc, x + 4, y3 + 9.2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(11, 31, 51);
    doc.text("THIRD ANGLE", x + 22, y3 + 8.4);
    field("QUALITY", "BS EN 15800 GR " + model.grade + "  (Q = " + Number(model.Q).toFixed(2) + ")", x + w / 2, y3, w / 2);
    var y4 = y3 + rows[3];
    field("MATERIAL", model.material, x, y4, w);
    var y5 = y4 + rows[4];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(92, 86, 76);
    doc.text("GENERAL NOTE", x + 1.4, y5 + 3.2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.4);
    doc.setTextColor(11, 31, 51);
    var noteLines = doc.splitTextToSize(model.generalNote, w - 3);
    doc.text(noteLines, x + 1.4, y5 + 7.4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(92, 86, 76);
    doc.text("Spring Designer " + (model.version || "v1.4") + "  ·  design to BS EN 13906-1", x + 1.4, y5 + 15.2);
  }

  function build(design, options) {
    var model = Drawing.build(design, options);
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

    doc.setDrawColor(11, 31, 51);
    doc.setLineWidth(0.6);
    doc.rect(10, 10, 400, 277);
    doc.setLineWidth(0.15);
    doc.rect(12, 12, 396, 273);

    drawHelix(doc, model);

    doc.setTextColor(11, 31, 51);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6.5);
    var note = doc.splitTextToSize(
      "1  " + model.generalNote + "   2  Tolerances on De, Di and D are the same AD from BS EN 15800 Table 3; control one coil diameter.   3  Coil hand " +
      model.hand + ", default right-hand when not stated.",
      228
    );
    doc.text(note, 16, 174);

    drawTable(doc, 16, 182, 228, 100, model.table1.title, "MANUFACTURER", model.table1.rows);
    var table2Height = drawTable(
      doc,
      250,
      16,
      156,
      190,
      model.table2.title,
      model.table2.mark,
      model.table2.rows
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.setTextColor(92, 86, 76);
    var foot = doc.splitTextToSize(model.verificationNote, 156);
    var footY = 16 + table2Height + 3.2;
    if (footY < 214) doc.text(foot.slice(0, 3), 250, footY);

    drawTitleBlock(doc, model);
    return { doc: doc, model: model };
  }

  function toUint8Array(design, options) {
    var built = build(design, options);
    var buf = built.doc.output("arraybuffer");
    return { bytes: new Uint8Array(buf), model: built.model, doc: built.doc };
  }

  function save(design, options) {
    var built = build(design, options);
    var name = (options && options.filename) || "helical-compression-spring-a3.pdf";
    built.doc.save(name);
    return built.model;
  }

  return {
    build: build,
    toUint8Array: toUint8Array,
    save: save,
    drawThirdAngle: drawThirdAngle
  };
});
