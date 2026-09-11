import { useEffect, useMemo, useRef, useState } from 'react'
import { useLatest, useMemoizedFn, useInViewport, useUpdateEffect } from 'ahooks'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { CloudDownloadOutlined, RotateCcwOutlined, SearchOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import { YakitSegmented } from '@/components/yakitUI/YakitSegmented/YakitSegmented'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import emiter from '@/utils/eventBus/eventBus'
import { yakitNotify } from '@/utils/notification'
import { grpcSetContextMenuActionBinding } from '@/pages/manageRightClickPlugins/api'
import { DROP_SELECTED, getGroupTabByKey, GroupTabList, UpperLimit } from '@/pages/manageRightClickPlugins/constants'
import { fetchSceneActions, patchAction } from '@/pages/manageRightClickPlugins/utils'
import { ContextMenuResultMode, type ContextMenuAction } from '@/pages/manageRightClickPlugins/types'
import { PluginItem } from './PluginItem'
import styles from './RightClickPluginsSettings.module.scss'

const TabI18n: Record<string, string> = {
  'plugin-extension-single': 'SettingsPage.rightClickPlugins.tabSingle',
  'plugin-extension-multiple': 'SettingsPage.rightClickPlugins.tabMultiple',
  'packet-context-menu': 'SettingsPage.rightClickPlugins.tabPacket',
}

const actionKey = (action: Pick<ContextMenuAction, 'PluginUUID' | 'ActionID'>) =>
  `${action.PluginUUID}:${action.ActionID}`

const toUnboundAction = (action: ContextMenuAction): ContextMenuAction => ({
  ...action,
  Enabled: false,
  Shortcut: '',
  ResultMode: ContextMenuResultMode.Tab,
})

const reorder = <T,>(list: T[], startIndex: number, endIndex: number) => {
  const next = [...list]
  const [removed] = next.splice(startIndex, 1)
  next.splice(endIndex, 0, removed)
  return next
}

const syncEnabledSort = (list: ContextMenuAction[]) => {
  const enabled = list.filter((item) => item.Enabled)
  const disabled = list.filter((item) => !item.Enabled)
  return [...enabled.map((item, sort) => ({ ...item, Sort: sort })), ...disabled]
}

interface RightClickPluginsSettingsProps {
  section?: string
  sectionTick?: number
}

export const RightClickPluginsSettings: React.FC<RightClickPluginsSettingsProps> = (props) => {
  const { section, sectionTick } = props
  const { t, i18nRefresh } = useI18nNamespaces(['setting', 'manageRightClickPlugins', 'yakitUi'])
  const [currentTabKey, setCurrentTabKey] = useState(() => getGroupTabByKey(section || '')?.key || GroupTabList[0].key)
  const currentTabKeyRef = useLatest(currentTabKey)
  const [actions, setActions] = useState<ContextMenuAction[]>([])
  const actionsRef = useRef<ContextMenuAction[]>([])
  const [openSettingKey, setOpenSettingKey] = useState('')
  const [keyword, setKeyword] = useState('')
  const appliedSection = `${section || ''}:${sectionTick ?? 0}`
  const [prevApplied, setPrevApplied] = useState(appliedSection)
  if (appliedSection !== prevApplied) {
    setPrevApplied(appliedSection)
    const tab = getGroupTabByKey(section || '')?.key
    if (tab) {
      setCurrentTabKey(tab)
      setOpenSettingKey('')
      setKeyword('')
    }
  }
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [inViewport] = useInViewport(wrapperRef)
  const bindingSavingRef = useRef(false)
  const refreshSeqRef = useRef(0)

  const setList = useMemoizedFn((next: ContextMenuAction[]) => {
    actionsRef.current = next
    setActions(next)
  })

  const enabledActions = useMemo(() => actions.filter((item) => item.Enabled), [actions])
  const enabledCount = enabledActions.length
  const searching = !!keyword.trim()
  const visibleActions = useMemo(() => {
    const k = keyword.trim().toLowerCase()
    if (!k) return actions
    return actions.filter((item) => (item.PluginName || '').toLowerCase().includes(k))
  }, [actions, keyword])
  const tabOptions = useMemo(
    () => GroupTabList.map((item) => ({ label: t(TabI18n[item.key]), value: item.key })),
    [i18nRefresh],
  )

  const refreshList = useMemoizedFn(async () => {
    const seq = ++refreshSeqRef.current
    const tabKey = currentTabKeyRef.current
    try {
      const list = await fetchSceneActions(tabKey)
      if (seq !== refreshSeqRef.current) return
      setList(syncEnabledSort([...list].sort((a, b) => Number(b.Enabled) - Number(a.Enabled) || a.Sort - b.Sort)))
    } catch {}
  })

  useEffect(() => {
    refreshList()
  }, [currentTabKey])

  useUpdateEffect(() => {
    if (inViewport) refreshList()
  }, [inViewport])

  useEffect(() => {
    emiter.on('refreshContextMenuPlugins', refreshList)
    return () => {
      emiter.off('refreshContextMenuPlugins', refreshList)
    }
  }, [])

  const saveBinding = useMemoizedFn(async (action: ContextMenuAction) => {
    try {
      await grpcSetContextMenuActionBinding({
        PluginUUID: action.PluginUUID,
        ActionID: action.ActionID,
        Enabled: action.Enabled,
        Sort: action.Sort,
        Shortcut: action.Shortcut || '',
        ResultMode: action.ResultMode,
        AskBeforeRun: action.AskBeforeRun,
      })
      emiter.emit('refreshContextMenuActions')
      return true
    } catch {
      return false
    }
  })

  const runPersist = useMemoizedFn(async (next: ContextMenuAction[]) => {
    if (bindingSavingRef.current) return
    bindingSavingRef.current = true
    try {
      const normalized = syncEnabledSort(next)
      const prevMap = new Map(actionsRef.current.map((item) => [actionKey(item), item]))
      const changed = normalized.filter((item) => {
        const old = prevMap.get(actionKey(item))
        if (!old) return item.Enabled
        return (
          old.Enabled !== item.Enabled ||
          (item.Enabled && old.Sort !== item.Sort) ||
          old.Shortcut !== item.Shortcut ||
          old.ResultMode !== item.ResultMode
        )
      })
      setList(normalized)
      for (const item of changed) {
        const ok = await saveBinding(item.Enabled ? item : toUnboundAction(item))
        if (!ok) {
          refreshList()
          return
        }
      }
    } finally {
      bindingSavingRef.current = false
    }
  })

  const onToggle = useMemoizedFn(async (action: ContextMenuAction, enabled: boolean) => {
    if (action.Locked || action.IsCorePlugin) return
    if (enabled && !action.Enabled && enabledCount >= UpperLimit) {
      yakitNotify('error', t('ManageRightClickPlugins.maxAddLimit', { UpperLimit }))
      return
    }
    const rest = actionsRef.current.filter((item) => actionKey(item) !== actionKey(action))
    const item = enabled ? { ...action, Enabled: true } : toUnboundAction(action)
    await runPersist([...rest, item])
  })

  const onChangeResultMode = useMemoizedFn(async (action: ContextMenuAction, mode: ContextMenuResultMode) => {
    await runPersist(patchAction(actionsRef.current, action, { ResultMode: mode }))
  })

  const onChangeShortcut = useMemoizedFn(async (action: ContextMenuAction, shortcut: string) => {
    await runPersist(patchAction(actionsRef.current, action, { Shortcut: shortcut }))
  })

  const onReset = useMemoizedFn(async () => {
    const removable = actionsRef.current.filter((item) => item.Enabled && !item.Locked && !item.IsCorePlugin)
    if (removable.length === 0) return
    await runPersist(
      actionsRef.current.map((item) => (item.Locked || item.IsCorePlugin ? item : toUnboundAction(item))),
    )
  })

  const onDragEnd = useMemoizedFn(async (result: DropResult) => {
    if (searching || !result.destination) return
    const max = actionsRef.current.filter((item) => item.Enabled).length - 1
    if (result.source.index > max) return
    const dest = Math.min(result.destination.index, max)
    if (dest === result.source.index) return
    await runPersist(reorder(actionsRef.current, result.source.index, dest))
  })

  return (
    <div ref={wrapperRef} className={styles['right-click-plugins']} data-settings-section={currentTabKey}>
      <div className={styles['page-header']}>
        <div className={styles['page-title']}>{t('SettingsPage.item.right-click-plugins')}</div>
        <YakitInput
          size="small"
          allowClear
          wrapperClassName={styles['search']}
          placeholder={t('ManageRightClickPlugins.searchPlaceholder')}
          prefix={<SearchOutlined color="currentColor" className={styles['search-icon']} />}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>
      <div className={styles['content']}>
        <div className={styles['toolbar']}>
          <div className={styles['toolbar-left']}>
            <YakitSegmented
              size="small"
              wrapClassName={styles['tabs']}
              value={currentTabKey}
              options={tabOptions}
              onChange={(v) => {
                setCurrentTabKey(v as typeof currentTabKey)
                setOpenSettingKey('')
                setKeyword('')
              }}
            />
            <div className={styles['count']}>
              {t('ManageRightClickPlugins.addedPluginsCount', { count: enabledCount, UpperLimit })}
            </div>
          </div>
          <YakitPopconfirm
            title={t('ManageRightClickPlugins.clearConfirm')}
            onConfirm={onReset}
            placement="bottomRight"
            disabled={enabledCount === 0}
          >
            <YakitButton
              type="text"
              colors="danger"
              icon={<RotateCcwOutlined color="currentColor" />}
              disabled={enabledCount === 0}
            >
              {t('YakitButton.reset')}
            </YakitButton>
          </YakitPopconfirm>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId={DROP_SELECTED}>
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className={styles['list']}>
                {actions.length === 0 ? (
                  <div className={styles['empty']}>
                    <YakitEmpty title={t('ManageRightClickPlugins.noAvailablePlugins')}>
                      <YakitButton
                        type="outline1"
                        icon={<CloudDownloadOutlined size={16} />}
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
                  </div>
                ) : visibleActions.length === 0 ? (
                  <div className={styles['empty']}>
                    <YakitEmpty title={t('ManageRightClickPlugins.noMatchedPlugins')} />
                  </div>
                ) : (
                  visibleActions.map((item, index) => {
                    const key = actionKey(item)
                    return (
                      <Draggable key={key} draggableId={key} index={index} isDragDisabled={!item.Enabled || searching}>
                        {(providedItem, snapshot) => (
                          <div
                            ref={providedItem.innerRef}
                            {...providedItem.draggableProps}
                            style={providedItem.draggableProps.style}
                            className={styles['item-wrap']}
                          >
                            <PluginItem
                              plugin={item}
                              siblings={enabledActions}
                              scene={getGroupTabByKey(currentTabKey)?.scene}
                              isDragging={snapshot.isDragging}
                              dragHandleProps={providedItem.dragHandleProps || undefined}
                              settingMenuOpen={openSettingKey === key}
                              onSettingMenuOpenChange={(open) => setOpenSettingKey(open ? key : '')}
                              onToggle={onToggle}
                              onChangeResultMode={onChangeResultMode}
                              onChangeShortcut={onChangeShortcut}
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
        </DragDropContext>
      </div>
    </div>
  )
}
