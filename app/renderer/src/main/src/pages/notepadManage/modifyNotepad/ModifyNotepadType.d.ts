import {DataNode} from "antd/lib/tree"
import {ReactNode} from "react"
import {ModifyNotepadPageInfoProps} from "@/store/pageInfo"
export interface ModifyNotepadProps {
    pageId: string
    modifyNotepadPageInfo?: ModifyNotepadPageInfoProps
}

export interface NoteLocal {
    Id: number
    Title: string
    Content: string
}

export interface ModifyNotepadContentRefProps {
    getCatalogue: (m: MilkdownCatalogueProps[]) => void
}
export interface ModifyNotepadContentProps {
    ref?: React.Ref<ModifyNotepadContentRefProps>
    tabName: string
    spinning?: boolean
    children?: ReactNode
    titleExtra: ReactNode
    notepadDetailOnline?: API.GetNotepadList
    notepadDetailLocal?: NoteLocal
    listDom: ReactNode
}

export interface MilkdownCatalogueProps {
    id: string
    /**标题级别 */
    level: string
    key: string
    /**标题文本 */
    title: ReactNode
    children?: MilkdownCatalogueProps[]
}

export interface CatalogueTreeNodeProps {
    info: MilkdownCatalogueProps
    onClick: (info: MilkdownCatalogueProps) => void
    onExpand: (info: MilkdownCatalogueProps) => void
    isExpanded?: boolean
}
