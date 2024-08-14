import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {AuditCodeProps, AuditNodeProps, AuditTreeNodeProps, AuditTreeProps, AuditYakUrlProps} from "./AuditCodeType"
import classNames from "classnames"
import styles from "./AuditCode.module.scss"
import {YakScript} from "@/pages/invoker/schema"
import {Divider, Form, FormInstance, Tooltip, Tree} from "antd"
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
import {useDebounceFn, useInViewport, useMemoizedFn, useSize, useThrottleEffect, useUpdateEffect} from "ahooks"
import {grpcFetchLocalPluginDetail} from "@/pages/pluginHub/utils/grpc"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {apiDebugPlugin, DebugPluginRequest} from "@/pages/plugins/utils"
import {HTTPRequestBuilderParams} from "@/models/HTTPRequestBuilder"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {yakitNotify} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {CustomPluginExecuteFormValue} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType"
import {defPluginExecuteFormValue} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/constants"
import useStore from "../hooks/useStore"
import {getNameByPath, grpcFetchAuditTree, grpcFetchDeleteAudit, loadAuditFromYakURLRaw} from "../utils"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {
    OutlinCompileIcon,
    OutlineArrowcirclerightIcon,
    OutlineChevronrightIcon,
    OutlineDeprecatedIcon,
    OutlineSearchIcon,
    OutlineTrashIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import emiter from "@/utils/eventBus/eventBus"
import {YakitTextArea} from "@/components/yakitUI/YakitTextArea/YakitTextArea"
import {LoadingOutlined} from "@ant-design/icons"
import {StringToUint8Array} from "@/utils/str"
import {clearMapAuditDetail, getMapAuditDetail, setMapAuditDetail} from "./AuditTree/AuditMap"
import {clearMapAuditChildDetail, getMapAuditChildDetail, setMapAuditChildDetail} from "./AuditTree/ChildMap"
import {SolidExclamationIcon, SolidInformationcircleIcon, SolidXcircleIcon} from "@/assets/icon/solid"
import {AuditEmiterYakUrlProps, OpenFileByPathProps} from "../YakRunnerType"
import {FileNodeMapProps} from "../FileTree/FileTreeType"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {RequestYakURLResponse, YakURLResource} from "@/pages/yakURLTree/data"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {CodeRangeProps} from "../RightAuditDetail/RightAuditDetail"
import {JumpToEditorProps} from "../BottomEditorDetails/BottomEditorDetailsType"
import {formatTimestamp} from "@/utils/timeUtil"
import {QuestionMarkCircleIcon} from "@/assets/newIcon"
import useDispatcher from "../hooks/useDispatcher"

const {ipcRenderer} = window.require("electron")

export const AuditTreeNode: React.FC<AuditTreeNodeProps> = memo((props) => {
    const {info, foucsedKey, setFoucsedKey, onSelected, onExpanded, expandedKeys, onContext} = props

    const handleSelect = useMemoizedFn(() => {
        onSelected(true, info)
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
                    onContextMenu={() => onContext(info)}
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
                        <div
                            className={classNames(styles["content-body"], "yakit-content-single-ellipsis")}
                            title={info.name}
                        >
                            {info.name}
                        </div>
                        {info.ResourceType === "variable" && <div className={styles["count"]}>{info.Size}</div>}
                    </div>
                </div>
            )}
        </>
    )
})

export const AuditTree: React.FC<AuditTreeProps> = memo((props) => {
    const {data, expandedKeys, setExpandedKeys, onLoadData, foucsedKey, setFoucsedKey, onJump} = props
    const treeRef = useRef<any>(null)
    const wrapper = useRef<HTMLDivElement>(null)
    const [inViewport] = useInViewport(wrapper)
    const size = useSize(wrapper)

    const handleSelect = useMemoizedFn((selected: boolean, node: AuditNodeProps) => {
        console.log("handleSelect", selected, node)
        setFoucsedKey(node.id)
        onJump(node)
    })

    const handleExpand = useMemoizedFn((expanded: boolean, node: AuditNodeProps) => {
        console.log("expanded", expanded, node)
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
                const OpenFileByPathParams: OpenFileByPathProps = {
                    params: {
                        path: url,
                        name
                    }
                }
                emiter.emit("onOpenFileByPath", JSON.stringify(OpenFileByPathParams))
                setTimeout(() => {
                    const obj: JumpToEditorProps = {
                        selections: {
                            startLineNumber: start_line,
                            startColumn: start_column,
                            endLineNumber: end_line,
                            endColumn: end_column
                        },
                        id: url
                    }
                    emiter.emit("onJumpEditorDetail", JSON.stringify(obj))
                }, 100)
            }
        } catch (error) {}
    })

    return (
        <div ref={wrapper} className={styles["audit-tree"]}>
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
                    return (
                        <AuditTreeNode
                            info={nodeData}
                            foucsedKey={foucsedKey}
                            expandedKeys={expandedKeys}
                            onSelected={handleSelect}
                            onExpanded={handleExpand}
                            setFoucsedKey={setFoucsedKey}
                            onContext={onContext}
                        />
                    )
                }}
            />
        </div>
    )
})

