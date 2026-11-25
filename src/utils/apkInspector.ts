export interface PermissionFinding {
  name: string;
  shortName: string;
  risk: 'high' | 'medium' | 'standard';
  reason: string;
}

export interface ExportedComponentFinding {
  tag: 'activity' | 'service' | 'receiver' | 'provider';
  name: string;
  exported: boolean;
  hasPermissionGuard: boolean;
  isLauncher: boolean;
}

export interface SecurityFinding {
  severity: 'critical' | 'warning' | 'pass';
  title: string;
  detail: string;
}

export interface ManifestAuditResult {
  validXml: boolean;
  error?: string;
  packageName: string;
  versionCode: string;
  versionName: string;
  minSdk: string;
  targetSdk: string;
  flags: {
    debuggable: boolean | null;
    allowBackup: boolean | null;
    usesCleartextTraffic: boolean | null;
    hasNetworkSecurityConfig: boolean;
  };
  permissions: PermissionFinding[];
  exportedComponents: ExportedComponentFinding[];
  findings: SecurityFinding[];
  score: number;
}

export interface ApkZipEntry {
  path: string;
  compressedSize: number;
  uncompressedSize: number;
}

export interface ApkZipInspection {
  fileName: string;
  fileSizeBytes: number;
  sha256Hex: string;
  totalEntries: number;
  hasManifest: boolean;
  hasResources: boolean;
  dexFiles: string[];
  nativeAbis: string[];
  signatureFiles: string[];
  signingSchemeHint: string;
  largestEntries: ApkZipEntry[];
}

export interface CertFingerprintResult {
  sha1ColonUpper?: string;
  sha1ColonLower?: string;
  sha1Compact?: string;
  sha256ColonUpper?: string;
  sha256ColonLower?: string;
  sha256Compact?: string;
  md5ColonUpper?: string;
}

const HIGH_RISK_PERMS: Record<string, string> = {
  'android.permission.READ_SMS': 'Reads SMS messages/OTPs; restricted by Google Play unless core SMS app.',
  'android.permission.RECEIVE_SMS': 'Intercepts incoming SMS; Play Store requires sensitive permission declaration.',
  'android.permission.SEND_SMS': 'Can send paid SMS messages silently; heavily flagged by Play Protect.',
  'android.permission.SYSTEM_ALERT_WINDOW': 'Draws overlays above other apps; commonly abused for tapjacking/overlay scams.',
  'android.permission.REQUEST_INSTALL_PACKAGES': 'Allows sideloading arbitrary APKs outside Google Play.',
  'android.permission.BIND_ACCESSIBILITY_SERVICE': 'Full screen/input inspection capability; tightly restricted on Play Store.',
  'android.permission.QUERY_ALL_PACKAGES': 'Enumerates all installed apps; requires Play Store declaration.',
  'android.permission.MANAGE_EXTERNAL_STORAGE': 'All-files access; Play Store rejects unless file manager/backup app.',
  'android.permission.READ_CALL_LOG': 'Reads call history; restricted sensitive permission.',
};

const MEDIUM_RISK_PERMS: Record<string, string> = {
  'android.permission.ACCESS_FINE_LOCATION': 'Precise GPS location; verify runtime rationale prompt.',
  'android.permission.ACCESS_BACKGROUND_LOCATION': 'Background GPS tracking; requires separate Play Console justification.',
  'android.permission.CAMERA': 'Camera hardware access; request dynamically only when needed.',
  'android.permission.RECORD_AUDIO': 'Microphone access; disclose prominently in Data Safety.',
  'android.permission.READ_CONTACTS': 'Contacts read access; verify necessity for user workflow.',
  'android.permission.READ_EXTERNAL_STORAGE': 'Legacy storage permission; prefer Scoped Storage or Photo Picker on API 33+.',
  'android.permission.WRITE_EXTERNAL_STORAGE': 'Legacy external write permission; deprecated on API 29+.',
  'android.permission.POST_NOTIFICATIONS': 'Runtime notification permission required on Android 13+ (API 33).',
};

function parseBoolAttr(val: string | null): boolean | null {
  if (val === null) return null;
  if (val.toLowerCase() === 'true') return true;
  if (val.toLowerCase() === 'false') return false;
  return null;
}

function getAndroidAttr(el: Element, localName: string): string | null {
  return (
    el.getAttribute(`android:${localName}`) ??
    el.getAttributeNS('http://schemas.android.com/apk/res/android', localName) ??
    el.getAttribute(localName)
  );
}

