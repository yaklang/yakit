import React, {ReactNode, memo, useEffect, useMemo, useRef, useState} from "react"
import {PluginLogDiffCodeProps, PluginLogOptProps, PluginLogProps} from "./PluginLogType"
import UnLogin from "@/assets/unLogin.png"
import {AuthorImg} from "../funcTemplate"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {formatTimestamp} from "@/utils/timeUtil"
import {YakitCollapseText} from "@/components/yakitUI/YakitCollapseText/YakitCollapseText"
import {
    PluginLogDelIcon,
    PluginLogModifyIcon,
    PluginLogNewIcon,
    PluginLogNoPassIcon,
    PluginLogPassIcon,
    PluginLogRestoreIcon
} from "./icon"
import {useDebounceEffect, useDebounceFn, useInViewport, useLatest, useMemoizedFn, useUpdateEffect} from "ahooks"
import {YakitRoundCornerTag} from "@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag"
import {apiFetchOnlinePluginInfo, apiFetchPluginLogs} from "../utils"
import {yakitNotify} from "@/utils/notification"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitDiffEditor} from "@/components/yakitUI/YakitDiffEditor/YakitDiffEditor"
import {GetPluginLanguage} from "../builtInData"
import {PluginLogDetail} from "./PluginLogDetail"
import {OnlineJudgment} from "../onlineJudgment/OnlineJudgment"
import {API} from "@/services/swagger/resposeType"
import {useStore} from "@/store"
import {YakitTimeLineList} from "@/components/yakitUI/YakitTimeLineList/YakitTimeLineList"
import {PluginDetailHeader} from "../baseTemplate"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitTimeLineListRefProps} from "@/components/yakitUI/YakitTimeLineList/YakitTimeLineListType"
import emiter from "@/utils/eventBus/eventBus"
import {httpFetchMergePluginDetail} from "@/pages/pluginHub/utils/http"

import classNames from "classnames"
import styles from "./PluginLog.module.scss"

/** 日志类型-对应展示信息 */
const LogTypeToInfo: Record<string, {content: string; className: string; icon: ReactNode}> = {
    submit: {content: "创建插件", className: styles["log-type"], icon: <PluginLogNewIcon />},
    applyMerge: {content: "申请修改插件", className: styles["log-type"], icon: <PluginLogModifyIcon />},
    mergePass: {
        content: "已合并",
        className: classNames(styles["log-type"], styles["log-type-pass"]),
        icon: <PluginLogPassIcon />
    },
    mergeNoPass: {
        content: "驳回",
        className: classNames(styles["log-type"], styles["log-type-no-pass"]),
        icon: <PluginLogNoPassIcon />
    },
    update: {content: "修改插件", className: styles["log-type"], icon: <PluginLogModifyIcon />},
    checkPass: {
        content: "审核通过",
        className: classNames(styles["log-type"], styles["log-type-pass"]),
        icon: <PluginLogPassIcon />
    },
    checkNoPass: {
        content: "审核不通过",
        className: classNames(styles["log-type"], styles["log-type-no-pass"]),
        icon: <PluginLogNoPassIcon />
    },
    delete: {content: "删除插件", className: styles["log-type"], icon: <PluginLogDelIcon />},
    recover: {content: "恢复插件", className: styles["log-type"], icon: <PluginLogRestoreIcon />}
}
const handleToLogInfo = (info: API.PluginsLogsDetail) => {
    const status = info.checkStatus
    const type = info.logType

    if (["submit", "update", "delete", "recover"].includes(type)) {
        return LogTypeToInfo[type]
    }
    if (type === "check") {
        if (status === 1) {
            return LogTypeToInfo["checkPass"]
        }
        if (status === 2) {
            return LogTypeToInfo["checkNoPass"]
        }
    }
    if (type === "applyMerge") {
        if (status === 0) {
            return LogTypeToInfo["applyMerge"]
        }
        if (status === 1) {
            return LogTypeToInfo["mergePass"]
        }
        if (status === 2) {
            return LogTypeToInfo["mergeNoPass"]
        }
    }
    return null
}

