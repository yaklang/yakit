import { startTransition, useEffect, useMemo, useRef, useState } from 'react'
import { useCreation, useMemoizedFn } from 'ahooks'
import { YakitCombinationSearch } from '@/components/YakitCombinationSearch/YakitCombinationSearch'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitDropdownMenu } from '@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import { getFileIconByName } from '@/pages/ai-agent/utils/getFileIconByName'
import { TextDropdownTrigger } from '@/pages/ai-agent/components/TextDropdownTrigger/TextDropdownTrigger'
import emiter from '@/utils/eventBus/eventBus'
import { AITabsEnum } from '../../../defaultConstant'
import { useFileSearch } from './useFileSearch'
import FileSearchResultItem from './FileSearchResultItem'
import { toEditorHighlights } from './utils'
import type { FileSearchLine } from './type'
import {
  FILE_TREE_SEARCH_SCOPE_OPTIONS,
  FileTreeSearchScope,
  FileTreeSearchType,
  resolveFileTreeSearchEmptyKind,
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
  /** 进入搜索时预设的范围（全部 / ai文件夹 / 用户文件夹） */
  scopePreset?: FileTreeSearchScopeValue
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

const FileTreeSearchView: React.FC<FileTreeSearchViewProps> = ({ active = false, scopePreset, setSelected }) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const rootRef = useRef<HTMLDivElement>(null)
  const prevActiveRef = useRef(active)
  const [scopeOpen, setScopeOpen] = useState(false)
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

  // 仅在进入搜索面板时应用 preset，避免面板内改范围被父级旧值冲掉
  useEffect(() => {
    const entered = active && !prevActiveRef.current
    prevActiveRef.current = active
    if (entered && scopePreset !== undefined) setScope(scopePreset)
  }, [active, scopePreset, setScope])

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
    () => FILE_TREE_SEARCH_SCOPE_OPTIONS.map((item) => ({ value: item.value, label: t(item.labelKey) })),
    [t],
  )

  const currentScopeLabel = useMemo(
    () => scopeOptions.find((item) => item.value === scope)?.label || t('FileTreeSearch.all'),
    [scope, scopeOptions, t],
  )

  const onSelectSearchType = useMemoizedFn((value: string) => {
    setSearchType(value as FileTreeSearchTypeValue)
  })

  const onSelectScope = useMemoizedFn(({ key }: { key: string }) => {
    if (!key || key === scope) return
    setScope(key as FileTreeSearchScopeValue)
  })

  const scopeMenu = useCreation(
    () => ({
      data: scopeOptions.map((item) => ({ key: item.value, label: item.label })),
      selectedKeys: [scope],
      onClick: onSelectScope,
    }),
    [scopeOptions, scope, onSelectScope],
  )

  const onSearchAllFolders = useMemoizedFn(() => {
    setScope(FileTreeSearchScope.All)
  })

  const onOpenFile = useMemoizedFn((path: string, line?: FileSearchLine) => {
    const name = path.split(/[\\/]/).pop() || path
    const hit = results.find((item) => item.path === path)
    const highlights = toEditorHighlights(line ? [line] : hit?.searchResult.results || [])
    // 先开预览，树选中降到 transition，减少点击瞬间主线程争用
    emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.File_Preview, value: path, highlights }))
    startTransition(() => {
      setSelected?.({
        parent: null,
        name,
        path,
        isFolder: false,
        icon: getFileIconByName(name),
        depth: 0,
        isLeaf: true,
      })
    })
  })

  const emptyKind = useMemo(
    () => resolveFileTreeSearchEmptyKind({ searched, hasSearchPath, scope }),
    [searched, hasSearchPath, scope],
  )

  const emptyDescription = useMemo(() => {
    if (emptyKind === 'searchAll') {
      return (
        <YakitButton type="outline1" data-testid="file-tree-search-all" onClick={onSearchAllFolders}>
          {t('FileTreeSearch.searchAllFolders')}
        </YakitButton>
      )
    }
    if (emptyKind === 'noResult') return t('FileTreeSearch.emptyNoResult')
    return t('FileTreeSearch.emptyHint')
  }, [emptyKind, t, onSearchAllFolders])

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
        <YakitDropdownMenu
          menu={scopeMenu}
          dropdown={{
            trigger: ['click'],
            placement: 'bottomLeft',
            open: scopeOpen,
            onOpenChange: setScopeOpen,
          }}
        >
          <TextDropdownTrigger
            label={currentScopeLabel}
            open={scopeOpen}
            data-testid="file-tree-search-scope"
            aria-label={currentScopeLabel}
          />
        </YakitDropdownMenu>
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
