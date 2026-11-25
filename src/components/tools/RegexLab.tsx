import React, { useState } from 'react';
import { Search, Copy, Check, BookOpen, Replace, Info, Sparkles } from 'lucide-react';
import { REGEX_PRESETS, RegexPreset, executeRegex, explainRegexTokens } from '../../utils/regexPresets';
import { copyToClipboard } from '../../utils/clipboard';

interface RegexLabProps {
  onNotify: (msg: string) => void;
}

export const RegexLab: React.FC<RegexLabProps> = ({ onNotify }) => {
  const [pattern, setPattern] = useState<string>('([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})');
  const [flags, setFlags] = useState<string>('gi');
  const [testString, setTestString] = useState<string>(
    'Contact the engineering leads at alex.vance@blackmesa.org or somchai.p@techcorp.co.th for cluster access.\nSecondary support: support@devforge.io'
  );
  const [replacementString, setReplacementString] = useState<string>('[$1 at $2]');
  const [showReplace, setShowReplace] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  // Toggle flag helper
  const toggleFlag = (flagChar: string) => {
    if (flags.includes(flagChar)) {
      setFlags(flags.replace(flagChar, ''));
    } else {
      setFlags(flags + flagChar);
    }
  };

  const { matches, error: regexError } = executeRegex(pattern, flags, testString);
  const tokenExplanations = explainRegexTokens(pattern);

  // Compute replacement result
  let replacedResult = '';
  try {
    const reg = new RegExp(pattern, flags);
    replacedResult = testString.replace(reg, replacementString);
  } catch (err) {
    replacedResult = (err as Error).message;
  }

  const loadPreset = (preset: RegexPreset) => {
    setPattern(preset.pattern);
    setFlags(preset.flags);
    setTestString(preset.sampleText);
    onNotify(`Loaded "${preset.name}" preset`);
  };

  const handleCopy = (text: string, label: string = 'Copied') => {
    void copyToClipboard(text);
    setCopied(true);
    onNotify(label);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100">Regex Visual Lab & Explainer</h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time regex engine with captured group inspection, live substitution, and production preset library.
          </p>
        </div>

        <button
          onClick={() => handleCopy(`/${pattern}/${flags}`, 'Copied regular expression')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-neutral-900 border border-stone-800 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>Copy Regex</span>
        </button>
      </div>

      {/* Pattern Bar & Flags */}
      <div className="p-4 rounded-xl bg-neutral-900 border border-stone-800 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-mono text-slate-500 font-bold select-none">/</span>
          <input
            type="text"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="Type regex pattern (e.g. [a-z0-9]+)..."
            className="flex-1 bg-neutral-950 px-3.5 py-2.5 rounded-lg border border-stone-800 font-mono text-sm text-amber-300 focus:outline-none focus:border-amber-500"
          />
          <span className="text-lg font-mono text-slate-500 font-bold select-none">/</span>
          <span className="font-mono text-xs font-bold text-amber-400 w-8">{flags}</span>

          {/* Flag Toggle Buttons */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-stone-800">
            {[
              { flag: 'g', title: 'Global' },
              { flag: 'i', title: 'Ignore Case' },
              { flag: 'm', title: 'Multiline' },
              { flag: 's', title: 'DotAll' },
              { flag: 'u', title: 'Unicode' },
            ].map(({ flag, title }) => (
              <button
                key={flag}
                onClick={() => toggleFlag(flag)}
                title={title}
                className={`px-2 py-1 text-xs font-mono font-bold rounded transition-colors ${
                  flags.includes(flag) ? 'bg-amber-500 text-neutral-950' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {flag}
              </button>
            ))}
          </div>
        </div>

        {regexError && (
          <div className="text-xs text-rose-400 font-mono">
            Regex Syntax Error: {regexError}
          </div>
        )}
      </div>

      {/* Main Grid: Test String & Matches / Substitution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left: Test String Input */}
        <div className="flex flex-col rounded-xl bg-neutral-900 border border-stone-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800 bg-neutral-950/40">
            <span className="text-xs font-bold text-slate-300">Test String</span>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span>{matches.length} match{matches.length !== 1 ? 'es' : ''} found</span>
            </div>
          </div>

          <div className="p-4 flex-1 flex flex-col bg-neutral-950">
            <textarea
              value={testString}
              onChange={(e) => setTestString(e.target.value)}
              placeholder="Enter text to match against..."
              rows={8}
              className="w-full flex-1 bg-transparent border-0 font-mono text-xs text-slate-200 leading-relaxed resize-none focus:outline-none"
            />
          </div>
        </div>

        {/* Right: Matches Inspector */}
        <div className="flex flex-col rounded-xl bg-neutral-900 border border-stone-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800 bg-neutral-950/40">
            <span className="text-xs font-bold text-slate-300">Captured Matches</span>
            <button
              onClick={() => setShowReplace(!showReplace)}
              className="text-xs text-amber-400 hover:underline flex items-center gap-1"
            >
              <Replace className="w-3.5 h-3.5" />
              <span>{showReplace ? 'Hide Replace' : 'Show Replace'}</span>
            </button>
          </div>

          <div className="p-4 flex-1 bg-neutral-950 overflow-y-auto max-h-80 space-y-2.5">
            {matches.length === 0 ? (
              <div className="text-xs text-slate-500 py-6 text-center">
                No matches found with current pattern and flags.
              </div>
            ) : (
              matches.map((m, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-neutral-900 border border-stone-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-emerald-400">
                      Match {idx + 1} <span className="text-[11px] text-slate-500 font-normal">at index {m.index}</span>
                    </span>
                    <button
                      onClick={() => handleCopy(m.match, `Copied match ${idx + 1}`)}
                      className="text-slate-500 hover:text-amber-300"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="font-mono text-xs text-slate-200 bg-neutral-950 p-1.5 rounded break-all">
                    "{m.match}"
                  </div>

                  {m.groups.length > 0 && (
                    <div className="pt-1 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Capture Groups:</span>
                      {m.groups.map((g, gIdx) => (
                        <div key={gIdx} className="flex items-center gap-2 text-xs font-mono">
                          <span className="text-amber-400 text-[11px]">Group {gIdx + 1}:</span>
                          <span className="text-slate-300 break-all">"{g}"</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Substitution / Replace Sandbox */}
      {showReplace && (
        <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Replace className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Regex Substitution / Replace Preview
              </h3>
            </div>
            <button
              onClick={() => handleCopy(replacedResult, 'Copied replacement result')}
              className="text-xs text-amber-400 hover:underline flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              <span>Copy Replaced Text</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Replacement:</span>
            <input
              type="text"
              value={replacementString}
              onChange={(e) => setReplacementString(e.target.value)}
              placeholder="e.g. [$1 at $2] or Redacted"
              className="flex-1 px-3 py-1.5 bg-neutral-950 border border-stone-800 rounded text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <pre className="p-3 rounded-lg bg-neutral-950 border border-stone-800 text-xs font-mono text-slate-200 leading-relaxed overflow-x-auto">
            <code>{replacedResult}</code>
          </pre>
        </div>
      )}

      {/* Production Preset Library & Token Explainer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Presets Library */}
        <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Production Regex Library</h3>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {REGEX_PRESETS.map((p) => (
              <div
                key={p.name}
                onClick={() => loadPreset(p)}
                className="p-2.5 rounded-lg bg-neutral-950/70 border border-stone-800 hover:border-amber-500/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">{p.name}</span>
                  <span className="text-[10px] text-amber-400 font-mono">{p.category}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">{p.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Token Explainer */}
        <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Pattern Token Breakdown</h3>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {tokenExplanations.length === 0 ? (
              <div className="text-xs text-slate-500 py-6 text-center">
                Type standard regex tokens to see breakdown rules.
              </div>
            ) : (
              tokenExplanations.map((t, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2 rounded bg-neutral-950 border border-stone-800/80">
                  <code className="text-xs font-mono font-bold text-amber-400 bg-amber-950/50 px-1.5 py-0.5 rounded shrink-0">
                    {t.token}
                  </code>
                  <span className="text-xs text-slate-300">{t.explanation}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
