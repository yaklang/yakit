import React, { useEffect, useRef, useState } from 'react'
import { Alert } from 'antd'
import classNames from 'classnames'
import { handleOpenFileSystemDialog } from '@/utils/fileSystemDialog'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { FolderOutlined, PlusOutlined, TrashOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { getMainOperatorPageBodyContainerOrBody } from '@/utils/getMainOperatorPageBodyContainer'
import { getPathBaseName } from '@/utils/str'
import { createCodingWorkspace, updateCodingWorkspace, type CodingWorkspace } from './api'
import styles from './CodingAgentControls.module.scss'

const { ipcRenderer } = window.require('electron')

export const CodingWorkspaceCreate = ({
  onClose,
  onCreated,
  workspace,
  onRemove,
}: {
  onClose: () => void
  onCreated: (workspace: CodingWorkspace) => void
  workspace?: CodingWorkspace
  onRemove?: () => void
}) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState(workspace?.Name || '')
  const [paths, setPaths] = useState<string[]>(workspace ? [...workspace.RootPaths] : [])
  const [readingFolders, setReadingFolders] = useState(false)
  const [dragging, setDragging] = useState(false)
  const dragDepth = useRef(0)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  const busy = saving || readingFolders
  const validPaths = paths.length > 0
  const primaryPath = paths[0] || ''
  const defaultName = Array.from(getPathBaseName(primaryPath.replace(/[\\/]+$/, '')) || primaryPath)
    .slice(0, 100)
    .join('')
  const appendPaths = (next: string[]) => setPaths((old) => [...new Set([...old, ...next])])
  const addWorkspace = async () => {
    if (busy || !validPaths) return
    setSaving(true)
    setError('')
    try {
      const saved = workspace
        ? await updateCodingWorkspace(workspace.ID, name.trim() || defaultName, paths)
        : await createCodingWorkspace(name.trim() || defaultName, paths)
      if (alive.current) onCreated(saved)
    } catch (err) {
      if (alive.current) setError(String(err))
    } finally {
      if (alive.current) setSaving(false)
    }
  }
  const chooseFolders = async () => {
    if (busy) return
    setReadingFolders(true)
    setError('')
    try {
      const result = await handleOpenFileSystemDialog({ properties: ['openDirectory', 'multiSelections'] })
      if (alive.current && result.filePaths.length) {
        appendPaths(result.filePaths)
      }
    } catch (err) {
      if (alive.current) setError(String(err))
    } finally {
      if (alive.current) setReadingFolders(false)
    }
  }
  const dropFolders = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    dragDepth.current = 0
    setDragging(false)
    if (busy) return
    // Read native paths during the drop event, before the drag data store is cleared.
    const files = Array.from(event.dataTransfer.files)
    if (!files.length) return
    const droppedPaths = [...new Set(files.map((file) => (file as File & { path?: string }).path || ''))]
    setReadingFolders(true)
    setError('')
    try {
      const directories = await Promise.all(
        droppedPaths.map(async (path) =>
          path && (await ipcRenderer.invoke('fetch-file-is-dir-by-path', path)) ? path : '',
        ),
      )
      if (!alive.current) return
      appendPaths(directories.filter(Boolean))
      if (directories.some((path) => !path)) setError(t('CodingAgent.dropFoldersOnly'))
    } catch (err) {
      if (alive.current) setError(String(err))
    } finally {
      if (alive.current) setReadingFolders(false)
    }
  }
  return (
    <YakitModal
      open
      title={
        <span className={styles.createTitle}>
          {t(workspace ? 'CodingAgent.editProject' : 'CodingAgent.createWorkspace')}
        </span>
      }
      width={480}
      type="white"
      size="large"
      className={styles.createModal}
      headerStyle={{ padding: '20px 24px 4px' }}
      bodyStyle={{ padding: 0 }}
      footerStyle={{ padding: '12px 24px 20px' }}
      okText={t(workspace ? 'CodingAgent.saveProject' : 'CodingAgent.createWorkspace')}
      footerExtra={
        workspace && onRemove ? (
          <YakitButton type="text2" colors="danger" disabled={busy} onClick={onRemove}>
            {t('CodingAgent.removeProject')}
          </YakitButton>
        ) : undefined
      }
      onCancel={() => {
        if (!saving) onClose()
      }}
      onOk={addWorkspace}
      confirmLoading={saving}
      okButtonProps={{ disabled: busy || !validPaths, className: styles.createSubmit }}
      cancelButtonProps={{ type: 'text2' }}
      getContainer={getMainOperatorPageBodyContainerOrBody()}
    >
      <div className={styles.createForm}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{t('CodingAgent.name')}</span>
          <YakitInput
            aria-label={t('CodingAgent.name')}
            placeholder={defaultName || t('CodingAgent.namePlaceholder')}
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

          <div
            role="group"
            aria-label={t('CodingAgent.sourceFolder')}
            aria-busy={readingFolders}
            className={classNames(styles.folderDropZone, { [styles.folderDropActive]: dragging })}
            onDragEnter={(event) => {
              event.preventDefault()
              event.stopPropagation()
              if (busy || !Array.from(event.dataTransfer.types).includes('Files')) return
              dragDepth.current += 1
              setDragging(true)
            }}
            onDragOver={(event) => {
              event.preventDefault()
              event.stopPropagation()
              event.dataTransfer.dropEffect =
                !busy && Array.from(event.dataTransfer.types).includes('Files') ? 'copy' : 'none'
            }}
            onDragLeave={(event) => {
              event.preventDefault()
              event.stopPropagation()
              dragDepth.current = Math.max(0, dragDepth.current - 1)
              if (!dragDepth.current) setDragging(false)
            }}
            onDrop={dropFolders}
          >
            {!paths.length ? (
              <div className={styles.emptyFolders}>
                <span>{t(dragging ? 'CodingAgent.dropFolders' : 'CodingAgent.localFolderTip')}</span>
                <YakitButton type="text2" icon={<PlusOutlined />} onClick={chooseFolders} disabled={busy}>
                  {t('CodingAgent.chooseFolder')}
                </YakitButton>
              </div>
            ) : (
              paths.map((path, index) => (
                <div className={styles.directoryInput} key={path}>
                  <div className={styles.directoryLabel}>
                    <span>{t(index === 0 ? 'CodingAgent.primary' : 'CodingAgent.secondary')}</span>
                    <YakitButton
                      type="text2"
                      icon={<TrashOutlined />}
                      aria-label={t('CodingAgent.removeDirectory', { index: index + 1 })}
                      disabled={busy}
                      onClick={() => setPaths((old) => old.filter((_, i) => i !== index))}
                    />
                    {index > 0 && (
                      <YakitButton
                        type="text2"
                        size="small"
                        disabled={busy}
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
                <YakitButton type="outline2" icon={<PlusOutlined />} disabled={busy} onClick={chooseFolders}>
                  {t('CodingAgent.addDirectory')}
                </YakitButton>
                <span className={styles.hint}>
                  {t(dragging ? 'CodingAgent.dropFolders' : 'CodingAgent.dropMoreFolders')}
                </span>
              </div>
            )}
          </div>
        </div>
        {paths.length > 0 && <p className={styles.hint}>{t('CodingAgent.primaryRule')}</p>}
        {workspace && <p className={styles.hint}>{t('CodingAgent.editProjectHint')}</p>}
        {error && <Alert type="error" showIcon message={error} />}
      </div>
    </YakitModal>
  )
}
