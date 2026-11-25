import React, { useState, useMemo } from 'react';
import { copyToClipboard } from '../../utils/clipboard';
import {
  Eye,
  ArrowLeftRight,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  Sparkles,
} from 'lucide-react';

interface WcagContrastStudioProps {
  onNotify: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

function normalizeHex(input: string): string | null {
  const cleaned = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    return `#${cleaned
      .split('')
      .map((c) => c + c)
      .join('')
      .toLowerCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return `#${cleaned.toLowerCase()}`;
  }
  return null;
}

function hexToRgb(hex: string): RGB {
  const norm = normalizeHex(hex) || '#000000';
  const num = parseInt(norm.slice(1), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex({ r, g, b }: RGB): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  );
}

function relativeLuminance({ r, g, b }: RGB): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function computeContrast(fgHex: string, bgHex: string): {
  ratio: number;
  fgLum: number;
  bgLum: number;
} {
  const fgLum = relativeLuminance(hexToRgb(fgHex));
  const bgLum = relativeLuminance(hexToRgb(bgHex));
  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);
  return {
    ratio: (lighter + 0.05) / (darker + 0.05),
    fgLum,
    bgLum,
  };
}

// Find nearest lighter or darker foreground hex that meets targetRatio against bgHex
function suggestAccessibleForeground(fgHex: string, bgHex: string, targetRatio: number): string | null {
  const fg = hexToRgb(fgHex);
  const bgLum = relativeLuminance(hexToRgb(bgHex));
  const moveTowardLight = bgLum < 0.5;

  for (let step = 1; step <= 100; step++) {
    const t = step / 100;
    const candidate: RGB = moveTowardLight
      ? {
          r: fg.r + (255 - fg.r) * t,
          g: fg.g + (255 - fg.g) * t,
          b: fg.b + (255 - fg.b) * t,
        }
      : {
          r: fg.r * (1 - t),
          g: fg.g * (1 - t),
          b: fg.b * (1 - t),
        };
    const hex = rgbToHex(candidate);
    if (computeContrast(hex, bgHex).ratio >= targetRatio) {
      return hex;
    }
  }
  return null;
}

const COLOR_PRESETS = [
  { name: 'Obsidian & Gold', fg: '#fde68a', bg: '#0a0a0a' },
  { name: 'Midnight Slate', fg: '#f8fafc', bg: '#0f172a' },
  { name: 'Editorial Light', fg: '#1e293b', bg: '#ffffff' },
  { name: 'Indigo Button', fg: '#ffffff', bg: '#4f46e5' },
  { name: 'Low-Contrast Warning', fg: '#94a3b8', bg: '#cbd5e1' },
];

