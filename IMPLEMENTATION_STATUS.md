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

## Other items

| Item | In this branch | Notes |
| --- | --- | --- |
| SC-004 | Not started | |
| SC-005 | Not started | |
| SC-006 | Not started | |
| SC-007 | Not started | Concept A asset is not applied yet |
| SC-008 | Not started | No Digital Asset Links change and no signing fingerprint |
| SC-009 | Not started | |
| SC-010 | Cancelled | Not implemented |
| SC-011 | Not started | Objective not agreed; will not be guessed |
| SC-013 | Not started | |
| SC-012 | Not started | Deferred until the earlier items; vertical layout not begun |
