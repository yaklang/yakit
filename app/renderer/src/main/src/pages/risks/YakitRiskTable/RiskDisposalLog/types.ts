export interface DisposalImageInfo {
  url: string
  width: number
  height: number
}

export interface DisposalCommentContent {
  text: string
  imgs: DisposalImageInfo[]
}

export type DisposalLogType = 'system' | 'comment'

export interface DisposalLogParentComment {
  id: number
  userName: string
  description: string
}

export interface DisposalLogItem {
  id: number
  /** system: 系统处置记录；comment: 人工评论 */
  logType: DisposalLogType
  userName?: string
  headImg?: string
  description?: string
  createdAt: number
  /** 是否本人评论（删除权限） */
  isMine?: boolean
  parentComment?: DisposalLogParentComment
  /** 系统处置扩展字段 */
  disposalStatus?: string
  repairTime?: number
  repairDepartment?: string
  repairer?: string
}

export interface DisposalLogsResponse {
  data: DisposalLogItem[]
  total?: number
}

export interface PublishDisposalCommentRequest {
  risk_hash: string
  description: string
  logId?: number
}

export interface ImageTextareaData {
  value: string
  imgs: DisposalImageInfo[]
}

export interface QuotationInfoProps {
  userName: string
  content: string
  imgs: DisposalImageInfo[]
  logId: number
}

export interface UploadDisposalImageRequest {
  base64: string
  imgInfo: { filename?: string; contentType?: string }
}
