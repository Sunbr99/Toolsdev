import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, Sparkles, LayoutGrid, ChevronDown, X } from 'lucide-react';
import { ToolTab, ToolCategory } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  currentTab: ToolTab;
  onSelectTab: (tab: ToolTab) => void;
  onOpenCommandPalette: () => void;
  onToggleScratchpad: () => void;
  onOpenWorkflows: () => void;
}

export const CATEGORIES: { id: ToolCategory; label: string; shortLabel: string }[] = [
  { id: 'all', label: 'All (22)', shortLabel: 'All (22)' },
  { id: 'android', label: 'Android & Build (4)', shortLabel: 'Android (4)' },
  { id: 'security', label: 'Security & Audit (4)', shortLabel: 'Security (4)' },
  { id: 'web', label: 'Web & Design (4)', shortLabel: 'Web (4)' },
  { id: 'api-data', label: 'API & Data (10)', shortLabel: 'API & Data (10)' },
];

export const TABS: {
  id: ToolTab;
  label: string;
  description: string;
  category: Exclude<ToolCategory, 'all'>;
}[] = [
  // Android & Build
  {
    id: 'mobile-capacitor',
    label: 'Android & Capacitor',
    description: 'แก้ Gradle/aapt2/Termux & สร้าง config มือถือ',
    category: 'android',
  },
  {
    id: 'build-hardener',
    label: 'Build Hardener',
    description: 'ตรวจ ProGuard/R8, APK v2/v3 signing & strip symbols',
    category: 'android',
  },
  {
    id: 'build-perf',
    label: 'Build Perf',
    description: 'วิเคราะห์เวลา Gradle --profile & จูนความเร็ว Build',
    category: 'android',
  },
  {
    id: 'apk-inspector',
    label: 'APK & Manifest',
    description: 'ตรวจ AndroidManifest.xml, ไฟล์ .apk/.aab & Keystore SHA',
    category: 'android',
  },
  // Security & Audit
  {
    id: 'dependency-integrity',
    label: 'Lockfile Audit',
    description: 'ตรวจ package-lock.json & gradle.lockfile ก่อน Build',
    category: 'security',
  },
  {
    id: 'env-config',
    label: '.env Sanitizer',
    description: 'ล้างความลับเป็น .env.example, Docker & JSON',
    category: 'security',
  },
  {
    id: 'jwt-crypto',
    label: 'JWT & Crypto',
    description: 'ถอดรหัส/เซ็น JWT, Hash, UUID v4/v7 & รหัสผ่าน',
    category: 'security',
  },
  {
    id: 'security-network',
    label: 'Anti-Scam & Security',
    description: 'ตรวจลิงก์ปลอม, Phishing & เครือข่ายปลอดภัย',
    category: 'security',
  },
  // Web & Design
  {
    id: 'site-builder',
    label: 'Site & Code',
    description: 'เขียน HTML/CSS/JS พร้อมพรีวิว Desktop/Mobile สด',
    category: 'web',
  },
  {
    id: 'css-web',
    label: 'CSS & Design',
    description: 'สร้าง Box Shadow, Glassmorphism & CSS Layout',
    category: 'web',
  },
  {
    id: 'wcag-contrast',
    label: 'WCAG Contrast',
    description: 'เช็กคู่สีผ่านเกณฑ์ AA/AAA พร้อมแนะนำเฉดสีอัตโนมัติ',
    category: 'web',
  },
  {
    id: 'svg-assets',
    label: 'SVG & Icons',
    description: 'แปลง SVG เป็น React & ย่อไอคอน Android ครบขนาด',
    category: 'web',
  },
  // API & Data
  {
    id: 'mock-api',
    label: 'Mock API',
    description: 'จำลอง Endpoint JSON, Latency & Export Server/MSW',
    category: 'api-data',
  },
  {
    id: 'api-curl',
    label: 'API & cURL',
    description: 'แปลง cURL เป็น Fetch/Axios/Python & ยิงทดสอบสด',
    category: 'api-data',
  },
  {
    id: 'http-status',
    label: 'HTTP & CORS',
    description: 'คู่มือรหัส HTTP 100-599 & สร้าง CORS Headers',
    category: 'api-data',
  },
  {
    id: 'test-suite',
    label: 'Test Gen',
    description: 'สร้าง Unit Test Vitest/Jest/RTL จากโค้ดอัตโนมัติ',
    category: 'api-data',
  },
  {
    id: 'json-architect',
    label: 'JSON & Types',
    description: 'ซ่อม JSON พัง & แปลงเป็น TypeScript/Zod/Go',
    category: 'api-data',
  },
  {
    id: 'sql-studio',
    label: 'SQL Studio',
    description: 'จัดฟอร์แมต SQL, แปลง DDL & สร้าง Mock INSERT',
    category: 'api-data',
  },
  {
    id: 'regex-lab',
    label: 'Regex Lab',
    description: 'ทดสอบ Regex สด พร้อมอธิบาย Token & Pattern พร้อมใช้',
    category: 'api-data',
  },
  {
    id: 'code-diff',
    label: 'Code Diff',
    description: 'เปรียบเทียบโค้ด 2 ฝั่ง หาบรรทัดเพิ่ม/ลบชัดเจน',
    category: 'api-data',
  },
  {
    id: 'git-hub',
    label: 'Git Hub',
    description: 'สูตรแก้ปัญหา Git ฉุกเฉิน & สร้าง .gitignore',
    category: 'api-data',
  },
  {
    id: 'cron-time',
    label: 'Cron & Epoch',
    description: 'คำนวณตาราง Cron ล่วงหน้า & แปลง Unix Timestamp',
    category: 'api-data',
  },
];

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenCommandPalette,
  onToggleScratchpad,
  onOpenWorkflows,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory>('all');
  const [isAllToolsOpen, setIsAllToolsOpen] = useState(false);
  const prevTabRef = useRef<ToolTab>(currentTab);
  const activeTabButtonRef = useRef<HTMLButtonElement | null>(null);

  // Sync category filter ONLY when currentTab changes externally (e.g. Command Palette / Workflows)
  useEffect(() => {
    if (prevTabRef.current === currentTab) return;
    prevTabRef.current = currentTab;

    if (selectedCategory !== 'all') {
      const activeTabDef = TABS.find((t) => t.id === currentTab);
      if (activeTabDef && activeTabDef.category !== selectedCategory) {
        setSelectedCategory(activeTabDef.category);
      }
    }
  }, [currentTab, selectedCategory]);

  // Keep active tab visible in horizontal strip
  useEffect(() => {
    activeTabButtonRef.current?.scrollIntoView({
      behavior: 'smooth',
      inline: 'nearest',
      block: 'nearest',
    });
  }, [currentTab, selectedCategory]);

  const handleCategoryClick = (catId: ToolCategory) => {
    if (catId === 'all') {
      if (selectedCategory === 'all') {
        setIsAllToolsOpen((prev) => !prev);
      } else {
        setSelectedCategory('all');
        setIsAllToolsOpen(true);
      }
      return;
    }

    setSelectedCategory(catId);
    setIsAllToolsOpen(false);
  };

  const handleSelectToolFromMenu = (tabId: ToolTab) => {
    onSelectTab(tabId);
    setIsAllToolsOpen(false);
  };

  const visibleTabs =
    selectedCategory === 'all' ? TABS : TABS.filter((t) => t.category === selectedCategory);

  const groupedCategories = CATEGORIES.filter((c) => c.id !== 'all') as {
    id: Exclude<ToolCategory, 'all'>;
    label: string;
    shortLabel: string;
  }[];

  return (
    <div className="sticky top-0 z-40 safe-top bg-neutral-950/92 backdrop-blur-md border-b border-amber-500/20 shadow-lg">
      <header className="flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 py-2.5 sm:py-3">
        {/* Zone 1: Custom Emblem & Brand Wordmark */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 min-w-0">
          <img
            src="/assets/aistudio/icon_68d78a75.png"
            alt="MW Next Emblem"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-cover border border-amber-500/40 shadow-md shrink-0"
          />
          <button
            onClick={() => {
              setSelectedCategory('all');
              setIsAllToolsOpen(false);
              onSelectTab('mobile-capacitor');
            }}
            className="text-sm sm:text-base font-bold tracking-tight text-amber-50 whitespace-nowrap truncate hover:text-amber-300 transition-colors"
          >
            DevForge Studio
          </button>
        </div>

        {/* Zone 2: Category Filter Strip (Desktop XL+) */}
        <div className="hidden xl:flex items-center gap-1 p-1 bg-neutral-900/90 rounded-lg border border-amber-500/15 shrink-0">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            const isAll = cat.id === 'all';
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                aria-expanded={isAll ? isAllToolsOpen : undefined}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'text-stone-400 hover:text-stone-100 hover:bg-neutral-800/70'
                }`}
              >
                {isAll && <LayoutGrid className="w-3.5 h-3.5" />}
                <span>{cat.label}</span>
                {isAll && (
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-150 ${
                      isAllToolsOpen ? 'rotate-180' : ''
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Zone 3: Action Cluster + In-App PWA Install Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <PWAInstallButton />

          <button
            onClick={onOpenWorkflows}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-950/50 hover:bg-amber-900/50 border border-amber-500/30 rounded-lg transition-colors whitespace-nowrap shrink-0"
            title="คู่มือ & ประโยชน์ในการใช้งาน (Use Cases)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Use Cases &amp; คู่มือ</span>
          </button>

          <button
            onClick={onOpenCommandPalette}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-stone-200 bg-neutral-900 hover:bg-neutral-800 border border-stone-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            title="Command Palette (Cmd+K / Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Search Tools</span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-stone-400 bg-neutral-950 rounded border border-stone-800">
              ⌘K
            </kbd>
          </button>

          <button
            onClick={onToggleScratchpad}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-stone-200 bg-neutral-900 hover:bg-neutral-800 border border-stone-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            title="Quick Scratchpad"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Scratchpad</span>
          </button>
        </div>
      </header>

      {/* Mobile & Tablet Category Filter Row */}
      <div className="xl:hidden flex items-center gap-1.5 px-3 sm:px-6 pt-1.5 pb-1.5 overflow-x-auto scrollbar-none border-t border-stone-800/70">
        {CATEGORIES.map((cat) => {
          const active = selectedCategory === cat.id;
          const isAll = cat.id === 'all';
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              aria-expanded={isAll ? isAllToolsOpen : undefined}
              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-stone-400 bg-neutral-900/60 border border-stone-800 hover:text-stone-200'
              }`}
            >
              {isAll && <LayoutGrid className="w-3 h-3" />}
              <span>{cat.shortLabel}</span>
              {isAll && (
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-150 ${
                    isAllToolsOpen ? 'rotate-180' : ''
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Expandable All-22 Tools Directory Panel (Triggered by All (22)) */}
      {isAllToolsOpen && (
        <div className="border-t border-amber-500/25 bg-neutral-950/98 backdrop-blur-xl px-3 sm:px-6 py-4 max-h-[70dvh] overflow-y-auto shadow-2xl">
          <div className="max-w-7xl mx-auto space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-amber-400" />
                <span className="text-xs sm:text-sm font-bold text-amber-100">
                  เครื่องมือทั้งหมด 22 รายการ (All 22 Tools Directory)
                </span>
              </div>
              <button
                onClick={() => setIsAllToolsOpen(false)}
                aria-label="Close all tools directory"
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-stone-400 hover:text-stone-100 hover:bg-neutral-800 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>ปิด</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {groupedCategories.map((cat) => {
                const catTools = TABS.filter((t) => t.category === cat.id);
                return (
                  <div
                    key={cat.id}
                    className="rounded-xl bg-neutral-900/75 border border-stone-800 p-3 space-y-2"
                  >
                    <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 px-1">
                      {cat.label}
                    </div>
                    <div className="space-y-1">
                      {catTools.map((tool) => {
                        const isActive = currentTab === tool.id;
                        return (
                          <button
                            key={tool.id}
                            onClick={() => handleSelectToolFromMenu(tool.id)}
                            className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors border ${
                              isActive
                                ? 'bg-amber-500/15 border-amber-500/45 text-amber-100'
                                : 'bg-neutral-950/70 border-stone-800/80 text-stone-300 hover:border-amber-500/30 hover:text-stone-100'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold">{tool.label}</span>
                              {isActive && (
                                <span className="text-[10px] font-mono text-amber-300">Active</span>
                              )}
                            </div>
                            <p className="text-[11px] text-stone-400 mt-0.5 line-clamp-1">
                              {tool.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Horizontal Scrollable Tool Tabs Bar (Responsive across Phone, Tablet & Desktop) */}
      <nav
        aria-label="Tools navigation"
        className="flex items-center gap-1.5 px-3 sm:px-6 py-2 overflow-x-auto scrollbar-none border-t border-amber-500/10 bg-neutral-950/60"
      >
        {visibleTabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={isActive ? activeTabButtonRef : null}
              onClick={() => onSelectTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : 'text-stone-400 bg-neutral-900/80 border border-stone-800/80 hover:text-stone-100 hover:border-amber-500/30'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
