import { memo, useMemo, useState } from 'react'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import classNames from 'classnames'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { ChevronDownOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { getFileIconByName, KeyToIcon } from '@/pages/yakRunner/FileTree/icon'
import { clipLineAroundMatches, splitLineByMatches } from './utils'
import type { FileSearchFileItem, FileSearchLine } from './type'
import styles from './FileSearchResultItem.module.scss'

interface FileSearchResultItemProps {
  item: FileSearchFileItem
  /** line 为空表示打开整文件；第三参便于调用方取全量命中行做高亮 */
  onOpen: (path: string, line?: FileSearchLine, fileItem?: FileSearchFileItem) => void
}

const FileSearchResultItem: React.FC<FileSearchResultItemProps> = memo(({ item, onOpen }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const [expanded, setExpanded] = useState(true)
  const iconKey = getFileIconByName(item.name)
  const allLines = item.searchResult.results
  const matchCount = item.searchResult.match_count
  const displayLines = useMemo(
    () => (expanded ? allLines.map((line) => ({ line, display: clipLineAroundMatches(line) })) : []),
    [expanded, allLines],
  )

  return (
    <div className={styles['result-file']} data-testid="file-tree-search-result-item">
      <div className={styles['result-file-header']}>
        <YakitButton
          type="text"
          data-testid="file-tree-search-result-toggle"
          title={expanded ? t('FileTreeSearch.collapseMatches') : t('FileTreeSearch.expandMatches')}
          aria-expanded={expanded}
          onClick={(e) => {
            e.stopPropagation()
            setExpanded((v) => !v)
          }}
          icon={
            <ChevronDownOutlined
              color="currentColor"
              className={classNames(styles['result-file-chevron'], {
                [styles['result-file-chevron-collapsed']]: !expanded,
              })}
            />
          }
        />
        <YakitButton
          type="text"
          className={styles['result-file-main']}
          title={item.path}
          aria-label={item.name}
          onClick={() => onOpen(item.path, undefined, item)}
        >
          <img className={styles['result-file-icon']} src={KeyToIcon[iconKey].iconPath} alt="" />
          <span className={styles['result-file-name']}>{item.name}</span>
          <YakitTag
            size="small"
            fullRadius
            border={false}
            className={styles['result-file-count']}
            title={t('FileTreeSearch.matchCount', { count: matchCount })}
            data-testid="file-tree-search-result-count"
          >
            {matchCount}
          </YakitTag>
        </YakitButton>
      </div>
      {displayLines.map(({ line, display }) => (
        <YakitButton
          key={line.line}
          type="text"
          className={styles['result-line']}
          data-testid="file-tree-search-result-line"
          title={line.text}
          aria-label={`${line.line}: ${line.text}`}
          onClick={() => onOpen(item.path, line, item)}
        >
          <span className={styles['result-line-no']}>{line.line}</span>
          <span className={styles['result-line-text']}>
            {splitLineByMatches(display).map((segment, index) =>
              segment.hit ? (
                <span key={index} className={styles['result-line-hit']} data-testid="file-tree-search-result-hit">
                  {segment.text}
                </span>
              ) : (
                <span key={index}>{segment.text}</span>
              ),
            )}
          </span>
        </YakitButton>
      ))}
    </div>
  )
})

FileSearchResultItem.displayName = 'FileSearchResultItem'

export default FileSearchResultItem
