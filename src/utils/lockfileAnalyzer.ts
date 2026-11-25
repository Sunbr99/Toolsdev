export type LockfileKind = 'npm-lock' | 'gradle-lock' | 'gradle-verification' | 'gradle-wrapper' | 'unknown';

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'verified';

export interface DependencyFinding {
  id: string;
  name: string;
  version: string;
  severity: FindingSeverity;
  category: string;
  resolved?: string;
  integrity?: string;
  hasInstallScript?: boolean;
  issues: string[];
  recommendation: string;
}

export interface AuditSummary {
  kind: LockfileKind;
  kindLabel: string;
  totalPackages: number;
  verifiedCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  registries: string[];
  installScriptCount: number;
  missingIntegrityCount: number;
  parseError?: string;
  findings: DependencyFinding[];
}

const TRUSTED_NPM_REGISTRIES = [
  'registry.npmjs.org',
  'registry.yarnpkg.com',
];

const POPULAR_PACKAGES = [
  'react',
  'react-dom',
  'lodash',
  'axios',
  'express',
  'typescript',
  'vite',
  'tailwindcss',
  'eslint',
  'prettier',
  'zod',
  'lucide-react',
  'dotenv',
  'chalk',
  'commander',
  'cross-env',
  'jsonwebtoken',
  'bcrypt',
  'mongoose',
  'cors',
  'uuid',
  'moment',
  'dayjs',
  'rxjs',
  'next',
  '@capacitor/core',
  '@capacitor/android',
  '@capacitor/cli',
  '@capacitor/app',
  '@capacitor/filesystem',
  'webpack',
  'rollup',
  'esbuild',
  'postcss',
  'autoprefixer',
];

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 2) return 99;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function findTyposquatMatch(pkgName: string): string | null {
  const normalized = pkgName.toLowerCase();
  if (POPULAR_PACKAGES.includes(normalized)) return null;
  for (const target of POPULAR_PACKAGES) {
    // Compare unscoped or full names when lengths are close
    const dist = levenshtein(normalized, target);
    if (dist === 1) {
      return target;
    }
    // Common suffix/prefix swaps like crossenv vs cross-env
    if (normalized.replace(/[-_.]/g, '') === target.replace(/[-_.]/g, '') && normalized !== target) {
      return target;
    }
  }
  return null;
}

function extractNpmPackageName(pathKey: string): string {
  if (!pathKey) return '';
  const idx = pathKey.lastIndexOf('node_modules/');
  if (idx !== -1) {
    return pathKey.slice(idx + 'node_modules/'.length);
  }
  return pathKey;
}

