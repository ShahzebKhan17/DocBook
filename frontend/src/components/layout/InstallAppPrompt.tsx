'use client';

import React, { useEffect, useState } from 'react';
import { Download, X, Share2, PlusSquare, Smartphone, CheckCircle } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    // Check if already in standalone/PWA mode
    const isRunningStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isRunningStandalone) {
      setIsStandalone(true);
      return;
    }

    // Check device type
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIosDevice);

    // Check if user dismissed prompt recently
    const dismissedAt = localStorage.getItem('docbook_pwa_dismissed');
    const isDismissedRecently =
      dismissedAt && Date.now() - parseInt(dismissedAt, 10) < 7 * 24 * 60 * 60 * 1000;

    // Listen for Chrome/Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!isDismissedRecently) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If on iOS and not standalone and not dismissed, show banner after short delay
    if (isIosDevice && !isRunningStandalone && !isDismissedRecently) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 1500);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    // Also listen for appinstalled event
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowBanner(false);
      setInstalledSuccess(true);
      setTimeout(() => setInstalledSuccess(false), 4000);
    };

    const handleCustomOpen = () => {
      setShowIOSModal(true);
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('open-docbook-install', handleCustomOpen);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('open-docbook-install', handleCustomOpen);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (!deferredPrompt) {
      // Fallback if beforeinstallprompt not captured yet: provide guide
      setShowIOSModal(true);
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setShowBanner(false);
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.error('PWA install prompt error:', err);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('docbook_pwa_dismissed', Date.now().toString());
  };

  if (isStandalone) {
    return null;
  }

  return (
    <>
      {/* Toast on success */}
      {installedSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-sm font-semibold animate-in fade-in slide-in-from-top-4">
          <CheckCircle className="w-5 h-5 shrink-0 text-white" />
          <span>DocBook App successfully installed on your device!</span>
        </div>
      )}

      {/* Mobile / Desktop Install Banner */}
      {showBanner && (
        <aside
          aria-label="Install DocBook App"
          className="fixed bottom-16 md:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-white/95 backdrop-blur-md border border-brand-200/80 rounded-2xl p-3.5 shadow-xl shadow-brand-500/10 animate-in fade-in slide-in-from-bottom-5"
        >
          <div className="flex items-start gap-3">
            {/* App Icon */}
            <div className="w-11 h-11 rounded-xl bg-brand-600 flex items-center justify-center text-white shrink-0 shadow-sm shadow-brand-500/30">
              <Smartphone className="w-6 h-6" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center justify-between gap-1">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  Download DocBook App
                </h3>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="text-slate-400 hover:text-slate-600 p-1 -mr-1 rounded-lg transition"
                  aria-label="Dismiss banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Install on your phone for instant booking, faster access & notifications.
              </p>

              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="flex-1 py-1.5 px-3 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg shadow-sm shadow-brand-500/20 transition flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download / Install</span>
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="py-1.5 px-3 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Instructions Modal (For iOS Safari or fallback) */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Install DocBook</h3>
                  <p className="text-xs text-slate-500">Download to your home screen</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3.5 text-xs text-slate-700">
                <div className="flex items-start gap-3 p-2.5 bg-slate-50 rounded-xl">
                  <div className="w-6 h-6 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                    1
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">Tap the Share button</span>
                    <p className="text-slate-500 mt-0.5 flex items-center gap-1">
                      Located at the bottom of Safari (<Share2 className="w-3.5 h-3.5 text-brand-600 inline" />)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 bg-slate-50 rounded-xl">
                  <div className="w-6 h-6 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                    2
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">Select &ldquo;Add to Home Screen&rdquo;</span>
                    <p className="text-slate-500 mt-0.5 flex items-center gap-1">
                      Scroll down in the share menu (<PlusSquare className="w-3.5 h-3.5 text-brand-600 inline" />)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 bg-slate-50 rounded-xl">
                  <div className="w-6 h-6 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                    3
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">Tap &ldquo;Add&rdquo;</span>
                    <p className="text-slate-500 mt-0.5">
                      Confirm in the top right corner to download the app to your phone.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-600">
                <p>
                  To install DocBook on your device, tap the browser menu (<strong>⋮</strong> or <strong>Share</strong>) and choose <strong>&ldquo;Install App&rdquo;</strong> or <strong>&ldquo;Add to Home Screen&rdquo;</strong>.
                </p>
                <p>
                  This gives you the full standalone app experience with zero app store download needed.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full mt-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
