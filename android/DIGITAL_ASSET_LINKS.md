# Digital Asset Links

Chrome only treats the Android app as the owner of `https://yjerv.github.io/spring-calc/` when this statement is published at the **host root**:

https://yjerv.github.io/.well-known/assetlinks.json

That URL is the GitHub **user** site. It is not a file in this repository, and it is not served from the project site.

## What is not enough

A copy at any of these addresses is ignored for this package:

- `https://yjerv.github.io/spring-calc/.well-known/assetlinks.json`
- `https://yjerv.github.io/spring-calc/android/assetlinks.json`
- a file that exists only in this git branch

GitHub Pages for a project repository is mounted at `/spring-calc/`. The host Chrome checks is `yjerv.github.io`, with no project path. Putting the file in this repo and pushing `main` does **not** publish it to the place Chrome reads.

This branch does not publish the file. `android/assetlinks.json` is the template to copy later.

## Template

`android/assetlinks.json` names the package `uk.co.yjerv.springcalc`. Both fingerprints are placeholders:

- `PASTE_APP_SIGNING_CERTIFICATE_SHA256_FROM_PLAY_CONSOLE`
- `PASTE_UPLOAD_CERTIFICATE_SHA256`

They are not certificates. Do not replace them with a guessed value, and do not commit a real fingerprint until Yuan has copied it from Play Console.

## Where it can be hosted

Pick one host that answers for `https://yjerv.github.io/` itself.

1. **User site repository (the usual fix).** Create a repository named exactly `YJerv.github.io` on the account YJerv. GitHub serves that repository at `https://yjerv.github.io/`. Put the statement at `.well-known/assetlinks.json` in that repository. It must be served as `application/json` over HTTPS, with no redirect to another host. This project site at `/spring-calc/` can stay as it is.
2. **Custom domain.** Point a domain Yuan controls at the calculator and change `host` in `android/twa-manifest.json` to that domain **before** the first upload, then publish `https://that-domain/.well-known/assetlinks.json`. Changing the host after the first upload does not move the statement Chrome already checks.

Do not upload the statement to Google Play. Play does not host this file.

## How Yuan gets the Play App Signing fingerprint

After the first App Bundle is uploaded and Play App Signing is on:

1. Open Play Console and select the app.
2. Go to **Test and release → App integrity** (older consoles: **Release → Setup → App signing**).
3. Under **App signing key certificate**, copy **SHA-256 certificate fingerprint**.
4. Paste it into `sha256_cert_fingerprints` in place of `PASTE_APP_SIGNING_CERTIFICATE_SHA256_FROM_PLAY_CONSOLE`. Keep the colon-separated form Play shows (`AA:BB:…`).
5. On the same page, under **Upload key certificate**, copy that SHA-256 as well and replace `PASTE_UPLOAD_CERTIFICATE_SHA256`. The upload certificate lets Chrome verify builds signed with the upload key before Play re-signs them. The app-signing certificate is the one on the app users install from Play.

`android/scripts/print-upload-sha256.sh` prints the upload key from a local keystore. It does not print the Play App Signing key. That key stays with Google. Only Play Console shows it.

After the file is live, check it with:

https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://yjerv.github.io&relation=delegate_permission/common.handle_all_urls
