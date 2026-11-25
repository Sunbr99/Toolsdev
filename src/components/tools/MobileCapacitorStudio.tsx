import React, { useState } from 'react';
import { Smartphone, AlertTriangle, CheckCircle2, Copy, Check, Terminal, ShieldAlert, FileCode, Wrench, ExternalLink } from 'lucide-react';
import { copyToClipboard } from '../../utils/clipboard';

interface MobileCapacitorStudioProps {
  onNotify: (msg: string) => void;
}

interface KnownError {
  id: string;
  name: string;
  symptom: string;
  cause: string;
  solution: {
    steps: string[];
    commands?: string[];
  };
}

const KNOWN_ERRORS: KnownError[] = [
  {
    id: 'aapt2-error',
    name: 'AAPT2 error / Resource compilation failed',
    symptom: 'AAPT2 aapt2-8.x.x-daemon: Daemon startup failed / unexpected exit or Android resource compilation failed',
    cause: 'มักเกิดจาก (1) ไฟล์รูปภาพใน res/drawable หรือไอคอนมีชื่อตัวพิมพ์ใหญ่หรือมีอักขระพิเศษ (Android รับเฉพาะ a-z0-9_), (2) ขาด Visual C++ Redistributable บน Windows หรือ (3) Gradle deamon มีแคชเน่า',
    solution: {
      steps: [
        'ตรวจสอบโฟลเดอร์ android/app/src/main/res/drawable ทุกไฟล์ ต้องเป็นตัวพิมพ์เล็กทั้งหมด เช่น logo_splash.png (ห้ามใช้ Logo_Splash.png หรือมีช่องว่าง)',
        'ล้างแคช Gradle ให้หมดแล้วให้ดาวน์โหลด AAPT2 ใหม่',
        'สำหรับ Windows: ต้องลง Visual C++ 2015-2022 Redistributable (x64) จาก Microsoft เพราะ AAPT2 เป็น C++ binary',
        'ถ้ายังติด ให้สั่งปิด daemon ชั่วคราวใน gradle.properties',
      ],
      commands: [
        '# ในโฟลเดอร์ android ให้สั่งล้างแคช\n./gradlew clean --refresh-dependencies',
        '# หรือสั่ง build แบบแสดง stacktrace ละเอียดเพื่อดูชื่อไฟล์ที่พัง\n./gradlew assembleDebug --stacktrace --info',
        '# เพิ่มบรรทัดนี้ใน android/gradle.properties ถ้า aapt2 daemon แคชเน่าบ่อย:\n# org.gradle.jvmargs=-Xmx2048m -XX:MaxPermSize=512m\n# android.enableAapt2=true',
      ],
    },
  },
  {
    id: 'android-jar-missing',
    name: 'Could not find android.jar for API level XX',
    symptom: 'Failed to find Platform SDK with path: platforms;android-34 หรือ Could not find android.jar',
    cause: 'Android Studio ยังไม่ได้ติดตั้ง Android SDK Platform ที่ตรงกับ compileSdkVersion ในไฟล์ variables.gradle หรือ ANDROID_HOME ชี้ไปผิดโฟลเดอร์',
    solution: {
      steps: [
        'เปิด Android Studio -> Settings (หรือ Preferences บน Mac) -> Appearance & Behavior -> System Settings -> Android SDK',
        'ในแท็บ "SDK Platforms" ให้ติ๊กเลือกเวอร์ชันที่โปรเจกต์ต้องการ (เช่น Android 14.0 - API 34 หรือ API 35) แล้วกด Apply เพื่อดาวน์โหลด',
        'ในแท็บ "SDK Tools" ให้ติ๊ก: Android SDK Build-Tools, Android SDK Command-line Tools, Android Emulator',
        'ตั้งตัวแปร Environment Variable ANDROID_HOME ให้ตรงกับที่อยู่ของ SDK ในเครื่อง',
      ],
      commands: [
        '# สำหรับ macOS / Linux (ใส่ใน ~/.zshrc หรือ ~/.bashrc):\nexport ANDROID_HOME=$HOME/Library/Android/sdk\nexport PATH=$PATH:$ANDROID_HOME/emulator\nexport PATH=$PATH:$ANDROID_HOME/platform-tools',
        '# สำหรับ Windows (PowerShell):\n# $env:ANDROID_HOME = "$env:LOCALAPPDATA\\Android\\Sdk"\n# [Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LOCALAPPDATA\\Android\\Sdk", "User")',
      ],
    },
  },
  {
    id: 'java-home-mismatch',
    name: 'JAVA_HOME is not set / Incompatible Java version',
    symptom: 'ERROR: JAVA_HOME is not set หรือ class file has wrong version 61.0, should be 55.0 / Unsupported class file major version',
    cause: 'Gradle เวอร์ชันใหม่ (Gradle 8+) บังคับใช้ Java 17 หรือ Java 21 แต่ในเครื่องอาจยังเป็น Java 8/11 หรือไม่ได้ตั้งค่า JAVA_HOME',
    solution: {
      steps: [
        'Capacitor 5 และ 6 บังคับใช้ Java 17 เป็นมาตรฐาน (อย่าใช้ Java 8)',
        'ถ้าติดตั้ง Android Studio ไว้อยู่แล้ว ให้ใช้ Java (jbr) ที่แถมมากับ Android Studio ได้เลย ไม่ต้องลงแยก',
        'ตรวจสอบเวอร์ชันด้วยคำสั่ง java -version ต้องขึ้นเวอร์ชัน 17.x หรือ 21.x',
      ],
      commands: [
        '# ชี้ JAVA_HOME ไปยัง JBR ของ Android Studio (macOS):\nexport JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"',
        '# ชี้ JAVA_HOME บน Windows (cmd / PowerShell):\n# set JAVA_HOME=C:\\Program Files\\Android\\Android Studio\\jbr',
      ],
    },
  },
  {
    id: 'sdk-licenses',
    name: 'Failed to install Android SDK packages / Licences not accepted',
    symptom: 'Failed to install the following Android SDK packages as some licences have not been accepted.',
    cause: 'ยังไม่ได้กดกดยอมรับ License ข้อตกลงสิทธิ์การใช้งานของ Google Android SDK',
    solution: {
      steps: [
        'เปิด Terminal แล้วสั่งรัน sdkmanager --licenses จากนั้นกด y ทุกข้อที่ระบบถาม',
        'หรือเปิดโปรเจกต์ android ใน Android Studio แล้วคลิก "Accept License" ในหน้าต่าง Build Log',
      ],
      commands: [
        '# รันคำสั่งนี้เพื่อตอบรับ License ทั้งหมด:\nyes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses',
        '# บน Windows:\n%ANDROID_HOME%\\cmdline-tools\\latest\\bin\\sdkmanager.bat --licenses',
      ],
    },
  },
  {
    id: 'capacitor-sync-flow',
    name: 'Capacitor: Unable to find assets / Index.html not updated',
    symptom: 'หน้าจอแอปขึ้นจอขาว หรือแก้โค้ด Web แล้วในมือถือไม่เปลี่ยนตาม หรือเว็บขึ้น Error ใน Logcat',
    cause: 'ลืมสั่งรัน Build เว็บ (เช่น npm run build) ก่อนที่จะสั่ง npx cap sync',
    solution: {
      steps: [
        'Capacitor ทำงานโดยการดึงไฟล์ที่ Build แล้ว (dist หรือ build) ไปไว้ในโฟลเดอร์ android/app/src/main/assets/public',
        'ถ้าแก้โค้ดเว็บ ต้องรัน npm run build ก่อนเสมอ แล้วค่อยตามด้วย npx cap sync',
        'ตรวจสอบ capacitor.config.ts ว่า webDir ชี้ไปที่ "dist" หรือ "build" ให้ตรงกับ Vite/React',
      ],
      commands: [
        '# ลำดับคำสั่งที่ถูกต้องเสมอสำหรับ Capacitor:\nnpm run build\nnpx cap sync android\nnpx cap open android',
      ],
    },
  },
  {
    id: 'termux-android-aapt2',
    name: 'Termux (Android ARM64): AAPT2 Exec format error / SDK Path',
    symptom: 'AAPT2 daemon failed: Exec format error หรือ AAPT2 not found ใน Termux บนชิป ARM64 หรือ Gradle หา SDK ไม่เจอ',
    cause: 'Google SDK ค่าเริ่มต้นดาวน์โหลดไฟล์ AAPT2 และ Build-tools มาเป็นสถาปัตยกรรม x86_64 (สำหรับ PC/Mac) เมื่อรันบน Termux (ARM64 Android Bionic) เครื่องจึงรันไบนารี x86 ไม่ได้',
    solution: {
      steps: [
        'โฟลเดอร์ SDK ตัวจริงใน Termux คือ ANDROID_HOME="$HOME/Android/Sdk" (มี build-tools, platform-tools, platforms ครบ)',
        'ติดตั้งชุด aapt และ aapt2 ที่เป็น Native ARM64 ใน Termux ผ่าน pkg install aapt -y',
        'ทดสอบพิมพ์ aapt2 version เพื่อเช็คว่าระบบเรียกคำสั่งคอมไพล์รีซอร์สได้ปกติ',
        'ในโปรเจกต์ Android ให้เพิ่ม android.aapt2FromMaven=false ใน gradle.properties เพื่อให้ Gradle เรียก aapt2 ประจำเครื่อง',
      ],
      commands: [
        '# 1. ติดตั้ง AAPT Native ARM64 ใน Termux\npkg install aapt -y',
        '# 2. ทดสอบเรียก aapt2\naapt2 version',
        '# 3. ตรวจสอบเวอร์ชัน build-tools ที่มี\nls ~/Android/Sdk/build-tools',
      ],
    },
  },
];

