import React, {useEffect, useState, useRef, memo, ReactNode, useLayoutEffect} from "react"
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
    Typography,
    Divider,
    Dropdown,
    AutoComplete,
    Menu,
    Popover
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
    InfoCircleOutlined,
    SettingOutlined,
    CloseOutlined,
    DownOutlined,
    CloudUploadOutlined
} from "@ant-design/icons"
import {showDrawer, showModal} from "../../utils/showModal"
import {startExecYakCode} from "../../utils/basic"
import {genDefaultPagination, QueryYakScriptRequest, QueryYakScriptsResponse, YakScript} from "../invoker/schema"
import {failed, success, warn, info} from "../../utils/notification"
import {CopyableField, InputItem, ManySelectOne, SelectOne} from "../../utils/inputUtil"
import {formatDate} from "../../utils/timeUtil"
import {PluginOperator} from "./PluginOperator"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {AutoCard} from "../../components/AutoCard"
import {UserInfoProps, useStore, YakitStoreParams} from "@/store"
import "./YakitStorePage.scss"
import {getLocalValue, setLocalValue} from "../../utils/kv"
import {
    useCreation,
    useDebounceFn,
    useGetState,
    useMemoizedFn,
    useThrottleFn,
    useVirtualList,
    useDebounceEffect,
    useDebounce,
    useSize
} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {DownloadOnlinePluginProps} from "./YakitPluginInfoOnline/YakitPluginInfoOnline"
import {randomString} from "@/utils/randomUtil"
import {
    OfficialYakitLogoIcon,
    SelectIcon,
    OnlineCloudIcon,
    ImportIcon,
    ShareIcon,
    RecycleIcon
} from "../../assets/icons"
import {findDOMNode} from "react-dom"
import {YakExecutorParam} from "../invoker/YakExecutorParams"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {setTimeout} from "timers"
import {
    ModalSyncSelect,
    onLocalScriptToOnlinePlugin,
    SyncCloudButton
} from "@/components/SyncCloudButton/SyncCloudButton"
import {ENTERPRISE_STATUS, getJuageEnvFile} from "@/utils/envfile"
import {fullscreen} from "@uiw/react-md-editor"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {ItemSelects} from "@/components/baseTemplate/FormItemUtil"
import {ChevronDownIcon} from "@/assets/newIcon"
import style from "@/components/HTTPFlowTable/HTTPFlowTable.module.scss"
import {OutputPluginForm} from "./PluginOperator"
import {YakFilterRemoteObj} from "../mitm/MITMServerHijacking/MITMPluginLocalList"
const IsEnterprise: boolean = ENTERPRISE_STATUS.IS_ENTERPRISE_STATUS === getJuageEnvFile()

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

export interface QueryYakScriptLocalAndUserRequest {
    OnlineBaseUrl: string
    UserId: number
}

export interface SearchPluginOnlineRequest extends API.GetPluginWhere {
    order_by: string
    order?: string
    page?: number
    limit?: number
}

interface TagsAndType {
    Value: string
    Total: number
}

interface GetYakScriptTagsAndTypeResponse {
    Type: TagsAndType[]
    Tag: TagsAndType[]
}

export interface PluginSearchStatisticsRequest {
    bind_me: boolean
}

const typeOnline = "yak,mitm,packet-hack,port-scan,codec,nuclei"
export const defQueryOnline: SearchPluginOnlineRequest = {
    keywords: "",
    order_by: "created_at",
    order: "desc",
    plugin_type: typeOnline,
    page: 1,
    limit: 20,
    status: "",
    bind_me: false,
    is_private: "",
    tags: "",
    recycle: false,
    user_id: 0,
    time_search: ""
}

const defQueryLocal: QueryYakScriptRequest = {
    Type: "yak,mitm,codec,packet-hack,port-scan",
    Keyword: "",
    Pagination: {Limit: 20, Order: "desc", Page: 1, OrderBy: "updated_at"},
    UserId: 0,
    IgnoreGeneralModuleOrder: true
}

const statusType = {
    "0": "待审核",
    "1": "审核通过",
    "2": "审核不通过"
}

