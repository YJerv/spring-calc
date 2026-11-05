# Helical Spring Designer

A mobile-friendly progressive web app for sizing cylindrical helical **compression** springs, using the calculation method of **BS EN 13906-1** (the successor to BS 1726 for this purpose). Metric units throughout. British English.

This is a first version intended for phone use and, later, wrapping for Google Play (Trusted Web Activity or Capacitor). It is a design aid, not a certified calculation pack and not a substitute for the published British Standards. Version 1.1 adds a coil-diameter versus wire heat map so you can see which mean diameter offers the most standard wire options.

## Folder

`/workspace/spring-calc`

## How to run

The service worker needs HTTP (not `file://`).

```bash
cd /workspace/spring-calc
python3 -m http.server 8765
```

Then open [http://localhost:8765](http://localhost:8765) on a computer, or from a phone on the same network use the host’s address.

On Android Chrome: browser menu → **Add to Home screen** / **Install app** to run it as a standalone PWA, including offline after the first visit.

## Tests

```bash
cd /workspace/spring-calc
node tests/test-engine.js
```

There is no build step. The same `js/engine.js` file is loaded by the browser and by Node.

## Wizard

1. **Loads** — Mode A: two lengths (mm) and two loads (N). Mode B: one load, one length and rate R (N/mm). The app derives R and free length L0.
2. **Geometry** — pocket (hole) maximum diameter, diametral clearance, ends, material G and Rm.
3. **Wire** — a heat map of mean coil diameter `D` (0.5 mm steps up to the pocket limit) against the EN 10270 / ISO standard wire series (0.20 mm to 12 mm). Each cell is coloured by corrected stress τk as a percentage of allowable (green / amber / red) and greyed out when the design fails a pocket, index, solid-length or coil-count check. Each row counts the viable wire sizes and the diameter with the most options is highlighted; tapping a cell selects that `D` and `d` for the later steps. The same sizes are also listed below, evaluated at maximum mean diameter `D = De max − d`, with corrected stress, percentage of allowable, active coils, solid length, and a pass/fail colour.
4. **Coil diameter** — slider plus auto-optimise for index 4–16, pocket fit, stress, solid length and a sensible coil count. A diameter chosen on the heat map is carried through as the starting point.
5. **Results** — load–length graph (length ticks under the axis; horizontal load lines labelled with compression as a percentage of available travel L0 − Lc and corrected stress τk), particulars table, scaled SVG side view. Print / PDF and text or JSON export.

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

## Later publication on Google Play

The app is a plain HTML/CSS/JS PWA (manifest + service worker, no build step). A subsequent packaging step can wrap it as:

- a **Trusted Web Activity** (Bubblewrap / PWABuilder), or
- a **Capacitor** Android project pointing at this folder.

That work is not part of this first version (store listing, signing key, Play Console).

## Limitations

- Compression springs of **round wire** only. Not extension, torsion, barrel, conical or rectangular-section springs.
- **Static screening** against `factor × Rm`. No Goodman / fatigue diagram, no relaxation (set), no temperature correction of G, no corrosion or surface-defect factors.
- Ln uses an 85 % travel rule rather than the full EN 13906-1 minimum-gap (`Sa`) expression.
- Indicative Rm–diameter tables are not a licensed reproduction of EN 10270 tables.
- Manufacturing tolerances, end-coil grinding practice, coil clash beyond the solid-length check, and buckling (beyond a slenderness warning) are not designed in detail.
- Preferred coil count is shown rounded to ¼ turn; the duty rate is met with the theoretical (possibly non-integer) `n`. Rounding `n` changes R slightly, and that adjusted rate is reported.
- You remain responsible for verifying results against the current standards and the actual duty.

Not affiliated with BSI.
