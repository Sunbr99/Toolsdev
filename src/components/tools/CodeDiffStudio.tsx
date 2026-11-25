import React, { useState } from 'react';
import { Split, Copy, Check, ArrowRightLeft, FileCode, CheckCircle2 } from 'lucide-react';
import { copyToClipboard } from '../../utils/clipboard';

interface CodeDiffStudioProps {
  onNotify: (msg: string) => void;
}

const SAMPLE_A = `// User Auth Middleware - Version 1.0 (Buggy)
export async function authenticateRequest(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).send('No token provided');
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  
  // Bug: Not checking if token is expired
  req.user = decoded;
  next();
}`;

const SAMPLE_B = `// User Auth Middleware - Version 2.0 (Fixed & Typed)
import { Request, Response, NextFunction } from 'express';
import { verifyJwtSafe } from '../utils/jwt';
import { copyToClipboard } from '../../utils/clipboard';

export async function authenticateRequest(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Bearer token' });
  }

  const token = authHeader.split(' ')[1];
  const result = await verifyJwtSafe(token);
  
  if (!result.valid || result.isExpired) {
    return res.status(401).json({ error: 'Token expired or invalid signature' });
  }

  req.user = result.payload;
  next();
}`;

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'modified';
  oldLineNumber?: number;
  newLineNumber?: number;
  oldContent?: string;
  newContent?: string;
}

