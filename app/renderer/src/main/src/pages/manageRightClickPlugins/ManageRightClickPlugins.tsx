import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Avatar } from 'antd'
import classNames from 'classnames'
import { useHover, useInViewport, useLatest, useMemoizedFn, useThrottleFn } from 'ahooks'
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DragUpdate,
  type DropResult,
  type ResponderProvided,
} from '@hello-pangea/dnd'
import { YakitRoute } from '@/enums/yakitRoute'
import { usePageInfo } from '@/store/pageInfo'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { yakitNotify } from '@/utils/notification'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { YakitDropdownMenu } from '@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import type { YakitMenuItemProps, YakitMenuItemType } from '@/components/yakitUI/YakitMenu/YakitMenu'
import { CloudDownloadIcon, DragSortIcon } from '@/assets/newIcon'
import {
  OutlineBanIcon,
  OutlineCogIcon,
  OutlinePencilaltIcon,
  OutlinePhotographIcon,
  OutlineRefreshIcon,
  OutlineXIcon,
} from '@/assets/icon/outline'
import { PrivateOutlineDefaultPluginIcon } from '@/routes/privateIcon'
import emiter from '@/utils/eventBus/eventBus'
import { convertKeyboardToUIKey, setIsActiveShortcutKeyPage } from '@/utils/globalShortcutKey/utils'
import { YakitKeyBoard } from '@/utils/globalShortcutKey/keyboard'
import type { YakScript } from '@/pages/invoker/schema'
import type { ModifyPluginCallback } from '@/pages/pluginEditor/pluginEditor/PluginEditor'
import { ModifyYakitPlugin } from '@/pages/pluginEditor/modifyYakitPlugin/ModifyYakitPlugin'
import { getMainOperatorPageBodyContainer } from '@/utils/getMainOperatorPageBodyContainer'
import { DROP_AVAILABLE, DROP_SELECTED, getGroupTabByKey, GroupTabList, UpperLimit } from './constants'
import { fetchSceneActions } from './utils'
import { grpcSetContextMenuActionBinding, grpcFetchLocalPluginDetailByUUID } from './api'
import type { ContextMenuAction } from './types'
import { ContextMenuResultMode, LEGACY_CONTEXT_MENU_PLUGIN_TYPE, type ContextMenuScene } from './types'
import { checkContextMenuShortcutConflict, parseContextMenuShortcut, serializeContextMenuShortcut } from './shortcut'
import styles from './ManageRightClickPlugins.module.scss'

/** 拖拽排序：将 startIndex 项移动到 endIndex */
const reorder = <T,>(list: T[], startIndex: number, endIndex: number) => {
  const result = [...list]
  const [removed] = result.splice(startIndex, 1)
  result.splice(endIndex, 0, removed)
  return result
}

