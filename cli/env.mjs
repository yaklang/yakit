/**
 * 三端唯一发行版词表与 YAKIT_* 环境变量组装。
 * 渲染端 / electron-builder / CLI 都使用同一套名字和取值，不再做跨层翻译。
 * 仅引擎 Handshake 仍走旧名（toEngineHandshakeName）。
 */

const EDITIONS = [
  { value: 'yakit', name: 'Yakit CE' },
  { value: 'yakitEE', name: 'Yakit EE: EnpriTrace' },
  { value: 'yakitSE', name: 'Yakit SE: EnpriTraceAgent' },
  { value: 'irify', name: 'IRify CE' },
  { value: 'irifyEE', name: 'IRify EE: IRifyEnpriTrace' },
  { value: 'memfit', name: 'Memfit CE' },
  { value: 'breachtrace', name: 'BAS / BreachTrace' },
]

const SYSTEMS = [
  { value: 'win', name: 'Windows' },
  { value: 'mac', name: 'macOS' },
  { value: 'linux', name: 'Linux' },
  { value: 'mwl', name: 'Mac + Windows + Linux' },
]

const INSTALL_TARGETS = ['electron', 'main', 'link']

const EDITION_VALUES = EDITIONS.map((item) => item.value)
const SYSTEM_VALUES = SYSTEMS.map((item) => item.value)

/** 引擎 Handshake 仍认旧平台字符串 */
const ENGINE_HANDSHAKE_NAME = {
  yakit: 'yakit',
  yakitEE: 'enterprise',
  yakitSE: 'simple-enterprise',
  irify: 'irify',
  irifyEE: 'irify-enterprise',
  memfit: 'memfit',
  breachtrace: 'breachtrace',
  enterprise: 'enterprise',
  'simple-enterprise': 'simple-enterprise',
  'irify-enterprise': 'irify-enterprise',
  enpritrace: 'enterprise',
  etraceagent: 'simple-enterprise',
}

const isEdition = (value) => EDITION_VALUES.includes(value)
const isSystem = (value) => SYSTEM_VALUES.includes(value)
const isInstallTarget = (value) => INSTALL_TARGETS.includes(value)

const toEngineHandshakeName = (edition) => {
  if (!edition) return 'yakit'
  return ENGINE_HANDSHAKE_NAME[edition] || edition
}

/**
 * 组装注入到 vite / electron-builder 子进程的 env。
 * 未开启的开关不写入，避免把 'false' 和「未设」混在一起。
 */
const buildYakitEnv = ({
  edition,
  devtools,
  sourcemap,
  analyzer,
  skipEnterpriseLicense,
  legacy,
  sign,
} = {}) => {
  const env = { ...process.env }

  if (edition) env.YAKIT_EDITION = edition
  if (devtools) env.YAKIT_DEVTOOLS = 'true'
  if (sourcemap) env.YAKIT_SOURCEMAP = 'true'
  if (analyzer) env.YAKIT_ANALYZER = 'true'
  if (skipEnterpriseLicense) env.YAKIT_REQUIRE_ENTERPRISE_LICENSE = 'false'
  if (legacy) env.YAKIT_LEGACY = 'true'
  if (sign) {
    env.CSC_IDENTITY_AUTO_DISCOVERY = 'true'
  } else if (sign === false) {
    env.CSC_IDENTITY_AUTO_DISCOVERY = 'false'
  }

  return env
}

export {
  EDITIONS,
  SYSTEMS,
  INSTALL_TARGETS,
  EDITION_VALUES,
  SYSTEM_VALUES,
  isEdition,
  isSystem,
  isInstallTarget,
  toEngineHandshakeName,
  buildYakitEnv,
}
