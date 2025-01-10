import {DataNode} from "antd/lib/tree"
import {ReactNode} from "react"

export interface ModifyNotepadProps {
    pageId: string
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
