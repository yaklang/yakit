import { startTransition, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useCreation, useMemoizedFn } from 'ahooks'
import { useStore } from 'zustand'
import { YakitDropdownMenu } from '@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import type { YakitMenuItemType } from '@/components/yakitUI/YakitMenu/YakitMenu'
import { ChevronDownOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import {
  FileTreeContentSearchView,
  resolveOpenHighlights,
  useClearFileSearchHighlights,
  type FileSearchFileItem,
  type FileSearchLine,
  type FileTreeSearchEmptyContext,
} from '@/components/FileTreeContentSearch'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import { getFileIconByName } from '@/pages/yakRunner/FileTree/icon'
import { TextDropdownTrigger } from '@/pages/ai-agent/components/TextDropdownTrigger/TextDropdownTrigger'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useCustomFolder } from '../../../components/aiFileSystemList/store/useCustomFolder'
import emiter from '@/utils/eventBus/eventBus'
import { AITabsEnum } from '../../../defaultConstant'
import useAIAgentStore from '../../../useContext/useStore'
import { usePreviewOpenFiles } from '../store/usePreviewOpenFiles'
import { getPathBaseName, resolveSearchPaths } from './utils'
import {
  FILE_TREE_SEARCH_SCOPE_OPTIONS,
  FileTreeSearchScope,
  parseCurrentOpenMenuKey,
  parseUserScopeMenuKey,
  resolveFileTreeSearchEmptyKind,
  toCurrentOpenMenuKey,
  toUserScopeMenuKey,
  type FileTreeSearchScopeValue,
} from './constants'

interface FileTreeSearchViewProps {
  /** 搜索面板是否处于展示态（用于进入时聚焦输入框） */
  active?: boolean
  /** 进入搜索时预设的范围（全部 / ai文件夹 / 用户文件夹 / 当前打开） */
  scopePreset?: FileTreeSearchScopeValue
  /** 进入搜索时预设的单路径（UserFolder / CurrentOpen 二级） */
  scopePathPreset?: string
  setSelected?: (selected?: FileNodeProps) => void
}

interface ScopeDropdownProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  menu: {
    data: YakitMenuItemType[]
    selectedKeys: string[]
    parentTitleClick: boolean
    onClick: (info: { key: string }) => void
  }
  placement?: 'bottomLeft' | 'bottom'
  children: ReactNode
}

/** 工具栏与空态共用同一套范围下拉 */
const ScopeDropdown: React.FC<ScopeDropdownProps> = ({
  open,
  onOpenChange,
  menu,
  placement = 'bottomLeft',
  children,
}) => (
  <YakitDropdownMenu
    menu={menu}
    dropdown={{
      trigger: ['click'],
      placement,
      open,
      onOpenChange,
    }}
  >
    {children}
  </YakitDropdownMenu>
)

