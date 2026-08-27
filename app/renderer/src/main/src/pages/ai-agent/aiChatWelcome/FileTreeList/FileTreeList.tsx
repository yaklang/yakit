import type { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import { useCustomFolder } from '../../components/aiFileSystemList/store/useCustomFolder'
import FileTreeSystemListWrapper from '../../components/aiFileSystemList/FileTreeSystemListWrapper/FileTreeSystemListWrapper'
import FileTreeDrop from '../FileTreeDrop/FileTreeDrop'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useMemoizedFn } from 'ahooks'
import { OutlineDocumentaddIcon, OutlineFolderaddIcon } from '@/assets/icon/outline'
import emiter from '@/utils/eventBus/eventBus'
import { AITabsEnum } from '../../defaultConstant'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useStore } from 'zustand'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { onOpenFileFolder } from '../../components/aiFileSystemList/utils'
import styles from './FileTreeList.module.scss'

interface FileTreeListProps {
  selected?: FileNodeProps
  setSelected: (selected?: FileNodeProps) => void
}

const FileTreeList: React.FC<FileTreeListProps> = ({ selected, setSelected }) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const store = useCurrentStore()
  const grpcFolders = useStore(store, (state) => state.grpcFolders)
  const customFolder = useCustomFolder()

  const onSelect = useMemoizedFn((node?: FileNodeProps) => {
    setSelected(node)
    if (node && !node.isFolder) {
      emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.File_Preview, value: node.path }))
    }
  })

  return (
    <div className={styles['file-tree-list']}>
      <div className={styles['header']}>
        <span className={styles['header-title']}>{t('AITabs.fileSystem')}</span>
        <div className={styles['header-actions']}>
          <YakitButton
            type="text2"
            title={t('YakitButton.openFile')}
            icon={<OutlineDocumentaddIcon />}
            onClick={() => onOpenFileFolder(false)}
          />
          <YakitButton
            type="text2"
            title={t('YakitButton.openFolder')}
            icon={<OutlineFolderaddIcon />}
            onClick={() => onOpenFileFolder(true)}
          />
        </div>
      </div>
      <div className={styles['divider']} />
      <div className={styles['body']}>
        <div className={styles['top-panel']}>
          <FileTreeSystemListWrapper
            key="aiFolder"
            path={grpcFolders}
            selected={selected}
            setSelected={onSelect}
            title={t('FileTreeSystem.aiArtifacts')}
            isOpen={false}
            fillHeight={false}
            showTitleActions={false}
          />
        </div>
        <FileTreeDrop className={styles['bottom-panel']}>
          {({ setDragSource }) => (
            <FileTreeSystemListWrapper
              isOpen
              key="customFolder"
              title={t('FileTreeSystem.myOpenedFiles')}
              selected={selected}
              path={customFolder}
              setSelected={onSelect}
              showTitleActions={false}
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
  )
}
export default FileTreeList
