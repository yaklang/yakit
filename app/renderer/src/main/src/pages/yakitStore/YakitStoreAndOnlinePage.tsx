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
    Popover,
    Row,
    Space,
    Tag,
    Tooltip,
    InputNumber,
    Progress
} from "antd"
import {
    DownloadOutlined,
    PlusOutlined,
    ReloadOutlined,
    SearchOutlined,
    SettingOutlined,
    GithubOutlined,
    UploadOutlined,
    LoadingOutlined,
    DeleteOutlined,
    FilterOutlined,
    StarOutlined,
    StarFilled
} from "@ant-design/icons"
import {showDrawer, showModal} from "../../utils/showModal"
import {AutoUpdateYakModuleViewer, startExecYakCode} from "../../utils/basic"
import {QueryYakScriptRequest, QueryYakScriptsResponse, YakScript, YakScriptParam} from "../invoker/schema"
import {failed, success, warn} from "../../utils/notification"
import {CopyableField, InputFloat, InputItem, ManySelectOne, SelectOne, SwitchItem} from "../../utils/inputUtil"
import {formatDate} from "../../utils/timeUtil"
import {PluginManagement, PluginOperator} from "./PluginOperator"
import {YakScriptCreatorForm} from "../invoker/YakScriptCreator"
import {startExecuteYakScript} from "../invoker/ExecYakScript"
import {YakExecutorParam} from "../invoker/YakExecutorParams"
import {AutoCard} from "../../components/AutoCard"
import ReactResizeDetector from "react-resize-detector"
import {UserInfoProps, useStore} from "@/store"
import "./YakitStorePage.scss"
import {getValue, saveValue} from "../../utils/kv"
import {useGetState, useMemoizedFn} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {DownloadOnlinePluginProps} from "../yakitStoreOnline/YakitStoreOnline"
import InfiniteScroll from "react-infinite-scroll-component"
import Checkbox from "antd/lib/checkbox/Checkbox"
import {randomString} from "@/utils/randomUtil"
import numeral from "numeral"
import {OfficialYakitLogoIcon} from "../../assets/icons"

const {Search} = Input
const {ipcRenderer} = window.require("electron")

const userInitUse = "user-init-use"

export interface YakitStorePageProp {}

interface SearchPluginOnlineRequest {
    keywords: string
    status: number | null
    type: string
    order_by: string
    order?: string
    page?: number
    limit?: number
}

