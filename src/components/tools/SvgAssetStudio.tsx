import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Copy, Check, Download, Code, Sparkles, Smartphone } from 'lucide-react';
import { copyToClipboard } from '../../utils/clipboard';

interface SvgAssetStudioProps {
  onNotify: (msg: string) => void;
}

type SubTab = 'svg-react' | 'android-icons' | 'data-uri';

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
</svg>`;

const ANDROID_DENSITIES = [
  { folder: 'mipmap-mdpi', size: 48, label: 'MDPI (48x48 px)' },
  { folder: 'mipmap-hdpi', size: 72, label: 'HDPI (72x72 px)' },
  { folder: 'mipmap-xhdpi', size: 96, label: 'XHDPI (96x96 px)' },
  { folder: 'mipmap-xxhdpi', size: 144, label: 'XXHDPI (144x144 px)' },
  { folder: 'mipmap-xxxhdpi', size: 192, label: 'XXXHDPI (192x192 px)' },
  { folder: 'playstore-icon', size: 512, label: 'Google Play Store (512x512 px)' },
];

export const SvgAssetStudio: React.FC<SvgAssetStudioProps> = ({ onNotify }) => {
  const [subTab, setSubTab] = useState<SubTab>('svg-react');
  const [svgInput, setSvgInput] = useState(SAMPLE_SVG);
  const [componentName, setComponentName] = useState('DollarIcon');
  const [useCurrentColor, setUseCurrentColor] = useState(true);

  // Android Icon Generator states
  const [iconText, setIconText] = useState('DF');
  const [iconBgColor, setIconBgColor] = useState('#4f46e5');
  const [iconTextColor, setIconTextColor] = useState('#ffffff');
  const [iconShape, setIconShape] = useState<'squircle' | 'circle' | 'square'>('squircle');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Convert SVG to React
  const convertSvgToReact = (raw: string, name: string): string => {
    let clean = raw.trim();

    // Replace class with className
    clean = clean.replace(/\bclass=/g, 'className=');

    // Convert hyphenated SVG attributes to camelCase
    const kebabAttrs = [
      'stroke-width',
      'stroke-linecap',
      'stroke-linejoin',
      'stroke-miterlimit',
      'stroke-dasharray',
      'stroke-dashoffset',
      'stroke-opacity',
      'fill-opacity',
      'fill-rule',
      'clip-rule',
      'stop-color',
      'stop-opacity',
    ];

    for (const attr of kebabAttrs) {
      const camel = attr.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      const reg = new RegExp(`\\b${attr}=`, 'g');
      clean = clean.replace(reg, `${camel}=`);
    }

    if (useCurrentColor) {
      clean = clean.replace(/fill="(?!none)[^"]*"/g, 'fill="currentColor"');
    }

    // Insert props spread into root <svg>
    clean = clean.replace(/<svg\b([^>]*)>/, `<svg $1 {...props}>`);

    return `import React from 'react';

export const ${name}: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  ${clean.split('\n').join('\n  ')}
);

