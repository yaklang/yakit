import i18n from '@/i18n/i18n'

const tOriginal = i18n.getFixedT(null, 'components')

/** 上传文件后,后端拼接 hash 和文件名的字符:&*&;方便截取文件名 */
export const getTypeAndNameByPath = (path: string) => {
  let newPath = decodeURIComponent(path.split('/').pop() || '')
  const firstIndex = newPath.indexOf('&*&')
  if (firstIndex !== -1) {
    newPath = newPath.substring(firstIndex + 3, path.length)
  }
  const index = newPath.lastIndexOf('.')
  const fileType = newPath.substring(index, newPath.length)
  const fileName = newPath.split('\\').pop() || tOriginal('MilkdownEditor.customFile.unknownName')
  return { fileType, fileName }
}
