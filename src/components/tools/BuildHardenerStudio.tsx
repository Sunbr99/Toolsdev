import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ShieldCheck,
  CheckSquare,
  Square,
  Copy,
  Check,
  Upload,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  FileCode,
  Terminal,
  Lock,
} from 'lucide-react';
import { analyzeProguardRules, ProguardSeverity } from '../../utils/proguardAnalyzer';
import { copyToClipboard } from '../../utils/clipboard';

interface BuildHardenerStudioProps {
  onNotify: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

type ChecklistCategory = 'signing' | 'stripping' | 'r8' | 'manifest';

interface HardeningItem {
  id: string;
  category: ChecklistCategory;
  categoryLabel: string;
  title: string;
  detail: string;
  verifyCommand: string;
  snippet?: string;
}

const HARDENING_CHECKLIST: HardeningItem[] = [
  {
    id: 'sign-dedicated-key',
    category: 'signing',
    categoryLabel: 'APK Signing',
    title: 'Use a dedicated 4096-bit release or Play Upload keystore (never debug.keystore)',
    detail:
      'Generate a private RSA 4096 or EC P-256 keystore stored in Termux $HOME (~/.keystore) with chmod 600. Keep it off /sdcard and out of Git.',
    verifyCommand: 'keytool -list -v -keystore ~/.keystore/release-upload.jks',
  },
  {
    id: 'sign-align-v2-v3',
    category: 'signing',
    categoryLabel: 'APK Signing',
    title: 'Run zipalign before apksigner and enforce APK Signature Scheme v2/v3',
    detail:
      'Legacy v1 JAR signing alone is vulnerable to Janus-style byte appending. Align with zipalign -p 4 first, then sign with apksigner so v2 and v3 signatures protect the entire APK archive.',
    verifyCommand: 'apksigner verify --verbose --print-certs app-release-signed.apk',
    snippet:
      'zipalign -v -p 4 app-release-unsigned.apk app-aligned.apk\napksigner sign --ks ~/.keystore/release-upload.jks --v2-signing-enabled true --v3-signing-enabled true --out app-release-signed.apk app-aligned.apk',
  },
  {
    id: 'sign-external-props',
    category: 'signing',
    categoryLabel: 'APK Signing',
    title: 'Load keystore credentials from untracked chmod 600 properties file',
    detail:
      'Keep storePassword and keyPassword out of build.gradle and CLI flags so they cannot leak into Git commits, shell history, or process arguments.',
    verifyCommand: 'chmod 600 android/keystore.properties && git check-ignore android/keystore.properties',
  },
  {
    id: 'strip-debuggable-false',
    category: 'stripping',
    categoryLabel: 'Debug Stripping',
    title: 'Confirm android:debuggable="false" and jniDebuggable false on release',
    detail:
      'A debuggable APK allows any local user or attacker via ADB to attach JDWP debuggers, inspect memory, and extract private app data using run-as.',
    verifyCommand: 'aapt dump badging app-release-signed.apk | grep -i debuggable || echo "OK: not debuggable"',
  },
  {
    id: 'strip-native-symbols',
    category: 'stripping',
    categoryLabel: 'Debug Stripping',
    title: 'Strip native C/C++ (.so) debug symbols from shipped APK',
    detail:
      'Set ndk { debugSymbolLevel "NONE" } (or upload a separate native symbol bundle to Play Console) so DWARF symbols and function names are stripped from lib/*.so.',
    verifyCommand: 'unzip -p app-release-signed.apk lib/arm64-v8a/*.so > /tmp/check.so && readelf -S /tmp/check.so | grep debug',
  },
  {
    id: 'strip-logcat-calls',
    category: 'stripping',
    categoryLabel: 'Debug Stripping',
    title: 'Strip Log.v / Log.d / Log.i calls at compile time with R8',
    detail:
      'Use -assumenosideeffects class android.util.Log in proguard-rules.pro so debug statements and diagnostic payloads are eliminated from release classes.dex.',
    verifyCommand: 'grep -n "assumenosideeffects" android/app/proguard-rules.pro',
  },
  {
    id: 'r8-minify-shrink',
    category: 'r8',
    categoryLabel: 'ProGuard / R8',
    title: 'Enable minifyEnabled true, shrinkResources true, and proguard-android-optimize.txt',
    detail:
      'Activates R8 shrinking, dead-code elimination, and identifier obfuscation while using the optimizing default rule set rather than legacy non-optimizing rules.',
    verifyCommand: 'grep -E "minifyEnabled|shrinkResources|proguard-android-optimize" android/app/build.gradle',
  },
  {
    id: 'r8-repackage-source',
    category: 'r8',
    categoryLabel: 'ProGuard / R8',
    title: 'Flatten package hierarchy and mask SourceFile attributes',
    detail:
      'Add -repackageclasses, -allowaccessmodification, and -renamesourcefileattribute SourceFile so attackers cannot reconstruct original package boundaries or source file paths.',
    verifyCommand: 'ls -lh android/app/build/outputs/mapping/release/mapping.txt',
  },
  {
    id: 'r8-no-broad-keeps',
    category: 'r8',
    categoryLabel: 'ProGuard / R8',
    title: 'Audit proguard-rules.pro for -dontobfuscate and wildcard -keep class ** rules',
    detail:
      'Broad wildcards undo obfuscation across your business logic. Keep only reflection entry points, Capacitor plugins, and serialized models.',
    verifyCommand: 'grep -nE "dontobfuscate|dontshrink|\\*\\*" android/app/proguard-rules.pro',
  },
  {
    id: 'manifest-cleartext-backup',
    category: 'manifest',
    categoryLabel: 'Manifest & Runtime',
    title: 'Set usesCleartextTraffic="false" and allowBackup="false"',
    detail:
      'Blocks unencrypted HTTP connections and prevents ADB backup or unauthorized device extraction of local SQLite/SharedPreferences tokens.',
    verifyCommand: 'aapt dump xmltree app-release-signed.apk AndroidManifest.xml | grep -E "usesCleartextTraffic|allowBackup"',
  },
  {
    id: 'manifest-tapjacking-secure',
    category: 'manifest',
    categoryLabel: 'Manifest & Runtime',
    title: 'Apply FLAG_SECURE and filterTouchesWhenObscured on sensitive views',
    detail:
      'Prevents screen capture/recording of sensitive screens and blocks touch events when another app draws an overlay window over your UI.',
    verifyCommand: 'grep -rnE "FLAG_SECURE|filterTouchesWhenObscured|setHideOverlayWindows" android/app/src/',
  },
  {
    id: 'manifest-exported-false',
    category: 'manifest',
    categoryLabel: 'Manifest & Runtime',
    title: 'Explicitly set android:exported="false" on internal components',
    detail:
      'Ensures internal Activities, Services, BroadcastReceivers, and ContentProviders cannot be invoked directly by third-party apps via malicious Intents.',
    verifyCommand: 'aapt dump xmltree app-release-signed.apk AndroidManifest.xml | grep -B1 -A2 "exported"',
  },
];

const SAMPLE_WEAK_PROGUARD = `# Weak / Misconfigured ProGuard Rules
-dontobfuscate
-dontoptimize
-ignorewarnings

# Exposes the entire codebase to decompilers
-keep class ** { *; }

-keepattributes SourceFile,LineNumberTable`;

const SAMPLE_HARDENED_PROGUARD = `# Hardened Release R8 / ProGuard Configuration
-allowaccessmodification
-repackageclasses 'o'
-renamesourcefileattribute SourceFile
-keepattributes Signature,*Annotation*,LineNumberTable

# Strip debug & verbose logs from release DEX
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    public static int i(...);
}

# Keep Capacitor bridge & registered plugins only
-keep public class * extends com.getcapacitor.Plugin
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod <methods>;
}
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}`;

const SEVERITY_STYLE: Record<ProguardSeverity, { label: string; color: string }> = {
  critical: { label: 'CRITICAL', color: 'text-rose-400' },
  high: { label: 'HIGH', color: 'text-amber-400' },
  medium: { label: 'MEDIUM', color: 'text-sky-400' },
  good: { label: 'VERIFIED', color: 'text-emerald-400' },
};

const STORAGE_KEY = 'devforge_build_hardener_checks_v1';

export const BuildHardenerStudio: React.FC<BuildHardenerStudioProps> = ({ onNotify }) => {
  const [activeTab, setActiveTab] = useState<'checklist' | 'proguard' | 'generator'>('checklist');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ChecklistCategory>('all');
  const [checkedIds, setCheckedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ProGuard validator state
  const [proguardInput, setProguardInput] = useState(SAMPLE_WEAK_PROGUARD);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Config generator toggles
  const [includeCapacitorKeeps, setIncludeCapacitorKeeps] = useState(true);
  const [stripLogs, setStripLogs] = useState(true);
  const [stripNativeSymbols, setStripNativeSymbols] = useState(true);
  const [enforceRepackaging, setEnforceRepackaging] = useState(true);
  const [hardenManifestAttrs, setHardenManifestAttrs] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checkedIds));
    } catch {
      // Ignore storage quota errors
    }
  }, [checkedIds]);

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const resetChecklist = () => {
    setCheckedIds([]);
    onNotify('Checklist reset', 'info');
  };

  const handleCopy = (text: string, id: string, label: string) => {
    void copyToClipboard(text);
    setCopiedId(id);
    onNotify(`Copied ${label}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleProguardUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      setProguardInput(text);
      onNotify(`Loaded ${file.name}`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filteredChecklist = useMemo(() => {
    if (categoryFilter === 'all') return HARDENING_CHECKLIST;
    return HARDENING_CHECKLIST.filter((item) => item.category === categoryFilter);
  }, [categoryFilter]);

  const completionPct = Math.round((checkedIds.length / HARDENING_CHECKLIST.length) * 100);
  const proguardAudit = useMemo(() => analyzeProguardRules(proguardInput), [proguardInput]);

  const generatedBuildGradle = useMemo(() => {
    return `android {
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            debuggable false
            jniDebuggable false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.release${
              stripNativeSymbols
                ? `
            ndk {
                debugSymbolLevel 'NONE'
            }`
                : ''
            }
        }
    }${
      hardenManifestAttrs
        ? `
    packaging {
        resources {
            excludes += ['/META-INF/{AL2.0,LGPL2.1}', 'META-INF/versions/**']
        }
    }`
        : ''
    }
}`;
  }, [stripNativeSymbols, hardenManifestAttrs]);

  const generatedProguardRules = useMemo(() => {
    const sections: string[] = [
      '# Generated Hardened R8 / ProGuard Configuration',
      '-keepattributes Signature,*Annotation*,LineNumberTable',
    ];
    if (enforceRepackaging) {
      sections.push("-allowaccessmodification\n-repackageclasses 'o'\n-renamesourcefileattribute SourceFile");
    }
    if (stripLogs) {
      sections.push(`# Remove debug & verbose logs from release classes.dex
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    public static int i(...);
}`);
    }
    if (includeCapacitorKeeps) {
      sections.push(`# Capacitor Bridge & Annotated Entry Points
