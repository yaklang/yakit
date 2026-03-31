import React from "react"
import {AIToolDecisionProps} from "./type"
import {AISingHaveColorText} from "../aiReviewResult/AIReviewResult"
import {SolidCursorclickIcon} from "@/assets/icon/solid"
import useAINodeLabel from "@/pages/ai-re-act/hooks/useAINodeLabel"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

export const AIToolDecision: React.FC<AIToolDecisionProps> = React.memo((props) => {
    const {item} = props
    const {t} = useI18nNamespaces(["aiAgent"])
    const {nodeLabel} = useAINodeLabel(item.data.i18n)
    return (
        <>
            <AISingHaveColorText
                titleIcon={<SolidCursorclickIcon />}
                title={t("AIAgent.decision")}
                subTitle={nodeLabel}
                tip={item.data?.summary}
                modalInfo={{
                    title: item.AIModelName,
                    time: item.Timestamp,
                    icon: item.AIService
                }}
            />
        </>
    )
})
