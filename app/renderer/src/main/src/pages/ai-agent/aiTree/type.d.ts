import {AIChatMessage} from "../type/aiChat"

export interface AITreeProps {
    tasks: AIChatMessage.PlanTask[]
}

export interface AITreeNodeProps {
    order: number
    index: string
    preIndex: string
    data: AIChatMessage.PlanTask
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
