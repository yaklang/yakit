import {Editor} from "@milkdown/kit/core"
import {MilkdownPlugin} from "@milkdown/kit/ctx"

export interface EditorMilkdownProps extends Editor {}
export interface CustomMilkdownProps {
    /**编辑器值, 目前当默认值*/
    value?: string
    editor?: MilkdownEditor
    setEditor?: MilkdownEditor
    customPlugin?: MilkdownPlugin | MilkdownPlugin[]
}
export interface MilkdownEditorProps extends CustomMilkdownProps {}

export interface MilkdownBaseUtilProps {
    id: number
    icon: ReactNode
    label: string
    description: string
}
export interface BlockListProps extends MilkdownBaseUtilProps {}
export type TooltipListProps = MilkdownBaseUtilProps | {id: number; label: string}
