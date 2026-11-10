# Helical Spring Designer — Play Store wrapper

This folder is an Android **Trusted Web Activity** (TWA). It does not contain a second copy of the calculator. The installed app opens the live progressive web app:

https://yjerv.github.io/spring-calc/

Chrome draws it without the browser bar once Digital Asset Links check out. The pages, the service worker and the offline cache stay in the GitHub Pages site. Shipping a new calculation means updating that site. Shipping a new Play binary is only needed when this Android project changes (icon, package, version code, target SDK).

The project matches the current [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) template (Android Gradle Plugin 8.9.1, `compileSdk` / `targetSdk` 36, `androidbrowserhelper` 2.7.4). From 31 August 2026 Google Play requires new apps to target Android 16, API 36. That is already set.

There is **no Play Billing code**. £4.99 is a paid download, configured in Play Console. The owner installs it without paying by being a licence tester.

Nothing in this folder is a Play Console password, a keystore, or a signing password. Do not add those.

## Package name

**`uk.co.yjerv.springcalc`**

Chosen because the publisher is YJerv in the UK, and this is the reverse-DNS form you asked for (`uk.co` + `yjerv` + the app). Play does not check that you control `yjerv.co.uk`. The id only has to be unique, and it is permanent after the first upload.

If Play says that id is already taken, change `packageId` in `twa-manifest.json` to `io.github.yjerv.springcalc` **before** that upload, then regenerate:

```bash
cd android
bubblewrap update --skipVersionUpgrade
```

`io.github.yjerv` follows the GitHub account YJerv and the host `github.io`. Do not change the package id after the first App Bundle has been uploaded.

The same id is in `twa-manifest.json`, `app/build.gradle`, `AndroidManifest.xml`, the Java package `uk.co.yjerv.springcalc`, and `assetlinks.json`. `bubblewrap update` rewrites the generated Android files from `twa-manifest.json`. Prefer editing the manifest and regenerating, rather than editing those files by hand.

## What you do, in order

1. Create the Play developer account (US$25).
2. Install JDK 17, Bubblewrap and the Android SDK.
3. Create a signing key and keep it off git.
4. Build the release App Bundle (`.aab`).
5. Publish `assetlinks.json` on the **user** GitHub Pages site, not only in this repo.
6. Create the app as **Paid**, price the United Kingdom at **£4.99**, and declare the developer account **non-trader** (individual hobby developer). The public listing shows an email and a country. It does not show a home address.
7. Add yourself as a licence tester and install from an internal test track.

Store text is in [`store/listing.md`](store/listing.md). The privacy policy to host is [`/privacy.html`](../privacy.html), and the same words are in [`store/privacy-policy.md`](store/privacy-policy.md).

## 1. Play developer account

Google charges a one-time **US$25** registration fee. It is not £4.99, and it is not something this repository can pay.

1. Sign in with the Google account that should own the app.
2. Open https://play.google.com/console/signup and finish registration.
3. Complete identity verification. For a UK account this can take a few days. Google asks for your legal name and address in that private check. Do not copy them into this repo, the store listing, or the privacy page.
4. You cannot upload an App Bundle until the account is approved.

To **sell** the app you also need a payments profile, separate from the US$25 fee. Play Console path:

**Manage account → Play apps settings → Monetisation settings → Payments profile**

(The US English console says “Monetization”.) Google asks there for the legal name, a street address and the bank account that should receive sales. A PO box is not accepted. The country on that profile is fixed afterwards. That address stays inside the payments profile so Google can pay you. It is not a store-listing field. Do not type it into the listing, the privacy policy, or any file in this repository. Google takes a service fee on each sale. The rate is shown in Play Console. It is not set in this project.

## 2. JDK, Bubblewrap and the Android SDK

You need Node.js 18 or newer, JDK 17, and the Android SDK. Bubblewrap can download the JDK and the SDK on first run. That is the simplest route.

```bash
npm install -g @bubblewrap/cli
cd android
bubblewrap doctor
```

The first command that needs the SDK offers to download a JDK and the Android command-line tools, then asks you to accept the Android licences. Let it. Paths are stored in `~/.bubblewrap/config.json` on your machine, not in this repo.

If you would rather install them yourself:

