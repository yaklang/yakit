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
import { yakitEngine, yakitShell } from '@/services/electronBridge'

interface useDownloadYakitProps {
  intranetYakit?: boolean
  setVisible?: (v: boolean) => void
  onDownloadFinish?: (filePath: string, status: boolean) => void
}

/** @name Yakit软件更新下载 */
export const useDownloadYakit = (props: useDownloadYakitProps) => {
  const { intranetYakit = true, setVisible, onDownloadFinish } = props
  const { t } = useI18nNamespaces(['yakitUi', 'layout'])
  // 是否中断下载进程
  const isBreakRef = useRef<boolean>(false)
  /** 下载进度条数据 */
  const [downloadProgress, setDownloadProgress, getDownloadProgress] = useGetState<DownloadingState>()

  /**
   * 1. 获取最新软件版本号，并下载
   * 2. 监听本地下载软件进度数据
   */

  const onDownloadStart = useMemoizedFn(async () => {
    if (isCommunityEdition() || isEnpriTrace()) {
      isBreakRef.current = true
      setDownloadProgress(undefined)
      if (intranetYakit) {
        try {
          // 处理内网版本
          const filePath = await grpcFetchIntranetYakitVersion()
          const newFilePath = await apiDownloadStorageType(filePath)
          yakitEngine
            .downloadLatestIntranetYakit(newFilePath)
            .then((isAlready) => {
              if (!isBreakRef.current) return
              if (onDownloadFinish) {
                onDownloadFinish(newFilePath, true)
                return
              }
              success(t('YakitNotification.downloaded'))
              if (!isAlready) {
                if (!getDownloadProgress()?.size) return
                setDownloadProgress({
                  time: {
                    elapsed: downloadProgress?.time.elapsed || 0,
                    remaining: 0,
                  },
                  speed: 0,
                  percent: 100,
                  // @ts-expect-error 类型定义不完整，需要忽略此行
                  size: getDownloadProgress().size,
                })
              }
              yakitShell.openYakitPath()
              emiter.emit('downloadedYakitIntranetFlag')
            })
            .catch((e: any) => {
              if (!isBreakRef.current) return
              onDownloadFinish?.(newFilePath, false)
              failed(t('YakitNotification.downloadFailed', { error: e + '' }))
            })
            .finally(() => {
              setVisible?.(false)
            })
        } catch (error) {
          if (!isBreakRef.current) return
          setVisible?.(false)
        }
      } else {
        grpcFetchLatestYakitVersion()
          .then((data: string) => {
            let version = data
            if (version.startsWith('v')) version = version.slice(1)

            yakitEngine
              .downloadLatestYakit(version, {
                isEnterprise: isEnterpriseEdition(),
                isIRify: isIRify(),
                isMemfit: isMemfit(),
              })
              .then(() => {
                if (!isBreakRef.current) return
                success(t('YakitNotification.downloaded'))
                if (!getDownloadProgress()?.size) return
                setDownloadProgress({
                  time: {
                    elapsed: downloadProgress?.time.elapsed || 0,
                    remaining: 0,
                  },
                  speed: 0,
                  percent: 100,
                  // @ts-expect-error 类型定义不完整，需要忽略此行
                  size: getDownloadProgress().size,
                })
                yakitShell.openYakitPath()
                emiter.emit('downloadedYakitFlag')
              })
              .catch((e: any) => {
                if (!isBreakRef.current) return
                failed(t('YakitNotification.downloadFailed', { error: e + '' }))
              })
              .finally(() => setVisible?.(false))
          })
          .catch((e: any) => {
            if (!isBreakRef.current) return
            setVisible?.(false)
          })
      }
    }
  })

  useEffect(() => {
    const cleanup = yakitEngine.onDownloadYakitProgress((state: DownloadingState) => {
      if (!isBreakRef.current) return
      setDownloadProgress(safeFormatDownloadProcessState(state))
    })
    return cleanup
  }, [])

  /** 取消下载事件 */
  const onCancel = useMemoizedFn(() => {
    isBreakRef.current = false
    setVisible?.(false)
    setDownloadProgress(undefined)
    yakitEngine.cancelDownloadYakitVersion()
  })

  const onBreak = useMemoizedFn((isBreak: boolean) => {
    isBreakRef.current = isBreak
  })
  return [
    downloadProgress,
    {
      onDownloadStart,
      onCancel,
      onBreak,
    },
  ] as const
}
