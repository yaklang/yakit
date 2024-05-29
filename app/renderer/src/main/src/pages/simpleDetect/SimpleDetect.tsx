import React, {useEffect, useRef, useState} from "react"
import {
    SimpleDetectForm,
    SimpleDetectFormContentProps,
    SimpleDetectProps,
    SimpleDetectValueProps
} from "./SimpleDetectType"
import {Checkbox, Form, Progress, Slider} from "antd"
import {ExpandAndRetract, ExpandAndRetractExcessiveState} from "../plugins/operator/expandAndRetract/ExpandAndRetract"
import {useCreation, useInViewport, useMemoizedFn} from "ahooks"
import {randomString} from "@/utils/randomUtil"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {failed, warn, yakitNotify} from "@/utils/notification"
import {RecordPortScanRequest, apiCancelSimpleDetect, apiSimpleDetect} from "../securityTool/newPortScan/utils"
import styles from "./SimpleDetect.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import classNames from "classnames"
import {PluginExecuteResult} from "../plugins/operator/pluginExecuteResult/PluginExecuteResult"
import {PortScanExecuteExtraFormValue} from "../securityTool/newPortScan/NewPortScanType"
import {defPortScanExecuteExtraFormValue} from "../securityTool/newPortScan/NewPortScan"
import cloneDeep from "lodash/cloneDeep"
import {YakitFormDraggerContent} from "@/components/yakitUI/YakitForm/YakitForm"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {useStore} from "@/store"
import {
    DownloadOnlinePluginsRequest,
    apiDeleteLocalPluginsByWhere,
    apiFetchQueryYakScriptGroupLocal,
    defaultDeleteLocalPluginsByWhereRequest
} from "../plugins/utils"
import {DownloadOnlinePluginAllResProps} from "../yakitStore/YakitStorePage"
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitRoute} from "@/routes/newRouteConstants"
import emiter from "@/utils/eventBus/eventBus"
import {SliderMarks} from "antd/lib/slider"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {GroupCount} from "../invoker/schema"
import {getLinkPluginConfig} from "../plugins/singlePluginExecution/SinglePluginExecution"
import {PresetPorts} from "../portscan/schema"
import {PluginExecuteProgress} from "../plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitGetOnlinePlugin} from "../mitm/MITMServerHijacking/MITMPluginLocalList"
import {SimpleDetectExtraParam} from "./SimpleDetectExtraParamsDrawer"
import {convertStartBruteParams} from "../securityTool/newBrute/utils"
import {OutlineClipboardlistIcon} from "@/assets/icon/outline"
import {SimpleTabInterface} from "../layout/mainOperatorContent/MainOperatorContent"
import {CreateReportContentProps, onCreateReportModal} from "../portscan/CreateReport"
import {defaultSearch} from "../plugins/builtInData"
import {defaultBruteExecuteExtraFormValue} from "@/defaultConstants/NewBrute"
import {
    apiCancelRecoverSimpleDetectTask,
    apiGetSimpleDetectRecordRequestById,
    apiRecoverSimpleDetectTask,
    apiSaveCancelSimpleDetect
} from "./utils"
import {defaultSimpleDetectPageInfo} from "@/defaultConstants/SimpleDetectConstants"
import {YakitRouteToPageInfo} from "@/routes/newRoute"
import {StartBruteParams} from "../securityTool/newBrute/NewBruteType"

const SimpleDetectExtraParamsDrawer = React.lazy(() => import("./SimpleDetectExtraParamsDrawer"))
const SimpleDetectTaskListDrawer = React.lazy(() => import("./SimpleDetectTaskListDrawer"))

const {ipcRenderer} = window.require("electron")

const defaultScanDeep = 3

const scanDeepMapPresetPort = {
    3: "fast",
    2: "middle",
    1: "slow"
}