export function parseAndroidManifestXml(xmlText: string): ManifestAuditResult {
  const trimmed = xmlText.trim();
  if (!trimmed) {
    return {
      validXml: false,
      error: 'Paste AndroidManifest.xml content or upload a manifest file to begin.',
      packageName: '-',
      versionCode: '-',
      versionName: '-',
      minSdk: '-',
      targetSdk: '-',
      flags: { debuggable: null, allowBackup: null, usesCleartextTraffic: null, hasNetworkSecurityConfig: false },
      permissions: [],
      exportedComponents: [],
      findings: [],
      score: 0,
    };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(trimmed, 'application/xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    return {
      validXml: false,
      error: 'Invalid XML syntax: check unclosed tags or malformed android: attributes.',
      packageName: '-',
      versionCode: '-',
      versionName: '-',
      minSdk: '-',
      targetSdk: '-',
      flags: { debuggable: null, allowBackup: null, usesCleartextTraffic: null, hasNetworkSecurityConfig: false },
      permissions: [],
      exportedComponents: [],
      findings: [],
      score: 0,
    };
  }

  const manifestEl = doc.querySelector('manifest');
  if (!manifestEl) {
    return {
      validXml: false,
      error: 'Root <manifest> element not found.',
      packageName: '-',
      versionCode: '-',
      versionName: '-',
      minSdk: '-',
      targetSdk: '-',
      flags: { debuggable: null, allowBackup: null, usesCleartextTraffic: null, hasNetworkSecurityConfig: false },
      permissions: [],
      exportedComponents: [],
      findings: [],
      score: 0,
    };
  }

  const packageName = manifestEl.getAttribute('package') || '(defined in build.gradle namespace)';
  const versionCode = getAndroidAttr(manifestEl, 'versionCode') || '(build.gradle)';
  const versionName = getAndroidAttr(manifestEl, 'versionName') || '(build.gradle)';

  const usesSdk = doc.querySelector('uses-sdk');
  const minSdk = usesSdk ? getAndroidAttr(usesSdk, 'minSdkVersion') || '(build.gradle)' : '(build.gradle)';
  const targetSdk = usesSdk ? getAndroidAttr(usesSdk, 'targetSdkVersion') || '(build.gradle)' : '(build.gradle)';

  const appEl = doc.querySelector('application');
  const debuggable = appEl ? parseBoolAttr(getAndroidAttr(appEl, 'debuggable')) : null;
  const allowBackup = appEl ? parseBoolAttr(getAndroidAttr(appEl, 'allowBackup')) : null;
  const usesCleartextTraffic = appEl ? parseBoolAttr(getAndroidAttr(appEl, 'usesCleartextTraffic')) : null;
  const hasNetworkSecurityConfig = appEl ? Boolean(getAndroidAttr(appEl, 'networkSecurityConfig')) : false;

  const permissions: PermissionFinding[] = [];
  const seenPerms = new Set<string>();
  doc.querySelectorAll('uses-permission, uses-permission-sdk-23').forEach((el) => {
    const name = getAndroidAttr(el, 'name');
    if (!name || seenPerms.has(name)) return;
    seenPerms.add(name);
    const shortName = name.split('.').pop() || name;
    if (HIGH_RISK_PERMS[name]) {
      permissions.push({ name, shortName, risk: 'high', reason: HIGH_RISK_PERMS[name] });
    } else if (MEDIUM_RISK_PERMS[name]) {
      permissions.push({ name, shortName, risk: 'medium', reason: MEDIUM_RISK_PERMS[name] });
    } else {
      permissions.push({ name, shortName, risk: 'standard', reason: 'Normal protection-level permission.' });
    }
  });

  const exportedComponents: ExportedComponentFinding[] = [];
  const tags: Array<'activity' | 'service' | 'receiver' | 'provider'> = ['activity', 'service', 'receiver', 'provider'];
  tags.forEach((tag) => {
    doc.querySelectorAll(tag).forEach((el) => {
      const name = getAndroidAttr(el, 'name') || '(unnamed)';
      const exportedAttr = parseBoolAttr(getAndroidAttr(el, 'exported'));
      const hasIntentFilter = el.querySelectorAll('intent-filter').length > 0;
      const hasPermissionGuard = Boolean(getAndroidAttr(el, 'permission'));
      const isLauncher =
        Array.from(el.querySelectorAll('intent-filter category')).some((cat) =>
          (getAndroidAttr(cat, 'name') || '').includes('LAUNCHER')
        ) &&
        Array.from(el.querySelectorAll('intent-filter action')).some((act) =>
          (getAndroidAttr(act, 'name') || '').includes('MAIN')
        );

      const effectiveExported = exportedAttr === true || (exportedAttr === null && hasIntentFilter);
      if (effectiveExported) {
        exportedComponents.push({
          tag,
          name,
          exported: true,
          hasPermissionGuard,
          isLauncher,
        });
      }
    });
  });

  const findings: SecurityFinding[] = [];
  let score = 100;

  if (debuggable === true) {
    score -= 30;
    findings.push({
      severity: 'critical',
      title: 'android:debuggable="true" detected',
      detail: 'Allows attaching JDWP debuggers and reading private app data. Remove or set to false for release APKs.',
    });
  } else {
    findings.push({
      severity: 'pass',
      title: 'Release debuggable flag safe',
      detail: debuggable === false ? 'android:debuggable="false" explicitly enforced.' : 'Not hardcoded to debuggable="true".',
    });
  }

  if (usesCleartextTraffic === true) {
    score -= 20;
    findings.push({
      severity: 'critical',
      title: 'Cleartext HTTP traffic allowed (usesCleartextTraffic="true")',
      detail: 'Unencrypted HTTP requests can be intercepted on public Wi-Fi. Enforce HTTPS and use networkSecurityConfig.',
    });
  } else {
    findings.push({
      severity: 'pass',
      title: 'Cleartext traffic restricted',
      detail: hasNetworkSecurityConfig
        ? 'Custom networkSecurityConfig attached.'
        : 'usesCleartextTraffic is not enabled.',
    });
  }

  if (allowBackup === true || allowBackup === null) {
    score -= 10;
    findings.push({
      severity: 'warning',
      title: allowBackup === true ? 'android:allowBackup="true"' : 'android:allowBackup omitted (defaults to true on older APIs)',
      detail: 'Set android:allowBackup="false" unless cloud backup rules explicitly exclude tokens/databases.',
    });
  } else {
    findings.push({
      severity: 'pass',
      title: 'App backup disabled (allowBackup="false")',
      detail: 'Prevents ADB backup extraction of local preferences and SQLite databases.',
    });
  }

  const unguardedExported = exportedComponents.filter((c) => !c.isLauncher && !c.hasPermissionGuard);
  if (unguardedExported.length > 0) {
    score -= Math.min(20, unguardedExported.length * 7);
    findings.push({
      severity: 'warning',
      title: `${unguardedExported.length} non-launcher exported component(s) without android:permission`,
      detail: `Review: ${unguardedExported.map((c) => `${c.tag}:${c.name}`).join(', ')}. Other apps on the device can invoke them.`,
    });
  }

  const highRiskCount = permissions.filter((p) => p.risk === 'high').length;
  if (highRiskCount > 0) {
    score -= Math.min(25, highRiskCount * 12);
    findings.push({
      severity: 'critical',
      title: `${highRiskCount} high-risk/Play-restricted permission(s)`,
      detail: permissions
        .filter((p) => p.risk === 'high')
        .map((p) => p.shortName)
        .join(', '),
    });
  }

  const parsedTarget = Number(targetSdk);
  if (!Number.isNaN(parsedTarget) && parsedTarget > 0 && parsedTarget < 34) {
    score -= 10;
    findings.push({
      severity: 'warning',
      title: `targetSdkVersion ${parsedTarget} is below Google Play requirement (API 34/35)`,
      detail: 'Update targetSdkVersion to 34 or 35 in variables.gradle / build.gradle before Play Store upload.',
    });
  }

  return {
    validXml: true,
    packageName,
    versionCode,
    versionName,
    minSdk,
    targetSdk,
    flags: {
      debuggable,
      allowBackup,
      usesCleartextTraffic,
      hasNetworkSecurityConfig,
    },
    permissions,
    exportedComponents,
    findings,
    score: Math.max(0, Math.min(100, score)),
  };
}

