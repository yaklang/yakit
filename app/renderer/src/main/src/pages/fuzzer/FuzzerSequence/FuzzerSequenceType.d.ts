import { WebFuzzerPageInfoProps } from "../../../store/pageNodeInfo";

export interface FuzzerSequenceProps {
    pageId: string
}

export interface SequenceProps extends ExtraSettingProps {
    id: string
    pageId: string
    pageGroupId: string
    pageName: string
    pageParams: WebFuzzerPageInfoProps
}

export interface ExtraSettingProps {
    inheritCookies: boolean
    inheritVariables: boolean
}

export interface SequenceItemProps {
    item: SequenceProps
    index: number
    errorIndex: number
    disabled: boolean
    isDragging: boolean
    pageNodeList: SequenceProps[]
    onUpdateItem: (s: SequenceProps) => void
    onApplyOtherNodes: (e: ExtraSettingProps) => void
    onRemove: (s: SequenceProps) => void
}