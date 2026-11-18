#!/bin/sh
# Print the upload-key certificate, including the SHA-256 fingerprint
# that Digital Asset Links needs. The keystore password is prompted
# for by keytool. Nothing is written to disk.
#
# Usage, from android/:
#   ./scripts/print-upload-sha256.sh
#   ./scripts/print-upload-sha256.sh /path/to/upload.keystore upload

set -eu
cd "$(dirname "$0")/.."
KEYSTORE="${1:-./android.keystore}"
ALIAS="${2:-upload}"

if [ ! -f "$KEYSTORE" ]; then
  echo "Keystore not found: $KEYSTORE" >&2
  echo "Generate it with the keytool command in android/README.md." >&2
  echo "Do not commit the keystore or its password." >&2
  exit 1
fi

keytool -list -v -keystore "$KEYSTORE" -alias "$ALIAS"
