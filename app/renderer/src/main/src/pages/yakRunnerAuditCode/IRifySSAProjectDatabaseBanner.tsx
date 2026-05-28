import React, { memo } from 'react'
import { Tooltip } from 'antd'
import { openABSFileLocated } from '@/utils/openWebsite'
import { setClipboardText } from '@/utils/clipboard'
import { OutlineDocumentduplicateIcon } from '@/assets/icon/outline'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './RunnerFileTree/RunnerFileTree.module.scss'

interface IRifySSAProjectDatabaseBannerProps {
  projectName?: string
  databasePath?: string
  databaseBindMode?: 'shared' | 'dedicated'
}

export const IRifySSAProjectDatabaseBanner: React.FC<IRifySSAProjectDatabaseBannerProps> = memo(
  ({ projectName, databasePath, databaseBindMode = 'shared' }) => {
    const { t } = useI18nNamespaces(['yakRunner', 'projectManage', 'yakitUi'])

    if (!databasePath && !projectName) {
      return null
    }

    const isDedicated = databaseBindMode === 'dedicated'
    const label = isDedicated
      ? projectName
        ? t('IRifySSAProjectDatabaseBanner.dedicatedDbOfProject', {
            defaultValue: '{{name}} 独立数据库',
            name: projectName,
          })
        : t('ProjectManage.dedicatedDatabase', { defaultValue: '独立数据库' })
      : projectName
        ? t('IRifySSAProjectDatabaseBanner.sharedDbOfProject', {
            defaultValue: '共享数据库',
            name: projectName,
          })
        : t('IRifySSAProjectDatabaseBanner.sharedIrDatabase', { defaultValue: '共享 IR 库' })

    return (
      <div className={styles['ssa-db-banner']}>
        <span className={styles['ssa-db-banner-label']}>{label}</span>
        {databasePath ? (
          <>
            <Tooltip title={databasePath}>
              <span
                className={styles['ssa-db-banner-path']}
                onClick={(e) => {
                  e.stopPropagation()
                  openABSFileLocated(databasePath)
                }}
              >
                {databasePath}
              </span>
            </Tooltip>
            <Tooltip title={t('YakitButton.copy')}>
              <span
                className={styles['ssa-db-banner-copy']}
                onClick={(e) => {
                  e.stopPropagation()
                  setClipboardText(databasePath)
                }}
              >
                <OutlineDocumentduplicateIcon />
              </span>
            </Tooltip>
          </>
        ) : null}
      </div>
    )
  },
)