function getHostnameSafe(urlStr: string): string | null {
  try {
    const parsed = new URL(urlStr);
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isSuspiciousHighVersion(version: string): boolean {
  const match = version.match(/^(\d+)\./);
  if (!match) return false;
  const major = parseInt(match[1], 10);
  // Classic dependency confusion packages jump to 99.x, 100.x, 999.x, or 9999.x
  return major >= 99;
}

export function detectLockfileKind(content: string, filename?: string): LockfileKind {
  const trimmed = content.trim();
  const lowerName = (filename || '').toLowerCase();

  if (lowerName.endsWith('verification-metadata.xml') || trimmed.includes('<verification-metadata')) {
    return 'gradle-verification';
  }
  if (lowerName.endsWith('gradle-wrapper.properties') || trimmed.includes('distributionUrl=')) {
    return 'gradle-wrapper';
  }
  if (lowerName.endsWith('gradle.lockfile') || /^[^\s:#=]+:[^\s:#=]+:[^\s=]+=/m.test(trimmed)) {
    return 'gradle-lock';
  }
  if (lowerName.endsWith('package-lock.json') || (trimmed.startsWith('{') && (trimmed.includes('"lockfileVersion"') || trimmed.includes('"packages"') || trimmed.includes('"dependencies"')))) {
    return 'npm-lock';
  }
  return 'unknown';
}

export function analyzeLockfile(content: string, filename?: string): AuditSummary {
  const trimmed = content.trim();
  if (!trimmed) {
    return {
      kind: 'unknown',
      kindLabel: 'Empty Input',
      totalPackages: 0,
      verifiedCount: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      registries: [],
      installScriptCount: 0,
      missingIntegrityCount: 0,
      findings: [],
    };
  }

  const kind = detectLockfileKind(trimmed, filename);

  if (kind === 'npm-lock') {
    return analyzeNpmLockfile(trimmed);
  }
  if (kind === 'gradle-lock') {
    return analyzeGradleLockfile(trimmed);
  }
  if (kind === 'gradle-verification') {
    return analyzeGradleVerificationXml(trimmed);
  }
  if (kind === 'gradle-wrapper') {
    return analyzeGradleWrapperProperties(trimmed);
  }

  return {
    kind: 'unknown',
    kindLabel: 'Unrecognized Format',
    totalPackages: 0,
    verifiedCount: 0,
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    registries: [],
    installScriptCount: 0,
    missingIntegrityCount: 0,
    parseError: 'Could not detect lockfile format. Supported formats: package-lock.json, gradle.lockfile, gradle/verification-metadata.xml, and gradle-wrapper.properties.',
    findings: [],
  };
}

function analyzeNpmLockfile(raw: string): AuditSummary {
  let parsed: Record<string, any>;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return {
      kind: 'npm-lock',
      kindLabel: 'npm package-lock.json',
      totalPackages: 0,
      verifiedCount: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      registries: [],
      installScriptCount: 0,
      missingIntegrityCount: 0,
      parseError: `Invalid JSON syntax: ${err instanceof Error ? err.message : 'parse error'}`,
      findings: [],
    };
  }

  const findings: DependencyFinding[] = [];
  const registrySet = new Set<string>();
  let installScriptCount = 0;
  let missingIntegrityCount = 0;

  const inspectEntry = (
    id: string,
    name: string,
    version: string,
    resolved: string | undefined,
    integrity: string | undefined,
    hasInstallScript: boolean,
    isDev: boolean,
    isLink: boolean
  ) => {
    const issues: string[] = [];
    let severity: FindingSeverity = 'verified';

    const maxSeverity = (curr: FindingSeverity, next: FindingSeverity): FindingSeverity => {
      const rank: Record<FindingSeverity, number> = {
        verified: 0,
        medium: 1,
        high: 2,
        critical: 3,
      };
      return rank[next] > rank[curr] ? next : curr;
    };

    if (isLink || (resolved && (resolved.startsWith('file:') || resolved.startsWith('link:')))) {
      issues.push('Local filesystem or symlinked dependency bypasses registry hash verification.');
      severity = maxSeverity(severity, 'medium');
    }

    if (resolved) {
      const lowerUrl = resolved.toLowerCase();
      if (lowerUrl.startsWith('http://')) {
        issues.push('Resolved over unencrypted HTTP (vulnerable to MITM package substitution).');
        severity = maxSeverity(severity, 'critical');
      } else if (lowerUrl.startsWith('git+') || lowerUrl.includes('github.com/') || lowerUrl.endsWith('.git')) {
        issues.push('Resolved from a Git repository URL instead of a signed registry tarball.');
        severity = maxSeverity(severity, 'high');
      } else {
        const host = getHostnameSafe(resolved);
        if (host) {
          registrySet.add(host);
          if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
            issues.push(`Resolved directly from raw IP address (${host}) instead of a verified registry domain.`);
            severity = maxSeverity(severity, 'critical');
          } else if (!TRUSTED_NPM_REGISTRIES.includes(host)) {
            issues.push(`Resolved from non-default registry host "${host}". Confirm this is your approved private registry.`);
            severity = maxSeverity(severity, 'high');
          }
        }
      }
    } else if (!isLink) {
      issues.push('Missing "resolved" tarball URL; origin cannot be audited.');
      severity = maxSeverity(severity, 'medium');
    }

    if (!isLink) {
      if (!integrity) {
        missingIntegrityCount++;
        issues.push('Missing cryptographic "integrity" digest (tarball contents are unverified).');
        severity = maxSeverity(severity, 'critical');
      } else if (integrity.startsWith('sha1-')) {
        issues.push('Uses weak legacy SHA-1 integrity hash instead of SHA-512.');
        severity = maxSeverity(severity, 'medium');
      } else if (!integrity.startsWith('sha512-') && !integrity.startsWith('sha256-') && !integrity.startsWith('sha384-')) {
        issues.push(`Unrecognized integrity hash format: "${integrity.slice(0, 20)}..."`);
        severity = maxSeverity(severity, 'high');
      }
    }

    if (hasInstallScript) {
      installScriptCount++;
      issues.push('Executes lifecycle install scripts (preinstall/install/postinstall) during npm install.');
      severity = maxSeverity(severity, 'high');
    }

    const typosquat = findTyposquatMatch(name);
    if (typosquat) {
      issues.push(`Potential typosquatting name: closely resembles popular package "${typosquat}".`);
      severity = maxSeverity(severity, 'critical');
    }

    if (isSuspiciousHighVersion(version)) {
      issues.push(`Suspiciously high major version (${version}) — classic Dependency Confusion override signature.`);
      severity = maxSeverity(severity, 'high');
    }

    let recommendation = 'Verified SHA-512 integrity from trusted HTTPS registry.';
    if (severity === 'critical') {
      recommendation = 'Block build immediately. Inspect package origin, fix HTTPS/registry config, or remove suspicious dependency.';
    } else if (severity === 'high') {
      recommendation = 'Audit package source and run `npm ci --ignore-scripts` in Termux to block install script execution.';
    } else if (severity === 'medium') {
      recommendation = 'Regenerate lockfile with modern npm (`npm install --package-lock-only`) to enforce SHA-512 hashes.';
    }

    findings.push({
      id,
      name,
      version: version || 'unknown',
      severity,
      category: isDev ? 'devDependency' : 'dependency',
      resolved,
      integrity,
      hasInstallScript,
      issues,
      recommendation,
    });
  };

  if (parsed.packages && typeof parsed.packages === 'object') {
    Object.entries(parsed.packages).forEach(([key, pkg]: [string, any]) => {
      if (key === '') return; // root project entry
      const name = pkg.name || extractNpmPackageName(key);
      const hasScript = Boolean(
        pkg.hasInstallScript ||
        pkg.scripts?.preinstall ||
        pkg.scripts?.install ||
        pkg.scripts?.postinstall
      );
      inspectEntry(
        key,
        name,
        pkg.version || '',
        pkg.resolved,
        pkg.integrity,
        hasScript,
        Boolean(pkg.dev),
        Boolean(pkg.link)
      );
    });
  } else if (parsed.dependencies && typeof parsed.dependencies === 'object') {
    const walkV1 = (deps: Record<string, any>, prefix = '') => {
      Object.entries(deps).forEach(([name, info]) => {
        const key = `${prefix}${name}@${info.version || ''}`;
        inspectEntry(
          key,
          name,
          info.version || '',
          info.resolved,
          info.integrity,
          Boolean(info.hasInstallScript),
          Boolean(info.dev),
          false
        );
        if (info.dependencies && typeof info.dependencies === 'object') {
          walkV1(info.dependencies, `${key} > `);
        }
      });
    };
    walkV1(parsed.dependencies);
  }

  // Flag mixed registries across the lockfile (dependency confusion vector)
  const registries = Array.from(registrySet);
  if (registries.length > 1) {
    findings.forEach((f) => {
      if (f.resolved) {
        const host = getHostnameSafe(f.resolved);
        if (host && !TRUSTED_NPM_REGISTRIES.includes(host)) {
          f.issues.push(`Mixed registries detected (${registries.join(', ')}). Ensure scope-to-registry mapping in .npmrc.`);
          if (f.severity === 'verified') f.severity = 'medium';
        }
      }
    });
  }

  return buildSummary('npm-lock', `npm package-lock.json (v${parsed.lockfileVersion || 1})`, findings, registries, installScriptCount, missingIntegrityCount);
}

function analyzeGradleLockfile(raw: string): AuditSummary {
  const findings: DependencyFinding[] = [];
  let missingIntegrityCount = 0;

  const lines = raw.split(/\r?\n/);
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('empty=')) return;

    const [coordPart, configsPart] = trimmed.split('=');
    const parts = coordPart.split(':');
    if (parts.length < 3) return;

    const group = parts[0];
    const artifact = parts[1];
    const version = parts.slice(2).join(':');
    const name = `${group}:${artifact}`;

    const issues: string[] = [];
    let severity: FindingSeverity = 'verified';

    if (version.includes('SNAPSHOT') || version.includes('+')) {
      issues.push('Mutable version ("-SNAPSHOT" or "+") allows silent upstream artifact replacement.');
      severity = 'critical';
    }
    if (isSuspiciousHighVersion(version)) {
      issues.push(`Suspiciously high major version (${version}) — possible Dependency Confusion payload.`);
      severity = 'high';
    }
    if (group.startsWith('com.') && !configsPart) {
      issues.push('Locked coordinate has no Gradle configuration binding.');
      if (severity === 'verified') severity = 'medium';
    }

    // Note: gradle.lockfile pins versions, not hashes; hashes require verification-metadata.xml
    missingIntegrityCount++;
    if (severity === 'verified') {
      issues.push('Version is pinned in gradle.lockfile, but checksum verification requires gradle/verification-metadata.xml.');
      severity = 'medium';
    }

    findings.push({
      id: `gradle-${idx}-${name}`,
      name,
      version,
      severity,
      category: configsPart ? `configs: ${configsPart}` : 'gradle dependency',
      issues,
      recommendation:
        severity === 'critical'
          ? 'Replace mutable SNAPSHOT/+ version with an immutable release version and enforce SHA-256 verification.'
          : 'Run `./gradlew --write-verification-metadata sha256` to pair version locks with cryptographic hashes.',
    });
  });

  return buildSummary('gradle-lock', 'Gradle Lockfile (gradle.lockfile)', findings, ['google() / mavenCentral()'], 0, missingIntegrityCount);
}

