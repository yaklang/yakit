import { safeFormatDownloadProcessState } from '@/components/layout/utils'
import { yakitNotify } from '@/utils/notification'
import type { DownloadingState } from '@/yakitGVDefine'
import { useEffect, useRef } from 'react'
import { ipc } from '@/services/ipc'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

interface DownloadUrlToLocalHooks {
  /**为同时多个下载准备 */
  taskToken?: string
  /**保存到本地的地址 */
  path: string
  onUploadData: (state: DownloadingState) => void
  onUploadEnd?: () => void
  onUploadSuccess?: () => void
  onUploadError?: () => void
}

export interface DownloadUrlToLocal {
  /**下载的链接 */
  onlineUrl: string
  /**保存到本地的地址 */
  localPath: string
  /**是否需要编码,默认编码 */
  isEncodeURI?: boolean
}

export default function useDownloadUrlToLocalHooks(props: DownloadUrlToLocalHooks) {
  const { path, taskToken, onUploadData, onUploadSuccess, onUploadEnd, onUploadError } = props
  const { t } = useI18nNamespaces(['hook', 'yakitUi'])

  const active = useRef<AbortController>()
  const pending = useRef<Promise<void>>()
  useEffect(() => () => active.current?.abort(), [path, taskToken])
  const onStart = (params: DownloadUrlToLocal) => {
    active.current?.abort()
    const controller = new AbortController()
    active.current = controller
    pending.current = ipc
      .invoke(
        'local',
        'download-url-to-path',
        {
          url: params.onlineUrl,
          path: params.localPath,
          isEncodeURI: params.isEncodeURI,
        },
        {
          signal: controller.signal,
          onProgress({ state }) {
            if (!controller.signal.aborted)
              onUploadData(
                safeFormatDownloadProcessState(
                  state === 100
                    ? { percent: 1, size: { total: 0, transferred: 0 }, speed: 0, time: { elapsed: 0, remaining: 0 } }
                    : state,
                ),
              )
          },
        },
      )
      .then(() => {
        if (!controller.signal.aborted) onUploadSuccess?.()
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        onUploadError?.()
        yakitNotify('error', t('YakitNotification.downloadFailed', { error: String(error) }))
      })
      .finally(() => {
        if (active.current !== controller) return
        active.current = undefined
        if (!controller.signal.aborted) onUploadEnd?.()
      })
  }
  const onCancel = async () => {
    active.current?.abort()
    await pending.current
  }
  return { onStart, onCancel } as const
}
