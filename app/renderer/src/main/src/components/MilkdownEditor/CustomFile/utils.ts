import { APIFunc } from '@/apiUtils/type'
import { yakitNotify } from '@/utils/notification'
import i18n from '@/i18n/i18n'

const tOriginal = i18n.getFixedT(null, 'components')

const { ipcRenderer } = window.require('electron')

export interface HttpFileInfoRespose {
  fileName: string
  size: number
  type: string
}
/**通过链接获取文件基本信息 */
export const getHttpFileLinkInfo: APIFunc<string, HttpFileInfoRespose> = (onlineUrl, hiddenError) => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('get-http-file-link-info', encodeURI(onlineUrl))
      .then(resolve)
      .catch((error) => {
        if (!hiddenError)
          yakitNotify('error', tOriginal('MilkdownEditor.customFile.getLinkInfoError', { error: String(error) }))
        reject(error)
      })
  })
}

export interface LocalFileInfoRespose {
  size: number
}
/**通过本地路径获取文件基本信息 */
export const getLocalFileLinkInfo: APIFunc<string, LocalFileInfoRespose> = (path, hiddenError) => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('fetch-file-info-by-path', path)
      .then((res) => {
        resolve({
          size: res.size,
        })
      })
      .catch((error) => {
        if (!hiddenError)
          yakitNotify('error', tOriginal('MilkdownEditor.customFile.getFileInfoError', { error: String(error) }))
        reject(error)
      })
  })
}

export interface GetLocalFileTypeRespose {
  name: string
  suffix: string
}
/**通过本地路径获取文件后缀/类型 */
export const getLocalFileName: APIFunc<string, GetLocalFileTypeRespose> = (path, hiddenError) => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('fetch-file-name-by-path', path)
      .then(resolve)
      .catch((error) => {
        if (!hiddenError)
          yakitNotify('error', tOriginal('MilkdownEditor.customFile.getLocalFileNameFailed', { error: String(error) }))
        reject(error)
      })
  })
}
