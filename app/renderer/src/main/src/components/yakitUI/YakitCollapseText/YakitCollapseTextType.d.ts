export interface YakitCollapseTextProps {
    /** 内容 */
    content: string
    /** 折叠时展示的行数，默认3行 */
    rows?: number
    /** 内容单行行高，默认 16px */
    lineHeight?: number
    /** 文字大小，默认 12px */
    fontSize?: number
    wrapperClassName?: string
}
