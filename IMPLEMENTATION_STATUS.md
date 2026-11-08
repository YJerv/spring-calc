# Helical Spring Designer — implementation status

Document reference: YJ-HSD-CR-001. This file records what is in this branch. It does not change the live WIP Results colours. Nothing here is deployed, merged, or uploaded to Play Console.

Attempt rule: a failed approach is an unsuccessful implementation or fix. A passing test is not a failed attempt. After three unsuccessful attempts on one item, that item is reverted to the state before those attempts and the next item continues. No item has used a failed attempt yet.

## SC-001 — Settings, light and dark — built in this branch

Attempt 1 of the implementation is the one in this commit. It has not failed.

What was agreed:

- A Settings button with a round gear icon.
- Light and dark appearance, with room for later settings.
- Text, graph labels, buttons and warnings stay clear in both appearances.
- Phone or browser colour settings are the likely reason two testers saw different appearances. That is separate from SC-003.

What this branch does:

- The header has a round button with a gear icon and the accessible name “Settings”.
- The dialog offers System, Light and Dark. System is the default when nothing has been saved.
- System follows `prefers-color-scheme`, including a change while the app is open.
- Light and Dark are saved on the device (`spring-calc-theme`, separate from the calculator inputs) and are not replaced when the phone theme changes. Choosing System again follows the phone.
- `color-scheme` is set from the choice so a browser forced-dark pass is not applied on top of an explicit Light choice. Identical pixels on every forced-colours or high-contrast setting are not guaranteed; borders thicken when the user asks for more contrast, and forced-colours mode keeps system colours.
- Colours are purpose-named tokens in `css/app.css`. Light keeps the previous paper, navy and gold. The light border is stronger than the old pale line so card edges meet 3:1. Dark uses light text on dark surfaces. Text pairs used for body copy, labels, warnings, buttons and graph series are checked at 4.5:1 or better. Borders are checked at 3:1.
- Graph, trade-off and on-screen spring colours use those tokens. SC-003 later removes the paper-coloured outline that had sat behind the results-graph labels.
- Warnings, pass and fail states keep the words as well as the colour.
- The coil-diameter chart hint names the curves by their labels, not only by colour.
- Calculator formulae and inputs are unchanged by SC-001. SC-002 later changes the A3 PDF export only.
- The settings screen has a “Further settings” section. SC-002 adds a note there that Pro cannot be bought yet. There is still no unlock control.

Checks on this commit, before any later item:

- `npm test`: engine 131, charts 77, EN 15800 96, drawing 71, theme 127. All passed. Drawing and engine tests are unchanged in result, so the calculator and the current A3 PDF model still pass.
- Browser, desktop 1280×900 and phone 390×844: System follows an emulated light and dark browser scheme; Light stays light when the browser is dark; Dark stays dark after reload; Enter opens Settings and moves focus inside; Escape closes it and returns focus to the gear. Screenshots are named `sc001_light_settings_panel.png`, `sc001_dark_validation_warning.png`, `sc001_light_results_graph.png`, `sc001_dark_results_graph.png`, `sc001_mobile_light_graph.png` and `sc001_mobile_dark_graph.png` in the review artifacts.

SC-001 remains in this branch. The live site and Play Console build are unchanged.

## SC-002 — Unpaid and paid A3 PDF — built in this branch, purchase path open

Attempt 1. It has not failed. No production unlock was added.

What the app does:

- The on-screen calculator stays complete. Pass, warning and fail text on the results page is unchanged.
- The only export control is “Export A3 drawing (PDF)”. Print, text and JSON exports are removed. There are no adverts and no blur.
- Every export from the page is unpaid. Table row names, symbols and column headings are drawn. Table values are not passed to the PDF text operators at all, so they are not hidden under a box.
- The unpaid sheet carries the exact line “Upgrade to release drawing table” and the readable warning “Preview — incomplete; not for manufacture”.
- A paid sheet, with full table values and neither of those lines, can be built only by the Node test harness (`SPRING_CALC_TEST_ENTITLEMENT=1` plus a test-fixture object). The page does not call that path. A forged `{ tier: "paid" }` object, including anything shaped like localStorage, stays unpaid.
- `js/entitlement.js` is fail-closed. It records package `uk.co.yjerv.springcalc` and leaves price, Play product id and verification URL null. It does not call Play Billing or a server, because those are not configured and no secrets belong in the page.

Open, not invented:

- Price.
- Play Billing product id, merchant account and purchase flow.
- Verification backend, restore after reinstall, refunds, and how an already-paid customer would be recognised.
- Digital Asset Links remain SC-008 and are not claimed done.
- Non-table fields were not listed for redaction, so they remain: the side-view dimensions (L0, De, d), the end note, and the title block (drawing number, material, grade, date). The drawing number still encodes wire and outside diameter. This is not a claim that the unpaid sheet is empty of every number.
- Someone who rewrites the page script can still copy the on-screen results. That limit stays until a server signs or generates the paid PDF. This build does not pretend otherwise.
- The sheet layout is the current one. SC-012 has not started.

Checks: `npm test` passed, including `tests/test-pdf-release.js` (270 assertions). That test extracts compressed PDF text for the worked example. Unpaid text omits table values such as `125.000` and `18.500` and contains the watermark. The paid test-fixture file contains those values and no watermark. The drawing model used on screen still has the full values.

SC-002 stays partially implemented. The paid file is a test fixture only. It is not a real purchase, restore, or Play Billing flow.

## SC-003 — Results graph text outline — built in this branch

Attempt 1. It has not failed.

