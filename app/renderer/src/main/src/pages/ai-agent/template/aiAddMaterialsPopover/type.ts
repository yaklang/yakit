import type { ReactElement, ReactNode } from 'react'
import type { AIChatMentionProps } from '../../components/aiChatMention/type'
import type { AIMentionCommandParams } from '../../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'
import type { AIMentionTabsEnum } from '../../defaultConstant'

export type MaterialCategory = Extract<
  AIMentionCommandParams['mentionType'],
  'forge' | 'tool' | 'knowledgeBase' | 'focusMode'
>

export type MaterialPanel = MaterialCategory | 'attachments' | 'browser'

export interface SelectedFocusMode {
  id: string
  label: string
}

export interface MaterialOption {
  id: string
  name: string
  description?: string
  forgeName?: string
}

export interface MaterialPanelHeader {
  title: ReactNode
  description: string
  icon: ReactNode
  onBack?: () => void
}

export interface MaterialMenuItem {
  label: string
  description: string
  icon: ReactNode
  category?: MaterialCategory
  summaryPanel?: MaterialPanel
  tab?: AIMentionTabsEnum
  action?: () => void
  external?: boolean
  count?: number
  current?: string
}

export interface AIAddMaterialsPopoverProps {
  children: (open: boolean, toggle: () => void, summary: ReactElement | null, menuOpen: boolean) => ReactElement
  onAdd: (material: AIMentionCommandParams) => void
  onRemove: (material: AIMentionCommandParams) => void
  mentions: AIMentionCommandParams[]
  flowCount: number
  focusMode?: string
  onFocusModeChange: (focusMode?: string) => void
  filterMode?: AIChatMentionProps['filterMode']
}
