import React, {useEffect, useState, useRef, memo, ReactNode} from "react"
import {
    Alert,
    Button,
    Card,
    Col,
    Empty,
    Form,
    Input,
    List,
    Popconfirm,
    Row,
    Space,
    Tag,
    Tooltip,
    Progress,
    Spin,
    Select,
    Checkbox,
    Switch,
    Radio,
    Modal,
    Typography
} from "antd"
import {
    ReloadOutlined,
    GithubOutlined,
    UploadOutlined,
    LoadingOutlined,
    FilterOutlined,
    FullscreenExitOutlined,
    FullscreenOutlined,
    LockOutlined,
    PlusOutlined,
    DeleteOutlined,
    CloudDownloadOutlined,
    DownloadOutlined,
    PoweroffOutlined,
    InfoCircleOutlined
} from "@ant-design/icons"
import {showDrawer, showModal} from "../../utils/showModal"
import {startExecYakCode} from "../../utils/basic"
import {QueryYakScriptRequest, QueryYakScriptsResponse, YakScript} from "../invoker/schema"
import {failed, success, warn} from "../../utils/notification"
import {CopyableField, InputItem, ManySelectOne, SelectOne} from "../../utils/inputUtil"
import {formatDate} from "../../utils/timeUtil"
import {PluginOperator} from "./PluginOperator"
import {YakScriptCreatorForm} from "../invoker/YakScriptCreator"
import {AutoCard} from "../../components/AutoCard"
import {UserInfoProps, useStore} from "@/store"
import "./YakitStorePage.scss"
import {getValue, saveValue} from "../../utils/kv"
import {
    useCreation,
    useDebounceFn,
    useGetState,
    useMemoizedFn,
    useThrottleFn,
    useVirtualList,
    useDebounceEffect,
    useSize
} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {DownloadOnlinePluginProps} from "../yakitStore/YakitPluginInfoOnline"
import {randomString} from "@/utils/randomUtil"
import {OfficialYakitLogoIcon, SelectIcon, OnlineCloudIcon, ImportIcon, ShareIcon} from "../../assets/icons"
import {findDOMNode} from "react-dom"
import {YakExecutorParam} from "../invoker/YakExecutorParams"
import {RollingLoadList} from "@/components/RollingLoadList"
import {setTimeout} from "timers"
import {SyncCloudButton} from "@/components/SyncCloudButton/index"

const {Search} = Input
const {Option} = Select
const {Paragraph} = Typography
const {ipcRenderer} = window.require("electron")

const userInitUse = "user-init-use"

export interface YakitStorePageProp {}

export interface GetYakScriptByOnlineIDRequest {
    OnlineID?: number
    UUID: string
}

interface SearchPluginOnlineRequest extends API.GetPluginWhere {
    order_by: string
    order?: string
    page?: number
    limit?: number
}

const typeOnline = "yak,mitm,packet-hack,port-scan,codec,nuclei"
const defQueryOnline: SearchPluginOnlineRequest = {
    keywords: "",
    order_by: "stars",
    order: "desc",
    plugin_type: typeOnline,
    page: 1,
    limit: 20,
    status: "",
    bind_me: false,
    is_private: "",
    online_tags: ""
}

const defQueryLocal: QueryYakScriptRequest = {
    Type: "yak,mitm,codec,packet-hack,port-scan",
    Keyword: "",
    Pagination: {Limit: 20, Order: "desc", Page: 1, OrderBy: "updated_at"}
}

const statusType = {
    "0": "待审核",
    "1": "审核通过",
    "2": "审核不通过"
}

const statisticsDataOnlineOrUser: API.YakitSearch = {
    plugin_type: [
        {
            title: "类型",
            name: "yak",
            count: 1
        },
        {
            title: "类型",
            name: "mitm",
            count: 2
        }
    ],
    status: [
        {
            title: "状态",
            name: "0",
            count: 1
        },
        {
            title: "状态",
            name: "1",
            count: 1
        },
        {
            title: "状态",
            name: "2",
            count: 1
        }
    ],
    online_tags: [
        {
            title: "TAG",
            name: "redis",
            count: 1
        },
        {
            title: "TAG",
            name: "crawler",
            count: 1
        }
    ]
}

