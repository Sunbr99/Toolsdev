import React, { useState, useEffect, useMemo, useRef } from 'react';
import { copyToClipboard } from '../../utils/clipboard';
import {
  Gauge,
  Upload,
  Copy,
  Check,
  Trash2,
  Plus,
  Clock,
  Zap,
  Terminal,
  FileCode,
  TrendingDown,
  CheckSquare,
  Square,
} from 'lucide-react';
import {
  analyzeGradleBuildOutput,
  formatDurationMs,
  SavedBuildRun,
} from '../../utils/gradleProfileAnalyzer';

interface BuildPerformanceStudioProps {
  onNotify: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const SAMPLE_SLOW_RELEASE = `Configuration: 11.4s
Dependency resolution: 6.8s
> Task :capacitor-android:compileReleaseJavaWithJavac (14.20s)
> Task :app:mergeReleaseResources (18.65s)
> Task :app:processReleaseResources (7.90s)
> Task :app:compileReleaseJavaWithJavac (8.15s)
> Task :app:lintVitalAnalyzeRelease (15.40s)
> Task :app:minifyReleaseWithR8 (44.80s)
> Task :app:stripReleaseDebugSymbols (3.10s)
> Task :app:packageRelease (6.25s)

BUILD SUCCESSFUL in 2m 16s`;

const SAMPLE_FAST_DEBUG = `Configuration: 1.8s
> Task :capacitor-android:compileDebugJavaWithJavac (1.10s)
> Task :app:mergeDebugResources (3.40s)
> Task :app:processDebugResources (1.55s)
> Task :app:compileDebugJavaWithJavac (2.30s)
> Task :app:dexBuilderDebug (4.20s)
> Task :app:packageDebug (2.15s)

BUILD SUCCESSFUL in 16s`;

const HISTORY_STORAGE_KEY = 'devforge_build_perf_history_v1';

export const BuildPerformanceStudio: React.FC<BuildPerformanceStudioProps> = ({ onNotify }) => {
  const [subTab, setSubTab] = useState<'analyzer' | 'history' | 'tuner'>('analyzer');
  const [rawLog, setRawLog] = useState(SAMPLE_SLOW_RELEASE);
  const [runLabel, setRunLabel] = useState('Baseline Release Build (Termux)');
  const [runVariant, setRunVariant] = useState<'debug' | 'release'>('release');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual run entry state
  const [manualLabel, setManualLabel] = useState('');
  const [manualSeconds, setManualSeconds] = useState('');
  const [manualVariant, setManualVariant] = useState<'debug' | 'release'>('debug');

  // Speed tuner toggles
  const [termuxRamCap, setTermuxRamCap] = useState(true);
  const [enableBuildCache, setEnableBuildCache] = useState(true);
  const [enableConfigCache, setEnableConfigCache] = useState(true);
  const [nonTransitiveR, setNonTransitiveR] = useState(true);
  const [singleArm64Dev, setSingleArm64Dev] = useState(true);

  const [history, setHistory] = useState<SavedBuildRun[]>(() => {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch { /* ignore */ }
  }, [history]);

  const analysis = useMemo(() => analyzeGradleBuildOutput(rawLog), [rawLog]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      setRawLog(content);
      setRunLabel(file.name.replace(/\.(html|log|txt)$/i, ''));
      onNotify(`Loaded ${file.name}`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSaveParsedRun = () => {
    if (analysis.totalDurationMs <= 0) {
      onNotify('No valid build timings detected to save', 'error');
      return;
    }
    const newRun: SavedBuildRun = {
      id: Math.random().toString(36).slice(2, 9),
      timestamp: new Date().toLocaleString(),
      label: runLabel.trim() || 'Gradle APK Build',
      variant: runVariant,
      totalDurationMs: analysis.totalDurationMs,
      topBottleneck: analysis.tasks[0]?.taskName || 'N/A',
      taskCount: analysis.taskCount,
    };
    setHistory((prev) => [newRun, ...prev]);
    onNotify(`Saved build benchmark (${formatDurationMs(newRun.totalDurationMs)})`);
  };

  const handleAddManualRun = (e: React.FormEvent) => {
    e.preventDefault();
    const secs = parseFloat(manualSeconds);
    if (!manualLabel.trim() || Number.isNaN(secs) || secs <= 0) {
      onNotify('Enter a valid label and duration in seconds', 'error');
      return;
    }
    const newRun: SavedBuildRun = {
      id: Math.random().toString(36).slice(2, 9),
      timestamp: new Date().toLocaleString(),
      label: manualLabel.trim(),
      variant: manualVariant,
      totalDurationMs: secs * 1000,
      topBottleneck: 'Manual entry',
      taskCount: 0,
    };
    setHistory((prev) => [newRun, ...prev]);
    setManualLabel('');
    setManualSeconds('');
    onNotify('Logged manual build duration');
  };

  const handleCopy = (text: string, id: string, label: string) => {
    void copyToClipboard(text);
    setCopiedId(id);
    onNotify(`Copied ${label}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const generatedGradleProperties = useMemo(() => {
    const lines: string[] = ['# Optimized Gradle Build Configuration'];
    if (termuxRamCap) {
      lines.push(
        '# Safe RAM cap for Termux / 6-8GB Android devices',
        'org.gradle.jvmargs=-Xmx1536m -XX:MaxMetaspaceSize=512m',
        'org.gradle.daemon=false',
        'org.gradle.parallel=false',
        'android.aapt2FromMaven=false'
      );
    } else {
      lines.push(
        'org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m',
        'org.gradle.parallel=true'
      );
    }
    if (enableBuildCache) lines.push('org.gradle.caching=true');
    if (enableConfigCache) lines.push('org.gradle.configuration-cache=true');
    if (nonTransitiveR) {
      lines.push('android.nonTransitiveRClass=true', 'android.nonFinalResIds=true');
    }
    return lines.join('\n');
  }, [termuxRamCap, enableBuildCache, enableConfigCache, nonTransitiveR]);

  const abiFilterSnippet = `// android/app/build.gradle (for fast local dev builds)
android {
    defaultConfig {
        if (project.hasProperty('devAbi')) {
            ndk {
                abiFilters project.property('devAbi')
            }
        }
    }
}

// Run fast single-ABI debug build + generate profile report:
// ./gradlew assembleDebug -PdevAbi=arm64-v8a -x lint --profile`;

  const fastestRunMs = useMemo(() => {
    if (history.length === 0) return 0;
    return Math.min(...history.map((h) => h.totalDurationMs));
  }, [history]);

  const baselineRunMs = history.length > 0 ? history[history.length - 1].totalDurationMs : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold tracking-tight text-slate-100">
              Build Performance Monitor
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Analyze Gradle build logs and --profile HTML reports to pinpoint slow R8, AAPT2, and compilation bottlenecks, benchmark iterations, and tune Gradle speed.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-lg border border-stone-800 shrink-0">
          <button
            onClick={() => setSubTab('analyzer')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              subTab === 'analyzer' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Profile &amp; Log Analyzer
          </button>
          <button
            onClick={() => setSubTab('history')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              subTab === 'history' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Build History ({history.length})
          </button>
          <button
            onClick={() => setSubTab('tuner')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              subTab === 'tuner' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Gradle Speed Tuner
          </button>
        </div>
      </div>

      {/* Subtab 1: Profile & Log Analyzer */}
      {subTab === 'analyzer' && (
        <div className="space-y-6">
          <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                Paste Gradle output or upload <code className="font-mono text-amber-300">build/reports/profile/profile-*.html</code>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".html,.log,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs font-semibold transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Profile / Log</span>
                </button>
                <button
                  onClick={() => {
                    setRawLog(SAMPLE_SLOW_RELEASE);
                    setRunLabel('Slow Release APK (Baseline)');
                    setRunVariant('release');
                    onNotify('Loaded slow release APK profile');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
                >
                  Slow Release Sample
                </button>
                <button
                  onClick={() => {
                    setRawLog(SAMPLE_FAST_DEBUG);
                    setRunLabel('Cached Debug Build');
                    setRunVariant('debug');
                    onNotify('Loaded fast incremental debug log');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
                >
                  Fast Debug Sample
                </button>
              </div>
            </div>

            <textarea
              value={rawLog}
              onChange={(e) => setRawLog(e.target.value)}
              rows={7}
              spellCheck={false}
              placeholder="Paste output from `./gradlew assembleDebug --profile` or upload `profile-*.html`..."
              className="w-full p-3 rounded-lg bg-neutral-950 border border-stone-800 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 leading-relaxed"
            />

            {/* Save Run Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
              <input
                type="text"
                value={runLabel}
                onChange={(e) => setRunLabel(e.target.value)}
                placeholder="Label this run (e.g. With build cache)"
                className="flex-1 px-3 py-1.5 rounded-lg bg-neutral-950 border border-stone-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
              <div className="flex items-center gap-1 p-1 bg-neutral-950 rounded-lg border border-stone-800 w-fit">
                {(['debug', 'release'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setRunVariant(v)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded capitalize ${
                      runVariant === v ? 'bg-amber-500 text-neutral-950' : 'text-slate-400'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <button
                onClick={handleSaveParsedRun}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save Build Run</span>
              </button>
            </div>
          </div>

          {analysis.taskCount > 0 ? (
            <div className="space-y-6">
              {/* Top Metric Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-neutral-900 border border-stone-800">
                  <div className="text-xs text-slate-400">Total Build Time</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-100 mt-1">
                    {formatDurationMs(analysis.totalDurationMs)}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-neutral-900 border border-stone-800">
                  <div className="text-xs text-slate-400">Tasks Analyzed</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-100 mt-1">
                    {analysis.taskCount}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-neutral-900 border border-stone-800">
                  <div className="text-xs text-slate-400">Heaviest Phase</div>
                  <div className="text-sm font-bold text-amber-300 mt-2 truncate">
                    {analysis.categoryTotals[0]?.label || 'N/A'}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-neutral-900 border border-stone-800">
                  <div className="text-xs text-slate-400">Slowest Single Task</div>
                  <div className="text-xs font-mono font-bold text-rose-300 mt-2 truncate">
                    {analysis.tasks[0]?.taskName || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Phase Breakdown + Task Ranking */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Category Breakdown */}
                <div className="lg:col-span-5 rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-4">
                  <h3 className="text-sm font-bold text-slate-100">Time by Build Phase</h3>
                  <div className="space-y-3.5">
                    {analysis.categoryTotals.map((cat) => (
                      <div key={cat.category} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-200">{cat.label}</span>
                          <span className="font-mono tabular-nums text-slate-400">
                            {formatDurationMs(cat.durationMs)} ({cat.percent.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-neutral-950 border border-stone-800 overflow-hidden">
                          <div
                            className="h-full bg-indigo-500"
                            style={{ width: `${Math.min(100, cat.percent)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ranked Slowest Tasks */}
                <div className="lg:col-span-7 rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-4">
                  <h3 className="text-sm font-bold text-slate-100">Slowest Gradle Tasks</h3>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {analysis.tasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-3 rounded-lg bg-neutral-950 border border-stone-800 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <code className="text-xs font-mono text-slate-100 truncate">
                            {task.taskName}
                          </code>
                          <span className="text-xs font-mono font-bold tabular-nums text-amber-300 shrink-0">
                            {formatDurationMs(task.durationMs)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                          <span>{task.categoryLabel}</span>
                          <span className="font-mono tabular-nums">{task.percentOfTotal.toFixed(1)}% of total</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Optimization Recommendations */}
              <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-slate-100">
                    Targeted Speed Optimizations
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysis.recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-4 rounded-lg bg-neutral-950 border border-stone-800 space-y-2 flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-slate-100">{rec.title}</span>
                          <span
                            className={`text-xs font-mono font-bold uppercase ${
                              rec.priority === 'high'
                                ? 'text-rose-400'
                                : rec.priority === 'medium'
                                ? 'text-amber-400'
                                : 'text-sky-400'
                            }`}
                          >
                            {rec.priority}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{rec.reason}</p>
                        <p className="text-xs text-slate-200 leading-relaxed">{rec.action}</p>
                      </div>

                      {rec.snippet && (
                        <div className="relative pt-2">
                          <pre className="p-2.5 rounded bg-neutral-900 border border-stone-800 text-xs font-mono text-emerald-300 overflow-x-auto">
                            <code>{rec.snippet}</code>
                          </pre>
                          <button
                            onClick={() => handleCopy(rec.snippet || '', rec.id, 'optimization snippet')}
                            className="absolute right-2 top-4 p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                            title="Copy snippet"
                          >
                            {copiedId === rec.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-neutral-900 border border-stone-800 text-center text-xs text-slate-400">
              No timed Gradle tasks found in input. Run <code className="font-mono text-amber-300">./gradlew assembleDebug --profile</code> and paste the log or upload the generated HTML report.
            </div>
          )}
        </div>
      )}

      {/* Subtab 2: Build History Tracker */}
      {subTab === 'history' && (
        <div className="space-y-6">
          <form
            onSubmit={handleAddManualRun}
            className="rounded-xl bg-neutral-900 border border-stone-800 p-5 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
          >
            <div className="sm:col-span-5 space-y-1">
              <label className="text-xs font-semibold text-slate-400">Build Label</label>
              <input
                type="text"
                value={manualLabel}
                onChange={(e) => setManualLabel(e.target.value)}
                placeholder="e.g. Enabled configuration-cache"
                className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-stone-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="sm:col-span-3 space-y-1">
              <label className="text-xs font-semibold text-slate-400">Duration (Seconds)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={manualSeconds}
                onChange={(e) => setManualSeconds(e.target.value)}
                placeholder="e.g. 42.5"
                className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-stone-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-400">Variant</label>
              <select
                value={manualVariant}
                onChange={(e) => setManualVariant(e.target.value as 'debug' | 'release')}
                className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-stone-800 text-xs text-slate-200 focus:outline-none"
              >
                <option value="debug">debug</option>
                <option value="release">release</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs font-semibold transition-colors"
              >
                Log Run
              </button>
            </div>
          </form>

          {history.length > 0 ? (
            <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-800">
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono tabular-nums">
                  <span>Runs: {history.length}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-400">Fastest: {formatDurationMs(fastestRunMs)}</span>
                  <span aria-hidden="true">·</span>
                  <span>First Baseline: {formatDurationMs(baselineRunMs)}</span>
                </div>
                <button
                  onClick={() => {
                    setHistory([]);
                    onNotify('Cleared build history', 'info');
                  }}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {history.map((run) => {
                  const deltaPct =
                    baselineRunMs > 0
                      ? ((run.totalDurationMs - baselineRunMs) / baselineRunMs) * 100
                      : 0;
                  return (
                    <div
                      key={run.id}
                      className="p-3.5 rounded-lg bg-neutral-950 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-sm font-bold text-slate-100">{run.label}</span>
                          <span className="text-xs font-mono text-slate-400 uppercase">{run.variant}</span>
                        </div>
                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                          <span>{run.timestamp}</span>
                          <span aria-hidden="true">·</span>
                          <span>Bottleneck: {run.topBottleneck}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {baselineRunMs > 0 && run.totalDurationMs !== baselineRunMs && (
                          <span
                            className={`flex items-center gap-1 text-xs font-mono tabular-nums ${
                              deltaPct < 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            <TrendingDown className="w-3.5 h-3.5" />
                            <span>
                              {deltaPct < 0 ? `${Math.abs(deltaPct).toFixed(0)}% faster` : `+${deltaPct.toFixed(0)}% slower`}
                            </span>
                          </span>
                        )}
                        <span className="text-base font-bold font-mono tabular-nums text-slate-100">
                          {formatDurationMs(run.totalDurationMs)}
                        </span>
                        <button
                          onClick={() => setHistory((prev) => prev.filter((r) => r.id !== run.id))}
                          className="p-1.5 rounded bg-neutral-900 hover:bg-slate-800 text-slate-500 hover:text-rose-400"
                          title="Delete run"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-10 rounded-xl bg-neutral-900 border border-stone-800 text-center text-xs text-slate-500">
              No build runs saved yet. Analyze a Gradle log or log a run manually above to track build speed improvements over time.
            </div>
          )}
        </div>
      )}

      {/* Subtab 3: Gradle Speed Tuner */}
      {subTab === 'tuner' && (
        <div className="space-y-6">
          <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-100">Speed Tuning Profile</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {[
                [termuxRamCap, setTermuxRamCap, 'Termux Safe RAM Cap (1.5GB + aapt2 ARM64)'],
                [enableBuildCache, setEnableBuildCache, 'Enable Gradle Build Cache'],
                [enableConfigCache, setEnableConfigCache, 'Enable Configuration Cache'],
                [nonTransitiveR, setNonTransitiveR, 'Non-Transitive R Classes'],
                [singleArm64Dev, setSingleArm64Dev, 'Single-ABI Dev Build Snippet'],
              ].map(([val, setter, label], idx) => (
                <button
                  key={idx}
                  onClick={() => (setter as React.Dispatch<React.SetStateAction<boolean>>)(!val)}
                  className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-colors ${
                    val
                      ? 'bg-amber-950/35 border-amber-500/60 text-slate-100'
                      : 'bg-neutral-950 border-stone-800 text-slate-400'
                  }`}
                >
                  {val ? (
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
            <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
                  <FileCode className="w-4 h-4 text-amber-400" />
                  <span>~/.gradle/gradle.properties</span>
                </div>
                <button
                  onClick={() => handleCopy(generatedGradleProperties, 'tuner-props', 'gradle.properties')}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-semibold text-white"
                >
                  {copiedId === 'tuner-props' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Config</span>
                </button>
              </div>
              <pre className="p-3.5 rounded-lg bg-neutral-950 border border-stone-800 text-xs font-mono text-amber-200 overflow-x-auto leading-relaxed">
                <code>{generatedGradleProperties}</code>
              </pre>
            </div>

            {singleArm64Dev && (
              <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span>Dev ABI Filter &amp; Profile Benchmark</span>
                  </div>
                  <button
                    onClick={() => handleCopy(abiFilterSnippet, 'tuner-abi', 'ABI filter snippet')}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200"
                  >
                    {copiedId === 'tuner-abi' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy</span>
                  </button>
                </div>
                <pre className="p-3.5 rounded-lg bg-neutral-950 border border-stone-800 text-xs font-mono text-emerald-200 overflow-x-auto leading-relaxed">
                  <code>{abiFilterSnippet}</code>
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
