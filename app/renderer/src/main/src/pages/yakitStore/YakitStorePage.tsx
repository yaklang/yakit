import React, {useEffect, useState, useRef, memo} from "react"
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
    Radio
} from "antd"
import {
    ReloadOutlined,
    GithubOutlined,
    UploadOutlined,
    LoadingOutlined,
    FilterOutlined,
    FullscreenExitOutlined,
    FullscreenOutlined,
    LockOutlined
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
    useDebounceEffect
} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {DownloadOnlinePluginProps} from "../yakitStoreOnline/YakitStoreOnline"
import {randomString} from "@/utils/randomUtil"
import {OfficialYakitLogoIcon, SelectIcon, OnlineCloudIcon} from "../../assets/icons"
import {YakitPluginInfoOnline} from "./YakitPluginInfoOnline/index"
import moment from "moment"
import {findDOMNode} from "react-dom"
import {usePluginStore} from "@/store/plugin"
import {YakExecutorParam} from "../invoker/YakExecutorParams"
import {RollingLoadList} from "@/components/RollingLoadList"
import {setTimeout} from "timers"

const {Search} = Input
const {Option} = Select
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
    type: typeOnline,
    page: 1,
    limit: 12,
    status: "",
    user: false,
    is_private: ""
}

const defQueryLocal: QueryYakScriptRequest = {
    Type: "yak,mitm,codec,packet-hack,port-scan",
    Keyword: "",
    Pagination: {Limit: 20, Order: "desc", Page: 1, OrderBy: "updated_at"}
}

