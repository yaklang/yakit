/**
 * Brand Config 抽象层
 *
 * 目标：同一套代码可以编译出 Yakit 和 Arkium 两个发行版。
 * 通过构建变量 REACT_APP_BRAND 控制（兼容 APP_BRAND 概念），未显式指定时默认 yakit。
 *
 * 该文件为纯配置，无副作用，可安全在任意位置导入。
 */

export type BrandId = 'yakit' | 'arkium'

/** 受支持的应用语言（与 i18n 资源目录 zh/en 对应） */
export type AppLanguage = 'zh-CN' | 'en-US'

export interface BrandConfig {
  /** 品牌标识 */
  id: BrandId
  /** 产品名（用于标题、欢迎页、加载页等） */
  productName: string
  /** 公司名 */
  companyName: string
  /** 官网地址 */
  website: string
  /** GitHub 地址 */
  github: string
  /** 默认语言 */
  defaultLanguage: AppLanguage
}

export const BRAND_CONFIGS: Record<BrandId, BrandConfig> = {
  yakit: {
    id: 'yakit',
    productName: 'Yakit',
    companyName: 'Yaklang',
    website: 'https://www.yaklang.com/',
    github: 'https://github.com/yaklang/yakit',
    defaultLanguage: 'zh-CN',
  },
  arkium: {
    id: 'arkium',
    productName: 'Arkium',
    companyName: 'Arkium Tech LLC',
    website: 'https://arkium.app',
    github: 'https://github.com/Arkiumapp',
    defaultLanguage: 'en-US',
  },
}

/**
 * 读取当前 brand。
 * 优先读取 REACT_APP_BRAND（CRA 在渲染端注入的构建变量），
 * 其次兼容 APP_BRAND，未显式指定时默认 yakit，保持 Yakit 现有行为不变。
 */
export const getBrandId = (): BrandId => {
  let raw = ''
  try {
    raw = (process.env?.REACT_APP_BRAND || process.env?.APP_BRAND || '').toLowerCase()
  } catch (e) {
    raw = ''
  }
  return raw === 'arkium' ? 'arkium' : 'yakit'
}

/** 当前 brand 的完整配置 */
export const getBrandConfig = (): BrandConfig => {
  return BRAND_CONFIGS[getBrandId()]
}

/** 是否 Arkium 品牌 */
export const isArkiumBrand = (): boolean => getBrandId() === 'arkium'

/** 当前产品名（供 UI 显示，避免硬编码 'Yakit'） */
export const getBrandProductName = (): string => getBrandConfig().productName

/** 当前公司名（供关于页/版权信息显示） */
export const getBrandCompanyName = (): string => getBrandConfig().companyName

/** 当前官网地址 */
export const getBrandWebsite = (): string => getBrandConfig().website

/** 当前 GitHub 地址 */
export const getBrandGithub = (): string => getBrandConfig().github

/**
 * 将 brand 的默认语言映射为 i18next 资源 key（zh / en）。
 * 同时兼容构建变量 REACT_APP_LANG（zh-CN / en-US）。
 */
export const mapAppLanguageToI18nKey = (lang?: string): 'zh' | 'en' => {
  const normalized = (lang || '').toLowerCase()
  if (normalized.startsWith('en')) return 'en'
  if (normalized.startsWith('zh')) return 'zh'
  return 'zh'
}

/**
 * 计算 i18n 初始化时应使用的默认语言（资源 key）。
 * 优先级：REACT_APP_LANG（显式构建变量） > brand.defaultLanguage。
 * Yakit 默认 zh，不改变现有行为；Arkium 默认 en。
 */
export const getBrandDefaultI18nLng = (): 'zh' | 'en' => {
  let envLang = ''
  try {
    envLang = process.env?.REACT_APP_LANG || process.env?.APP_LANG || ''
  } catch (e) {
    envLang = ''
  }
  if (envLang) {
    return mapAppLanguageToI18nKey(envLang)
  }
  return mapAppLanguageToI18nKey(getBrandConfig().defaultLanguage)
}
