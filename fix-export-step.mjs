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
  '            with open(os.path.join(os.environ["RUNNER_TEMP"], "ExportOptions.plist"), "wb") as fh:',
  "                plistlib.dump(options, fh)",
  "            PY",
  "            xcodebuild -exportArchive \\",
  '              -archivePath "$RUNNER_TEMP/HyperCodeRemote.xcarchive" \\',
  '              -exportOptionsPlist "$RUNNER_TEMP/ExportOptions.plist" \\',
  '              -exportPath "$RUNNER_TEMP/export"',
  "",
]

const next = [...lines.slice(0, start), ...block, ...lines.slice(end)]
fs.writeFileSync(path, next.join(nl), "utf8")
console.log("patched", start, end)
