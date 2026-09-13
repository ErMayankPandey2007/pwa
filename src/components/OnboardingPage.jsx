import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { branding, primaryColor, leaderName, tagline, logoUrl } = useTenant();

  const handleOpenApp = () => {
    localStorage.setItem('pwa_has_seen_splash', 'true');
    navigate('/home');
  };

  return (
    <div className="relative w-full h-screen flex flex-col bg-white overflow-hidden select-none">
      {/* Open App Button */}
      <div className="absolute top-6 right-6 z-20">
        <button 
          className="px-3.5 py-1.5 rounded-full text-xs font-bold border border-gray-200 text-gray-700 bg-white/90 shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
          onClick={handleOpenApp}
        >
          Open App
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center pt-8 px-6 pb-6 overflow-y-auto">
        {/* Logo and Titles */}
        <div className="flex flex-col items-center mb-2 shrink-0">
           {logoUrl ? (
             <img 
               src={logoUrl} 
               alt="Logo" 
               className="w-16 h-16 object-contain mb-2 drop-shadow-sm rounded-full" 
               onError={(e) => { e.target.style.display = 'none'; }} 
             />
           ) : null}
           <h1 className="text-xl font-extrabold text-gray-900 tracking-wide text-center">
             {leaderName || 'जनप्रतिनिधि'}
           </h1>
           <h2 className="text-xs font-bold tracking-wider mt-1 text-center" style={{ color: primaryColor }}>
             {tagline || 'जनसंपर्क अभियान'}
           </h2>
        </div>

        {/* Center Image */}
        <div className="flex-1 w-full flex items-center justify-center min-h-0 my-4">
          <img 
            src={branding?.heroBannerUrl || "/image copy 4.png"} 
            alt="Leader" 
            className="w-full h-full max-h-[38vh] object-contain drop-shadow-md rounded-2xl" 
            onError={(e) => { e.target.src = '/image copy 4.png'; }}
          />
        </div>

        {/* Text Section */}
        <div className="w-full flex flex-col items-center text-center mt-auto shrink-0">
          <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 leading-tight mb-2">
            एक सशक्त और समृद्ध क्षेत्र,<br/>सबका साथ सबका विकास
          </h2>
          <p className="text-xs text-gray-500 font-semibold px-4 mb-4">
            सीधे अपने प्रतिनिधि से जुड़ें और अपने क्षेत्र के विकास में सहभागी बनें।
          </p>

          {/* Dots */}
          <div className="flex gap-2 mb-5">
            <div className="w-5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }}></div>
            <div className="w-1.5 h-1.5 rounded-full bg-gray-200"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-gray-200"></div>
          </div>

          {/* Open App / Get Started Button */}
          <button 
            onClick={handleOpenApp}
            className="w-full py-3.5 text-white rounded-xl font-bold text-base shadow-lg transition-transform active:scale-98"
            style={{ backgroundColor: primaryColor }}
          >
            Open App
          </button>
        </div>
      </div>
    </div>
  );
}
