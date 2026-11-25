import { base64UrlDecode, base64UrlEncode, computeHMAC } from './crypto';

export interface DecodedJwt {
  raw: string;
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  isExpired: boolean;
  expiresInText: string;
  issuedAtText: string;
  validFromText: string;
  claimsInfo: { claim: string; value: string; description: string }[];
  isValidFormat: boolean;
  error?: string;
}

const CLAIM_DESCRIPTIONS: Record<string, string> = {
  iss: 'Issuer - Identifies the principal that issued the JWT',
  sub: 'Subject - Identifies the principal that is the subject of the JWT (e.g. user ID)',
  aud: 'Audience - Identifies the recipients that the JWT is intended for',
  exp: 'Expiration Time - Identifies the expiration time on or after which the JWT MUST NOT be accepted',
  nbf: 'Not Before - Identifies the time before which the JWT MUST NOT be accepted',
  iat: 'Issued At - Identifies the time at which the JWT was issued',
  jti: 'JWT ID - Provides a unique identifier for the JWT',
  name: 'Full Name of the subject',
  email: 'Email address of the subject',
  roles: 'Assigned system roles or permissions',
  scope: 'OAuth authorization scopes granted to the client',
};

export function parseJwt(token: string): DecodedJwt {
  const clean = token.trim();
  const parts = clean.split('.');

  if (parts.length !== 3) {
    return {
      raw: clean,
      header: {},
      payload: {},
      signature: '',
      isExpired: false,
      expiresInText: 'N/A',
      issuedAtText: 'N/A',
      validFromText: 'N/A',
      claimsInfo: [],
      isValidFormat: false,
      error: 'JWT must consist of exactly 3 parts separated by dots (header.payload.signature)',
    };
  }

  try {
    const headerStr = base64UrlDecode(parts[0]);
    const payloadStr = base64UrlDecode(parts[1]);

    const header = JSON.parse(headerStr);
    const payload = JSON.parse(payloadStr);
    const signature = parts[2];

    const now = Math.floor(Date.now() / 1000);
    let isExpired = false;
    let expiresInText = 'No expiration claim (exp)';
    let issuedAtText = 'Not specified (iat)';
    let validFromText = 'Not specified (nbf)';

    if (typeof payload.exp === 'number') {
      const exp = payload.exp;
      const diff = exp - now;
      if (diff <= 0) {
        isExpired = true;
        expiresInText = `Expired ${formatRelativeTime(Math.abs(diff))} ago (${new Date(exp * 1000).toLocaleString()})`;
      } else {
        isExpired = false;
        expiresInText = `Valid for ${formatRelativeTime(diff)} (${new Date(exp * 1000).toLocaleString()})`;
      }
    }

    if (typeof payload.iat === 'number') {
      issuedAtText = new Date(payload.iat * 1000).toLocaleString();
    }

    if (typeof payload.nbf === 'number') {
      validFromText = new Date(payload.nbf * 1000).toLocaleString();
    }

    const claimsInfo = Object.entries(payload).map(([k, v]) => ({
      claim: k,
      value: typeof v === 'object' ? JSON.stringify(v) : String(v),
      description: CLAIM_DESCRIPTIONS[k] || 'Custom application claim',
    }));

    return {
      raw: clean,
      header,
      payload,
      signature,
      isExpired,
      expiresInText,
      issuedAtText,
      validFromText,
      claimsInfo,
      isValidFormat: true,
    };
  } catch (err) {
    return {
      raw: clean,
      header: {},
      payload: {},
      signature: parts[2] || '',
      isExpired: false,
      expiresInText: 'Error decoding',
      issuedAtText: 'Error',
      validFromText: 'Error',
      claimsInfo: [],
      isValidFormat: false,
      error: (err as Error).message,
    };
  }
}

function formatRelativeTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

// Create and sign a mock JWT with HS256
export async function createSignedJwt(header: Record<string, unknown>, payload: Record<string, unknown>, secret: string): Promise<string> {
  const encHeader = base64UrlEncode(JSON.stringify(header));
  const encPayload = base64UrlEncode(JSON.stringify(payload));
  const message = `${encHeader}.${encPayload}`;
  
  if (!secret) {
    return `${message}.unsigned`;
  }
  
  const hexHash = await computeHMAC(message, secret, 'SHA-256');
  // convert hex to bytes then base64url
  const bytes = new Uint8Array(hexHash.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
  const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  const signature = btoa(binString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  
  return `${message}.${signature}`;
}