function analyzeGradleVerificationXml(raw: string): AuditSummary {
  const findings: DependencyFinding[] = [];
  let missingIntegrityCount = 0;

  // Match <component group="..." name="..." version="..."> ... </component>
  const componentRegex = /<component\s+[^>]*group="([^"]+)"[^>]*name="([^"]+)"[^>]*version="([^"]+)"[^>]*>([\s\S]*?)<\/component>/g;
  let match: RegExpExecArray | null;

  while ((match = componentRegex.exec(raw)) !== null) {
    const [, group, artifact, version, body] = match;
    const name = `${group}:${artifact}`;

    const hasSha256 = /<sha256\s+value="[a-fA-F0-9]{64}"/.test(body);
    const hasSha512 = /<sha512\s+value="[a-fA-F0-9]{128}"/.test(body);
    const hasWeakHash = /<(md5|sha1)\s+value=/.test(body);
    const hasPgp = /<pgp\s+value=/.test(body);
    const isIgnored = /<ignored-keys>/.test(body);

    const issues: string[] = [];
    let severity: FindingSeverity = 'verified';

    if (!hasSha256 && !hasSha512) {
      missingIntegrityCount++;
      if (hasWeakHash) {
        issues.push('Only weak MD5/SHA-1 hash present; upgrade to SHA-256 or SHA-512.');
        severity = 'high';
      } else {
        issues.push('Component has no cryptographic checksum (<sha256> or <sha512>) or trusted PGP signature.');
        severity = 'critical';
      }
    }
    if (isIgnored) {
      issues.push('PGP verification explicitly ignored (<ignored-keys>).');
      if (severity === 'verified') severity = 'medium';
    }
    if (version.includes('SNAPSHOT')) {
      issues.push('Mutable SNAPSHOT version inside verification metadata.');
      severity = 'critical';
    }

    const digestMatch = body.match(/<(sha256|sha512|sha1|md5)\s+value="([^"]+)"/);

    findings.push({
      id: `xml-${name}@${version}`,
      name,
      version,
      severity,
      category: hasPgp ? 'SHA + PGP' : 'Checksum',
      integrity: digestMatch ? `${digestMatch[1]}:${digestMatch[2].slice(0, 16)}...` : undefined,
      issues,
      recommendation:
        severity === 'verified'
          ? 'Verified cryptographic checksum recorded in verification-metadata.xml.'
          : 'Regenerate metadata via `./gradlew --write-verification-metadata sha256,pgp` from a trusted network.',
    });
  }

  return buildSummary('gradle-verification', 'Gradle Verification Metadata (XML)', findings, ['Gradle Dependency Verification'], 0, missingIntegrityCount);
}

