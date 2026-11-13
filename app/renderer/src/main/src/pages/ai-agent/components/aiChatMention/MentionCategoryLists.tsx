import { useRef, useState } from 'react'
import type { FC } from 'react'
import classNames from 'classnames'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import { getPathBaseName } from '@/utils/str'
import BrowserMaterialList from '../../browserInstances/BrowserMaterialList/BrowserMaterialList'
import type { AIBrowserInstance } from '../../browserInstances/browserInstanceStore'
import type { HistoryItem } from '../aiFileSystemList/type'
import FileTreeSystemList from '../aiFileSystemList/FileTreeSystemList/FileTreeSystemList'
import { useMentionRowsKeyboard } from './hooks/useMentionRowsKeyboard'
import { browserMentionRow, matchesMentionKeyword } from './mentionListData'
import type { MentionListControls } from './type'
import styles from './AIChatMention.module.scss'

interface MentionBrowsersProps extends MentionListControls {
  query: string
  instances: AIBrowserInstance[]
}

const MentionSearchEmpty: FC = () => {
  const { t } = useI18nNamespaces(['aiAgent'])
  return (
    <div className={styles['search-empty']} role="status">
      {t('AIMentionTabs.searchEmpty')}
    </div>
  )
}

export const MentionBrowsers: FC<MentionBrowsersProps> = ({ query, instances, ...controls }) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const rows = instances.map(browserMentionRow).filter((item) => matchesMentionKeyword(item, query))
  const rowProps = useMentionRowsKeyboard(scrollRef, rows, controls, query)
  if (!rows.length) return <MentionSearchEmpty />
  return (
    <div className={styles.rows} ref={scrollRef} role="listbox">
      <BrowserMaterialList items={rows.map((row) => ({ instance: row.instance, option: rowProps(row) }))} />
    </div>
  )
}

interface MentionFileTreeProps extends Pick<MentionListControls, 'onSelect'> {
  query: string
  openedPaths: HistoryItem[]
}

export const MentionFileTree: FC<MentionFileTreeProps> = ({ onSelect, query, openedPaths }) => {
  const [selected, setSelected] = useState<FileNodeProps>()
  const visiblePaths = openedPaths.filter(
    (item) => item.isFolder || getPathBaseName(item.path).toLowerCase().includes(query),
  )
  const listFillHeight = visiblePaths.length === 1

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
      {query && <MentionSearchEmpty />}
    </div>
  )
}
