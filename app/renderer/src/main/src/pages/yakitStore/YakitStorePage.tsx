import React, {useEffect, useState} from "react"
import {Button, Card, Col, Empty, Form, Input, List, Popover, Row, Space, Tag, Tooltip} from "antd"
import {
    DownloadOutlined,
    PlusOutlined,
    ReloadOutlined,
    SearchOutlined,
    SettingOutlined,
    GithubOutlined
} from "@ant-design/icons"
import {showDrawer, showModal} from "../../utils/showModal"
import {AutoUpdateYakModuleViewer, startExecYakCode} from "../../utils/basic"
import {QueryYakScriptRequest, QueryYakScriptsResponse, YakScript} from "../invoker/schema"
import {failed} from "../../utils/notification"
import {CopyableField, InputItem, ManySelectOne, SelectOne, SwitchItem} from "../../utils/inputUtil"
import {formatDate} from "../../utils/timeUtil"
import {PluginManagement, PluginOperator} from "./PluginOperator"
import {YakScriptCreatorForm} from "../invoker/YakScriptCreator"
import {startExecuteYakScript} from "../invoker/ExecYakScript"
import {YakExecutorParam} from "../invoker/YakExecutorParams"
import {AutoCard} from "../../components/AutoCard"

import "./YakitStorePage.css"
import {getValue, saveValue} from "../../utils/kv";
import {useMemoizedFn} from "ahooks";

const {ipcRenderer} = window.require("electron")

