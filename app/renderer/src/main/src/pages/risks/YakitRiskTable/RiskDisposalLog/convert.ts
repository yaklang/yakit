import type { DisposalCommentContent, DisposalImageInfo, ImageTextareaData } from './types'

/** 将评论内容转成 JSON 字符串 */
export const disposalCommentConvertToJSON = (data: ImageTextareaData): string => {
  const isContent = !!data.value?.trim()
  const isImage = (data.imgs || []).length > 0
  if (!isContent && !isImage && !data.files?.length) return ''

  const info: { type: string; value: unknown }[] = []
  if (isContent) {
    info.push({ type: 'text', value: data.value })
  }
  for (const item of data.imgs || []) {
    info.push({ type: 'image', value: item })
  }
  for (const item of data.files || []) {
    info.push({ type: 'file', value: item })
  }
  return JSON.stringify(info)
}

/** 解析评论 JSON */
export const disposalCommentJSONConvertToData = (json?: string): DisposalCommentContent | null => {
  if (!json) return null
  try {
    const data = JSON.parse(json)
    if (!Array.isArray(data)) {
      return { text: json, imgs: [] }
    }
    const result: DisposalCommentContent = { text: '', imgs: [] }
    for (const item of data) {
      if (item?.type === 'text') {
        result.text += item.value || ''
      }
      if (item?.type === 'image' && item.value) {
        result.imgs.push(item.value as DisposalImageInfo)
      }
      if (
        item?.type === 'file' &&
        typeof item.value?.url === 'string' &&
        typeof item.value?.name === 'string' &&
        typeof item.value?.size === 'number'
      ) {
        result.files ||= []
        result.files.push(item.value)
      }
    }
    if (!result.text && result.imgs.length === 0 && !result.files?.length) return null
    return result
  } catch {
    return { text: json, imgs: [] }
  }
}
