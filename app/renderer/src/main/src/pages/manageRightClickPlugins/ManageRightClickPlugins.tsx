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
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { yakitNotify } from '@/utils/notification'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import { RollingLoadList } from '@/components/RollingLoadList/RollingLoadList'
import { DragSortIcon } from '@/assets/newIcon'
import { OutlineBanIcon, OutlinePhotographIcon, OutlineXIcon } from '@/assets/icon/outline'
import { PrivateOutlineDefaultPluginIcon } from '@/routes/privateIcon'
import { PluginLocalInfoIcon } from '../customizeMenu/CustomizeMenu'
import type { QueryYakScriptsResponse, YakScript } from '../invoker/schema'
import { RemotePluginGV } from '@/enums/plugin'
import {
  DROP_AVAILABLE,
  DROP_SELECTED,
  getAllGroupTags,
  getGroupTabByKey,
  GroupTabList,
  UpperLimit,
  type RightClickPluginItem,
  type RightClickPluginsOrderCache,
} from './constants'
import {
  fetchDefaultPluginsByTag,
  fetchPluginsByCustomNames,
  getItemStyle,
  parsePluginTags,
  reorder,
  yakScriptToPluginItem,
} from './utils'
import styles from './ManageRightClickPlugins.module.scss'

const { ipcRenderer } = window.require('electron')

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
  useEffect(() => {
    if (pageInfo?.tab) {
      setCurrentTabKey(pageInfo.tab)
    }
  }, [pageInfo?.tab])
  const onSelectTab = useMemoizedFn((key: string) => {
    setCurrentTabKey(key)
  })
  const currentGroupLabel = useMemo(() => {
    const labelKey = getGroupTabByKey(currentTabKey)?.label
    return labelKey ? t(labelKey) : currentTabKey
  }, [currentTabKey, i18nRefresh])
  // #endregion

  // #region 插件状态与引用
  /** 各 tab 下已添加的插件（含顺序），以 tab.key 为索引 */
  const [pluginsByTab, setPluginsByTab] = useState<Record<string, RightClickPluginItem[]>>({})
  const pluginsByTabRef = useLatest(pluginsByTab)
  /** 当前 tab 对应的已选插件列表 */
  const selectedPlugins = useMemo(() => pluginsByTab[currentTabKey] || [], [pluginsByTab, currentTabKey])
  /** 右侧可用插件列表（拖拽入中间时按 index 取对应插件） */
  const availablePluginsRef = useRef<YakScript[]>([])
  /** 自定义顺序缓存：tab.key -> 插件名数组 */
  const customOrderCacheRef = useRef<RightClickPluginsOrderCache>({})
  /** 拖拽目标区域标识（用于高亮当前拖拽落点） */
  const [destinationDrag, setDestinationDrag] = useState<string>(DROP_SELECTED)
  /** 添加插件任务队列，保证频繁点击/拖拽时接口依次触发且不丢请求 */
  const addTaskQueueRef = useRef<Promise<void>>(Promise.resolve())
  // #endregion

  // #region 已选插件数据刷新
  /**
   * 刷新中间已选插件：
   * - 有自定义顺序的 tab → 按自定义顺序取插件
   * - 无自定义顺序但有 tag → 默认取该 tag 前 UpperLimit 个
   * - 无自定义顺序且无 tag → 空列表
   */
  const refreshSelectedPlugins = useMemoizedFn(() => {
    getRemoteValue(RemotePluginGV.RightClickPluginsOrder)
      .then((val) => {
        let customCache: RightClickPluginsOrderCache = {}
        try {
          customCache = val ? JSON.parse(val) : {}
        } catch (error) {
          customCache = {}
        }
        if (!customCache || typeof customCache !== 'object') customCache = {}
        customOrderCacheRef.current = customCache

        return Promise.all(
          GroupTabList.map(({ key, tag }) => {
            const customNames = customCache[key]
            if (Array.isArray(customNames)) {
              const names = customNames.slice(0, UpperLimit)
              return fetchPluginsByCustomNames(names, tag).then((list) => ({
                key,
                list,
                fromCustom: true as const,
                customNames: names,
              }))
            }
            return fetchDefaultPluginsByTag(tag).then((list) => ({
              key,
              list,
              fromCustom: false as const,
              customNames: [] as string[],
            }))
          }),
        )
      })
      .catch(() =>
        // 缓存读取异常时降级：全部按默认 tag 加载
        Promise.all(
          GroupTabList.map(({ key, tag }) =>
            fetchDefaultPluginsByTag(tag).then((list) => ({
              key,
              list,
              fromCustom: false as const,
              customNames: [] as string[],
            })),
          ),
        ),
      )
      .then((results) => {
        const next: Record<string, RightClickPluginItem[]> = {}
        const nextCache: RightClickPluginsOrderCache = { ...customOrderCacheRef.current }
        let cacheChanged = false

        results.forEach(({ key, list, fromCustom, customNames }) => {
          next[key] = list
          // 自定义缓存中已失效的插件同步清理
          if (fromCustom) {
            const validNames = list.map((item) => item.scriptName)
            const isSame =
              validNames.length === customNames.length && validNames.every((name, index) => name === customNames[index])
            if (!isSame) {
              nextCache[key] = validNames
              cacheChanged = true
            }
          }
        })

        setPluginsByTab(next)
        pluginsByTabRef.current = next
        if (cacheChanged) {
          customOrderCacheRef.current = nextCache
          setRemoteValue(RemotePluginGV.RightClickPluginsOrder, JSON.stringify(nextCache))
        }
      })
  })
  useEffect(() => {
    if (!inViewport) return
    refreshSelectedPlugins()
  }, [inViewport])
  // #endregion

  // #region 已选插件的增删改操作
  /** 保存某个 tab 的自定义顺序到远端缓存 */
  const savePluginOrder = useMemoizedFn((tabKey: string, list: RightClickPluginItem[]) => {
    const nextCache: RightClickPluginsOrderCache = {
      ...customOrderCacheRef.current,
      [tabKey]: list.map((item) => item.scriptName),
    }
    customOrderCacheRef.current = nextCache
    setRemoteValue(RemotePluginGV.RightClickPluginsOrder, JSON.stringify(nextCache))
  })

  /**
   * 更新某个 tab 的已选插件列表
   * @param list 新的插件列表
   * @param needSave 是否需要同步保存自定义顺序
   * @param tabKey 目标 tab，默认取当前 tab
   */
  const updateSelectedPlugins = useMemoizedFn(
    (list: RightClickPluginItem[], needSave = false, tabKey = currentTabKeyRef.current) => {
      const nextMap = {
        ...pluginsByTabRef.current,
        [tabKey]: list,
      }
      pluginsByTabRef.current = nextMap
      setPluginsByTab(nextMap)
      if (needSave) {
        savePluginOrder(tabKey, list)
      }
    },
  )

  /**
   * 仅当 tab 配置了 tag，且插件缺少该 tag 时，更新插件详情补上
   * 返回带正确 tag 的插件对象
   */
  const ensurePluginHasTag = useMemoizedFn(async (plugin: YakScript, tag?: string): Promise<YakScript> => {
    if (!tag) return plugin
    let latest = plugin
    try {
      latest = await ipcRenderer.invoke('GetYakScriptById', { Id: plugin.Id })
    } catch (error) {
      // 拉详情失败时回退用列表中的数据
    }
    const tags = parsePluginTags(latest.Tags)
    if (tags.includes(tag)) return latest

    const newTags = [...tags, tag].join(',')
    return ipcRenderer.invoke('SaveYakScript', {
      ...latest,
      Tags: newTags,
    })
  })

  /** 同步更新右侧可用列表中的插件详情（tag 变更后回写） */
  const syncAvailablePluginDetail = useMemoizedFn((plugin: YakScript) => {
    const index = availablePluginsRef.current.findIndex(
      (item) => item.Id === plugin.Id || item.ScriptName === plugin.ScriptName,
    )
    if (index >= 0) {
      availablePluginsRef.current[index] = plugin
    }
  })

  /**
   * 添加插件到中间已选列表
   * - 有 tag 的 tab：必要时先更新插件 tag
   * - 无 tag 的 tab：只写入该 tab 自己的已选数据
   * 通过队列串行执行，频繁点击/拖拽时每个请求都会触发
   */
  const addPluginToSelected = useMemoizedFn((plugin: YakScript, insertIndex?: number) => {
    const tabKey = currentTabKeyRef.current
    const tabTag = getGroupTabByKey(tabKey)?.tag
    addTaskQueueRef.current = addTaskQueueRef.current.then(async () => {
      try {
        const currentList = pluginsByTabRef.current[tabKey] || []
        if (currentList.length >= UpperLimit) {
          yakitNotify('error', t('ManageRightClickPlugins.maxAddLimit', { UpperLimit }))
          return
        }
        if (currentList.some((i) => i.scriptName === plugin.ScriptName)) return

        const updatedPlugin = await ensurePluginHasTag(plugin, tabTag)
        syncAvailablePluginDetail(updatedPlugin)
        const pluginItem = yakScriptToPluginItem(updatedPlugin)
        const next = [...(pluginsByTabRef.current[tabKey] || [])]
        if (next.some((i) => i.scriptName === pluginItem.scriptName)) return
        if (typeof insertIndex === 'number') {
          next.splice(Math.min(insertIndex, next.length), 0, pluginItem)
        } else {
          next.unshift(pluginItem)
        }
        if (next.length > UpperLimit) {
          yakitNotify('error', t('ManageRightClickPlugins.maxAddLimit', { UpperLimit }))
          return
        }
        updateSelectedPlugins(next, true, tabKey)
      } catch (error) {
        yakitNotify('error', t('ManageRightClickPlugins.updatePluginTagFailed', { error }))
      }
    })
  })

  /** 点击右侧插件的“添加”按钮 */
  const onAddPlugin = useMemoizedFn((plugin: YakScript) => {
    addPluginToSelected(plugin)
  })

  /** 移除某个已选插件 */
  const onRemovePlugin = useMemoizedFn((plugin: RightClickPluginItem) => {
    const tabKey = currentTabKeyRef.current
    updateSelectedPlugins(
      (pluginsByTabRef.current[tabKey] || []).filter((i) => i.scriptName !== plugin.scriptName),
      true,
      tabKey,
    )
  })

  /** 清空当前 tab 已添加插件 */
  const onClearSelectedPlugins = useMemoizedFn(() => {
    const tabKey = currentTabKeyRef.current
    updateSelectedPlugins([], true, tabKey)
  })
  // #endregion

  // #region 拖拽交互
  /** 拖拽结束：处理已选列表内排序 / 右侧拖入已选列表 */
  const onDragEnd = useMemoizedFn((result: DropResult, _provided: ResponderProvided) => {
    if (!result.destination) return

    // 已选列表内排序
    if (result.source.droppableId === DROP_SELECTED && result.destination.droppableId === DROP_SELECTED) {
      const tabKey = currentTabKeyRef.current
      const currentList = pluginsByTabRef.current[tabKey] || []
      updateSelectedPlugins(reorder(currentList, result.source.index, result.destination.index), true, tabKey)
      return
    }

    // 右侧可用插件拖入已选列表
    if (result.source.droppableId === DROP_AVAILABLE && result.destination.droppableId === DROP_SELECTED) {
      const currentPlugin = availablePluginsRef.current[result.source.index]
      if (!currentPlugin) return
      addPluginToSelected(currentPlugin, result.destination.index)
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
                    count: selectedPlugins.length,
                    UpperLimit,
                  })}
                </div>
                <YakitPopconfirm
                  title={t('ManageRightClickPlugins.clearConfirm')}
                  onConfirm={onClearSelectedPlugins}
                  placement="bottomRight"
                  disabled={selectedPlugins.length === 0}
                >
                  <YakitButton type="outline1" colors="danger" disabled={selectedPlugins.length === 0}>
                    {t('YakitButton.clear')}
                  </YakitButton>
                </YakitPopconfirm>
              </div>
            </div>
            <div className={styles['selected-panel-list']}>
              <Droppable droppableId={DROP_SELECTED}>
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className={styles['selected-drop-area']}>
                    {selectedPlugins.map((item, index) => (
                      <Draggable key={item.scriptName} draggableId={item.scriptName} index={index}>
                        {(providedItem, snapshot) => (
                          <div
                            ref={providedItem.innerRef}
                            {...providedItem.draggableProps}
                            {...providedItem.dragHandleProps}
                            style={getItemStyle(snapshot.isDragging, providedItem.draggableProps.style)}
                          >
                            <SelectedPluginItem
                              plugin={item}
                              isDragging={snapshot.isDragging}
                              onRemove={onRemovePlugin}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {selectedPlugins.length === 0 && (
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
          <div className={styles['right-title']}>{t('ManageRightClickPlugins.rightClickPlugins')}</div>
          <div className={styles['right-help']}>{t('ManageRightClickPlugins.rightHelp')}</div>
          <AvailablePluginList
            inViewport={!!inViewport}
            destinationDrag={destinationDrag}
            setAvailablePlugins={(list) => {
              availablePluginsRef.current = list
            }}
            onAddPlugin={onAddPlugin}
            selectedPlugins={selectedPlugins}
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
  plugin: RightClickPluginItem
  isDragging: boolean
  onRemove: (plugin: RightClickPluginItem) => void
}

const SelectedPluginItem: React.FC<SelectedPluginItemProps> = React.memo((props) => {
  const { plugin, isDragging, onRemove } = props
  return (
    <div className={styles['selected-item-wrap']}>
      <div
        className={classNames(styles['selected-item'], {
          [styles['selected-item-dragging']]: isDragging,
        })}
      >
        <DragSortIcon
          className={classNames({
            [styles['drag-icon-active']]: isDragging,
          })}
        />
        <Avatar
          className={styles['plugin-avatar']}
          src={plugin.headImg || ''}
          icon={<PrivateOutlineDefaultPluginIcon />}
        />
        <div className={styles['selected-item-body']}>
          <div className={styles['selected-item-name']}>{plugin.scriptName}</div>
          <div className={styles['selected-item-desc']}>{plugin.help || 'No Description about it.'}</div>
        </div>
        <YakitButton
          size="small"
          type="text2"
          icon={<OutlineXIcon className={styles['remove-icon']} />}
          onClick={() => onRemove(plugin)}
        />
      </div>
    </div>
  )
})
// #endregion

// #region 可用插件列表（右侧滚动加载）
interface AvailablePluginListProps {
  inViewport: boolean
  destinationDrag: string
  setAvailablePlugins: (list: YakScript[]) => void
  onAddPlugin: (plugin: YakScript) => void
  selectedPlugins: RightClickPluginItem[]
  onRemovePlugin: (plugin: RightClickPluginItem) => void
}

const AvailablePluginList: React.FC<AvailablePluginListProps> = React.memo((props) => {
  const { inViewport, destinationDrag, setAvailablePlugins, onAddPlugin, selectedPlugins, onRemovePlugin } = props
  const [response, setResponse] = useState<QueryYakScriptsResponse>({
    Data: [],
    Pagination: {
      Limit: 20,
      Page: 0,
      Order: 'desc',
      OrderBy: 'updated_at',
    },
    Total: 0,
  })
  const [loading, setLoading] = useState<boolean>(false)
  const [hasMore, setHasMore] = useState(false)
  const [isRef, setIsRef] = useState(false)
  const responseDataRef = useRef<YakScript[]>([])

  /** 查询本地插件列表 */
  const getYakScriptList = useMemoizedFn((page?: number, limit?: number) => {
    const newParams = {
      Pagination: { Limit: 20, Order: 'desc', Page: 1, OrderBy: 'updated_at' },
      Keyword: '',
      Tag: getAllGroupTags(),
    }
    if (page) newParams.Pagination.Page = page
    if (limit) newParams.Pagination.Limit = limit
    setLoading(true)
    ipcRenderer
      .invoke('QueryYakScript', newParams)
      .then((item: QueryYakScriptsResponse) => {
        const data = page === 1 ? item.Data : responseDataRef.current.concat(item.Data)
        const isMore = item.Data.length < item.Pagination.Limit
        setHasMore(!isMore)
        responseDataRef.current = data
        setResponse({
          ...item,
          Data: [...data],
        })
        setAvailablePlugins(data)
        if (page === 1) {
          setIsRef((v) => !v)
        }
      })
      .catch((e: any) => {
        yakitNotify('error', 'Query Local Yak Script failed: ' + `${e}`)
      })
      .finally(() => {
        setTimeout(() => {
          setLoading(false)
        }, 200)
      })
  })

  /** 进入视口时重置并加载第一页 */
  useEffect(() => {
    if (!inViewport) return
    responseDataRef.current = []
    getYakScriptList(1, 20)
  }, [inViewport])

  /** 加载下一页 */
  const loadMoreData = useMemoizedFn(() => {
    getYakScriptList(parseInt(`${response.Pagination.Page}`) + 1, 20)
  })

  return (
    <Droppable droppableId={DROP_AVAILABLE}>
      {(provided) => (
        <div className={styles['available-list']} {...provided.droppableProps} ref={provided.innerRef}>
          <RollingLoadList<YakScript>
            isRef={isRef}
            data={response.Data}
            page={response.Pagination.Page}
            hasMore={hasMore}
            loading={loading}
            loadMoreData={loadMoreData}
            defItemHeight={44}
            renderRow={(data: YakScript, index) => {
              const isAdded = selectedPlugins.some((i) => i.scriptName === data.ScriptName)
              return (
                <Draggable key={data.Id} draggableId={`${data.Id}-plugin`} index={index} isDragDisabled={isAdded}>
                  {(providedItem, snapshot) => (
                    <div
                      ref={providedItem.innerRef}
                      {...providedItem.draggableProps}
                      {...providedItem.dragHandleProps}
                      style={getItemStyle(snapshot.isDragging, providedItem.draggableProps.style)}
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
            }}
          />
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  )
})
// #endregion

// #region 可用插件单项
interface AvailablePluginItemProps {
  plugin: YakScript
  isDragging: boolean
  destinationDrag: string
  onAddPlugin: (plugin: YakScript) => void
  isAdded: boolean
  onRemovePlugin: (plugin: RightClickPluginItem) => void
}

const AvailablePluginItem: React.FC<AvailablePluginItemProps> = React.memo((props) => {
  const { plugin, isDragging, destinationDrag, onAddPlugin, isAdded, onRemovePlugin } = props
  const { t } = useI18nNamespaces(['manageRightClickPlugins', 'yakitUi'])
  const pluginRef = useRef(null)
  const isHovering = useHover(pluginRef)

  const onAdd = useMemoizedFn(() => {
    onAddPlugin(plugin)
  })
  const onRemove = useMemoizedFn(() => {
    onRemovePlugin(yakScriptToPluginItem(plugin))
  })

  return (
    <div
      className={classNames(styles['available-item'], {
        [styles['available-item-dragging']]: isDragging,
      })}
      ref={pluginRef}
    >
      <div className={styles['available-item-left']}>
        <img
          alt=""
          src={plugin.HeadImg}
          className={classNames(styles['available-item-avatar'], {
            [styles['item-disabled']]: isAdded,
          })}
        />
        <span
          className={classNames(styles['available-item-name'], {
            [styles['item-disabled']]: isAdded,
          })}
        >
          {plugin.ScriptName}
        </span>
        <PluginLocalInfoIcon plugin={plugin} />
      </div>
      {(isAdded && (
        <>
          {isHovering ? (
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
