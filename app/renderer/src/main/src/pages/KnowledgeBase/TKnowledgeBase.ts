import type {GetKnowledgeBaseResponse, KnowledgeBase} from "@/components/playground/knowlegeBase"
import {HoldGRPCStreamInfo} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
interface KnowledgeBaseFile {
    path: string
    fileType: string
}

interface TRepositoryManageProps {
    knowledgeBasesData?: GetKnowledgeBaseResponse["KnowledgeBases"]
    knowledgeBasesRunAsync: () => Promise<KnowledgeBase[]>
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
    streamstep: 1 | 2 | "success"
}

interface TListThirdPartyBinaryResponse {
    Binaries: {
        Name: string
        SupportCurrentPlatform: boolean
        Description: string
        InstallPath: string
        DownloadURL: string
    }[]
}

interface KnowledgeBaseContentProps {
    KnowledgeBases?: (CreateKnowledgeBaseData & {ID: string})[]
}

type TExistsKnowledgeBaseAsync = {
    existsKnowledgeBaseAsync: (Keyword?: string) => Promise<any>
}

export type {
    TKnowledgeBaseProps,
    TDeleteConfirmProps,
    KnowledgeBaseFile,
    CreateKnowledgeBaseData,
    KnowledgeBaseContentProps,
    TExistsKnowledgeBaseAsync,
    TListThirdPartyBinaryResponse
}
