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
- Graph, trade-off and on-screen spring colours use those tokens. The white outline behind graph text is still there and now uses the chart paper colour, so it does not become a white box in dark mode. Removing that outline is SC-003 and is not done here.
- Warnings, pass and fail states keep the words as well as the colour.
- The coil-diameter chart hint names the curves by their labels, not only by colour.
- Calculator formulae, inputs and the A3 PDF builder are unchanged.
- The settings screen has a “Further settings” section with no extra controls yet.

Checks on this commit, before any later item:

- `npm test`: engine 131, charts 77, EN 15800 96, drawing 71, theme 127. All passed. Drawing and engine tests are unchanged in result, so the calculator and the current A3 PDF model still pass.
- Browser, desktop 1280×900 and phone 390×844: System follows an emulated light and dark browser scheme; Light stays light when the browser is dark; Dark stays dark after reload; Enter opens Settings and moves focus inside; Escape closes it and returns focus to the gear. Screenshots are named `sc001_light_settings_panel.png`, `sc001_dark_validation_warning.png`, `sc001_light_results_graph.png`, `sc001_dark_results_graph.png`, `sc001_mobile_light_graph.png` and `sc001_mobile_dark_graph.png` in the review artifacts.

Not done in SC-001: SC-002 onwards. The live production site and the Play Console build are unchanged. There is no public preview URL; the branch is served locally for review.

## Other items

| Item | In this branch | Notes |
| --- | --- | --- |
| SC-002 | Not started | |
| SC-003 | Not started | Graph text outline intentionally kept |
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
