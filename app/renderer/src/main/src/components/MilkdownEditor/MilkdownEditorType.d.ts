import {Editor} from "@milkdown/kit/core"
import {MilkdownPlugin} from "@milkdown/kit/ctx"

export interface EditorMilkdownProps extends Editor {}
export interface CustomMilkdownProps {
    editor?: MilkdownEditor
    setEditor?: MilkdownEditor
    customPlugin?: MilkdownPlugin | MilkdownPlugin[]
}
export interface MilkdownEditorProps extends CustomMilkdownProps {}
