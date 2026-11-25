export type TaskCategory =
  | 'r8-dex'
  | 'resources-aapt2'
  | 'compilation'
  | 'packaging'
  | 'config-deps'
  | 'other';

export interface GradleTaskMetric {
  id: string;
  taskName: string;
  durationMs: number;
  category: TaskCategory;
  categoryLabel: string;
  percentOfTotal: number;
}

export interface OptimizationAdvice {
  id: string;
  priority: 'high' | 'medium' | 'info';
  title: string;
  reason: string;
  action: string;
  snippet?: string;
}

export interface BuildProfileAnalysis {
  sourceType: 'gradle-html' | 'gradle-log' | 'empty';
  totalDurationMs: number;
  taskCount: number;
  tasks: GradleTaskMetric[];
  categoryTotals: { category: TaskCategory; label: string; durationMs: number; percent: number }[];
  recommendations: OptimizationAdvice[];
  buildOutcome: 'success' | 'failed' | 'unknown';
}

export interface SavedBuildRun {
  id: string;
  timestamp: string;
  label: string;
  variant: 'debug' | 'release';
  totalDurationMs: number;
  topBottleneck: string;
  taskCount: number;
}

function categorizeTask(taskName: string): { category: TaskCategory; label: string } {
  const lower = taskName.toLowerCase();
  if (lower.includes('r8') || lower.includes('proguard') || lower.includes('dex')) {
    return { category: 'r8-dex', label: 'R8 / Dexing' };
  }
  if (lower.includes('resource') || lower.includes('aapt') || lower.includes('manifest')) {
    return { category: 'resources-aapt2', label: 'Resources & AAPT2' };
  }
  if (lower.includes('compile') || lower.includes('kapt') || lower.includes('ksp')) {
    return { category: 'compilation', label: 'Java / Kotlin Compile' };
  }
  if (lower.includes('package') || lower.includes('strip') || lower.includes('zip') || lower.includes('sign') || lower.includes('asset')) {
    return { category: 'packaging', label: 'Packaging & Signing' };
  }
  if (lower.includes('config') || lower.includes('dependency') || lower.includes('resolve')) {
    return { category: 'config-deps', label: 'Config & Dependencies' };
  }
  return { category: 'other', label: 'Other Tasks' };
}

export function parseDurationToMs(raw: string): number {
  const trimmed = raw.trim();
  // Format: 1m 24.5s or 2m 10s
  const minSecMatch = trimmed.match(/(\d+)\s*m\s*(\d+(?:\.\d+)?)\s*s/i);
  if (minSecMatch) {
    return (parseInt(minSecMatch[1], 10) * 60 + parseFloat(minSecMatch[2])) * 1000;
  }
  // Format: 12.45s or 12s
  const secMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*s$/i);
  if (secMatch) {
    return parseFloat(secMatch[1]) * 1000;
  }
  // Format: 450ms
  const msMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*ms$/i);
  if (msMatch) {
    return parseFloat(msMatch[1]);
  }
  // Format: 0:18.42 (Gradle profile HTML often prints 18.42s or 0m18.42s)
  const colonMatch = trimmed.match(/^(\d+):(\d+(?:\.\d+)?)$/);
  if (colonMatch) {
    return (parseInt(colonMatch[1], 10) * 60 + parseFloat(colonMatch[2])) * 1000;
  }
  return 0;
}

export function formatDurationMs(ms: number): string {
  if (ms <= 0) return '0.0s';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const totalSec = ms / 1000;
  if (totalSec < 60) return `${totalSec.toFixed(2)}s`;
  const mins = Math.floor(totalSec / 60);
  const secs = (totalSec % 60).toFixed(1);
  return `${mins}m ${secs}s`;
}

