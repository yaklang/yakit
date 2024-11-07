import React, {forwardRef, memo, useEffect, useImperativeHandle, useRef, useState} from "react"
import {PluginLogProps, PluginLogType} from "./PluginLogType"
import {PluginLogTabBars} from "./defaultConstant"
import {useMemoizedFn, useUpdateEffect} from "ahooks"
import cloneDeep from "lodash/cloneDeep"
import {PluginLogList} from "./PluginLogList"
import {PluginImageTextarea} from "@/pages/pluginEditor/pluginImageTextarea/PluginImageTextarea"
import {
    ImageTextareaData,
    PluginImageTextareaRefProps,
    QuotationInfoProps
} from "@/pages/pluginEditor/pluginImageTextarea/PluginImageTextareaType"
import {pluginSupplementConvertToJSON, pluginSupplementJSONConvertToData} from "@/pages/pluginEditor/utils/convert"
import {httpFetchPluginLogsAllTotal, httpPublishComment} from "../utils/http"
import {API} from "@/services/swagger/resposeType"
import {useStore} from "@/store"
import {UserPlatformType} from "@/pages/globalVariable"
import {UnLoginSvgIcon} from "@/components/layout/icons"
import {failed} from "@/utils/notification"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineRefreshIcon} from "@/assets/icon/outline"

import yakitImg from "@/assets/yakit.jpg"
import classNames from "classnames"
import styles from "./PluginLog.module.scss"

