import React, {useRef, useState, useEffect, forwardRef, useImperativeHandle, ReactElement} from "react"
import {useMemoizedFn, useCreation, useUpdateEffect, useInViewport, useControllableValue} from "ahooks"
import cloneDeep from "lodash/cloneDeep"
import {PluginFilterParams, PluginSearchParams} from "../baseTemplateType"
import {
    HybridScanRequest,
    YakPoCExecutorInputValueProps,
    PluginInfoProps,
    PluginBatchExecutorTaskProps,
    apiHybridScan,
    apiHybridScanByMode,
    apiCancelHybridScan,
    convertHybridScanParams,
    hybridScanParamsConvertToInputValue
} from "../utils"
import emiter from "@/utils/eventBus/eventBus"
import {useStore} from "@/store"
import {Form} from "antd"

import "../plugins.scss"
import styles from "./PluginBatchExecutor.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineArrowscollapseIcon, OutlineArrowsexpandIcon} from "@/assets/icon/outline"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import classNames from "classnames"
import {
    PluginExecuteProgress,
    PluginFixFormParams
} from "../operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {
    PluginExecuteExtraFormValue,
    RequestType
} from "../operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType"
import {HybridScanControlAfterRequest, HybridScanModeType, HybridScanTaskSourceType} from "@/models/HybridScan"
import {randomString} from "@/utils/randomUtil"
import useHoldBatchGRPCStream from "@/hook/useHoldBatchGRPCStream/useHoldBatchGRPCStream"
import {PluginExecuteResult} from "../operator/pluginExecuteResult/PluginExecuteResult"
import {ExpandAndRetract, ExpandAndRetractExcessiveState} from "../operator/expandAndRetract/ExpandAndRetract"
import {PageNodeItemProps, PluginBatchExecutorPageInfoProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitRoute} from "@/enums/yakitRoute"
import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {PluginLocalListDetails} from "../operator/PluginLocalListDetails/PluginLocalListDetails"
import {PluginExecuteLog} from "@/pages/securityTool/yakPoC/YakPoC"
import {Uint8ArrayToString} from "@/utils/str"
import {yakitNotify} from "@/utils/notification"
import {
    defPluginBatchExecuteExtraFormValue,
    defaultPluginBatchExecutorPageInfo,
    pluginTypeFilterList
} from "@/defaultConstants/PluginBatchExecutor"
import {defaultFilter, defaultSearch} from "../builtInData"
import {getRouteByTaskSource} from "./HybridScanTaskListDrawer"
import {defaultPocPageInfo} from "@/defaultConstants/YakPoC"
import { RemoteGV } from "@/yakitGV"
import { getRemoteValue, setRemoteValue } from "@/utils/kv"

const PluginBatchExecuteExtraParamsDrawer = React.lazy(() => import("./PluginBatchExecuteExtraParams"))
const HybridScanTaskListDrawer = React.lazy(() => import("./HybridScanTaskListDrawer"))

interface PluginBatchExecutorProps {
    id: string
}

type PluginTabKeys = "plugin"
interface PluginTabsItem {
    key: PluginTabKeys
    label: ReactElement | string
    contShow: boolean
}

export const isEmpty = (uint8Array: Uint8Array) => {
    return !(uint8Array && Object.keys(uint8Array).length > 0)
}
export interface PluginBatchExecuteExtraFormValue extends PluginExecuteExtraFormValue, PluginBatchExecutorTaskProps {}

