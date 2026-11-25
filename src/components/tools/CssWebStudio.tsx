import React, { useState } from 'react';
import { Palette, Copy, Check, Eye, Sliders, Layers } from 'lucide-react';
import { copyToClipboard } from '../../utils/clipboard';

interface CssWebStudioProps {
  onNotify: (msg: string) => void;
}

type SubTab = 'shadow' | 'glass' | 'contrast';

export const CssWebStudio: React.FC<CssWebStudioProps> = ({ onNotify }) => {
  const [subTab, setSubTab] = useState<SubTab>('shadow');

  // Box Shadow states
  const [shadowX, setShadowX] = useState(0);
  const [shadowY, setShadowY] = useState(12);
  const [shadowBlur, setShadowBlur] = useState(24);
  const [shadowSpread, setShadowSpread] = useState(-4);
  const [shadowColor, setShadowColor] = useState('#000000');
  const [shadowOpacity, setShadowOpacity] = useState(40);
  const [shadowInset, setShadowInset] = useState(false);

  // Glassmorphism states
  const [glassBlur, setGlassBlur] = useState(16);
  const [glassOpacity, setGlassOpacity] = useState(15);
  const [glassBorderOpacity, setGlassBorderOpacity] = useState(20);
  const [glassColor, setGlassColor] = useState('#ffffff');

  // Contrast states
  const [textColor, setTextColor] = useState('#f8fafc');
  const [bgColor, setBgColor] = useState('#0f172a');

  const [copied, setCopied] = useState(false);

  // Calculate box shadow CSS
  const hexToRgba = (hex: string, alpha: number) => {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map((char) => char + char).join('');
    const num = parseInt(c, 16);
    return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha / 100})`;
  };

  const boxShadowCss = `${shadowInset ? 'inset ' : ''}${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowSpread}px ${hexToRgba(
    shadowColor,
    shadowOpacity
  )}`;

  const tailwindShadow = `shadow-[${shadowInset ? 'inset_' : ''}${shadowX}px_${shadowY}px_${shadowBlur}px_${shadowSpread}px_${hexToRgba(
    shadowColor,
    shadowOpacity
  ).replace(/\s+/g, '')}]`;

  // Calculate Glassmorphism CSS
  const glassBg = hexToRgba(glassColor, glassOpacity);
  const glassBorder = hexToRgba(glassColor, glassBorderOpacity);
  const glassCss = `background: ${glassBg};\nbackdrop-filter: blur(${glassBlur}px);\n-webkit-backdrop-filter: blur(${glassBlur}px);\nborder: 1px solid ${glassBorder};`;
  const tailwindGlass = `backdrop-blur-[${glassBlur}px] bg-[${glassBg}] border border-[${glassBorder}]`;

  // Calculate Contrast Ratio
  const getLuminance = (hex: string) => {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map((char) => char + char).join('');
    const num = parseInt(c, 16);
    const rgb = [(num >> 16) & 255, (num >> 8) & 255, num & 255].map((val) => {
      const v = val / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };

  const lum1 = getLuminance(textColor);
  const lum2 = getLuminance(bgColor);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  const contrastRatio = (brightest + 0.05) / (darkest + 0.05);
  const contrastFormatted = contrastRatio.toFixed(2);

  const passesAANormal = contrastRatio >= 4.5;
  const passesAALarge = contrastRatio >= 3.0;
  const passesAAANormal = contrastRatio >= 7.0;
  const passesAAALarge = contrastRatio >= 4.5;

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
          <h2 className="text-xl font-bold tracking-tight text-slate-100">CSS & Web Designer</h2>
          <p className="text-sm text-slate-400 mt-1">
            Build soft layered box shadows, frosted glass effects, and check WCAG contrast compliance.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-lg border border-stone-800 shrink-0">
          <button
            onClick={() => setSubTab('shadow')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              subTab === 'shadow' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Box Shadow
          </button>
          <button
            onClick={() => setSubTab('glass')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              subTab === 'glass' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Glassmorphism
          </button>
          <button
            onClick={() => setSubTab('contrast')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              subTab === 'contrast' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            WCAG Contrast
          </button>
        </div>
      </div>

      {/* Tab 1: Box Shadow */}
      {subTab === 'shadow' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Controls */}
          <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-200">Shadow Properties</h3>

            <div className="space-y-3 text-xs text-slate-400">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>X Offset: {shadowX}px</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={shadowX}
                  onChange={(e) => setShadowX(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Y Offset: {shadowY}px</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={shadowY}
                  onChange={(e) => setShadowY(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Blur Radius: {shadowBlur}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={shadowBlur}
                  onChange={(e) => setShadowBlur(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Spread Radius: {shadowSpread}px</span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="50"
                  value={shadowSpread}
                  onChange={(e) => setShadowSpread(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Opacity: {shadowOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={shadowOpacity}
                  onChange={(e) => setShadowOpacity(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-800">
                <div className="flex items-center gap-2">
                  <span>Shadow Color:</span>
                  <input
                    type="color"
                    value={shadowColor}
                    onChange={(e) => setShadowColor(e.target.value)}
                    className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shadowInset}
                    onChange={(e) => setShadowInset(e.target.checked)}
                  />
                  <span>Inset Shadow</span>
                </label>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="pt-2 border-t border-stone-800 flex items-center gap-2 text-xs">
              <span className="text-slate-500">Presets:</span>
              <button
                onClick={() => {
                  setShadowX(0);
                  setShadowY(4);
                  setShadowBlur(12);
                  setShadowSpread(-2);
                  setShadowOpacity(30);
                  setShadowInset(false);
                }}
                className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Subtle Card
              </button>
              <button
                onClick={() => {
                  setShadowX(0);
                  setShadowY(20);
                  setShadowBlur(35);
                  setShadowSpread(-8);
                  setShadowOpacity(50);
                  setShadowInset(false);
                }}
                className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Floating Modal
              </button>
              <button
                onClick={() => {
                  setShadowX(0);
                  setShadowY(0);
                  setShadowBlur(25);
                  setShadowSpread(4);
                  setShadowColor('#6366f1');
                  setShadowOpacity(45);
                  setShadowInset(false);
                }}
                className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Indigo Glow
              </button>
            </div>
          </div>

          {/* Live Preview & CSS Output */}
          <div className="flex flex-col gap-4">
            {/* Visual Canvas */}
            <div className="flex-1 min-h-[220px] rounded-xl bg-neutral-950 border border-stone-800 flex items-center justify-center p-8">
              <div
                style={{
                  boxShadow: boxShadowCss,
                  backgroundColor: '#1e293b',
                }}
                className="w-56 h-36 rounded-xl border border-slate-700/60 flex flex-col items-center justify-center text-center p-4 transition-all"
              >
                <span className="text-sm font-bold text-slate-200">Interactive Preview</span>
                <span className="text-xs text-slate-400 mt-1">DevForge Element</span>
              </div>
            </div>

            {/* CSS / Tailwind Code output */}
            <div className="rounded-xl bg-neutral-900 border border-stone-800 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">CSS box-shadow</span>
                <button
                  onClick={() => handleCopy(`box-shadow: ${boxShadowCss};`, 'Copied CSS box-shadow')}
                  className="text-xs text-amber-400 hover:underline flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy CSS</span>
                </button>
              </div>
              <div className="p-2.5 rounded bg-neutral-950 font-mono text-xs text-amber-200 select-all break-all">
                box-shadow: {boxShadowCss};
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Glassmorphism */}
      {subTab === 'glass' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-200">Glassmorphism Settings</h3>

            <div className="space-y-3 text-xs text-slate-400">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Backdrop Blur: {glassBlur}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={glassBlur}
                  onChange={(e) => setGlassBlur(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Background Opacity: {glassOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={glassOpacity}
                  onChange={(e) => setGlassOpacity(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Border Opacity: {glassBorderOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={glassBorderOpacity}
                  onChange={(e) => setGlassBorderOpacity(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {/* Visual Canvas with colorful background shapes */}
            <div className="relative min-h-[220px] rounded-xl bg-neutral-950 border border-stone-800 flex items-center justify-center p-8 overflow-hidden">
              <div className="absolute w-36 h-36 rounded-full bg-indigo-500/50 -top-6 -left-6 blur-2xl" />
              <div className="absolute w-44 h-44 rounded-full bg-cyan-500/40 -bottom-8 -right-8 blur-2xl" />
              <div className="absolute w-28 h-28 rounded-full bg-rose-500/30 top-10 right-10 blur-xl" />

              <div
                style={{
                  background: glassBg,
                  backdropFilter: `blur(${glassBlur}px)`,
                  WebkitBackdropFilter: `blur(${glassBlur}px)`,
                  border: `1px solid ${glassBorder}`,
                }}
                className="relative z-10 w-64 h-36 rounded-2xl p-5 flex flex-col justify-between shadow-xl"
              >
                <div>
                  <span className="text-xs font-bold text-white tracking-wide">Frosted Glass Card</span>
                  <p className="text-[11px] text-white/80 mt-1">Realistic blur over dynamic graphics</p>
                </div>
                <span className="text-[10px] font-mono text-white/60">Blur: {glassBlur}px · Opacity: {glassOpacity}%</span>
              </div>
            </div>

            <div className="rounded-xl bg-neutral-900 border border-stone-800 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">CSS Declaration</span>
                <button
                  onClick={() => handleCopy(glassCss, 'Copied Glassmorphism CSS')}
                  className="text-xs text-amber-400 hover:underline flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy CSS</span>
                </button>
              </div>
              <pre className="p-2.5 rounded bg-neutral-950 font-mono text-xs text-amber-200">
                <code>{glassCss}</code>
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: WCAG Contrast Checker */}
      {subTab === 'contrast' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-neutral-900 border border-stone-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-300 block">Foreground Text Color</span>
                <span className="text-xs font-mono text-slate-500">{textColor}</span>
              </div>
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-10 h-10 rounded border border-slate-700 bg-transparent cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-xl bg-neutral-900 border border-stone-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-300 block">Background Canvas Color</span>
                <span className="text-xs font-mono text-slate-500">{bgColor}</span>
              </div>
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-10 h-10 rounded border border-slate-700 bg-transparent cursor-pointer"
              />
            </div>
          </div>

          {/* Live Contrast Preview Box */}
          <div
            style={{ backgroundColor: bgColor, color: textColor }}
            className="p-8 rounded-xl border border-stone-800 text-center transition-colors shadow-lg"
          >
            <h3 className="text-2xl font-bold tracking-tight mb-2">Contrast Ratio: {contrastFormatted}:1</h3>
            <p className="text-sm max-w-lg mx-auto opacity-90">
              The quick brown fox jumps over the lazy developer. Clear visual legibility prevents eye strain and ensures universal accessibility.
            </p>
          </div>

          {/* Compliance Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'AA Normal Text (≥ 4.5:1)', pass: passesAANormal },
              { label: 'AA Large Text (≥ 3.0:1)', pass: passesAALarge },
              { label: 'AAA Normal Text (≥ 7.0:1)', pass: passesAAANormal },
              { label: 'AAA Large Text (≥ 4.5:1)', pass: passesAAALarge },
            ].map((check) => (
              <div
                key={check.label}
                className={`p-3 rounded-lg border font-mono text-xs ${
                  check.pass
                    ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                    : 'bg-rose-950/20 border-rose-800/40 text-rose-300'
                }`}
              >
                <div className="font-bold mb-1">{check.pass ? '✓ PASS' : '✗ FAIL'}</div>
                <div className="text-[11px] opacity-80">{check.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
