import React, {memo, useRef, useState} from "react"
import {PluginLogBaseListProps, PluginLogListProps, PluginLogProps, PluginLogType} from "./PluginLogType"
import {PluginLogTabBars} from "./defaultConstant"
import {useMemoizedFn} from "ahooks"

import classNames from "classnames"
import styles from "./PluginLog.module.scss"
import {PluginLogList} from "./PluginLogList"
import {PluginImageTextarea} from "@/pages/pluginEditor/pluginImageTextarea/PluginImageTextarea"
import {ImageTextareaData} from "@/pages/pluginEditor/pluginImageTextarea/PluginImageTextareaType"
import {pluginSupplementConvertToJSON} from "@/pages/pluginEditor/utils/convert"
import {httpPublishComment} from "../utils/http"

/** @name 插件日志 */
export const PluginLog: React.FC<PluginLogProps> = memo((props) => {
    /** ---------- Tabs组件逻辑 Start ---------- */
    // 控制各个列表的初始渲染变量，存在列表对应类型，则代表列表UI已经被渲染
    const rendered = useRef<Set<PluginLogType>>(new Set(["all"]))
    const [active, setActive] = useState<PluginLogType>("all")
    const onSetActive = useMemoizedFn((type: PluginLogType) => {
        if (type === active) {
            return
        } else {
            if (!rendered.current.has(type)) {
                rendered.current.add(type)
            }
            setActive(type)
        }
    })
    /** ---------- Tabs组件逻辑 End ---------- */

    /** ---------- 评论&回复 Start ---------- */
    const handleCommentSubmit = useMemoizedFn((info: ImageTextareaData) => {
        const comment = pluginSupplementConvertToJSON(info, {url: "", name: ""})

        httpPublishComment({uuid: props.plugin.uuid, logId: 250231, description: comment})
            .then(() => {
                console.log("评论成功")
            })
            .catch(() => {
                console.log("评论失败")
            })
    })
    /** ---------- 评论&回复 End ---------- */

    return (
        <div className={styles["plugin-log"]}>
            <div className={styles["plugin-log-tab-header"]}>
                {PluginLogTabBars.map((item) => {
                    return (
                        <div
                            key={item.key}
                            className={classNames(styles["header-opt"], {
                                [styles["haeder-active"]]: active === item.key
                            })}
                            onClick={() => onSetActive(item.key)}
                        >
                            {item.name}
                            <div className={styles["total-tag"]}>7</div>
                        </div>
                    )
                })}
            </div>

            <div className={styles["plugin-log-tab-body"]}>
                {rendered.current.has("all") && (
                    <div
                        className={classNames(styles["plugin-log-tab-pane"], {
                            [styles["plugin-log-tab-pane-hidden"]]: active !== "all"
                        })}
                    >
                        <PluginLogAllList {...props} />
                    </div>
                )}
                {rendered.current.has("check") && (
                    <div
                        className={classNames(styles["plugin-log-tab-pane"], {
                            [styles["plugin-log-tab-pane-hidden"]]: active !== "check"
                        })}
                    >
                        <PluginLogAuditList />
                    </div>
                )}
                {rendered.current.has("update") && (
                    <div
                        className={classNames(styles["plugin-log-tab-pane"], {
                            [styles["plugin-log-tab-pane-hidden"]]: active !== "update"
                        })}
                    >
                        <PluginLogModifyList />
                    </div>
                )}
                {rendered.current.has("comment") && (
                    <div
                        className={classNames(styles["plugin-log-tab-pane"], {
                            [styles["plugin-log-tab-pane-hidden"]]: active !== "comment"
                        })}
                    >
                        <PluginLogCommentList />
                    </div>
                )}
            </div>

            <div className={styles["plugin-log-reply"]}>
                <PluginImageTextarea type='comment' onSubmit={handleCommentSubmit} />
            </div>
        </div>
    )
})

/** 全部日志 */
export const PluginLogAllList: React.FC<PluginLogBaseListProps> = memo((props) => {
    return <PluginLogList type='all' {...props} />
})

/** 全部日志 */
export const PluginLogAuditList: React.FC<any> = memo((props) => {
    const {} = props

    return <div></div>
})

/** 全部日志 */
export const PluginLogModifyList: React.FC<any> = memo((props) => {
    const {} = props

    return <div></div>
})

/** 全部日志 */
export const PluginLogCommentList: React.FC<any> = memo((props) => {
    const {} = props

    return <div></div>
})
