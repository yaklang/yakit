import { ipc } from '../../../../../../../shared/communication/window-client'
import { useEffect, useRef } from 'react'
import { useDebounce, useGetState, useMemoizedFn } from 'ahooks'
import { isCommunityEdition, isEnterpriseEdition, isEnpriTrace, isIRify, isMemfit } from '@/utils/envfile'
import { success, failed } from '@/utils/notification'
import type { DownloadingState } from '@/yakitGVDefine'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import emiter from '@/utils/eventBus/eventBus'
import { safeFormatDownloadProcessState } from '../utils'
import { grpcFetchIntranetYakitVersion, grpcFetchLatestYakitVersion } from '@/apiUtils/grpc'
import { apiDownloadStorageType } from '@/pages/notepadManage/notepadStorageUtils'
interface useDownloadYakitProps {
  intranetYakit?: boolean
  setVisible?: (v: boolean) => void
  onDownloadFinish?: (filePath: string, status: boolean) => void
}

/** @name Yakit软件更新下载 */
export const useDownloadYakit = (props: useDownloadYakitProps) => {
  const { intranetYakit = true, setVisible, onDownloadFinish } = props
  const { t } = useI18nNamespaces(['yakitUi', 'layout'])
  const controllerRef = useRef<AbortController>()
  const [downloadProgress, setDownloadProgress] = useGetState<DownloadingState>()
  useEffect(() => () => controllerRef.current?.abort(), [])
  const onDownloadStart = useMemoizedFn(async () => {
    if (!isCommunityEdition() && !isEnpriTrace()) return
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setDownloadProgress(undefined)
    let downloadedPath = ''
    const onProgress = (
      state: import('../../../../../../../shared/communication/local-methods').DownloadProgress | 100,
    ) => {
      if (!controller.signal.aborted && state !== 100) setDownloadProgress(safeFormatDownloadProcessState(state))
    }
    try {
      if (intranetYakit) {
        const filePath = await grpcFetchIntranetYakitVersion()
        controller.signal.throwIfAborted()
        downloadedPath = await apiDownloadStorageType(filePath)
        controller.signal.throwIfAborted()
        await ipc.invoke('local', 'download-latest-intranet-yakit', downloadedPath, {
          signal: controller.signal,
          onProgress,
        })
      } else {
        const version = (await grpcFetchLatestYakitVersion()).replace(/^v/, '')
        controller.signal.throwIfAborted()
        await ipc.invoke(
          'local',
          'download-latest-yakit',
          {
            version,
            edition: {
              isEnterprise: isEnterpriseEdition(),
              isIRify: isIRify(),
              isMemfit: isMemfit(),
            },
          },
          { signal: controller.signal, onProgress },
        )
      }
      controller.signal.throwIfAborted()
      setDownloadProgress((old) => (old ? { ...old, percent: 1, speed: 0, time: { ...old.time, remaining: 0 } } : old))
      if (intranetYakit && onDownloadFinish) {
        onDownloadFinish(downloadedPath, true)
        return
      }
      success(t('YakitNotification.downloaded'))
      await ipc.invoke('local', 'open-yakit-path', {})
      if (!controller.signal.aborted) emiter.emit(intranetYakit ? 'downloadedYakitIntranetFlag' : 'downloadedYakitFlag')
    } catch (error) {
      if (controller.signal.aborted) return
      if (intranetYakit) onDownloadFinish?.(downloadedPath, false)
      failed(t('YakitNotification.downloadFailed', { error: String(error) }))
    } finally {
      if (controllerRef.current === controller && !controller.signal.aborted) {
        controllerRef.current = undefined
        setVisible?.(false)
      }
    }
  })
  const onCancel = useMemoizedFn(() => {
    controllerRef.current?.abort()
    setVisible?.(false)
    setDownloadProgress(undefined)
  })
  const onBreak = useMemoizedFn((enabled: boolean) => {
    if (!enabled) controllerRef.current?.abort()
  })
  return [downloadProgress, { onDownloadStart, onCancel, onBreak }] as const
}