export const YakitStorePage: React.FC<YakitStorePageProp> = (props) => {
    const [script, setScript] = useState<YakScript>()
    const [trigger, setTrigger] = useState(false)
    const [isUpdateItem, setIsUpdateItem] = useState(false)
    const [isFilter, setIsFilter] = useState(false)
    const [totalOnlineUser, setTotalOnlineUser, getTotalOnlineUser] = useGetState<number>(0)
    const [totalLocal, setTotalLocal, getTotalLocal] = useGetState<number>(0)
    const [totalOnline, setTotalOnline, getTotalOnline] = useGetState<number>(0)
    const [queryOnline, setQueryOnline] = useState<SearchPluginOnlineRequest>({
        ...defQueryOnline
    })
    const [queryLocal, setQueryLocal] = useState<QueryYakScriptRequest>({
        ...defQueryLocal
    })
    useEffect(() => {
        if (
            !queryOnline.is_private &&
            queryOnline.order_by === "stars" &&
            queryOnline.order === "desc" &&
            queryOnline.type === typeOnline &&
            !queryOnline.status &&
            queryOnline.user === false
        ) {
            setIsFilter(false)
        } else {
            setIsFilter(true)
        }
    }, [queryOnline])
    useEffect(() => {
        if (queryLocal.Type === defQueryLocal.Type) {
            setIsFilter(false)
        } else {
            setIsFilter(true)
        }
    }, [queryLocal])

    const [loading, setLoading] = useState(false)

    useEffect(() => {
        setLoading(true)
        setTimeout(() => {
            setLoading(false)
        }, 200)
    }, [script])

    const onRemoveLocalPlugin = useMemoizedFn(() => {
        ipcRenderer
            .invoke("DeleteAllLocalPlugins", {})
            .then(() => {
                getLocalList()
                setScript(undefined)
                ipcRenderer.invoke("change-main-menu")
                success("删除成功")
            })
            .catch((e) => {
                failed(`删除所有本地插件错误:${e}`)
            })
    })

    // 是否第一次使用yakit  第一次使用默认展示线上，后面默认展示本地
    const [plugSource, setPlugSource] = useState<string>("local")
    const [publicKeyword, setPublicKeyword] = useState<string>("")
    const [visibleQuery, setVisibleQuery] = useState<boolean>(false)
    const [listLoading, setListLoading] = useState<boolean>(false)
    const [plugin, setPlugin] = useState<API.YakitPluginDetail>()
    const [userPlugin, setUserPlugin] = useState<API.YakitPluginDetail>()
    const [selectedRowKeysRecord, setSelectedRowKeysRecord] = useState<API.YakitPluginDetail[]>([])
    const [fullScreen, setFullScreen] = useState<boolean>(false)
    const [isSelectAll, setIsSelectAll] = useState<boolean>(false)
    const [refresh, setRefresh] = useState(false)
    const [user, setUser] = useState(false)
    // 全局登录状态
    const {userInfo} = useStore()
    useEffect(() => {
        if (selectedRowKeysRecord.length === 0) {
            setIsSelectAll(false)
        }
    }, [selectedRowKeysRecord.length])
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
    const realSearch = useDebounceFn(
        useMemoizedFn(() => {
            triggerSearch()
        }),
        {wait: 500}
    ).run
    const onRefList = useMemoizedFn(() => {
        onResetPluginDetails()
        onResetQuery()
        setRefresh(!refresh)
    })
    const triggerSearch = useMemoizedFn(() => {
        if (plugSource === "local") {
            //搜索本地
            getLocalList()
        } else {
            // 搜索插件商店
            setSelectedRowKeysRecord([])
            getOnlineList()
        }
    })
    const getOnlineList = useMemoizedFn(() => {
        setQueryOnline({
            ...queryOnline,
            keywords: publicKeyword
        })
    })
    const getLocalList = useMemoizedFn(() => {
        setQueryLocal({
            ...queryLocal,
            Keyword: publicKeyword
        })
    })

    const onSelectItem = useMemoizedFn((datas) => {
        setSelectedRowKeysRecord(datas)
    })

    const onFullScreen = useMemoizedFn(() => {
        setFullScreen(!fullScreen)
    })
    const onSelectAll = useMemoizedFn((e) => {
        setIsSelectAll(e.target.checked)
        if (!e.target.checked) {
            setSelectedRowKeysRecord([])
        }
    })

    const onSetPluginSource = useDebounceFn(
        (value) => {
            if (!userInfo.isLogin && value === "user") {
                setTotalOnlineUser(0)
            }
            setPlugSource(value)
            onResetQuery()
            onResetPluginDetails()
        },
        {wait: 200}
    ).run
    const onResetQuery = useMemoizedFn(() => {
        // 重置查询条件
        setQueryOnline(defQueryOnline)
        setQueryLocal({
            ...defQueryLocal
        })
        setPublicKeyword("")
    })
    const onResetPluginDetails = useMemoizedFn(() => {
        // 重置详情
        setScript(undefined)
        setUserPlugin(undefined)
        setPlugin(undefined)
    })
    const onSetPlugin = useMemoizedFn((item) => {
        if (plugSource==='user') {
            setUserPlugin(item)
        } else {
            setPlugin(item)
        }
    })
    const [deletePluginRecord, setDeletePluginRecord] = useState<API.YakitPluginDetail>()
    const [deletePluginRecordLocal, setDeletePluginRecordLocal] = useState<YakScript>()
    const [refLocalListItem, setRefLocalListItem] = useState<boolean>(false)
    const onDeletePlugin = useMemoizedFn((p: API.YakitPluginDetail) => {
        setDeletePluginRecord(p)
    })

    const onDeletePluginLocal = useMemoizedFn((p: YakScript) => {
        setDeletePluginRecordLocal(p)
    })
    return (
        <div style={{height: "100%", display: "flex", flexDirection: "row"}}>
            <Card
                bodyStyle={{padding: 0, height: "calc(100% - 82px)"}}
                bordered={false}
                style={{height: "100%", width: 470, display: fullScreen ? "none" : ""}}
                title={
                    <div className='list-card-title'>
                        <Row gutter={12}>
                            <Col span={12} className='flex-align-center'>
                                <Radio.Group
                                    value={plugSource}
                                    size='small'
                                    onChange={(e) => onSetPluginSource(e.target.value)}
                                >
                                    <Radio.Button value='online'>插件商店</Radio.Button>
                                    <Radio.Button value='user'>我的插件</Radio.Button>
                                    <Radio.Button value='local'>本地</Radio.Button>
                                </Radio.Group>
                                <Button size={"small"} type={"link"} onClick={onRefList}>
                                    <ReloadOutlined />
                                </Button>
                            </Col>
                            <Col span={12} className='flex-align-center'>
                                搜索：
                                <Search
                                    placeholder='输入关键字搜索'
                                    size='small'
                                    onSearch={triggerSearch}
                                    value={publicKeyword}
                                    onChange={(e) => {
                                        setPublicKeyword(e.target.value)
                                        realSearch()
                                    }}
                                />
                            </Col>
                        </Row>
                        <Row className='row-body' gutter={12}>
                            <Col span={12} className='col'>
                                {plugSource !== "local" && (
                                    <Checkbox checked={isSelectAll} onChange={onSelectAll}>
                                        全选&emsp;
                                        {selectedRowKeysRecord.length > 0 && (
                                            <Tag color='blue'>已选{selectedRowKeysRecord.length}条</Tag>
                                        )}
                                    </Checkbox>
                                )}
                                <Tag>
                                    Total:
                                    {plugSource === "local" && getTotalLocal()}
                                    {plugSource === "user" && getTotalOnlineUser()}
                                    {plugSource === "online" && getTotalOnline()}
                                </Tag>
                            </Col>
                            <Col span={12} className='col-flex-end'>
                                <Popconfirm
                                    title={
                                        visibleQuery && (
                                            <>
                                                {(plugSource === "local" && (
                                                    <QueryComponentLocal
                                                        onClose={() => setVisibleQuery(false)}
                                                        queryLocal={queryLocal}
                                                        setQueryLocal={(e) => {
                                                            setQueryLocal(e)
                                                            setRefresh(!refresh)
                                                        }}
                                                    />
                                                )) || (
                                                    <QueryComponentOnline
                                                        onClose={() => setVisibleQuery(false)}
                                                        userInfo={userInfo}
                                                        queryOnline={queryOnline}
                                                        setQueryOnline={(e) => {
                                                            setQueryOnline(e)
                                                            setRefresh(!refresh)
                                                        }}
                                                        user={user}
                                                    />
                                                )}
                                            </>
                                        )
                                    }
                                    placement='bottomLeft'
                                    icon={null}
                                    overlayClassName='pop-confirm'
                                    visible={visibleQuery}
                                >
                                    <FilterOutlined
                                        className={`col-icon ${isFilter && "col-icon-active"}`}
                                        onClick={() => setVisibleQuery(true)}
                                    />
                                </Popconfirm>
                                {(plugSource !== "local" && (
                                    <>
                                        <AddAllPlugin
                                            selectedRowKeysRecord={selectedRowKeysRecord}
                                            setListLoading={setListLoading}
                                            setSelectedRowKeysRecord={setSelectedRowKeysRecord}
                                            user={user}
                                            userInfo={userInfo}
                                        />
                                    </>
                                )) || (
                                    <>
                                        <Popconfirm
                                            title='是否删除本地所有插件?'
                                            onConfirm={() => onRemoveLocalPlugin()}
                                        >
                                            <Button size='small' type='primary' danger>
                                                删除
                                            </Button>
                                        </Popconfirm>
                                        <Button
                                            size={"small"}
                                            type='primary'
                                            onClick={() => {
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
                                            }}
                                        >
                                            新建
                                        </Button>
                                        <Button
                                            size={"small"}
                                            type={"primary"}
                                            onClick={() => {
                                                showModal({
                                                    width: 800,
                                                    title: "导入插件方式",
                                                    content: (
                                                        <>
                                                            <div style={{width: 800}}>
                                                                <LoadYakitPluginForm onFinished={triggerSearch} />
                                                            </div>
                                                        </>
                                                    )
                                                })
                                            }}
                                        >
                                            导入
                                        </Button>
                                    </>
                                )}
                            </Col>
                        </Row>
                    </div>
                }
                size={"small"}
                className='left-list'
            >
                <Spin spinning={listLoading}>
                    <div style={{display: plugSource === "local" ? "" : "none", height: "100%"}}>
                        <YakModuleList
                            currentScript={script}
                            currentId={script?.Id}
                            onClicked={(info, index) => {
                                setScript(info)
                            }}
                            setTotal={setTotalLocal}
                            queryLocal={queryLocal}
                            refresh={refresh}
                            deletePluginRecordLocal={deletePluginRecordLocal}
                            isUpdateItem={isUpdateItem}
                        />
                    </div>
                    <div style={{display: plugSource === "user" ? "" : "none", height: "100%"}}>
                        <YakModuleOnlineList
                            currentId={userPlugin?.id || 0}
                            queryOnline={queryOnline}
                            selectedRowKeysRecord={selectedRowKeysRecord}
                            onSelectItem={onSelectItem} //选择一个
                            isSelectAll={isSelectAll}
                            onSelectAll={setSelectedRowKeysRecord}
                            setTotal={setTotalOnlineUser}
                            onClicked={onSetPlugin}
                            userInfo={userInfo}
                            user={true}
                            refresh={refresh}
                            deletePluginRecord={deletePluginRecord}
                        />
                    </div>
                    <div style={{display: plugSource === "online" ? "" : "none", height: "100%"}}>
                        <YakModuleOnlineList
                            currentId={plugin?.id || 0}
                            queryOnline={queryOnline}
                            selectedRowKeysRecord={selectedRowKeysRecord}
                            onSelectItem={onSelectItem} //选择一个
                            isSelectAll={isSelectAll}
                            onSelectAll={setSelectedRowKeysRecord}
                            setTotal={setTotalOnline}
                            onClicked={onSetPlugin}
                            userInfo={userInfo}
                            user={false}
                            refresh={refresh}
                            deletePluginRecord={deletePluginRecord}
                        />
                    </div>
                </Spin>
            </Card>

            <div style={{flex: 1, overflowY: "auto"}}>
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
                        }
                    >
                        {plugSource === "local" && script && (
                            <PluginOperator
                                yakScriptId={script.Id}
                                setTrigger={() => setIsUpdateItem(!isUpdateItem)}
                                setScript={setScript}
                                deletePluginLocal={onDeletePluginLocal}
                            />
                        )}
                        {plugSource === "online" && plugin && (
                            <YakitPluginInfoOnline info={plugin} deletePlugin={onDeletePlugin} />
                        )}
                        {plugSource === "user" && userPlugin && (
                            <YakitPluginInfoOnline info={userPlugin} user={true} deletePlugin={onDeletePlugin} />
                        )}
                    </AutoCard>
                ) : (
                    <Empty style={{marginTop: 100}}>在左侧所选模块查看详情</Empty>
                )}
            </div>
        </div>
    )
}

