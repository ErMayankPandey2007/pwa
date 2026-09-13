import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../translations';
import { toast } from 'react-toastify';

const LANGUAGE_KEY = 'pwa_language_preference';

const LanguageContext = createContext({
  language: 'hi',
  t: (key) => key,
  setLanguage: () => {},
  toggleLanguage: () => {},
  isLanguageModalOpen: false,
  openLanguageModal: () => {},
  closeLanguageModal: () => {},
});

export const LanguageProvider = ({ children }) => {
  const [language, setLangState] = useState(() => {
    try {
      return localStorage.getItem(LANGUAGE_KEY) || 'hi';
    } catch {
      return 'hi';
    }
  });

  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(LANGUAGE_KEY, language);
      document.documentElement.lang = language;
    } catch (e) {
      console.warn('Could not persist language preference:', e);
    }
  }, [language]);

  const setLanguage = (newLang) => {
    if (newLang === 'hi' || newLang === 'en') {
      setLangState(newLang);
      const msg = newLang === 'hi' ? 'भाषा बदलकर हिंदी कर दी गई है' : 'Language set to English';
      toast.success(msg);
    }
  };

  const toggleLanguage = () => {
    const nextLang = language === 'hi' ? 'en' : 'hi';
    setLanguage(nextLang);
  };

  const openLanguageModal = () => setIsLanguageModalOpen(true);
  const closeLanguageModal = () => setIsLanguageModalOpen(false);

  // Translation helper function
  const t = (key) => {
    const langObj = translations[language] || translations.hi;
    return langObj[key] !== undefined ? langObj[key] : (translations.en[key] || key);
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        t,
        setLanguage,
        toggleLanguage,
        isLanguageModalOpen,
        openLanguageModal,
        closeLanguageModal,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
