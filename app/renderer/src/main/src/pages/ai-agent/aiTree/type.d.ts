import {AIAgentGrpcApi} from "@/pages/ai-re-act/hooks/grpcApi"

export interface AITreeProps {
    tasks: AIAgentGrpcApi.PlanTask[]
    onNodeClick?: AITreeNodeProps["onClick"]
}

export interface AITreeNodeProps {
    order: number
    index: string
    preIndex: string
    data: AIAgentGrpcApi.PlanTask
    onClick?: (info: AIAgentGrpcApi.PlanTask) => void
}
export interface AITreeNodeInfo {
    nodeLevel: number
    empty: {isSibling: boolean; levelDiff: number; isStartEnd?: string}
}

export interface AITreeEmptyNodeProps {
    isNode?: boolean
    type?: AIAgentGrpcApi.PlanTask["progress"] | ""
    level: number
    levelDiff: number
    isStartEnd?: string
}
