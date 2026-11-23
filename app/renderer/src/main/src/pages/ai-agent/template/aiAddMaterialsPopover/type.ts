import type { ReactElement, ReactNode, RefObject } from 'react'
import type { AIChatMentionProps } from '../../components/aiChatMention/type'
import type { AIMentionCommandParams } from '../../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'
import type { AIMentionTabsEnum } from '../../defaultConstant'
import type { AIEnabledCapability, AIOutputI18n } from '@/pages/ai-re-act/hooks/grpcApi'
import type { AIForge } from '../../type/forge'
import type { AIResourceIds } from '../type'

export type MaterialCategory = Extract<AIMentionCommandParams['mentionType'], 'forge' | 'tool' | 'knowledgeBase'>

export type MaterialPanel = MaterialCategory | 'attachments' | 'browser'

export interface MaterialOption {
  id: string
  name: string
  description?: string
  originalName?: string
  verboseNameI18n?: AIOutputI18n
  knowledgeIndex?: number
  forgeType?: AIForge['ForgeType']
}

export interface MaterialPanelHeader {
  title: ReactNode
  description: string
  icon: ReactNode
  onBack?: () => void
}

export interface MaterialMenuItem {
  onClearCategory?: () => void
  label: string
  description: string
  icon: ReactNode
  category?: MaterialCategory
  summaryPanel?: MaterialPanel
  tab?: AIMentionTabsEnum
  action?: () => void
  summaryAction?: () => void
  external?: boolean
  count?: number
}

export interface AddMaterialsControls {
  inputLayoutRef: RefObject<HTMLDivElement>
  open: boolean
  menuOpen: boolean
  toggle: () => void
  summary?: ReactElement
}

export type MaterialShortcut = '@' | '/'

export interface AIAddMaterialsPopoverProps {
  strategyTagCount: number
  children: (controls: AddMaterialsControls) => ReactElement
  showScenarioCapabilities?: boolean
  initialEnabledCapabilities?: AIEnabledCapability[]
  onEnabledCapabilitiesChange?: (items: AIEnabledCapability[]) => void
  onShortcut: (shortcut: MaterialShortcut) => void
  onAdd: (material: AIMentionCommandParams) => void
  onRemoveMaterials: (materials: AIMentionCommandParams[]) => void
  onClearSelectedResources?: (type?: keyof AIResourceIds) => void
  mentions: AIMentionCommandParams[]
  resourceIds: AIResourceIds
  selectedResourceIds: AIResourceIds
  filterMode?: AIChatMentionProps['filterMode']
}