/** AI 文件树内容搜索：复用通用面板，仅保留范围选择与打开预览逻辑 */
const FileTreeSearchView: React.FC<FileTreeSearchViewProps> = ({
  active = false,
  scopePreset,
  scopePathPreset,
  setSelected,
}) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const { pageId } = useAIAgentStore()
  const store = useCurrentStore()
  const grpcFolders = useStore(store, (state) => state.grpcFolders)
  const customFolder = useCustomFolder()
  const previewOpenFiles = usePreviewOpenFiles(pageId)
  const prevActiveRef = useRef(active)
  const [scopeOpen, setScopeOpen] = useState(false)
  const [emptyScopeOpen, setEmptyScopeOpen] = useState(false)
  const [scope, setScope] = useState<FileTreeSearchScopeValue>(FileTreeSearchScope.All)
  /** UserFolder 下指定单个已打开路径；多文件二级菜单选中时使用 */
  const [userScopePath, setUserScopePath] = useState<string>()
  /** CurrentOpen 下指定单个预览文件路径 */
  const [currentOpenPath, setCurrentOpenPath] = useState<string>()
  const [roots, setRoots] = useState<{ path: string }[]>([])

  // 仅在进入搜索面板时应用 preset，避免面板内改范围被父级旧值冲掉
  useEffect(() => {
    const entered = active && !prevActiveRef.current
    prevActiveRef.current = active
    if (!entered || scopePreset === undefined) return

    // 无预览文件时忽略「当前打开」preset
    if (scopePreset === FileTreeSearchScope.CurrentOpen && previewOpenFiles.length === 0) {
      setScope(FileTreeSearchScope.All)
      setUserScopePath(undefined)
      setCurrentOpenPath(undefined)
      return
    }

    setScope(scopePreset)
    const path = scopePathPreset?.trim()
    if (scopePreset === FileTreeSearchScope.UserFolder && path) {
      setUserScopePath(path)
      setCurrentOpenPath(undefined)
      return
    }
    if (scopePreset === FileTreeSearchScope.CurrentOpen && path) {
      setCurrentOpenPath(path)
      setUserScopePath(undefined)
      return
    }
    setUserScopePath(undefined)
    setCurrentOpenPath(undefined)
  }, [active, scopePreset, scopePathPreset, previewOpenFiles.length])

  // 已打开路径被移除时，清掉失效的单路径选择
  useEffect(() => {
    if (!userScopePath) return
    if (!customFolder.some((item) => item.path === userScopePath)) {
      setUserScopePath(undefined)
    }
  }, [customFolder, userScopePath])

  // 预览 tab 关闭时，清掉失效的单文件选择；全部关闭则回退到全部
  useEffect(() => {
    if (scope !== FileTreeSearchScope.CurrentOpen) return
    if (previewOpenFiles.length === 0) {
      setScope(FileTreeSearchScope.All)
      setCurrentOpenPath(undefined)
      return
    }
    if (currentOpenPath && !previewOpenFiles.some((item) => item.path === currentOpenPath)) {
      setCurrentOpenPath(undefined)
    }
  }, [scope, previewOpenFiles, currentOpenPath])

  useEffect(() => {
    let cancelled = false
    resolveSearchPaths(scope, grpcFolders, customFolder, {
      userScopePath,
      previewOpenFiles,
      currentOpenPath,
    }).then((next) => {
      if (!cancelled) setRoots(next)
    })
    return () => {
      cancelled = true
    }
  }, [scope, grpcFolders, customFolder, userScopePath, previewOpenFiles, currentOpenPath])

  const scopeOptions = useMemo(() => {
    return FILE_TREE_SEARCH_SCOPE_OPTIONS.filter((item) => {
      if (item.value === FileTreeSearchScope.CurrentOpen) return previewOpenFiles.length > 0
      if (item.value === FileTreeSearchScope.AiFolder) return grpcFolders.length > 0
      return true
    }).map((item) => ({ value: item.value, label: t(item.labelKey) }))
  }, [t, previewOpenFiles.length, grpcFolders.length])

  const currentScopeLabel = useMemo(() => {
    if (scope === FileTreeSearchScope.UserFolder && userScopePath) {
      return getPathBaseName(userScopePath)
    }
    if (scope === FileTreeSearchScope.CurrentOpen && currentOpenPath) {
      return getPathBaseName(currentOpenPath)
    }
    return scopeOptions.find((item) => item.value === scope)?.label || t('FileTreeSearch.all')
  }, [scope, userScopePath, currentOpenPath, scopeOptions, t])

  /** 只改范围 state；roots 更新后由 useFileContentSearch 的 useEffect 自动重搜 */
  const onSelectScope = useMemoizedFn(({ key }: { key: string }) => {
    if (!key) return

    const userPath = parseUserScopeMenuKey(key)
    if (userPath !== undefined) {
      setScope(FileTreeSearchScope.UserFolder)
      setUserScopePath(userPath)
      setCurrentOpenPath(undefined)
    } else {
      const openPath = parseCurrentOpenMenuKey(key)
      if (openPath !== undefined) {
        setScope(FileTreeSearchScope.CurrentOpen)
        setCurrentOpenPath(openPath)
        setUserScopePath(undefined)
      } else if (
        // 同范围重复点击忽略；二级菜单选中单路径后再点父项，则回到该范围全部
        !(
          key === scope &&
          !(scope === FileTreeSearchScope.UserFolder && userScopePath) &&
          !(scope === FileTreeSearchScope.CurrentOpen && currentOpenPath)
        )
      ) {
        setScope(key as FileTreeSearchScopeValue)
        setUserScopePath(undefined)
        setCurrentOpenPath(undefined)
      }
    }

    setEmptyScopeOpen(false)
    setScopeOpen(false)
  })

  const scopeMenuData = useMemo((): YakitMenuItemType[] => {
    return scopeOptions.map((item) => {
      if (item.value === FileTreeSearchScope.UserFolder) {
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
      }
      if (item.value === FileTreeSearchScope.CurrentOpen) {
        // 多个预览 tab 才出二级菜单；仅一个时保持一级项
        if (previewOpenFiles.length > 1) {
          return {
            key: item.value,
            label: item.label,
            children: previewOpenFiles.map((file) => ({
              key: toCurrentOpenMenuKey(file.path),
              label: file.name || getPathBaseName(file.path),
              title: file.path,
            })),
          }
        }
        return { key: item.value, label: item.label }
      }
      return { key: item.value, label: item.label }
    })
  }, [scopeOptions, customFolder, previewOpenFiles])

  const scopeMenu = useCreation(
    () => ({
      data: scopeMenuData,
      selectedKeys: [
        scope === FileTreeSearchScope.UserFolder && userScopePath
          ? toUserScopeMenuKey(userScopePath)
          : scope === FileTreeSearchScope.CurrentOpen && currentOpenPath
            ? toCurrentOpenMenuKey(currentOpenPath)
            : scope,
      ],
      // 有二级菜单时，点击父项仍可选中该范围下全部路径
      parentTitleClick: true,
      onClick: onSelectScope,
    }),
    [scopeMenuData, scope, userScopePath, currentOpenPath, onSelectScope],
  )

  // Enter 时按当前 state 解析，避免 roots effect 尚未写回
  const resolveRoots = useMemoizedFn(() =>
    resolveSearchPaths(scope, grpcFolders, customFolder, {
      userScopePath,
      previewOpenFiles,
      currentOpenPath,
    }),
  )

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

  const { onSearchSettled } = useClearFileSearchHighlights(!!active, () => {
    emiter.emit('clearAIFilePreviewSearchHighlights')
  })

  // 空态与工具栏共用 scopeMenu；切范围后 roots 变化触发自动重搜
  const emptyDescription = useMemo(
    () =>
      ({ searched, hasSearchPath }: FileTreeSearchEmptyContext) => {
        const emptyKind = resolveFileTreeSearchEmptyKind({ searched, hasSearchPath, scope })
        if (emptyKind === 'searchAll') {
          return (
            <div data-testid="file-tree-search-empty-scope">
              <ScopeDropdown open={emptyScopeOpen} onOpenChange={setEmptyScopeOpen} menu={scopeMenu} placement="bottom">
                <YakitButton type="outline1" data-testid="file-tree-search-all">
                  {t('FileTreeSearch.changeSearchScope')}
                  <ChevronDownOutlined
                    color="currentColor"
                    size={14}
                    style={{
                      marginLeft: 4,
                      transition: 'transform 0.2s',
                      transform: emptyScopeOpen ? 'rotate(180deg)' : undefined,
                    }}
                  />
                </YakitButton>
              </ScopeDropdown>
            </div>
          )
        }
        if (emptyKind === 'noResult') return t('FileTreeSearch.emptyNoResult')
        // hint（未搜索 / 无可搜路径）：不展示空态插画，留白
        return null
      },
    [scope, t, scopeMenu, emptyScopeOpen],
  )

  const toolbarExtra = (
    <ScopeDropdown open={scopeOpen} onOpenChange={setScopeOpen} menu={scopeMenu}>
      <TextDropdownTrigger
        label={currentScopeLabel}
        open={scopeOpen}
        data-testid="file-tree-search-scope"
        aria-label={currentScopeLabel}
      />
    </ScopeDropdown>
  )

  return (
    <FileTreeContentSearchView
      active={active}
      roots={roots}
      resolveRoots={resolveRoots}
      onOpen={onOpenFile}
      onSearchSettled={onSearchSettled}
      toolbarExtra={toolbarExtra}
      emptyDescription={emptyDescription}
      data-testid="file-tree-search-view"
      resultsTestId="file-tree-search-results"
      loadingTestId="file-tree-search-loading"
    />
  )
}

export default FileTreeSearchView
