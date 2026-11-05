# Play Store listing drafts

British English. Paste these into Play Console. The price £4.99 is set in Play Console, not written into the app. Leave the price off the graphics.

App name (30 characters maximum): **Helical Spring Designer** (23).

Default language: **English (United Kingdom)**.

Category to choose: **Tools**.

Contact email: use the address you want buyers to see. The privacy policy points at that Play listing address. Do not invent one in the app.

Privacy policy URL, once this branch is on `main` and Pages has rebuilt:

https://yjerv.github.io/spring-calc/privacy.html

## Short description

80 characters maximum. This draft is 71:

```
Metric helical compression spring design to BS EN 13906-1 and EN 15800.
```

## Full description

4000 characters maximum.

```
Helical Spring Designer sizes cylindrical helical compression springs of round wire, using the calculation method of BS EN 13906-1. Manufacturing tolerances follow BS EN 15800 quality grades 1, 2 and 3. Metric units throughout. British English.

It is a phone calculator for a designer, a toolmaker or a student checking a spring. You work through five steps:

• Loads. Two load–length points, or one point plus the spring rate.
• Pocket and material. Hole diameter, clearance, ends, and G and Rm for EN 10270 wire.
• Wire. A heat map of mean coil diameter against the standard wire series, coloured by corrected stress.
• Coil diameter. A slider, with an optimiser for index, pocket fit, stress, solid length and coil count.
• Results. Load–length graph, particulars, a scaled side view, and an A3 drawing export. Print, or export text or JSON.

The corrected stress uses the Bergsträsser factor, as in EN 13906-1. A worked example is built in, so you can see a complete result before entering your own duty.

After the first open, the calculator is stored on the device and keeps working without a connection. There is no account. The numbers you type stay on the device. There are no adverts and no in-app purchases. The charge is the Play download price.

This is a design aid. It is not a certified calculation pack, and it is not a substitute for the current British Standards or the material certificate. Fatigue, relaxation, temperature and corrosion are not designed in. You remain responsible for the spring you specify.

Not affiliated with BSI.
```

## Feature graphic

Play size: **1024 × 500** PNG or JPEG, no transparency. A ready file is `android/store/feature-graphic.png`, drawn from the PWA icon.

Text on the graphic, and nothing else:

- Helical Spring Designer (set on two lines so it stays inside the frame)
- BS EN 13906-1 · BS EN 15800
- Metric compression springs

Colours, taken from the app: navy `#0b1f33`, cream `#f7f1e4`, gold `#c4a35a` and `#e8d7a8`. Keep the words inset from the edges. Do not add the price, a star rating, the word “best”, a device frame, or a screenshot of the calculator. Play shows the price itself. Rebuild the file with `python3 android/scripts/generate-icons.py` if the icon changes.

## High-resolution icon

512 × 512 PNG. Use `android/store_icon.png`. It is the PWA icon, a full navy square, so Play’s own mask can crop it. Do not upload the SVG.

## Phone screenshots

At least two. Play rejects a screenshot whose long side is more than twice the short side.

In `screenshots/`, `07-heatmap.png` (648 × 1252) is inside that limit. The full-page captures such as `01-loads.png` and `05-results.png` are taller than 2:1, so crop them to a 9:16 frame (for example 1080 × 1920) before upload, or take new phone screenshots. Four to eight shots is enough: loads, heat map, coil diameter, results graph, particulars, side view.

Do not upload the wide graph crops (`05a`, `08`, `09`) as phone screenshots. They are the wrong shape.

## Data safety form

Policy > App content > Data safety. Answer from what the app actually does:

- The developer does not collect account details, contacts, location, photos, or financial information.
- Spring inputs are calculated on the device and saved only in local storage on the device.
- There is no analytics SDK, no advertising SDK, and no crash reporter.
- The app is not directed at children.
- Data is not sold.
- Opening the app requests the pages from GitHub Pages. That is the hosting of the calculator, not a profile YJerv keeps. Say so if the form asks about data handled by a service provider. YJerv does not receive GitHub’s logs.
- Purchases are handled by Google Play. There is no Play Billing code in the app.

If a question does not match this list, answer for the behaviour above rather than ticking “no data leaves the device” as a blanket claim. The first launch does fetch the site.

## Other declarations

- Ads: no.
- App access: all functions are available without a sign-in. No test login to supply.
- News, government, health, financial features: no. It does not give regulated financial advice. It is a mechanical calculator.
- Target age: not designed for children. An engineering tool. Select 18 and over if the form offers an age group.

## Content rating

Complete the questionnaire as a utility. No violence, no user-generated public content, no unrestricted web browsing of third-party sites (the app opens its own calculator), no social features.
