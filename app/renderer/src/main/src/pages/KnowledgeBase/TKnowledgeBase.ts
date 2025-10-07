import type {KnowledgeBase} from "@/components/playground/knowlegeBase"
import type {TRepositoryManageProps} from "./KnowledgeBaseManage"
interface KnowledgeBaseFile {
    path: string
    fileType: string
}

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

interface CreateKnowledgeBaseData {
    KnowledgeBaseFile: KnowledgeBaseFile[]
    KnowledgeBaseName: string
    KnowledgeBaseType: string
    KnowledgeBaseDescription: string
    KnowledgeBaseLength: number
    streamToken: string
}

interface KnowledgeBaseContentProps {
    KnowledgeBases?: (CreateKnowledgeBaseData & {ID: string})[]
}

export type {
    TKnowledgeBaseProps,
    TDeleteConfirmProps,
    KnowledgeBaseFile,
    CreateKnowledgeBaseData,
    KnowledgeBaseContentProps
}
