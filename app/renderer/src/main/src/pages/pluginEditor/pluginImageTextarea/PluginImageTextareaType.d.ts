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

export interface PluginImageTextareaProps {
    ref?: ForwardedRef<PluginImageTextareaRefProps>
    /** 使用场景: 评论|补充资料 */
    type?: "comment" | "supplement"
    onSubmit?: (data: ImageTextareaData) => any
}

export interface PluginImageTextareaRefProps {
    /** 设置引用内容 */
    setQuotationInfo?: (info: {name: string; content: string}) => void
    /** 获取编辑框所有内容 */
    getData: () => ImageTextareaData | null
}
