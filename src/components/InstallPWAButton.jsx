import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { HiArrowDownTray, HiXMark, HiDevicePhoneMobile, HiSparkles } from 'react-icons/hi2';

export default function InstallPWAButton() {
  const location = useLocation();
  const { primaryColor, leaderName, logoUrl } = useTenant();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone/installed mode
    const isAppInstalled = 
      window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');

    if (isAppInstalled) {
      setIsStandalone(true);
      return;
    }

    // Detect browser install prompt event (Chrome / Edge / Android)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const [showAndroidGuide, setShowAndroidGuide] = useState(false);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsVisible(false);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.warn('Prompt error:', err);
        setShowAndroidGuide(true);
      }
    } else {
      const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isIos) {
        setShowIosGuide(true);
      } else {
        setShowAndroidGuide(true);
      }
    }
  };

  const handleDismiss = () => {
    // Instead of completely hiding forever, minimize it to a floating action button
    setIsMinimized(true);
  };

  // Only show install banner on Home page (/home), hide on Splash (/) and other routes
  const isHomePage = location.pathname === '/home';
  if (!isHomePage || isStandalone || !isVisible) return null;

  return (
    <>
      {/* If Minimized: Show sleek floating Mini Action Button so it remains accessible */}
      {isMinimized ? (
        <div className="fixed bottom-20 right-4 z-50 pointer-events-auto animate-bounce-subtle">
          <button
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-2 pl-3 pr-3.5 py-2.5 rounded-full text-white shadow-2xl font-bold text-xs active:scale-95 transition-all border-2 border-white"
            style={{ backgroundColor: primaryColor }}
            title="Install App"
          >
            <HiArrowDownTray className="w-4 h-4 animate-bounce" />
            <span className="text-[0.7rem] font-black tracking-wide">Install App</span>
          </button>
        </div>
      ) : (
        /* Expanded Floating Banner */
        <div className="fixed bottom-20 left-4 right-4 z-50 animate-bounce-subtle pointer-events-auto">
          <div 
            className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border p-3 flex items-center justify-between gap-3"
            style={{ borderColor: `${primaryColor}40` }}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer" onClick={handleInstallClick}>
              <div 
                className="w-11 h-11 rounded-xl overflow-hidden shrink-0 border bg-white p-0.5 shadow-xs flex items-center justify-center"
                style={{ borderColor: `${primaryColor}30` }}
              >
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt="App Icon" 
                    className="w-full h-full object-cover rounded-lg" 
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <h4 className="text-xs font-black text-gray-900 truncate">
                    {leaderName ? `${leaderName} App` : 'जनसेवा App'}
                  </h4>
                  <span className="text-[0.6rem] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded-md shrink-0">
                    Fast
                  </span>
                </div>
                <p className="text-[0.65rem] text-gray-500 font-semibold truncate mt-0.5">
                  Tap to Install App on Phone
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-black shadow-md active:scale-95 transition-all"
                style={{ backgroundColor: primaryColor }}
              >
                <HiArrowDownTray className="w-4 h-4 animate-pulse" />
                <span>Install</span>
              </button>
              <button
                onClick={handleDismiss}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                title="Minimize"
              >
                <HiXMark className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Android / Chrome Guide Modal */}
      {showAndroidGuide && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95">
            <div 
              className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg"
              style={{ backgroundColor: primaryColor }}
            >
              <HiDevicePhoneMobile className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900">Install as Mobile App</h3>
              <p className="text-xs text-gray-500 font-semibold mt-0.5">Quick access directly from your phone home screen</p>
            </div>
            <div className="text-xs text-gray-700 space-y-2.5 text-left bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[0.7rem] font-black shrink-0">1</span>
                <span>Chrome browser ke upar <strong>3 Dots (⋮)</strong> par tap karein.</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[0.7rem] font-black shrink-0">2</span>
                <span>Menu me <strong>"Install app"</strong> ya <strong>"Add to Home screen"</strong> chunein.</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[0.7rem] font-black shrink-0">3</span>
                <span><strong>"Install"</strong> par tap karein. App phone me add ho jayegi!</span>
              </div>
            </div>
            <button
              onClick={() => setShowAndroidGuide(false)}
              className="w-full py-3 rounded-xl text-white font-extrabold text-xs shadow-md active:scale-95 transition-all"
              style={{ backgroundColor: primaryColor }}
            >
              Got it! / Samajh Gaya
            </button>
          </div>
        </div>
      )}

      {/* iOS Safari Guide Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95">
            <div 
              className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg"
              style={{ backgroundColor: primaryColor }}
            >
              <HiDevicePhoneMobile className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black text-gray-900">How to Install on iPhone / iPad</h3>
            <div className="text-xs text-gray-600 space-y-2 text-left bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-[0.65rem] font-bold">1</span>
                <span>Tap the <strong>Share</strong> button (box with arrow) at the bottom.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-[0.65rem] font-bold">2</span>
                <span>Scroll down and tap <strong>"Add to Home Screen"</strong>.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-[0.65rem] font-bold">3</span>
                <span>Tap <strong>"Add"</strong> in the top right corner.</span>
              </div>
            </div>
            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 rounded-xl text-white font-bold text-xs"
              style={{ backgroundColor: primaryColor }}
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
