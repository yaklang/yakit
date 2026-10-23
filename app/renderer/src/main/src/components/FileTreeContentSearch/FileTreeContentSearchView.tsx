import { useEffect, useMemo, useRef, useState, type FC, type ReactNode } from 'react'
import { YakitCombinationSearch } from '@/components/YakitCombinationSearch/YakitCombinationSearch'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import FileSearchResultItem from './FileSearchResultItem'
import { useFileContentSearch } from './useFileContentSearch'
import {
  FileTreeSearchType,
  SEARCH_CANCEL_VISIBLE_MS,
  SEARCH_INPUT_FOCUS_DELAY_MS,
  type FileTreeSearchTypeValue,
} from './constants'
import type { FileSearchFileItem, FileSearchLine } from './type'
import styles from './FileTreeContentSearchView.module.scss'

export interface FileTreeSearchEmptyContext {
  searched: boolean
  hasSearchPath: boolean
  onSearch: (value?: string) => void
}

export interface FileTreeContentSearchViewProps {
  /** 搜索面板是否处于展示态（用于进入时聚焦输入框） */
  active?: boolean
  /** 搜索根路径（展示 / hasSearchPath） */
  roots: { path: string }[]
  /** Enter 时解析根路径；优先于静态 roots */
  resolveRoots?: () => Promise<{ path: string }[]> | { path: string }[]
  onOpen: (path: string, line?: FileSearchLine, fileItem?: FileSearchFileItem) => void
  /** 搜索栏下方插槽（如 AI 范围下拉） */
  toolbarExtra?: ReactNode
  /** 自定义空态；不传则用默认 hint / noResult；也可按搜索态动态返回 */
  emptyDescription?: ReactNode | ((ctx: FileTreeSearchEmptyContext) => ReactNode)
  'data-testid'?: string
  /** 结果列表 testid，默认 `${data-testid}-results` */
  resultsTestId?: string
  /** loading testid，默认 `${data-testid}-loading` */
  loadingTestId?: string
}

const focusSearchInput = (root: HTMLElement | null) => {
  if (!root) return
  const input =
    root.querySelector<HTMLInputElement>('.ant-input-search input') ||
    root.querySelector<HTMLInputElement>('input[type="search"]') ||
    root.querySelector<HTMLInputElement>('[role="searchbox"]')
  input?.focus()
}

/** 通用文件内容搜索面板：AI / yakRunner 等复用，业务差异通过 roots / onOpen / toolbarExtra 注入 */
const FileTreeContentSearchView: FC<FileTreeContentSearchViewProps> = ({
  active = false,
  roots,
  resolveRoots,
  onOpen,
  toolbarExtra,
  emptyDescription,
  'data-testid': dataTestId = 'file-tree-content-search-view',
  resultsTestId,
  loadingTestId,
}) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const rootRef = useRef<HTMLDivElement>(null)
  const {
    keyword,
    setKeyword,
    searchType,
    setSearchType,
    loading,
    searched,
    hasSearchPath,
    results,
    onSearch,
    onCancelSearch,
  } = useFileContentSearch({ roots, resolveRoots })
  const [showCancel, setShowCancel] = useState(false)

  useEffect(() => {
    if (!active) return
    const timer = window.setTimeout(() => focusSearchInput(rootRef.current), SEARCH_INPUT_FOCUS_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [active])

  useEffect(() => {
    if (!loading) {
      setShowCancel(false)
      return
    }
    const timer = window.setTimeout(() => setShowCancel(true), SEARCH_CANCEL_VISIBLE_MS)
    return () => window.clearTimeout(timer)
  }, [loading])

  const searchTypeOptions = useMemo(
    () => [
      { label: t('FileTreeSearch.keyword'), value: FileTreeSearchType.Keyword },
      { label: t('FileTreeSearch.regexp'), value: FileTreeSearchType.Regexp },
    ],
    [t],
  )

  const resolvedEmpty = useMemo(() => {
    if (typeof emptyDescription === 'function') {
      return emptyDescription({ searched, hasSearchPath, onSearch })
    }
    if (emptyDescription !== undefined) return emptyDescription
    return searched ? t('FileTreeSearch.emptyNoResult') : null
  }, [emptyDescription, searched, hasSearchPath, onSearch, t])

  const resultTotal = useMemo(() => results.reduce((sum, item) => sum + item.searchResult.match_count, 0), [results])
  const showResultTotal = !loading && searched

  let resultsContent: ReactNode = null
  if (loading) {
    resultsContent = (
      <div className={styles['loading']} data-testid={loadingTestId ?? `${dataTestId}-loading`}>
        <div className={styles['loading-center']}>
          <YakitSpin size="small" wrapperClassName={styles['loading-spin']} />
          {showCancel ? (
            <YakitButton type="outline2" size="small" data-testid={`${dataTestId}-cancel`} onClick={onCancelSearch}>
              {t('FileTreeSearch.cancelSearch')}
            </YakitButton>
          ) : null}
        </div>
      </div>
    )
  } else if (results.length > 0) {
    resultsContent = results.map((item) => <FileSearchResultItem key={item.path} item={item} onOpen={onOpen} />)
  } else if (resolvedEmpty != null) {
    resultsContent = <YakitEmpty className={styles['empty']} description={resolvedEmpty} />
  }

  return (
    <div ref={rootRef} className={styles['file-tree-search-view']} data-testid={dataTestId}>
      <div className={styles['search-bar']}>
        <YakitCombinationSearch
          beforeOptionWidth={76}
          valueBeforeOption={searchType}
          onSelectBeforeOption={(value) => setSearchType(value as FileTreeSearchTypeValue)}
          addonBeforeOption={searchTypeOptions}
          wrapperClassName={styles['combination-search']}
          selectProps={{ size: 'small' }}
          inputSearchModuleTypeProps={{
            size: 'middle',
            value: keyword,
            autoFocus: active,
            placeholder: t('YakitInput.searchKeyWordPlaceholder'),
            onChange: (e) => setKeyword(e.target.value),
            onSearch: (value) => onSearch(value),
          }}
        />
      </div>
      {toolbarExtra || showResultTotal ? (
        <div className={styles['scope-bar']}>
          {toolbarExtra ? <div className={styles['scope-bar-extra']}>{toolbarExtra}</div> : null}
          {showResultTotal ? (
            <YakitTag
              size="small"
              fullRadius
              border={false}
              className={styles['scope-result-total']}
              data-testid={`${dataTestId}-result-total`}
              title={t('FileTreeSearch.matchCount', { count: resultTotal })}
            >
              {resultTotal}
            </YakitTag>
          ) : null}
        </div>
      ) : null}
      <div className={styles['results']} data-testid={resultsTestId ?? `${dataTestId}-results`}>
        {resultsContent}
      </div>
    </div>
  )
}

export default FileTreeContentSearchView
