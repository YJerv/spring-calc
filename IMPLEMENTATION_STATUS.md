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
- `color-scheme` follows the resolved theme. Light, including System when the phone is light, is `light only` on `html` and `body`, and the colour-scheme meta tag says `light only`, so a browser forced-dark pass is not applied on top. Dark is an explicit `dark` scheme, not light only. The meta tag is updated when the choice or the system colour changes. Identical pixels on every forced-colours or high-contrast setting are not guaranteed; borders thicken when the user asks for more contrast, and forced-colours mode keeps system colours.
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

Light background, 10 November 2026. Dark mode and the PDF drawing were not changed. The page is now `#fafbfc` and cards are white. Borders, the coil back, the invalid heat-map cell and the help-diagram fill were adjusted so text stays at 4.5:1 and UI edges stay at 3:1. The best-row mark uses the body ink in light mode; dark mode still uses gold.

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

- 10 November 2026, R2-01. Design constraints are page 1 and working loads and lengths are page 2. Material, wire, coil diameter and results follow as pages 3 to 6. Ends, grade and wind stay on the loads page, before Calculate.
- R2-03 moved the suggested-clearance paragraph and the longer diameter-limits paragraph into the diameter help window. A one-line hint stays under the heading.
- The inner limit is labelled Spring guide diameter. A diametral clearance is added to it only when a guide is entered; blank or zero adds nothing. The heat map uses 1 mm steps: 1–100 mm with no limits, and otherwise D from guide + clearance + thinnest wire up to pocket − clearance − thinnest wire. There is no suggested-clearance button for the guide.

Checks: `tests/test-constraints.js`, 21 assertions. Engine, feasibility, chart, drawing, theme and PDF release tests still pass.

## SC-006 — Material-only second page — built, placement of the moved fields open

Attempt 1. It has not failed.

What is in force:

- After R2-01, page 3 shows the material, G, Rm, the allowable stress factor and the indicative Rm option. It does not ask for a pocket, an inside diameter, ends, a quality grade or a wind direction.
- The wire page is page 4. Its heat map, legend and wire list stay. R2-04 removed the De max summary above the matrix. R2-03 moved the longer heat-map paragraph into the wire help window. The heading number follows the new order.
- Ends, manufacturing grade and wind are on page 2 with the working loads, before Calculate. Grade remains linked to the same control on the results page. Wind remains available for the drawing.

Open, not decided in the change log:

- The log says the material page is material only and the wire page stays as it is. It does not say where ends, grade and wind should go. They travel with the loads page so they stay before Calculate. A different place is not decided.

Checks: `tests/test-pages.js`, 27 assertions, and the full `npm test` suite. Browser checks opened the material page and the wire page in light and dark, on a desktop window and a phone window.

## SC-007 — Concept A icon — built from the supplied file

Attempt 1. It has not failed. The SVG in `icons/icon.svg` is a byte-for-byte copy of `SC007_concept_A_Coil_icon_ASIS.svg`. Background `#202630`, blue bands `#2457C5`, pale bands `#DCE2EA` at 0.55 opacity, and the 0.85 scale are unchanged. The 192 and 512 PNG icons are rasters of that file. The favicon and the Apple touch icon use those files. The manifest purpose is `any`, so a mask is not asked to crop the square.

10 November 2026. The Trusted Web Activity project from the separate Play wrapper branch is now in `android/` on this review branch. Icons were regenerated from `icons/icon.svg` with `rsvg-convert`. Launcher icons are the full square. Maskable and adaptive icons keep the spring inside the 66% safe zone on a `#202630` field. The web manifest keeps the `any` icons and adds `icons/icon-maskable-192.png` and `icons/icon-maskable-512.png` with purpose `maskable`. No keystore, AAB or APK was created, and Play Console was not touched.

This item stays amber until Yuan approves the previews and the wrapper is installed on a device.

Checks: `tests/test-icon.js`, `tests/test-android-icons.py`, and the full `npm test` suite. Preview sheet: `sc007_android_icon_previews.png`.

## SC-008 — Digital Asset Links — not completed; blocked on facts this repo does not have

Attempt 1. No fingerprint was invented, and no statement file was added. That is the working result, not a broken partial file.

What the agreed row requires:

