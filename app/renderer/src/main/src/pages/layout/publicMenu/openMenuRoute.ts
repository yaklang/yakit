import { YakitRoute } from '@/enums/yakitRoute'
import { useHttpFlowStore } from '@/store/httpFlow'
import emiter from '@/utils/eventBus/eventBus'
import type { RouteToPageProps } from './PublicMenu'

const emitMenuOpenPage = (route: RouteToPageProps) => emiter.emit('menuOpenPage', JSON.stringify(route))

export const openMenuRoute = (routeInfo: RouteToPageProps, onMenuSelect = emitMenuOpenPage) => {
  const { route, pluginId, pluginName } = routeInfo
  if (!route) return

  if (route === YakitRoute.Plugin_OP) {
    onMenuSelect({ route, pluginId: pluginId || 0, pluginName: pluginName || '' })
  } else {
    if (route === YakitRoute.DataCompare) useHttpFlowStore.getState().resetCompareData()
    onMenuSelect({ route })
  }
}
