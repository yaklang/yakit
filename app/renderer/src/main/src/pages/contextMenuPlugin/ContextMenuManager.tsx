import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Spin, Tooltip } from 'antd'
import { useMemoizedFn } from 'ahooks'
import { DragDropContext, Draggable, type DropResult, Droppable } from '@hello-pangea/dnd'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitHint } from '@/components/yakitUI/YakitHint/YakitHint'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import {
  OutlineCloseIcon,
  OutlinePencilaltIcon,
  OutlinePlusIcon,
  OutlineRefreshIcon,
  OutlineSearchIcon,
  OutlineTrashIcon,
} from '@/assets/icon/outline'
import { IconSolidAIIcon } from '@/assets/icon/colors'
import { yakitNotify } from '@/utils/notification'
import emiter from '@/utils/eventBus/eventBus'
import { defaultAddYakitScriptPageInfo } from '@/defaultConstants/AddYakitScript'
import { YakitRoute } from '@/enums/yakitRoute'
import {
  convertKeyboardToUIKey,
  convertKeyEventToKeyCombination,
  setIsActiveShortcutKeyPage,
} from '@/utils/globalShortcutKey/utils'
import { YakitKeyMod } from '@/utils/globalShortcutKey/keyboard'
import { queryContextMenuActions, setContextMenuActionBinding } from './api'
import {
  ContextMenuExecutionType,
  ContextMenuResultMode,
  ContextMenuScene,
  contextMenuResultModeName,
  contextMenuSceneName,
  LEGACY_CONTEXT_MENU_PLUGIN_TYPE,
  type ContextMenuAction,
  type QueryContextMenuActionsResponse,
} from './types'
import styles from './ContextMenuManager.module.scss'

const modifierKeys = new Set<string>([YakitKeyMod.Control, YakitKeyMod.Shift, YakitKeyMod.Alt, YakitKeyMod.Meta])
const sceneOrder = [ContextMenuScene.HistorySingle, ContextMenuScene.HistoryMulti, ContextMenuScene.HTTPPacket]

const actionKey = (action: ContextMenuAction) => `${action.PluginUUID}:${action.ActionID}`
const pluginKey = (pluginUUID: string) => `plugin:${pluginUUID}`

interface ContextMenuPluginGroup {
  PluginUUID: string
  actions: ContextMenuAction[]
}

const groupActionsByPlugin = (actions: ContextMenuAction[]): ContextMenuPluginGroup[] => {
  const groups = new Map<string, ContextMenuPluginGroup>()
  actions.forEach((action) => {
    const group = groups.get(action.PluginUUID)
    if (group) {
      group.actions.push(action)
      return
    }
    groups.set(action.PluginUUID, { PluginUUID: action.PluginUUID, actions: [action] })
  })
  return Array.from(groups.values())
}

const getPrimaryAction = (group: ContextMenuPluginGroup) =>
  group.actions.find((action) => action.Enabled || action.IsCorePlugin) || group.actions[0]

const getGroupSort = (group: ContextMenuPluginGroup) =>
  Math.min(...group.actions.filter((action) => action.Enabled || action.IsCorePlugin).map((action) => action.Sort))

const getCapabilityName = (action: ContextMenuAction) => {
  switch (action.ExecutionType) {
    case ContextMenuExecutionType.LegacyPacketContext:
      return '数据包右键'
    case ContextMenuExecutionType.LegacyPacketMutate:
      return 'HTTP 数据包变形'
    default:
      return action.HookName
  }
}

const normalizeAction = (action: ContextMenuAction): ContextMenuAction => ({
  ...action,
  Sort: Number(action.Sort || 0),
  Params: action.Params || [],
  ResultMode: action.ResultMode || ContextMenuResultMode.Auto,
  Shortcut: action.Shortcut || '',
  Scene: action.Scene || (action.ActionID as ContextMenuScene),
  PluginType: action.PluginType || 'context-menu',
  ExecutionType: action.ExecutionType || ContextMenuExecutionType.ContextMenu,
  Help: action.Help || '',
  HeadImg: action.HeadImg || '',
  SupportsResultMode: action.SupportsResultMode ?? action.PluginType !== LEGACY_CONTEXT_MENU_PLUGIN_TYPE,
  IsAIPlugin: !!action.IsAIPlugin,
})

