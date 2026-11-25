import React, { useState } from 'react';
import { copyToClipboard } from '../../utils/clipboard';
import { Wand2, Copy, Check, FileJson, ArrowRight, Layers, Split, Filter, Download } from 'lucide-react';
import {
  repairJsonString,
  formatJson,
  minifyJson,
  jsonToTypeScript,
  jsonToZod,
  jsonToGoStruct,
  jsonToPydantic,
  computeJsonDiff,
  evaluateJsonPath,
  DiffItem,
} from '../../utils/jsonUtils';

interface JsonSchemaArchitectProps {
  onNotify: (msg: string) => void;
}

type Mode = 'convert' | 'repair' | 'diff' | 'jsonpath';
type TargetLang = 'typescript' | 'zod' | 'go' | 'pydantic';

const SAMPLE_JSON = `{
  "userId": "usr_9921",
  "name": "Kanya Sukhumvit",
  "email": "kanya.s@cloudnative.th",
  "activeSubscription": true,
  "pricingTier": "enterprise",
  "quota": {
    "apiRequestsPerMin": 5000,
    "allocatedStorageGb": 250.5
  },
  "roles": ["workspace_admin", "billing_manager"],
  "projects": [
    {
      "id": "proj_01",
      "name": "Bangkok Realtime Telemetry",
      "status": "deployed"
    }
  ]
}`;

