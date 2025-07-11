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
    nodeLevel: number
    empty: {isSibling: boolean; levelDiff: number; isStartEnd?: string}
}

export interface AITreeEmptyNodeProps {
    isNode?: boolean
    type?: AIChatMessage.PlanTask["state"] | ""
    level: number
    levelDiff: number
    isStartEnd?: string
}
