import React, { useEffect, useRef, useState } from 'react'
import { Alert } from 'antd'
import { handleOpenFileSystemDialog } from '@/utils/fileSystemDialog'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { FolderOutlined, PlusOutlined, TrashOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { getMainOperatorPageBodyContainerOrBody } from '@/utils/getMainOperatorPageBodyContainer'
import { createCodingWorkspace, type CodingWorkspace } from './api'
import styles from './CodingAgentControls.module.scss'

export const CodingWorkspaceCreate = ({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (workspace: CodingWorkspace) => void
}) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [paths, setPaths] = useState<string[]>([])
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  const validPaths = paths.length > 0
  const addWorkspace = async () => {
    if (saving || !name.trim() || !validPaths) return
    setSaving(true)
    setError('')
    try {
      const workspace = await createCodingWorkspace(name.trim(), paths)
      if (alive.current) onCreated(workspace)
    } catch (err) {
      if (alive.current) setError(String(err))
    } finally {
      if (alive.current) setSaving(false)
    }
  }
  const chooseFolders = async () => {
    try {
      const result = await handleOpenFileSystemDialog({ properties: ['openDirectory', 'multiSelections'] })
      if (alive.current && result.filePaths.length) {
        setPaths((old) => [...new Set([...old, ...result.filePaths])])
      }
    } catch (err) {
      if (alive.current) setError(String(err))
    }
  }
  return (
    <YakitModal
      open
      title={<span className={styles.createTitle}>{t('CodingAgent.createWorkspace')}</span>}
      width={480}
      type="white"
      size="large"
      className={styles.createModal}
      headerStyle={{ padding: '20px 24px 4px' }}
      bodyStyle={{ padding: 0 }}
      footerStyle={{ padding: '12px 24px 20px' }}
      okText={t('CodingAgent.createWorkspace')}
      onCancel={() => {
        if (!saving) onClose()
      }}
      onOk={addWorkspace}
      confirmLoading={saving}
      okButtonProps={{ disabled: !name.trim() || !validPaths, className: styles.createSubmit }}
      cancelButtonProps={{ type: 'text2' }}
      getContainer={getMainOperatorPageBodyContainerOrBody()}
    >
      <div className={styles.createForm}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{t('CodingAgent.name')}</span>
          <YakitInput
            aria-label={t('CodingAgent.name')}
            placeholder={t('CodingAgent.name')}
            prefix={<FolderOutlined />}
            autoFocus
            wrapperClassName={styles.projectNameInput}
            maxLength={100}
            value={name}
            disabled={saving}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>{t('CodingAgent.sourceFolder')}</span>

          {!paths.length ? (
            <div className={styles.emptyFolders}>
              <span>{t('CodingAgent.localFolderTip')}</span>
              <YakitButton type="text2" icon={<PlusOutlined />} onClick={chooseFolders} disabled={saving}>
                {t('CodingAgent.chooseFolder')}
              </YakitButton>
            </div>
          ) : (
            paths.map((path, index) => (
              <div className={styles.directoryInput} key={index}>
                <div className={styles.directoryLabel}>
                  <span>{t(index === 0 ? 'CodingAgent.primary' : 'CodingAgent.secondary')}</span>
                  <YakitButton
                    type="text2"
                    icon={<TrashOutlined />}
                    aria-label={t('CodingAgent.removeDirectory', { index: index + 1 })}
                    disabled={saving}
                    onClick={() => setPaths((old) => old.filter((_, i) => i !== index))}
                  />
                  {index > 0 && (
                    <YakitButton
                      type="text2"
                      size="small"
                      disabled={saving}
                      onClick={() => setPaths((old) => [old[index], ...old.filter((_, i) => i !== index)])}
                    >
                      {t('CodingAgent.makePrimary')}
                    </YakitButton>
                  )}
                </div>
                <div className={styles.directoryPath} title={path}>
                  {path}
                </div>
              </div>
            ))
          )}
          {paths.length > 0 && (
            <div className={styles.addDirectories}>
              <YakitButton type="outline2" icon={<PlusOutlined />} disabled={saving} onClick={chooseFolders}>
                {t('CodingAgent.addDirectory')}
              </YakitButton>
            </div>
          )}
        </div>
        {paths.length > 0 && <p className={styles.hint}>{t('CodingAgent.primaryRule')}</p>}
        {error && <Alert type="error" showIcon message={error} />}
      </div>
    </YakitModal>
  )
}
