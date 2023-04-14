import {SpinProps} from "antd"
import {SizeType} from "antd/lib/config-provider/SizeContext"

/**
 * @description YakitAutoCompleteProps 的属性
 * @augments YakitSpinProps 继承antd的 SpinProps 默认属性
 */
export interface YakitSpinProps extends SpinProps {
    ref?:any
}
