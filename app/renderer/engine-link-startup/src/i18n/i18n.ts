import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import HttpBackend from 'i18next-http-backend'
import { getDefaultI18nLng } from '@/utils/envfile'

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: getDefaultI18nLng(),
    fallbackLng: 'en',
    supportedLngs: ['zh', 'en', 'zh-TW'],
    ns: ['startup'],
    defaultNS: '',
    interpolation: {
      escapeValue: false,
    },
    backend: { loadPath: './locales/{{lng}}/{{ns}}.json' },
    react: { useSuspense: true },
  })

export default i18n
