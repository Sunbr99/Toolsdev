/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar, TABS } from './components/Navbar';
import { CommandPalette } from './components/CommandPalette';
import { ScratchpadDrawer } from './components/ScratchpadDrawer';
import { WorkflowsModal } from './components/WorkflowsModal';
import { ToastContainer } from './components/Toast';
import { OfflineIndicator } from './components/OfflineIndicator';
import { MobileCapacitorStudio } from './components/tools/MobileCapacitorStudio';
import { BuildHardenerStudio } from './components/tools/BuildHardenerStudio';
import { BuildPerformanceStudio } from './components/tools/BuildPerformanceStudio';
import { ApkInspectorStudio } from './components/tools/ApkInspectorStudio';
import { DependencyIntegrityStudio } from './components/tools/DependencyIntegrityStudio';
import { SiteBuilderStudio } from './components/tools/SiteBuilderStudio';
import { TestSuiteStudio } from './components/tools/TestSuiteStudio';
import { MockApiStudio } from './components/tools/MockApiStudio';
import { SecurityNetworkStudio } from './components/tools/SecurityNetworkStudio';
import { GitHubStudio } from './components/tools/GitHubStudio';
import { CodeDiffStudio } from './components/tools/CodeDiffStudio';
import { SvgAssetStudio } from './components/tools/SvgAssetStudio';
import { EnvConfigStudio } from './components/tools/EnvConfigStudio';
import { HttpStatusStudio } from './components/tools/HttpStatusStudio';
import { ApiCurlStudio } from './components/tools/ApiCurlStudio';
import { JsonSchemaArchitect } from './components/tools/JsonSchemaArchitect';
import { JwtCryptoStudio } from './components/tools/JwtCryptoStudio';
import { RegexLab } from './components/tools/RegexLab';
import { SqlDataStudio } from './components/tools/SqlDataStudio';
import { CronTimeStudio } from './components/tools/CronTimeStudio';
import { CssWebStudio } from './components/tools/CssWebStudio';
import { WcagContrastStudio } from './components/tools/WcagContrastStudio';
import { ToolTab, ToastMessage } from './types';
import { Sparkles, PackageCheck, Loader2 } from 'lucide-react';

const ACTIVE_TAB_KEY = 'devforge_active_tab_v1';

