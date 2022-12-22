import {AutoCompleteProps} from "antd"
import {SizeType} from "antd/lib/config-provider/SizeContext"

/**
 * @description YakitAutoCompleteProps 的属性
 * @augments AutoCompleteProps 继承antd的 AutoCompleteProps 默认属性
 * @param {"small" | "middle" | "large" } size  默认middle
 */
export interface YakitAutoCompleteProps extends AutoCompleteProps {
    size?: "small" | "middle" | "large"
}
