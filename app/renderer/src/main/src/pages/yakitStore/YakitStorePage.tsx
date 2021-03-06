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
    LockOutlined,
    PlusOutlined,
    DeleteOutlined,
    CloudDownloadOutlined,
    DownloadOutlined
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
import {DownloadOnlinePluginProps} from "../yakitStore/YakitPluginInfoOnline"
import {randomString} from "@/utils/randomUtil"
import {OfficialYakitLogoIcon, SelectIcon, OnlineCloudIcon, ImportIcon} from "../../assets/icons"
import {YakitPluginInfoOnline} from "./YakitPluginInfoOnline/index"
import moment from "moment"
import {findDOMNode} from "react-dom"
import {YakExecutorParam} from "../invoker/YakExecutorParams"
import {RollingLoadList} from "@/components/RollingLoadList"
import {setTimeout} from "timers"
import {SyncCloudButton} from "@/components/SyncCloudButton/index"

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
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        setLoading(true)
        setTimeout(() => {
            setLoading(false)
        }, 200)
    }, [script])

    // ?????????????????????yakit  ????????????????????????????????????????????????????????????
    const [plugSource, setPlugSource] = useState<string>("local")
    const [listLoading, setListLoading] = useState<boolean>(false)
    const [plugin, setPlugin] = useState<API.YakitPluginDetail>()
    const [userPlugin, setUserPlugin] = useState<API.YakitPluginDetail>()
    const [fullScreen, setFullScreen] = useState<boolean>(false)
    const [isRefList, setIsRefList] = useState(false)

    // ??????????????????
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
        },
        {wait: 200}
    ).run
    const onResetQuery = useMemoizedFn(() => {
        // ??????????????????
        setPublicKeyword("")
    })
    const onResetPluginDetails = useMemoizedFn(() => {
        // ????????????
        setScript(undefined)
        setUserPlugin(undefined)
        setPlugin(undefined)
    })
    const onResetPluginDelecteAndUpdate = useMemoizedFn(() => {
        // ????????????
        setDeletePluginRecordUser(undefined)
        setDeletePluginRecordOnline(undefined)
        setDeletePluginRecordLocal(undefined)
        // ????????????
        setUpdatePluginRecordUser(undefined)
        setUpdatePluginRecordOnline(undefined)
    })
    // ??????
    const [deletePluginRecordUser, setDeletePluginRecordUser] = useState<API.YakitPluginDetail>()
    const [deletePluginRecordOnline, setDeletePluginRecordOnline] = useState<API.YakitPluginDetail>()
    const [deletePluginRecordLocal, setDeletePluginRecordLocal] = useState<YakScript>()
    // ??????
    const [updatePluginRecordUser, setUpdatePluginRecordUser] = useState<API.YakitPluginDetail>()
    const [updatePluginRecordOnline, setUpdatePluginRecordOnline] = useState<API.YakitPluginDetail>()
    const [updatePluginRecordLocal, setUpdatePluginRecordLocal] = useState<YakScript>()
    // ????????????id
    const [scriptIdOnlineId, setScriptIdOnlineId] = useState<number>()
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
                // ??????????????????????????????
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
                // ??????????????????????????????
                setScript(undefined)
            })
            .finally(() => {
                setUserPlugin(p)
                setScriptIdOnlineId(p.id)
            })
    })
    return (
        <div style={{height: "100%", display: "flex", flexDirection: "row"}}>
            <Card
                bodyStyle={{padding: 0, height: "calc(100% - 42px)"}}
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
                                    <Radio.Button value='online'>????????????</Radio.Button>
                                    <Radio.Button value='user'>????????????</Radio.Button>
                                    <Radio.Button value='local'>??????</Radio.Button>
                                </Radio.Group>
                                <Button size={"small"} type={"link"} onClick={onRefList}>
                                    <ReloadOutlined />
                                </Button>
                            </Col>
                            <Col span={12} className='flex-align-center'>
                                ?????????
                                <Search
                                    placeholder='?????????????????????'
                                    size='small'
                                    onSearch={() => setIsRefList(!isRefList)}
                                    value={publicKeyword}
                                    onChange={(e) => {
                                        setPublicKeyword(e.target.value)
                                        // setIsRefList(!isRefList)
                                    }}
                                />
                            </Col>
                        </Row>
                    </div>
                }
                size={"small"}
                className='left-list'
            >
                <Spin spinning={listLoading}>
                    {plugSource === "local" && (
                        <YakModule
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

            <div style={{flex: 1, overflowY: "auto"}} id='plugin-info-scroll'>
                {plugin || script || userPlugin ? (
                    <AutoCard
                        loading={loading}
                        title={
                            <Space>
                                <div>Yak[{script?.Type}] ????????????</div>
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

                        {/* {plugSource === "local" && script && (
                            <PluginOperator
                                yakScriptId={script.Id}
                                setTrigger={() => { }}
                                setScript={(s) => {
                                    setScript(s)
                                    setUpdatePluginRecordLocal(s)
                                }}
                                deletePluginLocal={setDeletePluginRecordLocal}
                            />
                        )}
                        {plugSource === "online" && plugin && (
                            <YakitPluginInfoOnline
                                pluginId={plugin.id}
                                deletePlugin={setDeletePluginRecordOnline}
                                updatePlugin={setUpdatePluginRecordOnline}
                            />
                        )}
                        {plugSource === "user" && userPlugin && (
                            <YakitPluginInfoOnline
                                pluginId={userPlugin.id}
                                user={true}
                                deletePlugin={setDeletePluginRecordUser}
                                updatePlugin={setUpdatePluginRecordUser}
                            />
                        )} */}
                    </AutoCard>
                ) : (
                    <Empty style={{marginTop: 100}}>?????????????????????????????????</Empty>
                )}
            </div>
        </div>
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
}
const YakModule: React.FC<YakModuleProp> = (props) => {
    const {
        script,
        setScript,
        publicKeyword,
        isRefList,
        deletePluginRecordLocal,
        updatePluginRecordLocal,
        setUpdatePluginRecordLocal
    } = props
    const [totalLocal, setTotalLocal] = useState<number>(0)
    const [queryLocal, setQueryLocal] = useState<QueryYakScriptRequest>({
        ...defQueryLocal
    })
    const [refresh, setRefresh] = useState(false)
    const [isSelectAllLocal, setIsSelectAllLocal] = useState<boolean>(false)
    const [selectedRowKeysRecordLocal, setSelectedRowKeysRecordLocal] = useState<YakScript[]>([])
    const [visibleQuery, setVisibleQuery] = useState<boolean>(false)
    const [isFilter, setIsFilter] = useState(false)
    const [isShowYAMLPOC, setIsShowYAMLPOC] = useState(false)
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
            // ???????????????
            onResetList()
            setScript()
        }
    }, [isRefList])
    const onRemoveLocalPlugin = useMemoizedFn(() => {
        const length = selectedRowKeysRecordLocal.length
        if (length === 0) {
            // ????????????
            ipcRenderer
                .invoke("DeleteAllLocalPlugins", {})
                .then(() => {
                    setRefresh(!refresh)
                    setScript(undefined)
                    ipcRenderer.invoke("change-main-menu")
                    success("??????????????????")
                })
                .catch((e) => {
                    failed(`??????????????????????????????:${e}`)
                })
        } else {
            // ????????????
            ipcRenderer
                .invoke("DeleteYakScript", {
                    Ids: selectedRowKeysRecordLocal.map((ele) => ele.Id)
                })
                .then(() => {
                    setRefresh(!refresh)
                    setScript(undefined)
                    ipcRenderer.invoke("change-main-menu")
                    success(`????????????${length}?????????`)
                })
                .catch((e) => {
                    failed(`??????????????????????????????:${e}`)
                })
        }
    })
    const onSelectAllLocal = useMemoizedFn((checked) => {
        setIsSelectAllLocal(checked)
        if (!checked) {
            setSelectedRowKeysRecordLocal([]) // ????????????
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
    return (
        <div className='height-100'>
            <Row className='row-body' gutter={12}>
                <Col span={20} className='col'>
                    <Checkbox checked={isSelectAllLocal} onChange={(e) => onSelectAllLocal(e.target.checked)}>
                        ??????
                    </Checkbox>
                    {selectedRowKeysRecordLocal.length > 0 && (
                        <Tag color='blue'>??????{selectedRowKeysRecordLocal.length}???</Tag>
                    )}
                    <Tag>Total:{totalLocal}</Tag>
                    <div className='flex-align-center'>
                        <Switch size='small' onChange={onChangeSwitch} checked={isShowYAMLPOC} />
                        <span>&nbsp;&nbsp;??????YAML POC</span>
                    </div>
                </Col>
                <Col span={4} className='col-flex-end'>
                    <Popconfirm
                        title={
                            visibleQuery && (
                                <QueryComponentLocal
                                    onClose={() => setVisibleQuery(false)}
                                    queryLocal={queryLocal}
                                    setQueryLocal={(e) => {
                                        setQueryLocal(e)
                                        onResetList()
                                    }}
                                />
                            )
                        }
                        placement='bottomLeft'
                        icon={null}
                        overlayClassName='pop-confirm'
                        visible={visibleQuery}
                    >
                        <Tooltip title='??????'>
                            <FilterOutlined
                                className={`operation-icon ${isFilter && "operation-icon-active"}`}
                                onClick={() => setVisibleQuery(true)}
                            />
                        </Tooltip>
                    </Popconfirm>
                    <Popconfirm
                        title={selectedRowKeysRecordLocal.length === 0 ? "???????????????????????????????" : "?????????????????????????"}
                        onConfirm={() => onRemoveLocalPlugin()}
                    >
                        <Tooltip title='??????'>
                            <DeleteOutlined className='delete-icon' />
                        </Tooltip>
                    </Popconfirm>
                    <Tooltip title='??????'>
                        <PlusOutlined
                            className='operation-icon'
                            onClick={() => {
                                let m = showDrawer({
                                    title: "???????????????",
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
                        />
                    </Tooltip>
                    <Tooltip title='??????'>
                        <CloudDownloadOutlined
                            //  @ts-ignore
                            className='operation-icon'
                            onClick={() => {
                                let m = showModal({
                                    width: 800,
                                    title: "??????????????????",
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
                            }}
                        />
                    </Tooltip>
                </Col>
            </Row>
            <div style={{height: "calc(100% - 32px)"}}>
                <YakModuleList
                    itemHeight={128}
                    currentScript={script}
                    onClicked={(info, index) => {
                        if (info?.Id === script?.Id) return
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
    itemHeight?: number
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
        updatePluginRecordLocal,
        isSelectAll,
        selectedRowKeysRecord,
        onSelectList,
        setUpdatePluginRecordLocal
    } = props
    // ??????????????????
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
    const numberLocal = useRef<number>(0) // ?????? ???????????????index
    useEffect(() => {
        if (isSelectAll) {
            if (onSelectList) onSelectList(response.Data)
        }
    }, [isSelectAll])
    useEffect(() => {
        if (!updatePluginRecordLocal) return
        // ?????????????????????????????????,????????????????????????OnlineId ,???????????????????????????????????????OnlineId
        // ?????????????????????Id??????????????????Id?????????
        // ???????????????ScriptName???????????? ,ScriptName?????????????????????????????????
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
                        currentScript={props.currentScript}
                        onYakScriptRender={props.onYakScriptRender}
                        maxWidth={maxWidth}
                        selectedRowKeysRecord={selectedRowKeysRecord || []}
                        onSelect={onSelect}
                        setUpdatePluginRecordLocal={(s) => {
                            if (setUpdatePluginRecordLocal) setUpdatePluginRecordLocal(s)
                        }}
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
    selectedRowKeysRecord: YakScript[]
    setUpdatePluginRecordLocal: (y: YakScript) => any
}
export const PluginListLocalItem: React.FC<PluginListLocalProps> = (props) => {
    const {plugin, selectedRowKeysRecord, onSelect, setUpdatePluginRecordLocal, currentScript} = props
    const {userInfo, maxWidth, onClicked} = props
    const [uploadLoading, setUploadLoading] = useState(false)
    const updateListItem = useMemoizedFn((updatePlugin: YakScript) => {
        setUpdatePluginRecordLocal(updatePlugin)
        if (!currentScript) return
        // ????????????OnlineId???0,??????Id?????????,????????? ScriptName  ????????????
        if ((updatePlugin.OnlineId as number) > 0 && currentScript.ScriptName === updatePlugin.ScriptName) {
            onClicked(updatePlugin)
        }
    })
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
                        <span className='text-style content-ellipsis'>{plugin.ScriptName}</span>
                    </Tooltip>

                    <div className='text-icon-local'>
                        {plugin.OnlineId > 0 && !plugin.OnlineIsPrivate && (
                            <Tooltip title='?????????????????????'>
                                <OnlineCloudIcon />
                            </Tooltip>
                        )}
                        {plugin.OnlineId > 0 && plugin.OnlineIsPrivate && (
                            <Tooltip title='?????????????????????'>
                                <LockOutlined />
                            </Tooltip>
                        )}
                        {gitUrlIcon(plugin.FromGit)}
                    </div>
                </div>
            }
            extra={
                (uploadLoading && <LoadingOutlined className='upload-outline' />) || (
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
                )
            }
            style={{
                width: "100%",
                marginBottom: 12,
                backgroundColor: currentScript?.Id === plugin.Id ? "rgba(79,188,255,0.26)" : "#fff"
            }}
            onClick={() => props.onClicked(plugin)}
        >
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
    yakit.Error("????????????????????????")
    return
}

err = yakit.UpdateYakitStoreLocal(localPath)
if err != nil {
    yakit.Error("???????????????????????????%v", err)
    die(err)
}

yakit.Output("????????????????????????")
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
yakit.Info("preparing for loading yak plugins???%v", gitUrl)
yakit.Info("preparing for loading nuclei-templates pocs???%v", nucleiGitUrl)

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
                    startExecYakCode("?????? Yak ??????", {
                        Script: loadYakitPluginCode,
                        Params: params
                    })
                }
                if (loadMode === "local") {
                    startExecYakCode("?????? Yak ??????????????????", {
                        Script: loadLocalYakitPluginCode,
                        Params: [{Key: "local-path", Value: localPath}]
                    })
                }

                if (loadMode === "local-nuclei") {
                    startExecYakCode("??? Nuclei Template Git ??????????????????", {
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
                            success("??????????????????")
                        })
                        .catch((e: any) => {
                            failed(`??????????????????: ${e}`)
                        })
                }
            }}
        >
            <SelectOne
                label={" "}
                colon={false}
                data={[
                    {text: "???????????????", value: "official"},
                    {text: "??????????????????", value: "giturl"},
                    {text: "????????????", value: "local"},
                    {text: "?????? Yaml PoC", value: "local-nuclei"},
                    {text: "??????ID", value: "uploadId"}
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
                                        ???????????????????????????????????? Github?????????????????????????????????????????? Gitee ??????
                                        ghproxy.com ??????
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
                        help={"?????? https://github.com/yaklang/yakit-store"}
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
                        help={"nuclei templates ???????????????"}
                    />
                    <InputItem
                        label={"??????"}
                        value={proxy}
                        setValue={setProxy}
                        help={"??????????????????????????????????????????????????????????????????" + "http://127.0.0.1:7890"}
                    />
                    {proxy === "" && loadMode === "giturl" && (
                        <Form.Item label={" "} colon={false}>
                            <Alert
                                type={"warning"}
                                message={<div>??????????????????????????? ghproxy.com / gitee ?????????</div>}
                            />
                        </Form.Item>
                    )}
                </>
            )}
            {loadMode === "local" && (
                <>
                    <InputItem label={"??????????????????"} value={localPath} setValue={setLocalPath} />
                </>
            )}
            {loadMode === "local-nuclei" && (
                <>
                    <InputItem label={"Nuclei PoC ????????????"} value={localNucleiPath} setValue={setLocalNucleiPath} />
                </>
            )}
            {loadMode === "uploadId" && (
                <>
                    <InputItem label={"??????ID"} value={localId} setValue={setLocalId} />
                </>
            )}
            <Form.Item colon={false} label={" "}>
                <Button type='primary' htmlType='submit'>
                    {" "}
                    ??????{" "}
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
    selectedRowKeysRecord: API.YakitPluginDetail[]
    user: boolean
    userInfo: UserInfoProps
    onFinish: () => void
}

interface DownloadOnlinePluginByIdsRequest {
    OnlineIDs: number[]
    UUID: string[]
}

const AddAllPlugin: React.FC<AddAllPluginProps> = (props) => {
    const {selectedRowKeysRecord, setListLoading, user, userInfo, onFinish} = props
    const [taskToken, setTaskToken] = useState(randomString(40))
    // ?????????????????????
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
            warn("??????????????????????????????????????????????????????")
            return
        }
        if (selectedRowKeysRecord.length > 0) {
            // ????????????
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
                    success(`?????????${selectedRowKeysRecord.length}??????????????????`)
                    onFinish()
                })
                .catch((e) => {
                    failed(`????????????:${e}`)
                })
                .finally(() => {
                    setTimeout(() => {
                        setListLoading(false)
                    }, 200)
                })
        } else {
            // ????????????
            setAddLoading(true)
            const addParams = {isAddToken: true, BindMe: user}
            ipcRenderer
                .invoke("DownloadOnlinePluginAll", addParams, taskToken)
                .then(() => {})
                .catch((e) => {
                    failed(`????????????:${e}`)
                })
        }
    })
    const StopAllPlugin = () => {
        setAddLoading(false)
        ipcRenderer.invoke("cancel-DownloadOnlinePluginAll", taskToken).catch((e) => {
            failed(`??????????????????:${e}`)
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
                    ??????
                </Button>
            ) : (
                <>
                    {/* ??????????????? ?????? ????????????????????????????????? */}
                    {(selectedRowKeysRecord.length === 0 && !(user && !userInfo.isLogin) && (
                        <Popconfirm
                            title={user ? "???????????????????????????????????????????????????" : "????????????????????????????????????????????????????"}
                            onConfirm={AddAllPlugin}
                            okText='Yes'
                            cancelText='No'
                        >
                            <Tooltip title='??????'>
                                <DownloadOutlined className='operation-icon ' />
                            </Tooltip>
                        </Popconfirm>
                    )) || (
                        <Tooltip title='??????'>
                            <DownloadOutlined className='operation-icon ' onClick={AddAllPlugin} />
                        </Tooltip>
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
        updatePluginRecordUser
    } = props
    const [queryUser, setQueryUser] = useState<SearchPluginOnlineRequest>({
        ...defQueryOnline
    })
    const [isFilter, setIsFilter] = useState(false)
    const [selectedRowKeysRecordUser, setSelectedRowKeysRecordUser] = useState<API.YakitPluginDetail[]>([])
    const [totalUser, setTotalUser] = useState<number>(0)
    const [refresh, setRefresh] = useState(false)
    const [visibleQuery, setVisibleQuery] = useState<boolean>(false)
    const [isSelectAllUser, setIsSelectAllUser] = useState<boolean>(false)
    useEffect(() => {
        if (!userInfo.isLogin) onSelectAllUser(false)
    }, [userInfo])
    useEffect(() => {
        if (
            !queryUser.is_private &&
            queryUser.order_by === "stars" &&
            queryUser.order === "desc" &&
            queryUser.type === typeOnline &&
            !queryUser.status &&
            queryUser.user === false
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
            // ???????????????
            onResetList()
            setUserPlugin()
        }
    }, [isRefList])
    const onSelectAllUser = useMemoizedFn((checked) => {
        setIsSelectAllUser(checked)
        if (!checked) {
            setSelectedRowKeysRecordUser([]) // ????????????
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
                        ??????
                    </Checkbox>
                    {selectedRowKeysRecordUser.length > 0 && (
                        <Tag color='blue'>??????{selectedRowKeysRecordUser.length}???</Tag>
                    )}
                    <Tag>Total:{totalUser}</Tag>
                </Col>
                <Col span={12} className='col-flex-end'>
                    <Popconfirm
                        title={
                            visibleQuery && (
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
                            )
                        }
                        placement='bottomLeft'
                        icon={null}
                        overlayClassName='pop-confirm'
                        visible={visibleQuery}
                    >
                        <Tooltip title='??????'>
                            <FilterOutlined
                                className={`operation-icon ${isFilter && "operation-icon-active"}`}
                                onClick={() => setVisibleQuery(true)}
                            />
                        </Tooltip>
                    </Popconfirm>
                    <AddAllPlugin
                        selectedRowKeysRecord={selectedRowKeysRecordUser}
                        setListLoading={setListLoading}
                        user={true}
                        userInfo={userInfo}
                        onFinish={() => {
                            onSelectAllUser(false)
                        }}
                    />
                </Col>
            </Row>
            <div style={{height: "calc(100% - 32px)"}}>
                <YakModuleOnlineList
                    currentId={userPlugin?.id || 0}
                    queryOnline={queryUser}
                    selectedRowKeysRecord={selectedRowKeysRecordUser}
                    onSelectList={setSelectedRowKeysRecordUser} //????????????
                    isSelectAll={isSelectAllUser}
                    setTotal={setTotalUser}
                    onClicked={setUserPlugin}
                    userInfo={userInfo}
                    user={true}
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
}
const YakModuleOnline: React.FC<YakModuleOnlineProps> = (props) => {
    const {
        plugin,
        setPlugin,
        userInfo,
        publicKeyword,
        isRefList,
        deletePluginRecordOnline,
        setListLoading,
        updatePluginRecordOnline
    } = props
    const [queryOnline, setQueryOnline] = useState<SearchPluginOnlineRequest>({
        ...defQueryOnline
    })
    const [isFilter, setIsFilter] = useState(false)
    const [selectedRowKeysRecordOnline, setSelectedRowKeysRecordOnline] = useState<API.YakitPluginDetail[]>([])
    const [totalUserOnline, setTotalOnline] = useState<number>(0)
    const [refresh, setRefresh] = useState(false)
    const [visibleQuery, setVisibleQuery] = useState<boolean>(false)
    const [isSelectAllUser, setIsSelectAllUser] = useState<boolean>(false)
    useEffect(() => {
        if (!userInfo.isLogin) onSelectAllOnline(false)
    }, [userInfo])
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
            // ???????????????
            onResetList()
            setPlugin()
        }
    }, [isRefList])
    const onSelectAllOnline = useMemoizedFn((checked) => {
        setIsSelectAllUser(checked)
        if (!checked) {
            setSelectedRowKeysRecordOnline([]) // ????????????
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
                    <Checkbox checked={isSelectAllUser} onChange={(e) => onSelectAllOnline(e.target.checked)}>
                        ??????
                    </Checkbox>
                    {selectedRowKeysRecordOnline.length > 0 && (
                        <Tag color='blue'>??????{selectedRowKeysRecordOnline.length}???</Tag>
                    )}
                    <Tag>Total:{totalUserOnline}</Tag>
                </Col>
                <Col span={12} className='col-flex-end'>
                    <Popconfirm
                        title={
                            visibleQuery && (
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
                            )
                        }
                        placement='bottomLeft'
                        icon={null}
                        overlayClassName='pop-confirm'
                        visible={visibleQuery}
                    >
                        <Tooltip title='??????'>
                            <FilterOutlined
                                className={`operation-icon ${isFilter && "operation-icon-active"}`}
                                onClick={() => setVisibleQuery(true)}
                            />
                        </Tooltip>
                    </Popconfirm>
                    <AddAllPlugin
                        selectedRowKeysRecord={selectedRowKeysRecordOnline}
                        setListLoading={setListLoading}
                        user={false}
                        userInfo={userInfo}
                        onFinish={() => {
                            onSelectAllOnline(false)
                        }}
                    />
                </Col>
            </Row>
            <div style={{height: "calc(100% - 32px)"}}>
                <YakModuleOnlineList
                    currentId={plugin?.id || 0}
                    queryOnline={queryOnline}
                    selectedRowKeysRecord={selectedRowKeysRecordOnline}
                    onSelectList={setSelectedRowKeysRecordOnline} //????????????
                    isSelectAll={isSelectAllUser}
                    setTotal={setTotalOnline}
                    onClicked={setPlugin}
                    userInfo={userInfo}
                    user={false}
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
    onClicked: (m?: API.YakitPluginDetail) => void
    userInfo: UserInfoProps
    isSelectAll: boolean
    user: boolean
    refresh: boolean
    deletePluginRecord?: API.YakitPluginDetail
    updatePluginRecord?: API.YakitPluginDetail
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
        user,
        deletePluginRecord,
        updatePluginRecord,
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
    const [hasMore, setHasMore] = useState(false)
    const [isRef, setIsRef] = useState(false)
    const [listBodyLoading, setListBodyLoading] = useState(false)
    const numberOnlineUser = useRef(0) // ???????????? ???????????????index
    const numberOnline = useRef(0) // ???????????? ???????????????index
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
            // const data = response.data.filter((ele) => ele.status === 1)
            onSelectList([...response.data])
        }
    }, [isSelectAll])
    useEffect(() => {
        setIsAdmin(userInfo.role === "admin")
    }, [userInfo.role])
    useEffect(() => {
        setIsRef(!isRef)
        setListBodyLoading(true)
        if (!userInfo.isLogin && user) {
            setTotal(0)
        } else {
            search(1)
        }
    }, [user, refresh, userInfo.isLogin])
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
                failed("????????????????????????:" + err)
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
                success("????????????")
                ipcRenderer.invoke("change-main-menu")
            })
            .catch((e) => {
                failed(`????????????:${e}`)
            })
            .finally(() => {
                if (callback) callback()
            })
    })
    const starredPlugin = useMemoizedFn((info: API.YakitPluginDetail) => {
        if (!userInfo.isLogin) {
            warn("????????????")
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
                failed("??????:" + err)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 200)
            })
    })
    if (!userInfo.isLogin && user) {
        return (
            <List
                dataSource={[]}
                locale={{emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='?????????,????????????' />}}
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
                rowKey='id'
                itemHeight={151}
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
    failed: "color-bgColor-red|???????????????",
    success: "color-bgColor-green|????????????",
    not: "color-bgColor-blue|?????????"
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
    useEffect(() => {
        setStatus(info.status)
    }, [info.status, info.id])
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
                                    <Tooltip title='????????????'>
                                        {/* @ts-ignore */}
                                        <OfficialYakitLogoIcon className='text-icon-style' />
                                    </Tooltip>
                                )
                            )}
                            {user && (
                                <>
                                    {(info.is_private === true && (
                                        <Tooltip title='????????????'>
                                            <LockOutlined />
                                        </Tooltip>
                                    )) || (
                                        <Tooltip title='????????????'>
                                            <OnlineCloudIcon />
                                        </Tooltip>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    <div className='vertical-center'>
                        {(loading && <LoadingOutlined />) || (
                            <Tooltip title={"?????????????????????"}>
                                <Button
                                    className='title-add'
                                    type='link'
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        add()
                                    }}
                                >
                                    ??????
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
    {text: "YAK ??????", value: "yak"},
    {text: "MITM ??????", value: "mitm"},
    {text: "???????????????", value: "packet-hack"},
    {text: "??????????????????", value: "port-scan"},
    {text: "CODEC??????", value: "codec"},
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
        // ??????????????????????????????????????????div???
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
                    <Form.Item name='order_by' label='????????????'>
                        <Select size='small' getPopupContainer={() => refTest.current}>
                            <Option value='stars'>?????????</Option>
                            <Option value='created_at'>?????????</Option>
                        </Select>
                    </Form.Item>
                )}
                <Form.Item name='type' label='????????????'>
                    <Select size='small' getPopupContainer={() => refTest.current} mode='multiple'>
                        {PluginType.map((item) => (
                            <Option value={item.value} key={item.value}>
                                {item.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                {user && (
                    <Form.Item name='is_private' label='??????/??????'>
                        <Select size='small' getPopupContainer={() => refTest.current} onSelect={onSelect}>
                            <Option value='true'>??????</Option>
                            <Option value='false'>??????</Option>
                        </Select>
                    </Form.Item>
                )}
                {((!user && isAdmin) || (user && isShowStatus)) && (
                    <Form.Item name='status' label='????????????'>
                        <Select size='small' getPopupContainer={() => refTest.current}>
                            <Option value='all'>??????</Option>
                            <Option value='0'>?????????</Option>
                            <Option value='1'>????????????</Option>
                            <Option value='2'>???????????????</Option>
                        </Select>
                    </Form.Item>
                )}
                <div className='form-btns'>
                    <Button type='primary' htmlType='submit' size='small'>
                        ??????????????????
                    </Button>
                    <Button size='small' onClick={onReset}>
                        ????????????
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
        // ??????????????????????????????????????????div???
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
                <Form.Item name='Type' label='????????????'>
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
                        ??????????????????
                    </Button>
                    <Button size='small' onClick={onReset}>
                        ????????????
                    </Button>
                </div>
            </Form>
        </div>
    )
}
