import type { ResourceKey } from 'i18next'

/**
 * 企业版同步内联中文资源。
 * link 构建通过 vite.link.config.mts 的 alias 指向 engineLinkStartup/i18n/inlineResources，
 * 只内联 link 需要的两个 namespace。
 */
const modules = import.meta.glob(['../locales/zh/*.json', '!../locales/zh/link.json'], {
  eager: true,
  import: 'default',
})

export const inlineZhResources: Record<string, ResourceKey> = {}
for (const [path, mod] of Object.entries(modules)) {
  const ns = path
    .split('/')
    .pop()!
    .replace(/\.json$/, '')
  inlineZhResources[ns] = mod as ResourceKey
}