function analyzeGradleWrapperProperties(raw: string): AuditSummary {
  const findings: DependencyFinding[] = [];
  const distUrlMatch = raw.match(/distributionUrl=(.+)/);
  const sha256Match = raw.match(/distributionSha256Sum=([a-fA-F0-9]{64})/);

  const distUrl = distUrlMatch ? distUrlMatch[1].replace(/\\:/g, ':').trim() : '';
  const sha256 = sha256Match ? sha256Match[1] : undefined;

  const issues: string[] = [];
  let severity: FindingSeverity = 'verified';

  if (!distUrl) {
    issues.push('Missing distributionUrl in gradle-wrapper.properties.');
    severity = 'high';
  } else if (distUrl.startsWith('http://')) {
    issues.push('Gradle distributionUrl uses unencrypted HTTP instead of HTTPS.');
    severity = 'critical';
  }

  if (!sha256) {
    issues.push('Missing distributionSha256Sum — `./gradlew` will execute the downloaded Gradle binary without verifying its checksum.');
    if (severity === 'verified') severity = 'high';
  }

  findings.push({
    id: 'gradle-wrapper',
    name: 'Gradle Wrapper Binary',
    version: distUrl.match(/gradle-([\d.]+)/)?.[1] || 'unknown',
    severity,
    category: 'Build Toolchain',
    resolved: distUrl || undefined,
    integrity: sha256 ? `sha256:${sha256.slice(0, 20)}...` : undefined,
    issues,
    recommendation:
      severity === 'verified'
        ? 'Gradle Wrapper distribution uses HTTPS and pins official SHA-256 verification.'
        : 'Add the official `distributionSha256Sum` from gradle.org/release-checksums and enforce `https://`.',
  });

  return buildSummary('gradle-wrapper', 'Gradle Wrapper Properties', findings, ['services.gradle.org'], 0, sha256 ? 0 : 1);
}

function buildSummary(
  kind: LockfileKind,
  kindLabel: string,
  findings: DependencyFinding[],
  registries: string[],
  installScriptCount: number,
  missingIntegrityCount: number
): AuditSummary {
  const order: Record<FindingSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    verified: 3,
  };
  const sorted = [...findings].sort((a, b) => order[a.severity] - order[b.severity]);

  return {
    kind,
    kindLabel,
    totalPackages: findings.length,
    verifiedCount: findings.filter((f) => f.severity === 'verified').length,
    criticalCount: findings.filter((f) => f.severity === 'critical').length,
    highCount: findings.filter((f) => f.severity === 'high').length,
    mediumCount: findings.filter((f) => f.severity === 'medium').length,
    registries,
    installScriptCount,
    missingIntegrityCount,
    findings: sorted,
  };
}
