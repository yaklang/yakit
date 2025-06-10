import {AIChatMessage} from "../type/aiChat"

export interface AITreeProps {
    tasks: AIChatMessage.PlanTask[]
    onNodeClick?: AITreeNodeProps["onClick"]
}

export interface AITreeNodeProps {
    order: number
    index: string
    preIndex: string
    data: AIChatMessage.PlanTask
    onClick?: (info: AIChatMessage.PlanTask) => void
}
export interface AITreeNodeInfo {
    empty: {lineNum?: number; isStartEnd?: string}
    node: {lineNum?: number; isSibling?: boolean}
}

export interface AITreeEmptyNodeProps {
    type?: AIChatMessage.PlanTask["state"] | ""
    lineNum?: number
    isStartEnd?: string
}
