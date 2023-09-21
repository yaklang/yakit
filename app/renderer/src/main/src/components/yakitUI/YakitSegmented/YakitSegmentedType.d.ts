import {SegmentedProps} from "antd"
import {SizeType} from "antd/lib/config-provider/SizeContext"

/**
 * @description: 分段器 Props
 * @property {string} wrapperClassName
 * @property {SizeType} size  尺寸
 */
interface YakitSegmentedProps extends SegmentedProps {
    wrapClassName?: string
    size?: SizeType
}
