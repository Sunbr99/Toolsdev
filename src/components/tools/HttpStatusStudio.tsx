import React, { useState } from 'react';
import { Globe, Copy, Check, Search, Code, Server, CheckCircle2 } from 'lucide-react';
import { copyToClipboard } from '../../utils/clipboard';

interface HttpStatusStudioProps {
  onNotify: (msg: string) => void;
}

type TabMode = 'status-codes' | 'cors-builder';

interface StatusCodeInfo {
  code: number;
  name: string;
  category: '2xx' | '3xx' | '4xx' | '5xx';
  summary: string;
  cause: string;
  fix: string;
}

const STATUS_CODES: StatusCodeInfo[] = [
  {
    code: 200,
    name: 'OK',
    category: '2xx',
    summary: 'คำขอสำเร็จ ข้อมูลถูกส่งกลับมาเรียบร้อย',
    cause: 'เซิร์ฟเวอร์ประมวลผลคำขอ GET/POST สำเร็จสมบูรณ์',
    fix: 'ปกติ ไม่ต้องแก้ไขอะไร',
  },
  {
    code: 201,
    name: 'Created',
    category: '2xx',
    summary: 'สร้างข้อมูลใหม่ในฐานข้อมูลสำเร็จแล้ว',
    cause: 'มักตอบกลับเมื่อเรียก POST แล้วบันทึกแถวใหม่สำเร็จ',
    fix: 'ปกติ ส่ง ID ของเรคคอร์ดใหม่กลับไปด้วย',
  },
  {
    code: 204,
    name: 'No Content',
    category: '2xx',
    summary: 'ดำเนินการสำเร็จ แต่ไม่มีเนื้อหากลับมา',
    cause: 'มักใช้กับ DELETE หรือ PUT ที่ไม่จำเป็นต้องส่ง payload กลับ',
    fix: 'ปกติ ไม่ต้องส่ง body กลับไป',
  },
  {
    code: 301,
    name: 'Moved Permanently',
    category: '3xx',
    summary: 'URL นี้ย้ายที่อยู่ถาวรแล้ว',
    cause: 'มีการเปลี่ยนโดเมน หรือย้ายโครงสร้าง URL ของหน้าเว็บ',
    fix: 'อัปเดต URL ในแอปหรือหน้าเว็บให้ชี้ไปยัง URL ใหม่',
  },
  {
    code: 304,
    name: 'Not Modified',
    category: '3xx',
    summary: 'ข้อมูลไม่มีการเปลี่ยนแปลง ดึงจาก Cache ได้เลย',
    cause: 'เบราว์เซอร์ส่ง ETag หรือ If-Modified-Since แล้วข้อมูลยังเหมือนเดิม',
    fix: 'ช่วยประหยัดแบนด์วิดท์ เบราว์เซอร์จะใช้แคชในเครื่อง',
  },
  {
    code: 400,
    name: 'Bad Request',
    category: '4xx',
    summary: 'ข้อมูลที่ส่งไปไม่ถูกต้องตามที่ API กำหนด',
    cause: 'JSON พัง, ลืมส่งฟิลด์บังคับ, หรือประเภทข้อมูลผิด (เช่น ส่ง string ในช่องที่ต้องการ number)',
    fix: 'ตรวจดู Request Body หรือ Query Parameters ในแท็บ Network ว่าส่งค่าอะไรผิดไป',
  },
  {
    code: 401,
    name: 'Unauthorized',
    category: '4xx',
    summary: 'ไม่ได้แนบ Token หรือ Token หมดอายุ',
    cause: 'ไม่ได้ใส่ Header Authorization: Bearer <token> หรือ JWT หมดอายุ',
    fix: 'ตรวจดูว่าใส่ Token ใน Header ถูกไหม หรือทำระบบ Refresh Token',
  },
  {
    code: 403,
    name: 'Forbidden',
    category: '4xx',
    summary: 'รู้จักตัวตนแล้ว แต่ไม่มีสิทธิ์เข้าถึงข้อมูลนี้',
    cause: 'ล็อกอินผ่านแล้ว แต่ผู้ใช้คนนี้มี Role ไม่พอ (เช่น User ธรรมดาจะเข้าหน้า Admin)',
    fix: 'ตรวจสอบ Role / Permission ในหลังบ้านว่าอนุญาตให้ผู้ใช้กลุ่มนี้เข้าถึงหรือไม่',
  },
  {
    code: 404,
    name: 'Not Found',
    category: '4xx',
    summary: 'หา URL หรือข้อมูลในฐานข้อมูลไม่เจอ',
    cause: 'พิมพ์ URL ผิด, Route ไม่มีอยู่จริง หรือ ID ที่ค้นหาไม่มีในฐานข้อมูล',
    fix: 'ตรวจสอบการสะกด Endpoint และ Parameter ให้ตรงกับที่หลังบ้านเปิดไว้',
  },
  {
    code: 409,
    name: 'Conflict',
    category: '4xx',
    summary: 'ข้อมูลขัดแย้งกับสถานะปัจจุบัน',
    cause: 'มักเกิดจากการสมัครสมาชิกด้วยอีเมลที่มีอยู่แล้วในระบบ หรือแก้ไขข้อมูลชนกัน',
    fix: 'แจ้งเตือนผู้ใช้ เช่น "อีเมลนี้ถูกใช้งานแล้ว"',
  },
  {
    code: 422,
    name: 'Unprocessable Entity',
    category: '4xx',
    summary: 'ไวยากรณ์ถูกต้อง แต่ข้อมูลไม่ผ่านเงื่อนไข Validation',
    cause: 'รูปแบบ JSON ถูกต้อง แต่ค่าข้างในผิด เช่น รหัสผ่านสั้นเกินไป หรือรูปแบบอีเมลไม่ถูก',
    fix: 'ตรวจสอบเงื่อนไข Validation และส่ง Error รายฟิลด์กลับมาแจ้งหน้าบ้าน',
  },
  {
    code: 429,
    name: 'Too Many Requests',
    category: '4xx',
    summary: 'ยิงคำขอถี่เกินกว่าที่ระบบอนุญาต (ติด Rate Limit)',
    cause: 'หน้าบ้านยิง API ถี่เกินไป (มักเกิดจาก useEffect ทำงานวนลูปไม่หยุด)',
    fix: 'ตรวจสอบ dependency array ใน useEffect หรือใช้เทคนิค Debounce หน่วงเวลา',
  },
  {
    code: 500,
    name: 'Internal Server Error',
    category: '5xx',
    summary: 'เซิร์ฟเวอร์หลังบ้านเกิดข้อผิดพลาด / โค้ด Crash',
    cause: 'โค้ด Backend พังจาก uncaught exception เช่น Null Pointer หรือ Database หลุด',
    fix: 'เปิดดู Terminal ฝั่ง Backend เพื่อดู Stacktrace บรรทัดที่โค้ดพัง',
  },
  {
    code: 502,
    name: 'Bad Gateway',
    category: '5xx',
    summary: 'Reverse Proxy (Nginx) ติดต่อไปยัง Backend App ไม่ได้',
    cause: 'Nginx เปิดอยู่ แต่ตัวแอป Node.js/Python ข้างหลังปิดอยู่ หรือพอร์ตไม่ตรงกัน',
    fix: 'ตรวจสอบว่าแอปหลังบ้าน (เช่น Node/PM2) รันอยู่จริงหรือไม่ด้วย `pm2 status`',
  },
  {
    code: 503,
    name: 'Service Unavailable',
    category: '5xx',
    summary: 'เซิร์ฟเวอร์ปิดปรับปรุง หรือคนเข้าใช้งานล้นจนรับไม่ไหว',
    cause: 'เซิร์ฟเวอร์กำลังรีสตาร์ท หรือ CPU/RAM เต็ม 100%',
    fix: 'ตรวจสอบการใช้งาน CPU/RAM หรือสเกลเครื่องเซิร์ฟเวอร์เพิ่ม',
  },
  {
    code: 504,
    name: 'Gateway Timeout',
    category: '5xx',
    summary: 'เซิร์ฟเวอร์ข้างหลังใช้เวลาประมวลผลนานเกินกำหนด (Timeout)',
    cause: 'Query ฐานข้อมูลช้ามาก หรือรอ Third-Party API นานจน Nginx ตัดการเชื่อมต่อ',
    fix: 'ปรับปรุงประสิทธิภาพ SQL Query, เพิ่ม Index หรือเพิ่มค่า timeout ใน Nginx',
  },
];

