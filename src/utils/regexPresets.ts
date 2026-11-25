export interface RegexPreset {
  name: string;
  category: string;
  pattern: string;
  flags: string;
  sampleText: string;
  description: string;
}

export const REGEX_PRESETS: RegexPreset[] = [
  {
    name: 'RFC 5322 Email Address',
    category: 'Validation',
    pattern: '^[a-zA-Z0-9.!#$%&\'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$',
    flags: 'i',
    sampleText: 'dev.lead@engineering.techcorp.io\ninvalid..email@example\nuser.name+tag@sub.domain.co.th',
    description: 'Standard compliant email format supporting subdomains and tags',
  },
  {
    name: 'URL / Web Address with Port & Protocol',
    category: 'Web',
    pattern: 'https?:\\/\\/(?:www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-a-zA-Z0-9()@:%_\\+.~#?&\\/=]*)',
    flags: 'gi',
    sampleText: 'Check out https://github.com/torvalds/linux or http://localhost:3000/api/v1/metrics?format=json',
    description: 'Matches HTTP/HTTPS web URLs with path, port, and query strings',
  },
  {
    name: 'IPv4 Address with Port',
    category: 'Networking',
    pattern: '\\b(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?::\\d{1,5})?\\b',
    flags: 'g',
    sampleText: 'Gateway: 192.168.1.1:8080, DNS: 8.8.8.8, Cluster: 10.244.0.1:443, Bad: 999.12.3.4',
    description: 'Matches valid 0-255 IPv4 octets with optional port numbers',
  },
  {
    name: 'Semantic Versioning (SemVer 2.0.0)',
    category: 'Software',
    pattern: '^v?(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$',
    flags: 'm',
    sampleText: 'v1.2.3\n2.0.0-rc.1+build.123\n0.10.5-beta\n1.0',
    description: 'Validates official SemVer versions including pre-release and build metadata tags',
  },
  {
    name: 'UUID v4 / Standard GUID',
    category: 'Data',
    pattern: '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}',
    flags: 'gi',
    sampleText: 'Session ID: c7670262-847b-4dcc-84b3-549a19ab4956 and secondary: e4eaaaf2-d142-11e1-b3e4-080027620cdd',
    description: 'Matches 36-character hexadecimal UUID / GUID tokens',
  },
  {
    name: 'ISO 8601 UTC / Timezone Timestamps',
    category: 'Date & Time',
    pattern: '\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:?\\d{2})?',
    flags: 'g',
    sampleText: 'Created: 2026-10-24T10:25:28.123Z, Updated: 2026-10-24T17:25:28+07:00',
    description: 'Standard ISO date-time representation including Zulu and timezone offsets',
  },
  {
    name: 'Thai Mobile Phone & Landline Format',
    category: 'Regional',
    pattern: '^(?:0[689]\\d{8}|0[2-7]\\d{7})$',
    flags: 'm',
    sampleText: '0812345678\n0987654321\n021234567\n0123456789',
    description: 'Validates Thai mobile (06, 08, 09 + 8 digits) and landline (02-07 + 7 digits)',
  },
  {
    name: 'Thai National ID Card (13 Digits)',
    category: 'Regional',
    pattern: '^[1-8]\\d{12}$',
    flags: 'm',
    sampleText: '1100501234567\n3100609876543\n0123456789123',
    description: 'Validates 13-digit Thai national citizen identification numbers',
  },
  {
    name: 'Hex Color Codes (#RGB, #RRGGBB, #RRGGBBAA)',
    category: 'CSS',
    pattern: '#(?:[0-9a-fA-F]{3,4}){1,2}\\b',
    flags: 'g',
    sampleText: 'Primary: #6366f1, Dark: #0f172a, Accent: #06b6d480, Short: #fff, #3b8',
    description: 'Matches 3, 4, 6, and 8 digit CSS hexadecimal color codes',
  },
  {
    name: 'URL Slug / Clean Permalink',
    category: 'Web',
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
    flags: '',
    sampleText: 'building-god-tier-devtools-in-2026',
    description: 'Matches lowercase alphanumeric strings with single hyphens between words',
  }
];

export interface RegexMatchResult {
  match: string;
  index: number;
  length: number;
  groups: string[];
}

export function executeRegex(pattern: string, flags: string, text: string): { matches: RegexMatchResult[]; error?: string } {
  try {
    const regex = new RegExp(pattern, flags);
    const matches: RegexMatchResult[] = [];

    if (flags.includes('g')) {
      let m;
      let count = 0;
      // Prevent infinite loops on zero-length matches
      while ((m = regex.exec(text)) !== null && count < 1000) {
        matches.push({
          match: m[0],
          index: m.index,
          length: m[0].length,
          groups: m.slice(1),
        });
        if (m[0].length === 0) {
          regex.lastIndex++;
        }
        count++;
      }
    } else {
      const m = regex.exec(text);
      if (m) {
        matches.push({
          match: m[0],
          index: m.index,
          length: m[0].length,
          groups: m.slice(1),
        });
      }
    }

    return { matches };
  } catch (err) {
    return { matches: [], error: (err as Error).message };
  }
}

// Token explanation mapping
export function explainRegexTokens(pattern: string): { token: string; explanation: string }[] {
  const explanations: { token: string; explanation: string }[] = [];
  const rules = [
    { regex: /^\^/, token: '^', explanation: 'Start of string or start of line (in multiline mode)' },
    { regex: /\$$/, token: '$', explanation: 'End of string or end of line (in multiline mode)' },
    { regex: /\\d/, token: '\\d', explanation: 'Matches any digit (0-9)' },
    { regex: /\\D/, token: '\\D', explanation: 'Matches any character that is NOT a digit' },
    { regex: /\\w/, token: '\\w', explanation: 'Matches any word character (alphanumeric and underscore)' },
    { regex: /\\W/, token: '\\W', explanation: 'Matches any non-word character' },
    { regex: /\\s/, token: '\\s', explanation: 'Matches any whitespace character (space, tab, newline)' },
    { regex: /\\b/, token: '\\b', explanation: 'Word boundary (transition between word and non-word)' },
    { regex: /\+/, token: '+', explanation: 'Quantifier: Matches 1 or more of preceding token' },
    { regex: /\*/, token: '*', explanation: 'Quantifier: Matches 0 or more of preceding token' },
    { regex: /\?/, token: '?', explanation: 'Quantifier: Matches 0 or 1 of preceding token (or non-greedy)' },
    { regex: /\[\^/, token: '[^...]', explanation: 'Negated character set (matches any character NOT enclosed)' },
    { regex: /\[/, token: '[...]', explanation: 'Character set (matches any single character enclosed)' },
    { regex: /\(\?<=/, token: '(?<=...)', explanation: 'Positive Lookbehind assertion' },
    { regex: /\(\?<!/, token: '(?<!...)', explanation: 'Negative Lookbehind assertion' },
    { regex: /\(\?=/ , token: '(?=...)', explanation: 'Positive Lookahead assertion' },
    { regex: /\(\?!/ , token: '(?!...)', explanation: 'Negative Lookahead assertion' },
    { regex: /\(\?:/ , token: '(?:...)', explanation: 'Non-capturing group' },
    { regex: /\(/   , token: '(...)', explanation: 'Capturing group' },
    { regex: /\|/   , token: '|', explanation: 'Alternation (Boolean OR)' },
  ];

  for (const rule of rules) {
    if (rule.regex.test(pattern)) {
      explanations.push({ token: rule.token, explanation: rule.explanation });
    }
  }

  return explanations;
}
