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
    const configuredActions = useMemo(
      () =>
        sceneActions
          .filter((action) => action.Enabled || action.IsCorePlugin)
          .sort((left, right) => {
            if (left.IsCorePlugin !== right.IsCorePlugin) return left.IsCorePlugin ? -1 : 1
            return left.Sort - right.Sort || left.PluginName.localeCompare(right.PluginName)
          }),
      [sceneActions],
    )
    const availableActions = useMemo(() => {
      const search = keyword.trim().toLowerCase()
      return sceneActions
        .filter((action) => !action.Enabled && !action.IsCorePlugin)
        .filter(
          (action) =>
            !search ||
            action.PluginName.toLowerCase().includes(search) ||
            action.Help.toLowerCase().includes(search) ||
            action.HookName.toLowerCase().includes(search),
        )
        .sort((left, right) => left.PluginName.localeCompare(right.PluginName))
    }, [sceneActions, keyword])
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

    const addAction = useMemoizedFn((action: ContextMenuAction) => {
      const consumesSlot = !sceneEnabledPluginUUIDs.has(action.PluginUUID)
      if (consumesSlot && sceneEnabledCustomPluginCount >= response.MaxCustomPluginCount) {
        yakitNotify(
          'warning',
          `${contextMenuSceneName[activeScene]}最多启用 ${response.MaxCustomPluginCount} 个自定义右键插件`,
        )
        return
      }
      saveAction({ ...action, Enabled: true, Sort: configuredActions.length + 1 })
    })

    const removeAction = useMemoizedFn((action: ContextMenuAction) => {
      if (action.IsCorePlugin || action.Locked) return
      saveAction({ ...action, Enabled: false, Shortcut: '' })
    })

    const clearScene = useMemoizedFn(async () => {
      const removable = configuredActions.filter((action) => !action.IsCorePlugin && !action.Locked)
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
      const next = [...configuredActions]
      const [moved] = next.splice(result.source.index, 1)
      next.splice(result.destination.index, 0, moved)
      const ordered = [
        ...next.filter((action) => action.IsCorePlugin),
        ...next.filter((action) => !action.IsCorePlugin),
      ]
      const sortMap = new Map(ordered.map((action, index) => [actionKey(action), index + 1]))
      setResponse((previous) => ({
        ...previous,
        Actions: previous.Actions.map((action) => {
          const sort = sortMap.get(actionKey(action))
          return sort === undefined ? action : { ...action, Sort: sort }
        }),
      }))
      setSavingKey('reorder')
      try {
        for (const action of ordered.filter((item) => !item.IsCorePlugin)) {
          await setContextMenuActionBinding(bindingRequest({ ...action, Sort: sortMap.get(actionKey(action)) || 0 }))
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

    const renderIdentity = (action: ContextMenuAction) => (
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
          <div className={styles['plugin-meta']} title={action.Help || action.HookName}>
            {action.HookName}
            {action.Help ? ` · ${action.Help}` : ''}
          </div>
        </div>
      </div>
    )

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
              const configuredCount = response.Actions.filter(
                (action) => action.Scene === scene && (action.Enabled || action.IsCorePlugin),
              ).length
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
                    disabled={!configuredActions.some((action) => !action.IsCorePlugin) || !!savingKey}
                    onClick={() => setClearVisible(true)}
                  >
                    清空当前场景
                  </YakitButton>
                </div>

                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId={`context-menu-${activeScene}`}>
                    {(provided) => (
                      <div className={styles['configured-list']} ref={provided.innerRef} {...provided.droppableProps}>
                        {configuredActions.map((action, index) => {
                          const key = actionKey(action)
                          const actionSaving = savingKey === key
                          return (
                            <Draggable
                              key={key}
                              draggableId={key}
                              index={index}
                              isDragDisabled={action.IsCorePlugin || action.Locked || !!savingKey}
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
                                    {renderIdentity(action)}
                                    {renderEditButton(action)}
                                    {action.IsCorePlugin ? (
                                      <span className={styles['locked-text']}>固定展示</span>
                                    ) : (
                                      <YakitButton
                                        type="text2"
                                        colors="danger"
                                        icon={<OutlineCloseIcon />}
                                        disabled={actionSaving}
                                        onClick={() => removeAction(action)}
                                      >
                                        移除
                                      </YakitButton>
                                    )}
                                  </div>
                                  <div className={styles['row-settings']}>
                                    <label>
                                      <span>快捷键</span>
                                      <YakitButton
                                        type="outline2"
                                        onClick={() => setShortcutAction(action)}
                                        disabled={actionSaving}
                                      >
                                        {action.Shortcut
                                          ? convertKeyboardToUIKey(action.Shortcut.split('|').filter(Boolean))
                                          : '未绑定'}
                                      </YakitButton>
                                    </label>
                                    <label>
                                      <span>结果展示</span>
                                      {action.SupportsResultMode ? (
                                        <YakitSelect
                                          value={action.ResultMode}
                                          disabled={actionSaving}
                                          options={Object.values(ContextMenuResultMode).map((mode) => ({
                                            value: mode,
                                            label: contextMenuResultModeName[mode],
                                          }))}
                                          onChange={(value) => saveAction({ ...action, ResultMode: value })}
                                        />
                                      ) : (
                                        <span className={styles['legacy-result']}>沿用 CODEC</span>
                                      )}
                                    </label>
                                    <label className={styles['ask-setting']}>
                                      <span>执行前询问参数</span>
                                      <YakitSwitch
                                        size="small"
                                        checked={action.AskBeforeRun}
                                        disabled={
                                          !action.Params.length ||
                                          action.ExecutionType === ContextMenuExecutionType.LegacyPacketMutate ||
                                          actionSaving
                                        }
                                        onChange={(checked) => saveAction({ ...action, AskBeforeRun: checked })}
                                      />
                                    </label>
                                  </div>
                                </article>
                              )}
                            </Draggable>
                          )
                        })}
                        {provided.placeholder}
                        {!configuredActions.length && (
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
                    <div className={styles['panel-description']}>{availableActions.length} 项可用于当前场景</div>
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
                  {availableActions.map((action) => {
                    const consumesSlot = !sceneEnabledPluginUUIDs.has(action.PluginUUID)
                    const quotaFull = consumesSlot && sceneEnabledCustomPluginCount >= response.MaxCustomPluginCount
                    return (
                      <article className={styles['available-row']} key={actionKey(action)}>
                        {renderIdentity(action)}
                        {renderEditButton(action)}
                        <YakitButton
                          type="text"
                          icon={<OutlinePlusIcon />}
                          disabled={quotaFull || !!savingKey}
                          onClick={() => addAction(action)}
                        >
                          {quotaFull ? '额度已满' : '添加'}
                        </YakitButton>
                      </article>
                    )
                  })}
                  {!availableActions.length && (
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
