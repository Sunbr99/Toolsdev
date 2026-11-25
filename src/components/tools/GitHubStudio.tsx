import React, { useState } from 'react';
import { GitBranch, Copy, Check, Download, AlertCircle, Terminal, RefreshCw, FileText, CheckCircle2 } from 'lucide-react';
import { copyToClipboard } from '../../utils/clipboard';

interface GitHubStudioProps {
  onNotify: (msg: string) => void;
}

type SubTab = 'emergency' | 'gitignore' | 'commit-lint';

interface GitRecipe {
  id: string;
  title: string;
  category: string;
  problem: string;
  commands: string[];
  explanation: string;
}

const GIT_RECIPES: GitRecipe[] = [
  {
    id: 'undo-last-commit-soft',
    title: 'ยกเลิก Commit ล่าสุด แต่เก็บโค้ดที่แก้ไว้ (Soft Undo)',
    category: 'Undo & Fix',
    problem: 'เพิ่งกด git commit ไปแล้วนึกขึ้นได้ว่าลืมแก้โค้ดบางไฟล์ หรือเขียนข้อความ commit ผิด',
    commands: [
      '# ยกเลิก commit ล่าสุด แต่โค้ดยังคงอยู่ในสถานะ Staged พร้อม commit ใหม่\ngit reset --soft HEAD~1',
    ],
    explanation: 'คำสั่งนี้จะถอยประวัติ commit กลับไป 1 ครั้ง แต่จะไม่ลบไฟล์ที่คุณเขียนไว้ โค้ดยังคงอยู่ครบถ้วน',
  },
  {
    id: 'undo-last-commit-hard',
    title: 'ยกเลิก Commit ล่าสุด และทิ้งโค้ดที่แก้ทิ้งทั้งหมด (Hard Reset)',
    category: 'Undo & Fix',
    problem: 'Commit โค้ดที่พังไปแล้ว อยากย้อนกลับไปจุดเดิมก่อนแก้ และลบการเปลี่ยนแปลงล่าสุดทิ้งทั้งหมด',
    commands: [
      '# คำเตือน: โค้ดที่เพิ่งแก้ใน commit ล่าสุดจะหายไปอย่างถาวร\ngit reset --hard HEAD~1',
    ],
    explanation: 'รีเซ็ตทั้งประวัติ commit และไฟล์ในเครื่องกลับไปเป็นสภาพของ commit ก่อนหน้า 100%',
  },
  {
    id: 'amend-commit-message',
    title: 'แก้ข้อความ Commit หรือเพิ่มไฟล์ลงใน Commit ล่าสุด',
    category: 'Commit',
    problem: 'พิมพ์ข้อความ Commit ผิด หรือลืมเอาไฟล์เข้า Commit ล่าสุดไป 1 ไฟล์',
    commands: [
      '# 1. แอดไฟล์ที่ลืม\ngit add <ชื่อไฟล์>\n# 2. รวมไฟล์เข้า commit ล่าสุดและแก้ข้อความใหม่\ngit commit --amend -m "ข้อความ commit ที่ถูกต้อง"',
    ],
    explanation: 'ช่วยให้ประวัติ Git สวยงาม ไม่ต้องมี commit ยิบย่อยอย่าง "แก้คำผิด" หรือ "ลืมไฟล์"',
  },
  {
    id: 'discard-local-changes',
    title: 'ยกเลิกการแก้ไขไฟล์ทั้งหมดในเครื่อง (กลับไปเหมือนตอนดึงมาใหม่)',
    category: 'Cleanup',
    problem: 'ลองแก้โค้ดเล่นแล้วพังยับเยิน อยากทิ้งการแก้ทั้งหมดกลับไปเป็นโค้ดเดิมที่ดึงมาจาก Git',
    commands: [
      '# ยกเลิกการแก้ไขของไฟล์ที่มีอยู่ในระบบทั้งหมด\ngit restore .\n# ลบไฟล์และโฟลเดอร์ใหม่ที่ยังไม่ได้ถูกแทร็ก (Untracked files)\ngit clean -fd',
    ],
    explanation: 'จะล้างไฟล์ทั้งหมดในโฟลเดอร์ทำงานให้กลับมาเหมือนกับ Commit ล่าสุดเป๊ะๆ',
  },
  {
    id: 'stash-and-pop',
    title: 'เก็บโค้ดที่ยังทำไม่เสร็จไว้ชั่วคราว เพื่อสลับไปดึงโค้ดหรือแก้บั๊กอื่น',
    category: 'Workflow',
    problem: 'กำลังแก้โค้ดค้างอยู่ ยังไม่อยาก commit แต่ต้องรีบ git pull หรือสลับไปดู branch อื่นด่วน',
    commands: [
      '# 1. ซ่อนโค้ดที่แก้ค้างไว้\ngit stash -u\n# 2. ทำงานอื่น เช่น git pull origin main หรือสลับ branch\n# 3. นำโค้ดที่ซ่อนไว้กลับคืนมาทำงานต่อ\ngit stash pop',
    ],
    explanation: 'เปรียบเสมือนลิ้นชักเก็บโค้ดชั่วคราว ทำให้โฟลเดอร์สะอาดพร้อมสลับ branch โดยโค้ดไม่หาย',
  },
  {
    id: 'safe-force-push',
    title: 'Force Push ขึ้นเซิร์ฟเวอร์อย่างปลอดภัย (ป้องกันการทับงานเพื่อนร่วมทีม)',
    category: 'Remote',
    problem: 'ไปแก้ประวัติ commit (rebase/amend) มาแล้ว push ปกติไม่ผ่าน แต่ไม่อยากใช้ git push -f แบบอันตราย',
    commands: [
      '# บังคับ push เฉพาะในกรณีที่ไม่มีใคร push โค้ดใหม่ขึ้นมาตัดหน้าเราเท่านั้น\ngit push --force-with-lease origin <ชื่อ-branch>',
    ],
    explanation: 'ปลอดภัยกว่า git push -f ธรรมดามาก เพราะถ้ามีเพื่อนร่วมทีม push งานใหม่ขึ้นไป คำสั่งนี้จะหยุดและไม่ลบงานเพื่อน',
  },
  {
    id: 'recover-lost-commit',
    title: 'กู้คืน Commit หรือ Branch ที่เผลอลบหายไป (Time Machine)',
    category: 'Recovery',
    problem: 'เผลอกด reset หรือลบ branch ผิด คิดว่าโค้ดที่ทำมาหลายวันหายไปหมดแล้ว',
    commands: [
      '# 1. ส่องดูประวัติการขยับทุกครั้งของ Git (แม้จะลบ commit ไปแล้วก็จะยังเห็นเลข SHA ที่นี่)\ngit reflog\n# 2. กู้คืนกลับมายังจุด commit นั้น\ngit checkout -b branch-กู้คืน <เลข-SHA-จาก-reflog>',
    ],
    explanation: 'Git reflog คือกล่องดำบันทึกทุกการเคลื่อนไหว คุณสามารถกู้คืน commit ที่หายไปได้เกือบ 100% ภายใน 30 วัน',
  },
];

