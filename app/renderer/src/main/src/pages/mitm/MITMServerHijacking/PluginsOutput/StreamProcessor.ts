import { DEFAULT_LOG_LIMIT } from '@/defaultConstants/HoldGRPCStream'
import { v4 as uuidv4 } from 'uuid'
import { JSONParseLog } from '@/utils/tool'
import { HoldGRPCStreamInfo, HoldGRPCStreamProps, StreamResult } from '@/hook/useHoldGRPCStream/useHoldGRPCStreamType'
import { checkStreamValidity, convertCardInfo } from '@/hook/useHoldGRPCStream/useHoldGRPCStream'
import { DefaultTabs } from '@/hook/useHoldGRPCStream/constant'
import { cloneDeep } from 'lodash'
import { useEffect, useReducer } from 'react'

export type StreamUpdateState = {
  hasNewPlugin?: boolean
  newTables?: Set<string>
  tableDataUpdate?: Set<string>
  hasNewMarkdown?: boolean
}

const DefaultStreamInfo = {
  progressState: [],
  cardState: [],
  tabsState: [],
  tabsInfoState: {},
  riskState: [],
  logState: [],
  rulesState: [],
}

/**
 * StreamProcessorManager 负责统一管理所有插件的 StreamProcessor 实例。
 *
 * 主要职责如下：
 * 1. 管控所有插件的日志条数上限；
 * 2. 跟踪和记录每个插件的更新状态（如新插件、新表格、新表格数据、新 Markdown 数据）；
 * 3. 统一收集并生成所有插件的流输出快照（包括日志、卡片、tab页等）；
 * 4. 支持订阅通知机制，当插件数据有变动时自动通知 UI 刷新；
 * 5. 提供按插件名路由消费流数据的能力、及对应的 StreamProcessor 实例管理；
 * 6. 支持插件日志条数上限调整、全量/单插件更新标记清除等常用操作。
 */
export class StreamProcessorManager {
  // 控制所有插件日志保留的最大条数
  limitLogNum = DEFAULT_LOG_LIMIT
  // 插件名 -> StreamProcessor 映射
  processors = new Map<string, StreamProcessor>()
  // 插件名 -> 更新状态映射
  updates = new Map<string, StreamUpdateState>()
  // 是否存在任意插件有未消费的新数据，用于全局更新提示
  hasUpdate = false

  private lastNotify = 0 // 上次通知时间
  private notifyInterval = 1000 // 通知最小间隔(ms)
  private scheduled = false // 通知调度标记
  listeners = new Set<() => void>() // 订阅 UI 更新的回调集

  /**
   * 订阅更新回调，返回解绑函数
   */
  subscribe(fn: () => void) {
    this.listeners.add(fn)

    return () => {
      this.listeners.delete(fn)
    }
  }

  /**
   * 节流触发所有订阅回调（一次微任务内只允许一次）
   */
  notify() {
    const now = Date.now()
    if (now - this.lastNotify < this.notifyInterval) return
    if (this.scheduled) return

    this.scheduled = true
    this.lastNotify = now

    requestAnimationFrame(() => {
      this.listeners.forEach((fn) => fn())
      this.scheduled = false
    })
  }

  /**
   * 根据插件名获取 StreamProcessor，如无则自动创建，同时设置监听以同步更新状态
   * @param pluginName 插件名
   */
  getProcessor(pluginName: string) {
    if (!this.processors.has(pluginName)) {
      const processor = new StreamProcessor()
      processor.limitLogNum = this.limitLogNum
      this.processors.set(pluginName, processor)

      // 新插件加入时初始化更新标志
      if (!this.updates.has(pluginName) && pluginName !== 'default') {
        this.updates.set(pluginName, {
          hasNewPlugin: true,
          newTables: new Set(),
          tableDataUpdate: new Set(),
          hasNewMarkdown: false,
        })
        this.hasUpdate = true
        this.notify()
      }

      // 新表格事件：记录表格名到更新标志
      processor.onNewTable = (tableName) => {
        const update = this.updates.get(pluginName)
        if (update) {
          update.newTables?.add(tableName)
          this.hasUpdate = true
          this.notify()
        }
      }

      // 已有表格追加数据事件：标记对应表格
      processor.onTableData = (tableName) => {
        const update = this.updates.get(pluginName)
        if (update) {
          update.tableDataUpdate?.add(tableName)
          this.hasUpdate = true
          this.notify()
        }
      }

      // Markdown tab 新数据事件
      processor.onMarkdownData = () => {
        const update = this.updates.get(pluginName)
        if (update) {
          update.hasNewMarkdown = true
          this.hasUpdate = true
          this.notify()
        }
      }
    }
    return this.processors.get(pluginName)!
  }