export const YakitStorePage: React.FC<YakitStorePageProp> = (props) => {
    const [script, setScript] = useState<YakScript>()
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        setLoading(true)
        setTimeout(() => {
            setLoading(false)
        }, 200)
    }, [script])

    // 是否第一次使用yakit  第一次使用默认展示线上，后面默认展示本地
    const [plugSource, setPlugSource] = useState<string>("local")
    const [listLoading, setListLoading] = useState<boolean>(false)
    const [plugin, setPlugin] = useState<API.YakitPluginDetail>()
    const [userPlugin, setUserPlugin] = useState<API.YakitPluginDetail>()
    const [fullScreen, setFullScreen] = useState<boolean>(false)
    const [isRefList, setIsRefList] = useState(false)

    // 全局登录状态
    const {userInfo} = useStore()
    useEffect(() => {
        ipcRenderer
            .invoke("get-value", userInitUse)
            .then((value: boolean) => {
                if (value) {
                    setPlugSource("local")
                } else {
                    setPlugSource("online")
                    ipcRenderer.invoke("set-value", userInitUse, true)
                }
            })
            .catch(() => {})
            .finally(() => {})
    }, [])
    useEffect(() => {
        if (!userInfo.isLogin) onResetPluginDetails()
    }, [userInfo.isLogin])
    const onRefList = useMemoizedFn(() => {
        setPublicKeyword("")
        onResetPluginDetails()
        setIsRefList(!isRefList)
        setScriptIdOnlineId(undefined)
        onResetNumber()
    })
    const [publicKeyword, setPublicKeyword] = useState<string>("")
    const onFullScreen = useMemoizedFn(() => {
        setFullScreen(!fullScreen)
    })
    const onSetPluginSource = useDebounceFn(
        (value) => {
            setPlugSource(value)
            onResetQuery()
            onResetPluginDetails()
            onResetPluginDelecteAndUpdate()
            onResetNumber()
        },
        {wait: 200}
    ).run
    const onResetNumber = useMemoizedFn(() => {
        setNumberLocal(0)
        setNumberOnline(0)
        setNumberUser(0)
    })
    const onResetQuery = useMemoizedFn(() => {
        // 重置查询条件
        setPublicKeyword("")
        onResetStatisticsQuery()
    })
    const onResetPluginDetails = useMemoizedFn(() => {
        // 重置详情
        setScript(undefined)
        setUserPlugin(undefined)
        setPlugin(undefined)
    })
    const onResetPluginDelecteAndUpdate = useMemoizedFn(() => {
        // 重置删除
        setDeletePluginRecordUser(undefined)
        setDeletePluginRecordOnline(undefined)
        setDeletePluginRecordLocal(undefined)
        // 重置更新
        setUpdatePluginRecordUser(undefined)
        setUpdatePluginRecordOnline(undefined)
    })
    // 删除
    const [deletePluginRecordUser, setDeletePluginRecordUser] = useState<API.YakitPluginDetail>()
    const [deletePluginRecordOnline, setDeletePluginRecordOnline] = useState<API.YakitPluginDetail>()
    const [deletePluginRecordLocal, setDeletePluginRecordLocal] = useState<YakScript>()
    // 修改
    const [updatePluginRecordUser, setUpdatePluginRecordUser] = useState<API.YakitPluginDetail>()
    const [updatePluginRecordOnline, setUpdatePluginRecordOnline] = useState<API.YakitPluginDetail>()
    const [updatePluginRecordLocal, setUpdatePluginRecordLocal] = useState<YakScript>()
    // 线上插件id
    const [scriptIdOnlineId, setScriptIdOnlineId] = useState<number>()

    //滚动
    const [numberLocal, setNumberLocal] = useState<number>()
    const [numberOnline, setNumberOnline] = useState<number>()
    const [numberUser, setNumberUser] = useState<number>()
    const onSetPluginAndGetLocal = useMemoizedFn((p?: API.YakitPluginDetail) => {
        if (!p) {
            setScript(undefined)
            setPlugin(undefined)
            return
        }
        ipcRenderer
            .invoke("GetYakScriptByOnlineID", {
                OnlineID: p.id,
                UUID: p.uuid
            } as GetYakScriptByOnlineIDRequest)
            .then((localSrcipt: YakScript) => {
                setScript(localSrcipt)
            })
            .catch((e) => {
                // 本地未查询到相关数据
                setScript(undefined)
            })
            .finally(() => {
                setPlugin(p)
                setScriptIdOnlineId(p.id)
            })
    })
    const onSetUserPluginAndGetLocal = useMemoizedFn((p?: API.YakitPluginDetail) => {
        if (!p) {
            setScript(undefined)
            setUserPlugin(undefined)
            return
        }
        ipcRenderer
            .invoke("GetYakScriptByOnlineID", {
                OnlineID: p.id,
                UUID: p.uuid
            } as GetYakScriptByOnlineIDRequest)
            .then((localSrcipt: YakScript) => {
                setScript(localSrcipt)
            })
            .catch((e) => {
                // 本地未查询到相关数据
                setScript(undefined)
            })
            .finally(() => {
                setUserPlugin(p)
                setScriptIdOnlineId(p.id)
            })
    })
    const [isFull, setIsFull] = useState(true) //是否全屏card展示
    useEffect(() => {
        setIsFull(!(script || userPlugin || plugin))
    }, [script, userPlugin, plugin])
    const {width} = useSize(document.querySelector("body")) || {width: 0, height: 0}
    const [statisticsLoading, setStatisticsLoading] = useState<boolean>(true)
    const [statisticsQueryLocal, setStatisticsQueryLocal] = useState<QueryYakScriptRequest>(defQueryLocal)
    const [statisticsQueryOnline, setStatisticsQueryOnline] = useState<SearchPluginOnlineRequest>(defQueryOnline)
    const [statisticsQueryUser, setStatisticsQueryUser] = useState<SearchPluginOnlineRequest>(defQueryOnline)
    useEffect(() => {
        if (width > 1940) {
            setTimeout(() => {
                setStatisticsLoading(false)
            }, 2000)
        }
    }, [width])
    const onResetStatisticsQuery = useMemoizedFn(() => {
        setStatisticsQueryLocal(defQueryLocal)
        setStatisticsQueryOnline(defQueryOnline)
        setStatisticsQueryUser(defQueryOnline)
    })
    const onSearch = useMemoizedFn((queryName: string, value: string) => {
        if (plugSource === "local") {
            onSearchLocal(queryName, value)
        }
        if (plugSource === "user") {
            onSearchUser(queryName, value)
        }
        if (plugSource === "online") {
            onSearchOnline(queryName, value)
        }
    })
    const onSearchLocal = useMemoizedFn((queryName: string, value: string) => {
        const currentQuery: string = statisticsQueryLocal[queryName]
        const queryArr: string[] = currentQuery.split(",")
        const index: number = queryArr.findIndex((ele) => ele === value)
        if (index === -1) {
            queryArr.push(value)
            setStatisticsQueryLocal({
                ...statisticsQueryLocal,
                [queryName]: queryArr.join(",")
            })
        } else {
            queryArr.splice(index, 1)
            setStatisticsQueryLocal({
                ...statisticsQueryLocal,
                [queryName]: queryArr.join(",")
            })
        }
    })
    const onSearchUser = useMemoizedFn((queryName: string, value: string) => {
        if (queryName === "status") {
            setStatisticsQueryUser({
                ...statisticsQueryUser,
                [queryName]: statisticsQueryUser[queryName] === value ? "" : value
            })
        } else {
            const currentQuery: string = statisticsQueryUser[queryName]
            const queryArr: string[] = currentQuery.split(",")
            const index: number = queryArr.findIndex((ele) => ele === value)
            if (index === -1) {
                queryArr.push(value)
                setStatisticsQueryUser({
                    ...statisticsQueryUser,
                    [queryName]: queryArr.join(",")
                })
            } else {
                queryArr.splice(index, 1)
                setStatisticsQueryUser({
                    ...statisticsQueryUser,
                    [queryName]: queryArr.join(",")
                })
            }
        }
    })
    const onSearchOnline = useMemoizedFn((queryName: string, value: string) => {
        if (queryName === "status") {
            setStatisticsQueryOnline({
                ...statisticsQueryOnline,
                [queryName]: statisticsQueryOnline[queryName] === value ? "" : value
            })
        } else {
            const currentQuery: string = statisticsQueryOnline[queryName]
            const queryArr: string[] = currentQuery.split(",")
            const index: number = queryArr.findIndex((ele) => ele === value)
            if (index === -1) {
                queryArr.push(value)
                setStatisticsQueryOnline({
                    ...statisticsQueryOnline,
                    [queryName]: queryArr.join(",")
                })
            } else {
                queryArr.splice(index, 1)
                setStatisticsQueryOnline({
                    ...statisticsQueryOnline,
                    [queryName]: queryArr.join(",")
                })
            }
        }
    })
    const showName = useMemoizedFn((queryName: string, name: string) => {
        switch (queryName) {
            case "plugin_type":
                return PluginType[name]
            case "status":
                return statusType[name]
            default:
                return name
        }
    })
    return (
        <>
            <div className='plugin-store'>
                <Card
                    bodyStyle={{padding: 0, height: isFull ? "calc(100% - 62px)" : "calc(100% - 42px)"}}
                    bordered={false}
                    style={{
                        height: "100%",
                        width: isFull ? (width > 1940 && "calc(100% - 500px)") || "100%" : 470,
                        display: fullScreen ? "none" : ""
                    }}
                    title={
                        <Row gutter={12} className={isFull ? "plugin-title" : ""}>
                            <Col span={12} className='flex-align-center'>
                                <Radio.Group
                                    value={plugSource}
                                    size={isFull ? "middle" : "small"}
                                    onChange={(e) => onSetPluginSource(e.target.value)}
                                >
                                    <Radio.Button value='online'>插件商店</Radio.Button>
                                    <Radio.Button value='user'>我的插件</Radio.Button>
                                    <Radio.Button value='local'>本地</Radio.Button>
                                </Radio.Group>
                                <Button size={isFull ? "middle" : "small"} type={"link"} onClick={onRefList}>
                                    <ReloadOutlined style={{fontSize: isFull ? 16 : 14}} />
                                </Button>
                            </Col>
                            <Col span={12} className='search-input-body'>
                                <Search
                                    placeholder='输入关键字搜索'
                                    size={isFull ? "middle" : "small"}
                                    enterButton={isFull ? "搜索" : undefined}
                                    onSearch={() => setIsRefList(!isRefList)}
                                    value={publicKeyword}
                                    onChange={(e) => {
                                        setPublicKeyword(e.target.value)
                                    }}
                                />
                            </Col>
                        </Row>
                    }
                    size={"small"}
                    className='left-list'
                >
                    <Spin spinning={listLoading}>
                        {plugSource === "local" && (
                            <YakModule
                                setStatisticsQueryLocal={setStatisticsQueryLocal}
                                statisticsQueryLocal={statisticsQueryLocal}
                                numberLocal={numberLocal}
                                setNumberLocal={setNumberLocal}
                                size={isFull ? "middle" : "small"}
                                script={script}
                                setScript={setScript}
                                publicKeyword={publicKeyword}
                                isRefList={isRefList}
                                deletePluginRecordLocal={deletePluginRecordLocal}
                                updatePluginRecordLocal={updatePluginRecordLocal}
                                setUpdatePluginRecordLocal={setUpdatePluginRecordLocal}
                            />
                        )}
                        {plugSource === "user" && (
                            <YakModuleUser
                                setStatisticsQueryUser={setStatisticsQueryUser}
                                statisticsQueryUser={statisticsQueryUser}
                                numberUser={numberUser}
                                setNumberUser={setNumberUser}
                                size={isFull ? "middle" : "small"}
                                userPlugin={userPlugin}
                                setUserPlugin={onSetUserPluginAndGetLocal}
                                userInfo={userInfo}
                                publicKeyword={publicKeyword}
                                isRefList={isRefList}
                                deletePluginRecordUser={deletePluginRecordUser}
                                setListLoading={setListLoading}
                                updatePluginRecordUser={updatePluginRecordUser}
                            />
                        )}
                        {plugSource === "online" && (
                            <YakModuleOnline
                                setStatisticsQueryOnline={setStatisticsQueryOnline}
                                statisticsQueryOnline={statisticsQueryOnline}
                                numberOnline={numberOnline}
                                setNumberOnline={setNumberOnline}
                                size={isFull ? "middle" : "small"}
                                plugin={plugin}
                                setPlugin={onSetPluginAndGetLocal}
                                userInfo={userInfo}
                                publicKeyword={publicKeyword}
                                isRefList={isRefList}
                                deletePluginRecordOnline={deletePluginRecordOnline}
                                setListLoading={setListLoading}
                                updatePluginRecordOnline={updatePluginRecordOnline}
                            />
                        )}
                    </Spin>
                </Card>
                {!isFull && (
                    <div className='plugin-store-operator'>
                        {plugin || script || userPlugin ? (
                            <AutoCard
                                loading={loading}
                                title={
                                    <Space>
                                        <div>Yak[{script?.Type}] 模块详情</div>
                                    </Space>
                                }
                                bordered={false}
                                size={"small"}
                                extra={
                                    <>
                                        <Button
                                            type='link'
                                            onClick={() => {
                                                onRefList()
                                            }}
                                        >
                                            返回
                                        </Button>
                                        <Button
                                            icon={
                                                fullScreen ? (
                                                    <FullscreenExitOutlined style={{fontSize: 15}} />
                                                ) : (
                                                    <FullscreenOutlined style={{fontSize: 15}} />
                                                )
                                            }
                                            type={"link"}
                                            size={"small"}
                                            onClick={() => onFullScreen()}
                                        />
                                    </>
                                }
                            >
                                <PluginOperator
                                    yakScriptId={(script && script.Id) || 0}
                                    yakScriptIdOnlineId={scriptIdOnlineId}
                                    setTrigger={() => {}}
                                    setScript={(s) => {
                                        setScript(s)
                                        setUpdatePluginRecordLocal(s)
                                    }}
                                    deletePluginLocal={setDeletePluginRecordLocal}
                                    deletePluginOnline={(p: API.YakitPluginDetail) => {
                                        if (plugSource === "online" && plugin) {
                                            setDeletePluginRecordOnline(p)
                                        }
                                        if (plugSource === "user" && userPlugin) {
                                            setDeletePluginRecordUser(p)
                                        }
                                    }}
                                    updatePluginOnline={(p: API.YakitPluginDetail) => {
                                        if (plugSource === "online" && plugin) {
                                            setUpdatePluginRecordOnline(p)
                                        }
                                        if (plugSource === "user" && userPlugin) {
                                            setUpdatePluginRecordUser(p)
                                        }
                                    }}
                                />
                            </AutoCard>
                        ) : (
                            <Empty style={{marginTop: 100}}>在左侧所选模块查看详情</Empty>
                        )}
                    </div>
                )}
                {isFull && width > 1940 && (
                    <div className='plugin-statistics'>
                        <Spin spinning={statisticsLoading}>
                            {Object.entries(plugSource === "local" ? {} : statisticsDataOnlineOrUser).map((item) => {
                                const queryName = item[0]
                                const statisticsList = item[1]
                                const title = statisticsList.length > 0 ? statisticsList[0].title : "-"
                                let current = ""
                                if (plugSource === "local") {
                                    current = statisticsQueryLocal[queryName]
                                }
                                if (plugSource === "user") {
                                    current = statisticsQueryUser[queryName]
                                }
                                if (plugSource === "online") {
                                    current = statisticsQueryOnline[queryName]
                                }
                                return (
                                    <>
                                        <div className='opt-header'>{title}</div>
                                        {statisticsList.map((ele) => (
                                            <div
                                                key={ele.name}
                                                className={`opt-list-item ${
                                                    current.includes(ele.name) && "opt-list-item-selected"
                                                }`}
                                                onClick={() => onSearch(queryName, ele.name)}
                                            >
                                                <span className='item-name content-ellipsis'>
                                                    {showName(queryName, ele.name)}
                                                </span>
                                                <span>{ele.count}</span>
                                            </div>
                                        ))}
                                    </>
                                )
                            })}
                        </Spin>
                    </div>
                )}
            </div>
        </>
    )
}

