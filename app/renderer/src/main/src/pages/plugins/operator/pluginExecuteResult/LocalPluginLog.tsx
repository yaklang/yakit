import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {EditorLogShow, YakitLogFormatter} from "@/pages/invoker/YakitLogFormatter"
import {Timeline} from "antd"
import React from "react"
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
import {SolidCalendarIcon} from "@/assets/icon/solid"
import {formatTimestamp} from "@/utils/timeUtil"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"

export interface LocalPluginLogList extends StreamResult.Log {}
export interface LocalPluginLogProps {
    loading: boolean
    list: LocalPluginLogList[]
}
/**插件日志 */
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
            {!loading && list.length === 0 ? (
                <YakitEmpty style={{paddingTop: 48}} title='暂无日志信息' />
            ) : (
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
            )}
        </div>
    )
})
interface LocalListProps {
    list: LocalPluginLogList[]
}
/**统计图表 */
export const LocalList: React.FC<LocalListProps> = React.memo((props) => {
    const {list} = props
    return (
        <div className={styles["local-list"]}>
            {list.map((e) => {
                return (
                    <React.Fragment key={e.id}>
                        <YakitLogFormatter data={e.data} level={e.level} timestamp={e.timestamp} showTime={false} />
                    </React.Fragment>
                )
            })}
        </div>
    )
})
interface LocalTextProps {
    list: LocalPluginLogList[]
}
export const LocalText: React.FC<LocalTextProps> = React.memo((props) => {
    const {list} = props
    return (
        <div className={styles["local-text-list"]}>
            {list.map((item) => {
                return (
                    <React.Fragment key={item.id}>
                        <EditorLogShow {...item} showTime={false} />
                    </React.Fragment>
                )
            })}
        </div>
    )
})
