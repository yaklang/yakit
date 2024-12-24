import {HybridScanActiveTask} from "@/models/HybridScan"
import {Risk as RiskProps} from "@/pages/risks/schema"

/** @name hooks逻辑数据 */
export declare namespace HoldGRPCStreamProps {
    /** @name 缓冲区数据-卡片类 */
    export interface CacheCard {
        Id: string
        Data: string
        Timestamp: number
        Tags?: string[]
    }
    /** @name 缓冲区数据-表格数据类 */
    export interface CacheTable {
        name: string
        columns: {title: string; dataKey: string}[]
        data: Map<string, Record<string, any>>
    }

    /** @name hook输出数据信息-卡片类 */
    export interface InfoCard {
        Id: string
        Data: string
        Timestamp: number
        Tag?: string
    }
    /** @name hook输出数据信息-卡片集合 */
    export interface InfoCards {
        tag: string
        info: InfoCard[]
    }

    /** @name hook输出数据信息-自定义tabs页 */
    export interface InfoTab {
        tabName: string
        type: string
        customProps?: Record<string, any>
    }

    /** @name hook输出数据信息-自定义table */
    export interface InfoTable {
        name: string
        columns: {title: string; dataKey: string}[]
        data: Record<string, any>[]
    }

    /** @name hook输出数据信息-自定义text */
    export interface InfoText {
        content: string
    }
}

/** @name hook输出的数据流信息集合 */
export interface HoldGRPCStreamInfo {
    progressState: StreamResult.Progress[]
    cardState: HoldGRPCStreamProps.InfoCards[]
    tabsState: HoldGRPCStreamProps.InfoTab[]
    tabsInfoState: {
        [key: string]: StreamResult.WebSite | HoldGRPCStreamProps.InfoTable | HoldGRPCStreamProps.InfoText | any
    }
    riskState: StreamResult.Risk[]
    logState: StreamResult.Log[]
}

/** @name 数据流结果 */
export declare namespace StreamResult {
    /** @name 数据流结果(进度条) */
    export interface BaseProsp {
        Hash: string
        OutputJson: string
        Raw: Uint8Array
        IsMessage: boolean
        Message: Uint8Array
        Id?: number
        Progress: number
        RuntimeID?: string
    }

    /** @name 数据流结果(进度条) */
    export interface Progress {
        progress: number
        id: string
    }

    /** @name 数据流结果(卡片类) */
    export interface Card {
        id: string
        data: string
        tags?: string[]
    }

    /** @name 数据流结果(日志信息类) */
    export interface Log {
        /**@name 前端使用 */
        id: string
        level: string
        /** @name 数据流信息(json化) */
        data: string | any
        timestamp: number
    }

    /** @name 数据流结果(数据结构) */
    export interface Message {
        type: "log" | "progress" | string
        content: Log | Progress
    }

    /** @name 数据流结果(自增表格构建信息) */
    export interface Table {
        columns: string[]
        table_name: string
    }
    /** @name 数据流结果(自增表格数据) */
    export interface TableDataOpt {
        table_name: string
        data: {
            uuid: string
            [key: string]: any
        }
    }

    /** @name 数据流结果(网站树数据) */
    export interface WebSite {
        refresh_interval: number
        targets: string
    }

    /** @name 数据流结果(text类构建信息) */
    export interface Text {
        at_head: boolean
        tab_name: string
    }

    /** @name 数据流结果(text类数据) */
    export interface TextData {
        data: string
        table_name: string
    }

    /** @name 数据流结果(风险数据) */
    export interface Risk extends Omit<RiskProps, "Id"> {}

    /** @name 数据流结果(批量执行中得插件执行日志) */
    export interface PluginExecuteLog extends HybridScanActiveTask {
        /**第一次接受到该id得时间,前端记录 */
        startTime: number
    }
}
