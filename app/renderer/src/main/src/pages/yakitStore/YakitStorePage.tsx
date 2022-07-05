import React, {useEffect, useState} from "react"
import {Alert, Button, Card, Col, Empty, Form, Input, List, Popconfirm, Popover, Row, Space, Tag, Tooltip} from "antd"
import {
    DownloadOutlined,
    PlusOutlined,
    ReloadOutlined,
    SearchOutlined,
    SettingOutlined,
    GithubOutlined,
    UploadOutlined,
    LoadingOutlined,
    DeleteOutlined
} from "@ant-design/icons"
import {showDrawer, showModal} from "../../utils/showModal"
import {AutoUpdateYakModuleViewer, startExecYakCode} from "../../utils/basic"
import {QueryYakScriptRequest, QueryYakScriptsResponse, YakScript, YakScriptParam} from "../invoker/schema"
import {failed, success, warn} from "../../utils/notification"
import {CopyableField, InputItem, ManySelectOne, SelectOne, SwitchItem} from "../../utils/inputUtil"
import {formatDate} from "../../utils/timeUtil"
import {PluginManagement, PluginOperator} from "./PluginOperator"
import {YakScriptCreatorForm} from "../invoker/YakScriptCreator"
import {startExecuteYakScript} from "../invoker/ExecYakScript"
import {YakExecutorParam} from "../invoker/YakExecutorParams"
import {AutoCard} from "../../components/AutoCard"
import ReactResizeDetector from "react-resize-detector"
import {useStore} from "@/store"
import "./YakitStorePage.css"
import {getValue, saveValue} from "../../utils/kv"
import {useMemoizedFn} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"

const {ipcRenderer} = window.require("electron")

export interface YakitStorePageProp {}