export const PluginBatchExecutor: React.FC<PluginBatchExecutorProps> = React.memo((props) => {
    const {queryPagesDataById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById
        }),
        shallow
    )
    /**获取数据中心中的页面数据 */
    const initPluginBatchExecutorPageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.BatchExecutorPage, props.id)
        if (currentItem && currentItem.pageParamsInfo.pluginBatchExecutorPageInfo) {
            return currentItem.pageParamsInfo.pluginBatchExecutorPageInfo
        } else {
            return {
                ...defaultPluginBatchExecutorPageInfo
            }
        }
    })
    const [pageInfo, setPageInfo] = useState<PluginBatchExecutorPageInfoProps>(initPluginBatchExecutorPageInfo())

    const [search, setSearch] = useState<PluginSearchParams>(cloneDeep(defaultSearch))
    const [filters, setFilters] = useState<PluginFilterParams>(cloneDeep(defaultFilter))
    const [selectList, setSelectList] = useState<string[]>([])
    const [allCheck, setAllCheck] = useState<boolean>(false)

    // 隐藏插件列表
    const [hidden, setHidden] = useState<boolean>(true)
    /**是否展开/收起 */
    const [isExpand, setIsExpand] = useState<boolean>(true)
    /**是否在执行中 */
    const [executeStatus, setExecuteStatus] = useState<ExpandAndRetractExcessiveState>("default")
    const [progressList, setProgressList] = useState<StreamResult.Progress[]>([])
    /**暂停 */
    const [pauseLoading, setPauseLoading] = useState<boolean>(false)
    /**继续 */
    const [continueLoading, setContinueLoading] = useState<boolean>(false)

    const [refreshList, setRefreshList] = useState<boolean>(false)
    const [selectNum, setSelectNum] = useState<number>(0)
    const [pluginExecuteLog, setPluginExecuteLog] = useState<StreamResult.PluginExecuteLog[]>([])

    // 任务列表抽屉
    const [visibleRaskList, setVisibleRaskList] = useState<boolean>(false)

    const userInfo = useStore((s) => s.userInfo)

    /** 是否为初次加载 */
    const pluginBatchExecuteContentRef = useRef<HybridScanExecuteContentRefProps>(null)

    const batchExecuteDomRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(batchExecuteDomRef)

    // userInfo.isLogin, filters发生变化的时候触发；
    useUpdateEffect(() => {
        setRefreshList(!refreshList)
    }, [userInfo.isLogin])
    useEffect(() => {
        if (inViewport) {
            emiter.on("onRefreshLocalPluginList", onRefLocalPluginList)
        }
        return () => {
            emiter.off("onRefreshLocalPluginList", onRefLocalPluginList)
        }
    }, [inViewport])

    /**设置输入模块的初始值后，根据value刷新列表相关数据 */
    const onInitInputValueAfter = useMemoizedFn((value: HybridScanControlAfterRequest) => {
        try {
            const inputValue: YakPoCExecutorInputValueProps = hybridScanParamsConvertToInputValue(value)
            const {pluginInfo} = inputValue
            // 插件数据
            if (pluginInfo.selectPluginName.length > 0) {
                setSelectList(pluginInfo.selectPluginName)
            } else {
                setSelectList([])
                if (pluginInfo.search) setSearch(pluginInfo.search)
                if (pluginInfo.filters) setFilters(pluginInfo.filters)
                setAllCheck(true)
                setTimeout(() => {
                    setRefreshList(!refreshList)
                }, 200)
            }
        } catch (error) {}
    })
    const fetchListInPageFirstAfter = useMemoizedFn(() => {
        onActionHybridScanByRuntimeId(pageInfo.runtimeId)
    })
    /** 通过runtimeId查询该条记录详情 */
    const onActionHybridScanByRuntimeId = useMemoizedFn((runtimeId: string) => {
        if (!runtimeId) return
        pluginBatchExecuteContentRef.current
            ?.onActionHybridScanByRuntimeId(runtimeId, pageInfo.hybridScanMode)
            .then(() => {
                setIsExpand(false)
            })
    })

    const onRefLocalPluginList = useMemoizedFn(() => {
        setTimeout(() => {
            setRefreshList(!refreshList)
        }, 200)
    })

    const onRemove = useMemoizedFn((e) => {
        e.stopPropagation()
        setSelectList([])
    })

    const onExpand = useMemoizedFn((e) => {
        e.stopPropagation()
        setIsExpand(!isExpand)
    })
    const onStopExecute = useMemoizedFn((e) => {
        pluginBatchExecuteContentRef.current?.onStopExecute()
    })
    const onPause = useMemoizedFn((e) => {
        pluginBatchExecuteContentRef.current?.onPause()
    })

    const onContinue = useMemoizedFn((e) => {
        pluginBatchExecuteContentRef.current?.onContinue()
    })
    /**在顶部的执行按钮 */
    const onExecuteInTop = useMemoizedFn((e) => {
        e.stopPropagation()
        pluginBatchExecuteContentRef.current?.onStartExecute()
    })
    const pluginInfo = useCreation(() => {
        return {
            selectPluginName: selectList,
            search,
            filters
        }
    }, [selectList, search, filters])
    const isExecuting = useCreation(() => {
        if (executeStatus === "process") return true
        if (executeStatus === "paused") return true
        return false
    }, [executeStatus])
    const isShowPluginLog = useCreation(() => {
        return pluginExecuteLog.length > 0 || isExecuting
    }, [pluginExecuteLog, isExecuting])
    const dataScanParams = useCreation(() => {
        return {
            https: pageInfo.https,
            httpFlowIds: pageInfo.httpFlowIds,
            request: pageInfo.request
        }
    }, [pageInfo])

    const [curPluginTabKey, setCurPluginTabKey] = useState<PluginTabKeys>("plugin")
    const [pluginTabs, setPluginTabs] = useState<Array<PluginTabsItem>>([
        {
            key: "plugin",
            label: <>插件</>,
            contShow: true // 初始为true
        }
    ])
    const handleTabClick = (item: PluginTabsItem) => {
        const contShow = !item.contShow
        pluginTabs.forEach((i) => {
            if (i.key === item.key) {
                i.contShow = contShow
            } else {
                i.contShow = false
            }
        })
        setRemoteValue(RemoteGV.PluginBatchExecTabs, JSON.stringify({contShow: contShow, curTabKey: item.key}))
        setPluginTabs([...pluginTabs])
        setHidden(!pluginTabs.some((item) => item.contShow))
        setCurPluginTabKey(item.key)
    }
    useEffect(() => {
        getRemoteValue(RemoteGV.PluginBatchExecTabs).then((setting: string) => {
            if (setting) {
                try {
                    const tabs = JSON.parse(setting)
                    pluginTabs.forEach((i) => {
                        if (i.key === tabs.curTabKey) {
                            i.contShow = tabs.contShow
                        } else {
                            i.contShow = false
                        }
                    })
                    setPluginTabs([...pluginTabs])
                    setCurPluginTabKey(tabs.curTabKey)
                } catch (error) {
                    pluginTabs.forEach((i) => {
                        if (i.key === "plugin") {
                            i.contShow = true
                        } else {
                            i.contShow = false
                        }
                    })
                    setPluginTabs([...pluginTabs])
                    setCurPluginTabKey("plugin")
                }
            }
            setHidden(!pluginTabs.some((item) => item.contShow))
        })
    }, [])
    
    return (
        <div className={styles["plugin-batch-wrapper"]}>
            <div className={styles["plugin-tab-wrap"]}>
                <div className={styles["plugin-tab"]}>
                    {pluginTabs.map((item) => (
                        <div
                            className={classNames(styles["plugin-tab-item"], {
                                [styles["plugin-tab-item-active"]]: curPluginTabKey === item.key,
                                [styles["plugin-tab-item-unshowCont"]]: curPluginTabKey === item.key && !item.contShow
                            })}
                            key={item.key}
                            onClick={() => {
                                handleTabClick(item)
                            }}
                        >
                            {item.label}
                        </div>
                    ))}
                </div>
            </div>
            <PluginLocalListDetails
                hidden={hidden}
                selectList={selectList}
                setSelectList={setSelectList}
                search={search}
                setSearch={setSearch}
                filters={filters}
                setFilters={setFilters}
                allCheck={allCheck}
                setAllCheck={setAllCheck}
                defaultFilters={{
                    plugin_type: cloneDeep(pluginTypeFilterList)
                }}
                pluginDetailsProps={{
                    title: "选择插件",
                    bodyClassName: styles["plugin-batch-executor-body"]
                }}
                fetchListInPageFirstAfter={fetchListInPageFirstAfter}
                selectNum={selectNum}
                setSelectNum={setSelectNum}
                pluginGroupExcludeType={["yak", "codec", "lua"]}
            >
                <div className={styles["right-wrapper"]}>
                    {isShowPluginLog && (
                        <div className={styles["log-wrapper"]}>
                            <div className={styles["log-heard"]}>插件日志</div>
                            <PluginExecuteLog
                                hidden={false}
                                pluginExecuteLog={pluginExecuteLog}
                                isExecuting={executeStatus === "process"}
                            />
                        </div>
                    )}
                    <div className={styles["plugin-batch-executor-wrapper"]}>
                        <ExpandAndRetract isExpand={isExpand} onExpand={onExpand} status={executeStatus}>
                            <div className={styles["plugin-batch-executor-title"]} ref={batchExecuteDomRef}>
                                <span className={styles["plugin-batch-executor-title-text"]}>已选插件</span>
                                {selectNum > 0 && (
                                    <YakitTag closable onClose={onRemove} color='info'>
                                        {selectNum}
                                    </YakitTag>
                                )}
                            </div>
                            <div className={styles["plugin-batch-executor-btn"]}>
                                {progressList.length === 1 && (
                                    <PluginExecuteProgress
                                        percent={progressList[0].progress}
                                        name={progressList[0].id}
                                    />
                                )}
                                <YakitButton
                                    type='text'
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setVisibleRaskList(true)
                                    }}
                                    style={{padding: 0}}
                                >
                                    任务列表
                                </YakitButton>
                                {isExecuting
                                    ? !isExpand && (
                                          <>
                                              {executeStatus === "paused" && !pauseLoading && (
                                                  <YakitButton onClick={onContinue} loading={continueLoading}>
                                                      继续
                                                  </YakitButton>
                                              )}
                                              {(executeStatus === "process" || pauseLoading) && (
                                                  <YakitButton onClick={onPause} loading={pauseLoading}>
                                                      暂停
                                                  </YakitButton>
                                              )}
                                              <YakitButton
                                                  danger
                                                  onClick={onStopExecute}
                                                  disabled={pauseLoading || continueLoading}
                                              >
                                                  停止
                                              </YakitButton>
                                              <div className={styles["divider-style"]}></div>
                                          </>
                                      )
                                    : !isExpand && (
                                          <>
                                              <YakitButton onClick={onExecuteInTop} disabled={selectNum === 0}>
                                                  执行
                                              </YakitButton>
                                              <div className={styles["divider-style"]}></div>
                                          </>
                                      )}
                            </div>
                        </ExpandAndRetract>
                        <div className={styles["plugin-batch-executor-body"]}>
                            <HybridScanExecuteContent
                                ref={pluginBatchExecuteContentRef}
                                selectNum={selectNum}
                                isExpand={isExpand}
                                setIsExpand={setIsExpand}
                                defaultActiveKey={pageInfo.defaultActiveKey}
                                onInitInputValueAfter={onInitInputValueAfter}
                                setProgressList={setProgressList}
                                pauseLoading={pauseLoading}
                                setPauseLoading={setPauseLoading}
                                continueLoading={continueLoading}
                                setContinueLoading={setContinueLoading}
                                pluginInfo={pluginInfo}
                                executeStatus={executeStatus}
                                setExecuteStatus={setExecuteStatus}
                                setPluginExecuteLog={setPluginExecuteLog}
                                pluginExecuteResultWrapper={styles["plugin-executor-result-wrapper"]}
                                dataScanParams={dataScanParams}
                                pageId={props.id}
                                initRuntimeId={pageInfo.runtimeId}
                                hybridScanTaskSource='pluginBatch'
                            />
                        </div>
                    </div>
                </div>
                <React.Suspense fallback={<>loading...</>}>
                    {visibleRaskList && (
                        <HybridScanTaskListDrawer
                            visible={visibleRaskList}
                            setVisible={setVisibleRaskList}
                            hybridScanTaskSource='pluginBatch'
                        />
                    )}
                </React.Suspense>
            </PluginLocalListDetails>
        </div>
    )
})
export interface DataScanParamsProps {
    /**是否为https */
    https: boolean
    /**选中的数据History id */
    httpFlowIds: []
    /**请求包 */
    request: Uint8Array
}
interface HybridScanExecuteContentProps {
    ref?: React.ForwardedRef<HybridScanExecuteContentRefProps>
    pluginInfo: PluginInfoProps
    /**选择插件得数量 */
    selectNum: number
    /**插件执行输出结果默认选择得tabKey */
    defaultActiveKey?: string
    /** 设置输入模块的初始值后得回调事件，例如：插件批量执行页面(设置完初始值后，刷新左侧得插件列表页面) */
    onInitInputValueAfter?: (value: HybridScanControlAfterRequest) => void
    /**进度条新鲜 */
    setProgressList: (s: StreamResult.Progress[]) => void

