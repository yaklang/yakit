import React, {useEffect, useState, useRef, ReactNode} from "react"
import {
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
    Divider,
    Dropdown,
    AutoComplete
} from "antd"
import {
    ReloadOutlined,
    LoadingOutlined,
    FilterOutlined,
    FullscreenExitOutlined,
    FullscreenOutlined,
    LockOutlined,
    PlusOutlined,
    DeleteOutlined,
    DownloadOutlined,
    PoweroffOutlined,
    DownOutlined
} from "@ant-design/icons"
import {UserInfoProps, useStore, YakitStoreParams} from "@/store"
import {useGetState, useMemoizedFn, useDebounceEffect, useDebounce, useSize} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {randomString} from "@/utils/randomUtil"
import {findDOMNode} from "react-dom"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {setTimeout} from "timers"
import {isCommunityEdition, isEnpriTraceAgent, isEnterpriseEdition} from "@/utils/envfile"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {ItemSelects} from "@/components/baseTemplate/FormItemUtil"
import {OnlineCloudIcon, SelectIcon, RecycleIcon, OfficialYakitLogoIcon} from "@/assets/icons"
import {AutoCard} from "@/components/AutoCard"
import {QueryYakScriptRequest, YakScript} from "@/pages/invoker/schema"
import {YakFilterRemoteObj} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import {yakitNotify} from "@/utils/notification"
import {showModal} from "@/utils/showModal"
import {formatDate} from "@/utils/timeUtil"
import {PluginOperator} from "../PluginOperator"
import {DownloadOnlinePluginProps} from "../YakitPluginInfoOnline/YakitPluginInfoOnline"

import style from "@/components/HTTPFlowTable/HTTPFlowTable.module.scss"
import "../YakitStorePage.scss"

const {Search} = Input
const {Option} = Select
const {ipcRenderer} = window.require("electron")

interface PluginOwnerProp {}

interface GetYakScriptByOnlineIDRequest {
    OnlineID?: number
    UUID: string
}

