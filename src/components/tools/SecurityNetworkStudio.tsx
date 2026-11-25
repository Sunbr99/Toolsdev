import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, Search, Terminal, Globe, Lock, Unlock, Eye, Sparkles, Server } from 'lucide-react';

interface SecurityNetworkStudioProps {
  onNotify: (msg: string) => void;
}

export const SecurityNetworkStudio: React.FC<SecurityNetworkStudioProps> = ({ onNotify }) => {
  const [subTab, setSubTab] = useState<'inspect-scam' | 'url-analyzer' | 'network-primer' | 'forensics-proof'>('forensics-proof');

  // Interactive Scam Demo state
  const [fakeBalance, setFakeBalance] = useState('1,500,000.00');
  const [realServerBalance] = useState('42.50');

  // Overlay Revealer Demo state
  const [showOverlayLayer, setShowOverlayLayer] = useState(true);
  const [injectedText, setInjectedText] = useState('ยอมรับแล้วว่าเป็นคนทำผิดเองทั้งหมด');
  const [originalRealText] = useState('รายงานยอดขายรายวันส่งเข้าเซิร์ฟเวอร์เรียบร้อยครับ');

  // URL Analyzer state
  const [urlInput, setUrlInput] = useState('http://185.190.22.45:8080/download/peath-land-update.apk');

  // Analyze URL
  const analyzeUrl = (url: string) => {
    const alerts: { type: 'danger' | 'warning' | 'safe'; title: string; desc: string }[] = [];

    try {
      const parsed = new URL(url.startsWith('http') ? url : `http://${url}`);

      // Check protocol
      if (parsed.protocol === 'http:') {
        alerts.push({
          type: 'danger',
          title: 'การเชื่อมต่อไม่เข้ารหัส (Insecure HTTP)',
          desc: 'เว็บทางการ ธนาคาร และหน่วยงานรัฐ 100% จะต้องเป็น https:// เสมอ หากเป็น http:// ข้อมูลทุกตัวส่งผ่านเน็ตโดยไม่เข้ารหัส',
        });
      }

      // Check if domain is an IP address
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(parsed.hostname)) {
        alerts.push({
          type: 'danger',
          title: 'ใช้ IP Address ตรงๆ แทนชื่อโดเมน',
          desc: 'มิจฉาชีพนิยมใช้ IP Server นอกประเทศโดยตรง เพื่อหลีกเลี่ยงการโดนบล็อกโดเมนจาก กสทช. หรือ ISP',
        });
      }

      // Check suspicious extensions
      if (parsed.pathname.endsWith('.apk')) {
        alerts.push({
          type: 'danger',
          title: 'หลอกให้ดาวน์โหลดไฟล์แอปพลิเคชัน (.apk) นอก Play Store',
          desc: 'นี่คือพฤติกรรมอันดับหนึ่งของ "แก๊งคอลเซ็นเตอร์/แอปดูดเงิน" หน่วยงานราชการและธนาคารของไทยไม่มีนโยบายส่งไฟล์ .apk ให้ประชาชนติดตั้งเองเด็ดขาด',
        });
      }

      // Check suspicious TLDs
      const suspiciousTlds = ['.xyz', '.top', '.club', '.online', '.site', '.info', '.cc', '.buzz'];
      if (suspiciousTlds.some((tld) => parsed.hostname.endsWith(tld))) {
        alerts.push({
          type: 'warning',
          title: 'ใช้นามสกุลโดเมนราคาถูก/เสี่ยงสูง',
          desc: `โดเมนลงท้ายด้วย ${parsed.hostname.split('.').pop()} มักถูกจดทะเบียนแบบไม่ระบุตัวตนและทิ้งได้ง่าย หน่วยงานรัฐไทยจะใช้ .go.th หรือ .or.th เท่านั้น`,
        });
      }

      // Check spoofing in subdomains
      const officialBrands = ['kbank', 'scb', 'bbl', 'ktb', 'ttb', 'police', 'dlt', 'rd', 'land'];
      const hasBrand = officialBrands.some((b) => parsed.hostname.includes(b));
      if (hasBrand && !parsed.hostname.endsWith('.go.th') && !parsed.hostname.endsWith('.co.th') && !parsed.hostname.endsWith('.com')) {
        alerts.push({
          type: 'danger',
          title: 'ชื่อโดเมนเลียนแบบหน่วยงาน (Domain Spoofing)',
          desc: `มีการใส่คำว่าแบรนด์หรือหน่วยงานใน URL แต่ไม่ได้เป็นของทางการจริง`,
        });
      }

      if (alerts.length === 0) {
        alerts.push({
          type: 'safe',
          title: 'โครงสร้าง URL เบื้องต้นยังไม่พบรูปแบบมิจฉาชีพที่ชัดเจน',
          desc: 'แต่ยังคงต้องระมัดระวังการกรอกรหัสผ่านหรือข้อมูลส่วนบุคคลเสมอ',
        });
      }

      return alerts;
    } catch {
      return [
        {
          type: 'danger',
          title: 'รูปแบบ URL ไม่ถูกต้อง (Invalid URL Format)',
          desc: 'โปรดระบุ URL ให้ถูกต้อง เช่น http://example.com/path',
        },
      ];
    }
  };

  const urlAlerts = analyzeUrl(urlInput);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold tracking-tight text-slate-100">
              Anti-Scam & Network Threat Inspector (เจาะลึกระบบป้องกันภัยไซเบอร์)
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            เข้าใจกลลวง "เขียนทับหน้าจอ / แต่งภาพหลอกคน" และวิเคราะห์ความปลอดภัยของระบบ API & Network ที่วิศวกรระบบใช้จริง
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-lg border border-stone-800 shrink-0">
          <button
            onClick={() => setSubTab('forensics-proof')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              subTab === 'forensics-proof' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🛡️ พิสูจน์ความจริงเมื่อโดนใส่ร้าย (Forensics)
          </button>
          <button
            onClick={() => setSubTab('inspect-scam')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              subTab === 'inspect-scam' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            แฉกลลวงเขียนทับหน้าจอ
          </button>
          <button
            onClick={() => setSubTab('url-analyzer')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              subTab === 'url-analyzer' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ตรวจจับ URL ลิงก์มิจฉาชีพ
          </button>
          <button
            onClick={() => setSubTab('network-primer')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              subTab === 'network-primer' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            หลักการ Network & API
          </button>
        </div>
      </div>

      {/* Subtab 0: Forensics & Defense Against Screen Overlay Framing */}
      {subTab === 'forensics-proof' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-gradient-to-r from-amber-950/35 via-neutral-900 to-neutral-900 border border-amber-500/30/60 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
              <h3 className="text-base font-bold text-slate-100">
                คู่มือเอาชนะคนที่แกล้งทำ "Overlay ซ้อนทับข้อความ" ให้เราโดนด่า: ความจริงทางเทคนิคที่คนทั่วไปไม่รู้
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              คนพวกนี้<strong>ไม่ได้เก่งระดับเจ้าของระบบหรือผู้สร้างโปรแกรมตัวจริงเลยครับ</strong> แต่มันคือเทคนิคระดับ
              "Script Kiddie" ที่ใช้ฟังก์ชันกระจอกๆ ของเบราว์เซอร์หรือ Android เพื่อเปลี่ยนภาพบนกระจกหน้าจอ
              แต่ถ้าคุณเข้าใจ <strong>Network, Database, และ Log</strong> คุณจะมีหลักฐานทางวิทยาศาสตร์ที่หักล้างคนพวกนี้ได้แบบ 100% ดิ้นไม่หลุด!
            </p>
          </div>

          {/* Interactive Overlay Simulator */}
          <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                  Interactive Simulator
                </span>
                <h4 className="text-sm font-bold text-slate-100 mt-0.5">
                  จำลอง: ข้อความจริง VS ข้อความที่โดน Overlay ทับเพื่อใส่ร้าย
                </h4>
              </div>

              <button
                onClick={() => setShowOverlayLayer(!showOverlayLayer)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  showOverlayLayer
                    ? 'bg-rose-900/60 border border-rose-700 text-rose-200'
                    : 'bg-emerald-900/60 border border-emerald-700 text-emerald-200'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>{showOverlayLayer ? 'กดเพื่อ "ลอก Overlay ออก" (ดูของจริง)' : 'กดเพื่อ "ใส่ Overlay หลอก"'}</span>
              </button>
            </div>

            {/* Chat Box Simulation */}
            <div className="relative p-5 rounded-xl bg-neutral-950 border border-stone-800 min-h-[140px] flex flex-col justify-center">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                  คุณ
                </div>

                <div className="relative">
                  {/* Real Message Layer (Underneath) */}
                  <div className="p-3 rounded-2xl rounded-tl-sm bg-slate-800 text-xs text-slate-200 border border-slate-700/80 max-w-md shadow-sm">
                    <span className="text-[10px] text-slate-400 block mb-0.5 font-mono">ข้อความจริงที่อยู่ใน Database:</span>
                    <span className="font-medium text-emerald-300">{originalRealText}</span>
                  </div>

                  {/* Malicious Overlay Layer (Fixed on Top) */}
                  {showOverlayLayer && (
                    <div className="absolute inset-0 p-3 rounded-2xl rounded-tl-sm bg-slate-800 text-xs text-slate-200 border-2 border-dashed border-rose-500/80 max-w-md shadow-xl backdrop-blur-none animate-in fade-in duration-100">
                      <div className="flex items-center justify-between text-[10px] text-rose-400 mb-0.5 font-mono">
                        <span>[!] แผ่น Overlay วาดทับ (z-index: 99999):</span>
                        <span className="bg-rose-950 px-1 rounded text-rose-300">ของปลอม</span>
                      </div>
                      <span className="font-semibold text-rose-300">{injectedText}</span>
                    </div>
                  )}
                </div>
              </div>

              {showOverlayLayer && (
                <div className="mt-4 pt-3 border-t border-stone-800/80 flex items-center justify-between text-xs text-rose-400 font-mono">
                  <span>สถานะ: คนทั่วไปจะเห็นข้อความสีแดง แล้วคิดว่าคุณเป็นคนส่งจริงๆ (ทำให้คุณโดนด่า)</span>
                  <span className="text-slate-500">แต่ใน Server Log ไม่มีข้อความนี้แม้แต่ตัวเดียว!</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">ลองเปลี่ยนข้อความที่โดนใส่ร้าย:</span>
              <input
                type="text"
                value={injectedText}
                onChange={(e) => setInjectedText(e.target.value)}
                className="flex-1 px-3 py-1 bg-neutral-950 border border-stone-800 rounded font-mono text-xs text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          {/* 4 Pillars of Forensics Defense */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              4 วิธีทางเทคนิคที่ใช้ "ตอกกลับและพิสูจน์ความจริง" เมื่อโดนใส่ร้ายด้วยรูปแคปหน้าจอ:
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-neutral-900 border border-stone-800 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <span>1. ขอไฟล์ Network Log / HAR File หรือดูที่ Router</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong>หลักการ:</strong> การทำ Overlay หรือแก้ HTML บนหน้าจอ เป็นการแก้ที่ RAM/กระจกหน้าจอเครื่องคนทำเท่านั้น
                  <strong>มันจะไม่มี Network Packet วิ่งออกไปที่ Server จริงแม้แต่ไบต์เดียว!</strong>
                  ถ้าพวกนั้นอ้างว่าคุณส่งข้อความนั้น ให้ท้าให้เปิดประวัติส่งในระบบ หรือเปิด Wireshark/Network Tab ดู ถ้าไม่มี Request ยืนยันว่าส่ง = ภาพตัดต่อ/Overlay 100%
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-900 border border-stone-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <span>2. ตรวจสอบสิทธิ์ "Display Over Other Apps" บนเครื่อง</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong>หลักการ:</strong> ถ้าเป็นมือถือ Android ให้เข้าไปดูที่:
                  <code className="block my-1 p-1 bg-neutral-950 rounded font-mono text-[11px] text-amber-300">
                    Settings ➜ Apps ➜ Special app access ➜ Display over other apps
                  </code>
                  ถ้ามีแอปแปลกๆ ที่ไม่ใช่ระบบหรือแชทเฮดได้รับสิทธิ์นี้อยู่ นั่นคือแอปที่แอบรันพื้นหลังเพื่อวาดภาพซ้อนทับหน้าจอเวลาเปิดแอปเป้าหมาย!
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-900 border border-stone-800 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                  <span>3. ตรวจสอบ Database Record & Message Sequence ID</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong>หลักการ:</strong> ในระบบแชทหรือระบบหลังบ้านจริง ทุกข้อความจะมี Auto-Increment ID (เช่น `id: 84920`)
                  และ `created_at` พร้อม Hash ในฐานข้อมูล คนที่ทำ Overlay จะไม่มีวันเสก ID ตัวนี้เข้าไปใน Database กลางได้
                  การเอาเลข Log ฝั่ง Server มาเทียบจะกระชากหน้ากากคนพวกนี้ได้ทันที
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-900 border border-stone-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <span>4. กฎหมายดิจิทัล: "ภาพแคปหน้าจอ (Screenshot) ไม่ใช่หลักฐานสมบูรณ์"</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong>หลักการ:</strong> ศาลและผู้เชี่ยวชาญด้าน Digital Forensics ทั่วโลกยอมรับตรงกันว่า
                  ภาพแคปหน้าจอปลอมง่ายที่สุดในโลก (แค่ F12 ในเบราว์เซอร์ 3 วินาทีก็ปลอมได้)
                  หลักฐานที่มีน้ำหนักทางกฎหมายและเทคนิคต้องเป็น **Log ดิบที่ดึงจากผู้ให้บริการเซิร์ฟเวอร์ (Service Provider Log)** เท่านั้น
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 1: Inspect Element & Screen Overlay Scam */}
      {subTab === 'inspect-scam' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/25/50 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
              <h3 className="text-sm font-bold text-amber-200">
                ทำไมพวกที่ "เขียนทับข้อความบนหน้าจอ / Inspect Element" ถึงหลอกได้แค่คนทั่วไป แต่หลอกระบบและวิศวกรไม่ได้?
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              ในโซเชียลมีพวก "โค้ชเก๊ / สแกมเมอร์" จำนวนมากที่ชอบแคปหน้าจอพอร์ตหุ้น ยอดเงิน หรือสลิปปลอม โดยใช้วิธีคลิกขวา Inspect Element
              แก้ตัวเลขใน HTML หรือเขียน CSS ซ้อนทับบนหน้าจอ แล้วมาอวดอ้างหลอกขายคอร์สหรือหลอกให้คนโอนเงิน
              <br />
              <strong>ความจริงทางสถาปัตยกรรมระบบ:</strong> สิ่งที่อยู่บนหน้าจอเครื่อง Client เป็นเพียงภาพวาด (DOM/Render Tree)
              ระบบธนาคารและ Server ที่แท้จริงไม่เคยเชื่อสิ่งที่หน้าจอแสดงเลย!
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Side A: What Scammer Shows (Fake UI) */}
            <div className="flex flex-col rounded-xl bg-neutral-900 border border-rose-900/40 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 font-mono">
                    ฝั่งภาพลวงตา (Client UI Overlay)
                  </span>
                  <h3 className="text-sm font-bold text-slate-100">สิ่งที่ตาเห็นบนหน้าจอ (แก้ได้ใน 5 วินาที)</h3>
                </div>
                <span className="text-xs font-mono font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800">
                  หลอกลวง
                </span>
              </div>

              {/* Fake bank app preview card */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-stone-800 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>บัญชีออมทรัพย์ (จำลอง)</span>
                  <span className="text-emerald-400">● เชื่อมต่อแล้ว</span>
                </div>

                <div>
                  <span className="text-xs text-slate-500">ยอดเงินที่สามารถใช้ได้:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xl font-bold font-mono text-emerald-400">฿</span>
                    <input
                      type="text"
                      value={fakeBalance}
                      onChange={(e) => setFakeBalance(e.target.value)}
                      title="ลองพิมพ์แก้ตัวเลขตรงนี้ดู"
                      className="text-2xl font-bold font-mono text-slate-100 bg-neutral-900 border border-amber-500/50 rounded px-2 py-0.5 w-full focus:outline-none"
                    />
                  </div>
                  <span className="text-[11px] text-amber-400 mt-1 block">
                    ↑ ลองพิมพ์แก้ตัวเลขดู นี่คือวิธีเดียวกับที่มิจฉาชีพแก้หน้าจอหลอกคน!
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-400 space-y-1">
                <strong>กลลวงที่ใช้:</strong>
                <p className="text-slate-300">
                  คนพวกนี้แค่กด F12 เปิด DevTools บนเบราว์เซอร์ แล้วแก้ตัวหนังสือในแท็ก <code>&lt;span&gt;</code> หรือใส่
                  Extension ทับข้อความบนหน้าจอ แล้วถ่ายวิดีโอหรือแคปภาพไปหลอกคนที่ไม่เข้าใจระบบคอมพิวเตอร์
                </p>
              </div>
            </div>

            {/* Side B: What Server & Engineer Sees (Truth) */}
            <div className="flex flex-col rounded-xl bg-neutral-900 border border-emerald-900/40 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 font-mono">
                    ฝั่งความจริงของระบบ (Server Database & API Truth)
                  </span>
                  <h3 className="text-sm font-bold text-slate-100">สิ่งที่วิศวกรระบบและ Network ตรวจสอบ</h3>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  ความจริงแท้
                </span>
              </div>

              {/* Real API Response JSON */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-stone-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>GET /api/v1/account/ledger</span>
                  <span className="text-emerald-400">200 OK (Signed TLS)</span>
                </div>

                <pre className="text-xs font-mono text-amber-300 leading-relaxed overflow-x-auto">
                  <code>{`{
  "account_id": "acc_7719280",
  "actual_ledger_balance": ${realServerBalance},
  "currency": "THB",
  "server_timestamp": "2026-10-24T19:50:00Z",
  "bank_signature": "sha256_hmac_8f9a2b...",
  "verified_by_core_banking": true
}`}</code>
                </pre>
              </div>

              <div className="text-xs text-slate-400 space-y-1">
                <strong>ทำไมถึงหลอกระบบไม่ได้:</strong>
                <p className="text-slate-300">
                  แม้หน้าจอจะเขียนว่า 1,500,000 บาท แต่เวลาจะกดโอนเงินจริง ธนาคารจะไม่ได้อ่านตัวเลขจากหน้าจอ
                  แต่จะไปดึงยอดเงินจาก <strong>Database หลังบ้าน (Server-Authoritative Ledger)</strong> ซึ่งมียอดจริงแค่ 42.50
                  บาทเท่านั้น การโอนจึงจะล้มเหลวทันที!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 2: URL Analyzer */}
      {subTab === 'url-analyzer' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-neutral-900 border border-stone-800 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              วางลิงก์ที่น่าสงสัย (SMS, เว็บไซต์, หรือลิงก์หลอกติดตั้งแอป):
            </span>

            <div className="flex items-center gap-3">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="วางลิงก์ เช่น http://... หรือ https://..."
                className="flex-1 px-4 py-2.5 bg-neutral-950 border border-stone-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={() => {
                  setUrlInput('http://185.190.22.45:8080/download/peath-land-update.apk');
                  onNotify('โหลดตัวอย่างลิงก์แอปโจร');
                }}
                className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 rounded-lg transition-colors shrink-0"
              >
                ตัวอย่างลิงก์โจร
              </button>
            </div>
          </div>

          {/* Analysis Results */}
          <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              ผลการวิเคราะห์พฤติกรรมความเสี่ยง (Security Audit Results)
            </h3>

            <div className="space-y-3">
              {urlAlerts.map((alt, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                    alt.type === 'danger'
                      ? 'bg-rose-950/30 border-rose-800/60 text-rose-300'
                      : alt.type === 'warning'
                      ? 'bg-amber-950/30 border-amber-800/60 text-amber-300'
                      : 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold text-sm text-slate-100">{alt.title}</div>
                    <p className="text-xs text-slate-300 leading-relaxed">{alt.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Subtab 3: Network & API Security Primer */}
      {subTab === 'network-primer' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-neutral-900 border border-stone-800 space-y-2">
              <div className="flex items-center gap-2 text-amber-400">
                <Lock className="w-4 h-4" />
                <h4 className="text-sm font-bold text-slate-100">1. TLS / HTTPS Encryption</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                ทำหน้าที่ป้องกันการดักฟังข้อมูล (Eavesdropping) ระหว่างทาง ทุกข้อมูลที่ส่งจากมือถือไปเซิร์ฟเวอร์จะถูกเข้ารหัสด้วยสมการคณิตศาสตร์ที่ไม่มีใครอ่านได้
              </p>
            </div>

            <div className="p-5 rounded-xl bg-neutral-900 border border-stone-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400">
                <Server className="w-4 h-4" />
                <h4 className="text-sm font-bold text-slate-100">2. Server-Authoritative Logic</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                กฎทองของวิศวกรซอฟต์แวร์: "Never trust the client" ข้อมูลและสิทธิ์ทั้งหมดต้องถูกตัดสินที่เซิร์ฟเวอร์ ไม่ว่าหน้าจอของแอปหรือเบราว์เซอร์จะถูกแก้เป็นอะไรก็ตาม
              </p>
            </div>

            <div className="p-5 rounded-xl bg-neutral-900 border border-stone-800 space-y-2">
              <div className="flex items-center gap-2 text-amber-400">
                <Terminal className="w-4 h-4" />
                <h4 className="text-sm font-bold text-slate-100">3. HMAC & Digital Signatures</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                ใช้ตรวจว่าข้อมูลถูกแอบแก้ไขระหว่างทางหรือไม่ โดยการแนบ Hash และ Secret Key หากมีใครแก้ตัวเลขแม้แต่ 1 ตำแหน่ง ลายเซ็นจะหลุดและระบบจะปฏิเสธทันที
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
