import { yakitFailed } from '@/utils/notification'

export function Uint8ArrayToString(fileData: Uint8Array, encoding?: 'utf8' | 'latin1' | any) {
  try {
    return Buffer.from(fileData).toString(encoding ? encoding : 'utf8')
  } catch (e) {
    yakitFailed(`Uint8ArrayToString (${fileData}) Failed: ${e}`)
    return `${fileData}`
  }
}

export function StringToUint8Array(str: string, encoding?: 'latin1' | 'ascii' | 'utf8'): Uint8Array {
  try {
    if (!encoding) {
      return Buffer.from(str, 'utf8') as unknown as Uint8Array
    }
    return Buffer.from(str, encoding) as unknown as Uint8Array
  } catch (e) {
    yakitFailed(`String ${str} Encode Failed: ${e}`)
    return Buffer.from(`${str}`, encoding) as unknown as Uint8Array
  }
}

export function removeRepeatedElement<T = string>(arr: T[]) {
  return arr.filter((element, index) => {
    return arr.indexOf(element) === index
  })
}

/** 从路径取文件名，兼容 Windows 和 Unix 的分隔符。 */
export const getPathBaseName = (path: string) => path.split(/[\\/]/).pop() || path

/**
 * @name 从文件名截取后缀（最后一个 `.` 之后，不含点）
 * @example getFileSuffixFromName('x.x.txt') => 'txt'
 */
export const getFileSuffixFromName = (fileName: string): string => {
  const dotIndex = fileName.lastIndexOf('.')
  if (dotIndex <= 0 || dotIndex >= fileName.length - 1) return ''
  return fileName.slice(dotIndex + 1)
}
