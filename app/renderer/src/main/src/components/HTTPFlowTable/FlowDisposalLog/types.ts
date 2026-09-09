/** xxx--- 等待后端联调 */

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

export interface FlowDisposalLogItem {
  id: number
  logType: DisposalLogType
  userName?: string
  headImg?: string
  description?: string
  createdAt: number
  isMine?: boolean
  parentComment?: DisposalLogParentComment
  /** 系统日志：标记字段（对齐 IssueType/Status/StatusReason） */
  issueType?: string
  severity?: string
  status?: string
  statusReason?: string
}

export interface FlowDisposalLogsResponse {
  data: FlowDisposalLogItem[]
  total?: number
}

export interface PublishFlowDisposalCommentRequest {
  flow_id?: number
  hash?: string
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
  /** httpflow hash */
  hash: string
}
