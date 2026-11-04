import { FileContentSearchPanel } from '@/components/FileTreeContentSearch/FileContentSearchPanel'
import { useFilePreviewTabs } from '../FilePreview/useFilePreviewTabs'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitResizeBox } from '@/components/yakitUI/YakitResizeBox/YakitResizeBox'
import type { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import { useEffect, useMemo, useRef, useState } from 'react'
import FilePreview from '../FilePreview/FilePreview'
import FileTreeSystemListWrapper from '../FileTreeSystemListWrapper/FileTreeSystemListWrapper'
import { useCustomFolder } from '../store/useCustomFolder'
import styles from './FileTreeSystem.module.scss'
import FileTreeDrop from '@/pages/ai-agent/aiChatWelcome/FileTreeDrop/FileTreeDrop'
import { Divider } from 'antd'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useCreation } from 'ahooks'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useStore } from 'zustand'

interface FileTreeSystemProps {
  /** 是否有文件预览数据，用于外层自由对话变大 */
  onFilePreviewChange?: (hasPreview: boolean) => void
}

const FileTreeSystem = (props: FileTreeSystemProps) => {
  const { onFilePreviewChange } = props
  const { t } = useI18nNamespaces(['aiAgent'])

  const store = useCurrentStore()

  // 单选
  const [selected, setSelectedNode] = useState<FileNodeProps>()
  const sessionId = useCurrentSessionId()
  const scope = sessionId || 'welcome'
  const preview = useFilePreviewTabs(scope)
  const setSelected = (file?: FileNodeProps) => {
    setSelectedNode(file)
    if (file && !file.isFolder) preview.open(file)
  }
  useEffect(() => {
    setSelectedNode(undefined)
  }, [scope])
  // ai的文件夹

  const grpcFolders = useStore(store, (state) => state.grpcFolders)
  // 用户文件夹
  const customFolder = useCustomFolder()

  const filePreviewData = preview.state.files.find((file) => file.path === preview.state.active)
  const hasPreview = !!filePreviewData
  const searchRoots = useMemo(
    () => [...new Map([...grpcFolders, ...customFolder].map((root) => [root.path, root])).values()],
    [grpcFolders, customFolder],
  )
  const openedFiles = useMemo(() => preview.state.files.map((file) => ({ path: file.path })), [preview.state.files])
  const hasEmittedRef = useRef(false)

  // 与任务内容时间线一致：有预览时左侧 30%
  const [firstRatio, setFirstRatio] = useState('30%')

  useEffect(() => {
    onFilePreviewChange?.(hasPreview)
  }, [hasPreview])

  useEffect(() => {
    if (!filePreviewData) return
    if (hasEmittedRef.current) return

    setFirstRatio('30%')
    hasEmittedRef.current = true
  }, [filePreviewData])

  const firstNodeStyle = useCreation(() => {
    if (!hasPreview) {
      return { width: '100%', padding: '4px', overflow: 'hidden' as const }
    }
    return { width: '30%', padding: '4px', overflow: 'hidden' as const }
  }, [hasPreview])

  const secondNodeStyle = useCreation(() => {
    if (!hasPreview) {
      return {
        width: 0,
        minWidth: 0,
        maxWidth: 0,
        padding: 0,
        overflow: 'hidden' as const,
        flex: 'none',
      }
    }
    return { width: '70%' }
  }, [hasPreview])

  return (
    <YakitResizeBox
      firstRatio={hasPreview ? firstRatio : '100%'}
      secondRatio={hasPreview ? undefined : '0%'}
      lineDirection="right"
      firstMinSize={280}
      secondMinSize={hasPreview ? 100 : 0}
      lineStyle={{ width: hasPreview ? 4 : 0 }}
      freeze={hasPreview}
      isRecalculateWH={hasPreview}
      firstNodeStyle={firstNodeStyle}
      secondNodeStyle={secondNodeStyle}
      firstNode={
        <div className={styles.fileTreeSystemLeft}>
          <FileContentSearchPanel
            key={scope}
            roots={searchRoots}
            openedFiles={openedFiles}
            onOpen={(file, highlights) => {
              setSelectedNode(file)
              preview.open(file, highlights)
            }}
          />
          <div className={styles.topPanel}>
            <FileTreeSystemListWrapper
              key="aiFolder"
              path={grpcFolders}
              selected={selected}
              setSelected={setSelected}
              title="AI Artifacts"
              isOpen={false}
            />
          </div>
          <Divider style={{ margin: 0 }} />
          <div className={styles.bottomPanel}>
            <FileTreeDrop>
              {({ setDragSource }) => (
                <FileTreeSystemListWrapper
                  isOpen
                  key="customFolder"
                  title={t('FileTreeSystem.myOpenedFiles')}
                  selected={selected}
                  path={customFolder}
                  setSelected={setSelected}
                  onTreeDragStart={() => {
                    setDragSource('AIRreeToChat')
                  }}
                  onTreeDragEnd={() => {
                    setDragSource(null)
                  }}
                />
              )}
            </FileTreeDrop>
          </div>
        </div>
      }
      secondNode={
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
          <div role="tablist" style={{ display: 'flex', overflowX: 'auto', flexShrink: 0 }}>
            {preview.state.files.map((file) => (
              <div key={file.path} style={{ display: 'flex', alignItems: 'center' }}>
                <YakitButton
                  role="tab"
                  aria-selected={preview.state.active === file.path}
                  title={file.path}
                  onClick={() => preview.activate(file.path)}
                >
                  {file.name || file.path}
                </YakitButton>
                <YakitButton
                  aria-label={`${t('BatchFiles.close')} ${file.name || file.path}`}
                  type="text"
                  onClick={() => preview.close(file.path)}
                >
                  ×
                </YakitButton>
              </div>
            ))}
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <FilePreview
              key={filePreviewData?.path || 'empty'}
              data={filePreviewData}
              highlights={preview.state.highlights[preview.state.active]}
            />
          </div>
        </div>
      }
    />
  )
}

export default FileTreeSystem
