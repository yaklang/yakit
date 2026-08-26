import { info } from '@/utils/notification'
import { setRemoteValue } from '@/utils/kv'
import { RemoteGV } from '@/yakitGV'
import { RemotePrivateDomainGV } from '@/enums/privateDomain'
import type { Theme } from '@/hook/useTheme'
import { yakitRelease } from '@/services/electronBridge'
import i18n from '@/i18n/i18n'
const tOriginal = i18n.getFixedT(null, 'utils')

export enum PRODUCT_RELEASE_EDITION {
  Yakit = 0,
  /**@name 企业版 */
  EnpriTrace = 1,
  /**@name 便携版/简易版 */
  EnpriTraceAgent = 2,
  /**@deprecated BAS实验性功能 */
  BreachTrace = 3,
  /**@name IRify扫描(IRify独立于企业版社区版之外,其自身拥有企业版) */
  IRify = 4,
  /**@name IRify扫描-企业版 */
  IRifyEnpriTrace = 5,
  /**@name memfit (AIAgent独立于企业版社区版之外) */
  MEMFIT = 6,
}

export type VersionSource = 'yakit' | 'irify' | 'memfit'

export const getReleaseEditionName = () => {
  switch (GetReleaseEdition()) {
    case PRODUCT_RELEASE_EDITION.EnpriTrace:
      return 'EnpriTrace'
    case PRODUCT_RELEASE_EDITION.EnpriTraceAgent:
      return 'EnpriTraceAgent'
    case PRODUCT_RELEASE_EDITION.BreachTrace:
      return 'BAS'
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
/**只有yakit 社区版和企业版有WF缓存 */
export const isWFCacheEdition = () => {
  return (
    GetReleaseEdition() === PRODUCT_RELEASE_EDITION.Yakit || GetReleaseEdition() === PRODUCT_RELEASE_EDITION.EnpriTrace
  )
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

export const isBreachTrace = () => {
  return GetReleaseEdition() === PRODUCT_RELEASE_EDITION.BreachTrace
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

export const getCurrentVersionSource = (): VersionSource => {
  if (isIRify()) {
    return 'irify'
  }

  if (isMemfit()) {
    return 'memfit'
  }

  return 'yakit'
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

export const isYakitOrEnpriTrace = () => {
  return (
    GetReleaseEdition() === PRODUCT_RELEASE_EDITION.Yakit || GetReleaseEdition() === PRODUCT_RELEASE_EDITION.EnpriTrace
  )
}

export const isEnterpriseOrSimpleEdition = () => {
  switch (GetReleaseEdition()) {
    case PRODUCT_RELEASE_EDITION.EnpriTrace:
    case PRODUCT_RELEASE_EDITION.EnpriTraceAgent:
    case PRODUCT_RELEASE_EDITION.IRifyEnpriTrace:
      return true
    default:
      return false
  }
}

export const GetReleaseEdition = () => {
  switch (fetchEnv()) {
    case 'yakitEE':
      return PRODUCT_RELEASE_EDITION.EnpriTrace
    case 'yakitSE':
      return PRODUCT_RELEASE_EDITION.EnpriTraceAgent
    case 'irify':
      return PRODUCT_RELEASE_EDITION.IRify
    case 'irifyEE':
      return PRODUCT_RELEASE_EDITION.IRifyEnpriTrace
    case 'breachtrace':
      return PRODUCT_RELEASE_EDITION.BreachTrace
    case 'memfit':
      return PRODUCT_RELEASE_EDITION.MEMFIT
    default:
      return PRODUCT_RELEASE_EDITION.Yakit
  }
}

export const fetchEnv = () => {
  try {
    return process.env.YAKIT_EDITION
  } catch (e) {
    return ''
  }
}

/** 引擎 Handshake 仍使用旧平台名 */
export const toEngineHandshakeName = (edition = fetchEnv()) => {
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

/*
 * 在导入的时候，就马上设置，不用等到组件加载
 * */
yakitRelease.setEditionRaw(fetchEnv() || '').then(() => {
  if (isEnpriTraceAgent()) {
    info(tOriginal('envfile.setReleaseEditionSuccess', { edition: getReleaseEditionName() }))
  }
})

/** 是否展示开发者工具 */
export const showDevTool = () => {
  const devTool = process.env.YAKIT_DEVTOOLS || ''
  return devTool === 'true'
}

export const globalUserLogout = () => {
  if (isCommunityEdition()) {
    return setRemoteValue(RemoteGV.TokenOnline, '')
  } else {
    return setRemoteValue(RemoteGV.TokenOnlineEnterprise, '')
  }
}

export const globalUserLogin = (token: any) => {
  if (isCommunityEdition()) {
    return setRemoteValue(RemoteGV.TokenOnline, token)
  } else {
    return setRemoteValue(RemoteGV.TokenOnlineEnterprise, token)
  }
}

export const getRemoteHttpSettingGV = () => {
  switch (GetReleaseEdition()) {
    case PRODUCT_RELEASE_EDITION.Yakit:
      return RemotePrivateDomainGV.ceHttpSetting
    case PRODUCT_RELEASE_EDITION.EnpriTrace:
      return RemotePrivateDomainGV.eeHttpSetting
    case PRODUCT_RELEASE_EDITION.EnpriTraceAgent:
      return RemotePrivateDomainGV.seHttpSetting
    case PRODUCT_RELEASE_EDITION.IRify:
      return RemotePrivateDomainGV.ceIRifyHttpSetting
    case PRODUCT_RELEASE_EDITION.IRifyEnpriTrace:
      return RemotePrivateDomainGV.eeIRifyHttpSetting
    case PRODUCT_RELEASE_EDITION.BreachTrace:
      return RemotePrivateDomainGV.basHttpSetting
    case PRODUCT_RELEASE_EDITION.MEMFIT:
      return RemotePrivateDomainGV.ceHttpSetting
  }
}

export const getRemoteConfigBaseUrlGV = () => {
  switch (GetReleaseEdition()) {
    case PRODUCT_RELEASE_EDITION.Yakit:
      return RemotePrivateDomainGV.ceConfigBaseUrl
    case PRODUCT_RELEASE_EDITION.EnpriTrace:
      return RemotePrivateDomainGV.eeConfigBaseUrl
    case PRODUCT_RELEASE_EDITION.EnpriTraceAgent:
      return RemotePrivateDomainGV.seConfigBaseUrl
    case PRODUCT_RELEASE_EDITION.IRify:
      return RemotePrivateDomainGV.ceIRifyConfigBaseUrl
    case PRODUCT_RELEASE_EDITION.IRifyEnpriTrace:
      return RemotePrivateDomainGV.eeIRifyConfigBaseUrl
    case PRODUCT_RELEASE_EDITION.BreachTrace:
      return RemotePrivateDomainGV.basConfigBaseUrl
  }
}

export const GetConnectPort = () => {
  switch (fetchEnv()) {
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

export const GetMainColor = (themeMode: Theme) => {
  switch (fetchEnv()) {
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