export const YakitStorePage: React.FC<YakitStorePageProp> = (props) => {
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

    return (
        <div style={{height: "100%", display: "flex", flexDirection: "row"}}>
            <div style={{width: 470}}>
                <AutoCard
                    bodyStyle={{padding: 0, overflow: "auto"}}
                    bordered={false}
                    style={{height: "100%"}}
                    title={
                        <Space size={0}>
                            类型：
                            <ManySelectOne
                                size={"small"}
                                data={[
                                    {text: "YAK 插件", value: "yak"},
                                    {text: "MITM 插件", value: "mitm"},
                                    {text: "数据包扫描", value: "packet-hack"},
                                    {text: "端口扫描插件", value: "port-scan"},
                                    {text: "CODEC插件", value: "codec"},
                                    {text: "YAML POC", value: "nuclei"}
                                ]}
                                value={pluginType}
                                setValue={setPluginType}
                                formItemStyle={{marginBottom: 0, width: 115}}
                            />
                            <Button size={"small"} type={"link"} onClick={(e) => setTrigger(!trigger)}>
                                <ReloadOutlined />
                            </Button>
                            <Button
                                size={"small"}
                                type={"link"}
                                onClick={(e) => {
                                    let m = showModal({
                                        title: "设置 Keyword",
                                        content: (
                                            <>
                                                <KeywordSetter
                                                    defaultIgnore={ignored}
                                                    defaultHistory={history}
                                                    onFinished={(e, ignored, history) => {
                                                        setKeyword(e)
                                                        setIgnored(ignored)
                                                        setHistory(history)
                                                        m.destroy()
                                                    }}
                                                    defaultValue={keyword}
                                                />
                                            </>
                                        )
                                    })
                                }}
                            >
                                <SearchOutlined />
                            </Button>
                            <Popconfirm
                                title='是否删除本地所有插件?数据不可恢复'
                                onConfirm={() => onRemoveLocalPlugin()}
                            >
                                <Button size='small' type='link'>
                                    <DeleteOutlined />
                                </Button>
                            </Popconfirm>
                        </Space>
                    }
                    size={"small"}
                    extra={
                        <Space size={1}>
                            <Popover
                                title={"额外设置"}
                                content={
                                    <>
                                        <Form
                                            onSubmitCapture={(e) => {
                                                e.preventDefault()

                                                saveValue(YAKIT_DEFAULT_LOAD_LOCAL_PATH, localPluginDir)
                                            }}
                                            size={"small"}
                                        >
                                            <InputItem
                                                label={"本地插件仓库"}
                                                value={localPluginDir}
                                                setValue={setLocalPluginDir}
                                                extraFormItemProps={{style: {marginBottom: 4}}}
                                            />
                                            <Form.Item colon={false} label={" "} style={{marginBottom: 12}}>
                                                <Button type='primary' htmlType='submit'>
                                                    {" "}
                                                    设置{" "}
                                                </Button>
                                            </Form.Item>
                                        </Form>
                                    </>
                                }
                                trigger={["click"]}
                            >
                                <Button
                                    icon={<SettingOutlined />}
                                    size={"small"}
                                    type={"link"}
                                    style={{marginRight: 3}}
                                />
                            </Popover>
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
                            {/*<Popconfirm*/}
                            {/*    title={"更新模块数据库？"}*/}
                            {/*    onConfirm={e => {*/}
                            {/*        showModal({*/}
                            {/*            title: "自动更新 Yak 模块", content: <>*/}
                            {/*                <AutoUpdateYakModuleViewer/>*/}
                            {/*            </>, width: "60%",*/}
                            {/*        })*/}
                            {/*    }}*/}
                            {/*>*/}
                            {/*    <Button size={"small"} type={"primary"} icon={<DownloadOutlined/>}>*/}
                            {/*        导入*/}
                            {/*    </Button>*/}
                            {/*</Popconfirm>*/}
                            <Button
                                size={"small"}
                                type={"link"}
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
                                新插件
                            </Button>
                        </Space>
                    }
                >
                    <YakModuleList
                        currentId={script?.Id}
                        Keyword={keyword}
                        Type={pluginType}
                        onClicked={setScript}
                        trigger={trigger}
                        isHistory={history}
                        isIgnored={ignored}
                    />
                    {/*<Tabs*/}
                    {/*    className='yak-store-list'*/}
                    {/*    tabPosition={"left"}*/}
                    {/*    size={"small"}*/}
                    {/*    tabBarStyle={{*/}
                    {/*        padding: 0,*/}
                    {/*        margin: 0,*/}
                    {/*        width: 70,*/}
                    {/*        marginLeft: -20*/}
                    {/*    }}*/}
                    {/*    direction={"ltr"}*/}
                    {/*>*/}
                    {/*    {[*/}
                    {/*        {tab: "YAK", key: "yak"},*/}
                    {/*        {tab: "YAML", key: "nuclei"},*/}
                    {/*        {tab: "MITM", key: "mitm"},*/}
                    {/*        {tab: "Packet", key: "packet-hack"},*/}
                    {/*        {tab: "CODEC", key: "codec"},*/}
                    {/*    ].map((e) => {*/}
                    {/*        return (*/}
                    {/*            <Tabs.TabPane tab={e.tab} key={e.key}>*/}
                    {/*                <YakModuleList*/}
                    {/*                    currentId={script?.Id}*/}
                    {/*                    Keyword={keyword}*/}
                    {/*                    Type={e.key as any}*/}
                    {/*                    onClicked={setScript}*/}
                    {/*                    trigger={trigger}*/}
                    {/*                    isHistory={history}*/}
                    {/*                    isIgnored={ignored}*/}
                    {/*                />*/}
                    {/*            </Tabs.TabPane>*/}
                    {/*        )*/}
                    {/*    })}*/}
                    {/*</Tabs>*/}
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
    const [uploadLoading, setUploadLoading] = useState(false)
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
    const [currentPlugin, setCurrentPlugin] = useState<YakScript | null>()

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

    const uploadOnline = (item: YakScript) => {
        if (!userInfo.isLogin) {
            warn("未登录，请先登录!")
            return
        }
        const params: API.NewYakitPlugin = {
            // id: Number(item.Id),
            type: item.Type,
            script_name: item.ScriptName,
            // authors: item.Author,
            content: item.Content,
            tags: [item.Tags],
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
            default_open: false
        }
        setCurrentPlugin(item)
        setUploadLoading(true)
        NetWorkApi<API.NewYakitPlugin, API.ActionSucceeded>({
            method: "post",
            url: "yakit/plugin",
            data: params
        })
            .then((res) => {
                if (res.ok) {
                    success("插件上传成功")
                    setCurrentPlugin(null)
                }
            })
            .catch((err) => {
                failed("插件上传失败:" + err)
            })
            .finally(() => {
                setTimeout(() => setUploadLoading(false), 200)
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
    return (
        <div>
            <ReactResizeDetector
                onResize={(width, height) => {
                    if (!width || !height) return
                    setMaxWidth(width - 126)
                }}
                handleWidth={true}
                handleHeight={true}
                refreshMode={"debounce"}
                refreshRate={50}
            />
            <List<YakScript>
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
                    let isAnonymous = false
                    if (i.Author === "" || i.Author === "anonymous") {
                        isAnonymous = true
                    }

                    if (props.onYakScriptRender) {
                        return props.onYakScriptRender(i, maxWidth)
                    }

                    return (
                        <List.Item style={{marginLeft: 0}} key={i.Id}>
                            <Card
                                size={"small"}
                                bordered={true}
                                hoverable={true}
                                title={
                                    <Space>
                                        <div title={i.ScriptName}>{i.ScriptName}</div>
                                        {gitUrlIcon(i.FromGit)}
                                    </Space>
                                }
                                extra={
                                    (currentPlugin?.Id === i.Id && uploadLoading && <LoadingOutlined />) || (
                                        <UploadOutlined
                                            style={{marginLeft: 6, fontSize: 16, cursor: "pointer"}}
                                            onClick={() => uploadOnline(i)}
                                        />
                                    )
                                }
                                style={{
                                    width: "100%",
                                    backgroundColor: props.currentId === i.Id ? "rgba(79,188,255,0.26)" : "#fff"
                                }}
                                onClick={() => props.onClicked(i)}
                            >
                                <Row>
                                    <Col span={24}>
                                        <CopyableField
                                            style={{width: 430, color: "#5f5f5f", marginBottom: 5}}
                                            text={i.Help || "No Description about it."}
                                            noCopy={true}
                                        />
                                    </Col>
                                </Row>
                                <Row style={{marginBottom: 4}}>
                                    {i.Tags && (
                                        <Col span={24}>
                                            <div style={{width: "100%", textAlign: "right", color: "#888888"}}>
                                                {/*{(i.Tags.split(",")).map(word => {*/}
                                                {/*    return <Tag>{word}</Tag>*/}
                                                {/*})}*/}
                                                TAG:{i.Tags}
                                            </div>
                                        </Col>
                                    )}
                                </Row>
                                <Row>
                                    <Col span={12}>
                                        <Space style={{width: "100%"}}>
                                            <Tag color={isAnonymous ? "gray" : "geekblue"}>
                                                {i.Author || "anonymous"}
                                            </Tag>
                                        </Space>
                                    </Col>
                                    <Col span={12} style={{textAlign: "right"}}>
                                        <Space size={2}>
                                            <CopyableField noCopy={true} text={formatDate(i.CreatedAt)} />
                                            {gitUrlIcon(i.FromGit, true)}
                                        </Space>
                                    </Col>
                                </Row>
                            </Card>
                        </List.Item>
                    )
                }}
            />
        </div>
    )
}

interface KeywordSetterProp {
    onFinished: (s: string, ignored: boolean, history: boolean) => any
    defaultValue: string
    defaultIgnore: boolean
    defaultHistory: boolean
}

const KeywordSetter: React.FC<KeywordSetterProp> = (props) => {
    const [keyword, setKeyword] = useState(props.defaultValue)
    const [ignored, setIgnored] = useState(props.defaultIgnore)
    const [history, setHistory] = useState(props.defaultHistory)

    return (
        <div>
            <Form
                onSubmitCapture={(e) => {
                    e.preventDefault()

                    props.onFinished(keyword, ignored, history)
                }}
                layout={"vertical"}
                style={{
                    marginLeft: 10,
                    marginTop: 6
                }}
            >
                <Form.Item label={"插件关键字"}>
                    <Input
                        value={keyword}
                        onChange={(e) => {
                            setKeyword(e.target.value)
                        }}
                    />
                </Form.Item>
                <SwitchItem label={"查看历史记录"} value={history} setValue={setHistory} />
                <SwitchItem label={"查看已忽略/隐藏的插件"} value={ignored} setValue={setIgnored} />
                <Form.Item>
                    <Button type='primary' htmlType='submit'>
                        {" "}
                        Search{" "}
                    </Button>
                </Form.Item>
            </Form>
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
                        {Key: "giturl", Value: gitUrl},
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
                    <InputItem
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
                    />
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
