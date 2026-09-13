import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useTenant } from '../context/TenantContext';
import { HiCheck, HiXMark, HiLanguage } from 'react-icons/hi2';

export default function LanguageModal() {
  const { language, setLanguage, isLanguageModalOpen, closeLanguageModal } = useLanguage();
  const { primaryColor } = useTenant();

  if (!isLanguageModalOpen) return null;

  const languages = [
    {
      code: 'hi',
      name: 'हिंदी',
      subname: 'Hindi',
      badge: 'प्राथमिक भाषा',
    },
    {
      code: 'en',
      name: 'English',
      subname: 'अंग्रेजी',
      badge: 'Official / Global',
    }
  ];

  const handleSelect = (code) => {
    setLanguage(code);
    closeLanguageModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 border border-gray-100 flex flex-col gap-4 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
            >
              <HiLanguage className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900">
                {language === 'hi' ? 'ऐप की भाषा चुनें' : 'Choose App Language'}
              </h3>
              <p className="text-[11px] font-semibold text-gray-400">
                {language === 'hi' ? 'Select Preferred Language' : 'पसंदीदा भाषा चुनें'}
              </p>
            </div>
          </div>
          <button 
            onClick={closeLanguageModal}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 active:scale-95 transition-all"
          >
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-2.5">
          {languages.map((item) => {
            const isSelected = language === item.code;
            return (
              <div
                key={item.code}
                onClick={() => handleSelect(item.code)}
                className={`flex items-center justify-between p-3.5 rounded-2xl border-2 cursor-pointer transition-all active:scale-[0.98] ${
                  isSelected 
                    ? 'border-transparent shadow-xs bg-orange-50/20' 
                    : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                }`}
                style={isSelected ? { borderColor: primaryColor, backgroundColor: `${primaryColor}08` } : {}}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center border text-xs font-black shadow-xs"
                    style={isSelected ? { backgroundColor: primaryColor, color: '#fff', borderColor: primaryColor } : { borderColor: '#d1d5db', color: '#6b7280', backgroundColor: '#fff' }}
                  >
                    {isSelected ? <HiCheck className="w-4 h-4 stroke-2" /> : item.code.toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-sm font-extrabold ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                      {item.name}
                    </span>
                    <span className="text-[11px] font-semibold text-gray-400">
                      {item.subname}
                    </span>
                  </div>
                </div>

                <span 
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={isSelected ? { backgroundColor: `${primaryColor}15`, color: primaryColor } : { backgroundColor: '#f1f5f9', color: '#64748b' }}
                >
                  {item.badge}
                </span>
              </div>
            );
          })}
        </div>

        <button
          onClick={closeLanguageModal}
          className="w-full py-3 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 active:scale-98 transition-all mt-1"
        >
          {language === 'hi' ? 'बंद करें' : 'Close'}
        </button>
      </div>
    </div>
  );
}
