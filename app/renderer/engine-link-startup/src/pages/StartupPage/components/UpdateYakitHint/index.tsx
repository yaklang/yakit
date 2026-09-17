import { isEnterpriseEdition, isIRify, isMemfit } from '@/utils/envfile'
import { ipc } from '../../../../../../../shared/communication/window-client'
import React, { useRef } from 'react'
import { useMemoizedFn } from 'ahooks'
import { useEffect, useMemo, useState } from 'react'
import type { DownloadingState } from '../../types'
import { safeFormatDownloadProcessState } from '../../utils'
import { getReleaseEditionName } from '@/utils/envfile'
import { yakitNotify } from '@/utils/notification'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitHint } from '@/components/yakitUI/YakitHint/YakitHint'
import { Progress } from 'antd'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

import styles from './UpdateYakitHint.module.scss'

interface UpdateYakitHintProps {
  latest: string
  visible: boolean
  onCallback: () => void
}
/** yakit 更新弹框 */
export const UpdateYakitHint: React.FC<UpdateYakitHintProps> = React.memo((props) => {
  const { latest, visible, onCallback } = props
  const { t, i18nRefresh } = useI18nNamespaces(['link'])

  useEffect(() => {
    if (visible) {
      handleDownload()
      return () => {
        downloadController.current?.abort()
        setStatus('install')
        setYakitProgress(undefined)
        setBreakLoading(false)
        isBreak.current = false
      }
    }
  }, [visible])

  const handleCancel = useMemoizedFn(() => {
    onCallback()
  })

  const [status, setStatus] = useState<'install' | 'installed'>('install')
  const downloadController = useRef<AbortController>()
  const [yakitProgress, setYakitProgress] = useState<DownloadingState>()
  const [breakLoading, setBreakLoading] = useState<boolean>(false)
  const isBreak = useRef<boolean>(false)

  useEffect(() => () => downloadController.current?.abort(), [])

  /** 下载 */
  const handleDownload = useMemoizedFn(() => {
    downloadController.current?.abort()
    const controller = new AbortController()
    downloadController.current = controller
    const version = latest.startsWith('v') ? latest.substring(1) : latest
    setStatus('install')
    ipc
      .invoke(
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
        {
          signal: controller.signal,
          onProgress(state) {
            if (!controller.signal.aborted && state !== 100) setYakitProgress(safeFormatDownloadProcessState(state))
          },
        },
      )
      .then(() => {
        if (controller.signal.aborted) return
        if (isBreak.current) return
        yakitNotify('success', t('UpdateYakitHint.download_complete'))
        setYakitProgress((old) => {
          if (!old) return undefined
          return {
            time: {
              elapsed: old?.time.elapsed || 0,
              remaining: 0,
            },
            speed: 0,
            percent: 1,
            size: old.size,
          }
        })
        setStatus('installed')
      })
      .catch((e: any) => {
        if (controller.signal.aborted) return
        !isBreak.current && yakitNotify('error', t('UpdateYakitHint.download_failed', { error: e }))
        setYakitProgress(undefined)
        setStatus('install')
      })
  })

  /** 停止下载 */
  const yakitBreak = useMemoizedFn(() => {
    isBreak.current = true
    downloadController.current?.abort()
    setBreakLoading(true)
    setStatus('install')
    setYakitProgress(undefined)
    setTimeout(() => {
      setBreakLoading(false)
      handleCancel()
    }, 300)
  })

  /** 立即更新-已下载完成 */
  const yakitUpdate = useMemoizedFn(() => {
    ipc.invoke('local', 'open-yakit-path', {})
    setTimeout(() => {
      ipc.invoke('local', 'UIOperate', 'close')
    }, 100)
  })

  const title = useMemo(() => {
    if (status === 'install') return t('UpdateYakitHint.downloading', { name: getReleaseEditionName() })
    if (status === 'installed') return t('UpdateYakitHint.download_success', { name: getReleaseEditionName() })
    return t('UpdateYakitHint.unexpected_error')
  }, [status, i18nRefresh])

  const footerBtn = useMemo(() => {
    if (status === 'install') {
      return (
        <YakitButton loading={breakLoading} size="max" type="outline2" onClick={yakitBreak}>
          {t('UpdateYakitHint.cancel')}
        </YakitButton>
      )
    }

    if (status === 'installed') {
      return (
        <>
          <YakitButton size="max" type="outline2" onClick={handleCancel}>
            {t('UpdateYakitHint.cancel')}
          </YakitButton>
          <YakitButton size="max" onClick={yakitUpdate}>
            {t('UpdateYakitHint.confirm')}
          </YakitButton>
        </>
      )
    }
    return null
  }, [status, breakLoading, i18nRefresh])

  return (
    <YakitHint footer={null} visible={visible} title={title}>
      <div className={styles['update-yakit-hint']}>
        {status === 'installed' && (
          <div className={styles['content']}>
            <div className={styles['hint-right-content']}>{t('UpdateYakitHint.install_hint')}</div>
          </div>
        )}

        {status === 'install' && (
          <div className={styles['content']}>
            <Progress
              strokeColor="var(--Colors-Use-Main-Primary)"
              trailColor="var(--Colors-Use-Neutral-Bg-Hover)"
              percent={Math.floor((yakitProgress?.percent || 0) * 100)}
            />
            <div className={styles['download-info-wrapper']}>
              <div>
                {t('UpdateYakitHint.remaining_time')} : {(yakitProgress?.time.remaining || 0).toFixed(2)}s
              </div>
              <div className={styles['divider-wrapper']}></div>
              <div>
                {t('UpdateYakitHint.elapsed_time')} : {(yakitProgress?.time.elapsed || 0).toFixed(2)}s
              </div>
              <div className={styles['divider-wrapper']}></div>
              <div>
                {t('UpdateYakitHint.download_speed')} : {((yakitProgress?.speed || 0) / 1000000).toFixed(2)}
                M/s
              </div>
            </div>
          </div>
        )}

        <div className={styles['footer']}>
          <div className={styles['btn-group']}>{footerBtn}</div>
        </div>
      </div>
    </YakitHint>
  )
})
