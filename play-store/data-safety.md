# Data safety form draft

Not submitted. “Collected” here means sent off the device to the developer or to a service the developer runs. On-device storage that never leaves the phone is not collected.

## Overview

| Question | Draft answer |
|---|---|
| Does the app collect or share any of the required user data types? | No. |
| Is all of the collected data encrypted in transit? | Not applicable. The developer collects none. |
| Do you provide a way for users to request that their data is deleted? | Not applicable. There is no developer account and no server copy of the design. The user can clear site data on the device. |
| Ads | No. The app does not contain ads. |
| Analytics | No analytics SDK and no crash-reporting SDK in the app code. |
| Data sold or shared | No. |

## What stays on the device

The calculator saves the last inputs in local storage (`spring-calc-state-v1`) and the colour setting (`spring-calc-theme`). Those values are not uploaded to YJerv. They are not a Play “collection”.

## Payments

With Play Billing switched off, the app does not start a purchase.

If the one-off drawing unlock is later switched on, Google Play processes the payment. The app is written to see a purchase token only. Card numbers are not collected by the app and should not be declared as data the developer collects. Play’s own handling of the payment is Google’s, not an entry on this form for financial data collected by YJerv.

## What the device does request

Opening the calculator loads files from GitHub Pages. That is the app itself, not a data type the form asks the developer to declare as collected user data. GitHub may log the request under GitHub’s policy. YJerv does not receive that log.

## Children

The app is not directed at children. No child-specific data is collected.
