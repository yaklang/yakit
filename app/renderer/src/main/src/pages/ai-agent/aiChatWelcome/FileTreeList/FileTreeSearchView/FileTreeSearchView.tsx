import { startTransition, useEffect, useMemo, useRef, useState } from 'react'
import { useCreation, useMemoizedFn } from 'ahooks'
import { useStore } from 'zustand'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitDropdownMenu } from '@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import {
  FileTreeContentSearchView,
  FileTreeSearchType,
  resolveOpenHighlights,
  type FileSearchFileItem,
  type FileSearchLine,
  type FileTreeSearchTypeValue,
} from '@/components/FileTreeContentSearch'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import { getFileIconByName } from '@/pages/ai-agent/utils/getFileIconByName'
import { TextDropdownTrigger } from '@/pages/ai-agent/components/TextDropdownTrigger/TextDropdownTrigger'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useCustomFolder } from '../../../components/aiFileSystemList/store/useCustomFolder'
import emiter from '@/utils/eventBus/eventBus'
import { AITabsEnum } from '../../../defaultConstant'
import { resolveSearchPaths } from './utils'
import {
  FILE_TREE_SEARCH_SCOPE_OPTIONS,
  FileTreeSearchScope,
  resolveFileTreeSearchEmptyKind,
  type FileTreeSearchScopeValue,
} from './constants'

export { FileTreeSearchType, FileTreeSearchScope }
export type { FileTreeSearchTypeValue, FileTreeSearchScopeValue }

interface FileTreeSearchViewProps {
  /** 搜索面板是否处于展示态（用于进入时聚焦输入框） */
  active?: boolean
  /** 进入搜索时预设的范围（全部 / ai文件夹 / 用户文件夹） */
  scopePreset?: FileTreeSearchScopeValue
  setSelected?: (selected?: FileNodeProps) => void
}

/** AI 文件树内容搜索：复用通用面板，仅保留范围选择与打开预览逻辑 */
const FileTreeSearchView: React.FC<FileTreeSearchViewProps> = ({ active = false, scopePreset, setSelected }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const store = useCurrentStore()
  const grpcFolders = useStore(store, (state) => state.grpcFolders)
  const customFolder = useCustomFolder()
  const prevActiveRef = useRef(active)
  const [scopeOpen, setScopeOpen] = useState(false)
  const [scope, setScope] = useState<FileTreeSearchScopeValue>(FileTreeSearchScope.All)

  // 仅在进入搜索面板时应用 preset，避免面板内改范围被父级旧值冲掉
  useEffect(() => {
    const entered = active && !prevActiveRef.current
    prevActiveRef.current = active
    if (entered && scopePreset !== undefined) setScope(scopePreset)
  }, [active, scopePreset])

  const roots = useMemo(() => resolveSearchPaths(scope, grpcFolders, customFolder), [scope, grpcFolders, customFolder])

  const scopeOptions = useMemo(
    () => FILE_TREE_SEARCH_SCOPE_OPTIONS.map((item) => ({ value: item.value, label: t(item.labelKey) })),
    [t],
  )

  const currentScopeLabel = useMemo(
    () => scopeOptions.find((item) => item.value === scope)?.label || t('FileTreeSearch.all'),
    [scope, scopeOptions, t],
  )

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

  const onOpenFile = useMemoizedFn((path: string, line?: FileSearchLine, fileItem?: FileSearchFileItem) => {
    const name = path.split(/[\\/]/).pop() || path
    const highlights = resolveOpenHighlights(line, fileItem)
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

  // 依赖 scope：两端 roots 相同时改范围不会触发 roots 变化，空态仍需切换
  const emptyDescription = useMemo(
    () =>
      ({ searched, hasSearchPath }: { searched: boolean; hasSearchPath: boolean }) => {
        const emptyKind = resolveFileTreeSearchEmptyKind({ searched, hasSearchPath, scope })
        if (emptyKind === 'searchAll') {
          return (
            <YakitButton type="outline1" data-testid="file-tree-search-all" onClick={onSearchAllFolders}>
              {t('FileTreeSearch.searchAllFolders')}
            </YakitButton>
          )
        }
        if (emptyKind === 'noResult') return t('FileTreeSearch.emptyNoResult')
        return t('FileTreeSearch.emptyHint')
      },
    [scope, t, onSearchAllFolders],
  )

  const toolbarExtra = (
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
  )

  return (
    <FileTreeContentSearchView
      active={active}
      roots={roots}
      onOpen={onOpenFile}
      toolbarExtra={toolbarExtra}
      emptyDescription={emptyDescription}
      data-testid="file-tree-search-view"
      resultsTestId="file-tree-search-results"
      loadingTestId="file-tree-search-loading"
    />
  )
}

export default FileTreeSearchView