interface YakModuleProp {
    script?: YakScript
    setScript: (s?: YakScript) => void
    publicKeyword: string
    isRefList: boolean
    deletePluginRecordLocal?: YakScript
    updatePluginRecordLocal?: YakScript
    setUpdatePluginRecordLocal: (s?: YakScript) => void
    size: "middle" | "small"
    numberLocal?: number
    setNumberLocal: (n: number) => void
    setStatisticsQueryLocal: (l: QueryYakScriptRequest) => void
    statisticsQueryLocal: QueryYakScriptRequest
}
export const YakModule: React.FC<YakModuleProp> = (props) => {
    const {
        script,
        setScript,
        publicKeyword,
        isRefList,
        deletePluginRecordLocal,
        updatePluginRecordLocal,
        setUpdatePluginRecordLocal,
        size,
        setNumberLocal,
        numberLocal,
        setStatisticsQueryLocal,
        statisticsQueryLocal
    } = props
    const [totalLocal, setTotalLocal] = useState<number>(0)
    const [queryLocal, setQueryLocal] = useState<QueryYakScriptRequest>({
        ...statisticsQueryLocal
    })
    const [refresh, setRefresh] = useState(false)
    const [isSelectAllLocal, setIsSelectAllLocal] = useState<boolean>(false)
    const [selectedRowKeysRecordLocal, setSelectedRowKeysRecordLocal] = useState<YakScript[]>([])
    const [visibleQuery, setVisibleQuery] = useState<boolean>(false)
    const [isFilter, setIsFilter] = useState(false)
    const [isShowYAMLPOC, setIsShowYAMLPOC] = useState(false)
    useEffect(() => {
        setQueryLocal({
            ...queryLocal,
            ...statisticsQueryLocal
        })
        onResetList()
    }, [statisticsQueryLocal])
    useEffect(() => {
        if (queryLocal.Type === defQueryLocal.Type) {
            setIsFilter(false)
        } else {
            setIsFilter(true)
        }
    }, [queryLocal])
    useDebounceEffect(
        () => {
            if (publicKeyword !== queryLocal.Keyword) {
                setQueryLocal({
                    ...queryLocal,
                    Keyword: publicKeyword
                })
                onResetList()
            }
        },
        [publicKeyword],
        {wait: 200}
    )
    const isRefListRef = useRef(true)
    useEffect(() => {
        if (isRefListRef.current) {
            isRefListRef.current = false
        } else {
            // 初次不执行
            onResetList()
            setScript()
        }
    }, [isRefList])
    const onRemoveLocalPlugin = useMemoizedFn(() => {
        const length = selectedRowKeysRecordLocal.length
        // isSelectAllLocal
        if (length === 0) {
            // 全部删除
            ipcRenderer
                .invoke("DeleteAllLocalPlugins", {})
                .then(() => {
                    setRefresh(!refresh)
                    setScript(undefined)
                    ipcRenderer.invoke("change-main-menu")
                    success("全部删除成功")
                })
                .catch((e) => {
                    failed(`删除所有本地插件错误:${e}`)
                })
        } else {
            // 批量删除
            ipcRenderer
                .invoke("DeleteYakScript", {
                    Ids: selectedRowKeysRecordLocal.map((ele) => ele.Id)
                })
                .then(() => {
                    setRefresh(!refresh)
                    setScript(undefined)
                    ipcRenderer.invoke("change-main-menu")
                    success(`成功删除${length}条数据`)
                })
                .catch((e) => {
                    failed(`批量删除本地插件错误:${e}`)
                })
        }
    })
    const onSelectAllLocal = useMemoizedFn((checked) => {
        setIsSelectAllLocal(checked)
        if (!checked) {
            setSelectedRowKeysRecordLocal([]) // 清除本地
        }
    })
    const onResetList = useMemoizedFn(() => {
        setRefresh(!refresh)
        onSelectAllLocal(false)
    })
    const onChangeSwitch = useMemoizedFn((checked) => {
        if (checked) {
            setQueryLocal({
                ...queryLocal,
                Type: "yak,mitm,codec,packet-hack,port-scan,nuclei"
            })
        } else {
            setQueryLocal({
                ...queryLocal,
                Type: "yak,mitm,codec,packet-hack,port-scan"
            })
        }
        setRefresh(!refresh)
        setIsShowYAMLPOC(checked)
        onSelectAllLocal(false)
    })
    const onAdd = useMemoizedFn(() => {
        let m = showDrawer({
            title: "创建新插件",
            width: "100%",
            content: (
                <>
                    <YakScriptCreatorForm
                        onChanged={(e) => {
                            setRefresh(!refresh)
                        }}
                        onCreated={() => {
                            m.destroy()
                        }}
                    />
                </>
            ),
            keyboard: false
        })
    })
    const onImport = useMemoizedFn(() => {
        let m = showModal({
            width: 800,
            title: "导入插件方式",
            content: (
                <>
                    <div style={{width: 800}}>
                        <LoadYakitPluginForm
                            onFinished={() => {
                                ipcRenderer.invoke("change-main-menu")
                                setRefresh(!refresh)
                                m.destroy()
                            }}
                        />
                    </div>
                </>
            )
        })
    })
    return (
        <div className='height-100'>
            <Row className='row-body' gutter={12}>
                <Col span={size === "small" ? 20 : 12} className='col'>
                    <Checkbox checked={isSelectAllLocal} onChange={(e) => onSelectAllLocal(e.target.checked)}>
                        全选
                    </Checkbox>
                    {selectedRowKeysRecordLocal.length > 0 && (
                        <Tag color='blue'>已选{selectedRowKeysRecordLocal.length}条</Tag>
                    )}
                    <Tag>Total:{totalLocal}</Tag>
                    <div className='flex-align-center'>
                        <Switch
                            size={size === "small" ? "small" : "default"}
                            onChange={onChangeSwitch}
                            checked={isShowYAMLPOC}
                        />
                        <span>&nbsp;&nbsp;展示YAML POC</span>
                    </div>
                </Col>
                <Col span={size === "small" ? 4 : 12} className='col-flex-end'>
                    <PluginFilter
                        visibleQuery={visibleQuery}
                        setVisibleQuery={setVisibleQuery}
                        queryChildren={
                            <QueryComponentLocal
                                onClose={() => setVisibleQuery(false)}
                                queryLocal={queryLocal}
                                setQueryLocal={(e) => {
                                    setQueryLocal(e)
                                    onResetList()
                                }}
                            />
                        }
                        size={size}
                        isFilter={isFilter}
                    />
                    <Popconfirm
                        title={selectedRowKeysRecordLocal.length === 0 ? "是否删除本地所有插件?" : "是否删除所选插件?"}
                        onConfirm={() => onRemoveLocalPlugin()}
                    >
                        {(size === "small" && (
                            <Tooltip title='删除'>
                                <DeleteOutlined className='delete-icon' />
                            </Tooltip>
                        )) || (
                            <Button size='small' type='primary' danger ghost>
                                删除
                            </Button>
                        )}
                    </Popconfirm>
                    {(size === "small" && (
                        <>
                            <Tooltip title='新建'>
                                <PlusOutlined className='operation-icon' onClick={onAdd} />
                            </Tooltip>
                            <Tooltip title='导入'>
                                <CloudDownloadOutlined
                                    //  @ts-ignore
                                    className='operation-icon'
                                    onClick={onImport}
                                />
                            </Tooltip>
                        </>
                    )) || (
                        <>
                            <Button size='small' type='primary' onClick={onAdd}>
                                新建
                            </Button>
                            <Button size='small' type='primary' onClick={onImport}>
                                导入
                            </Button>
                        </>
                    )}
                </Col>
            </Row>
            <div className='list-height'>
                <YakModuleList
                    isGridLayout={size === "middle"}
                    numberLocalRoll={numberLocal}
                    itemHeight={150} //137+12
                    currentScript={script}
                    onClicked={(info, index) => {
                        if (info?.Id === script?.Id) return
                        if (size === "middle") {
                            setNumberLocal(index || 0)
                        }
                        setScript(info)
                    }}
                    setTotal={setTotalLocal}
                    queryLocal={queryLocal}
                    refresh={refresh}
                    deletePluginRecordLocal={deletePluginRecordLocal}
                    isSelectAll={isSelectAllLocal}
                    selectedRowKeysRecord={selectedRowKeysRecordLocal}
                    onSelectList={setSelectedRowKeysRecordLocal}
                    updatePluginRecordLocal={updatePluginRecordLocal}
                    setUpdatePluginRecordLocal={setUpdatePluginRecordLocal}
                />
            </div>
        </div>
    )
}

export interface YakModuleListProp {
    onClicked: (y?: YakScript, i?: number) => any
    currentScript?: YakScript
    itemHeight: number
    isRef?: boolean
    onYakScriptRender?: (i: YakScript, maxWidth?: number) => any
    setTotal?: (n: number) => void
    queryLocal?: QueryYakScriptRequest
    refresh?: boolean
    deletePluginRecordLocal?: YakScript
    updatePluginRecordLocal?: YakScript
    trigger?: boolean
    isSelectAll?: boolean
    selectedRowKeysRecord?: YakScript[]
    onSelectList?: (m: YakScript[]) => void
    setUpdatePluginRecordLocal?: (y: YakScript) => any
    numberLocalRoll?: number
    isGridLayout?: boolean
}

