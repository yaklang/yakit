import i18n from 'i18next'
import type { Resource, ResourceKey } from 'i18next'
import { initReactI18next } from 'react-i18next'
import resourcesToBackend from 'i18next-resources-to-backend'
import { type I18nNamespace } from './namespaces'
import { __PLATFORM__ } from '@/utils/envfile'

const useI18nInline = __PLATFORM__ ? ['yakitEE', 'irifyEE'].includes(__PLATFORM__) : false

if (useI18nInline) {
  // eager glob 在构建期展开为静态 import，中文资源随本模块同步可用（不产运行时懒 chunk）
  const modules = import.meta.glob('../locales/zh/*.json', { eager: true, import: 'default' })

  const resources: Resource = { zh: {} }
  for (const [path, mod] of Object.entries(modules)) {
    const ns = path
      .split('/')
      .pop()!
      .replace(/\.json$/, '')
    resources.zh[ns] = mod as ResourceKey
  }

  i18n.use(initReactI18next).init({
    resources, // 仅含中文
    lng: 'zh',
    fallbackLng: false,
    initAsync: false,
    ns: Object.keys(resources.zh) as I18nNamespace[],
    defaultNS: '',
    interpolation: { escapeValue: false },
    react: { useSuspense: false }, // 同步就绪，无需 Suspense fallback
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