const queryTitle = {
    Type: "插件类型",
    Tag: "TAG",
    tags: "TAG",
    plugin_type: "插件类型",
    status: "审核状态"
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
    const [isRefList, setIsRefList, getIsRefList] = useGetState(false)

    // 监听是否点击编辑插件 用于控制插件仓库是否刷新
    const [isEdit, setMonitorEdit] = useState<boolean>(false)
    // 全局登录状态
    const {userInfo} = useStore()
    // 插件仓库参数及页面状态
    const {storeParams, setYakitStoreParams} = YakitStoreParams()

    const [publicKeyword, setPublicKeyword, getPublicKeyword] = useGetState<string>(storeParams.keywords)

    const [statisticsLoading, setStatisticsLoading] = useState<boolean>(false)
    // 统计查询
    const [statisticsQueryLocal, setStatisticsQueryLocal] = useState<QueryYakScriptRequest>(defQueryLocal)
    const [statisticsQueryOnline, setStatisticsQueryOnline, getStatisticsQueryOnline] =
        useGetState<SearchPluginOnlineRequest>({
            ...defQueryOnline,
            keywords: storeParams.keywords,
            plugin_type: storeParams.plugin_type,
            time_search: storeParams.time_search
        })
    const [statisticsQueryUser, setStatisticsQueryUser] = useState<SearchPluginOnlineRequest>(defQueryOnline)
    // 统计数据
    const [yakScriptTagsAndType, setYakScriptTagsAndType] = useState<GetYakScriptTagsAndTypeResponse>()
    const [statisticsDataOnlineOrUser, setStatisticsDataOnlineOrUser] = useState<API.YakitSearch>()
    const [isShowFilter, setIsShowFilter] = useState<boolean>(true)
    const [statisticsIsNull, setStatisticsIsNull] = useState<boolean>(false)
    const [typeStatistics, setTypeStatistics] = useState<string[]>([])
    // 是否第一次渲染页面
    const isFirstRendergraphPage = useRef<boolean>(true)
    const paramsParamsOperation = (res) => {
        if (res) {
            setPlugSource("online")
            if (res.keywords && res.keywords.length > 0) {
                setPublicKeyword(res.keywords)
                setStatisticsQueryOnline({
                    ...defQueryOnline,
                    keywords: res.keywords,
                    plugin_type: typeOnline,
                    time_search: ""
                })
            } else if (res.plugin_type) {
                setPublicKeyword("")
                setStatisticsQueryOnline({
                    ...defQueryOnline,
                    plugin_type: res.plugin_type,
                    keywords: "",
                    time_search: ""
                })
            } else if (res.time_search) {
                setPublicKeyword("")
                setStatisticsQueryOnline({
                    ...defQueryOnline,
                    plugin_type: typeOnline,
                    keywords: "",
                    time_search: res.time_search
                })
            }
        }
    }

    // 参数动态更改
    useEffect(() => {
        if (
            storeParams.keywords.length > 0 ||
            storeParams.plugin_type !== typeOnline ||
            storeParams.time_search.length > 0
        ) {
            setPlugSource("online")
        } else {
            ipcRenderer
                .invoke("fetch-local-cache", userInitUse)
                .then((value: boolean) => {
                    if (value) {
                        setPlugSource("local")
                    } else {
                        setPlugSource("online")
                        ipcRenderer.invoke("set-local-cache", userInitUse, true)
                    }
                })
                .catch(() => {})
                .finally(() => {})
        }
        setYakitStoreParams({...storeParams, isShowYakitStorePage: true})
        ipcRenderer.on("get-yakit-store-params", (e, res) => {
            paramsParamsOperation(res)
        })
        return () => {
            ipcRenderer.removeAllListeners("get-yakit-store-params")
            setYakitStoreParams({
                keywords: "",
                time_search: "",
                plugin_type: typeOnline,
                isShowYakitStorePage: false
            })
        }
    }, [])

    useEffect(() => {
        if (!isEdit && !isFirstRendergraphPage.current) {
            onRefList()
        }
        isFirstRendergraphPage.current = false
    }, [userInfo.isLogin])
    const onRefList = useMemoizedFn((clearFilter = true) => {
        if (clearFilter) {
            setPublicKeyword("")
            onResetQuery()
        }
        onResetPluginDetails()
        setScriptIdOnlineId(undefined)
        setScriptUUIdOnlineUUId(undefined)
        onResetNumber()
        getStatistics(width)
        setFullScreen(false)
        setSearchType("keyword")
        setTimeout(() => {
            setIsRefList(!isRefList)
        }, 200)
    })
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
    // 线上插件UUid
    const [scriptUUIdOnlineUUId, setScriptUUIdOnlineUUId] = useState<string>()

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
                setScriptUUIdOnlineUUId(p.uuid)
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
                setScriptUUIdOnlineUUId(p.uuid)
            })
    })
    const [isFull, setIsFull] = useState(true) //是否全屏card展示
    useEffect(() => {
        setIsFull(!(script || userPlugin || plugin))
    }, [script, userPlugin, plugin])
    const {width} = useSize(document.querySelector("body")) || {width: 0, height: 0}

    useEffect(() => {
        if (plugSource === "user" && !userInfo.isLogin) {
            setIsShowFilter(true)
        } else {
            getStatistics(width)
        }
    }, [width, plugSource, userInfo.isLogin])
    const getStatistics = useMemoizedFn((width: number) => {
        if (width < 1940) {
            setIsShowFilter(true)
            return
        }
        setIsShowFilter(false)
        if (plugSource === "local") {
            getYakScriptTagsAndType()
        } else {
            getPluginSearch()
        }
    })
    const getPluginSearch = useMemoizedFn(() => {
        let url = "plugin/search/unlogged"
        if (userInfo.isLogin) {
            url = "plugin/search"
        }
        setStatisticsLoading(true)
        NetWorkApi<PluginSearchStatisticsRequest, API.YakitSearch>({
            method: "get",
            url,
            params: {
                bind_me: plugSource === "user"
            }
        })
            .then((res: API.YakitSearch) => {
                if (res.plugin_type) {
                    setTypeStatistics(res.plugin_type.map((ele) => ele.value))
                }
                if (res.tags?.length === 0 && res.plugin_type?.length === 0 && res.status?.length === 0) {
                    setStatisticsIsNull(true)
                } else {
                    setStatisticsIsNull(false)
                }
                if (res.tags) {
                    res.tags = res.tags.map((ele) => ({
                        ...ele,
                        value: ele.value.replace(/^"/, "").replace(/"$/, "")
                    }))
                }
                setStatisticsDataOnlineOrUser(res)
            })
            .catch((err) => {
                failed("线上统计数据获取失败:" + err)
            })
            .finally(() => {
                setTimeout(() => {
                    setStatisticsLoading(false)
                }, 200)
            })
    })
    const getYakScriptTagsAndType = useMemoizedFn(() => {
        setStatisticsLoading(true)
        ipcRenderer
            .invoke("GetYakScriptTagsAndType", {})
            .then((res: GetYakScriptTagsAndTypeResponse) => {
                if (res.Type) {
                    setTypeStatistics(res.Type.map((ele) => ele.Value))
                }
                if (res.Tag.length === 0 && res.Type.length === 0) {
                    setStatisticsIsNull(true)
                } else {
                    setStatisticsIsNull(false)
                }
                setYakScriptTagsAndType(res)
            })
            .catch((e) => {
                failed(`获取本地插件统计数据展示错误:${e}`)
            })
            .finally(() => {
                setTimeout(() => {
                    setStatisticsLoading(false)
                }, 200)
            })
    })
    const onResetStatisticsQuery = useMemoizedFn(() => {
        setStatisticsQueryLocal(defQueryLocal)
        setStatisticsQueryOnline(defQueryOnline)
        setStatisticsQueryUser(defQueryOnline)
    })
    const onSearch = useMemoizedFn((queryName: string, value: string) => {
        setListLoading(true)
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
        let queryArr: string[] = []
        if (Array.isArray(currentQuery)) {
            queryArr = currentQuery || []
        } else {
            queryArr = currentQuery ? currentQuery.split(",") : []
        }

        const index: number = queryArr.findIndex((ele) => ele === value)
        if (index === -1) {
            queryArr.push(value)
            const newValue = queryName === "Tag" ? queryArr : queryArr.join(",")
            setStatisticsQueryLocal({
                ...statisticsQueryLocal,
                [queryName]: newValue
            })
        } else {
            queryArr.splice(index, 1)
            let newValue = queryName === "Tag" ? queryArr : queryArr.join(",")
            if (queryName === "Type") {
                const length = typeStatistics.map((ele) => queryArr.some((l) => l === ele)).filter((l) => l).length
                if (length === 0) {
                    newValue = ""
                }
            }
            setStatisticsQueryLocal({
                ...statisticsQueryLocal,
                [queryName]: newValue
            })
        }
    })
    const onSearchUser = useMemoizedFn((queryName: string, value: string) => {
        if (queryName === "status" || queryName === "is_private") {
            setStatisticsQueryUser({
                ...statisticsQueryUser,
                [queryName]: statisticsQueryUser[queryName] === value ? "" : value
            })
        } else {
            const currentQuery: string = statisticsQueryUser[queryName]
            const queryArr: string[] = currentQuery ? currentQuery.split(",") : []
            const index: number = queryArr.findIndex((ele) => ele === value)
            if (index === -1) {
                queryArr.push(value)
                const newValue = queryArr.join(",")
                setStatisticsQueryUser({
                    ...statisticsQueryUser,
                    [queryName]: newValue
                })
            } else {
                queryArr.splice(index, 1)
                let newValue = queryArr.join(",")
                if (queryName === "plugin_type") {
                    const length = typeStatistics.map((ele) => queryArr.some((l) => l === ele)).filter((l) => l).length
                    if (length === 0) {
                        newValue = ""
                    }
                }
                setStatisticsQueryUser({
                    ...statisticsQueryUser,
                    [queryName]: newValue
                })
            }
        }
    })
    const onSearchOnline = useMemoizedFn((queryName: string, value: string) => {
        if (queryName === "status" || queryName === "order_by") {
            setStatisticsQueryOnline({
                ...statisticsQueryOnline,
                [queryName]: statisticsQueryOnline[queryName] === value ? "" : value
            })
        } else {
            const currentQuery: string = statisticsQueryOnline[queryName]
            const queryArr: string[] = currentQuery ? currentQuery.split(",") : []
            const index: number = queryArr.findIndex((ele) => ele === value)
            if (index === -1) {
                queryArr.push(value)
                const newValue = queryArr.join(",")
                setStatisticsQueryOnline({
                    ...statisticsQueryOnline,
                    [queryName]: newValue
                })
            } else {
                queryArr.splice(index, 1)
                let newValue = queryArr.join(",")
                if (queryName === "plugin_type") {
                    const length = typeStatistics.map((ele) => queryArr.some((l) => l === ele)).filter((l) => l).length
                    if (length === 0) {
                        newValue = ""
                    }
                }
                setStatisticsQueryOnline({
                    ...statisticsQueryOnline,
                    [queryName]: newValue
                })
            }
        }
    })
    const showName = useMemoizedFn((queryName: string, name: string) => {
        switch (queryName) {
            case "plugin_type":
                return PluginType[name]
            case "Type":
                return PluginType[name]
            case "status":
                return statusType[name]
            default:
                return name
        }
    })
    const [searchType, setSearchType] = useState<"userName" | "keyword">("keyword")

    return (
        <>
            <div className='plugin-store'>
                <Card
                    bodyStyle={{padding: 0, height: isFull ? "calc(100% - 62px)" : "calc(100% - 42px)"}}
                    bordered={false}
                    style={{
                        height: "100%",
                        width: isFull ? (!isShowFilter && "calc(100% - 360px)") || "100%" : 470,
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
                            <Col span={12}>
                                <Input.Group className='search-input-body'>
                                    {plugSource !== "user" && isFull && (
                                        <Select
                                            value={searchType}
                                            onSelect={setSearchType}
                                            size={isFull ? "middle" : "small"}
                                        >
                                            <Option value='keyword'>关键字</Option>
                                            <Option value='userName'>按作者</Option>
                                        </Select>
                                    )}
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
                                </Input.Group>
                            </Col>
                        </Row>
                    }
                    size={"small"}
                    className='left-list'
                >
                    <Spin spinning={listLoading}>
                        {plugSource === "local" && (
                            <YakModule
                                getYakScriptTagsAndType={getYakScriptTagsAndType}
                                isShowFilter={isShowFilter}
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
                                userInfo={userInfo}
                                searchType={searchType}
                                setListLoading={setListLoading}
                            />
                        )}
                        {plugSource === "user" && (
                            <YakModuleUser
                                isShowFilter={isShowFilter}
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
                                isShowFilter={isShowFilter}
                                setStatisticsQueryOnline={setStatisticsQueryOnline}
                                statisticsQueryOnline={getStatisticsQueryOnline()}
                                numberOnline={numberOnline}
                                setNumberOnline={setNumberOnline}
                                size={isFull ? "middle" : "small"}
                                plugin={plugin}
                                setPlugin={onSetPluginAndGetLocal}
                                userInfo={userInfo}
                                publicKeyword={getPublicKeyword()}
                                isRefList={isRefList}
                                deletePluginRecordOnline={deletePluginRecordOnline}
                                setListLoading={setListLoading}
                                updatePluginRecordOnline={updatePluginRecordOnline}
                                searchType={searchType}
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
                                                onRefList(false)
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
                                bodyStyle={{height: "calc(100% - 69px)"}}
                            >
                                <PluginOperator
                                    setMonitorEdit={setMonitorEdit}
                                    userInfo={userInfo}
                                    plugSource={plugSource}
                                    yakScriptId={(script && script.Id) || 0}
                                    yakScriptIdOnlineId={scriptIdOnlineId}
                                    yakScriptUUIdOnlineUUId={scriptUUIdOnlineUUId}
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
                {isFull && !isShowFilter && (
                    <div className='plugin-statistics'>
                        <Spin spinning={statisticsLoading || listLoading}>
                            {plugSource === "online" && (
                                <div className='opt-list'>
                                    <div className='opt-header'>排序顺序</div>
                                    <div
                                        className={`opt-list-item ${
                                            statisticsQueryOnline.order_by === "created_at" && "opt-list-item-selected"
                                        }`}
                                        onClick={() => onSearch("order_by", "created_at")}
                                    >
                                        <span className='item-name content-ellipsis'>按时间</span>
                                    </div>
                                    <div
                                        className={`opt-list-item ${
                                            statisticsQueryOnline.order_by === "stars" && "opt-list-item-selected"
                                        }`}
                                        onClick={() => onSearch("order_by", "stars")}
                                    >
                                        <span className='item-name content-ellipsis'>按热度</span>
                                    </div>
                                </div>
                            )}
                            {plugSource === "user" && userInfo.isLogin && (
                                <div className='opt-list'>
                                    <div className='opt-header'>私密/公开</div>
                                    <div
                                        className={`opt-list-item ${
                                            statisticsQueryUser.is_private === "true" && "opt-list-item-selected"
                                        }`}
                                        onClick={() => onSearch("is_private", "true")}
                                    >
                                        <span className='item-name content-ellipsis'>私密</span>
                                    </div>
                                    <div
                                        className={`opt-list-item ${
                                            statisticsQueryUser.is_private === "false" && "opt-list-item-selected"
                                        }`}
                                        onClick={() => onSearch("is_private", "false")}
                                    >
                                        <span className='item-name content-ellipsis'>公开</span>
                                    </div>
                                </div>
                            )}
                            {(statisticsIsNull && <Empty description='暂无统计数据' />) || (
                                <>
                                    {Object.entries(
                                        plugSource === "local"
                                            ? yakScriptTagsAndType || {}
                                            : statisticsDataOnlineOrUser || {}
                                    ).map((item) => {
                                        const queryName = item[0]
                                        const statisticsList = item[1]
                                        const title = queryTitle[queryName]
                                        let current: string | string[] = ""
                                        if (plugSource === "local") {
                                            current = statisticsQueryLocal[queryName] || ""
                                        }
                                        if (plugSource === "user") {
                                            current = statisticsQueryUser[queryName] || ""
                                        }
                                        if (plugSource === "online") {
                                            current = statisticsQueryOnline[queryName] || ""
                                        }

                                        // 审核状态展示
                                        const boolAdmin = ["admin", "superAdmin"].includes(userInfo.role || "")
                                        const UserIsPrivate =
                                            queryName === "status" &&
                                            plugSource === "user" &&
                                            statisticsQueryUser.is_private !== "false"
                                        const OnlineAdmin =
                                            queryName === "status" && plugSource === "online" && !boolAdmin
                                        const OnlineStatusSearch =
                                            queryName === "status" &&
                                            plugSource === "online" &&
                                            !boolAdmin &&
                                            userInfo.showStatusSearch !== true
                                        if (!IsEnterprise && (UserIsPrivate || OnlineAdmin)) return <></>
                                        if (IsEnterprise && (UserIsPrivate || OnlineStatusSearch)) return <></>

                                        if (!Array.isArray(current)) {
                                            current = current.split(",")
                                        }
                                        return (
                                            statisticsList &&
                                            statisticsList.length > 0 && (
                                                <div key={title} className='opt-list'>
                                                    <div className='opt-header'>{title}</div>
                                                    {statisticsList.map((ele) => (
                                                        <div
                                                            key={`${ele.value || ele.Value}-${plugSource}`}
                                                            className={`opt-list-item ${
                                                                Array.isArray(current) &&
                                                                current.findIndex(
                                                                    (c) => c === (ele.value || ele.Value)
                                                                ) !== -1 &&
                                                                "opt-list-item-selected"
                                                            }`}
                                                            onClick={() => onSearch(queryName, ele.value || ele.Value)}
                                                        >
                                                            <span className='item-name content-ellipsis'>
                                                                {showName(queryName, ele.value || ele.Value)}
                                                            </span>
                                                            <span>{ele.count || ele.Total}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )
                                        )
                                    })}
                                </>
                            )}
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
    isShowFilter: boolean
    getYakScriptTagsAndType: () => void
    userInfo: UserInfoProps
    searchType: "userName" | "keyword"
    setListLoading: (b: boolean) => void
}

interface DeleteAllLocalPluginsRequest {
    Keywords?: string
    Type?: string
    UserId?: number
    UserName?: string
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
        statisticsQueryLocal,
        isShowFilter,
        getYakScriptTagsAndType,
        userInfo,
        searchType,
        setListLoading
    } = props
    const [totalLocal, setTotalLocal] = useState<number>(0)
    const [queryLocal, setQueryLocal] = useState<QueryYakScriptRequest>({
        ...statisticsQueryLocal
    })
    const [refresh, setRefresh] = useState(false)
    const [isSelectAllLocal, setIsSelectAllLocal] = useState<boolean>(false)
    const [selectedRowKeysRecordLocal, setSelectedRowKeysRecordLocal] = useState<YakScript[]>([])
    const [selectedUploadRowKeysRecordLocal, setSelectedUploadRowKeysRecordLocal, getSelectedUploadRowKeysRecordLocal] =
        useGetState<YakScript[]>([])
    const [visibleQuery, setVisibleQuery] = useState<boolean>(false)
    const [isFilter, setIsFilter] = useState<boolean>(false)
    const [isShowYAMLPOC, setIsShowYAMLPOC] = useState<boolean>(false)
    const [visibleSyncSelect, setVisibleSyncSelect] = useState<boolean>(false)
    const [upLoading, setUpLoading] = useState<boolean>(false)
    const [userInfoLocal, setUserInfoLocal] = useState<PluginUserInfoLocalProps>({
        UserId: 0,
        HeadImg: ""
    })
    useEffect(() => {
        if (searchType === "keyword") {
            setQueryLocal({
                ...queryLocal,
                Keyword: publicKeyword,
                UserName: ""
            })
        } else {
            setQueryLocal({
                ...queryLocal,
                Keyword: "",
                UserName: publicKeyword
            })
        }
    }, [searchType, publicKeyword])
    useEffect(() => {
        const newQuery = {
            ...queryLocal,
            ...statisticsQueryLocal
        }
        if (!statisticsQueryLocal.Tag) {
            delete newQuery.Tag
        }
        if (newQuery.Type?.includes("nuclei")) {
            setIsShowYAMLPOC(true)
        } else {
            setIsShowYAMLPOC(false)
        }
        if (statisticsQueryLocal.UserId === 0) {
            setUserInfoLocal({
                UserId: 0,
                HeadImg: ""
            })
        }
        setQueryLocal(newQuery)
        onResetList()
    }, [statisticsQueryLocal])
    useEffect(() => {
        if (queryLocal.Type === defQueryLocal.Type) {
            setIsFilter(false)
        } else {
            setIsFilter(true)
        }
    }, [queryLocal])
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
    useEffect(() => {
        ipcRenderer.on("ref-local-script-list", (e, res: any) => {
            onResetList()
        })
        return () => {
            ipcRenderer.removeAllListeners("ref-local-script-list")
        }
    }, [])
    const onRemoveLocalPlugin = useMemoizedFn(() => {
        const length = selectedRowKeysRecordLocal.length
        if (length === 0 || isSelectAllLocal) {
            const paramsRemove: DeleteAllLocalPluginsRequest = {
                Keywords: queryLocal.Keyword,
                Type: queryLocal.Type,
                UserId: queryLocal.UserId,
                UserName: queryLocal.UserName
            }

            // 全部删除
            ipcRenderer
                .invoke("DeleteLocalPluginsByWhere", paramsRemove)
                .then(() => {
                    setRefresh(!refresh)
                    setScript(undefined)
                    onSelectAllLocal(false)
                    getYakScriptTagsAndType()
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
                    onSelectAllLocal(false)
                    getYakScriptTagsAndType()
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
            setStatisticsQueryLocal({
                ...queryLocal,
                Type: "yak,mitm,codec,packet-hack,port-scan,nuclei"
            })
        } else {
            setStatisticsQueryLocal({
                ...queryLocal,
                Type: "yak,mitm,codec,packet-hack,port-scan"
            })
        }
        // setRefresh(!refresh)
        setIsShowYAMLPOC(checked)
        onSelectAllLocal(false)
    })
    const onAdd = useMemoizedFn(() => {
        ipcRenderer.invoke("send-to-tab", {
            type: "add-yakit-script",
            data: {}
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
    const onBatchUpload = useMemoizedFn(() => {
        if (!userInfo.isLogin) {
            warn("请先登录")
            return
        }
        if (selectedRowKeysRecordLocal.length === 0) {
            warn("请选择需要上传的本地数据")
            return
        }
        if (isSelectAllLocal) {
            getRemoteValue("httpSetting").then((setting) => {
                const values = JSON.parse(setting)
                const OnlineBaseUrl: string = values.BaseUrl
                const UserId = userInfo.user_id
                ipcRenderer
                    .invoke("QueryYakScriptLocalAndUser", {
                        OnlineBaseUrl,
                        UserId
                    } as QueryYakScriptLocalAndUserRequest)
                    .then((newSrcipt: {Data: YakScript[]}) => {
                        setSelectedUploadRowKeysRecordLocal(newSrcipt.Data)
                        JudgeIsShowVisible(newSrcipt.Data)
                    })
                    .catch((e) => {
                        failed(`查询所有插件错误:${e}`)
                        setUpLoading(false)
                    })
                    .finally(() => {})
            })
        } else {
            setSelectedUploadRowKeysRecordLocal(selectedRowKeysRecordLocal)
            JudgeIsShowVisible(selectedRowKeysRecordLocal)
        }
    })

    // 判断是否显示私密公开弹框(如没有新增则不显示弹窗)
    const JudgeIsShowVisible = (selectArr: YakScript[]) => {
        const index = selectArr.findIndex((s) => s.UUID === "")
        if (index === -1) {
            // 所选插件全都有UUID
            upOnlineBatch(2)
            return
        }
        setUpLoading(false)
        setVisibleSyncSelect(true)
    }

    const onSyncSelect = useMemoizedFn((type) => {
        // 1 私密：个人账号 2公开：审核后同步云端
        if (type === 1) {
            upOnlineBatch(1)
        } else {
            upOnlineBatch(2)
        }
    })

    const upOnlineBatch = useMemoizedFn(async (type: number) => {
        setUpLoading(true)
        const realSelectedRowKeysRecordLocal = [...getSelectedUploadRowKeysRecordLocal()]
        const length = realSelectedRowKeysRecordLocal.length
        const errList: any[] = []
        for (let index = 0; index < length; index++) {
            const element = realSelectedRowKeysRecordLocal[index]
            const res = await upOnline(element, "yakit/plugin", type)
            if (res) {
                errList.push(res)
            }
        }

        if (errList.length > 0) {
            const errString = errList
                .filter((_, index) => index < 10)
                .map((e) => {
                    return `插件名：【${e.script_name}】，失败原因：${e.err}`
                })
            failed("“" + errString.join(";") + `${(errList.length > 0 && "...") || ""}` + "”上传失败")
        } else {
            success("批量上传成功")
        }
        setUpLoading(false)
        setVisibleSyncSelect(false)
        setTimeout(() => {
            onResetList()
        }, 200)
    })

    const upOnline = useMemoizedFn(async (params: YakScript, url: string, type: number) => {
        const onlineParams: API.SaveYakitPlugin = onLocalScriptToOnlinePlugin(params, type)
        if (params.OnlineId) {
            onlineParams.id = parseInt(`${params.OnlineId}`)
        }
        return new Promise((resolve) => {
            NetWorkApi<API.SaveYakitPlugin, API.YakitPluginResponse>({
                method: "post",
                url,
                data: onlineParams
            })
                .then((res) => {
                    resolve(false)
                    // 上传后，先下载最新的然后删除本地旧的
                    ipcRenderer
                        .invoke("DownloadOnlinePluginById", {
                            OnlineID: res.id,
                            UUID: res.uuid
                        } as DownloadOnlinePluginProps)
                        .then((res) => {
                            ipcRenderer
                                .invoke("delete-yak-script", params.Id)
                                .then(() => {})
                                .catch((err) => {
                                    failed("删除本地【" + params.ScriptName + "】失败:" + err)
                                })
                        })
                })
                .catch((err) => {
                    const errObj = {
                        script_name: params.ScriptName,
                        err
                    }
                    resolve(errObj)
                })
        })
    })
    const onSetUser = useMemoizedFn((item: PluginUserInfoLocalProps) => {
        setStatisticsQueryLocal({
            ...queryLocal,
            UserId: item.UserId
        })
        setUserInfoLocal(item)
        onSelectAllLocal(false)
        setTimeout(() => {
            setRefresh(!refresh)
        }, 100)
    })

    const menuData = [
        {
            title: "删除插件",
            number: 10,
            onClickBatch: () => {
                onRemoveLocalPlugin()
            }
        },
        {
            title: "导出插件",
            number: 10,
            onClickBatch: () => {
                const Ids = selectedRowKeysRecordLocal.map((ele) =>
                    typeof ele.Id === "number" ? ele.Id : parseInt(ele.Id)
                )
                showModal({
                    title: "导出插件配置",
                    width: "40%",
                    content: (
                        <>
                            <OutputPluginForm YakScriptIds={Ids} isSelectAll={isSelectAllLocal} />
                        </>
                    )
                })
            }
        },
        {
            title: "上传插件",
            number: 10,
            onClickBatch: () => {
                onBatchUpload()
            }
        }
    ]

    return (
        <div className='height-100'>
            <Row className='row-body' gutter={12}>
                <Col span={size === "small" ? 20 : 12} className='col'>
                    <Checkbox checked={isSelectAllLocal} onChange={(e) => onSelectAllLocal(e.target.checked)}>
                        全选
                    </Checkbox>
                    {selectedRowKeysRecordLocal.length > 0 && (
                        <Tag color='blue'>
                            已选{isSelectAllLocal ? totalLocal : selectedRowKeysRecordLocal.length}条
                        </Tag>
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
                    {userInfoLocal.HeadImg && (
                        <div className='plugin-headImg'>
                            <img alt='' src={userInfoLocal.HeadImg} />
                            <div
                                className='img-mask'
                                onClick={(e) => {
                                    e.stopPropagation()
                                    if (onSetUser)
                                        onSetUser({
                                            UserId: 0,
                                            HeadImg: ""
                                        })
                                }}
                            >
                                <CloseOutlined className='img-mask-icon' />
                            </div>
                        </div>
                    )}
                </Col>
                <Col span={size === "small" ? 4 : 12} className='col-flex-end'>
                    {isShowFilter && (
                        <PluginFilter
                            visibleQuery={visibleQuery}
                            setVisibleQuery={setVisibleQuery}
                            queryChildren={
                                <QueryComponentLocal
                                    onClose={() => setVisibleQuery(false)}
                                    queryLocal={queryLocal}
                                    setQueryLocal={(e) => {
                                        setStatisticsQueryLocal(e)
                                        // onResetList()
                                    }}
                                />
                            }
                            size={size}
                            isFilter={isFilter}
                        />
                    )}
                    {/* <Popconfirm
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
                    </Popconfirm> */}
                    {/* <Popconfirm title='上传不支持全选且只能上传未上传至云端的插件' onConfirm={() => onBatchUpload()}>
                        {(size === "small" && (
                            <Tooltip title='上传'>
                                <UploadOutlined className='operation-icon' />
                            </Tooltip>
                        )) || (
                            <Button size='small' type='primary'>
                                上传
                            </Button>
                        )}
                    </Popconfirm> */}
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

                    {(selectedRowKeysRecordLocal.length === 0 && (
                        <>
                            {size === "small" ? (
                                <></>
                            ) : (
                                <Button
                                    size='small'
                                    disabled={selectedRowKeysRecordLocal.length === 0}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                    }}
                                >
                                    批量操作
                                    <ChevronDownIcon style={{color: "#85899E"}} />
                                </Button>
                            )}
                        </>
                    )) || (
                        <Popover
                            overlayClassName={style["http-history-table-drop-down-popover"]}
                            content={
                                <Menu className={style["http-history-table-drop-down-batch"]}>
                                    {menuData.map((m) => {
                                        return (
                                            <Menu.Item
                                                onClick={() => {
                                                    m.onClickBatch()
                                                }}
                                                key={m.title}
                                            >
                                                {m.title}
                                            </Menu.Item>
                                        )
                                    })}
                                </Menu>
                            }
                            trigger='click'
                            placement='bottomLeft'
                        >
                            {size === "small" ? (
                                <SettingOutlined className='operation-icon' />
                            ) : (
                                <Button
                                    size='small'
                                    disabled={selectedRowKeysRecordLocal.length === 0}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                    }}
                                >
                                    批量操作
                                    <ChevronDownIcon style={{color: "#85899E"}} />
                                </Button>
                            )}
                        </Popover>
                    )}
                </Col>
            </Row>

            <ModalSyncSelect
                visible={visibleSyncSelect}
                handleOk={onSyncSelect}
                handleCancel={() => {
                    if (upLoading) {
                        warn("请等待插件上传完成后再关闭该modal框")
                        return
                    }
                    setVisibleSyncSelect(false)
                    onResetList()
                }}
                loading={upLoading}
            />

            <div className='list-height'>
                <YakModuleList
                    isGridLayout={size === "middle"}
                    numberLocalRoll={numberLocal}
                    itemHeight={170}
                    currentScript={script}
                    onClicked={(info, index) => {
                        if (info?.Id === script?.Id) return
                        if (size === "middle") {
                            setNumberLocal(index || 0)
                        }
                        setScript(info)
                    }}
                    setTotal={setTotalLocal}
                    setIsRequest={setListLoading}
                    queryLocal={queryLocal}
                    refresh={refresh}
                    deletePluginRecordLocal={deletePluginRecordLocal}
                    isSelectAll={isSelectAllLocal}
                    setIsSelectAll={setIsSelectAllLocal}
                    selectedRowKeysRecord={selectedRowKeysRecordLocal}
                    onSelectList={setSelectedRowKeysRecordLocal}
                    updatePluginRecordLocal={updatePluginRecordLocal}
                    setUpdatePluginRecordLocal={setUpdatePluginRecordLocal}
                    onSetUser={onSetUser}
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
    setIsSelectAll?: (s: boolean) => void
    selectedRowKeysRecord?: YakScript[]
    onSelectList?: (m: YakScript[]) => void
    setUpdatePluginRecordLocal?: (y: YakScript) => any
    numberLocalRoll?: number
    isGridLayout?: boolean
    // searchKeyword?: string
    tag?: string[]
    onSetUser?: (u: PluginUserInfoLocalProps) => void
    setIsRequest?: (s: boolean) => void
    emptyNode?: ReactNode
}

export const YakModuleList: React.FC<YakModuleListProp> = (props) => {
    const defaultQuery = useCreation(() => {
        return {
            Tag: [],
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
        isGridLayout,
        setIsSelectAll,
        onSetUser,
        setIsRequest,
        emptyNode
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
    const [recalculation, setRecalculation] = useState(false)
    const numberLocal = useRef<number>(0) // 本地 选择的插件index
    const [baseUrl, setBaseUrl] = useState<string>("") // 获取私有域
    useEffect(() => {
        if (isSelectAll) {
            if (onSelectList) onSelectList(response.Data)
        }
    }, [isSelectAll])

    useEffect(() => {
        getRemoteValue("httpSetting").then((setting) => {
            const values = JSON.parse(setting)
            const baseUrl: string = values.BaseUrl
            setBaseUrl(baseUrl)
        })
    }, [])
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
        setTimeout(() => {
            setRecalculation(!recalculation)
        }, 100)
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
                const isMore = item.Data.length < item.Pagination.Limit || data.length === response.Total
                setHasMore(!isMore)
                if (newParams.Pagination.Page > 1 && isSelectAll) {
                    if (onSelectList) onSelectList(data)
                }
                setResponse({
                    ...item,
                    Data: [...data]
                })
                if (page === 1) {
                    if (props.setTotal) props.setTotal(item.Total || 0)
                    setIsRef(!isRef)
                }
            })
            .catch((e: any) => {
                failed("Query Local Yak Script failed: " + `${e}`)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                    setListBodyLoading(false)
                    if (setIsRequest) setIsRequest(false)
                }, 200)
            })
    }
    const [isRef, setIsRef] = useState(false)
    useEffect(() => {
        const newParams = {
            ...params,
            ...queryLocal
        }
        setParams(newParams)
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
        setTimeout(() => {
            setRecalculation(!recalculation)
        }, 100)
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
            if (onSelectList) onSelectList([...selectedRowKeysRecord])
        } else {
            const newSelectedRowKeysRecord = selectedRowKeysRecord.filter((ele) => ele.Id !== item.Id)
            if (onSelectList) onSelectList([...newSelectedRowKeysRecord])
        }
        if (setIsSelectAll) setIsSelectAll(false)
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
            {(response.Data.length === 0 && emptyNode) || (
                <RollingLoadList<YakScript>
                    isGridLayout={isGridLayout}
                    numberRoll={numberLocalRoll}
                    isRef={isRef}
                    recalculation={recalculation}
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
                            onlineProfile={baseUrl}
                            currentScript={props.currentScript}
                            onYakScriptRender={props.onYakScriptRender}
                            maxWidth={maxWidth}
                            selectedRowKeysRecord={selectedRowKeysRecord || []}
                            onSelect={onSelect}
                            setUpdatePluginRecordLocal={(s) => {
                                if (setUpdatePluginRecordLocal) setUpdatePluginRecordLocal(s)
                            }}
                            onShare={onShare}
                            onSetUser={onSetUser}
                        />
                    )}
                />
            )}
        </Spin>
    )
}

export interface YakFilterModuleSelectProps {
    selectedTags: string[]
    setSelectedTags: (v: string[]) => void
}
export interface TagValue {
    Name: string
    Total: number
}
// 封装动态select筛选组件
export const YakFilterModuleSelect: React.FC<YakFilterModuleSelectProps> = (props) => {
    const {selectedTags, setSelectedTags} = props
    const [allTag, setAllTag] = useState<TagValue[]>([])
    // 下拉框选中tag值
    const selectRef = useRef(null)
    // 用于存储 tag 的搜索与结果
    const [topTags, setTopTags] = useState<TagValue[]>([])
    const [itemSelects, setItemSelects] = useState<string[]>([])
    // 设置本地搜索 tags 的状态
    const [searchTag, setSearchTag] = useState("")
    const [topN, setTopN] = useState(15)
    // 设置最大最小值
    const [minTagWeight, setMinTagWeight] = useState(1)
    const [maxTagWeight, setMaxTagWeight] = useState(2000)
    // 辅助变量
    const [updateTagsSelectorTrigger, setUpdateTagsSelector] = useState(false)

    const [selectLoading, setSelectLoading] = useState<boolean>(true)

    useEffect(() => {
        setTimeout(() => setSelectLoading(false), 300)
    }, [selectLoading])

    useEffect(() => {
        ipcRenderer
            .invoke("GetYakScriptTags", {})
            .then((res) => {
                setAllTag(res.Tag.map((item) => ({Name: item.Value, Total: item.Total})))
            })
            .catch((e) => console.info(e))
            .finally(() => {})
    }, [])

    useEffect(() => {
        let count = 0
        const showTags = allTag.filter((d) => {
            if (
                count <= topN && // 限制数量
                d.Total >= minTagWeight &&
                d.Total <= maxTagWeight &&
                !selectedTags.includes(d.Name) &&
                d.Name.toLowerCase().includes(searchTag.toLowerCase()) // 设置搜索结果
            ) {
                count++
                return true
            }
            return false
        })
        setTopTags([...showTags])
    }, [
        allTag,
        useDebounce(minTagWeight, {wait: 500}),
        useDebounce(maxTagWeight, {wait: 500}),
        useDebounce(searchTag, {wait: 500}),
        useDebounce(selectedTags, {wait: 500}),
        useDebounce(topN, {wait: 500}),
        updateTagsSelectorTrigger
    ])

    const selectDropdown = useMemoizedFn((originNode: React.ReactNode) => {
        return (
            <div>
                <Spin spinning={selectLoading}>{originNode}</Spin>
            </div>
        )
    })
    return (
        <ItemSelects
            item={{}}
            select={{
                ref: selectRef,
                className: "div-width-100",
                allowClear: true,
                autoClearSearchValue: false,
                maxTagCount: "responsive",
                mode: "multiple",
                size: "small",
                data: topTags,
                optValue: "Name",
                optionLabelProp: "Name",
                renderOpt: (info: TagValue) => {
                    return (
                        <div style={{display: "flex", justifyContent: "space-between"}}>
                            <span>{info.Name}</span>
                            <span>{info.Total}</span>
                        </div>
                    )
                },
                value: itemSelects, // selectedTags
                onSearch: (keyword: string) => setSearchTag(keyword),
                setValue: (value) => {
                    setItemSelects(value)
                },
                onDropdownVisibleChange: (open) => {
                    if (open) {
                        setItemSelects([])
                        setSearchTag("")
                    } else {
                        const filters = itemSelects.filter((item) => !selectedTags.includes(item))
                        setSelectedTags(selectedTags.concat(filters))
                        setItemSelects([])
                        setSearchTag("")
                    }
                },
                onPopupScroll: (e) => {
                    const {target} = e
                    const ref: HTMLDivElement = target as unknown as HTMLDivElement
                    if (ref.scrollTop + ref.offsetHeight + 20 >= ref.scrollHeight) {
                        setSelectLoading(true)
                        setTopN(topN + 10)
                    }
                },
                dropdownRender: (originNode: React.ReactNode) => selectDropdown(originNode)
            }}
        />
    )
}

interface TagsProps {
    Value: string
    Total: number
}

export interface YakFilterModuleList {
    TYPE?: string
    tag: string[]
    searchType: string
    setTag: (v: string[]) => void
    tagsLoading?: boolean
    refresh: boolean
    setRefresh: (v: boolean) => void
    onDeselect: () => void
    tagsList?: TagsProps[]
    setSearchType: (v: any) => void
    setSearchKeyword: (v: string) => void
    checkAll: boolean
    checkList: string[]
    multipleCallBack: (v: string[]) => void
    onCheckAllChange: (v: any) => void
    setCheckAll?: (v: boolean) => void
    commonTagsSelectRender?: boolean
    TagsSelectRender?: () => any
    settingRender?: () => any
}

export const YakFilterModuleList: React.FC<YakFilterModuleList> = (props) => {
    const {
        // 控件来源
        TYPE,
        // 当前为tags或者input
        searchType,
        // 更改tags或者input回调
        setSearchType,
        // tags更改回调函数
        setTag,
        // tags控件加载控件
        tagsLoading = false,
        // 获取boolean用于更新列表
        refresh,
        // 更新函数
        setRefresh,
        // tags清空的回调函数
        onDeselect,
        // tag 选中的value值
        tag,
        // 展示的tag list
        tagsList = [],
        // input输入框回调
        setSearchKeyword,
        // 是否全选
        checkAll,
        // 全选回调MITM
        onCheckAllChange,
        // 当前选中的check list
        checkList,
        // 插件组选中项回调
        multipleCallBack,
        // 是否动态加载公共TAGS控件
        commonTagsSelectRender = false,
        // 外部TAGS组件渲染
        TagsSelectRender,
        // 动态加载设置项
        settingRender
    } = props
    const FILTER_CACHE_LIST_DATA = `FILTER_CACHE_LIST_COMMON_DATA`
    const [form] = Form.useForm()
    const layout = {
        labelCol: {span: 5},
        wrapperCol: {span: 19}
    }
    const itemLayout = {
        labelCol: {span: 5},
        wrapperCol: {span: 16}
    }
    const [menuList, setMenuList] = useState<YakFilterRemoteObj[]>([])
    const nowData = useRef<YakFilterRemoteObj[]>([])
    // 此处存储读取是一个异步过程 可能存在存储后读取的数据不为最新值
    // const [reload, setReload] = useState<boolean>(false)
    // // 引入公共Select组件数据
    // const [selectedTags, setSelectedTags] = useState<string[]>([])
    useEffect(() => {
        getRemoteValue(FILTER_CACHE_LIST_DATA).then((data: string) => {
            if (!!data) {
                const cacheData: YakFilterRemoteObj[] = JSON.parse(data)
                setMenuList(cacheData)
            }
        })
    }, [])

    const menuClick = (value: string[]) => {
        if (TYPE === "MITM") {
            // 移除插件组 关闭全选
            ipcRenderer.invoke("mitm-remove-hook", {
                HookName: [],
                RemoveHookID: checkList
            } as any)
        }
        // setCheckAll && setCheckAll(false)
        multipleCallBack(value)
    }

    const deletePlugIn = (e, name: string) => {
        e.stopPropagation()
        const newArr: YakFilterRemoteObj[] = menuList.filter((item) => item.name !== name)
        setRemoteValue(FILTER_CACHE_LIST_DATA, JSON.stringify(newArr))
        nowData.current = newArr
        setMenuList(nowData.current)
        // setReload(!reload)
    }

    const plugInMenu = () => {
        return menuList.map((item: YakFilterRemoteObj) => (
            <div key={item.name} style={{display: "flex"}} onClick={() => menuClick(item.value)}>
                <div className='content-ellipsis' style={{width: 100}}>
                    {item.name}
                </div>
                <div style={{width: 10, margin: "0px 10px"}}>{item.value.length}</div>
                <DeleteOutlined
                    style={{position: "relative", top: 5, marginLeft: 4}}
                    onClick={(e) => deletePlugIn(e, item.name)}
                />
            </div>
        ))
    }
    const AddPlugIn = (props) => {
        const {onClose} = props
        const onFinish = useMemoizedFn((value) => {
            getRemoteValue(FILTER_CACHE_LIST_DATA)
                .then((data: string) => {
                    let obj = {
                        name: value.name,
                        value: checkList
                    }
                    if (!!data) {
                        const cacheData: YakFilterRemoteObj[] = JSON.parse(data)
                        const index: number = cacheData.findIndex((item) => item.name === value.name)
                        // 本地中存在插件组名称
                        if (index >= 0) {
                            cacheData[index].value = Array.from(new Set([...cacheData[index].value, ...checkList]))
                            nowData.current = cacheData
                            setRemoteValue(FILTER_CACHE_LIST_DATA, JSON.stringify(cacheData))
                        } else {
                            const newArr = [...cacheData, obj]
                            nowData.current = newArr
                            setRemoteValue(FILTER_CACHE_LIST_DATA, JSON.stringify(newArr))
                        }
                    } else {
                        nowData.current = [obj]
                        setRemoteValue(FILTER_CACHE_LIST_DATA, JSON.stringify([obj]))
                    }
                })
                .finally(() => {
                    // setReload(!reload)
                    setMenuList(nowData.current)
                    info("添加插件组成功")
                    onClose()
                })
        })
        return (
            <div>
                <Form {...layout} form={form} name='add-plug-in' onFinish={onFinish}>
                    <Form.Item
                        {...itemLayout}
                        name='name'
                        label='名称'
                        rules={[{required: true, message: "该项为必填"}]}
                    >
                        <AutoComplete
                            options={menuList.map((item) => ({value: item.name}))}
                            placeholder='请输入插件组名'
                            filterOption={(inputValue, option) =>
                                option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                            }
                        />
                    </Form.Item>
                    <Form.Item {...itemLayout} label='插件'>
                        <div style={{maxHeight: 460, overflow: "auto"}}>
                            {checkList.map((item) => (
                                <span style={{paddingRight: 12}} key={item}>
                                    {item};
                                </span>
                            ))}
                        </div>
                    </Form.Item>
                    <div style={{textAlign: "right"}}>
                        <Space>
                            <Button onClick={() => onClose()}>取消</Button>
                            <Button type='primary' htmlType='submit'>
                                添加
                            </Button>
                        </Space>
                    </div>
                </Form>
            </div>
        )
    }
    return (
        <div style={{minHeight: 47}}>
            <Input.Group compact>
                <Select
                    style={{width: "27%"}}
                    value={searchType}
                    size='small'
                    onSelect={(v) => {
                        if (v === "Keyword") {
                            setTag([])
                        }
                        v === "Tags" && setSearchKeyword("")
                        setSearchType(v)
                    }}
                >
                    <Select.Option value='Tags'>Tag</Select.Option>
                    <Select.Option value='Keyword'>关键字</Select.Option>
                </Select>
                {(searchType === "Tags" && (
                    <>
                        {/* 当有外部组件 与公共组件使用并存优先使用外部组件 */}
                        {commonTagsSelectRender || TagsSelectRender ? (
                            <div
                                style={{
                                    display: "inline-block",
                                    width: "73%",
                                    minHeight: "auto",
                                    height: 24,
                                    position: "relative",
                                    top: -4
                                }}
                            >
                                {TagsSelectRender ? (
                                    TagsSelectRender()
                                ) : (
                                    <YakFilterModuleSelect selectedTags={tag} setSelectedTags={setTag} />
                                )}
                            </div>
                        ) : (
                            <Select
                                mode='tags'
                                size='small'
                                onChange={(e) => {
                                    setTag(e as string[])
                                }}
                                placeholder='选择Tag'
                                style={{width: "73%"}}
                                loading={tagsLoading}
                                onBlur={() => {
                                    setRefresh(!refresh)
                                }}
                                onDeselect={onDeselect}
                                maxTagCount='responsive'
                                value={tag}
                                allowClear={true}
                            >
                                {tagsList.map((item) => (
                                    <Select.Option key={item.Value} value={item.Value}>
                                        <div className='mitm-card-select-option'>
                                            <span>{item.Value}</span>
                                            <span>{item.Total}</span>
                                        </div>
                                    </Select.Option>
                                ))}
                            </Select>
                        )}
                    </>
                )) || (
                    <Input.Search
                        onSearch={() => {
                            setRefresh(!refresh)
                        }}
                        placeholder='搜索插件'
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        size='small'
                        style={{width: "73%"}}
                    />
                )}
            </Input.Group>
            <div className='plug-in-menu-box'>
                <div className='check-box'>
                    <Checkbox onChange={(e) => onCheckAllChange(e.target.checked)} checked={checkAll}>
                        全选
                    </Checkbox>
                </div>
                <div style={{marginLeft: 12}}>
                    <Dropdown overlay={<Space direction={"vertical"}>{plugInMenu()}</Space>} disabled={checkAll}>
                        <a
                            onClick={(e) => {
                                e.preventDefault()
                                if (menuList.length === 0) {
                                    info("请先新建插件组")
                                }
                            }}
                        >
                            <Space>
                                插件组
                                <DownOutlined />
                            </Space>
                        </a>
                    </Dropdown>
                </div>
                <div
                    className='add-icon'
                    onClick={() => {
                        if (checkList.length === 0) {
                            info("选中数据未获取")
                            return
                        }
                        let m = showModal({
                            title: "添加插件组",
                            width: 520,
                            content: <AddPlugIn onClose={() => m.destroy()} />
                        })
                        return m
                    }}
                >
                    <PlusOutlined />
                </div>
                <div style={{marginLeft: 12}}>{settingRender && settingRender()}</div>
            </div>
            <div style={{whiteSpace: "initial"}}>
                {tag.map((i) => {
                    return (
                        <Tag
                            key={i}
                            style={{marginBottom: 2}}
                            color={"blue"}
                            onClose={() => {
                                let arr = tag.filter((element) => i !== element)
                                setTag(arr)
                            }}
                            closable={true}
                        >
                            {i}
                        </Tag>
                    )
                })}
            </div>
        </div>
    )
}
interface PluginUserInfoLocalProps {
    UserId: number
    HeadImg: string
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
    onSetUser?: (u: PluginUserInfoLocalProps) => any
    onlineProfile: string
}

export const PluginListLocalItem: React.FC<PluginListLocalProps> = (props) => {
    const {
        plugin,
        selectedRowKeysRecord,
        onSelect,
        setUpdatePluginRecordLocal,
        currentScript,
        onShare,
        onSetUser,
        onlineProfile
    } = props
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
    const isShowPrivateDom = plugin?.OnlineBaseUrl && plugin.OnlineBaseUrl !== onlineProfile ? false : true
    // console.log("私有域比较",plugin.OnlineBaseUrl,onlineProfile)
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
                            {plugin.OnlineId > 0 && !plugin.OnlineIsPrivate && isShowPrivateDom && <OnlineCloudIcon />}
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
                <div className='plugin-type-body'>
                    {PluginTypeText(plugin.Type)}
                    {plugin.Tags && plugin.Tags !== "null" && <div className='plugin-tag'>TAG:{plugin.Tags}</div>}
                </div>
                <div className='plugin-item-footer'>
                    <div
                        className='plugin-item-footer-left'
                        onClick={(e) => {
                            e.stopPropagation()
                        }}
                    >
                        {plugin.HeadImg && (
                            <img
                                alt=''
                                src={plugin.HeadImg}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    if (onSetUser)
                                        onSetUser({
                                            UserId: plugin.UserId,
                                            HeadImg: plugin.HeadImg || ""
                                        })
                                }}
                            />
                        )}
                        <div className='plugin-item-author content-ellipsis'>{plugin.Author || "anonymous"}</div>
                    </div>
                    <div className='plugin-item-time'>{formatDate(plugin.CreatedAt)}</div>
                </div>
            </div>
        </div>
    )
}
export const PluginType = {
    yak: "YAK 插件",
    mitm: "MITM 插件",
    "packet-hack": "数据包扫描",
    "port-scan": "端口扫描插件",
    codec: "CODEC插件",
    nuclei: "YAML POC"
}
const PluginTypeText = (type) => {
    switch (type) {
        case "yak":
            return <div className='plugin-type plugin-yak'>{PluginType[type]}</div>
        case "mitm":
            return <div className='plugin-type plugin-mitm'>{PluginType[type]}</div>
        case "packet-hack":
            return <div className='plugin-type plugin-packet-hack'>{PluginType[type]}</div>
        case "port-scan":
            return <div className='plugin-type plugin-port-scan'>{PluginType[type]}</div>
        case "codec":
            return <div className='plugin-type plugin-codec'>{PluginType[type]}</div>
        case "nuclei":
            return <div className='plugin-type plugin-nuclei'>{PluginType[type]}</div>
        default:
            break
    }
}

export const loadLocalYakitPluginCode = `yakit.AutoInitYakit()

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

export const loadNucleiPoCFromLocal = `yakit.AutoInitYakit();

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

export const loadYakitPluginCode = `yakit.AutoInitYakit()
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
        getLocalValue(YAKIT_DEFAULT_LOAD_LOCAL_PATH).then((e) => {
            if (e) {
                setLocalPath(e)
            }
        })
    }, [])

    useEffect(() => {
        getLocalValue(YAKIT_DEFAULT_LOAD_LOCAL_NUCLEI_POC_PATH).then((e) => {
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
        getLocalValue(YAKIT_DEFAULT_LOAD_GIT_PROXY).then((e) => {
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
                    setLocalValue(YAKIT_DEFAULT_LOAD_GIT_PROXY, proxy)
                }

                if (localPath !== "") {
                    setLocalValue(YAKIT_DEFAULT_LOAD_LOCAL_PATH, localPath)
                }

                if (localNucleiPath !== "") {
                    setLocalValue(YAKIT_DEFAULT_LOAD_LOCAL_NUCLEI_POC_PATH, localNucleiPath)
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
                <div style={{position: "relative"}}>
                    <InputItem
                        style={{width: "calc(100% - 20px)"}}
                        label={"本地仓库地址"}
                        value={localPath}
                        setValue={setLocalPath}
                        help={"本地仓库地址需设置在yak-projects项目文件下"}
                    />
                    <Tooltip title={"选择导入路径"}>
                        <CloudUploadOutlined
                            onClick={() => {
                                ipcRenderer
                                    .invoke("openDialog", {
                                        title: "请选择文件夹",
                                        properties: ["openDirectory"]
                                    })
                                    .then((data: any) => {
                                        if (data.filePaths.length) {
                                            let absolutePath = data.filePaths[0].replace(/\\/g, "\\")
                                            setLocalPath(absolutePath)
                                        }
                                    })
                            }}
                            style={{position: "absolute", right: 90, top: 8, cursor: "pointer"}}
                        />
                    </Tooltip>
                </div>
            )}
            {loadMode === "local-nuclei" && (
                <div style={{position: "relative"}}>
                    <InputItem
                        style={{width: "calc(100% - 20px)"}}
                        label={"Nuclei PoC 本地路径"}
                        value={localNucleiPath}
                        setValue={setLocalNucleiPath}
                    />
                    <Tooltip title={"选择导入路径"}>
                        <CloudUploadOutlined
                            onClick={() => {
                                ipcRenderer
                                    .invoke("openDialog", {
                                        title: "请选择文件夹",
                                        properties: ["openDirectory"]
                                    })
                                    .then((data: any) => {
                                        if (data.filePaths.length) {
                                            let absolutePath = data.filePaths[0].replace(/\\/g, "\\")
                                            setLocalNucleiPath(absolutePath)
                                        }
                                    })
                            }}
                            style={{position: "absolute", right: 90, top: 8, cursor: "pointer"}}
                        />
                    </Tooltip>
                </div>
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

export interface DownloadOnlinePluginAllResProps {
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

interface PluginGroupProps{
    size:"small" | "middle"
    selectedRowKeysRecordOnline:API.YakitPluginDetail[]
    isSelectAllOnline:boolean
    queryOnline:API.GetPluginWhere
}

interface PluginGroupPostProps{
    groupName:string[]
    pluginUuid?:string[]
    pluginWhere?:API.GetPluginWhere
}

export const PluginGroup: React.FC<PluginGroupProps> = (props) => {
    const {size,selectedRowKeysRecordOnline,isSelectAllOnline,queryOnline} = props
    const [_,setGroupName,getGroupName] = useGetState<string[]>([])
    const submit = () => {
        if(getGroupName().length===0){
            warn("请选择分组")
            return
        }
        let obj:PluginGroupPostProps = {
            groupName:[]
        }
        // 全选
        if(isSelectAllOnline){
            obj.groupName = [...getGroupName()]
            obj.pluginWhere = {...queryOnline,bind_me:false}
        }
        // 点击选择
        else{
            obj.groupName = [...getGroupName()]
            obj.pluginUuid=selectedRowKeysRecordOnline.map((item)=>item.uuid)
        }
        console.log("obj",obj)
        NetWorkApi<PluginGroupPostProps, API.ActionSucceeded>({
            method: "post",
            url: "yakit/plugin/group",
            data: obj
        })
            .then((res) => {
               console.log("jjj",res)
            })
            .catch((err) => {
                console.log("ee",err)
            })
    }

    const onChange = (checkedValues) => {
        console.log('checked = ', checkedValues,selectedRowKeysRecordOnline);
        setGroupName(checkedValues)
    }
    const typeList = ["基础扫描","深度扫描","弱口令","漏洞扫描","合规检测"]
    const menuData = [
        {
            title: "加入分组",
            number: 10,
            onClickBatch: () => {
                showModal({
                    width: "40%",
                    content: (
                        <div>
                            <div>加入分组</div>
                            <div style={{fontSize:12,color:"gray"}}>可选择加入多个分组</div>
                            <Checkbox.Group style={{ width: '100%' }} onChange={onChange}>
                                    <div style={{display:"flex",flexDirection:"row",marginTop:10}}>
                                        <div style={{paddingRight:16}}>扫描模式</div>
                                        <div style={{flex:1}}>
                                          <Row>
                                        <Col span={8}>
                                            <Checkbox value="基础扫描">基础扫描</Checkbox>
                                        </Col>
                                        <Col span={8}>
                                            <Checkbox value="深度扫描">深度扫描</Checkbox>
                                        </Col>
                                        </Row>  
                                        </div>
                                        
                                    </div>
                                    <div style={{display:"flex",flexDirection:"row",marginTop:10}}>
                            <div style={{paddingRight:16}}>功能类型</div>
                            <div style={{flex:1}}>
                                        <Row>
                                        <Col span={8}>
                                            <Checkbox value="弱口令">弱口令</Checkbox>
                                        </Col>
                                        <Col span={8}>
                                            <Checkbox value="漏洞扫描">漏洞扫描</Checkbox>
                                        </Col>
                                        <Col span={8}>
                                            <Checkbox value="合规检测">合规检测</Checkbox>
                                        </Col>
                                        </Row>
                                        </div>
                                    </div>
                                
                                
                            </Checkbox.Group>
                            <div style={{textAlign:"center",marginTop:10}}>
                                <Button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        submit()
                                    }}
                                    type="primary"
                                >
                                    加入
                                </Button>
                            </div>
                            
                        </div>
                    )
                })
            }
        },
        {
            title: "移出分组",
            number: 10,
            onClickBatch: () => {
                showModal({
                    width: "40%",
                    content: (
                        <div>
                            <div>移出分组</div>
                            <div style={{fontSize:12,color:"gray",marginBottom:10}}>选择要移出的分组，可多选</div>
                            {typeList.map((item)=><div style={{position:"relative",margin:"0 20px 10px 0",padding:"10px 20px",display:"inline-block",border:"1px solid rgba(0,0,0,.06)",borderRadius:"2px"}}>
                                {item}
                                <SelectIcon
                    //  @ts-ignore
                    className={`icon-select  ${
                        true && "icon-select-active"
                    }`}
                    onClick={(e) => {
                        e.stopPropagation()
                     
                    }}
                />
                            </div>)}

                            <div style={{textAlign:"center",marginTop:10}}>
                                <Button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                    }}
                                    type="primary"
                                >
                                    移出
                                </Button>
                            </div>
                        </div>
                    )
                })
            }
        },
    ]
    return(
        <div>
            {
                selectedRowKeysRecordOnline.length===0?<Button
                style={{margin:"0 12px 0 0"}}
                size='small'
                onClick={(e) => {
                    e.stopPropagation()
                }}
                disabled={true}
            >
                插件分组
                <ChevronDownIcon style={{color: "#85899E"}} />
            </Button>:
               <Popover
               overlayClassName={style["http-history-table-drop-down-popover"]}
               content={
                   <Menu className={style["http-history-table-drop-down-batch"]}>
                       {menuData.map((m) => {
                           return (
                               <Menu.Item
                                   onClick={() => {
                                       m.onClickBatch()
                                   }}
                                   key={m.title}
                               >
                                   {m.title}
                               </Menu.Item>
                           )
                       })}
                   </Menu>
               }
               trigger='click'
               placement='bottomLeft'
           >
               {size === "small" ? (
                   <SettingOutlined className='operation-icon' />
               ) : (
                   <Button
                       style={{margin:"0 12px 0 0"}}
                       size='small'
                       onClick={(e) => {
                           e.stopPropagation()
                       }}
                       
                   >
                       插件分组
                       <ChevronDownIcon style={{color: "#85899E"}} />
                   </Button>
               )}
           </Popover>
            }
                        </div>
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

export interface DownloadOnlinePluginByTokenRequest {
    isAddToken: boolean
    BindMe: boolean
    Keywords?: string
    PluginType?: string
    Status?: string
    IsPrivate?: string
    UserName?: string
    UserId?: number
    TimeSearch?: string
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
                    IsPrivate: query?.is_private,
                    UserId: query?.user_id,
                    UserName: query?.user_name,
                    TimeSearch: query?.time_search
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
    isShowFilter: boolean
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
        setStatisticsQueryUser,
        isShowFilter
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
        const newQuery = {
            ...queryUser,
            ...statisticsQueryUser
        }
        if (!statisticsQueryUser.tags) {
            delete newQuery.tags
        }
        setQueryUser(newQuery)
        onResetList()
    }, [statisticsQueryUser])
    useEffect(() => {
        if (!userInfo.isLogin) onSelectAllUser(false)
    }, [userInfo])
    useEffect(() => {
        if (
            !queryUser.is_private &&
            queryUser.order_by === "created_at" &&
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
                // onResetList()
            }
        },
        [publicKeyword],
        {wait: 50}
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
    const onGoRecycleBin = useMemoizedFn(() => {
        if (!userInfo.isLogin) {
            warn("请先登陆")
            return
        }
        ipcRenderer.invoke("send-to-tab", {
            type: "online-plugin-recycle-bin",
            data: {}
        })
    })
    return (
        <div className='height-100'>
            <Row className='row-body' gutter={12}>
                <Col span={16} className='col user-col'>
                    <Checkbox checked={isSelectAllUser} onChange={(e) => onSelectAllUser(e.target.checked)}>
                        全选
                    </Checkbox>
                    {selectedRowKeysRecordUser.length > 0 && (
                        <Tag color='blue'>已选{isSelectAllUser ? totalUser : selectedRowKeysRecordUser.length}条</Tag>
                    )}
                    <Tag>Total:{totalUser}</Tag>
                    <Divider type='vertical' />
                    <div className='recycle' onClick={onGoRecycleBin}>
                        <RecycleIcon />
                        <span>回收站</span>
                    </div>
                </Col>
                <Col span={8} className='col-flex-end'>
                    {isShowFilter && (
                        <PluginFilter
                            visibleQuery={visibleQuery}
                            setVisibleQuery={setVisibleQuery}
                            queryChildren={
                                <QueryComponentOnline
                                    onClose={() => setVisibleQuery(false)}
                                    userInfo={userInfo}
                                    queryOnline={queryUser}
                                    setQueryOnline={(e) => {
                                        setStatisticsQueryUser(e)
                                        // onResetList()
                                    }}
                                    user={true}
                                />
                            }
                            size={size}
                            isFilter={isFilter}
                        />
                    )}
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
                    setIsRequest={setListLoading}
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

interface PluginUserInfoOnlineProps {
    head_img: string
    user_id: number
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
    isShowFilter: boolean
    searchType: "userName" | "keyword"
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
        setStatisticsQueryOnline,
        isShowFilter,
        searchType
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
    const [userInfoOnline, setUserInfoOnline] = useState<PluginUserInfoOnlineProps>({
        head_img: "",
        user_id: 0
    })
    useEffect(() => {
        if (searchType === "keyword") {
            setQueryOnline({
                ...queryOnline,
                keywords: publicKeyword,
                user_name: ""
            })
        } else {
            setQueryOnline({
                ...queryOnline,
                keywords: "",
                user_name: publicKeyword
            })
        }
    }, [searchType, publicKeyword])
    useEffect(() => {
        const newQuery = {
            ...queryOnline,
            ...statisticsQueryOnline
        }
        if (!statisticsQueryOnline.tags) {
            delete newQuery.tags
        }
        if (statisticsQueryOnline.user_id === 0) {
            setUserInfoOnline({
                head_img: "",
                user_id: 0
            })
        }
        setQueryOnline(newQuery)
        onResetList()
    }, [statisticsQueryOnline])
    useEffect(() => {
        if (!userInfo.isLogin) onSelectAllOnline(false)
    }, [userInfo])
    useEffect(() => {
        if (
            !queryOnline.is_private &&
            queryOnline.order_by === "created_at" &&
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
    const onSetUser = useMemoizedFn((item: PluginUserInfoOnlineProps) => {
        setStatisticsQueryOnline({
            ...queryOnline,
            user_id: item.user_id
        })
        setUserInfoOnline(item)
        onSelectAllOnline(false)
        setTimeout(() => {
            setRefresh(!refresh)
        }, 100)
    })
    return (
        <div className='height-100'>
            <Row className='row-body' gutter={12}>
                <Col span={16} className='col'>
                    <Checkbox checked={isSelectAllOnline} onChange={(e) => onSelectAllOnline(e.target.checked)}>
                        全选
                    </Checkbox>
                    {selectedRowKeysRecordOnline.length > 0 && (
                        <Tag color='blue'>
                            已选{isSelectAllOnline ? totalUserOnline : selectedRowKeysRecordOnline.length}条
                        </Tag>
                    )}
                    <Tag>Total:{totalUserOnline}</Tag>
                    {userInfoOnline.head_img && (
                        <div className='plugin-headImg'>
                            <img alt='' src={userInfoOnline.head_img} />
                            <div
                                className='img-mask'
                                onClick={(e) => {
                                    e.stopPropagation()
                                    if (onSetUser)
                                        onSetUser({
                                            user_id: 0,
                                            head_img: ""
                                        })
                                }}
                            >
                                <CloseOutlined className='img-mask-icon' />
                            </div>
                        </div>
                    )}
                    {statisticsQueryOnline.time_search && statisticsQueryOnline.time_search?.length > 0 && (
                        <YakitTag
                            closable
                            color='blue'
                            onClose={() => {
                                setStatisticsQueryOnline({...statisticsQueryOnline, time_search: ""})
                            }}
                        >
                            {statisticsQueryOnline.time_search === "week" ? "本周新增" : "今日新增"}
                        </YakitTag>
                    )}
                </Col>
                <Col span={8} className='col-flex-end'>
                    {IsEnterprise&&<PluginGroup size={size} queryOnline={queryOnline} selectedRowKeysRecordOnline={selectedRowKeysRecordOnline} isSelectAllOnline={isSelectAllOnline}/>}
                    {isShowFilter && (
                        <PluginFilter
                            visibleQuery={visibleQuery}
                            setVisibleQuery={setVisibleQuery}
                            queryChildren={
                                <QueryComponentOnline
                                    onClose={() => setVisibleQuery(false)}
                                    userInfo={userInfo}
                                    queryOnline={queryOnline}
                                    setQueryOnline={(e) => {
                                        setStatisticsQueryOnline(e)
                                        // onResetList()
                                    }}
                                    user={false}
                                />
                            }
                            size={size}
                            isFilter={isFilter}
                        />
                    )}
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
                    setIsRequest={setListLoading}
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
                    onSetUser={onSetUser}
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
    renderRow?: (data: API.YakitPluginDetail, index: number) => ReactNode
    onSetUser?: (u: PluginUserInfoOnlineProps) => void
    setIsRequest?: (b: boolean) => void
}
interface OnlineProfileProps {
    BaseUrl: string
    Password?: string
}
export const YakModuleOnlineList: React.FC<YakModuleOnlineListProps> = (props) => {
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
        setIsSelectAll,
        renderRow,
        onSetUser,
        setIsRequest
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
    const [recalculation, setRecalculation] = useState(false)
    const [baseUrl, setBaseUrl] = useState<string>("")
    const numberOnlineUser = useRef(0) // 我的插件 选择的插件index
    const numberOnline = useRef(0) // 插件商店 选择的插件index
    // 获取私有域
    useEffect(() => {
        getRemoteValue("httpSetting").then((setting) => {
            const values = JSON.parse(setting)
            const baseUrl: string = values.BaseUrl
            setBaseUrl(baseUrl)
        })
    }, [])
    useEffect(() => {
        if (!updatePluginRecord) return
        const index = response.data.findIndex((ele) => ele.id === updatePluginRecord.id)
        if (index === -1) return
        response.data[index] = {...updatePluginRecord}
        setResponse({
            ...response,
            data: [...response.data]
        })
        setTimeout(() => {
            setRecalculation(!recalculation)
        }, 100)
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
        setTimeout(() => {
            setRecalculation(!recalculation)
        }, 100)
        onClicked()
    }, [deletePluginRecord?.id])
    useEffect(() => {
        if (isSelectAll) {
            onSelectList([...response.data])
        }
    }, [isSelectAll])
    useEffect(() => {
        const boolAdmin = ["admin", "superAdmin"].includes(userInfo.role || "")
        setIsAdmin(boolAdmin)
    }, [userInfo.role])
    useEffect(() => {
        setListBodyLoading(true)
        if (!userInfo.isLogin && (bind_me || queryOnline.recycle)) {
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
                bind_me: payload.bind_me,
                recycle: payload.recycle
            },
            data: payload
        })
            .then((res) => {
                if (!res.data) {
                    res.data = []
                }
                const data = page === 1 ? res.data : response.data.concat(res.data)
                const isMore = res.data.length < res.pagemeta.limit || data.length === response.pagemeta.total
                setHasMore(!isMore)
                if (payload.page > 1 && isSelectAll) {
                    onSelectList(data)
                }
                setResponse({
                    ...res,
                    data: [...data]
                })
                if (page === 1) {
                    setTotal(res.pagemeta.total)
                    setIsRef(!isRef)
                }
            })
            .catch((err) => {
                failed("插件列表获取失败:" + err)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                    setListBodyLoading(false)
                    if (setIsRequest) setIsRequest(false)
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
    if (!userInfo.isLogin && (bind_me || queryOnline.recycle)) {
        return (
            <List
                dataSource={[]}
                locale={{emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='未登录,请先登录' />}}
            />
        )
    }

    if (!userInfo.isLogin && IsEnterprise && !baseUrl.startsWith("https://www.yaklang.com")) {
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
                recalculation={recalculation}
                data={response.data}
                page={response.pagemeta.page}
                hasMore={hasMore}
                loading={loading}
                loadMoreData={() => loadMoreData()}
                rowKey='id'
                isGridLayout={size === "middle"}
                defItemHeight={170}
                classNameRow='plugin-list'
                classNameList='plugin-list-body'
                renderRow={(data: API.YakitPluginDetail, index: number) =>
                    (renderRow && renderRow(data, index)) || (
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
                            onSetUser={onSetUser}
                        />
                    )
                }
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
    onDownload?: (info: API.YakitPluginDetail, callback) => any
    onStarred?: (info: API.YakitPluginDetail) => any
    onSelect: (info: API.YakitPluginDetail) => any
    selectedRowKeysRecord: API.YakitPluginDetail[]
    bind_me: boolean
    extra?: ReactNode
    onSetUser?: (u: PluginUserInfoOnlineProps) => any
}

export const RandomTagColor: string[] = [
    "color-bgColor-orange",
    "color-bgColor-purple",
    "color-bgColor-blue",
    "color-bgColor-green",
    "color-bgColor-red"
]

export const PluginItemOnline: React.FC<PluginListOptProps> = (props) => {
    const [loading, setLoading] = useState<boolean>(false)
    const {
        isAdmin,
        info,
        onClick,
        onDownload,
        onStarred,
        onSelect,
        selectedRowKeysRecord,
        currentId,
        bind_me,
        extra,
        onSetUser
    } = props
    const tags: string[] = info.tags ? JSON.parse(info.tags) : []
    const [status, setStatus] = useState<number>(info.status)
    useEffect(() => {
        setStatus(info.status)
    }, [info.status, info.id])
    const add = useMemoizedFn(async () => {
        if (onDownload) {
            setLoading(true)
            onDownload(info, () => {
                setLoading(false)
            })
        }
    })
    // 全局登录状态
    const {userInfo} = useStore()
    const isShowAdmin =
        (isAdmin && !bind_me) || (bind_me && !info.is_private) || (userInfo.showStatusSearch && !bind_me)
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
                            {isShowAdmin && !info.is_private && (
                                <div
                                    className={`text-icon-admin ${
                                        TagColor[["not", "success", "failed"][status]].split("|")[0]
                                    } vertical-center`}
                                >
                                    {TagColor[["not", "success", "failed"][status]].split("|")[1]}
                                </div>
                            )}
                            {!bind_me && info.official && (
                                // @ts-ignore
                                <OfficialYakitLogoIcon className='text-icon-style' />
                            )}
                            {!bind_me && <>{info.is_private && <LockOutlined style={{paddingLeft: 5}} />}</>}
                            {bind_me && <>{(info.is_private && <LockOutlined />) || <OnlineCloudIcon />}</>}
                        </div>
                    </div>
                </div>
                <div className='plugin-item-right'>
                    {(extra && extra) || (
                        <>
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
                        </>
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
                <div className='plugin-type-body'>
                    {PluginTypeText(info.type)}
                    {tags && tags.length > 0 && (
                        <div className='plugin-tag' title={tagsString}>
                            TAG:{tagsString}
                        </div>
                    )}
                </div>

                <div className='plugin-item-footer'>
                    <div
                        className='plugin-item-footer-left'
                        onClick={(e) => {
                            e.stopPropagation()
                        }}
                    >
                        {info.head_img && (
                            <img
                                alt=''
                                src={info.head_img}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    if (onSetUser)
                                        onSetUser({
                                            user_id: info.user_id || 0,
                                            head_img: info.head_img
                                        })
                                }}
                            />
                        )}
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

const QueryComponentOnline: React.FC<QueryComponentOnlineProps> = (props) => {
    const {onClose, userInfo, queryOnline, setQueryOnline, user} = props
    const [isShowStatus, setIsShowStatus] = useState<boolean>(queryOnline.is_private === "true")
    const [isAdmin, setIsAdmin] = useState(["admin", "superAdmin"].includes(userInfo.role || ""))
    const [form] = Form.useForm()
    const refTest = useRef<any>()
    useEffect(() => {
        const boolAdmin = ["admin", "superAdmin"].includes(userInfo.role || "")
        setIsAdmin(boolAdmin)
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
            order_by: "created_at",
            plugin_type: defQueryOnline.plugin_type,
            status: "",
            is_private: ""
        })
        form.setFieldsValue({
            order_by: "created_at",
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
                            <Option value='created_at'>按时间</Option>
                            <Option value='stars'>按热度</Option>
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
                {((!user && isAdmin) || (user && isShowStatus) || (!user && userInfo.showStatusSearch)) && (
                    <Form.Item name='status' label='审核状态'>
                        <Select size='small' getPopupContainer={() => refTest.current}>
                            <Option value='all'>全部</Option>
                            {Object.keys(statusType).map((key) => (
                                <Option value={key} key={key}>
                                    {statusType[key]}
                                </Option>
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