export const HttpStatusStudio: React.FC<HttpStatusStudioProps> = ({ onNotify }) => {
  const [tabMode, setTabMode] = useState<TabMode>('status-codes');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | '2xx' | '3xx' | '4xx' | '5xx'>('all');

  // CORS Builder states
  const [corsOrigin, setCorsOrigin] = useState('http://localhost:3000, http://localhost:5173');
  const [allowCredentials, setAllowCredentials] = useState(true);
  const [corsMethods, setCorsMethods] = useState('GET, POST, PUT, DELETE, PATCH, OPTIONS');
  const [corsHeaders, setCorsHeaders] = useState('Content-Type, Authorization, X-Requested-With');
  const [serverType, setServerType] = useState<'express' | 'nginx'>('express');

  const filteredCodes = STATUS_CODES.filter((item) => {
    const matchesCat = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesSearch =
      item.code.toString().includes(searchQuery) ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.cause.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const getCorsCode = (): string => {
    const origins = corsOrigin.split(',').map((o) => o.trim()).filter(Boolean);

    if (serverType === 'express') {
      return `// Express.js CORS Configuration
import cors from 'cors';
import { copyToClipboard } from '../../utils/clipboard';

const allowedOrigins = ${JSON.stringify(origins, null, 2)};

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or capacitor)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Blocked by CORS policy'));
  },
  methods: [${corsMethods.split(',').map((m) => `'${m.trim()}'`).join(', ')}],
  allowedHeaders: [${corsHeaders.split(',').map((h) => `'${h.trim()}'`).join(', ')}],
  credentials: ${allowCredentials},
}));`;
    } else {
      return `# Nginx CORS Configuration
location /api/ {
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' '$http_origin' always;
        add_header 'Access-Control-Allow-Methods' '${corsMethods}' always;
        add_header 'Access-Control-Allow-Headers' '${corsHeaders}' always;
        add_header 'Access-Control-Allow-Credentials' '${allowCredentials ? 'true' : 'false'}' always;
        add_header 'Access-Control-Max-Age' 1728000;
        add_header 'Content-Type' 'text/plain; charset=utf-8';
        add_header 'Content-Length' 0;
        return 204;
    }

    add_header 'Access-Control-Allow-Origin' '$http_origin' always;
    add_header 'Access-Control-Allow-Credentials' '${allowCredentials ? 'true' : 'false'}' always;

    proxy_pass http://127.0.0.1:3000;
}`;
    }
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
            <Globe className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold tracking-tight text-slate-100">
              HTTP Status & CORS Encyclopedia
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            คลังค้นหาความหมายและการแก้ปัญหา HTTP Status Code และตัวสร้างการตั้งค่า CORS Headers สำหรับ Express และ Nginx
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-lg border border-stone-800 shrink-0">
          <button
            onClick={() => setTabMode('status-codes')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              tabMode === 'status-codes' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            HTTP Status Codes
          </button>
          <button
            onClick={() => setTabMode('cors-builder')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              tabMode === 'cors-builder' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ตัวตั้งค่า CORS Headers
          </button>
        </div>
      </div>

      {/* Subtab 1: Status Codes */}
      {tabMode === 'status-codes' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-neutral-900 border border-stone-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="ค้นหา เช่น 401, 502, forbidden, timeout..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-neutral-950 border border-stone-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {(['all', '2xx', '3xx', '4xx', '5xx'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 text-xs font-mono font-bold rounded transition-colors ${
                    categoryFilter === cat ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-950 text-slate-400'
                  }`}
                >
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCodes.map((item) => (
              <div
                key={item.code}
                className="p-5 rounded-xl bg-neutral-900 border border-stone-800 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-lg font-bold font-mono ${
                          item.category === '2xx'
                            ? 'text-emerald-400'
                            : item.category === '3xx'
                            ? 'text-cyan-400'
                            : item.category === '4xx'
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {item.code}
                      </span>
                      <span className="text-sm font-bold text-slate-200">{item.name}</span>
                    </div>

                    <span className="text-[10px] uppercase font-bold text-slate-400 bg-neutral-950 px-2 py-0.5 rounded border border-stone-800">
                      {item.category}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-medium mt-2">{item.summary}</p>
                </div>

                <div className="space-y-2 pt-2 border-t border-stone-800/80 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold">สาเหตุที่พบบ่อย: </span>
                    <span className="text-slate-300">{item.cause}</span>
                  </div>
                  <div>
                    <span className="text-emerald-400 font-bold">แนวทางแก้ปัญหา: </span>
                    <span className="text-slate-300">{item.fix}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subtab 2: CORS Builder */}
      {tabMode === 'cors-builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-100">ตั้งค่า Cross-Origin Resource Sharing (CORS)</h3>
            <p className="text-xs text-slate-400">
              แก้ปัญหาคลาสสิกของ Full-stack "Blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present"
            </p>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <span className="text-slate-300 font-semibold">Allowed Origins (คั่นด้วยจุลภาค):</span>
                <input
                  type="text"
                  value={corsOrigin}
                  onChange={(e) => setCorsOrigin(e.target.value)}
                  placeholder="http://localhost:3000, https://myapp.com"
                  className="w-full px-3 py-2 bg-neutral-950 border border-stone-800 rounded font-mono text-slate-200 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <span className="text-slate-300 font-semibold">Allowed Methods:</span>
                <input
                  type="text"
                  value={corsMethods}
                  onChange={(e) => setCorsMethods(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-stone-800 rounded font-mono text-slate-200 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <span className="text-slate-300 font-semibold">Allowed Headers:</span>
                <input
                  type="text"
                  value={corsHeaders}
                  onChange={(e) => setCorsHeaders(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-stone-800 rounded font-mono text-slate-200 focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-stone-800 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowCredentials}
                    onChange={(e) => setAllowCredentials(e.target.checked)}
                    className="rounded bg-neutral-950 border-slate-700 text-indigo-600"
                  />
                  <span>Allow Credentials (อนุญาต Cookies & Auth Bearer)</span>
                </label>

                <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-stone-800">
                  <button
                    onClick={() => setServerType('express')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded ${
                      serverType === 'express' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400'
                    }`}
                  >
                    Express.js
                  </button>
                  <button
                    onClick={() => setServerType('nginx')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded ${
                      serverType === 'nginx' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400'
                    }`}
                  >
                    Nginx
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col rounded-xl bg-neutral-900 border border-stone-800 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-stone-800 bg-neutral-950/40 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                {serverType === 'express' ? 'Express.js cors() Middleware' : 'Nginx Configuration Block'}
              </span>
              <button
                onClick={() => handleCopy(getCorsCode(), 'คัดลอกโค้ด CORS แล้ว')}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>คัดลอกโค้ด</span>
              </button>
            </div>

            <div className="p-4 flex-1 bg-neutral-950 overflow-auto">
              <pre className="text-xs font-mono text-amber-200 leading-relaxed">
                <code>{getCorsCode()}</code>
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
