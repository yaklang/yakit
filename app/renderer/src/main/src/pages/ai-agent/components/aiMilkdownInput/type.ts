import {EditorMilkdownProps} from "@/components/MilkdownEditor/MilkdownEditorType"
import {AIMentionCommandParams} from "./aiMilkdownMention/aiMentionPlugin"
import {AIChatMentionProps, iconMapType} from "../aiChatMention/type"

export interface AIMilkdownInputProps extends AIMilkdownInputBaseProps {}

export interface AIMilkdownInputRef {
    setMention: (v: AIMentionCommandParams) => void
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
    // 外部传入需要筛选掉的选项
    filterMode?: AIChatMentionProps["filterMode"]
}