  /**
   * 消费一条流数据，并路由给指定插件的 StreamProcessor 处理
   * @param data 单条插件流数据
   */
  consume(data: StreamResult.BaseProsp) {
    const pluginName = data.PluginName || 'default'
    const processor = this.getProcessor(pluginName)
    processor.consume(data)
    this.notify()
  }

  /**
   * 构建所有插件及 default 的最新插件输出快照
   * @param defaultTabs 可额外传入 default 插件的 tab 列表
   */
  buildAllStreamInfo(defaultTabs?: HoldGRPCStreamProps.InfoTab[]) {
    const result: Record<string, HoldGRPCStreamInfo> = {
      // 始终包含 default 输出
      default: cloneDeep(DefaultStreamInfo),
    }

    // 合并所有插件当前输出信息
    this.processors.forEach((processor, pluginName) => {
      result[pluginName] = processor.buildStreamInfo(defaultTabs)
    })

    return result
  }

  /**
   * 重置全部插件数据和更新状态，清空所有缓存（日志、表格、卡片等全部重置）
   */
  reset() {
    this.processors.clear()
    this.updates.clear()
    this.hasUpdate = false
    this.notify()
  }

  /**
   * 调整所有 StreamProcessor 的日志条数上限
   * @param limit 限制条数
   */
  setLimitLogNum(limit: number) {
    this.limitLogNum = limit
    this.processors.forEach((processor) => {
      processor.limitLogNum = limit
    })
  }

  /**
   * 获取所有插件的更新状态
   */
  getUpdates() {
    return this.updates
  }

  /**
   * 标记清除指定插件的“有新数据”标志
   * @param pluginName 插件名
   */
  clearPluginUpdate(pluginName: string) {
    const update = this.updates.get(pluginName)
    if (update) {
      update.hasNewPlugin = false
      update.newTables?.clear()
      update.tableDataUpdate?.clear()
      update.hasNewMarkdown = false
    }

    // 检查全局是否仍有未消费的更新
    if (
      ![...this.updates.values()].some(
        (v) => v.hasNewPlugin || v.newTables?.size || v.tableDataUpdate?.size || v.hasNewMarkdown,
      )
    ) {
      this.hasUpdate = false
    }

    this.notify()
  }

  /**
   * 判断是否存在任意插件有新数据
   */
  getAnyUpdate() {
    return this.hasUpdate
  }

  /**
   * 强制清除全局有更新标志
   */
  clearAnyUpdate() {
    this.hasUpdate = false
    this.notify()
  }
}

export class StreamProcessor {
  // progress
  progressKVPair = new Map<string, number>()
  // card
  cardKVPair = new Map<string, HoldGRPCStreamProps.CacheCard>()
  // 前置tabs
  topTabs: HoldGRPCStreamProps.InfoTab[] = []
  // 后置tabs
  endTabs: HoldGRPCStreamProps.InfoTab[] = []
  // tabInfo-website
  tabWebsite?: StreamResult.WebSite
  // tabInfo-table
  tabTable = new Map<string, HoldGRPCStreamProps.CacheTable>()
  // tabInfo-text
  tabsText = new Map<string, string>()
  // logs
  messages: StreamResult.Message[] = []
  // 插件日志条数
  limitLogNum = DEFAULT_LOG_LIMIT
  // 监听新加表格
  onNewTable?: (tableName: string) => void
  // 监听表格追加新数据
  onTableData?: (tableName: string) => void
  // 监听Markdown日志新数据
  onMarkdownData?: () => void

