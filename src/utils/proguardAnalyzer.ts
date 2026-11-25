export type ProguardSeverity = 'critical' | 'high' | 'medium' | 'good';

export interface ProguardFinding {
  id: string;
  line: number;
  rule: string;
  severity: ProguardSeverity;
  title: string;
  description: string;
  fix: string;
}

export interface ProguardAuditResult {
  totalLines: number;
  activeRulesCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  goodCount: number;
  obfuscationActive: boolean;
  logStrippingActive: boolean;
  repackagingActive: boolean;
  findings: ProguardFinding[];
}

export function analyzeProguardRules(raw: string): ProguardAuditResult {
  const lines = raw.split(/\r?\n/);
  const findings: ProguardFinding[] = [];

  let activeRulesCount = 0;
  let obfuscationActive = true;
  let logStrippingActive = false;
  let repackagingActive = false;
  let renamesSourceFile = false;
  let keepsSourceFileAttrs = false;

  lines.forEach((rawLine, index) => {
    const lineNum = index + 1;
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    activeRulesCount++;
    const normalized = trimmed.replace(/\s+/g, ' ');

    // 1. Disabled obfuscation / shrinking / optimization
    if (/^-dontobfuscate\b/.test(normalized)) {
      obfuscationActive = false;
      findings.push({
        id: `pg-${lineNum}-dontobfuscate`,
        line: lineNum,
        rule: trimmed,
        severity: 'critical',
        title: 'Obfuscation Explicitly Disabled (-dontobfuscate)',
        description:
          'Decompilers like jadx will recover your exact original class, method, and field names in plaintext.',
        fix: 'Remove `-dontobfuscate` from release ProGuard rules and rely on targeted `-keep` rules for reflection only.',
      });
    }

    if (/^-dontshrink\b/.test(normalized)) {
      findings.push({
        id: `pg-${lineNum}-dontshrink`,
        line: lineNum,
        rule: trimmed,
        severity: 'high',
        title: 'Code Shrinking Disabled (-dontshrink)',
        description:
          'Unused classes, test utilities, and dead code paths remain inside classes.dex, increasing APK size and reverse-engineering surface.',
        fix: 'Remove `-dontshrink` so R8 removes unreferenced code.',
      });
    }

    if (/^-dontoptimize\b/.test(normalized)) {
      findings.push({
        id: `pg-${lineNum}-dontoptimize`,
        line: lineNum,
        rule: trimmed,
        severity: 'medium',
        title: 'Bytecode Optimization Disabled (-dontoptimize)',
        description:
          'Disables R8 control-flow optimization, inlining, and constant folding, making bytecode easier to read and slower at runtime.',
        fix: 'Use `proguard-android-optimize.txt` in build.gradle and remove `-dontoptimize`.',
      });
    }

    // 2. Overly broad wildcard keeps
    if (/^-keep(classmembers|classeswithmembers)?\s+class\s+(\*\*|\*)\s*\{\s*\*\s*;\s*\}/.test(normalized)) {
      findings.push({
        id: `pg-${lineNum}-global-keep`,
        line: lineNum,
        rule: trimmed,
        severity: 'critical',
        title: 'Global Wildcard Keep Exposes Entire Codebase',
        description:
          'Keeping `*` or `**` with `{ *; }` effectively bypasses R8 shrinking and obfuscation across all packages.',
        fix: 'Scope `-keep` strictly to specific annotated classes (e.g., `@android.webkit.JavascriptInterface`, Capacitor `@CapacitorPlugin`, or Gson/Moshi DTOs).',
      });
    } else if (/^-keep\s+class\s+[a-zA-Z0-9_.]+\.\*\*\s*\{\s*\*\s*;\s*\}/.test(normalized)) {
      const isThirdParty = /^-keep\s+class\s+(androidx|com\.google|org\.apache|kotlin)\./.test(normalized);
      if (!isThirdParty) {
        findings.push({
          id: `pg-${lineNum}-broad-pkg-keep`,
          line: lineNum,
          rule: trimmed,
          severity: 'high',
          title: 'Broad App Package Wildcard Keep',
          description:
            'Preserving every class and member under an entire package prevents R8 from obfuscating business logic inside that namespace.',
          fix: 'Narrow the rule to exact model packages or use `@Keep` on individual classes/methods.',
        });
      }
    }

    // 3. Global -dontwarn or -ignorewarnings
    if (/^-ignorewarnings\b/.test(normalized) || /^-dontwarn\s+(\*\*|\*)\s*$/.test(normalized)) {
      findings.push({
        id: `pg-${lineNum}-ignorewarn`,
        line: lineNum,
        rule: trimmed,
        severity: 'medium',
        title: 'Blanket Warning Suppression (-ignorewarnings / -dontwarn **)',
        description:
          'Hides missing dependency or reflection issues across all libraries, which can cause sudden NoClassDefFoundError crashes in release APKs.',
        fix: 'Target `-dontwarn` only to specific missing optional packages (e.g. `-dontwarn org.conscrypt.**`).',
      });
    }

    // 4. Debug Log stripping check
    if (/^-assumenosideeffects\s+class\s+android\.util\.Log\b/.test(normalized)) {
      logStrippingActive = true;
      findings.push({
        id: `pg-${lineNum}-logstrip`,
        line: lineNum,
        rule: trimmed,
        severity: 'good',
        title: 'Android Log Stripping Configured',
        description:
          'R8 will strip verbose/debug logging calls at compile time so internal diagnostic messages do not appear in logcat.',
        fix: 'Ensure `v`, `d`, and `i` methods are listed inside the `-assumenosideeffects` block.',
      });
    }

    // 5. Repackaging / class flattening
    if (/^-repackageclasses\b/.test(normalized) || /^-flattenpackagehierarchy\b/.test(normalized)) {
      repackagingActive = true;
      findings.push({
        id: `pg-${lineNum}-repackage`,
        line: lineNum,
        rule: trimmed,
        severity: 'good',
        title: 'Package Structure Obfuscation Active',
        description:
          'Collapses obfuscated class names into a flat/short package namespace, hiding architectural module boundaries.',
        fix: 'Keep active alongside `-allowaccessmodification` for stronger obfuscation.',
      });
    }

    // 6. SourceFile / LineNumberTable attributes
    if (/^-keepattributes\b/.test(normalized) && /SourceFile/i.test(normalized)) {
      keepsSourceFileAttrs = true;
    }
    if (/^-renamesourcefileattribute\b/.test(normalized)) {
      renamesSourceFile = true;
      findings.push({
        id: `pg-${lineNum}-renamesrc`,
        line: lineNum,
        rule: trimmed,
        severity: 'good',
        title: 'SourceFile Metadata Scrubbed',
        description:
          'Replaces original `.java`/`.kt` filenames in stack traces with a generic string to prevent leaking internal file names.',
        fix: 'Upload `mapping.txt` privately to Play Console to de-obfuscate production crashes.',
      });
    }
  });

  // Global missing protections
  if (activeRulesCount > 0 && !logStrippingActive) {
    findings.push({
      id: 'pg-missing-log-strip',
      line: 0,
      rule: '(missing rule)',
      severity: 'medium',
      title: 'Missing android.util.Log Stripping Rule',
      description:
        'Without `-assumenosideeffects class android.util.Log`, `Log.d()` / `Log.v()` calls remain compiled in release DEX bytecode.',
      fix: 'Add `-assumenosideeffects class android.util.Log { public static int v(...); public static int d(...); public static int i(...); }`',
    });
  }

  if (activeRulesCount > 0 && !repackagingActive) {
    findings.push({
      id: 'pg-missing-repackage',
      line: 0,
      rule: '(missing rule)',
      severity: 'medium',
      title: 'Original Package Hierarchy Preserved',
      description:
        'Without `-repackageclasses`, attackers can still infer module roles from original directory names (e.g. `com.app.auth`, `com.app.crypto`).',
      fix: 'Add `-repackageclasses \'\'` (or `-repackageclasses \'o\'`) and `-allowaccessmodification`.',
    });
  }

  if (keepsSourceFileAttrs && !renamesSourceFile) {
    findings.push({
      id: 'pg-exposed-sourcefile',
      line: 0,
      rule: '-keepattributes SourceFile,...',
      severity: 'medium',
      title: 'Original Source Filenames Exposed in DEX',
      description:
        '`SourceFile` attribute is kept without `-renamesourcefileattribute`, revealing exact source filenames in jadx.',
      fix: 'Add `-renamesourcefileattribute SourceFile` to mask original filenames while keeping stack trace line numbers.',
    });
  }

  const order: Record<ProguardSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    good: 3,
  };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);

  return {
    totalLines: lines.length,
    activeRulesCount,
    criticalCount: findings.filter((f) => f.severity === 'critical').length,
    highCount: findings.filter((f) => f.severity === 'high').length,
    mediumCount: findings.filter((f) => f.severity === 'medium').length,
    goodCount: findings.filter((f) => f.severity === 'good').length,
    obfuscationActive,
    logStrippingActive,
    repackagingActive,
    findings,
  };
}
