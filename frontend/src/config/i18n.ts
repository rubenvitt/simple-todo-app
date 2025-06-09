import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation resources will be loaded dynamically
const resources = {
  en: {
    common: {},
    auth: {},
    tasks: {},
  },
  de: {
    common: {},
    auth: {},
    tasks: {},
  },
};

// Load translations dynamically
const loadTranslations = async () => {
  try {
    const [enCommon, enAuth, enTasks, deCommon, deAuth, deTasks] = await Promise.all([
      fetch('/locales/en/common.json').then(r => r.json()),
      fetch('/locales/en/auth.json').then(r => r.json()),
      fetch('/locales/en/tasks.json').then(r => r.json()),
      fetch('/locales/de/common.json').then(r => r.json()),
      fetch('/locales/de/auth.json').then(r => r.json()),
      fetch('/locales/de/tasks.json').then(r => r.json()),
    ]);

    resources.en.common = enCommon;
    resources.en.auth = enAuth;
    resources.en.tasks = enTasks;
    resources.de.common = deCommon;
    resources.de.auth = deAuth;
    resources.de.tasks = deTasks;
  } catch (error) {
    console.warn('Failed to load some translations:', error);
  }
};

// Initialize i18n with basic config first
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'auth', 'tasks'],
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: false,
    },
  });

// Load translations after initialization
loadTranslations().then(() => {
  // Reload resources after loading
  i18n.reloadResources();
});

export default i18n;