  /**自定义tab页放前面还是后面 */
  placeTab(info: HoldGRPCStreamProps.InfoTab) {
    const exists = this.topTabs.some((tab) => tab.tabName === info.tabName)
    if (!exists) {
      this.topTabs.unshift(info)
    }
  }

  /**放入日志队列 */
  pushLogs(log: StreamResult.Message) {
    this.messages.unshift({
      ...log,
      content: { ...log.content, id: uuidv4() },
    })
    // 只缓存 全局配置的插件日志条数的结果（日志类型 + 数据类型）
    if (this.messages.length > this.limitLogNum) {
      this.messages.pop()
    }
  }

  consume(data: StreamResult.BaseProsp) {
    const isMessage = data.IsMessage || data.ExecResult?.IsMessage
    if (!isMessage) return

    try {
      const messageArr = data.Message || data.ExecResult?.Message

      const obj: StreamResult.Message = JSONParseLog(Buffer.from(messageArr).toString(), {
        page: 'StreamProcessor',
      })
      this.handleMessage(obj)
    } catch {}
  }

  handleMessage(obj: StreamResult.Message) {
    // progress 进度条
    if (obj.type === 'progress') {
      const processData = obj.content as StreamResult.Progress

      if (processData?.id) {
        this.progressKVPair.set(
          processData.id,
          Math.max(this.progressKVPair.get(processData.id) || 0, processData.progress),
        )
      }

      return
    }

    const logData = obj.content as StreamResult.Log

    if (this.handleCard(obj, logData)) return

    if (this.handleFeature(obj, logData)) return

    if (this.handleTableData(obj, logData)) return

    if (this.handleTextData(obj, logData)) return

    this.handleMarkdownData(obj, logData)
    // 日志信息
    this.pushLogs(obj)
  }

  // feature-status-card-data 卡片展示
  handleCard(obj: StreamResult.Message, logData: StreamResult.Log) {
    if (obj.type !== 'log' || logData.level !== 'feature-status-card-data') return false

    try {
      const checkInfo = checkStreamValidity(logData)
      if (!checkInfo) return true

      const info: StreamResult.Card = checkInfo
      const { id, data, tags } = info
      const origin = this.cardKVPair.get(id)
      if (origin && origin.Timestamp > logData.timestamp) {
        return true
      }
      this.cardKVPair.set(id, {
        Id: id,
        Data: data,
        Timestamp: logData.timestamp,
        Tags: Array.isArray(tags) ? tags : [],
      })
    } catch {}

    return true
  }

  // new-tab(插件自增tab页)
  handleFeature(obj: StreamResult.Message, logData: StreamResult.Log) {
    if (obj.type !== 'log' || logData.level !== 'json-feature') return false

    try {
      const checkInfo = checkStreamValidity(logData)
      if (!checkInfo) return true
      const info: { feature: string; params: any; [key: string]: any } = checkInfo

      let tabInfo: HoldGRPCStreamProps.InfoTab = { tabName: '', type: '' }
      switch (info.feature) {
        case 'website-trees':
          this.tabWebsite = info.params as StreamResult.WebSite
          break

        case 'fixed-table':
          const table = info.params as StreamResult.Table
          tabInfo = {
            tabName: table.table_name,
            type: 'table',
          }

          this.placeTab(tabInfo)

          if (this.tabTable.get(table.table_name)) {
            this.pushLogs(obj)
            break
          } else {
            this.onNewTable?.(table.table_name)
          }

          this.tabTable.set(table.table_name, {
            name: table.table_name,
            columns: table.columns.map((i) => ({
              title: i,
              dataKey: i,
            })),
            data: new Map(),
          } satisfies HoldGRPCStreamProps.CacheTable)
          break

        case 'text':
          const text = info.params as StreamResult.Text
          tabInfo = {
            tabName: text.tab_name,
            type: 'text',
          }

          this.placeTab(tabInfo)

          if (this.tabsText.get(text.tab_name)) {
            this.pushLogs(obj)
            break
          }
          this.tabsText.set(text.tab_name, '')
          break

        default:
          this.pushLogs(obj)
          break
      }
    } catch {}

    return true
  }