export default function App() {
  const [currentTab, setCurrentTab] = useState<ToolTab>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_TAB_KEY);
      if (saved && TABS.some((t) => t.id === saved)) {
        return saved as ToolTab;
      }
      return 'mobile-capacitor';
    } catch {
      return 'mobile-capacitor';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_TAB_KEY, currentTab);
    } catch { /* ignore */ }
  }, [currentTab]);

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);
  const [isWorkflowsModalOpen, setIsWorkflowsModalOpen] = useState(false);
  const [hasBundleDownload, setHasBundleDownload] = useState(false);
  const [isDownloadingBundle, setIsDownloadingBundle] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    let active = true;
    fetch('/download-project-bundle.zip', { method: 'HEAD' })
      .then((res) => {
        if (!active) return;
        const ct = res.headers.get('content-type') || '';
        setHasBundleDownload(res.ok && ct.includes('application/zip'));
      })
      .catch(() => {
        if (active) setHasBundleDownload(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Toast notification dispatcher
  const notify = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleDownloadProjectBundle = async () => {
    if (isDownloadingBundle) return;
    setIsDownloadingBundle(true);
    try {
      const res = await fetch('/download-project-bundle.zip', {
        method: 'GET',
        cache: 'no-store',
        credentials: 'same-origin',
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const buffer = await res.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      // Verify PK ZIP magic header (0x50 0x4B) so HTML redirects are never saved as .zip
      if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
        throw new Error('Response is not a valid ZIP archive (received HTML or invalid payload)');
      }

      const blob = new Blob([buffer], { type: 'application/zip' });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'devforge-studio-git-apk.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);

      const mb = (bytes.length / (1024 * 1024)).toFixed(1);
      notify(`ดาวน์โหลด devforge-studio-git-apk.zip สำเร็จ (${mb} MB · ไฟล์ .zip สมบูรณ์)`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Download failed';
      notify(`ไม่สามารถดาวน์โหลดไฟล์ .zip ได้: ${message}`, 'error');
    } finally {
      setIsDownloadingBundle(false);
    }
  };

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative min-h-[100dvh] bg-neutral-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/25 selection:text-amber-200 overflow-x-clip">
      {/* Fixed Obsidian & Gold Geometric Background Layer */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-45"
        style={{
          backgroundImage: "url('/assets/aistudio/____________Canva___________a658a214.png')",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-neutral-950/75 via-neutral-950/70 to-neutral-950/90"
      />

      {/* 3-Zone Top Bar */}
      <div className="relative z-10 flex flex-col min-h-[100dvh]">
        <Navbar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onToggleScratchpad={() => setIsScratchpadOpen((prev) => !prev)}
          onOpenWorkflows={() => setIsWorkflowsModalOpen(true)}
        />

        {/* Main Container (Phone-responsive adaptive padding) */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-6 lg:px-8 py-3 sm:py-6 space-y-4 sm:space-y-6 min-w-0">
          {/* Workspace Identity & Quick Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-4 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl bg-neutral-950/85 backdrop-blur-md border border-amber-500/20 text-xs shadow-lg">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src="/assets/aistudio/icon_68d78a75.png"
                alt="MW Next Icon"
                className="w-6 h-6 rounded object-cover border border-amber-500/40 shrink-0"
              />
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                <span className="font-semibold text-amber-100">MW Next · DevForge Station</span>
                <span aria-hidden="true" className="hidden sm:inline text-amber-500/40">·</span>
                <span className="hidden sm:inline text-slate-300">100% Client-Side Computation</span>
                <span aria-hidden="true" className="text-amber-500/40">·</span>
                <span className="text-stone-400">Offline PWA &amp; APK Ready</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
              {hasBundleDownload && (
                <>
                  <button
                    type="button"
                    onClick={() => void handleDownloadProjectBundle()}
                    disabled={isDownloadingBundle}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-neutral-950 font-semibold transition-colors"
                  >
                    {isDownloadingBundle ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <PackageCheck className="w-3.5 h-3.5" />
                    )}
                    <span>{isDownloadingBundle ? 'Preparing .zip...' : 'Download Git+APK (.zip)'}</span>
                  </button>
                  <span aria-hidden="true" className="hidden sm:inline text-slate-700">·</span>
                </>
              )}
              <button
                onClick={() => setIsWorkflowsModalOpen(true)}
                className="flex items-center gap-1.5 text-amber-300 hover:text-amber-200 font-semibold transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>ดูตัวอย่างการใช้งานจริง</span>
              </button>
              <span aria-hidden="true" className="hidden sm:inline text-slate-700">·</span>
              <span className="hidden sm:inline font-mono text-slate-400">⌘K Search</span>
              <span aria-hidden="true" className="text-slate-700">·</span>
              <button
                onClick={() => setIsScratchpadOpen(true)}
                className="font-mono text-slate-300 hover:text-amber-200 transition-colors"
              >
                Scratchpad
              </button>
            </div>
          </div>

          {/* Dynamic Tool Workspace inside Sleek Obsidian-Gold Container */}
          <div className="rounded-xl sm:rounded-2xl bg-neutral-950/80 backdrop-blur-md border border-amber-500/20 p-3.5 sm:p-6 shadow-2xl transition-all duration-150 min-w-0 overflow-hidden">
          {currentTab === 'mobile-capacitor' && <MobileCapacitorStudio onNotify={notify} />}
          {currentTab === 'build-hardener' && <BuildHardenerStudio onNotify={notify} />}
          {currentTab === 'build-perf' && <BuildPerformanceStudio onNotify={notify} />}
          {currentTab === 'apk-inspector' && <ApkInspectorStudio onNotify={notify} />}
          {currentTab === 'dependency-integrity' && <DependencyIntegrityStudio onNotify={notify} />}
          {currentTab === 'site-builder' && <SiteBuilderStudio onNotify={notify} />}
          {currentTab === 'test-suite' && <TestSuiteStudio onNotify={notify} />}
          {currentTab === 'mock-api' && <MockApiStudio onNotify={notify} />}
          {currentTab === 'git-hub' && <GitHubStudio onNotify={notify} />}
          {currentTab === 'code-diff' && <CodeDiffStudio onNotify={notify} />}
          {currentTab === 'svg-assets' && <SvgAssetStudio onNotify={notify} />}
          {currentTab === 'env-config' && <EnvConfigStudio onNotify={notify} />}
          {currentTab === 'http-status' && <HttpStatusStudio onNotify={notify} />}
          {currentTab === 'api-curl' && <ApiCurlStudio onNotify={notify} />}
          {currentTab === 'json-architect' && <JsonSchemaArchitect onNotify={notify} />}
          {currentTab === 'jwt-crypto' && <JwtCryptoStudio onNotify={notify} />}
          {currentTab === 'regex-lab' && <RegexLab onNotify={notify} />}
          {currentTab === 'sql-studio' && <SqlDataStudio onNotify={notify} />}
          {currentTab === 'cron-time' && <CronTimeStudio onNotify={notify} />}
          {currentTab === 'css-web' && <CssWebStudio onNotify={notify} />}
          {currentTab === 'wcag-contrast' && <WcagContrastStudio onNotify={notify} />}
          {currentTab === 'security-network' && <SecurityNetworkStudio onNotify={notify} />}
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-auto border-t border-amber-500/20 bg-neutral-950/90 backdrop-blur-md px-4 sm:px-6 py-5 sm:py-6 safe-bottom text-xs text-slate-400">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/assets/aistudio/icon_68d78a75.png"
                alt="Dev.Aistudio x MW Next Logo"
                className="w-7 h-7 rounded-md object-cover border border-amber-500/40 shrink-0"
              />
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold tracking-wide text-amber-200">Dev.Aistudio x MW Next</span>
                <span aria-hidden="true" className="text-amber-500/40">·</span>
                <span className="text-slate-400">DevForge Studio Workbench</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <span>RFC 4122 &amp; RFC 9562 UUIDs</span>
              <span aria-hidden="true" className="text-amber-500/30">·</span>
              <span>Web Crypto API</span>
              <span aria-hidden="true" className="text-amber-500/30">·</span>
              <span>WCAG 2.1 Contrast</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Workflows & Use-Cases Modal */}
      <WorkflowsModal
        isOpen={isWorkflowsModalOpen}
        onClose={() => setIsWorkflowsModalOpen(false)}
        onSelectWorkflow={(tab) => {
          setCurrentTab(tab);
          notify(`Switched to ${tab}`);
        }}
      />

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectTab={setCurrentTab}
        onNotify={notify}
      />

      {/* Persistent Scratchpad Drawer */}
      <ScratchpadDrawer
        isOpen={isScratchpadOpen}
        onClose={() => setIsScratchpadOpen(false)}
        onNotify={notify}
      />

      {/* Global Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <OfflineIndicator />
    </div>
  );
}