export const WcagContrastStudio: React.FC<WcagContrastStudioProps> = ({ onNotify }) => {
  const [fgColor, setFgColor] = useState('#fde68a');
  const [bgColor, setBgColor] = useState('#0a0a0a');
  const [fgTextInput, setFgTextInput] = useState('#fde68a');
  const [bgTextInput, setBgTextInput] = useState('#0a0a0a');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const metrics = useMemo(() => computeContrast(fgColor, bgColor), [fgColor, bgColor]);
  const ratio = metrics.ratio;

  const passesAANormal = ratio >= 4.5;
  const passesAALarge = ratio >= 3.0;
  const passesAAANormal = ratio >= 7.0;
  const passesAAALarge = ratio >= 4.5;
  const passesUIComponents = ratio >= 3.0;

  const suggestedAA = useMemo(
    () => (passesAANormal ? null : suggestAccessibleForeground(fgColor, bgColor, 4.5)),
    [fgColor, bgColor, passesAANormal]
  );

  const suggestedAAA = useMemo(
    () => (passesAAANormal ? null : suggestAccessibleForeground(fgColor, bgColor, 7.0)),
    [fgColor, bgColor, passesAAANormal]
  );

  const updateFg = (val: string) => {
    setFgTextInput(val);
    const norm = normalizeHex(val);
    if (norm) setFgColor(norm);
  };

  const updateBg = (val: string) => {
    setBgTextInput(val);
    const norm = normalizeHex(val);
    if (norm) setBgColor(norm);
  };

  const handleSwap = () => {
    setFgColor(bgColor);
    setBgColor(fgColor);
    setFgTextInput(bgColor);
    setBgTextInput(fgColor);
    onNotify('Swapped foreground and background colors');
  };

  const applyPreset = (fg: string, bg: string, label: string) => {
    setFgColor(fg);
    setBgColor(bg);
    setFgTextInput(fg);
    setBgTextInput(bg);
    onNotify(`Applied "${label}" palette`);
  };

  const handleCopy = (text: string, id: string, label: string) => {
    void copyToClipboard(text);
    setCopiedId(id);
    onNotify(`Copied ${label}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const cssVariablesSnippet = `:root {\n  --color-foreground: ${fgColor};\n  --color-background: ${bgColor};\n  /* Contrast ratio: ${ratio.toFixed(2)}:1 */\n}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold tracking-tight text-slate-100">
              WCAG Contrast Checker
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Validate foreground and background color combinations against WCAG 2.1 AA and AAA accessibility standards with instant shade remediation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset.fg, preset.bg, preset.name)}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-slate-800 border border-stone-800 text-xs font-medium text-slate-300 transition-colors"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Color Pickers Row */}
      <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
        {/* Foreground Picker */}
        <div className="md:col-span-5 rounded-xl bg-neutral-900 border border-stone-800 p-4 flex items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <label className="text-xs font-semibold text-slate-300 block">
              Foreground (Text / Icon)
            </label>
            <input
              type="text"
              value={fgTextInput}
              onChange={(e) => updateFg(e.target.value)}
              spellCheck={false}
              className="w-full px-3 py-1.5 rounded-lg bg-neutral-950 border border-stone-800 font-mono text-xs text-slate-100"
            />
            <div className="text-[11px] font-mono text-slate-500 tabular-nums">
              Luminance: {metrics.fgLum.toFixed(4)}
            </div>
          </div>
          <input
            type="color"
            value={fgColor}
            onChange={(e) => updateFg(e.target.value)}
            aria-label="Pick foreground color"
            className="w-14 h-14 rounded-lg border border-slate-700 bg-transparent cursor-pointer shrink-0"
          />
        </div>

        {/* Swap Button */}
        <div className="md:col-span-1 flex justify-center">
          <button
            onClick={handleSwap}
            className="p-3 rounded-xl bg-neutral-900 hover:bg-slate-800 border border-stone-800 text-slate-300 hover:text-amber-300 transition-colors"
            title="Swap foreground and background colors"
            aria-label="Swap colors"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        </div>

        {/* Background Picker */}
        <div className="md:col-span-5 rounded-xl bg-neutral-900 border border-stone-800 p-4 flex items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <label className="text-xs font-semibold text-slate-300 block">
              Background (Canvas / Surface)
            </label>
            <input
              type="text"
              value={bgTextInput}
              onChange={(e) => updateBg(e.target.value)}
              spellCheck={false}
              className="w-full px-3 py-1.5 rounded-lg bg-neutral-950 border border-stone-800 font-mono text-xs text-slate-100"
            />
            <div className="text-[11px] font-mono text-slate-500 tabular-nums">
              Luminance: {metrics.bgLum.toFixed(4)}
            </div>
          </div>
          <input
            type="color"
            value={bgColor}
            onChange={(e) => updateBg(e.target.value)}
            aria-label="Pick background color"
            className="w-14 h-14 rounded-lg border border-slate-700 bg-transparent cursor-pointer shrink-0"
          />
        </div>
      </div>

      {/* Contrast Ratio Hero & Auto-Remediation */}
      <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
          <div>
            <span className="text-xs font-semibold text-slate-400 block">
              WCAG 2.1 Contrast Ratio
            </span>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-4xl font-extrabold font-mono tabular-nums text-slate-100">
                {ratio.toFixed(2)} : 1
              </span>
              <span
                className={`text-xs font-mono font-bold ${
                  passesAAANormal
                    ? 'text-emerald-400'
                    : passesAANormal
                    ? 'text-sky-400'
                    : passesAALarge
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {passesAAANormal
                  ? 'Excellent (AAA)'
                  : passesAANormal
                  ? 'Good (AA Normal)'
                  : passesAALarge
                  ? 'Large Text Only (AA Large)'
                  : 'Fails Accessibility Threshold'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {suggestedAA && (
              <button
                onClick={() => updateFg(suggestedAA)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs font-semibold transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Fix to AA ({suggestedAA})</span>
              </button>
            )}
            {suggestedAAA && (
              <button
                onClick={() => updateFg(suggestedAAA)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Fix to AAA ({suggestedAAA})</span>
              </button>
            )}
            <button
              onClick={() => handleCopy(cssVariablesSnippet, 'wcag-css', 'CSS color variables')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              {copiedId === 'wcag-css' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>Copy CSS Vars</span>
            </button>
          </div>
        </div>

        {/* Compliance Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { title: 'AA Normal Text', req: '≥ 4.5:1 (< 18pt)', pass: passesAANormal },
            { title: 'AA Large Text', req: '≥ 3.0:1 (≥ 18pt / 14pt bold)', pass: passesAALarge },
            { title: 'AAA Normal Text', req: '≥ 7.0:1 (< 18pt)', pass: passesAAANormal },
            { title: 'AAA Large Text', req: '≥ 4.5:1 (≥ 18pt / 14pt bold)', pass: passesAAALarge },
            { title: 'UI & Focus Borders', req: '≥ 3.0:1 (WCAG 2.1 SC 1.4.11)', pass: passesUIComponents },
          ].map((item) => (
            <div
              key={item.title}
              className={`p-3.5 rounded-lg border space-y-1 ${
                item.pass
                  ? 'bg-emerald-950/20 border-emerald-800/50'
                  : 'bg-rose-950/20 border-rose-800/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-100">{item.title}</span>
                {item.pass ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
              </div>
              <div
                className={`text-xs font-mono font-bold ${
                  item.pass ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                {item.pass ? 'PASS' : 'FAIL'}
              </div>
              <div className="text-[11px] text-slate-400 font-mono tabular-nums">{item.req}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Typography & UI Preview */}
      <div
        style={{ backgroundColor: bgColor, color: fgColor }}
        className="rounded-xl border border-stone-800 p-6 sm:p-8 space-y-6 transition-colors"
      >
        <div className="space-y-2 border-b pb-5" style={{ borderColor: `${fgColor}33` }}>
          <div className="text-xs font-mono opacity-80">Large Display Heading (24px Bold)</div>
          <h3 className="text-2xl font-bold tracking-tight">
            Designing accessible interfaces guarantees legibility in every lighting environment.
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="text-xs font-mono opacity-80">Normal Body Copy (16px Regular)</div>
            <p className="text-base leading-relaxed">
              Standard paragraph text requires at least a 4.5:1 ratio for AA compliance and 7.0:1 for AAA compliance so readers with moderate visual impairments can read comfortably.
            </p>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-mono opacity-80">Small Metadata &amp; UI Controls (12px)</div>
            <p className="text-xs leading-relaxed">
              Captions, timestamps, and form helper text are the first elements to become unreadable when contrast drops below 4.5:1.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <span
                className="px-3.5 py-2 rounded-lg text-xs font-semibold border"
                style={{ borderColor: fgColor }}
              >
                Outlined Button Preview
              </span>
              <span
                className="px-3.5 py-2 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: fgColor, color: bgColor }}
              >
                Inverted CTA Preview
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
