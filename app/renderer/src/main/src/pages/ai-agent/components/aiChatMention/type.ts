import type { AITool } from '../../type/aiTool'
import type { AIForge } from '../../type/forge'
import { type AIMentionTabsEnum, type iconMap } from '../../defaultConstant'
import type { AIMentionCommandParams } from '../aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'
import type { KnowledgeBaseItem } from '@/pages/KnowledgeBase/hooks/useKnowledgeBase'
import type { AIBrowserInstance } from '../../browserInstances/browserInstanceStore'

export type AIMentionTypeItem = AIMentionCommandParams['mentionType']
export type iconMapType = keyof typeof iconMap
export interface AIChatMentionSelectItem {
  id: string
  name: string
}
export interface AIChatMentionProps {
  defaultActiveTab?: AIMentionTabsEnum
  onSelect: (type: AIMentionTypeItem, value?: AIChatMentionSelectItem) => void
  filterMode?: `${AIMentionTabsEnum}`[]
  /** 焦点保留在编辑器：不自动抢焦，筛选词由外部同步 */
  keepEditorFocus?: boolean
  /** 来自编辑器 @ 后的筛选词（与 keepEditorFocus 配合） */
  filterKeyword?: string
  /** 快捷键监听目标，例如 milkdown view.dom */
  keyboardTarget?: () => HTMLElement | null
  /** 弹层是否可见；关闭后必须为 false，避免拦截编辑器 Enter */
  visible?: boolean
}
interface AIChatMention {
  keyWord: string
  getContainer: () => HTMLElement | null
  onTotalChange?: (total: number) => void
  /** 透传弹层可见性，控制键盘是否拦截 */
  keyboardEnabled?: boolean
}
export interface AIChatMentionListRefProps {
  onRefresh: () => void
}
interface AIChatMentionRef {
  ref?: React.Ref<AIChatMentionListRefProps> | null
}
export interface ForgeNameListOfMentionProps extends AIChatMention, AIChatMentionRef {
  onSelect: (f: AIForge) => void
}

export interface ToolListOfMentionProps extends AIChatMention, AIChatMentionRef {
  onSelect: (f: AITool) => void
}

export interface KnowledgeBaseListOfMentionProps extends AIChatMention, AIChatMentionRef {
  onSelect: (f: KnowledgeBaseItem) => void
}

export interface AIMentionSelectItemProps {
  isActive: boolean
  item: AIChatMentionSelectItem
  onSelect: () => void
}
export interface FileSystemTreeOfMentionProps {
  onSelect: (path: string, isFolder: boolean) => void
}

export interface FocusModeOfMentionProps extends AIChatMention, AIChatMentionRef {
  onSelect: (v) => void
}

export interface BrowserListOfMentionProps extends AIChatMention, AIChatMentionRef {
  onSelect: (instance: AIBrowserInstance) => void
}

export interface AllListOfMentionProps extends AIChatMention, AIChatMentionRef {
  sections: { value: AIMentionTabsEnum; label: string }[]
  onSelectForge: (f: AIForge) => void
  onSelectTool: (f: AITool) => void
  onSelectKnowledgeBase: (f: KnowledgeBaseItem) => void
  onSelectFocusMode: (v: any) => void
  onSelectBrowser: (instance: AIBrowserInstance) => void
  onSectionTotalChange: (key: AIMentionTabsEnum, total: number) => void
}