    /**停止 */
    pauseLoading: boolean
    setPauseLoading: (value: boolean) => void

    /**继续 */
    continueLoading?: boolean
    setContinueLoading?: (value: boolean) => void

    /**是否展开收起表单内容 */
    isExpand: boolean
    setIsExpand: (value: boolean) => void

    /**执行状态 */
    executeStatus: ExpandAndRetractExcessiveState
    setExecuteStatus: (value: ExpandAndRetractExcessiveState) => void

    /**插件执行日志 */
    setPluginExecuteLog?: (s: StreamResult.PluginExecuteLog[]) => void

    pluginExecuteResultWrapper?: string
    /**设置某部分的显示与隐藏 eg:poc设置最左侧的显示与隐藏 */
    setHidden?: (value: boolean) => void
    dataScanParams?: DataScanParamsProps
    pageId?: string
    /**运行时id */
    initRuntimeId?: string

    hybridScanTaskSource: HybridScanTaskSourceType
}
export interface HybridScanExecuteContentRefProps {
    onActionHybridScanByRuntimeId: (runtimeId: string, hybridScanMode: HybridScanModeType) => Promise<null>
    onStopExecute: () => void
    onStartExecute: () => void
    onInitInputValue: (v: HybridScanControlAfterRequest) => void
    onPause: () => void
    onContinue: () => void
}
export const HybridScanExecuteContent: React.FC<HybridScanExecuteContentProps> = React.memo(
    forwardRef((props, ref) => {
        const {
            selectNum,
            pluginInfo,
            defaultActiveKey,
            onInitInputValueAfter,
            setProgressList,
            setPluginExecuteLog,
            pluginExecuteResultWrapper = "",
            setHidden,
            dataScanParams,
            pageId,
            initRuntimeId,
            hybridScanTaskSource
        } = props
        const {queryPagesDataById, updatePagesDataCacheById} = usePageInfo(
            (s) => ({
                queryPagesDataById: s.queryPagesDataById,
                updatePagesDataCacheById: s.updatePagesDataCacheById
            }),
            shallow
        )
        const [form] = Form.useForm()
        const requestType = Form.useWatch("requestType", form)
        useImperativeHandle(
            ref,
            () => ({
                onActionHybridScanByRuntimeId,
                onStopExecute,
                onPause,
                onContinue,
                onStartExecute: () => {
                    form.validateFields()
                        .then(onStartExecute)
                        .catch((e) => {
                            setIsExpand(true)
                        })
                },
                onInitInputValue
            }),
            [form]
        )
        /**额外参数弹出框 */
        const [extraParamsVisible, setExtraParamsVisible] = useState<boolean>(false)
        const [extraParamsValue, setExtraParamsValue] = useState<PluginBatchExecuteExtraFormValue>({
            ...cloneDeep(defPluginBatchExecuteExtraFormValue)
        })
        /**初始的原始请求数据包，不受额外参数中的 RawHTTPRequest 影响 */
        const [initRawHTTPRequest, setInitRawHTTPRequest] = useState<string>("")

        const [pauseLoading, setPauseLoading] = useControllableValue<boolean>(props, {
            defaultValue: false,
            valuePropName: "pauseLoading",
            trigger: "setPauseLoading"
        })
        const [continueLoading, setContinueLoading] = useControllableValue<boolean>(props, {
            defaultValue: false,
            valuePropName: "continueLoading",
            trigger: "setContinueLoading"
        })
        /**是否展开/收起 */
        const [isExpand, setIsExpand] = useControllableValue<boolean>(props, {
            defaultValue: false,
            valuePropName: "isExpand",
            trigger: "setIsExpand"
        })
        /**执行状态 */
        const [executeStatus, setExecuteStatus] = useControllableValue<ExpandAndRetractExcessiveState>(props, {
            defaultValue: "default",
            valuePropName: "executeStatus",
            trigger: "setExecuteStatus"
        })
        const [runtimeId, setRuntimeId] = useState<string>(initRuntimeId || "")

        const tokenRef = useRef<string>(randomString(40))
        const isRetryRef = useRef<boolean>(false) //是否为重试
        const batchExecuteFormRef = useRef<HTMLDivElement>(null)
        const [inViewport = true] = useInViewport(batchExecuteFormRef)

        const [streamInfo, hybridScanStreamEvent] = useHoldBatchGRPCStream({
            taskName: "hybrid-scan",
            apiKey: "HybridScan",
            token: tokenRef.current,
            onEnd: () => {
                hybridScanStreamEvent.stop()
                setTimeout(() => {
                    setPauseLoading(false)
                    setContinueLoading(false)
                }, 200)
            },
            onError: (error) => {
                hybridScanStreamEvent.stop()
                setTimeout(() => {
                    setExecuteStatus("error")
                    setPauseLoading(false)
                    setContinueLoading(false)
                }, 200)
                yakitNotify("error", `[Mod] hybrid-scan error: ${error}`)
            },
            setRuntimeId: (rId) => {
                setRuntimeId(rId)
                if (runtimeId !== rId) {
                    onUpdateExecutorPageInfo(rId)
                }
            },
            setTaskStatus: (val) => {
                switch (val) {
                    case "default":
                        setExecuteStatus("default")
                        break
                    case "done":
                        setExecuteStatus("finished")
                        break
                    case "error":
                        setExecuteStatus("error")
                        break
                    case "executing":
                        setPauseLoading(false)
                        setContinueLoading(false)
                        setExecuteStatus("process")
                        break
                    case "paused":
                        setExecuteStatus("paused")
                        break
                    default:
                        break
                }
            },
            onGetInputValue: (v) => onInitInputValue(v)
        })
        const progressList = useCreation(() => {
            return streamInfo.progressState
        }, [streamInfo.progressState])

        useEffect(() => {
            setProgressList(progressList)
        }, [progressList])
        useEffect(() => {
            if (setPluginExecuteLog) setPluginExecuteLog(streamInfo.pluginExecuteLog)
        }, [streamInfo.pluginExecuteLog])

        useEffect(() => {
            onSetScanData()
        }, [dataScanParams])
        useEffect(() => {
            if (inViewport) {
                emiter.on("switchTaskStatus", onSwitchTaskStatus)
            }
            return () => {
                emiter.off("switchTaskStatus", onSwitchTaskStatus)
            }
        }, [inViewport])
        /**切换任务状态 */
        const onSwitchTaskStatus = useMemoizedFn((res) => {
            try {
                const value = JSON.parse(res)
                const {runtimeId, hybridScanMode, pageId: pId} = value
                if (pageId !== pId) return
                if (!runtimeId) {
                    yakitNotify("error", "未设置正常得 runtimeId")
                    return
                }
                if (hybridScanMode == "new") {
                    yakitNotify("error", "重试(new)不走该操作,请传入正确的hybridScanMode")
                    return
                }
                hybridScanStreamEvent.reset()
                apiHybridScanByMode(runtimeId, hybridScanMode, tokenRef.current)
                    .then(() => {
                        if (hybridScanMode === "pause") {
                            setPauseLoading(true)
                        }
                        if (hybridScanMode === "resume") {
                            setContinueLoading(true)
                            hybridScanStreamEvent.start()
                        }
                    })
                    .catch((error) => {
                        yakitNotify("error", `apiHybridScanByMode失败${error}`)
                    })
            } catch (error) {
                yakitNotify("error", `任务操作参数解析失败${error}`)
            }
        })
        /**更新该页面最新的runtimeId */
        const onUpdateExecutorPageInfo = useMemoizedFn((runtimeId: string) => {
            if (!pageId) return
            const route = getRouteByTaskSource(hybridScanTaskSource)
            const currentItem: PageNodeItemProps | undefined = queryPagesDataById(route, pageId)
            if (!currentItem) return
            let newCurrentItem: PageNodeItemProps = {
                ...currentItem,
                pageParamsInfo: {
                    pluginBatchExecutorPageInfo: {
                        ...defaultPluginBatchExecutorPageInfo,
                        ...currentItem.pageParamsInfo.pluginBatchExecutorPageInfo,
                        runtimeId
                    }
                }
            }
            switch (hybridScanTaskSource) {
                case "yakPoc":
                    newCurrentItem = {
                        ...currentItem,
                        pageParamsInfo: {
                            pocPageInfo: {
                                ...defaultPocPageInfo,
                                ...currentItem.pageParamsInfo.pocPageInfo,
                                runtimeId
                            }
                        }
                    }
                    break
                default:
                    break
            }
            updatePagesDataCacheById(route, {...newCurrentItem})
        })

        const onSetScanData = useMemoizedFn(() => {
            if (!dataScanParams) return
            const {https, httpFlowIds, request} = dataScanParams
            const initRawHTTPRequestString = Uint8ArrayToString(isEmpty(request) ? new Uint8Array() : request)
            const formValue = {
                IsHttps: https,
                httpFlowId: httpFlowIds.length > 0 ? httpFlowIds.join(",") : "",
                IsHttpFlowId: httpFlowIds.length > 0,
                requestType: (httpFlowIds.length > 0
                    ? "httpFlowId"
                    : isEmpty(request)
                    ? "input"
                    : "original") as RequestType,
                IsRawHTTPRequest: isEmpty(request),
                rawHTTPRequest: initRawHTTPRequestString
            }

            setExtraParamsValue((v) => ({...v, ...formValue}))
            /**目前只有webfuzzer带数据包的参数进入poc */
            setInitRawHTTPRequest(initRawHTTPRequestString)
            form.setFieldsValue({
                ...formValue,
                rawHTTPRequest: initRawHTTPRequestString
            })
        })

        /**
         * @description 初次打开的操作函数
         * 通过runtimeId操作该条记录
         * */
        const onActionHybridScanByRuntimeId: (runtimeId: string, hybridScanMode: HybridScanModeType) => Promise<null> =
            useMemoizedFn((runtimeId, hybridScanMode) => {
                return new Promise((resolve, reject) => {
                    if (!runtimeId) reject("未设置正常得 runtimeId")

                    const action = (mode) => {
                        apiHybridScanByMode(runtimeId, mode, tokenRef.current)
                            .then(() => {
                                hybridScanStreamEvent.start()
                                resolve(null)
                            })
                            .catch(reject)
                    }
                    switch (hybridScanMode) {
                        case "status":
                        case "pause":
                            action(hybridScanMode)
                            break
                        case "resume":
                            hybridScanStreamEvent.reset()
                            action(hybridScanMode)
                            break
                        case "new":
                            //重试 先查询回来输入模块的值，用该值去新建任务，新建任务的逻辑在设置完输入模块后(onInitInputValue)
                            isRetryRef.current = true
                            action("status")
                            break
                        default:
                            resolve(null)
                            break
                    }
                })
            })
        /**设置输入模块的初始值 */
        const onInitInputValue = useMemoizedFn((value: HybridScanControlAfterRequest) => {
            const inputValue: YakPoCExecutorInputValueProps = hybridScanParamsConvertToInputValue(value)
            const {params} = inputValue
            const isRawHTTPRequest = !!params.HTTPRequestTemplate.IsRawHTTPRequest
            const isHttpFlowId = !!params.HTTPRequestTemplate.IsHttpFlowId
            const httpFlowId = !!params.HTTPRequestTemplate.HTTPFlowId
                ? params.HTTPRequestTemplate.HTTPFlowId.join(",")
                : ""
            // 请求类型新增了请求id，兼容之前的版本
            const requestType = {
                IsRawHTTPRequest: isRawHTTPRequest,
                IsHttpFlowId: isHttpFlowId,
                httpFlowId,
                requestType: (isHttpFlowId ? "httpFlowId" : isRawHTTPRequest ? "original" : "input") as RequestType
            }
            const initRawHTTPRequestString = Uint8ArrayToString(params.HTTPRequestTemplate.RawHTTPRequest)
            // form表单数据
            const extraForm = {
                ...params.HTTPRequestTemplate,
                ...requestType,
                Proxy: params.Proxy,
                Concurrent: params.Concurrent,
                TotalTimeoutSecond: params.TotalTimeoutSecond,
                rawHTTPRequest: initRawHTTPRequestString
            }

            const formValue = {
                Input: params.Input,
                IsHttps: params.HTTPRequestTemplate.IsHttps,
                rawHTTPRequest: initRawHTTPRequestString,
                ...requestType
            }
            form.setFieldsValue({...formValue})
            setExtraParamsValue(extraForm)
            setInitRawHTTPRequest(initRawHTTPRequestString)
            // 重试
            if (isRetryRef.current) {
                isRetryRef.current = false
                onStartExecute(formValue)
            }
            if (onInitInputValueAfter) onInitInputValueAfter(value)
        })
        const getHybridScanParams: (value) => HybridScanControlAfterRequest = useMemoizedFn((value) => {
            // 任务配置参数
            const taskParams: PluginBatchExecutorTaskProps = {
                Concurrent: extraParamsValue.Concurrent,
                TotalTimeoutSecond: extraParamsValue.TotalTimeoutSecond,
                Proxy: extraParamsValue.Proxy
            }
            const hTTPFlowId = value.requestType === "httpFlowId" && value.httpFlowId ? value.httpFlowId.split(",") : []
            const params: HybridScanRequest = {
                Input: value.Input,
                ...taskParams,
                HTTPRequestTemplate: {
                    ...extraParamsValue,
                    IsHttps: !!value.IsHttps,
                    IsRawHTTPRequest: value.requestType === "original",
                    IsHttpFlowId: value.requestType === "httpFlowId",
                    HTTPFlowId: hTTPFlowId.map((ele) => Number(ele)).filter((ele) => !!ele),
                    RawHTTPRequest: value.rawHTTPRequest
                        ? Buffer.from(value.rawHTTPRequest, "utf8")
                        : Buffer.from("", "utf8")
                }
            }
            return convertHybridScanParams(params, pluginInfo)
        })

        const [inputType, setInputType] = useState<"content" | "path">("content")
        /**开始执行 */
        const onStartExecute = useMemoizedFn(async (value) => {
            if (selectNum === 0) {
                yakitNotify("info", "请勾选插件")
                return
            }
            const hybridScanParams: HybridScanControlAfterRequest = {
                ...getHybridScanParams(value),
                HybridScanTaskSource: hybridScanTaskSource
            }
            hybridScanStreamEvent.reset()
            if (inputType === "path" && hybridScanParams.Targets) {
                hybridScanParams.Targets.InputFile = [hybridScanParams.Targets.Input]
                hybridScanParams.Targets.Input = ""
            }
            apiHybridScan(hybridScanParams, tokenRef.current).then(() => {
                setIsExpand(false)
                setExecuteStatus("process")
                if (setHidden) setHidden(true)
                hybridScanStreamEvent.start()
            })
        })
        const openExtraPropsDrawer = useMemoizedFn(() => {
            setExtraParamsVisible(true)
        })
        /**保存额外参数 */
        const onSaveExtraParams = useMemoizedFn((v: PluginBatchExecuteExtraFormValue) => {
            setExtraParamsValue((val) => ({...val, ...v}) as PluginBatchExecuteExtraFormValue)
            setExtraParamsVisible(false)
        })
        /**取消执行 */
        const onStopExecute = useMemoizedFn(() => {
            apiCancelHybridScan(tokenRef.current).then(() => {
                setExecuteStatus("finished")
            })
        })
        /**暂停 */
        const onPause = useMemoizedFn(() => {
            setPauseLoading(true)
            apiHybridScanByMode(runtimeId, "pause", tokenRef.current)
        })
        /**继续 */
        const onContinue = useMemoizedFn(() => {
            setContinueLoading(true)
            hybridScanStreamEvent.reset()
            apiHybridScanByMode(runtimeId, "resume", tokenRef.current).then(() => {
                hybridScanStreamEvent.start()
            })
        })
        const isExecuting = useCreation(() => {
            if (executeStatus === "process") return true
            if (executeStatus === "paused") return true
            return false
        }, [executeStatus])
        const isShowResult = useCreation(() => {
            return isExecuting || runtimeId
        }, [isExecuting, runtimeId])
        return (
            <>
                <div
                    className={classNames(styles["plugin-batch-execute-form-wrapper"], {
                        [styles["plugin-batch-execute-form-wrapper-hidden"]]: !isExpand
                    })}
                    ref={batchExecuteFormRef}
                >
                    <Form
                        form={form}
                        onFinish={onStartExecute}
                        labelCol={{span: 6}}
                        wrapperCol={{span: 12}} //这样设置是为了让输入框居中
                        validateMessages={{
                            /* eslint-disable no-template-curly-in-string */
                            required: "${label} 是必填字段"
                        }}
                        labelWrap={true}
                    >
                        <PluginFixFormParams
                            form={form}
                            disabled={isExecuting}
                            type='batch'
                            rawHTTPRequest={initRawHTTPRequest}
                            inputType={inputType}
                            setInputType={setInputType}
                        />
                        <Form.Item colon={false} label={" "} style={{marginBottom: 0}}>
                            <div className={styles["plugin-execute-form-operate"]}>
                                {isExecuting ? (
                                    <>
                                        {executeStatus === "paused" && !pauseLoading && (
                                            <YakitButton size='large' onClick={onContinue} loading={continueLoading}>
                                                继续
                                            </YakitButton>
                                        )}
                                        {(executeStatus === "process" || pauseLoading) && (
                                            <YakitButton size='large' onClick={onPause} loading={pauseLoading}>
                                                暂停
                                            </YakitButton>
                                        )}
                                        <YakitButton
                                            danger
                                            onClick={onStopExecute}
                                            size='large'
                                            disabled={pauseLoading || continueLoading}
                                        >
                                            停止
                                        </YakitButton>
                                    </>
                                ) : (
                                    <>
                                        <YakitButton htmlType='submit' size='large'>
                                            开始执行
                                        </YakitButton>
                                    </>
                                )}
                                <YakitButton
                                    type='text'
                                    onClick={openExtraPropsDrawer}
                                    disabled={isExecuting}
                                    size='large'
                                >
                                    额外参数
                                </YakitButton>
                            </div>
                        </Form.Item>
                    </Form>
                </div>
                {isShowResult && (
                    <PluginExecuteResult
                        streamInfo={streamInfo}
                        runtimeId={runtimeId}
                        loading={isExecuting}
                        defaultActiveKey={defaultActiveKey}
                        pluginExecuteResultWrapper={pluginExecuteResultWrapper}
                    />
                )}
                <React.Suspense fallback={<div>loading...</div>}>
                    <PluginBatchExecuteExtraParamsDrawer
                        isRawHTTPRequest={requestType !== "input"}
                        extraParamsValue={extraParamsValue}
                        visible={extraParamsVisible}
                        setVisible={setExtraParamsVisible}
                        onSave={onSaveExtraParams}
                    />
                </React.Suspense>
            </>
        )
    })
)
