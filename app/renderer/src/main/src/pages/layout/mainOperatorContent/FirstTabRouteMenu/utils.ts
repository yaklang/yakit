import type { PublicRouteMenuProps } from '@/routes/newRoute'

const flattenRoutes = (menus: PublicRouteMenuProps[]): PublicRouteMenuProps[] =>
  menus.flatMap((menu) => (menu.page ? [menu] : flattenRoutes(menu.children || [])))

export const flattenFirstTabRouteMenus = (menus: PublicRouteMenuProps[]) =>
  flattenRoutes(menus.flatMap((menu) => menu.children || []))

export const buildFirstTabRouteOptions = (
  routes: PublicRouteMenuProps[],
  translate: (key: string) => string,
  keyword: string,
) => {
  const query = keyword.trim().toLocaleLowerCase()
  return routes
    .map((menu) => ({ ...menu, displayLabel: menu.labelUi ? translate(menu.labelUi) : menu.label }))
    .filter((menu) => menu.displayLabel.toLocaleLowerCase().includes(query))
}