export const SimpleDetect: React.FC<SimpleDetectProps> = React.memo((props) => {
    const {pageId} = props
    // 全局登录状态
    const {userInfo} = useStore()
    const {queryPagesDataById, updatePagesDataCacheById, removePagesDataCacheById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById,
            updatePagesDataCacheById: s.updatePagesDataCacheById,
            removePagesDataCacheById: s.removePagesDataCacheById
        }),
        shallow
    )
    const initSpaceEnginePageName = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.SimpleDetect, pageId)
        if (currentItem && currentItem.pageName) {
            return currentItem.pageName
        }
        return YakitRouteToPageInfo[YakitRoute.SimpleDetect].label
    })
    const initSpaceEnginePageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.SimpleDetect, pageId)
        if (currentItem && currentItem.pageParamsInfo.simpleDetectPageInfo) {
            return currentItem.pageParamsInfo.simpleDetectPageInfo
        }
        return {
            ...defaultSimpleDetectPageInfo
        }
    })
    const [form] = Form.useForm()
    const [tabName, setTabName] = useState<string>(initSpaceEnginePageName())
    /**是否展开/收起 */
    const [isExpand, setIsExpand] = useState<boolean>(true)
    const [executeStatus, setExecuteStatus] = useState<ExpandAndRetractExcessiveState>("default")

    /**额外参数弹出框 */
    const [extraParamsVisible, setExtraParamsVisible] = useState<boolean>(false)
    const [extraParamsValue, setExtraParamsValue] = useState<SimpleDetectExtraParam>({
        portScanParam: cloneDeep({
            ...defPortScanExecuteExtraFormValue,
            scanDeep: defaultScanDeep,
            presetPort: scanDeepMapPresetPort[defaultScanDeep],
            Ports: PresetPorts[scanDeepMapPresetPort[defaultScanDeep]],
            HostAliveConcurrent: 200
        }),
        bruteExecuteParam: cloneDeep(defaultBruteExecuteExtraFormValue)
    })
    const [refreshGroup, setRefreshGroup] = useState<boolean>(false)
    const [visibleOnline, setVisibleOnline] = useState<boolean>(false)
    const [removeLoading, setRemoveLoading] = useState<boolean>(false)

    const [runtimeId, setRuntimeId] = useState<string>("")

    const [taskListVisible, setTaskListVisible] = useState<boolean>(false)

    const [isRecoverTask, setIsRecoverTask] = useState<boolean>(!!initSpaceEnginePageInfo().runtimeId) //是否为继续任务
    const [recoverRuntimeId, setRecoverRuntimeId] = useState<string>(initSpaceEnginePageInfo().runtimeId) // 继续任务的runtimeId
    const [stopLoading, setStopLoading] = useState<boolean>(false)

    const scanDeep = Form.useWatch("scanDeep", form)

    const taskNameRef = useRef<string>("")
    const simpleDetectWrapperRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(simpleDetectWrapperRef)
    const tokenRef = useRef<string>(randomString(40))
    const recoverTokenRef = useRef<string>(randomString(40))
    const portScanRequestParamsRef = useRef<PortScanExecuteExtraFormValue>()
    const startBruteParamsRef = useRef<StartBruteParams>()
    /**前端保存的最新的任务的值 */
    const simpleDetectValuePropsRef = useRef<SimpleDetectValueProps>({
        formValue: null,
        extraParamsValue: null
    })
    const streamErrorRef = useRef<string>() // 任务报错的原因

    const defaultTabs = useCreation(() => {
        return [
            {tabName: "漏洞与风险", type: "risk"},
            {tabName: "扫描端口列表", type: "port"},
            {tabName: "日志", type: "log"},
            {tabName: "Console", type: "console"}
        ]
    }, [])
    const onEnd = useMemoizedFn(() => {
        // 在此之前需要先保存任务
        setTimeout(() => {
            const isStop = streamErrorRef.current && streamErrorRef.current === "Cancelled on client" // Cancelled on client 主动停止报错
            if (!isStop) {
                setRecoverRuntimeId("")
            } else {
                setExecuteStatus("paused")
            }
            if (executeStatus === "process") {
                setExecuteStatus("finished")
            }
            streamErrorRef.current = ""
        }, 300)
    })
    const onError = useMemoizedFn((error) => {
        streamErrorRef.current = error
        if (streamErrorRef.current !== "Cancelled on client") {
            setExecuteStatus("error")
        } else {
            setExecuteStatus("default")
            setStopLoading(false)
            onSaveSimpleDetect()
        }
    })
    const [simpleDetectStreamInfo, simpleDetectStreamEvent] = useHoldGRPCStream({
        tabs: defaultTabs,
        taskName: "SimpleDetect",
        apiKey: "SimpleDetect",
        token: tokenRef.current,
        onError: (error) => {
            // 报错最后也会触发onEnd
            onError(error)
        },
        onEnd: () => {
            console.log("simpleDetectStreamEvent-end")
            simpleDetectStreamEvent.stop()
            onEnd()
        },
        setRuntimeId: (rId) => {
            setRuntimeId(rId)
            if (runtimeId !== rId) {
                onUpdatePageInfo(rId)
            }
        }
    })

    const [recoverStreamInfo, recoverSimpleDetectStreamEvent] = useHoldGRPCStream({
        tabs: defaultTabs,
        taskName: "RecoverSimpleDetectTask",
        apiKey: "RecoverSimpleDetectTask",
        token: recoverTokenRef.current,
        onError: (error) => {
            // 报错最后也会触发onEnd
            onError(error)
        },
        onEnd: () => {
            recoverSimpleDetectStreamEvent.stop()
            onSaveSimpleDetect()
            onEnd()
        },
        setRuntimeId: (rId) => {
            setRuntimeId(rId)
        }
    })

    const streamInfo = useCreation(() => {
        if (isRecoverTask) {
            return recoverStreamInfo
        } else {
            return simpleDetectStreamInfo
        }
    }, [simpleDetectStreamInfo, recoverStreamInfo, isRecoverTask])

    useEffect(() => {
        // 继续任务 第一次进入该页面，不进行依赖scanDeep的更新逻辑
        // 继续任务开始后，再次点击停止的时候会清除页面中的 runtimeId ，后续可以进行依赖scanDeep的更新逻辑
        if (!!recoverRuntimeId) return
        switch (scanDeep) {
            // 快速
            case 3:
                setExtraParamsValue((v) => ({
                    ...v,
                    portScanParam: {
                        ...v.portScanParam,
                        Ports: PresetPorts["fast"],
                        presetPort: ["fast"],
                        ProbeMax: 1,
                        Concurrent: 100
                    }
                }))
                break
            // 适中
            case 2:
                setExtraParamsValue((v) => ({
                    ...v,
                    portScanParam: {
                        ...v.portScanParam,
                        Ports: PresetPorts["middle"],
                        presetPort: ["middle"],
                        ProbeMax: 3,
                        Concurrent: 80
                    }
                }))
                break
            // 慢速
            case 1:
                setExtraParamsValue((v) => ({
                    ...v,
                    portScanParam: {
                        ...v.portScanParam,
                        Ports: PresetPorts["slow"],
                        presetPort: ["slow"],
                        ProbeMax: 7,
                        Concurrent: 50
                    }
                }))
                break
        }
    }, [scanDeep])

    useEffect(() => {
        if (!isRecoverTask) return
        if (recoverRuntimeId) {
            // 继续任务打开的新页面，需要查询对应的数据和自动继续
            onContinueTask(recoverRuntimeId)
        }
        return () => {
            onRemovePageRuntimeId()
            onSaveSimpleDetect()
        }
    }, [])

    useEffect(() => {
        if (inViewport) {
            emiter.on("secondMenuTabDataChange", onSetTabName)
            emiter.on("updateTaskStatus", onUpdateTaskStatus)
        }
        return () => {
            emiter.off("secondMenuTabDataChange", onSetTabName)
            emiter.off("updateTaskStatus", onUpdateTaskStatus)
        }
    }, [inViewport])

    useEffect(() => {
        const simpleTab: SimpleTabInterface = {
            tabId: pageId,
            status: executeStatus
        }
        emiter.emit("simpleDetectTabEvent", JSON.stringify(simpleTab))
    }, [executeStatus])

    /**删除页面的 runtimeId */
    const onRemovePageRuntimeId = useMemoizedFn(() => {
        if (!pageId) return
        removePagesDataCacheById(YakitRoute.SimpleDetect, pageId)
    })

    const onUpdateTaskStatus = useMemoizedFn((res) => {
        if (executeStatus === "process") return
        try {
            const value = JSON.parse(res)
            const {runtimeId, pageId: pId} = value
            if (pageId !== pId) return
            if (!runtimeId) {
                yakitNotify("error", "未设置正常得 runtimeId")
                return
            }
            onRecoverSimpleDetectTask(runtimeId)
        } catch (error) {
            yakitNotify("error", `任务操作参数解析失败${error}`)
        }
    })
    /**继续任务，先查询再恢复 */
    const onContinueTask = useMemoizedFn((runtimeId: string) => {
        /**在查询任务详情的时候就认为是任务已经开始了,执行中 */
        setExecuteStatus("process")
        apiGetSimpleDetectRecordRequestById({RuntimeId: runtimeId}).then((data) => {
            const {LastRecord, PortScanRequest, StartBruteParams} = data
            if (!LastRecord) return
            try {
                const value = JSON.parse(LastRecord.ExtraInfo)
                const {simpleDetectValue = null} = value
                // simpleDetectValue 存在是新版，可以回显所有的前端页面上显示的数据
                if (!!simpleDetectValue) {
                    console.log("simpleDetectValue", simpleDetectValue)
                    const formValue: SimpleDetectForm = {
                        Targets: PortScanRequest.Targets,
                        ...simpleDetectValue.formValue
                    }
                    form.setFieldsValue({
                        ...formValue
                    })
                    setExtraParamsValue({
                        ...simpleDetectValue.extraParamsValue
                    })

                    simpleDetectValuePropsRef.current.formValue = {...formValue}
                    simpleDetectValuePropsRef.current.extraParamsValue = {...simpleDetectValue.extraParamsValue}

                    let taskNameTimeTarget: string = formValue?.Targets.split(/,|\r?\n/)[0] || "漏洞扫描任务"
                    const taskName = `${formValue.scanType || "基础扫描"}-${taskNameTimeTarget}`
                    taskNameRef.current = taskName
                }

                portScanRequestParamsRef.current = {...defPortScanExecuteExtraFormValue, ...PortScanRequest}
                startBruteParamsRef.current = {...defaultBruteExecuteExtraFormValue, ...StartBruteParams}
                onRecoverSimpleDetectTask(runtimeId)
            } catch (error) {
                yakitNotify("error", `继续任务onContinueTask失败:${error}`)
            }
        })
    })

    /**恢复任务 */
    const onRecoverSimpleDetectTask = useMemoizedFn((runtimeId: string) => {
        recoverSimpleDetectStreamEvent.reset()
        apiRecoverSimpleDetectTask({RuntimeId: runtimeId}, recoverTokenRef.current).then(() => {
            setExecuteStatus("process")
            setIsExpand(false)
            setIsRecoverTask(true)
            setRecoverRuntimeId(runtimeId)
            recoverSimpleDetectStreamEvent.start()
        })
    })
    /**更新该页面最新的runtimeId */
    const onUpdatePageInfo = useMemoizedFn((runtimeId: string) => {
        if (!pageId) return
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.SimpleDetect, pageId)
        if (!currentItem) return
        const newCurrentItem: PageNodeItemProps = {
            ...currentItem,
            pageParamsInfo: {
                simpleDetectPageInfo: {
                    ...defaultSimpleDetectPageInfo,
                    ...currentItem.pageParamsInfo.simpleDetectPageInfo,
                    runtimeId
                }
            }
        }
        updatePagesDataCacheById(YakitRoute.SimpleDetect, {...newCurrentItem})
    })

    const onSetTabName = useMemoizedFn(() => {
        setTabName(initSpaceEnginePageName())
    })

    const onExpand = useMemoizedFn(() => {
        setIsExpand(!isExpand)
    })
    /**继续 */
    const onContinue = useMemoizedFn((e) => {
        e.stopPropagation()
        onRecoverSimpleDetectTask(recoverRuntimeId)
    })

    const onStartExecute = useMemoizedFn((value: SimpleDetectForm) => {
        simpleDetectValuePropsRef.current.formValue = {...value}
        simpleDetectValuePropsRef.current.extraParamsValue = {...extraParamsValue}
        if (value.scanType === "专项扫描" && (value.pluginGroup?.length || 0) === 0) {
            warn("请选择专项扫描项目")
            return
        }
        let taskNameTimeTarget: string = value?.Targets.split(/,|\r?\n/)[0] || "漏洞扫描任务"
        const taskName = `${value.scanType}-${taskNameTimeTarget}`
        taskNameRef.current = taskName
        const pluginGroup = getPluginGroup(value.scanType, value.pluginGroup)
        const linkPluginConfig = getLinkPluginConfig(
            [],
            {
                search: cloneDeep(defaultSearch),
                filters: {
                    plugin_group: pluginGroup.map((ele) => ({value: ele, label: ele, count: 0}))
                }
            },
            true
        )
        let portScanRequestParams: PortScanExecuteExtraFormValue = {
            ...extraParamsValue.portScanParam,
            Mode: "all",
            Proto: ["tcp"],
            EnableBrute: !!value.pluginGroup?.includes("弱口令"),
            LinkPluginConfig: linkPluginConfig,
            Targets: value.Targets,
            SkippedHostAliveScan: !!value.SkippedHostAliveScan,
            TaskName: taskName
        }
        switch (value.scanDeep) {
            // 快速
            case 3:
                // SYN 并发
                portScanRequestParams.SynConcurrent = 2000
                break
            // 适中
            case 2:
                portScanRequestParams.SynConcurrent = 1000
                break
            // 慢速
            case 1:
                portScanRequestParams.SynConcurrent = 1000
                break
            default:
                break
        }
        const newStartBruteParams: StartBruteParams = {
            ...convertStartBruteParams(extraParamsValue.bruteExecuteParam)
        }
        const params: RecordPortScanRequest = {
            StartBruteParams: {
                ...newStartBruteParams
            },
            PortScanRequest: {...portScanRequestParams}
        }

        simpleDetectStreamEvent.reset()
        recoverSimpleDetectStreamEvent.reset()
        portScanRequestParamsRef.current = {...portScanRequestParams}
        startBruteParamsRef.current = {...newStartBruteParams}
        console.log("apiSimpleDetect", params)
        /**继续任务后，再次点击开始执行，开启新任务 */
        apiSimpleDetect(params, tokenRef.current).then(() => {
            setExecuteStatus("process")
            setIsExpand(false)
            setIsRecoverTask(false)
            simpleDetectStreamEvent.start()
        })
    })
    /*停止需要保存任务 */
    const onStopExecute = useMemoizedFn((e) => {
        e.stopPropagation()
        setStopLoading(true)
        if (!!recoverRuntimeId) {
            /**继续任务情况下,停止任务后需要清除当前页面中的runtimeId */
            apiCancelRecoverSimpleDetectTask(recoverTokenRef.current).then(() => {
                setExecuteStatus("paused")
            })
        } else {
            apiCancelSimpleDetect(tokenRef.current).then(() => {
                setRecoverRuntimeId(runtimeId)
                setExecuteStatus("paused")
            })
        }
    })
    /**
     * 保存任务
     * 1.关闭页面
     * 2.继续任务:停止/扫描完成,onError保存任务,onEnd更新最新数据
     * 3.新任务/继续任务:报错(onError,点击停止也会报错)
     */
    const onSaveSimpleDetect = useMemoizedFn(() => {
        return new Promise((resolve, reject) => {
            const saveTaskId = !!recoverRuntimeId ? recoverRuntimeId : runtimeId
            if (!startBruteParamsRef.current || !portScanRequestParamsRef.current || !saveTaskId) {
                reject("参数不全")
                return
            }
            const formValue = form.getFieldsValue()
            const filePtr = streamInfo.cardState.filter((item) => item.tag === "no display")
            let filePtrValue: number = 0
            if (Array.isArray(filePtr) && filePtr.length > 0) {
                const ptr = filePtr[0]?.info.find((ele) => ele.Id === "当前文件指针")?.Data || "0"
                filePtrValue = parseInt(ptr)
            }

            const pluginGroup = getPluginGroup(formValue.scanType, formValue.pluginGroup)

            const params: RecordPortScanRequest = {
                LastRecord: {
                    LastRecordPtr: Number.isNaN(filePtrValue) ? 0 : filePtrValue,
                    Percent: streamInfo.progressState.length > 0 ? streamInfo.progressState[0].progress : 0,
                    YakScriptOnlineGroup: pluginGroup,
                    ExtraInfo: JSON.stringify({
                        simpleDetectValue: simpleDetectValuePropsRef.current
                    })
                },
                StartBruteParams: startBruteParamsRef.current,
                PortScanRequest: portScanRequestParamsRef.current,
                RuntimeId: saveTaskId
            }
            apiSaveCancelSimpleDetect(params).then(resolve).catch(reject)
        })
    })

    const getPluginGroup = useMemoizedFn((scanType, pluginGroup) => {
        return scanType !== "专项扫描" ? ["基础扫描"] : pluginGroup || []
    })

    /**在顶部的执行按钮 */
    const onExecuteInTop = useMemoizedFn((e) => {
        e.stopPropagation()
        form.validateFields()
            .then(onStartExecute)
            .catch(() => {
                setIsExpand(true)
            })
    })
    const openExtraPropsDrawer = useMemoizedFn(() => {
        setExtraParamsValue({
            ...extraParamsValue,
            portScanParam: {
                ...extraParamsValue.portScanParam,
                SkippedHostAliveScan: form.getFieldValue("SkippedHostAliveScan")
            }
        })
        setExtraParamsVisible(true)
    })
    /**保存额外参数 */
    const onSaveExtraParams = useMemoizedFn((v: SimpleDetectExtraParam) => {
        setExtraParamsValue({...v} as SimpleDetectExtraParam)
        setExtraParamsVisible(false)
        form.setFieldsValue({
            SkippedHostAliveScan: !!v.portScanParam?.SkippedHostAliveScan
        })
    })
    const onImportPlugin = useMemoizedFn((e) => {
        e.stopPropagation()
        if (!userInfo.isLogin) {
            warn("插件需要先登录才能下载，请先登录")
            return
        }
        setVisibleOnline(true)
    })
    const onRemoveAllLocalPlugin = useMemoizedFn((e) => {
        e.stopPropagation()
        setRemoveLoading(true)
        apiDeleteLocalPluginsByWhere(defaultDeleteLocalPluginsByWhereRequest)
            .then(() => {
                setRefreshGroup(!refreshGroup)
            })
            .finally(() =>
                setTimeout(() => {
                    setRemoveLoading(false)
                }, 200)
            )
    })
    /**生成报告 */
    const onCreateReport = useMemoizedFn((e) => {
        e.stopPropagation()
        if (executeStatus === "default") return
        const params: CreateReportContentProps = {
            reportName: taskNameRef.current,
            runtimeId
        }
        onCreateReportModal(params)
    })
    const isExecuting = useCreation(() => {
        if (executeStatus === "process") return true
        if (executeStatus === "paused") return true
        return false
    }, [executeStatus, recoverRuntimeId])
    const isShowResult = useCreation(() => {
        return isExecuting || runtimeId
    }, [isExecuting, runtimeId])
    const progressList = useCreation(() => {
        return streamInfo.progressState || []
    }, [streamInfo])
    const disabledReport = useCreation(() => {
        switch (executeStatus) {
            case "finished":
                return false
            case "error":
                return false
            default:
                return true
        }
    }, [executeStatus])
    return (
        <>
            <div className={styles["simple-detect-wrapper"]} ref={simpleDetectWrapperRef}>
                <ExpandAndRetract
                    className={styles["simple-detect-heard"]}
                    onExpand={onExpand}
                    isExpand={isExpand}
                    status={executeStatus}
                >
                    <span className={styles["simple-detect-heard-tabName"]}>{tabName}</span>
                    <div className={styles["simple-detect-heard-operate"]}>
                        {progressList.length === 1 && (
                            <PluginExecuteProgress percent={progressList[0].progress} name={progressList[0].id} />
                        )}
                        {!isExecuting ? (
                            <>
                                <YakitPopconfirm
                                    title={"确定将插件商店所有数据导入到本地吗?"}
                                    onConfirm={onImportPlugin}
                                    onCancel={(e) => {
                                        if (e) e.stopPropagation()
                                    }}
                                    okText='Yes'
                                    cancelText='No'
                                    placement={"left"}
                                >
                                    <YakitButton
                                        type='text'
                                        onClick={(e) => {
                                            e.stopPropagation()
                                        }}
                                    >
                                        一键导入插件
                                    </YakitButton>
                                </YakitPopconfirm>
                                <YakitPopconfirm
                                    title={"确定将插件商店所有本地数据清除吗?"}
                                    onConfirm={onRemoveAllLocalPlugin}
                                    onCancel={(e) => {
                                        if (e) e.stopPropagation()
                                    }}
                                    okText='Yes'
                                    cancelText='No'
                                    placement={"left"}
                                >
                                    <YakitButton
                                        type='text'
                                        danger
                                        onClick={(e) => {
                                            e.stopPropagation()
                                        }}
                                        loading={removeLoading}
                                    >
                                        一键清除插件
                                    </YakitButton>
                                </YakitPopconfirm>
                            </>
                        ) : null}
                        <YakitButton
                            type='text'
                            onClick={(e) => {
                                e.stopPropagation()
                                setTaskListVisible(true)
                            }}
                        >
                            任务列表
                        </YakitButton>
                        <div className={styles["divider-style"]}></div>
                        <YakitButton
                            icon={<OutlineClipboardlistIcon />}
                            disabled={disabledReport}
                            onClick={onCreateReport}
                            style={{marginRight: 8}}
                        >
                            生成报告
                        </YakitButton>
                        {isExecuting
                            ? !isExpand && (
                                  <>
                                      {executeStatus === "paused" && !stopLoading ? (
                                          <YakitButton onClick={onContinue}>继续</YakitButton>
                                      ) : (
                                          <YakitButton danger loading={stopLoading} onClick={onStopExecute}>
                                              停止
                                          </YakitButton>
                                      )}
                                  </>
                              )
                            : !isExpand && (
                                  <>
                                      <YakitButton onClick={onExecuteInTop}>执行</YakitButton>
                                  </>
                              )}
                    </div>
                </ExpandAndRetract>
                <div className={styles["simple-detect-content"]}>
                    <div
                        className={classNames(styles["simple-detect-form-wrapper"], {
                            [styles["simple-detect-form-wrapper-hidden"]]: !isExpand
                        })}
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
                            <SimpleDetectFormContent
                                disabled={isExecuting}
                                inViewport={inViewport}
                                form={form}
                                refreshGroup={refreshGroup}
                            />
                            <Form.Item colon={false} label={" "} style={{marginBottom: 0}}>
                                <div className={styles["simple-detect-form-operate"]}>
                                    {isExecuting ? (
                                        <>
                                            {executeStatus === "paused" && !stopLoading ? (
                                                <YakitButton size='large' onClick={onContinue}>
                                                    继续
                                                </YakitButton>
                                            ) : (
                                                <YakitButton
                                                    danger
                                                    onClick={onStopExecute}
                                                    size='large'
                                                    loading={stopLoading}
                                                >
                                                    停止
                                                </YakitButton>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <YakitButton
                                                className={styles["simple-detect-form-operate-start"]}
                                                htmlType='submit'
                                                size='large'
                                            >
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
                        <PluginExecuteResult streamInfo={streamInfo} runtimeId={runtimeId} loading={isExecuting} />
                    )}
                </div>
            </div>
            <React.Suspense fallback={<div>loading...</div>}>
                <SimpleDetectExtraParamsDrawer
                    extraParamsValue={extraParamsValue}
                    visible={extraParamsVisible}
                    onSave={onSaveExtraParams}
                />
                <SimpleDetectTaskListDrawer visible={taskListVisible} setVisible={setTaskListVisible} />
            </React.Suspense>
            {visibleOnline && (
                <YakitGetOnlinePlugin
                    visible={visibleOnline}
                    setVisible={(v) => {
                        setVisibleOnline(v)
                        setRefreshGroup(!refreshGroup)
                    }}
                />
            )}
        </>
    )
})