interface SearchPluginOnlineRequest extends API.GetPluginWhere {
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

interface PluginSearchStatisticsRequest {
    bind_me: boolean
}

const typeOnline = "yak,mitm,packet-hack,port-scan,codec,nuclei"
const defQueryOnline: SearchPluginOnlineRequest = {
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
    status: "审核状态",
    group: "插件分组"
}

export const PluginOwner: React.FC<PluginOwnerProp> = (props) => {
    const [script, setScript] = useState<YakScript>()
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        setLoading(true)
        setTimeout(() => {
            setLoading(false)
        }, 200)
    }, [script])

    // 是否第一次使用yakit  第一次使用默认展示线上，后面默认展示本地
    const [plugSource, setPlugSource] = useState<string>("user")
    const [listLoading, setListLoading] = useState<boolean>(false)
    const [plugin, setPlugin] = useState<API.YakitPluginDetail>()
    const [userPlugin, setUserPlugin] = useState<API.YakitPluginDetail>()
    const [fullScreen, setFullScreen] = useState<boolean>(false)
    const [isRefList, setIsRefList] = useState(false)

    // 监听是否点击编辑插件 用于控制插件仓库是否刷新
    const [isEdit, setMonitorEdit] = useState<boolean>(false)
    // 全局登录状态
    const {userInfo} = useStore()
    // 插件仓库参数及页面状态
    const {storeParams, setYakitStoreParams} = YakitStoreParams()

    const [publicKeyword, setPublicKeyword] = useState<string>(storeParams.keywords)

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
    // 删除
    const [deletePluginRecordUser, setDeletePluginRecordUser] = useState<API.YakitPluginDetail>()
    const [deletePluginRecordLocal, setDeletePluginRecordLocal] = useState<YakScript>()
    // 修改
    const [updatePluginRecordUser, setUpdatePluginRecordUser] = useState<API.YakitPluginDetail>()
    const [updatePluginRecordLocal, setUpdatePluginRecordLocal] = useState<YakScript>()
    // 线上插件id
    const [scriptIdOnlineId, setScriptIdOnlineId] = useState<number>()
    // 线上插件UUid
    const [scriptUUIdOnlineUUId, setScriptUUIdOnlineUUId] = useState<string>()

    //滚动
    const [numberLocal, setNumberLocal] = useState<number>()
    const [numberOnline, setNumberOnline] = useState<number>()
    const [numberUser, setNumberUser] = useState<number>()
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
                yakitNotify("error", "线上统计数据获取失败:" + err)
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
                yakitNotify("error", `获取本地插件统计数据展示错误:${e}`)
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
        if (plugSource === "user") {
            onSearchUser(queryName, value)
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
                                <div className='header-title'>我的插件</div>
                                <Button size={isFull ? "middle" : "small"} type={"link"} onClick={onRefList}>
                                    <ReloadOutlined style={{fontSize: isFull ? 16 : 14}} />
                                </Button>
                            </Col>
                            <Col span={12}>
                                <Input.Group className='search-input-body'>
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
                                    yakScriptName={(script && script.ScriptName) || ""}
                                    yakScriptIdOnlineId={scriptIdOnlineId}
                                    yakScriptUUIdOnlineUUId={scriptUUIdOnlineUUId}
                                    setTrigger={() => {}}
                                    setScript={(s) => {
                                        setScript(s)
                                        setUpdatePluginRecordLocal(s)
                                    }}
                                    deletePluginLocal={setDeletePluginRecordLocal}
                                    deletePluginOnline={(p: API.YakitPluginDetail) => {
                                        if (plugSource === "user" && userPlugin) {
                                            setDeletePluginRecordUser(p)
                                        }
                                    }}
                                    updatePluginOnline={(p: API.YakitPluginDetail) => {
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
                                        if (!isEnpriTraceAgent() && queryName === "group") {
                                            return null
                                        }

                                        const statisticsList =
                                            queryName === "group" && Array.isArray(item[1])
                                                ? item[1].map((item) => ({
                                                      ...item,
                                                      value: item.value.replaceAll('"', "")
                                                  }))
                                                : item[1]

                                        const title = queryTitle[queryName]
                                        let current: string | string[] = ""
                                        if (plugSource === "user") {
                                            current = statisticsQueryUser[queryName] || ""
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
                                        if (isCommunityEdition() && (UserIsPrivate || OnlineAdmin)) return null
                                        if (isEnterpriseEdition() && (UserIsPrivate || OnlineStatusSearch)) return null

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

interface YakFilterModuleSelectProps {
    selectedTags: string[]
    setSelectedTags: (v: string[]) => void
}

interface TagValue {
    Name: string
    Total: number
}

// 封装动态select筛选组件
const YakFilterModuleSelect: React.FC<YakFilterModuleSelectProps> = (props) => {
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

interface YakFilterModuleList {
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

const YakFilterModuleList: React.FC<YakFilterModuleList> = (props) => {
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
                    yakitNotify("info", "添加插件组成功")
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
                                    yakitNotify("info", "请先新建插件组")
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
                            yakitNotify("info", "选中数据未获取")
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

const PluginType = {
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

interface DownloadOnlinePluginAllResProps {
    Progress: number
    Log: string
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
    UserName?: string
    UserId?: number
    TimeSearch?: string
    Group?: string
    Tags?: string
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
        ipcRenderer.on(`${taskToken}-error`, (_, e) => {
            yakitNotify("error", "插件下载失败:" + e)
        })
        return () => {
            ipcRenderer.removeAllListeners(`${taskToken}-data`)
            ipcRenderer.removeAllListeners(`${taskToken}-error`)
            ipcRenderer.removeAllListeners(`${taskToken}-end`)
        }
    }, [taskToken])
    const AddAllPlugin = useMemoizedFn(() => {
        if (user && !userInfo.isLogin) {
            yakitNotify("warning", "我的插件需要先登录才能下载，请先登录")
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
                    TimeSearch: query?.time_search,
                    Group: query?.group,
                    Tags: query?.tags
                }
            }

            ipcRenderer
                .invoke("DownloadOnlinePluginAll", addParams, taskToken)
                .then(() => {})
                .catch((e) => {
                    yakitNotify("error", `添加失败:${e}`)
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
                    yakitNotify("success", `共添加${selectedRowKeysRecord.length}条数据到本地`)
                    onFinish()
                })
                .catch((e) => {
                    yakitNotify("error", `添加失败:${e}`)
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
            yakitNotify("error", `停止添加失败:${e}`)
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
                            {/* <div className='operation-text'>一键导入</div> */}
                            {(size === "small" && <></>) || (
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

interface StarsOperation {
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

const YakModuleUser: React.FC<YakModuleUserProps> = (props) => {
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
            yakitNotify("warning", "请先登陆")
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
                yakitNotify("error", "插件列表获取失败:" + err)
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
                yakitNotify("success", "添加成功")
                ipcRenderer.invoke("change-main-menu")
            })
            .catch((e) => {
                yakitNotify("error", `添加失败:${e}`)
            })
            .finally(() => {
                if (callback) callback()
            })
    })
    const starredPlugin = useMemoizedFn((info: API.YakitPluginDetail) => {
        if (!userInfo.isLogin) {
            yakitNotify("warning", "请先登录")
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
                yakitNotify("error", "点星:" + err)
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

    if (!userInfo.isLogin && isEnterpriseEdition() && !baseUrl.startsWith("https://www.yaklang.com")) {
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

const TagColor: {[key: string]: string} = {
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

const PluginItemOnline: React.FC<PluginListOptProps> = (props) => {
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
