import i18n from 'i18next'
import type { Resource } from 'i18next'
import { initReactI18next } from 'react-i18next'
import resourcesToBackend from 'i18next-resources-to-backend'
import { type I18nNamespace } from './namespaces'
import { loadLocaleResource } from '@/i18n/localeLoader'

const isLinkEntry = typeof window !== 'undefined' && window.__YAKIT_ENTRY__ === 'link'
// 生产构建用编译期常量，避免主窗口产物里留下未使用的 Link inline chunk；
// 开发态同一个 Vite 服务提供两个入口，只能用运行时标记。
declare const __YAKIT_LINK_ENTRY__: boolean
// 非标准 Vite 配置（如 Memfit UI 回归）不会注入该常量，typeof 保护避免运行时 ReferenceError。
const useLinkInlineResources = import.meta.env.DEV
  ? isLinkEntry
  : typeof __YAKIT_LINK_ENTRY__ !== 'undefined' && __YAKIT_LINK_ENTRY__
// 企业版中文资源同步内联：Link 开发态与生产态保持一致，不走 backend 首屏加载。
const useI18nInline = process.env.YAKIT_EDITION ? ['yakitEE', 'irifyEE'].includes(process.env.YAKIT_EDITION) : false

/** link 窗口只预加载启动页需要的 namespace，避免把主窗口 locale 拉进冷启动 */
const LINK_PRELOAD_NAMESPACES: I18nNamespace[] = ['link', 'yakitUi']
const MAIN_PRELOAD_NAMESPACES: I18nNamespace[] = [
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
]

if (useI18nInline) {
  // 按需加载 inline 资源：Link 只内联 link / yakitUi，主窗口内联其余 namespace。
  // eager glob 在构建期展开为静态 import，模块加载完成后才初始化 i18n。
  const { inlineZhResources } = useLinkInlineResources
    ? await import('@/engineLinkStartup/i18n/inlineResources')
    : await import('@/i18n/inlineResources')
  const resources: Resource = { zh: inlineZhResources }

  i18n
    // inline 资源按入口注入；保留按需 backend，资源缺失时仍可由 localeLoader 补载。
    .use(
      resourcesToBackend((lng: string, ns: string) => {
        return loadLocaleResource(lng, ns)
      }),
    )
    .use(initReactI18next)
    .init({
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
        // 既保留 useI18nNamespaces 的按需懒加载，又让 JSON 经压缩随 JS chunk 一起进入 asar。
        return loadLocaleResource(lng, ns)
      }),
    )
    .use(initReactI18next)
    .init({
      lng: 'zh',
      fallbackLng: false,
      supportedLngs: ['zh', 'en', 'zh-TW'],
      ns: isLinkEntry ? LINK_PRELOAD_NAMESPACES : MAIN_PRELOAD_NAMESPACES,
      load: 'currentOnly',
      defaultNS: '',
      interpolation: {
        escapeValue: false,
      },
      react: { useSuspense: true },
    })
}

export default i18n
