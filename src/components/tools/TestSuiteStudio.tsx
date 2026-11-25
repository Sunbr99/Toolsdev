import React, { useState, useMemo, useRef } from 'react';
import { copyToClipboard } from '../../utils/clipboard';
import {
  FlaskConical,
  Upload,
  Copy,
  Check,
  Download,
  CheckSquare,
  Square,
  Code2,
  Trash2,
} from 'lucide-react';
import {
  parseCodeStructure,
  generateTestSuite,
  TestRunner,
} from '../../utils/testGenerator';

interface TestSuiteStudioProps {
  onNotify: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const SAMPLE_REACT_COMPONENT = `import React, { useState } from 'react';

export interface LoginFormProps {
  title: string;
  defaultEmail?: string;
  isLoading: boolean;
  errorMessage?: string;
  onSubmit: (email: string, password: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  title,
  defaultEmail = '',
  isLoading,
  errorMessage,
  onSubmit,
}) => {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(email, password); }}>
      <h2>{title}</h2>
      {errorMessage && <div role="alert">{errorMessage}</div>}
      <input
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit" disabled={isLoading}>
        Sign In
      </button>
    </form>
  );
};`;

const SAMPLE_INTERFACE_ONLY = `export interface OrderSummaryProps {
  orderId: string;
  variant: 'compact' | 'detailed';
  itemCount: number;
  isPaid: boolean;
  items: string[];
  onRetryPayment?: () => void;
  onDownloadReceipt: (orderId: string) => void;
}`;

const SAMPLE_TS_UTILS = `export function calculateDiscountedTotal(
  subtotal: number,
  discountRate: number
): number {
  if (subtotal < 0) return 0;
  return Number((subtotal * (1 - discountRate)).toFixed(2));
}

export async function verifyWebhookSignature(
  payload: string,
  signature: string
): Promise<boolean> {
  return Boolean(payload && signature);
}`;

export const TestSuiteStudio: React.FC<TestSuiteStudioProps> = ({ onNotify }) => {
  const [sourceCode, setSourceCode] = useState(SAMPLE_REACT_COMPONENT);
  const [runner, setRunner] = useState<TestRunner>('vitest');
  const [importPath, setImportPath] = useState('./LoginForm');
  const [useUserEvent, setUseUserEvent] = useState(true);
  const [includeMockFactory, setIncludeMockFactory] = useState(true);
  const [includeEdgeCases, setIncludeEdgeCases] = useState(true);
  const [includeA11yQueries, setIncludeA11yQueries] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => parseCodeStructure(sourceCode), [sourceCode]);

  const generated = useMemo(
    () =>
      generateTestSuite(parsed, {
        runner,
        useUserEvent,
        includeMockFactory,
        includeEdgeCases,
        includeA11yQueries,
        importPath,
      }),
    [parsed, runner, useUserEvent, includeMockFactory, includeEdgeCases, includeA11yQueries, importPath]
  );