export const JsonSchemaArchitect: React.FC<JsonSchemaArchitectProps> = ({ onNotify }) => {
  const [mode, setMode] = useState<Mode>('convert');
  const [jsonInput, setJsonInput] = useState<string>(SAMPLE_JSON);
  const [targetLang, setTargetLang] = useState<TargetLang>('typescript');
  const [rootTypeName, setRootTypeName] = useState('UserProfile');
  const [copied, setCopied] = useState(false);

  // Diff inputs
  const [diffOriginal, setDiffOriginal] = useState(
    JSON.stringify({ id: 1, name: 'Alice', role: 'developer', status: 'active', tags: ['ts', 'react'] }, null, 2)
  );
  const [diffModified, setDiffModified] = useState(
    JSON.stringify({ id: 1, name: 'Alice Smith', role: 'staff-developer', status: 'active', tags: ['ts', 'react', 'go'], level: 'L6' }, null, 2)
  );

  // JSONPath inputs
  const [jsonPathQuery, setJsonPathQuery] = useState('projects[0].name');

  // Handle auto repair
  const handleAutoRepair = () => {
    try {
      const repaired = repairJsonString(jsonInput);
      setJsonInput(repaired);
      onNotify('Auto-repaired invalid JSON & standardized syntax');
    } catch {
      onNotify('Could not repair JSON automatically');
    }
  };

  const handleFormat = (spaces: number) => {
    try {
      const formatted = formatJson(jsonInput, spaces);
      setJsonInput(formatted);
      onNotify(`Formatted JSON with ${spaces} spaces`);
    } catch (e) {
      onNotify('Invalid JSON: ' + (e as Error).message);
    }
  };

  const handleMinify = () => {
    try {
      const minified = minifyJson(jsonInput);
      setJsonInput(minified);
      onNotify('Minified JSON string');
    } catch (e) {
      onNotify('Invalid JSON: ' + (e as Error).message);
    }
  };

  // Generate code
  const getGeneratedCode = (): string => {
    try {
      const parsed = JSON.parse(jsonInput);
      switch (targetLang) {
        case 'typescript':
          return jsonToTypeScript(parsed, rootTypeName);
        case 'zod':
          return jsonToZod(parsed, `${rootTypeName.toLowerCase()}Schema`);
        case 'go':
          return jsonToGoStruct(parsed, rootTypeName);
        case 'pydantic':
          return jsonToPydantic(parsed, rootTypeName);
      }
    } catch (err) {
      return `// Error parsing JSON input: ${(err as Error).message}\n// Click "Auto-Repair & Clean" above if syntax has single-quotes or unquoted keys.`;
    }
  };

  const handleCopyCode = (text: string) => {
    void copyToClipboard(text);
    setCopied(true);
    onNotify('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  // Compute diffs
  let diffResults: DiffItem[] = [];
  let diffError = '';
  try {
    const o = JSON.parse(diffOriginal);
    const m = JSON.parse(diffModified);
    diffResults = computeJsonDiff(o, m);
  } catch (err) {
    diffError = (err as Error).message;
  }

  // Compute JSONPath
  let jsonPathResult: unknown = undefined;
  let jsonPathError = '';
  try {
    const parsed = JSON.parse(jsonInput);
    jsonPathResult = evaluateJsonPath(parsed, jsonPathQuery);
  } catch (err) {
    jsonPathError = (err as Error).message;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100">JSON & Type Architect</h2>
          <p className="text-sm text-slate-400 mt-1">
            Format, auto-repair broken payloads, and generate strict TypeScript interfaces, Zod schemas, Go structs, and Pydantic models.
          </p>
        </div>

        {/* Sub-modes tabs */}
        <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-lg border border-stone-800 shrink-0">
          <button
            onClick={() => setMode('convert')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              mode === 'convert' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Types & Schema
          </button>
          <button
            onClick={() => setMode('repair')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              mode === 'repair' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Format & Repair
          </button>
          <button
            onClick={() => setMode('diff')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              mode === 'diff' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Visual Diff
          </button>
          <button
            onClick={() => setMode('jsonpath')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              mode === 'jsonpath' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            JSONPath Filter
          </button>
        </div>
      </div>

      {/* Mode 1 & 2: Type Architect & Formatter */}
      {(mode === 'convert' || mode === 'repair') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Left: Input JSON */}
          <div className="flex flex-col rounded-xl bg-neutral-900 border border-stone-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800 bg-neutral-950/40">
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-300">JSON Input</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleAutoRepair}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-300 bg-amber-950/60 border border-amber-500/30/80 rounded hover:bg-amber-900/80 transition-colors"
                  title="Fix unquoted keys, single quotes, trailing commas"
                >
                  <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Auto-Repair</span>
                </button>
                <button
                  onClick={() => handleFormat(2)}
                  className="px-2 py-1 text-xs rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  2 Space
                </button>
                <button
                  onClick={handleMinify}
                  className="px-2 py-1 text-xs rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Minify
                </button>
              </div>
            </div>

            <div className="p-4 flex-1 flex flex-col bg-neutral-950">
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder="Paste JSON (or even sloppy Python dict with single quotes / trailing commas)..."
                rows={16}
                className="w-full flex-1 bg-transparent border-0 font-mono text-xs text-slate-200 leading-relaxed resize-none focus:outline-none"
              />
            </div>
          </div>

          {/* Right: Output (Code or Formatted View) */}
          <div className="flex flex-col rounded-xl bg-neutral-900 border border-stone-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-800 bg-neutral-950/40">
              {mode === 'convert' ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {(['typescript', 'zod', 'go', 'pydantic'] as TargetLang[]).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setTargetLang(lang)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                          targetLang === lang
                            ? 'bg-amber-500 text-neutral-950'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        {lang === 'typescript'
                          ? 'TypeScript'
                          : lang === 'zod'
                          ? 'Zod Schema'
                          : lang === 'go'
                          ? 'Go Struct'
                          : 'Python Pydantic'}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={rootTypeName}
                    onChange={(e) => setRootTypeName(e.target.value)}
                    placeholder="Type Name"
                    className="w-28 px-2 py-0.5 text-xs font-mono bg-neutral-950 border border-stone-800 rounded text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              ) : (
                <span className="text-xs font-bold text-slate-300">Clean Formatted Output</span>
              )}

              <button
                onClick={() => handleCopyCode(mode === 'convert' ? getGeneratedCode() : jsonInput)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="p-4 flex-1 flex flex-col bg-neutral-950 overflow-auto">
              <pre className="text-xs font-mono text-amber-200 leading-relaxed">
                <code>{mode === 'convert' ? getGeneratedCode() : jsonInput}</code>
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Mode 3: JSON Diff */}
      {mode === 'diff' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-400">Original JSON (A)</span>
              <textarea
                value={diffOriginal}
                onChange={(e) => setDiffOriginal(e.target.value)}
                rows={8}
                className="w-full bg-neutral-950 p-3 rounded-lg border border-stone-800 font-mono text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-400">Modified JSON (B)</span>
              <textarea
                value={diffModified}
                onChange={(e) => setDiffModified(e.target.value)}
                rows={8}
                className="w-full bg-neutral-950 p-3 rounded-lg border border-stone-800 font-mono text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="rounded-xl bg-neutral-900 border border-stone-800 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Diff Analysis</h4>
            {diffError ? (
              <div className="text-xs text-rose-400">{diffError}</div>
            ) : diffResults.length === 0 ? (
              <div className="text-xs text-slate-500">Both payloads are identical.</div>
            ) : (
              <div className="space-y-2">
                {diffResults.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start justify-between p-2.5 rounded-lg font-mono text-xs ${
                      item.type === 'added'
                        ? 'bg-emerald-950/30 border border-emerald-800/40 text-emerald-300'
                        : item.type === 'removed'
                        ? 'bg-rose-950/30 border border-rose-800/40 text-rose-300'
                        : item.type === 'changed'
                        ? 'bg-amber-950/30 border border-amber-800/40 text-amber-300'
                        : 'bg-neutral-950 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded bg-black/40">
                        {item.type}
                      </span>
                      <span>{item.path}</span>
                    </div>

                    <div className="text-right">
                      {item.type === 'changed' && (
                        <span>
                          <del className="opacity-70 mr-2">{JSON.stringify(item.oldValue)}</del>
                          <ins className="no-underline font-semibold">{JSON.stringify(item.newValue)}</ins>
                        </span>
                      )}
                      {item.type === 'added' && <span>+{JSON.stringify(item.newValue)}</span>}
                      {item.type === 'removed' && <span>-{JSON.stringify(item.oldValue)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mode 4: JSONPath */}
      {mode === 'jsonpath' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Filter className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={jsonPathQuery}
                onChange={(e) => setJsonPathQuery(e.target.value)}
                placeholder="Query path, e.g. projects[0].name or quota.allocatedStorageGb..."
                className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-stone-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
            <button
              onClick={() => {
                if (jsonPathResult !== undefined) {
                  void copyToClipboard(JSON.stringify(jsonPathResult, null, 2));
                  onNotify('Copied query result');
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Result</span>
            </button>
          </div>

          <div className="rounded-xl bg-neutral-900 border border-stone-800 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
              Result for "{jsonPathQuery}"
            </span>
            {jsonPathError ? (
              <div className="text-xs text-rose-400">{jsonPathError}</div>
            ) : (
              <pre className="p-3 rounded-lg bg-neutral-950 border border-stone-800 text-xs font-mono text-emerald-300 overflow-x-auto">
                <code>
                  {jsonPathResult === undefined
                    ? 'undefined'
                    : typeof jsonPathResult === 'object'
                    ? JSON.stringify(jsonPathResult, null, 2)
                    : String(jsonPathResult)}
                </code>
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
