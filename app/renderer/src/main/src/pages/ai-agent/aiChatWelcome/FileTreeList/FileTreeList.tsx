import type { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import { useCustomFolder } from '../../components/aiFileSystemList/store/useCustomFolder'
import FileTreeSystemListWrapper from '../../components/aiFileSystemList/FileTreeSystemListWrapper/FileTreeSystemListWrapper'
import FileTreeDrop from '../FileTreeDrop/FileTreeDrop'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useMemoizedFn } from 'ahooks'
import { XOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import emiter from '@/utils/eventBus/eventBus'
import { AITabsEnum } from '../../defaultConstant'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import { useStore } from 'zustand'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { SideSettingButton } from '../AIChatWelcomeSideSetting'
import { SplitView } from '@/pages/yakRunner/SplitView/SplitView'
import styles from './FileTreeList.module.scss'

interface FileTreeListProps {
  selected?: FileNodeProps
  setSelected: (selected?: FileNodeProps) => void
  onClose: () => void
}

const FileTreeList: React.FC<FileTreeListProps> = ({ selected, setSelected, onClose }) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const store = useCurrentStore()
  const sessionId = useCurrentSessionId()
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
          <SideSettingButton type="text2" />
          <YakitButton
            type="text2"
            title={t('YakitButton.close')}
            aria-label={t('YakitButton.close')}
            icon={<XOutlined color="currentColor" />}
            onClick={onClose}
          />
        </div>
      </div>
      <div className={styles['body']}>
        <SplitView
          isVertical
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
                  path={grpcFolders}
                  selected={selected}
                  setSelected={onSelect}
                  title={t('FileTreeSystem.aiArtifacts')}
                  isOpen={false}
                  showTitleActions={false}
                />
              ),
            },
            {
              element: (
                <FileTreeDrop className={styles['opened-files']}>
                  {({ setDragSource }) => (
                    <FileTreeSystemListWrapper
                      variant="sidebar"
                      isOpen
                      title={t('FileTreeSystem.myOpenedFiles')}
                      selected={selected}
                      path={customFolder}
                      setSelected={onSelect}
                      onTreeDragStart={() => setDragSource('AIRreeToChat')}
                      onTreeDragEnd={() => setDragSource(null)}
                    />
                  )}
                </FileTreeDrop>
              ),
            },
          ]}
        />
      </div>
    </div>
  )
}
export default FileTreeList
