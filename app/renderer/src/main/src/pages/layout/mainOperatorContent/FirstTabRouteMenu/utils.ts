import type { PublicRouteMenuProps } from '@/routes/newRoute'
import { YakitRoute } from '@/enums/yakitRoute'
import { isMemfit, isYakitOrEnpriTrace } from '@/utils/envfile'
import type { FirstTabRouteItem } from './type'

const flattenRoutes = (menus: PublicRouteMenuProps[]): PublicRouteMenuProps[] =>
  menus.flatMap((menu) => (menu.page ? [menu] : flattenRoutes(menu.children || [])))

export const flattenFirstTabRouteMenus = (menus: PublicRouteMenuProps[]) =>
  flattenRoutes(menus.flatMap((menu) => menu.children || [])).filter((menu) => menu.page !== YakitRoute.Plugin_OP)

const configManagementRoutes: FirstTabRouteItem[] = [
  {
    optionKey: `${YakitRoute.ConfigManagement}-payload`,
    page: YakitRoute.ConfigManagement,
    label: '字典管理',
    labelUi: 'YakitRoute.Payload',
    configTab: 'payload',
  },
  {
    optionKey: `${YakitRoute.ConfigManagement}-proxy`,
    page: YakitRoute.ConfigManagement,
    label: '代理管理',
    labelUi: 'Layout.ExtraMenu.proxyManagement',
    configTab: 'proxy',
  },
  {
    optionKey: `${YakitRoute.ConfigManagement}-hotPatch`,
    page: YakitRoute.ConfigManagement,
    label: '热加载管理',
    labelUi: 'Layout.ExtraMenu.hotPatchManagement',
    configTab: 'hotPatch',
  },
]

const yakRunnerRoute: FirstTabRouteItem = {
  optionKey: YakitRoute.YakScript,
  page: YakitRoute.YakScript,
  label: 'Yak Runner',
  labelUi: 'YakitRoute.YakRunner',
}

const vulinboxRoute: FirstTabRouteItem = {
  optionKey: YakitRoute.Beta_VulinboxManager,
  page: YakitRoute.Beta_VulinboxManager,
  label: '靶场',
  labelUi: 'YakitRoute.range',
}

/**
 * 顶栏已有、左侧菜单目录里没有的页面：资源管理三个页签、Yak Runner、靶场。
 * 版本可见性跟随原入口：资源管理与靶场同 ManagementTab / getExtraMenu（isYakitOrEnpriTrace），
 * Yak Runner 额外覆盖 Memfit（其顶栏唯一入口）；IRify 两处入口都没有，不追加。
 */
export const getFirstTabExtraRoutes = (): FirstTabRouteItem[] => {
  const configManagement = isYakitOrEnpriTrace()
  return [
    ...(configManagement ? configManagementRoutes : []),
    ...(configManagement || isMemfit() ? [yakRunnerRoute] : []),
    ...(configManagement ? [vulinboxRoute] : []),
  ]
}

export const appendFirstTabExtraRoutes = (routes: PublicRouteMenuProps[]): FirstTabRouteItem[] => {
  const openedPages = new Set(routes.map((route) => route.page))
  const extras = getFirstTabExtraRoutes().filter((route) => !!route.configTab || !openedPages.has(route.page))
  return [...routes, ...extras]
}

export const buildFirstTabRouteOptions = <T extends PublicRouteMenuProps>(
  routes: T[],
  translate: (key: string) => string,
  keyword: string,
) => {
  const query = keyword.trim().toLocaleLowerCase()
  return routes
    .map((menu) => ({ ...menu, displayLabel: menu.labelUi ? translate(menu.labelUi) : menu.label }))
    .filter((menu) => menu.displayLabel.toLocaleLowerCase().includes(query))
}
