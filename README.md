# Helical Spring Designer

A mobile-friendly progressive web app for sizing cylindrical helical **compression** springs, using the calculation method of **BS EN 13906-1** (the successor to BS 1726 for this purpose). Metric units throughout. British English.

This is a design aid for phone use and, later, wrapping for Google Play (Trusted Web Activity or Capacitor). It is not a certified calculation pack and not a substitute for the published British Standards. Version 1.1 adds a coil-diameter versus wire heat map. Version 1.4 (this revision) adds BS EN 15800 quality grades 1–3 and an offline A3 drawing export.

## How to run

The service worker needs HTTP (not `file://`). From the repository root:

```bash
python3 -m http.server 8765
```

Then open [http://localhost:8765](http://localhost:8765) on a computer, or from a phone on the same network use the host’s address.

On Android Chrome: browser menu → **Add to Home screen** / **Install app** to run it as a standalone PWA, including offline after the first visit.

## Tests

```bash
npm test
```

There is no build step. The same `js/engine.js` file is loaded by the browser and by Node.

## Wizard

1. **Loads** — Mode A: two lengths (mm) and two loads (N). Mode B: one load, one length and rate R (N/mm). The app derives R and free length L0.
2. **Geometry** — pocket (hole) maximum diameter, diametral clearance, BS EN 15800 quality grade (1, 2 or 3; default 2), ends, material G and Rm.
3. **Wire** — a heat map of mean coil diameter `D` (0.5 mm steps up to the pocket limit) against the EN 10270 / ISO standard wire series (0.20 mm to 12 mm). Each cell is coloured by corrected stress τk as a percentage of allowable (green / amber / red) and greyed out when the design fails a pocket, index, solid-length or coil-count check. Each row counts the viable wire sizes and the diameter with the most options is highlighted; tapping a cell selects that `D` and `d` for the later steps. The same sizes are also listed below, evaluated at maximum mean diameter `D = De max − d`, with corrected stress, percentage of allowable, active coils, solid length, and a pass/fail colour.
4. **Coil diameter** — slider plus auto-optimise for index 4–16, pocket fit, stress, solid length and a sensible coil count. A diameter chosen on the heat map is carried through as the starting point.
5. **Results** — load–length graph (length ticks under the axis; horizontal load lines labelled with compression as a percentage of available travel L0 − Lc and corrected stress τk; vertical dotted markers run from the x-axis up to the spring line), particulars table, BS EN 15800 tolerance table, scaled SVG side view. Export an A3 landscape drawing (PDF), or print and export text or JSON.

On step 2, choose manufacturing quality grade 1, 2 or 3 to **BS EN 15800** (the standard that replaced BS 1726 for cylindrical helical compression spring tolerances). Grade 2 is the default. The same control is repeated on the results screen and is stated on the drawing.

A **Load worked example** button fills:

| Item | Value |
|---|---|
| L1, F1 | 50 mm, 50 N |
| L2, F2 | 35 mm, 125 N |
| Pocket / clearance | 20 mm / 1.5 mm (De max = 18.5 mm) |
| Material | EN 10270-1 DH, G = 81 500 N/mm², Rm = 1 800 N/mm² |
| Wire (typical choice) | 2.00 mm at D = 16.5 mm |

That example gives R = 5 N/mm, L0 = 60 mm, τk ≈ 766 N/mm² (85 % of 0.5 Rm), n ≈ 7.26, Lc ≈ 18.5 mm.

## Key formulae (BS EN 13906-1)

Units: mm, N, N/mm, N/mm² (MPa).

- Spring index `w = D / d`
- Bergsträsser correction `k = (w + 0.5) / (w − 0.75)`  
  (Wahl’s factor is computed only as a reference; design stress uses Bergsträsser, as in EN 13906-1.)
- Uncorrected shear stress `τ = 8 D F / (π d³)`
- Corrected stress `τk = k τ`
- Rate `R = G d⁴ / (8 D³ n)` so `n = G d⁴ / (8 D³ R)`
- Mode A: `R = (F2 − F1) / (L1 − L2)` and `L0 = L1 + F1 / R`
- Mode B: `L0 = L + F / R` (the single point is treated as F2, L2 by default)
- Closed and ground ends: `nt = n + 2`, `Lc = nt × d`
- Pitch of active coils `p = (L0 − 2 d) / n` (closed and ground)
- Outside / inside diameters `De = D + d`, `Di = D − d`
- Default allowable static screening stress `τzul = 0.5 × Rm` (the factor is editable)

Mean coil diameter from the pocket:

`De max = pocket − clearance`  
`D max = De max − d`

Suggested clearance is a typical workshop table for a spring working in a hole (in the spirit of BS 1726 diametral-clearance guidance). It is not copied from the standard’s tables.

Ln on the graph is the length at **85 % of available travel** (`Sa = 0.15 (L0 − Lc)`, `Ln = Lc + Sa`). That is a documented workshop recommendation in this app, not a verbatim extract of EN 13906-1’s minimum-gap formula.

## BS EN 15800 tolerances (v1.4)

Quality grades 1, 2 and 3 use the grade factor **Q = 0.63, 1.00 and 1.60**. Grade 2 is the standard default.

- **Coil diameter** AD comes from EN 15800 Table 3 (mean diameter band × spring-index band × grade), applied equally to De, Di and D. It is not a single formula scaled by Q.
- **Force** at a specified length: `AF = ± (aF · kf + 1.5 F / 100) · Q`, with `kf = −1/(3 n²) + 8/(5 n) + 0.803` (Annex A.1).
- **Free length**, when it is toleranced: `AL0 = ± aF · kf · Q / R`. When two loads are specified, L0 is **reference only** on the manufacturing particulars (EN 15800 clause 6.7), so the spring is not over-constrained.
- **Squareness e1 and parallelism e2** apply to closed and ground ends: grade 1 `0.03 L0` and `0.015 De`, grade 2 `0.05 L0` and `0.03 De`, grade 3 `0.08 L0` and `0.06 De`.
- Wire-diameter tolerance stays with the material standard (EN 10270), as EN 15800 clause 6.2 requires.
- The design is warned when it leaves the normative scope: **d 0.07–16 mm, D 0.63–200 mm, L0 ≤ 630 mm, n ≥ 2, w 4–20**. Grade 1 is also flagged when `w > 12` or `L0/D > 5`.

**What was checked, and what was not.** Q, kf, the AF and AL0 formulae, e1/e2 and the scope limits were checked against published clause values (including HEXAGON’s published kf correction, which matches independent tabulations of Annex A.1). Table 3 and the aF polynomial (Annex A.2, a cubic in `w/10`) were transcribed from one public copy of EN 15800:2008. The aF cubic lies within a few percent of published DIN 2095 diagram readings, but those coefficient decimals were **not** confirmed from a licensed PDF. The results screen and the drawing say so. This app is not a certified copy of the standard.

## A3 drawing

**Export A3 drawing (PDF)** builds a single A3 landscape sheet in the browser (vendored jsPDF, cached by the service worker as `spring-calc-v6`). The sheet has a border and a title block: title “Helical Compression Spring”, drawing number, date, units mm, scale, third-angle projection symbol, and the note “DIMENSIONS IN MILLIMETRES, INTERPRET PER ASME Y14.5”. The side view is dimensioned for L0, De and d, with the end type and coil hand (right-hand unless left-hand is selected).

- **Table 1 — spring particulars** is for the manufacturer: d, De, Di, D with AD, nt, n, L0 (reference when two loads are given), F1/F2 (and Fn at Ln marked reference), coil hand, ends, material and Rm, the EN 15800 grade, and e1/e2 when the ends are closed and ground.
- **Table 2 — design reference data** is marked REFERENCE ONLY so the calculation can be recreated: lengths, deflections and compression, corrected stress at every station including Lc, allowable stress, G, Rm, R, D, w, Bergsträsser k, Sa, clearance when entered, wire length, mass, and BS EN 13906-1.

A worked-example sheet is in `samples/helical-compression-spring-a3-example.pdf`.

### Material moduli (EN 13906-1 Tables 3 and 4)

| Material | G (N/mm²) |
|---|---|
| EN 10270-1 patented cold-drawn carbon (SM / SH / DH) | 81 500 |
| EN 10270-2 oil-tempered (e.g. VDSiCr) | 79 500 |
| EN 10270-3 1.4310 (AISI 302), delivery condition | 70 000 |

Rm against diameter for the presets is an **indicative** curve typical of published EN 10270 supplier tables, for screening only. Always replace it with the value from the material certificate and the current standard.

### Pass / fail used at wire selection and optimisation

A candidate fails if any of these occur:

- index `w` outside 4–16
- `De` greater than `De max`
- `n` outside 2–30
- `τk` greater than `τzul`
- solid length not shorter than the maximum working length

Warnings (amber) include: more than 85 % of available travel used; index outside the preferred 6–12 band; slenderness `L0 / D > 4` (buckling if the spring is not guided).

Auto-optimise scores passing designs for stress margin, index near 8, coil count near 8, and remaining travel.

## Screenshots

Phone-sized captures (390 × 844 logical pixels, 2× pixel density) live in `screenshots/`:

- `01-loads.png` — step 1 with the worked example
- `02-geometry.png` — pocket and material
- `03-wires.png` — standard wire list with corrected stress
- `07-heatmap.png` — coil diameter versus wire heat map (worked example)
- `04-optimise.png` — coil-diameter optimisation
- `05-results.png` — full-page results
- `05-results-viewport.png` — results screen at phone viewport (graph and start of the key)
- `05a-graph.png` — load–length graph
- `08-graph-v12.png` — load–length graph with axis ticks and horizontal compression/stress labels (v1.2)
- `09-graph-v13.png` — load–length graph with vertical markers trimmed to the spring line (v1.3)
- `05b-graph-key.png` — lengths, loads and deflection percentages
- `05c-particulars.png` — spring particulars table
- `06-diagram.png` — scaled side-view diagram at free length

## Google Play

`android/` is a Trusted Web Activity that opens https://yjerv.github.io/spring-calc/. The steps for a Play developer account (US$25), the upload key, the Digital Asset Links file, a paid listing at £4.99, and installing it yourself as a licence tester are in [android/README.md](android/README.md). Store text is in [android/store/listing.md](android/store/listing.md). The privacy policy is [privacy.html](privacy.html).

## Limitations

- Compression springs of **round wire** only. Not extension, torsion, barrel, conical or rectangular-section springs.
- **Static screening** against `factor × Rm`. No Goodman / fatigue diagram, no relaxation (set), no temperature correction of G, no corrosion or surface-defect factors.
- Ln uses an 85 % travel rule rather than the full EN 13906-1 minimum-gap (`Sa`) expression.
- Indicative Rm–diameter tables are not a licensed reproduction of EN 10270 tables.
- BS EN 15800 tolerances are implemented as above. Table 3 and the aF coefficients are transcribed and flagged; they are not a licensed reproduction of the standard. End-coil grinding practice beyond the e1/e2 limits, coil clash beyond the solid-length check, and buckling (beyond a slenderness warning) are not designed in detail.
- Preferred coil count is shown rounded to ¼ turn; the duty rate is met with the theoretical (possibly non-integer) `n`. Rounding `n` changes R slightly, and that adjusted rate is reported.
- You remain responsible for verifying results against the current standards and the actual duty.

Not affiliated with BSI.
