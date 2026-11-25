import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Play, Copy, Check, Sparkles, RefreshCw } from 'lucide-react';
import { CRON_PRESETS, explainCron, computeNextOccurrences, CronPreset } from '../../utils/cronUtils';
import { getUnixSeconds, getUnixMillis, formatRelativeTimeFromNow } from '../../utils/timeUtils';
import { copyToClipboard } from '../../utils/clipboard';

interface CronTimeStudioProps {
  onNotify: (msg: string) => void;
}

export const CronTimeStudio: React.FC<CronTimeStudioProps> = ({ onNotify }) => {
  // Cron states
  const [cronExpression, setCronExpression] = useState('*/15 9-17 * * 1-5');
  const [cronExplanation, setCronExplanation] = useState({ explanation: '', isValid: true });
  const [nextOccurrences, setNextOccurrences] = useState<Date[]>([]);

  // Epoch states
  const [currentEpochSec, setCurrentEpochSec] = useState(getUnixSeconds());
  const [currentEpochMs, setCurrentEpochMs] = useState(getUnixMillis());
  const [epochInput, setEpochInput] = useState<string>(getUnixSeconds().toString());

  // Date input for 2-way conversion
  const [dateInput, setDateInput] = useState<string>(new Date().toISOString().slice(0, 16));

  const [copied, setCopied] = useState(false);

  // Update live clock
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentEpochSec(Math.floor(now.getTime() / 1000));
      setCurrentEpochMs(now.getTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update cron info
  useEffect(() => {
    const res = explainCron(cronExpression);
    setCronExplanation(res);
    if (res.isValid) {
      setNextOccurrences(computeNextOccurrences(cronExpression, 5));
    } else {
      setNextOccurrences([]);
    }
  }, [cronExpression]);

  // Compute Epoch to Date
  const parsedEpochNum = Number(epochInput.trim());
  let epochConvertedDate: Date | null = null;
  if (!isNaN(parsedEpochNum) && parsedEpochNum > 0) {
    // Check if seconds or millis
    const ms = parsedEpochNum > 10000000000 ? parsedEpochNum : parsedEpochNum * 1000;
    epochConvertedDate = new Date(ms);
  }

  // Compute Date to Epoch
  const handleDateChange = (val: string) => {
    setDateInput(val);
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      setEpochInput(Math.floor(d.getTime() / 1000).toString());
    }
  };

  const handleCopy = (text: string, label: string = 'Copied') => {
    void copyToClipboard(text);
    setCopied(true);
    onNotify(label);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadPreset = (preset: CronPreset) => {
    setCronExpression(preset.expression);
    onNotify(`Loaded ${preset.name} cron preset`);
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100">Cron & Epoch Master</h2>
          <p className="text-sm text-slate-400 mt-1">
            Build and validate 5-field cron schedules with next execution projections and 2-way Unix timestamp converter.
          </p>
        </div>

        {/* Live Clock Strip */}
        <div className="flex items-center gap-3 px-3.5 py-1.5 rounded-lg bg-neutral-900 border border-stone-800 font-mono text-xs text-slate-300">
          <span className="text-slate-500">Live Epoch:</span>
          <span className="font-bold text-emerald-400 tabular-nums">{currentEpochSec}</span>
          <button
            onClick={() => handleCopy(currentEpochSec.toString(), 'Copied current epoch')}
            className="text-slate-500 hover:text-slate-200"
            title="Copy current epoch"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Section 1: Cron Expression Builder */}
      <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-100">Cron Expression Visualizer</h3>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-500 mr-1">Presets:</span>
            {CRON_PRESETS.slice(0, 4).map((p) => (
              <button
                key={p.name}
                onClick={() => loadPreset(p)}
                className="px-2 py-1 text-[11px] font-medium rounded bg-neutral-950 border border-stone-800 text-slate-300 hover:bg-slate-800 transition-colors"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Big Cron Input */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={cronExpression}
              onChange={(e) => setCronExpression(e.target.value)}
              placeholder="* * * * *"
              className="flex-1 px-4 py-3 bg-neutral-950 border border-stone-800 rounded-lg text-lg font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={() => handleCopy(cronExpression, 'Copied cron expression')}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </button>
          </div>

          <div className="grid grid-cols-5 text-center text-[11px] font-mono text-slate-500 px-4">
            <span>minute (0-59)</span>
            <span>hour (0-23)</span>
            <span>day of month (1-31)</span>
            <span>month (1-12)</span>
            <span>day of week (0-6)</span>
          </div>
        </div>

        {/* Human Readable Explanation */}
        <div className="p-3.5 rounded-lg bg-amber-950/30 border border-amber-500/30/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-medium text-amber-200">{cronExplanation.explanation}</span>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
            {cronExplanation.isValid ? 'Valid Schedule' : 'Invalid'}
          </span>
        </div>

        {/* Next Occurrences Preview */}
        {nextOccurrences.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-stone-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Next 5 Projected Executions
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              {nextOccurrences.map((occ, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-neutral-950 border border-stone-800 font-mono text-xs">
                  <div className="text-[10px] text-slate-500 uppercase">Run #{idx + 1}</div>
                  <div className="text-slate-200 font-bold mt-0.5">{occ.toLocaleTimeString()}</div>
                  <div className="text-[11px] text-slate-400">{occ.toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Epoch & Timestamp 2-Way Converter */}
      <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-100">Unix Timestamp 2-Way Converter</h3>
          </div>
          <button
            onClick={() => {
              setEpochInput(getUnixSeconds().toString());
              setDateInput(new Date().toISOString().slice(0, 16));
              onNotify('Reset to current time');
            }}
            className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset to Now</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Input Epoch */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-300">Timestamp (Seconds or Milliseconds)</span>
            <input
              type="text"
              value={epochInput}
              onChange={(e) => setEpochInput(e.target.value)}
              placeholder="e.g. 1761564800"
              className="w-full px-3 py-2 bg-neutral-950 border border-stone-800 rounded-lg text-sm font-mono text-amber-300 focus:outline-none focus:border-amber-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setEpochInput(currentEpochSec.toString())}
                className="px-2.5 py-1 text-xs rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Set to Now (Sec)
              </button>
              <button
                onClick={() => setEpochInput(currentEpochMs.toString())}
                className="px-2.5 py-1 text-xs rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Set to Now (Ms)
              </button>
            </div>
          </div>

          {/* Right: Date Picker */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-300">Calendar & Local Time</span>
            <input
              type="datetime-local"
              value={dateInput}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-950 border border-stone-800 rounded-lg text-sm font-mono text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Converted Outputs Grid */}
        {epochConvertedDate && !isNaN(epochConvertedDate.getTime()) && (
          <div className="pt-4 border-t border-stone-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-neutral-950 border border-stone-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500">ISO 8601 UTC</span>
              <div className="text-xs font-mono text-emerald-400 break-all select-all">
                {epochConvertedDate.toISOString()}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-neutral-950 border border-stone-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500">Local Formatted</span>
              <div className="text-xs font-mono text-slate-200 break-all select-all">
                {epochConvertedDate.toLocaleString()}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-neutral-950 border border-stone-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500">Relative Time</span>
              <div className="text-xs font-mono text-amber-300 break-all">
                {formatRelativeTimeFromNow(epochConvertedDate.getTime())}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
