import {ReactNode} from "react"
import {EmptyProps} from "antd"
export interface YakitEmptyProps extends EmptyProps {
    title?: string | null | ReactNode
    descriptionReactNode?: ReactNode

    /** title内容的修饰类 */
    titleClassName?: string
}
