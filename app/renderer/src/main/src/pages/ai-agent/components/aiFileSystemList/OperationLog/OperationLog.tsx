import {FC, forwardRef, ReactNode, useCallback, useMemo, useState} from "react"
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
import {ItemProps, ListProps, Virtuoso} from "react-virtuoso"

interface OperationLogProps {
    loading: boolean
    list: StreamResult.Log[]
}

interface FilePreviewProps {
    level: string
    data: FileLogShowDataProps | PluginExecuteLogFile.FileItem
    content: string | ReactNode
}

const VirtuosoItemContainer = forwardRef<HTMLDivElement, ItemProps<StreamResult.Log>>(
    ({children, style, ...props}, ref) => {
        return (
            <div {...props} ref={ref} style={style} className={styles["item-wrapper"]}>
                <div className={styles["item-inner"]}>{children}</div>
            </div>
        )
    }
)

VirtuosoItemContainer.displayName = "VirtuosoItemContainer"

const VirtuosoListContainer = forwardRef<HTMLDivElement, ListProps>(({children, style, ...props}, ref) => {
    return (
        <div {...props} ref={ref} style={style} className={styles["virtuoso-item-list"]}>
            {children}
        </div>
    )
})

const FilePreview: FC<FilePreviewProps> = ({level, data, content}) => {
    if (!(level === "file")) return <div>{content}</div>
    if (isPluginExecuteLogFileItem(data)) return <span>{content}</span>
    const {is_dir, file_size, description, path} = data as FileLogShowDataProps
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

type TimelineCardProps = {
    item: StreamResult.Log
    isExpanded: boolean
    onToggle: (id: string) => void
}

const TimelineCard: FC<TimelineCardProps> = ({item, isExpanded, onToggle}) => {
    try {
        const parsed = JSON.parse(item.data ?? "{}")
        const {color, action, message, content} = getFileActionStatus(parsed.action, parsed.action_message)
        return (
            <div className={classNames(styles["timeline-card"], styles[`timeline-card-${color}`])}>
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
                                    ? {backgroundColor: "var(--Colors-Use-Neutral-Border)", marginRight: 0}
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
                        {isPluginExecuteLogFileItem(parsed) && (
                            <span
                                onClick={() => onToggle(item.id)}
                                className={classNames(styles["expand-icon"], {[styles.expanded]: isExpanded})}
                            >
                                <OutlineChevrondownIcon />
                            </span>
                        )}
                    </div>
                </div>
                {isExpanded && (
                    <div className={styles["timeline-card-content"]}>
                        <FilePreview level={item.level} data={parsed} content={content} />
                    </div>
                )}
            </div>
        )
    } catch (error) {
        return (
            <div className={classNames(styles["timeline-card"], styles[`timeline-card-danger`])}>{String(error)}</div>
        )
    }
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

    const toggleExpand = useMemoizedFn((id: string) => {
        setExpanded((prev) => ({
            ...prev,
            [id]: !prev[id]
        }))
    })


    const components = useMemo(
        () => ({
            Item:VirtuosoItemContainer,
            List: VirtuosoListContainer,
            Footer: () => (list.length > 0 ? <div className={styles["arrow"]} /> : null)
        }),
        [list.length]
    )

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
                            <Virtuoso
                                style={{height: "100%"}}
                                data={logsByDate[day]}
                                components={components}
                                initialTopMostItemIndex={{index: "LAST"}}
                                itemContent={(index) => (
                                    <TimelineCard
                                        key={logsByDate[day][index].id}
                                        item={logsByDate[day][index]}
                                        isExpanded={!!expanded[logsByDate[day][index].id]}
                                        onToggle={toggleExpand}
                                    />
                                )}
                            />
                        </div>
                    </div>
                ))
            )}
        </div>
    )
}

export default OperationLog