const GITIGNORE_PRESETS: { id: string; label: string; rules: string[] }[] = [
  {
    id: 'node',
    label: 'Node.js & npm',
    rules: ['node_modules/', 'npm-debug.log*', 'yarn-debug.log*', 'yarn-error.log*', '.pnpm-debug.log*'],
  },
  {
    id: 'env',
    label: 'Environment Files (.env)',
    rules: ['.env', '.env.local', '.env.development.local', '.env.test.local', '.env.production.local'],
  },
  {
    id: 'web-build',
    label: 'Web Build Outputs (dist, build)',
    rules: ['dist/', 'build/', 'out/', '.next/', '.vite/'],
  },
  {
    id: 'capacitor',
    label: 'Capacitor Artifacts',
    rules: [
      'android/app/src/main/assets/public/',
      'android/app/build/',
      'android/.gradle/',
      'ios/App/public/',
      'ios/App/build/',
    ],
  },
  {
    id: 'android-studio',
    label: 'Android Studio & Gradle',
    rules: [
      '.gradle/',
      'build/',
      'local.properties',
      '*.iml',
      '.idea/',
      '.idea/caches/',
      '.idea/libraries/',
      '*.apk',
      '*.aab',
      'captures/',
    ],
  },
  {
    id: 'os-system',
    label: 'OS Junk (.DS_Store, Thumbs.db)',
    rules: ['.DS_Store', 'Thumbs.db', 'ehthumbs.db', 'Desktop.ini'],
  },
];

