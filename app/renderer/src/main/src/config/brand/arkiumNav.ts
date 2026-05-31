/**
 * Arkium 导航层映射
 *
 * 目标：不重写任何业务页面，只在导航层做"核心功能优先 + 英文命名"的映射。
 *
 * - Yakit 模式：不使用此配置，菜单保持原样。
 * - Arkium 模式：核心导航优先显示 Proxy / History / Repeater / Scanner / Extensions / Projects，
 *   并通过 feature flag 控制是否展示。
 *
 * 命名说明：现有业务组件名为 WebFuzzer / HTTP Fuzzer，这里仅在导航层映射为 Repeater 等
 * 英文名称，不改动底层 YakitRoute 与业务组件。
 */

import { YakitRoute } from '@/enums/yakitRoute'
import { FeatureFlagKey, isFeatureEnabled } from './featureFlags'

export interface ArkiumNavItem {
  /** Arkium 导航英文标识 */
  key: string
  /** i18n key（product 命名空间），用于显示导航文案 */
  i18nKey: string
  /** 英文兜底文案（无 i18n 资源时使用） */
  fallbackLabel: string
  /** 映射到的现有 Yakit 路由（不改业务组件，仅做跳转映射） */
  route: YakitRoute
  /** 控制该导航项是否显示的 feature flag */
  featureFlag: FeatureFlagKey
}

/**
 * Arkium 核心导航映射表（按优先级排序）。
 * route 指向现有 Yakit 路由，business 组件零改动。
 */
export const ARKIUM_NAV_ITEMS: ArkiumNavItem[] = [
  {
    key: 'proxy',
    i18nKey: 'Nav.proxy',
    fallbackLabel: 'Proxy',
    route: YakitRoute.MITMHacker,
    featureFlag: 'proxy',
  },
  {
    key: 'history',
    i18nKey: 'Nav.history',
    fallbackLabel: 'History',
    route: YakitRoute.DB_HTTPHistory,
    featureFlag: 'history',
  },
  {
    key: 'repeater',
    i18nKey: 'Nav.repeater',
    fallbackLabel: 'Repeater',
    route: YakitRoute.HTTPFuzzer,
    featureFlag: 'repeater',
  },
  {
    key: 'scanner',
    i18nKey: 'Nav.scanner',
    fallbackLabel: 'Scanner',
    route: YakitRoute.PoC,
    featureFlag: 'scanner',
  },
  {
    key: 'extensions',
    i18nKey: 'Nav.extensions',
    fallbackLabel: 'Extensions',
    route: YakitRoute.Plugin_Hub,
    featureFlag: 'extensions',
  },
  {
    key: 'projects',
    i18nKey: 'Nav.projects',
    fallbackLabel: 'Projects',
    route: YakitRoute.YakRunner_Project_Manager,
    featureFlag: 'projects',
  },
]

/**
 * 返回当前 edition 下应展示的 Arkium 核心导航项（已按 feature flag 过滤）。
 * 导航层消费此函数即可，无需改动具体页面组件。
 */
export const getArkiumNavItems = (): ArkiumNavItem[] => {
  return ARKIUM_NAV_ITEMS.filter((item) => isFeatureEnabled(item.featureFlag))
}