export async function inspectApkZipBuffer(buffer: ArrayBuffer, fileName: string): Promise<ApkZipInspection> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // Compute real SHA-256 checksum via Web Crypto when available
  let sha256Hex = 'Unavailable (requires HTTPS or localhost)';
  if (typeof crypto !== 'undefined' && crypto.subtle?.digest) {
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    sha256Hex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  }

  // Locate PKZIP End of Central Directory (0x06054b50)
  let eocdOffset = -1;
  const minOffset = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= minOffset; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error('Not a valid ZIP/APK/AAB archive (missing PKZIP End of Central Directory).');
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);

  const decoder = new TextDecoder('utf-8');
  const entries: ApkZipEntry[] = [];
  let offset = cdOffset;

  for (let i = 0; i < totalEntries && offset + 46 <= bytes.length; i++) {
    const sig = view.getUint32(offset, true);
    if (sig !== 0x02014b50) break;

    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLen = view.getUint16(offset + 28, true);
    const extraLen = view.getUint16(offset + 30, true);
    const commentLen = view.getUint16(offset + 32, true);

    const path = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLen));
    entries.push({ path, compressedSize, uncompressedSize });
    offset += 46 + nameLen + extraLen + commentLen;
  }

  const hasManifest = entries.some((e) => e.path === 'AndroidManifest.xml' || e.path.endsWith('/AndroidManifest.xml'));
  const hasResources = entries.some((e) => e.path === 'resources.arsc' || e.path.endsWith('.pb'));
  const dexFiles = entries.filter((e) => /^classes\d*\.dex$/i.test(e.path)).map((e) => e.path);

  const abiSet = new Set<string>();
  entries.forEach((e) => {
    const match = e.path.match(/^lib\/([^/]+)\//);
    if (match) abiSet.add(match[1]);
  });

  const signatureFiles = entries
    .filter((e) => /^META-INF\/.+\.(RSA|DSA|EC|SF|MF)$/i.test(e.path))
    .map((e) => e.path);

  // Check for APK Signature Scheme v2/v3 magic "APK Sig Block 42" near central directory
  const apkSigMagic = 'APK Sig Block 42';
  let hasV2Block = false;
  if (cdOffset >= 32) {
    const tailSlice = decoder.decode(bytes.subarray(Math.max(0, cdOffset - 64), cdOffset));
    if (tailSlice.includes(apkSigMagic)) {
      hasV2Block = true;
    }
  }

  let signingSchemeHint = 'Unsigned / Debug check required';
  if (hasV2Block && signatureFiles.length > 0) {
    signingSchemeHint = 'APK Signature Scheme v2/v3 + v1 JAR entries detected';
  } else if (hasV2Block) {
    signingSchemeHint = 'APK Signature Scheme v2/v3 block detected';
  } else if (signatureFiles.length > 0) {
    signingSchemeHint = 'v1 JAR signature only (consider adding v2/v3 via apksigner for Android 11+)';
  }

  const largestEntries = [...entries]
    .sort((a, b) => b.uncompressedSize - a.uncompressedSize)
    .slice(0, 8);

  return {
    fileName,
    fileSizeBytes: buffer.byteLength,
    sha256Hex,
    totalEntries: entries.length,
    hasManifest,
    hasResources,
    dexFiles,
    nativeAbis: Array.from(abiSet),
    signatureFiles,
    signingSchemeHint,
    largestEntries,
  };
}

