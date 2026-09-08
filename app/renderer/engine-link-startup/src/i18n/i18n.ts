import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import resourcesToBackend from 'i18next-resources-to-backend'
import { ALL_I18N_NAMESPACES, type I18nNamespace } from './namespaces'
import { __PLATFORM__ } from '@/utils/envfile'

const useI18nInline = __PLATFORM__ ? ['yakitEE', 'irifyEE'].includes(__PLATFORM__) : false
if (useI18nInline) {
  const loadAllZhResources = async () => {
    const resources: any = { zh: {} }
    for (const ns of ALL_I18N_NAMESPACES) {
      // 静态 import，Vite 会将这些 JSON 打包进主 chunk
      const mod = await import(`../locales/zh/${ns}.json`)
      resources.zh[ns] = mod.default
    }
    return resources
  }

  const resources = await loadAllZhResources()
  await i18n.use(initReactI18next).init({
    resources, // 仅含中文
    lng: 'zh',
    fallbackLng: false,
    ns: ALL_I18N_NAMESPACES,
    defaultNS: '',
    interpolation: { escapeValue: false },
    react: { useSuspense: false }, // 同步就绪，无需 fallback
  })
} else {
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
}

export default i18n
