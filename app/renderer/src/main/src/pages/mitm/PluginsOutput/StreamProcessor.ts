import {DEFAULT_LOG_LIMIT} from "@/defaultConstants/HoldGRPCStream"
import {v4 as uuidv4} from "uuid"
import {JSONParseLog} from "@/utils/tool"
import {HoldGRPCStreamInfo, HoldGRPCStreamProps, StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {checkStreamValidity, convertCardInfo} from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {DefaultTabs} from "@/hook/useHoldGRPCStream/constant"

export const DefaultStreamInfo = {
    progressState: [],
    cardState: [],
    tabsState: [],
    tabsInfoState: {},
    riskState: [],
    logState: [],
    rulesState: []
}

export class StreamProcessorManager {
    processors = new Map<string, StreamProcessor>()

    getProcessor(pluginName: string) {
        if (!this.processors.has(pluginName)) {
            this.processors.set(pluginName, new StreamProcessor())
        }
        return this.processors.get(pluginName)!
    }

    consume(data: StreamResult.BaseProsp) {
        const pluginName = data.PluginName || "default"

        const processor = this.getProcessor(pluginName)

        processor.consume(data)
    }

    buildAllStreamInfo(defaultTabs?: HoldGRPCStreamProps.InfoTab[]) {
        const result: Record<string, HoldGRPCStreamInfo> = {
            default: DefaultStreamInfo
        }

        this.processors.forEach((processor, pluginName) => {
            result[pluginName] = processor.buildStreamInfo(defaultTabs)
        })

        return result
    }

    reset(pluginName?: string) {
        if (pluginName) {
            this.processors.delete(pluginName)
            return
        }

        this.processors.clear()
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

    /**自定义tab页放前面还是后面 */
    placeTab(isHead: boolean, info: HoldGRPCStreamProps.InfoTab) {
        const exists = this.topTabs.some((tab) => tab.tabName === info.tabName)
        if (!exists) {
            this.topTabs.unshift(info)
        }
    }

    /**放入日志队列 */
    pushLogs(log: StreamResult.Message) {
        this.messages.unshift({
            ...log,
            content: {...log.content, id: uuidv4()}
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
                page: "StreamProcessor"
            })
            this.handleMessage(obj)
        } catch {}
    }

    handleMessage(obj: StreamResult.Message) {
        // progress 进度条
        if (obj.type === "progress") {
            const processData = obj.content as StreamResult.Progress

            if (processData?.id) {
                this.progressKVPair.set(
                    processData.id,
                    Math.max(this.progressKVPair.get(processData.id) || 0, processData.progress)
                )
            }

            return
        }

        const logData = obj.content as StreamResult.Log

        if (this.handleCard(obj, logData)) return

        if (this.handleFeature(obj, logData)) return

        if (this.handleTableData(obj, logData)) return

        if (this.handleTextData(obj, logData)) return

        // 日志信息
        this.pushLogs(obj)
    }

    // feature-status-card-data 卡片展示
    handleCard(obj: StreamResult.Message, logData: StreamResult.Log) {
        if (obj.type !== "log" || logData.level !== "feature-status-card-data") return false

        try {
            const checkInfo = checkStreamValidity(logData)
            if (!checkInfo) return true

            const obj: StreamResult.Card = checkInfo
            const {id, data, tags} = obj
            const origin = this.cardKVPair.get(id)
            if (origin && origin.Timestamp > logData.timestamp) {
                return true
            }
            this.cardKVPair.set(id, {
                Id: id,
                Data: data,
                Timestamp: logData.timestamp,
                Tags: Array.isArray(tags) ? tags : []
            })
        } catch {}

        return true
    }

    // new-tab(插件自增tab页)
    handleFeature(obj: StreamResult.Message, logData: StreamResult.Log) {
        if (obj.type !== "log" || logData.level !== "json-feature") return false

        try {
            const checkInfo = checkStreamValidity(logData)
            if (!checkInfo) return true
            const info: {feature: string; params: any; [key: string]: any} = checkInfo

            let tabInfo: HoldGRPCStreamProps.InfoTab = {tabName: "", type: ""}
            switch (info.feature) {
                case "website-trees":
                    this.tabWebsite = info.params as StreamResult.WebSite
                    break

                case "fixed-table":
                    const table = info.params as StreamResult.Table
                    tabInfo = {
                        tabName: table.table_name,
                        type: "table"
                    }

                    this.placeTab(!!info.at_head, tabInfo)

                    if (this.tabTable.get(table.table_name)) {
                        this.pushLogs(obj)
                        break
                    }

                    this.tabTable.set(table.table_name, {
                        name: table.table_name,
                        columns: table.columns.map((i) => ({
                            title: i,
                            dataKey: i
                        })),
                        data: new Map()
                    } satisfies HoldGRPCStreamProps.CacheTable)
                    break

                case "text":
                    const text = info.params as StreamResult.Text
                    tabInfo = {
                        tabName: text.tab_name,
                        type: "text"
                    }

                    this.placeTab(!!info.at_head, tabInfo)

                    if (this.tabsText.get(text.tab_name)) {
                        this.pushLogs(obj)
                        break
                    }
                    this.tabsText.set(text.tab_name, "")
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
        if (obj.type !== "log" || logData.level !== "feature-table-data") return false

        try {
            const checkInfo = checkStreamValidity(logData)
            if (!checkInfo) return true

            const tableOpt: StreamResult.TableDataOpt = checkInfo
            const originTable = this.tabTable.get(tableOpt.table_name)
            if (!originTable) {
                this.pushLogs(obj)
                return true
            }

            const datas = originTable?.data || (new Map() as HoldGRPCStreamProps.CacheTable["data"])
            // uuid一定存在，不存在归为脏数据
            if (!tableOpt.data.uuid) {
                this.pushLogs(obj)
                return
            }
            datas.set(tableOpt.data.uuid, tableOpt.data)
            this.tabTable.set(tableOpt.table_name, {
                name: originTable.name,
                columns: originTable.columns,
                data: datas
            })
        } catch (error) {}

        return true
    }

    // 自定义text数据
    handleTextData(obj: StreamResult.Message, logData: StreamResult.Log) {
        if (obj.type !== "log" || logData.level !== "feature-text-data") return false

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

    buildStreamInfo(defaultTabs?: HoldGRPCStreamProps.InfoTab[]): HoldGRPCStreamInfo {
        // progress
        const progress: StreamResult.Progress[] = []
        this.progressKVPair.forEach((value, id) => {
            progress.push({id, progress: value})
        })

        // card
        const cards: HoldGRPCStreamProps.InfoCards[] = convertCardInfo(this.cardKVPair)

        // tabs
        const tabs = this.topTabs.concat(defaultTabs || DefaultTabs()).concat(this.endTabs)

        // tabsInfo
        const tabsInfo: HoldGRPCStreamInfo["tabsInfoState"] = {}
        if (this.tabWebsite) {
            tabsInfo["website"] = this.tabWebsite
        }
        if (this.tabTable.size > 0) {
            this.tabTable.forEach((value, key) => {
                const arr: HoldGRPCStreamProps.InfoTable["data"] = []
                value.data.forEach((i) => arr.push(i))

                tabsInfo[key] = {
                    name: value.name,
                    columns: value.columns,
                    data: arr
                } satisfies HoldGRPCStreamProps.InfoTable
            })
        }
        if (this.tabsText.size > 0) {
            this.tabsText.forEach((value, key) => {
                tabsInfo[key] = {
                    content: value
                } satisfies HoldGRPCStreamProps.InfoText
            })
        }

        // logs
        const logs: StreamResult.Log[] = this.messages
            .filter((i) => i.type === "log")
            .map((i) => i.content as StreamResult.Log)
            .filter((i) => i.data !== "null")

        return {
            progressState: [],

            cardState: cards,

            tabsState: tabs,

            tabsInfoState: tabsInfo,

            riskState: [],

            logState: logs,

            rulesState: []
        }
    }
}
