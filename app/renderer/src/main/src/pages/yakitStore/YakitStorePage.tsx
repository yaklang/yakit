import React, {useEffect, useState, useRef, ReactNode, useMemo} from "react"
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
import {genDefaultPagination, GroupCount, QueryYakScriptRequest, QueryYakScriptsResponse, YakScript} from "../invoker/schema"
import {failed, success, warn, info, yakitFailed} from "../../utils/notification"
import {CopyableField, InputItem, ManySelectOne, SelectOne} from "../../utils/inputUtil"
import {formatDate} from "../../utils/timeUtil"
import {PluginOperator} from "./PluginOperator"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {AutoCard} from "../../components/AutoCard"
import {UserInfoProps, useStore} from "@/store"
import "./YakitStorePage.scss"
import {getLocalValue, setLocalValue} from "../../utils/kv"
import {useCreation, useDebounceFn, useGetState, useMemoizedFn, useDebounceEffect, useDebounce, useSize} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {DownloadOnlinePluginProps} from "./YakitPluginInfoOnline/YakitPluginInfoOnline"
import {randomString} from "@/utils/randomUtil"
import {OfficialYakitLogoIcon, SelectIcon, OnlineCloudIcon, ImportIcon, RecycleIcon} from "../../assets/icons"
import {findDOMNode} from "react-dom"
import {YakExecutorParam} from "../invoker/YakExecutorParams"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {setTimeout} from "timers"
import {
    ModalSyncSelect,
    onLocalScriptToOnlinePlugin,
    SyncCloudButton,
    SyncCloudProgress
} from "@/components/SyncCloudButton/SyncCloudButton"
import {isCommunityEdition, isEnpriTraceAgent, isEnterpriseEdition} from "@/utils/envfile"
import {fullscreen} from "@uiw/react-md-editor"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {ItemSelects} from "@/components/baseTemplate/FormItemUtil"
import {ChevronDownIcon, ShareIcon} from "@/assets/newIcon"
import style from "@/components/HTTPFlowTable/HTTPFlowTable.module.scss"
import {YakFilterRemoteObj} from "../mitm/MITMServerHijacking/MITMPluginLocalList"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import { PluginGV } from "../plugins/builtInData"
import { YakitRoute } from "@/routes/newRoute"
import emiter from "@/utils/eventBus/eventBus"
import { apiFetchQueryYakScriptGroupLocal } from "../plugins/utils"

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
    status: "审核状态",
    group: "插件分组"
}

