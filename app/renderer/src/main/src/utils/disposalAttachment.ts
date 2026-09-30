import { yakitUpload } from '@/services/electronBridge'

export const MAX_ATTACHMENT_SIZE = 100 * 1024 * 1024
export const DISPOSAL_ATTACHMENT_EXTENSIONS = [
  'jpg',
  'png',
  'gif',
  'jpeg',
  'txt',
  'xls',
  'xlsx',
  'csv',
  'pdf',
  'word',
  'docx',
]
export const DISPOSAL_ATTACHMENT_TYPE_HINT = `仅支持 ${DISPOSAL_ATTACHMENT_EXTENSIONS.map(
  (extension) => `.${extension}`,
).join('、')} 格式的附件`

export const validateDisposalAttachmentName = (name: string) => {
  const extension = /\.([^./\\]+)$/.exec(name)?.[1].toLowerCase()
  if (!extension || !DISPOSAL_ATTACHMENT_EXTENSIONS.includes(extension)) {
    throw new Error(DISPOSAL_ATTACHMENT_TYPE_HINT)
  }
}

export type DisposalAttachmentType = 'RiskComment' | 'HttpflowComment'

export interface UploadDisposalAttachmentRequest {
  path: string
  hash: string
  type: DisposalAttachmentType
}

export const uploadDisposalAttachment = async ({
  path,
  hash,
  type,
}: UploadDisposalAttachmentRequest): Promise<string> => {
  if (!path || !hash) {
    throw new Error('附件路径和业务标识必填')
  }
  validateDisposalAttachmentName(path)
  const { TaskStatus, resArr } = await yakitUpload.splitUpload({
    url: 'fragment/upload',
    path,
    filedHash: hash,
    type,
  })
  const response = resArr?.[resArr.length - 1]
  const data = response?.data
  const url = typeof data === 'string' ? data : data?.from || ''

  if (!TaskStatus || response?.code !== 200 || !url) {
    const reason = response?.message || (typeof data === 'object' && data ? data.reason : undefined) || '附件上传失败'
    throw new Error(String(reason))
  }

  return url
}