export const PluginLog: React.FC<PluginLogProps> = memo((props) => {
    const {uuid, getContainer} = props

    const wrapperRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(wrapperRef)

    const [pluginLoading, setPluginLoading] = useState<boolean>(false)
    const [plugin, setPlugin] = useState<API.PluginsDetail>()
    const latestPlugin = useLatest(plugin)

    const timeListRef = useRef<YakitTimeLineListRefProps>(null)
    const handleClearTimeList = useMemoizedFn(() => {
        timeListRef.current?.onClear()
    })

    const pageRef = useRef<number>(1)
    const [resLoading, setResLoading] = useState<boolean>(false)
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

    // 获取插件详情
    const fetchPluginDetail = useDebounceFn(
        useMemoizedFn((onlineId) => {
            setPluginLoading(true)
            apiFetchOnlinePluginInfo({uuid: onlineId})
                .then((info) => {
                    if (uuid === onlineId) {
                        setPlugin(info)
                        resetFetchLogs()
                    }
                })
                .catch(() => {
                    if (uuid === onlineId) {
                        setPlugin(undefined)
                        resetResponse()
                        setTimeout(() => {
                            setPluginLoading(false)
                        }, 200)
                    }
                })
        }),
        {wait: 300}
    ).run
    // 获取插件日志
    const fetchLogs = useMemoizedFn((page: number) => {
        if (resLoading) return

        if (page === 1) {
            /**
             * 因为不定高虚拟列表自身无法计算传入数据的数量由多变少时的逻辑
             * 所以需要使用者手动清空虚拟列表的位置状态信息
             */
            handleClearTimeList()
        }
        setResLoading(true)
        apiFetchPluginLogs({uuid: uuid, Page: page, Limit: 5})
            .then((res) => {
                let data: API.PluginsLogsDetail[] = []
                if (res.pagemeta.page === 1) {
                    data = data.concat(res.data || [])
                } else {
                    data = data.concat(response.data)
                    data = data.concat(res.data || [])
                }
                if (data.length >= res.pagemeta.total) hasMore.current = false
                setResponse({...res, data: [...data]})
                pageRef.current += 1
            })
            .catch(() => {
                if (page === 1) resetResponse()
            })
            .finally(() => {
                setPluginLoading(false)
                setTimeout(() => {
                    setResLoading(false)
                }, 200)
            })
    })

    // 初始化请求日志列表数据
    const resetFetchLogs = useMemoizedFn(() => {
        hasMore.current = true
        pageRef.current = 1
        fetchLogs(pageRef.current)
    })
    // 重置日志列表数据
    const resetResponse = useMemoizedFn(() => {
        hasMore.current = false
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

    // 控制日志列表展示时的loading状态和重置列表数据
    useEffect(() => {
        if (inViewport) {
            if (uuid) {
                if (!latestPlugin.current) {
                    setPluginLoading(true)
                    fetchPluginDetail(uuid)
                } else {
                    // 减少切换页面场景下的重复请求
                    if (latestPlugin.current.uuid !== uuid) {
                        setPluginLoading(true)
                        fetchPluginDetail(uuid)
                    } else resetFetchLogs()
                }
            } else {
                setPlugin(undefined)
                resetResponse()
            }
        }
    }, [inViewport, uuid])

    const handleLoadMore = useMemoizedFn(() => {
        if (resLoading) return
        if (plugin && plugin.uuid !== uuid) return

        fetchLogs(pageRef.current)
    })

    /** ---------- 认证状态改变时的触发事件 Start ---------- */
    // 切换私有域后的信息请求
    const onSwitchHost = useMemoizedFn(() => {
        if (mergeShow.visible) onCancelMerge()
        setPlugin(undefined)
        fetchPluginDetail(uuid)
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
        if (mergeShow.visible) onCancelMerge()
    }, [userInfo])
    /** ---------- 认证状态改变时的触发事件 End ---------- */
    /** ---------- 合并功能 Start ---------- */
    const [mergeShow, setMergeShow] = useState<{visible: boolean; info?: API.PluginsLogsDetail; index: number}>({
        visible: false,
        info: undefined,
        index: -1
    })
    const handleMerge = useMemoizedFn((info: API.PluginsLogsDetail, index: number) => {
        if (mergeShow.visible) return
        setMergeShow({visible: true, info: info, index: index})
    })
    const handleChangeMerge = useMemoizedFn((isPass: boolean, reason?: string) => {
        if (mergeShow.index === -1) return
        const lists = [...response.data]
        if (lists.length === 0) return

        lists[mergeShow.index].checkStatus = isPass ? 1 : 2
        if (!isPass) lists[mergeShow.index].description = reason || ""
        setResponse({...response, data: [...lists]})
        onCancelMerge()
    })
    const onCancelMerge = useMemoizedFn(() => {
        if (!mergeShow.visible) return
        setMergeShow({
            visible: false,
            info: undefined,
            index: -1
        })
    })
    /** ---------- 合并功能 End ---------- */

    return (
        <div ref={wrapperRef} className={styles["plugin-online-log"]}>
            <YakitSpin spinning={pluginLoading}>
                <div className={styles["plugin-online-log-body"]}>
                    {plugin ? (
                        <>
                            <PluginDetailHeader
                                pluginName={plugin.script_name}
                                help={plugin.help}
                                tags={plugin.tags}
                                img={plugin.head_img}
                                user={plugin.authors}
                                pluginId={plugin.uuid}
                                updated_at={plugin.updated_at}
                                prImgs={(plugin.collaborator || []).map((ele) => ({
                                    headImg: ele.head_img,
                                    userName: ele.user_name
                                }))}
                                type={plugin.type}
                            />

                            <div className={styles["plugin-online-log-list"]}>
                                <div className={styles["log-header"]}>
                                    <span className={styles["header-title"]}>插件日志</span>
                                    <div className={styles["header-tag"]}>{response.pagemeta.total}</div>
                                </div>
                                <div className={styles["log-content"]}>
                                    {response.data.length > 0 ? (
                                        <OnlineJudgment>
                                            <YakitTimeLineList
                                                ref={timeListRef}
                                                loading={resLoading}
                                                data={response.data}
                                                icon={(info) => {
                                                    return handleToLogInfo(info)?.icon || null
                                                }}
                                                renderItem={(info) => {
                                                    return (
                                                        <PluginLogOpt
                                                            uuid={uuid}
                                                            info={info}
                                                            onMerge={(info) => handleMerge(info, 0)}
                                                        />
                                                    )
                                                }}
                                                hasMore={hasMore.current}
                                                loadMore={handleLoadMore}
                                            />
                                        </OnlineJudgment>
                                    ) : (
                                        <YakitEmpty style={{paddingTop: 48}} />
                                    )}
                                </div>

                                {mergeShow.info && (
                                    <PluginLogDetail
                                        getContainer={document.getElementById(getContainer || "") || undefined}
                                        uuid={uuid}
                                        info={mergeShow.info}
                                        visible={mergeShow.visible}
                                        onClose={onCancelMerge}
                                        onChange={handleChangeMerge}
                                    />
                                )}
                            </div>
                        </>
                    ) : (
                        <YakitEmpty style={{paddingTop: 48}} />
                    )}
                </div>
            </YakitSpin>
        </div>
    )
})

export const PluginLogs: React.FC<PluginLogProps> = memo((props) => {
    const {uuid, getContainer} = props

    const wrapperRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(wrapperRef)

    const latestUUID = useRef<string>("")

    const timeListRef = useRef<YakitTimeLineListRefProps>(null)
    const handleClearTimeList = useMemoizedFn(() => {
        timeListRef.current?.onClear()
    })

    const pageRef = useRef<number>(1)
    const [resLoading, setResLoading] = useState<boolean>(false)
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
                if (!!uuid) {
                    resetFetchLogs()
                } else {
                    resetResponse()
                }
            }
        },
        [inViewport, uuid],
        {wait: 300}
    )

    // 获取插件日志
    const fetchLogs = useMemoizedFn((page: number) => {
        if (resLoading) return

        if (page === 1) {
            /**
             * 因为不定高虚拟列表自身无法计算传入数据的数量由多变少时的逻辑
             * 所以需要使用者手动清空虚拟列表的位置状态信息
             */
            handleClearTimeList()
        }
        setResLoading(true)
        apiFetchPluginLogs({uuid: uuid, Page: page, Limit: 5})
            .then((res) => {
                latestUUID.current = uuid
                let data: API.PluginsLogsDetail[] = []
                if (res.pagemeta.page === 1) {
                    data = data.concat(res.data || [])
                } else {
                    data = data.concat(response.data)
                    data = data.concat(res.data || [])
                }
                if (data.length >= res.pagemeta.total) hasMore.current = false
                setResponse({...res, data: [...data]})
                pageRef.current += 1
            })
            .catch(() => {
                if (page === 1) resetResponse()
            })
            .finally(() => {
                setTimeout(() => {
                    setResLoading(false)
                }, 200)
            })
    })

    // 初始化请求日志列表数据
    const resetFetchLogs = useMemoizedFn(() => {
        hasMore.current = true
        pageRef.current = 1
        fetchLogs(pageRef.current)
    })
    // 重置日志列表数据
    const resetResponse = useMemoizedFn(() => {
        hasMore.current = false
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

    const handleLoadMore = useMemoizedFn(() => {
        if (resLoading) return
        if (!latestUUID.current || latestUUID.current !== uuid) return

        fetchLogs(pageRef.current)
    })

    /** ---------- 认证状态改变时的触发事件 Start ---------- */
    // 切换私有域后的信息请求
    const onSwitchHost = useMemoizedFn(() => {
        if (mergeShow.visible) onCancelMerge()
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
        if (mergeShow.visible) onCancelMerge()
    }, [userInfo])
    /** ---------- 认证状态改变时的触发事件 End ---------- */
    /** ---------- 合并功能 Start ---------- */
    const [mergeShow, setMergeShow] = useState<{visible: boolean; info?: API.PluginsLogsDetail; index: number}>({
        visible: false,
        info: undefined,
        index: -1
    })
    const handleMerge = useMemoizedFn((info: API.PluginsLogsDetail, index: number) => {
        if (mergeShow.visible) return
        setMergeShow({visible: true, info: info, index: index})
    })
    const handleChangeMerge = useMemoizedFn((isPass: boolean, reason?: string) => {
        if (mergeShow.index === -1) return
        const lists = [...response.data]
        if (lists.length === 0) return

        lists[mergeShow.index].checkStatus = isPass ? 1 : 2
        if (!isPass) lists[mergeShow.index].description = reason || ""
        setResponse({...response, data: [...lists]})
        onCancelMerge()
    })
    const onCancelMerge = useMemoizedFn(() => {
        if (!mergeShow.visible) return
        setMergeShow({
            visible: false,
            info: undefined,
            index: -1
        })
    })
    /** ---------- 合并功能 End ---------- */

    return (
        <div ref={wrapperRef} className={styles["plugin-online-logs"]}>
            <div className={styles["plugin-online-log-list"]}>
                <div className={styles["log-header"]}>
                    <span className={styles["header-title"]}>插件日志</span>
                    <div className={styles["header-tag"]}>{response.pagemeta.total}</div>
                </div>
                <div className={styles["log-content"]}>
                    {response.data.length > 0 ? (
                        <OnlineJudgment>
                            <YakitTimeLineList
                                ref={timeListRef}
                                loading={resLoading}
                                data={response.data}
                                icon={(info) => {
                                    return handleToLogInfo(info)?.icon || null
                                }}
                                renderItem={(info) => {
                                    return (
                                        <PluginLogOpt
                                            uuid={uuid}
                                            info={info}
                                            onMerge={(info) => handleMerge(info, 0)}
                                        />
                                    )
                                }}
                                hasMore={hasMore.current}
                                loadMore={handleLoadMore}
                            />
                        </OnlineJudgment>
                    ) : (
                        <YakitEmpty style={{paddingTop: 48}} />
                    )}
                </div>

                {mergeShow.info && (
                    <PluginLogDetail
                        getContainer={document.getElementById(getContainer || "") || undefined}
                        uuid={uuid}
                        info={mergeShow.info}
                        visible={mergeShow.visible}
                        onClose={onCancelMerge}
                        onChange={handleChangeMerge}
                    />
                )}
            </div>
        </div>
    )
})

const PluginLogOpt: React.FC<PluginLogOptProps> = memo((props) => {
    const {uuid, info, onMerge} = props

    /** 角色tag */
    const roleTag = useMemo(() => {
        const isAuthirs = info.isAuthors
        const role = info.userRole

        if (isAuthirs) {
            return <YakitRoundCornerTag>作者</YakitRoundCornerTag>
        }
        if (role === "admin") {
            return <YakitRoundCornerTag color='blue'>管理员</YakitRoundCornerTag>
        }
        if (role === "trusted") {
            return <YakitRoundCornerTag color='green'>信任用户</YakitRoundCornerTag>
        }
        if (role === "auditor") {
            return <YakitRoundCornerTag color='blue'>管理员</YakitRoundCornerTag>
        }

        return null
    }, [info])
    /** 日志类型 */
    const type = useMemo(() => {
        return handleToLogInfo(info)
    }, [info.checkStatus, info.logType])

    const onModify = useMemoizedFn(() => onMerge(info))

    const [visible, setVisible] = useState<boolean>(false)

    return (
        <div className={styles["plugin-log-opt-wrapper"]}>
            <div className={styles["opt-header-wrapper"]}>
                <AuthorImg src={info.headImg || UnLogin} />
                <div className={styles["author-name"]}>{info.userName}</div>
                {roleTag}
                {type && <div className={type.className}>{type.content}</div>}
                <div className={styles["log-time"]}>{` · ${formatTimestamp(info.updated_at)}`}</div>
                {type?.content === "申请修改插件" && info.loginIsPluginUser && (
                    <div className={styles["log-operate"]}>
                        <YakitButton type='text' size='large' onClick={onModify}>
                            去合并
                        </YakitButton>
                        <div className={styles["divider-style"]}></div>
                        <YakitPopover
                            trigger={"click"}
                            placement='bottomRight'
                            content={
                                <PluginLogDiffCode
                                    uuid={uuid}
                                    logId={info.id}
                                    visible={visible}
                                    setVisible={setVisible}
                                />
                            }
                            visible={visible}
                            onVisibleChange={setVisible}
                        >
                            <YakitButton type='text' size='large' onClick={(e) => e.stopPropagation()}>
                                Code
                            </YakitButton>
                        </YakitPopover>
                    </div>
                )}
            </div>
            {info.description && (
                <div className={styles["opt-advise-wrapper"]}>
                    <YakitCollapseText content={info.description} wrapperClassName={styles["collapse-text"]} />
                </div>
            )}
        </div>
    )
})

const PluginLogDiffCode: React.FC<PluginLogDiffCodeProps> = memo((props) => {
    const {uuid, logId, visible, setVisible} = props

    const [loading, setLoading] = useState<boolean>(false)
    const oldCode = useRef<string>("")
    const newCode = useRef<string>("")
    const language = useRef<string>("")

    const [update, setUpdate] = useState<boolean>(false)

    const onFetchDiffCode = useMemoizedFn(() => {
        if (!uuid || !logId) return
        if (loading) return

        setLoading(true)
        httpFetchMergePluginDetail({uuid: uuid, up_log_id: logId})
            .then(async (res) => {
                if (res) {
                    language.current = GetPluginLanguage(res.type)
                    // 获取对比器-修改源码
                    newCode.current = res.content
                    // 获取对比器-源码
                    if (res.merge_before_plugins) oldCode.current = res.merge_before_plugins.content || ""
                    setUpdate(!update)
                } else {
                    yakitNotify("error", `获取失败，返回数据为空!`)
                    setVisible(false)
                }
            })
            .catch((err) => {
                setVisible(false)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })

    useEffect(() => {
        if (visible) onFetchDiffCode()
    }, [visible])

    return (
        <div className={styles["plugin-log-diff-code-wrapper"]}>
            <YakitSpin spinning={loading}>
                <div className={styles["diff-code-header"]}>
                    <div className={styles["header-body"]}>插件源码</div>
                    <div className={classNames(styles["header-body"], styles["header-right-body"])}>申请人提交源码</div>
                </div>
                <div className={styles["diff-code-content"]}>
                    <YakitDiffEditor
                        leftDefaultCode={oldCode.current}
                        leftReadOnly={true}
                        rightDefaultCode={newCode.current}
                        rightReadOnly={true}
                        triggerUpdate={update}
                        language={language.current}
                    />
                </div>
            </YakitSpin>
        </div>
    )
})
