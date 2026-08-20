import { YakitRoute } from '@/enums/yakitRoute'
import emiter from '@/utils/eventBus/eventBus'
import type { ContextMenuScene } from './types'

export const openContextMenuManager = (scene: ContextMenuScene) => {
  emiter.emit('switchContextMenuManagerScene', scene)
  emiter.emit(
    'openPage',
    JSON.stringify({
      route: YakitRoute.ContextMenuManager,
      params: { contextMenuScene: scene },
    }),
  )
}
