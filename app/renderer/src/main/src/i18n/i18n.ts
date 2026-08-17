import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zhResources from './zhResources'
import { ALL_I18N_NAMESPACES } from './namespaces'

i18n.use(initReactI18next).init({
  lng: 'zh',
  fallbackLng: 'zh',
  supportedLngs: ['zh'],
  ns: [...ALL_I18N_NAMESPACES], // 全量预加载（静态内联，资源已在 resources 中）
  defaultNS: '',
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