export interface YakitStorePageProp {
}

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
    const [localPluginDir, setLocalPluginDir] = useState("");
    const [pluginType, setPluginType] = useState<"yak" | "mitm" | "nuclei" | "codec" | "packet-hack" | "port-scan" >("yak");

    useEffect(() => {
        getValue(YAKIT_DEFAULT_LOAD_LOCAL_PATH).then(e => {
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
                                    {text: "YAML POC", value: "nuclei"},
                                ]}
                                value={pluginType} setValue={setPluginType}
                                formItemStyle={{marginBottom: 0, width: 115}}
                            />
                            <Button size={"small"} type={"link"} onClick={(e) => setTrigger(!trigger)}>
                                <ReloadOutlined/>
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
                                <SearchOutlined/>
                            </Button>
                        </Space>
                    }
                    size={"small"}
                    extra={
                        <Space size={1}>
                            <Popover
                                title={"额外设置"}
                                content={<>
                                    <Form onSubmitCapture={e => {
                                        e.preventDefault()

                                        saveValue(YAKIT_DEFAULT_LOAD_LOCAL_PATH, localPluginDir)
                                    }} size={"small"}>
                                        <InputItem
                                            label={"本地插件仓库"} value={localPluginDir} setValue={setLocalPluginDir}
                                            extraFormItemProps={{style: {marginBottom: 4}}}
                                        />
                                        <Form.Item colon={false} label={" "} style={{marginBottom: 12}}>
                                            <Button type="primary" htmlType="submit"> 设置 </Button>
                                        </Form.Item>
                                    </Form>
                                </>}
                                trigger={["click"]}
                            >
                                <Button
                                    icon={<SettingOutlined/>} size={"small"} type={"link"}
                                    style={{marginRight: 3}}
                                />
                            </Popover>
                            <Button
                                size={"small"}
                                type={"primary"}
                                icon={<DownloadOutlined/>}
                                onClick={() => {
                                    showModal({
                                        width: 700,
                                        title: "导入插件方式",
                                        content: (
                                            <>
                                                <div style={{width: 600}}>
                                                    <LoadYakitPluginForm onFinished={refresh}/>
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
                                icon={<PlusOutlined/>}
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
                        <PluginOperator yakScriptId={script.Id} setTrigger={() => setTrigger(!trigger)}
                                        setScript={setScript}/>
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
    onYakScriptRender?: (i: YakScript) => any
}

export const YakModuleList: React.FC<YakModuleListProp> = (props) => {
    const [params, setParams] = useState<QueryYakScriptRequest>({
        IsHistory: props.isHistory,
        Keyword: props.Keyword,
        Pagination: {Limit: 10, Order: "desc", Page: 1, OrderBy: "updated_at"},
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
    }, [props.trigger, props.Keyword, props.Type, props.isHistory, props.isIgnored, trigger])

    return (
        <List<YakScript>
            loading={loading}
            style={{width: "100%", height: 200, marginBottom: 16}}
            dataSource={response.Data}
            split={false}
            pagination={{
                size: "small",
                pageSize: response.Pagination.Limit || 10,
                total: response.Total,
                showTotal: (i) => <Tag>Total:{i}</Tag>,
                onChange: (page, size) => {
                    update(page, size, props.Keyword, props.Type, props.isIgnored, props.isHistory)
                }
            }}
            renderItem={(i: YakScript) => {
                let isAnonymous = false
                if (i.Author === "" || i.Author === "anonymous") {
                    isAnonymous = true
                }

                if (props.onYakScriptRender) {
                    return props.onYakScriptRender(i)
                }

                return (
                    <List.Item style={{marginLeft: 0}} key={i.Id}>
                        <Card
                            size={"small"}
                            bordered={true}
                            hoverable={true}
                            title={
                                <Space>
                                    <div>{i.ScriptName}</div>
                                    {gitUrlIcon(i.FromGit)}
                                </Space>
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
                                        <Tag color={isAnonymous ? "gray" : "geekblue"}>{i.Author || "anonymous"}</Tag>
                                    </Space>
                                </Col>
                                <Col span={12} style={{textAlign: "right"}}>
                                    <Space size={2}>
                                        <CopyableField noCopy={true} text={formatDate(i.CreatedAt)}/>
                                        {gitUrlIcon(i.FromGit, true)}
                                    </Space>
                                </Col>
                            </Row>
                        </Card>
                    </List.Item>
                )
            }}
        />
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
                <SwitchItem label={"查看历史记录"} value={history} setValue={setHistory}/>
                <SwitchItem label={"查看已忽略/隐藏的插件"} value={ignored} setValue={setIgnored}/>
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

const loadYakitPluginCode = `yakit.AutoInitYakit()
log.setLevel("info")

gitUrl = cli.String("giturl")
proxy = cli.String("proxy")

yakit.Info("检查导入插件参数")
if gitUrl == "" {
    yakit.Error("插件仓库为空")
    die("empty giturl")
}
yakit.Info("准备导入 yak 插件：%v", gitUrl)


if proxy != "" {
    yakit.Info("使用代理: %v", proxy)
    log.Info("proxy: %v", proxy)
    err := yakit.UpdateYakitStoreFromGit(context.Background(), gitUrl, proxy)
    if err != nil {
        yakit.Error("加载远程 URL 失败：%v", err)
        die(err)
    }
} else{
    yakit.Info("未使用代理")
    err = yakit.UpdateYakitStoreFromGit(context.Background(), gitUrl)
    if err != nil {
        yakit.Error("加载远程 URL 失败：%v", err)
        die(err)
    }
}

yakit.Output("导入插件成功")
`

const YAKIT_DEFAULT_LOAD_GIT_PROXY = "YAKIT_DEFAULT_LOAD_GIT_PROXY";
const YAKIT_DEFAULT_LOAD_LOCAL_PATH = "YAKIT_DEFAULT_LOAD_LOCAL_PATH";

export const LoadYakitPluginForm = React.memo((p: { onFinished: () => any }) => {
    const [gitUrl, setGitUrl] = useState("")
    const [proxy, setProxy] = useState("")
    const [loadMode, setLoadMode] = useState<"official" | "giturl" | "local">("official")
    const [localPath, setLocalPath] = useState("");

    useEffect(() => {
        getValue(YAKIT_DEFAULT_LOAD_LOCAL_PATH).then(e => {
            if (e) {
                setLocalPath(e)
            }
        })
    }, [])

    useEffect(() => {
        if (loadMode === "official") {
            setGitUrl("https://github.com/yaklang/yakit-store")
        }
    }, [loadMode])

    useEffect(() => {
        getValue(YAKIT_DEFAULT_LOAD_GIT_PROXY).then(e => {
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
            wrapperCol={{span: 14}}
            onSubmitCapture={(e) => {
                e.preventDefault()

                if (proxy !== "") {
                    saveValue(YAKIT_DEFAULT_LOAD_GIT_PROXY, proxy)
                }

                if (localPath !== "") {
                    saveValue(YAKIT_DEFAULT_LOAD_LOCAL_PATH, localPath)
                }

                if (["official", "giturl"].includes(loadMode)) {
                    const params: YakExecutorParam[] = [{Key: "giturl", Value: gitUrl}]
                    if (proxy.trim() !== "") {
                        params.push({Value: proxy.trim(), Key: "proxy"})
                    }
                    startExecYakCode("导入 Yak 插件", {
                        Script: loadYakitPluginCode,
                        Params: params
                    })
                } else {
                    startExecYakCode("导入 Yak 插件（本地）", {
                        Script: loadLocalYakitPluginCode,
                        Params: [{Key: "local-path", Value: localPath}]
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
                ]}
                value={loadMode}
                setValue={setLoadMode}
            />
            {["official", "giturl"].includes(loadMode) && <>
                <InputItem
                    disable={loadMode === "official"}
                    required={true}
                    label={"Git 仓库"}
                    value={gitUrl}
                    setValue={setGitUrl}
                    help={"例如 https://github.com/yaklang/yakit-store"}
                />
                <InputItem label={"代理"} value={proxy} setValue={setProxy} help={"访问中国大陆无法访问的代码仓库"}/>
            </>}
            {loadMode === "local" && <>
                <InputItem label={"本地仓库地址"} value={localPath} setValue={setLocalPath}/>
            </>}
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
                icon={<GithubOutlined/>}
            />
        </Tooltip>
    )
}
