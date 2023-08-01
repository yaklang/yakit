export interface FuzzerSequenceProps {

}

export interface SequenceProps extends ExtraSettingProps {
    id: string
    pageId: string
    pageName: string
    pageParams: PageParams

}

export interface ExtraSettingProps {
    inheritCookies: boolean
    inheritVariables: boolean
}

interface PageParams {
    advancedConfigValue: AdvancedConfigValueProps
    request: string
}

export interface SequenceItemProps {
    item: SequenceProps
    index: number
    disabled: boolean
    isDragging: boolean
    pageNodeList: SequenceProps[]
    onUpdateItem: (s: SequenceProps) => void
    onApplyOtherNodes: (e: ExtraSettingProps) => void
    onRemove:(s:SequenceProps) => void
}