export const CodeDiffStudio: React.FC<CodeDiffStudioProps> = ({ onNotify }) => {
  const [textA, setTextA] = useState(SAMPLE_A);
  const [textB, setTextB] = useState(SAMPLE_B);
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');
  const [copied, setCopied] = useState(false);

  // Compute line-by-line diff
  const computeDiff = (a: string, b: string): DiffLine[] => {
    const linesA = a.split('\n');
    const linesB = b.split('\n');
    const diffs: DiffLine[] = [];

    const maxLen = Math.max(linesA.length, linesB.length);
    let lineAIdx = 1;
    let lineBIdx = 1;

    for (let i = 0; i < maxLen; i++) {
      const lineA = linesA[i];
      const lineB = linesB[i];

      if (lineA === undefined) {
        diffs.push({
          type: 'added',
          newLineNumber: lineBIdx++,
          newContent: lineB,
        });
      } else if (lineB === undefined) {
        diffs.push({
          type: 'removed',
          oldLineNumber: lineAIdx++,
          oldContent: lineA,
        });
      } else if (lineA === lineB) {
        diffs.push({
          type: 'unchanged',
          oldLineNumber: lineAIdx++,
          newLineNumber: lineBIdx++,
          oldContent: lineA,
          newContent: lineB,
        });
      } else {
        diffs.push({
          type: 'modified',
          oldLineNumber: lineAIdx++,
          newLineNumber: lineBIdx++,
          oldContent: lineA,
          newContent: lineB,
        });
      }
    }

    return diffs;
  };

  const diffLines = computeDiff(textA, textB);
  const addedCount = diffLines.filter((d) => d.type === 'added').length;
  const removedCount = diffLines.filter((d) => d.type === 'removed').length;
  const modifiedCount = diffLines.filter((d) => d.type === 'modified').length;

  const handleSwap = () => {
    const temp = textA;
    setTextA(textB);
    setTextB(temp);
    onNotify('สลับข้อความต้นฉบับกับฉบับแก้ไขแล้ว');
  };

  const handleCopyDiff = () => {
    const unified = diffLines
      .map((d) => {
        if (d.type === 'added') return `+ ${d.newContent}`;
        if (d.type === 'removed') return `- ${d.oldContent}`;
        if (d.type === 'modified') return `- ${d.oldContent}\n+ ${d.newContent}`;
        return `  ${d.oldContent}`;
      })
      .join('\n');

    void copyToClipboard(unified);
    setCopied(true);
    onNotify('คัดลอกผลการ Diff ทั้งหมดแล้ว');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <Split className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold tracking-tight text-slate-100">Code Diff & Text Compare Workbench</h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            เปรียบเทียบความแตกต่างระหว่างโค้ด 2 ไฟล์แบบบรรทัดต่อบรรทัด ชี้ชัดจุดที่เพิ่ม ลบ หรือแก้ไข
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Stats pills */}
          <div className="flex items-center gap-2 text-xs font-mono font-semibold">
            <span className="text-emerald-400">+{addedCount} เพิ่ม</span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span className="text-rose-400">-{removedCount} ลบ</span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span className="text-amber-400">~{modifiedCount} แก้</span>
          </div>

          <button
            onClick={handleSwap}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-neutral-900 border border-stone-800 rounded-lg hover:bg-slate-800 transition-colors"
            title="สลับฝั่ง"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>สลับฝั่ง</span>
          </button>

          <button
            onClick={handleCopyDiff}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>คัดลอก Unified Diff</span>
          </button>
        </div>
      </div>

      {/* Inputs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <div className="flex flex-col rounded-xl bg-neutral-900 border border-stone-800 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-stone-800 bg-neutral-950/40 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">โค้ดต้นฉบับ / โค้ดเก่า (Original)</span>
            <span className="text-xs font-mono text-slate-500">{textA.split('\n').length} บรรทัด</span>
          </div>
          <div className="p-3 flex-1 flex flex-col bg-neutral-950">
            <textarea
              value={textA}
              onChange={(e) => setTextA(e.target.value)}
              placeholder="วางโค้ดต้นฉบับที่นี่..."
              rows={8}
              className="w-full flex-1 bg-transparent border-0 font-mono text-xs text-slate-200 resize-none focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col rounded-xl bg-neutral-900 border border-stone-800 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-stone-800 bg-neutral-950/40 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">โค้ดฉบับใหม่ / โค้ดที่แก้ไข (Modified)</span>
            <span className="text-xs font-mono text-slate-500">{textB.split('\n').length} บรรทัด</span>
          </div>
          <div className="p-3 flex-1 flex flex-col bg-neutral-950">
            <textarea
              value={textB}
              onChange={(e) => setTextB(e.target.value)}
              placeholder="วางโค้ดใหม่ที่นี่..."
              rows={8}
              className="w-full flex-1 bg-transparent border-0 font-mono text-xs text-slate-200 resize-none focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Visual Diff Output */}
      <div className="rounded-xl bg-neutral-900 border border-stone-800 overflow-hidden space-y-0">
        <div className="px-5 py-3 border-b border-stone-800 bg-neutral-950/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">ผลการเปรียบเทียบความต่าง</span>
          </div>
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-stone-800">
            <button
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 text-xs font-semibold rounded ${
                viewMode === 'split' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400'
              }`}
            >
              Side-by-Side
            </button>
            <button
              onClick={() => setViewMode('unified')}
              className={`px-2.5 py-1 text-xs font-semibold rounded ${
                viewMode === 'unified' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400'
              }`}
            >
              Unified
            </button>
          </div>
        </div>

        {/* Diff Canvas */}
        <div className="p-0 max-h-[500px] overflow-auto bg-neutral-950 font-mono text-xs divide-y divide-slate-800/40">
          {viewMode === 'split' ? (
            <div className="divide-y divide-slate-800/40">
              {diffLines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-2 divide-x divide-slate-800/60">
                  {/* Left Column (Old) */}
                  <div
                    className={`flex items-start px-3 py-1 ${
                      line.type === 'removed'
                        ? 'bg-rose-950/40 text-rose-300'
                        : line.type === 'modified'
                        ? 'bg-amber-950/20 text-amber-200'
                        : 'text-slate-400'
                    }`}
                  >
                    <span className="w-8 select-none text-slate-600 shrink-0 text-right pr-3">
                      {line.oldLineNumber || ''}
                    </span>
                    <span className="w-4 select-none shrink-0 font-bold">
                      {line.type === 'removed' || line.type === 'modified' ? '-' : ' '}
                    </span>
                    <span className="break-all whitespace-pre-wrap">{line.oldContent || ''}</span>
                  </div>

                  {/* Right Column (New) */}
                  <div
                    className={`flex items-start px-3 py-1 ${
                      line.type === 'added'
                        ? 'bg-emerald-950/40 text-emerald-300'
                        : line.type === 'modified'
                        ? 'bg-amber-950/20 text-amber-200'
                        : 'text-slate-400'
                    }`}
                  >
                    <span className="w-8 select-none text-slate-600 shrink-0 text-right pr-3">
                      {line.newLineNumber || ''}
                    </span>
                    <span className="w-4 select-none shrink-0 font-bold">
                      {line.type === 'added' || line.type === 'modified' ? '+' : ' '}
                    </span>
                    <span className="break-all whitespace-pre-wrap">{line.newContent || ''}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-slate-800/40">
              {diffLines.map((line, idx) => (
                <div
                  key={idx}
                  className={`flex items-start px-4 py-1 ${
                    line.type === 'added'
                      ? 'bg-emerald-950/40 text-emerald-300'
                      : line.type === 'removed'
                      ? 'bg-rose-950/40 text-rose-300'
                      : line.type === 'modified'
                      ? 'bg-amber-950/30 text-amber-200'
                      : 'text-slate-400'
                  }`}
                >
                  <span className="w-12 select-none text-slate-600 shrink-0 text-right pr-3">
                    {line.newLineNumber || line.oldLineNumber}
                  </span>
                  <span className="w-4 select-none shrink-0 font-bold">
                    {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : line.type === 'modified' ? '~' : ' '}
                  </span>
                  <span className="break-all whitespace-pre-wrap">
                    {line.type === 'removed' ? line.oldContent : line.newContent || line.oldContent}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
