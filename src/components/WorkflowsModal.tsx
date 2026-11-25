import React from 'react';
import { X, ArrowRight, ShieldCheck, Zap, Terminal, Sparkles, CheckCircle } from 'lucide-react';
import { ToolTab } from '../types';

interface WorkflowsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWorkflow: (tab: ToolTab) => void;
}

interface WorkflowItem {
  id: string;
  tab: ToolTab;
  title: string;
  role: string;
  problem: string;
  solution: string;
  benefit: string;
}

const WORKFLOWS: WorkflowItem[] = [
  {
    id: 'wf-apk-inspector',
    tab: 'apk-inspector',
    title: 'ตรวจ AndroidManifest.xml, ไฟล์ .apk/.aab และ SHA-256 Keystore',
    role: 'Android / Release / Play Store Dev',
    problem: 'ไม่มั่นใจว่าใน APK มี debuggable="true" หรือสิทธิ์เสี่ยงหลุดไปไหม หรืออยากเช็ก ABI และจัดรูปแบบ SHA-1/SHA-256 ให้ Google Play / Firebase',
    solution: 'วาง XML หรือเลือกไฟล์ .apk/.aab เพื่อสแกนสิทธิ์ ความปลอดภัย โครงสร้าง DEX/ABI และแปลงค่า Keystore Fingerprint ได้ในเครื่องทันที',
    benefit: 'ตรวจสอบความพร้อมของไฟล์ APK และค่า Signature ได้ครบก่อนอัปโหลดขึ้น Store',
  },
  {
    id: 'wf-apk-hardener',
    tab: 'build-hardener',
    title: 'เช็กความปลอดภัยและ Signing APK ก่อนปล่อย Release',
    role: 'Android / Capacitor / Mobile Dev',
    problem: 'ไม่แน่ใจว่า ProGuard/R8 เปิด Minify ครบไหม ลืม Strip Debug Symbols หรือยังใช้ V1 Signing ที่โดนแก้ไขไฟล์ได้ง่าย',
    solution: 'ตรวจสอบไฟล์ proguard-rules.pro แบบสดๆ พร้อม Checklist การเซ็น APK V2/V3 และสร้าง Config ป้องกัน Reverse Engineering',
    benefit: 'ลดความเสี่ยงโดน Decompile โค้ดและผ่านเกณฑ์ความปลอดภัยของ Play Store',
  },
  {
    id: 'wf-dep-integrity',
    tab: 'dependency-integrity',
    title: 'ตรวจ Lockfile ก่อนรัน Build กันแพ็กเกจปลอมหรือ Link แปลกปลอม',
    role: 'Security / Full-Stack / Mobile Dev',
    problem: 'ดึงโปรเจกต์มาแล้วไม่รู้ว่าใน package-lock.json หรือ gradle.lockfile มี Registry แปลกปลอม, HTTP ที่ไม่เข้ารหัส หรือ Script รันอัตโนมัติแฝงอยู่ไหม',
    solution: 'วางไฟล์ Lockfile เพื่อตรวจ Hash Integrity, Registry URLs และโหลดสคริปต์ Pre-build Guard ไปรันก่อน Build จริงได้ทันที',
    benefit: 'สกัดความเสี่ยง Supply-Chain ตั้งแต่ก่อนรัน npm install หรือ Gradle Build',
  },
  {
    id: 'wf-build-perf',
    tab: 'build-perf',
    title: 'วิเคราะห์คอขวด Gradle Build เวลาคอมไพล์ APK ช้า',
    role: 'Android / Termux / CI Engineer',
    problem: 'Build APK นานหลายนาทีโดยไม่รู้ว่าช้าที่ Task ไหน เช่น Kotlin Compile, R8 หรือ Dexing และเครื่อง ARM64/Termux RAM เต็มบ่อย',
    solution: 'วางรายงาน Gradle --profile หรือ Build Log เพื่อแยกเวลาแต่ละ Phase และสร้าง gradle.properties ที่จูน Heap/Daemon ให้เหมาะกับเครื่อง',
    benefit: 'เห็นจุดคอขวดชัดเจนและลดเวลา Build ซ้ำลงอย่างเห็นได้ชัด',
  },
  {
    id: 'wf-site-builder',
    tab: 'site-builder',
    title: 'เขียนเว็บ HTML/CSS/JS พร้อมดูพรีวิว Responsive ทันที',
    role: 'Frontend / Designer / Rapid Prototyper',
    problem: 'อยากลองร่างหน้า Landing Page หรือทดสอบ UI Snippet แบบเร็วๆ โดยไม่อยากสร้างโปรเจกต์ใหม่หลายขั้นตอน',
    solution: 'ใช้ Site Studio เขียนโค้ดพร้อมดูหน้าจอ Desktop/Tablet/Mobile แบบ Live, ดู Console Error และดาวน์โหลดเป็นไฟล์ index.html เดี่ยวได้เลย',
    benefit: 'ขึ้นต้นแบบเว็บไซต์ได้จบในหน้าเดียวและ Export ไปใช้งานต่อได้ทันที',
  },
  {
    id: 'wf-mock-test',
    tab: 'mock-api',
    title: 'จำลอง Mock API Response และสร้าง Unit Test อัตโนมัติ',
    role: 'Frontend / QA / Full-Stack Dev',
    problem: 'Backend ยังทำ Endpoint ไม่เสร็จทำให้หน้าบ้านเทสต์ไม่ได้ หรือต้องเสียเวลาเขียน Boilerplate Vitest/Jest เองทุกครั้ง',
    solution: 'สร้าง Route JSON จำลองพร้อม Latency ใน Mock API หรือใช้ Test Suite Gen แปลง Component/Interface เป็นโค้ดเทสต์พร้อมรัน',
    benefit: 'พัฒนาหน้าบ้านต่อได้ทันทีโดยไม่ต้องรอ Backend และมี Test Coverage เร็วขึ้น',
  },
  {
    id: 'wf-wcag',
    tab: 'wcag-contrast',
    title: 'ตรวจค่า Contrast สีตัวอักษรให้ผ่านมาตรฐาน WCAG AA/AAA',
    role: 'UI/UX / Frontend Developer',
    problem: 'เลือกสีปุ่มหรือข้อความบนพื้นหลังแล้วอ่านยากบนจอมือถือ ไม่แน่ใจว่าค่า Contrast Ratio ผ่านเกณฑ์ 4.5:1 หรือ 7:1 หรือไม่',
    solution: 'เลือกคู่สี Foreground/Background เพื่อคำนวณ Contrast Ratio แบบ Real-time พร้อมปุ่มช่วยปรับเฉดสีให้ผ่านเกณฑ์อัตโนมัติ',
    benefit: 'UI อ่านง่าย คมชัด และผ่านมาตรฐาน Accessibility ทุกหน้าจอ',
  },
  {
    id: 'wf-jwt',
    tab: 'jwt-crypto',
    title: 'แกะและตรวจสอบ JWT Token ตอนที่ User หลุด Login',
    role: 'Full-Stack / Backend / QA',
    problem: 'เรียก API แล้วเจอ 401 Unauthorized หรือ Token หลุดบ่อยโดยไม่รู้ว่า Payload ส่งอะไรมาหรือ Expired หรือยัง',
    solution: 'วาง Token ลงใน JWT Debugger เพื่อดูเวลาหมดอายุแบบนับถอยหลัง ตรวจ Role และจำลอง Sign HS256 ได้ในเครื่อง',
    benefit: 'ปลอดภัย 100% ไม่ต้องเอา Token บริษัทไปวางบนเว็บภายนอก',
  },
  {
    id: 'wf-curl',
    tab: 'api-curl',
    title: 'แปลง Copy as cURL เป็น Fetch / Axios / Python และยิงทดสอบสด',
    role: 'Frontend / Mobile / Automation Engineer',
    problem: 'ต้องมานั่งเขียน Fetch หรือ Axios พร้อม Headers จาก DevTools ทีละบรรทัด เสียเวลาและพิมพ์ตกหล่น',
    solution: 'วางคำสั่ง cURL เพื่อแปลงเป็นโค้ดพร้อมใช้งานหลายภาษา และกดทดสอบยิง Request ดู Latency/Headers ได้ในตัว',
    benefit: 'ลดเวลาเขียนโค้ดเชื่อม API และดีบัก Response ได้เร็วขึ้น',
  },
  {
    id: 'wf-json-repair',
    tab: 'json-architect',
    title: 'ซ่อม JSON ที่พัง และแปลงเป็น TypeScript / Zod อัตโนมัติ',
    role: 'Frontend / TypeScript / Backend Dev',
    problem: 'ได้ JSON จาก Log ที่มี single quote หรือ trailing comma จน Parse พัง และต้องมานั่งเขียน Interface เอง',
    solution: 'กด Auto-Repair เพื่อซ่อม JSON อัตโนมัติ และสร้าง TypeScript Interface, Zod Schema หรือ Go Struct ได้ทันที',
    benefit: 'ลดบั๊ก Type ไม่ตรงกันระหว่างหน้าบ้านและหลังบ้าน',
  },
  {
    id: 'wf-cron',
    tab: 'cron-time',
    title: 'ตั้งเวลา Cron Job และแปลง Unix Epoch ให้แม่นยำ',
    role: 'DevOps / Backend / Full-Stack',
    problem: 'จำรูปแบบ * * * * * สับสน หรือได้รับ Timestamp ตัวเลขยาวๆ จาก API แล้วไม่รู้ว่าเป็นวันเวลาใด',
    solution: 'แปลง Cron เป็นคำอธิบายชัดเจน พร้อมแสดงตารางทำงานล่วงหน้า 5 รอบ และแปลง Epoch เป็นเวลาท้องถิ่นทันที',
    benefit: 'ป้องกันการตั้งเวลา Batch Job ผิดพลาดบน Production',
  },
];

