import { useEffect, useMemo, useRef } from 'react'
import { useMemoizedFn } from 'ahooks'
import { YakitCombinationSearch } from '@/components/YakitCombinationSearch/YakitCombinationSearch'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import { getFileIconByName } from '@/pages/ai-agent/utils/getFileIconByName'
import emiter from '@/utils/eventBus/eventBus'
import { AITabsEnum } from '../../../defaultConstant'
import { useFileSearch } from './useFileSearch'
import FileSearchResultItem from './FileSearchResultItem'
import { toEditorHighlights } from './utils'
import type { FileSearchLine } from './type'
import {
  FileTreeSearchScope,
  FileTreeSearchType,
  SEARCH_INPUT_FOCUS_DELAY_MS,
  type FileTreeSearchScopeValue,
  type FileTreeSearchTypeValue,
} from './constants'
import styles from './FileTreeSearchView.module.scss'

export { FileTreeSearchType, FileTreeSearchScope } from './constants'
export type { FileTreeSearchTypeValue, FileTreeSearchScopeValue } from './constants'

interface FileTreeSearchViewProps {
  /** 搜索面板是否处于展示态（用于进入时聚焦输入框） */
  active?: boolean
  setSelected?: (selected?: FileNodeProps) => void
}

const focusSearchInput = (root: HTMLElement | null) => {
  if (!root) return
  const input =
    root.querySelector<HTMLInputElement>('.ant-input-search input') ||
    root.querySelector<HTMLInputElement>('input[type="search"]') ||
    root.querySelector<HTMLInputElement>('[role="searchbox"]')
  input?.focus()
}

const FileTreeSearchView: React.FC<FileTreeSearchViewProps> = ({ active = false, setSelected }) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const rootRef = useRef<HTMLDivElement>(null)
  const {
    keyword,
    setKeyword,
    searchType,
    setSearchType,
    scope,
    setScope,
    loading,
    searched,
    hasSearchPath,
    results,
    onSearch,
  } = useFileSearch()

  useEffect(() => {
    if (!active) return
    const timer = window.setTimeout(() => focusSearchInput(rootRef.current), SEARCH_INPUT_FOCUS_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [active])

  const searchTypeOptions = useMemo(
    () => [
      { label: t('FileTreeSearch.keyword'), value: FileTreeSearchType.Keyword },
      { label: t('FileTreeSearch.regexp'), value: FileTreeSearchType.Regexp },
    ],
    [t],
  )

  const scopeOptions = useMemo(
    () => [
      { label: t('FileTreeSearch.all'), value: FileTreeSearchScope.All },
      { label: t('FileTreeSearch.aiFolder'), value: FileTreeSearchScope.AiFolder },
      { label: t('FileTreeSearch.userFolder'), value: FileTreeSearchScope.UserFolder },
    ],
    [t],
  )

  const onSelectSearchType = useMemoizedFn((value: string) => {
    setSearchType(value as FileTreeSearchTypeValue)
  })

  const onSelectScope = useMemoizedFn((value: FileTreeSearchScopeValue) => {
    setScope(value)
  })

  const onOpenFile = useMemoizedFn((path: string, line?: FileSearchLine) => {
    const name = path.split(/[\\/]/).pop() || path
    setSelected?.({
      parent: null,
      name,
      path,
      isFolder: false,
      icon: getFileIconByName(name),
      depth: 0,
      isLeaf: true,
    })
    const hit = results.find((item) => item.path === path)
    const highlights = toEditorHighlights(line ? [line] : hit?.searchResult.results || [])
    emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.File_Preview, value: path, highlights }))
  })

  const emptyDescription = useMemo(() => {
    if (!searched || !hasSearchPath) return t('FileTreeSearch.emptyHint')
    return t('FileTreeSearch.emptyNoResult')
  }, [searched, hasSearchPath, t])

  return (
    <div ref={rootRef} className={styles['file-tree-search-view']} data-testid="file-tree-search-view">
      <div className={styles['search-bar']}>
        <YakitCombinationSearch
          beforeOptionWidth={76}
          valueBeforeOption={searchType}
          onSelectBeforeOption={onSelectSearchType}
          addonBeforeOption={searchTypeOptions}
          wrapperClassName={styles['combination-search']}
          selectProps={{ size: 'small' }}
          inputSearchModuleTypeProps={{
            size: 'middle',
            value: keyword,
            autoFocus: active,
            placeholder: t('YakitInput.searchKeyWordPlaceholder'),
            onChange: (e) => setKeyword(e.target.value),
            onSearch,
          }}
        />
      </div>
      <div className={styles['scope-bar']}>
        <YakitSelect
          size="small"
          value={scope}
          options={scopeOptions}
          onChange={onSelectScope}
          wrapperClassName={styles['scope-select']}
          getPopupContainer={(node) => node.parentElement || document.body}
        />
      </div>
      <div className={styles['results']} data-testid="file-tree-search-results">
        {loading ? (
          <div className={styles['loading']} data-testid="file-tree-search-loading">
            <YakitSpin size="small" wrapperClassName={styles['loading-spin']}>
              <div className={styles['loading-placeholder']} />
            </YakitSpin>
          </div>
        ) : results.length > 0 ? (
          results.map((item) => <FileSearchResultItem key={item.path} item={item} onOpen={onOpenFile} />)
        ) : (
          <YakitEmpty className={styles['empty']} description={emptyDescription} />
        )}
      </div>
    </div>
  )
}

export default FileTreeSearchView
