import React, {useEffect, useRef, useState} from "react"
import {GlobalFilterFunctionProps, GlobalFilterFunctionTreeProps} from "./GlobalFilterFunctionType.d"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import styles from "./GlobalFilterFunction.module.scss"
import {useMemoizedFn, useSize, useUpdateEffect} from "ahooks"
import {yakitNotify} from "@/utils/notification"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {randomString} from "@/utils/randomUtil"
import {Progress, Tree} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {apiDebugPlugin, DebugPluginRequest} from "@/pages/plugins/utils"
import {HTTPRequestBuilderParams} from "@/models/HTTPRequestBuilder"
import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {AuditNodeDetailProps, AuditNodeProps, AuditYakUrlProps} from "../AuditCode/AuditCodeType"
import {loadAuditFromYakURLRaw, onJumpByCodeRange} from "../utils"
import {AuditTreeNode, getDetailFun} from "../AuditCode/AuditCode"
import emiter from "@/utils/eventBus/eventBus"
import {OutlineSearchIcon} from "@/assets/icon/outline"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {onSetSelectedSearchVal} from "../AuditSearchModal/AuditSearch"
import classNames from "classnames"
import {grpcFetchLocalPluginDetail} from "@/pages/pluginHub/utils/grpc"

const GlobalFilterFunction: React.FC<GlobalFilterFunctionProps> = React.memo((props) => {
    const {projectName} = props
    const [data, setData] = useState<AuditNodeProps[]>([])

    const [executing, setExecuting] = useState<boolean>(false)

    const [queryPluginError, setQueryPluginError] = useState<string>("")

    const tokenRef = useRef<string>(randomString(40))
    const [streamInfo, debugPluginStreamEvent] = useHoldGRPCStream({
        taskName: "debug-plugin",
        apiKey: "DebugPlugin",
        token: tokenRef.current,
        onEnd: () => {
            debugPluginStreamEvent.stop()
            setExecuting(false)
        },
        onError: () => {},
        setRuntimeId: () => {},
        isShowEnd: false
    })

    useEffect(() => {
        onInit()
    }, [projectName])

    const onStopExecute = useMemoizedFn(() => {
        debugPluginStreamEvent.cancel()
        debugPluginStreamEvent.reset()
    })

    const onInit = useMemoizedFn(() => {
        grpcFetchLocalPluginDetail({Name: "SyntaxFlow 查询项目信息"}, true)
            .then(() => {
                getList()
            })
            .catch((err) => {
                setQueryPluginError(`${err}`)
            })
    })

    const getList = useMemoizedFn(() => {
        if (!projectName) {
            yakitNotify("warning", "请先选择项目")
            return
        }
        if (executing) {
            yakitNotify("warning", "请等待上一次搜索结束")
            return
        }
        const requestParams: DebugPluginRequest = {
            Code: "",
            PluginType: "yak",
            Input: "",
            HTTPRequestTemplate: {} as HTTPRequestBuilderParams,
            ExecParams: [
                {
                    Key: "progName",
                    Value: projectName || ""
                },
                {
                    Key: "kind",
                    Value: "filterFunc"
                }
            ],
            PluginName: "SyntaxFlow 查询项目信息"
        }
        setData([])
        debugPluginStreamEvent.reset()
        apiDebugPlugin({params: requestParams, token: tokenRef.current, isShowStartInfo: false})
            .then(() => {
                debugPluginStreamEvent.start()
                setExecuting(true)
            })
            .catch(() => {})
    })

    useUpdateEffect(() => {
        const startLog = streamInfo.logState.filter((item) => item.level === "json")
        if (startLog.length > 0) {
            getData(startLog)
        }
    }, [streamInfo])
    const getData = useMemoizedFn(async (startLog: StreamResult.Log[]) => {
        try {
            const list: AuditNodeProps[] = []
            startLog.forEach((item) => {
                if (!!item.data) {
                    const jsonData = JSON.parse(item.data)
                    if (!!jsonData && jsonData["规则结果ID"] && jsonData["规则名称"]) {
                        list.push({
                            id: `${jsonData["规则结果ID"]}`,
                            name: jsonData["规则名称"],
                            parent: "",
                            depth: 1,
                            Extra: [],
                            ResourceType: "",
                            VerboseType: "",
                            Size: 0,
                            children: []
                        })
                    }
                }
            })
            setData([...list])
            setTimeout(() => {
                if (list.length > 0) {
                    getChildData(1, list[0].id)
                }
            }, 200)
        } catch (error) {
            yakitNotify("error", `${error}`)
        }
    })
    const getChildData = useMemoizedFn((page: number, id: string): Promise<void> => {
        return new Promise(async (resolve, reject) => {
            if (!id || !projectName) return reject()
            const params: AuditYakUrlProps = {
                Schema: "syntaxflow",
                Location: projectName,
                Path: `/output`,
                Query: [
                    {Key: "result_id", Value: id},
                    {Key: "have_range", Value: "true"},
                    {Key: "use_verbose_name", Value: "true"}
                ]
            }
            try {
                const result = await loadAuditFromYakURLRaw(params, undefined, page, 10)
                if (result) {
                    const childData: AuditNodeProps[] = []
                    let isEnd = false
                    result.Resources.forEach((item, index) => {
                        if (item.VerboseType !== "result_id") {
                            const {ResourceType, VerboseType, ResourceName, Size, Extra} = item
                            let value: string = `${index}`
                            const arr = Extra.filter((item) => item.Key === "index")
                            if (arr.length > 0) {
                                value = arr[0].Value
                            }
                            const newId = `${id}/${value}`
                            childData.push({
                                parent: id,
                                id: newId,
                                name: ResourceName,
                                ResourceType,
                                VerboseType,
                                Size,
                                Extra,
                                depth: 2,
                                isLeaf: true
                            })
                        } else {
                            isEnd = true
                        }
                    })
                    const loadId = `${id}/load`
                    if (!isEnd) {
                        childData.push({
                            parent: id,
                            id: loadId,
                            name: "",
                            ResourceType: "value",
                            VerboseType: "",
                            Size: 0,
                            Extra: [],
                            page: result.Page,
                            hasMore: true,
                            depth: 2,
                            isLeaf: true
                        })
                    } else {
                        childData.push({
                            parent: null,
                            name: "已经到底啦~",
                            id: `${id}/111`,
                            depth: 1,
                            isBottom: true,
                            Extra: [],
                            ResourceType: "",
                            VerboseType: "",
                            Size: 0
                        })
                    }
                    const newList = data.map((item) => {
                        if (item.id === id) {
                            return {
                                ...item,
                                children:
                                    +result.Page === 1
                                        ? childData
                                        : [...(item.children || []).filter((ele) => ele.id !== loadId), ...childData]
                            }
                        }
                        return item
                    })
                    setData(newList)
                }
                setTimeout(() => {
                    resolve()
                }, 200)
            } catch (error) {
                reject(error)
            }
        })
    })

    const onLoadData = useMemoizedFn((node) => {
        if (node.parent === null) return Promise.reject()
        return getChildData(1, node.id)
    })
    const loadTreeMore = useMemoizedFn(async (node: AuditNodeProps) => {
        if (node.parent && node.page) {
            getChildData(+node.page + 1, node.parent)
        }
    })

    return (
        <div className={styles["global-filter-function"]}>
            {executing ? (
                <div className={styles["progress-opt"]}>
                    <Progress
                        size='small'
                        strokeColor='var(--Colors-Use-Main-Primary)'
                        trailColor='var(--Colors-Use-Neutral-Bg)'
                        percent={Math.floor((streamInfo.progressState.map((item) => item.progress)[0] || 0) * 100)}
                    />

                    <YakitButton danger onClick={onStopExecute} size='small'>
                        停止
                    </YakitButton>
                </div>
            ) : (
                <>
                    {queryPluginError ? (
                        <div style={{marginTop: 20}}>
                            <YakitEmpty title='引擎版本过低，请升级' description={queryPluginError} />
                        </div>
                    ) : (
                        <>
                            {data.length > 0 ? (
                                <GlobalFilterFunctionTree
                                    data={data}
                                    onLoadData={onLoadData}
                                    onSelect={() => {}}
                                    loadTreeMore={loadTreeMore}
                                />
                            ) : (
                                <div style={{marginTop: 20}}>
                                    <YakitEmpty title={!projectName ? "请选择项目" : "不支持此语言，请等待更新"} />
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    )
})

export default GlobalFilterFunction

const GlobalFilterFunctionTree: React.FC<GlobalFilterFunctionTreeProps> = React.memo((props) => {
    const {data, onLoadData, loadTreeMore} = props
    const treeRef = useRef<any>(null)
    const wrapper = useRef<HTMLDivElement>(null)
    const size = useSize(wrapper)
    const [expandedKeys, setExpandedKeys] = useState<string[]>([])
    const [foucsedKey, setFoucsedKey] = useState<string>("")

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
    const handleSelect = useMemoizedFn((node: AuditNodeProps, detail?: AuditNodeDetailProps) => {
        setFoucsedKey(node.id)
        onJumpByCodeRange(node)
    })
    const onSearch = useMemoizedFn((info: AuditNodeProps) => {
        setFoucsedKey(info.id)
        onSetSelectedSearchVal(info.name)
        emiter.emit("onOpenSearchModal")
    })
    const customizeContent = useMemoizedFn((info: AuditNodeProps) => {
        // 获取详情
        const getDetail = getDetailFun(info)
        return (
            <>
                <div className={classNames(styles["global-filter-function-item"])}>
                    <div className={styles["item-left"]}>
                        <div title={info.name} className={styles["name"]}>
                            {info.name}
                        </div>
                        {getDetail?.start_line && (
                            <YakitTag size='small' color='info'>
                                {getDetail?.start_line}
                            </YakitTag>
                        )}
                    </div>
                    {info.isLeaf && (
                        <div className={styles["item-right"]}>
                            <div title={getDetail?.fileName} className={styles["fileName"]}>
                                {getDetail?.fileName}
                            </div>
                            <OutlineSearchIcon
                                className={styles["search-icon"]}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onSearch(info)
                                }}
                            />
                        </div>
                    )}
                </div>
            </>
        )
    })
    return (
        <div ref={wrapper} className={classNames(styles["audit-tree"])}>
            <Tree
                ref={treeRef}
                height={size?.height}
                fieldNames={{title: "name", key: "id", children: "children"}}
                treeData={data}
                blockNode={true}
                switcherIcon={<></>}
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
                            loadTreeMore={loadTreeMore}
                            customizeContent={customizeContent}
                        />
                    )
                }}
            />
        </div>
    )
})