const SCAM_PERMISSIONS_DATABASE = [
  {
    permission: 'android.permission.SYSTEM_ALERT_WINDOW',
    thaiName: 'สิทธิ์วาดทับหน้าจอ (Draw over other apps)',
    riskLevel: 'CRITICAL',
    scamTactic: 'มิจฉาชีพใช้สิทธิ์นี้เพื่อวาด UI ปลอม (เช่น หน้าจอโหลดข้อมูลปลอม หรือป๊อปอัปให้กดรหัส) ทับแอปธนาคารหรือหน้าจอจริงของเครื่อง ทำให้ผู้ใช้คิดว่าเครื่องค้าง แต่ความจริงกำลังแอบกดโอนเงินอยู่ข้างหลัง',
    legitimateUse: 'แอปอย่าง Facebook Messenger (แชทเฮดกลมๆ ลอยบนจอ), หรือ Truecaller ที่แสดงชื่อคนโทรเข้า',
    detection: 'แอปธนาคารปัจจุบันจะปฏิเสธการเปิดใช้งานทันทีหากตรวจพบว่ามีการเปิดสิทธิ์ Display Over Other Apps ค้างไว้',
  },
  {
    permission: 'android.permission.BIND_ACCESSIBILITY_SERVICE',
    thaiName: 'บริการช่วยเหลือการเข้าถึงพิเศษ (Accessibility Service)',
    riskLevel: 'CRITICAL',
    scamTactic: 'จุดตายอันดับ 1 ของแอปดูดเงิน! มิจฉาชีพหลอกให้ผู้ใช้เปิด Accessibility Service ใน Settings (เช่น หลอกว่าเป็นแอปอัปเดตกรมที่ดิน, การไฟฟ้า, กรมสรรพากร) เมื่อเปิดแล้ว แอปโจรจะสามารถ "อ่านข้อความทุกตัวบนหน้าจอ รวมถึงรหัส OTP และกดปุ่มแทนผู้ใช้ได้แบบสมบูรณ์"',
    legitimateUse: 'สำหรับผู้พิการทางสายตา (Screen Reader เช่น TalkBack) หรือแอปสลับหน้าจอสำหรับผู้สูงอายุ',
    detection: 'ผู้พัฒนาแอปทั่วไปไม่มีความจำเป็นต้องขอสิทธิ์นี้เด็ดขาด หากแอปทั่วไปหรือแอปราชการขอสิทธิ์นี้ ให้สงสัยไว้ก่อนว่าเป็นแอปมิจฉาชีพ 100%',
  },
  {
    permission: 'android.permission.READ_SMS',
    thaiName: 'สิทธิ์อ่านข้อความ SMS',
    riskLevel: 'HIGH',
    scamTactic: 'แอบอ่านรหัส OTP ยืนยันธุรกรรมจากธนาคาร เมื่อได้รหัสผ่านไปแล้วก็จะยืนยันการโอนเงินได้เองทันที',
    legitimateUse: 'แอปส่งข้อความเริ่มต้น (Default SMS App) ของเครื่อง',
    detection: 'Google Play Store ห้ามแอปทั่วไปขอสิทธิ์นี้แล้ว ยกเว้นใช้ SMS Retriever API ที่อ่านได้เฉพาะ OTP ของแอปตัวเองเท่านั้น',
  },
  {
    permission: 'android.permission.REQUEST_INSTALL_PACKAGES',
    thaiName: 'สิทธิ์ติดตั้งไฟล์ APK จากภายนอก',
    riskLevel: 'HIGH',
    scamTactic: 'ใช้ดาวน์โหลดไฟล์ APK โจรตัวอื่นมาลงทับในเครื่องต่อแบบเงียบๆ (Dropper Malware)',
    legitimateUse: 'แอป App Store ทางเลือกหรือ Web Browser',
    detection: 'ไม่ควรอนุญาตให้แอปที่โหลดมาจาก Line หรือลิงก์แปลกๆ ได้สิทธิ์นี้',
  },
];

