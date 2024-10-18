import {ForwardedRef} from "react"

/** 上传图片基础信息 */
export interface TextareaForImage {
    url: string
    width: number
    height: number
}

export interface ImageTextareaData {
    value: string
    imgs: TextareaForImage[]
}

/** 引用内容结构 */
export interface QuotationInfoProps {
    userName: string
    content: string
    imgs: TextareaForImage[]
}

export interface PluginImageTextareaProps {
    ref?: ForwardedRef<PluginImageTextareaRefProps>
    /** 使用场景: 评论|补充资料 */
    type?: "comment" | "supplement"
    className?: string
    onSubmit?: (data: ImageTextareaData) => any

    /** 引用内容 */
    quotation?: QuotationInfoProps
    delQuotation?: () => void
}

export interface PluginImageTextareaRefProps {
    /** 获取编辑框所有内容 */
    getData: () => ImageTextareaData | null
}
