import {YakitSelectProps} from "../yakitUI/YakitSelect/YakitSelectType"
interface OptionProps {
    label: string
    value: string | number
}
/**
 * @description 组合搜索
 * @param {"input" | "select"} afterModuleType 右侧的组件类型 目前支持两种
 * @param {number} beforeOptionWidth 左侧下拉选择的宽度
 * @param {string | number} valueBeforeOption 左侧下拉选择的值
 * @param {OptionProps[]} valueBeforeOption 左侧下拉选择项
 * @param {(o: string) => void} onSelectBeforeOption 左侧下拉选择事件
 * @param {string} wrapperClassName 外侧class
 * @param {YakitSelectProps} selectProps 左侧下拉选择的props
 * @param {YakitInputSearchProps} inputSearchModuleTypeProps afterModuleType=input,时传入的inputProps
 * @param {YakitSelectProps} selectModuleTypeProps afterModuleType=select,时传入的inputProps
 */
export interface YakitCombinationSearchProps extends Omit<InputProps, "size"> {
    afterModuleType?: "input" | "select"
    beforeOptionWidth?: number
    valueBeforeOption?: string | number
    addonBeforeOption?: OptionProps[]
    onSelectBeforeOption?: (o: string) => void
    wrapperClassName?: string
    selectProps?: YakitSelectProps
    inputSearchModuleTypeProps?: YakitInputSearchProps
    selectModuleTypeProps?: SelectModuleTypeProps
}

interface SelectModuleTypeProps extends YakitSelectProps {
    data?: any[]
    optText?: string
    optValue?: string
    optKey?: string
    optDisabled?: string
    renderOpt?: (info: any) => ReactNode
}
