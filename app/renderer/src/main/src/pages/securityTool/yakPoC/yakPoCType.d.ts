export interface YakPoCProps {}

export interface PluginGroupGridProps {
    hidden: boolean
    /**选择的插件组列表 */
    selectGroupList?: string[]
    setSelectGroupList?: (s: string[]) => void
}

export interface YakPoCExecuteContentProps {
    hidden: boolean
    setHidden: (b: boolean) => void
    /**选择的插件组列表 */
    selectGroupList: string[]
    setSelectGroupList: (s: string[]) => void
}

export interface GroupCount {
    Value: string
    Total: number
    Default: boolean
}
export interface PluginGroupGridItemProps {
    item: GroupCount
    selected:boolean
    onSelect: (g: GroupCount) => void
}