const ScanTypeOptions = [
    {
        value: "基础扫描",
        label: "基础扫描"
    },
    {
        value: "专项扫描",
        label: "专项扫描"
    }
]
const marks: SliderMarks = {
    1: {
        label: <div>慢速</div>
    },
    2: {
        label: <div>适中</div>
    },
    3: {
        label: <div>快速</div>
    }
}
const SimpleDetectFormContent: React.FC<SimpleDetectFormContentProps> = React.memo((props) => {
    const {disabled, inViewport, form, refreshGroup} = props
    const [groupOptions, setGroupOptions] = useState<string[]>([])
    const scanType = Form.useWatch("scanType", form)
    useEffect(() => {
        if (inViewport) getPluginGroup()
    }, [inViewport, refreshGroup])
    const scanTypeExtra = useCreation(() => {
        let str: string = ""
        switch (scanType) {
            case "基础扫描":
                str = "包含合规检测、小字典弱口令检测与部分漏洞检测"
                break
            case "专项扫描":
                str = "针对不同场景的专项漏洞检测扫描"
                break
        }
        return str
    }, [scanType])
    const getPluginGroup = useMemoizedFn(() => {
        apiFetchQueryYakScriptGroupLocal(false).then((group: GroupCount[]) => {
            const newGroup: string[] = group
                .map((item) => item.Value)
                .filter((item) => item !== "基础扫描")
                .concat("弱口令")
            setGroupOptions([...new Set(newGroup)])
        })
    })
    return (
        <>
            <YakitFormDraggerContent
                formItemProps={{
                    name: "Targets",
                    label: "扫描目标",
                    rules: [{required: true}]
                }}
                accept='.txt,.xlsx,.xls,.csv'
                textareaProps={{
                    placeholder: "域名/主机/IP/IP段均可，逗号分隔或按行分割",
                    rows: 3
                }}
                help='可将TXT、Excel文件拖入框内或'
                disabled={disabled}
            />
            <Form.Item
                label='扫描模式'
                name='scanType'
                initialValue='基础扫描'
                extra={
                    <>
                        {scanTypeExtra}
                        {scanType === "专项扫描" && (
                            <Form.Item noStyle name='pluginGroup' initialValue={["弱口令"]}>
                                <Checkbox.Group className={styles["plugin-group-wrapper"]} disabled={disabled}>
                                    {groupOptions.map((ele) => (
                                        <YakitCheckbox key={ele} value={ele}>
                                            {ele}
                                        </YakitCheckbox>
                                    ))}
                                </Checkbox.Group>
                            </Form.Item>
                        )}
                    </>
                }
            >
                <YakitRadioButtons buttonStyle='solid' options={ScanTypeOptions} disabled={disabled} />
            </Form.Item>
            <Form.Item
                name='scanDeep'
                label='扫描速度'
                extra='扫描速度越慢，扫描结果就越详细，可根据实际情况进行选择'
                initialValue={defaultScanDeep}
            >
                <Slider tipFormatter={null} min={1} max={3} marks={marks} disabled={disabled} />
            </Form.Item>
            <Form.Item label={" "} colon={false}>
                <div className={styles["form-extra"]}>
                    <Form.Item name='SkippedHostAliveScan' valuePropName='checked' noStyle>
                        <YakitCheckbox disabled={disabled}>跳过主机存活检测</YakitCheckbox>
                    </Form.Item>
                </div>
            </Form.Item>
        </>
    )
})

