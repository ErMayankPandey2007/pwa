import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { api } from '../services/api';
import { getMediaUrl } from '../utils/mediaUrl';

export default function SplashPage() {
  const navigate = useNavigate();
  const { branding, primaryColor, secondaryColor, leaderName, tagline, logoUrl } = useTenant();
  const [dynamicConfig, setDynamicConfig] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const loadSplashConfig = async () => {
      try {
        const res = await api.getConfig().catch(() => null);
        if (res) {
          const cfgData = res?.branding ? res : (res?.data || res);
          setDynamicConfig(cfgData);
        }
      } catch (e) {
        console.warn('Error fetching splash config:', e);
      }
    };
    loadSplashConfig();
  }, []);

  const activeBranding = dynamicConfig?.branding || dynamicConfig?.data?.branding || branding;
  const activeTenant = dynamicConfig?.tenant || dynamicConfig?.data?.tenant || {};
  const activePrimary = activeBranding?.primaryColor || primaryColor || '#FF7802';
  const activeSecondary = activeBranding?.secondaryColor || secondaryColor || '#190F4B';
  const activeLeader = activeBranding?.leaderName || leaderName || '';
  const activeTagline = activeBranding?.tagline || tagline || '';
  const activeTitle = activeBranding?.title || activeBranding?.platformName || activeTenant?.title || activeTenant?.name || '';
  const rawLogo = activeBranding?.logoUrl || activeBranding?.logo || logoUrl || '';
  const resolvedLogo = rawLogo ? getMediaUrl(rawLogo) : null;

  // Multi-step splashScreens array support from API
  const splashScreens = Array.isArray(activeBranding?.splashScreens) && activeBranding.splashScreens.length > 0
    ? activeBranding.splashScreens
    : null;

  const totalSteps = splashScreens ? splashScreens.length : 1;
  const activeScreen = splashScreens ? splashScreens[currentStep] : null;

  // Single media fallback if splashScreens array is not present
  const singleSplashMedia = activeBranding?.splashMediaUrl || activeBranding?.splashScreenUrl || activeBranding?.splashVideoUrl || activeBranding?.splashImageUrl || activeBranding?.splashUrl || null;
  
  const currentMediaUrl = activeScreen?.mediaUrl 
    ? getMediaUrl(activeScreen.mediaUrl) 
    : (singleSplashMedia ? getMediaUrl(singleSplashMedia) : null);

  const isVideo = currentMediaUrl && (
    currentMediaUrl.endsWith('.mp4') ||
    currentMediaUrl.endsWith('.webm') ||
    currentMediaUrl.endsWith('.ogg') ||
    currentMediaUrl.includes('/video/') ||
    currentMediaUrl.includes('format=mp4') ||
    activeScreen?.mediaType === 'video'
  );

  const handleSkipToLogin = () => {
    localStorage.setItem('pwa_has_seen_splash', 'true');
    navigate('/login', { replace: true });
  };

  const handleNextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      localStorage.setItem('pwa_has_seen_splash', 'true');
      navigate('/login', { replace: true });
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    } else {
      window.history.back();
    }
  };

  return (
    <div
      className="relative w-full h-screen flex flex-col justify-between overflow-hidden select-none"
      style={{
        background: (!currentMediaUrl)
          ? `linear-gradient(145deg, ${activePrimary} 0%, #0b071a 50%, ${activeSecondary} 100%)`
          : '#000000',
      }}
    >
      {/* Top action bar: "Skip / Open App" button */}
      <div className="absolute top-6 right-6 z-30 flex items-center gap-2">
        <button
          onClick={handleSkipToLogin}
          className="px-4 py-1.5 rounded-full text-xs font-bold text-white shadow-lg backdrop-blur-md bg-black/40 border border-white/20 hover:bg-black/60 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <span>Open App</span>
          <svg className="w-3.5 h-3.5 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>

      {/* Media / Splash Screen from Backend API */}
      {currentMediaUrl ? (
        <div className="absolute inset-0 w-full h-full z-0 flex items-center justify-center bg-black">
          {isVideo ? (
            <video
              key={currentMediaUrl}
              src={currentMediaUrl}
              autoPlay
              muted
              playsInline
              loop
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              key={currentMediaUrl}
              src={currentMediaUrl}
              alt="Splash Screen"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          )}
        </div>
      ) : (
        /* Rich Branded Splash Display when no full-bleed media is set in API */
        <div className="absolute inset-0 w-full h-full z-0 flex flex-col items-center justify-center p-6 text-center text-white">
          {/* Subtle Ambient Glow */}
          <div 
            className="absolute w-72 h-72 rounded-full blur-3xl opacity-30 pointer-events-none"
            style={{ backgroundColor: activePrimary }}
          />

          {/* Logo Container */}
          {resolvedLogo ? (
            <div className="relative mb-6 z-10">
              <div 
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-1 shadow-2xl backdrop-blur-xl border border-white/30 flex items-center justify-center bg-white/10"
                style={{
                  boxShadow: `0 20px 40px -10px ${activePrimary}66`,
                }}
              >
                <img
                  src={resolvedLogo}
                  alt={activeTitle || 'Logo'}
                  className="w-full h-full object-contain rounded-2xl p-2 bg-white"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            </div>
          ) : (
            <div 
              className="w-24 h-24 rounded-3xl mb-6 flex items-center justify-center text-3xl font-black text-white shadow-2xl border border-white/20"
              style={{ backgroundColor: activePrimary }}
            >
              🏛️
            </div>
          )}

          {/* Title & Platform Name */}
          {activeTitle && (
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 text-white drop-shadow-md z-10">
              {activeTitle}
            </h1>
          )}

          {/* Leader Name */}
          {activeLeader && (
            <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-sm font-semibold text-white/95 mb-3 z-10 shadow-sm">
              <span>{activeLeader}</span>
            </div>
          )}

          {/* Constituency or Organization */}
          {activeTenant?.name && activeTenant.name !== activeTitle && (
            <p className="text-xs font-medium text-white/75 tracking-wider uppercase mb-3 z-10">
              {activeTenant.name}
            </p>
          )}

          {/* Tagline */}
          {activeTagline && (
            <p className="text-sm sm:text-base text-white/90 font-medium italic max-w-xs sm:max-w-sm mt-1 z-10 leading-relaxed drop-shadow">
              “{activeTagline}”
            </p>
          )}
        </div>
      )}

      {/* Spacer / Container for Dots */}
      <div className="w-full flex flex-col items-center justify-end z-10 flex-grow pb-4 pointer-events-none">
        {/* Dots Pagination Indicator for Multi-step Splash */}
        {totalSteps > 1 && (
          <div className="flex items-center gap-2 mb-2 z-20 pointer-events-auto">
            {splashScreens.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all ${
                  currentStep === idx ? 'w-6 bg-white shadow-lg' : 'w-2 bg-white/50'
                }`}
              ></button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Action Bar with Prev & Next / Enter App */}
      <div className="w-full p-6 z-20 relative flex items-center justify-between gap-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        {totalSteps > 1 ? (
          <>
            <button
              onClick={handlePrevStep}
              className="px-6 py-3 rounded-xl font-bold text-sm text-white/90 bg-white/20 hover:bg-white/30 backdrop-blur-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
              </svg>
              <span>Prev</span>
            </button>

            <button
              onClick={handleNextStep}
              className="px-6 py-3 rounded-xl font-bold text-sm text-white shadow-xl flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              style={{ backgroundColor: activePrimary }}
            >
              <span>{currentStep === totalSteps - 1 ? 'Open App' : 'Next'}</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </>
        ) : (
          <button
            onClick={handleSkipToLogin}
            className="w-full py-3.5 rounded-2xl font-bold text-base text-white shadow-2xl flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer border border-white/20"
            style={{ 
              backgroundColor: activePrimary,
              boxShadow: `0 10px 25px -5px ${activePrimary}88`,
            }}
          >
            <span>ऐप में प्रवेश करें / Enter App</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