export function analyzeGradleBuildOutput(raw: string): BuildProfileAnalysis {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      sourceType: 'empty',
      totalDurationMs: 0,
      taskCount: 0,
      tasks: [],
      categoryTotals: [],
      recommendations: [],
      buildOutcome: 'unknown',
    };
  }

  const isHtmlProfile = trimmed.includes('<html') && (trimmed.includes('Gradle') || trimmed.includes('numeric'));
  const rawTasks: { name: string; durationMs: number }[] = [];
  let reportedTotalMs = 0;

  let buildOutcome: 'success' | 'failed' | 'unknown' = 'unknown';
  if (/BUILD SUCCESSFUL/i.test(trimmed)) buildOutcome = 'success';
  else if (/BUILD FAILED/i.test(trimmed)) buildOutcome = 'failed';

  const totalMatch = trimmed.match(/BUILD\s+(?:SUCCESSFUL|FAILED)\s+in\s+([^\r\n]+)/i);
  if (totalMatch) {
    reportedTotalMs = parseDurationToMs(totalMatch[1]);
  }

  if (isHtmlProfile) {
    // Parse Gradle --profile HTML table rows: <td>:app:mergeDebugResources</td><td class="numeric">12.45s</td>
    const rowRegex = /<tr[^>]*>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*class="[^"]*numeric[^"]*"[^>]*>([^<]+)<\/td>/gi;
    let match: RegExpExecArray | null;
    while ((match = rowRegex.exec(trimmed)) !== null) {
      const name = match[1].trim();
      const durMs = parseDurationToMs(match[2].trim());
      if (durMs > 0 && (name.startsWith(':') || /configuring|resolving|execution/i.test(name))) {
        if (/total build time/i.test(name)) {
          reportedTotalMs = durMs;
        } else {
          rawTasks.push({ name, durationMs: durMs });
        }
      }
    }
  } else {
    // Parse plain-text Gradle logs / task summary lines:
    // Examples:
    // > Task :app:minifyReleaseWithR8 (38.40s)
    // :app:mergeDebugResources  14.20s
    // Task :app:compileDebugJavaWithJavac took 9.5s
    const lines = trimmed.split(/\r?\n/);
    for (const line of lines) {
      const clean = line.trim();
      if (!clean) continue;

      const pattern1 = clean.match(/^(?:>\s*Task\s+)?(:[a-zA-Z0-9_:-]+)\s+(?:took\s+)?(?:\()?(\d+(?:\.\d+)?\s*(?:ms|s)|(?:\d+\s*m\s*\d+(?:\.\d+)?\s*s))(?:\))?/i);
      if (pattern1) {
        const durMs = parseDurationToMs(pattern1[2]);
        if (durMs > 0) {
          rawTasks.push({ name: pattern1[1], durationMs: durMs });
          continue;
        }
      }

      const patternConfig = clean.match(/^(Configuration|Dependency resolution|Configuring projects)\s*[:\-]?\s*(\d+(?:\.\d+)?\s*(?:ms|s)|\d+\s*m\s*\d+(?:\.\d+)?\s*s)/i);
      if (patternConfig) {
        const durMs = parseDurationToMs(patternConfig[2]);
        if (durMs > 0) {
          rawTasks.push({ name: patternConfig[1], durationMs: durMs });
        }
      }
    }
  }

  // Aggregate duplicate task lines if any
  const taskMap = new Map<string, number>();
  for (const t of rawTasks) {
    taskMap.set(t.name, (taskMap.get(t.name) || 0) + t.durationMs);
  }

  const summedTaskMs = Array.from(taskMap.values()).reduce((acc, v) => acc + v, 0);
  const totalDurationMs = reportedTotalMs > 0 ? Math.max(reportedTotalMs, summedTaskMs) : summedTaskMs;

  const tasks: GradleTaskMetric[] = Array.from(taskMap.entries())
    .map(([taskName, durationMs], idx) => {
      const cat = categorizeTask(taskName);
      return {
        id: `task-${idx}-${taskName}`,
        taskName,
        durationMs,
        category: cat.category,
        categoryLabel: cat.label,
        percentOfTotal: totalDurationMs > 0 ? (durationMs / totalDurationMs) * 100 : 0,
      };
    })
    .sort((a, b) => b.durationMs - a.durationMs);

  // Category totals
  const catAccum = new Map<TaskCategory, { label: string; durationMs: number }>();
  for (const t of tasks) {
    const existing = catAccum.get(t.category);
    if (existing) {
      existing.durationMs += t.durationMs;
    } else {
      catAccum.set(t.category, { label: t.categoryLabel, durationMs: t.durationMs });
    }
  }

  const categoryTotals = Array.from(catAccum.entries())
    .map(([category, info]) => ({
      category,
      label: info.label,
      durationMs: info.durationMs,
      percent: totalDurationMs > 0 ? (info.durationMs / totalDurationMs) * 100 : 0,
    }))
    .sort((a, b) => b.durationMs - a.durationMs);

  // Build dynamic optimization recommendations from actual findings
  const recommendations: OptimizationAdvice[] = [];

  const r8Time = catAccum.get('r8-dex')?.durationMs || 0;
  if (r8Time > 10000 || (totalDurationMs > 0 && r8Time / totalDurationMs > 0.25)) {
    recommendations.push({
      id: 'opt-r8',
      priority: 'high',
      title: 'R8 / Dexing is your primary CPU & RAM bottleneck',
      reason: `R8/Dex tasks consumed ${formatDurationMs(r8Time)} (${((r8Time / (totalDurationMs || 1)) * 100).toFixed(0)}% of build time).`,
      action:
        'Keep minifyEnabled false on debug builds so R8 only runs on release, and enable incremental dexing + local build cache.',
      snippet: 'org.gradle.caching=true\norg.gradle.jvmargs=-Xmx1536m -XX:MaxMetaspaceSize=512m',
    });
  }

  const resTime = catAccum.get('resources-aapt2')?.durationMs || 0;
  if (resTime > 8000 || (totalDurationMs > 0 && resTime / totalDurationMs > 0.2)) {
    recommendations.push({
      id: 'opt-aapt2',
      priority: 'high',
      title: 'Resource Merging / AAPT2 takes significant time',
      reason: `Resource processing spent ${formatDurationMs(resTime)}.`,
      action:
        'Enable non-transitive R classes in gradle.properties and avoid running `./gradlew clean` before routine incremental builds.',
      snippet: 'android.nonTransitiveRClass=true\nandroid.nonFinalResIds=true',
    });
  }

  const configTime = catAccum.get('config-deps')?.durationMs || 0;
  if (configTime > 5000 || tasks.some((t) => /config/i.test(t.taskName))) {
    recommendations.push({
      id: 'opt-config',
      priority: 'medium',
      title: 'Reduce Gradle Configuration & Dependency Resolution Overhead',
      reason: `Configuration / dependency setup spent ${formatDurationMs(configTime)}.`,
      action:
        'Enable Gradle Configuration Cache and pass `--offline` in Termux once dependencies are cached.',
      snippet: 'org.gradle.configuration-cache=true\n# Run cached builds with:\n./gradlew assembleDebug --offline',
    });
  }

  if (tasks.some((t) => /lint/i.test(t.taskName))) {
    recommendations.push({
      id: 'opt-lint',
      priority: 'medium',
      title: 'Android Lint executed during APK build',
      reason: 'Running full lint checks inside build tasks significantly slows down local APK iteration.',
      action: 'Run lint separately in CI or pass `-x lint` during local debug builds.',
      snippet: './gradlew assembleDebug -x lint',
    });
  }

  if (recommendations.length === 0 && tasks.length > 0) {
    recommendations.push({
      id: 'opt-general',
      priority: 'info',
      title: 'Enable Gradle Build Cache & Configuration Cache for Incremental Gains',
      reason: 'Cached task outputs allow unchanged Capacitor/Android modules to skip recompilation.',
      action: 'Add build-cache and configuration-cache flags to ~/.gradle/gradle.properties.',
      snippet: 'org.gradle.caching=true\norg.gradle.configuration-cache=true',
    });
  }

  return {
    sourceType: isHtmlProfile ? 'gradle-html' : 'gradle-log',
    totalDurationMs,
    taskCount: tasks.length,
    tasks,
    categoryTotals,
    recommendations,
    buildOutcome,
  };
}
