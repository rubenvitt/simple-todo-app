import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { ConfigProvider } from 'antd';
import type { Locale } from 'antd/es/locale';
import enUS from 'antd/locale/en_US';
import deDE from 'antd/locale/de_DE';
import { useTranslation } from '../hooks/useTranslation';

interface I18nContextType {
  locale: Locale;
  language: string;
}

const I18nContext = createContext<I18nContextType>({
  locale: enUS,
  language: 'en',
});

const localeMap: Record<string, Locale> = {
  en: enUS,
  de: deDE,
};

interface I18nProviderProps {
  children: ReactNode;
}

export const I18nProvider = ({ children }: I18nProviderProps) => {
  const { language } = useTranslation('common');
  const [locale, setLocale] = useState<Locale>(enUS);

  useEffect(() => {
    const newLocale = localeMap[language] || enUS;
    setLocale(newLocale);
  }, [language]);

  const contextValue: I18nContextType = {
    locale,
    language,
  };

  return (
    <I18nContext.Provider value={contextValue}>
      <ConfigProvider locale={locale}>
        {children}
      </ConfigProvider>
    </I18nContext.Provider>
  );
};

export const useI18nContext = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18nContext must be used within I18nProvider');
  }
  return context;
};

export default I18nProvider;