export interface YakitDiffEditorProps {
    /** 左侧代码 */
    leftDefaultCode: string
    setLeftCode?: (value: string) => any
    /** 右侧代码 */
    rightDefaultCode: string
    setRightCode?: (value: string) => any
    /** 是否触发强制刷新默认值 */
    triggerUpdate?: boolean

    /** 语言 */
    language?: string
    /** 展示代码时超出边界是否不换行 */
    noWrap?: boolean
    /** 左侧是否只读 */
    leftReadOnly?: boolean
    /** 右侧是否只读 */
    rightReadOnly?: boolean
    /** 字体大小 */
    fontSize?: number
}
