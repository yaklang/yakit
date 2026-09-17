import { ipc } from '@/services/ipc'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import type { YakRunnerProjectManagerProps } from './YakRunnerProjectManagerType'
import { useMemoizedFn } from 'ahooks'
import styles from './YakRunnerProjectManager.module.scss'
import { AuditHistoryTable, AuditModalFormModal } from '../yakRunnerAuditCode/AuditCode/AuditCode'
import emiter from '@/utils/eventBus/eventBus'
import { randomString } from '@/utils/randomUtil'
import { failed } from '@/utils/notification'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { Progress } from 'antd'
import { DocumentDownloadSolid } from '@yakit-libs/yakit-ui-icons/solid'
import classNames from 'classnames'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

export const YakRunnerProjectManager: React.FC<YakRunnerProjectManagerProps> = (props) => {
  const [isShowCompileModal, setShowCompileModal] = useState<boolean>(false)
  const [refresh, setRefresh] = useState<boolean>(false)

  const onCloseCompileModal = useMemoizedFn(() => {
    setShowCompileModal(false)
  })

  const onRefresh = () => {
    setRefresh(!refresh)
  }

  const onRefreshProjectManagerFun = useMemoizedFn(() => {
    setRefresh(!refresh)
  })

  useEffect(() => {
    emiter.on('onRefreshProjectManager', onRefreshProjectManagerFun)
    return () => {
      emiter.off('onRefreshProjectManager', onRefreshProjectManagerFun)
    }
  }, [])

  return (
    <div className={styles['yakrunner-project-manager']} id="yakrunner-project-manager">
      <AuditHistoryTable
        pageType="projectManager"
        onExecuteAudit={() => {
          setShowCompileModal(true)
        }}
        refresh={refresh}
        setRefresh={setRefresh}
      />
      {isShowCompileModal && (
        <AuditModalFormModal
          onCancel={onCloseCompileModal}
          onSuccee={onCloseCompileModal}
          warrpId={document.getElementById('yakrunner-project-manager')}
          onRefresh={onRefresh}
        />
      )}
    </div>
  )
}

interface IRifyUpdateProjectManagerModalProps {
  visible?: boolean
  onClose?: () => void
}

export interface MigrateSSAProjectResponse {
  Percent: number
  Message: string
}

export const IRifyUpdateProjectManagerModal: React.FC<IRifyUpdateProjectManagerModalProps> = (props) => {
  const { visible, onClose } = props
  const { t } = useI18nNamespaces(['yakRunner', 'yakitUi'])
  // 全部添加进度
  const [percent, setPercent] = useState<number>(0)
  const token = useRef(randomString(40)).current
  const controllerRef = useRef<AbortController>()
  const logInfoRef = useRef<string[]>([])
  const close = useMemoizedFn(() => onClose?.())
  useEffect(() => {
    if (!visible) return
    const controller = new AbortController()
    controllerRef.current = controller
    let closeTimer: ReturnType<typeof setTimeout> | undefined
    setPercent(0)
    const onError = (error: unknown) => {
      if (!controller.signal.aborted) failed(t('YakitNotification.syncFailed', { error: String(error) }))
    }
    ipc
      .openStream(
        'grpc',
        'MigrateSSAProject',
        {},
        {
          token,
          signal: controller.signal,
          onData(data) {
            if (controller.signal.aborted) return
            logInfoRef.current = [...logInfoRef.current, data.Message].slice(0, 8)
            setPercent(Math.floor(data.Percent * 100))
          },
          onError,
          onEnd() {
            if (controller.signal.aborted) return
            closeTimer = setTimeout(() => {
              setPercent(0)
              close()
            }, 500)
          },
        },
      )
      .catch(onError)
    return () => {
      controller.abort()
      clearTimeout(closeTimer)
    }
  }, [visible, token])

  const StopUpdate = () => {
    controllerRef.current?.abort()
    setPercent(0)
    close()
  }
  return (
    <YakitModal
      centered
      getContainer={document.body}
      open={visible}
      title={null}
      footer={null}
      width={520}
      type="white"
      closable={false}
      hiddenHeader={true}
      bodyStyle={{ padding: 0 }}
    >
      <div className={styles['yaklang-engine-hint-wrapper']}>
        <div className={styles['hint-left-wrapper']}>
          <div className={styles['hint-icon']}>
            <DocumentDownloadSolid color="currentColor" />
          </div>
        </div>

        <div className={styles['hint-right-wrapper']}>
          <div className={styles['hint-right-download']}>
            <div className={styles['hint-right-title']}>{t('IRifyUpdateProjectManagerModal.syncingData')}</div>
            <div className={classNames(styles['download-progress'], 'yakit-progress-wrapper')}>
              <Progress
                strokeColor="var(--Colors-Use-Main-Primary)"
                trailColor="var(--Colors-Use-Neutral-Bg)"
                percent={percent}
                showInfo={false}
              />
              <div className={styles['progress-title']}>
                {t('IRifyUpdateProjectManagerModal.progress', { percent: Math.round(percent) })}
              </div>
            </div>
            <div className={styles['log-info']}>
              {logInfoRef.current.map((item) => (
                <div key={item} className={styles['log-item']}>
                  {item}
                </div>
              ))}
            </div>
            <div className={styles['download-btn']}>
              <YakitButton loading={false} size="large" type="outline2" onClick={StopUpdate}>
                {t('YakitButton.cancel')}
              </YakitButton>
            </div>
          </div>
        </div>
      </div>
    </YakitModal>
  )
}
