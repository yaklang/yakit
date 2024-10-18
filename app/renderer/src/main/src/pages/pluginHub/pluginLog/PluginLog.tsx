import React, {memo, useRef, useState} from "react"
import {PluginLogBaseListProps, PluginLogListProps, PluginLogProps, PluginLogType} from "./PluginLogType"
import {PluginLogTabBars} from "./defaultConstant"
import {useMemoizedFn, useUpdateEffect} from "ahooks"
import cloneDeep from "lodash/cloneDeep"

import yakitImg from "@/assets/yakit.jpg"
import classNames from "classnames"
import styles from "./PluginLog.module.scss"
import {PluginLogList} from "./PluginLogList"
import {PluginImageTextarea} from "@/pages/pluginEditor/pluginImageTextarea/PluginImageTextarea"
import {ImageTextareaData, QuotationInfoProps} from "@/pages/pluginEditor/pluginImageTextarea/PluginImageTextareaType"
import {pluginSupplementConvertToJSON, pluginSupplementJSONConvertToData} from "@/pages/pluginEditor/utils/convert"
import {httpPublishComment} from "../utils/http"
import {API} from "@/services/swagger/resposeType"
import {useStore} from "@/store"
import {UserPlatformType} from "@/pages/globalVariable"
import {UnLoginSvgIcon} from "@/components/layout/icons"
import {failed} from "@/utils/notification"

/** @name 插件日志 */
export const PluginLog: React.FC<PluginLogProps> = memo((props) => {
    const {userInfo} = useStore()

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
    useUpdateEffect(() => {
        if (!userInfo.isLogin) handleCloseReply()
    }, [userInfo.isLogin])
    const references = useRef<API.PluginsLogsDetail>()
    const [quotation, setQuotation] = useState<QuotationInfoProps>()
    const handleReply = useMemoizedFn((info: API.PluginsLogsDetail) => {
        if (info) {
            references.current = cloneDeep(info)
            if (info.logType === "check") {
                const strs = info.description.split("\n")
                strs.shift()
                setQuotation({
                    userName: info.userName,
                    content: strs.join("\n") || "",
                    imgs: []
                })
            }
            if (info.logType === "comment") {
                const {text, imgs} = pluginSupplementJSONConvertToData(info.description) || {}
                setQuotation({
                    userName: info.userName,
                    content: text || "",
                    imgs: imgs || []
                })
            }
        }
    })
    const handleCloseReply = useMemoizedFn(() => {
        setQuotation(undefined)
        references.current = undefined
    })
    const handleCommentSubmit = useMemoizedFn((info: ImageTextareaData) => {
        if (!userInfo.isLogin) {
            failed("请先登录后再次操作")
            return
        }
        const comment = pluginSupplementConvertToJSON(info, {url: "", name: ""})
        const request: API.CommentLogRequest = {
            uuid: props.plugin.uuid,
            description: comment
        }
        if (references.current) request.logId = Number(references.current.id) || 0

        httpPublishComment(request)
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
                        <PluginLogAllList {...props} onReply={handleReply} />
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
                <div className={styles["reply-body"]}>
                    <div className={styles["reply-user"]}>
                        {userInfo.isLogin ? (
                            <img src={userInfo[UserPlatformType[userInfo.platform || ""].img] || yakitImg} />
                        ) : (
                            <UnLoginSvgIcon />
                        )}
                    </div>

                    <div className={styles["reply-textarea"]}>
                        <PluginImageTextarea
                            type='comment'
                            onSubmit={handleCommentSubmit}
                            quotation={quotation}
                            delQuotation={handleCloseReply}
                        />
                    </div>
                </div>
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