interface ManageRightClickPluginsProps {}
const ManageRightClickPlugins: React.FC<ManageRightClickPluginsProps> = () => {
  // #region 基础 Hook 与可见性
  const { t, i18nRefresh } = useI18nNamespaces(['manageRightClickPlugins', 'yakitUi'])
  const pageInfo = usePageInfo((s) => {
    const currentItem = s.pages.get(YakitRoute.ManageRightClickPlugins)?.pageList?.[0]
    return currentItem?.pageParamsInfo?.manageRightClickPluginsPageInfo
  })
  const manageRightClickPluginsRef = useRef<HTMLDivElement>(null)
  const [inViewport] = useInViewport(manageRightClickPluginsRef)
  // #endregion

  // #region 当前选中的分组 tab
  const [currentTabKey, setCurrentTabKey] = useState<string>(() => pageInfo?.tab || GroupTabList[0].key)
  const currentTabKeyRef = useLatest(currentTabKey)
  /** 当前打开设置菜单的插件（保证同时只展开一个） */
  const [openSettingKey, setOpenSettingKey] = useState<string>('')
  useEffect(() => {
    if (pageInfo?.tab) {
      setCurrentTabKey(pageInfo.tab)
    }
  }, [pageInfo?.tab])
  const onSelectTab = useMemoizedFn((key: string) => {
    setCurrentTabKey(key)
    setOpenSettingKey('')
  })
  const currentGroupLabel = useMemo(() => {
    const labelKey = getGroupTabByKey(currentTabKey)?.label
    return labelKey ? t(labelKey) : currentTabKey
  }, [currentTabKey, i18nRefresh])
  // #endregion

  // #region 动作状态与引用
  /** 各 tab 下已启用（含顺序），以 tab.key 为索引 */
  const [actionsByTab, setActionsByTab] = useState<Record<string, ContextMenuAction[]>>({})
  const actionsByTabRef = useRef<Record<string, ContextMenuAction[]>>({})
  const updateActionsByTab = useMemoizedFn(
    (updater: (prev: Record<string, ContextMenuAction[]>) => Record<string, ContextMenuAction[]>) => {
      const next = updater(actionsByTabRef.current)
      actionsByTabRef.current = next
      setActionsByTab(next)
    },
  )
  /** 当前 tab 对应的已选动作列表 */
  const selectedActions = useMemo(() => actionsByTab[currentTabKey] || [], [actionsByTab, currentTabKey])
  /** 右侧可用列表 */
  const [availableActions, setAvailableActions] = useState<ContextMenuAction[]>([])
  /** 右侧列表搜索关键字（按插件名/说明/Hook 过滤） */
  const [keyword, setKeyword] = useState<string>('')
  /** 搜索过滤后的可用列表 */
  const filteredAvailableActions = useMemo(() => {
    const search = keyword.trim().toLowerCase()
    if (!search) return availableActions
    return availableActions.filter(
      (action) =>
        action.PluginName.toLowerCase().includes(search) ||
        action.Help.toLowerCase().includes(search) ||
        action.HookName.toLowerCase().includes(search),
    )
  }, [availableActions, keyword])
  /** 拖拽目标区域标识（用于高亮当前拖拽落点） */
  const [destinationDrag, setDestinationDrag] = useState<string>(DROP_SELECTED)
  // #endregion

  // #region 数据刷新
  const refreshSeqRef = useRef(0)
  const refreshSelectedPlugins = useMemoizedFn(async () => {
    const seq = ++refreshSeqRef.current
    const tabKey = currentTabKeyRef.current
    const scene = getGroupTabByKey(tabKey)?.scene
    if (!scene) return
    try {
      const actions = await fetchSceneActions(tabKey)
      if (seq !== refreshSeqRef.current) return
      updateActionsByTab((prev) => ({ ...prev, [tabKey]: actions.filter((action) => action.Enabled) }))
      setAvailableActions(actions)
    } catch {}
  })

  useEffect(() => {
    if (!inViewport) return
    refreshSelectedPlugins()
  }, [inViewport, currentTabKey])
  useEffect(() => {
    emiter.on('refreshContextMenuPlugins', refreshSelectedPlugins)
    return () => {
      emiter.off('refreshContextMenuPlugins', refreshSelectedPlugins)
    }
  }, [])
  // #endregion

  // #region 保存
  const requestBinding = useMemoizedFn(
    async (action: ContextMenuAction, enabled: boolean, sort: number, shortcut = action.Shortcut || '') => {
      try {
        await grpcSetContextMenuActionBinding({
          PluginUUID: action.PluginUUID,
          ActionID: action.ActionID,
          Enabled: enabled,
          Sort: sort,
          Shortcut: shortcut,
          ResultMode: action.ResultMode,
          AskBeforeRun: action.AskBeforeRun,
        })
        return true
      } catch {
        return false
      }
    },
  )
  const saveBinding = useMemoizedFn(
    async (action: ContextMenuAction, enabled: boolean, sort: number, shortcut = action.Shortcut || '') => {
      const ok = await requestBinding(action, enabled, sort, shortcut)
      if (ok) {
        emiter.emit('refreshContextMenuActions')
      }
      return ok
    },
  )
  // #endregion

  // #region 已选插件的增删改操作
  /** 绑定保存串行锁：任何绑定保存请求在途期间忽略新的增删/拖拽/配置修改，避免交叉写入导致服务端顺序错乱或旧字段覆盖 */
  const bindingSavingRef = useRef(false)
  /**
   * 添加动作到已选列表（按钮点击 / 右侧拖入）
   * 每 tab 上限 UpperLimit 个
   * 与拖拽排序一致：插入后整体归一 Sort，只保存「新插入项 + Sort 变化的既有项」
   */
  const addActionToSelected = useMemoizedFn(async (action: ContextMenuAction, insertIndex?: number) => {
    if (bindingSavingRef.current) return
    const tabKey = currentTabKeyRef.current
    const currentList = actionsByTabRef.current[tabKey] || []
    if (currentList.length >= UpperLimit) {
      yakitNotify('error', t('ManageRightClickPlugins.maxAddLimit', { UpperLimit }))
      return
    }
    if (currentList.some((i) => i.ActionID === action.ActionID && i.PluginUUID === action.PluginUUID)) return

    const insertPos = typeof insertIndex === 'number' ? Math.min(insertIndex, currentList.length) : currentList.length
    const next = [...currentList]
    next.splice(insertPos, 0, action)
    // 新插入项（对象引用相等）必保存；其余仅保存 Sort 与新下标不同的项
    const normalized = next.map((item, index) => ({ ...item, Sort: index }))
    const changed = normalized.filter((_, index) => next[index] === action || next[index].Sort !== index)
    bindingSavingRef.current = true
    try {
      updateActionsByTab((prev) => ({ ...prev, [tabKey]: normalized }))
      for (const item of changed) {
        const ok = await saveBinding(item, true, item.Sort)
        if (!ok) {
          refreshSelectedPlugins()
          return
        }
      }
    } finally {
      bindingSavingRef.current = false
    }
  })

  /** 点击右侧的“添加”按钮 */
  const onAddPlugin = useMemoizedFn((action: ContextMenuAction) => {
    addActionToSelected(action)
  })

  /** 切换执行结果展示方式（codec 兼容类型沿用旧 CODEC 行为，不支持切换） */
  const onChangeResultMode = useMemoizedFn(async (action: ContextMenuAction, mode: ContextMenuResultMode) => {
    if (bindingSavingRef.current) return
    if (action.PluginType === LEGACY_CONTEXT_MENU_PLUGIN_TYPE) return
    const tabKey = currentTabKeyRef.current
    bindingSavingRef.current = true
    try {
      const ok = await saveBinding({ ...action, ResultMode: mode }, true, action.Sort)
      if (!ok) {
        refreshSelectedPlugins()
        return
      }
      updateActionsByTab((prev) => ({
        ...prev,
        [tabKey]: (prev[tabKey] || []).map((i) =>
          i.ActionID === action.ActionID && i.PluginUUID === action.PluginUUID ? { ...i, ResultMode: mode } : i,
        ),
      }))
    } finally {
      bindingSavingRef.current = false
    }
  })

  /** 保存插件快捷键 */
  const onChangeShortcut = useMemoizedFn(async (action: ContextMenuAction, shortcut: string) => {
    if (bindingSavingRef.current) return
    const tabKey = currentTabKeyRef.current
    bindingSavingRef.current = true
    try {
      const ok = await saveBinding(action, true, action.Sort, shortcut)
      if (!ok) {
        refreshSelectedPlugins()
        return
      }
      updateActionsByTab((prev) => ({
        ...prev,
        [tabKey]: (prev[tabKey] || []).map((i) =>
          i.ActionID === action.ActionID && i.PluginUUID === action.PluginUUID ? { ...i, Shortcut: shortcut } : i,
        ),
      }))
    } finally {
      bindingSavingRef.current = false
    }
  })

  /** 移除插件（核心插件锁定不可移除） */
  const onRemovePlugin = useMemoizedFn(async (action: ContextMenuAction) => {
    if (bindingSavingRef.current) return
    if (action.Locked || action.IsCorePlugin) return
    const tabKey = currentTabKeyRef.current
    bindingSavingRef.current = true
    try {
      const ok = await saveBinding(action, false, action.Sort, '')
      if (!ok) return
      updateActionsByTab((prev) => ({
        ...prev,
        [tabKey]: (prev[tabKey] || []).filter(
          (i) => !(i.ActionID === action.ActionID && i.PluginUUID === action.PluginUUID),
        ),
      }))
    } finally {
      bindingSavingRef.current = false
    }
  })

  /** 清空当前 tab 已选插件（核心插件保留） */
  const onClearSelectedPlugins = useMemoizedFn(async () => {
    if (bindingSavingRef.current) return
    const tabKey = currentTabKeyRef.current
    const currentList = actionsByTabRef.current[tabKey] || []
    const removable = currentList.filter((action) => !action.Locked && !action.IsCorePlugin)
    if (removable.length === 0) return
    bindingSavingRef.current = true
    try {
      const results = await Promise.all(removable.map((action) => requestBinding(action, false, action.Sort, '')))
      emiter.emit('refreshContextMenuActions')
      const failed = removable.filter((_, index) => !results[index])
      updateActionsByTab((prev) => ({
        ...prev,
        [tabKey]: [...currentList.filter((action) => action.Locked || action.IsCorePlugin), ...failed],
      }))
    } finally {
      bindingSavingRef.current = false
    }
  })
  // #endregion

  // #region 拖拽交互
  /** 拖拽结束：处理已选列表内排序 / 右侧拖入已选列表 */
  const onDragEnd = useMemoizedFn(async (result: DropResult, _provided: ResponderProvided) => {
    if (!result.destination) return

    // 已选列表内排序：按新顺序重发 Sort
    if (result.source.droppableId === DROP_SELECTED && result.destination.droppableId === DROP_SELECTED) {
      if (bindingSavingRef.current) return
      const tabKey = currentTabKeyRef.current
      const currentList = actionsByTabRef.current[tabKey] || []
      const reordered = reorder(currentList, result.source.index, result.destination.index)
      const next = reordered.map((item, index) => ({ ...item, Sort: index }))
      const changed = next.filter((_, index) => reordered[index].Sort !== index)
      bindingSavingRef.current = true
      try {
        updateActionsByTab((prev) => ({ ...prev, [tabKey]: next }))
        for (const item of changed) {
          const ok = await saveBinding(item, true, item.Sort)
          if (!ok) {
            refreshSelectedPlugins()
            return
          }
        }
      } finally {
        bindingSavingRef.current = false
      }
      return
    }

    // 右侧可用动作拖入已选列表（source.index 是渲染列表下标，须从过滤后的列表取值）
    if (result.source.droppableId === DROP_AVAILABLE && result.destination.droppableId === DROP_SELECTED) {
      const currentAction = filteredAvailableActions[result.source.index]
      if (!currentAction) return
      addActionToSelected(currentAction, result.destination.index)
    }
  })

  /** 拖拽移动过程中高亮落点区域 */
  const onDragUpdate = useThrottleFn(
    (result: DragUpdate) => {
      if (!result.destination) {
        setDestinationDrag('')
        return
      }
      if (result.destination.droppableId !== destinationDrag) {
        setDestinationDrag(result.destination.droppableId)
      }
    },
    { wait: 200 },
  ).run
  // #endregion

  return (
    <div className={styles['right-plugin-mag-wrapper']} ref={manageRightClickPluginsRef}>
      {/* 左侧：分组 tab */}
      <div className={styles['left']}>
        <div className={styles['left-title']}>{t('ManageRightClickPlugins.editRightClickPlugins')}</div>
        <div className={styles['left-content']}>
          {GroupTabList.map(({ key, label }) => {
            const isSelect = key === currentTabKey
            const tabLabel = t(label)
            return (
              <div
                key={key}
                className={classNames(styles['left-tab-item'], {
                  [styles['left-tab-item-select']]: isSelect,
                })}
                onClick={() => onSelectTab(key)}
              >
                <div className={styles['left-tab-label']} title={tabLabel}>
                  {tabLabel}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd} onDragUpdate={onDragUpdate}>
        {/* 中间：当前 tab 已选插件 */}
        <div className={styles['middle']}>
          <div className={styles['selected-panel']}>
            <div className={styles['selected-panel-header']}>
              <div className={styles['selected-panel-title']}>{currentGroupLabel}</div>
              <div className={styles['selected-panel-tip-row']}>
                <div className={styles['selected-panel-tip']}>
                  {t('ManageRightClickPlugins.addedPluginsCount', {
                    count: selectedActions.length,
                    UpperLimit,
                  })}
                </div>
                <YakitPopconfirm
                  title={t('ManageRightClickPlugins.clearConfirm')}
                  onConfirm={onClearSelectedPlugins}
                  placement="bottomRight"
                  disabled={selectedActions.length === 0}
                >
                  <YakitButton type="outline1" colors="danger" disabled={selectedActions.length === 0}>
                    {t('YakitButton.clear')}
                  </YakitButton>
                </YakitPopconfirm>
              </div>
            </div>
            <div className={styles['selected-panel-list']}>
              <Droppable droppableId={DROP_SELECTED}>
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className={styles['selected-drop-area']}>
                    {selectedActions.map((item, index) => (
                      <Draggable
                        key={`${item.PluginUUID}:${item.ActionID}`}
                        draggableId={`${item.PluginUUID}:${item.ActionID}`}
                        index={index}
                      >
                        {(providedItem, snapshot) => (
                          <div
                            ref={providedItem.innerRef}
                            {...providedItem.draggableProps}
                            {...providedItem.dragHandleProps}
                            style={providedItem.draggableProps.style}
                          >
                            <SelectedPluginItem
                              plugin={item}
                              siblings={selectedActions}
                              scene={getGroupTabByKey(currentTabKey)?.scene}
                              isDragging={snapshot.isDragging}
                              settingMenuOpen={openSettingKey === `${item.PluginUUID}:${item.ActionID}`}
                              onSettingMenuOpenChange={(open) => {
                                setOpenSettingKey(open ? `${item.PluginUUID}:${item.ActionID}` : '')
                              }}
                              onRemove={onRemovePlugin}
                              onChangeResultMode={onChangeResultMode}
                              onChangeShortcut={onChangeShortcut}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {selectedActions.length === 0 && (
                      <div className={styles['selected-empty']}>
                        <OutlinePhotographIcon className={styles['selected-empty-icon']} />
                        <div>
                          <div
                            className={classNames(styles['selected-empty-text'], styles['selected-empty-text-bold'])}
                          >
                            {t('ManageRightClickPlugins.noPluginAdded')}
                          </div>
                          <div className={styles['selected-empty-text']}>
                            {t('ManageRightClickPlugins.addPluginHint')}
                          </div>
                        </div>
                      </div>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        </div>

        {/* 右侧：可添加插件列表 */}
        <div className={styles['right']}>
          <div className={styles['right-title']}>
            <div>
              {t('ManageRightClickPlugins.rightClickPlugins')}
              <YakitButton
                type="text2"
                icon={<OutlineRefreshIcon />}
                onClick={(e) => emiter.emit('refreshContextMenuPlugins')}
                style={{ marginLeft: 2 }}
              />
            </div>
            <div className={styles['search-wrapper']}>
              <YakitInput.Search
                placeholder={t('ManageRightClickPlugins.searchPlaceholder')}
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                allowClear={true}
                style={{ width: 200 }}
              />
            </div>
          </div>
          <div className={styles['right-help']}>{t('ManageRightClickPlugins.rightHelp')}</div>
          <AvailablePluginList
            destinationDrag={destinationDrag}
            availableActions={filteredAvailableActions}
            isFiltering={!!keyword.trim()}
            selectedActions={selectedActions}
            onAddPlugin={onAddPlugin}
            onRemovePlugin={onRemovePlugin}
          />
        </div>
      </DragDropContext>
    </div>
  )
}

export default ManageRightClickPlugins

// #region 已选插件单项
interface SelectedPluginItemProps {
  plugin: ContextMenuAction
  siblings: ContextMenuAction[]
  scene?: ContextMenuScene
  isDragging: boolean
  settingMenuOpen: boolean
  onSettingMenuOpenChange: (open: boolean) => void
  onRemove: (plugin: ContextMenuAction) => void
  onChangeResultMode: (plugin: ContextMenuAction, mode: ContextMenuResultMode) => void
  onChangeShortcut: (plugin: ContextMenuAction, shortcut: string) => void
}

const SelectedPluginItem: React.FC<SelectedPluginItemProps> = React.memo((props) => {
  const {
    plugin,
    siblings,
    scene,
    isDragging,
    settingMenuOpen,
    onSettingMenuOpenChange,
    onRemove,
    onChangeResultMode,
    onChangeShortcut,
  } = props
  const { t, i18nRefresh } = useI18nNamespaces(['manageRightClickPlugins', 'shortcutKey'])
  /** 核心插件锁定，不可移除 */
  const locked = plugin.Locked || plugin.IsCorePlugin
  /** codec 兼容类型不支持配置结果展示方式，沿用旧 CODEC 行为 */
  const isLegacyCodec = plugin.PluginType === LEGACY_CONTEXT_MENU_PLUGIN_TYPE
  /** 后端的 auto 在 UI 上不暴露，直接按 tab 展示 */
  const resultMode = plugin.ResultMode === ContextMenuResultMode.Auto ? ContextMenuResultMode.Tab : plugin.ResultMode

  const shortcutKeys = useMemo(() => parseContextMenuShortcut(plugin.Shortcut), [plugin.Shortcut])
  const shortcutUI = useMemo(() => convertKeyboardToUIKey(shortcutKeys), [shortcutKeys])

  const [keyShow, setKeyShow] = useState(false)
  const [inputKeys, setInputKeys] = useState<YakitKeyBoard[]>([])
  const [warnInfo, setWarnInfo] = useState<string>()

  // #region 编辑插件抽屉
  const [editPlugin, setEditPlugin] = useState<YakScript | null>(null)
  const [editHint, setEditHint] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const pageWrapperRef = useRef<HTMLElement>()

  const handleOpenEdit = useMemoizedFn((e: React.MouseEvent) => {
    e.stopPropagation()
    if (editHint || editLoading) return
    setEditLoading(true)
    grpcFetchLocalPluginDetailByUUID({ UUID: plugin.PluginUUID })
      .then((res) => {
        pageWrapperRef.current = getMainOperatorPageBodyContainer()
        setEditPlugin(res)
        setEditHint(true)
      })
      .catch(() => {})
      .finally(() => setEditLoading(false))
  })

  const handleEditCallback = useMemoizedFn((isSuccess: boolean, data?: ModifyPluginCallback) => {
    if (isSuccess && data) {
      const { opType } = data
      // 保存类操作后刷新本页列表（插件名/说明可能已变）
      if (['save', 'saveAndExit', 'upload', 'submit'].includes(opType)) {
        emiter.emit('refreshContextMenuPlugins')
      }
      if (opType !== 'save') setEditHint(false)
    } else {
      setEditHint(false)
    }
  })
  // #endregion

  const handleOpenKeyShow = useMemoizedFn(() => {
    if (keyShow) return
    onSettingMenuOpenChange(false)
    setInputKeys(shortcutKeys as YakitKeyBoard[])
    setWarnInfo(
      shortcutKeys.length > 0
        ? checkContextMenuShortcutConflict(shortcutKeys, {
            scene,
            siblings,
            exclude: { PluginUUID: plugin.PluginUUID, ActionID: plugin.ActionID },
          })
        : undefined,
    )
    setIsActiveShortcutKeyPage(true)
    setKeyShow(true)
  })

  const handleCallbackKeyShow = useMemoizedFn((show: boolean) => {
    if (show && inputKeys.length > 0) {
      onChangeShortcut(plugin, serializeContextMenuShortcut(inputKeys))
    }
    setIsActiveShortcutKeyPage(false)
    setKeyShow(false)
    setInputKeys([])
    setWarnInfo(undefined)
  })

  const handleShortcutKey = useMemoizedFn((name: string) => {
    if (!keyShow) return
    if (name.indexOf('setShortcutKey') > -1) {
      const regex = /\(([^)]+)\)/
      const result = name.match(regex)
      if (result && result[1]) {
        if (result[1] === YakitKeyBoard.Escape) {
          handleCallbackKeyShow(false)
        } else if (result[1] === YakitKeyBoard.Enter) {
          handleCallbackKeyShow(true)
        } else {
          const keys = result[1].split('|') as YakitKeyBoard[]
          setWarnInfo(
            checkContextMenuShortcutConflict(keys, {
              scene,
              siblings,
              exclude: { PluginUUID: plugin.PluginUUID, ActionID: plugin.ActionID },
            }),
          )
          setInputKeys(keys)
        }
      }
    }
  })
  useEffect(() => {
    if (!keyShow) return
    emiter.on('onGlobalShortcutKey', handleShortcutKey)
    return () => {
      emiter.off('onGlobalShortcutKey', handleShortcutKey)
      setIsActiveShortcutKeyPage(false)
    }
  }, [keyShow])

  const resultModeMenuLabel = useMemoizedFn((mode: ContextMenuResultMode, label: string) => {
    const checked = resultMode === mode
    return (
      <div className={styles['setting-menu-result-item']}>
        <span>{label}</span>
        {checked ? <span className={styles['setting-menu-check']}>✓</span> : <span />}
      </div>
    )
  })

  const settingMenuData = useMemo((): YakitMenuItemType[] => {
    const resultChildren: YakitMenuItemProps[] = [
      {
        key: `result-${ContextMenuResultMode.Tab}`,
        label: resultModeMenuLabel(ContextMenuResultMode.Tab, t('ManageRightClickPlugins.resultModeTab')),
      },
      {
        key: `result-${ContextMenuResultMode.Dialog}`,
        label: resultModeMenuLabel(ContextMenuResultMode.Dialog, t('ManageRightClickPlugins.resultModeDialog')),
      },
      {
        key: `result-${ContextMenuResultMode.Drawer}`,
        label: resultModeMenuLabel(ContextMenuResultMode.Drawer, t('ManageRightClickPlugins.resultModeDrawer')),
      },
    ]
    return [
      {
        key: 'shortcut',
        label: (
          <div className={styles['setting-menu-shortcut-item']}>
            <span>{t('ManageRightClickPlugins.setShortcutMenu')}</span>
            <span className={styles['setting-menu-shortcut-keys']}>{shortcutUI}</span>
          </div>
        ),
      },
      {
        key: 'result-mode',
        label: t('ManageRightClickPlugins.setResultModeMenu'),
        children: isLegacyCodec
          ? [
              {
                key: `result-${ContextMenuResultMode.Tab}`,
                label: resultModeMenuLabel(ContextMenuResultMode.Tab, t('ManageRightClickPlugins.resultModeTab')),
              },
            ]
          : resultChildren,
      },
    ]
  }, [shortcutUI, resultMode, isLegacyCodec, i18nRefresh])

  const onSettingMenuClick = useMemoizedFn(({ key }: { key: string }) => {
    if (key === 'shortcut') {
      handleOpenKeyShow()
      return
    }
    if (isLegacyCodec) return
    if (key.startsWith('result-')) {
      const mode = key.slice('result-'.length) as ContextMenuResultMode
      if (
        mode === ContextMenuResultMode.Tab ||
        mode === ContextMenuResultMode.Dialog ||
        mode === ContextMenuResultMode.Drawer
      ) {
        onChangeResultMode(plugin, mode)
      }
      onSettingMenuOpenChange(false)
    }
  })

  return (
    <div className={styles['selected-item-wrap']}>
      <div
        className={classNames(styles['selected-item'], {
          [styles['selected-item-dragging']]: isDragging,
        })}
      >
        <div className={styles['selected-item-main']}>
          <DragSortIcon
            className={classNames({
              [styles['drag-icon-active']]: isDragging,
            })}
          />
          <Avatar
            className={styles['plugin-avatar']}
            src={plugin.HeadImg || ''}
            icon={<PrivateOutlineDefaultPluginIcon />}
          />
          <div className={styles['selected-item-body']}>
            <div className={styles['selected-item-name-row']}>
              <div className={styles['selected-item-name']}>{plugin.PluginName}</div>
              <div className={styles['selected-item-name-actions']} onMouseDown={(e) => e.stopPropagation()}>
                <YakitButton
                  size="small"
                  type="text2"
                  loading={editLoading}
                  icon={<OutlinePencilaltIcon className={styles['setting-icon']} />}
                  onClick={handleOpenEdit}
                  style={{ marginRight: 4 }}
                />
                <YakitDropdownMenu
                  menu={{
                    data: settingMenuData,
                    width: 180,
                    onClick: onSettingMenuClick,
                  }}
                  dropdown={{
                    trigger: ['click'],
                    placement: 'bottomLeft',
                    visible: settingMenuOpen,
                    onVisibleChange: onSettingMenuOpenChange,
                  }}
                >
                  <YakitButton
                    size="small"
                    type="text2"
                    icon={<OutlineCogIcon className={styles['setting-icon']} />}
                    onClick={(e) => {
                      e.stopPropagation()
                    }}
                  />
                </YakitDropdownMenu>
              </div>
            </div>
            <div className={styles['selected-item-desc']}>{plugin.Help || 'No Description about it.'}</div>
          </div>
          <YakitButton
            size="small"
            type="text2"
            disabled={locked}
            icon={
              <OutlineXIcon
                className={classNames(styles['remove-icon'], { [styles['remove-icon-disabled']]: locked })}
              />
            }
            onClick={(e) => {
              e.stopPropagation()
              onRemove(plugin)
            }}
          />
        </div>
      </div>

      {editHint && editPlugin && (
        <ModifyYakitPlugin
          getContainer={pageWrapperRef.current || undefined}
          plugin={editPlugin}
          visible={editHint}
          onCallback={handleEditCallback}
        />
      )}

      <YakitModal
        type="white"
        title={t('ShortcutKey.editShortcut')}
        centered={true}
        keyboard={false}
        footer={null}
        maskClosable={false}
        maskStyle={{ backgroundColor: 'transparent' }}
        visible={keyShow}
        width={600}
        onCancel={() => handleCallbackKeyShow(false)}
      >
        <div className={styles['set-shortcut-key-wrapper']}>
          <div className={styles['title']}>{t('ShortcutKey.hint')}</div>
          <div className={classNames(styles['input'], { [styles['empty']]: inputKeys.length === 0 })}>
            {inputKeys.join(' ')}
          </div>
          <div className={styles['keys-ui']}>
            {convertKeyboardToUIKey(inputKeys)}
            {warnInfo && <span className={styles['warn']}>（{warnInfo}）</span>}
          </div>
        </div>
      </YakitModal>
    </div>
  )
})
// #endregion

// #region 可用插件列表
interface AvailablePluginListProps {
  destinationDrag: string
  availableActions: ContextMenuAction[]
  isFiltering: boolean
  selectedActions: ContextMenuAction[]
  onAddPlugin: (plugin: ContextMenuAction) => void
  onRemovePlugin: (plugin: ContextMenuAction) => void
}

const AvailablePluginList: React.FC<AvailablePluginListProps> = React.memo((props) => {
  const { destinationDrag, availableActions, isFiltering, selectedActions, onAddPlugin, onRemovePlugin } = props
  const { t } = useI18nNamespaces(['manageRightClickPlugins', 'yakitUi'])

  return (
    <Droppable droppableId={DROP_AVAILABLE}>
      {(provided) => (
        <div className={styles['available-list']} {...provided.droppableProps} ref={provided.innerRef}>
          {availableActions.length === 0 ? (
            isFiltering ? (
              <YakitEmpty title={t('ManageRightClickPlugins.noMatchedPlugins')} />
            ) : (
              <YakitEmpty title={t('ManageRightClickPlugins.noAvailablePlugins')}>
                <YakitButton
                  type="outline1"
                  icon={<CloudDownloadIcon />}
                  onClick={() => {
                    emiter.emit(
                      'onOpenFuzzerModal',
                      JSON.stringify({ isAiPlugin: 'isGetPlugin', pluginType: ['codec', 'context-menu'] }),
                    )
                  }}
                >
                  {t('ManageRightClickPlugins.getPlugin')}
                </YakitButton>
              </YakitEmpty>
            )
          ) : (
            availableActions.map((data, index) => {
              const isAdded = selectedActions.some(
                (i) => i.ActionID === data.ActionID && i.PluginUUID === data.PluginUUID,
              )
              return (
                <Draggable
                  key={`${data.PluginUUID}:${data.ActionID}`}
                  draggableId={`${data.PluginUUID}:${data.ActionID}-plugin`}
                  index={index}
                  isDragDisabled={isAdded}
                >
                  {(providedItem, snapshot) => (
                    <div
                      ref={providedItem.innerRef}
                      {...providedItem.draggableProps}
                      {...providedItem.dragHandleProps}
                      style={providedItem.draggableProps.style}
                    >
                      <AvailablePluginItem
                        plugin={data}
                        isDragging={snapshot.isDragging}
                        destinationDrag={destinationDrag}
                        onAddPlugin={onAddPlugin}
                        isAdded={isAdded}
                        onRemovePlugin={onRemovePlugin}
                      />
                    </div>
                  )}
                </Draggable>
              )
            })
          )}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  )
})
// #endregion

// #region 可用插件单项
interface AvailablePluginItemProps {
  plugin: ContextMenuAction
  isDragging: boolean
  destinationDrag: string
  onAddPlugin: (plugin: ContextMenuAction) => void
  isAdded: boolean
  onRemovePlugin: (plugin: ContextMenuAction) => void
}

const AvailablePluginItem: React.FC<AvailablePluginItemProps> = React.memo((props) => {
  const { plugin, isDragging, destinationDrag, onAddPlugin, isAdded, onRemovePlugin } = props
  const { t } = useI18nNamespaces(['manageRightClickPlugins', 'yakitUi'])
  const pluginRef = useRef(null)
  const isHovering = useHover(pluginRef)
  /** 核心插件锁定，不可移除：已添加态固定显示「已添加」，不出现「取消」 */
  const locked = plugin.Locked || plugin.IsCorePlugin

  const onAdd = useMemoizedFn(() => {
    onAddPlugin(plugin)
  })
  const onRemove = useMemoizedFn(() => {
    onRemovePlugin(plugin)
  })

  return (
    <div
      className={classNames(styles['available-item'], {
        [styles['available-item-dragging']]: isDragging,
      })}
      ref={pluginRef}
    >
      <div className={styles['available-item-left']}>
        <Avatar
          className={classNames(styles['available-item-avatar'], {
            [styles['item-disabled']]: isAdded,
          })}
          src={plugin.HeadImg || ''}
          icon={<PrivateOutlineDefaultPluginIcon />}
        />
        <span
          className={classNames(styles['available-item-name'], {
            [styles['item-disabled']]: isAdded,
          })}
        >
          {plugin.PluginName}
        </span>
      </div>
      {(isAdded && (
        <>
          {isHovering && !locked ? (
            <div className={styles['action-cancel']} onClick={() => onRemove()}>
              {t('YakitButton.cancel')}
            </div>
          ) : (
            <div className={styles['action-added']}>{t('ManageRightClickPlugins.added')}</div>
          )}
        </>
      )) || (
        <YakitButton type="text" onClick={() => onAdd()}>
          {t('YakitButton.add')}
        </YakitButton>
      )}
      {destinationDrag === DROP_AVAILABLE && isDragging && (
        <div className={styles['drag-ban']}>
          <OutlineBanIcon />
        </div>
      )}
    </div>
  )
})
// #endregion
