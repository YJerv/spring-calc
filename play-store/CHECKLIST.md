# Play Console checklist

The app `uk.co.yjerv.springcalc` already exists in Play Console, with Play App Signing on. Internal testing already has release versionCode 2 (versionName 1.4.0). This tree is versionCode 3, versionName 1.4.1. Nothing here has been uploaded. No new signing key has been created in this repository.

The drawing-unlock product id in the code is still `spring_calc_drawing_unlock_PLACEHOLDER`. Play Billing is switched off.

## Yuan

1. Build the release App Bundle with the **same upload key** that signed versionCode 2. Do not generate a new key. From `android/`, `bubblewrap build` signs the `.aab` with the keystore already on your machine. The file to upload is that signed bundle, not a debug APK.
2. Upload versionCode 3 (versionName 1.4.1) to the **existing** internal testing track. Install it from the opt-in link already on your phone. Open the calculator, run Check, and open the A3 preview. Confirm the icon and the splash.
3. Copy the **App signing key certificate** SHA-256 from **Test and release → App integrity**. Put it in `android/assetlinks.json` in place of `PASTE_APP_SIGNING_CERTIFICATE_SHA256_FROM_PLAY_CONSOLE`. Publish that file yourself at `https://yjerv.github.io/.well-known/assetlinks.json`. A file under `/spring-calc/` is the wrong host. See `android/DIGITAL_ASSET_LINKS.md`. Do not invent a fingerprint.
4. Create one in-app product, not a subscription. The product id must match the id in the app once the placeholder is replaced. Type: one-off. The app will not offer it while the billing switch is off.
5. Add your Google account as a licence tester so an internal-test purchase is not charged.

## After those steps, ask for another pass here

- After step 3, if you paste the App signing SHA-256 here, the template in git can be filled in. Publishing the statement to `yjerv.github.io` stays with you.
- After step 4, if you send the real product id, the placeholder can be replaced and `PLAY_BILLING_ENABLED` in `js/entitlement.js` can be turned on. Until then the unlock stays off and the PDF stays the unpaid preview. A real purchase still needs the internal test on your phone.
- Store listing text and the privacy draft can be revised after you have read them. They are not uploaded from here.
