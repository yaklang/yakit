import { useRef, useState } from 'react'
import type { FC } from 'react'
import classNames from 'classnames'
import { useMemoizedFn } from 'ahooks'
import { FolderOpenOutlined, PaperClipOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { handleOpenFileSystemDialog } from '@/utils/fileSystemDialog'
import { yakitNotify } from '@/utils/notification'
import type { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import { getPathBaseName } from '@/utils/str'
import BrowserMaterialList from '../../browserInstances/BrowserMaterialList/BrowserMaterialList'
import type { AIBrowserInstance } from '../../browserInstances/browserInstanceStore'
import { MAX_ATTACHMENTS_PER_BATCH } from '../../template/type'
import type { HistoryItem } from '../aiFileSystemList/type'
import { historyStore } from '../aiFileSystemList/store/useHistoryFolder'
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
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const [selected, setSelected] = useState<FileNodeProps>()
  const visiblePaths = openedPaths.filter(
    (item) => item.isFolder || getPathBaseName(item.path).toLowerCase().includes(query),
  )
  const listFillHeight = visiblePaths.length === 1

  const openLocal = useMemoizedFn(async (isFolder: boolean) => {
    try {
      const { filePaths } = await handleOpenFileSystemDialog({
        title: t(isFolder ? 'YakitButton.openFolder' : 'YakitButton.openFile'),
        properties: [isFolder ? 'openDirectory' : 'openFile', 'multiSelections'],
      })
      if (filePaths.length > MAX_ATTACHMENTS_PER_BATCH) {
        yakitNotify(
          'warning',
          t('AIAddMaterialsPopover.attachmentLimitExceeded', {
            count: filePaths.length,
            max: MAX_ATTACHMENTS_PER_BATCH,
          }),
        )
        return
      }
      for (const path of filePaths) {
        await historyStore.addHistoryItem({ path, isFolder })
      }
    } catch (error) {
      yakitNotify('error', t('AIAddMaterialsPopover.attachmentFailed', { error: String(error) }))
    }
  })

  return (
    <div className={styles['file-system-of-mention']}>
      <div className={styles['open-local-actions']}>
        <YakitButton type="text2" className={styles['open-local-item']} onClick={() => openLocal(false)}>
          <span className={styles['open-local-icon']} aria-hidden="true">
            <PaperClipOutlined size={16} />
          </span>
          <span className={styles['open-local-title']}>{t('YakitButton.openFile')}</span>
          <span className={styles['open-local-description']}>
            {t('AIMentionTabs.openLocalFileHint', { max: MAX_ATTACHMENTS_PER_BATCH })}
          </span>
        </YakitButton>
        <YakitButton type="text2" className={styles['open-local-item']} onClick={() => openLocal(true)}>
          <span className={styles['open-local-icon']} aria-hidden="true">
            <FolderOpenOutlined size={16} />
          </span>
          <span className={styles['open-local-title']}>{t('YakitButton.openFolder')}</span>
          <span className={styles['open-local-description']}>
            {t('AIMentionTabs.openLocalFolderHint', { max: MAX_ATTACHMENTS_PER_BATCH })}
          </span>
        </YakitButton>
      </div>
      {visiblePaths.length > 0 && (
        <header className={styles['loaded-files-header']}>
          <span className={styles['loaded-files-title']}>{t('AIMentionTabs.loadedFiles')}</span>
        </header>
      )}
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
            setCheckedKeys={(_, node) =>
              onSelect(node.isFolder ? 'folder' : 'file', { id: node.path, name: node.path })
            }
          />
        ))}
        {query && <MentionSearchEmpty />}
      </div>
    </div>
  )
}
