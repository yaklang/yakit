import type {KnowledgeBase} from "@/components/playground/knowlegeBase"
import type {TRepositoryManageProps} from "./KnowledgeBaseManage"

interface TKnowledgeBaseProps {
    refreshAsync: Pick<TRepositoryManageProps, "knowledgeBasesRunAsync">["knowledgeBasesRunAsync"]
    visible?: boolean
    itemsData?: KnowledgeBase
    title?: string
    handOpenKnowledgeBasesModal?: () => void
    setMenuOpenKey?: (value: number) => void
    menuOpenKey?: number
}

interface TDeleteConfirmProps extends Required<Pick<TKnowledgeBaseProps, "refreshAsync" | "visible">> {
    KnowledgeBaseId: number
    onVisible: (v: boolean) => void
}



export type {TKnowledgeBaseProps, TDeleteConfirmProps}
