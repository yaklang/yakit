import {FC, useMemo, useState} from "react"
import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import styles from "./OperationLog.module.scss"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {OutlineChevrondownIcon, OutlineClockIcon} from "@/assets/icon/outline"
import {getFileActionStatus, isPluginExecuteLogFileItem} from "@/pages/invoker/utils"
import classNames from "classnames"
import {formatTime} from "@/utils/timeUtil"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import {FileLogShowDataProps} from "@/pages/invoker/YakitLogFormatter"
import moment from "moment"
import {useMemoizedFn} from "ahooks"
import {PluginExecuteLogFile} from "@/pages/plugins/operator/pluginExecuteResult/PluginExecuteResultType"

interface OperationLogProps {
    loading: boolean
    list: StreamResult.Log[]
}

const OperationLog: FC<OperationLogProps> = ({loading, list}) => {
    const {t} = useI18nNamespaces(["plugin"])
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})
    const logsByDate = useMemo(() => {
        const result: Record<string, StreamResult.Log[]> = {}

        list.forEach((item) => {
            const time = typeof item.timestamp === "number" ? moment(item.timestamp * 1000) : moment(item.timestamp)

            const key = time.format("YYYY-MM-DD HH")

            if (!result[key]) {
                result[key] = []
            }
            result[key].push(item)
        })

        return result
    }, [list])

    const preview = useMemoizedFn((level, data, content) => {
        switch (level) {
            case "file": {
                const obj = JSON.parse(data) as PluginExecuteLogFile.FileItem | FileLogShowDataProps
                if (isPluginExecuteLogFileItem(obj)) {
                    return <span>{content}</span>
                } else {
                    const {is_dir, file_size, description, path} = obj as FileLogShowDataProps
                    return (
                        <span>
                            <div>
                                <YakitTag>{is_dir ? "文件夹" : "非文件夹"}</YakitTag>
                                {file_size && <YakitTag color='blue'>{file_size}K</YakitTag>}
                            </div>
                            {description && <div className={styles["file-description"]}>{description}</div>}
                            {path && <div className={styles["file-path"]}>{path}</div>}
                        </span>
                    )
                }
            }

            default:
                return <div>{content}</div>
        }
    })
    const toggleExpand = useMemoizedFn((id: string) => {
        setExpanded((prev) => ({
            ...prev,
            [id]: !prev[id]
        }))
    })
    return (
        <div className={styles["log-wrapper"]}>
            {!loading && list.length === 0 ? (
                <YakitEmpty style={{paddingTop: 48}} title={t("LocalPluginLog.no_log_information")} />
            ) : (
                Object.keys(logsByDate).map((day) => (
                    <div key={day} className={styles["timeline"]}>
                        <div className={styles["timeline-header"]}>
                            <YakitTag
                                size='small'
                                className={styles["timeline-tag"]}
                                color='yellow'
                                fullRadius
                                icon={<OutlineClockIcon />}
                            >
                                {day}
                            </YakitTag>
                        </div>
                        <div className={styles["timeline-content"]}>
                            {logsByDate[day].map((item) => {
                                try {
                                    const data = JSON.parse(item.data ?? "{}")
                                    const {color, action, message, content} = getFileActionStatus(
                                        data.action,
                                        data.action_message
                                    )
                                    return (
                                        <div
                                            key={item.id}
                                            className={classNames(
                                                styles["timeline-card"],
                                                styles[`timeline-card-${color}`]
                                            )}
                                        >
                                            <div className={styles["timeline-card-header"]}>
                                                <div className={styles["timeline-card-header-left"]}>
                                                    <div className={styles["timeline-card-dot"]} />
                                                    <p>{formatTime(item.timestamp)}</p>
                                                    <YakitTag
                                                        color={color}
                                                        fullRadius
                                                        children={action}
                                                        border={false}
                                                        style={
                                                            color === "white"
                                                                ? {
                                                                      backgroundColor:
                                                                          "var(--Colors-Use-Neutral-Border)",
                                                                      marginRight: 0
                                                                  }
                                                                : {marginRight: 0}
                                                        }
                                                    />
                                                    <YakitTag
                                                        className={styles["timeline-card-header-tag"]}
                                                        color='white'
                                                        border
                                                        hidden={!message}
                                                        children={message}
                                                    />
                                                </div>

                                                <div className={styles["timeline-card-header-extra"]}>
                                                    {isPluginExecuteLogFileItem(data) && (
                                                        <span
                                                            onClick={() => toggleExpand(item.id)}
                                                            className={classNames(styles["expand-icon"], {
                                                                [styles.expanded]: expanded[item.id]
                                                            })}
                                                        >
                                                            <OutlineChevrondownIcon />
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {expanded[item.id] && (
                                                <div className={styles["timeline-card-content"]}>
                                                    {preview(item.level, item.data, content)}
                                                </div>
                                            )}
                                        </div>
                                    )
                                } catch (error) {
                                    return (
                                        <div
                                            className={classNames(
                                                styles["timeline-card"],
                                                styles[`timeline-card-danger`]
                                            )}
                                        >
                                            {String(error)}
                                        </div>
                                    )
                                }
                            })}
                        </div>
                    </div>
                ))
            )}
        </div>
    )
}

export default OperationLog
