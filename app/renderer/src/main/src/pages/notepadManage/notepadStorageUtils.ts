import type { APIFunc } from '@/apiUtils/type'
import { NetWorkApi } from '@/services/fetch'
import type { API } from '@/services/swagger/resposeType'
import { getRemoteHttpSettingGV } from '@/utils/envfile'
import { getRemoteValue } from '@/utils/kv'
import { failed } from '@/utils/notification'
import { JSONParseLog } from '@/utils/tool'

/** 根据 storage 类型解析下载链接（oss/s3 直链或拼接 BaseUrl） */
export const apiDownloadStorageType: APIFunc<string, string> = (filePath) => {
  return new Promise((resolve, reject) => {
    NetWorkApi<API.NotepadDownloadRequest, string>({
      method: 'get',
      url: 'storage',
    })
      .then((type) => {
        if (['oss', 's3'].includes(type)) {
          resolve(filePath)
        } else {
          const match = filePath.match(/yakit-projects(\/[^]+)$/)
          if (match) {
            getRemoteValue(getRemoteHttpSettingGV())
              .then((setting) => {
                if (!setting) {
                  reject()
                  return
                }
                const value = JSONParseLog(setting)
                const url = value.BaseUrl
                resolve(`${url}/install_package${match[1]}`)
              })
              .catch(() => {
                reject()
              })
          } else {
            failed('当前链接存在问题，无法正常解析')
            reject()
          }
        }
      })
      .catch((err) => {
        console.error('apiDownloadStorageType error:', err)
        resolve(filePath)
      })
  })
}
