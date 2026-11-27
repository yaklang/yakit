/**
 * 主窗口的 locale 加载器。
 * link 构建通过 vite.link.config.mts 的 alias 指向 engineLinkStartup/i18n/localeLoader，
 * 避免把主窗口全部 locale JSON 复制进 link 产物。
 */
export const loadLocaleResource = (lng: string, ns: string) => import(`../locales/${lng}/${ns}.json`)
