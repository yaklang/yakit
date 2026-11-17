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
  knowledgeIndex?: AIMentionCommandParams['knowledgeIndex']
}

export interface AIChatMentionSelectEntry {
  type: AIMentionTypeItem
  value?: AIChatMentionSelectItem
}

export interface AIChatMentionProps {
  defaultActiveTab?: AIMentionTabsEnum
  onSelect: (type: AIMentionTypeItem, value?: AIChatMentionSelectItem) => void
  /** Ctrl/Shift 多选后按回车，一次性提交当前列表中的选中项。 */
  onSelectMany?: (items: AIChatMentionSelectEntry[]) => void
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
  /** 弹层抢走焦点后，仍在输入框上拦截方向键和回车。 */
  extraContainer?: () => HTMLElement | null
  keyboardEnabled?: boolean
  onSelect: AIChatMentionProps['onSelect']
  onSelectMany?: (items: MentionRow[]) => void
  /** 面板在 mousedown 阶段收下 Ctrl/Shift 点击，避免输入框抢走选区。 */
  onModifierPointer?: {
    current?: (rowId: string, modifiers: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean }) => void
  }
}