export default ${name};`;
  };

  const reactCode = convertSvgToReact(svgInput, componentName);

  // Convert SVG to Data URI
  const svgDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svgInput.trim())}`;
  const cssBackgroundRule = `background-image: url("${svgDataUri}");`;

  // Draw and download Android Icon
  const handleDownloadIcon = (size: number, folderName: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw background shape
    ctx.fillStyle = iconBgColor;
    if (iconShape === 'circle') {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (iconShape === 'squircle') {
      const radius = size * 0.22;
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(size - radius, 0);
      ctx.quadraticCurveTo(size, 0, size, radius);
      ctx.lineTo(size, size - radius);
      ctx.quadraticCurveTo(size, size, size - radius, size);
      ctx.lineTo(radius, size);
      ctx.quadraticCurveTo(0, size, 0, size - radius);
      ctx.lineTo(0, radius);
      ctx.quadraticCurveTo(0, 0, radius, 0);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(0, 0, size, size);
    }

    // Draw text logo
    ctx.fillStyle = iconTextColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.round(size * 0.45)}px sans-serif`;
    ctx.fillText(iconText, size / 2, size / 2 + size * 0.04);

    // Download PNG
    const link = document.createElement('a');
    link.download = `ic_launcher_${folderName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    onNotify(`ดาวน์โหลดไอคอนสำหรับ ${folderName} (${size}x${size}px) แล้ว`);
  };

  const handleCopy = (text: string, label: string = 'คัดลอกเรียบร้อย') => {
    void copyToClipboard(text);
    onNotify(label);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold tracking-tight text-slate-100">SVG & Mobile Asset Studio</h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            แปลง SVG เป็น React Component อัตโนมัติ และสร้างขนาดไอคอนแอป Android / Capacitor ทุกความละเอียด
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-lg border border-stone-800 shrink-0">
          <button
            onClick={() => setSubTab('svg-react')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              subTab === 'svg-react' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            SVG ➜ React Component
          </button>
          <button
            onClick={() => setSubTab('android-icons')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              subTab === 'android-icons' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            สร้างไอคอนแอป Android
          </button>
          <button
            onClick={() => setSubTab('data-uri')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              subTab === 'data-uri' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            CSS Data URI
          </button>
        </div>
      </div>

      {/* Subtab 1: SVG to React */}
      {subTab === 'svg-react' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <div className="flex flex-col rounded-xl bg-neutral-900 border border-stone-800 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-stone-800 bg-neutral-950/40 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">โค้ด SVG ต้นฉบับ</span>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={componentName}
                  onChange={(e) => setComponentName(e.target.value)}
                  placeholder="ComponentName"
                  className="px-2 py-0.5 bg-neutral-950 border border-stone-800 rounded text-xs font-mono text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            <div className="p-3 flex-1 flex flex-col bg-neutral-950">
              <textarea
                value={svgInput}
                onChange={(e) => setSvgInput(e.target.value)}
                placeholder="วางโค้ด <svg ...> ที่นี่..."
                rows={12}
                className="w-full flex-1 bg-transparent border-0 font-mono text-xs text-slate-200 resize-none focus:outline-none"
              />
              <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-xs text-slate-400">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useCurrentColor}
                    onChange={(e) => setUseCurrentColor(e.target.checked)}
                    className="rounded bg-neutral-950 border-slate-700 text-indigo-600"
                  />
                  <span>ใช้ fill="currentColor" เพื่อเปลี่ยนสีตามข้อความได้</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-col rounded-xl bg-neutral-900 border border-stone-800 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-stone-800 bg-neutral-950/40 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Generated React (TSX) Component</span>
              <button
                onClick={() => handleCopy(reactCode, 'คัดลอกโค้ด React Component แล้ว')}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>คัดลอกโค้ด TSX</span>
              </button>
            </div>

            <div className="p-4 flex-1 bg-neutral-950 overflow-auto">
              <pre className="text-xs font-mono text-amber-200 leading-relaxed">
                <code>{reactCode}</code>
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 2: Android & Capacitor App Icon Resizer */}
      {subTab === 'android-icons' && (
        <div className="space-y-6">
          <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  เครื่องมือสร้างไอคอนแอป Android ทุกขนาด (Mipmap Generator)
                </h3>
                <p className="text-xs text-slate-400">
                  แก้ปัญหา Capacitor ที่ขาดโฟลเดอร์ภาพไอคอน สร้างและเรนเดอร์ขนาดมาตรฐานด้วย HTML5 Canvas ทันที
                </p>
              </div>

              {/* Live Preview icon */}
              <div
                style={{
                  backgroundColor: iconBgColor,
                  color: iconTextColor,
                  borderRadius: iconShape === 'circle' ? '9999px' : iconShape === 'squircle' ? '22%' : '0px',
                }}
                className="w-16 h-16 flex items-center justify-center font-bold text-2xl shadow-xl shrink-0 transition-all select-none"
              >
                {iconText}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2 border-t border-stone-800">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-semibold">ตัวอักษร / โลโก้:</span>
                <input
                  type="text"
                  maxLength={4}
                  value={iconText}
                  onChange={(e) => setIconText(e.target.value.toUpperCase())}
                  className="w-full px-3 py-1.5 bg-neutral-950 border border-stone-800 rounded font-mono font-bold text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-semibold">สีพื้นหลัง:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={iconBgColor}
                    onChange={(e) => setIconBgColor(e.target.value)}
                    className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                  />
                  <span className="text-xs font-mono text-slate-300">{iconBgColor}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-semibold">สีตัวอักษร:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={iconTextColor}
                    onChange={(e) => setIconTextColor(e.target.value)}
                    className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                  />
                  <span className="text-xs font-mono text-slate-300">{iconTextColor}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-semibold">รูปทรงไอคอน:</span>
                <select
                  value={iconShape}
                  onChange={(e) => setIconShape(e.target.value as 'squircle' | 'circle' | 'square')}
                  className="w-full px-3 py-1.5 bg-neutral-950 border border-stone-800 rounded text-xs text-slate-200 focus:outline-none"
                >
                  <option value="squircle">Squircle (สี่เหลี่ยมมน Android)</option>
                  <option value="circle">Circle (วงกลม)</option>
                  <option value="square">Square (สี่เหลี่ยม)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Density Download Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ANDROID_DENSITIES.map((d) => (
              <div
                key={d.folder}
                className="p-4 rounded-xl bg-neutral-900 border border-stone-800 flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-bold text-slate-200 block">{d.label}</span>
                  <span className="text-[11px] font-mono text-amber-400">res/{d.folder}/ic_launcher.png</span>
                </div>

                <button
                  onClick={() => handleDownloadIcon(d.size, d.folder)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ดาวน์โหลด</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subtab 3: Data URI */}
      {subTab === 'data-uri' && (
        <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100">CSS background-image Data URI</h3>
            <button
              onClick={() => handleCopy(cssBackgroundRule, 'คัดลอก CSS Rule แล้ว')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>คัดลอก CSS</span>
            </button>
          </div>

          <pre className="p-3.5 rounded-lg bg-neutral-950 border border-stone-800 text-xs font-mono text-emerald-300 break-all select-all leading-relaxed max-h-48 overflow-y-auto">
            <code>{cssBackgroundRule}</code>
          </pre>
        </div>
      )}
    </div>
  );
};
