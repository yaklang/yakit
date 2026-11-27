/**
 * link 入口的 locale 加载器。
 * link 只需要 link / yakitUi 两个 namespace，显式列出避免 Vite 把主窗口全部 locale
 * JSON 也打进 pages/link。
 */
type LocaleLoader = () => Promise<unknown>

const loaders: Record<string, Record<string, LocaleLoader>> = {
  zh: {
    link: () => import('@/locales/zh/link.json'),
    yakitUi: () => import('@/locales/zh/yakitUi.json'),
  },
  'zh-TW': {
    link: () => import('@/locales/zh-TW/link.json'),
    yakitUi: () => import('@/locales/zh-TW/yakitUi.json'),
  },
  en: {
    link: () => import('@/locales/en/link.json'),
    yakitUi: () => import('@/locales/en/yakitUi.json'),
  },
}

export const loadLocaleResource = (lng: string, ns: string) => {
  const loader = loaders[lng]?.[ns]
  if (!loader) {
    return Promise.reject(new Error(`Unsupported link locale resource: ${lng}/${ns}`))
  }
  return loader()
}
