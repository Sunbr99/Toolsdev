#!/usr/bin/env bash
set -euo pipefail

echo "=== DevForge Studio x MW Next — Android APK Builder ==="

if [ ! -d "node_modules" ]; then
  echo "==> Installing npm packages..."
  npm install
fi

echo "==> Building production web bundle (dist/)..."
npm run build

if [ ! -d "android" ]; then
  echo "==> Adding Capacitor Android platform..."
  npx cap add android
fi

echo "==> Syncing web assets to Android..."
npx cap sync android

echo "==> Applying MW Next icons & obsidian theme..."
bash scripts/configure-android-native.sh

# Auto-detect Termux ARM64 aapt2 override if running on Termux
if [ -n "${TERMUX_VERSION:-}" ] || [ -x "/data/data/com.termux/files/usr/bin/aapt2" ]; then
  AAPT2_BIN="$(command -v aapt2 || echo /data/data/com.termux/files/usr/bin/aapt2)"
  if [ -x "$AAPT2_BIN" ]; then
    echo "==> Detected Termux ARM64! Configuring android.aapt2FromMavenOverride=$AAPT2_BIN"
    if ! grep -q "android.aapt2FromMavenOverride" android/gradle.properties; then
      printf "\nandroid.aapt2FromMavenOverride=%s\n" "$AAPT2_BIN" >> android/gradle.properties
    fi
  fi
fi

echo "==> Compiling Debug APK via Gradle..."
cd android
chmod +x gradlew
./gradlew assembleDebug --no-daemon

APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
  echo ""
  echo "SUCCESS! APK built at: android/${APK_PATH}"
else
  echo "Build completed. Check android/app/build/outputs/apk/ for output."
fi
