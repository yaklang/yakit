import {LogLevelToCode} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {YakitLogFormatter} from "@/pages/invoker/YakitLogFormatter"
import {Timeline} from "antd"
import React, {useEffect} from "react"
import styles from "./LocalPluginLog.module.scss"
import {useCreation, useMemoizedFn} from "ahooks"
import moment from "moment"
import {
    LogNodeStatusCodeIcon,
    LogNodeStatusEchartsIcon,
    LogNodeStatusErrorIcon,
    LogNodeStatusFileErrorIcon,
    LogNodeStatusFileIcon,
    LogNodeStatusFolderErrorIcon,
    LogNodeStatusFolderIcon,
    LogNodeStatusInfoIcon,
    LogNodeStatusMDIcon,
    LogNodeStatusSuccessIcon,
    LogNodeStatusWarningIcon
} from "@/assets/icon/colors"

export interface LocalPluginLogList extends StreamResult.Log {}
export interface LocalPluginLogProps {
    loading: boolean
    list: LocalPluginLogList[]
}

export const LocalPluginLog: React.FC<LocalPluginLogProps> = React.memo((props) => {
    const {loading, list} = props
    const currentTime = useCreation(() => {
        return moment().format("YYYY-MM-DD")
    }, [])
    const logLevelToDot = useMemoizedFn((item) => {
        let key = item.level
        switch (key) {
            case "file":
                try {
                    const fileItem = JSON.parse(item.data) as {
                        title: string
                        description: string
                        path: string
                        is_dir: boolean
                        is_existed: boolean
                        file_size: string
                        dir: string
                    }
                    if (fileItem.is_dir) {
                        key = "folder"
                        if (!fileItem.is_existed) {
                            key = "folder-error"
                        }
                    } else {
                        key = "file"
                        if (!fileItem.is_existed) {
                            key = "file-error"
                        }
                    }
                } catch (error) {}
                break

            default:
                break
        }
        switch (key) {
            case "warn":
                return <LogNodeStatusWarningIcon />
            case "error":
                return <LogNodeStatusErrorIcon />
            case "success":
                return <LogNodeStatusSuccessIcon />
            case "json":
            case "code":
            case "text":
                return <LogNodeStatusCodeIcon />
            case "json-graph":
                return <LogNodeStatusEchartsIcon />
            case "folder-error":
                return <LogNodeStatusFolderErrorIcon />
            case "folder":
                return <LogNodeStatusFolderIcon />
            case "file-error":
                return <LogNodeStatusFileErrorIcon />
            case "file":
                return <LogNodeStatusFileIcon />
            case "markdown":
                return <LogNodeStatusMDIcon />

            default:
                return <LogNodeStatusInfoIcon className={styles["info-icon"]} />
        }
    })
    return (
        <div className={styles["log-body"]}>
            <div className={styles["log-heard"]}>{currentTime} 日志查询结果</div>
            <Timeline
                reverse={true}
                pending={loading}
                pendingDot={
                    <div className={styles["log-pending-dot"]}>
                        <div className={styles["log-pending-dot-circle"]}></div>
                    </div>
                }
                style={{margin: "10px 10px 0 8px"}}
            >
                {list.map((e, index) => {
                    return (
                        <Timeline.Item key={e.id} color='' dot={<>{logLevelToDot(e)}</>}>
                            <YakitLogFormatter data={e.data} level={e.level} timestamp={e.timestamp} />
                        </Timeline.Item>
                    )
                })}
            </Timeline>
        </div>
    )
})
