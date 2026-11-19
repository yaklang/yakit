/**
 * i18n 命名空间枚举。
 * 名称与 `src/locales/zh/` 下的 JSON 文件一一对应，
 * 新增/删除翻译文件时请同步更新此处。
 */
export enum I18nNamespaces {
  HTTPHistoryAnalysis = 'HTTPHistoryAnalysis',
  admin = 'admin',
  aiAgent = 'aiAgent',
  apiUtils = 'apiUtils',
  assetViewer = 'assetViewer',
  brute = 'brute',
  codec = 'codec',
  comparer = 'comparer',
  components = 'components',
  configNetwork = 'configNetwork',
  core = 'core',
  customizeMenu = 'customizeMenu',
  cve = 'cve',
  dataStatistics = 'dataStatistics',
  dns = 'dns',
  engineConsole = 'engineConsole',
  history = 'history',
  home = 'home',
  hook = 'hook',
  icmpsizelog = 'icmpsizelog',
  irifyAiCodeAudit = 'irifyAiCodeAudit',
  irifyHome = 'irifyHome',
  layout = 'layout',
  link = 'link',
  mitm = 'mitm',
  manageRightClickPlugins = 'manageRightClickPlugins',
  notepad = 'notepad',
  payload = 'payload',
  plugin = 'plugin',
  pluginHub = 'pluginHub',
  portscan = 'portscan',
  projectManage = 'projectManage',
  remote = 'remote',
  reverse = 'reverse',
  risk = 'risk',
  ruleManagement = 'ruleManagement',
  screenRecorder = 'screenRecorder',
  setting = 'setting',
  shortcutKey = 'shortcutKey',
  simpleDetect = 'simpleDetect',
  spaceEngine = 'spaceEngine',
  store = 'store',
  utils = 'utils',
  vulinbox = 'vulinbox',
  webFuzzer = 'webFuzzer',
  websocket = 'websocket',
  yakChat = 'yakChat',
  yakPoC = 'yakPoC',
  yakRunner = 'yakRunner',
  yakRunnerAuditHole = 'yakRunnerAuditHole',
  yakURLTree = 'yakURLTree',
  yakitRoute = 'yakitRoute',
  yakitStore = 'yakitStore',
  yakitUi = 'yakitUi',
}

/**
 * 命名空间字符串字面量联合类型。
 * 由 I18nNamespaces 枚举的值推导而来，既兼容枚举成员，
 * 也兼容原始字符串字面量（如 'yakitUi'），便于调用处书写。
 */
export type I18nNamespace = `${I18nNamespaces}`

/**
 * 当前入口可用的命名空间；不等同于 locale 目录全集。
 * link 窗口只保留启动页需要的两个；Node 环境没有 window，也不包含 link。
 */
export const ENTRY_I18N_NAMESPACES: I18nNamespace[] =
  typeof window !== 'undefined' && window.__YAKIT_ENTRY__ === 'link'
    ? [I18nNamespaces.link, I18nNamespaces.yakitUi]
    : Object.values(I18nNamespaces).filter((ns) => ns !== I18nNamespaces.link)
