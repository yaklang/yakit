import {EditorMilkdownProps} from "@/components/MilkdownEditor/MilkdownEditorType"
import {AIMentionCommandParams} from "./aiMilkdownMention/aiMentionPlugin"

export interface AIMilkdownInputProps extends AIMilkdownInputBaseProps {}

export interface AIMilkdownInputRef {
    setMention: (v: AIMentionCommandParams) => void
}
export interface AIMilkdownInputBaseProps {
    ref?: React.ForwardedRef<AIMilkdownInputRef>
    /**true 只读 */
    readonly?: boolean
    /**值变化 */
    onUpdateContent?: (nextMarkdown: string) => void
    /**默认值 */
    defaultValue?: string
    classNameWrapper?: string
    onUpdateEditor?: (s: EditorMilkdownProps) => void
}
