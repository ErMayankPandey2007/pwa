import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiArrowLeft } from 'react-icons/hi2';
import { useTenant } from '../context/TenantContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import LoadingSpinner from './LoadingSpinner';

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();
  const { branding, tenant, primaryColor, leaderName } = useTenant();
  const { t } = useLanguage();
  const [dynamicConfig, setDynamicConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await api.getConfig().catch(() => null);
        if (res) {
          setDynamicConfig(res);
        }
      } catch (err) {
        console.warn('Error loading privacy policy config:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadConfig();
  }, []);

  const activeBranding = dynamicConfig?.branding || branding || {};
  const activeTenant = dynamicConfig?.tenant || tenant || {};
  const appName = activeBranding.title || activeBranding.appName || activeBranding.platformName || activeTenant.name || 'जनसेवा';
  const customContent = activeBranding.privacyPolicyContent || activeBranding.privacyContent || null;
  const customUrl = activeBranding.privacyPolicyUrl || activeBranding.privacyUrl || null;

  return (
    <div className="relative w-full h-screen flex flex-col bg-[#f8fafc] overflow-hidden pb-12">
      
      {/* App Bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-white border-b border-gray-100 shadow-xs z-20">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button 
            onClick={() => navigate(-1)} 
            className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-100 active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <HiArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-extrabold text-[#1e293b] truncate leading-tight">
              {t('privacyPolicy') || 'Privacy Policy'}
            </h1>
            <p className="text-[10px] font-semibold text-gray-500 truncate">{appName}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full p-5 custom-scrollbar">
        {isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <LoadingSpinner message="गोपनीयता नीति लोड हो रही है..." />
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm max-w-2xl mx-auto space-y-5">
            
            {/* External Document Link Banner if configured in Backend */}
            {customUrl && (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-blue-900">आधिकारिक नीति दस्तावेज़ / Official Policy Document</h4>
                  <p className="text-[11px] text-blue-700 mt-0.5">पीडीएफ या मूल नीति देखने के लिए लिंक खोलें</p>
                </div>
                <a 
                  href={customUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shrink-0 transition-colors shadow-xs"
                >
                  दस्तावेज़ देखें ↗
                </a>
              </div>
            )}

            {/* Custom Content from Backend or Branded Default Policy */}
            {customContent ? (
              <div className="prose prose-sm max-w-none text-gray-700">
                {customContent.includes('<') && customContent.includes('>') ? (
                  <div 
                    className="leading-relaxed space-y-3"
                    dangerouslySetInnerHTML={{ __html: customContent }} 
                  />
                ) : (
                  <div className="whitespace-pre-line text-sm text-gray-700 font-medium leading-relaxed">
                    {customContent}
                  </div>
                )}
              </div>
            ) : (
              <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-gray-900 mb-1.5">1. सूचना संग्रह (Information Collection)</h2>
                  <p className="text-xs sm:text-sm leading-relaxed text-gray-600 font-medium">
                    {appName} ऐप का उपयोग करते समय हम आपका नाम, मोबाइल नंबर, विधानसभा/वार्ड क्षेत्र और आपकी प्रोफ़ाइल से जुड़ी आवश्यक जानकारी सुरक्षित रूप से संग्रहीत करते हैं।
                  </p>
                </div>

                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-gray-900 mb-1.5">2. डेटा का उपयोग (How We Use Your Data)</h2>
                  <p className="text-xs sm:text-sm leading-relaxed text-gray-600 font-medium">
                    आपकी जानकारी का उपयोग स्थानीय विकास कार्यों, सार्वजनिक सूचनाओं, आयोजनों और शिकायतों के समाधान के लिए किया जाता है। हम किसी भी नागरिक का व्यक्तिगत डेटा तृतीय पक्ष (Third Party) को नहीं बेचते हैं।
                  </p>
                </div>

                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-gray-900 mb-1.5">3. डेटा सुरक्षा (Data Security & Privacy)</h2>
                  <p className="text-xs sm:text-sm leading-relaxed text-gray-600 font-medium">
                    हम उद्योग मानकों के अनुसार एन्क्रिप्शन और सुरक्षा प्रोटोकॉल का पालन करते हैं ताकि आपका डेटा अनधिकृत पहुंच से पूरी तरह सुरक्षित रहे।
                  </p>
                </div>

                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-gray-900 mb-1.5">4. उपयोगकर्ता अधिकार (Your Rights)</h2>
                  <p className="text-xs sm:text-sm leading-relaxed text-gray-600 font-medium">
                    आप अपनी प्रोफ़ाइल में जाकर किसी भी समय अपनी जानकारी अपडेट कर सकते हैं।
                  </p>
                </div>
              </div>
            )}

            {/* Bottom Note */}
            <div 
              className="p-4 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-between text-[11px] font-semibold text-gray-600"
            >
              <span>{appName} • {activeTenant.name || 'जनप्रतिनिधि कार्यालय'}</span>
              <span className="text-gray-400">सुरक्षित एवं गोपनीय</span>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
