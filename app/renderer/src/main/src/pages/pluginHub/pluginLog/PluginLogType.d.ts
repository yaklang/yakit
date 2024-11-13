import React, {ForwardedRef, ReactNode} from "react"
import {CustomIconComponentProps} from "@ant-design/icons/lib/components/Icon"
import {API} from "@/services/swagger/resposeType"
import {YakitPluginOnlineDetail} from "@/pages/plugins/online/PluginsOnlineType"
import {YakitPluginBaseInfo} from "@/pages/pluginEditor/base"

/** ---------- 公共定义 ----------  */
export interface IconProps extends CustomIconComponentProps {
    onClick: (e: React.MouseEvent) => void
}
/** 日志类型 */
export type PluginLogType = "all" | "check" | "update" | "comment"
/** tab-bar 日志类型信息 */
export interface PluginLogTabInfo {
    key: PluginLogType
    name: string
}
/** 日志类型对应 icon 、展示内容和样式类 */
export interface PluginLogTypeToInfoProps {
    key: string
    content: string
    className: string
    icon: ReactNode
}

/** ---------- PluginLog ----------  */
export interface PluginLogRefProps {
    /** 主动跳转到指定 tab 页面 */
    handleActiveTab: (key: string) => void
}

export interface PluginLogProps {
    ref?: ForwardedRef<PluginLogRefProps>

    getContainer?: string
    plugin: YakitPluginOnlineDetail
}

/** ---------- PluginLogList ----------  */
export interface PluginLogListProps extends Omit<PluginLogProps, "ref"> {
    /** 是否手动触发重置刷新 */
    triggerRefresh: boolean
    type: PluginLogType
    onReply: (info: API.PluginsLogsDetail) => void
    onRefreshTotals: () => void
    /** 更新 total 数据 */
    callbackTotal?: (total: number) => void
}

/** ---------- PluginLogOpt ----------  */
export interface PluginLogOptProps {
    plugin: YakitPluginOnlineDetail
    /** 最新审核日志信息 */
    latestAudit?: API.PluginsLogsDetail
    /** 日志信息 */
    info: API.PluginsLogsDetail
    /** 是否隐藏左侧条形线 */
    hiddenLine?: boolean
    /** 功能操作 */
    callback: (type: string, info: API.PluginsLogsDetail) => void
}

/** ---------- PluginLogMergeDetail ----------  */
export interface PluginLogMergeDetailProps {
    getContainer?: HTMLElement
    uuid: string
    id: number
    visible: boolean
    /**
     * @param result 是否执行操作
     * @param reason 执行操作不合并的理由，result 为 true 时该参无值代表合并操作
     */
    callback: (result: boolean, logaInfo?: API.PluginsLogsDetail) => void
}

/** ---------- PluginBaseInfoForm ----------  */
export interface PluginBaseInfoFormRefProps {
    onSubmit: () => Promise<YakitPluginBaseInfo | undefined>
}
/** 插件基础信息表单 */
export interface PluginBaseInfoFormProps {
    ref?: ForwardedRef<PluginBaseInfoFormRefProps>
    /** 初始默认数据 */
    data?: YakitPluginBaseInfo
    /** 禁用所有操作 */
    allDisabled?: boolean
}

/** ---------- PluginLogCodeDiff ----------  */
export interface PluginLogCodeDiffProps {
    uuid: string
    id: number
    visible: boolean
    setVisible: (visible: boolean) => void
}