export const YakModuleList: React.FC<YakModuleListProp> = (props) => {
    const defaultQuery = useCreation(() => {
        return {
            Type: "mitm,port-scan",
            Keyword: "",
            Pagination: {Limit: 20, Order: "desc", Page: 1, OrderBy: "updated_at"}
        }
    }, [])
    const {
        deletePluginRecordLocal,
        itemHeight,
        queryLocal = defaultQuery,
        updatePluginRecordLocal,
        isSelectAll,
        selectedRowKeysRecord,
        onSelectList,
        setUpdatePluginRecordLocal,
        numberLocalRoll,
        isGridLayout
    } = props

    // 全局登录状态
    const {userInfo} = useStore()
    const [params, setParams] = useState<QueryYakScriptRequest>({
        ...queryLocal
    })
    const [response, setResponse] = useState<QueryYakScriptsResponse>({
        Data: [],
        Pagination: {
            Limit: 20,
            Page: 0,
            Order: "desc",
            OrderBy: "updated_at"
        },
        Total: 0
    })
    const [maxWidth, setMaxWidth] = useState<number>(260)
    const [loading, setLoading] = useState(false)
    const [listBodyLoading, setListBodyLoading] = useState(false)
    const numberLocal = useRef<number>(0) // 本地 选择的插件index
    useEffect(() => {
        if (isSelectAll) {
            if (onSelectList) onSelectList(response.Data)
        }
    }, [isSelectAll])
    useEffect(() => {
        if (!updatePluginRecordLocal) return
        // 列表中第一次上传的时候,本地返回的数据有OnlineId ,但是列表中的上传的那个没有OnlineId
        // 且列表中的本地Id和更新的那个Id不一样
        // 所有以本地ScriptName进行查找 ,ScriptName在本地和线上都是唯一的
        let index = response.Data.findIndex((ele) => ele.ScriptName === updatePluginRecordLocal.ScriptName)
        if (index === -1) return
        response.Data[index] = {...updatePluginRecordLocal}
        setResponse({
            ...response,
            Data: [...response.Data]
        })
    }, [updatePluginRecordLocal])
    const update = (page?: number, limit?: number, query?: QueryYakScriptRequest) => {
        const newParams = {
            ...params,
            ...query
        }
        if (page) newParams.Pagination.Page = page
        if (limit) newParams.Pagination.Limit = limit
        setLoading(true)
        ipcRenderer
            .invoke("QueryYakScript", newParams)
            .then((item: QueryYakScriptsResponse) => {
                const data = page === 1 ? item.Data : response.Data.concat(item.Data)
                const isMore = item.Data.length < item.Pagination.Limit
                setHasMore(!isMore)
                setResponse({
                    ...item,
                    Data: [...data]
                })
                if (props.setTotal) props.setTotal(item.Total || 0)
            })
            .catch((e: any) => {
                failed("Query Local Yak Script failed: " + `${e}`)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                    setListBodyLoading(false)
                }, 200)
            })
    }
    const [isRef, setIsRef] = useState(false)
    useEffect(() => {
        setParams({
            ...params,
            ...queryLocal
        })
        setIsRef(!isRef)
        setListBodyLoading(true)
        update(1, undefined, queryLocal)
        if (onSelectList) onSelectList([])
    }, [userInfo.isLogin, props.refresh])
    useEffect(() => {
        if (!deletePluginRecordLocal) return
        response.Data.splice(numberLocal.current, 1)
        setResponse({
            ...response,
            Data: [...response.Data]
        })
        props.onClicked()
    }, [deletePluginRecordLocal?.Id])
    const [hasMore, setHasMore] = useState<boolean>(false)
    const loadMoreData = useMemoizedFn(() => {
        update(parseInt(`${response.Pagination.Page}`) + 1, undefined)
    })
    const onSelect = useMemoizedFn((item: YakScript) => {
        if (!selectedRowKeysRecord) return
        const index = selectedRowKeysRecord.findIndex((ele) => ele.Id === item.Id)
        if (index === -1) {
            selectedRowKeysRecord.push(item)
        } else {
            selectedRowKeysRecord.splice(index, 1)
        }
        if (onSelectList) onSelectList([...selectedRowKeysRecord])
    })
    const onShare = useMemoizedFn((item: YakScript) => {
        Modal.info({
            title: "请将插件id复制以后分享给朋友，导入后即可使用。",
            icon: <InfoCircleOutlined />,
            content: <CopyableField text={item.UUID} />
        })
    })
    return (
        <Spin spinning={listBodyLoading}>
            <RollingLoadList<YakScript>
                isGridLayout={isGridLayout}
                numberRoll={numberLocalRoll}
                isRef={isRef}
                data={response.Data}
                page={response.Pagination.Page}
                hasMore={hasMore}
                loading={loading}
                loadMoreData={loadMoreData}
                classNameList='plugin-list-body'
                defItemHeight={itemHeight}
                renderRow={(data: YakScript, index) => (
                    <PluginListLocalItem
                        plugin={data}
                        userInfo={userInfo}
                        onClicked={(info) => {
                            numberLocal.current = index
                            props.onClicked(info, index)
                        }}
                        currentScript={props.currentScript}
                        onYakScriptRender={props.onYakScriptRender}
                        maxWidth={maxWidth}
                        selectedRowKeysRecord={selectedRowKeysRecord || []}
                        onSelect={onSelect}
                        setUpdatePluginRecordLocal={(s) => {
                            if (setUpdatePluginRecordLocal) setUpdatePluginRecordLocal(s)
                        }}
                        onShare={onShare}
                    />
                )}
            />
        </Spin>
    )
}

interface PluginListLocalProps {
    plugin: YakScript
    userInfo: UserInfoProps
    onClicked: (y: YakScript) => any
    currentScript?: YakScript
    onYakScriptRender?: (i: YakScript, maxWidth?: number) => any
    maxWidth: number
    onSelect: (info: YakScript) => any
    onShare: (info: YakScript) => any
    selectedRowKeysRecord: YakScript[]
    setUpdatePluginRecordLocal: (y: YakScript) => any
}
export const PluginListLocalItem: React.FC<PluginListLocalProps> = (props) => {
    const {plugin, selectedRowKeysRecord, onSelect, setUpdatePluginRecordLocal, currentScript, onShare} = props
    const {userInfo, maxWidth, onClicked} = props
    const [uploadLoading, setUploadLoading] = useState(false)
    const updateListItem = useMemoizedFn((updatePlugin: YakScript) => {
        setUpdatePluginRecordLocal(updatePlugin)
        if (!currentScript) return
        // 本地插件OnlineId为0,本地Id不一样,所以用 ScriptName  是唯一的
        if ((updatePlugin.OnlineId as number) > 0 && currentScript.ScriptName === updatePlugin.ScriptName) {
            onClicked(updatePlugin)
        }
    })
    if (props.onYakScriptRender) {
        return props.onYakScriptRender(plugin, maxWidth)
    }
    return (
        <div
            className={`plugin-item ${currentScript?.Id === plugin.Id && "plugin-item-active"}`}
            onClick={() => props.onClicked(plugin)}
        >
            <div className={`plugin-item-heard ${currentScript?.Id === plugin.Id && "plugin-item-heard-active"}`}>
                <div className='plugin-item-left'>
                    <div className='text-style content-ellipsis'>{plugin.ScriptName}</div>
                    <div className='icon-body'>
                        <div className='text-icon'>
                            {plugin.OnlineId > 0 && !plugin.OnlineIsPrivate && <OnlineCloudIcon />}
                            {plugin.OnlineId > 0 && plugin.OnlineIsPrivate && <LockOutlined />}
                        </div>
                        {gitUrlIcon(plugin.FromGit)}
                    </div>
                </div>
                <div className='plugin-item-right'>
                    {plugin.UUID && (
                        <ShareIcon
                            // @ts-ignore
                            className='operation-icon'
                            onClick={(e) => {
                                e.stopPropagation()
                                onShare(plugin)
                            }}
                        />
                    )}
                    {(uploadLoading && <LoadingOutlined className='upload-outline' />) || (
                        <>
                            {(userInfo.user_id == plugin.UserId || plugin.UserId == 0) && (
                                <SyncCloudButton
                                    params={plugin}
                                    setParams={updateListItem}
                                    uploadLoading={setUploadLoading}
                                >
                                    <UploadOutlined className='upload-outline' />
                                </SyncCloudButton>
                            )}
                        </>
                    )}
                </div>
                <SelectIcon
                    //  @ts-ignore
                    className={`icon-select  ${
                        selectedRowKeysRecord.findIndex((ele) => ele.Id === plugin.Id) !== -1 && "icon-select-active"
                    }`}
                    onClick={(e) => {
                        e.stopPropagation()
                        onSelect(plugin)
                    }}
                />
            </div>
            <div className='plugin-item-content'>
                <div className='plugin-help content-ellipsis'>{plugin.Help || "No Description about it."}</div>
                {plugin.Tags && plugin.Tags !== "null" && <div className='plugin-tag'>TAG:{plugin.Tags}</div>}
                <div className='plugin-item-footer'>
                    <div className='plugin-item-footer-left'>
                        {plugin.HeadImg && <img alt='' src={plugin.HeadImg} />}
                        <div className='plugin-item-author content-ellipsis'>{plugin.Author || "anonymous"}</div>
                    </div>
                    <div className='plugin-item-time'>{formatDate(plugin.CreatedAt)}</div>
                </div>
            </div>
        </div>
    )
}

const loadLocalYakitPluginCode = `yakit.AutoInitYakit()

log.setLevel("info")

localPath = cli.String("local-path")
if localPath == "" {
    yakit.Error("本地仓库路径为空")
    return
}

err = yakit.UpdateYakitStoreLocal(localPath)
if err != nil {
    yakit.Error("更新本地仓库失败：%v", err)
    die(err)
}

yakit.Output("更新本地仓库成功")
`

const loadNucleiPoCFromLocal = `yakit.AutoInitYakit();

loglevel("info");

localPath = cli.String("local-path");

yakit.Info("Load Local Nuclei Templates Repository: %v", localPath)
err = nuclei.UpdateDatabase(localPath)
if err != nil {
    yakit.Error("Update Failed: %v", err)
    return
}
yakit.Info("Update Nuclei PoC Finished")
`

const loadYakitPluginCode = `yakit.AutoInitYakit()
loglevel("info")

gitUrl = cli.String("giturl")
nucleiGitUrl = cli.String("nuclei-templates-giturl")
proxy = cli.String("proxy")

yakit.Info("Checking Plugins Resources ...")
if gitUrl == "" && nucleiGitUrl == "" {
    yakit.Error("Empty Plugin Storage")
    die("empty giturl")
}
yakit.Info("preparing for loading yak plugins：%v", gitUrl)
yakit.Info("preparing for loading nuclei-templates pocs：%v", nucleiGitUrl)

wg = sync.NewWaitGroup()
wg.Add(2)

go func{
    defer wg.Done()
    defer func{
        err = recover()
        if err != nil {
            yakit.Error("error: %v", err)
        }
    }
    
    if !str.HasPrefix(gitUrl, "http") { return }
    yakit.Info("Start to load Yak Plugin!")
    
    if proxy != "" {
        yakit.Info("proxy: %v", proxy)
        log.Info("proxy: %v", proxy)
        err := yakit.UpdateYakitStoreFromGit(context.Background(), gitUrl, proxy)
        if err != nil {
            yakit.Error("load URL[%v] failed: %v", gitUrl, err)
            die(err)
        }
    } else{
        yakit.Info("No Proxy")
        err = yakit.UpdateYakitStoreFromGit(context.Background(), gitUrl)
        if err != nil {
            yakit.Error("load URL[%v] failed: %v", gitUrl, err)
            die(err)
        }
    }
}

go func {
    defer wg.Done()
    defer func{
        err = recover()
        if err != nil {
            yakit.Error("error: %v", err)
        }
    }
    
    if nucleiGitUrl == "" {
        yakit.Info("no nuclei git url input")
        return
    }
    
    yakit.Info("Start to load Yaml PoC!")
    proxies = make([]string)
    if proxy != "" {
        proxies = append(proxies, proxy)
    }
    
    path, err = nuclei.PullDatabase(nucleiGitUrl, proxies...)
    if err != nil {
        yakit.Error("pull nuclei templates failed: %s", err)
        die(err)
    }
    
    err = nuclei.UpdateDatabase(path)
    if err != nil {
        yakit.Error("update database from %v failed: %v", path, dir)
        die(err)
    }
}


yakit.Output("Waiting for loading...")
wg.Wait()
yakit.Output("Update Finished...")
`

const YAKIT_DEFAULT_LOAD_GIT_PROXY = "YAKIT_DEFAULT_LOAD_GIT_PROXY"
const YAKIT_DEFAULT_LOAD_LOCAL_PATH = "YAKIT_DEFAULT_LOAD_LOCAL_PATH"
const YAKIT_DEFAULT_LOAD_LOCAL_NUCLEI_POC_PATH = "YAKIT_DEFAULT_LOAD_LOCAL_NUCLEI_POC_PATH"