export const GitHubStudio: React.FC<GitHubStudioProps> = ({ onNotify }) => {
  const [subTab, setSubTab] = useState<SubTab>('emergency');
  const [selectedRecipe, setSelectedRecipe] = useState<GitRecipe>(GIT_RECIPES[0]);
  const [searchRecipe, setSearchRecipe] = useState('');

  // .gitignore states
  const [selectedPresets, setSelectedPresets] = useState<string[]>([
    'node',
    'env',
    'web-build',
    'capacitor',
    'android-studio',
    'os-system',
  ]);
  const [customIgnoreRules, setCustomIgnoreRules] = useState('# Custom project rules\n*.log\n.vscode/\n');

  // Commit lint states
  const [commitType, setCommitType] = useState('feat');
  const [commitScope, setCommitScope] = useState('auth');
  const [commitDesc, setCommitDesc] = useState('implement biometric login flow');
  const [isBreaking, setIsBreaking] = useState(false);

  const togglePreset = (id: string) => {
    if (selectedPresets.includes(id)) {
      setSelectedPresets(selectedPresets.filter((p) => p !== id));
    } else {
      setSelectedPresets([...selectedPresets, id]);
    }
  };

  const generatedGitignore = [
    '# Generated by DevForge Studio .gitignore Generator',
    ...selectedPresets.flatMap((id) => {
      const p = GITIGNORE_PRESETS.find((x) => x.id === id);
      return p ? [`\n# --- ${p.label} ---`, ...p.rules] : [];
    }),
    '\n' + customIgnoreRules.trim(),
  ].join('\n');

  const generatedCommitMessage = `${commitType}${commitScope.trim() ? `(${commitScope.trim()})` : ''}${
    isBreaking ? '!' : ''
  }: ${commitDesc.trim()}`;

  const handleCopy = (text: string, label: string = 'คัดลอกเรียบร้อย') => {
    void copyToClipboard(text);
    onNotify(label);
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

  const filteredRecipes = GIT_RECIPES.filter(
    (r) =>
      r.title.toLowerCase().includes(searchRecipe.toLowerCase()) ||
      r.problem.toLowerCase().includes(searchRecipe.toLowerCase()) ||
      r.explanation.toLowerCase().includes(searchRecipe.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold tracking-tight text-slate-100">Git & GitHub Command Hub</h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            คลังคำสั่งกู้ชีพ Git ฉุกเฉิน, ตัวสร้างไฟล์ `.gitignore` อัจฉริยะสำหรับ React & Capacitor, และตัวสร้าง Commit Message มาตรฐาน
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-lg border border-stone-800 shrink-0">
          <button
            onClick={() => setSubTab('emergency')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              subTab === 'emergency' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            กู้ชีพ Git ฉุกเฉิน (Emergency)
          </button>
          <button
            onClick={() => setSubTab('gitignore')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              subTab === 'gitignore' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            สร้าง .gitignore
          </button>
          <button
            onClick={() => setSubTab('commit-lint')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              subTab === 'commit-lint' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Conventional Commits
          </button>
        </div>
      </div>

      {/* Subtab 1: Emergency Git Recipes */}
      {subTab === 'emergency' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left: Recipe List */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              เลือกสถานการณ์ที่ต้องการแก้ปัญหา
            </span>
            <input
              type="text"
              placeholder="ค้นหา เช่น commit ผิด, ยกเลิก, กู้คืน..."
              value={searchRecipe}
              onChange={(e) => setSearchRecipe(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-950 border border-stone-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
            />
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredRecipes.map((r) => {
                const isSelected = selectedRecipe.id === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRecipe(r)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-500/60 text-slate-100 shadow-sm'
                        : 'bg-neutral-900 border-stone-800/80 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-amber-400 mb-1">
                      <span>{r.category}</span>
                    </div>
                    <div className="font-semibold text-xs text-slate-200 leading-snug">{r.title}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Recipe details & copyable terminal block */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl bg-neutral-900 border border-stone-800 p-6 space-y-5">
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                  Git Recipe Solution
                </span>
                <h3 className="text-base font-bold text-slate-100 mt-1">{selectedRecipe.title}</h3>
              </div>

              {/* Problem statement */}
              <div className="p-3.5 rounded-lg bg-neutral-950/80 border border-stone-800 text-xs text-slate-300 space-y-1">
                <span className="text-[11px] font-bold uppercase text-slate-400 block">เมื่อคุณเจอปัญหานี้:</span>
                <p>{selectedRecipe.problem}</p>
              </div>

              {/* Commands */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    คำสั่ง Terminal ที่สั่งรัน:
                  </span>
                  <button
                    onClick={() => handleCopy(selectedRecipe.commands.join('\n'), 'คัดลอกคำสั่ง Git แล้ว')}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>คัดลอกคำสั่ง</span>
                  </button>
                </div>

                <div className="relative">
                  <pre className="p-4 rounded-lg bg-neutral-950 border border-stone-800 text-xs font-mono text-amber-300 leading-relaxed overflow-x-auto">
                    <code>{selectedRecipe.commands.join('\n')}</code>
                  </pre>
                </div>
              </div>

              {/* Explanation */}
              <div className="pt-2 border-t border-stone-800 text-xs text-slate-400 space-y-1">
                <span className="font-bold text-slate-300">คำอธิบายทางเทคนิค:</span>
                <p className="text-slate-300 leading-relaxed">{selectedRecipe.explanation}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 2: .gitignore Generator */}
      {subTab === 'gitignore' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-100">เลือกเทคโนโลยีในโปรเจกต์ของคุณ</h3>
            <p className="text-xs text-slate-400">
              ติ๊กเลือกเพื่อรวมกฎการเพิกเฉยไฟล์ขยะและไฟล์ความลับ (.env) อัตโนมัติ
            </p>

            <div className="space-y-2.5 pt-1">
              {GITIGNORE_PRESETS.map((preset) => {
                const isChecked = selectedPresets.includes(preset.id);
                return (
                  <label
                    key={preset.id}
                    onClick={() => togglePreset(preset.id)}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-amber-950/40 border-amber-500/60 text-slate-100'
                        : 'bg-neutral-950/60 border-stone-800/80 text-slate-400 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded bg-neutral-950 border-slate-700 text-indigo-600"
                      />
                      <span className="text-xs font-semibold">{preset.label}</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">{preset.rules.length} rules</span>
                  </label>
                );
              })}
            </div>

            <div className="space-y-1.5 pt-2">
              <span className="text-xs font-semibold text-slate-300">กฎเพิ่มเติมตามใจชอบ (Custom Rules):</span>
              <textarea
                value={customIgnoreRules}
                onChange={(e) => setCustomIgnoreRules(e.target.value)}
                rows={3}
                placeholder="*.log หรือ .vscode/"
                className="w-full bg-neutral-950 p-2.5 rounded-lg border border-stone-800 font-mono text-xs text-slate-200 resize-none focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col rounded-xl bg-neutral-900 border border-stone-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800 bg-neutral-950/40">
              <span className="text-xs font-bold text-slate-300">ไฟล์ .gitignore ที่พร้อมใช้งาน</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(generatedGitignore, 'คัดลอก .gitignore แล้ว')}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>คัดลอก</span>
                </button>
                <button
                  onClick={() => handleDownload(generatedGitignore, '.gitignore')}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ดาวน์โหลด</span>
                </button>
              </div>
            </div>

            <div className="p-4 flex-1 bg-neutral-950 overflow-auto">
              <pre className="text-xs font-mono text-amber-200 leading-relaxed">
                <code>{generatedGitignore}</code>
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 3: Conventional Commits */}
      {subTab === 'commit-lint' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-neutral-900 border border-stone-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-100">ตัวช่วยเขียน Commit Message ตามมาตรฐานสากล</h3>
            <p className="text-xs text-slate-400">
              เขียน Commit Message ให้โปรและดูเป็นมืออาชีพตามหลัก Conventional Commits v1.0
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-semibold">ประเภท (Type):</span>
                <select
                  value={commitType}
                  onChange={(e) => setCommitType(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-stone-800 rounded-lg text-xs font-mono text-amber-300 focus:outline-none"
                >
                  <option value="feat">feat: ฟีเจอร์ใหม่</option>
                  <option value="fix">fix: แก้ไขบั๊ก</option>
                  <option value="docs">docs: อัปเดตเอกสาร / README</option>
                  <option value="style">style: จัดช่องว่างฟอร์แมตโค้ด</option>
                  <option value="refactor">refactor: ปรับปรุงโครงสร้างโค้ด</option>
                  <option value="perf">perf: ปรับปรุงประสิทธิภาพความเร็ว</option>
                  <option value="test">test: เพิ่มการทดสอบ Unit Test</option>
                  <option value="chore">chore: อัปเดตแพ็กเกจหรือ Build Tool</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-semibold">ขอบเขตงาน Scope (ทางเลือก):</span>
                <input
                  type="text"
                  value={commitScope}
                  onChange={(e) => setCommitScope(e.target.value)}
                  placeholder="เช่น auth, capacitor, api"
                  className="w-full px-3 py-2 bg-neutral-950 border border-stone-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-semibold">Breaking Change:</span>
                <label className="flex items-center gap-2 mt-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBreaking}
                    onChange={(e) => setIsBreaking(e.target.checked)}
                    className="rounded bg-neutral-950 border-slate-700 text-rose-500"
                  />
                  <span className="text-xs text-slate-300">มีการเปลี่ยนแปลงที่กระทบโค้ดเดิม (!)</span>
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-semibold">คำอธิบายสิ่งที่ทำ (Description):</span>
              <input
                type="text"
                value={commitDesc}
                onChange={(e) => setCommitDesc(e.target.value)}
                placeholder="เช่น add biometric login and biometric storage"
                className="w-full px-3 py-2 bg-neutral-950 border border-stone-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none"
              />
            </div>

            {/* Result preview */}
            <div className="pt-3 border-t border-stone-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Commit Message ที่สร้างได้:
                </span>
                <button
                  onClick={() => handleCopy(generatedCommitMessage, 'คัดลอก Commit Message แล้ว')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>คัดลอกข้อความ</span>
                </button>
              </div>

              <div className="p-3.5 rounded-lg bg-neutral-950 border border-stone-800 font-mono text-sm text-emerald-300 select-all">
                {generatedCommitMessage}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
