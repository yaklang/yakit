import {PluginLogTabInfo, PluginLogTypeToInfoProps} from "./PluginLogType"
import {
    LogNodeStatusAuditFailedIcon,
    LogNodeStatusCommentIcon,
    LogNodeStatusDeleteIcon,
    LogNodeStatusInfoIcon,
    LogNodeStatusModifyIcon,
    LogNodeStatusNewIcon,
    LogNodeStatusRecoverIcon,
    LogNodeStatusSuccessIcon
} from "@/assets/icon/colors"

import styles from "./PluginLog.module.scss"

/** 插件日志-所有列表类型和对应名称 */
export const PluginLogTabBars: PluginLogTabInfo[] = [
    {
        key: "all",
        name: "全部日志"
    },
    {
        key: "check",
        name: "审核"
    },
    {
        key: "update",
        name: "修改"
    },
    {
        key: "comment",
        name: "评论"
    }
]

/** 日志类型-对应展示信息和样式类 */
export const PluginLogTypeToInfo: Record<string, PluginLogTypeToInfoProps> = {
    submit: {
        key: "submit",
        content: "创建插件",
        className: styles["plugin-log-type-info"],
        icon: <LogNodeStatusNewIcon />
    },
    applyMerge: {
        key: "applyMerge",
        content: "申请修改插件",
        className: styles["plugin-log-type-info"],
        icon: <LogNodeStatusModifyIcon />
    },
    mergePass: {
        key: "mergePass",
        content: "已合并",
        className: styles["plugin-log-type-success"],
        icon: <LogNodeStatusSuccessIcon />
    },
    mergeNoPass: {
        key: "mergeNoPass",
        content: "驳回",
        className: styles["plugin-log-type-failed"],
        icon: <LogNodeStatusAuditFailedIcon />
    },
    update: {
        key: "update",
        content: "修改插件",
        className: styles["plugin-log-type-info"],
        icon: <LogNodeStatusModifyIcon />
    },
    checkPass: {
        key: "checkPass",
        content: "审核通过",
        className: styles["plugin-log-type-success"],
        icon: <LogNodeStatusSuccessIcon />
    },
    checkNoPass: {
        key: "checkNoPass",
        content: "审核不通过",
        className: styles["plugin-log-type-failed"],
        icon: <LogNodeStatusAuditFailedIcon />
    },
    delete: {
        key: "delete",
        content: "删除插件",
        className: styles["plugin-log-type-info"],
        icon: <LogNodeStatusDeleteIcon />
    },
    recover: {
        key: "recover",
        content: "恢复插件",
        className: styles["plugin-log-type-info"],
        icon: <LogNodeStatusRecoverIcon />
    },
    comment: {
        key: "comment",
        content: "发布评论",
        className: styles["plugin-log-type-comment"],
        icon: <LogNodeStatusCommentIcon />
    },
    reply: {
        key: "reply",
        content: "回复",
        className: styles["plugin-log-type-comment"],
        icon: <LogNodeStatusCommentIcon />
    },
    default: {
        key: "default",
        content: "未知日志",
        className: styles["plugin-log-type-info"],
        icon: <LogNodeStatusInfoIcon />
    }
}