export const LoadYakitPluginForm = React.memo((p: {onFinished: () => any}) => {
    const [gitUrl, setGitUrl] = useState("https://github.com/yaklang/yakit-store")
    const [nucleiGitUrl, setNucleiGitUrl] = useState("https://github.com/projectdiscovery/nuclei-templates")
    const [proxy, setProxy] = useState("")
    const [loadMode, setLoadMode] = useState<"official" | "giturl" | "local" | "local-nuclei" | "uploadId">("official")
    const [localPath, setLocalPath] = useState("")
    const [localNucleiPath, setLocalNucleiPath] = useState("")
    const [localId, setLocalId] = useState<string>("")

    useEffect(() => {
        getValue(YAKIT_DEFAULT_LOAD_LOCAL_PATH).then((e) => {
            if (e) {
                setLocalPath(e)
            }
        })
    }, [])

    useEffect(() => {
        getValue(YAKIT_DEFAULT_LOAD_LOCAL_NUCLEI_POC_PATH).then((e) => {
            if (e) {
                setLocalNucleiPath(e)
            }
        })
    }, [])

    useEffect(() => {
        if (loadMode === "giturl" && proxy === "") {
            setGitUrl("https://ghproxy.com/https://github.com/yaklang/yakit-store")
            setNucleiGitUrl("https://ghproxy.com/https://github.com/projectdiscovery/nuclei-templates")
        }
    }, [loadMode])

    useEffect(() => {
        getValue(YAKIT_DEFAULT_LOAD_GIT_PROXY).then((e) => {
            if (e) {
                setProxy(`${e}`)
            }
        })

        return () => {
            p.onFinished()
        }
    }, [])

    return (
        <Form
            labelCol={{span: 5}}
            wrapperCol={{span: 16}}
            onSubmitCapture={(e) => {
                e.preventDefault()
                if (proxy !== "") {
                    saveValue(YAKIT_DEFAULT_LOAD_GIT_PROXY, proxy)
                }

                if (localPath !== "") {
                    saveValue(YAKIT_DEFAULT_LOAD_LOCAL_PATH, localPath)
                }

                if (localNucleiPath !== "") {
                    saveValue(YAKIT_DEFAULT_LOAD_LOCAL_NUCLEI_POC_PATH, localNucleiPath)
                }
                if (["official", "giturl"].includes(loadMode)) {
                    const params: YakExecutorParam[] = [
                        {Key: "giturl", Value: ""},
                        {Key: "nuclei-templates-giturl", Value: nucleiGitUrl}
                    ]
                    if (proxy.trim() !== "") {
                        params.push({Value: proxy.trim(), Key: "proxy"})
                    }
                    startExecYakCode("导入 Yak 插件", {
                        Script: loadYakitPluginCode,
                        Params: params
                    })
                }
                if (loadMode === "local") {
                    startExecYakCode("导入 Yak 插件（本地）", {
                        Script: loadLocalYakitPluginCode,
                        Params: [{Key: "local-path", Value: localPath}]
                    })
                }

                if (loadMode === "local-nuclei") {
                    startExecYakCode("从 Nuclei Template Git 本地仓库更新", {
                        Script: loadNucleiPoCFromLocal,
                        Params: [{Key: "local-path", Value: localNucleiPath}]
                    })
                }

                if (loadMode === "uploadId") {
                    ipcRenderer
                        .invoke("DownloadOnlinePluginById", {
                            UUID: localId
                        } as DownloadOnlinePluginProps)
                        .then(() => {
                            p.onFinished()
                            success("插件导入成功")
                        })
                        .catch((e: any) => {
                            failed(`插件导入失败: ${e}`)
                        })
                }
            }}
        >
            <SelectOne
                label={" "}
                colon={false}
                data={[
                    {text: "使用官方源", value: "official"},
                    {text: "第三方仓库源", value: "giturl"},
                    {text: "本地仓库", value: "local"},
                    {text: "本地 Yaml PoC", value: "local-nuclei"},
                    {text: "使用ID", value: "uploadId"}
                ]}
                value={loadMode}
                setValue={setLoadMode}
            />
            {["official", "giturl"].includes(loadMode) && (
                <>
                    {loadMode === "official" && (
                        <Form.Item label={" "} colon={false}>
                            <Alert
                                message={
                                    <div>
                                        如果因为网络问题无法访问 Github，请切换到第三方仓库源，选择 Gitee 镜像
                                        ghproxy.com 镜像
                                    </div>
                                }
                            />
                        </Form.Item>
                    )}
                    {/* <InputItem
                        disable={loadMode === "official"}
                        required={true}
                        label={"Git URL"}
                        autoComplete={[
                            "https://github.com/yaklang/yakit-store",
                            "https://ghproxy.com/https://github.com/yaklang/yakit-store"
                        ]}
                        value={gitUrl}
                        setValue={setGitUrl}
                        help={"例如 https://github.com/yaklang/yakit-store"}
                    /> */}
                    <InputItem
                        required={true}
                        disable={loadMode === "official"}
                        autoComplete={[
                            "https://github.com/projectdiscovery/nuclei-templates",
                            "https://ghproxy.com/https://github.com/projectdiscovery/nuclei-templates"
                        ]}
                        label={"Yaml PoC URL"}
                        value={nucleiGitUrl}
                        setValue={setNucleiGitUrl}
                        help={"nuclei templates 默认插件源"}
                    />
                    <InputItem
                        label={"代理"}
                        value={proxy}
                        setValue={setProxy}
                        help={"通过代理访问中国大陆无法访问的代码仓库：例如" + "http://127.0.0.1:7890"}
                    />
                    {proxy === "" && loadMode === "giturl" && (
                        <Form.Item label={" "} colon={false}>
                            <Alert
                                type={"warning"}
                                message={<div>无代理设置推荐使用 ghproxy.com / gitee 镜像源</div>}
                            />
                        </Form.Item>
                    )}
                </>
            )}
            {loadMode === "local" && (
                <>
                    <InputItem label={"本地仓库地址"} value={localPath} setValue={setLocalPath} />
                </>
            )}
            {loadMode === "local-nuclei" && (
                <>
                    <InputItem label={"Nuclei PoC 本地路径"} value={localNucleiPath} setValue={setLocalNucleiPath} />
                </>
            )}
            {loadMode === "uploadId" && (
                <>
                    <InputItem label={"插件ID"} value={localId} setValue={setLocalId} />
                </>
            )}
            <Form.Item colon={false} label={" "}>
                <Button type='primary' htmlType='submit'>
                    {" "}
                    导入{" "}
                </Button>
            </Form.Item>
        </Form>
    )
})

interface DownloadOnlinePluginAllResProps {
    Progress: number
    Log: string
}

export const gitUrlIcon = (url: string | undefined, noTag?: boolean) => {
    if (!url) {
        return <></>
    }
    return (
        <Tooltip title={url}>
            <GithubOutlined className='github-icon' />
        </Tooltip>
    )
}
interface AddAllPluginProps {
    setListLoading: (a: boolean) => void
    selectedRowKeysRecord: API.YakitPluginDetail[]
    user: boolean
    userInfo: UserInfoProps
    onFinish: () => void
    oneImport?: boolean
    size?: "middle" | "small"
    query?: SearchPluginOnlineRequest
    isSelectAll?: boolean
}

interface DownloadOnlinePluginByIdsRequest {
    OnlineIDs: number[]
    UUID: string[]
}

interface DownloadOnlinePluginByTokenRequest {
    isAddToken: boolean
    BindMe: boolean
    Keywords?: string
    PluginType?: string
    Status?: string
    IsPrivate?: string
}

