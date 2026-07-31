/** Minimal i18n stub for unit tests */
const i18n = {
  getFixedT: () => (key: string) => key,
  t: (key: string) => key,
  language: 'zh',
  changeLanguage: async () => undefined,
  use: () => i18n,
  init: async () => undefined,
}
export default i18n
