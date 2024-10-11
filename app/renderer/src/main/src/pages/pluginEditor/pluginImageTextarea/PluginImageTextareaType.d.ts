import {ForwardedRef} from "react"

export interface PluginImageTextareaProps {
    ref?: ForwardedRef<PluginImageTextareaRefProps>
    /** 使用场景: 评论|补充资料 */
    type?: "comment" | "supplement"
    onSubmit: (data: {value: string; imgs: TextareaForImage[]}) => any
}

export interface PluginImageTextareaRefProps {
    /** 设置引用内容 */
    setQuotationInfo?: (info: {name: string; content: string}) => void
    /** 获取编辑框所有内容 */
    getData: () => {
        value: string
        imgs: TextareaForImage[]
    }
}

/** 粘贴|上传内容-图片 */
export interface TextareaForImage {
    url: string
    width: number
    height: number
}
