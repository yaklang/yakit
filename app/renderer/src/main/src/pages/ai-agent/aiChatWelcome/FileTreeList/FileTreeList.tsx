import { useState } from 'react'
import type { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { SideSettingButton } from '../AIChatWelcomeSideSetting'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { SlidePanels } from '@/components/SlidePanels/SlidePanels'
import { SearchOutlined, XOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import FileTreeSplitPanels from './FileTreeSplitPanels/FileTreeSplitPanels'
import FileTreeSearchView from './FileTreeSearchView/FileTreeSearchView'
import { FileTreeSearchScope, type FileTreeSearchScopeValue } from './FileTreeSearchView/constants'
import styles from './FileTreeList.module.scss'

interface FileTreeListProps {
  selected?: FileNodeProps
  setSelected: (selected?: FileNodeProps) => void
}

const FileTreeList: React.FC<FileTreeListProps> = ({ selected, setSelected }) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const [isSearchView, setIsSearchView] = useState(false)
  const [searchScope, setSearchScope] = useState<FileTreeSearchScopeValue>(FileTreeSearchScope.All)
  /** 进入搜索时预设的单路径（如根节点搜索） */
  const [searchScopePath, setSearchScopePath] = useState<string>()

  const openSearch = (scope: FileTreeSearchScopeValue = FileTreeSearchScope.All, path?: string) => {
    setSearchScope(scope)
    setSearchScopePath(path)
    setIsSearchView(true)
  }

  return (
    <div className={styles['file-tree-list']}>
      <div className={styles['header']}>
        <span className={styles['header-title']}>{isSearchView ? t('YakitInput.search') : t('AITabs.fileSystem')}</span>
        <div className={styles['header-actions']}>
          {isSearchView ? (
            <YakitButton
              type="text2"
              title={t('YakitButton.close')}
              aria-label={t('YakitButton.close')}
              icon={<XOutlined color="currentColor" />}
              onClick={() => setIsSearchView(false)}
            />
          ) : (
            <YakitButton
              type="text2"
              title={t('YakitInput.search')}
              aria-label={t('YakitInput.search')}
              data-testid="file-tree-header-search"
              icon={<SearchOutlined color="currentColor" />}
              onClick={() => openSearch(FileTreeSearchScope.All)}
            />
          )}
          <SideSettingButton type="text2" />
        </div>
      </div>
      <SlidePanels
        showSecond={isSearchView}
        data-testid="file-tree-view-track"
        first={<FileTreeSplitPanels selected={selected} setSelected={setSelected} onOpenSearch={openSearch} />}
        second={
          <FileTreeSearchView
            active={isSearchView}
            scopePreset={searchScope}
            scopePathPreset={searchScopePath}
            setSelected={setSelected}
          />
        }
      />
    </div>
  )
}
export default FileTreeList
