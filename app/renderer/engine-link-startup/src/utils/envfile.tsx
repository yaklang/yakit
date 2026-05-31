import { Theme } from '@/hooks/useTheme'

export const __PLATFORM__ = import.meta.env.VITE_PLATFORM

/** 品牌标识（用于启动页/引擎连接窗的产品名展示），默认 yakit */
export const __BRAND__ = import.meta.env.VITE_BRAND || 'yakit'

/** 是否 Arkium 品牌（Logo / 发行版逻辑分支，文案走 i18n lng 不在这里判断） */
export const isArkiumBrand = (): boolean => __BRAND__ === 'arkium'

/**
 * 引擎连接窗 i18n 默认语言（与主工程一致：资源 key 为 zh / en / zh-TW）。
 * 优先级：VITE_LANG > brand 默认（arkium -> en，yakit -> zh）。
 */
export const getDefaultI18nLng = (): 'zh' | 'en' | 'zh-TW' => {
  const envLang = (import.meta.env.VITE_LANG || '').toLowerCase()
  if (envLang.startsWith('en')) return 'en'
  if (envLang === 'zh-tw' || envLang.startsWith('zh-tw')) return 'zh-TW'
  if (envLang.startsWith('zh')) return 'zh'
  return __BRAND__ === 'arkium' ? 'en' : 'zh'
}

/** 当前品牌产品名：arkium -> 'Arkium'，其余默认 'Yakit'（行为不变） */
export const getBrandProductName = () => {
  switch (__BRAND__) {
    case 'arkium':
      return 'Arkium'
    default:
      return 'Yakit'
  }
}

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
      // 默认 Yakit 发行版下，产品名由 brand 决定：yakit -> 'Yakit'，arkium -> 'Arkium'
      return getBrandProductName()
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

export const GetReleaseEdition = () => {
  switch (__PLATFORM__) {
    case 'enterprise':
      return PRODUCT_RELEASE_EDITION.EnpriTrace
    case 'simple-enterprise':
      return PRODUCT_RELEASE_EDITION.EnpriTraceAgent
    case 'irify':
      return PRODUCT_RELEASE_EDITION.IRify
    case 'irify-enterprise':
      return PRODUCT_RELEASE_EDITION.IRifyEnpriTrace
    case 'memfit':
      return PRODUCT_RELEASE_EDITION.MEMFIT
    default:
      return PRODUCT_RELEASE_EDITION.Yakit
  }
}

export const GetConnectPort = () => {
  switch (__PLATFORM__) {
    case 'enterprise':
      return 9012
    case 'simple-enterprise':
      return 9013
    case 'irify':
      return 9014
    case 'irify-enterprise':
      return 9015
    case 'memfit':
      return 9016
    default:
      return 9011
  }
}

export type SoftwareVersion = 'yakit' | 'irify' | 'memfit'
/** 获取软件是什么版本(yakit|irify|memfit) */
export const FetchSoftwareVersion: () => SoftwareVersion = () => {
  switch (__PLATFORM__) {
    case 'irify':
    case 'irify-enterprise':
      return 'irify'
    // case "memfit":
    //     return "memfit"
    default:
      return 'yakit'
  }
}

export const GetMainColor = (themeMode: Theme) => {
  switch (__PLATFORM__) {
    case 'irify':
    case 'irify-enterprise':
      return themeMode === 'dark' ? '#B081FF' : '#6A44A9'
    case 'memfit':
      return themeMode === 'dark' ? '#5E9DEA' : '#2E63B3'
    case 'enterprise':
    case 'simple-enterprise':
    case 'yakit':
      return '#F17F30'
  }
}
