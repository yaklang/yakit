import { startTransition, useEffect, useMemo, useRef, useState } from 'react'
import { useCreation, useMemoizedFn } from 'ahooks'
import { useStore } from 'zustand'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitDropdownMenu } from '@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import type { YakitMenuItemType } from '@/components/yakitUI/YakitMenu/YakitMenu'
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
import { getPathBaseName, resolveSearchPaths } from './utils'
import {
  FILE_TREE_SEARCH_SCOPE_OPTIONS,
  FileTreeSearchScope,
  parseUserScopeMenuKey,
  resolveFileTreeSearchEmptyKind,
  toUserScopeMenuKey,
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
  /** UserFolder 下指定单个已打开路径；多文件二级菜单选中时使用 */
  const [userScopePath, setUserScopePath] = useState<string>()
  const [roots, setRoots] = useState<{ path: string }[]>([])

  // 仅在进入搜索面板时应用 preset，避免面板内改范围被父级旧值冲掉
  useEffect(() => {
    const entered = active && !prevActiveRef.current
    prevActiveRef.current = active
    if (entered && scopePreset !== undefined) {
      setScope(scopePreset)
      setUserScopePath(undefined)
    }
  }, [active, scopePreset])

  // 已打开路径被移除时，清掉失效的单路径选择
  useEffect(() => {
    if (!userScopePath) return
    if (!customFolder.some((item) => item.path === userScopePath)) {
      setUserScopePath(undefined)
    }
  }, [customFolder, userScopePath])

  // AI pin 经路径包含关系合并后再作为搜索根（父路径吞掉子路径）
  useEffect(() => {
    let cancelled = false
    resolveSearchPaths(scope, grpcFolders, customFolder, userScopePath).then((next) => {
      if (!cancelled) setRoots(next)
    })
    return () => {
      cancelled = true
    }
  }, [scope, grpcFolders, customFolder, userScopePath])

  const scopeOptions = useMemo(
    () => FILE_TREE_SEARCH_SCOPE_OPTIONS.map((item) => ({ value: item.value, label: t(item.labelKey) })),
    [t],
  )

  const currentScopeLabel = useMemo(() => {
    if (scope === FileTreeSearchScope.UserFolder && userScopePath) {
      return getPathBaseName(userScopePath)
    }
    return scopeOptions.find((item) => item.value === scope)?.label || t('FileTreeSearch.all')
  }, [scope, userScopePath, scopeOptions, t])

  const onSelectScope = useMemoizedFn(({ key }: { key: string }) => {
    if (!key) return
    const path = parseUserScopeMenuKey(key)
    if (path !== undefined) {
      setScope(FileTreeSearchScope.UserFolder)
      setUserScopePath(path)
      return
    }
    if (key === scope && !(scope === FileTreeSearchScope.UserFolder && userScopePath)) return
    setScope(key as FileTreeSearchScopeValue)
    setUserScopePath(undefined)
  })

  const scopeMenuData = useMemo((): YakitMenuItemType[] => {
    return scopeOptions.map((item) => {
      if (item.value !== FileTreeSearchScope.UserFolder) {
        return { key: item.value, label: item.label }
      }
      // 多个已打开路径才出二级菜单；仅一个时保持一级项
      if (customFolder.length > 1) {
        return {
          key: item.value,
          label: item.label,
          children: customFolder.map((folder) => ({
            key: toUserScopeMenuKey(folder.path),
            label: getPathBaseName(folder.path),
            title: folder.path,
          })),
        }
      }
      return { key: item.value, label: item.label }
    })
  }, [scopeOptions, customFolder])

  const scopeMenu = useCreation(
    () => ({
      data: scopeMenuData,
      selectedKeys: [
        scope === FileTreeSearchScope.UserFolder && userScopePath ? toUserScopeMenuKey(userScopePath) : scope,
      ],
      // 有二级菜单时，点击「我打开的文件」仍可选中全部用户路径
      parentTitleClick: true,
      onClick: onSelectScope,
    }),
    [scopeMenuData, scope, userScopePath, onSelectScope],
  )

  const onSearchAllFolders = useMemoizedFn(() => {
    setScope(FileTreeSearchScope.All)
    setUserScopePath(undefined)
  })

  const onOpenFile = useMemoizedFn((path: string, line?: FileSearchLine, fileItem?: FileSearchFileItem) => {
    const name = getPathBaseName(path)
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