export const MobileCapacitorStudio: React.FC<MobileCapacitorStudioProps> = ({ onNotify }) => {
  const [activeSubTab, setActiveSubTab] = useState<'troubleshoot' | 'scam-permissions' | 'gradle-helper'>('troubleshoot');
  const [selectedError, setSelectedError] = useState<KnownError>(KNOWN_ERRORS[0]);
  const [customErrorSearch, setCustomErrorSearch] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  // Gradle helper generator
  const [targetSdk, setTargetSdk] = useState(34);
  const [javaVersion, setJavaVersion] = useState(17);

  const handleCopy = (text: string, id: string) => {
    void copyToClipboard(text);
    setCopiedIndex(id);
    onNotify('คัดลอกคำสั่งลงคลิปบอร์ดแล้ว');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const filteredErrors = KNOWN_ERRORS.filter(
    (e) =>
      e.name.toLowerCase().includes(customErrorSearch.toLowerCase()) ||
      e.symptom.toLowerCase().includes(customErrorSearch.toLowerCase()) ||
      e.cause.toLowerCase().includes(customErrorSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold tracking-tight text-slate-100">
              Mobile & Capacitor Hub (แก้ปัญหา Build & วิเคราะห์สิทธิ์อันตราย)
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            แก้ปัญหาคลาสสิก Android SDK, Gradle, AAPT2, Java และศึกษาสิทธิ์ระบบที่มิจฉาชีพใช้หลอกควบคุมหน้าจอ
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-lg border border-stone-800 shrink-0">
          <button
            onClick={() => setActiveSubTab('troubleshoot')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeSubTab === 'troubleshoot' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            แก้ Error Build & Gradle
          </button>
          <button
            onClick={() => setActiveSubTab('scam-permissions')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeSubTab === 'scam-permissions' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            วิเคราะห์สิทธิ์แอปโจร (Overlay / Hack)
          </button>
          <button
            onClick={() => setActiveSubTab('gradle-helper')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeSubTab === 'gradle-helper' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Template ตัวแปร build.gradle
          </button>
        </div>
      </div>

      {/* Tab 1: Build & Gradle Troubleshooter */}
      {activeSubTab === 'troubleshoot' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left: Error List Picker */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              เลือกปัญหาที่พบบ่อย (Common Build Errors)
            </span>
            <input
              type="text"
              placeholder="ค้นหาข้อความ Error (เช่น aapt2, jar, java)..."
              value={customErrorSearch}
              onChange={(e) => setCustomErrorSearch(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-950 border border-stone-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
            />
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredErrors.map((err) => {
                const isSelected = selectedError.id === err.id;
                return (
                  <button
                    key={err.id}
                    onClick={() => setSelectedError(err)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-500/60 text-slate-100 shadow-sm'
                        : 'bg-neutral-900 border-stone-800/80 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-semibold text-xs text-slate-200">{err.name}</div>
                    <div className="text-[11px] text-slate-500 truncate mt-1 font-mono">{err.symptom}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Detailed Solution & Actionable Commands */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl bg-neutral-900 border border-stone-800 p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider">
                    Error Diagnosis
                  </span>
                  <h3 className="text-base font-bold text-slate-100 mt-1">{selectedError.name}</h3>
                </div>
                <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>

              {/* Symptom Code */}
              <div className="p-3 rounded-lg bg-neutral-950 border border-stone-800 text-xs font-mono text-rose-300">
                {selectedError.symptom}
              </div>

              {/* Cause Explanation */}
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">สาเหตุที่แท้จริง:</span>
                <p className="text-xs text-slate-300 leading-relaxed bg-neutral-950/60 p-3 rounded-lg border border-stone-800/60">
                  {selectedError.cause}
                </p>
              </div>

              {/* Step-by-Step Fix */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  ขั้นตอนการแก้ไข (Step-by-Step Fix):
                </span>
                <ul className="space-y-2">
                  {selectedError.solution.steps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-200">
                      <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-800/60 text-emerald-400 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Shell Commands to Run */}
              {selectedError.solution.commands && selectedError.solution.commands.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-stone-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      คำสั่ง Terminal ที่สั่งรันได้ทันที:
                    </span>
                  </div>
                  {selectedError.solution.commands.map((cmd, i) => (
                    <div key={i} className="relative group">
                      <pre className="p-3 rounded-lg bg-neutral-950 border border-stone-800 text-xs font-mono text-amber-300 overflow-x-auto leading-relaxed">
                        <code>{cmd}</code>
                      </pre>
                      <button
                        onClick={() => handleCopy(cmd, `cmd-${i}`)}
                        className="absolute right-2.5 top-2.5 p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 shadow"
                        title="Copy commands"
                      >
                        {copiedIndex === `cmd-${i}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Scam Permissions & Fraud Technique Inspector */}
      {activeSubTab === 'scam-permissions' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-900/60 space-y-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <h3 className="text-sm font-bold text-rose-200">
                เจาะลึก: มิจฉาชีพใช้สิทธิ์ระบบ Android ตัวไหนในการ "วาดทับหน้าจอ" และ "ดูดเงิน"?
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              ที่ผู้คนโดนหลอกกันบ่อยๆ ในข่าว ไม่ใช่เพราะแฮกเกอร์มีเวทมนตร์ แต่เพราะมิจฉาชีพหลอกให้ผู้ใช้เปิดสิทธิ์ 2 ตัวหลักในระบบ Android
              คือ <strong>Accessibility Service</strong> (อ่านหน้าจอและกดแทน) และ <strong>System Alert Window</strong> (วาดหน้าต่างทับหน้าจอจริง)
              การที่คุณกำลังเรียนรู้ System, API, และ Network คือกุญแจสำคัญที่จะช่วยหยุดยั้งขบวนการเหล่านี้ได้จริง!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SCAM_PERMISSIONS_DATABASE.map((item) => (
              <div
                key={item.permission}
                className="p-5 rounded-xl bg-neutral-900 border border-stone-800 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-rose-400 break-all">{item.permission}</span>
                    <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800">
                      {item.riskLevel}
                    </span>
                  </div>

                  <div className="text-sm font-bold text-slate-100">{item.thaiName}</div>

                  <div className="space-y-1 text-xs">
                    <div className="text-slate-300 bg-neutral-950 p-2.5 rounded-lg border border-stone-800/60 leading-relaxed">
                      <strong className="text-rose-400 block mb-1">กลโกงที่มิจฉาชีพใช้จริง:</strong>
                      {item.scamTactic}
                    </div>

                    <div className="text-slate-400 pt-1">
                      <strong className="text-slate-300">การใช้งานที่ถูกต้อง (ถูกกฎหมาย): </strong>
                      {item.legitimateUse}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-800 text-[11px] text-emerald-400/90 font-mono">
                  ✓ การป้องกัน: {item.detection}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Gradle Helper */}
      {activeSubTab === 'gradle-helper' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-neutral-900 border border-stone-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-100">
              ตัวสร้างค่า Config มาตรฐานสำหรับ Capacitor Android (variables.gradle)
            </h3>
            <p className="text-xs text-slate-400">
              ปัญหาหลักของ Capacitor ที่ build ไม่ผ่านมักเกิดจาก compileSdkVersion กับ Java Version ไม่สอดคล้องกัน
            </p>

            <div className="flex flex-wrap items-center gap-6 pt-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-300 font-semibold">Target SDK:</span>
                {[33, 34, 35].map((sdk) => (
                  <button
                    key={sdk}
                    onClick={() => setTargetSdk(sdk)}
                    className={`px-3 py-1 rounded text-xs font-mono font-bold ${
                      targetSdk === sdk ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-950 text-slate-400'
                    }`}
                  >
                    API {sdk} (Android {sdk === 33 ? '13' : sdk === 34 ? '14' : '15'})
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-300 font-semibold">Java JDK:</span>
                {[17, 21].map((j) => (
                  <button
                    key={j}
                    onClick={() => setJavaVersion(j)}
                    className={`px-3 py-1 rounded text-xs font-mono font-bold ${
                      javaVersion === j ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-950 text-slate-400'
                    }`}
                  >
                    Java {j} (LTS)
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>ไฟล์ android/variables.gradle ที่แนะนำ:</span>
                <button
                  onClick={() =>
                    handleCopy(
                      `ext {\n  minSdkVersion = 22\n  compileSdkVersion = ${targetSdk}\n  targetSdkVersion = ${targetSdk}\n  androidxActivityVersion = '1.8.0'\n  androidxAppCompatVersion = '1.6.1'\n  androidxCoordinatorLayoutVersion = '1.2.0'\n  androidxCoreVersion = '1.12.0'\n  androidxFragmentVersion = '1.6.2'\n  junitVersion = '4.13.2'\n  androidxJunitVersion = '1.1.5'\n  androidxEspressoCoreVersion = '3.5.1'\n  cordovaAndroidVersion = '10.1.1'\n}`,
                      'variables-gradle'
                    )
                  }
                  className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>คัดลอก variables.gradle</span>
                </button>
              </div>

              <pre className="p-4 rounded-lg bg-neutral-950 border border-stone-800 text-xs font-mono text-amber-200 leading-relaxed overflow-x-auto">
                <code>{`ext {
  minSdkVersion = 22
  compileSdkVersion = ${targetSdk}
  targetSdkVersion = ${targetSdk}
  androidxActivityVersion = '1.8.0'
  androidxAppCompatVersion = '1.6.1'
  androidxCoordinatorLayoutVersion = '1.2.0'
  androidxCoreVersion = '1.12.0'
  androidxFragmentVersion = '1.6.2'
  junitVersion = '4.13.2'
  androidxJunitVersion = '1.1.5'
  androidxEspressoCoreVersion = '3.5.1'
  cordovaAndroidVersion = '10.1.1'
}`}</code>
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
