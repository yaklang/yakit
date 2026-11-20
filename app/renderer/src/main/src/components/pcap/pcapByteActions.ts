import { yakitClipboard, yakitDialog, yakitTraffic } from '@/services/electronBridge'
import { handleSaveFileSystemDialog } from '@/utils/fileSystemDialog'
import { failed, success } from '@/utils/notification'
import { decodeBytes, type FieldSelection } from './pcapUtils'

const maxReadLength = 8 << 20

export type PCAPCopyFormat = 'hex' | 'utf8' | 'base64'
export type PCAPSaveFormat = PCAPCopyFormat | 'raw'

const normalizeRanges = (ranges: FieldSelection['ranges']) => {
  const sorted = ranges
    .filter(([start, end]) => start < end)
    .map(([start, end]) => [start, end] as [number, number])
    .sort((left, right) => left[0] - right[0])
  return sorted.reduce<FieldSelection['ranges']>((merged, range) => {
    const previous = merged[merged.length - 1]
    if (previous && range[0] <= previous[1]) {
      previous[1] = Math.max(previous[1], range[1])
    } else {
      merged.push(range)
    }
    return merged
  }, [])
}

const concatBytes = (chunks: Uint8Array[]) => {
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0)
  const result = new Uint8Array(length)
  let offset = 0
  chunks.forEach((chunk) => {
    result.set(chunk, offset)
    offset += chunk.length
  })
  return result
}

export const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(' ')

export const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  }
  return btoa(binary)
}

export const readSelectionBytes = async (datasetID: string, selection: FieldSelection) => {
  const ranges = normalizeRanges(selection.ranges)
  if (!ranges.length) throw new Error('该节点没有对应的字节范围')
  const chunks: Uint8Array[] = []
  for (const [start, end] of ranges) {
    let offset = Math.max(0, start)
    while (offset < end) {
      const length = Math.min(maxReadLength, end - offset)
      const response = await yakitTraffic.readBytes({
        DatasetID: datasetID,
        SourceID: selection.sourceID,
        Offset: String(offset),
        Length: String(length),
      })
      if (Number(response.Offset) !== offset) throw new Error('读取字节范围时偏移不一致')
      const chunk = decodeBytes(response.Data)
      if (!chunk.length) throw new Error('节点字节范围为空')
      chunks.push(chunk)
      offset += chunk.length
    }
  }
  return concatBytes(chunks)
}

const textForFormat = (bytes: Uint8Array, format: PCAPCopyFormat) =>
  format === 'hex' ? bytesToHex(bytes) : format === 'base64' ? bytesToBase64(bytes) : new TextDecoder().decode(bytes)

export const copySelection = async (datasetID: string, selection: FieldSelection, format: PCAPCopyFormat) => {
  try {
    const bytes = await readSelectionBytes(datasetID, selection)
    await yakitClipboard.setText(textForFormat(bytes, format))
    success(`已复制 ${selection.label || '字段'}（${bytes.length} 字节）`)
    return bytes.length
  } catch (e) {
    failed(`复制失败：${e instanceof Error ? e.message : String(e)}`)
    return 0
  }
}

export const saveSelection = async (datasetID: string, selection: FieldSelection, format: PCAPSaveFormat) => {
  try {
    const bytes = await readSelectionBytes(datasetID, selection)
    const extension = format === 'raw' ? 'bin' : 'txt'
    const safeLabel = (selection.label || 'data')
      .replace(/[\\/:*?"<>|\s]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
    const result = await handleSaveFileSystemDialog({
      title: `保存 ${selection.label || '字段'}`,
      defaultPath: `${selection.sourceID.replace(':', '-')}-${safeLabel || 'data'}.${extension}`,
      filters: [{ name: format === 'raw' ? 'Binary' : 'Text', extensions: [extension] }],
      properties: ['createDirectory', 'showOverwriteConfirmation'],
    })
    if (result.canceled || !result.filePath) return
    const data = format === 'raw' ? bytes : textForFormat(bytes, format)
    await yakitDialog.writeFile({ route: result.filePath, data })
    success(`已保存 ${bytes.length} 字节：${result.filePath}`)
    return result.filePath
  } catch (e) {
    failed(`保存失败：${e instanceof Error ? e.message : String(e)}`)
  }
}