export interface YakModuleListProp {
    onClicked: (y?: YakScript, i?: number) => any
    currentId?: number
    itemHeight?: number
    isRef?: boolean
    onYakScriptRender?: (i: YakScript, maxWidth?: number) => any
    setTotal?: (n: number) => void
    queryLocal?: QueryYakScriptRequest
    refresh?: boolean
    deletePluginRecordLocal?: YakScript
    currentScript?: YakScript
    trigger?: boolean
    isUpdateItem?: boolean // 目前更新使用
}

export const YakModuleList: React.FC<YakModuleListProp> = (props) => {
    const defaultQuery = useCreation(() => {
        return {
            Type: "mitm,port-scan",
            Keyword: "",
            Pagination: {Limit: 20, Order: "desc", Page: 1, OrderBy: "updated_at"}
        }
    }, [])
    const defItemHeight = useCreation(() => {
        return 143
    }, [])
    const {
        deletePluginRecordLocal,
        itemHeight = defItemHeight,
        queryLocal = defaultQuery,
        currentId,
        currentScript
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
        if (!currentScript) return
        const index = response.Data.findIndex((ele) => ele.OnlineId === currentScript.OnlineId)
        if (index !== -1) {
            response.Data[index] = currentScript
        }
        setResponse({
            ...response,
            Data: [...response.Data]
        })
    }, [props.isUpdateItem])
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
        setHasMore(true)
        // setLoading(false)
        setListBodyLoading(true)
        update(1, undefined, queryLocal)
        return () => {
            if (props.setTotal) props.setTotal(0)
        }
    }, [userInfo.isLogin, props.refresh, queryLocal.Type, queryLocal.Keyword, queryLocal.Pagination])
    useEffect(() => {
        if (!deletePluginRecordLocal) return
        response.Data.splice(numberLocal.current, 1)
        setResponse({
            ...response,
            Data: [...response.Data]
        })
        props.onClicked()
    }, [deletePluginRecordLocal?.Id])
    const [hasMore, setHasMore] = useState<boolean>(true)
    const loadMoreData = useMemoizedFn(() => {
        update(parseInt(`${response.Pagination.Page}`) + 1, undefined)
    })
    return (
        <Spin spinning={listBodyLoading}>
            <RollingLoadList<YakScript>
                isRef={isRef}
                data={response.Data}
                page={response.Pagination.Page}
                hasMore={hasMore}
                loading={loading}
                loadMoreData={loadMoreData}
                classNameRow='plugin-list'
                classNameList='plugin-list-body'
                itemHeight={itemHeight}
                renderRow={(data: YakScript, index) => (
                    <PluginListLocalItem
                        plugin={data}
                        userInfo={userInfo}
                        onClicked={(info) => {
                            numberLocal.current = index
                            props.onClicked(info, index)
                        }}
                        currentId={props.currentId}
                        onYakScriptRender={props.onYakScriptRender}
                        maxWidth={maxWidth}
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
    currentId?: number
    onYakScriptRender?: (i: YakScript, maxWidth?: number) => any
    maxWidth: number
}
export const PluginListLocalItem: React.FC<PluginListLocalProps> = (props) => {
    const {userInfo, maxWidth, onClicked} = props
    const [plugin, setPlugin] = useState(props.plugin)
    const [uploadLoading, setUploadLoading] = useState(false)
    const uploadOnline = (oldItem: YakScript) => {
        if (!userInfo.isLogin) {
            warn("未登录，请先登录!")
            return
        }
        setUploadLoading(true)
        ipcRenderer
            .invoke("GetYakScriptById", {Id: oldItem.Id})
            .then((item: YakScript) => {
                const params: API.NewYakitPlugin = {
                    type: item.Type,
                    script_name: item.ScriptName,
                    content: item.Content,
                    tags: item.Tags && item.Tags !== "null" ? item.Tags.split(",") : undefined,
                    params: item.Params.map((p) => ({
                        field: p.Field,
                        default_value: p.DefaultValue,
                        type_verbose: p.TypeVerbose,
                        field_verbose: p.FieldVerbose,
                        help: p.Help,
                        required: p.Required,
                        group: p.Group,
                        extra_setting: p.ExtraSetting
                    })),
                    help: item.Help,
                    default_open: false,
                    // contributors: item.Author
                    contributors: item.OnlineContributors || ""
                }
                if (item.OnlineId) {
                    params.id = parseInt(`${item.OnlineId}`)
                }
                NetWorkApi<API.NewYakitPlugin, API.YakitPluginResponse>({
                    method: "post",
                    url: "yakit/plugin",
                    data: params
                })
                    .then((res) => {
                        // 上传插件到商店后，需要调用下载商店插件接口，给本地保存远端插件Id DownloadOnlinePluginProps
                        ipcRenderer
                            .invoke("DownloadOnlinePluginById", {
                                OnlineID: res.id,
                                UUID: res.uuid
                            } as DownloadOnlinePluginProps)
                            .then(() => {
                                // 查询本地数据
                                ipcRenderer
                                    .invoke("GetYakScriptByOnlineID", {
                                        OnlineID: res.id,
                                        UUID: res.uuid
                                    } as GetYakScriptByOnlineIDRequest)
                                    .then((newSrcipt: YakScript) => {
                                        if (item.Id === plugin.Id) {
                                            onClicked(newSrcipt)
                                            setPlugin(newSrcipt)
                                        }
                                        ipcRenderer
                                            .invoke("delete-yak-script", item.Id)
                                            .then(() => {
                                            })
                                            .catch((err) => {
                                                failed("删除本地失败:" + err)
                                            })
                                    })
                                    .catch((e) => {
                                        failed(`查询本地插件错误:${e}`)
                                    })
                            })
                            .catch((err) => {
                                failed("插件下载本地失败:" + err)
                            })
                        success("插件上传成功")
                    })
                    .catch((err) => {
                        failed("插件上传失败:" + err)
                    })
                    .finally(() => {
                        setTimeout(() => setUploadLoading(false), 200)
                    })
            })
            .catch((e: any) => {
                failed("Query YakScript By ID failed")
            })
            .finally(() => {})
    }
    let isAnonymous = false
    if (plugin.Author === "" || plugin.Author === "anonymous") {
        isAnonymous = true
    }

    if (props.onYakScriptRender) {
        return props.onYakScriptRender(plugin, maxWidth)
    }
    return (
        <Card
            size={"small"}
            bordered={true}
            hoverable={true}
            title={
                <div className='flex-align-center'>
                    <Tooltip title={plugin.ScriptName}>
                        <span className='content-ellipsis'>{plugin.ScriptName}</span>
                    </Tooltip>

                    <div className='text-icon-local'>
                        {plugin.OnlineId > 0 && !plugin.OnlineIsPrivate && (
                            <Tooltip title='线上的公开插件'>
                                <OnlineCloudIcon />
                            </Tooltip>
                        )}
                        {plugin.OnlineId > 0 && plugin.OnlineIsPrivate && (
                            <Tooltip title='线上的私密插件'>
                                <LockOutlined />
                            </Tooltip>
                        )}
                        {gitUrlIcon(plugin.FromGit)}
                    </div>
                </div>
            }
            extra={
                (uploadLoading && <LoadingOutlined />) || (
                    <>
                        {(userInfo.user_id == plugin.UserId || plugin.UserId == 0) && (
                            <UploadOutlined
                                className='upload-outline'
                                style={{marginLeft: 6, fontSize: 16, cursor: "pointer"}}
                                onClick={() => uploadOnline(plugin)}
                            />
                        )}
                    </>
                )
            }
            style={{
                width: "100%",
                marginBottom: 12,
                backgroundColor: props.currentId === plugin.Id ? "rgba(79,188,255,0.26)" : "#fff"
            }}
            onClick={() => props.onClicked(plugin)}
        >
            <Row>
                <Col span={24}>
                    <CopyableField
                        style={{width: 430, color: "#5f5f5f", marginBottom: 5}}
                        text={plugin.Help || "No Description about it."}
                        noCopy={true}
                    />
                </Col>
            </Row>
            <Row style={{marginBottom: 4}}>
                {plugin.Tags && plugin.Tags !== "null" && (
                    <Col span={24}>
                        <div className='plugin-tag'>TAG:{plugin.Tags}</div>
                    </Col>
                )}
            </Row>
            <Row>
                <Col span={12}>
                    <Space style={{width: "100%"}}>
                        <Tag color={isAnonymous ? "gray" : "geekblue"}>{plugin.Author || "anonymous"}</Tag>
                    </Space>
                </Col>
                <Col span={12} style={{textAlign: "right"}}>
                    <Space size={2}>
                        <CopyableField noCopy={true} text={formatDate(plugin.CreatedAt)} />
                        {gitUrlIcon(plugin.FromGit, true)}
                    </Space>
                </Col>
            </Row>
        </Card>
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
                    const id = parseInt(localId)
                    if (isNaN(id) || parseFloat(localId) != id) {
                        failed("该值应为整数")
                    }
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

    if (url.startsWith("https://github.com/yaklang/yakit-store") && !noTag) {
        return <Tag color={"green"}>yaklang.io</Tag>
    }

    return (
        <Tooltip title={url}>
            <Button
                type={"link"}
                style={{
                    paddingLeft: 0,
                    paddingRight: 0,
                    marginLeft: 0,
                    marginRight: 0
                }}
                icon={<GithubOutlined />}
            />
        </Tooltip>
    )
}
interface AddAllPluginProps {
    setListLoading: (a: boolean) => void
    setSelectedRowKeysRecord: (a: API.YakitPluginDetail[]) => void
    selectedRowKeysRecord: API.YakitPluginDetail[]
    user: boolean
    userInfo: UserInfoProps
}

interface DownloadOnlinePluginByIdsRequest {
    OnlineIDs: number[]
    UUID: string[]
}

const AddAllPlugin: React.FC<AddAllPluginProps> = (props) => {
    const {selectedRowKeysRecord, setListLoading, setSelectedRowKeysRecord, user, userInfo} = props
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
        if (selectedRowKeysRecord.length > 0) {
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
                    setSelectedRowKeysRecord([])
                })
                .catch((e) => {
                    failed(`添加失败:${e}`)
                })
                .finally(() => {
                    setTimeout(() => {
                        setListLoading(false)
                    }, 200)
                })
        } else {
            // 全部添加
            setAddLoading(true)
            const addParams = {isAddToken: true, BindMe: user}
            ipcRenderer
                .invoke("DownloadOnlinePluginAll", addParams, taskToken)
                .then(() => {
                    setTimeout(() => {
                        // success("全部添加成功")
                    }, 500)
                })
                .catch((e) => {
                    failed(`添加失败:${e}`)
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
            {(addLoading || percent !== 0) && (
                <div className='filter-opt-progress'>
                    <Progress
                        size='small'
                        status={!addLoading && percent !== 0 ? "exception" : undefined}
                        percent={percent}
                    />
                </div>
            )}
            {addLoading ? (
                <Button className='filter-opt-btn' size='small' type='primary' danger onClick={StopAllPlugin}>
                    停止
                </Button>
            ) : (
                <>
                    {/* 未选择数据 并且 我的插件未登录的情况下 */}
                    {(selectedRowKeysRecord.length === 0 && !(user && !userInfo.isLogin) && (
                        <Popconfirm
                            title={user ? "确定将我的插件所有数据导入到本地吗" : "确定将插件商店所有数据导入到本地吗?"}
                            onConfirm={AddAllPlugin}
                            okText='Yes'
                            cancelText='No'
                        >
                            <Button className='filter-opt-btn' size='small' type='primary'>
                                下载
                            </Button>
                        </Popconfirm>
                    )) || (
                        <Button className='filter-opt-btn' size='small' type='primary' onClick={AddAllPlugin}>
                            下载
                        </Button>
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

interface YakModuleOnlineListProps {
    currentId: number
    queryOnline: SearchPluginOnlineRequest
    setTotal: (m: number) => void
    selectedRowKeysRecord: API.YakitPluginDetail[]
    onSelectItem: (m: API.YakitPluginDetail[]) => void
    onClicked: (m?: API.YakitPluginDetail) => void
    userInfo: UserInfoProps
    onSelectAll: (m: API.YakitPluginDetail[]) => void
    isSelectAll: boolean
    user: boolean
    refresh: boolean
    deletePluginRecord?: API.YakitPluginDetail
}

const YakModuleOnlineList: React.FC<YakModuleOnlineListProps> = (props) => {
    const {
        queryOnline,
        setTotal,
        selectedRowKeysRecord,
        onSelectItem,
        onSelectAll,
        isSelectAll,
        onClicked,
        currentId,
        userInfo,
        user,
        deletePluginRecord,
        refresh
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
    const [hasMore, setHasMore] = useState(true)
    const [isRef, setIsRef] = useState(false)
    const [listBodyLoading, setListBodyLoading] = useState(false)
    const numberOnlineUser = useRef(0) // 我的插件 选择的插件index
    const numberOnline = useRef(0) // 插件商店 选择的插件index
    useEffect(() => {
        if (!deletePluginRecord) return
        if (user) {
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
            const data = response.data.filter((ele) => ele.status === 1)
            onSelectAll([...data])
        }
    }, [isSelectAll])
    useEffect(() => {
        setIsAdmin(userInfo.role === "admin")
    }, [userInfo.role])
    useEffect(() => {
        setHasMore(true)
        setIsRef(!isRef)
        onSelectAll([])
        search(1)
        setListBodyLoading(true)
    }, [
        user,
        refresh,
        userInfo.isLogin,
        queryOnline.is_private,
        queryOnline.keywords,
        queryOnline.status,
        queryOnline.type,
        queryOnline.order_by
    ])
    const search = useMemoizedFn((page: number) => {
        let url = "yakit/plugin/unlogged"
        if (userInfo.isLogin) {
            url = "yakit/plugin"
        }
        const payload = {
            ...queryOnline,
            page,
            user
        }
        if (!user) {
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
                user: payload.user
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
        onSelectItem([...selectedRowKeysRecord])
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
    if (!userInfo.isLogin && user) {
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
                isRef={isRef}
                data={response.data}
                page={response.pagemeta.page}
                hasMore={hasMore}
                loading={loading}
                loadMoreData={() => loadMoreData()}
                key='id'
                itemHeight={135}
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
                            if (user) {
                                numberOnlineUser.current = index
                            } else {
                                numberOnline.current = index
                            }
                            onClicked(info)
                        }}
                        onDownload={addLocalLab}
                        onStarred={starredPlugin}
                        user={user}
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
    user: boolean
}

export const RandomTagColor: string[] = [
    "color-bgColor-orange",
    "color-bgColor-purple",
    "color-bgColor-blue",
    "color-bgColor-green",
    "color-bgColor-red"
]

const PluginItemOnline = (props: PluginListOptProps) => {
    const [loading, setLoading] = useState<boolean>(false)
    const {isAdmin, info, onClick, onDownload, onStarred, onSelect, selectedRowKeysRecord, currentId, user} = props
    const tags: string[] = info.tags ? JSON.parse(info.tags) : []
    const [status, setStatus] = useState<number>(info.status)
    const {
        pluginData: {currentPlugin},
        setCurrentPlugin
    } = usePluginStore()
    useEffect(() => {
        setStatus(info.status)
    }, [info.status, info.id])
    useEffect(() => {
        if (!currentPlugin) return
        if (info.id === currentPlugin.id) {
            setStatus(currentPlugin.status)
            setTimeout(() => {
                setCurrentPlugin({currentPlugin: null})
            }, 100)
        }
    }, [currentPlugin && currentPlugin.id])
    const add = useMemoizedFn(async () => {
        setLoading(true)
        onDownload(info, () => {
            setLoading(false)
        })
    })
    return (
        <Card
            size={"small"}
            className='plugin-list-opt'
            onClick={() => onClick(info)}
            bordered={true}
            hoverable={true}
            title={
                <div className='info-title'>
                    <div className='title-text'>
                        <Tooltip title={info.script_name}>
                            <span
                                style={{maxWidth: isAdmin || user ? "60%" : "80%"}}
                                className='text-style content-ellipsis'
                            >
                                {info.script_name}
                            </span>
                        </Tooltip>

                        <div className='text-icon'>
                            {(isAdmin && !user) || (user && !info.is_private) ? (
                                <div
                                    className={`text-icon-admin ${
                                        TagColor[["not", "success", "failed"][status]].split("|")[0]
                                    } vertical-center`}
                                >
                                    {TagColor[["not", "success", "failed"][status]].split("|")[1]}
                                </div>
                            ) : (
                                !user &&
                                info.official && (
                                    <Tooltip title='官方插件'>
                                        {/* @ts-ignore */}
                                        <OfficialYakitLogoIcon className='text-icon-style' />
                                    </Tooltip>
                                )
                            )}
                            {user && (
                                <>
                                    {(info.is_private === true && (
                                        <Tooltip title='私密插件'>
                                            <LockOutlined />
                                        </Tooltip>
                                    )) || (
                                        <Tooltip title='公开插件'>
                                            <OnlineCloudIcon />
                                        </Tooltip>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    <div className='vertical-center'>
                        {(loading && <LoadingOutlined />) || (
                            <Tooltip title={"添加到插件仓库"}>
                                <Button
                                    className='title-add'
                                    type='link'
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        add()
                                    }}
                                >
                                    下载
                                </Button>
                            </Tooltip>
                        )}
                    </div>
                </div>
            }
            style={{
                width: "100%",
                marginBottom: 12,
                backgroundColor: currentId === info.id ? "rgba(79,188,255,0.26)" : "#fff"
            }}
        >
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
            <Row>
                <Col span={24}>
                    <CopyableField
                        style={{width: 430, color: "#5f5f5f", marginBottom: 5}}
                        text={info.help || "No Description about it."}
                        noCopy={true}
                    />
                </Col>
            </Row>
            <Row style={{marginBottom: 4}}>
                {tags && tags.length > 0 && (
                    <Col span={24}>
                        <div className='plugin-tag'>TAG:{tags.join(",")}</div>
                    </Col>
                )}
            </Row>
            <Row>
                <Col span={12}>
                    <Space style={{width: "100%"}}>
                        <Tag color={!info.authors || info.authors === "anonymous" ? "gray" : "geekblue"}>
                            {info.authors || "anonymous"}
                        </Tag>
                    </Space>
                </Col>
                <Col span={12} style={{textAlign: "right"}}>
                    {moment.unix(info.created_at).format("YYYY-MM-DD")}
                </Col>
            </Row>
        </Card>
    )
}

interface QueryComponentOnlineProps {
    onClose: () => void
    userInfo: UserInfoProps
    setQueryOnline: (q: SearchPluginOnlineRequest) => void
    queryOnline: SearchPluginOnlineRequest
    user: boolean
}

const layout = {
    labelCol: {span: 8},
    wrapperCol: {span: 16}
}

const PluginType: {text: string; value: string}[] = [
    {text: "YAK 插件", value: "yak"},
    {text: "MITM 插件", value: "mitm"},
    {text: "数据包扫描", value: "packet-hack"},
    {text: "端口扫描插件", value: "port-scan"},
    {text: "CODEC插件", value: "codec"},
    {text: "YAML POC", value: "nuclei"}
]

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
            type: queryOnline.type ? queryOnline.type.split(",") : [],
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
        setQueryOnline({...queryOnline, order_by: "stars", type: defQueryOnline.type, status: "", is_private: ""})
        form.setFieldsValue({
            order_by: "stars",
            type: defQueryOnline.type,
            status: "all",
            is_private: ""
        })
    }
    const onFinish = useMemoizedFn((value) => {
        const query: SearchPluginOnlineRequest = {
            ...queryOnline,
            ...value,
            status: value.status === "all" ? "" : value.status,
            type: value.type.join(",")
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
                <Form.Item name='type' label='插件类型'>
                    <Select size='small' getPopupContainer={() => refTest.current} mode='multiple'>
                        {PluginType.map((item) => (
                            <Option value={item.value} key={item.value}>
                                {item.text}
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
                            <Option value='0'>待审核</Option>
                            <Option value='1'>审核通过</Option>
                            <Option value='2'>审核不通过</Option>
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
                        {PluginType.map((item) => (
                            <Option value={item.value} key={item.value}>
                                {item.text}
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
