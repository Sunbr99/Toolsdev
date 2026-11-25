import React, { useState, useEffect } from 'react';
import { X, Copy, Trash2, Download, Wand2, FileText, Check } from 'lucide-react';
import { repairJsonString } from '../utils/jsonUtils';
import { base64Encode } from '../utils/crypto';
import { copyToClipboard } from '../utils/clipboard';

interface ScratchpadProps {
  isOpen: boolean;
  onClose: () => void;
  onNotify: (msg: string) => void;
}

const STORAGE_KEY = 'devforge_scratchpad_content';
const DEFAULT_SCRATCHPAD = `# Quick Developer Scratchpad
- Draft quick API payloads, JSON snippets, or SQL queries here.
- Automatically saved locally in your browser!
- Zero trackers, 100% private.
`;

export const ScratchpadDrawer: React.FC<ScratchpadProps> = ({ isOpen, onClose, onNotify }) => {
  const [content, setContent] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_SCRATCHPAD;
    } catch {
      return DEFAULT_SCRATCHPAD;
    }
  });

  const [copied, setCopied] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, content);
    } catch { /* ignore storage quota/privacy restrictions */ }
  }, [content]);

  if (!isOpen) return null;

  const lineCount = content ? content.split('\n').length : 0;
  const charCount = content.length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  const handleCopy = async () => {
    const ok = await copyToClipboard(content);
    if (ok) {
      setCopied(true);
      onNotify('Scratchpad content copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } else {
      onNotify('Clipboard access blocked in this browser');
    }
  };

  const handleFormatJson = () => {
    try {
      const repaired = repairJsonString(content);
      setContent(repaired);
      onNotify('JSON formatted & repaired');
    } catch {
      onNotify('Content is not valid JSON to format');
    }
  };

  const handleBase64 = () => {
    try {
      const encoded = base64Encode(content);
      setContent(encoded);
      onNotify('Encoded scratchpad to Base64');
    } catch {
      onNotify('Could not encode to Base64');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scratchpad-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify('Downloaded scratchpad text');
  };

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    setContent('');
    setConfirmClear(false);
    onNotify('Scratchpad cleared');
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-neutral-950 border-l border-amber-500/25 shadow-2xl flex flex-col safe-top safe-bottom animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-bold text-stone-100">Developer Scratchpad</span>
          <span className="text-xs text-stone-500">Auto-saved</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            title="Copy All"
            className="p-1.5 rounded-md text-stone-400 hover:text-stone-100 hover:bg-neutral-800 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            aria-label="Close scratchpad"
            className="p-1.5 rounded-md text-stone-400 hover:text-stone-100 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-900/70 border-b border-stone-800 text-xs text-stone-400">
        <div className="flex items-center gap-2">
          <button
            onClick={handleFormatJson}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-900 border border-stone-800 text-stone-200 hover:border-amber-500/40 transition-colors"
          >
            <Wand2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Format JSON</span>
          </button>
          <button
            onClick={handleBase64}
            className="px-2 py-1 rounded bg-neutral-900 border border-stone-800 text-stone-200 hover:border-amber-500/40 transition-colors"
          >
            Base64
          </button>
          <button
            onClick={handleDownload}
            title="Download .txt"
            className="p-1.5 rounded text-stone-400 hover:text-stone-200 hover:bg-neutral-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={handleClear}
          title={confirmClear ? 'Click again to confirm clear' : 'Clear'}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            confirmClear
              ? 'bg-rose-600 text-white font-semibold'
              : 'text-rose-400 hover:bg-rose-950/40'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          {confirmClear && <span>Confirm?</span>}
        </button>
      </div>

      {/* Editor area */}
      <div className="flex-1 p-4 flex flex-col">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste or type raw notes, curl snippets, JSON responses, or scratch SQL here..."
          className="flex-1 w-full bg-neutral-900/80 p-3 rounded-lg border border-stone-800 font-mono text-xs text-stone-200 leading-relaxed resize-none focus:outline-none"
        />
      </div>

      {/* Status footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-stone-800 bg-neutral-950 text-xs font-mono tabular-nums text-stone-500">
        <div className="flex items-center gap-3">
          <span>{lineCount} lines</span>
          <span aria-hidden="true">·</span>
          <span>{wordCount} words</span>
          <span aria-hidden="true">·</span>
          <span>{charCount} chars</span>
        </div>
        <span className="text-emerald-400/80">LocalStorage Active</span>
      </div>
    </div>
  );
};
