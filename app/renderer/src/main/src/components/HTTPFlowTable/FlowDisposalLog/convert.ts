import type { DisposalCommentContent, DisposalImageInfo, ImageTextareaData } from './types'

export const disposalCommentConvertToJSON = (data: ImageTextareaData): string => {
  const isContent = !!data.value?.trim()
  const isImage = (data.imgs || []).length > 0
  if (!isContent && !isImage) return ''

  const info: { type: string; value: unknown }[] = []
  if (isContent) {
    info.push({ type: 'text', value: data.value })
  }
  for (const item of data.imgs || []) {
    info.push({ type: 'image', value: item })
  }
  return JSON.stringify(info)
}

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
    }
    if (!result.text && result.imgs.length === 0) return null
    return result
  } catch {
    return { text: json, imgs: [] }
  }
}
