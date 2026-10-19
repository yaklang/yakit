import { FileDefault, FileSuffix } from '@/pages/yakRunner/FileTree/icon'

/** 按文件名后缀取文件树 icon key */
export const getFileIconByName = (name: string): string => {
  const suffix = name.includes('.') ? name.split('.').pop() || '' : ''
  return suffix ? FileSuffix[suffix] || FileDefault : FileDefault
}
