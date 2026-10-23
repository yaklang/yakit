// @ts-ignore — i18next is provided by the application runtime, which may not be visible to this package's type checker.
import i18n from 'i18next'
// @ts-ignore — i18next is provided by the application runtime, which may not be visible to this package's type checker.
import type { Resource, ResourceKey } from 'i18next'
// @ts-ignore — react-i18next is provided by the application runtime, which may not be visible to this package's type checker.
import { initReactI18next } from 'react-i18next'
import { type I18nNamespace } from './namespaces'

const useI18nInline = process.env.YAKIT_EDITION ? ['yakitEE', 'irifyEE'].includes(process.env.YAKIT_EDITION) : false

if (useI18nInline) {
  // eager glob 在构建期展开为静态 import，中文资源随本模块同步可用（不产运行时懒 chunk）
  const modules = import.meta.glob('../locales/en/*.json', { eager: true, import: 'default' })

  const resources: Resource = { en: {} }
  for (const [path, mod] of Object.entries(modules)) {
    const ns = path
      .split('/')
      .pop()!
      .replace(/\.json$/, '')
    resources.en[ns] = mod as ResourceKey
  }

  i18n.use(initReactI18next).init({
    resources, // 仅含中文
    lng: 'en',
    fallbackLng: false,
    initAsync: false,
    ns: Object.keys(resources.en) as I18nNamespace[],
    defaultNS: '',
    interpolation: { escapeValue: false },
    react: { useSuspense: false }, // 同步就绪，无需 Suspense fallback
  })
} else {
  i18n
    .use({
      type: 'backend',
      read(lng: string, ns: string, callback: (error: Error | null, data: ResourceKey) => void) {
        // 动态 import 让 vite 把每个 (lng, ns) 切成独立 chunk，
        // 既保留 useI18nNamespaces 的按需懒加载，又让 JSON 经压缩随 JS chunk 一起进入 asar。
        import(`../locales/${lng}/${ns}.json`).then(
          (module) => callback(null, module.default as ResourceKey),
          (error: Error) => callback(error, {}),
        )
      },
    })
    .use(initReactI18next)
    .init({
      lng: 'en',
      fallbackLng: 'en',
      supportedLngs: ['zh', 'en', 'zh-TW'],
      ns: [
        'yakitUi',
        'yakitRoute',
        'core',
        'layout',
        'customizeMenu',
        'components',
        'plugin',
        'utils',
        'engineConsole',
        'yakChat',
        'home',
        'history',
        'webFuzzer',
        'mitm',
        'aiAgent',
        'projectManage',
        'irifyHome',
        'apiUtils',
      ] satisfies I18nNamespace[], // 这几个需要预加载
      load: 'currentOnly',
      defaultNS: '',
      interpolation: {
        escapeValue: false,
      },
      react: { useSuspense: true },
    })
}

export default i18n
