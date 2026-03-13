import {ReactNode} from "react"

export type WebFuzzerType = "config" | "sequence" | "rule" | "concurrency" | "hot-patch"

export interface WebFuzzerPageProps {
    selectType?: WebFuzzerType
    setSelectType?: (t: WebFuzzerType) => void
    defaultType: WebFuzzerType
    children?: ReactNode
    id?: string
    groupId?: string
}

export interface FuzzerSequenceWrapperProps {
    children?: ReactNode
    type: WebFuzzerType
}
