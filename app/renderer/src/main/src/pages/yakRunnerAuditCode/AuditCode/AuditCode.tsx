import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {
    AuditCodeProps,
    AuditNodeDetailProps,
    AuditNodeProps,
    AuditTreeNodeProps,
    AuditTreeProps,
    AuditYakUrlProps
} from "./AuditCodeType"
import classNames from "classnames"
import styles from "./AuditCode.module.scss"
import {YakScript} from "@/pages/invoker/schema"
import {Divider, Form, FormInstance, Progress, Tooltip, Tree} from "antd"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {ExtraParamsNodeByType} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/PluginExecuteExtraParams"
import {ExecuteEnterNodeByPluginParams} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {YakParamProps} from "@/pages/plugins/pluginsType"
import {
    getValueByType,
    getYakExecutorParam,
    onCodeToInfo,
    ParamsToGroupByGroupName
} from "@/pages/plugins/editDetails/utils"
import {
    useDebounceFn,
    useInterval,
    useInViewport,
    useMemoizedFn,
    useSize,
    useThrottleEffect,
    useUpdateEffect
} from "ahooks"
import {grpcFetchLocalPluginDetail} from "@/pages/pluginHub/utils/grpc"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {apiDebugPlugin, DebugPluginRequest} from "@/pages/plugins/utils"
import {HTTPRequestBuilderParams} from "@/models/HTTPRequestBuilder"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {failed, warn, yakitNotify} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {CustomPluginExecuteFormValue} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType"
import {defPluginExecuteFormValue} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/constants"
import useStore from "../hooks/useStore"
import {getNameByPath, grpcFetchAuditTree, grpcFetchDeleteAudit, loadAuditFromYakURLRaw} from "../utils"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {
    OutlinCompileIcon,
    OutlineArrowcirclerightIcon,
    OutlineBugIcon,
    OutlineChevronrightIcon,
    OutlineDeprecatedIcon,
    OutlineScanIcon,
    OutlineSearchIcon,
    OutlineTrashIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import emiter from "@/utils/eventBus/eventBus"
import {LoadingOutlined} from "@ant-design/icons"
import {StringToUint8Array} from "@/utils/str"
import {clearMapAuditDetail, getMapAuditDetail, setMapAuditDetail} from "./AuditTree/AuditMap"
import {clearMapAuditChildDetail, getMapAuditChildDetail, setMapAuditChildDetail} from "./AuditTree/ChildMap"
import {
    SolidExclamationIcon,
    SolidInformationcircleIcon,
    SolidPluscircleIcon,
    SolidXcircleIcon
} from "@/assets/icon/solid"
import {AuditCodeStreamData, AuditEmiterYakUrlProps, OpenFileByPathProps} from "../YakRunnerAuditCodeType"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {RequestYakURLResponse, YakURLResource} from "@/pages/yakURLTree/data"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {CodeRangeProps} from "../RightAuditDetail/RightAuditDetail"
import {formatTimestamp} from "@/utils/timeUtil"
import {QuestionMarkCircleIcon, TrashIcon} from "@/assets/newIcon"
import {addToTab} from "@/pages/MainTabs"
import {YakitRoute} from "@/enums/yakitRoute"
import {AuditCodePageInfoProps} from "@/store/pageInfo"
import {apiFetchQuerySyntaxFlowResult} from "@/pages/yakRunnerCodeScan/utils"
import {QuerySyntaxFlowResultResponse} from "@/pages/yakRunnerCodeScan/YakRunnerCodeScanType"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {AuditCodeStatusInfo} from "../YakRunnerAuditCode"
import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {JumpToEditorProps} from "../BottomEditorDetails/BottomEditorDetailsType"
import {YakitVirtualList} from "@/components/yakitUI/YakitVirtualList/YakitVirtualList"
import {VirtualListColumns} from "@/components/yakitUI/YakitVirtualList/YakitVirtualListType"
import {YakitFormDragger} from "@/components/yakitUI/YakitForm/YakitForm"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {PluginExecuteLog} from "@/pages/plugins/operator/pluginExecuteResult/PluginExecuteResult"
import useDispatcher from "../hooks/useDispatcher"

const {ipcRenderer} = window.require("electron")

export const isBugFun = (info: AuditNodeProps) => {
    try {
        const arr = info.Extra.filter((item) => item.Key === "risk_hash")
        if (info.ResourceType === "variable" && info.VerboseType === "alert" && arr.length > 0) return true
        return false
    } catch (error) {
        return false
    }
}

export const getDetailFun = (info: AuditNodeProps) => {
    try {
        if (info.ResourceType === "value") {
            const arr = info.Extra.filter((item) => item.Key === "code_range")
            if (arr.length > 0) {
                const item: CodeRangeProps = JSON.parse(arr[0].Value)
                const {url, start_line, start_column, end_line, end_column} = item
                const lastSlashIndex = url.lastIndexOf("/")
                const fileName = url.substring(lastSlashIndex + 1)
                return {
                    fileName,
                    start_line,
                    url
                }
            }
        }
        return undefined
    } catch (error) {}
}

export const AuditTreeNode: React.FC<AuditTreeNodeProps> = memo((props) => {
    const {info, foucsedKey, setFoucsedKey, onSelected, onExpanded, expandedKeys, onJump, bugId} = props
    const handleSelect = useMemoizedFn(() => {
        onSelected(true, info, getDetail)
    })

    const isExpanded = useMemo(() => {
        return expandedKeys.includes(info.id)
    }, [expandedKeys, info.id])

    const handleExpand = useMemoizedFn(() => {
        onExpanded(isExpanded, info)
    })

    const handleClick = useMemoizedFn(() => {
        if (info.isLeaf) {
            handleSelect()
        } else {
            handleExpand()
        }
    })

    const isFoucsed = useMemo(() => {
        return foucsedKey === info.id
    }, [foucsedKey, info.id])

    const showIcon = useMemoizedFn((severity) => {
        switch (severity) {
            case "hint":
                return (
                    <div className={classNames(styles["hint-icon"], styles["icon-box"])}>
                        <OutlineDeprecatedIcon />
                    </div>
                )
            case "info":
                return (
                    <div className={classNames(styles["info-icon"], styles["icon-box"])}>
                        <SolidInformationcircleIcon />
                    </div>
                )
            case "warning":
                return (
                    <div className={classNames(styles["warn-icon"], styles["icon-box"])}>
                        <SolidExclamationIcon />
                    </div>
                )
            case "error":
                return (
                    <div className={classNames(styles["error-icon"], styles["icon-box"])}>
                        <SolidXcircleIcon />
                    </div>
                )

            default:
                return <></>
        }
    })

    // 获取详情
    const getDetail = useMemo(() => {
        return getDetailFun(info)
    }, [info])

    const goBUGDetail = useMemoizedFn((e) => {
        e.stopPropagation()
        onJump(info)
    })
    return (
        <>
            {info.isBottom ? (
                <div className={styles["tree-bottom"]}>{info.name}</div>
            ) : (
                <div
                    className={classNames(styles["audit-tree-node"], {
                        [styles["node-foucsed"]]: isFoucsed
                    })}
                    style={{paddingLeft: (info.depth - 1) * 16 + 8}}
                    onClick={handleClick}
                >
                    {!info.isLeaf && (
                        <div className={classNames(styles["node-switcher"], {[styles["expanded"]]: isExpanded})}>
                            <OutlineChevronrightIcon />
                        </div>
                    )}
                    {info.ResourceType === "message" && showIcon(info.VerboseType)}

                    <div className={styles["node-loading"]}>
                        <LoadingOutlined />
                    </div>

                    <div className={styles["node-content"]}>
                        <div className={classNames(styles["content-body"])}>
                            <div className={classNames(styles["name"], "yakit-content-single-ellipsis")}>
                                {info.name}
                            </div>

                            {getDetail && (
                                <Tooltip title={`${getDetail.url}:${getDetail.start_line}`}>
                                    <div
                                        className={classNames(styles["detail"], "yakit-content-single-ellipsis")}
                                    >{`${getDetail.fileName}:${getDetail.start_line}`}</div>
                                </Tooltip>
                            )}
                        </div>
                        {isBugFun(info) && (
                            <div
                                className={classNames(styles["bug"], {
                                    [styles["active-bug"]]: bugId === info.id
                                })}
                                onClick={goBUGDetail}
                            >
                                <OutlineBugIcon />
                            </div>
                        )}
                        {info.ResourceType === "variable" && <div className={styles["count"]}>{info.Size}</div>}
                    </div>
                </div>
            )}
        </>
    )
})

export const AuditTree: React.FC<AuditTreeProps> = memo((props) => {
    const {
        data,
        expandedKeys,
        setExpandedKeys,
        onLoadData,
        foucsedKey,
        setFoucsedKey,
        onJump,
        onlyJump,
        wrapClassName,
        bugId
    } = props
    const {pageInfo} = useStore()
    const treeRef = useRef<any>(null)
    const wrapper = useRef<HTMLDivElement>(null)
    const [inViewport] = useInViewport(wrapper)
    const size = useSize(wrapper)

    const defaultOpenIdRef = useRef<string>()
    useEffect(() => {
        if (pageInfo) {
            const {Path, Variable, Value} = pageInfo
            // && info.id === pageInfo
            if (Variable && Value) {
                defaultOpenIdRef.current = `${Path}${Variable}${Value}`
            }
        }
    }, [pageInfo])

    const handleSelect = useMemoizedFn((selected: boolean, node: AuditNodeProps, detail?: AuditNodeDetailProps) => {
        if (onlyJump) {
            onJump(node)
            return
        }
        if (detail?.url) {
            emiter.emit("onCodeAuditScrollToFileTree", detail?.url)
        }
        setFoucsedKey(node.id)
        onJump(node)
        onContext(node)
    })

    const handleExpand = useMemoizedFn((expanded: boolean, node: AuditNodeProps) => {
        let arr = [...expandedKeys]
        if (expanded) {
            arr = arr.filter((item) => item !== node.id)
        } else {
            arr = [...arr, node.id]
        }
        setFoucsedKey(node.id)
        setExpandedKeys([...arr])
    })

    const onContext = useMemoizedFn(async (data: AuditNodeProps) => {
        try {
            const arr = data.Extra.filter((item) => item.Key === "code_range")
            if (arr.length > 0) {
                const item: CodeRangeProps = JSON.parse(arr[0].Value)
                const {url, start_line, start_column, end_line, end_column} = item
                const name = await getNameByPath(url)
                // console.log("monaca跳转", item, name)
                const highLightRange = {
                    startLineNumber: start_line,
                    startColumn: start_column,
                    endLineNumber: end_line,
                    endColumn: end_column
                }
                const OpenFileByPathParams: OpenFileByPathProps = {
                    params: {
                        path: url,
                        name,
                        highLightRange
                    }
                }
                emiter.emit("onCodeAuditOpenFileByPath", JSON.stringify(OpenFileByPathParams))
                // 纯跳转行号
                setTimeout(() => {
                    const obj: JumpToEditorProps = {
                        selections: highLightRange,
                        id: url,
                        isSelect: false
                    }
                    emiter.emit("onCodeAuditJumpEditorDetail", JSON.stringify(obj))
                }, 100)
            }
        } catch (error) {}
    })

    return (
        <div ref={wrapper} className={classNames(styles["audit-tree"], wrapClassName)}>
            <Tree
                ref={treeRef}
                height={size?.height}
                fieldNames={{title: "name", key: "id", children: "children"}}
                treeData={data}
                blockNode={true}
                switcherIcon={<></>}
                // multiple={true}
                expandedKeys={expandedKeys}
                loadData={onLoadData}
                // 解决重复打开一个节点时 能加载
                loadedKeys={[]}
                titleRender={(nodeData) => {
                    if (nodeData.id === defaultOpenIdRef.current) {
                        defaultOpenIdRef.current = undefined
                        handleSelect(true, nodeData, getDetailFun(nodeData))
                    }
                    return (
                        <AuditTreeNode
                            info={nodeData}
                            foucsedKey={foucsedKey}
                            expandedKeys={expandedKeys}
                            onSelected={handleSelect}
                            onExpanded={handleExpand}
                            setFoucsedKey={setFoucsedKey}
                            onJump={onJump}
                            bugId={bugId}
                        />
                    )
                }}
            />
        </div>
    )
})

const TopId = "top-message"

export const AuditCode: React.FC<AuditCodeProps> = (props) => {
    const {setOnlyFileTree} = props
    const {projectName, pageInfo, auditRule, auditExecuting} = useStore()
    const {setAuditExecuting} = useDispatcher()

    const [loading, setLoading] = useState<boolean>(false)
    const [isShowEmpty, setShowEmpty] = useState<boolean>(false)
    const [expandedKeys, setExpandedKeys] = React.useState<string[]>([])
    const [foucsedKey, setFoucsedKey] = React.useState<string>("")
    const [refreshTree, setRefreshTree] = useState<boolean>(false)
    // 已审计的参数Query用于加载更多时使用
    const runQueryRef = useRef<
        {
            Key: string
            Value: number
        }[]
    >()

    const initAuditTree = useMemoizedFn((ids: string[], depth: number) => {
        return ids.map((id) => {
            const itemDetail = getMapAuditDetail(id)
            let obj: AuditNodeProps = {...itemDetail, depth, query: runQueryRef.current}
            const childArr = getMapAuditChildDetail(id)

            if (itemDetail.ResourceType === "variable" || itemDetail.ResourceType === TopId) {
                obj.children = initAuditTree(childArr, depth + 1)
                // 数量为0时不展开 message除外
                if (parseInt(obj.Size + "") === 0 && itemDetail.ResourceType !== TopId) {
                    obj.isLeaf = true
                } else {
                    obj.isLeaf = false
                }
            } else {
                obj.isLeaf = true
            }

            return obj
        })
    })

    const auditDetailTree = useMemo(() => {
        const ids: string[] = getMapAuditChildDetail("/")
        const initTree = initAuditTree(ids, 1)
        // 归类排序
        const initTreeLeaf = initTree.filter((item) => item.isLeaf)
        const initTreeNoLeaf = initTree.filter((item) => !item.isLeaf)
        const newInitTree = [...initTreeNoLeaf, ...initTreeLeaf]
        newInitTree.push({
            parent: null,
            name: "已经到底啦~",
            id: "111",
            depth: 1,
            isBottom: true,
            Extra: [],
            ResourceType: "",
            VerboseType: "",
            Size: 0
        })
        return newInitTree
    }, [refreshTree])

    const lastValue = useRef<string>("")
    const handleAuditLoadData = useMemoizedFn((id: string) => {
        return new Promise(async (resolve, reject) => {
            // 校验其子项是否存在
            const childArr = getMapAuditChildDetail(id)
            if (id === TopId) {
                resolve("")
                return
            }
            if (childArr.length > 0) {
                setRefreshTree(!refreshTree)
                resolve("")
            } else {
                const path = id
                let params: AuditYakUrlProps = {
                    Schema: "syntaxflow",
                    Location: projectName || "",
                    Path: path
                }
                const body: Buffer = StringToUint8Array(lastValue.current)
                if (pageInfo) {
                    const {Variable, Value, ...rest} = pageInfo
                    params = {
                        ...rest,
                        Path: path
                    }
                }
                // 沿用审计时的Query值
                params.Query = runQueryRef.current
                console.log("loadmore---", params, body)

                const result = await loadAuditFromYakURLRaw(params, body)

                if (result) {
                    let variableIds: string[] = []
                    result.Resources.filter((item) => item.VerboseType !== "result_id").forEach((item, index) => {
                        const {ResourceType, VerboseType, VerboseName, ResourceName, Size, Extra} = item
                        let value: string = `${index}`
                        const arr = Extra.filter((item) => item.Key === "index")
                        if (arr.length > 0) {
                            value = arr[0].Value
                        }
                        const newId = `${id}/${value}`
                        variableIds.push(newId)
                        setMapAuditDetail(newId, {
                            parent: path,
                            id: newId,
                            name: ResourceName,
                            ResourceType,
                            VerboseType,
                            Size,
                            Extra
                        })
                    })
                    setMapAuditChildDetail(path, variableIds)
                    setTimeout(() => {
                        setRefreshTree(!refreshTree)
                        resolve("")
                    }, 300)
                } else {
                    reject()
                }
            }
        })
    })

    const onLoadData = useMemoizedFn((node: AuditNodeProps) => {
        if (node.parent === null) return Promise.reject()
        if (handleAuditLoadData) return handleAuditLoadData(node.id)
        return Promise.reject()
    })

    const resetMap = useMemoizedFn(() => {
        // 清除上次数据
        clearMapAuditChildDetail()
        clearMapAuditDetail()
        setExpandedKeys([])
    })

    useUpdateEffect(() => {
        resetMap()
        setRefreshTree(!refreshTree)
    }, [projectName])

    const onAuditRuleSubmitFun = useMemoizedFn(
        async (textArea: string = "", Query?: {Key: string; Value: number}[]) => {
            try {
                resetMap()
                setLoading(true)
                setShowEmpty(false)
                setOnlyFileTree(false)
                const path: string = "/"
                let params: AuditYakUrlProps = {
                    Schema: "syntaxflow",
                    Location: projectName || "",
                    Path: path
                }
                const body: Buffer = StringToUint8Array(textArea)
                lastValue.current = textArea
                if (pageInfo) {
                    const {Variable, Value, ...rest} = pageInfo
                    // 此处请求Path固定为/ 因为不用拼接Variable、Value
                    params = rest
                    // 默认展开项
                    if (Variable) {
                        setExpandedKeys([`${pageInfo.Path}${Variable}`])
                    }
                }
                // 如若已输入代码审计框
                if (auditRule && (params?.Query || []).length > 0) {
                    params.Query = []
                }
                if (Query) {
                    params.Query = Query
                }
                runQueryRef.current = params.Query
                console.log("loadAuditFromYakURLRaw", params, textArea)
                const result = await loadAuditFromYakURLRaw(params, body)
                if (result && result.Resources.length > 0) {
                    let messageIds: string[] = []
                    let variableIds: string[] = []
                    // 构造树结构
                    result.Resources.filter((item) => item.VerboseType !== "result_id").forEach((item, index) => {
                        const {ResourceType, VerboseType, VerboseName, ResourceName, Size, Extra} = item
                        // 警告信息（置顶显示）前端收集折叠
                        if (ResourceType === "message") {
                            const id = `${TopId}${path}${VerboseName}-${index}`
                            messageIds.push(id)
                            setMapAuditDetail(id, {
                                parent: path,
                                id,
                                name: VerboseName,
                                ResourceType,
                                VerboseType,
                                Size,
                                Extra
                            })
                        }
                        // 变量
                        if (ResourceType === "variable") {
                            const id = `${path}${ResourceName}`
                            variableIds.push(id)
                            setMapAuditDetail(id, {
                                parent: path,
                                id,
                                name: ResourceName,
                                ResourceType,
                                VerboseType,
                                Size,
                                Extra
                            })
                        }
                    })
                    let topIds: string[] = []
                    if (messageIds.length > 0) {
                        topIds.push(TopId)
                        setMapAuditDetail(TopId, {
                            parent: path,
                            id: TopId,
                            name: "message",
                            ResourceType: TopId,
                            VerboseType: "",
                            Size: 0,
                            Extra: []
                        })
                        setMapAuditChildDetail(TopId, messageIds)
                    }
                    setMapAuditChildDetail("/", [...topIds, ...variableIds])
                    setRefreshTree(!refreshTree)
                } else {
                    setShowEmpty(true)
                }
                setLoading(false)
            } catch (error: any) {
                failed(`${error}`)
                setShowEmpty(true)
                setLoading(false)
            }
        }
    )

    const tokenRef = useRef<string>(randomString(40))
    /** 是否在执行中 */
    const [runtimeId, setRuntimeId] = useState<string>("")
    const logInfoRef = useRef<StreamResult.Log[]>([])
    const progressRef = useRef<number>(0)
    const [resultInfo, setResultInfo] = useState<{progress: number; logState: StreamResult.Log[]}>()
    const [interval, setInterval] = useState<number | undefined>()
    const [streamInfo, debugPluginStreamEvent] = useHoldGRPCStream({
        taskName: "debug-plugin",
        apiKey: "DebugPlugin",
        token: tokenRef.current,
        onEnd: () => {
            debugPluginStreamEvent.stop()
            setAuditExecuting && setAuditExecuting(false)
            setTimeout(() => {
                setInterval(undefined)
            }, 500)
        },
        onError: () => {},
        setRuntimeId: (rId) => {
            yakitNotify("info", `调试任务启动成功，运行时 ID: ${rId}`)
            setRuntimeId(rId)
        }
    })

    useEffect(() => {
        const progress = Math.floor((streamInfo.progressState.map((item) => item.progress)[0] || 0) * 100) / 100
        progressRef.current = progress
        logInfoRef.current = streamInfo.logState.slice(0, 8)
        // 当任务结束时
        if (streamInfo.logState[0]?.level === "json") {
            onCancelAuditStream()
            onAuditRuleSubmitFun("", [{Key: "result_id", Value: streamInfo.logState[0].data}])
            return
        }
    }, [streamInfo])

    useInterval(
        () => {
            setResultInfo({
                progress: progressRef.current,
                logState: logInfoRef.current
            })
        },
        interval,
        {
            immediate: true
        }
    )

    // 流式审计 PS:流式审计成功后，根据result_id走正常结构查询
    const onAuditStreamRuleSubmitFun = useMemoizedFn(async (textArea: string = "") => {
        if (!textArea) {
            warn("请输入规则")
            return
        }
        logInfoRef.current = []
        progressRef.current = 0
        debugPluginStreamEvent.reset()
        setRuntimeId("")
        const requestParams: DebugPluginRequest = {
            Code: "",
            PluginType: "yak",
            Input: "",
            HTTPRequestTemplate: {} as HTTPRequestBuilderParams,
            ExecParams: [
                {
                    Key: "programName",
                    Value: projectName || ""
                },
                {
                    Key: "ruleContext",
                    Value: textArea
                }
            ],
            PluginName: "SyntaxFlow 规则执行"
        }
        console.log("requestParams---", requestParams)

        apiDebugPlugin({params: requestParams, token: tokenRef.current})
            .then(() => {
                setAuditExecuting && setAuditExecuting(true)
                setOnlyFileTree(false)
                debugPluginStreamEvent.start()
                setInterval(500)
            })
            .catch(() => {
                onAuditRuleSubmitFun(textArea)
            })
    })

    const onCancelAuditStream = () => {
        debugPluginStreamEvent.cancel()
        debugPluginStreamEvent.reset()
    }

    // 停止
    const onStopAuditRuleFun = useMemoizedFn(() => {
        onCancelAuditStream()
    })

    useEffect(() => {
        emiter.on("onAuditRuleSubmit", onAuditStreamRuleSubmitFun)
        emiter.on("onStopAuditRule", onStopAuditRuleFun)
        return () => {
            emiter.off("onAuditRuleSubmit", onAuditStreamRuleSubmitFun)
            emiter.off("onStopAuditRule", onStopAuditRuleFun)
        }
    }, [])

    useEffect(() => {
        if (pageInfo?.Query) {
            // 页面跳转时，自动执行 无需流式审计
            onAuditRuleSubmitFun()
        } else {
            resetMap()
            setRefreshTree(!refreshTree)
        }
    }, [pageInfo])

    const [bugId, setBugId] = useState<string>()
    const onJump = useMemoizedFn((node: AuditNodeProps) => {
        // 预留打开BUG详情
        if (node.ResourceType === "variable" && node.VerboseType === "alert") {
            try {
                const arr = node.Extra.filter((item) => item.Key === "risk_hash")
                if (arr.length > 0) {
                    const hash = arr[0].Value
                    setBugId(node.id)
                    emiter.emit("onCodeAuditOpenBugDetail", hash)
                    emiter.emit("onCodeAuditOpenBottomDetail", JSON.stringify({type: "holeDetail"}))
                }
            } catch (error) {
                failed(`打开错误${error}`)
            }
        }
        if (node.ResourceType === "value") {
            setBugId(undefined)
            let rightParams: AuditEmiterYakUrlProps = {
                Schema: "syntaxflow",
                Location: projectName || "",
                Path: node.id,
                Body: auditRule
            }
            if (pageInfo) {
                const {...rest} = pageInfo
                rightParams = {
                    ...rest,
                    Path: node.id
                }
            }
            if(node.query){
                rightParams.Query = node.query
            }
            emiter.emit("onCodeAuditOpenRightDetail", JSON.stringify(rightParams))
        }
    })

    return (
        <YakitSpin spinning={loading}>
            <div className={styles["audit-code"]}>
                <div className={styles["header"]}>
                    <div className={styles["title"]}>代码审计</div>
                    {auditExecuting && (
                        <div className={styles["extra"]}>
                            <Progress
                                strokeColor='#F28B44'
                                trailColor='#F0F2F5'
                                percent={Math.floor((resultInfo?.progress || 0) * 100)}
                            />
                        </div>
                    )}
                </div>
                {isShowEmpty ? (
                    <div className={styles["no-data"]}>暂无数据</div>
                ) : (
                    <>
                        {auditExecuting ? (
                            <div className={styles["audit-log"]}>
                                <PluginExecuteLog
                                    loading={auditExecuting}
                                    messageList={resultInfo?.logState || []}
                                    wrapperClassName={styles["audit-log-wrapper"]}
                                />
                            </div>
                        ) : (
                            <AuditTree
                                data={auditDetailTree}
                                expandedKeys={expandedKeys}
                                setExpandedKeys={setExpandedKeys}
                                onLoadData={onLoadData}
                                foucsedKey={foucsedKey}
                                setFoucsedKey={setFoucsedKey}
                                onJump={onJump}
                                bugId={bugId}
                            />
                        )}
                    </>
                )}
            </div>
        </YakitSpin>
    )
}

interface AuditMainItemFormProps {}
// 审计表单主要项内容
export const AuditMainItemForm: React.FC<AuditMainItemFormProps> = (props) => {
    const [type, setType] = useState<string>("local")
    return (
        <div className={styles["audit-main-item-form"]}>
            <Form.Item
                label={"项目类型"}
                name='type'
                rules={[{required: true, message: "请选择项目类型"}]}
                initialValue='local'
            >
                <YakitSelect
                    onChange={(value) => {
                        setType(value)
                    }}
                >
                    <YakitSelect.Option value='local'>本地文件</YakitSelect.Option>
                    <YakitSelect.Option value='Yaklang'>压缩包</YakitSelect.Option>
                    <YakitSelect.Option value='git/svn'>Git/SVN仓库</YakitSelect.Option>
                    <YakitSelect.Option value='jar'>Jar</YakitSelect.Option>
                </YakitSelect>
            </Form.Item>
            <YakitFormDragger
                formItemProps={{
                    name: "ProgramPath",
                    label: "项目路径",
                    rules: [{required: true}]
                }}
                isShowPathNumber={false}
                selectType='folder'
                multiple={false}
                help='可将文件夹拖入框内或点击此处'
            />
            {type !== "jar" && (
                <Form.Item name='language' label={"语言"} rules={[{required: true, message: "请选择语言"}]}>
                    <YakitSelect>
                        <YakitSelect.Option value='Yaklang'>Yaklang</YakitSelect.Option>
                    </YakitSelect>
                </Form.Item>
            )}
            {type === "git/svn" && (
                <>
                    <Form.Item name='programName1' label={"用户名"}>
                        <YakitInput placeholder='请输入' />
                    </Form.Item>
                    <Form.Item name='programName2' label={"密码"}>
                        <YakitInput placeholder='请输入' />
                    </Form.Item>
                    <Form.Item name='programName3' label={"代理"}>
                        <YakitInput placeholder='请输入' />
                    </Form.Item>
                </>
            )}
            <Form.Item name='programName' label={"项目名称"}>
                <YakitInput placeholder='请输入' />
            </Form.Item>
            <Form.Item label={"项目描述"}>
                <YakitInput.TextArea placeholder='请输入' />
            </Form.Item>
        </div>
    )
}

interface AuditModalFormProps {
    onCancel: () => void
    // 拆分后不在有默认值
    isInitDefault?: boolean
    isExecuting: boolean
    onStartAudit: (path: string, v: DebugPluginRequest) => void
}

export const AuditModalForm: React.FC<AuditModalFormProps> = (props) => {
    const {onCancel, isInitDefault = false, isExecuting, onStartAudit} = props
    const {fileTree} = useStore()
    const [loading, setLoading] = useState<boolean>(true)

    const [plugin, setPlugin] = useState<YakScript>()
    const [form] = Form.useForm()

    const cacheRef = useRef<any>()
    // 获取参数
    const handleFetchParams = useDebounceFn(
        useMemoizedFn(async () => {
            const newPlugin = await grpcFetchLocalPluginDetail({Name: "SSA 项目编译"}, true)
            setLoading(false)
            setPlugin(newPlugin)
        }),
        {wait: 300}
    ).run

    useEffect(() => {
        handleFetchParams()
    }, [])

    const YakRunnerAuditCodeCache = "YakRunnerAuditCodeCache"
    // 必要参数
    const requiredParams = useMemo(() => {
        return (
            plugin?.Params.filter((item) => !!item.Required).map((item) => {
                if (item.Field === "ProgramPath") {
                    return {
                        ...item,
                        cacheRef,
                        cacheHistoryDataKey: YakRunnerAuditCodeCache
                    }
                }
                return item
            }) || []
        )
    }, [plugin?.Params])

    // 设置默认值
    const initRequiredFormValue = useMemoizedFn(async () => {
        let ProjectPath = ""
        let ProjectName = ""
        if (fileTree.length > 0) {
            ProjectPath = fileTree[0].path
            ProjectName = await getNameByPath(ProjectPath)
        }

        // 必填参数
        let initRequiredFormValue: CustomPluginExecuteFormValue = {...defPluginExecuteFormValue}

        if (isInitDefault) {
            requiredParams.forEach((ele) => {
                const value = getValueByType(ele.DefaultValue, ele.TypeVerbose)
                if (ele.Field === "programName") {
                    initRequiredFormValue = {
                        ...initRequiredFormValue,
                        [ele.Field]: ProjectName
                    }
                    return
                }
                if (ele.Field === "ProgramPath") {
                    initRequiredFormValue = {
                        ...initRequiredFormValue,
                        [ele.Field]: ProjectPath
                    }
                    return
                }
                initRequiredFormValue = {
                    ...initRequiredFormValue,
                    [ele.Field]: value
                }
            })
        }

        // 选填参数默认值
        const arr = plugin?.Params.filter((item) => !item.Required) || []
        arr.forEach((ele) => {
            const value = getValueByType(ele.DefaultValue, ele.TypeVerbose)
            initRequiredFormValue = {
                ...initRequiredFormValue,
                [ele.Field]: value
            }
        })

        form.setFieldsValue({...initRequiredFormValue})
    })

    useEffect(() => {
        if (plugin?.Params) {
            initRequiredFormValue()
        }
    }, [plugin?.Params])

    /** 选填参数 */
    const groupParams = useMemo(() => {
        const arr = plugin?.Params.filter((item) => !item.Required) || []
        return ParamsToGroupByGroupName(arr)
    }, [plugin?.Params])

    const onStartExecute = useMemoizedFn(() => {
        if (form && plugin) {
            form.validateFields()
                .then(async (value: any) => {
                    console.log("888", plugin, value)

                    const requestParams: DebugPluginRequest = {
                        Code: plugin.Content,
                        PluginType: plugin.Type,
                        Input: value["Input"] || "",
                        HTTPRequestTemplate: {} as HTTPRequestBuilderParams,
                        ExecParams: [],
                        PluginName: ""
                    }

                    const request: Record<string, any> = {}
                    for (let el of plugin?.Params || []) request[el.Field] = value[el.Field] || undefined
                    requestParams.ExecParams = getYakExecutorParam({...value})
                    // 缓存项目路径
                    if (value?.ProgramPath) {
                        cacheRef.current.onSetRemoteValues(value?.ProgramPath)
                    }
                    console.log("onStartAudit---", value["programName"], requestParams)

                    onStartAudit(value["programName"], requestParams)
                })
                .catch(() => {})
        }
    })
    console.log("requiredParams---", requiredParams)

    return (
        <YakitSpin spinning={loading}>
            <Form
                style={{padding: 16}}
                form={form}
                onFinish={() => {}}
                size='small'
                labelCol={{span: 8}}
                wrapperCol={{span: 16}}
                labelWrap={true}
                validateMessages={{
                    /* eslint-disable no-template-curly-in-string */
                    required: "${label} 是必填字段"
                }}
            >
                {/* <AuditMainItemForm /> */}
                <div className={styles["custom-params-wrapper"]}>
                    <ExecuteEnterNodeByPluginParams
                        paramsList={requiredParams}
                        pluginType={"yak"}
                        isExecuting={isExecuting}
                    />
                </div>
                {groupParams.length > 0 ? (
                    <>
                        <div className={styles["additional-params-divider"]}>
                            <div className={styles["text-style"]}>额外参数 (非必填)</div>
                            <div className={styles["divider-style"]}></div>
                        </div>
                        <ExtraParamsNodeByType extraParamsGroup={groupParams} pluginType={"yak"} />
                    </>
                ) : null}
            </Form>
            <div className={styles["audit-form-footer"]}>
                <YakitButton type='outline2' onClick={onCancel}>
                    取消
                </YakitButton>
                <YakitButton onClick={onStartExecute}>开始编译</YakitButton>
            </div>
        </YakitSpin>
    )
}

interface AuditModalFormModalProps {
    onCancel: () => void
    onSuccee: (path: string) => void
    isInitDefault?: boolean
    title?: string
    // 绑定容器
    warrpId?: HTMLElement | null
}

// 公共封装组件用于新建项目
export const AuditModalFormModal: React.FC<AuditModalFormModalProps> = (props) => {
    const {onCancel, onSuccee, isInitDefault, title, warrpId} = props
    const [isShowCompileModal, setShowCompileModal] = useState<boolean>(true)
    const tokenRef = useRef<string>(randomString(40))
    const [isShowRunAuditModal, setShowRunAuditModal] = useState<boolean>(false)
    /** 是否在执行中 */
    const [isExecuting, setIsExecuting] = useState<boolean>(false)
    const [runtimeId, setRuntimeId] = useState<string>("")
    const pathCacheRef = useRef<string>("")
    const [streamInfo, debugPluginStreamEvent] = useHoldGRPCStream({
        taskName: "debug-plugin",
        apiKey: "DebugPlugin",
        token: tokenRef.current,
        onEnd: () => {
            debugPluginStreamEvent.stop()
            setTimeout(() => {
                setIsExecuting(false)
            }, 300)
        },
        onError: () => {},
        setRuntimeId: (rId) => {
            yakitNotify("info", `调试任务启动成功，运行时 ID: ${rId}`)
            setRuntimeId(rId)
        }
    })
    // export-show
    const [exportStreamData, setExportStreamData] = useState<AuditCodeStreamData>({
        Progress: 0,
        Message: "",
        CostDurationVerbose: "",
        RestDurationVerbose: "",
        Speed: "0"
    })
    const logInfoRef = useRef<StreamResult.Log[]>([])
    // 执行审计
    const onStartAudit = useMemoizedFn((path: string, requestParams: DebugPluginRequest) => {
        debugPluginStreamEvent.reset()
        setRuntimeId("")
        pathCacheRef.current = path
        apiDebugPlugin({params: requestParams, token: tokenRef.current}).then(() => {
            setIsExecuting(true)
            setShowCompileModal(false)
            setShowRunAuditModal(true)
            debugPluginStreamEvent.start()
        })
    })

    const onCancelAudit = () => {
        logInfoRef.current = []
        setShowRunAuditModal(false)
        debugPluginStreamEvent.cancel()
        debugPluginStreamEvent.reset()
        onCancel()
    }

    useEffect(() => {
        const progress = Math.floor((streamInfo.progressState.map((item) => item.progress)[0] || 0) * 100) / 100
        // 当任务结束时 跳转打开编译列表
        if (progress === 1) {
            setTimeout(() => {
                logInfoRef.current = []
                setShowRunAuditModal(false)
                onSuccee(pathCacheRef.current)
            }, 300)
        }
        logInfoRef.current = streamInfo.logState.slice(0, 8)
        setExportStreamData({
            ...exportStreamData,
            Progress: progress
        })
    }, [streamInfo])
    return (
        <>
            <YakitModal
                getContainer={warrpId || document.getElementById("audit-code") || document.body}
                visible={isShowCompileModal}
                bodyStyle={{padding: 0}}
                title={title || "编译项目"}
                footer={null}
                onCancel={onCancel}
                maskClosable={false}
            >
                <AuditModalForm
                    isInitDefault={isInitDefault}
                    onCancel={onCancel}
                    isExecuting={isExecuting}
                    onStartAudit={onStartAudit}
                />
            </YakitModal>
            {/* 编译项目进度条弹窗 */}
            <YakitModal
                centered
                getContainer={document.getElementById("audit-code") || document.body}
                visible={isShowRunAuditModal}
                title={null}
                footer={null}
                width={520}
                type='white'
                closable={false}
                hiddenHeader={true}
                bodyStyle={{padding: 0}}
            >
                <AuditCodeStatusInfo
                    title={"项目编译中..."}
                    streamData={exportStreamData}
                    cancelRun={() => {
                        onCancelAudit()
                    }}
                    logInfo={logInfoRef.current}
                    showDownloadDetail={false}
                />
            </YakitModal>
        </>
    )
}

interface AuditHistoryTableProps {
    pageType: "aucitCode" | "projectManager"
    onClose?: () => void
    onExecuteAudit?: () => void
    refresh?: boolean
}

export const AuditHistoryTable: React.FC<AuditHistoryTableProps> = memo((props) => {
    const {pageType, onClose, onExecuteAudit, refresh} = props
    const {projectName} = useStore()
    const [loading, setLoading] = useState<boolean>(false)
    const [aduitData, setAduitData] = useState<RequestYakURLResponse>()
    const [search, setSearch] = useState<string>()

    const [isAllSelect, setIsAllSelect] = useState<boolean>(false)
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
    const onSelectAll = useMemoizedFn(() => {
        setIsAllSelect(true)
        setSelectedRowKeys(aduitData?.Resources.map((item) => item.Path) || [])
    })
    const onSelectChange = useMemoizedFn((c: boolean, keys: string, rows: YakURLResource) => {
        if (c) {
            setSelectedRowKeys([...selectedRowKeys, rows.Path])
        } else {
            setIsAllSelect(false)
            const newSelectedRowKeys = selectedRowKeys.filter((ele) => ele !== rows.Path)
            setSelectedRowKeys(newSelectedRowKeys)
        }
    })

    useEffect(() => {
        getAduitList()
    }, [search, refresh])

    const getAduitList = useMemoizedFn(async () => {
        try {
            setLoading(true)
            const {res} = await grpcFetchAuditTree("/")
            // if (res.Resources.length === 0) {
            //     return
            // }
            if (search && search.length > 0) {
                const newResources = res.Resources.filter((item) => JSON.stringify(item).includes(search))
                const obj: RequestYakURLResponse = {
                    ...res,
                    Resources: newResources,
                    Total: newResources.length
                }
                setAduitData(obj)
            } else {
                setAduitData(res)
            }
            setLoading(false)
        } catch (error) {
            setLoading(false)
        }
    })

    const getAuditPath = useMemoizedFn((val: YakURLResource) => {
        let path: string = "-"
        let time: string = "-"
        let description: string = ""
        let language: string = ""
        val.Extra.forEach((item) => {
            switch (item.Key) {
                case "Path":
                    path = item.Value
                    break
                case "Description":
                    description = item.Value
                    break
                case "Language":
                    language = item.Value
                    break
                case "CreateAt":
                    time = formatTimestamp(parseInt(item.Value))
                    break
            }
        })

        return {
            path,
            time,
            description,
            language
        }
    })

    const onDelete = useMemoizedFn(async (path: string) => {
        try {
            setLoading(true)
            await grpcFetchDeleteAudit(path)
            getAduitList()

            if (path === `/${projectName}`) {
                emiter.emit("onResetAuditStatus")
            }
        } catch (error) {
            setLoading(false)
            failed(`删除失败${error}`)
        }
    })

    const onRemoveMultiple = useMemoizedFn(() => {
        console.log(selectedRowKeys)
    })

    const columns: VirtualListColumns<YakURLResource>[] = [
        {
            title: "项目名称",
            dataIndex: "ResourceName",
            render: (text, record) => {
                const obj = getAuditPath(record)
                return (
                    <div className={classNames("yakit-content-single-ellipsis", styles["audit-text"])}>
                        {record.ResourceName}
                        {obj.description && (
                            <Tooltip title={obj.description}>
                                <QuestionMarkCircleIcon />
                            </Tooltip>
                        )}
                    </div>
                )
            }
        },
        {
            title: "存储路径",
            dataIndex: "Path",
            render: (text, record) => {
                const obj = getAuditPath(record)
                return (
                    <div className={classNames("yakit-content-single-ellipsis", styles["audit-text"])}>{obj.path}</div>
                )
            }
        },
        {
            title: "编译时间",
            dataIndex: "time",
            render: (text, record) => {
                const obj = getAuditPath(record)
                return <div className={styles["audit-time"]}>{obj.time}</div>
            }
        },
        {
            title: "操作",
            dataIndex: "action",
            width: 130,
            render: (text, record) => {
                const obj = getAuditPath(record)
                return (
                    <div className={styles["audit-opt"]}>
                        <Tooltip title={"代码扫描"}>
                            <YakitButton
                                type='text'
                                icon={<OutlineScanIcon className={styles["to-icon"]} />}
                                onClick={() => {
                                    // addToTab(YakitRoute.YakRunner_Code_Scan)
                                    emiter.emit(
                                        "openPage",
                                        JSON.stringify({
                                            route: YakitRoute.YakRunner_Code_Scan,
                                            params: {
                                                projectName: record.ResourceName
                                            }
                                        })
                                    )
                                }}
                            />
                        </Tooltip>

                        {/* 此处的Tooltip会导致页面抖动(待处理) */}
                        <Tooltip title={"打开项目"}>
                            <YakitButton
                                type='text'
                                icon={<OutlineArrowcirclerightIcon className={styles["to-icon"]} />}
                                onClick={() => {
                                    if (pageType === "projectManager") {
                                        // 跳转到审计页面的参数
                                        const params: AuditCodePageInfoProps = {
                                            Schema: "syntaxflow",
                                            Location: record.ResourceName,
                                            Path: `/`
                                        }
                                        emiter.emit(
                                            "openPage",
                                            JSON.stringify({
                                                route: YakitRoute.YakRunner_Audit_Code,
                                                params
                                            })
                                        )
                                    } else {
                                        onClose && onClose()
                                        emiter.emit("onCodeAuditOpenAuditTree", record.ResourceName)
                                    }
                                }}
                            />
                        </Tooltip>
                        <Divider type={"vertical"} style={{margin: 0}} />
                        <YakitPopconfirm
                            title={`确定删除${record.ResourceName}`}
                            onConfirm={() => onDelete(record.Path)}
                        >
                            <YakitButton type='text' danger icon={<OutlineTrashIcon />} />
                        </YakitPopconfirm>
                    </div>
                )
            }
        }
    ]

    return (
        <div className={styles["audit-history-table"]} onKeyDown={(event) => event.stopPropagation()}>
            <div className={styles["header"]}>
                <div className={styles["main"]}>
                    <div className={styles["title"]}>已编译项目</div>
                    <div className={styles["sub-title"]}>
                        <div className={styles["text"]}>Total</div>
                        <div className={styles["number"]}>{aduitData?.Total}</div>
                    </div>
                    <Divider type={"vertical"} style={{margin: 0}} />
                    <div className={styles["sub-title"]}>
                        <div className={styles["text"]}>Selected</div>
                        <div className={styles["number"]}>{selectedRowKeys.length}</div>
                    </div>
                </div>
                <div className={styles["extra"]}>
                    <YakitInput
                        prefix={<OutlineSearchIcon className={styles["search-icon"]} />}
                        placeholder='请输入关键词搜索'
                        size='small'
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value)
                        }}
                    />
                    <YakitPopconfirm
                        title={selectedRowKeys.length > 0 ? "确定删除勾选数据吗？" : "确定清空列表数据吗?"}
                        onConfirm={() => {
                            onRemoveMultiple()
                        }}
                        placement='bottomRight'
                    >
                        <YakitButton type='outline1' colors='danger' icon={<TrashIcon />}>
                            {selectedRowKeys.length > 0 ? "删除" : "清空"}
                        </YakitButton>
                    </YakitPopconfirm>
                    <YakitButton
                        icon={<SolidPluscircleIcon />}
                        onClick={() => {
                            if (onExecuteAudit) {
                                onExecuteAudit()
                                return
                            }
                            onClose && onClose()
                            emiter.emit("onExecuteAuditModal")
                        }}
                    >
                        添加项目
                    </YakitButton>
                    {onClose && <YakitButton type='text2' icon={<OutlineXIcon />} onClick={onClose} />}
                </div>
            </div>

            <div className={styles["table"]}>
                <YakitVirtualList<YakURLResource>
                    className={styles["audit-virtual-list"]}
                    loading={loading}
                    hasMore={false}
                    columns={columns}
                    data={aduitData?.Resources || []}
                    page={1}
                    loadMoreData={() => {}}
                    renderKey='Path'
                    rowSelection={{
                        isAll: isAllSelect,
                        type: "checkbox",
                        selectedRowKeys,
                        onSelectAll: onSelectAll,
                        onChangeCheckboxSingle: onSelectChange
                    }}
                />
            </div>
        </div>
    )
})
