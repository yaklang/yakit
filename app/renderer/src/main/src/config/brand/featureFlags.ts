/**
 * Edition / Feature Flag 抽象层
 *
 * 目标：通过构建变量 REACT_APP_EDITION（兼容 APP_EDITION 概念）控制不同发行版的功能开关。
 * 第一阶段只实现"配置能力"，不删除任何功能。
 *
 * - edition = yakit：默认全部功能开启（保持现有行为不变）
 * - edition = arkium：保留核心功能，未来用于隐藏非核心功能
 *
 * 注意：此处的 edition 是 Arkium 国际版的"功能集合"概念，
 * 与现有 src/utils/envfile.tsx 中基于 REACT_APP_PLATFORM 的
 * PRODUCT_RELEASE_EDITION（社区版/企业版等商业发行）是两个正交的维度，互不影响。
 */

export type AppEdition = 'yakit' | 'arkium'

/** 预留的功能开关位 */
export interface FeatureFlags {
  /** 代理 / MITM 劫持 */
  proxy: boolean
  /** Repeater（对应 WebFuzzer / HTTP Fuzzer） */
  repeater: boolean
  /** 扫描器 */
  scanner: boolean
  /** 插件 / 扩展 */
  extensions: boolean
  /** 项目管理 */
  projects: boolean
  /** HTTP History（DB_HTTPHistory） */
  history: boolean
  /** Yak 脚本 / Yak Runner */
  yakScript: boolean
  /** 高级工具集 */
  advancedTools: boolean
  /** 实验性功能 */
  experimentalFeatures: boolean
}

export type FeatureFlagKey = keyof FeatureFlags

const YAKIT_FLAGS: FeatureFlags = {
  proxy: true,
  repeater: true,
  scanner: true,
  extensions: true,
  projects: true,
  history: true,
  yakScript: true,
  advancedTools: true,
  experimentalFeatures: true,
}

const ARKIUM_FLAGS: FeatureFlags = {
  proxy: true,
  repeater: true,
  scanner: true,
  extensions: true,
  projects: true,
  history: true,
  yakScript: false,
  advancedTools: false,
  experimentalFeatures: false,
}

export const EDITION_FEATURE_FLAGS: Record<AppEdition, FeatureFlags> = {
  yakit: YAKIT_FLAGS,
  arkium: ARKIUM_FLAGS,
}

/**
 * 读取当前 edition。
 * 优先 REACT_APP_EDITION，兼容 APP_EDITION，未显式指定时默认 yakit。
 */
export const getEdition = (): AppEdition => {
  let raw = ''
  try {
    raw = (process.env?.REACT_APP_EDITION || process.env?.APP_EDITION || '').toLowerCase()
  } catch (e) {
    raw = ''
  }
  return raw === 'arkium' ? 'arkium' : 'yakit'
}

/** 当前 edition 的功能开关集合 */
export const getFeatureFlags = (): FeatureFlags => {
  return EDITION_FEATURE_FLAGS[getEdition()]
}

/**
 * 判断某个功能是否开启。
 * 默认 yakit edition 下全部返回 true，保证现有功能不受影响。
 */
export const isFeatureEnabled = (flag: FeatureFlagKey): boolean => {
  return !!getFeatureFlags()[flag]
}

/** 是否 Arkium edition */
export const isArkiumEdition = (): boolean => getEdition() === 'arkium'
