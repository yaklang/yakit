import React, {useEffect, useState, useRef} from "react"
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
    Checkbox
} from "antd"
import {
    ReloadOutlined,
    GithubOutlined,
    UploadOutlined,
    LoadingOutlined,
    FilterOutlined,
    FullscreenExitOutlined,
    FullscreenOutlined
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
import {useDebounceFn, useGetState, useMemoizedFn} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {DownloadOnlinePluginProps} from "../yakitStoreOnline/YakitStoreOnline"
import InfiniteScroll from "react-infinite-scroll-component"
import {randomString} from "@/utils/randomUtil"
import {OfficialYakitLogoIcon, SelectIcon, OnlineCloudIcon} from "../../assets/icons"
import {YakitPluginInfoOnline} from "./YakitPluginInfoOnline/index"
import moment from "moment"
import {findDOMNode} from "react-dom"
import {usePluginStore} from "@/store/plugin"

const {Search} = Input
const {Option} = Select
const {ipcRenderer} = window.require("electron")

const userInitUse = "user-init-use"

export interface YakitStorePageProp {}

interface GetYakScriptByOnlineIDRequest {
    OnlineID?: number
    UUID: string
}

interface SearchPluginOnlineRequest {
    keywords: string
    status: number | null
    type: string
    order_by: string
    order?: string
    page?: number
    limit?: number
    user?: boolean
}

export const YakitStorePage: React.FC<YakitStorePageProp> = (props) => {
    const [script, setScript] = useState<YakScript>()
    const [trigger, setTrigger] = useState(false)
    const [keyword, setKeyword] = useState("")
    const [ignored, setIgnored] = useState(false)
    const [history, setHistory] = useState(false)
    const [total, setTotal] = useState<number>(0)
    const [queryOnline, setQueryOnline] = useState<SearchPluginOnlineRequest>({
        keywords: "",
        order_by: "stars",
        order: "desc",
        type: "",
        page: 1,
        limit: 12,
        status: null,
        user: false
    })

    const [loading, setLoading] = useState(false)
    const [pluginType, setPluginType] = useState<"yak" | "mitm" | "nuclei" | "codec" | "packet-hack" | "port-scan">(
        "yak"
    )

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
                success("删除成功")
            })
            .catch((e) => {
                failed(`删除所有本地插件错误:${e}`)
            })
    })

    // 是否第一次使用yakit  第一次使用默认展示线上，后面默认展示本地
    const [plugSource, setPlugSource] = useState<string>("online")
    const [publicKeyword, setPublicKeyword] = useState<string>("")
    const [visibleQuery, setVisibleQuery] = useState<boolean>(false)
    const [batchAddLoading, setBatchAddLoading] = useState<boolean>(false)
    const [plugin, setPlugin] = useState<API.YakitPluginDetail>()
    const [selectedRowKeysRecord, setSelectedRowKeysRecord] = useState<API.YakitPluginDetail[]>([])
    const [fullScreen, setFullScreen] = useState<boolean>(false)
    const [isSelectAll, setIsSelectAll] = useState<boolean>(false)
    const [scrollHeight, setScrollHeight] = useState<number>(0)
    // 全局登录状态
    const {userInfo} = useStore()
    useEffect(()=>{
        if(selectedRowKeysRecord.length===0){
            setIsSelectAll(false)
        }
    },[selectedRowKeysRecord.length])
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
    const realSearch = useDebounceFn(
        useMemoizedFn(() => {
            triggerSearch()
        }),
        {wait: 500}
    ).run
    const triggerSearch = useMemoizedFn(() => {
        if (plugSource === "online") {
            // 搜索插件商店
            setSelectedRowKeysRecord([])
            getOnlineList()
        } else {
            //搜索本地
            getLocalList()
        }
    })
    const getOnlineList = useMemoizedFn(() => {
        setQueryOnline({
            ...queryOnline,
            keywords: publicKeyword
        })
    })
    const getLocalList = useMemoizedFn(() => {
        setTrigger(!trigger)
        setKeyword(publicKeyword)
    })

    const onSelectItem = useMemoizedFn((datas) => {
        setSelectedRowKeysRecord(datas)
    })

    const onFullScreen = useMemoizedFn(() => {
        const localDom = document.getElementById("scroll-div-plugin-local")
        const onlineDom = document.getElementById("scroll-div-plugin-online")
        if (fullScreen) {
            if (localDom) {
                setTimeout(() => {
                    localDom.scrollTo(0, scrollHeight)
                    setScrollHeight(0)
                }, 100)
            }
            if (onlineDom) {
                setTimeout(() => {
                    onlineDom.scrollTo(0, scrollHeight)
                    setScrollHeight(0)
                }, 100)
            }
        } else {
            if (localDom) {
                setScrollHeight(localDom.scrollTop)
            }
            if (onlineDom) {
                setScrollHeight(onlineDom.scrollTop)
            }
        }
        setFullScreen(!fullScreen)
    })
    const onSelectAll = useMemoizedFn((e) => {
        setIsSelectAll(e.target.checked)
        if (!e.target.checked) {
            setSelectedRowKeysRecord([])
        }
    })
    return (
        <div style={{height: "100%", display: "flex", flexDirection: "row"}}>
            <Card
                bodyStyle={{padding: 0, height: "calc(100% - 82px)"}}
                bordered={false}
                style={{height: "100%", width: fullScreen ? 0 : 470}}
                title={
                    <div className='list-card-title'>
                        <Row gutter={12}>
                            <Col span={12} className='flex-align-center'>
                                插件源：
                                <ManySelectOne
                                    size={"small"}
                                    data={[
                                        {text: "插件商店", value: "online"},
                                        {text: "本地", value: "local"}
                                    ]}
                                    value={plugSource}
                                    setValue={setPlugSource}
                                    formItemStyle={{marginBottom: 0, width: 115}}
                                />
                                <Button size={"small"} type={"link"} onClick={(e) => triggerSearch()}>
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
                            <Col span={12}>
                                {/* {plugSource === "online" && selectedRowKeysRecord.length > 0 && (
                                    <Tag color='blue'>已选{selectedRowKeysRecord.length}条</Tag>
                                )} */}
                                {plugSource === "online" && (
                                    <Checkbox checked={isSelectAll} onChange={onSelectAll}>
                                        全选&emsp;
                                        {selectedRowKeysRecord.length > 0 && (
                                            <Tag color='blue'>已选{selectedRowKeysRecord.length}条</Tag>
                                        )}
                                    </Checkbox>
                                )}
                                <Tag>Total:{total}</Tag>
                            </Col>
                            <Col span={12} className='col-flex-end'>
                                {(plugSource === "online" && (
                                    <>
                                        <Popconfirm
                                            title={
                                                visibleQuery && (
                                                    <QueryComponent
                                                        onClose={() => setVisibleQuery(false)}
                                                        userInfo={userInfo}
                                                        queryOnline={queryOnline}
                                                        setQueryOnline={setQueryOnline}
                                                    />
                                                )
                                            }
                                            placement='bottomLeft'
                                            icon={null}
                                            overlayClassName='pop-confirm'
                                            visible={visibleQuery}
                                        >
                                            <FilterOutlined
                                                className='col-icon'
                                                onClick={() => setVisibleQuery(true)}
                                            />
                                        </Popconfirm>
                                        <AddAllPlugin
                                            selectedRowKeysRecord={selectedRowKeysRecord}
                                            setBatchAddLoading={setBatchAddLoading}
                                            setSelectedRowKeysRecord={setSelectedRowKeysRecord}
                                        />
                                    </>
                                )) || (
                                    <>
                                        {plugSource === "local" && (
                                            <Popconfirm
                                                title='是否删除本地所有插件?'
                                                onConfirm={() => onRemoveLocalPlugin()}
                                            >
                                                <Button size='small' type='primary' danger>
                                                    删除
                                                </Button>
                                            </Popconfirm>
                                        )}
                                        <Button
                                            size={"small"}
                                            type='primary'
                                            // icon={<PlusOutlined />}
                                            onClick={() => {
                                                let m = showDrawer({
                                                    title: "创建新插件",
                                                    width: "100%",
                                                    content: (
                                                        <>
                                                            <YakScriptCreatorForm
                                                                onChanged={(e) => triggerSearch()}
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
                                    </>
                                )}
                                <Button
                                    size={"small"}
                                    type={"primary"}
                                    // icon={<DownloadOutlined />}
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
                            </Col>
                        </Row>
                    </div>
                }
                size={"small"}
                className='left-list'
            >
                <Spin spinning={batchAddLoading}>
                    {(plugSource === "online" && (
                        <YakModuleOnlineList
                            currentId={plugin?.id || 0}
                            queryOnline={queryOnline}
                            selectedRowKeysRecord={selectedRowKeysRecord}
                            onSelectItem={onSelectItem}
                            isSelectAll={isSelectAll}
                            onSelectAll={setSelectedRowKeysRecord}
                            setTotal={setTotal}
                            onClicked={setPlugin}
                            userInfo={userInfo}
                        />
                    )) || (
                        <YakModuleList
                            currentId={script?.Id}
                            Keyword={keyword}
                            Type={pluginType}
                            onClicked={setScript}
                            trigger={trigger}
                            isHistory={history}
                            isIgnored={ignored}
                            setTotal={setTotal}
                        />
                    )}
                </Spin>
            </Card>

            <div style={{flex: 1, overflowY: "auto"}} id='plugin-info-scroll'>
                {plugin || script ? (
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
                        {plugSource === "online"
                            ? plugin && <YakitPluginInfoOnline info={plugin} />
                            : script && (
                                  <PluginOperator
                                      yakScriptId={script.Id}
                                      setTrigger={() => setTrigger(!trigger)}
                                      setScript={setScript}
                                  />
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
    Type: "yak" | "mitm" | "nuclei" | string
    Keyword: string
    onClicked: (y: YakScript) => any
    currentId?: number
    trigger?: boolean
    isIgnored?: boolean
    isHistory?: boolean
    onYakScriptRender?: (i: YakScript, maxWidth?: number) => any
    setTotal?: (n: number) => void
}

export const YakModuleList: React.FC<YakModuleListProp> = (props) => {
    // 全局登录状态
    const {userInfo} = useStore()
    const [params, setParams] = useState<QueryYakScriptRequest>({
        IsHistory: props.isHistory,
        Keyword: props.Keyword,
        Pagination: {Limit: 10, Order: "desc", Page: 1, OrderBy: "updated_at"},
        Type: props.Type,
        IsIgnore: props.isIgnored
    })
    const [response, setResponse] = useState<QueryYakScriptsResponse>({
        Data: [],
        Pagination: {
            Limit: 10,
            Page: 0,
            Order: "desc",
            OrderBy: "updated_at"
        },
        Total: 0
    })
    const [loading, setLoading] = useState(false)
    const [trigger, setTrigger] = useState(false)
    const [maxWidth, setMaxWidth] = useState<number>(260)
    const update = (
        page?: number,
        limit?: number,
        keyword?: string,
        Type?: string,
        isIgnore?: boolean,
        isHistory?: boolean
    ) => {
        const newParams = {
            ...params
        }
        if (page) newParams.Pagination.Page = page
        if (limit) newParams.Pagination.Limit = limit

        newParams.Keyword = keyword
        newParams.Type = Type
        newParams.IsIgnore = isIgnore
        newParams.IsHistory = isHistory
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
                setTimeout(() => setLoading(false), 200)
            })
    }

    useEffect(() => {
        setParams({
            ...params,
            Keyword: props.Keyword,
            Type: props.Type,
            IsHistory: props.isHistory,
            IsIgnore: props.isIgnored
        })
        update(1, undefined, props.Keyword || "", props.Type, props.isIgnored, props.isHistory)
    }, [props.trigger, props.Keyword, props.Type, props.isHistory, props.isIgnored, trigger, userInfo.isLogin])
    const [hasMore, setHasMore] = useState<boolean>(true)
    const loadMoreData = useMemoizedFn(() => {
        update(
            parseInt(`${response.Pagination.Page}`) + 1,
            undefined,
            props.Keyword || "",
            props.Type,
            props.isIgnored,
            props.isHistory
        )
    })

    return (
        <div id='scroll-div-plugin-local' className='plugin-list-body'>
            {/* @ts-ignore */}
            <InfiniteScroll
                dataLength={response.Total}
                key={response.Pagination.Page}
                next={loadMoreData}
                hasMore={hasMore}
                loader={
                    <div className='loading-center'>
                        <LoadingOutlined />
                    </div>
                }
                endMessage={response.Total > 0 && <div className='loading-center'>暂无更多数据</div>}
                scrollableTarget='scroll-div-plugin-local'
            >
                <List<YakScript>
                    loading={loading}
                    className='plugin-list'
                    dataSource={response.Data || []}
                    split={false}
                    renderItem={(i: YakScript, index: number) => {
                        return (
                            <List.Item style={{marginLeft: 0}} key={i.Id}>
                                <PluginListLocalItem
                                    plugin={i}
                                    userInfo={userInfo}
                                    onClicked={props.onClicked}
                                    currentId={props.currentId}
                                    onYakScriptRender={props.onYakScriptRender}
                                    maxWidth={maxWidth}
                                />
                            </List.Item>
                        )
                    }}
                />
            </InfiniteScroll>
        </div>
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
    const uploadOnline = (item: YakScript) => {
        if (!userInfo.isLogin) {
            warn("未登录，请先登录!")
            return
        }
        if (!item.UserId && item.UserId > 0 && userInfo.user_id !== item.UserId) {
            warn("只能上传本人创建的插件!")
            return
        }
        const params: API.NewYakitPlugin = {
            type: item.Type,
            script_name: item.OnlineScriptName ? item.OnlineScriptName : item.ScriptName,
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
            contributors: item.Author
        }
        if (item.OnlineId) {
            params.id = parseInt(`${item.OnlineId}`)
        }
        setUploadLoading(true)
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
                                onClicked(newSrcipt)
                                setPlugin(newSrcipt)

                                ipcRenderer
                                    .invoke("delete-yak-script", item.Id)
                                    .then(() => {
                                        // console.log("删除成功")
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
                <Space wrap>
                    <div title={plugin.ScriptName}>
                        {plugin.OnlineScriptName ? plugin.OnlineScriptName : plugin.ScriptName}
                    </div>
                    {plugin.OnlineId > 0 && <OnlineCloudIcon />}
                    {gitUrlIcon(plugin.FromGit)}
                </Space>
            }
            extra={
                (uploadLoading && <LoadingOutlined />) || (
                    <UploadOutlined
                        style={{marginLeft: 6, fontSize: 16, cursor: "pointer"}}
                        onClick={() => uploadOnline(plugin)}
                    />
                )
            }
            style={{
                width: "100%",
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
    const [loadMode, setLoadMode] = useState<"official" | "giturl" | "local" | "local-nuclei" | "uploadId">("local")
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
                    {text: "本地仓库", value: "local"},
                    {text: "本地 Yaml PoC", value: "local-nuclei"},
                    {text: "使用ID", value: "uploadId"}
                ]}
                value={loadMode}
                setValue={setLoadMode}
            />
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
    setBatchAddLoading: (a: boolean) => void
    setSelectedRowKeysRecord: (a: API.YakitPluginDetail[]) => void
    selectedRowKeysRecord: API.YakitPluginDetail[]
}

interface DownloadOnlinePluginByIdsRequest {
    OnlineIDs: number[]
    UUID: string[]
}

const AddAllPlugin: React.FC<AddAllPluginProps> = (props) => {
    const {selectedRowKeysRecord, setBatchAddLoading, setSelectedRowKeysRecord} = props
    const [taskToken, setTaskToken] = useState(randomString(40))
    // 全部添加进度条
    const [addLoading, setAddLoading] = useState<boolean>(false)
    const [percent, setPercent, getPercent] = useGetState<number>(0)
    useEffect(() => {
        if (!taskToken) {
            return
        }
        ipcRenderer.on(`${taskToken}-data`, (_, data: DownloadOnlinePluginAllResProps) => {
            const p = data.Progress * 100
            setPercent(p)
        })
        ipcRenderer.on(`${taskToken}-end`, () => {
            setTimeout(() => {
                setAddLoading(false)
                setPercent(0)
            }, 500)
        })
        ipcRenderer.on(`${taskToken}-error`, (_, e) => {
            failed("全部添加失败")
        })
        return () => {
            ipcRenderer.removeAllListeners(`${taskToken}-data`)
            ipcRenderer.removeAllListeners(`${taskToken}-error`)
            ipcRenderer.removeAllListeners(`${taskToken}-end`)
        }
    }, [taskToken])
    const AddAllPlugin = useMemoizedFn(() => {
        if (selectedRowKeysRecord.length > 0) {
            // 批量添加
            const uuIds: string[] = []
            const onlineIDs: number[] = []
            selectedRowKeysRecord.forEach((item) => {
                uuIds.push(item.uuid)
                onlineIDs.push(item.id)
            })
            setBatchAddLoading(true)
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
                        setBatchAddLoading(false)
                    }, 200)
                })
        } else {
            // 全部添加
            setAddLoading(true)
            ipcRenderer
                .invoke("DownloadOnlinePluginAll", {isAddToken: true, BindMe: false}, taskToken)
                .then(() => {
                    setTimeout(() => {
                        success("全部添加成功")
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
                <Tooltip title='没有选择数据默认全部添加'>
                    <Button className='filter-opt-btn' size='small' type='primary' onClick={AddAllPlugin}>
                        添加
                    </Button>
                </Tooltip>
            )}
        </>
    )
}

export interface StarsOperation {
    id: number
    operation: string
}

interface SearchPluginOnlineRequest {
    keywords: string
    status: number | null
    type: string
    order_by: string
    order?: string
    page?: number
    limit?: number
}

interface YakModuleOnlineListProps {
    currentId: number
    queryOnline: SearchPluginOnlineRequest
    setTotal: (m: number) => void
    selectedRowKeysRecord: API.YakitPluginDetail[]
    onSelectItem: (m: API.YakitPluginDetail[]) => void
    onClicked: (m: API.YakitPluginDetail) => void
    userInfo: UserInfoProps
    onSelectAll: (m: API.YakitPluginDetail[]) => void
    isSelectAll: boolean
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
        userInfo
    } = props
    const [response, setResponse] = useState<API.YakitPluginListResponse>({
        data: [],
        pagemeta: {
            limit: 12,
            page: 1,
            total: 0,
            total_page: 1
        }
    })
    const [loading, setLoading] = useState(false)
    const [isAdmin, setIsAdmin] = useState<boolean>(true)
    const [hasMore, setHasMore] = useState(false)
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
        search(1)
    }, [queryOnline])
    const search = useMemoizedFn((page: number) => {
        let url = "yakit/plugin/unlogged"
        if (userInfo.isLogin) {
            url = "yakit/plugin"
        }
        setLoading(true)
        if (page) queryOnline.page = page
        NetWorkApi<SearchPluginOnlineRequest, API.YakitPluginListResponse>({
            method: "get",
            url,
            params: queryOnline
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
                setTimeout(() => setLoading(false), 200)
            })
    })
    const loadMoreData = useMemoizedFn(() => {
        search(response.pagemeta.page + 1)
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

    return (
        <div id='scroll-div-plugin-online' className='plugin-list-body'>
            {/* @ts-ignore */}
            <InfiniteScroll
                dataLength={response?.pagemeta?.total || 0}
                key={response?.pagemeta?.page || 1}
                next={loadMoreData}
                hasMore={hasMore}
                loader={
                    <div className='loading-center'>
                        <LoadingOutlined />
                    </div>
                }
                endMessage={response?.pagemeta?.total > 0 && <div className='no-more-text'>暂无更多数据</div>}
                scrollableTarget='scroll-div-plugin-online'
            >
                <List<API.YakitPluginDetail>
                    loading={loading}
                    className='plugin-list'
                    dataSource={response.data || []}
                    split={false}
                    renderItem={(i: API.YakitPluginDetail, index: number) => {
                        return (
                            <List.Item
                                style={{marginLeft: 0, position: "relative"}}
                                key={i.id}
                                onClick={() => onClicked(i)}
                            >
                                <PluginItemOnline
                                    index={index}
                                    currentId={currentId}
                                    isAdmin={isAdmin}
                                    info={i}
                                    selectedRowKeysRecord={selectedRowKeysRecord}
                                    onSelect={onSelect}
                                    onClick={(info) => {
                                        onClicked(info)
                                    }}
                                    onDownload={addLocalLab}
                                    onStarred={starredPlugin}
                                />
                            </List.Item>
                        )
                    }}
                />
            </InfiniteScroll>
        </div>
    )
}

export const TagColor: {[key: string]: string} = {
    failed: "color-bgColor-red|审核不通过",
    success: "color-bgColor-green|审核通过",
    not: "color-bgColor-blue|待审核"
}

interface PluginListOptProps {
    index: number
    currentId: number
    isAdmin: boolean
    info: API.YakitPluginDetail
    onClick: (info: API.YakitPluginDetail) => any
    onDownload: (info: API.YakitPluginDetail, callback) => any
    onStarred: (info: API.YakitPluginDetail) => any
    onSelect: (info: API.YakitPluginDetail) => any
    selectedRowKeysRecord: API.YakitPluginDetail[]
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
    const {isAdmin, info, onClick, onDownload, onStarred, index, onSelect, selectedRowKeysRecord, currentId} = props
    const tags: string[] = info.tags ? JSON.parse(info.tags) : []
    const tagList = useRef(null)
    const [status, setStatus] = useState<number>(info.status)
    const [flag, setFlag] = useState<number>(-1)
    const {
        pluginData: {currentPlugin},
        setCurrentPlugin
    } = usePluginStore()
    useEffect(() => {
        if (!currentPlugin) return
        if (info.id === currentPlugin.id) {
            setStatus(currentPlugin.status)
            setTimeout(() => {
                setCurrentPlugin({currentPlugin: null})
            }, 100)
        }
    }, [currentPlugin && currentPlugin.id])
    useEffect(() => {
        setTimeout(() => {
            if (tagList && tagList.current) {
                const body = tagList.current as unknown as HTMLDivElement
                const arr: number[] = []
                for (let i = 0; i < body.childNodes.length; i++) arr.push((body.childNodes[i] as any).offsetWidth)

                let flagIndex = 0
                let sum = 0
                const width = body.offsetWidth
                for (let id in arr) {
                    sum += arr[id] + 5
                    if (sum >= width) break
                    flagIndex = +id
                }
                if (flagIndex !== flag) setFlag(flagIndex)
            }
        }, 50)
    }, [])
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
                        <span
                            style={{maxWidth: isAdmin ? "60%" : "80%"}}
                            className='text-style content-ellipsis'
                            title={info.script_name}
                        >
                            {info.script_name}
                        </span>
                        <div className='text-icon vertical-center'>
                            {isAdmin ? (
                                <div
                                    className={`text-icon-admin ${
                                        TagColor[["not", "success", "failed"][status]].split("|")[0]
                                    } vertical-center`}
                                >
                                    {TagColor[["not", "success", "failed"][status]].split("|")[1]}
                                </div>
                            ) : (
                                info.official && (
                                    // @ts-ignore
                                    <OfficialYakitLogoIcon className='text-icon-style' />
                                )
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
                                    添加
                                </Button>
                            </Tooltip>
                        )}
                    </div>
                </div>
            }
            style={{
                width: "100%",
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

interface QueryComponentProps {
    onClose: () => void
    userInfo: UserInfoProps
    setQueryOnline: (q: SearchPluginOnlineRequest) => void
    queryOnline: SearchPluginOnlineRequest
}

const layout = {
    labelCol: {span: 8},
    wrapperCol: {span: 16}
}

const PluginType: {text: string; value: string}[] = [
    {text: "全部", value: ""},
    {text: "YAK 插件", value: "yak"},
    {text: "MITM 插件", value: "mitm"},
    {text: "数据包扫描", value: "packet-hack"},
    {text: "端口扫描插件", value: "port-scan"},
    {text: "CODEC插件", value: "codec"},
    {text: "YAML POC", value: "nuclei"}
]

const QueryComponent: React.FC<QueryComponentProps> = (props) => {
    const {onClose, userInfo, queryOnline, setQueryOnline} = props
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
            type: queryOnline.type,
            status: queryOnline.status === null ? "all" : queryOnline.status,
            user: queryOnline.user ? "true" : "false"
        })
    }, [queryOnline.order_by, queryOnline.type, queryOnline.status])
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
        setQueryOnline({...queryOnline, order_by: "stars", type: "", status: null, user: false})
        form.setFieldsValue({
            order_by: "stars",
            type: "",
            status: "all",
            user: "false"
        })
    }
    const onFinish = useMemoizedFn((value) => {
        const query: SearchPluginOnlineRequest = {
            ...queryOnline,
            ...value,
            status: value.status === "all" ? null : value.status,
            user: value.user === "true" ? true : false
        }
        setQueryOnline({...query})
    })
    return (
        <div ref={refTest} className='query-form-body'>
            <Form {...layout} form={form} name='control-hooks' onFinish={onFinish}>
                <Form.Item name='order_by' label='排序顺序'>
                    <Select size='small' getPopupContainer={() => refTest.current}>
                        <Option value='stars'>按热度</Option>
                        <Option value='created_at'>按时间</Option>
                    </Select>
                </Form.Item>
                <Form.Item name='type' label='插件类型'>
                    <Select size='small' getPopupContainer={() => refTest.current}>
                        {PluginType.map((item) => (
                            <Option value={item.value} key={item.value}>
                                {item.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                {userInfo.isLogin && (
                    <Form.Item name='user' label='插件作者'>
                        <Select size='small' getPopupContainer={() => refTest.current}>
                            <Option value='false'>全部</Option>
                            <Option value='true'>我的</Option>
                        </Select>
                    </Form.Item>
                )}
                {isAdmin && (
                    <Form.Item name='status' label='审核状态'>
                        <Select size='small' getPopupContainer={() => refTest.current}>
                            <Option value='all'>全部</Option>
                            <Option value={0}>待审核</Option>
                            <Option value={1}>审核通过</Option>
                            <Option value={2}>审核不通过</Option>
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