- Publish package `uk.co.yjerv.springcalc` with the Play app-signing SHA-256 in `https://yjerv.github.io/.well-known/assetlinks.json`.
- That URL is the root host, not `https://yjerv.github.io/spring-calc/.well-known/assetlinks.json`.
- Check that the file loads over HTTPS, that the association validates, and that the Play-installed app opens full screen on devices. Cached results can linger.

What was checked on 8 November 2026, without changing Play Console or deploying:

- `https://yjerv.github.io/` returns 404, “Site not found”. There is no `YJerv/yjerv.github.io` repository visible to this account.
- `https://yjerv.github.io/.well-known/assetlinks.json` returns 404.
- This project is published at `https://yjerv.github.io/spring-calc/` from the `main` branch of this repo. A file added here would be served under `/spring-calc/`, which the agreed row says is the wrong place.
- The Play app-signing SHA-256 is not in this repo, and it was not guessed.
- There is no Android wrapper here, so the installed app was not rebuilt and was not tested on a device. The Chrome bar on Yuan’s father’s phone is therefore not confirmed fixed.

The statement that would be published later, once the fingerprint is copied from Play Console App integrity / App signing, is one Android app target for `uk.co.yjerv.springcalc` with relation `delegate_permission/common.handle_all_urls` and that fingerprint. No placeholder fingerprint is stored.

`tests/test-assetlinks.js` (3 assertions) only checks that this repo still has no statement file and no fingerprint. It is not a Digital Asset Links association, and it does not show that the installed app opens full screen. The calculator still opens in a light desktop window and a dark phone-sized window. That is a page check only.

## SC-009 — Contextual help — built in this branch

Attempt 1. It has not failed. Entered values are not cleared when a help window opens or closes. Calculate warnings stay on the page.

What was agreed, and what this branch does:

- A small circled “i” opens a short window. Close, Escape, and a click on the dimmed page close it. Focus moves to Close and returns to the button that opened the window. Tab stays inside the window.
- Question 1, beside “Working loads and lengths”: a diagram of the two input methods and the symbols L1, L2, F1, F2, rate and solid length. L1 and L2 are operating lengths set by the application. F1 and F2 are operating loads and are not necessarily a dead weight. The coil count is calculated. The window also explains both points carried across from the feasibility row: L2 must be longer than that candidate’s solid length, and no extra clearance is added because none is validated; the 70% / 80% travel sentence is a workshop guide, not a rejection rule and not a validated limit.
- Question 2, beside “Diameter limits”: an end-view diagram of the pocket, the diametral clearance and the inside diameter. A blank box means no limit. Growth under compression is stated as not defined. A blank pocket does not propose a diameter.
- Quality grades 1, 2 and 3, in original words, referring to BS EN 15800 by name. The text says it is not a copy of that standard. Grade warnings stay on the results page.
- Four end sketches: closed and ground, closed not ground, open and ground, open not ground.
- Material presets: what the letters are, and a plain advantage and drawback for each, including rust, lower stiffness, and the certificate for Custom. EN 10270 is named, not quoted.
- The stress window separates the Bergsträsser correction the app calculates from the allowable factor in the box (the page starts at 0.5; the box accepts 0.2 to 0.8 as a control range, not a certified limit).

Open, not decided:

- Which further inputs get a button. This build does not add one for wound direction, G, Rm, each load box on its own, the wire page, the optimise page, or the results page. The grade control on the results page is the same choice; it does not have a second button.

Checks: `tests/test-help.js`, 83 assertions, and the full `npm test` suite. In the browser, Enter opens the duty window, Escape closes it and restores focus, typed values and the Calculate result stay, and the same checks were repeated on a phone-sized window in light and dark.

10 November 2026, R2-10. The duty window no longer shows the two small method sketches. In their place is a load graph in the results-graph colours. The axes read “Load, F” and “Deflection, S”. The line passes through the origin, and L1/F1 and L2/F2 are marked. Under the graph, three horizontal helical springs share that scale, fixed at the right: L2 on top, then L1, then L0. Each has nine coils. The front wire is 5.7px and the back strand 3.75px at the 390px design width. A dotted line drops from each graph point to that spring’s moving end. There is no solid-length row. The explanatory paragraphs are unchanged. The picture uses fixed example positions, so an empty form still draws it.

