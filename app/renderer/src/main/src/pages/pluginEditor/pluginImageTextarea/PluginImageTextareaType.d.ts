import { type ForwardedRef } from 'react'

/** 上传图片基础信息 */
export interface TextareaForImage {
  url: string
  width: number
  height: number
}

export interface TextareaForFile {
  url: string
  name: string
  size: number
}

export interface ImageTextareaData {
  value: string
  imgs: TextareaForImage[]
  files?: TextareaForFile[]
}

/** 引用内容结构 */
export interface QuotationInfoProps {
  userName: string
  content: string
  imgs: TextareaForImage[]
  files?: TextareaForFile[]
}

export interface UploadDisposalImageRequest {
  base64: string
  imgInfo: { filename?: string; contentType?: string }
}

export interface PluginImageTextareaProps {
  ref?: ForwardedRef<PluginImageTextareaRefProps>
  /** 发布按钮的 loading */
  loading?: boolean
  /** 使用场景: 评论|补充资料 */
  type?: 'comment' | 'supplement'
  className?: string
  /** 图片上传数量(默认为6) */
  maxLength?: number
  onSubmit?: (data: ImageTextareaData) => any
  /** 自定义图片上传（如处置日志专用接口）；未传则走默认 httpUploadImgBase64 */
  onUploadImage?: (request: UploadDisposalImageRequest) => Promise<string>
  /** 处置评论附件：从本地文件路径上传 */
  onUploadFile?: (path: string) => Promise<string>

  /** 引用内容 */
  quotation?: QuotationInfoProps
  delQuotation?: () => void
}

export interface PluginImageTextareaRefProps {
  /** 获取编辑框所有内容 */
  getData: () => ImageTextareaData | null
  /** 清空所有内容 */
  onClear: () => void
}