function formatColonHex(cleanHex: string, upper: boolean): string {
  const norm = upper ? cleanHex.toUpperCase() : cleanHex.toLowerCase();
  return norm.match(/.{1,2}/g)?.join(':') || norm;
}

export function normalizeCertFingerprint(input: string): CertFingerprintResult {
  const result: CertFingerprintResult = {};

  const sha256Match = input.match(/(?:SHA-?256\s*[:=]?\s*)?((?:[A-Fa-f0-9]{2}[:\s-]?){31}[A-Fa-f0-9]{2})/i);
  if (sha256Match) {
    const clean = sha256Match[1].replace(/[^A-Fa-f0-9]/g, '');
    if (clean.length === 64) {
      result.sha256ColonUpper = formatColonHex(clean, true);
      result.sha256ColonLower = formatColonHex(clean, false);
      result.sha256Compact = clean.toUpperCase();
    }
  }

  const sha1Match = input.match(/(?:SHA-?1\s*[:=]?\s*)?((?:[A-Fa-f0-9]{2}[:\s-]?){19}[A-Fa-f0-9]{2})(?![A-Fa-f0-9])/i);
  if (sha1Match) {
    const clean = sha1Match[1].replace(/[^A-Fa-f0-9]/g, '');
    if (clean.length === 40) {
      result.sha1ColonUpper = formatColonHex(clean, true);
      result.sha1ColonLower = formatColonHex(clean, false);
      result.sha1Compact = clean.toUpperCase();
    }
  }

  const md5Match = input.match(/(?:MD5\s*[:=]?\s*)?((?:[A-Fa-f0-9]{2}[:\s-]?){15}[A-Fa-f0-9]{2})(?![A-Fa-f0-9])/i);
  if (md5Match) {
    const clean = md5Match[1].replace(/[^A-Fa-f0-9]/g, '');
    if (clean.length === 32) {
      result.md5ColonUpper = formatColonHex(clean, true);
    }
  }

  return result;
}
