import type { Theme } from '@/hooks/useTheme'

export const __PLATFORM__ = import.meta.env.YAKIT_EDITION

export enum PRODUCT_RELEASE_EDITION {
  Yakit = 0,
  /**@name 企业版 */
  EnpriTrace = 1,
  /**@name 便携版/简易版 */
  EnpriTraceAgent = 2,
  /**@name IRify扫描(IRify独立于企业版社区版之外,其自身拥有企业版) */
  IRify = 4,
  /**@name IRify扫描-企业版 */
  IRifyEnpriTrace = 5,
  /**@name memfit (AIAgent独立于企业版社区版之外) */
  MEMFIT = 6,
}

export const getReleaseEditionName = () => {
  switch (GetReleaseEdition()) {
    case PRODUCT_RELEASE_EDITION.EnpriTrace:
      return 'EnpriTrace'
    case PRODUCT_RELEASE_EDITION.EnpriTraceAgent:
      return 'EnpriTraceAgent'
    case PRODUCT_RELEASE_EDITION.IRify:
      return 'IRify'
    case PRODUCT_RELEASE_EDITION.IRifyEnpriTrace:
      return 'IRify-EnpriTrace'
    case PRODUCT_RELEASE_EDITION.MEMFIT:
      return 'Memfit AI'
    default:
      return 'Yakit'
  }
}

/** EE */
export const isEnpriTrace = () => {
  return (
    GetReleaseEdition() === PRODUCT_RELEASE_EDITION.EnpriTrace ||
    GetReleaseEdition() === PRODUCT_RELEASE_EDITION.IRifyEnpriTrace
  )
}
/** SE  */
export const isEnpriTraceAgent = () => {
  return GetReleaseEdition() === PRODUCT_RELEASE_EDITION.EnpriTraceAgent
}

/** CE */
export const isCommunityEdition = () => {
  return (
    GetReleaseEdition() === PRODUCT_RELEASE_EDITION.Yakit ||
    GetReleaseEdition() === PRODUCT_RELEASE_EDITION.IRify ||
    GetReleaseEdition() === PRODUCT_RELEASE_EDITION.MEMFIT
  )
}
/** 非CE */
export const isEnterpriseEdition = () => {
  return !isCommunityYakit() && !isCommunityIRify() && !isCommunityMemfit()
}

/** CE IRify Scan  */
export const isCommunityIRify = () => {
  return GetReleaseEdition() === PRODUCT_RELEASE_EDITION.IRify
}

/** EE IRify Scan  */
export const isEnpriTraceIRify = () => {
  return GetReleaseEdition() === PRODUCT_RELEASE_EDITION.IRifyEnpriTrace
}

/** IRify 独立于Yakit企业版社区版之外，其自身拥有企业版  */
export const isIRify = () => {
  return (
    GetReleaseEdition() === PRODUCT_RELEASE_EDITION.IRify ||
    GetReleaseEdition() === PRODUCT_RELEASE_EDITION.IRifyEnpriTrace
  )
}

/** CE Memfit AIAgent  */
export const isCommunityMemfit = () => {
  return GetReleaseEdition() === PRODUCT_RELEASE_EDITION.MEMFIT
}

/** Memfit 独立于Yakit企业版社区版之外  */
export const isMemfit = () => {
  return GetReleaseEdition() === PRODUCT_RELEASE_EDITION.MEMFIT
}

/** CE Yakit  */
export const isCommunityYakit = () => {
  return GetReleaseEdition() === PRODUCT_RELEASE_EDITION.Yakit
}

export const isYakit = () => {
  return (
    GetReleaseEdition() === PRODUCT_RELEASE_EDITION.Yakit ||
    GetReleaseEdition() === PRODUCT_RELEASE_EDITION.EnpriTrace ||
    GetReleaseEdition() === PRODUCT_RELEASE_EDITION.EnpriTraceAgent
  )
}

/** 轻量引擎版本标记，与 dev/ 类似：slim/1.4.8-beta6 */
export const SLIM_ENGINE_VERSION_PREFIX = 'slim/'

/** 仅社区版 Yakit 默认加上 slim/。轻量产物不存在时退回全量在主进程，不在这里改版本号。已带 slim/ 或 dev/ 的原样返回。 */
export const toDefaultYakEngineDownloadVersion = (version: string) => {
  if (!version) return version
  if (version.startsWith(SLIM_ENGINE_VERSION_PREFIX) || version.startsWith('dev/')) return version
  return isCommunityYakit() ? `${SLIM_ENGINE_VERSION_PREFIX}${version}` : version
}

/** 手动下载/复制官方引擎链接时使用的 OSS 文件名前缀 */
export const getOfficialYakEngineArtifactPrefix = () => (isCommunityYakit() ? 'yak-slim_' : 'yak_')

/** 来源校验要用和本地二进制一致的产物。轻量引擎对 slim/ 版本，不能拿全量包的 hash。 */
export const toEngineSourceHashVersion = (version: string, buildType?: string) => {
  if (!version || buildType !== 'slim') return version
  if (version.startsWith(SLIM_ENGINE_VERSION_PREFIX) || version.startsWith('dev/')) return version
  const plain = version.startsWith('v') ? version.slice(1) : version
  return `${SLIM_ENGINE_VERSION_PREFIX}${plain}`
}

export const GetReleaseEdition = () => {
  switch (__PLATFORM__) {
    case 'yakitEE':
      return PRODUCT_RELEASE_EDITION.EnpriTrace
    case 'yakitSE':
      return PRODUCT_RELEASE_EDITION.EnpriTraceAgent
    case 'irify':
      return PRODUCT_RELEASE_EDITION.IRify
    case 'irifyEE':
      return PRODUCT_RELEASE_EDITION.IRifyEnpriTrace
    case 'memfit':
      return PRODUCT_RELEASE_EDITION.MEMFIT
    default:
      return PRODUCT_RELEASE_EDITION.Yakit
  }
}

export const GetConnectPort = () => {
  switch (__PLATFORM__) {
    case 'yakitEE':
      return 9012
    case 'yakitSE':
      return 9013
    case 'irify':
      return 9014
    case 'irifyEE':
      return 9015
    case 'memfit':
      return 9016
    default:
      return 9011
  }
}

export const toEngineHandshakeName = (edition = __PLATFORM__) => {
  switch (edition) {
    case 'yakitEE':
      return 'enterprise'
    case 'yakitSE':
      return 'simple-enterprise'
    case 'irifyEE':
      return 'irify-enterprise'
    case 'irify':
      return 'irify'
    case 'memfit':
      return 'memfit'
    case 'breachtrace':
      return 'breachtrace'
    default:
      return 'yakit'
  }
}

export type SoftwareVersion = 'yakit' | 'irify' | 'memfit'
/** 获取软件是什么版本(yakit|irify|memfit) */
export const FetchSoftwareVersion: () => SoftwareVersion = () => {
  switch (__PLATFORM__) {
    case 'irify':
    case 'irifyEE':
      return 'irify'
    // case 'memfit':
    //   return 'memfit'
    default:
      return 'yakit'
  }
}

export const GetMainColor = (themeMode: Theme) => {
  switch (__PLATFORM__) {
    case 'irify':
    case 'irifyEE':
      return themeMode === 'dark' ? '#B081FF' : '#6A44A9'
    case 'memfit':
      return themeMode === 'dark' ? '#5E9DEA' : '#2E63B3'
    case 'yakitEE':
    case 'yakitSE':
    case 'yakit':
      return '#F17F30'
  }
}
