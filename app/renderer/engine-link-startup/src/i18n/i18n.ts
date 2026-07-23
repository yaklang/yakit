import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import resourcesToBackend from 'i18next-resources-to-backend'
import { I18nNamespace } from './namespaces'

i18n
  .use(
    resourcesToBackend((lng: string, ns: string) => {
      // 动态 import 让 vite 把每个 (lng, ns) 切成独立 chunk，
      // 既保留 useI18nNamespaces 的按需懒加载，又让 JSON 经压缩随 JS chunk 一起进入 dist。
      return import(`../locales/${lng}/${ns}.json`)
    }),
  )
  .use(initReactI18next)
  .init({
    lng: 'zh',
    fallbackLng: false,
    supportedLngs: ['zh', 'en', 'zh-TW'],
    load: 'currentOnly',
    ns: ['link', 'yakitUi'] satisfies I18nNamespace[], // 需要预加载
    defaultNS: '',
    interpolation: {
      escapeValue: false,
    },
    react: { useSuspense: true },
  })

export default i18n
