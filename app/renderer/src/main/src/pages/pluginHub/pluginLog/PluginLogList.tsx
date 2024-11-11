import React, {memo, useEffect, useRef, useState} from "react"
import {useDebounceEffect, useDebounceFn, useInViewport, useMemoizedFn, useThrottleFn, useUpdateEffect} from "ahooks"
import {PluginLogListProps} from "./PluginLogType"
import {API} from "@/services/swagger/resposeType"
import {PluginLogOpt} from "./PluginLogOpt"
import {httpDeleteComment, httpFetchPluginLogs} from "../utils/http"
import emiter from "@/utils/eventBus/eventBus"
import {useStore} from "@/store"
import {PluginLogCodeDiff, PluginLogMergeDetail} from "./PluginLogMergeDetail"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import cloneDeep from "lodash/cloneDeep"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {AuthorImg} from "@/pages/plugins/funcTemplate"
import {YakitRoundCornerTag} from "@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag"
import {TextareaForImage} from "@/pages/pluginEditor/pluginImageTextarea/PluginImageTextareaType"
import {pluginSupplementJSONConvertToData} from "@/pages/pluginEditor/utils/convert"
import {ImagePreviewList} from "../utilsUI/UtilsTemplate"
import {formatTimestamp} from "@/utils/timeUtil"

// import classNames from "classnames"
import styles from "./PluginLog.module.scss"
import UnLogin from "@/assets/unLogin.png"