The white patch around the compression and stress labels was a paper-coloured stroke drawn behind that text (`paint-order: stroke`, 3px). Those labels are now filled text only, in the same series colours. Axis titles, length ticks, the status line and the station table are unchanged. Light and dark contrast checks for those series colours on the chart background still pass. Marker dots still have a thin rim in the chart background colour. That rim is not text.

Checks: chart tests 79, theme tests 127, and the rest of `npm test` passed (engine 131, EN 15800 96, drawing 71, PDF release 270). In the browser, all 25 results-graph text nodes had no stroke, in light and dark, at desktop 1280×900 and phone 390×844.

## SC-004 — Calculate, feasibility and working range — built, extra clearance open

Attempt 1. It has not failed. Calculator examples and the SC-002 unpaid PDF path are unchanged.

What is in force:

- Calculate sits under the load fields. The candidate search runs on that click, not on each keystroke. If the pocket is already known, Next waits for a current Calculate.
- Each screened wire and diameter is accepted or rejected by the existing `evaluateDesign` checks. The hard solid-length rule is the one already in the calculator: L2 must be greater than that candidate’s Lc. Lc comes from that candidate’s coils, wire diameter and end type.
- L2 equal to Lc fails. L2 below Lc fails. L2 just above Lc can pass. Using more than 80% of available travel does not fail a candidate. The existing “more than 85% of available travel” line stays a warning, not a failure.
- If nothing passes, the result lists the actual failure reasons. A suggestion is shown only when a checked change produces at least one pass. The entered numbers are not changed. There is no L3 field, so none is suggested.
- The 70% / 80% sentence is shown as a workshop guide and is explicitly not a rejection rule.

Open, not invented:

- No validated working clearance beyond L2 > Lc exists in the standards notes or the code. None is added. `extraClearanceMm` is null. This part of SC-004 stays partial until a clearance is validated.

Checks: `tests/test-feasibility.js`, 22 assertions, plus the existing engine suite (131). Browser checks covered the worked example, L2 at 0.5 mm with no false suggestion, a case where increasing L2 does help, and light and dark phone layouts.

## SC-005 — Outer and inner diameter limits — built, placement open

Attempt 1. It has not failed.

What is in force:

- The first page, after the choice of two points or point and rate and before the loads, has an outer pocket, the existing diametral clearance, and a minimum inside diameter. Each may be set or left blank. Blank means no limit.
- Candidates use those limits. An outer limit still caps De. An inner limit rejects a candidate whose Di is below the rod. Neither limit searches inside the existing index range 4 to 16 and does not propose an optimal diameter.
- A rod minimum greater than or equal to the pocket maximum is rejected before the search, and the typed values are not changed.
- No allowance is added for the spring growing under compression. That allowance is not defined.
- The pocket fields have left page 2. SC-006 then moved ends, grade and wind off that page as well. The wire page content is unchanged. The drawing tables are unchanged, so the later De/Di display rule is not applied here.

Open review point, not a final decision:

- The change log did not decide whether limits are the first page or after the input method and before the loads. They are on the first page in that second position so page 2 can lose the diameter inputs and the wire page does not move. This can be moved later.

Checks: `tests/test-constraints.js`, 21 assertions. Engine, feasibility, chart, drawing, theme and PDF release tests still pass.

## SC-006 — Material-only second page — built, placement of the moved fields open

Attempt 1. It has not failed.

What is in force:

- Page 2 shows the material, G, Rm, the allowable stress factor and the indicative Rm option. It does not ask for a pocket, an inside diameter, ends, a quality grade or a wind direction.
- The wire page is still page 3. Its heading, heat map, legend, wire list and the sentence about D = De max − d are unchanged.
- Ends, manufacturing grade and wind are on the first page, with the diameter limits and before the loads. Ends stay available to Calculate because solid length depends on them. Grade remains linked to the same control on the results page. Wind remains available for the drawing.

Open, not decided in the change log:

- The log says the second page is material only and the third page stays as it is. It does not say where ends, grade and wind should go. They are on the first page so the wire page does not change. That place can be moved.

Checks: `tests/test-pages.js`, 27 assertions, and the full `npm test` suite. Browser checks opened the material page and the wire page in light and dark, on a desktop window and a phone window.

## SC-007 — Concept A icon — built from the supplied file

Attempt 1. It has not failed. The SVG in `icons/icon.svg` is a byte-for-byte copy of `SC007_concept_A_Coil_icon_ASIS.svg`. Background `#202630`, blue bands `#2457C5`, pale bands `#DCE2EA` at 0.55 opacity, and the 0.85 scale are unchanged. The 192 and 512 PNG icons are rasters of that file. The favicon and the Apple touch icon use those files. The manifest purpose is `any`, so a mask is not asked to crop the square.

Open:

- This repository has no Android project, Trusted Web Activity wrapper, or mipmap launcher resources. None were generated, and nothing was uploaded to Play Console.
- The supplied file is one full-bleed square. It is not split into adaptive-icon foreground and background layers. A maskable crop was not invented.

Checks: `tests/test-icon.js`, 13 assertions, and the full `npm test` suite. Rasters at 24, 48, 96, 192 and 512 px keep the supplied background colour at the corner.

## Other items

| Item | In this branch | Notes |
| --- | --- | --- |
| SC-008 | Not started | No Digital Asset Links change and no signing fingerprint |
| SC-009 | Not started | |
| SC-010 | Cancelled | Not implemented |
| SC-011 | Not started | Objective not agreed; will not be guessed |
| SC-013 | Not started | |
| SC-012 | Not started | Deferred until the earlier items; vertical layout not begun |
