import { EditorMilkdownProps } from '@/components/MilkdownEditor/MilkdownEditorType'
import { AIMentionCommandParams } from './aiMilkdownMention/aiMentionPlugin'
import { AIHttpFlowRemovePayload } from './aiMilkdownHttpFlow/aiHttpFlowPlugin'
import { AIChatMentionProps } from '../aiChatMention/type'

export interface AIMilkdownInputProps extends AIMilkdownInputBaseProps {}

export interface AIMilkdownInputRef {
  setMention: (v: AIMentionCommandParams) => void
  setImage: () => void
  setHttpFlow: (ids: string[]) => void
  getSessionId: () => string
}
export interface AIMilkdownInputBaseProps {
  ref?: React.ForwardedRef<AIMilkdownInputRef>
  /** true 只读 */
  readonly?: boolean
  /** 值变化 */
  onUpdateContent?: (nextMarkdown: string) => void
  /** 默认值 */
  defaultValue?: string
  classNameWrapper?: string
  onUpdateEditor?: (s: EditorMilkdownProps) => void
  /** 额外的提及处理 */
  onMemfitExtra?: (v: AIMentionCommandParams) => void
  /** history 流量标签移除时同步取消表格勾选 */
  onHttpFlowRemove?: (payload: AIHttpFlowRemovePayload) => void
  // 外部传入需要筛选掉的选项
  filterMode?: AIChatMentionProps['filterMode']
  /** IRify 等工作区 @ 提及时的工程根目录 */
  mentionFileSystemRoots?: AIChatMentionProps['mentionFileSystemRoots']
  /**文件缓存路径 */
  chatDataStoreKey: string
}
