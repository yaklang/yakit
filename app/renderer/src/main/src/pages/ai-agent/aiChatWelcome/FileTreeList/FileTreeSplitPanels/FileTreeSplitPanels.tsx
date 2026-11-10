import { memo, useMemo } from 'react'
import type { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import { useCustomFolder } from '../../../components/aiFileSystemList/store/useCustomFolder'
import FileTreeSystemListWrapper from '../../../components/aiFileSystemList/FileTreeSystemListWrapper/FileTreeSystemListWrapper'
import FileTreeDrop from '../../FileTreeDrop/FileTreeDrop'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useCreation, useMemoizedFn } from 'ahooks'
import emiter from '@/utils/eventBus/eventBus'
import { AITabsEnum } from '../../../defaultConstant'
import { useCurrentRawData, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import { useStore } from 'zustand'
import { SplitView } from '@/pages/yakRunner/SplitView/SplitView'
import { FileTreeSearchScope } from '../FileTreeSearchView/constants'
import type { FileTreeSearchScopeValue } from '../FileTreeSearchView/constants'
import styles from './FileTreeSplitPanels.module.scss'

interface FileTreeSplitPanelsProps {
  selected?: FileNodeProps
  setSelected: (selected?: FileNodeProps) => void
  onOpenSearch?: (scope: FileTreeSearchScopeValue, path?: string) => void
}

const FileTreeSplitPanels: React.FC<FileTreeSplitPanelsProps> = memo(({ selected, setSelected, onOpenSearch }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const store = useCurrentStore()
  const sessionId = useCurrentSessionId()
  const grpcFolders = useStore(store, (state) => state.grpcFolders)
  const rawData = useCurrentRawData()
  const draftMaterialsUpdate = useStore(store, (state) => state.draftMaterialsUpdate)
  const addedFilePaths = useCreation(
    () => rawData.draftMaterials.files.map((file) => file.path),
    [sessionId, draftMaterialsUpdate],
  )
  const onRemoveAddedFile = useMemoizedFn((path: string) => {
    emiter.emit('removeAIFileMaterial', JSON.stringify({ sessionId, path }))
  })
  const customFolder = useCustomFolder()
  const hasAiFolder = grpcFolders.length > 0

  const onSelect = useMemoizedFn((node?: FileNodeProps) => {
    setSelected(node)
    if (node && !node.isFolder) {
      emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.File_Preview, value: node.path }))
    }
  })

  const onSearchAiFolder = useMemoizedFn(() => onOpenSearch?.(FileTreeSearchScope.AiFolder))
  const onSearchUserFolder = useMemoizedFn(() => onOpenSearch?.(FileTreeSearchScope.UserFolder))
  const onSearchUserRoot = useMemoizedFn((path: string) => onOpenSearch?.(FileTreeSearchScope.UserFolder, path))

  const openedFilesPanel = useMemo(
    () => (
      <FileTreeDrop className={styles['opened-files']}>
        {({ setDragSource }) => (
          <FileTreeSystemListWrapper
            variant="sidebar"
            addedFilePaths={addedFilePaths}
            onRemoveAddedFile={onRemoveAddedFile}
            isOpen
            title={t('FileTreeSystem.myOpenedFiles')}
            selected={selected}
            path={customFolder}
            setSelected={onSelect}
            onTitleSearch={onOpenSearch ? onSearchUserFolder : undefined}
            onRootSearch={onOpenSearch ? onSearchUserRoot : undefined}
            onTreeDragStart={() => setDragSource('AIRreeToChat')}
            onTreeDragEnd={() => setDragSource(null)}
          />
        )}
      </FileTreeDrop>
    ),
    [
      t,
      selected,
      customFolder,
      onSelect,
      onOpenSearch,
      onSearchUserFolder,
      onSearchUserRoot,
      addedFilePaths,
      onRemoveAddedFile,
    ],
  )

  // AI 文件夹为空时不展示 AI Artifacts 分区
  if (!hasAiFolder) {
    return openedFilesPanel
  }

  return (
    <SplitView
      isVertical
      minWidth={0}
      minHeight={80}
      defaultSizes={[160, undefined]}
      className={styles['file-split']}
      sashClassName={styles['file-sash']}
      elements={[
        {
          element: (
            <FileTreeSystemListWrapper
              key={sessionId}
              variant="sidebar"
              addedFilePaths={addedFilePaths}
              onRemoveAddedFile={onRemoveAddedFile}
              path={grpcFolders}
              selected={selected}
              setSelected={onSelect}
              title={t('FileTreeSystem.aiArtifacts')}
              isOpen={false}
              showTitleActions={false}
              onTitleSearch={onOpenSearch ? onSearchAiFolder : undefined}
            />
          ),
        },
        {
          element: openedFilesPanel,
        },
      ]}
    />
  )
})

FileTreeSplitPanels.displayName = 'FileTreeSplitPanels'

export default FileTreeSplitPanels