  const testFilename = useMemo(() => {
    if (parsed.kind === 'typescript-module') {
      const base = importPath.split('/').pop() || 'utils';
      return `${base}.test.ts`;
    }
    const base = parsed.componentName || 'Component';
    return `${base}.test.tsx`;
  }, [parsed, importPath]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      setSourceCode(content);
      const base = file.name.replace(/\.(tsx?|jsx?)$/i, '');
      setImportPath(`./${base}`);
      onNotify(`Loaded ${file.name}`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCopy = (text: string, id: string, label: string) => {
    void copyToClipboard(text);
    setCopiedId(id);
    onNotify(`Copied ${label}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadTest = () => {
    const blob = new Blob([generated.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = testFilename;
    a.click();
    URL.revokeObjectURL(url);
    onNotify(`Downloaded ${testFilename}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold tracking-tight text-slate-100">
              Test Suite Generator
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Generate Vitest, Jest, and React Testing Library unit test suites with mock prop factories, user-event interactions, and edge-case assertions from TSX components or TypeScript interfaces.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-lg border border-stone-800 shrink-0">
          {(['vitest', 'jest'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRunner(r)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors capitalize ${
                runner === r ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Controls & Sample Presets */}
      <div className="rounded-xl bg-neutral-900 border border-stone-800 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".ts,.tsx,.js,.jsx"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs font-semibold transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload .ts / .tsx</span>
            </button>
            <button
              onClick={() => {
                setSourceCode(SAMPLE_REACT_COMPONENT);
                setImportPath('./LoginForm');
                onNotify('Loaded LoginForm.tsx sample');
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
            >
              React Form Sample
            </button>
            <button
              onClick={() => {
                setSourceCode(SAMPLE_INTERFACE_ONLY);
                setImportPath('./OrderSummary');
                onNotify('Loaded OrderSummaryProps interface');
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
            >
              Interface Only Sample
            </button>
            <button
              onClick={() => {
                setSourceCode(SAMPLE_TS_UTILS);
                setImportPath('./cartUtils');
                onNotify('Loaded TypeScript utility module');
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
            >
              TS Utility Functions
            </button>
          </div>

          <button
            onClick={() => setSourceCode('')}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>

        {/* Options Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-stone-800 text-xs">
          <div className="space-y-1">
            <label className="text-slate-400 font-semibold block">Import Path</label>
            <input
              type="text"
              value={importPath}
              onChange={(e) => setImportPath(e.target.value)}
              placeholder="./Component"
              className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-stone-800 font-mono text-xs text-slate-200"
            />
          </div>

          {[
            [includeMockFactory, setIncludeMockFactory, 'createMockProps Factory'],
            [useUserEvent, setUseUserEvent, 'Include user-event'],
            [includeEdgeCases, setIncludeEdgeCases, 'Edge & State Tests'],
            [includeA11yQueries, setIncludeA11yQueries, 'Role & Label Queries'],
          ].map(([val, setter, label], idx) => (
            <button
              key={idx}
              onClick={() => (setter as React.Dispatch<React.SetStateAction<boolean>>)(!val)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors self-end ${
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

      {/* Split Workspace: Source Input Left + Generated Test Output Right */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Input */}
        <div className="xl:col-span-6 rounded-xl bg-neutral-900 border border-stone-800 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-800 bg-neutral-950/60">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Code2 className="w-4 h-4 text-amber-400" />
              <span>Component / Interface / Module Source</span>
            </div>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              {parsed.props.length} props · {parsed.functions.length} exports
            </span>
          </div>

          <textarea
            value={sourceCode}
            onChange={(e) => setSourceCode(e.target.value)}
            spellCheck={false}
            placeholder="Paste TypeScript interface, React TSX component, or utility functions..."
            className="w-full flex-1 min-h-[420px] p-4 bg-neutral-950 text-xs font-mono text-slate-200 leading-relaxed focus:outline-none resize-none"
          />

          {/* Detected Metadata Footer */}
          {parsed.kind !== 'empty' && (
            <div className="px-4 py-2.5 border-t border-stone-800 bg-neutral-950/70 text-xs text-slate-400 flex flex-wrap items-center gap-2">
              <span className="text-slate-200 font-semibold">
                Detected:{' '}
                {parsed.kind === 'react-component'
                  ? `<${parsed.componentName} />`
                  : 'TypeScript Module'}
              </span>
              {parsed.propsInterfaceName && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-amber-300">{parsed.propsInterfaceName}</span>
                </>
              )}
              {parsed.detectedElements.buttons.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Buttons: {parsed.detectedElements.buttons.join(', ')}</span>
                </>
              )}
              {parsed.detectedElements.inputs.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Inputs: {parsed.detectedElements.inputs.join(', ')}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Output */}
        <div className="xl:col-span-6 rounded-xl bg-neutral-900 border border-stone-800 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-800 bg-neutral-950/60">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono font-bold text-emerald-300">{testFilename}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="font-mono tabular-nums text-slate-400">
                {generated.testCount} test cases
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(generated.code, 'test-code', testFilename)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200"
              >
                {copiedId === 'test-code' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>Copy</span>
              </button>
              <button
                onClick={handleDownloadTest}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-semibold text-white"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>

          <pre className="flex-1 min-h-[420px] p-4 bg-neutral-950 text-xs font-mono text-amber-200 overflow-auto leading-relaxed">
            <code>{generated.code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