/** @name 插件日志 */
export const PluginLog: React.FC<PluginLogProps> = memo(
    forwardRef((props, ref) => {
        const {plugin} = props
        const {userInfo} = useStore()

        useImperativeHandle(
            ref,
            () => ({
                handleActiveTab: handleActiveTab
            }),
            []
        )
        const handleActiveTab = useMemoizedFn((key: string) => {
            // 可以打开的 tab 页面
            const validTab: string[] = ["all", "check", "update", "comment"]
            if (validTab.includes(key)) {
                onSetActive(key as PluginLogType)
            }
        })

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

        const [allRefresh, setAllRefresh] = useState(false)
        const [checkRefresh, setCheckRefresh] = useState(false)
        const [updateRefresh, setUpdateRefresh] = useState(false)
        const [commentRefresh, setCommentRefresh] = useState(false)
        // 手动触发列表刷新
        const handleTriggerRefresh = useMemoizedFn(() => {
            if (active === "all") setAllRefresh(!allRefresh)
            if (active === "check") setCheckRefresh(!checkRefresh)
            if (active === "update") setUpdateRefresh(!updateRefresh)
            if (active === "comment") setCommentRefresh(!commentRefresh)
        })
        /** ---------- Tabs组件逻辑 End ---------- */

        useEffect(() => {
            handleFetchAllTotal()
        }, [plugin])
        const [tabTotal, setTabTotal] = useState<Record<string, number>>({})
        const handleFetchAllTotal = useMemoizedFn(() => {
            httpFetchPluginLogsAllTotal(plugin.uuid)
                .then((res) => {
                    const {data = []} = res
                    const totals: Record<string, number> = {}
                    for (let item of data) {
                        totals[item.tabName] = item.count
                    }
                    setTabTotal({...totals})
                })
                .catch(() => {})
        })
        const handleUpdateTotal = useMemoizedFn((type: string, total: number) => {
            if (tabTotal[type] !== total) {
                setTabTotal((prev) => {
                    return {
                        ...prev,
                        [type]: total
                    }
                })
            }
        })

        const onRefresh = useMemoizedFn(() => {
            handleFetchAllTotal()
            handleTriggerRefresh()
        })

        /** ---------- 评论&回复 Start ---------- */
        useUpdateEffect(() => {
            if (!userInfo.isLogin) handleCloseReply()
        }, [userInfo.isLogin])
        const textareaRef = useRef<PluginImageTextareaRefProps>(null)
        const references = useRef<API.PluginsLogsDetail>()
        const [quotation, setQuotation] = useState<QuotationInfoProps>()
        const handleReply = useMemoizedFn((info: API.PluginsLogsDetail) => {
            if (info) {
                references.current = cloneDeep(info)
                if (info.logType === "check") {
                    const strs = info.description.split("\n")
                    // strs.shift()
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
        const [publishCommentLoading, setPublishCommentLoading] = useState(false)
        const handleCommentSubmit = useMemoizedFn((info: ImageTextareaData) => {
            if (!userInfo.isLogin) {
                failed("请先登录后再次操作")
                return
            }
            if (publishCommentLoading) return
            setPublishCommentLoading(true)
            const comment = pluginSupplementConvertToJSON(info, {url: "", name: ""})
            const request: API.CommentLogRequest = {
                uuid: plugin.uuid,
                description: comment
            }
            if (references.current) request.logId = Number(references.current.id) || 0

            httpPublishComment(request)
                .then(() => {
                    if (textareaRef.current) textareaRef.current.onClear()
                    handleTriggerRefresh()
                    handleFetchAllTotal()
                })
                .catch(() => {})
                .finally(() => {
                    setTimeout(() => {
                        setPublishCommentLoading(false)
                    }, 300)
                })
        })
        /** ---------- 评论&回复 End ---------- */

        return (
            <div className={styles["plugin-log"]}>
                <div className={styles["plugin-log-tab-header"]}>
                    <div className={styles["header-list"]}>
                        {PluginLogTabBars.map((item) => {
                            const count = (tabTotal || {})[item.name] || 0
                            return (
                                <div
                                    key={item.key}
                                    className={classNames(styles["header-opt"], {
                                        [styles["haeder-active"]]: active === item.key
                                    })}
                                    onClick={() => onSetActive(item.key)}
                                >
                                    {item.name}
                                    <div className={styles["total-tag"]}>{count}</div>
                                </div>
                            )
                        })}
                    </div>

                    <YakitButton type='text2' icon={<OutlineRefreshIcon />} onClick={onRefresh}></YakitButton>
                </div>

                <div className={styles["plugin-log-tab-body"]}>
                    {rendered.current.has("all") && (
                        <div
                            className={classNames(styles["plugin-log-tab-pane"], {
                                [styles["plugin-log-tab-pane-hidden"]]: active !== "all"
                            })}
                        >
                            <PluginLogList
                                triggerRefresh={allRefresh}
                                type='all'
                                {...props}
                                onReply={handleReply}
                                onRefreshTotals={handleFetchAllTotal}
                                callbackTotal={(count) => {
                                    handleUpdateTotal("all", count)
                                }}
                            />
                        </div>
                    )}
                    {rendered.current.has("check") && (
                        <div
                            className={classNames(styles["plugin-log-tab-pane"], {
                                [styles["plugin-log-tab-pane-hidden"]]: active !== "check"
                            })}
                        >
                            <PluginLogList
                                triggerRefresh={checkRefresh}
                                type='check'
                                {...props}
                                onReply={handleReply}
                                onRefreshTotals={handleFetchAllTotal}
                                callbackTotal={(count) => {
                                    handleUpdateTotal("check", count)
                                }}
                            />
                        </div>
                    )}
                    {rendered.current.has("update") && (
                        <div
                            className={classNames(styles["plugin-log-tab-pane"], {
                                [styles["plugin-log-tab-pane-hidden"]]: active !== "update"
                            })}
                        >
                            <PluginLogList
                                triggerRefresh={updateRefresh}
                                type='update'
                                {...props}
                                onReply={handleReply}
                                onRefreshTotals={handleFetchAllTotal}
                                callbackTotal={(count) => {
                                    handleUpdateTotal("update", count)
                                }}
                            />
                        </div>
                    )}
                    {rendered.current.has("comment") && (
                        <div
                            className={classNames(styles["plugin-log-tab-pane"], {
                                [styles["plugin-log-tab-pane-hidden"]]: active !== "comment"
                            })}
                        >
                            <PluginLogList
                                triggerRefresh={commentRefresh}
                                type='comment'
                                {...props}
                                onReply={handleReply}
                                onRefreshTotals={handleFetchAllTotal}
                                callbackTotal={(count) => {
                                    handleUpdateTotal("comment", count)
                                }}
                            />
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
                                ref={textareaRef}
                                loading={publishCommentLoading}
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
)