const bindingRequest = (action: ContextMenuAction) => ({
  PluginUUID: action.PluginUUID,
  ActionID: action.ActionID,
  Enabled: action.Enabled,
  Sort: Number(action.Sort || 0),
  Shortcut: action.Shortcut || '',
  ResultMode: action.SupportsResultMode ? action.ResultMode || ContextMenuResultMode.Auto : ContextMenuResultMode.Auto,
  AskBeforeRun: action.AskBeforeRun,
})

const ShortcutEditor: React.FC<{
  action?: ContextMenuAction
  onCancel: () => void
  onSave: (shortcut: string) => void
}> = React.memo(({ action, onCancel, onSave }) => {
  const [keys, setKeys] = useState<string[]>(() => (action?.Shortcut ? action.Shortcut.split('|').filter(Boolean) : []))
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!action) return
    setKeys(action.Shortcut ? action.Shortcut.split('|').filter(Boolean) : [])
    setIsActiveShortcutKeyPage(true)
    const timer = window.setTimeout(() => editorRef.current?.focus(), 0)
    return () => {
      window.clearTimeout(timer)
      setIsActiveShortcutKeyPage(false)
    }
  }, [action])

  const onKeyDown = useMemoizedFn((event: React.KeyboardEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (event.key === 'Escape') {
      onCancel()
      return
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
      setKeys([])
      return
    }
    const next = convertKeyEventToKeyCombination(event.nativeEvent)
    if (!next?.length || next.every((key) => modifierKeys.has(key))) return
    setKeys(next)
  })

  return (
    <YakitModal
      visible={!!action}
      title={action ? `绑定快捷键 · ${action.PluginName}` : '绑定快捷键'}
      width={480}
      centered={true}
      maskClosable={false}
      keyboard={false}
      onCancel={onCancel}
      onOk={() => onSave(keys.join('|'))}
    >
      <div ref={editorRef} className={styles['shortcut-editor']} tabIndex={0} onKeyDown={onKeyDown}>
        <div className={styles['shortcut-hint']}>按下组合键；Backspace 清空，Esc 取消</div>
        <div className={styles['shortcut-value']}>{keys.length ? convertKeyboardToUIKey(keys) : '未绑定'}</div>
      </div>
    </YakitModal>
  )
})

interface ContextMenuManagerProps {
  initialScene?: ContextMenuScene
}

