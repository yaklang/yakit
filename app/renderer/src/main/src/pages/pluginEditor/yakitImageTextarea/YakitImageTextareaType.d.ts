import {ForwardedRef} from "react"

export interface YakitImageTextareaProps {
    ref?: ForwardedRef<YakitImageTextareaRefProps>
}

export interface YakitImageTextareaRefProps {
    /** 设置引用内容 */
    setQuotationInfo?: (info: {name: string; content: string}) => void
}

/** 编辑框内容 */
export interface YakitImageTextareaInfoProps {
    type: "text" | "image"
    content: string
    order: string
}

/** 新建元素类型 */
export type CreateNewElementType = "div" | "text" | "image"
/** 粘贴|上传内容-图片 */
export interface TextareaForImage {
    base64: string
    width: number
    height: number
}

/** ---------- 元素操作方法相关定义 Start ---------- */
export type SetImageElementFunc = (dom: HTMLDivElement | null, wrapper: HTMLDivElement | null) => void
/** ---------- 元素操作方法相关定义 End ---------- */
