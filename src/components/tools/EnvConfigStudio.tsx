import React, { useState } from 'react';
import { ShieldCheck, Copy, Check, Download, FileCode, CheckCircle2, AlertTriangle } from 'lucide-react';
import { copyToClipboard } from '../../utils/clipboard';

interface EnvConfigStudioProps {
  onNotify: (msg: string) => void;
}

const SAMPLE_ENV = `# Server Configuration
PORT=3000
NODE_ENV=production
APP_URL=https://api.myproduction.com

# Database Connection (Sensitive)
DATABASE_URL=postgres://postgres:SuperSecretP@ssword2026@db.internal:5432/customer_db

# Authentication Secrets
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# Third-Party API Keys
STRIPE_SECRET_KEY=your_stripe_secret_key_here
GEMINI_API_KEY=your_gemini_api_key_here
CLOUDINARY_API_SECRET=your_cloudinary_api_secret_here

# Feature Flags
ENABLE_BIOMETRIC_AUTH=true
RATE_LIMIT_MAX=100
`;

export const EnvConfigStudio: React.FC<EnvConfigStudioProps> = ({ onNotify }) => {
  const [rawEnv, setRawEnv] = useState(SAMPLE_ENV);
  const [targetFormat, setTargetFormat] = useState<'example' | 'docker' | 'json'>('example');
  const [copied, setCopied] = useState(false);

  // Sanitize .env into .env.example
  const generateSanitizedExample = (envText: string): string => {
    const lines = envText.split('\n');
    const result: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        result.push(line);
        continue;
      }

      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) {
        result.push(line);
        continue;
      }

      const key = line.slice(0, eqIdx).trim();
      const upperKey = key.toUpperCase();

      let placeholder = '"your_' + key.toLowerCase() + '"';

      if (upperKey === 'PORT') placeholder = '3000';
      else if (upperKey === 'NODE_ENV') placeholder = 'development';
      else if (upperKey.includes('URL') || upperKey.includes('HOST')) placeholder = '"http://localhost:3000"';
      else if (upperKey.includes('DATABASE') || upperKey.includes('DB')) placeholder = '"postgres://user:password@localhost:5432/dbname"';
      else if (upperKey.includes('SECRET') || upperKey.includes('KEY') || upperKey.includes('TOKEN')) placeholder = '"your_' + key.toLowerCase() + '_here"';
      else if (upperKey.includes('ENABLE') || upperKey.includes('IS_') || upperKey.includes('DEBUG')) placeholder = 'false';
      else if (/^\d+$/.test(line.slice(eqIdx + 1).trim())) placeholder = line.slice(eqIdx + 1).trim();

      result.push(`${key}=${placeholder}`);
    }

    return result.join('\n');
  };

  // Convert to Docker Compose YAML
  const generateDockerComposeYaml = (envText: string): string => {
    const lines = envText.split('\n');
    const yamlLines = ['environment:'];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx > 0) {
        const key = line.slice(0, eqIdx).trim();
        const val = line.slice(eqIdx + 1).trim();
        yamlLines.push(`  - ${key}=${val}`);
      }
    }

    return yamlLines.join('\n');
  };

  // Convert to JSON
  const generateJson = (envText: string): string => {
    const lines = envText.split('\n');
    const obj: Record<string, string> = {};

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx > 0) {
        const key = line.slice(0, eqIdx).trim();
        let val = line.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        obj[key] = val;
      }
    }

    return JSON.stringify(obj, null, 2);
  };

  // Validate syntax
  const validateEnv = (envText: string): { errors: string[] } => {
    const lines = envText.split('\n');
    const errors: string[] = [];
    const keysSeen = new Set<string>();

    lines.forEach((l, idx) => {
      const trimmed = l.trim();
      if (!trimmed || trimmed.startsWith('#')) return;

      if (!trimmed.includes('=')) {
        errors.push(`บรรทัดที่ ${idx + 1}: ขาดเครื่องหมายเท่ากับ "=" (${trimmed})`);
        return;
      }

      const key = trimmed.slice(0, trimmed.indexOf('=')).trim();
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
        errors.push(`บรรทัดที่ ${idx + 1}: ชื่อคีย์ "${key}" มีอักขระที่ผิดกฎ (ห้ามมีขีดกลางหรือช่องว่าง)`);
      }

      if (keysSeen.has(key)) {
        errors.push(`บรรทัดที่ ${idx + 1}: พบคีย์ซ้ำกัน "${key}"`);
      }
      keysSeen.add(key);
    });

    return { errors };
  };

  const { errors: syntaxErrors } = validateEnv(rawEnv);

  const getOutputText = (): string => {
    if (targetFormat === 'docker') return generateDockerComposeYaml(rawEnv);
    if (targetFormat === 'json') return generateJson(rawEnv);
    return generateSanitizedExample(rawEnv);
  };

  const outputText = getOutputText();

  const handleCopy = (text: string, label: string = 'คัดลอกเรียบร้อย') => {
    void copyToClipboard(text);
    setCopied(true);
    onNotify(label);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    onNotify(`ดาวน์โหลดไฟล์ ${filename} แล้ว`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold tracking-tight text-slate-100">
              .env Sanitizer & Config Architect
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            ล้างความลับและรหัสผ่านจาก `.env` ให้กลายเป็น `.env.example` อัตโนมัติ ป้องกันข้อมูลรั่วไหลก่อน Push ขึ้น GitHub
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-lg border border-stone-800 shrink-0">
          <button
            onClick={() => setTargetFormat('example')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              targetFormat === 'example' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            สร้าง .env.example
          </button>
          <button
            onClick={() => setTargetFormat('docker')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              targetFormat === 'docker' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Docker Compose YAML
          </button>
          <button
            onClick={() => setTargetFormat('json')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              targetFormat === 'json' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            JSON Object
          </button>
        </div>
      </div>

      {/* Inputs & Outputs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left: Raw .env */}
        <div className="flex flex-col rounded-xl bg-neutral-900 border border-stone-800 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-stone-800 bg-neutral-950/40 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">ไฟล์ .env จริงของคุณ (มีรหัสลับ)</span>
            <button
              onClick={() => setRawEnv(SAMPLE_ENV)}
              className="text-xs text-amber-400 hover:text-amber-300"
            >
              โหลดตัวอย่าง
            </button>
          </div>

          <div className="p-3 flex-1 flex flex-col bg-neutral-950">
            <textarea
              value={rawEnv}
              onChange={(e) => setRawEnv(e.target.value)}
              placeholder="วางเนื้อหาไฟล์ .env ที่นี่..."
              rows={14}
              className="w-full flex-1 bg-transparent border-0 font-mono text-xs text-rose-300 resize-none focus:outline-none"
            />

            {syntaxErrors.length > 0 && (
              <div className="mt-3 p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>พบข้อผิดพลาดในไวยากรณ์ .env:</span>
                </div>
                {syntaxErrors.map((err, i) => (
                  <div key={i} className="font-mono text-[11px] opacity-90">
                    • {err}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Sanitized output */}
        <div className="flex flex-col rounded-xl bg-neutral-900 border border-stone-800 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-stone-800 bg-neutral-950/40 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">
              {targetFormat === 'example'
                ? 'ไฟล์ .env.example ที่ปลอดภัย 100%'
                : targetFormat === 'docker'
                ? 'Docker Compose (YAML)'
                : 'JSON Object'}
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(outputText, 'คัดลอกเรียบร้อยแล้ว')}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>คัดลอก</span>
              </button>
              <button
                onClick={() =>
                  handleDownload(
                    outputText,
                    targetFormat === 'example' ? '.env.example' : targetFormat === 'docker' ? 'docker-compose-env.yml' : 'config.json'
                  )
                }
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลด</span>
              </button>
            </div>
          </div>

          <div className="p-4 flex-1 bg-neutral-950 overflow-auto">
            <pre className="text-xs font-mono text-emerald-300 leading-relaxed">
              <code>{outputText}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