export const ContextMenuManager: React.FC<ContextMenuManagerProps> = React.memo(
  ({ initialScene = ContextMenuScene.HistorySingle }) => {
    const [activeScene, setActiveScene] = useState<ContextMenuScene>(initialScene)
    const [loading, setLoading] = useState(false)
    const [savingKey, setSavingKey] = useState('')
    const [keyword, setKeyword] = useState('')
    const [clearVisible, setClearVisible] = useState(false)
    const [response, setResponse] = useState<QueryContextMenuActionsResponse>({
      Actions: [],
      EnabledCustomPluginCount: 0,
      MaxCustomPluginCount: 15,
    })
    const [shortcutAction, setShortcutAction] = useState<ContextMenuAction>()

    const refresh = useMemoizedFn(async () => {
      setLoading(true)
      try {
        const next = await queryContextMenuActions({ IncludeDisabled: true })
        setResponse({ ...next, Actions: next.Actions.map(normalizeAction) })
      } catch (error) {
        yakitNotify('error', `加载右键插件失败: ${error}`)
      } finally {
        setLoading(false)
      }
    })

    useEffect(() => {
      refresh()
    }, [])

    useEffect(() => {
      emiter.on('editorLocalSaveToLocalList', refresh)
      emiter.on('editorLocalNewToLocalList', refresh)
      return () => {
        emiter.off('editorLocalSaveToLocalList', refresh)
        emiter.off('editorLocalNewToLocalList', refresh)
      }
    }, [])

    useEffect(() => {
      if (sceneOrder.includes(initialScene)) setActiveScene(initialScene)
    }, [initialScene])

    useEffect(() => {
      const switchScene = (scene?: ContextMenuScene) => {
        if (!scene) return
        if (sceneOrder.includes(scene)) setActiveScene(scene)
      }
      emiter.on('switchContextMenuManagerScene', switchScene)
      return () => emiter.off('switchContextMenuManagerScene', switchScene)
    }, [])

    const sceneActions = useMemo(
      () => response.Actions.filter((action) => action.Scene === activeScene),
      [response.Actions, activeScene],
    )
    const sceneGroups = useMemo(() => groupActionsByPlugin(sceneActions), [sceneActions])
    const configuredGroups = useMemo(
      () =>
        sceneGroups
          .filter((group) => group.actions.some((action) => action.Enabled || action.IsCorePlugin))
          .sort((left, right) => {
            const leftAction = getPrimaryAction(left)
            const rightAction = getPrimaryAction(right)
            if (leftAction.IsCorePlugin !== rightAction.IsCorePlugin) return leftAction.IsCorePlugin ? -1 : 1
            return (
              getGroupSort(left) - getGroupSort(right) || leftAction.PluginName.localeCompare(rightAction.PluginName)
            )
          }),
      [sceneGroups],
    )
    const availableGroups = useMemo(() => {
      const search = keyword.trim().toLowerCase()
      return sceneGroups
        .filter((group) => group.actions.every((action) => !action.Enabled && !action.IsCorePlugin))
        .filter(
          (group) =>
            !search ||
            group.actions.some(
              (action) =>
                action.PluginName.toLowerCase().includes(search) ||
                action.Help.toLowerCase().includes(search) ||
                action.HookName.toLowerCase().includes(search) ||
                getCapabilityName(action).toLowerCase().includes(search),
            ),
        )
    }, [sceneGroups, keyword])
    const sceneEnabledPluginUUIDs = useMemo(
      () =>
        new Set(
          sceneActions.filter((action) => action.Enabled && !action.IsCorePlugin).map((action) => action.PluginUUID),
        ),
      [sceneActions],
    )
    const sceneEnabledCustomPluginCount = sceneEnabledPluginUUIDs.size

    const saveAction = useMemoizedFn(async (next: ContextMenuAction, refreshAfter = true) => {
      const key = actionKey(next)
      setSavingKey(key)
      try {
        await setContextMenuActionBinding(bindingRequest(next))
        if (refreshAfter) await refresh()
        emiter.emit('refreshContextMenuActions', next.PluginUUID)
      } catch (error) {
        yakitNotify('error', `保存右键配置失败: ${error}`)
        if (refreshAfter) await refresh()
      } finally {
        setSavingKey('')
      }
    })

    const savePluginActions = useMemoizedFn(
      async (group: ContextMenuPluginGroup, getNextAction: (action: ContextMenuAction) => ContextMenuAction) => {
        setSavingKey(pluginKey(group.PluginUUID))
        try {
          for (const action of group.actions) {
            await setContextMenuActionBinding(bindingRequest(getNextAction(action)))
          }
          await refresh()
          emiter.emit('refreshContextMenuActions', group.PluginUUID)
        } catch (error) {
          yakitNotify('error', `保存右键配置失败: ${error}`)
          await refresh()
        } finally {
          setSavingKey('')
        }
      },
    )

    const addPlugin = useMemoizedFn((group: ContextMenuPluginGroup) => {
      const consumesSlot = !sceneEnabledPluginUUIDs.has(group.PluginUUID)
      if (consumesSlot && sceneEnabledCustomPluginCount >= response.MaxCustomPluginCount) {
        yakitNotify(
          'warning',
          `${contextMenuSceneName[activeScene]}最多启用 ${response.MaxCustomPluginCount} 个自定义右键插件`,
        )
        return
      }
      savePluginActions(group, (action) => ({ ...action, Enabled: true, Sort: configuredGroups.length + 1 }))
    })

    const removePlugin = useMemoizedFn((group: ContextMenuPluginGroup) => {
      if (group.actions.some((action) => action.IsCorePlugin || action.Locked)) return
      savePluginActions(group, (action) => ({ ...action, Enabled: false, Shortcut: '' }))
    })

    const clearScene = useMemoizedFn(async () => {
      const removable = sceneActions.filter((action) => action.Enabled && !action.IsCorePlugin && !action.Locked)
      setClearVisible(false)
      if (!removable.length) return
      setSavingKey('clear')
      try {
        for (const action of removable) {
          await setContextMenuActionBinding(bindingRequest({ ...action, Enabled: false, Shortcut: '' }))
        }
        await refresh()
        emiter.emit('refreshContextMenuActions')
      } catch (error) {
        yakitNotify('error', `清空当前场景失败: ${error}`)
        await refresh()
      } finally {
        setSavingKey('')
      }
    })

    const onDragEnd = useMemoizedFn(async (result: DropResult) => {
      if (!result.destination || result.source.index === result.destination.index) return
      const next = [...configuredGroups]
      const [moved] = next.splice(result.source.index, 1)
      next.splice(result.destination.index, 0, moved)
      const ordered = [
        ...next.filter((group) => getPrimaryAction(group).IsCorePlugin),
        ...next.filter((group) => !getPrimaryAction(group).IsCorePlugin),
      ]
      const sortMap = new Map(ordered.map((group, index) => [group.PluginUUID, index + 1]))
      setResponse((previous) => ({
        ...previous,
        Actions: previous.Actions.map((action) => {
          const sort = sortMap.get(action.PluginUUID)
          return sort === undefined || (!action.Enabled && !action.IsCorePlugin) ? action : { ...action, Sort: sort }
        }),
      }))
      setSavingKey('reorder')
      try {
        for (const group of ordered.filter((item) => !getPrimaryAction(item).IsCorePlugin)) {
          for (const action of group.actions.filter((item) => item.Enabled)) {
            await setContextMenuActionBinding(bindingRequest({ ...action, Sort: sortMap.get(group.PluginUUID) || 0 }))
          }
        }
        emiter.emit('refreshContextMenuActions')
      } catch (error) {
        yakitNotify('error', `保存右键排序失败: ${error}`)
        await refresh()
      } finally {
        setSavingKey('')
      }
    })

    const editPlugin = useMemoizedFn((action: ContextMenuAction) => {
      emiter.emit(
        'openPage',
        JSON.stringify({
          route: YakitRoute.AddYakitScript,
          params: {
            ...defaultAddYakitScriptPageInfo,
            source: YakitRoute.ContextMenuManager,
            editPlugin: {
              id: 0,
              uuid: action.PluginUUID,
              name: action.PluginName,
            },
          },
        }),
      )
    })

    const renderEditButton = (action: ContextMenuAction) => (
      <Tooltip title="在插件编辑器中打开">
        <YakitButton
          type="text2"
          icon={<OutlinePencilaltIcon />}
          onClick={(event) => {
            event.stopPropagation()
            editPlugin(action)
          }}
        >
          编辑
        </YakitButton>
      </Tooltip>
    )

    const renderIdentity = (group: ContextMenuPluginGroup) => {
      const action = getPrimaryAction(group)
      const capabilities = Array.from(new Set(group.actions.map(getCapabilityName))).join('、')
      const help = group.actions.map((item) => item.Help).find(Boolean) || ''
      const meta = `${capabilities}${help ? ` · ${help}` : ''}`
      return (
        <div className={styles['plugin-identity']}>
          <div className={styles['plugin-avatar']}>
            {action.HeadImg ? (
              <img src={action.HeadImg} alt="" />
            ) : action.IsAIPlugin ? (
              <IconSolidAIIcon className={styles['ai-plugin-avatar']} />
            ) : (
              action.PluginName.slice(0, 1).toUpperCase()
            )}
          </div>
          <div className={styles['identity-content']}>
            <div className={styles['plugin-name-line']}>
              <span className={styles['plugin-name']} title={action.PluginName}>
                {action.PluginName}
              </span>
              {action.IsCorePlugin ? <YakitTag color="success">核心</YakitTag> : null}
              <YakitTag color={action.PluginType === LEGACY_CONTEXT_MENU_PLUGIN_TYPE ? 'info' : 'blue'}>
                {action.PluginType === LEGACY_CONTEXT_MENU_PLUGIN_TYPE ? 'CODEC 兼容' : '右键插件'}
              </YakitTag>
            </div>
            <div className={styles['plugin-meta']} title={meta}>
              {meta}
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className={styles['context-menu-manager']}>
        <header className={styles['manager-header']}>
          <div>
            <div className={styles['manager-title']}>右键插件管理</div>
            <div className={styles['manager-description']}>
              只在右键菜单中加载已配置项；旧 CODEC 右键能力沿用原执行方式
            </div>
          </div>
          <div className={styles['manager-actions']}>
            <div className={styles['quota']}>
              <span>{contextMenuSceneName[activeScene]}额度</span>
              <strong>
                {sceneEnabledCustomPluginCount} / {response.MaxCustomPluginCount}
              </strong>
            </div>
            <YakitButton type="outline2" icon={<OutlineRefreshIcon />} onClick={refresh} loading={loading}>
              刷新
            </YakitButton>
          </div>
        </header>

        <div className={styles['manager-body']}>
          <aside className={styles['scene-nav']}>
            <div className={styles['scene-nav-title']}>右键场景</div>
            {sceneOrder.map((scene) => {
              const configuredCount = new Set(
                response.Actions.filter(
                  (action) => action.Scene === scene && (action.Enabled || action.IsCorePlugin),
                ).map((action) => action.PluginUUID),
              ).size
              return (
                <button
                  type="button"
                  key={scene}
                  className={activeScene === scene ? styles['scene-item-active'] : styles['scene-item']}
                  onClick={() => setActiveScene(scene)}
                >
                  <span>{contextMenuSceneName[scene]}</span>
                  <span>{configuredCount}</span>
                </button>
              )
            })}
            <div className={styles['scene-note']}>
              核心插件固定展示且不占额度。每个场景分别最多启用 15 个自定义插件，同一插件在同一场景只占 1 个名额。
            </div>
          </aside>

          <Spin spinning={loading} wrapperClassName={styles['workspace-spin']}>
            <main className={styles['workspace']}>
              <section className={styles['configured-panel']}>
                <div className={styles['panel-header']}>
                  <div>
                    <div className={styles['panel-title']}>当前菜单</div>
                    <div className={styles['panel-description']}>拖动调整顺序，配置后立即在该场景生效</div>
                  </div>
                  <YakitButton
                    type="text2"
                    colors="danger"
                    icon={<OutlineTrashIcon />}
                    disabled={!configuredGroups.some((group) => !getPrimaryAction(group).IsCorePlugin) || !!savingKey}
                    onClick={() => setClearVisible(true)}
                  >
                    清空当前场景
                  </YakitButton>
                </div>

                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId={`context-menu-${activeScene}`}>
                    {(provided) => (
                      <div className={styles['configured-list']} ref={provided.innerRef} {...provided.droppableProps}>
                        {configuredGroups.map((group, index) => {
                          const action = getPrimaryAction(group)
                          const key = pluginKey(group.PluginUUID)
                          const groupSaving = savingKey === key
                          const groupLocked = group.actions.some((item) => item.IsCorePlugin || item.Locked)
                          return (
                            <Draggable
                              key={key}
                              draggableId={key}
                              index={index}
                              isDragDisabled={groupLocked || !!savingKey}
                            >
                              {(dragProvided, snapshot) => (
                                <article
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  className={`${styles['configured-row']} ${
                                    snapshot.isDragging ? styles['row-dragging'] : ''
                                  }`}
                                >
                                  <div className={styles['row-main']}>
                                    <span className={styles['drag-handle']} {...dragProvided.dragHandleProps}>
                                      ⋮⋮
                                    </span>
                                    {renderIdentity(group)}
                                    {renderEditButton(action)}
                                    {groupLocked ? (
                                      <span className={styles['locked-text']}>固定展示</span>
                                    ) : (
                                      <YakitButton
                                        type="text2"
                                        colors="danger"
                                        icon={<OutlineCloseIcon />}
                                        disabled={groupSaving}
                                        onClick={() => removePlugin(group)}
                                      >
                                        移除
                                      </YakitButton>
                                    )}
                                  </div>
                                  {group.actions.map((item) => {
                                    const actionSaving =
                                      groupSaving || savingKey === actionKey(item) || savingKey === 'reorder'
                                    const actionDisabled = !item.Enabled && !item.IsCorePlugin
                                    return (
                                      <div className={styles['row-settings']} key={actionKey(item)}>
                                        {group.actions.length > 1 ? (
                                          <div className={styles['ability-setting-header']}>
                                            <span>{getCapabilityName(item)}</span>
                                            <YakitSwitch
                                              size="small"
                                              checked={item.Enabled || item.IsCorePlugin}
                                              disabled={item.IsCorePlugin || item.Locked || actionSaving}
                                              onChange={(checked) =>
                                                saveAction({
                                                  ...item,
                                                  Enabled: checked,
                                                  Sort: getGroupSort(group),
                                                  Shortcut: checked ? item.Shortcut : '',
                                                })
                                              }
                                            />
                                          </div>
                                        ) : null}
                                        <label>
                                          <span>快捷键</span>
                                          <YakitButton
                                            type="outline2"
                                            onClick={() => setShortcutAction(item)}
                                            disabled={actionDisabled || actionSaving}
                                          >
                                            {item.Shortcut
                                              ? convertKeyboardToUIKey(item.Shortcut.split('|').filter(Boolean))
                                              : '未绑定'}
                                          </YakitButton>
                                        </label>
                                        <label>
                                          <span>结果展示</span>
                                          {item.SupportsResultMode ? (
                                            <YakitSelect
                                              value={item.ResultMode}
                                              disabled={actionDisabled || actionSaving}
                                              options={Object.values(ContextMenuResultMode).map((mode) => ({
                                                value: mode,
                                                label: contextMenuResultModeName[mode],
                                              }))}
                                              onChange={(value) => saveAction({ ...item, ResultMode: value })}
                                            />
                                          ) : (
                                            <span className={styles['legacy-result']}>沿用 CODEC</span>
                                          )}
                                        </label>
                                        <label className={styles['ask-setting']}>
                                          <span>执行前询问参数</span>
                                          <YakitSwitch
                                            size="small"
                                            checked={item.AskBeforeRun}
                                            disabled={
                                              actionDisabled ||
                                              !item.Params.length ||
                                              item.ExecutionType === ContextMenuExecutionType.LegacyPacketMutate ||
                                              actionSaving
                                            }
                                            onChange={(checked) => saveAction({ ...item, AskBeforeRun: checked })}
                                          />
                                        </label>
                                      </div>
                                    )
                                  })}
                                </article>
                              )}
                            </Draggable>
                          )
                        })}
                        {provided.placeholder}
                        {!configuredGroups.length && (
                          <YakitEmpty
                            title="当前场景还没有配置右键插件"
                            descriptionReactNode="从右侧列表添加常用插件"
                          />
                        )}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </section>

              <section className={styles['available-panel']}>
                <div className={styles['panel-header']}>
                  <div>
                    <div className={styles['panel-title']}>可添加插件</div>
                    <div className={styles['panel-description']}>{availableGroups.length} 个可用于当前场景</div>
                  </div>
                </div>
                <div className={styles['search-wrapper']}>
                  <YakitInput
                    prefix={<OutlineSearchIcon />}
                    placeholder="搜索插件名称、说明或 Hook"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    allowClear={true}
                  />
                </div>
                <div className={styles['available-list']}>
                  {availableGroups.map((group) => {
                    const action = getPrimaryAction(group)
                    const consumesSlot = !sceneEnabledPluginUUIDs.has(group.PluginUUID)
                    const quotaFull = consumesSlot && sceneEnabledCustomPluginCount >= response.MaxCustomPluginCount
                    return (
                      <article className={styles['available-row']} key={pluginKey(group.PluginUUID)}>
                        {renderIdentity(group)}
                        {renderEditButton(action)}
                        <YakitButton
                          type="text"
                          icon={<OutlinePlusIcon />}
                          disabled={quotaFull || !!savingKey}
                          onClick={() => addPlugin(group)}
                        >
                          {quotaFull ? '额度已满' : '添加'}
                        </YakitButton>
                      </article>
                    )
                  })}
                  {!availableGroups.length && (
                    <YakitEmpty title={keyword ? '没有匹配的插件' : '当前场景没有更多可添加插件'} />
                  )}
                </div>
              </section>
            </main>
          </Spin>
        </div>

        <ShortcutEditor
          action={shortcutAction}
          onCancel={() => setShortcutAction(undefined)}
          onSave={(shortcut) => {
            if (!shortcutAction) return
            saveAction({ ...shortcutAction, Shortcut: shortcut })
            setShortcutAction(undefined)
          }}
        />
        <YakitHint
          visible={clearVisible}
          title={`清空 ${contextMenuSceneName[activeScene]} 配置？`}
          content="核心插件会保留，其余插件将从当前场景的右键菜单中移除。"
          okButtonText="确认清空"
          okButtonProps={{ colors: 'danger' }}
          onOk={clearScene}
          onCancel={() => setClearVisible(false)}
        />
      </div>
    )
  },
)