## SC-011 — Blank pocket diameter — not implemented; objective not agreed

Attempt 1. It has not failed, and it did not choose a diameter. The Decision approves the idea and says the optimisation objective and the search limits are still to be agreed before implementation. The notes record Yuan’s intent and do not approve a particular objective. Lowest stress, smallest size, least material and best fatigue margin are listed there and not chosen. No search bound was added.

What Calculate does when the pocket is blank:

- It does not fill in a diameter, and it does not change the typed loads or the inner limit.
- It says no diameter is proposed, names the four unchosen examples, and says an inside-diameter limit is still applied when one is entered.
- The existing search still runs, including the existing index range. That range is not adopted as the missing SC-011 search limit.
- A pocket that is filled in does not show this note. A rod that is not smaller than the pocket is still rejected before the search.
- The wire list still tries each wire at D = 16d when there is no pocket. That is the existing check, not an optimal diameter.

Open:

- The objective.
- The search limits.
- The wording of “why this diameter” and the override, which have nothing to attach to until a diameter is actually proposed.

Checks: `tests/test-optimal.js`, 20 assertions, and the full `npm test` suite. Browser: blank pocket on a desktop window in light and dark, and blank pocket with an inner limit of 12 mm on a phone-sized window in light and dark. The pocket stayed empty.

## SC-013 — Paid PDF filename — built for the paid test path; the page stays unpaid

Attempt 1. It has not failed. The page cannot unlock a paid drawing, so the filename box is disabled and the file that will be saved is shown first: `helical-compression-spring-a3.pdf`. Typing into that box, even if it is forced on, does not change the unpaid name.

A paid name exists only in the Node test harness (`SPRING_CALC_TEST_ENTITLEMENT=1` and the test fixture). Invalid filename characters, path separators and reserved device names are replaced. The result is shown as the filename the save would use. The drawing number stays the separate `HC-` field. The typed name is not written into the title block, because that has not been decided. Price, Play Billing and verification are still not configured.

Checks: `tests/test-filename.js`, 16 assertions, and the full `npm test` suite. The results page was opened in light and dark, on a desktop window and a phone-sized window.

## SC-012 — A3 drawing layout — built in this branch

Attempt 1. It has not failed. The sheet is still one A3 landscape PDF. The on-screen calculator is unchanged.

What the latest written layout does here:

- Tables and the spring are black and white. Table 1 is top left and Table 2 is under it, same left edge and width. Both are sized to their text. On 10 November 2026 the vertical gaps were made even: from the inner border at 12 mm, between the tables, and from the bottom of the note under Table 2 to the top of the bottom watermark band at 263.441 mm. That same left area is used on the paid sheet. Each of the three gaps is 26.152 mm.
- The main spring is vertical on the right. There is no second small side sketch. The side-view dimensions remain L0, De and d. No other side-view dimensions were added.
- Closed and ground ends: the side view has low-pitch end turns and a flat line at each end, perpendicular to the axis.

Yuan’s review of 9 November 2026, on this same sheet:

- Table 1 and Table 2 have a horizontal line between every row, on both the unpaid sheet and the paid test-fixture sheet.
- The end view is under the vertical spring, on the same axis, because the sheet is third-angle. The spiral that had been drawn to the right is gone.
- Attempt 2 of the 9 November review. The end view is larger. Thin black circles mark De and Di, and the ring between them is light grey. A narrower dark band sits inside that ring, starting just above the tip, running anticlockwise over the top and down the left, and tapering near 7 o’clock. The lower-right of the ring stays light grey. The ground tip is a dark grey square with a black outline across the ring at 3 o’clock, with a black arrowhead just below it pointing down-right. “End view” is bold above the ring. De, Di and the actual end type are below it. Square and ground is the wording when the ends are closed and ground. The caption stays clear of notes 1 to 3.
- Notes 1 to 3, the three notes already on the sheet, sit immediately above the title block. The title block is shorter than before. The type sizes of its title and values are unchanged. The export filename is not written into it.
- The standards paragraph sits under Table 2 as a note, at the same size as the other notes.
- Table 1 keeps wire diameter, coils, loads at L1 and L2, hand, ends, grade, squareness and parallelism. Lengths at F1 and F2 moved onto it. Mean coil diameter, free length, load at Ln, material and tensile strength moved to Table 2. Coil-diameter tolerance and scope were deleted from Table 1. Recommended shortest length Ln was deleted and was not moved. Deflection to solid, deflection at Ln, corrected stress at L0, pocket clearance, wire length, mass and the indicative free-length tolerance were deleted from Table 2.
- A set outer limit puts De on Table 1 and Di on Table 2. A set inner limit does the opposite. Both blank puts De on Table 1 and Di on Table 2.
- The unpaid export still omits every table value and keeps the row and column labels, with the exact line “Upgrade to release drawing table” and the preview warning. The paid sheet, full values and no watermark, is still only the Node test fixture.