interface DeleteAllLocalPluginsRequest {
    Keywords?: string
    Type?: string
    UserId?: number
    UserName?: string
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
    targetRef?: React.RefObject<any>
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
        emptyNode,
        targetRef
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
                    targetRef={targetRef}
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
        // 获取插件组
        apiFetchQueryYakScriptGroupLocal(false).then((group: GroupCount[]) => {
            const copyGroup = structuredClone(group)
            const data: YakFilterRemoteObj[] = copyGroup.map((item) => ({
                name: item.Value,
                total: item.Total,
            }))
            setMenuList(data)
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

    const plugInMenu = () => {
        return menuList.map((item: YakFilterRemoteObj) => (
            <div key={item.name} style={{display: "flex"}} onClick={() => menuClick([item.name])}>
                <div className='content-ellipsis' style={{width: 100}}>
                    {item.name}
                </div>
                <div style={{width: 10, margin: "0px 10px"}}>{item.total}</div>
            </div>
        ))
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
                {/* <div style={{marginLeft: 12}}>
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
                <YakitButton
                    type='text'
                    onClick={() => {
                        emiter.emit("menuOpenPage", JSON.stringify({route: YakitRoute.Plugin_Groups}))
                    }}
                >
                    管理分组
                </YakitButton> */}
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
            yakitFailed('插件下载失败:'+e)
        })
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
                    TimeSearch: query?.time_search,
                    Group: query?.group,
                    Tags: query?.tags
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
    onRefList: () => void
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
        searchType,
        onRefList
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

    /**
     * plugin-store batch del related logic
     */
    const isShowDelBtn = useMemo(() => {
        if (["admin", "superAdmin"].includes(userInfo.role || "")) return true
        if (userInfo.checkPlugin) return true
        return false
    }, [userInfo])
    const delDisabled = useMemo(() => {
        if (isSelectAllOnline) return false
        if (selectedRowKeysRecordOnline.length > 0) return false
        return true
    }, [isSelectAllOnline, selectedRowKeysRecordOnline])
    const [batchDelShow, setBatchDelShow] = useState<boolean>(false)
    const onBatchDel = useMemoizedFn((isDel: boolean) => {
        let params: API.GetPluginWhere = {bind_me: false, recycle: false}

        if (isSelectAllOnline) {
            params = {...params, ...queryOnline, delete_dump: isDel}
            NetWorkApi<API.GetPluginWhere, API.ActionSucceeded>({
                method: "delete",
                url: "yakit/plugin",
                data: params
            })
                .then((res) => {
                    onResetList()
                })
                .catch((err) => {
                    failed("删除失败:" + err)
                })
                .finally(() => {
                    setBatchDelShow(false)
                })
        } else {
            if (selectedRowKeysRecordOnline.length > 0) {
                params = {
                    ...params,
                    delete_uuid: selectedRowKeysRecordOnline.map((item) => item.uuid),
                    delete_dump: isDel
                }

                NetWorkApi<API.GetPluginWhere, API.ActionSucceeded>({
                    method: "delete",
                    url: "yakit/plugin",
                    data: params
                })
                    .then((res) => {
                        onResetList()
                    })
                    .catch((err) => {
                        failed("删除失败:" + err)
                    })
                    .finally(() => {
                        setBatchDelShow(false)
                    })
            }
        }
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
                    {isShowDelBtn && (
                        <YakitButton colors="danger" disabled={delDisabled} onClick={() => setBatchDelShow(true)}>
                            删除
                        </YakitButton>
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
            <YakitHint
                visible={batchDelShow}
                title='删除插件'
                content={
                    <>
                        {`是否需要彻底删除插件,彻底删除后将`}
                        <span style={{color: "var(--yakit-danger-5)"}}>无法恢复</span>
                    </>
                }
                okButtonText='放入回收站'
                cancelButtonText='删除'
                footerExtra={
                    <YakitButton size='max' type='outline2' onClick={() => setBatchDelShow(false)}>
                        取消
                    </YakitButton>
                }
                onOk={() => onBatchDel(false)}
                onCancel={() => onBatchDel(true)}
            />
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
        (isAdmin && !bind_me) || (bind_me && !info.is_private) || (userInfo.checkPlugin && !bind_me)
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
                {((!user && isAdmin) || (user && isShowStatus) || (!user && userInfo.checkPlugin)) && (
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

const adminUpOnline = async (params: YakScript, type: number, baseUrl: string, userInfo) => {
    const onlineParams: API.NewYakitPlugin = onLocalScriptToOnlinePlugin(params, type)
    if (isEnterpriseEdition() && userInfo.role === "admin" && params.OnlineBaseUrl === baseUrl) {
        onlineParams.id = parseInt(`${params.OnlineId}`)
    }
    if(isEnterpriseEdition()&&params.OnlineGroup){
        onlineParams.group = params.OnlineGroup
    }
    if (isCommunityEdition() && params.OnlineId) {
        onlineParams.id = parseInt(`${params.OnlineId}`)
    }
    return new Promise((resolve) => {
        NetWorkApi<API.NewYakitPlugin, API.YakitPluginResponse>({
            method: "post",
            url:"yakit/plugin",
            data: onlineParams
        })
            .then((res) => {
                resolve(false)
                // 上传后，先下载最新的然后删除本地旧的
                // ipcRenderer
                //     .invoke("DownloadOnlinePluginById", {
                //         OnlineID: res.id,
                //         UUID: res.uuid
                //     } as DownloadOnlinePluginProps)
                //     .then((res) => {
                //         ipcRenderer
                //             .invoke("delete-yak-script", params.Id)
                //             .then(() => {})
                //             .catch((err) => {
                //                 failed("删除本地【" + params.ScriptName + "】失败:" + err)
                //             })
                //     })
            })
            .catch((err) => {
                const errObj = {
                    script_name: params.ScriptName,
                    err
                }
                resolve(errObj)
            })
    })
}
