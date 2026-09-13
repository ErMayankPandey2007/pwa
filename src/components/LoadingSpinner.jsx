import React from 'react';
import { useTenant } from '../context/TenantContext';

export default function LoadingSpinner({ fullPage = false, message = 'कृपया प्रतीक्षा करें...' }) {
  const { primaryColor, logoUrl, leaderName } = useTenant();
  const currentLogo = logoUrl || '';

  const content = (
    <div className="flex flex-col items-center justify-center gap-3 select-none">
      <div className="relative flex items-center justify-center">
        {/* Outer Rotating Glowing Ring */}
        <div 
          className="w-16 h-16 rounded-full border-3 border-t-transparent animate-spin"
          style={{ borderColor: `${primaryColor}25`, borderTopColor: primaryColor }}
        ></div>

        {/* Inner Pulsing Logo */}
        {currentLogo ? (
          <div 
            className="absolute w-11 h-11 rounded-full overflow-hidden bg-white shadow-sm border p-0.5 flex items-center justify-center animate-pulse"
            style={{ borderColor: `${primaryColor}40` }}
          >
            <img 
              src={currentLogo} 
              alt={leaderName || 'Loading'} 
              className="w-full h-full object-cover rounded-full"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        ) : null}
      </div>

      {message && (
        <p 
          className="text-xs font-bold tracking-wide animate-pulse"
          style={{ color: primaryColor }}
        >
          {message}
        </p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-xs">
        {content}
      </div>
    );
  }

  return (
    <div className="w-full flex items-center justify-center py-10">
      {content}
    </div>
  );
}
