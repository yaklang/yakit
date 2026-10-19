import { useState } from 'react'
import classNames from 'classnames'
import type { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { SideSettingButton } from '../AIChatWelcomeSideSetting'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { SearchOutlined, XOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import FileTreeSplitPanels from './FileTreeSplitPanels/FileTreeSplitPanels'
import FileTreeSearchView from './FileTreeSearchView/FileTreeSearchView'
import styles from './FileTreeList.module.scss'

interface FileTreeListProps {
  selected?: FileNodeProps
  setSelected: (selected?: FileNodeProps) => void
}

const FileTreeList: React.FC<FileTreeListProps> = ({ selected, setSelected }) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const [isSearchView, setIsSearchView] = useState(false)

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
              icon={<SearchOutlined color="currentColor" />}
              onClick={() => setIsSearchView(true)}
            />
          )}
          <SideSettingButton type="text2" />
        </div>
      </div>
      <div className={styles['body']}>
        <div
          className={classNames(styles['track'], { [styles['track-search']]: isSearchView })}
          data-testid="file-tree-view-track"
          data-search-view={isSearchView ? 'true' : 'false'}
        >
          <div className={styles['panel']} aria-hidden={isSearchView}>
            <FileTreeSplitPanels selected={selected} setSelected={setSelected} />
          </div>
          <div className={styles['panel']} aria-hidden={!isSearchView}>
            <FileTreeSearchView active={isSearchView} setSelected={setSelected} />
          </div>
        </div>
      </div>
    </div>
  )
}
export default FileTreeList
