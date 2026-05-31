import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import HttpBackend from 'i18next-http-backend'
import { getBrandDefaultI18nLng } from '@/config/brand/brandConfig'

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    // 默认语言由 brand 决定（Yakit -> zh，Arkium -> en），可被 REACT_APP_LANG 覆盖。
    // 用户在应用内手动切换的语言仍会在 index.tsx 中读取本地存储后覆盖此默认值。
    lng: getBrandDefaultI18nLng(),
    fallbackLng: 'en',
    supportedLngs: ['zh', 'en', 'zh-TW'],
    ns: [
      'yakitUi',
      'yakitRoute',
      'core',
      'layout',
      'plugin',
      'yakitStore',
      'customizeMenu',
      'home',
      'history',
      'webFuzzer',
      'aiAgent',
      'setting',
      'yakChat',
      'product',
    ], // 这几个需要预加载
    defaultNS: '',
    interpolation: {
      escapeValue: false,
    },
    backend: { loadPath: './locales/{{lng}}/{{ns}}.json' },
    react: { useSuspense: true },
  })

export default i18n
