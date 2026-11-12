import { useRef, useState } from 'react'
import type { FC } from 'react'
import classNames from 'classnames'
import { useRequest } from 'ahooks'
import { PlusOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import { getPathBaseName } from '@/utils/str'
import { showAIAgentSidebarTab } from '../../aiAgentTabNavigation'
import BrowserMaterialList from '../../browserInstances/BrowserMaterialList/BrowserMaterialList'
import { useBrowserInstances } from '../../browserInstances/browserInstanceStore'
import { AIAgentTabListEnum } from '../../defaultConstant'
import { defaultFolder, useCustomFolder } from '../aiFileSystemList/store/useCustomFolder'
import FileTreeSystemList from '../aiFileSystemList/FileTreeSystemList/FileTreeSystemList'
import { useMentionRowsKeyboard } from './hooks/useMentionRowsKeyboard'
import { browserMentionRow, matchesMentionKeyword } from './mentionListData'
import type { MentionListControls } from './type'
import styles from './AIChatMention.module.scss'

interface MentionSidebarListProps extends MentionListControls {
  query: string
  onClose?: () => void
}

const MentionSidebarEmpty: FC<Pick<MentionSidebarListProps, 'query' | 'onClose'> & { tab: AIAgentTabListEnum }> = ({
  query,
  onClose,
  tab,
}) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  if (query)
    return (
      <div className={styles['search-empty']} role="status">
        {t('AIMentionTabs.searchEmpty')}
      </div>
    )

  return (
    <YakitEmpty className={styles['sidebar-empty']}>
      <YakitButton
        size="large"
        icon={<PlusOutlined color="currentColor" size={16} />}
        onClick={() => {
          onClose?.()
          showAIAgentSidebarTab(tab)
        }}
      >
        {t('AIAddMaterialsPopover.goToAdd')}
      </YakitButton>
    </YakitEmpty>
  )
}

export const MentionBrowsers: FC<MentionSidebarListProps> = ({ query, onClose, ...controls }) => {
  const { instances, loading } = useBrowserInstances()
  const scrollRef = useRef<HTMLDivElement>(null)
  const rows = instances
    .filter((instance) => instance.online)
    .map(browserMentionRow)
    .filter((item) => matchesMentionKeyword(item, query))
  const rowProps = useMentionRowsKeyboard(scrollRef, rows, controls, query)
  if (!rows.length) {
    return loading ? (
      <YakitSpin />
    ) : (
      <MentionSidebarEmpty query={query} onClose={onClose} tab={AIAgentTabListEnum.Browser} />
    )
  }
  return (
    <div className={styles.rows} ref={scrollRef} role="listbox">
      <BrowserMaterialList items={rows.map((row) => ({ instance: row.instance, option: rowProps(row) }))} />
    </div>
  )
}

export const MentionFileTree: FC<MentionSidebarListProps> = ({ onSelect, query, onClose }) => {
  const [selected, setSelected] = useState<FileNodeProps>()
  const customFolder = useCustomFolder()
  const { data: fallbackFolder, loading } = useRequest(defaultFolder, { ready: customFolder.length === 0 })
  const openedPaths = customFolder.length ? customFolder : fallbackFolder ? [fallbackFolder] : []
  const visiblePaths = openedPaths.filter(
    (item) => item.isFolder || getPathBaseName(item.path).toLowerCase().includes(query),
  )
  const listFillHeight = visiblePaths.length === 1

  if (!openedPaths.length) {
    return loading ? (
      <YakitSpin />
    ) : (
      <MentionSidebarEmpty query={query} onClose={onClose} tab={AIAgentTabListEnum.File} />
    )
  }

  return (
    <div
      className={classNames(styles['file-system-tree-of-mention'], {
        [styles['file-system-tree-of-mention-virtual']]: listFillHeight,
      })}
    >
      {visiblePaths.map((item) => (
        <FileTreeSystemList
          key={item.path}
          path={item.path}
          isOpen={false}
          isShowRightMenu={false}
          checkable
          isFolder={item.isFolder}
          fillHeight={listFillHeight}
          searchQuery={query}
          selected={selected}
          setSelected={setSelected}
          checkedKeys={[]}
          setCheckedKeys={(_, node) => onSelect(node.isFolder ? 'folder' : 'file', { id: node.path, name: node.path })}
        />
      ))}
      {query && <MentionSidebarEmpty query={query} tab={AIAgentTabListEnum.File} />}
    </div>
  )
}