const TopId = "top-message"

export const AuditCode: React.FC<AuditCodeProps> = (props) => {
    const {projectNmae, loadTreeType} = useStore()

    const [value, setValue] = useState<string>("")
    const [expandedKeys, setExpandedKeys] = React.useState<string[]>([])
    const [foucsedKey, setFoucsedKey] = React.useState<string>("")

    const [refreshTree, setRefreshTree] = useState<boolean>(false)
    const onRefreshAuditTreeFun = useMemoizedFn(() => {
        setRefreshTree(!refreshTree)
    })

    useEffect(() => {
        // 刷新审计树
        emiter.on("onRefreshAuditTree", onRefreshAuditTreeFun)
        return () => {
            emiter.off("onRefreshAuditTree", onRefreshAuditTreeFun)
        }
    }, [])

    const initAuditTree = useMemoizedFn((ids: string[], depth: number) => {
        return ids.map((id) => {
            const itemDetail = getMapAuditDetail(id)
            let obj: AuditNodeProps = {...itemDetail, depth}
            const childArr = getMapAuditChildDetail(id)

            if (itemDetail.ResourceType === "variable" || itemDetail.ResourceType === TopId) {
                obj.children = initAuditTree(childArr, depth + 1)
                obj.isLeaf = false
            } else {
                obj.isLeaf = true
            }

            return obj
        })
    })

    const auditDetailTree = useMemo(() => {
        const ids: string[] = getMapAuditChildDetail("/")
        const initTree = initAuditTree(ids, 1)
        if (initTree.length > 0) {
            initTree.push({
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
        console.log("initTree---", initTree)

        return initTree
    }, [refreshTree])

    const lastValue = useRef<string>("")

    const handleAuditLoadData = useMemoizedFn((id: string) => {
        return new Promise(async (resolve, reject) => {
            // 校验其子项是否存在
            const childArr = getMapAuditChildDetail(id)
            console.log("xxx", id, childArr)
            if (id === TopId) {
                resolve("")
                return
            }
            if (childArr.length > 0) {
                emiter.emit("onRefreshFileTree")
                resolve("")
            } else {
                if (lastValue.current.length > 0) {
                    const path = id
                    const params: AuditYakUrlProps = {
                        Schema: "syntaxflow",
                        Location: projectNmae || "",
                        Path: path
                    }
                    const body = StringToUint8Array(lastValue.current)
                    const result = await loadAuditFromYakURLRaw(params, body)
                    console.log("result---", result)
                    if (result) {
                        let variableIds: string[] = []
                        result.Resources.forEach((item, index) => {
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
                            emiter.emit("onRefreshAuditTree")
                            resolve("")
                        }, 300)
                    } else {
                        reject()
                    }
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
        emiter.emit("onRefreshAuditTree")
    })

    useEffect(() => {
        if (loadTreeType === "file") {
            setValue("")
            resetMap()
        }
    }, [loadTreeType])

    useUpdateEffect(() => {
        setValue("")
        resetMap()
    }, [projectNmae])

    const onSubmit = useMemoizedFn(async () => {
        resetMap()
        const path: string = "/"
        const params: AuditYakUrlProps = {
            Schema: "syntaxflow",
            Location: projectNmae || "",
            Path: path
        }
        const body = StringToUint8Array(value)
        lastValue.current = value
        const result = await loadAuditFromYakURLRaw(params, body)
        console.log("result---", result)
        if (result) {
            const TopId = "top-message"
            let messageIds: string[] = []
            let variableIds: string[] = []
            // 构造树结构
            result.Resources.forEach((item, index) => {
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
            emiter.emit("onRefreshAuditTree")
        }
    })

    const onJump = useMemoizedFn((v: AuditNodeProps) => {
        if (v.ResourceType === "value") {
            const rightParams: AuditEmiterYakUrlProps = {
                Schema: "syntaxflow",
                Location: projectNmae || "",
                Path: v.id,
                Body: value
            }
            emiter.emit("onOpenAuditRightDetail", JSON.stringify(rightParams))
        }
    })
    return (
        <div className={styles["audit-code"]}>
            <div className={styles["header"]}>
                <div className={styles["title"]}>代码审计</div>
            </div>
            <>
                {loadTreeType === "audit" ? (
                    <>
                        <div className={styles["textarea-box"]}>
                            <YakitTextArea
                                textAreaSize='small'
                                value={value}
                                setValue={setValue}
                                isLimit={false}
                                onSubmit={onSubmit}
                                submitTxt={"开始审计"}
                                rows={1}
                                isAlwaysShow={true}
                                placeholder='请输入审计规则...'
                            />
                        </div>

                        <AuditTree
                            data={auditDetailTree}
                            expandedKeys={expandedKeys}
                            setExpandedKeys={setExpandedKeys}
                            onLoadData={onLoadData}
                            foucsedKey={foucsedKey}
                            setFoucsedKey={setFoucsedKey}
                            onJump={onJump}
                        />
                    </>
                ) : (
                    <div className={styles["no-audit"]}>
                        <YakitEmpty
                            title='请先编译项目'
                            description='需要编译过的项目，才可使用代码审计功能'
                            children={
                                <YakitButton
                                    type='outline1'
                                    icon={<OutlinCompileIcon />}
                                    onClick={() => emiter.emit("onOpenAuditModal", "init")}
                                >
                                    编译当前项目
                                </YakitButton>
                            }
                        />
                    </div>
                )}
            </>
        </div>
    )
}

interface AuditModalFormProps {
    onCancle: () => void
    isInitDefault: boolean
    isExecuting: boolean
    onStartAudit: (path: string, v: DebugPluginRequest) => void
}

export const AuditModalForm: React.FC<AuditModalFormProps> = (props) => {
    const {onCancle, isInitDefault, isExecuting, onStartAudit} = props
    const {fileTree} = useStore()
    const [loading, setLoading] = useState<boolean>(true)

    const [plugin, setPlugin] = useState<YakScript>()
    const [form] = Form.useForm()

    // 获取参数
    const handleFetchParams = useDebounceFn(
        useMemoizedFn(async () => {
            const newPlugin = await grpcFetchLocalPluginDetail({Name: "SSA 项目编译"}, true)
            console.log("xxx", newPlugin)
            setLoading(false)
            setPlugin(newPlugin)
        }),
        {wait: 300}
    ).run

    useEffect(() => {
        handleFetchParams()
    }, [])

    // 必要参数
    const requiredParams = useMemo(() => {
        return plugin?.Params.filter((item) => !!item.Required) || []
    }, [plugin?.Params])

    // 设置默认值
    const initRequiredFormValue = useMemoizedFn(async () => {
        let ProjectPath = ""
        let ProjectName = ""
        if (fileTree.length > 0) {
            ProjectPath = fileTree[0].path
            ProjectName = await getNameByPath(ProjectPath)
        }
        console.log("ProjectName", ProjectName, ProjectPath, requiredParams)

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
        const defaultCheck = (plugin?.Params || []).filter((item) => item.Field === "re-compile")
        if (defaultCheck.length > 0) {
            const ele = defaultCheck[0]
            const value = getValueByType(ele.DefaultValue, ele.TypeVerbose)
            initRequiredFormValue = {
                ...initRequiredFormValue,
                [ele.Field]: value
            }
        }
        console.log("cccc", initRequiredFormValue)

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

                    onStartAudit(value["programName"], requestParams)
                })
                .catch(() => {})
        }
    })

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
                <YakitButton type='outline2' onClick={onCancle}>
                    取消
                </YakitButton>
                <YakitButton onClick={onStartExecute}>开始编译</YakitButton>
            </div>
        </YakitSpin>
    )
}

interface AuditHistoryTableProps {
    visible: boolean
    onClose: () => void
}

export const AuditHistoryTable: React.FC<AuditHistoryTableProps> = memo((props) => {
    const {visible, onClose} = props
    const {projectNmae} = useStore()
    const {setFileTree, setLoadTreeType} = useDispatcher()
    const [aduitData, setAduitData] = useState<RequestYakURLResponse>()
    const [selected, setSelected] = useState<string[]>([])
    const [search, setSearch] = useState<string>()
    useEffect(() => {
        if (visible) {
            getAduitList()
        }
    }, [visible, search])

    const getAduitList = useMemoizedFn(async () => {
        try {
            const {res} = await grpcFetchAuditTree("/")
            console.log("getAduitList***", res)
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
        } catch (error) {}
    })

    // 保留数组中非重复数据
    const filterNonUnique = (arr) => arr.filter((i) => arr.indexOf(i) === arr.lastIndexOf(i))
    // 数组去重
    const filterItem = (arr) => arr.filter((item, index) => arr.indexOf(item) === index)

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
            await grpcFetchDeleteAudit(path)
            getAduitList()
            console.log("ooo",path,projectNmae);
            
            if (path === `/${projectNmae}`) {
                setLoadTreeType && setLoadTreeType("file")
                setFileTree && setFileTree([])
                emiter.emit("onResetAuditStatus")
            }
        } catch (error) {
            fail("删除失败")
        }
    })

    return (
        <div className={styles["audit-history-table"]} onKeyDown={(event)=>event.stopPropagation()}>
            <div className={styles["header"]}>
                <div className={styles["main"]}>
                    <div className={styles["title"]}>已编译项目</div>
                    <div className={styles["sub-title"]}>
                        <div className={styles["text"]}>Total</div>
                        <div className={styles["number"]}>{aduitData?.Total}</div>
                    </div>
                    {/* <Divider type={"vertical"} style={{margin: 0}} />
                    <div className={styles["sub-title"]}>
                        <div className={styles["text"]}>Selected</div>
                        <div className={styles["number"]}>{selected.length}</div>
                    </div> */}
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
                    {/* <Divider type={"vertical"} style={{margin: 0}} />
                    <YakitButton style={{paddingLeft: 0}} type='text' danger disabled={selected.length === 0}>
                        {selected.length === aduitData?.Total ? "清空" : "删除"}
                    </YakitButton> */}

                    <YakitButton type='text2' icon={<OutlineXIcon />} onClick={onClose} />
                </div>
            </div>

            <div className={styles["table"]}>
                <div className={styles["table-header"]}>
                    <div className={styles["audit-name"]}>
                        {/* <YakitCheckbox
                            value={true}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    aduitData && setSelected(aduitData.Resources.map((item) => item.Path))
                                } else {
                                    setSelected([])
                                }
                            }}
                        /> */}
                        项目名称
                    </div>
                    <div className={styles["audit-path"]}>存储路径</div>
                    <div className={styles["audit-time"]}>编译时间</div>
                    <div className={styles["audit-opt"]}>操作</div>
                </div>
                <div className={styles["table-content"]}>
                    {aduitData &&
                        aduitData.Resources.map((item, index) => {
                            const obj = getAuditPath(item)
                            return (
                                <div className={styles["table-item"]} key={`${item.ResourceName}-${index}`}>
                                    <div className={styles["audit-name"]}>
                                        {/* <YakitCheckbox
                                            value={true}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    const newArr = filterItem([...selected, item.Path])
                                                    setSelected(newArr)
                                                } else {
                                                    const newArr = selected.filter((itemIn) => itemIn !== item.Path)
                                                    setSelected(newArr)
                                                }
                                            }}
                                        /> */}
                                        {item.ResourceName}
                                        {obj.description && (
                                            <Tooltip title={obj.description}>
                                                <QuestionMarkCircleIcon />
                                            </Tooltip>
                                        )}
                                    </div>
                                    <div className={styles["audit-path"]}>{obj.path}</div>
                                    <div className={styles["audit-time"]}>{obj.time}</div>
                                    <div className={styles["audit-opt"]}>
                                        <YakitButton
                                            type='text'
                                            icon={<OutlineArrowcirclerightIcon className={styles["to-icon"]} />}
                                            onClick={() => {
                                                emiter.emit("onOpenAuditTree", item.ResourceName)
                                                onClose()
                                            }}
                                        />
                                        <Divider type={"vertical"} style={{margin: 0}} />
                                        {/* <YakitPopconfirm
                                        title={
                                            allCheck
                                                ? "确定删除所有风险与漏洞吗? 不可恢复"
                                                : "确定删除选择的风险与漏洞吗?不可恢复"
                                        }
                                        onConfirm={onRemove}
                                    > */}
                                        <YakitButton
                                            type='text'
                                            danger
                                            icon={<OutlineTrashIcon />}
                                            onClick={() => onDelete(item.Path)}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                </div>
            </div>
        </div>
    )
})
