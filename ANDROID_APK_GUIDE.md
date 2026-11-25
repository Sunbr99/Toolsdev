# DevForge Studio x MW Next — คู่มือ Push ขึ้น Git & สร้างไฟล์ Android APK

โปรเจกต์นี้ถูกตั้งค่าให้รองรับทั้ง **PWA (ติดตั้งลงมือถือจากเบราว์เซอร์)** และ **Native Android APK (ผ่าน Capacitor + Gradle)** เรียบร้อยแล้ว

## 1. วิธี Push ขึ้น GitHub เพื่อสร้างไฟล์ APK อัตโนมัติ (แนะนำ)

```bash
git init
git add .
git commit -m "feat: DevForge Studio x MW Next ready for Android APK"
git branch -M main
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

เมื่อ Push ขึ้น GitHub แล้ว:
1. เปิดแท็บ **Actions** บน GitHub Repository ของคุณ
2. เลือก Workflow ชื่อ **Android APK Build & Release** (`.github/workflows/android-build.yml`)
3. รอสักครู่ แล้วดาวน์โหลดไฟล์ **`DevForge-Studio-debug-apk`** หรือ **`DevForge-Studio-release-apk`** จากส่วน **Artifacts** นำไปติดตั้งบนมือถือ Android ได้ทันที

> **สร้าง Release APK แบบเซ็น Keystore อัตโนมัติ (Optional):**
> เพิ่ม Repository Secrets 4 ตัวใน GitHub Settings > Secrets and variables > Actions:
> - `ANDROID_KEYSTORE_BASE64` (ค่า base64 ของไฟล์ `.jks` / `.keystore`)
> - `ANDROID_KEYSTORE_PASSWORD`
> - `ANDROID_KEY_ALIAS`
> - `ANDROID_KEY_PASSWORD`

## 2. วิธีสร้าง APK บนเครื่อง Local หรือ Termux (Android)

```bash
npm run apk:build
```

สคริปต์ `scripts/build-apk.sh` จะทำการ:
1. Build เว็บแอปล่าสุดลง `dist/` (พร้อม Offline Service Worker & PWA)
2. Sync ไฟล์เข้าสู่โปรเจกต์ `android/` ด้วย Capacitor
3. ติดตั้งไอคอน MW Next และธีมสี Obsidian-Gold
4. ตรวจจับ `aapt2` บน Termux ARM64 อัตโนมัติ (หากรันบน Termux)
5. คอมไพล์ไฟล์ APK ไปไว้ที่ `android/app/build/outputs/apk/debug/app-debug.apk`
