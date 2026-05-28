import React, { useEffect, useMemo, useRef, useState } from 'react'
import { YakRunnerProjectManagerProps } from './YakRunnerProjectManagerType'
import { useMemoizedFn } from 'ahooks'
import styles from './YakRunnerProjectManager.module.scss'
import { AuditHistoryTable, AuditModalFormModal } from '../yakRunnerAuditCode/AuditCode/AuditCode'
import emiter from '@/utils/eventBus/eventBus'
import { randomString } from '@/utils/randomUtil'
import { failed } from '@/utils/notification'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { Progress } from 'antd'
import { SolidDocumentdownloadIcon, SolidPluscircleIcon } from '@/assets/icon/solid'
import classNames from 'classnames'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { isIRify } from '@/utils/envfile'
import { SSAProjectDatabaseBindModeUI } from '@/pages/softwareSettings/ssaProjectTableShared'
import { useIRifySharedProfile } from '@/pages/softwareSettings/useIRifySharedProfile'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'

const { ipcRenderer } = window.require('electron')

export const YakRunnerProjectManager: React.FC<YakRunnerProjectManagerProps> = (props) => {
  const [isShowCompileModal, setShowCompileModal] = useState<boolean>(false)
  const [createDatabaseBindMode, setCreateDatabaseBindMode] = useState<SSAProjectDatabaseBindModeUI>('shared')
  const [refresh, setRefresh] = useState<boolean>(false)
  const { t } = useI18nNamespaces(['yakRunner', 'projectManage'])
  const { loading: profileLoading, canShowInternalProjectManage, dedicatedSSAActive } = useIRifySharedProfile()

  const onCloseCompileModal = useMemoizedFn(() => {
    setShowCompileModal(false)
  })

  const onRefresh = () => {
    setRefresh(!refresh)
    emiter.emit('onRefreshSSAProjectList')
  }

  const onRefreshProjectManagerFun = useMemoizedFn(() => {
    setRefresh(!refresh)
    emiter.emit('onRefreshSSAProjectList')
  })

  useEffect(() => {
    emiter.on('onRefreshProjectManager', onRefreshProjectManagerFun)
    return () => {
      emiter.off('onRefreshProjectManager', onRefreshProjectManagerFun)
    }
  }, [])

  if (isIRify() && !canShowInternalProjectManage) {
    return (
      <div className={styles['yakrunner-project-manager']} id="yakrunner-project-manager">
        <YakitSpin spinning={profileLoading}>
          {!profileLoading && (
            <YakitEmpty
              description={
                dedicatedSSAActive
                  ? t('ProjectManage.dedicatedSSAActiveNoProjectManage', {
                      defaultValue:
                        '当前已打开独立数据库审计项目。项目历史请使用侧栏「项目历史」；外部项目请在「设置 → 项目管理 → 外部审计项目」中管理。',
                    })
                  : t('ProjectManage.dedicatedProfileNoProjectManage', {
                      defaultValue:
                        '当前为独立数据库 Profile。项目历史请使用侧栏「项目历史」；外部项目请在「设置 → 项目管理 → 外部审计项目」中管理。',
                    })
              }
            />
          )}
        </YakitSpin>
      </div>
    )
  }

  if (isIRify() && canShowInternalProjectManage) {
    return (
      <div className={styles['yakrunner-project-manager']} id="yakrunner-project-manager">
        <YakitSpin spinning={profileLoading}>
          {!profileLoading && (
            <AuditHistoryTable
              pageType="projectManager"
              onExecuteAudit={() => {
                setShowCompileModal(true)
              }}
              refresh={refresh}
              setRefresh={setRefresh}
            />
          )}
        </YakitSpin>
        {isShowCompileModal && (
          <AuditModalFormModal
            databaseBindMode={createDatabaseBindMode}
            onCancel={onCloseCompileModal}
            onSuccee={onCloseCompileModal}
            warrpId={document.getElementById('yakrunner-project-manager')}
            onRefresh={onRefresh}
          />
        )}
      </div>
    )
  }

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
  const [percent, setPercent] = useState<number>(0)
  const [token, setTaskToken] = useState(randomString(40))
  const logInfoRef = useRef<string[]>([])
  useEffect(() => {
    if (!token) {
      return
    }
    ipcRenderer.on(`${token}-data`, (_, data: MigrateSSAProjectResponse) => {
      const p = Math.floor(data.Percent * 100)
      logInfoRef.current = [...logInfoRef.current, data.Message].slice(0, 8)
      setPercent(p)
    })
    ipcRenderer.on(`${token}-end`, () => {
      setTimeout(() => {
        setPercent(0)
        onClose?.()
      }, 500)
    })
    ipcRenderer.on(`${token}-error`, (_, e) => {
      failed(t('YakitNotification.syncFailed', { error: e + '' }))
    })
    return () => {
      ipcRenderer.removeAllListeners(`${token}-data`)
      ipcRenderer.removeAllListeners(`${token}-error`)
      ipcRenderer.removeAllListeners(`${token}-end`)
    }
  }, [token])

  const initIRifyUpdate = useMemoizedFn(() => {
    ipcRenderer.invoke('MigrateSSAProject', token)
  })

  useEffect(() => {
    visible && initIRifyUpdate()
  }, [visible])

  const StopUpdate = () => {
    setPercent(0)
    onClose?.()
    ipcRenderer.invoke('cancel-MigrateSSAProject', token).catch((e) => {
      failed(t('IRifyUpdateProjectManagerModal.stopFailed', { error: e + '' }))
    })
  }
  return (
    <YakitModal
      centered
      getContainer={document.body}
      visible={visible}
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
            <SolidDocumentdownloadIcon />
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
