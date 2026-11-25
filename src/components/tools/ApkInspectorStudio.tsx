import React, { useMemo, useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  FileArchive,
  KeyRound,
  Copy,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Terminal,
} from 'lucide-react';
import {
  parseAndroidManifestXml,
  inspectApkZipBuffer,
  normalizeCertFingerprint,
  ApkZipInspection,
} from '../../utils/apkInspector';
import { copyToClipboard } from '../../utils/clipboard';

interface ApkInspectorStudioProps {
  onNotify: (text: string, type?: 'success' | 'info' | 'error') => void;
}

type InspectorTab = 'manifest' | 'apk-binary' | 'cert-hash';

const SECURE_MANIFEST_SAMPLE = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.mwnext.devforgestudio"
    android:versionCode="104"
    android:versionName="1.0.4">

    <uses-sdk android:minSdkVersion="24" android:targetSdkVersion="35" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="false"
        android:debuggable="false"
        android:usesCleartextTraffic="false"
        android:networkSecurityConfig="@xml/network_security_config"
        android:label="DevForge Studio">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTask">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="\${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true" />
    </application>
</manifest>`;

const RISKY_MANIFEST_SAMPLE = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.legacyapp"
    android:versionCode="12"
    android:versionName="1.2">

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="30" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.READ_SMS" />
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />

    <application
        android:allowBackup="true"
        android:debuggable="true"
        android:usesCleartextTraffic="true"
        android:label="Legacy App">

        <activity android:name=".MainActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <service android:name=".BackgroundSyncService" android:exported="true" />
    </application>
</manifest>`;

const SAMPLE_KEYTOOL_OUTPUT = `Certificate fingerprints:
  SHA1: 9A:34:B1:7E:02:8F:C4:11:D5:88:20:F3:A9:44:61:B2:7C:19:E0:3D
  SHA256: 4F:21:8B:9C:10:E4:77:AA:32:5D:89:C1:04:7E:55:B8:93:12:D4:6F:AA:81:09:C3:2B:4E:5A:77:11:90:E2:4B`;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const ApkInspectorStudio: React.FC<ApkInspectorStudioProps> = ({ onNotify }) => {
  const [subTab, setSubTab] = useState<InspectorTab>('manifest');
  const [manifestXml, setManifestXml] = useState(SECURE_MANIFEST_SAMPLE);
  const [apkResult, setApkResult] = useState<ApkZipInspection | null>(null);
  const [apkError, setApkError] = useState<string | null>(null);
  const [isReadingApk, setIsReadingApk] = useState(false);
  const [certInput, setCertInput] = useState(SAMPLE_KEYTOOL_OUTPUT);

  const audit = useMemo(() => parseAndroidManifestXml(manifestXml), [manifestXml]);
  const certResult = useMemo(() => normalizeCertFingerprint(certInput), [certInput]);

  const copyText = async (text: string, label: string) => {
    const ok = await copyToClipboard(text);
    onNotify(ok ? `Copied ${label}` : `Unable to copy ${label}`, ok ? 'success' : 'error');
  };

  const handleManifestFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setManifestXml(text);
      onNotify(`Loaded ${file.name}`);
    } finally {
      input.value = '';
    }
  };

  const handleApkFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    setIsReadingApk(true);
    setApkError(null);
    try {
      const buf = await file.arrayBuffer();
      const parsed = await inspectApkZipBuffer(buf, file.name);
      setApkResult(parsed);
      onNotify(`Inspected ${file.name} (${parsed.totalEntries} entries)`);
    } catch (err) {
      setApkResult(null);
      setApkError(err instanceof Error ? err.message : 'Unable to parse APK archive.');
      onNotify('Failed to inspect APK/AAB archive', 'error');
    } finally {
      setIsReadingApk(false);
      input.value = '';
    }
  };

  return (
    <div className="space-y-5 min-w-0">
      {/* Header & Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-stone-100">
              APK &amp; AndroidManifest Inspector
            </h2>
            <p className="text-xs text-stone-400">
              ตรวจความปลอดภัย AndroidManifest.xml, แกะโครงสร้างไฟล์ .apk/.aab และจัดรูปแบบ SHA-1/SHA-256 สำหรับ Play Console
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-neutral-900 border border-stone-800 overflow-x-auto scrollbar-none shrink-0">
          {[
            { id: 'manifest' as const, label: 'Manifest Audit', icon: ShieldAlert },
            { id: 'apk-binary' as const, label: 'APK / AAB Binary', icon: FileArchive },
            { id: 'cert-hash' as const, label: 'Keystore SHA-1/256', icon: KeyRound },
          ].map((item) => {
            const Icon = item.icon;
            const active = subTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSubTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'text-stone-400 hover:text-stone-100 hover:bg-neutral-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-tab 1: AndroidManifest.xml Security Audit */}
      {subTab === 'manifest' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 min-w-0">
          <div className="space-y-3 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-stone-300">AndroidManifest.xml Input</span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setManifestXml(SECURE_MANIFEST_SAMPLE)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-neutral-900 border border-stone-800 text-emerald-400 hover:border-emerald-500/40 transition-colors"
                >
                  Load Secure Sample
                </button>
                <button
                  onClick={() => setManifestXml(RISKY_MANIFEST_SAMPLE)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-neutral-900 border border-stone-800 text-rose-400 hover:border-rose-500/40 transition-colors"
                >
                  Load Risky Sample
                </button>
                <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload XML</span>
                  <input type="file" accept=".xml,text/xml,application/xml" onChange={handleManifestFile} className="hidden" />
                </label>
              </div>
            </div>

            <textarea
              value={manifestXml}
              onChange={(e) => setManifestXml(e.target.value)}
              spellCheck={false}
              rows={20}
              className="w-full p-3.5 rounded-xl bg-neutral-950 border border-stone-800 font-mono text-xs text-stone-200 leading-relaxed resize-y"
              placeholder="Paste AndroidManifest.xml contents here..."
            />
          </div>

          <div className="space-y-4 min-w-0">
            {!audit.validXml ? (
              <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs text-rose-300">
                {audit.error}
              </div>
            ) : (
              <>
                {/* Score & Metadata Strip */}
                <div className="p-4 rounded-xl bg-neutral-900/80 border border-stone-800 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-stone-400">Manifest Hardening Score</span>
                      <div className="text-lg font-bold font-mono text-stone-100 truncate">
                        {audit.packageName}
                      </div>
                    </div>
                    <div
                      className={`text-2xl font-extrabold font-mono tabular-nums ${
                        audit.score >= 85
                          ? 'text-emerald-400'
                          : audit.score >= 60
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {audit.score}/100
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-stone-800 text-xs">
                    <div>
                      <span className="text-stone-500 block">versionName</span>
                      <span className="font-mono text-stone-200 tabular-nums">{audit.versionName}</span>
                    </div>
                    <div>
                      <span className="text-stone-500 block">versionCode</span>
                      <span className="font-mono text-stone-200 tabular-nums">{audit.versionCode}</span>
                    </div>
                    <div>
                      <span className="text-stone-500 block">minSdk</span>
                      <span className="font-mono text-stone-200 tabular-nums">{audit.minSdk}</span>
                    </div>
                    <div>
                      <span className="text-stone-500 block">targetSdk</span>
                      <span className="font-mono text-stone-200 tabular-nums">{audit.targetSdk}</span>
                    </div>
                  </div>
                </div>

                {/* Security Findings */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Security &amp; Release Findings ({audit.findings.length})
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {audit.findings.map((f, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                          f.severity === 'critical'
                            ? 'bg-rose-950/25 border-rose-500/30 text-rose-200'
                            : f.severity === 'warning'
                            ? 'bg-amber-950/25 border-amber-500/30 text-amber-200'
                            : 'bg-emerald-950/20 border-emerald-500/25 text-emerald-200'
                        }`}
                      >
                        {f.severity === 'critical' ? (
                          <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        ) : f.severity === 'warning' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold">{f.title}</div>
                          <p className="text-stone-300/90 mt-0.5 leading-relaxed">{f.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Permissions Table */}
                <div className="p-4 rounded-xl bg-neutral-900/70 border border-stone-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-stone-200">
                      Declared Permissions ({audit.permissions.length})
                    </span>
                    <span className="font-mono text-stone-400 tabular-nums">
                      Exported components: {audit.exportedComponents.length}
                    </span>
                  </div>
                  {audit.permissions.length === 0 ? (
                    <p className="text-xs text-stone-500">No uses-permission tags declared.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {audit.permissions.map((perm) => (
                        <div
                          key={perm.name}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 rounded-lg bg-neutral-950 border border-stone-800/80 text-xs"
                        >
                          <span className="font-mono font-semibold text-stone-200 break-all">
                            {perm.shortName}
                          </span>
                          <span
                            className={`text-[11px] font-medium ${
                              perm.risk === 'high'
                                ? 'text-rose-400'
                                : perm.risk === 'medium'
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            {perm.risk.toUpperCase()} — {perm.reason}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Sub-tab 2: Binary APK / AAB ZIP Inspector */}
      {subTab === 'apk-binary' && (
        <div className="space-y-4 min-w-0">
          <label className="flex flex-col items-center justify-center gap-2 p-6 sm:p-8 rounded-xl border border-dashed border-amber-500/40 bg-neutral-900/60 hover:bg-neutral-900 cursor-pointer transition-colors text-center">
            <FileArchive className="w-8 h-8 text-amber-400" />
            <div className="text-sm font-semibold text-stone-100">
              {isReadingApk ? 'Inspecting APK archive locally...' : 'Drop or select an .apk / .aab file to inspect locally'}
            </div>
            <p className="text-xs text-stone-400 max-w-lg">
              อ่านโครงสร้าง PKZIP Central Directory, Native ABIs, DEX, ลายเซ็น APK และคำนวณ SHA-256 โดยไม่อัปโหลดไฟล์ออกนอกเครื่อง
            </p>
            <input type="file" accept=".apk,.aab,.zip" onChange={handleApkFile} className="hidden" />
          </label>

          {apkError && (
            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs text-rose-300">
              {apkError}
            </div>
          )}

          {apkResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-neutral-900 border border-stone-800">
                  <span className="text-[11px] text-stone-400 block">Archive</span>
                  <span className="text-xs font-bold font-mono text-stone-100 break-all">{apkResult.fileName}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-neutral-900 border border-stone-800">
                  <span className="text-[11px] text-stone-400 block">Total Size</span>
                  <span className="text-sm font-bold font-mono text-amber-300 tabular-nums">
                    {formatBytes(apkResult.fileSizeBytes)}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-neutral-900 border border-stone-800">
                  <span className="text-[11px] text-stone-400 block">Entries / DEX</span>
                  <span className="text-sm font-bold font-mono text-stone-100 tabular-nums">
                    {apkResult.totalEntries} files · {apkResult.dexFiles.length} DEX
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-neutral-900 border border-stone-800">
                  <span className="text-[11px] text-stone-400 block">Native ABIs</span>
                  <span className="text-xs font-bold font-mono text-emerald-400">
                    {apkResult.nativeAbis.length > 0 ? apkResult.nativeAbis.join(', ') : 'Pure Dalvik/WebView'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-neutral-900/80 border border-stone-800 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-amber-300">APK SHA-256 Checksum</span>
                  <button
                    onClick={() => copyText(apkResult.sha256Hex, 'APK SHA-256')}
                    className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                </div>
                <code className="block p-2.5 rounded-lg bg-neutral-950 border border-stone-800 font-mono text-stone-200 break-all">
                  {apkResult.sha256Hex}
                </code>
                <div className="pt-1 text-stone-300">
                  <strong className="text-stone-100">Signing Detection:</strong> {apkResult.signingSchemeHint}
                </div>
                {apkResult.signatureFiles.length > 0 && (
                  <div className="text-stone-400 font-mono break-all">
                    META-INF entries: {apkResult.signatureFiles.join(', ')}
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl bg-neutral-900/80 border border-stone-800 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300">
                  Largest Archive Entries
                </h3>
                <div className="space-y-1.5">
                  {apkResult.largestEntries.map((entry) => (
                    <div
                      key={entry.path}
                      className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-neutral-950 border border-stone-800/80 text-xs"
                    >
                      <span className="font-mono text-stone-200 truncate">{entry.path}</span>
                      <span className="font-mono text-amber-300 tabular-nums shrink-0">
                        {formatBytes(entry.uncompressedSize)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub-tab 3: Keystore Certificate SHA-1 / SHA-256 Formatter */}
      {subTab === 'cert-hash' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 min-w-0">
          <div className="space-y-3 min-w-0">
            <span className="text-xs font-semibold text-stone-300 block">
              Paste keytool / apksigner / Play Console Certificate Fingerprint
            </span>
            <textarea
              value={certInput}
              onChange={(e) => setCertInput(e.target.value)}
              rows={8}
              spellCheck={false}
              className="w-full p-3.5 rounded-xl bg-neutral-950 border border-stone-800 font-mono text-xs text-stone-200 leading-relaxed"
              placeholder="Paste output from keytool -list -v or apksigner verify --print-certs..."
            />

            <div className="p-4 rounded-xl bg-neutral-900/80 border border-stone-800 space-y-2.5 text-xs">
              <div className="flex items-center gap-2 font-semibold text-amber-300">
                <Terminal className="w-4 h-4" />
                <span>CLI Commands to Extract APK / Keystore Fingerprints</span>
              </div>
              {[
                {
                  label: 'Inspect Keystore (.jks / .keystore)',
                  cmd: 'keytool -list -v -keystore release-key.jks -alias my-key-alias',
                },
                {
                  label: 'Verify Signed APK & Print Certs',
                  cmd: 'apksigner verify --verbose --print-certs app-release.apk',
                },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-stone-400">
                    <span>{item.label}</span>
                    <button
                      onClick={() => copyText(item.cmd, item.label)}
                      className="text-amber-400 hover:text-amber-300 font-semibold"
                    >
                      Copy
                    </button>
                  </div>
                  <pre className="p-2.5 rounded-lg bg-neutral-950 border border-stone-800 font-mono text-[11px] text-stone-200 overflow-x-auto">
                    {item.cmd}
                  </pre>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 min-w-0">
            <span className="text-xs font-semibold text-stone-300 block">
              Normalized Fingerprints (Play Console / Firebase / Google Cloud OAuth)
            </span>
            <div className="space-y-2.5">
              {[
                { label: 'SHA-256 (Play App Signing / AssetLinks Upper)', value: certResult.sha256ColonUpper },
                { label: 'SHA-256 (Firebase / Lowercase)', value: certResult.sha256ColonLower },
                { label: 'SHA-256 (Compact Hex)', value: certResult.sha256Compact },
                { label: 'SHA-1 (Google OAuth / Maps Upper)', value: certResult.sha1ColonUpper },
                { label: 'SHA-1 (Lowercase)', value: certResult.sha1ColonLower },
                { label: 'MD5 (Legacy)', value: certResult.md5ColonUpper },
              ].map((row) => (
                <div
                  key={row.label}
                  className="p-3 rounded-xl bg-neutral-900/80 border border-stone-800 space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-400">{row.label}</span>
                    {row.value && (
                      <button
                        onClick={() => copyText(row.value!, row.label)}
                        className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </button>
                    )}
                  </div>
                  <div className="font-mono text-xs text-stone-100 break-all">
                    {row.value || <span className="text-stone-600">Not detected in input</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
