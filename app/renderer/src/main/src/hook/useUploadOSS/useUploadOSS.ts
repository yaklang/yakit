import { yakitNotify } from '@/utils/notification'
import { useEffect, useRef } from 'react'
import { ipc } from '@/services/ipc'
import { type UploadImgType, UploadFileType } from './constants'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

interface useUploadOSSHooks {
  taskToken?: string
  setUrl: (s: string) => void
  onUploadData: (progress: number) => void
  onUploadEnd?: () => void
  onUploadSuccess?: () => void
  onUploadError?: (error: string) => void
}

export type UploadImgTypeProps = `${UploadImgType}`
export type UploadFileTypeProps = `${UploadFileType}`

export interface UploadOSSStartProps {
  filePath: string
  /**type为notepad,该值必传 */
  filedHash: string
  type: UploadFileTypeProps
}

// 大文件上传,目前文件上传和图片上传分开的
export default function useUploadOSSHooks(props: useUploadOSSHooks) {
  const { taskToken, setUrl, onUploadData, onUploadSuccess, onUploadEnd, onUploadError } = props
  const { t } = useI18nNamespaces(['hook'])

  const active = useRef<AbortController>()
  const pending = useRef<Promise<void>>()
  useEffect(() => () => active.current?.abort(), [taskToken])
  const onStart = (value: UploadOSSStartProps) => {
    const { filePath, filedHash, type } = value
    let enable = true
    switch (type) {
      case UploadFileType.Notepad:
        if (!filedHash) {
          enable = false
          yakitNotify('error', 'useUploadOSSHooks: ' + t('useUploadOSSHooks.notepadFiledHashRequired'))
        }
        break
      default:
        break
    }
    if (enable) {
      active.current?.abort()
      const controller = new AbortController()
      active.current = controller
      pending.current = ipc
        .invoke(
          'local',
          'oss-split-upload',
          {
            url: 'fragment/upload',
            path: filePath,
            filedHash,
            type,
          },
          {
            signal: controller.signal,
            onProgress({ progress, res }) {
              if (controller.signal.aborted) return
              onUploadData(Math.trunc(progress))
              if (
                res.code === 200 &&
                res.data &&
                typeof res.data === 'object' &&
                'from' in res.data &&
                typeof res.data.from === 'string'
              )
                setUrl(res.data.from)
            },
          },
        )
        .then(() => {
          if (!controller.signal.aborted) onUploadSuccess?.()
        })
        .catch((error) => {
          if (controller.signal.aborted) return
          onUploadError?.(String(error))
          yakitNotify('error', t('useUploadOSSHooks.uploadFailed', { error: String(error) }))
        })
        .finally(() => {
          if (active.current !== controller) return
          active.current = undefined
          if (!controller.signal.aborted) onUploadEnd?.()
        })
    }
  }
  const onCancel = async () => {
    active.current?.abort()
    await pending.current
  }
  return { onStart, onCancel } as const
}