export const WorkflowsModal: React.FC<WorkflowsModalProps> = ({ isOpen, onClose, onSelectWorkflow }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[88vh] flex flex-col rounded-2xl bg-neutral-950 border border-amber-500/25 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/15 bg-neutral-900/70">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-stone-100">DevForge Studio: คู่มือการใช้งาน &amp; Workflow แนะนำ</h2>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              รวม Use Cases จริงสำหรับงานพัฒนา Web, Android APK, Security Audit และ Testing ครบทั้ง 22 เครื่องมือ
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close workflows guide"
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {WORKFLOWS.map((wf) => (
              <div
                key={wf.id}
                className="p-4 rounded-xl bg-neutral-900/70 border border-stone-800 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-amber-400 font-mono truncate">
                      {wf.role}
                    </span>
                    <span className="text-[11px] font-mono text-stone-500 shrink-0">
                      {wf.tab}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-stone-100">{wf.title}</h3>

                  <div className="space-y-1.5 text-xs">
                    <div className="text-stone-400">
                      <span className="text-rose-400 font-semibold">ปัญหาเดิม: </span>
                      {wf.problem}
                    </div>
                    <div className="text-stone-300">
                      <span className="text-amber-300 font-semibold">วิธีแก้: </span>
                      {wf.solution}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{wf.benefit}</span>
                  </div>

                  <button
                    onClick={() => {
                      onSelectWorkflow(wf.tab);
                      onClose();
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors shrink-0"
                  >
                    <span>เปิดเครื่องมือ</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Core Advantages */}
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/20 mt-4 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
              จุดเด่นของ DevForge Studio x MW Next
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs text-stone-300">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-stone-100 block">ปลอดภัย ประมวลผลในเครื่อง 100%</strong>
                  Token, Lockfile, Keystore config และ JSON ไม่ถูกส่งออกไปภายนอก
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-stone-100 block">ใช้งานได้ทั้ง PC และมือถือ/Termux</strong>
                  มีแถบเมนูเลื่อนได้บนหน้าจอเล็ก พร้อมจำแท็บล่าสุดที่เปิดใช้งานไว้
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Terminal className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-stone-100 block">ครบเครื่องพร้อม Scratchpad &amp; ⌘K</strong>
                  ค้นหาสลับเครื่องมือผ่าน Command Palette และจดโน้ตได้ทุกหน้า
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-neutral-950 border-t border-amber-500/15 flex items-center justify-between text-xs text-stone-500">
          <span>DevForge Studio · Dev.Aistudio x MW Next</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs transition-colors"
          >
            เริ่มใช้งาน
          </button>
        </div>
      </div>
    </div>
  );
};
