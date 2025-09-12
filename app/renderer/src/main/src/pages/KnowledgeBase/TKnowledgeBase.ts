import type { KnowledgeBase } from "@/components/playground/knowlegeBase"
import type { TRepositoryManageProps } from "./KnowledgeBaseManage"
import type { MutableRefObject } from "react"

interface TKnowledgeBaseProps {
    knowledgeBasesRunAsync: Pick<TRepositoryManageProps, "knowledgeBasesRunAsync">["knowledgeBasesRunAsync"]
    visible?: boolean
    itemsData?: KnowledgeBase
    title?: string
    handOpenKnowledgeBasesModal?: () => void
    setMenuOpenKey?: (value: boolean) => boolean 
}

export type {TKnowledgeBaseProps}
