import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import zhHK from './locales/zh-HK';
import zhCN from './locales/zh-CN';
import enUS from './locales/en-US';

// 定義資源
const resources = {
    'zh-HK': {
        translation: zhHK
    },
    'zh-CN': {
        translation: zhCN
    },
    'en-US': {
        translation: enUS
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'zh-HK', // 預設語言
        interpolation: {
            escapeValue: false // React 已經防止 XSS
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage']
        }
    });

export default i18n;
