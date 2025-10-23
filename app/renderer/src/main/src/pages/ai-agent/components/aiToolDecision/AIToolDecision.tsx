import React from "react"
import {AIToolDecisionProps} from "./type"
import {AISingHaveColorText} from "../aiReviewResult/AIReviewResult"
import {SolidCursorclickIcon} from "@/assets/icon/solid"
import useAINodeLabel from "@/pages/ai-re-act/hooks/useAINodeLabel"

export const AIToolDecision: React.FC<AIToolDecisionProps> = React.memo((props) => {
    const {item} = props
    const {nodeLabel} = useAINodeLabel(item.data.i18n)
    return (
        <>
            <AISingHaveColorText
                titleIcon={<SolidCursorclickIcon />}
                title={nodeLabel}
                subTitle='继续当前任务'
                tip='已获取操作系统类型为 darwin，接下来将执行系统版本已获取操作系统类型为 darwin，接下来将执行系统版本已获取操作系统类型为 darwin，接下来将执行系统版本'
                timestamp={item.Timestamp}
            />
        </>
    )
})