interface DownloadAllPluginProps {
    setDownloadPlugin?: (v: boolean) => void
    onClose?: () => void
}

export const DownloadAllPlugin: React.FC<DownloadAllPluginProps> = (props) => {
    const {setDownloadPlugin, onClose} = props
    // 全局登录状态
    const {userInfo} = useStore()
    // 全部添加进度条
    const [addLoading, setAddLoading] = useState<boolean>(false)
    // 全部添加进度
    const [percent, setPercent] = useState<number>(0)
    const [taskToken, setTaskToken] = useState(randomString(40))
    useEffect(() => {
        if (!taskToken) {
            return
        }
        ipcRenderer.on(`${taskToken}-data`, (_, data: DownloadOnlinePluginAllResProps) => {
            const p = Math.floor(data.Progress * 100)
            setPercent(p)
        })
        ipcRenderer.on(`${taskToken}-end`, () => {
            setTimeout(() => {
                setPercent(0)
                setDownloadPlugin && setDownloadPlugin(false)
                onClose && onClose()
            }, 500)
        })
        ipcRenderer.on(`${taskToken}-error`, (_, e) => {})
        return () => {
            ipcRenderer.removeAllListeners(`${taskToken}-data`)
            ipcRenderer.removeAllListeners(`${taskToken}-error`)
            ipcRenderer.removeAllListeners(`${taskToken}-end`)
        }
    }, [taskToken])
    const AddAllPlugin = useMemoizedFn(() => {
        if (!userInfo.isLogin) {
            warn("插件需要先登录才能下载，请先登录")
            return
        }
        // 全部添加
        setAddLoading(true)
        setDownloadPlugin && setDownloadPlugin(true)
        const addParams: DownloadOnlinePluginsRequest = {ListType: ""}
        ipcRenderer
            .invoke("DownloadOnlinePlugins", addParams, taskToken)
            .then(() => {})
            .catch((e) => {
                failed(`添加失败:${e}`)
            })
    })
    const StopAllPlugin = () => {
        onClose && onClose()
        setAddLoading(false)
        ipcRenderer.invoke("cancel-DownloadOnlinePlugins", taskToken).catch((e) => {
            failed(`停止添加失败:${e}`)
        })
    }
    return (
        <div className={styles["download-all-plugin-modal"]}>
            {addLoading ? (
                <div>
                    <div>下载进度</div>
                    <div className={styles["filter-opt-progress-modal"]}>
                        <Progress
                            size='small'
                            status={!addLoading && percent !== 0 ? "exception" : undefined}
                            percent={percent}
                        />
                    </div>
                    <div style={{textAlign: "center", marginTop: 10}}>
                        <YakitButton type='primary' onClick={StopAllPlugin}>
                            取消
                        </YakitButton>
                    </div>
                </div>
            ) : (
                <div>
                    <div>检测到本地未下载任何插件，无法进行安全检测，请点击“一键导入”进行插件下载</div>
                    <div style={{textAlign: "center", marginTop: 10}}>
                        <YakitButton type='primary' onClick={AddAllPlugin}>
                            一键导入
                        </YakitButton>
                    </div>
                </div>
            )}
        </div>
    )
}
