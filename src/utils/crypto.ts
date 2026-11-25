// Web Crypto API based cryptographic and encoding helpers

export async function computeHash(algorithm: 'SHA-256' | 'SHA-512' | 'SHA-1', text: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle?.digest) {
    throw new Error('Web Crypto API requires HTTPS or localhost.');
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest(algorithm, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Pure JS MD5 implementation for developer convenience without external bloat
export function computeMD5(string: string): string {
  function md5cycle(x: number[], k: number[]) {
    let a = x[0], b = x[1], c = x[2], d = x[3];

    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22, 1236535329);

    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);

    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);

    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);

    x[0] = add32(a, x[0]);
    x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]);
    x[3] = add32(d, x[3]);
  }

  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
  }

  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & c) | (~b & d), a, b, x, s, t);
  }

  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & d) | (c & ~d), a, b, x, s, t);
  }

  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }

  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(c ^ (b | ~d), a, b, x, s, t);
  }

  function add32(a: number, b: number) {
    return (a + b) & 0xffffffff;
  }

  const n = string.length;
  let state = [1732584193, -271733879, -1732584194, 271733878];
  let i;
  for (i = 64; i <= n; i += 64) {
    const block: number[] = [];
    for (let j = 0; j < 16; j++) {
      block[j] =
        string.charCodeAt(i - 64 + j * 4) |
        (string.charCodeAt(i - 64 + j * 4 + 1) << 8) |
        (string.charCodeAt(i - 64 + j * 4 + 2) << 16) |
        (string.charCodeAt(i - 64 + j * 4 + 3) << 24);
    }
    md5cycle(state, block);
  }
  const tail = string.substring(i - 64);
  const tailBytes: number[] = new Array(64).fill(0);
  for (let j = 0; j < tail.length; j++) {
    tailBytes[j] = tail.charCodeAt(j);
  }
  tailBytes[tail.length] = 0x80;
  if (tail.length > 55) {
    const block: number[] = [];
    for (let j = 0; j < 16; j++) {
      block[j] =
        tailBytes[j * 4] |
        (tailBytes[j * 4 + 1] << 8) |
        (tailBytes[j * 4 + 2] << 16) |
        (tailBytes[j * 4 + 3] << 24);
    }
    md5cycle(state, block);
    tailBytes.fill(0);
  }
  const lenBits = n * 8;
  tailBytes[56] = lenBits & 0xff;
  tailBytes[57] = (lenBits >>> 8) & 0xff;
  tailBytes[58] = (lenBits >>> 16) & 0xff;
  tailBytes[59] = (lenBits >>> 24) & 0xff;
  const block: number[] = [];
  for (let j = 0; j < 16; j++) {
    block[j] =
      tailBytes[j * 4] |
      (tailBytes[j * 4 + 1] << 8) |
      (tailBytes[j * 4 + 2] << 16) |
      (tailBytes[j * 4 + 3] << 24);
  }
  md5cycle(state, block);

  return state
    .map(val => {
      let hex = '';
      for (let j = 0; j < 4; j++) {
        const byte = (val >>> (j * 8)) & 0xff;
        hex += byte.toString(16).padStart(2, '0');
      }
      return hex;
    })
    .join('');
}

export async function computeHMAC(text: string, secret: string, algorithm: 'SHA-256' | 'SHA-512' = 'SHA-256'): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle?.importKey) {
    throw new Error('Web Crypto HMAC requires HTTPS or localhost.');
  }
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: algorithm },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(text));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Base64 with UTF-8 support
export function base64Encode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binString);
}

export function base64Decode(b64: string): string {
  try {
    const binString = atob(b64.trim());
    const bytes = Uint8Array.from(binString, (m) => m.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch (e) {
    throw new Error('Invalid Base64 string: ' + (e as Error).message);
  }
}

// Base64URL
export function base64UrlEncode(str: string): string {
  return base64Encode(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function base64UrlDecode(str: string): string {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) {
    b64 += '=';
  }
  return base64Decode(b64);
}

// Hex
export function textToHex(str: string): string {
  return Array.from(new TextEncoder().encode(str))
    .map(b => b.toString(16).padStart(2, '0'))
    .join(' ');
}

export function hexToText(hex: string): string {
  const cleaned = hex.replace(/[^0-9a-fA-F]/g, '');
  if (cleaned.length % 2 !== 0) throw new Error('Hex string must have an even number of characters');
  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < cleaned.length; i += 2) {
    bytes[i / 2] = parseInt(cleaned.substring(i, i + 2), 16);
  }
  return new TextDecoder().decode(bytes);
}

// UUID v4
export function generateUUIDv4(): string {
  return crypto.randomUUID();
}

// UUID v7 (Time-based, sortable, RFC 9562)
export function generateUUIDv7(): string {
  const now = Date.now();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // 48-bit timestamp in milliseconds
  bytes[0] = (now / 0x10000000000) & 0xff;
  bytes[1] = (now / 0x100000000) & 0xff;
  bytes[2] = (now / 0x1000000) & 0xff;
  bytes[3] = (now / 0x10000) & 0xff;
  bytes[4] = (now / 0x100) & 0xff;
  bytes[5] = now & 0xff;

  // Version 7 in 4 bits
  bytes[6] = 0x70 | (bytes[6] & 0x0f);
  // Variant 10xx in 2 bits
  bytes[8] = 0x80 | (bytes[8] & 0x3f);

  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

// NanoID generator
export function generateNanoId(size: number = 21, alphabet: string = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-'): string {
  let id = '';
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < size; i++) {
    id += alphabet[bytes[i] % alphabet.length];
  }
  return id;
}

// Secure Password & Token Generator
export interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  avoidAmbiguous: boolean; // e.g. 0, O, 1, l, I
}

export function generateSecurePassword(opts: PasswordOptions): { password: string; entropyBits: number } {
  let charset = '';
  if (opts.lowercase) charset += opts.avoidAmbiguous ? 'abcdefghijkmnopqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
  if (opts.uppercase) charset += opts.avoidAmbiguous ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (opts.numbers) charset += opts.avoidAmbiguous ? '23456789' : '0123456789';
  if (opts.symbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

  if (!charset) charset = 'abcdefghijklmnopqrstuvwxyz0123456789';

  const randomValues = new Uint32Array(opts.length);
  crypto.getRandomValues(randomValues);

  let password = '';
  for (let i = 0; i < opts.length; i++) {
    password += charset[randomValues[i] % charset.length];
  }

  // Calculate entropy: length * log2(charset.length)
  const entropyBits = Math.round(opts.length * Math.log2(charset.length));

  return { password, entropyBits };
}
