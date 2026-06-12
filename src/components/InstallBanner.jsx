import { useState, useEffect } from 'react';
import { Download, X, Share, Plus } from 'lucide-react';

const DISMISSED_KEY = 'dbsai_install_dismissed';

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const [showIOSSteps, setShowIOSSteps] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (sessionStorage.getItem(DISMISSED_KEY)) return;

    setIos(isIOS());

    if (isIOS()) {
      // Show iOS instructions banner
      setShow(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    setShow(false);
    sessionStorage.setItem(DISMISSED_KEY, '1');
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShow(false);
    setDeferredPrompt(null);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 animate-fade-in-up max-w-sm mx-auto">
      <div className="bg-slate-900 border border-emerald-800/50 rounded-2xl p-4 shadow-2xl shadow-black/40">
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 text-slate-500 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0 pr-4">
            <p className="font-bold text-white text-sm">Install DB's AI</p>
            <p className="text-slate-400 text-xs mt-0.5">
              Add to your home screen for the full app experience — works offline too.
            </p>
          </div>
        </div>

        {ios ? (
          <div className="mt-3">
            <button
              onClick={() => setShowIOSSteps(s => !s)}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors"
            >
              {showIOSSteps ? 'Hide steps' : 'Show me how'}
            </button>
            {showIOSSteps && (
              <ol className="mt-3 space-y-2">
                {[
                  { icon: Share, text: 'Tap the Share button at the bottom of Safari' },
                  { icon: Plus, text: 'Scroll down and tap "Add to Home Screen"' },
                  { icon: Download, text: 'Tap "Add" — the app icon will appear on your home screen' },
                ].map(({ icon: Icon, text }, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-900/60 border border-emerald-700/50 flex items-center justify-center text-[10px] font-black text-emerald-400 shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div className="flex items-start gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-300 leading-relaxed">{text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : (
          <button
            onClick={handleInstall}
            className="mt-3 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-3.5 h-3.5" /> Install App
          </button>
        )}
      </div>
    </div>
  );
}
