import {Editor} from "@milkdown/kit/core"

export interface EditorMilkdownProps extends Editor{} 
export interface CustomMilkdownProps {
    editor?: MilkdownEditor
    setEditor?: MilkdownEditor
}
export interface MilkdownEditorProps extends CustomMilkdownProps {}
