import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zhResources, { ALL_ZH_NAMESPACES } from './zhResources'

i18n.use(initReactI18next).init({
  lng: 'zh',
  fallbackLng: 'zh',
  supportedLngs: ['zh'],
  ns: [...ALL_ZH_NAMESPACES],
  defaultNS: 'layout',
  resources: {
    zh: zhResources,
  },
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
})

export default i18n