  // 自定义table数据
  handleTableData(obj: StreamResult.Message, logData: StreamResult.Log) {
    if (obj.type !== 'log' || logData.level !== 'feature-table-data') return false

    try {
      const checkInfo = checkStreamValidity(logData)
      if (!checkInfo) return true

      const tableOpt: StreamResult.TableDataOpt = checkInfo
      const originTable = this.tabTable.get(tableOpt.table_name)
      if (!originTable) {
        this.pushLogs(obj)
        return true
      }

      const datas = originTable?.data || (new Map() as HoldGRPCStreamProps.CacheTable['data'])
      // uuid一定存在，不存在归为脏数据
      if (!tableOpt.data.uuid) {
        this.pushLogs(obj)
        return
      }
      datas.set(tableOpt.data.uuid, tableOpt.data)
      this.onTableData?.(tableOpt.table_name)
      this.tabTable.set(tableOpt.table_name, {
        name: originTable.name,
        columns: originTable.columns,
        data: datas,
      })
    } catch (error) {}

    return true
  }

  // 自定义text数据
  handleTextData(obj: StreamResult.Message, logData: StreamResult.Log) {
    if (obj.type !== 'log' || logData.level !== 'feature-text-data') return false

    try {
      const checkInfo = checkStreamValidity(logData)
      if (!checkInfo) return true

      const textData: StreamResult.TextData = checkInfo
      const content = this.tabsText.get(textData.table_name)
      if (content === undefined) {
        this.pushLogs(obj)
        return true
      }

      if (content === textData.data) return true
      this.tabsText.set(textData.table_name, textData.data)
    } catch (error) {}

    return true
  }

  // markdown
  handleMarkdownData(obj: StreamResult.Message, logData: StreamResult.Log) {
    if (obj.type !== 'log' || logData.level !== 'markdown') return false
    this.onMarkdownData?.()
  }

  buildStreamInfo(defaultTabs?: HoldGRPCStreamProps.InfoTab[]): HoldGRPCStreamInfo {
    // progress
    const progress: StreamResult.Progress[] = []
    this.progressKVPair.forEach((value, id) => {
      progress.push({ id, progress: value })
    })

    // card
    const cards: HoldGRPCStreamProps.InfoCards[] = convertCardInfo(this.cardKVPair)

    // tabs
    const tabs = this.topTabs.concat(defaultTabs || DefaultTabs()).concat(this.endTabs)

    // tabsInfo
    const tabsInfo: HoldGRPCStreamInfo['tabsInfoState'] = {}
    if (this.tabWebsite) {
      tabsInfo['website'] = this.tabWebsite
    }
    if (this.tabTable.size > 0) {
      this.tabTable.forEach((value, key) => {
        const arr: HoldGRPCStreamProps.InfoTable['data'] = []
        value.data.forEach((i) => arr.push(i))

        tabsInfo[key] = {
          name: value.name,
          columns: value.columns,
          data: arr,
        } satisfies HoldGRPCStreamProps.InfoTable
      })
    }
    if (this.tabsText.size > 0) {
      this.tabsText.forEach((value, key) => {
        tabsInfo[key] = {
          content: value,
        } satisfies HoldGRPCStreamProps.InfoText
      })
    }

    // logs
    const logs: StreamResult.Log[] = this.messages
      .filter((i) => i.type === 'log')
      .map((i) => i.content as StreamResult.Log)
      .filter((i) => i.data !== 'null')

    return {
      progressState: [],

      cardState: cards,

      tabsState: tabs,

      tabsInfoState: tabsInfo,

      riskState: [],

      logState: logs,

      rulesState: [],
    }
  }
}

export const useStreamProcessorManager = (manager: StreamProcessorManager) => {
  const [, forceUpdate] = useReducer((x) => x + 1, 0)

  useEffect(() => {
    const unsubscribe = manager.subscribe(forceUpdate)
    return unsubscribe
  }, [manager])

  return {
    streamInfos: manager.buildAllStreamInfo([{ tabName: '日志', type: 'log' }]),
    updates: new Map(manager.getUpdates()),
    hasUpdate: manager.getAnyUpdate(),
  }
}
