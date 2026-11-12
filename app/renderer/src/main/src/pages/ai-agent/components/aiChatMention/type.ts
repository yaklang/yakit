import type { AIMentionTabsEnum, iconMap } from '../../defaultConstant'
import type { AIBrowserInstance } from '../../browserInstances/browserInstanceStore'
import type { AIMentionCommandParams } from '../aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'
import type { MentionResourceRowProps } from './mentionResourceRow/type'

export type AIMentionTypeItem = AIMentionCommandParams['mentionType']
export type iconMapType = keyof typeof iconMap

export interface AIChatMentionSelectItem {
  id: string
  name: string
  originalName?: string
  mentionSource?: AIMentionCommandParams['mentionSource']
}

export interface AIChatMentionProps {
  defaultActiveTab?: AIMentionTabsEnum
  onSelect: (type: AIMentionTypeItem, value?: AIChatMentionSelectItem) => void
  onClose?: () => void
  filterMode?: `${AIMentionTabsEnum}`[]
  filterKeyword?: string
  keyboardTarget?: () => HTMLElement | null
  visible?: boolean
  materials?: AIMentionCommandParams[]
  focusMode?: string
}

export interface ResourceMentionRow extends AIChatMentionSelectItem {
  type: Exclude<AIMentionTypeItem, 'browser'>
  row: Omit<MentionResourceRowProps, 'id' | 'name' | 'active' | 'onSelect'> & { name?: string }
}

export interface BrowserMentionRow extends AIChatMentionSelectItem {
  type: 'browser'
  instance: AIBrowserInstance
  row: { kind: 'browser'; name: string; description?: string }
}

export type MentionRow = ResourceMentionRow | BrowserMentionRow

export type MentionListControls = {
  getContainer: () => HTMLElement | null
  keyboardEnabled?: boolean
  onSelect: AIChatMentionProps['onSelect']
}