/** @name 插件日志 */
export const PluginLogList: React.FC<PluginLogListProps> = memo((props) => {
    const {triggerRefresh, getContainer, type, plugin, onReply, onRefreshTotals, callbackTotal} = props

    const wrapperRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(wrapperRef)

    // 请求列表偏移量 ID
    const beforeId = useRef<number>(0)
    // 全部列表的总 total
    const total = useRef<number>(0)
    const [loading, setLoading] = useState<boolean>(false)
    const [response, setResponse] = useState<API.PluginsLogsResponse>({
        data: [],
        pagemeta: {
            page: 1,
            limit: 20,
            total: 0,
            total_page: 0
        }
    })
    const hasMore = useRef<boolean>(true)

    /** 重置数据状态 */
    const handleReset = useMemoizedFn(() => {
        beforeId.current = 0
        total.current = 0
        hasMore.current = true
        setResponse({
            data: [],
            pagemeta: {
                page: 1,
                limit: 20,
                total: 0,
                total_page: 0
            }
        })
    })
    useUpdateEffect(() => {
        if (!inViewport) return
        resetFetchLogs()
    }, [triggerRefresh])

    useUpdateEffect(() => {
        if (loading) return
        if (!inViewport) return
        if (!wrapperRef.current) return
        if (response.data.length === 0) return

        const {scrollHeight} = wrapperRef.current
        const height = wrapperRef.current.getBoundingClientRect().height
        if (scrollHeight - height <= 20) {
            handleFetchLogs()
        }
    }, [loading])

    useDebounceEffect(
        () => {
            if (inViewport) {
                resetFetchLogs()
            } else {
                handleReset()
            }
        },
        [inViewport, plugin],
        {wait: 300, leading: true}
    )

    /** ---------- 列表数据获取逻辑 Start ---------- */
    const latestAuditInfo = useRef<API.PluginsLogsDetail>()
    // 获取最新审核信息
    const handleFetchNewCheckLog = useMemoizedFn((callback?: () => void) => {
        httpFetchPluginLogs({data: {uuid: plugin.uuid, logType: "check"}, params: {page: 1, limit: 1}}, true)
            .then((res) => {
                const {data} = res
                if (data && data.length > 0) {
                    latestAuditInfo.current = data[0]
                } else {
                    latestAuditInfo.current = undefined
                }
            })
            .catch(() => {
                latestAuditInfo.current = undefined
            })
            .finally(() => {
                callback && callback()
            })
    })

    // 获取插件日志
    const handleFetchLogs = useMemoizedFn(() => {
        if (loading) return
        if (!hasMore.current) return

        const limit = 5
        const request: API.LogsRequest = {
            uuid: plugin.uuid,
            logType: type === "all" ? undefined : type
        }
        if (beforeId.current) request.beforeId = beforeId.current

        setLoading(true)
        httpFetchPluginLogs({data: request, params: {limit: limit}})
            .then((res) => {
                let data: API.PluginsLogsDetail[] = []
                if (!beforeId.current) {
                    total.current = res.pagemeta.total
                    callbackTotal && callbackTotal(total.current)
                    data = data.concat(res.data || [])
                } else {
                    data = data.concat(response.data)
                    data = data.concat(res.data || [])
                }
                if (data.length >= total.current) hasMore.current = false
                beforeId.current = res.data[res.data.length - 1].id
                data = data.map((item) => {
                    // 因为操作者和修改者是同一个人，合并修改的操作，就变成了 update 类型
                    if (item.logType === "applyMerge" && item.checkStatus === 1 && !item.handleUser) {
                        item.logType = "update"
                    }
                    return item
                })
                setResponse({...res, data: [...data]})
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })
    // 初始化请求日志列表数据
    const resetFetchLogs = useDebounceFn(
        useMemoizedFn(() => {
            handleReset()
            handleFetchLogs()
            // if (["all", "check"].includes(type)) {
            //     handleFetchNewCheckLog(handleFetchLogs)
            // } else {
            //     handleFetchLogs()
            // }
        }),
        {wait: 300, leading: true}
    ).run
    // 加载更多
    const onLoadMore = useThrottleFn(
        useMemoizedFn(() => {
            if (loading || !hasMore.current) return
            if (!wrapperRef.current) return
            const {scrollTop, scrollHeight} = wrapperRef.current || {scrollTop: 0, scrollHeight: 0}
            const height = wrapperRef.current.getBoundingClientRect().height
            const scrollBottom = scrollHeight - scrollTop - height
            if (scrollBottom <= 100) handleFetchLogs()
        }),
        {wait: 200}
    ).run
    /** ---------- 列表数据获取逻辑  End ---------- */

    /** ---------- 切换私有域|切换用户  Start ---------- */
    // 切换私有域后的信息请求
    const onSwitchHost = useMemoizedFn(() => {
        if (showMerge) handleCallbackMerge(false)
        resetFetchLogs()
    })
    useEffect(() => {
        emiter.on("onSwitchPrivateDomain", onSwitchHost)
        return () => {
            emiter.off("onSwitchPrivateDomain", onSwitchHost)
        }
    }, [])

    const {userInfo} = useStore()
    useUpdateEffect(() => {
        resetFetchLogs()
        if (showMerge) handleCallbackMerge(false)
    }, [userInfo])
    /** ---------- 切换私有域|切换用户  End ---------- */

    // 操作回调，储存当前操作日志的 ID
    const activeLogId = useRef<number>(0)
    const typeCallback = useMemoizedFn((type: string, info: API.PluginsLogsDetail) => {
        if (type === "merge") {
            activeLogId.current = info.id
            handleOpenMerge()
        }
        if (type === "code") {
            activeLogId.current = info.id
            handleOpenCode()
        }
        if (type === "reply") {
            onReply(info)
        }
        if (type === "deleteComment") {
            activeLogId.current = info.id
            handleDelCommentOpen()
        }
        if (type === "supplement") {
            return
        }
        if (type === "quotation") {
            handleOpenShowQuotaion(info)
        }
    })
    /** ---------- 合并功能 Start ---------- */
    const [showMerge, setShowMerge] = useState<boolean>(false)
    const handleOpenMerge = useMemoizedFn(() => {
        if (showMerge) return
        setShowMerge(true)
    })
    const handleCallbackMerge = useMemoizedFn((result: boolean, logInfo?: API.PluginsLogsDetail) => {
        if (result) {
            setResponse((res) => {
                return {
                    ...res,
                    data: res.data.map((item) => {
                        if (item.id === activeLogId.current) {
                            return logInfo || item
                        }
                        return item
                    })
                }
            })
        }
        activeLogId.current = 0
        setShowMerge(false)
    })
    /** ---------- 合并功能 End ---------- */

    /** ---------- Code功能 Start ---------- */
    const [showCode, setShowCode] = useState<boolean>(false)
    const handleOpenCode = useMemoizedFn(() => {
        if (showCode) return
        setShowCode(true)
    })
    const handleCancelCode = useMemoizedFn(() => {
        activeLogId.current = 0
        setShowCode(false)
    })
    /** ---------- Code功能 End ---------- */

    /** ---------- 删除评论|回复 Start ---------- */
    const [delCommentShow, setDelCommentShow] = useState<boolean>(false)
    const [delCommentLoading, setDelCommentLoading] = useState<boolean>(false)
    const handleDelCommentOpen = useMemoizedFn(() => {
        if (delCommentShow) return
        if (!activeLogId.current) return
        setDelCommentShow(true)
    })
    const handleDelCommentOK = useMemoizedFn(() => {
        if (delCommentLoading) return

        let result = false
        setDelCommentLoading(true)
        httpDeleteComment(activeLogId.current)
            .then(() => {
                result = true
            })
            .catch(() => {})
            .finally(() => {
                if (result) {
                    setResponse((res) => {
                        return {
                            ...res,
                            data: res.data.filter((item) => {
                                return item.id !== activeLogId.current
                            })
                        }
                    })
                    onRefreshTotals()
                }
                activeLogId.current = 0
                handleDelCommentClose()
                setTimeout(() => {
                    setDelCommentLoading(false)
                }, 300)
            })
    })
    const handleDelCommentClose = useMemoizedFn(() => {
        activeLogId.current = 0
        setDelCommentShow(false)
    })
    /** ---------- 删除评论|回复 End ---------- */

    /** ---------- 预览回复里的引用 Start ---------- */
    const replyInfo = useRef<API.PluginsLogsDetail>()
    const [showQuotation, setShowQuotation] = useState<boolean>(false)
    const handleOpenShowQuotaion = useMemoizedFn((info: API.PluginsLogsDetail) => {
        if (showQuotation) return
        replyInfo.current = cloneDeep(info)
        setShowQuotation(true)
    })
    const handleCancelShowQuotaion = useMemoizedFn(() => {
        replyInfo.current = undefined
        setShowQuotation(false)
    })
    const replyRoleTag = useMemoizedFn(() => {
        if (!replyInfo.current) return null
        const {parentComment} = replyInfo.current
        if (!parentComment) return null
        const isAuthors = parentComment.isAuthors
        const role = parentComment.userRole

        if (isAuthors) {
            return <YakitRoundCornerTag color='info'>作者</YakitRoundCornerTag>
        }
        if (role === "admin") {
            return <YakitRoundCornerTag color='blue'>管理员</YakitRoundCornerTag>
        }
        if (role === "trusted") {
            return <YakitRoundCornerTag color='green'>信任用户</YakitRoundCornerTag>
        }
        if (role === "auditor") {
            return <YakitRoundCornerTag color='blue'>审核员</YakitRoundCornerTag>
        }

        return null
    })
    const replyContent = useMemoizedFn(() => {
        const contents: {text: string; imgs: TextareaForImage[]} = {text: "", imgs: []}
        if (!replyInfo.current) return contents
        const {parentComment} = replyInfo.current
        if (!parentComment) return contents

        if (parentComment.logType === "comment") {
            const data = pluginSupplementJSONConvertToData(parentComment.description)
            if (!data) return contents
            contents.text = data.text
            contents.imgs = data.imgs
            return contents
        } else {
            contents.text = parentComment.description
            return contents
        }
    })
    /** ---------- 预览回复里的引用 End ---------- */

    return (
        <div ref={wrapperRef} className={styles["plugin-log-list"]} onScroll={() => onLoadMore()}>
            <div className={styles["list-wrapper"]}>
                {response.data.map((item, index) => {
                    return (
                        <PluginLogOpt
                            key={`${item.id}-${item.updated_at}`}
                            plugin={plugin}
                            latestAudit={latestAuditInfo.current}
                            info={item}
                            hiddenLine={index === response.data.length - 1}
                            callback={typeCallback}
                        />
                    )
                })}

                {loading && (
                    <div className={styles["list-loading"]}>
                        <YakitSpin wrapperClassName={styles["loading-style"]} spinning={true} tip='加载中...' />
                    </div>
                )}
                {!loading && !hasMore.current && <div className={styles["list-bottom"]}>已经到底啦～</div>}
            </div>

            {/* 合并信息展示框 */}
            {showMerge && (
                <PluginLogMergeDetail
                    getContainer={document.getElementById(getContainer || "") || undefined}
                    uuid={plugin.uuid}
                    id={activeLogId.current}
                    visible={showMerge}
                    callback={handleCallbackMerge}
                />
            )}

            {/* code代码对比框 */}
            <PluginLogCodeDiff
                uuid={plugin.uuid}
                id={activeLogId.current}
                visible={showCode}
                setVisible={handleCancelCode}
            />

            {/* 删除评论|回复二次确认框 */}
            <YakitHint
                getContainer={document.getElementById(getContainer || "") || undefined}
                wrapClassName={styles["plugin-log-del-comment-hit"]}
                visible={delCommentShow}
                title='删除评论'
                content='是否确认要删除该条评论'
                okButtonProps={{loading: delCommentLoading}}
                onOk={handleDelCommentOK}
                onCancel={handleDelCommentClose}
            />

            {/* 回复的引用预览 */}
            {replyInfo.current && (
                <YakitModal
                    getContainer={document.getElementById(getContainer || "") || undefined}
                    title='评论详情'
                    type='white'
                    visible={showQuotation}
                    centered={true}
                    footer={null}
                    onCancel={handleCancelShowQuotaion}
                >
                    <div className={styles["preview-reply"]}>
                        <div className={styles["header-wrapper"]}>
                            <AuthorImg src={replyInfo.current.parentComment?.headImg || UnLogin} />
                            <div className={styles["author-name"]}>{replyInfo.current.parentComment?.userName}</div>
                            {replyRoleTag()}
                            <div className={styles["log-time"]}>{` · ${formatTimestamp(
                                replyInfo.current.parentComment?.updated_at || 0
                            )}`}</div>
                        </div>
                        <div className={styles["content-wrapper"]}>
                            <div className={styles["description-style"]}>{replyContent().text || ""}</div>
                            {replyContent().imgs.length > 0 && (
                                <div>
                                    <ImagePreviewList imgs={replyContent().imgs} />
                                </div>
                            )}
                        </div>
                    </div>
                </YakitModal>
            )}
        </div>
    )
})
