import type { ContextMenuScene, RunContextMenuActionOptions } from '@/pages/contextMenuPlugin/types'

export type ContextMenuEventProps = {
  runContextMenuAction: RunContextMenuActionOptions
  refreshContextMenuActions?: string
  switchContextMenuManagerScene?: ContextMenuScene
}
