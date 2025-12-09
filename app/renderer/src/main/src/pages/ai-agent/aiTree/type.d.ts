import {AIAgentGrpcApi} from "@/pages/ai-re-act/hooks/grpcApi"
import type {AITaskInfoProps} from "@/pages/ai-re-act/hooks/aiRender"

export interface AITreeProps {
    tasks: AITaskInfoProps[]
    onNodeClick?: AITreeNodeProps["onClick"]
}

export interface AITreeNodeProps {
    order: number
    position: {
        // 是否是起始节点
        isStart: boolean
        // 是否是结束节点
        isEnd: boolean
        // 是否是当前层级起始节点
        isStartOfLevel: boolean
        // 是否是当前层级结束节点
        isEndOfLevel: boolean
        // 是否是父级结束节点
        isParentLast: boolean
        // 下一个层级差
        levelDiff: number
    }
    data: AITaskInfoProps
    onClick?: () => void
}
