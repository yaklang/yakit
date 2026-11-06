import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import aiAgent from '@/locales/zh/aiAgent.json'
import yakitUi from '@/locales/zh/yakitUi.json'

await i18n.use(initReactI18next).init({
  lng: 'zh',
  resources: { zh: { aiAgent, yakitUi } },
  interpolation: { escapeValue: false },
  initImmediate: false,
})
export default i18n