export const YakitStoreAndOnlinePage: React.FC<YakitStorePageProp> = (props) => {
    const [script, setScript] = useState<YakScript>()
    const [trigger, setTrigger] = useState(false)
    const [keyword, setKeyword] = useState("")
    const [ignored, setIgnored] = useState(false)
    const [history, setHistory] = useState(false)

    const refresh = useMemoizedFn(() => {
        setTrigger(!trigger)
    })

    const [loading, setLoading] = useState(false)
    const [localPluginDir, setLocalPluginDir] = useState("")
    const [pluginType, setPluginType] = useState<"yak" | "mitm" | "nuclei" | "codec" | "packet-hack" | "port-scan">(
        "yak"
    )

    useEffect(() => {
        getValue(YAKIT_DEFAULT_LOAD_LOCAL_PATH).then((e) => {
            if (e) {
                setLocalPluginDir(`${e}`)
            }
        })
    }, [])

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
                refresh()
                success("删除成功")
            })
            .catch((e) => {
                failed(`删除所有本地插件错误:${e}`)
            })
    })

    // 是否第一次使用yakit  第一次使用默认展示线上，后面默认展示本地
    const [plugSource, setPlugSource] = useState<string>("online")
    const [params, setParams] = useState<SearchPluginOnlineRequest>({
        keywords: "",
        order_by: "stars",
        order: "desc",
        type: "",
        page: 1,
        limit: 12,
        status: null
    })
    const [response, setResponse] = useState<API.YakitPluginListResponse>({
        data: [],
        pagemeta: {
            limit: 12,
            page: 1,
            total: 0,
            total_page: 1
        }
    })
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
            .finally(() => setTimeout(() => setLoading(false), 300))
    }, [])
    return (
        <div style={{height: "100%", display: "flex", flexDirection: "row"}}>
            <div style={{width: 470}}>
                <AutoCard
                    bodyStyle={{padding: 0, overflow: "auto"}}
                    bordered={false}
                    style={{height: "100%"}}
                    title={
                        <>
                            <Row gutter={12}>
                                <Col span={12} className='flex-align-center'>
                                    插件源：
                                    <ManySelectOne
                                        size={"small"}
                                        data={[
                                            {text: "线上", value: "online"},
                                            {text: "本地", value: "local"}
                                        ]}
                                        value={plugSource}
                                        setValue={setPlugSource}
                                        formItemStyle={{marginBottom: 0, width: 115}}
                                    />
                                    <Button size={"small"} type={"link"} onClick={(e) => setTrigger(!trigger)}>
                                        <ReloadOutlined />
                                    </Button>
                                    <Popconfirm
                                        title='是否删除本地所有插件?本地数据不可恢复'
                                        onConfirm={() => onRemoveLocalPlugin()}
                                    >
                                        <Button size='small' type='link' danger>
                                            <DeleteOutlined />
                                        </Button>
                                    </Popconfirm>
                                </Col>
                                <Col span={12} className='flex-align-center'>
                                    搜索：
                                    <Search
                                        placeholder='输入关键字搜索'
                                        allowClear
                                        size='small'
                                        // onSearch={triggerSearch}
                                        // value={params.keywords}
                                        // onChange={(e) => {
                                        //     setParams({...params, keywords: e.target.value})
                                        //     triggerSearch()
                                        // }}
                                    />
                                </Col>
                            </Row>
                            <Row className='row-body' gutter={12}>
                                <Col span={12}>
                                    {plugSource === "online" && <Checkbox>全选</Checkbox>}
                                    <Tag>Total:456</Tag>
                                </Col>
                                <Col span={12} className='col-flex-end'>
                                    <FilterOutlined className='col-icon' />
                                    {(plugSource === "online" && <AddAllPlugin />) || (
                                        <Button
                                            size={"small"}
                                            type='primary'
                                            icon={<PlusOutlined />}
                                            onClick={() => {
                                                let m = showDrawer({
                                                    title: "创建新插件",
                                                    width: "100%",
                                                    content: (
                                                        <>
                                                            <YakScriptCreatorForm
                                                                onChanged={(e) => setTrigger(!trigger)}
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
                                    )}
                                    <Button
                                        size={"small"}
                                        type={"primary"}
                                        icon={<DownloadOutlined />}
                                        onClick={() => {
                                            showModal({
                                                width: 800,
                                                title: "导入插件方式",
                                                content: (
                                                    <>
                                                        <div style={{width: 800}}>
                                                            <LoadYakitPluginForm onFinished={refresh} />
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
                        </>
                    }
                    size={"small"}
                >
                    {(plugSource === "online" && <YakModuleOnlineList />) || (
                        <YakModuleList
                            currentId={script?.Id}
                            Keyword={keyword}
                            Type={pluginType}
                            onClicked={setScript}
                            trigger={trigger}
                            isHistory={history}
                            isIgnored={ignored}
                        />
                    )}
                </AutoCard>
            </div>
            <div style={{flex: 1, overflowX: "hidden"}}>
                {script ? (
                    <AutoCard
                        loading={loading}
                        title={
                            <Space>
                                <div>Yak[{script?.Type}] 模块详情</div>
                            </Space>
                        }
                        bordered={false}
                        size={"small"}
                    >
                        <PluginOperator
                            yakScriptId={script.Id}
                            setTrigger={() => setTrigger(!trigger)}
                            setScript={setScript}
                        />
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
}

export const YakModuleList: React.FC<YakModuleListProp> = (props) => {
    // 全局登录状态
    const {userInfo} = useStore()
    const [params, setParams] = useState<QueryYakScriptRequest>({
        IsHistory: props.isHistory,
        Keyword: props.Keyword,
        Pagination: {Limit: 15, Order: "desc", Page: 1, OrderBy: "updated_at"},
        Type: props.Type,
        IsIgnore: props.isIgnored
    })
    const [loading, setLoading] = useState(false)

    const [response, setResponse] = useState<QueryYakScriptsResponse>({
        Data: [],
        Pagination: {
            Limit: 10,
            Page: 1,
            Order: "desc",
            OrderBy: "updated_at"
        },
        Total: 0
    })
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
            .then((data) => {
                setResponse(data)
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
    const [hasMore, setHasMore] = useState<boolean>(false)
    const loadMoreData = useMemoizedFn(() => {
        console.log("response", response)
    })
    return (
        <div id='scroll-div-plugin'>
            {/* @ts-ignore */}
            <InfiniteScroll
                dataLength={response.Total || 0}
                key={response.Pagination.Page || 1}
                next={loadMoreData}
                hasMore={true}
                // hasMore={hasMore}
                loader={<div className="loading"><LoadingOutlined/></div>>}
                endMessage={response.Total > 0 && <div className='no-more-text'>暂无更多数据</div>}
                scrollableTarget='scroll-div-plugin'
            >
                <List<YakScript>
                    loading={loading}
                    style={{width: "100%", marginBottom: 16}}
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
            {/* <ReactResizeDetector
                onResize={(width, height) => {
                    if (!width || !height) return
                    setMaxWidth(width - 126)
                }}
                handleWidth={true}
                handleHeight={true}
                refreshMode={"debounce"}
                refreshRate={50}
            /> */}
            {/* <List<YakScript>
                loading={loading}
                style={{width: "100%", height: 200, marginBottom: 16}}
                dataSource={response.Data}
                split={false}
                pagination={{
                    size: "small",
                    pageSize: response.Pagination.Limit || 10,
                    total: response.Total,
                    showSizeChanger: true,
                    defaultPageSize: 10,
                    showTotal: (i) => <Tag>Total:{i}</Tag>,
                    onChange: (page, size) => {
                        update(page, size, props.Keyword, props.Type, props.isIgnored, props.isHistory)
                    },
                    onShowSizeChange: (current, size) => {
                        update(1, size, props.Keyword, props.Type, props.isIgnored, props.isHistory)
                    }
                }}
                renderItem={(i: YakScript) => {
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
            /> */}
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
    const {plugin, userInfo, maxWidth} = props
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
                        // ipcRenderer.invoke("delete-yak-script", item.Id).then(()=>{console.log('删除成功')}).catch((err) => {
                        //     failed("删除本地失败:" + err)
                        // })
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
                <Space>
                    <div title={plugin.ScriptName}>{plugin.ScriptName}</div>
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
                        <div style={{width: "100%", textAlign: "right", color: "#888888"}}>TAG:{plugin.Tags}</div>
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
                            // OnlineID: id,
                            UUID: localId
                        } as DownloadOnlinePluginProps)
                        .then(() => {
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

const AddAllPlugin: React.FC = () => {
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
        setAddLoading(true)
        ipcRenderer.invoke("DownloadOnlinePluginAll", {isAddToken: true, BindMe: false}, taskToken).catch((e) => {
            failed(`添加失败:${e}`)
        })
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
                    停止添加
                </Button>
            ) : (
                <Button className='filter-opt-btn' size='small' type='primary' onClick={AddAllPlugin}>
                    全部添加
                </Button>
            )}
        </>
    )
}

export interface StarsOperation {
    id: number
    operation: string
}

const YakModuleOnlineList: React.FC = () => {
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
    const [pluginInfo, setPluginInfo] = useState<API.YakitPluginDetail>()
    const [index, setIndex] = useState<number>(-1)
    const [hasMore, setHasMore] = useState(false)
    // 全局登录状态
    const {userInfo} = useStore()
    useEffect(() => {
        setIsAdmin(userInfo.role === "admin")
    }, [userInfo.role])
    const loadMoreData = useMemoizedFn(() => {})
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
        <div id='scroll-div-plugin-online'>
            {/* @ts-ignore */}
            <InfiniteScroll
                dataLength={response?.pagemeta?.total || 0}
                key={response?.pagemeta?.page || 1}
                next={loadMoreData}
                hasMore={true}
                // hasMore={hasMore}
                // loader={<Skeleton avatar paragraph={{rows: 1}} active />}
                endMessage={response?.pagemeta?.total > 0 && <div className='no-more-text'>暂无更多数据</div>}
                scrollableTarget='scroll-div-plugin-online'
            >
                <List<API.YakitPluginDetail>
                    loading={loading}
                    style={{width: "100%", marginBottom: 16}}
                    dataSource={response.data || []}
                    split={false}
                    renderItem={(i: API.YakitPluginDetail, index: number) => {
                        return (
                            <List.Item style={{marginLeft: 0}} key={i.id}>
                                <PluginItemOnline
                                    index={index}
                                    isAdmin={isAdmin}
                                    info={i}
                                    onClick={(info) => {
                                        setPluginInfo(info)
                                        setIndex(index)
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
    isAdmin: boolean
    info: API.YakitPluginDetail
    onClick: (info: API.YakitPluginDetail) => any
    onDownload: (info: API.YakitPluginDetail, callback) => any
    onStarred: (info: API.YakitPluginDetail) => any
}

export const RandomTagColor: string[] = [
    "color-bgColor-orange",
    "color-bgColor-purple",
    "color-bgColor-blue",
    "color-bgColor-green",
    "color-bgColor-red"
]

const PluginItemOnline = memo((props: PluginListOptProps) => {
    const [loading, setLoading] = useState<boolean>(false)
    const {isAdmin, info, onClick, onDownload, onStarred, index} = props
    const tags: string[] = info.tags ? JSON.parse(info.tags) : []
    const tagList = useRef(null)

    const [flag, setFlag] = useState<number>(-1)

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
            bordered={false}
            bodyStyle={{padding: 0, border: "1px solid #EFF1F5", borderRadius: "4px"}}
            onClick={() => onClick(info)}
        >
            <div className='opt-info'>
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
                                        TagColor[["not", "success", "failed"][info.status]].split("|")[0]
                                    } vertical-center`}
                                >
                                    {TagColor[["not", "success", "failed"][info.status]].split("|")[1]}
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

                <div className='info-content'>
                    <div className='content-style content-ellipsis' title={info.content}>
                        {info.content}
                    </div>
                </div>

                <div ref={tagList} className='info-tag'>
                    {tags && tags.length !== 0 ? (
                        tags.map((item, index) => {
                            const tagClass = RandomTagColor[index]
                            if (flag !== -1 && index > flag) return ""
                            return (
                                (item && (
                                    <div key={`${info.id}-${item}`} className={`tag-text ${tagClass}`}>
                                        {item}
                                    </div>
                                )) || <div className='tag-empty'></div>
                            )
                        })
                    ) : (
                        <div className='tag-empty'></div>
                    )}
                </div>
            </div>

            <div className='opt-author horizontal-divide-aside' onClick={(e) => e.stopPropagation()}>
                <div className='author-left'>
                    <div className='left-pic vertical-center'>
                        <img src={info.head_img} className='left-pic-style' />
                    </div>
                    <div className='left-name vertical-center'>
                        <span className='left-name-style content-ellipsis' title={info.authors || "anonymous"}>
                            {info.authors || "anonymous"}
                        </span>
                    </div>
                </div>

                <div className='author-right hover-active'>
                    <div className='vertical-center ' onClick={(e) => onStarred(info)}>
                        {info.is_stars ? (
                            <StarFilled className='solid-star' />
                        ) : (
                            <StarOutlined className='empty-star hover-active' />
                        )}
                    </div>
                    <div
                        className={`stars-number vertical-center hover-active ${
                            info.is_stars && "stars-number-active"
                        }`}
                    >
                        {numeral(info.stars).format("0,0")}
                    </div>
                </div>
            </div>
        </Card>
    )
})