-keep public class * extends com.getcapacitor.Plugin
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod <methods>;
}
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}`);
    }
    sections.push(`# AndroidX @Keep annotation support
-keep @androidx.annotation.Keep class * { *; }
-keepclassmembers class * {
    @androidx.annotation.Keep <fields>;
    @androidx.annotation.Keep <methods>;
}`);
    return sections.join('\n\n');
  }, [enforceRepackaging, stripLogs, includeCapacitorKeeps]);

  const generatedVerifyCommands = `# 1. Align and sign release APK with v2/v3 signatures
zipalign -v -p 4 app/build/outputs/apk/release/app-release-unsigned.apk app-aligned.apk
apksigner sign --ks ~/.keystore/release-upload.jks --v2-signing-enabled true --v3-signing-enabled true --out app-release-signed.apk app-aligned.apk

# 2. Verify APK signature schemes & signer certificate SHA-256
apksigner verify --verbose --print-certs app-release-signed.apk

# 3. Verify release binary is NOT debuggable and blocks cleartext & backup
aapt dump badging app-release-signed.apk | grep -i debuggable || echo "PASS: debuggable disabled"
aapt dump xmltree app-release-signed.apk AndroidManifest.xml | grep -E "allowBackup|usesCleartextTraffic"`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold tracking-tight text-slate-100">
              Android Build Hardener
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Pre-release security checklist for APK v2/v3 signing, debug symbol stripping, Manifest hardening, and live ProGuard/R8 rules validation.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-lg border border-stone-800 shrink-0">
          <button
            onClick={() => setActiveTab('checklist')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'checklist' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Hardening Checklist
          </button>
          <button
            onClick={() => setActiveTab('proguard')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'proguard' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ProGuard / R8 Validator
          </button>
          <button
            onClick={() => setActiveTab('generator')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'generator' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Hardened Config Builder
          </button>
        </div>
      </div>

      {/* Tab 1: Release Hardening Checklist */}
      {activeTab === 'checklist' && (
        <div className="space-y-6">
          <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-sm font-bold text-slate-100">
                  Release APK Hardening Readiness
                </div>
                <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 font-mono tabular-nums">
                  <span>
                    {checkedIds.length} / {HARDENING_CHECKLIST.length} checks completed ({completionPct}%)
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Saved locally in browser</span>
                </div>
              </div>

              <button
                onClick={resetChecklist}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Checklist</span>
              </button>
            </div>

            <div className="w-full h-2 rounded-full bg-neutral-950 border border-stone-800 overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${completionPct}%` }}
              />
            </div>

            {/* Category Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1 p-1 bg-neutral-950 rounded-lg border border-stone-800 w-fit">
              {(
                [
                  ['all', 'All Checks'],
                  ['signing', 'APK Signing'],
                  ['stripping', 'Debug Stripping'],
                  ['r8', 'ProGuard / R8'],
                  ['manifest', 'Manifest & Runtime'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setCategoryFilter(key)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    categoryFilter === key
                      ? 'bg-amber-500 text-neutral-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Checklist Items */}
          <div className="space-y-3">
            {filteredChecklist.map((item) => {
              const isChecked = checkedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  className={`rounded-xl border p-5 transition-colors ${
                    isChecked
                      ? 'bg-emerald-950/15 border-emerald-800/50'
                      : 'bg-neutral-900 border-stone-800'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <button
                      onClick={() => toggleCheck(item.id)}
                      className="mt-0.5 text-slate-300 hover:text-amber-400 transition-colors shrink-0"
                      aria-label={`Toggle ${item.title}`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-500" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0 space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono text-amber-400">
                          {item.categoryLabel}
                        </span>
                        <span aria-hidden="true" className="text-slate-700">·</span>
                        <span className={`text-xs font-mono ${isChecked ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {isChecked ? 'Verified' : 'Pending'}
                        </span>
                      </div>

                      <h3
                        onClick={() => toggleCheck(item.id)}
                        className={`text-sm font-bold cursor-pointer ${
                          isChecked ? 'text-slate-300 line-through decoration-slate-600' : 'text-slate-100'
                        }`}
                      >
                        {item.title}
                      </h3>

                      <p className="text-xs text-slate-400 leading-relaxed">{item.detail}</p>

                      {/* Verification Command */}
                      <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-neutral-950 border border-stone-800">
                        <code className="text-xs font-mono text-amber-300 overflow-x-auto whitespace-nowrap">
                          {item.verifyCommand}
                        </code>
                        <button
                          onClick={() => handleCopy(item.verifyCommand, `chk-${item.id}`, 'verification command')}
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0"
                          title="Copy command"
                        >
                          {copiedId === `chk-${item.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {item.snippet && (
                        <div className="relative">
                          <pre className="p-2.5 rounded-lg bg-neutral-950 border border-stone-800 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                            <code>{item.snippet}</code>
                          </pre>
                          <button
                            onClick={() => handleCopy(item.snippet || '', `snip-${item.id}`, 'signing commands')}
                            className="absolute right-2 top-2 p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                            title="Copy snippet"
                          >
                            {copiedId === `snip-${item.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Live ProGuard / R8 Validator */}
      {activeTab === 'proguard' && (
        <div className="space-y-6">
          <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                <span>proguard-rules.pro Static Validator</span>
                <span aria-hidden="true" className="mx-2">·</span>
                <span className="font-mono tabular-nums">{proguardAudit.activeRulesCount} active rules</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pro,.txt"
                  onChange={handleProguardUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs font-semibold transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload proguard-rules.pro</span>
                </button>
                <button
                  onClick={() => {
                    setProguardInput(SAMPLE_WEAK_PROGUARD);
                    onNotify('Loaded weak ProGuard sample');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                >
                  Load Weak Sample
                </button>
                <button
                  onClick={() => {
                    setProguardInput(SAMPLE_HARDENED_PROGUARD);
                    onNotify('Loaded hardened R8 sample');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                >
                  Load Hardened Sample
                </button>
              </div>
            </div>

            <textarea
              value={proguardInput}
              onChange={(e) => setProguardInput(e.target.value)}
              rows={9}
              spellCheck={false}
              placeholder="Paste your android/app/proguard-rules.pro contents..."
              className="w-full p-3 rounded-lg bg-neutral-950 border border-stone-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500 leading-relaxed"
            />
          </div>

          {/* Audit Summary */}
          <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-800">
              <div className="flex items-start gap-3">
                {proguardAudit.criticalCount > 0 || proguardAudit.highCount > 0 ? (
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="text-sm font-bold text-slate-100">
                    {proguardAudit.criticalCount > 0 || proguardAudit.highCount > 0
                      ? 'ProGuard / R8 Configuration Weaknesses Detected'
                      : 'ProGuard / R8 Configuration Passes Baseline Checks'}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                    <span>Obfuscation: {proguardAudit.obfuscationActive ? 'Enabled' : 'Disabled'}</span>
                    <span aria-hidden="true">·</span>
                    <span>Log Stripping: {proguardAudit.logStrippingActive ? 'Enabled' : 'Missing'}</span>
                    <span aria-hidden="true">·</span>
                    <span>Package Flattening: {proguardAudit.repackagingActive ? 'Enabled' : 'Disabled'}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setProguardInput(generatedProguardRules);
                  onNotify('Applied hardened R8 rules template');
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs font-semibold transition-colors shrink-0"
              >
                Apply Hardened Template
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-neutral-950 border border-stone-800">
                <div className="text-xs text-rose-400">Critical</div>
                <div className="text-xl font-bold font-mono tabular-nums text-rose-300 mt-1">
                  {proguardAudit.criticalCount}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-neutral-950 border border-stone-800">
                <div className="text-xs text-amber-400">High</div>
                <div className="text-xl font-bold font-mono tabular-nums text-amber-300 mt-1">
                  {proguardAudit.highCount}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-neutral-950 border border-stone-800">
                <div className="text-xs text-sky-400">Medium</div>
                <div className="text-xl font-bold font-mono tabular-nums text-sky-300 mt-1">
                  {proguardAudit.mediumCount}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-neutral-950 border border-stone-800">
                <div className="text-xs text-emerald-400">Verified Controls</div>
                <div className="text-xl font-bold font-mono tabular-nums text-emerald-300 mt-1">
                  {proguardAudit.goodCount}
                </div>
              </div>
            </div>

            {/* Findings List */}
            <div className="space-y-3">
              {proguardAudit.findings.map((finding) => {
                const st = SEVERITY_STYLE[finding.severity];
                return (
                  <div
                    key={finding.id}
                    className="p-4 rounded-lg bg-neutral-950 border border-stone-800 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-100">{finding.title}</span>
                      <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
                        {finding.line > 0 && (
                          <span className="text-slate-500">Line {finding.line}</span>
                        )}
                        <span className={`font-bold ${st.color}`}>{st.label}</span>
                      </div>
                    </div>
                    <code className="block p-2 rounded bg-neutral-900 border border-stone-800 text-xs font-mono text-amber-300 overflow-x-auto">
                      {finding.rule}
                    </code>
                    <p className="text-xs text-slate-400 leading-relaxed">{finding.description}</p>
                    <div className="text-xs text-emerald-400/90">
                      Remediation: <span className="text-slate-300">{finding.fix}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Hardened Config & CLI Verification Builder */}
      {activeTab === 'generator' && (
        <div className="space-y-6">
          <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-100">Hardening Options</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {[
                [stripNativeSymbols, setStripNativeSymbols, 'Strip Native .so Debug Symbols'],
                [stripLogs, setStripLogs, 'Strip Log.v / Log.d / Log.i Calls'],
                [enforceRepackaging, setEnforceRepackaging, 'Repackage Classes & Mask SourceFile'],
                [includeCapacitorKeeps, setIncludeCapacitorKeeps, 'Include Capacitor Plugin Keeps'],
                [hardenManifestAttrs, setHardenManifestAttrs, 'Exclude Packaging Metadata Files'],
              ].map(([value, setter, label], idx) => (
                <button
                  key={idx}
                  onClick={() => (setter as React.Dispatch<React.SetStateAction<boolean>>)(!value)}
                  className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-colors ${
                    value
                      ? 'bg-amber-950/35 border-amber-500/60 text-slate-100'
                      : 'bg-neutral-950 border-stone-800 text-slate-400'
                  }`}
                >
                  {value ? (
                    <CheckSquare className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                  <span className="font-medium">{label as string}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* build.gradle */}
            <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
                  <FileCode className="w-4 h-4 text-amber-400" />
                  <span>android/app/build.gradle (release)</span>
                </div>
                <button
                  onClick={() => handleCopy(generatedBuildGradle, 'gen-gradle', 'build.gradle snippet')}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200"
                >
                  {copiedId === 'gen-gradle' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy</span>
                </button>
              </div>
              <pre className="p-3.5 rounded-lg bg-neutral-950 border border-stone-800 text-xs font-mono text-amber-200 overflow-x-auto leading-relaxed">
                <code>{generatedBuildGradle}</code>
              </pre>
            </div>

            {/* proguard-rules.pro */}
            <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>android/app/proguard-rules.pro</span>
                </div>
                <button
                  onClick={() => handleCopy(generatedProguardRules, 'gen-proguard', 'proguard-rules.pro')}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200"
                >
                  {copiedId === 'gen-proguard' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy</span>
                </button>
              </div>
              <pre className="p-3.5 rounded-lg bg-neutral-950 border border-stone-800 text-xs font-mono text-emerald-200 overflow-x-auto leading-relaxed">
                <code>{generatedProguardRules}</code>
              </pre>
            </div>
          </div>

          {/* CLI Verification Commands */}
          <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
                <Terminal className="w-4 h-4 text-amber-400" />
                <span>Termux APK Signing & Verification Commands</span>
              </div>
              <button
                onClick={() => handleCopy(generatedVerifyCommands, 'gen-cli', 'Termux verification commands')}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-semibold text-white"
              >
                {copiedId === 'gen-cli' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy Commands</span>
              </button>
            </div>
            <pre className="p-3.5 rounded-lg bg-neutral-950 border border-stone-800 text-xs font-mono text-amber-200 overflow-x-auto leading-relaxed">
              <code>{generatedVerifyCommands}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
