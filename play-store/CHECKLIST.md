# Play Console checklist

For Yuan. Nothing in this list has been done in Play Console. This repository has not been uploaded, and no signing key has been created here.

The package name already in the project is `uk.co.yjerv.springcalc`. The drawing-unlock product id in the code is `spring_calc_drawing_unlock_PLACEHOLDER`. Play Billing is switched off.

## Yuan

1. Create the Play Console developer account and pay the one-off registration fee. Identity checks can take a few days. Do not put the home address into this repo or the store listing.
2. Install JDK 17 and Bubblewrap (`npm install -g @bubblewrap/cli`). From `android/`, run `bubblewrap doctor` and let it install a JDK and the Android SDK if you do not already have them. Accept the Android licences.
3. Generate the upload key with Bubblewrap and keep it off this git repository. `bubblewrap build` in `android/` creates `android.keystore` on your machine. Back it up somewhere private. Losing it means asking Google to reset the upload key. Do not commit the keystore or its password.
4. Build the release App Bundle on your machine: `cd android && bubblewrap build`. The file to upload is the signed `.aab`, not a debug APK from this branch.
5. In Play Console, create the app. Use the title, short description and full description in `play-store/listing.md`. Upload `play-store/icon-512.png`, `play-store/feature-graphic.png` and the phone screenshots in `play-store/screenshots/`.
6. Enable Play App Signing. It is required for a new app. After the first upload, open **Test and release → App integrity**, copy the **App signing key certificate** SHA-256, and also copy the **Upload key certificate** SHA-256.
7. Publish Digital Asset Links yourself at `https://yjerv.github.io/.well-known/assetlinks.json`. A file under `/spring-calc/` is the wrong host. The steps and the two hosting options are in `android/DIGITAL_ASSET_LINKS.md`. Replace both placeholders in `android/assetlinks.json` with the fingerprints from step 6. Do not invent a fingerprint.
8. Host the privacy policy. `play-store/privacy.html` is the draft and is not on the live site. Play needs a public URL. Put that page somewhere you control and paste the URL into the store listing. The calculator pages do not link to this draft.
9. Create one in-app product, not a subscription. The product id must match the id in the app once the placeholder is replaced. Type: one-off. This product does not exist yet, and the app will not offer it while the billing switch is off.
10. Add your Google account as a licence tester so an internal-test purchase is not charged.
11. Upload the App Bundle to an internal testing track. Install it on your phone from the opt-in link. Open the calculator, run Check, and open the A3 preview. Confirm the app icon and the splash.
12. When the internal test is acceptable, promote a release to production. That is the step that makes it public.

## After those steps, ask for another pass here

- After step 6, if you paste the two SHA-256 fingerprints here, the template in git can be filled in. Publishing the statement to `yjerv.github.io` stays with you.
- After step 9, if you send the real product id, the placeholder can be replaced and `PLAY_BILLING_ENABLED` in `js/entitlement.js` can be turned on. Until then the unlock stays off and the PDF stays the unpaid preview. A real purchase still cannot be proven from this environment. It needs the internal test on your phone.
- Store listing text and the privacy draft can be revised after you have read them. They are not uploaded from here.
