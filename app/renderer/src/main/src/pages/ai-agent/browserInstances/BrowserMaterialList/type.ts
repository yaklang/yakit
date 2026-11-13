import type { AIBrowserInstance } from '../browserInstanceStore'
import type { BrowserInstanceCardProps } from '../BrowserInstancesPanel'

export interface BrowserMaterialListProps {
  items: {
    instance: AIBrowserInstance
    removal?: Omit<NonNullable<BrowserInstanceCardProps['removal']>, 'onRemove'>
    option?: {
      id: string
      active: boolean
      onSelect: () => void
    }
  }[]
  onRemove?: (instanceId: string) => void
}
