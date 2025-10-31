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
                title='决策'
                subTitle={nodeLabel}
                tip={item.data?.summary}
                modalInfo={{
                    title: item.AIService,
                    time: item.Timestamp
                }}
            />
        </>
    )
})
