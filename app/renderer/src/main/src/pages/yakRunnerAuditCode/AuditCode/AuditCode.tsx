import React, {forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {
    AfreshAuditModalProps,
    AuditCodeProps,
    AuditHistoryListProps,
    AuditHistoryListRefProps,
    AuditHistoryTableProps,
    AuditNodeSearchItemProps,
    AuditMainItemFormProps,
    AuditModalFormModalProps,
    AuditModalFormProps,
    AuditNodeDetailProps,
    AuditNodeProps,
    AuditTreeNodeProps,
    AuditTreeProps,
    AuditYakUrlProps,
    ProjectManagerEditFormProps,
    QuerySSAProgramsProps,
    SSAProgramResponse,
    AuditDetailItemProps
} from "./AuditCodeType"
import classNames from "classnames"
import styles from "./AuditCode.module.scss"
import {genDefaultPagination, QueryGeneralResponse, YakScript} from "@/pages/invoker/schema"
import {Badge, Divider, Form, FormInstance, Input, Progress, Slider, Tooltip, Tree} from "antd"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {ExtraParamsNodeByType} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/PluginExecuteExtraParams"
import {
    ExecuteEnterNodeByPluginParams,
    FormContentItemByType
} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {YakParamProps} from "@/pages/plugins/pluginsType"
import {
    getValueByType,
    getYakExecutorParam,
    onCodeToInfo,
    ParamsToGroupByGroupName
} from "@/pages/plugins/editDetails/utils"
import {
    useControllableValue,
    useDebounceFn,
    useGetState,
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
import {failed, success, warn, yakitNotify} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {FormExtraSettingProps} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType"
import useStore from "../hooks/useStore"
import {loadAuditFromYakURLRaw} from "../utils"
import {
    OutlineArrowcirclerightIcon,
    OutlineBugIcon,
    OutlineChevronrightIcon,
    OutlineClockIcon,
    OutlineDeprecatedIcon,
    OutlineDocumentduplicateIcon,
    OutlineDotshorizontalIcon,
    OutlineEyeIcon,
    OutlinePencilaltIcon,
    OutlineRefreshIcon,
    OutlineReloadScanIcon,
    OutlineScanIcon,
    OutlineSearchIcon,
    OutlineTrashIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import emiter from "@/utils/eventBus/eventBus"
import {DeleteOutlined, LoadingOutlined, ReloadOutlined} from "@ant-design/icons"
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
import {QuestionMarkCircleIcon, TerminalIcon, TrashIcon} from "@/assets/newIcon"
import {addToTab} from "@/pages/MainTabs"
import {YakitRoute} from "@/enums/yakitRoute"
import {AuditCodePageInfoProps} from "@/store/pageInfo"
import {apiDeleteQuerySyntaxFlowResult, apiFetchQuerySyntaxFlowResult} from "@/pages/yakRunnerCodeScan/utils"
import {
    DeleteSyntaxFlowResultRequest,
    DeleteSyntaxFlowResultResponse,
    QuerySyntaxFlowResultRequest,
    QuerySyntaxFlowResultResponse,
    SyntaxFlowResult,
    VerifyStartProps
} from "@/pages/yakRunnerCodeScan/YakRunnerCodeScanType"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {AuditCodeStatusInfo} from "../YakRunnerAuditCode"
import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {JumpToAuditEditorProps} from "../BottomEditorDetails/BottomEditorDetailsType"
import {YakitVirtualList} from "@/components/yakitUI/YakitVirtualList/YakitVirtualList"
import {VirtualListColumns} from "@/components/yakitUI/YakitVirtualList/YakitVirtualListType"
import {YakitDragger, YakitFormDragger} from "@/components/yakitUI/YakitForm/YakitForm"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {PluginExecuteLog} from "@/pages/plugins/operator/pluginExecuteResult/PluginExecuteResult"
import useDispatcher from "../hooks/useDispatcher"
import {Paging} from "@/utils/yakQueryHTTPFlow"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {setClipboardText} from "@/utils/clipboard"
import {getJsonSchemaListResult} from "@/components/JsonFormWrapper/JsonFormWrapper"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {SyntaxFlowMonacoSpec} from "@/utils/monacoSpec/syntaxflowEditor"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {AgentConfigModal} from "@/pages/mitm/MITMServerStartForm/MITMServerStartForm"
import {YakitAutoComplete} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {Selection} from "../RunnerTabs/RunnerTabsType"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {FileDefault, FileSuffix, KeyToIcon} from "../../yakRunner/FileTree/icon"
import {RiskTree} from "../RunnerFileTree/RunnerFileTree"
import {getNameByPath} from "@/pages/yakRunner/utils"
import {FuncFilterPopover} from "@/pages/plugins/funcTemplate"
import cloneDeep from "lodash/cloneDeep"
const {YakitPanel} = YakitCollapse

const {ipcRenderer} = window.require("electron")

export const isBugFun = (info: AuditNodeProps) => {
    try {
        const arr = info.Extra.filter((item) => item.Key === "risk_hash")
        // 第一层BUG展示
        if (info.ResourceType === "variable" && info.VerboseType === "alert") return true
        // 第二层BUG展示
        if (arr.length > 0) return true

        return false
    } catch (error) {
        return false
    }
}

export const getDetailFun = (info: AuditNodeProps | AuditDetailItemProps) => {
    try {
        if (info.ResourceType === "value") {
            const result = info.Extra.find((item) => item.Key === "code_range")?.Value
            if (result) {
                const item: CodeRangeProps = JSON.parse(result)
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

const showIcon = (severity) => {
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
}

export const AuditTreeNode: React.FC<AuditTreeNodeProps> = memo((props) => {
    const {info, foucsedKey, onSelected, onExpanded, expandedKeys, loadTreeMore, customizeContent} = props
    const handleSelect = useMemoizedFn(() => {
        onSelected(info, getDetail)
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

    // 获取详情
    const getDetail = useMemo(() => {
        return getDetailFun(info)
    }, [info])

    const dom = useMemo(() => {
        if (info.isBottom) {
            return <div className={styles["tree-bottom"]}>{info.name}</div>
        } else if (info.hasMore) {
            return (
                <div className={styles["tree-more"]} onClick={() => loadTreeMore(info)}>
                    加载更多...
                </div>
            )
        } else {
            return (
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

                    <div className={styles["node-content"]}>{customizeContent(info)}</div>
                </div>
            )
        }
    }, [info, isFoucsed, isExpanded])

    return <>{dom}</>
})

export const AuditNodeSearchItem: React.FC<AuditNodeSearchItemProps> = memo((props) => {
    const {info, foucsedKey, activeInfo, setActiveInfo, onJump, onContextMenu} = props

    // 获取详情
    const getDetail = useMemo(() => {
        return getDetailFun(info)
    }, [info])

    const isFoucsed = useMemo(() => {
        return foucsedKey === info.id
    }, [foucsedKey, info.id])

    const handleClick = useMemoizedFn(() => {
        if (activeInfo?.id === info.id) {
            setActiveInfo(undefined)
            return
        }
        setActiveInfo(info)
    })

    const getIconByName = useMemoizedFn((name: string) => {
        const suffix = name.indexOf(".") > -1 ? name.split(".").pop() : ""
        return KeyToIcon[suffix ? FileSuffix[suffix] || FileDefault : FileDefault].iconPath
    })
    return (
        <div
            className={classNames(styles["audit-tree-node"], {
                [styles["node-foucsed"]]: isFoucsed
            })}
            style={{paddingLeft: 8}}
            onClick={handleClick}
            onContextMenu={() => {
                onContextMenu(info)
            }}
            onDoubleClick={() => onJump(info)}
        >
            {info.ResourceType === "message" && showIcon(info.VerboseType)}

            <div className={styles["node-loading"]}>
                <LoadingOutlined />
            </div>
            {getDetail?.fileName && <img className={styles["img-box"]} src={getIconByName(getDetail.fileName)} />}
            <div className={styles["node-content"]}>
                <div className={classNames(styles["content-body"])}>
                    {getDetail && (
                        <Tooltip title={`${getDetail.url}:${getDetail.start_line}`}>
                            <div className={classNames(styles["detail"], "yakit-content-single-ellipsis")}>
                                {getDetail.fileName}
                                <YakitTag className={styles["detail-tag"]} size='small' color='info'>
                                    {getDetail.start_line}
                                </YakitTag>
                            </div>
                        </Tooltip>
                    )}

                    <div className={classNames(styles["name"], "yakit-content-single-ellipsis")}>{info.name}</div>
                </div>
                {info.ResourceType === "variable" && <div className={styles["count"]}>{info.Size}</div>}
            </div>
        </div>
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
        loadTreeMore
    } = props
    const {pageInfo} = useStore()
    const treeRef = useRef<any>(null)
    const wrapper = useRef<HTMLDivElement>(null)
    const size = useSize(wrapper)

    // PS: 之前的逻辑是匹配到此项时打开对应文件，可能会造成卡在欢迎页的情况，因此改为根据参数直接打开对应文件
    const defaultOpenIdRef = useRef<string>()
    useEffect(() => {
        if (pageInfo) {
            const {Path, Variable, Value} = pageInfo
            if (Variable && Value) {
                defaultOpenIdRef.current = `${Path}${Variable}${Value}`
            }
        }
    }, [pageInfo])

    const handleSelect = useMemoizedFn((node: AuditNodeProps, detail?: AuditNodeDetailProps) => {
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
                const highLightRange: Selection = {
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
                    const obj: JumpToAuditEditorProps = {
                        selections: highLightRange,
                        path: url,
                        isSelect: false
                    }
                    emiter.emit("onCodeAuditJumpEditorDetail", JSON.stringify(obj))
                }, 100)
            }
        } catch (error) {}
    })
    const goBUGDetail = useMemoizedFn((info) => {
        handleSelect({...info, isBug: true})
    })
    const customizeContent = useMemoizedFn((info) => {
        // 获取详情
        const getDetail = getDetailFun(info)

        return (
            <>
                <div className={classNames(styles["content-body"])}>
                    {getDetail && (
                        <Tooltip title={`${getDetail.url}:${getDetail.start_line}`}>
                            <div className={classNames(styles["detail"], "yakit-content-single-ellipsis")}>
                                {getDetail.fileName}
                                <YakitTag className={styles["detail-tag"]} size='small' color='info'>
                                    {getDetail.start_line}
                                </YakitTag>
                            </div>
                        </Tooltip>
                    )}

                    <div
                        className={classNames("yakit-content-single-ellipsis", styles["name"], {
                            [styles["name-active"]]: !info.isLeaf
                        })}
                    >
                        {info.name}
                    </div>
                </div>
                {isBugFun(info) && (
                    <div
                        className={classNames(styles["bug"], {
                            [styles["active-bug"]]: info.Extra.filter((item) => item.Key === "risk_hash").length > 0
                        })}
                        onClick={(e) => {
                            e.stopPropagation()
                            goBUGDetail(info)
                        }}
                    >
                        <OutlineBugIcon />
                    </div>
                )}
                {info.ResourceType === "variable" && <div className={styles["count"]}>{info.Size}</div>}
            </>
        )
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
                        handleSelect(nodeData, getDetailFun(nodeData))
                    }
                    return (
                        <AuditTreeNode
                            info={nodeData}
                            foucsedKey={foucsedKey}
                            expandedKeys={expandedKeys}
                            onSelected={handleSelect}
                            onExpanded={handleExpand}
                            loadTreeMore={loadTreeMore}
                            customizeContent={customizeContent}
                        />
                    )
                }}
            />
        </div>
    )
})

const TopId = "top-message"
const defaultQuery: QuerySyntaxFlowResultRequest = {
    Filter: {
        TaskIDs: [],
        ResultIDs: [],
        RuleNames: [],
        ProgramNames: [],
        Keyword: "",
        OnlyRisk: false
    },
    Pagination: genDefaultPagination(20)
}

export const AuditCode: React.FC<AuditCodeProps> = (props) => {
    const {setOnlyFileTree, onOpenEditorDetails} = props
    const {projectName, pageInfo, auditRule, auditExecuting} = useStore()
    const {setAuditExecuting} = useDispatcher()
    const [auditType, setAuditType] = useState<"result" | "history">("result")
    const [loading, setLoading] = useState<boolean>(false)
    const [isShowEmpty, setShowEmpty] = useState<boolean>(false)
    const [expandedKeys, setExpandedKeys] = React.useState<string[]>([])
    const [foucsedKey, setFoucsedKey] = React.useState<string>("")
    const [refreshTree, setRefreshTree, getRefreshTree] = useGetState<boolean>(false)
    const [removeVisible, setRemoveVisible] = useState<boolean>(false)
    /** 子组件方法传递给父组件 */
    const auditHistoryListRef = useRef<AuditHistoryListRefProps>(null)
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
        if (newInitTree.length > 0) {
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
        }

        return newInitTree
    }, [refreshTree])

    const lastValue = useRef<string>("")
    const handleAuditLoadData = useMemoizedFn((id: string) => {
        return new Promise(async (resolve, reject) => {
            try {
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
                    // 每次拿30条
                    const result = await loadAuditFromYakURLRaw(params, body, 1, 30)
                    if (result) {
                        let variableIds: string[] = []
                        result.Resources.filter((item) => item.VerboseType !== "result_id").forEach((item, index) => {
                            const {ResourceType, VerboseType, VerboseName, ResourceName, Size, Extra} = item
                            let value: string = `${index}`
                            const obj = Extra.find((item) => item.Key === "index")
                            if (obj) {
                                value = obj.Value
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
                        let isEnd: boolean = !!result.Resources.find((item) => item.VerboseType === "result_id")
                        // 如若请求数据未全部拿完 则显示加载更多
                        if (!isEnd) {
                            const newId = `${id}/load`
                            setMapAuditDetail(newId, {
                                parent: path,
                                id: newId,
                                name: "",
                                ResourceType: "value",
                                VerboseType: "",
                                Size: 0,
                                Extra: [],
                                page: result.Page,
                                hasMore: true
                            })
                            variableIds.push(newId)
                        }

                        setMapAuditChildDetail(path, variableIds)
                        setTimeout(() => {
                            setRefreshTree(!refreshTree)
                            resolve("")
                        }, 300)
                    } else {
                        reject()
                    }
                }
            } catch (error) {
                reject()
            }
        })
    })

    // 树加载更多
    const loadTreeMore = useMemoizedFn(async (node: AuditNodeProps) => {
        try {
            if (node.parent && node.page) {
                const path = node.parent
                const page = parseInt(node.page + "") + 1
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
                // 每次拿30条
                const result = await loadAuditFromYakURLRaw(params, body, page, 30)
                if (result) {
                    let variableIds: string[] = []
                    result.Resources.filter((item) => item.VerboseType !== "result_id").forEach((item, index) => {
                        const {ResourceType, VerboseType, VerboseName, ResourceName, Size, Extra} = item
                        let value: string = `${index}`
                        const obj = Extra.find((item) => item.Key === "index")
                        if (obj) {
                            value = obj.Value
                        }
                        const newId = `${path}/${value}`
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
                    let isEnd: boolean = !!result.Resources.find((item) => item.VerboseType === "result_id")
                    // 如若请求数据未全部拿完 则显示加载更多
                    const newId = `${path}/load`
                    if (!isEnd) {
                        setMapAuditDetail(newId, {
                            parent: path,
                            id: newId,
                            name: "",
                            ResourceType: "value",
                            VerboseType: "",
                            Size: 0,
                            Extra: [],
                            page: result.Page,
                            hasMore: true
                        })
                        variableIds.push(newId)
                    }
                    // 此处为累加并移除原有加载更多项
                    const auditChilds = getMapAuditChildDetail(path)
                    const childs = auditChilds.filter((item) => item !== newId)
                    setMapAuditChildDetail(path, [...childs, ...variableIds])
                    setTimeout(() => {
                        setRefreshTree(!refreshTree)
                    }, 300)
                }
            }
        } catch (error) {}
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

    const [resultId, setResultId] = useState<string>()
    const onAuditRuleSubmitFun = useMemoizedFn(
        async (textArea: string = "", Query?: {Key: string; Value: number}[]) => {
            try {
                resetMap()
                setResultId(undefined)
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
                    setRefreshTree(!getRefreshTree())
                } else {
                    setShowEmpty(true)
                }
                // 获取ID并展示
                if (params.Query) {
                    let showId = params.Query.find((item) => item.Key === "result_id")?.Value
                    showId && setResultId(showId)
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
        // 当任务错误时
        if (streamInfo.logState[0]?.level === "error") {
            onCancelAuditStream()
            failed(streamInfo.logState[0].data)
            return
        }
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
        apiDebugPlugin({params: requestParams, token: tokenRef.current})
            .then(() => {
                setAuditType("result")
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

    const onOpenLeftSecondNodeFun = useMemoizedFn((v: "result" | "history") => {
        setOnlyFileTree(false)
        setAuditType(v)
    })
    useEffect(() => {
        emiter.on("onAuditRuleSubmit", onAuditStreamRuleSubmitFun)
        emiter.on("onStopAuditRule", onStopAuditRuleFun)
        emiter.on("onOpenLeftSecondNode", onOpenLeftSecondNodeFun)
        return () => {
            emiter.off("onAuditRuleSubmit", onAuditStreamRuleSubmitFun)
            emiter.off("onStopAuditRule", onStopAuditRuleFun)
            emiter.off("onOpenLeftSecondNode", onOpenLeftSecondNodeFun)
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

    const onJump = useMemoizedFn((node: AuditNodeProps) => {
        try {
            const arr = node.Extra.filter((item) => item.Key === "risk_hash")
            if (arr.length > 0 && node.isBug) {
                const hash = arr[0]?.Value
                if (hash) {
                    emiter.emit("onCodeAuditOpenBugDetail", hash)
                    emiter.emit("onCodeAuditOpenBottomDetail", JSON.stringify({type: "holeDetail"}))
                }
            }
            if (arr.length === 0) {
                emiter.emit("onCodeAuditOpenBugDetail", "")
            }
            if (node.ResourceType === "value") {
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
                if (node.query) {
                    rightParams.Query = node.query
                }
                emiter.emit("onCodeAuditOpenRightDetail", JSON.stringify(rightParams))
            }
        } catch (error) {
            failed(`打开错误${error}`)
        }
    })

    const [query, setQuery] = useState<QuerySyntaxFlowResultRequest>(defaultQuery)
    const [isShowRiskTree, setShowRiskTree] = useState<boolean>(false)

    return (
        <YakitSpin spinning={loading}>
            <div className={styles["audit-code"]}>
                <div className={styles["header"]}>
                    <div className={styles["title"]}>
                        <YakitRadioButtons
                            size='small'
                            value={auditType}
                            onChange={(e) => {
                                const value = e.target.value
                                setAuditType(value as "result" | "history")
                                setQuery(defaultQuery)
                            }}
                            buttonStyle='solid'
                            options={[
                                {
                                    label: "审计结果",
                                    value: "result"
                                },
                                {
                                    label: "审计历史",
                                    value: "history"
                                }
                            ]}
                        />
                    </div>
                    {auditExecuting ? (
                        <div className={styles["extra"]}>
                            <Progress
                                strokeColor='var(--Colors-Use-Main-Primary)'
                                trailColor='var(--Colors-Use-Neutral-Bg)'
                                percent={Math.floor((resultInfo?.progress || 0) * 100)}
                            />
                        </div>
                    ) : (
                        <>
                            {auditType === "history" ? (
                                <div className={styles["extra"]}>
                                    <YakitButton
                                        type='text'
                                        size={"small"}
                                        icon={<ReloadOutlined />}
                                        onClick={(e) => {
                                            auditHistoryListRef.current?.onRefresh()
                                        }}
                                    />
                                    <YakitDropdownMenu
                                        menu={{
                                            data: [
                                                {
                                                    key: "deleteAll",
                                                    label: "删除历史及漏洞"
                                                },
                                                {
                                                    key: "deleteSome",
                                                    label: "仅删除无漏洞数据",
                                                    disabled: query.Filter.OnlyRisk
                                                }
                                            ],
                                            onClick: ({key}) => {
                                                switch (key) {
                                                    case "deleteAll":
                                                        setRemoveVisible(true)
                                                        break
                                                    case "deleteSome":
                                                        auditHistoryListRef.current?.onDeleteAuditHistory(false)
                                                        break
                                                    default:
                                                        break
                                                }
                                            }
                                        }}
                                        dropdown={{
                                            trigger: ["click"],
                                            placement: "bottom"
                                        }}
                                    >
                                        <YakitButton
                                            type='text'
                                            size={"small"}
                                            colors='danger'
                                            icon={<DeleteOutlined />}
                                        />
                                    </YakitDropdownMenu>
                                    <YakitButton
                                        type='text'
                                        icon={<OutlineXIcon />}
                                        onClick={() => setOnlyFileTree(true)}
                                    />
                                </div>
                            ) : (
                                <div className={styles["extra"]}>
                                    {resultId && (
                                        <>
                                            <div style={{flex: 1}}>
                                                <YakitTag color='info'>ID:{resultId}</YakitTag>
                                            </div>
                                            <Tooltip title={isShowRiskTree ? "隐藏漏洞树" : "查看漏洞树"}>
                                                <YakitButton
                                                    type='text'
                                                    size={"small"}
                                                    icon={<OutlineEyeIcon />}
                                                    onClick={() => {
                                                        setShowRiskTree(!isShowRiskTree)
                                                    }}
                                                />
                                            </Tooltip>
                                        </>
                                    )}

                                    <YakitButton
                                        type='text'
                                        icon={<OutlineXIcon />}
                                        onClick={() => setOnlyFileTree(true)}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>
                {auditType === "result" ? (
                    <>
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
                                    <>
                                        {isShowRiskTree && resultId ? (
                                            <RiskTree type='file' projectName={projectName} result_id={resultId} />
                                        ) : (
                                            <>
                                                {auditDetailTree.length > 0 ? (
                                                    <AuditTree
                                                        data={auditDetailTree}
                                                        expandedKeys={expandedKeys}
                                                        setExpandedKeys={setExpandedKeys}
                                                        onLoadData={onLoadData}
                                                        foucsedKey={foucsedKey}
                                                        setFoucsedKey={setFoucsedKey}
                                                        onJump={onJump}
                                                        loadTreeMore={loadTreeMore}
                                                    />
                                                ) : (
                                                    <div className={styles["no-data"]}>暂无数据</div>
                                                )}
                                            </>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </>
                ) : (
                    <>
                        {!projectName ? (
                            <div className={styles["no-data"]}>暂无数据</div>
                        ) : (
                            <AuditHistoryList
                                ref={auditHistoryListRef}
                                setAuditType={setAuditType}
                                onAuditRuleSubmitFun={onAuditRuleSubmitFun}
                                onOpenEditorDetails={onOpenEditorDetails}
                                query={query}
                                setQuery={setQuery}
                            />
                        )}
                    </>
                )}
                <YakitHint
                    visible={removeVisible}
                    title='删除历史及漏洞'
                    content='会删除审计历史及相关漏洞数据，确认删除吗'
                    onOk={() => {
                        auditHistoryListRef.current?.onDeleteAuditHistory(true)
                        setRemoveVisible(false)
                    }}
                    onCancel={() => setRemoveVisible(false)}
                />
            </div>
        </YakitSpin>
    )
}

// 审计历史
export const AuditHistoryList: React.FC<AuditHistoryListProps> = React.memo(
    forwardRef((props, ref) => {
        const {onOpenEditorDetails, onAuditRuleSubmitFun, setAuditType, query, setQuery} = props
        const {projectName} = useStore()

        const [loading, setLoading] = useState<boolean>(false)
        const [hasMore, setHasMore] = useState<boolean>(false)
        const [isRefresh, setIsRefresh] = useState<boolean>(false)
        const [response, setResponse] = useState<QuerySyntaxFlowResultResponse>({
            Results: [],
            Pagination: genDefaultPagination(20),
            DbMessage: {
                TableName: "",
                Operation: "",
                EffectRows: "",
                ExtraMessage: ""
            },
            Total: 0
        })

        useImperativeHandle(
            ref,
            () => ({
                onRefresh: () => {
                    setIsRefresh(!isRefresh)
                    update(1)
                },
                onDeleteAuditHistory: (v) => {
                    onDelete(v)
                }
            }),
            []
        )

        useEffect(() => {
            update(1)
        }, [projectName])

        const update = useMemoizedFn((page: number) => {
            setLoading(true)
            const paginationProps = {
                ...query.Pagination,
                Page: page,
                Limit: 20
            }
            const finalParams: QuerySyntaxFlowResultRequest = {
                ...query,
                Filter: {
                    ...query.Filter,
                    ProgramNames: [projectName || ""]
                },
                Pagination: paginationProps
            }

            const isInit = page === 1
            apiFetchQuerySyntaxFlowResult(finalParams)
                .then((res: QuerySyntaxFlowResultResponse) => {
                    // console.log("finalParams---",finalParams,res);
                    const resData = res?.Results || []
                    if (resData.length > 0) {
                        setQuery((prevQuery) => ({
                            ...prevQuery,
                            Pagination: {
                                ...prevQuery.Pagination,
                                Page: +res.Pagination.Page
                            }
                        }))
                    }
                    const d = isInit ? res.Results : (response?.Results || []).concat(res.Results)
                    const isMore = res.Results.length < res.Pagination.Limit || d.length === response.Total

                    setHasMore(!isMore)
                    setResponse({
                        ...res,
                        Results: d
                    })
                    if (isInit) {
                        setIsRefresh((prevIsRefresh) => !prevIsRefresh)
                    }
                })
                .finally(() => {
                    setLoading(false)
                })
                .catch(() => {})
        })

        const onDelete = useMemoizedFn((DeleteContainRisk: boolean) => {
            setLoading(true)
            const deleteParams: DeleteSyntaxFlowResultRequest = {
                ...query,
                DeleteContainRisk,
                DeleteAll: true,
                Filter: {
                    ...query.Filter,
                    ProgramNames: [projectName || ""]
                }
            }
            // console.log("deleteParams---", deleteParams)

            apiDeleteQuerySyntaxFlowResult(deleteParams)
                .then((rsp: DeleteSyntaxFlowResultResponse) => {
                    success(`已成功删除`)
                    update(1)
                })
                .finally(() => {
                    setLoading(false)
                })
                .catch(() => {})
        })

        const getTagByKind = useMemoizedFn((kind: "query" | "debug" | "scan") => {
            switch (kind) {
                case "debug":
                    return <YakitTag color='purple'>规则调试</YakitTag>
                case "query":
                    return <YakitTag color='blue'>手动审计</YakitTag>
                case "scan":
                    return <YakitTag color='green'>代码扫描</YakitTag>
                default:
                    return <></>
            }
        })
        return (
            <div className={styles["audit-history-list"]}>
                <div className={styles["header"]}>
                    <YakitInput.Search
                        wrapperStyle={{flex: 3}}
                        placeholder='请输入关键词搜索'
                        value={query.Filter.Keyword}
                        onChange={(e) => {
                            setQuery({
                                ...query,
                                Filter: {
                                    ...query.Filter,
                                    Keyword: e.target.value
                                }
                            })
                        }}
                        onPressEnter={() => update(1)}
                        onSearch={() => {
                            update(1)
                        }}
                    />
                    <YakitSelect
                        value={query.Filter.Kind}
                        onChange={(value) => {
                            setQuery({
                                ...query,
                                Filter: {
                                    ...query.Filter,
                                    Kind: value
                                }
                            })
                            setTimeout(() => {
                                update(1)
                            }, 200)
                        }}
                        size='small'
                        wrapperStyle={{flex: 2}}
                        mode='multiple'
                        maxTagCount='responsive'
                        placeholder='请选择历史来源'
                    >
                        <YakitSelect.Option value='query'>手动审计</YakitSelect.Option>
                        <YakitSelect.Option value='scan'>代码扫描</YakitSelect.Option>
                        <YakitSelect.Option value='debug'>规则调试</YakitSelect.Option>
                    </YakitSelect>
                </div>
                <div className={styles["onlyRisk-box"]}>
                    <YakitCheckbox
                        checked={query.Filter.OnlyRisk}
                        onChange={(e) => {
                            setQuery({
                                ...query,
                                Filter: {
                                    ...query.Filter,
                                    OnlyRisk: e.target.checked
                                }
                            })
                            setTimeout(() => {
                                update(1)
                            }, 200)
                        }}
                    >
                        <span style={{fontSize: 12}}>风险数大于0</span>
                    </YakitCheckbox>
                </div>
                <div className={styles["audit-history-list-container"]}>
                    <RollingLoadList<SyntaxFlowResult>
                        loading={loading}
                        isRef={isRefresh}
                        hasMore={hasMore}
                        data={response.Results}
                        page={response.Pagination.Page}
                        loadMoreData={() => {
                            // 请求下一页数据
                            update(+response.Pagination.Page + 1)
                        }}
                        rowKey='ResultID'
                        defItemHeight={37}
                        renderRow={(rowData: SyntaxFlowResult, index: number) => {
                            return (
                                <div className={styles["history-item-box"]}>
                                    <YakitPopover
                                        placement={"rightTop"}
                                        content={
                                            <div style={{width: 600, height: 300}}>
                                                <YakitEditor
                                                    value={rowData.RuleContent}
                                                    readOnly={true}
                                                    noMiniMap={true}
                                                    type={SyntaxFlowMonacoSpec}
                                                ></YakitEditor>
                                            </div>
                                        }
                                    >
                                        <div
                                            className={styles["history-item"]}
                                            onClick={() => {
                                                // 审计结果
                                                setAuditType("result")
                                                onAuditRuleSubmitFun("", [{Key: "result_id", Value: rowData.ResultID}])
                                                // 规则编写
                                                onOpenEditorDetails("ruleEditor")
                                                setTimeout(() => {
                                                    emiter.emit("onResetAuditRule", rowData.RuleContent)
                                                }, 200)
                                            }}
                                        >
                                            <div className={styles["title"]}>
                                                <div>{`ID:${rowData.ResultID}`}</div>
                                                <div style={{overflow: "hidden"}}>
                                                    <YakitTag
                                                        color='info'
                                                        style={{
                                                            whiteSpace: "normal",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            display: "block",
                                                            lineHeight: "14px"
                                                        }}
                                                    >
                                                        风险个数：{rowData.RiskCount}
                                                    </YakitTag>
                                                </div>
                                            </div>
                                            <div className={styles["extra"]}>{getTagByKind(rowData.Kind)}</div>
                                        </div>
                                    </YakitPopover>
                                </div>
                            )
                        }}
                    />
                </div>
            </div>
        )
    })
)

export const AuditModalForm: React.FC<AuditModalFormProps> = (props) => {
    const {onCancel, isExecuting, onStartAudit, form, isVerifyForm, activeKey, setActiveKey} = props
    const [loading, setLoading] = useState<boolean>(true)
    const [plugin, setPlugin] = useState<YakScript>()
    const [agentConfigModalVisible, setAgentConfigModalVisible] = useState<boolean>(false)

    // 获取参数
    const handleFetchParams = useDebounceFn(
        useMemoizedFn(async () => {
            try {
                const newPlugin = await grpcFetchLocalPluginDetail({Name: "SSA 项目探测"}, true)
                setLoading(false)
                setPlugin(newPlugin)
            } catch (error) {}
        }),
        {wait: 300}
    ).run

    useEffect(() => {
        handleFetchParams()
    }, [])

    /** 填充表单默认值 */
    const handleInitFormValue = useMemoizedFn((arr: YakParamProps[]) => {
        // 表单内数据
        let formData = {}
        if (form) formData = form.getFieldsValue() || {}
        let defaultValue = {...formData}
        let newFormValue = {}
        arr.forEach((ele) => {
            let initValue = formData[ele.Field] || ele.Value || ele.DefaultValue
            const value = getValueByType(initValue, ele.TypeVerbose)
            newFormValue = {
                ...newFormValue,
                [ele.Field]: value
            }
        })
        form.setFieldsValue({...cloneDeep(defaultValue || {}), ...newFormValue})
    })

    /** 选填参数 */
    const groupParams = useMemo(() => {
        const arr =
            plugin?.Params.filter(
                (item) => !item.Required && (item.Group || "").length > 0
            ) || []

        return ParamsToGroupByGroupName(arr)
    }, [plugin?.Params])

    /** 必填参数（头部展示） */
    const groupParamsHeader = useMemo(() => {
        const arr =
            plugin?.Params.filter(
                (item) => item.Required && (item.Group || "").length > 0
            ) || []
        handleInitFormValue(arr)
        return ParamsToGroupByGroupName(arr)
    }, [plugin?.Params])

    /** 自定义控件数据 */
    const customParams = useMemo(() => {
        const defalut: FormExtraSettingProps = {
            double: false,
            data: []
        }
        try {
            const arr = plugin?.Params.filter((item) => !item.Required) || []
            const customArr = arr.filter((item) => (item.Group || "").length === 0)
            // 项目分片
            const peephole = customArr.find((item) => item.Field === "peephole")?.ExtraSetting || "{}"
            const language = customArr.find((item) => item.Field === "language")?.ExtraSetting || "{}"

            const peepholeArr: FormExtraSettingProps = JSON.parse(peephole) || {
                double: false,
                data: []
            }
            const languageArr: FormExtraSettingProps = JSON.parse(language) || {
                double: false,
                data: []
            }
            return {
                peepholeArr,
                languageArr
            }
        } catch (error) {
            return {
                peepholeArr: defalut,
                languageArr: defalut
            }
        }
    }, [plugin?.Params])

    const onStartExecute = useMemoizedFn(() => {
        if (form && plugin) {
            form.validateFields()
                .then(async (value: any) => {
                    const requestParams: DebugPluginRequest = {
                        Code: plugin.Content,
                        PluginType: plugin.Type,
                        Input: value["Input"] || "",
                        HTTPRequestTemplate: {} as HTTPRequestBuilderParams,
                        ExecParams: [],
                        PluginName: ""
                    }

                    requestParams.ExecParams = getYakExecutorParam({...value})
                    if (customParams.peepholeArr.data.length > 0) {
                        requestParams.ExecParams = requestParams.ExecParams.map((item) => {
                            if (item.Key === "peephole") {
                                return {...item, Value: customParams.peepholeArr?.data[item.Value]?.value}
                            }
                            return item
                        })
                    }
                    onStartAudit(requestParams)
                })
                .catch(() => {})
        }
    })

    return (
        <YakitSpin spinning={loading}>
            <Form
                style={{padding: 16}}
                form={form}
                size='small'
                labelCol={{span: 6}}
                wrapperCol={{span: 18}}
                labelWrap={true}
                validateMessages={{
                    /* eslint-disable no-template-curly-in-string */
                    required: "${label} 是必填字段"
                }}
                className={styles["audit-modal-form"]}
            >
                <Form.Item name='target' label='项目路径' rules={[{required: true, message: "请输入项目路径"}]}>
                    <YakitDragger
                        isShowPathNumber={false}
                        selectType='all'
                        renderType='textarea'
                        multiple={false}
                        help='可将项目文件拖入框内或点击此处'
                        disabled={false}
                        // accept=""
                    />
                </Form.Item>

                {groupParamsHeader.length > 0 && (
                    <>
                        {groupParamsHeader.map((item, index) => (
                            <>
                                {item.data?.map((formItem) => (
                                    <React.Fragment key={formItem.Field + formItem.FieldVerbose}>
                                        <FormContentItemByType item={formItem} pluginType={"yak"} />
                                    </React.Fragment>
                                ))}
                            </>
                        ))}
                    </>
                )}

                {groupParams.length > 0 && (
                    <>
                        <div className={styles["additional-params-divider"]}>
                            <div className={styles["text-style"]}>额外参数 (非必填)</div>
                            <div className={styles["divider-style"]} />
                        </div>
                        <YakitCollapse
                            className={styles["extra-params-divider"]}
                            activeKey={activeKey}
                            onChange={(v) => {
                                setActiveKey(v)
                            }}
                        >
                            <YakitPanel key='defalut' header={`参数组`}>
                                <Form.Item name='language' label='语言'>
                                    <YakitSelect options={customParams.languageArr.data} />
                                </Form.Item>
                                <Form.Item
                                    name='proxy'
                                    label='代理'
                                    extra={
                                        <div
                                            className={styles["agent-down-stream-proxy"]}
                                            onClick={() => setAgentConfigModalVisible(true)}
                                        >
                                            配置代理认证
                                        </div>
                                    }
                                >
                                    <YakitAutoComplete placeholder='例如 http://127.0.0.1:7890 或者 socks5://127.0.0.1:7890' />
                                </Form.Item>
                                <Form.Item
                                    name='peephole'
                                    label='编译速度'
                                    help='小文件无需配置，大文件可根据需求选择，速度越快，精度越小'
                                >
                                    <Slider
                                        style={{width: 300}}
                                        dots
                                        min={0}
                                        max={3}
                                        tipFormatter={(value) => {
                                            switch (value) {
                                                case 0:
                                                    return "关闭，精度IV"
                                                case 1:
                                                    return "慢速，精度III"
                                                case 2:
                                                    return "中速，精度II"
                                                case 3:
                                                    return "快速，精度I"
                                                default:
                                                    return value
                                            }
                                        }}
                                    />
                                </Form.Item>
                            </YakitPanel>
                        </YakitCollapse>
                        <ExtraParamsNodeByType
                            extraParamsGroup={groupParams}
                            pluginType={"yak"}
                            isDefaultActiveKey={false}
                        />
                    </>
                )}
            </Form>
            <div className={styles["audit-form-footer"]}>
                <YakitButton type='outline2' onClick={onCancel}>
                    取消
                </YakitButton>
                <YakitButton onClick={onStartExecute} loading={isVerifyForm}>
                    {isVerifyForm ? "正在校验" : "开始编译"}
                </YakitButton>
            </div>
            <AgentConfigModal
                agentConfigModalVisible={agentConfigModalVisible}
                onCloseModal={() => setAgentConfigModalVisible(false)}
                generateURL={(url) => {
                    form.setFieldsValue({proxy: url})
                }}
            />
        </YakitSpin>
    )
}

// 公共封装组件用于编译项目
export const AuditModalFormModal: React.FC<AuditModalFormModalProps> = (props) => {
    const {onCancel, onSuccee, title, warrpId, initForm} = props
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
    const [form] = Form.useForm()
    // 是否表单校验中
    const [isVerifyForm, setVerifyForm] = useState<boolean>(false)
    const [activeKey, setActiveKey] = useState<string | string[]>()
    // 由于此流还包含表单校验功能 因此需判断校验是否通过，是否已经真正的执行了
    const isRealStartRef = useRef<boolean>(false)

    // 执行审计
    const onStartAudit = useMemoizedFn((requestParams: DebugPluginRequest) => {
        debugPluginStreamEvent.reset()
        setRuntimeId("")

        apiDebugPlugin({params: requestParams, token: tokenRef.current}).then(() => {
            isRealStartRef.current = false
            debugPluginStreamEvent.start()
            setVerifyForm(true)
        })
    })

    const onCancelAudit = () => {
        logInfoRef.current = []
        setShowRunAuditModal(false)
        debugPluginStreamEvent.cancel()
        debugPluginStreamEvent.reset()
        onCancel()
    }

    useUpdateEffect(() => {
        if (!isRealStartRef.current) {
            const startLog = streamInfo.logState.find((item) => item.level === "code")
            if (startLog && startLog.data) {
                try {
                    const verifyStart = JSON.parse(startLog?.data) as VerifyStartProps
                    const {kind, msg} = verifyStart.error
                    setVerifyForm(false)
                    pathCacheRef.current = verifyStart.program_name
                    switch (kind) {
                        // 链接错误
                        case "connectFailException":
                            warn("链接错误")
                            setActiveKey(["defalut"])
                            setTimeout(() => {
                                form.setFields([
                                    {
                                        name: "proxy",
                                        errors: [msg] // 设置错误信息
                                    },
                                    {
                                        name: "language",
                                        errors: []
                                    }
                                ])
                            }, 200)

                            break
                        // 文件类型错误
                        case "fileTypeException":
                            form.setFields([
                                {
                                    name: "proxy",
                                    errors: []
                                },
                                {
                                    name: "language",
                                    errors: []
                                }
                            ])
                            warn(
                                "输入文件无法解析，请检查输入的路径为文件夹或jar/war/zip文件，或链接是否包含http/https/git协议头"
                            )
                            break
                        // 文件不存在错误
                        case "fileNotFoundException":
                            form.setFields([
                                {
                                    name: "proxy",
                                    errors: []
                                },
                                {
                                    name: "language",
                                    errors: []
                                }
                            ])
                            warn(
                                "路径错误或者输入的内容无法识别，请检查输入的路径是否存在文件或文件夹或链接是否有http/https/git协议头。"
                            )
                            break
                        // 无法自动确定语言
                        case "languageNeedSelectException":
                            warn("该输入无法自动确定语言，请指定编译语言")
                            setActiveKey(["defalut"])
                            form.setFields([
                                {
                                    name: "language",
                                    errors: [msg] // 设置错误信息
                                },
                                {
                                    name: "proxy",
                                    errors: []
                                }
                            ])
                            break
                        default:
                            //  真正的启动
                            isRealStartRef.current = true
                            setIsExecuting(true)
                            setShowCompileModal(false)
                            setShowRunAuditModal(true)
                            break
                    }
                } catch (error) {
                    failed("启动解析失败")
                }
            }
        }

        if (isRealStartRef.current) {
            const progress = Number((streamInfo.progressState.map((item) => item.progress)[0] || 0).toFixed(4))
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
        }
    }, [streamInfo])

    useEffect(() => {
        if (initForm) {
            form.setFieldsValue({...initForm})
        }
    }, [initForm])
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
                width={540}
            >
                <AuditModalForm
                    onCancel={onCancel}
                    isExecuting={isExecuting}
                    onStartAudit={onStartAudit}
                    form={form}
                    isVerifyForm={isVerifyForm}
                    activeKey={activeKey}
                    setActiveKey={setActiveKey}
                />
            </YakitModal>
            {/* 编译项目进度条弹窗 */}
            <YakitModal
                centered
                getContainer={warrpId || document.getElementById("audit-code") || document.body}
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

// 公共封装组件用于重新编译
export const AfreshAuditModal: React.FC<AfreshAuditModalProps> = (props) => {
    const {afreshName, setAfreshName, onSuccee, warrpId} = props
    const tokenRef = useRef<string>(randomString(40))
    /** 是否在执行中 */
    const [isExecuting, setIsExecuting] = useState<boolean>(false)
    const [runtimeId, setRuntimeId] = useState<string>("")
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

    useEffect(() => {
        // 初次打开时带参执行
        if (afreshName) {
            const requestParams: DebugPluginRequest = {
                Code: "",
                PluginType: "yak",
                Input: "",
                HTTPRequestTemplate: {} as HTTPRequestBuilderParams,
                ExecParams: [
                    {
                        Key: "programName",
                        Value: afreshName
                    }
                ],
                PluginName: "SSA 项目重编译"
            }

            debugPluginStreamEvent.reset()
            setRuntimeId("")
            apiDebugPlugin({params: requestParams, token: tokenRef.current}).then(() => {
                setIsExecuting(true)
                debugPluginStreamEvent.start()
            })
        }
    }, [afreshName])

    const onCancelAudit = () => {
        logInfoRef.current = []
        debugPluginStreamEvent.cancel()
        debugPluginStreamEvent.reset()
        setAfreshName(undefined)
    }

    useEffect(() => {
        const progress = Number((streamInfo.progressState.map((item) => item.progress)[0] || 0).toFixed(4))
        // 当任务结束时 跳转打开编译列表
        if (progress === 1) {
            setTimeout(() => {
                logInfoRef.current = []
                onCancelAudit()
                onSuccee()
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
            {/* 重新编译项目进度条弹窗 */}
            <YakitModal
                centered
                getContainer={warrpId || document.body}
                visible={!!afreshName}
                title={null}
                footer={null}
                width={520}
                type='white'
                closable={false}
                hiddenHeader={true}
                bodyStyle={{padding: 0}}
            >
                <AuditCodeStatusInfo
                    title={"项目重新编译中..."}
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

export const ProjectManagerEditForm: React.FC<ProjectManagerEditFormProps> = memo((props) => {
    const {onClose, record, setData} = props
    const {Name, Description} = record
    const [form] = Form.useForm()

    useEffect(() => {
        if (record) {
            form.setFieldsValue({
                Name,
                Description
            })
        }
    }, [])

    const onFinish = useMemoizedFn(async (v: {Name: string; Description: string}) => {
        ipcRenderer
            .invoke("UpdateSSAProgram", {
                ProgramInput: v
            })
            .then(() => {
                setData((pre) =>
                    pre.map((item) => {
                        if (item.Name === v.Name) {
                            return {
                                ...item,
                                Description: v.Description
                            }
                        }
                        return item
                    })
                )
                onClose()
            })
            .catch((e) => {
                yakitNotify("error", "编辑列表数据失败：" + e)
            })
    })

    return (
        <div className={styles["project-manager-edit-form"]}>
            <Form layout='vertical' form={form} onFinish={(v) => onFinish(v)}>
                <Form.Item name='Name' label='项目名称' rules={[{required: true, message: "该项为必填"}]}>
                    <YakitInput disabled size='small' placeholder='请输入项目名称...' />
                </Form.Item>
                <Form.Item name='Description' label='项目描述'>
                    <YakitInput.TextArea rows={3} allowClear size='small' placeholder='请输入项目描述...' />
                </Form.Item>
                <div className={styles["opt-btn"]}>
                    <YakitButton
                        size='large'
                        onClick={() => {
                            onClose()
                        }}
                        type='outline2'
                    >
                        取消
                    </YakitButton>
                    <YakitButton size='large' type='primary' htmlType={"submit"}>
                        保存
                    </YakitButton>
                </div>
            </Form>
        </div>
    )
})

export const AuditHistoryTable: React.FC<AuditHistoryTableProps> = memo((props) => {
    const {pageType, onClose, onExecuteAudit, warrpId} = props
    const {projectName} = useStore()
    const [afreshName, setAfreshName] = useState<string>()
    const [refresh, setRefresh] = useControllableValue<boolean>(props, {
        defaultValue: false,
        valuePropName: "refresh",
        trigger: "setRefresh"
    })
    const [params, setParams] = useState<QuerySSAProgramsProps>({
        Keyword: ""
    })
    const [pagination, setPagination] = useState<Paging>(genDefaultPagination(20))
    const [loading, setLoading] = useState<boolean>(false)
    const [data, setData] = useState<SSAProgramResponse[]>([])
    const [total, setTotal] = useState<number>(0)
    const [hasMore, setHasMore] = useState<boolean>(false)

    const [isAllSelect, setIsAllSelect] = useState<boolean>(false)
    const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])
    // 接口是否正在请求
    const isGrpcRef = useRef<boolean>(false)
    const afterId = useRef<number>()

    const onSelectAll = useMemoizedFn(() => {
        if (isAllSelect) {
            setIsAllSelect(false)
            setSelectedRowKeys([])
        } else {
            setIsAllSelect(true)
            setSelectedRowKeys(data.map((item) => item.Id))
        }
    })
    const onSelectChange = useMemoizedFn((c: boolean, keys: string, rows: SSAProgramResponse) => {
        if (c) {
            setSelectedRowKeys([...selectedRowKeys, rows.Id])
        } else {
            setIsAllSelect(false)
            const newSelectedRowKeys = selectedRowKeys.filter((ele) => ele !== rows.Id)
            setSelectedRowKeys(newSelectedRowKeys)
        }
    })

    useEffect(() => {
        update(true)
    }, [refresh])

    const update = useMemoizedFn(async (reload?: boolean, page?: number, limit?: number) => {
        if (isGrpcRef.current) return
        isGrpcRef.current = true
        const paginationProps = {
            ...pagination,
            Page: page || 1,
            Limit: limit || pagination.Limit
        }
        if (reload) {
            afterId.current = undefined
            setLoading(true)
            setRefresh(!refresh)
        }

        ipcRenderer
            .invoke("QuerySSAPrograms", {
                Filter: {...params, AfterID: reload ? undefined : parseInt(afterId.current + "")},
                Pagination: paginationProps
            })
            .then((item: QueryGeneralResponse<SSAProgramResponse>) => {
                const newData = reload ? item.Data : data.concat(item.Data)
                const isMore = item.Data.length < item.Pagination.Limit || newData.length === total
                setHasMore(!isMore)
                if (isAllSelect) setSelectedRowKeys(newData.map((item) => item.Id))

                setData(newData)
                setPagination(item.Pagination || genDefaultPagination(200))
                if (reload) {
                    setTotal(item.Total)
                } else {
                    getTotalFun()
                }
            })
            .catch((e) => {
                yakitNotify("error", "获取列表数据失败：" + e)
            })
            .finally(() =>
                setTimeout(() => {
                    setLoading(false)
                    isGrpcRef.current = false
                }, 300)
            )
    })

    const getTotalFun = useMemoizedFn(() => {
        const paginationProps = {
            ...pagination,
            Page: 1,
            Limit: pagination.Limit
        }
        ipcRenderer
            .invoke("QuerySSAPrograms", {
                Filter: params,
                Pagination: paginationProps
            })
            .then((item: QueryGeneralResponse<SSAProgramResponse>) => {
                setTotal(item.Total)
            })
    })

    const onDelete = useMemoizedFn(async (params: {DeleteAll?: boolean; Filter?: QuerySSAProgramsProps}) => {
        try {
            setLoading(true)
            ipcRenderer
                .invoke("DeleteSSAPrograms", {
                    ...params
                })
                .then(() => {
                    update(true)
                    setIsAllSelect(false)
                    setSelectedRowKeys([])
                })
        } catch (error) {
            setLoading(false)
            failed(`删除失败${error}`)
        }
    })

    const columns: VirtualListColumns<SSAProgramResponse>[] = [
        {
            title: "项目名称",
            dataIndex: "Name",
            render: (text, record) => {
                return (
                    <Tooltip title={record.Name}>
                        <div className={classNames("yakit-content-single-ellipsis", styles["audit-text"])}>
                            {record.Name}
                        </div>
                    </Tooltip>
                )
            }
        },
        {
            title: "语言",
            dataIndex: "Language",
            width: 60
        },
        {
            title: "项目描述",
            dataIndex: "Description",
            render: (text, record) => {
                return (
                    <Tooltip title={text} overlayClassName={styles["tooltip-line-feed"]}>
                        <div className={classNames("yakit-content-single-ellipsis", styles["audit-text"])}>{text}</div>
                    </Tooltip>
                )
            }
        },
        {
            title: "存储路径",
            dataIndex: "Dbpath",
            render: (text, record) => {
                return (
                    <>
                        <div className={classNames("yakit-content-single-ellipsis", styles["audit-text"])}>
                            {record.Dbpath}
                        </div>
                        <Tooltip title={"复制"}>
                            <div className={styles["extra-icon"]} onClick={() => setClipboardText(record.Dbpath)}>
                                <OutlineDocumentduplicateIcon />
                            </div>
                        </Tooltip>
                    </>
                )
            }
        },
        {
            title: "漏洞数",
            dataIndex: "LowRiskNumber",
            render: (text, record) => {
                const {CriticalRiskNumber, HighRiskNumber, WarnRiskNumber, LowRiskNumber, InfoRiskNumber} = record
                const countNum =
                    parseInt(CriticalRiskNumber + "") +
                    parseInt(HighRiskNumber + "") +
                    parseInt(WarnRiskNumber + "") +
                    parseInt(LowRiskNumber + "") +
                    parseInt(InfoRiskNumber + "")
                return <>{countNum !== 0 ? <YakitTag color='info'>{countNum}</YakitTag> : "-"}</>
            },
            width: 120
        },
        {
            title: "编译时间",
            dataIndex: "CreateAt",
            render: (text, record) => {
                return <div className={styles["audit-time"]}>{formatTimestamp(text)}</div>
            },
            width: 140
        },
        {
            title: "操作",
            dataIndex: "action",
            width: 200,
            render: (text, record) => {
                return (
                    <div className={styles["audit-opt"]}>
                        <Tooltip
                            title={
                                record.Recompile ? "该项目是由旧引擎编译，现在编译规则已更新，建议重新编译" : "重新编译"
                            }
                        >
                            <YakitPopconfirm
                                title={
                                    <>
                                        重新编译将会删掉该项目所有数据后再编译,
                                        <br />
                                        请问是否重新编译？
                                    </>
                                }
                                onConfirm={() => setAfreshName(record.Name)}
                            >
                                <Badge dot={record.Recompile} style={{top: 6, right: 7}}>
                                    <YakitButton type='text' icon={<OutlineReloadScanIcon />} />
                                </Badge>
                            </YakitPopconfirm>
                        </Tooltip>

                        <Tooltip title={"代码扫描"}>
                            <YakitButton
                                type='text'
                                icon={<OutlineScanIcon />}
                                onClick={() => {
                                    emiter.emit(
                                        "openPage",
                                        JSON.stringify({
                                            route: YakitRoute.YakRunner_Code_Scan,
                                            params: {
                                                projectName: [record.Name],
                                                selectGroupListByKeyWord: [record.Language]
                                            }
                                        })
                                    )
                                    if (pageType === "aucitCode") {
                                        onClose && onClose()
                                    }
                                }}
                            />
                        </Tooltip>

                        {/* 此处的Tooltip会导致页面抖动(待处理) */}
                        <Tooltip title={"打开项目"}>
                            <YakitButton
                                type='text'
                                icon={<OutlineArrowcirclerightIcon />}
                                onClick={() => {
                                    if (pageType === "projectManager") {
                                        // 跳转到审计页面的参数
                                        const params: AuditCodePageInfoProps = {
                                            Schema: "syntaxflow",
                                            Location: record.Name,
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
                                        emiter.emit("onCodeAuditOpenAuditTree", record.Name)
                                    }
                                }}
                            />
                        </Tooltip>
                        <Tooltip title={"扫描历史"}>
                            <YakitButton
                                type='text'
                                icon={<OutlineClockIcon />}
                                onClick={() => {
                                    emiter.emit(
                                        "openPage",
                                        JSON.stringify({
                                            route: YakitRoute.YakRunner_ScanHistory,
                                            params: {
                                                Programs: [record.Name]
                                            }
                                        })
                                    )
                                }}
                            />
                        </Tooltip>
                        <Divider type={"vertical"} style={{margin: 0}} />
                        <FuncFilterPopover
                            icon={<OutlineDotshorizontalIcon />}
                            button={{type: "text2"}}
                            menu={{
                                type: "primary",
                                data: [
                                    {
                                        key: "edit",
                                        label: "编辑",
                                        itemIcon: <OutlinePencilaltIcon />,
                                        type: undefined
                                    },
                                    {
                                        key: "del",
                                        label: "删除",
                                        itemIcon: <OutlineTrashIcon />,
                                        type: "danger"
                                    }
                                ],
                                onClick: ({key}) => handleOperates(key, record)
                            }}
                            placement='bottomRight'
                        />
                        {/* <YakitDropdownMenu
                            menu={{
                                width: 40,
                                data: [
                                    {
                                        key: "edit",
                                        label: (
                                            <YakitButton
                                                type='text'
                                                icon={<OutlinePencilaltIcon />}
                                                onClick={() => {
                                                    const m = showYakitModal({
                                                        title: "编辑",
                                                        width: 448,
                                                        type: "white",
                                                        footer: null,
                                                        centered: true,
                                                        content: (
                                                            <ProjectManagerEditForm
                                                                record={record}
                                                                setData={setData}
                                                                onClose={() => m.destroy()}
                                                            />
                                                        )
                                                    })
                                                }}
                                            />
                                        )
                                    },
                                    {
                                        key: "del",
                                        label: (
                                            <YakitPopconfirm
                                                title={`确定删除${record.Name}`}
                                                onConfirm={() =>
                                                    onDelete({
                                                        Filter: {
                                                            Ids: [parseInt(record.Id + "")]
                                                        }
                                                    })
                                                }
                                            >
                                                <YakitButton type='text' danger icon={<OutlineTrashIcon />} />
                                            </YakitPopconfirm>
                                        )
                                    }
                                ]
                            }}
                            dropdown={{
                                trigger: ["click"],
                                placement: "bottom"
                            }}
                        >
                            <YakitButton type='text' icon={<OutlineDotshorizontalIcon />} />
                        </YakitDropdownMenu> */}
                    </div>
                )
            }
        }
    ]

    const handleOperates = (type: string, record) => {
        if (type === "del") {
            onDelete({
                Filter: {
                    Ids: [parseInt(record.Id + "")]
                }
            })
        } else if (type === "edit") {
            const m = showYakitModal({
                title: "编辑",
                width: 448,
                type: "white",
                footer: null,
                centered: true,
                content: <ProjectManagerEditForm record={record} setData={setData} onClose={() => m.destroy()} />
            })
        }
    }

    const loadMoreData = useMemoizedFn(() => {
        if (data.length > 0) {
            afterId.current = data[data.length - 1].Id
            update()
        }
    })

    return (
        <div
            className={styles["audit-history-table"]}
            id='audit-history-table'
            onKeyDown={(event) => event.stopPropagation()}
        >
            <div className={styles["header"]}>
                <div className={styles["main"]}>
                    <div className={styles["title"]}>已编译项目</div>
                    <div className={styles["sub-title"]}>
                        <div className={styles["text"]}>Total</div>
                        <div className={styles["number"]}>{total}</div>
                    </div>
                    <Divider type={"vertical"} style={{margin: 0}} />
                    <div className={styles["sub-title"]}>
                        <div className={styles["text"]}>Selected</div>
                        <div className={styles["number"]}>{selectedRowKeys.length}</div>
                    </div>
                </div>
                <div className={styles["extra"]}>
                    <YakitInput.Search
                        prefix={<OutlineSearchIcon className={styles["search-icon"]} />}
                        placeholder='请输入关键词搜索'
                        value={params.Keyword}
                        onChange={(e) => {
                            setParams({...params, Keyword: e.target.value})
                        }}
                        onSearch={() => {
                            setTimeout(() => {
                                update(true)
                            }, 100)
                        }}
                    />
                    <YakitPopconfirm
                        title={selectedRowKeys.length > 0 ? "确定删除勾选数据吗？" : "确定清空列表数据吗?"}
                        onConfirm={() => {
                            if (selectedRowKeys.length === 0) {
                                onDelete({
                                    DeleteAll: true
                                })
                            } else {
                                onDelete({
                                    Filter: {
                                        Ids: selectedRowKeys.map((item) => parseInt(item + ""))
                                    }
                                })
                            }
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
                    <YakitButton type='text2' icon={<OutlineRefreshIcon />} onClick={(e) => update(true)} />
                    {onClose && <YakitButton type='text2' icon={<OutlineXIcon />} onClick={onClose} />}
                </div>
            </div>

            <div className={styles["table"]}>
                <YakitVirtualList<SSAProgramResponse>
                    className={styles["audit-virtual-list"]}
                    loading={loading}
                    refresh={refresh}
                    hasMore={hasMore}
                    columns={columns}
                    data={data}
                    page={pagination.Page}
                    loadMoreData={loadMoreData}
                    renderKey='Id'
                    rowSelection={{
                        isAll: isAllSelect,
                        type: "checkbox",
                        selectedRowKeys,
                        onSelectAll: onSelectAll,
                        onChangeCheckboxSingle: onSelectChange
                    }}
                />
            </div>

            <AfreshAuditModal
                afreshName={afreshName}
                setAfreshName={setAfreshName}
                onSuccee={() => update(true)}
                warrpId={warrpId || document.getElementById("audit-history-table")}
            />
        </div>
    )
})
