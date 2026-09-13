import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiArrowLeft } from 'react-icons/hi2';
import { useTenant } from '../context/TenantContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import LoadingSpinner from './LoadingSpinner';

export default function TermsPage() {
  const navigate = useNavigate();
  const { branding, tenant, primaryColor } = useTenant();
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
        console.warn('Error loading terms config:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadConfig();
  }, []);

  const activeBranding = dynamicConfig?.branding || branding || {};
  const activeTenant = dynamicConfig?.tenant || tenant || {};
  const appName = activeBranding.title || activeBranding.appName || activeBranding.platformName || activeTenant.name || 'जनसेवा';
  const customContent = activeBranding.termsContent || activeBranding.termsAndConditionsContent || null;
  const customUrl = activeBranding.termsUrl || activeBranding.termsConditionsUrl || null;

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
              {t('termsConditions') || 'Terms & Conditions'}
            </h1>
            <p className="text-[10px] font-semibold text-gray-500 truncate">{appName}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full p-5 custom-scrollbar">
        {isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <LoadingSpinner message="नियम एवं शर्तें लोड हो रही हैं..." />
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm max-w-2xl mx-auto space-y-5">
            
            {/* External Document Link Banner if configured in Backend */}
            {customUrl && (
              <div className="p-4 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-purple-900">आधिकारिक नियम एवं शर्तें / Official Terms Document</h4>
                  <p className="text-[11px] text-purple-700 mt-0.5">मूल दस्तावेज़ देखने या डाउनलोड करने के लिए लिंक खोलें</p>
                </div>
                <a 
                  href={customUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shrink-0 transition-colors shadow-xs"
                >
                  दस्तावेज़ देखें ↗
                </a>
              </div>
            )}

            {/* Custom Content from Backend or Branded Default Terms */}
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
                  <h2 className="text-sm sm:text-base font-extrabold text-gray-900 mb-1.5">1. शर्तों की स्वीकृति (Acceptance of Terms)</h2>
                  <p className="text-xs sm:text-sm leading-relaxed text-gray-600 font-medium">
                    {appName} मोबाइल एप्लिकेशन का उपयोग करके आप इन नियमों और शर्तों का पालन करने के लिए सहमत होते हैं। यदि आप इन शर्तों से सहमत नहीं हैं, तो कृपया ऐप का उपयोग न करें।
                  </p>
                </div>

                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-gray-900 mb-1.5">2. उपयोग के नियम (User Conduct & Responsibilities)</h2>
                  <p className="text-xs sm:text-sm leading-relaxed text-gray-600 font-medium">
                    उपयोगकर्ता केवल वैध, सामाजिक और संवैधानिक उद्देश्यों के लिए ऐप का उपयोग करेंगे। किसी भी प्रकार की अभद्र भाषा, भ्रामक जानकारी या अवांछित सामग्री पोस्ट करना सख्त वर्जित है।
                  </p>
                </div>

                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-gray-900 mb-1.5">3. खाता सुरक्षा (Account Security)</h2>
                  <p className="text-xs sm:text-sm leading-relaxed text-gray-600 font-medium">
                    नागरिक अपने मोबाइल नंबर और ओटीपी के माध्यम से सुरक्षित लॉगिन करते हैं। अपने खाते की गतिविधियों के लिए उपयोगकर्ता स्वयं उत्तरदायी हैं।
                  </p>
                </div>

                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-gray-900 mb-1.5">4. सेवाओं में संशोधन (Service Modifications)</h2>
                  <p className="text-xs sm:text-sm leading-relaxed text-gray-600 font-medium">
                    प्रशासन के पास समय-समय पर जनहित में ऐप की सुविधाओं को अपडेट करने या संशोधित करने का पूरा अधिकार सुरक्षित है।
                  </p>
                </div>
              </div>
            )}

            {/* Bottom Note */}
            <div 
              className="p-4 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-between text-[11px] font-semibold text-gray-600"
            >
              <span>{appName} • {activeTenant.name || 'जनप्रतिनिधि कार्यालय'}</span>
              <span className="text-gray-400">अंतिम अपडेट: 2026</span>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
