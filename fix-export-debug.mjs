import fs from "node:fs"

const path = "E:/hypercode/.github/workflows/build-mobile.yml"
const text = fs.readFileSync(path, "utf8")
const nl = text.includes("\r\n") ? "\r\n" : "\n"
const lines = text.split(/\r?\n/)

const start = lines.findIndex((l) => l.includes("- name: Export the .ipa"))
if (start < 0) {
  console.log("step not found")
  process.exit(1)
}
let end = start + 1
while (end < lines.length && !/^ {8}- name: /.test(lines[end])) end++

const block = [
  "        - name: Export the .ipa",
  "          env:",
  "            APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}",
  "          run: |",
  "            set -euo pipefail",
  '            echo "team=[$APPLE_TEAM_ID] len=${#APPLE_TEAM_ID}"',
  '            ARCHIVE="$RUNNER_TEMP/HyperCodeRemote.xcarchive"',
  '            APP=$(ls -d "$ARCHIVE"/Products/Applications/*.app | head -n 1)',
  '            echo "--- archive info ---"',
  '            /usr/libexec/PlistBuddy -c "Print :ApplicationProperties" "$ARCHIVE/Info.plist" || true',
  '            echo "--- app signature ---"',
  '            codesign -dv --verbose=2 "$APP" 2>&1 | head -n 12 || true',
  '            echo "--- embedded profile ---"',
  '            security cms -D -i "$HOME/Library/MobileDevice/Provisioning Profiles/hypercode-mobile.mobileprovision" > "$RUNNER_TEMP/profile.plist" || true',
  '            /usr/libexec/PlistBuddy -c "Print :Name" -c "Print :UUID" -c "Print :Entitlements:application-identifier" "$RUNNER_TEMP/profile.plist" || true',
  "            python3 - <<'PY'",
  "            import os, plistlib",
  "            options = {",
  '                "method": "app-store-connect",',
  '                "teamID": os.environ["APPLE_TEAM_ID"],',
  '                "signingStyle": "manual",',
  '                "provisioningProfiles": {"app.hypercode.mobile": "HyperCode Remote App Store"},',
  '                "uploadSymbols": True,',
  '                "destination": "export",',
  "            }",
  '            path = os.path.join(os.environ["RUNNER_TEMP"], "ExportOptions.plist")',
  "            with open(path, \"wb\") as fh:",
  "                plistlib.dump(options, fh)",
  "            PY",
  '            echo "--- export options ---"',
  '            cat "$RUNNER_TEMP/ExportOptions.plist"',
  '            echo "--- export attempt 1 ---"',
  '            xcodebuild -exportArchive -archivePath "$ARCHIVE" \\',
  '              -exportOptionsPlist "$RUNNER_TEMP/ExportOptions.plist" \\',
  '              -exportPath "$RUNNER_TEMP/export" -allowProvisioningUpdates || {',
  '              echo "--- export attempt 2 (minimal options) ---"',
  "              python3 - <<'PY'",
  "              import os, plistlib",
  "              options = {",
  '                  "method": "app-store-connect",',
  '                  "teamID": os.environ["APPLE_TEAM_ID"],',
  '                  "destination": "export",',
  "              }",
  '              path = os.path.join(os.environ["RUNNER_TEMP"], "ExportOptions.min.plist")',
  "              with open(path, \"wb\") as fh:",
  "                  plistlib.dump(options, fh)",
  "              PY",
  '              cat "$RUNNER_TEMP/ExportOptions.min.plist"',
  '              xcodebuild -exportArchive -archivePath "$ARCHIVE" \\',
  '                -exportOptionsPlist "$RUNNER_TEMP/ExportOptions.min.plist" \\',
  '                -exportPath "$RUNNER_TEMP/export" -allowProvisioningUpdates',
  "            }",
  "",
]

const next = [...lines.slice(0, start), ...block, ...lines.slice(end)]
fs.writeFileSync(path, next.join(nl), "utf8")
console.log("patched", start, end)