Flagged, not decided:

- “% of available travel” remains on deflection at F1 and F2. The model marks that note provisional. Only Ln was asked to be deleted.
- When both an outer and an inner limit are set, the source does not say which single diameter Table 1 should keep. Both stay on Table 1, and the model says that choice is not specified.

Checks: drawing tests 90, PDF release 205, and the rest of `npm test`. The unpaid and paid test-fixture PDFs and their page images are `sc012_unpaid_a3.pdf`, `sc012_unpaid_a3-1.png`, `sc012_paid_a3_TEST_FIXTURE_ONLY.pdf` and `sc012_paid_a3_TEST_FIXTURE_ONLY-1.png`. The paid file is a test fixture, not a purchase. The app still opens in a light desktop window and a dark phone window.

## Final inventory for this branch

These words describe this branch. They do not change the live WIP Results colours. Nothing here is merged, deployed, or uploaded.

| Item | Branch result | Open point |
| --- | --- | --- |
| SC-001 | Green | Phone appearance difference was not reproduced beyond the saved theme |
| SC-002 | Partial | Price, Play Billing, verification, restore and refunds are not configured. The paid PDF is a test fixture only |
| SC-003 | Green | |
| SC-004 | Partial | No validated extra clearance beyond L2 greater than solid length. The 70–80% sentence is a guide, not a fail |
| SC-005 | Partial | Where the limit boxes sit is not a final decision |
| SC-006 | Partial | Where ends, grade and wind sit is not a final decision |
| SC-007 | Amber | Web icon is in. Android wrapper is on this branch for preview. Not approved and not installed on a device |
| SC-008 | Blocked | Root host and Play app-signing SHA-256 are not available. No statement file was added. The guard is not an association |
| SC-009 | Partial | Further information buttons, beyond the six agreed topics, are not decided |
| SC-010 | Cancelled | Not implemented |
| SC-011 | Blocked | Optimisation objective and search limits are not agreed. No diameter is proposed |
| SC-012 | Green, with two flags | Travel-percent wording, and which diameter to keep when both limits are set |
| SC-013 | Partial | The page stays unpaid. A paid name is test-fixture only. Whether that name enters the title block is not decided |

## Other items

| Item | In this branch | Notes |
| --- | --- | --- |
| SC-010 | Cancelled | Not implemented |

## 14 November 2026 — stress limit, working range, optimisation, temperature

Attempt 1. It has not failed. This is on the review branch only. Nothing was merged, deployed, or built for Play.

- The material page can keep factor × Rm, or enter a stress limit in N/mm². The summary names which one is active. Heat map, wire list, optimisation, particulars and the drawing use that limit.
- Design constraints, under Application constraints, takes the most compressed and most relaxed working lengths. In point-and-rate mode those lengths set the two operating points. Stress is also checked at the most compressed length when that load is above the stated maximum.
- Auto-optimise tries the standard wires around the selection, then the mean diameter. A candidate must pass the existing checks, stay under the active stress limit at the most compressed working length, and keep both working deflections between 20 % and 80 %. The heat-map matrix is unchanged, still in 1 mm steps. The coil-diameter page is titled Optimization and has a wire-size list.
- Service temperature, °C, is on the same Application constraints section. If it is blank, the drawing omits the relaxation note. If it is set, note 4 reads “Set for relaxation at X °C”, where X is the service temperature plus 50, on the unpaid sheet and the paid test-fixture sheet.
- R2-05 is still not done. No suggested-clearance button was added for the spring guide.
