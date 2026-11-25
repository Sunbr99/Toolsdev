#!/usr/bin/env bash
set -euo pipefail

RES_DIR="android/app/src/main/res"
if [ ! -d "$RES_DIR" ]; then
  echo "Android project not initialized yet. Run 'npx cap add android' first."
  exit 1
fi

echo "==> Copying MW Next launcher icons into Android mipmap densities..."
for density in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
  mkdir -p "${RES_DIR}/mipmap-${density}"
  if [ -f "public/pwa-512x512.png" ]; then
    cp "public/pwa-512x512.png" "${RES_DIR}/mipmap-${density}/ic_launcher.png"
    cp "public/pwa-maskable-512x512.png" "${RES_DIR}/mipmap-${density}/ic_launcher_round.png"
    cp "public/pwa-maskable-512x512.png" "${RES_DIR}/mipmap-${density}/ic_launcher_foreground.png"
  fi
done

echo "==> Writing dark obsidian theme & edge-to-edge colors.xml..."
mkdir -p "${RES_DIR}/values"
cat > "${RES_DIR}/values/colors.xml" <<'EOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">#0A0A0A</color>
    <color name="colorPrimaryDark">#0A0A0A</color>
    <color name="colorAccent">#F59E0B</color>
    <color name="ic_launcher_background">#0A0A0A</color>
</resources>
EOF

echo "==> Ensuring responsive viewport & hardened flags in AndroidManifest.xml..."
MANIFEST="android/app/src/main/AndroidManifest.xml"
if [ -f "$MANIFEST" ]; then
  if ! grep -q 'android:hardwareAccelerated' "$MANIFEST"; then
    sed -i 's/<application/<application android:hardwareAccelerated="true"/' "$MANIFEST" || true
  fi
  if grep -q 'android:allowBackup="true"' "$MANIFEST"; then
    sed -i 's/android:allowBackup="true"/android:allowBackup="false"/' "$MANIFEST" || true
  fi
  if ! grep -q 'android:windowSoftInputMode' "$MANIFEST"; then
    sed -i 's/android:launchMode="singleTask"/android:launchMode="singleTask" android:windowSoftInputMode="adjustResize" android:resizeableActivity="true"/' "$MANIFEST" || true
  fi
fi

echo "==> Android native configuration applied successfully."