const AddAllPlugin: React.FC<AddAllPluginProps> = (props) => {
    const {selectedRowKeysRecord, setListLoading, user, userInfo, onFinish, oneImport, size, query, isSelectAll} = props
    const [taskToken, setTaskToken] = useState(randomString(40))
    // 全部添加进度条
    const [addLoading, setAddLoading] = useState<boolean>(false)
    const [percent, setPercent, getPercent] = useGetState<number>(0)
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
                setAddLoading(false)
                setPercent(0)
                onFinish()
                ipcRenderer.invoke("change-main-menu")
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
        if (user && !userInfo.isLogin) {
            warn("我的插件需要先登录才能下载，请先登录")
            return
        }
        if (selectedRowKeysRecord.length === 0 || isSelectAll) {
            // 全部添加
            setAddLoading(true)
            let addParams: DownloadOnlinePluginByTokenRequest = {isAddToken: true, BindMe: user}
            // 一键导入不加条件，其他要加
            if (!oneImport) {
                addParams = {
                    ...addParams,
                    Keywords: query?.keywords,
                    PluginType: query?.plugin_type,
                    Status: query?.status,
                    IsPrivate: query?.is_private
                }
            }
            ipcRenderer
                .invoke("DownloadOnlinePluginAll", addParams, taskToken)
                .then(() => {})
                .catch((e) => {
                    failed(`添加失败:${e}`)
                })
        } else {
            // 批量添加
            const uuIds: string[] = []
            const onlineIDs: number[] = []
            selectedRowKeysRecord.forEach((item) => {
                uuIds.push(item.uuid)
                onlineIDs.push(item.id)
            })
            setListLoading(true)
            ipcRenderer
                .invoke("DownloadOnlinePluginByIds", {
                    UUID: uuIds,
                    OnlineIDs: onlineIDs
                } as DownloadOnlinePluginByIdsRequest)
                .then(() => {
                    success(`共添加${selectedRowKeysRecord.length}条数据到本地`)
                    onFinish()
                })
                .catch((e) => {
                    failed(`添加失败:${e}`)
                })
                .finally(() => {
                    setTimeout(() => {
                        setListLoading(false)
                    }, 200)
                })
        }
    })
    const StopAllPlugin = () => {
        setAddLoading(false)
        ipcRenderer.invoke("cancel-DownloadOnlinePluginAll", taskToken).catch((e) => {
            failed(`停止添加失败:${e}`)
        })
    }
    return (
        <>
            {addLoading && (
                <div className='filter-opt-progress'>
                    <Progress
                        size='small'
                        status={!addLoading && percent !== 0 ? "exception" : undefined}
                        percent={percent}
                    />
                </div>
            )}
            {addLoading ? (
                <>
                    {(size === "small" && <PoweroffOutlined className='filter-opt-btn' onClick={StopAllPlugin} />) || (
                        <Button size='small' type='primary' danger onClick={StopAllPlugin}>
                            停止
                        </Button>
                    )}
                </>
            ) : (
                <>
                    {(oneImport && (
                        <Popconfirm
                            title={user ? "确定将我的插件所有数据导入到本地吗?" : "确定将插件商店所有数据导入到本地吗?"}
                            onConfirm={AddAllPlugin}
                            okText='Yes'
                            cancelText='No'
                            placement={size === "small" ? "top" : "topRight"}
                        >
                            {(size === "small" && <div className='operation-text'>一键导入</div>) || (
                                <Button type='primary' size='small'>
                                    一键导入
                                </Button>
                            )}
                        </Popconfirm>
                    )) || (
                        <>
                            {(selectedRowKeysRecord.length === 0 && !(user && !userInfo.isLogin) && (
                                <Popconfirm
                                    title={
                                        user
                                            ? "确定将我的插件所有数据导入到本地吗"
                                            : "确定将插件商店所有数据导入到本地吗?"
                                    }
                                    onConfirm={AddAllPlugin}
                                    okText='Yes'
                                    cancelText='No'
                                    placement={size === "small" ? "top" : "topRight"}
                                >
                                    {(size === "small" && (
                                        <Tooltip title='下载'>
                                            <DownloadOutlined className='operation-icon ' />
                                        </Tooltip>
                                    )) || (
                                        <Button type='primary' size='small'>
                                            下载
                                        </Button>
                                    )}
                                </Popconfirm>
                            )) || (
                                <>
                                    {(size === "small" && (
                                        <Tooltip title='下载'>
                                            <DownloadOutlined className='operation-icon ' onClick={AddAllPlugin} />
                                        </Tooltip>
                                    )) || (
                                        <Button type='primary' size='small' onClick={AddAllPlugin}>
                                            下载
                                        </Button>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </>
            )}
        </>
    )
}

export interface StarsOperation {
    id: number
    operation: string
}
interface YakModuleUserProps {
    userPlugin?: API.YakitPluginDetail
    setUserPlugin: (u?: API.YakitPluginDetail) => void
    userInfo: UserInfoProps
    isRefList: boolean
    publicKeyword: string
    deletePluginRecordUser?: API.YakitPluginDetail
    updatePluginRecordUser?: API.YakitPluginDetail
    setListLoading: (l: boolean) => void
    size: "middle" | "small"
    numberUser?: number
    setNumberUser: (n: number) => void
    setStatisticsQueryUser: (u: SearchPluginOnlineRequest) => void
    statisticsQueryUser: SearchPluginOnlineRequest
}
export const YakModuleUser: React.FC<YakModuleUserProps> = (props) => {
    const {
        userPlugin,
        setUserPlugin,
        userInfo,
        publicKeyword,
        isRefList,
        deletePluginRecordUser,
        setListLoading,
        updatePluginRecordUser,
        size,
        numberUser,
        setNumberUser,
        statisticsQueryUser,
        setStatisticsQueryUser
    } = props
    const [queryUser, setQueryUser] = useState<SearchPluginOnlineRequest>({
        ...statisticsQueryUser
    })
    const [isFilter, setIsFilter] = useState(false)
    const [selectedRowKeysRecordUser, setSelectedRowKeysRecordUser] = useState<API.YakitPluginDetail[]>([])
    const [totalUser, setTotalUser] = useState<number>(0)
    const [refresh, setRefresh] = useState(false)
    const [visibleQuery, setVisibleQuery] = useState<boolean>(false)
    const [isSelectAllUser, setIsSelectAllUser] = useState<boolean>(false)
    useEffect(() => {
        setQueryUser({
            ...queryUser,
            ...statisticsQueryUser
        })
        onResetList()
    }, [statisticsQueryUser])
    useEffect(() => {
        if (!userInfo.isLogin) onSelectAllUser(false)
    }, [userInfo])
    useEffect(() => {
        if (
            !queryUser.is_private &&
            queryUser.order_by === "stars" &&
            queryUser.order === "desc" &&
            queryUser.plugin_type === typeOnline &&
            !queryUser.status &&
            queryUser.bind_me === false
        ) {
            setIsFilter(false)
        } else {
            setIsFilter(true)
        }
    }, [queryUser])
    useDebounceEffect(
        () => {
            if (publicKeyword !== queryUser.keywords) {
                setQueryUser({
                    ...queryUser,
                    keywords: publicKeyword
                })
                onResetList()
            }
        },
        [publicKeyword],
        {wait: 200}
    )
    const isRefListRef = useRef(true)
    useEffect(() => {
        if (isRefListRef.current) {
            isRefListRef.current = false
        } else {
            // 初次不执行
            onResetList()
            setUserPlugin()
        }
    }, [isRefList])
    const onSelectAllUser = useMemoizedFn((checked) => {
        setIsSelectAllUser(checked)
        if (!checked) {
            setSelectedRowKeysRecordUser([]) // 清除本地
        }
    })
    const onResetList = useMemoizedFn(() => {
        setRefresh(!refresh)
        onSelectAllUser(false)
    })
    return (
        <div className='height-100'>
            <Row className='row-body' gutter={12}>
                <Col span={12} className='col'>
                    <Checkbox checked={isSelectAllUser} onChange={(e) => onSelectAllUser(e.target.checked)}>
                        全选
                    </Checkbox>
                    {selectedRowKeysRecordUser.length > 0 && (
                        <Tag color='blue'>已选{selectedRowKeysRecordUser.length}条</Tag>
                    )}
                    <Tag>Total:{totalUser}</Tag>
                </Col>
                <Col span={12} className='col-flex-end'>
                    <PluginFilter
                        visibleQuery={visibleQuery}
                        setVisibleQuery={setVisibleQuery}
                        queryChildren={
                            <QueryComponentOnline
                                onClose={() => setVisibleQuery(false)}
                                userInfo={userInfo}
                                queryOnline={queryUser}
                                setQueryOnline={(e) => {
                                    setQueryUser(e)
                                    onResetList()
                                }}
                                user={true}
                            />
                        }
                        size={size}
                        isFilter={isFilter}
                    />
                    <AddAllPlugin
                        selectedRowKeysRecord={selectedRowKeysRecordUser}
                        setListLoading={setListLoading}
                        user={true}
                        userInfo={userInfo}
                        onFinish={() => {
                            onSelectAllUser(false)
                        }}
                        size={size}
                        isSelectAll={isSelectAllUser}
                        query={queryUser}
                    />
                    <AddAllPlugin
                        oneImport={true}
                        size={size}
                        selectedRowKeysRecord={[]}
                        setListLoading={setListLoading}
                        user={true}
                        userInfo={userInfo}
                        onFinish={() => {}}
                    />
                </Col>
            </Row>
            <div className='list-height'>
                <YakModuleOnlineList
                    number={numberUser}
                    size={size}
                    currentId={userPlugin?.id || 0}
                    queryOnline={queryUser}
                    selectedRowKeysRecord={selectedRowKeysRecordUser}
                    onSelectList={setSelectedRowKeysRecordUser} //选择一个
                    isSelectAll={isSelectAllUser}
                    setIsSelectAll={setIsSelectAllUser}
                    setTotal={setTotalUser}
                    onClicked={(info, index) => {
                        if (size === "middle") {
                            setNumberUser(index || 0)
                        }
                        setUserPlugin(info)
                    }}
                    userInfo={userInfo}
                    bind_me={true}
                    refresh={refresh}
                    deletePluginRecord={deletePluginRecordUser}
                    updatePluginRecord={updatePluginRecordUser}
                />
            </div>
        </div>
    )
}

interface YakModuleOnlineProps {
    plugin?: API.YakitPluginDetail
    setPlugin: (u?: API.YakitPluginDetail) => void
    userInfo: UserInfoProps
    isRefList: boolean
    publicKeyword: string
    deletePluginRecordOnline?: API.YakitPluginDetail
    updatePluginRecordOnline?: API.YakitPluginDetail
    setListLoading: (l: boolean) => void
    size: "middle" | "small"
    numberOnline?: number
    setNumberOnline: (n: number) => void
    setStatisticsQueryOnline: (q: SearchPluginOnlineRequest) => void
    statisticsQueryOnline: SearchPluginOnlineRequest
}
export const YakModuleOnline: React.FC<YakModuleOnlineProps> = (props) => {
    const {
        plugin,
        setPlugin,
        userInfo,
        publicKeyword,
        isRefList,
        deletePluginRecordOnline,
        setListLoading,
        updatePluginRecordOnline,
        size,
        numberOnline,
        setNumberOnline,
        statisticsQueryOnline,
        setStatisticsQueryOnline
    } = props
    const [queryOnline, setQueryOnline] = useState<SearchPluginOnlineRequest>({
        ...statisticsQueryOnline
    })
    const [isFilter, setIsFilter] = useState(false)
    const [selectedRowKeysRecordOnline, setSelectedRowKeysRecordOnline] = useState<API.YakitPluginDetail[]>([])
    const [totalUserOnline, setTotalOnline] = useState<number>(0)
    const [refresh, setRefresh] = useState(false)
    const [visibleQuery, setVisibleQuery] = useState<boolean>(false)
    const [isSelectAllOnline, setIsSelectAllOnline] = useState<boolean>(false)
    useEffect(() => {
        setQueryOnline({
            ...queryOnline,
            ...statisticsQueryOnline
        })
        onResetList()
    }, [statisticsQueryOnline])
    useEffect(() => {
        if (!userInfo.isLogin) onSelectAllOnline(false)
    }, [userInfo])
    useEffect(() => {
        if (
            !queryOnline.is_private &&
            queryOnline.order_by === "stars" &&
            queryOnline.order === "desc" &&
            queryOnline.plugin_type === typeOnline &&
            !queryOnline.status &&
            queryOnline.bind_me === false
        ) {
            setIsFilter(false)
        } else {
            setIsFilter(true)
        }
    }, [queryOnline])
    useDebounceEffect(
        () => {
            if (publicKeyword !== queryOnline.keywords) {
                setQueryOnline({
                    ...queryOnline,
                    keywords: publicKeyword
                })
                onResetList()
            }
        },
        [publicKeyword],
        {wait: 200}
    )
    const isRefListRef = useRef(true)
    useEffect(() => {
        if (isRefListRef.current) {
            isRefListRef.current = false
        } else {
            // 初次不执行
            onResetList()
            setPlugin()
        }
    }, [isRefList])
    const onSelectAllOnline = useMemoizedFn((checked) => {
        setIsSelectAllOnline(checked)
        if (!checked) {
            setSelectedRowKeysRecordOnline([]) // 清除本地
        }
    })
    const onResetList = useMemoizedFn(() => {
        setRefresh(!refresh)
        onSelectAllOnline(false)
    })
    return (
        <div className='height-100'>
            <Row className='row-body' gutter={12}>
                <Col span={12} className='col'>
                    <Checkbox checked={isSelectAllOnline} onChange={(e) => onSelectAllOnline(e.target.checked)}>
                        全选
                    </Checkbox>
                    {selectedRowKeysRecordOnline.length > 0 && (
                        <Tag color='blue'>
                            已选{isSelectAllOnline ? totalUserOnline : selectedRowKeysRecordOnline.length}条
                        </Tag>
                    )}
                    <Tag>Total:{totalUserOnline}</Tag>
                </Col>
                <Col span={12} className='col-flex-end'>
                    <PluginFilter
                        visibleQuery={visibleQuery}
                        setVisibleQuery={setVisibleQuery}
                        queryChildren={
                            <QueryComponentOnline
                                onClose={() => setVisibleQuery(false)}
                                userInfo={userInfo}
                                queryOnline={queryOnline}
                                setQueryOnline={(e) => {
                                    setQueryOnline(e)
                                    onResetList()
                                }}
                                user={false}
                            />
                        }
                        size={size}
                        isFilter={isFilter}
                    />
                    <AddAllPlugin
                        selectedRowKeysRecord={selectedRowKeysRecordOnline}
                        setListLoading={setListLoading}
                        user={false}
                        userInfo={userInfo}
                        onFinish={() => {
                            onSelectAllOnline(false)
                        }}
                        size={size}
                        isSelectAll={isSelectAllOnline}
                        query={queryOnline}
                    />
                    <AddAllPlugin
                        oneImport={true}
                        size={size}
                        selectedRowKeysRecord={[]}
                        setListLoading={setListLoading}
                        user={false}
                        userInfo={userInfo}
                        onFinish={() => {}}
                    />
                </Col>
            </Row>
            <div className='list-height'>
                <YakModuleOnlineList
                    number={numberOnline}
                    size={size}
                    currentId={plugin?.id || 0}
                    queryOnline={queryOnline}
                    selectedRowKeysRecord={selectedRowKeysRecordOnline}
                    onSelectList={setSelectedRowKeysRecordOnline}
                    isSelectAll={isSelectAllOnline}
                    setIsSelectAll={setIsSelectAllOnline}
                    setTotal={setTotalOnline}
                    onClicked={(info, index) => {
                        if (size === "middle") {
                            setNumberOnline(index || 0)
                        }
                        setPlugin(info)
                    }}
                    userInfo={userInfo}
                    bind_me={false}
                    refresh={refresh}
                    deletePluginRecord={deletePluginRecordOnline}
                    updatePluginRecord={updatePluginRecordOnline}
                />
            </div>
        </div>
    )
}

interface YakModuleOnlineListProps {
    currentId: number
    queryOnline: SearchPluginOnlineRequest
    setTotal: (m: number) => void
    selectedRowKeysRecord: API.YakitPluginDetail[]
    onSelectList: (m: API.YakitPluginDetail[]) => void
    onClicked: (m?: API.YakitPluginDetail, i?: number) => void
    userInfo: UserInfoProps
    isSelectAll: boolean
    setIsSelectAll: (b: boolean) => void
    bind_me: boolean
    refresh: boolean
    deletePluginRecord?: API.YakitPluginDetail
    updatePluginRecord?: API.YakitPluginDetail
    size: "middle" | "small"
    number?: number
}

const YakModuleOnlineList: React.FC<YakModuleOnlineListProps> = (props) => {
    const {
        queryOnline,
        setTotal,
        selectedRowKeysRecord,
        onSelectList,
        isSelectAll,
        onClicked,
        currentId,
        userInfo,
        bind_me,
        deletePluginRecord,
        updatePluginRecord,
        refresh,
        size,
        number,
        setIsSelectAll
    } = props
    const [response, setResponse] = useState<API.YakitPluginListResponse>({
        data: [],
        pagemeta: {
            limit: 20,
            page: 1,
            total: 0,
            total_page: 1
        }
    })
    const [loading, setLoading] = useState(false)
    const [isAdmin, setIsAdmin] = useState<boolean>(true)
    const [hasMore, setHasMore] = useState(false)
    const [isRef, setIsRef] = useState(false)
    const [listBodyLoading, setListBodyLoading] = useState(false)
    const numberOnlineUser = useRef(0) // 我的插件 选择的插件index
    const numberOnline = useRef(0) // 插件商店 选择的插件index
    useEffect(() => {
        if (!updatePluginRecord) return
        const index = response.data.findIndex((ele) => ele.id === updatePluginRecord.id)
        if (index === -1) return
        response.data[index] = {...updatePluginRecord}
        setResponse({
            ...response,
            data: [...response.data]
        })
    }, [updatePluginRecord])
    useEffect(() => {
        if (!deletePluginRecord) return
        if (bind_me) {
            response.data.splice(numberOnlineUser.current, 1)
        } else {
            response.data.splice(numberOnline.current, 1)
        }
        setResponse({
            ...response,
            data: [...response.data]
        })
        onClicked()
    }, [deletePluginRecord?.id])
    useEffect(() => {
        if (isSelectAll) {
            onSelectList([...response.data])
        }
    }, [isSelectAll])
    useEffect(() => {
        setIsAdmin(userInfo.role === "admin")
    }, [userInfo.role])
    useEffect(() => {
        setIsRef(!isRef)
        setListBodyLoading(true)
        if (!userInfo.isLogin && bind_me) {
            setTotal(0)
        } else {
            search(1)
        }
    }, [bind_me, refresh, userInfo.isLogin])
    const search = useMemoizedFn((page: number) => {
        let url = "yakit/plugin/unlogged"
        if (userInfo.isLogin) {
            url = "yakit/plugin"
        }
        const payload = {
            ...queryOnline,
            page,
            bind_me
        }
        if (!bind_me) {
            delete payload.is_private
        }
        setLoading(true)
        NetWorkApi<SearchPluginOnlineRequest, API.YakitPluginListResponse>({
            method: "get",
            url,
            params: {
                page: payload.page,
                order_by: payload.order_by,
                limit: payload.limit,
                order: payload.order,
                bind_me: payload.bind_me
            },
            data: payload
        })
            .then((res) => {
                if (!res.data) {
                    res.data = []
                }
                const data = page === 1 ? res.data : response.data.concat(res.data)
                const isMore = res.data.length < res.pagemeta.limit
                setHasMore(!isMore)
                if (payload.page > 1 && isSelectAll) {
                    onSelectList(data)
                }
                setResponse({
                    ...res,
                    data: [...data]
                })
                setTotal(res.pagemeta.total)
            })
            .catch((err) => {
                failed("插件列表获取失败:" + err)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                    setListBodyLoading(false)
                }, 200)
            })
    })
    const loadMoreData = useMemoizedFn(() => {
        if (hasMore) search(response.pagemeta.page + 1)
    })
    const onSelect = useMemoizedFn((item: API.YakitPluginDetail) => {
        const index = selectedRowKeysRecord.findIndex((ele) => ele.id === item.id)
        if (index === -1) {
            selectedRowKeysRecord.push(item)
        } else {
            selectedRowKeysRecord.splice(index, 1)
        }
        setIsSelectAll(false)
        onSelectList([...selectedRowKeysRecord])
    })
    const addLocalLab = useMemoizedFn((info: API.YakitPluginDetail, callback) => {
        const params: DownloadOnlinePluginProps = {
            OnlineID: info.id,
            UUID: info.uuid
        }
        ipcRenderer
            .invoke("DownloadOnlinePluginById", params)
            .then(() => {
                success("添加成功")
                ipcRenderer.invoke("change-main-menu")
            })
            .catch((e) => {
                failed(`添加失败:${e}`)
            })
            .finally(() => {
                if (callback) callback()
            })
    })
    const starredPlugin = useMemoizedFn((info: API.YakitPluginDetail) => {
        if (!userInfo.isLogin) {
            warn("请先登录")
            return
        }
        const prams: StarsOperation = {
            id: info?.id,
            operation: info.is_stars ? "remove" : "add"
        }
        NetWorkApi<StarsOperation, API.ActionSucceeded>({
            method: "post",
            url: "yakit/plugin/stars",
            params: prams
        })
            .then((res) => {
                if (!res.ok) return
                const index: number = response.data.findIndex((ele: API.YakitPluginDetail) => ele.id === info.id)
                if (index !== -1) {
                    if (info.is_stars) {
                        response.data[index].stars -= 1
                        response.data[index].is_stars = false
                    } else {
                        response.data[index].stars += 1
                        response.data[index].is_stars = true
                    }
                    setResponse({
                        ...response,
                        data: [...response.data]
                    })
                }
            })
            .catch((err) => {
                failed("点星:" + err)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 200)
            })
    })
    if (!userInfo.isLogin && bind_me) {
        return (
            <List
                dataSource={[]}
                locale={{emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='未登录,请先登录' />}}
            />
        )
    }
    return (
        <Spin spinning={listBodyLoading}>
            <RollingLoadList<API.YakitPluginDetail>
                numberRoll={number}
                isRef={isRef}
                data={response.data}
                page={response.pagemeta.page}
                hasMore={hasMore}
                loading={loading}
                loadMoreData={() => loadMoreData()}
                rowKey='id'
                isGridLayout={size === "middle"}
                defItemHeight={151} // 139+12
                classNameRow='plugin-list'
                classNameList='plugin-list-body'
                renderRow={(data: API.YakitPluginDetail, index: number) => (
                    <PluginItemOnline
                        currentId={currentId}
                        isAdmin={isAdmin}
                        info={data}
                        selectedRowKeysRecord={selectedRowKeysRecord}
                        onSelect={onSelect}
                        onClick={(info) => {
                            if (bind_me) {
                                numberOnlineUser.current = index
                            } else {
                                numberOnline.current = index
                            }
                            onClicked(info, index)
                        }}
                        onDownload={addLocalLab}
                        onStarred={starredPlugin}
                        bind_me={bind_me}
                    />
                )}
            />
        </Spin>
    )
}

export const TagColor: {[key: string]: string} = {
    failed: "color-bgColor-red|审核不通过",
    success: "color-bgColor-green|审核通过",
    not: "color-bgColor-blue|待审核"
}

interface PluginListOptProps {
    currentId: number
    isAdmin: boolean
    info: API.YakitPluginDetail
    onClick: (info: API.YakitPluginDetail) => any
    onDownload: (info: API.YakitPluginDetail, callback) => any
    onStarred: (info: API.YakitPluginDetail) => any
    onSelect: (info: API.YakitPluginDetail) => any
    selectedRowKeysRecord: API.YakitPluginDetail[]
    bind_me: boolean
}

export const RandomTagColor: string[] = [
    "color-bgColor-orange",
    "color-bgColor-purple",
    "color-bgColor-blue",
    "color-bgColor-green",
    "color-bgColor-red"
]

const PluginItemOnline: React.FC<PluginListOptProps> = (props) => {
    const [loading, setLoading] = useState<boolean>(false)
    const {isAdmin, info, onClick, onDownload, onStarred, onSelect, selectedRowKeysRecord, currentId, bind_me} = props
    const tags: string[] = info.tags ? JSON.parse(info.tags) : []
    const [status, setStatus] = useState<number>(info.status)
    useEffect(() => {
        setStatus(info.status)
    }, [info.status, info.id])
    const add = useMemoizedFn(async () => {
        setLoading(true)
        onDownload(info, () => {
            setLoading(false)
        })
    })
    const isShowAdmin = (isAdmin && !bind_me) || (bind_me && !info.is_private)
    const tagsString = (tags && tags.length > 0 && tags.join(",")) || ""
    return (
        <div className={`plugin-item ${currentId === info.id && "plugin-item-active"}`} onClick={() => onClick(info)}>
            <div className={`plugin-item-heard ${currentId === info.id && "plugin-item-heard-active"}`}>
                <div className='plugin-item-left'>
                    <div
                        title={info.script_name}
                        className={`text-style content-ellipsis ${isShowAdmin && "max-width-70"}`}
                    >
                        {info.script_name}
                    </div>
                    <div className='icon-body'>
                        <div className='text-icon'>
                            {isShowAdmin ? (
                                <div
                                    className={`text-icon-admin ${
                                        TagColor[["not", "success", "failed"][status]].split("|")[0]
                                    } vertical-center`}
                                >
                                    {TagColor[["not", "success", "failed"][status]].split("|")[1]}
                                </div>
                            ) : (
                                !bind_me &&
                                info.official && (
                                    // @ts-ignore
                                    <OfficialYakitLogoIcon className='text-icon-style' />
                                )
                            )}
                            {bind_me && <>{(info.is_private === true && <LockOutlined />) || <OnlineCloudIcon />}</>}
                        </div>
                    </div>
                </div>
                <div className='plugin-item-right'>
                    {(loading && <LoadingOutlined className='plugin-down' />) || (
                        <div
                            className='plugin-down'
                            onClick={(e) => {
                                e.stopPropagation()
                                add()
                            }}
                            title='添加到插件仓库'
                        >
                            <DownloadOutlined className='operation-icon ' />
                        </div>
                    )}
                </div>
                <SelectIcon
                    //  @ts-ignore
                    className={`icon-select  ${
                        selectedRowKeysRecord.findIndex((ele) => ele.id === info.id) !== -1 && "icon-select-active"
                    }`}
                    onClick={(e) => {
                        e.stopPropagation()
                        onSelect(info)
                    }}
                />
            </div>
            <div className='plugin-item-content'>
                <div className='plugin-help content-ellipsis' title={info.help}>
                    {info.help || "No Description about it."}
                </div>
                {(tags && tags.length > 0 && (
                    <div className='plugin-tag' title={tagsString}>
                        TAG:{tagsString}
                    </div>
                )) || <div className='plugin-tag'>&nbsp;</div>}
                <div className='plugin-item-footer'>
                    <div className='plugin-item-footer-left'>
                        {!bind_me && info.head_img && <img alt='' src={info.head_img} />}
                        <div className='plugin-item-author content-ellipsis'>{info.authors || "anonymous"}</div>
                    </div>
                    <div className='plugin-item-time'>{formatDate(info.created_at)}</div>
                </div>
            </div>
        </div>
    )
}

interface QueryComponentOnlineProps {
    onClose: () => void
    userInfo: UserInfoProps
    setQueryOnline: (q: SearchPluginOnlineRequest) => void
    queryOnline: SearchPluginOnlineRequest
    user: boolean
}

const PluginType = {
    yak: "YAK 插件",
    mitm: "MITM 插件",
    "packet-hack": "数据包扫描",
    "port-scan": "端口扫描插件",
    codec: "CODEC插件",
    nuclei: "YAML POC"
}

const QueryComponentOnline: React.FC<QueryComponentOnlineProps> = (props) => {
    const {onClose, userInfo, queryOnline, setQueryOnline, user} = props
    const [isShowStatus, setIsShowStatus] = useState<boolean>(queryOnline.is_private === "true")
    const [isAdmin, setIsAdmin] = useState(userInfo.role === "admin")
    const [form] = Form.useForm()
    const refTest = useRef<any>()
    useEffect(() => {
        setIsAdmin(userInfo.role === "admin")
    }, [userInfo.role])
    useEffect(() => {
        document.addEventListener("mousedown", (e) => handleClickOutside(e), true)
        return () => {
            document.removeEventListener("mousedown", (e) => handleClickOutside(e), true)
        }
    }, [])
    useEffect(() => {
        form.setFieldsValue({
            order_by: queryOnline.order_by,
            plugin_type: queryOnline.plugin_type ? queryOnline.plugin_type.split(",") : [],
            status: !queryOnline.status ? "all" : queryOnline.status,
            is_private: queryOnline.is_private === "" ? "" : `${queryOnline.is_private === "true"}`
        })
        if (queryOnline.is_private !== "") {
            setIsShowStatus(queryOnline.is_private === "false")
        }
    }, [queryOnline])
    const handleClickOutside = (e) => {
        // 组件已挂载且事件触发对象不在div内
        const dom = findDOMNode(refTest.current)
        if (!dom) return
        const result = dom.contains(e.target)
        if (!result) {
            onClose()
        }
    }
    const onReset = () => {
        setQueryOnline({
            ...queryOnline,
            order_by: "stars",
            plugin_type: defQueryOnline.plugin_type,
            status: "",
            is_private: ""
        })
        form.setFieldsValue({
            order_by: "stars",
            plugin_type: defQueryOnline.plugin_type,
            status: "all",
            is_private: ""
        })
    }
    const onFinish = useMemoizedFn((value) => {
        const query: SearchPluginOnlineRequest = {
            ...queryOnline,
            ...value,
            status: value.status === "all" ? "" : value.status,
            plugin_type: value.plugin_type.join(",")
        }
        setQueryOnline({...query})
    })
    const onSelect = useMemoizedFn((key) => {
        setIsShowStatus(key === "false")
    })
    return (
        <div ref={refTest} className='query-form-body'>
            <Form layout='vertical' form={form} name='control-hooks' onFinish={onFinish}>
                {!user && (
                    <Form.Item name='order_by' label='排序顺序'>
                        <Select size='small' getPopupContainer={() => refTest.current}>
                            <Option value='stars'>按热度</Option>
                            <Option value='created_at'>按时间</Option>
                        </Select>
                    </Form.Item>
                )}
                <Form.Item name='plugin_type' label='插件类型'>
                    <Select size='small' getPopupContainer={() => refTest.current} mode='multiple'>
                        {Object.keys(PluginType).map((key) => (
                            <Option value={key} key={key}>
                                {PluginType[key]}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                {user && (
                    <Form.Item name='is_private' label='私密/公开'>
                        <Select size='small' getPopupContainer={() => refTest.current} onSelect={onSelect}>
                            <Option value='true'>私密</Option>
                            <Option value='false'>公开</Option>
                        </Select>
                    </Form.Item>
                )}
                {((!user && isAdmin) || (user && isShowStatus)) && (
                    <Form.Item name='status' label='审核状态'>
                        <Select size='small' getPopupContainer={() => refTest.current}>
                            <Option value='all'>全部</Option>
                            {Object.keys(statusType).map((key) => (
                                <Option value={key}>{statusType[key]}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                )}
                <div className='form-btns'>
                    <Button type='primary' htmlType='submit' size='small'>
                        设置查询条件
                    </Button>
                    <Button size='small' onClick={onReset}>
                        重置搜索
                    </Button>
                </div>
            </Form>
        </div>
    )
}

interface QueryComponentLocalProps {
    onClose: () => void
    setQueryLocal: (q: QueryYakScriptRequest) => void
    queryLocal: QueryYakScriptRequest
}

const QueryComponentLocal: React.FC<QueryComponentLocalProps> = (props) => {
    const {onClose, queryLocal, setQueryLocal} = props
    const [form] = Form.useForm()
    const refTest = useRef<any>()
    useEffect(() => {
        document.addEventListener("mousedown", (e) => handleClickOutside(e), true)
        return () => {
            document.removeEventListener("mousedown", (e) => handleClickOutside(e), true)
        }
    }, [])
    useEffect(() => {
        form.setFieldsValue({
            Type: queryLocal.Type ? queryLocal.Type.split(",") : []
        })
    }, [queryLocal])
    const handleClickOutside = (e) => {
        // 组件已挂载且事件触发对象不在div内
        const dom = findDOMNode(refTest.current)
        if (!dom) return
        const result = dom.contains(e.target)
        if (!result) {
            onClose()
        }
    }
    const onReset = () => {
        setQueryLocal({...queryLocal, Type: defQueryLocal.Type})
        form.setFieldsValue({
            Type: defQueryLocal.Type
        })
    }
    const onFinish = useMemoizedFn((value) => {
        const query: QueryYakScriptRequest = {
            ...queryLocal,
            ...value,
            Type: value.Type.join(",")
        }
        setQueryLocal({...query})
    })
    return (
        <div ref={refTest} className='query-form-body'>
            <Form layout='vertical' form={form} name='control-hooks' onFinish={onFinish}>
                <Form.Item name='Type' label='插件类型'>
                    <Select size='small' getPopupContainer={() => refTest.current} mode='multiple'>
                        {Object.keys(PluginType).map((key) => (
                            <Option value={key} key={key}>
                                {PluginType[key]}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <div className='form-btns'>
                    <Button type='primary' htmlType='submit' size='small'>
                        设置查询条件
                    </Button>
                    <Button size='small' onClick={onReset}>
                        重置搜索
                    </Button>
                </div>
            </Form>
        </div>
    )
}

interface PluginFilterProps {
    queryChildren: ReactNode
    size: "middle" | "small"
    isFilter: boolean
    visibleQuery: boolean
    setVisibleQuery: (b: boolean) => void
}

const PluginFilter: React.FC<PluginFilterProps> = (props) => {
    const {queryChildren, size, isFilter, visibleQuery, setVisibleQuery} = props
    // const [visibleQuery, setVisibleQuery] = useState<boolean>(false)
    return (
        <Popconfirm
            title={queryChildren}
            placement='bottomLeft'
            icon={null}
            overlayClassName='pop-confirm'
            visible={visibleQuery}
        >
            {(size === "small" && (
                <Tooltip title='查询'>
                    <FilterOutlined
                        className={`operation-icon ${isFilter && "operation-icon-active"}`}
                        onClick={() => setVisibleQuery(true)}
                    />
                </Tooltip>
            )) || (
                <div
                    className={`full-filter  ${isFilter && "operation-icon-active"}`}
                    onClick={() => setVisibleQuery(true)}
                >
                    <FilterOutlined className='filter-icon' />
                    筛选
                </div>
            )}
        </Popconfirm>
    )
}
