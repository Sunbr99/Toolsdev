import React, { useState, useEffect, useRef } from 'react';
import { Search, Terminal, Key, Database, Clock, Palette, Sparkles, FileCode, Check } from 'lucide-react';
import { ToolTab, CommandItem } from '../types';
import { generateUUIDv4, generateUUIDv7, generateSecurePassword } from '../utils/crypto';
import { getUnixSeconds } from '../utils/timeUtils';
import { copyToClipboard } from '../utils/clipboard';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: ToolTab) => void;
  onNotify: (text: string) => void;
}

const COMMANDS: CommandItem[] = [
  {
    id: 'tab-mobile-capacitor',
    title: 'Android & Capacitor Hub',
    category: 'Navigation',
    description: 'Fix aapt2, android.jar, SDK paths, gradle sync, and audit scam permissions',
    tab: 'mobile-capacitor',
    keywords: ['android', 'capacitor', 'gradle', 'aapt2', 'jar', 'sdk', 'build', 'mobile'],
  },
  {
    id: 'tab-build-hardener',
    title: 'Android Build Hardener',
    category: 'Navigation',
    description: 'Checklist for APK v2/v3 signing, symbol stripping, and live ProGuard/R8 validation',
    tab: 'build-hardener',
    keywords: ['proguard', 'r8', 'signing', 'apksigner', 'zipalign', 'hardening', 'obfuscate', 'debuggable', 'symbols'],
  },
  {
    id: 'tab-build-perf',
    title: 'Build Performance Monitor',
    category: 'Navigation',
    description: 'Analyze Gradle --profile reports, rank slow APK build tasks, and track build speed history',
    tab: 'build-perf',
    keywords: ['gradle', 'performance', 'profile', 'speed', 'slow', 'build time', 'r8', 'aapt2', 'cache'],
  },
  {
    id: 'tab-apk-inspector',
    title: 'APK & AndroidManifest Inspector',
    category: 'Navigation',
    description: 'Audit AndroidManifest.xml flags, inspect APK/AAB ZIP structure locally, and format Keystore SHA-1/SHA-256',
    tab: 'apk-inspector',
    keywords: ['apk', 'aab', 'manifest', 'androidmanifest', 'keystore', 'sha256', 'sha1', 'keytool', 'apksigner', 'permissions'],
  },
  {
    id: 'tab-dependency-integrity',
    title: 'Dependency Integrity Checker',
    category: 'Navigation',
    description: 'Analyze package-lock.json, gradle.lockfile, and verification-metadata.xml before builds',
    tab: 'dependency-integrity',
    keywords: ['dependency', 'lockfile', 'package-lock', 'gradle', 'integrity', 'sha512', 'typosquat', 'confusion', 'supply chain'],
  },
  {
    id: 'tab-site-builder',
    title: 'Website & Code Studio',
    category: 'Navigation',
    description: 'Write HTML, CSS, JS with live preview, templates, index.html export, and code starters',
    tab: 'site-builder',
    keywords: ['website', 'html', 'css', 'javascript', 'preview', 'template', 'playground', 'code', 'react', 'express', 'python'],
  },
  {
    id: 'tab-test-suite',
    title: 'Test Suite Generator',
    category: 'Navigation',
    description: 'Generate Vitest, Jest, and React Testing Library unit test suites from TSX or TypeScript interfaces',
    tab: 'test-suite',
    keywords: ['test', 'vitest', 'jest', 'testing library', 'unit test', 'mock', 'rtl', 'spec', 'tsx'],
  },
  {
    id: 'tab-mock-api',
    title: 'Mock API Server',
    category: 'Navigation',
    description: 'Define REST JSON endpoints, latency, dynamic :params, simulate requests, or export Node.js / MSW server',
    tab: 'mock-api',
    keywords: ['mock', 'api', 'server', 'rest', 'json', 'endpoint', 'msw', 'backend', 'simulate', 'latency'],
  },
  {
    id: 'tab-security-network',
    title: 'Anti-Scam & Security Inspector',
    category: 'Navigation',
    description: 'Expose Inspect Element / screen overlay scams, inspect phishing URLs and network security',
    tab: 'security-network',
    keywords: ['security', 'scam', 'overlay', 'inspect', 'phishing', 'fake', 'network', 'api'],
  },
  {
    id: 'tab-git-hub',
    title: 'Git & GitHub Command Hub',
    category: 'Navigation',
    description: 'Emergency git recipes, .gitignore generator, conventional commits',
    tab: 'git-hub',
    keywords: ['git', 'github', 'commit', 'reset', 'undo', 'gitignore', 'branch'],
  },
  {
    id: 'tab-code-diff',
    title: 'Code Diff & Text Compare',
    category: 'Navigation',
    description: 'Compare two code files side-by-side with line additions and deletions',
    tab: 'code-diff',
    keywords: ['diff', 'compare', 'merge', 'changes', 'code', 'text'],
  },
  {
    id: 'tab-svg-assets',
    title: 'SVG & Mobile Asset Studio',
    category: 'Navigation',
    description: 'Convert SVG to React Component and generate Android/Capacitor app icons in all densities',
    tab: 'svg-assets',
    keywords: ['svg', 'icon', 'android', 'capacitor', 'assets', 'react', 'resizer'],
  },
  {
    id: 'tab-env-config',
    title: '.env Sanitizer & Config Architect',
    category: 'Navigation',
    description: 'Clean .env into .env.example, convert to Docker Compose and JSON',
    tab: 'env-config',
    keywords: ['env', 'dotenv', 'config', 'docker', 'secrets', 'example'],
  },
  {
    id: 'tab-http-status',
    title: 'HTTP Status & CORS Encyclopedia',
    category: 'Navigation',
    description: 'HTTP status codes 100-599 troubleshooting and CORS headers builder',
    tab: 'http-status',
    keywords: ['http', 'cors', 'status', '401', '403', '502', '504', 'header', 'express', 'nginx'],
  },
  {
    id: 'tab-api-curl',
    title: 'API & cURL Workbench',
    category: 'Navigation',
    description: 'Convert cURL to Fetch, Axios, Python, Go, and test live HTTP endpoints',
    tab: 'api-curl',
    keywords: ['curl', 'fetch', 'axios', 'python', 'api', 'http', 'request', 'postman'],
  },
  {
    id: 'tab-json-architect',
    title: 'JSON & Type Architect',
    category: 'Navigation',
    description: 'Format, auto-repair invalid JSON, generate TypeScript/Zod/Go/Pydantic types',
    tab: 'json-architect',
    keywords: ['json', 'format', 'repair', 'typescript', 'zod', 'go', 'pydantic', 'diff'],
  },
  {
    id: 'tab-jwt-crypto',
    title: 'JWT & Cryptography Studio',
    category: 'Navigation',
    description: 'Decode & sign JWTs, generate SHA-256/MD5/HMAC, UUID v4/v7, passwords',
    tab: 'jwt-crypto',
    keywords: ['jwt', 'token', 'crypto', 'hash', 'sha256', 'md5', 'base64', 'uuid', 'password'],
  },
  {
    id: 'tab-regex-lab',
    title: 'Regex Lab & Explainer',
    category: 'Navigation',
    description: 'Visual regex tester with capture groups, token explanation, and production patterns',
    tab: 'regex-lab',
    keywords: ['regex', 'regexp', 'regular expression', 'pattern', 'test', 'match'],
  },
  {
    id: 'tab-sql-studio',
    title: 'SQL & Database Lab',
    category: 'Navigation',
    description: 'Format SQL queries, convert CREATE TABLE DDL to TypeScript, generate mock data',
    tab: 'sql-studio',
    keywords: ['sql', 'database', 'format', 'ddl', 'schema', 'insert', 'seed', 'postgres'],
  },
  {
    id: 'tab-cron-time',
    title: 'Cron & Epoch Master',
    category: 'Navigation',
    description: 'Cron scheduler explanation, next 5 execution preview, live Unix epoch converter',
    tab: 'cron-time',
    keywords: ['cron', 'epoch', 'unix', 'time', 'timestamp', 'schedule', 'date'],
  },
  {
    id: 'tab-css-web',
    title: 'CSS & Web Designer',
    category: 'Navigation',
    description: 'Multi-layer box shadow generator, glassmorphism CSS, and WCAG contrast checker',
    tab: 'css-web',
    keywords: ['css', 'shadow', 'glassmorphism', 'wcag', 'contrast', 'color', 'tailwind'],
  },
  {
    id: 'tab-wcag-contrast',
    title: 'WCAG Contrast Checker',
    category: 'Navigation',
    description: 'Pick foreground and background colors, validate WCAG AA/AAA ratios, and auto-fix failing shades',
    tab: 'wcag-contrast',
    keywords: ['wcag', 'contrast', 'accessibility', 'a11y', 'aa', 'aaa', 'color', 'luminance', 'hex'],
  },
  // Instant Quick Actions
  {
    id: 'action-copy-uuid-v4',
    title: 'Copy New UUID v4',
    category: 'Quick Action',
    description: 'Generates a RFC 4122 random UUID and copies directly to clipboard',
    tab: 'jwt-crypto',
    subAction: 'copy-uuid-v4',
    keywords: ['uuid', 'v4', 'guid', 'generate', 'random', 'id'],
  },
  {
    id: 'action-copy-uuid-v7',
    title: 'Copy New UUID v7 (Time-Ordered)',
    category: 'Quick Action',
    description: 'Generates a time-sortable RFC 9562 UUID v7 and copies to clipboard',
    tab: 'jwt-crypto',
    subAction: 'copy-uuid-v7',
    keywords: ['uuid', 'v7', 'time', 'sortable', 'id'],
  },
  {
    id: 'action-copy-epoch',
    title: 'Copy Current Unix Epoch (Seconds)',
    category: 'Quick Action',
    description: 'Copies current timestamp in seconds since January 1, 1970 UTC',
    tab: 'cron-time',
    subAction: 'copy-epoch',
    keywords: ['epoch', 'unix', 'timestamp', 'now', 'time', 'seconds'],
  },
  {
    id: 'action-copy-iso',
    title: 'Copy Current ISO 8601 Timestamp',
    category: 'Quick Action',
    description: 'Copies ISO UTC timestamp (e.g. 2026-10-24T10:25:00.000Z)',
    tab: 'cron-time',
    subAction: 'copy-iso',
    keywords: ['iso', '8601', 'date', 'utc', 'time', 'now'],
  },
  {
    id: 'action-copy-password',
    title: 'Copy 32-char High-Entropy Secret Key',
    category: 'Quick Action',
    description: 'Generates a secure 32-character API key / password (192-bit entropy)',
    tab: 'jwt-crypto',
    subAction: 'copy-secret',
    keywords: ['password', 'secret', 'key', 'token', 'api key', 'random'],
  },
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  onNotify,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredCommands = COMMANDS.filter((cmd) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      cmd.title.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q) ||
      cmd.keywords.some((k) => k.toLowerCase().includes(q))
    );
  });

  const handleSelect = async (cmd: CommandItem) => {
    if (cmd.subAction) {
      if (cmd.subAction === 'copy-uuid-v4') {
        const val = generateUUIDv4();
        await copyToClipboard(val);
        onNotify(`Copied UUID v4: ${val}`);
      } else if (cmd.subAction === 'copy-uuid-v7') {
        const val = generateUUIDv7();
        await copyToClipboard(val);
        onNotify(`Copied UUID v7: ${val}`);
      } else if (cmd.subAction === 'copy-epoch') {
        const val = getUnixSeconds().toString();
        await copyToClipboard(val);
        onNotify(`Copied Epoch: ${val}`);
      } else if (cmd.subAction === 'copy-iso') {
        const val = new Date().toISOString();
        await copyToClipboard(val);
        onNotify(`Copied ISO: ${val}`);
      } else if (cmd.subAction === 'copy-secret') {
        const { password } = generateSecurePassword({
          length: 32,
          uppercase: true,
          lowercase: true,
          numbers: true,
          symbols: true,
          avoidAmbiguous: true,
        });
        await copyToClipboard(password);
        onNotify('Copied 32-character high-entropy secret key');
      }
    } else {
      onSelectTab(cmd.tab);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        handleSelect(filteredCommands[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-20 px-3 sm:px-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl bg-neutral-950 border border-amber-500/30 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-stone-800">
          <Search className="w-5 h-5 text-amber-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a tool name, format, or quick action (e.g. 'apk', 'json', 'uuid', 'curl')..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-sm text-stone-100 placeholder-stone-500 focus:outline-none"
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-stone-400 bg-neutral-900 border border-stone-800 rounded">
            ESC
          </kbd>
        </div>

        <div className="max-h-96 overflow-y-auto py-2">
          {filteredCommands.length === 0 ? (
            <div className="py-10 text-center text-sm text-stone-500">
              No developer tools found matching "{query}"
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => handleSelect(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-4 py-2.5 mx-2 rounded-lg cursor-pointer transition-colors ${
                    isSelected ? 'bg-amber-500/15 text-amber-100 border border-amber-500/35' : 'text-stone-300 hover:bg-neutral-900'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 rounded-md bg-neutral-900 border border-stone-800 text-amber-400 shrink-0">
                      {cmd.category === 'Quick Action' ? (
                        <Sparkles className="w-4 h-4" />
                      ) : cmd.tab === 'api-curl' ? (
                        <Terminal className="w-4 h-4" />
                      ) : cmd.tab === 'jwt-crypto' ? (
                        <Key className="w-4 h-4" />
                      ) : cmd.tab === 'sql-studio' ? (
                        <Database className="w-4 h-4" />
                      ) : cmd.tab === 'cron-time' ? (
                        <Clock className="w-4 h-4" />
                      ) : (
                        <FileCode className="w-4 h-4" />
                      )}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold tracking-tight text-stone-100">{cmd.title}</span>
                        <span className="text-[11px] text-stone-500">{cmd.category}</span>
                      </div>
                      <p className="text-xs text-stone-400 truncate">{cmd.description}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <kbd className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                      <span>Select</span>
                      <span>↵</span>
                    </kbd>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-950 border-t border-stone-800 text-[11px] text-stone-500">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span aria-hidden="true">·</span>
            <span>↵ Select</span>
            <span aria-hidden="true">·</span>
            <span>Esc Close</span>
          </div>
          <span>DevForge Studio · Dev.Aistudio x MW Next</span>
        </div>
      </div>
    </div>
  );
};
