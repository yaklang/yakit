// 添加高亮范围的类型
interface HighlightRange {
    from: { line: number; ch: number }
    to: { line: number; ch: number }
    className?: string
  }

export interface YakCodemirrorProps {
    value: string
    onChange?: (v:string) => void
    language?: string
    readOnly?: boolean
    // 如若指定文件名 则根据文件名解析语言模式
    fileName?: string
    theme?: string
    // 指定起始行号
    firstLineNumber?: number
    /** @name 配置项-高亮显示配置 */
    highLight?: HighlightRange
}
