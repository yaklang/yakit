export type Lange = 'zh' | 'zh-TW' | 'en'
const SUPPORTED_LANGS: Lange[] = ['zh', 'zh-TW', 'en']

export const normalizeLang = (lang?: Lange): Lange => {
  return lang && SUPPORTED_LANGS.includes(lang) ? lang : 'zh'
}
