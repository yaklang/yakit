import React, {useEffect, useRef, useState} from "react"
import {
    FilterFunctionProps,
    GlobalFilterFunctionChildrenItemProps,
    GlobalFilterFunctionChildrenProps,
    GlobalFilterFunctionProps
} from "./GlobalFilterFunctionType.d"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import styles from "./GlobalFilterFunction.module.scss"
import {useCreation, useMemoizedFn, useUpdateEffect} from "ahooks"
import {CollapseList} from "@/pages/yakRunner/CollapseList/CollapseList"
import {yakitNotify} from "@/utils/notification"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {randomString} from "@/utils/randomUtil"
import {Progress} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {apiDebugPlugin, DebugPluginRequest} from "@/pages/plugins/utils"
import {HTTPRequestBuilderParams} from "@/models/HTTPRequestBuilder"
import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {AuditNodeProps, AuditYakUrlProps} from "../AuditCode/AuditCodeType"
import {loadAuditFromYakURLRaw, onJumpByCodeRange} from "../utils"
import {getDetailFun} from "../AuditCode/AuditCode"
import emiter from "@/utils/eventBus/eventBus"
import {OutlineSearchIcon} from "@/assets/icon/outline"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {LoadingOutlined} from "@ant-design/icons"
import {onSetSelectedSearchVal} from "../AuditSearchModal/AuditSearch"

const GlobalFilterFunction: React.FC<GlobalFilterFunctionProps> = React.memo((props) => {
    const {projectName} = props
    const [data, setData] = useState<FilterFunctionProps[]>([])
    const [activeKey, setActiveKey] = useState<string[]>([])

    const [executing, setExecuting] = useState<boolean>(false)
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
        setRuntimeId: (rId) => {},
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
        setActiveKey([])
        debugPluginStreamEvent.reset()
        apiDebugPlugin({params: requestParams, token: tokenRef.current, isShowStartInfo: false})
            .then(() => {
                debugPluginStreamEvent.start()
                setExecuting(true)
            })
            .catch(() => {})
    })

    const isShowList = useCreation(() => {
        return !!projectName
    }, [projectName])
    useUpdateEffect(() => {
        const startLog = streamInfo.logState.filter((item) => item.level === "json")
        if (startLog.length > 0) {
            getData(startLog)
        }
    }, [streamInfo])
    const getData = useMemoizedFn(async (startLog: StreamResult.Log[]) => {
        try {
            const list: FilterFunctionProps[] = []
            startLog.forEach((item) => {
                if (!!item.data) {
                    const jsonData = JSON.parse(item.data)
                    if (!!jsonData && jsonData["规则结果ID"] && jsonData["规则名称"]) {
                        list.push({
                            id: `${jsonData["规则结果ID"]}`,
                            name: jsonData["规则名称"]
                        })
                    }
                }
            })
            setData([...list])
        } catch (error) {
            yakitNotify("error", `${error}`)
        }
    })
    const onCollapseChange = useMemoizedFn((v) => {
        setActiveKey(v)
    })
    return (
        <div className={styles["global-filter-function"]}>
            {isShowList ? (
                <>
                    {executing ? (
                        <div className={styles["progress-opt"]}>
                            <Progress
                                size='small'
                                strokeColor='#F28B44'
                                trailColor='#F0F2F5'
                                percent={Math.floor(
                                    (streamInfo.progressState.map((item) => item.progress)[0] || 0) * 100
                                )}
                            />

                            <YakitButton danger onClick={onStopExecute} size='small'>
                                停止
                            </YakitButton>
                        </div>
                    ) : (
                        <div className={styles["content"]}>
                            <CollapseList<FilterFunctionProps>
                                type='sideBar'
                                onlyKey='key'
                                list={data}
                                titleRender={(info) => <div className={styles["title-render"]}>{info.name}</div>}
                                renderItem={(record) => (
                                    <GlobalFilterFunctionChildren record={record} projectName={projectName} />
                                )}
                                collapseProps={{
                                    activeKey,
                                    onChange: onCollapseChange
                                }}
                            />
                        </div>
                    )}
                </>
            ) : (
                <div style={{marginTop: 20}}>
                    <YakitEmpty title='暂无函数' />
                </div>
            )}
        </div>
    )
})

export default GlobalFilterFunction

const GlobalFilterFunctionChildren: React.FC<GlobalFilterFunctionChildrenProps> = React.memo((props) => {
    const {record, projectName} = props
    const [list, setList] = useState<AuditNodeProps[]>([])
    const [hasMore, setHasMore] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    const [currentPage, setCurrentPage] = useState<number>(1)
    useEffect(() => {
        getChildData(currentPage)
    }, [])
    const getChildData = useMemoizedFn(async (page: number) => {
        const {id} = record
        if (!id || !projectName) return
        setLoading(true)
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
        const result = await loadAuditFromYakURLRaw(params, undefined, page, 30)
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
                    const newId = `/${value}`
                    childData.push({
                        parent: id,
                        id: newId,
                        name: ResourceName,
                        ResourceType,
                        VerboseType,
                        Size,
                        Extra,
                        depth: 2
                    })
                } else {
                    isEnd = true
                }
            })
            const newList = page === 1 ? childData : [...list, ...childData]
            setCurrentPage(+result.Page + 1)
            setList(newList)
            setHasMore(!isEnd)
        }
        setTimeout(() => {
            setLoading(false)
        }, 200)
    })
    return (
        <div className={styles["global-filter-function-list"]}>
            {list.map((ele) => (
                <GlobalFilterFunctionChildrenItem info={ele} />
            ))}
            {loading ? (
                <div className={styles["tip"]}>
                    <LoadingOutlined />
                </div>
            ) : (
                <>
                    {hasMore ? (
                        <div className={styles["tip"]} onClick={() => getChildData(currentPage)}>
                            点击加载更多
                        </div>
                    ) : (
                        <div className={styles["tip"]}>已经到底了</div>
                    )}
                </>
            )}
        </div>
    )
})

const GlobalFilterFunctionChildrenItem: React.FC<GlobalFilterFunctionChildrenItemProps> = React.memo((props) => {
    const {info} = props
    const onJump = useMemoizedFn(async (data: AuditNodeProps) => {
        onJumpByCodeRange(data)
    })
    const onSearch = useMemoizedFn((e: React.MouseEvent) => {
        e.stopPropagation()
        onSetSelectedSearchVal(info.name)
        emiter.emit("onOpenSearchModal")
    })
    // 获取详情
    const getDetail = useCreation(() => {
        return getDetailFun(info)
    }, [info])
    return (
        <div className={styles["global-filter-function-item"]} onClick={() => onJump(info)}>
            <div className={styles["item-left"]}>
                <div title={info.name} className={styles["name"]}>
                    {info.name}
                </div>
                <YakitTag size='small' color='info'>
                    {getDetail?.start_line}
                </YakitTag>
            </div>
            <div className={styles["item-right"]}>
                <div>{getDetail?.fileName}</div>
                <OutlineSearchIcon className={styles["search-icon"]} onClick={onSearch} />
            </div>
        </div>
    )
})