- **JDK 17.** Bubblewrap’s installer expects 17. On Ubuntu: `sudo apt-get install -y openjdk-17-jdk`. Adoptium Temurin 17 is the same choice on Windows and macOS. Android Gradle Plugin 8.9.1 also builds on JDK 21, but if `bubblewrap doctor` objects, use 17.
- **Android SDK.** Install [Android Studio](https://developer.android.com/studio) or the command-line tools, and install **Android SDK Platform 36** and **Build-Tools 36**. Tell Bubblewrap with `bubblewrap updateConfig --jdkPath=... --androidSdkPath=...`.
- `local.properties` (with `sdk.dir=`) is created on your machine and is gitignored. Do not commit it.

## 3. Signing key

The upload key signs the App Bundle. Play App Signing, which is compulsory for new apps, then re-signs the app that users install. You can ask Google to reset a lost **upload** key. You still need a backup, and this git repository is not that backup.

From `android/`:

```bash
mkdir -p "$HOME/keystores"
keytool -genkeypair -v \
  -keystore "$HOME/keystores/spring-calc-upload.keystore" \
  -alias upload \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

`keytool` asks for the keystore password, the key password, and your name, organisation and country code (`GB`). Choose passwords you can keep. **Do not** put them in a file in this repo, in the shell history you commit, or in the chat. Validity of 10000 days is about 27 years. Google wants a long-lived upload certificate.

Then point `signingKey` in `twa-manifest.json` at that file:

```json
"signingKey": {
  "path": "/home/you/keystores/spring-calc-upload.keystore",
  "alias": "upload"
}
```

Use your real home directory. The committed manifest says `./android.keystore` only so a local file of that name works if you insist on keeping it beside the project. That filename is gitignored. Prefer the home-directory path so a later `git add -A` cannot pick it up.

Check before every commit:

```bash
git check-ignore -v android/android.keystore "$HOME/keystores/spring-calc-upload.keystore" || true
git status
```

There should be no `.keystore`, `.jks`, or `keystore.properties` in the commit.

Copy the keystore and the passwords into a password manager and an offline backup. Two passwords exist: the store password and the key password. You may set them to the same value. `keytool` will ask twice.

The alias in the commands above is `upload`. It must match `signingKey.alias`.

## 4. Icons

Launcher, splash, maskable, Play icon and feature graphic are already generated from `icons/icon.svg`. Regenerate after an icon change:

```bash
python3 android/scripts/generate-icons.py
```

That uses `rsvg-convert` so each density is drawn from the SVG. If `rsvg-convert` is missing it resizes `icons/icon-512.png` instead.

```bash
sudo apt-get install -y librsvg2-bin python3-pil
```

`store_icon.png` is the 512 × 512 Play icon. `store/feature-graphic.png` is the 1024 × 500 feature graphic. Notes for both are in [`store/listing.md`](store/listing.md).

## 5. Build the release App Bundle

From `android/`, with the signing path in `twa-manifest.json` pointing at a real keystore:

```bash
cd android
bubblewrap build
```

Bubblewrap asks for the keystore password and the key password. Type them. The preferred alternative to typing them into a script is the prompt. If you do use the environment variables, set them in a shell you do not commit and do not echo them:

- `BUBBLEWRAP_KEYSTORE_PASSWORD`
- `BUBBLEWRAP_KEY_PASSWORD`

Outputs, both gitignored:

| File | Use |
|---|---|
| `app-release-bundle.aab` | Upload this to Play Console |
| `app-release-signed.apk` | Side-load onto a phone for a quick test |

`bubblewrap build` runs `gradlew bundleRelease` and signs the `.aab` with `jarsigner`. An unsigned bundle from `./gradlew :app:bundleRelease` alone is **not** what you upload. Use `bubblewrap build` unless you are only checking that the project compiles (`bubblewrap build --skipSigning`, or `./gradlew :app:assembleDebug`).

If Bubblewrap says the manifest changed and offers to update the project, accept that only when you have edited `twa-manifest.json` on purpose. The update rewrites `app/`, `gradle/`, `gradlew`, `build.gradle`, `settings.gradle`, `gradle.properties` and `store_icon.png`. This README, `store/`, `scripts/` and `assetlinks.json` are left alone. Pass `--skipVersionUpgrade` when you call `bubblewrap update` yourself, otherwise Bubblewrap also bumps the version:

```bash
bubblewrap update --skipVersionUpgrade
```

`manifest-checksum.txt` is the SHA-1 of `twa-manifest.json`. Bubblewrap uses it to decide whether the project is stale. After you edit the manifest, either update as above or refresh the checksum so the next build does not surprise you. `bubblewrap update` rewrites the checksum.

### Version numbers for a later upload

`appVersion` (`1.4.0`) is the version users see. `appVersionCode` (`1`) is an integer Play requires to increase on every upload. Edit both in `twa-manifest.json`, then:

```bash
bubblewrap update --skipVersionUpgrade
bubblewrap build
```

## 6. Digital Asset Links

Chrome only treats the app as a Trusted Web Activity when this URL returns the statement file:

https://yjerv.github.io/.well-known/assetlinks.json

That host is the GitHub **user** site. This repository is a **project** site. A copy of the file inside `spring-calc` is published at `https://yjerv.github.io/spring-calc/.well-known/assetlinks.json`, and Chrome does not look there. The repository `YJerv/YJerv.github.io` does not exist yet. Create it.

1. Create a public repository named `YJerv.github.io` on the account that owns `spring-calc`.
2. Turn on GitHub Pages for it (branch `main`, folder `/`).
3. After the first Play upload, copy the certificate fingerprints (next section) into `android/assetlinks.json`.
4. Put that file in the new repository at `.well-known/assetlinks.json`.
5. Confirm it, with no redirect to another host:

```bash
curl -sI https://yjerv.github.io/.well-known/assetlinks.json
curl -s "https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://yjerv.github.io&relation=delegate_permission/common.handle_all_urls"
```

You want HTTP 200 and `Content-Type: application/json`. The statement list should name `uk.co.yjerv.springcalc`.

Until this file is live, the app still opens the calculator. It opens it as a browser tab, with the address bar, instead of as a borderless TWA. That is the signal the asset link is missing or the fingerprint does not match.

### Which fingerprint

Play App Signing means users receive an app signed by **Google’s app signing key**, not by your upload key. `assetlinks.json` must include the **app signing certificate** SHA-256. Include the upload certificate as well if you install a bundle you signed yourself.

After the first upload:

1. Play Console → your app → **Test and release → App integrity** (older label: **Setup → App signing**).
2. Copy **App signing key certificate** SHA-256.
3. Copy **Upload key certificate** SHA-256.
4. Replace the two placeholders in `android/assetlinks.json`. The form is colon-separated hex, `AB:CD:…`, 32 bytes.

Your upload fingerprint, before Play has one, comes from the keystore. `keytool` prompts for the password and prints it. Nothing is saved:

```bash
cd android
./scripts/print-upload-sha256.sh "$HOME/keystores/spring-calc-upload.keystore" upload
```

Look for the line `SHA256:`.

`enable-debug.sh` writes a Chrome command-line flag that skips the asset-link check for a host. It only takes effect on devices that honour `/data/local/tmp/chrome-command-line`. A normal retail phone usually does not. Deploy the real `assetlinks.json` rather than depending on that script.

## 7. Create the app and set £4.99

In Play Console, **Create app**:

| Field | Value |
|---|---|
| App name | Helical Spring Designer |
| Default language | English (United Kingdom) |
| App or game | App |
| Free or paid | **Paid** |

A published free app cannot later be made paid, and a paid app cannot be made free. Set Paid now, before you publish.

Price, after the payments profile exists:

- If you have the one-time products pricing page: **Products → App pricing → Set pricing**. Select the United Kingdom and enter **£4.99**. Save.
- Otherwise open the **App pricing** page and enter the price there. Play derives other countries from it. Check the United Kingdom row and edit it until the price the customer is shown is £4.99. In some countries the form’s figure is before tax. Use the preview for the United Kingdom rather than guessing VAT.

Paid apps are not offered in every country. That is Play’s rule. Leaving a country without a price means buyers there cannot install it.

Do not add an in-app product. `features.playBilling` in `twa-manifest.json` stays off.

### Non-trader for now

Launch as a paid app at £4.99 and declare **non-trader**. You are an individual hobby developer. Buyers should see a contact email and a country. They should not see a home address.

The declaration is on the developer account, and only the account owner can submit it:

1. The Play Console home page may show **Declare your trader status**. Start there if it does.
2. Otherwise open **Manage account → Account details → About you**.
3. Under **Trader status**, choose **Declare your trader status**. The top of the same page may say **Declare status**.
4. Select **This is a non-trader account**. That is the option for a personal hobby, or other publishing that is not for a trade, business, craft or profession. Leave **This is a trader account** unselected.
5. Continue to **Declaration and consent**, tick the box, choose **Save**, then **Confirm**.
6. **About you** should then show **Non-trader** under **Trader status**.

If Play also asks on the app, open Helical Spring Designer and go to **Monitor and improve → Policy and programmes → App content** (US consoles say “programs”). Confirm that the account’s non-trader status applies to this app. Do not enter a postal address or a phone number. A terms-of-service URL is optional for a non-trader. Leave it empty unless the page you link also contains no home address.

For a non-trader, Play describes the UK and EEA listing as an email address and a country, not a street address or a phone number. The public developer name can stay **YJerv**. After the listing is visible, open it the way a buyer would and check that no street address is shown.

An older Play help page still says a paid account displays the address from the payments profile. If that address has appeared on the listing, leave it out of this repo and out of the privacy page. The public address to use later is a business address, via the change below, not the home address copied into our pages.

You can change the declaration later, on the same screen: **Manage account → Account details → About you → Trader status**. Choose **This is a trader account** when you are publishing for a trade or business. A trader listing shows a name, address, phone number and email. Supply a business address you are willing to show, such as a registered office, not your home address. You do not need a new Play developer account to make that change.

Google lists a paid app as one sign that an account may be a trader, and they may later ask you to update the declaration. The status recorded for this launch is still non-trader.

### Upload

1. **Test and release → Testing → Internal testing → Create release.**
2. Upload `app-release-bundle.aab`.
3. Play will enrol the app in Play App Signing on this first upload and show the app signing certificate. Copy it into `assetlinks.json` before you expect the borderless TWA.
4. Roll the release out to Internal testing. Add an email list that contains the Google account on your phone, and open the opt-in link on that phone.

Move to production when you are satisfied. The store listing text, icon, feature graphic and screenshots are in [`store/listing.md`](store/listing.md). The privacy policy URL is:

https://yjerv.github.io/spring-calc/privacy.html

Pages only serves that URL once `privacy.html` is on `main`.

Target API is already 36, so the “target API level” check should pass for a new app submitted after 31 August 2026.

## 8. Install it yourself without paying

Licence testing and internal testing are different lists. You want both.

**Licence testing** is what stops Play charging for this paid app. The publishing account is always a licence tester. If the phone is signed into a **different** Gmail, add that address too:

**Manage account → Play apps settings → Monetisation settings → Licence testing**

(US English consoles label it “License testing”.) Add an email list containing the phone’s Google account, or a Google Group. Save. The help page also uses this list for in-app billing tests. This app has no in-app products. The same list is how a paid download is installed as a test purchase, without a charge.

**Internal testing** is how you receive the build before it is public. Add the same account as an internal tester and use the opt-in link. Being on the internal track alone does not waive the price. Being a licence tester alone does not deliver an unpublished build.

On the phone:

1. Play Store is signed in as that Google account. Check **Settings → the account avatar**.
2. Open the internal-test opt-in link and accept.
3. Install Helical Spring Designer. The price should not be charged. If Play still asks for £4.99, the account on the phone is not the licence tester, or the licence list has not applied yet. Wait and try again before paying.
4. The first launch needs a network so Chrome can fetch the site. Later launches can be offline.

There is no promo code and no Play Billing sandbox in this project. Do not add one.

## What never gets committed

- `*.keystore`, `*.jks`, `android.keystore`
- Keystore passwords, `BUBBLEWRAP_KEYSTORE_PASSWORD`, `BUBBLEWRAP_KEY_PASSWORD`
- `keystore.properties`, `local.properties`
- A Play service-account JSON (`bubblewrap play` can upload with one; do not add one here)
- Built `*.aab` and `*.apk`

`.gitignore` in this folder and at the repo root covers those names. Still look at `git status` before you commit.

## Layout

```
android/
  twa-manifest.json          Bubblewrap’s source of truth
  README.md                  this file
  assetlinks.json            copy to YJerv.github.io/.well-known/ after you have fingerprints
  manifest-checksum.txt      SHA-1 of twa-manifest.json, for bubblewrap build
  build.gradle               AGP 8.9.1; mavenCentral instead of the dead jcenter repo
  app/                       TWA: LauncherActivity, manifest, icons
  store/                     listing drafts, privacy text, feature graphic
  store_icon.png             512×512 Play icon
  scripts/generate-icons.py
  scripts/print-upload-sha256.sh
  enable-debug.sh            optional; weak on retail phones
```

`bubblewrap update` deletes and recreates `app/`, the Gradle wrapper and `store_icon.png` from `twa-manifest.json`. Re-run `python3 android/scripts/generate-icons.py` afterwards if you want the SVG-rendered icons back. Bubblewrap otherwise downloads `icon-512.png` from the live site and scales that.

The Gradle files here follow that template, with one deliberate change: `jcenter()` is omitted. Bintray’s repository is shut and can hang dependency resolution. Google Maven and Maven Central have the Android Gradle Plugin and `androidbrowserhelper`. A later `bubblewrap update` may put `jcenter()` back. Remove it again if the build stalls on it.

## Scope of the wrapper

- Launch URL `https://yjerv.github.io/spring-calc/`, scope path `/spring-calc/`.
- Portrait, standalone, theme `#0b1f33`, splash background `#f3efe6`.
- Notifications are off. The calculator does not post any. `POST_NOTIFICATIONS` is not requested.
- Fallback if the device has no TWA browser: a Custom Tab, not a bundled WebView. Custom Tabs do not need an `INTERNET` permission on this app. Chrome does the networking.
- Minimum SDK 24 (Android 7.0). `androidbrowserhelper` 2.7.4 will not merge into a lower `minSdk`. Play’s target is 36.
- Version name `1.4.0`, version code `1`, matching the PWA’s 1.4 release for the first upload.
