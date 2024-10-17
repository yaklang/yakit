import React, {memo, useEffect, useRef, useState} from "react"
import {useDebounceEffect, useInViewport, useMemoizedFn, useThrottleFn, useUpdateEffect} from "ahooks"
import {PluginLogListProps} from "./PluginLogType"
import {API} from "@/services/swagger/resposeType"
import {PluginLogOpt} from "./PluginLogOpt"
import {httpFetchMergePluginDetail, httpFetchPluginLogs} from "../utils/http"
import emiter from "@/utils/eventBus/eventBus"
import {useStore} from "@/store"
import {PluginLogCodeDiff, PluginLogMergeDetail} from "./PluginLogMergeDetail"

import classNames from "classnames"
import styles from "./PluginLog.module.scss"

/** @name 插件日志 */
export const PluginLogList: React.FC<PluginLogListProps> = memo((props) => {
    const {getContainer, type, plugin} = props

    const wrapperRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(wrapperRef)

    const lastLogID = useRef<number>(0)
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

    useDebounceEffect(
        () => {
            if (inViewport) {
                resetFetchLogs()
            } else {
                setResponse({
                    data: [],
                    pagemeta: {
                        page: 1,
                        limit: 20,
                        total: 0,
                        total_page: 0
                    }
                })
            }
        },
        [inViewport],
        {wait: 300}
    )

    /** ---------- 列表数据获取逻辑 Start ---------- */
    // 获取插件日志
    const handleFetchLogs = useMemoizedFn(() => {
        if (loading) return
        if (!hasMore.current) return

        const limit = 20
        const request: API.LogsRequest = {
            uuid: plugin.uuid,
            logType: type === "all" ? undefined : type,
            // afterId: lastLogID.current
        }

        setLoading(true)
        httpFetchPluginLogs({data: request, params: {limit: limit}})
            .then((res) => {
                console.log("res", res)
                let data: API.PluginsLogsDetail[] = []
                if (!lastLogID.current) {
                    data = data.concat(res.data || [])
                } else {
                    data = data.concat(response.data)
                    data = data.concat(res.data || [])
                }
                if (data.length >= res.pagemeta.total) hasMore.current = false
                setResponse({...res, data: [...data]})
                lastLogID.current = res.data[res.data.length - 1].id
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })
    // 初始化请求日志列表数据
    const resetFetchLogs = useMemoizedFn(() => {
        hasMore.current = true
        lastLogID.current = 0
        setResponse({
            data: [],
            pagemeta: {
                page: 1,
                limit: 20,
                total: 0,
                total_page: 0
            }
        })
        handleFetchLogs()
    })
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
    const logId = useRef<number>(0)
    const typeCallback = useMemoizedFn((type: string, info: API.PluginsLogsDetail) => {
        logId.current = info.id
        if (type === "merge") {
            handleOpenMerge()
        }
        if (type === "code") {
            handleOpenCode()
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
                        if (item.id === logId.current) {
                            return logInfo || item
                        }
                        return item
                    })
                }
            })
        }
        logId.current = 0
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
        logId.current = 0
        setShowCode(false)
    })
    /** ---------- Code功能 End ---------- */

    return (
        <div ref={wrapperRef} className={styles["plugin-log-list"]} onScroll={() => onLoadMore()}>
            <div className={styles["list-wrapper"]}>
                {response.data.map((item, index) => {
                    return (
                        <PluginLogOpt
                            key={`${item.id}-${item.updated_at}`}
                            plugin={plugin}
                            info={item}
                            hiddenLine={index === response.data.length - 1}
                            callback={typeCallback}
                        />
                    )
                })}

                <div className={styles["list-bottom"]}>已经到底啦～</div>
            </div>

            {showMerge && (
                <PluginLogMergeDetail
                    getContainer={document.getElementById(getContainer || "") || undefined}
                    uuid={plugin.uuid}
                    id={logId.current}
                    visible={showMerge}
                    callback={handleCallbackMerge}
                />
            )}
            <PluginLogCodeDiff uuid={plugin.uuid} id={logId.current} visible={showCode} setVisible={handleCancelCode} />
        </div>
    )
})
