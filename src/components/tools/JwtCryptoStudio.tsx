import React, { useState, useEffect } from 'react';
import { Key, Shield, Hash, RefreshCw, Copy, Check, Lock, Sparkles, Terminal } from 'lucide-react';
import { parseJwt, createSignedJwt, DecodedJwt } from '../../utils/jwt';
import {
  computeHash,
  computeMD5,
  computeHMAC,
  base64Encode,
  base64Decode,
  base64UrlEncode,
  base64UrlDecode,
  textToHex,
  hexToText,
  generateUUIDv4,
  generateUUIDv7,
  generateNanoId,
  generateSecurePassword,
} from '../../utils/crypto';

interface JwtCryptoStudioProps {
  onNotify: (msg: string) => void;
}

type TabMode = 'jwt' | 'hashes' | 'encoders' | 'generators';

const SAMPLE_JWT = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfODg5MjEzIiwiZW1haWwiOiJlbmdpbmVlckBkZXZmb3JnZS5pbyIsInJvbGVzIjpbImFkbWluIiwiZGV2ZWxvcGVyIl0sImlhdCI6MTczMDAwMDAwMCwiZXhwIjoxNzYxNTY0ODAwLCJpc3MiOiJkZXZmb3JnZS1hdXRoIn0.m5lM2J3XyQ8tQj8j4QxZfJ9rJ6h8s4t9uQ3wE2rT1yU`;

export const JwtCryptoStudio: React.FC<JwtCryptoStudioProps> = ({ onNotify }) => {
  const [tabMode, setTabMode] = useState<TabMode>('jwt');

  // JWT States
  const [jwtInput, setJwtInput] = useState<string>(SAMPLE_JWT);
  const [decodedJwt, setDecodedJwt] = useState<DecodedJwt>(() => parseJwt(SAMPLE_JWT));

  // JWT Signer states
  const [signerHeader, setSignerHeader] = useState('{\n  "alg": "HS256",\n  "typ": "JWT"\n}');
  const [signerPayload, setSignerPayload] = useState('{\n  "sub": "user_12345",\n  "name": "Alex Mercer",\n  "role": "admin",\n  "iat": ' + Math.floor(Date.now() / 1000) + ',\n  "exp": ' + (Math.floor(Date.now() / 1000) + 3600 * 24) + '\n}');
  const [signerSecret, setSignerSecret] = useState('my-super-secret-key-32-bytes-long');
  const [generatedJwt, setGeneratedJwt] = useState('');

  // Hashes states
  const [hashInput, setHashInput] = useState('DevForge Studio 2026');
  const [sha256Hash, setSha256Hash] = useState('');
  const [sha512Hash, setSha512Hash] = useState('');
  const [sha1Hash, setSha1Hash] = useState('');
  const [md5Hash, setMd5Hash] = useState('');
  const [hmacSecret, setHmacSecret] = useState('dev_secret_key');
  const [hmacResult, setHmacResult] = useState('');

  // Encoder states
  const [rawText, setRawText] = useState('Hello DevForge Studio! 🚀');
  const [base64Text, setBase64Text] = useState('');
  const [base64UrlText, setBase64UrlText] = useState('');
  const [urlEncodedText, setUrlEncodedText] = useState('');
  const [hexText, setHexText] = useState('');

  // Generator states
  const [uuidBatch, setUuidBatch] = useState<string[]>([]);
  const [uuidType, setUuidType] = useState<'v4' | 'v7'>('v4');
  const [uuidCount, setUuidCount] = useState(5);
  const [uuidHyphen, setUuidHyphen] = useState(true);
  const [uuidUppercase, setUuidUppercase] = useState(false);

  const [passwordLength, setPasswordLength] = useState(24);
  const [pwdUseUpper, setPwdUseUpper] = useState(true);
  const [pwdUseLower, setPwdUseLower] = useState(true);
  const [pwdUseNumbers, setPwdUseNumbers] = useState(true);
  const [pwdUseSymbols, setPwdUseSymbols] = useState(true);
  const [pwdAvoidAmbiguous, setPwdAvoidAmbiguous] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [pwdEntropy, setPwdEntropy] = useState(0);

  // Recalculate decoded JWT
  useEffect(() => {
    setDecodedJwt(parseJwt(jwtInput));
  }, [jwtInput]);

  // Recalculate hashes
  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const s256 = await computeHash('SHA-256', hashInput);
        const s512 = await computeHash('SHA-512', hashInput);
        const s1 = await computeHash('SHA-1', hashInput);
        const md5 = computeMD5(hashInput);
        const hmac = await computeHMAC(hashInput, hmacSecret, 'SHA-256');

        if (active) {
          setSha256Hash(s256);
          setSha512Hash(s512);
          setSha1Hash(s1);
          setMd5Hash(md5);
          setHmacResult(hmac);
        }
      } catch (err) {
        // ignore
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [hashInput, hmacSecret]);

  // Recalculate encoders
  useEffect(() => {
    try {
      setBase64Text(base64Encode(rawText));
      setBase64UrlText(base64UrlEncode(rawText));
      setUrlEncodedText(encodeURIComponent(rawText));
      setHexText(textToHex(rawText));
    } catch {
      // ignore
    }
  }, [rawText]);

  // Recalculate password
  useEffect(() => {
    handleGeneratePassword();
  }, [passwordLength, pwdUseUpper, pwdUseLower, pwdUseNumbers, pwdUseSymbols, pwdAvoidAmbiguous]);

  const handleGeneratePassword = () => {
    const { password, entropyBits } = generateSecurePassword({
      length: passwordLength,
      uppercase: pwdUseUpper,
      lowercase: pwdUseLower,
      numbers: pwdUseNumbers,
      symbols: pwdUseSymbols,
      avoidAmbiguous: pwdAvoidAmbiguous,
    });
    setGeneratedPassword(password);
    setPwdEntropy(entropyBits);
  };

  // Recalculate UUIDs
  const handleGenerateUuids = () => {
    const list: string[] = [];
    for (let i = 0; i < uuidCount; i++) {
      let val = uuidType === 'v7' ? generateUUIDv7() : generateUUIDv4();
      if (!uuidHyphen) val = val.replace(/-/g, '');
      if (uuidUppercase) val = val.toUpperCase();
      list.push(val);
    }
    setUuidBatch(list);
    onNotify(`Generated ${uuidCount} ${uuidType.toUpperCase()} UUIDs`);
  };

  useEffect(() => {
    handleGenerateUuids();
  }, [uuidType, uuidCount, uuidHyphen, uuidUppercase]);

  // Sign custom JWT
  const handleSignJwt = async () => {
    try {
      const h = JSON.parse(signerHeader);
      const p = JSON.parse(signerPayload);
      const token = await createSignedJwt(h, p, signerSecret);
      setGeneratedJwt(token);
      onNotify('Generated signed JWT token');
    } catch (err) {
      onNotify('Error signing JWT: ' + (err as Error).message);
    }
  };

  const copyToClipboard = (text: string, label: string = 'Copied') => {
    void copyToClipboard(text);
    onNotify(label);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100">JWT & Cryptography Studio</h2>
          <p className="text-sm text-slate-400 mt-1">
            Debug and sign JWT tokens with live expiry countdown, generate SHA-256/MD5 hashes, Base64/Hex encoders, and time-sortable UUID v7.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-lg border border-stone-800 shrink-0">
          {(['jwt', 'hashes', 'encoders', 'generators'] as TabMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setTabMode(mode)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                tabMode === mode ? 'bg-amber-500 text-neutral-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {mode === 'jwt'
                ? 'JWT Debugger'
                : mode === 'hashes'
                ? 'Hashes & HMAC'
                : mode === 'encoders'
                ? 'Encoders'
                : 'UUID & Passwords'}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: JWT Debugger & Signer */}
      {tabMode === 'jwt' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Input Encoded Token */}
            <div className="flex flex-col rounded-xl bg-neutral-900 border border-stone-800 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800 bg-neutral-950/40">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-slate-300">Encoded JWT Token</span>
                </div>
                <button
                  onClick={() => copyToClipboard(jwtInput, 'Copied raw JWT')}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
              </div>

              <div className="p-4 flex-1 flex flex-col bg-neutral-950">
                <textarea
                  value={jwtInput}
                  onChange={(e) => setJwtInput(e.target.value)}
                  placeholder="Paste encoded JWT token here (header.payload.signature)..."
                  rows={8}
                  className="w-full flex-1 bg-transparent border-0 font-mono text-xs text-rose-300 leading-relaxed resize-none focus:outline-none"
                />

                {/* Expiry Badge / Telemetry */}
                <div className="mt-3 pt-3 border-t border-stone-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Status:</span>
                    {decodedJwt.isValidFormat ? (
                      <span
                        className={`font-mono font-bold ${
                          decodedJwt.isExpired ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {decodedJwt.isExpired ? 'EXPIRED' : 'ACTIVE'}
                      </span>
                    ) : (
                      <span className="font-mono text-rose-400 font-bold">INVALID TOKEN FORMAT</span>
                    )}
                  </div>
                  <span className="font-mono text-slate-400">{decodedJwt.expiresInText}</span>
                </div>
              </div>
            </div>

            {/* Decoded Header and Payload */}
            <div className="flex flex-col rounded-xl bg-neutral-900 border border-stone-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-800 bg-neutral-950/40 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Decoded Structure</span>
                <span className="text-xs font-mono text-slate-500">JSON Claims</span>
              </div>

              <div className="p-4 flex-1 space-y-4 bg-neutral-950 overflow-auto">
                <div>
                  <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block mb-1">
                    HEADER: Algorithm & Token Type
                  </span>
                  <pre className="p-2.5 rounded bg-neutral-900 border border-stone-800 font-mono text-xs text-rose-300">
                    <code>{JSON.stringify(decodedJwt.header, null, 2)}</code>
                  </pre>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                    PAYLOAD: Data Claims
                  </span>
                  <pre className="p-2.5 rounded bg-neutral-900 border border-stone-800 font-mono text-xs text-amber-200">
                    <code>{JSON.stringify(decodedJwt.payload, null, 2)}</code>
                  </pre>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block mb-1">
                    SIGNATURE
                  </span>
                  <div className="p-2.5 rounded bg-neutral-900 border border-stone-800 font-mono text-xs text-cyan-300 break-all">
                    {decodedJwt.signature || 'None / Unsigned'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Claims Inspector Table */}
          {decodedJwt.claimsInfo.length > 0 && (
            <div className="rounded-xl bg-neutral-900 border border-stone-800 overflow-hidden">
              <div className="px-5 py-3 border-b border-stone-800 bg-neutral-950/30">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Claims Inspection</h3>
              </div>
              <div className="divide-y divide-slate-800/60 font-mono text-xs">
                {decodedJwt.claimsInfo.map((c, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-2.5 hover:bg-slate-800/40">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-amber-300">{c.claim}</span>
                      <span className="font-sans text-xs text-slate-400">· {c.description}</span>
                    </div>
                    <span className="text-slate-200 text-right truncate max-w-sm">{c.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signer Simulation Drawer */}
          <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-100">JWT Signer Simulation (HS256)</h3>
                <p className="text-xs text-slate-400">Create custom signed JWTs for local backend testing</p>
              </div>
              <button
                onClick={handleSignJwt}
                className="px-4 py-1.5 text-xs font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors"
              >
                Sign Token
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-medium">Header (JSON)</span>
                <textarea
                  value={signerHeader}
                  onChange={(e) => setSignerHeader(e.target.value)}
                  rows={4}
                  className="w-full bg-neutral-950 p-2.5 rounded border border-stone-800 font-mono text-xs text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-medium">Payload (JSON)</span>
                <textarea
                  value={signerPayload}
                  onChange={(e) => setSignerPayload(e.target.value)}
                  rows={4}
                  className="w-full bg-neutral-950 p-2.5 rounded border border-stone-800 font-mono text-xs text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-medium">Secret Key (HMAC SHA-256)</span>
                <input
                  type="text"
                  value={signerSecret}
                  onChange={(e) => setSignerSecret(e.target.value)}
                  className="w-full bg-neutral-950 p-2.5 rounded border border-stone-800 font-mono text-xs text-slate-200"
                />
                {generatedJwt && (
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setJwtInput(generatedJwt);
                        onNotify('Loaded generated JWT into debugger');
                      }}
                      className="text-xs text-amber-400 hover:underline"
                    >
                      Load into Debugger ↑
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Hashes & HMAC */}
      {tabMode === 'hashes' && (
        <div className="space-y-6">
          <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Plaintext Input</span>
            <textarea
              value={hashInput}
              onChange={(e) => setHashInput(e.target.value)}
              rows={3}
              placeholder="Enter text to hash..."
              className="w-full bg-neutral-950 p-3 rounded-lg border border-stone-800 font-mono text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="space-y-3">
            {[
              { label: 'SHA-256', value: sha256Hash, length: 64 },
              { label: 'SHA-512', value: sha512Hash, length: 128 },
              { label: 'SHA-1', value: sha1Hash, length: 40 },
              { label: 'MD5', value: md5Hash, length: 32 },
            ].map((h) => (
              <div key={h.label} className="p-4 rounded-xl bg-neutral-900 border border-stone-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">{h.label}</span>
                    <span className="text-slate-500 font-mono">({h.length} hex chars)</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(h.value, `Copied ${h.label}`)}
                    className="flex items-center gap-1 text-amber-400 hover:text-amber-300"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                </div>
                <div className="p-2.5 rounded bg-neutral-950 font-mono text-xs text-amber-200 break-all select-all">
                  {h.value}
                </div>
              </div>
            ))}

            {/* HMAC SHA-256 */}
            <div className="p-4 rounded-xl bg-neutral-900 border border-stone-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">HMAC SHA-256</span>
                <button
                  onClick={() => copyToClipboard(hmacResult, 'Copied HMAC SHA-256')}
                  className="flex items-center gap-1 text-amber-400 hover:text-amber-300"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy HMAC</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Secret:</span>
                <input
                  type="text"
                  value={hmacSecret}
                  onChange={(e) => setHmacSecret(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-neutral-950 border border-stone-800 rounded text-xs font-mono text-slate-200"
                />
              </div>

              <div className="p-2.5 rounded bg-neutral-950 font-mono text-xs text-amber-200 break-all select-all">
                {hmacResult}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Encoders & Decoders */}
      {tabMode === 'encoders' && (
        <div className="space-y-6">
          <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Raw Text Input</span>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={3}
              className="w-full bg-neutral-950 p-3 rounded-lg border border-stone-800 font-mono text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                label: 'Base64 Standard',
                val: base64Text,
                onDecode: (v: string) => {
                  try {
                    setRawText(base64Decode(v));
                  } catch {}
                },
              },
              {
                label: 'Base64URL (URL-Safe)',
                val: base64UrlText,
                onDecode: (v: string) => {
                  try {
                    setRawText(base64UrlDecode(v));
                  } catch {}
                },
              },
              {
                label: 'URL Encoded (URI Component)',
                val: urlEncodedText,
                onDecode: (v: string) => {
                  try {
                    setRawText(decodeURIComponent(v));
                  } catch {}
                },
              },
              {
                label: 'Hex Bytes',
                val: hexText,
                onDecode: (v: string) => {
                  try {
                    setRawText(hexToText(v));
                  } catch {}
                },
              },
            ].map((enc) => (
              <div key={enc.label} className="p-4 rounded-xl bg-neutral-900 border border-stone-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">{enc.label}</span>
                  <button
                    onClick={() => copyToClipboard(enc.val, `Copied ${enc.label}`)}
                    className="flex items-center gap-1 text-amber-400 hover:text-amber-300"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                </div>
                <div className="p-2.5 rounded bg-neutral-950 font-mono text-xs text-amber-200 break-all max-h-32 overflow-y-auto">
                  {enc.val}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: UUID & Password Generators */}
      {tabMode === 'generators' && (
        <div className="space-y-6">
          {/* UUID Generator */}
          <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100">UUID Batch Generator</h3>
                <p className="text-xs text-slate-400">Generate standard UUID v4 or time-ordered UUID v7</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-stone-800">
                  <button
                    onClick={() => setUuidType('v4')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded ${
                      uuidType === 'v4' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400'
                    }`}
                  >
                    v4 (Random)
                  </button>
                  <button
                    onClick={() => setUuidType('v7')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded ${
                      uuidType === 'v7' ? 'bg-amber-500 text-neutral-950' : 'text-slate-400'
                    }`}
                  >
                    v7 (Time-Ordered)
                  </button>
                </div>

                <button
                  onClick={handleGenerateUuids}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Regenerate</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2 border-t border-stone-800">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={uuidHyphen}
                  onChange={(e) => setUuidHyphen(e.target.checked)}
                  className="rounded bg-neutral-950 border-slate-700 text-indigo-600"
                />
                <span>Include Hyphens</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={uuidUppercase}
                  onChange={(e) => setUuidUppercase(e.target.checked)}
                  className="rounded bg-neutral-950 border-slate-700 text-indigo-600"
                />
                <span>Uppercase</span>
              </label>

              <div className="flex items-center gap-2">
                <span>Count:</span>
                {[1, 5, 10, 20].map((c) => (
                  <button
                    key={c}
                    onClick={() => setUuidCount(c)}
                    className={`px-2 py-0.5 rounded text-xs ${
                      uuidCount === c ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-950 text-slate-400'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-neutral-950 border border-stone-800 font-mono text-xs text-amber-200 space-y-1.5 max-h-48 overflow-y-auto">
              {uuidBatch.map((id, idx) => (
                <div key={idx} className="flex items-center justify-between hover:bg-neutral-900/60 p-1 rounded">
                  <span>{id}</span>
                  <button
                    onClick={() => copyToClipboard(id, 'Copied UUID')}
                    className="text-slate-500 hover:text-amber-300"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* High-Entropy Password / Secret Generator */}
          <div className="rounded-xl bg-neutral-900 border border-stone-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-100">High-Entropy Password & API Key Generator</h3>
                <p className="text-xs text-slate-400">Cryptographically secure tokens with zero ambiguous characters</p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-500">Entropy:</span>
                <span className="font-bold text-emerald-400">{pwdEntropy} bits</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 p-3 rounded-lg bg-neutral-950 border border-stone-800 font-mono text-sm text-emerald-300 tracking-wide select-all break-all">
                {generatedPassword}
              </div>
              <button
                onClick={() => copyToClipboard(generatedPassword, 'Copied generated secret key')}
                className="px-4 py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold rounded-lg text-xs font-semibold shrink-0"
              >
                Copy
              </button>
              <button
                onClick={handleGeneratePassword}
                className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg shrink-0"
                title="Regenerate"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-400">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={pwdUseUpper}
                  onChange={(e) => setPwdUseUpper(e.target.checked)}
                />
                <span>A-Z (Uppercase)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={pwdUseLower}
                  onChange={(e) => setPwdUseLower(e.target.checked)}
                />
                <span>a-z (Lowercase)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={pwdUseNumbers}
                  onChange={(e) => setPwdUseNumbers(e.target.checked)}
                />
                <span>0-9 (Numbers)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={pwdUseSymbols}
                  onChange={(e) => setPwdUseSymbols(e.target.checked)}
                />
                <span>!@#$%^&* (Symbols)</span>
              </label>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 border-t border-stone-800">
              <span>Length: {passwordLength}</span>
              <input
                type="range"
                min="12"
                max="64"
                value={passwordLength}
                onChange={(e) => setPasswordLength(Number(e.target.value))}
                className="flex-1 accent-amber-500"
              />
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={pwdAvoidAmbiguous}
                  onChange={(e) => setPwdAvoidAmbiguous(e.target.checked)}
                />
                <span>Avoid Ambiguous (O, 0, l, 1)</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
