import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-semibold text-neutral-950 shadow-sm transition-colors whitespace-nowrap shrink-0"
        title="ติดตั้ง DevForge Studio ลงหน้าจอมือถือหรือเดสก์ท็อป"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1.5 text-xs font-semibold text-amber-300 transition-colors whitespace-nowrap shrink-0"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Install iOS</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-neutral-950 border border-amber-500/30 p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-amber-100">ติดตั้งบน iPhone / iPad</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close iOS install instructions"
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-neutral-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-stone-300">
                1. แตะปุ่ม <strong className="text-amber-300">Share</strong> (ไอคอนสี่เหลี่ยมมีลูกศรชี้ขึ้น) บนแถบ Safari<br />
                2. เลื่อนลงแล้วเลือก <strong className="text-amber-300">Add to Home Screen</strong><br />
                3. แตะ <strong className="text-amber-300">Add</strong> เพื่อเปิดใช้งานแบบเต็มจอและออฟไลน์
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-lg bg-amber-500 hover:bg-amber-400 py-2 text-xs font-semibold text-neutral-950 transition-colors"
              >
                เข้าใจแล้ว
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
