import React, {useEffect, useState} from "react"
import {
    Button,
    Card,
    Col,
    Divider,
    Form,
    Input,
    Modal,
    notification,
    Result,
    Row,
    Space,
    Spin,
    Tag,
    Typography,
    Dropdown,
    Menu,
    Popover
} from "antd"
import {HTTPPacketEditor, IMonacoEditor} from "../../utils/editors"
import {showDrawer, showModal} from "../../utils/showModal"
import {fuzzerTemplates} from "./fuzzerTemplates"
import {StringFuzzer} from "./StringFuzzer"
import {InputFloat, InputInteger, InputItem, ManyMultiSelectForString, OneLine, SwitchItem} from "../../utils/inputUtil"
import {fixEncoding} from "../../utils/convertor"
import {FuzzerResponseToHTTPFlowDetail} from "../../components/HTTPFlowDetail"
import {randomString} from "../../utils/randomUtil"
import {
    ColumnWidthOutlined,
    DeleteOutlined,
    ProfileOutlined,
    LeftOutlined,
    RightOutlined,
    DownOutlined,
    HistoryOutlined,
    DownloadOutlined
} from "@ant-design/icons"
import {HTTPFuzzerResultsCard} from "./HTTPFuzzerResultsCard"
import {failed, success} from "../../utils/notification"
import {AutoSpin} from "../../components/AutoSpin"
import {ResizeBox} from "../../components/ResizeBox"
import {useMemoizedFn} from "ahooks";
import {getValue, saveValue} from "../../utils/kv";
import {HTTPFuzzerHistorySelector} from "./HTTPFuzzerHistory";

const {ipcRenderer} = window.require("electron")

export const analyzeFuzzerResponse = 
    (
        i: FuzzerResponse, 
        setRequest: (isHttps: boolean, request: string) => any, 
        sendToPlugin?: (request: Uint8Array, isHTTPS: boolean, response?: Uint8Array) => any, 
        index?: number, 
        data?: FuzzerResponse[]
        ) => {
            let m = showDrawer({
                width: "90%",
                content: (
                    <>
                        <FuzzerResponseToHTTPFlowDetail
                            response={i}
                            sendToWebFuzzer={(isHttps, request) => {
                                setRequest(isHttps, request)
                                m.destroy()
                            }}
                            sendToPlugin={(request, isHTTPS, response) => {
                                if (sendToPlugin) sendToPlugin(request, isHTTPS, response)
                                m.destroy()
                            }}
                            onClosed={() => {
                                m.destroy()
                            }}
                            index={index}
                            data={data}
                        />
                    </>
                )
            })
}

export interface HTTPFuzzerPageProp {
    isHttps?: boolean
    request?: string
    system?: string
    onSendToWebFuzzer?: (isHttps: boolean, request: string) => any
    sendToPlugin?: (request: Uint8Array, isHTTPS: boolean, response?: Uint8Array) => any
}

const {Text} = Typography

export interface FuzzerResponse {
    Method: string
    StatusCode: number
    Host: string
    ContentType: string
    Headers: { Header: string; Value: string }[]
    ResponseRaw: Uint8Array
    RequestRaw: Uint8Array
    BodyLength: number
    UUID: string
    Timestamp: number
    DurationMs: number

    Ok: boolean
    Reason: string
    Payloads?: string[]

    IsHttps?: boolean
    Count?: number

    HeaderSimilarity?: number
    BodySimilarity?: number
}

const defaultPostTemplate = `POST / HTTP/1.1
Content-Type: application/json
Host: www.example.com

{"key": "value"}`

const WEB_FUZZ_PROXY = "WEB_FUZZ_PROXY"

interface HistoryHTTPFuzzerTask {
    Request: string
    Proxy: string
    IsHTTPS: boolean
}

export const HTTPFuzzerPage: React.FC<HTTPFuzzerPageProp> = (props) => {
    // params
    const [isHttps, setIsHttps] = useState(props.isHttps || false)
    const [request, setRequest] = useState(props.request || defaultPostTemplate)
    const [concurrent, setConcurrent] = useState(20)
    const [forceFuzz, setForceFuzz] = useState(true)
    const [timeout, setParamTimeout] = useState(5.0)
    const [proxy, setProxy] = useState("")
    const [actualHost, setActualHost] = useState("")
    const [advancedConfig, setAdvancedConfig] = useState(false)
    const [redirectedResponse, setRedirectedResponse] = useState<FuzzerResponse>()
    const [historyTask, setHistoryTask] = useState<HistoryHTTPFuzzerTask>();

    // state
    const [loading, setLoading] = useState(false)
    const [content, setContent] = useState<FuzzerResponse[]>([])
    const [reqEditor, setReqEditor] = useState<IMonacoEditor>()
    const [fuzzToken, setFuzzToken] = useState("")
    const [search, setSearch] = useState("")
    const [targetUrl, setTargetUrl] = useState("")

    const [viewMode, setViewMode] = useState<"split" | "request" | "result">("split")
    const [refreshTrigger, setRefreshTrigger] = useState(false)
    const refreshRequest = () => {
        setRefreshTrigger(!refreshTrigger)
    }

    // history
    const [history, setHistory] = useState<string[]>([])
    const [currentHistoryIndex, setCurrentHistoryIndex] = useState<number>()

    const [urlPacketShow, setUrlPacketShow] = useState<boolean>(false)

    // filter
    const [keyword, setKeyword] = useState<string>("")
    const [filterContent, setFilterContent] = useState<FuzzerResponse[]>([])
    const [timer, setTimer] = useState<any>()

    const withdrawRequest = useMemoizedFn(() => {
        const targetIndex = history.indexOf(request) - 1
        if (targetIndex >= 0) {
            setRequest(history[targetIndex])
            setCurrentHistoryIndex(targetIndex)
        }
    })
    const forwardRequest = useMemoizedFn(() => {
        const targetIndex = history.indexOf(request) + 1
        if (targetIndex < history.length) {
            setCurrentHistoryIndex(targetIndex)
            setRequest(history[targetIndex])
        }
    })

    // 从历史记录中恢复
    useEffect(() => {
        if (!historyTask) {
            return
        }

        setRequest(historyTask.Request)
        setIsHttps(historyTask.IsHTTPS)
        setProxy(historyTask.Proxy)
        refreshRequest()
    }, [historyTask])

    useEffect(() => {
        // 缓存全局参数
        getValue(WEB_FUZZ_PROXY).then(e => {
            if (!e) {
                return
            }
            setProxy(`${e}`)
        })

    }, [])

    useEffect(() => {
        if (currentHistoryIndex === undefined) {
            return
        }
        refreshRequest()
    }, [currentHistoryIndex])

    useEffect(() => {
        setIsHttps(!!props.isHttps)
        if (props.request) {
            setRequest(props.request)
            setContent([])
        }
    }, [props.isHttps, props.request])

    const loadHistory = useMemoizedFn((id: number) => {
        setLoading(true)
        setHistory([])
        ipcRenderer.invoke(
            "HTTPFuzzer",
            {HistoryWebFuzzerId: id}, fuzzToken
        ).then(() => {
            ipcRenderer.invoke("GetHistoryHTTPFuzzerTask", {Id: id}).then((data: { OriginRequest: HistoryHTTPFuzzerTask }) => {
                setHistoryTask(data.OriginRequest)
            })
        })
    })

    const submitToHTTPFuzzer = useMemoizedFn(() => {
        // 清楚历史任务的标记
        setHistoryTask(undefined);

        saveValue(WEB_FUZZ_PROXY, proxy)
        setLoading(true)
        if (history.includes(request)) {
            history.splice(history.indexOf(request), 1)
        }
        history.push(request)
        setHistory([...history])

        ipcRenderer.invoke(
            "HTTPFuzzer",
            {
                Request: request,
                ForceFuzz: forceFuzz,
                IsHTTPS: isHttps,
                Concurrent: concurrent,
                PerRequestTimeoutSeconds: timeout,
                Proxy: proxy,
                ActualAddr: actualHost
            },
            fuzzToken
        )
    })

    const cancelCurrentHTTPFuzzer = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-HTTPFuzzer", fuzzToken)
    })

    useEffect(() => {
        const token = randomString(60)
        setFuzzToken(token)

        const dataToken = `${token}-data`
        const errToken = `${token}-error`
        const endToken = `${token}-end`

        ipcRenderer.on(errToken, (e, details) => {
            notification["error"]({
                message: `提交模糊测试请求失败 ${details}`,
                placement: "bottomRight"
            })
        })
        let buffer: FuzzerResponse[] = []
        let count: number = 0
        const updateData = () => {
            if (buffer.length <= 0) {
                return
            }
            if(JSON.stringify(buffer) !== JSON.stringify(content)) setContent([...buffer])
        }
        ipcRenderer.on(dataToken, (e: any, data: any) => {
            const response = new Buffer(data.ResponseRaw).toString(fixEncoding(data.GuessResponseEncoding))

            buffer.push({ 
                StatusCode: data.StatusCode,
                Ok: data.Ok,
                Reason: data.Reason,
                Method: data.Method,
                Host: data.Host,
                ContentType: data.ContentType,
                Headers: (data.Headers || []).map((i: any) => {
                    return {Header: i.Header, Value: i.Value}
                }),
                DurationMs: data.DurationMs,
                BodyLength: data.BodyLength,
                UUID: data.UUID,
                Timestamp: data.Timestamp,
                ResponseRaw: data.ResponseRaw,
                RequestRaw: data.RequestRaw,
                Payloads: data.Payloads,
                isHttps: data.IsHTTPS,
                Count: count,
                BodySimilarity: data.BodySimilarity,
                HeaderSimilarity: data.HeaderSimilarity,
            } as FuzzerResponse)
            count++
            // setContent([...buffer])
        })
        ipcRenderer.on(endToken, () => {
            updateData()
            buffer = []
            count = 0
            setLoading(false)
        })

        const updateDataId = setInterval(() => {
            updateData()
        }, 1000)

        return () => {
            ipcRenderer.invoke("cancel-HTTPFuzzer", token)

            clearInterval(updateDataId)
            ipcRenderer.removeAllListeners(errToken)
            ipcRenderer.removeAllListeners(dataToken)
            ipcRenderer.removeAllListeners(endToken)
        }
    }, [])

    const searchContent = (keyword: string) => {
        if (timer) {
            clearTimeout(timer)
            setTimer(null)
        }
        setTimer(
            setTimeout(() => {
                try {
                    const filters = content.filter((item) => {
                        return Buffer.from(item.ResponseRaw).toString("utf8").match(new RegExp(keyword, "g"))
                    })
                    setFilterContent(filters)
                } catch (error) {}
            }, 500)
        )
    }

    const downloadContent = useMemoizedFn(()=>{
        if(!keyword){
            failed('请先输入需要搜索的关键词')
            return
        }

        const strs = []
        const reg = new RegExp(keyword)
        for(let info of filterContent){
            let str = Buffer.from(info.ResponseRaw).toString('utf8')
            let temp:any
            while((temp = reg.exec(str)) !== null){
                // @ts-ignore
                if(temp[1]){
                    // @ts-ignore
                    strs.push(temp[1])
                    str = str.substring(temp['index'] + 1)
                    reg.lastIndex = 0
                }
            }
        }

        ipcRenderer.invoke("show-save-dialog", 'fuzzer列表命中内容.txt').then((res) => {
            if (res.canceled) return

            ipcRenderer
                .invoke("write-file", {
                    route: res.filePath,
                    data: strs.join('\n\r')
                })
                .then(() => {
                    success('下载完成')
                })
        })
    })

    useEffect(() => {
        if(!!keyword){
            searchContent(keyword)
        }else{
            setFilterContent([])
        }
    }, [keyword])

    useEffect(() => {
        if(keyword && content.length !== 0){
            const filters = content.filter(item => {
                return Buffer.from(item.ResponseRaw).toString("utf8").match(new RegExp(keyword,'g'))
            })
            setFilterContent(filters)
        }
    }, [content])

    const onlyOneResponse = !loading && (content || []).length === 1

    const filtredResponses =
        search === ""
            ? content || []
            : (content || []).filter((i) => {
                return Buffer.from(i.ResponseRaw).toString().includes(search)
            })
    const successResults = filtredResponses.filter((i) => i.Ok)
    const failedResults = filtredResponses.filter((i) => !i.Ok)

    const responseViewer = useMemoizedFn((rsp: FuzzerResponse) => {
        return (
            <HTTPPacketEditor
                system={props.system}
                simpleMode={viewMode === "request"}
                originValue={rsp.ResponseRaw}
                bordered={true}
                hideSearch={true}
                emptyOr={
                    !rsp?.Ok && (
                        <Result
                            status={"error"}
                            title={"请求失败"}
                            // no such host
                            subTitle={(() => {
                                const reason = content[0]!.Reason
                                if (reason.includes("tcp: i/o timeout")) {
                                    return "网络超时"
                                }
                                if (reason.includes("no such host")) {
                                    return "DNS 错误或主机错误"
                                }
                                return undefined
                            })()}
                        >
                            <>详细原因：{rsp.Reason}</>
                        </Result>
                    )
                }
                readOnly={true}
                extra={
                    viewMode === "request" ? (
                        <Button
                            size={"small"}
                            type={"link"}
                            icon={<ColumnWidthOutlined/>}
                            onClick={() => {
                                setViewMode("result")
                            }}
                        />
                    ) : (
                        <Space>
                            {loading && <Spin size={"small"} spinning={loading}/>}
                            {onlyOneResponse ? (
                                <Space>
                                    {content[0].IsHttps && <Tag>{content[0].IsHttps ? "https" : ""}</Tag>}
                                    <Tag>{content[0].DurationMs}ms</Tag>
                                    <Space key='single'>
                                        <Button
                                            size={"small"}
                                            onClick={() => {
                                                analyzeFuzzerResponse(rsp, (bool, r) => {
                                                    setRequest(r)
                                                    refreshRequest()
                                                })
                                            }}
                                            type={"primary"}
                                            icon={<ProfileOutlined/>}
                                        >
                                            详情
                                        </Button>
                                        <Button
                                            type={"primary"}
                                            size={"small"}
                                            onClick={() => {
                                                setContent([])
                                            }}
                                            danger={true}
                                            icon={<DeleteOutlined/>}
                                        ></Button>
                                    </Space>
                                </Space>
                            ) : (
                                <Space key='list'>
                                    <Tag color={"green"}>成功:{successResults.length}</Tag>
                                    <Input
                                        size={"small"}
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value)
                                        }}
                                    />
                                    {/*<Tag>当前请求结果数[{(content || []).length}]</Tag>*/}
                                    <Button
                                        size={"small"}
                                        onClick={() => {
                                            setContent([])
                                        }}
                                    >
                                        清除数据
                                    </Button>
                                </Space>
                            )}
                            <Button
                                size={"small"}
                                type={viewMode === "result" ? "primary" : "link"}
                                icon={<ColumnWidthOutlined/>}
                                onClick={() => {
                                    if (viewMode === "result") {
                                        setViewMode("split")
                                    } else {
                                        setViewMode("result")
                                    }
                                }}
                            />
                        </Space>
                    )
                }
            />
        )
    })

    return (
        <div style={{height: "100%", width: "100%", display: "flex", flexDirection: "column", overflow: "hidden"}}>
            <Row gutter={8}>
                <Col span={24} style={{textAlign: "left"}}>
                    <Space>
                        {loading ? (
                            <Button
                                style={{width: 150}}
                                onClick={() => {
                                    cancelCurrentHTTPFuzzer()
                                }}
                                // size={"small"}
                                danger={true}
                                type={"primary"}
                            >
                                强制停止
                            </Button>
                        ) : (
                            <Button
                                style={{width: 150}}
                                onClick={() => {
                                    setContent([])
                                    setRedirectedResponse(undefined)
                                    submitToHTTPFuzzer()
                                }}
                                // size={"small"}
                                type={"primary"}
                            >
                                发送数据包
                            </Button>
                        )}
                        <Space>
                            <Button
                                onClick={() => {
                                    withdrawRequest()
                                }}
                                type={"link"}
                                icon={<LeftOutlined/>}
                            />
                            <Button
                                onClick={() => {
                                    forwardRequest()
                                }}
                                type={"link"}
                                icon={<RightOutlined/>}
                            />
                            {history.length > 1 && (
                                <Dropdown
                                    trigger={["click"]}
                                    overlay={() => {
                                        return (
                                            <Menu>
                                                {history.map((i, index) => {
                                                    return (
                                                        <Menu.Item
                                                            style={{width: 120}}
                                                            onClick={() => {
                                                                setRequest(i)
                                                                setCurrentHistoryIndex(index)
                                                            }}
                                                        >{`${index}`}</Menu.Item>
                                                    )
                                                })}
                                            </Menu>
                                        )
                                    }}
                                >
                                    <Button size={"small"} type={"link"} onClick={(e) => e.preventDefault()}>
                                        History <DownOutlined/>
                                    </Button>
                                </Dropdown>
                            )}
                        </Space>
                        <SwitchItem
                            label={"高级配置"}
                            formItemStyle={{marginBottom: 0}}
                            value={advancedConfig}
                            setValue={setAdvancedConfig}
                            size={"small"}
                        />
                        {onlyOneResponse && content[0].Ok && (
                            <Form.Item style={{marginBottom: 0}}>
                                <Button
                                    onClick={() => {
                                        setLoading(true)
                                        ipcRenderer
                                            .invoke("RedirectRequest", {
                                                Request: request,
                                                Response: new Buffer(content[0].ResponseRaw).toString("utf8"),
                                                IsHttps: isHttps,
                                                PerRequestTimeoutSeconds: timeout,
                                                Proxy: proxy
                                            })
                                            .then((rsp: FuzzerResponse) => {
                                                setRedirectedResponse(rsp)
                                            })
                                            .catch((e) => {
                                                failed(`"ERROR in: ${e}"`)
                                            })
                                            .finally(() => {
                                                setTimeout(() => setLoading(false), 300)
                                            })
                                    }}
                                >
                                    跟随重定向
                                </Button>
                            </Form.Item>
                        )}
                        {loading && (
                            <Space>
                                <Spin size={"small"}/>
                                <div style={{color: "#3a8be3"}}>sending packets</div>
                            </Space>
                        )}
                        {isHttps && <Tag>强制 HTTPS</Tag>}
                        {proxy && <Tag>代理：{proxy}</Tag>}
                        {/*<Popover*/}
                        {/*    trigger={"click"}*/}
                        {/*    content={*/}
                        {/*    }*/}
                        {/*>*/}
                        {/*    <Button type={"link"} size={"small"}>*/}
                        {/*        配置请求包*/}
                        {/*    </Button>*/}
                        {/*</Popover>*/}
                        {actualHost !== "" && <Tag color={"red"}>请求 Host:{actualHost}</Tag>}
                    </Space>
                </Col>
                {/*<Col span={12} style={{textAlign: "left"}}>*/}
                {/*</Col>*/}
            </Row>

            {advancedConfig && (
                <Row style={{marginTop: 8}} gutter={8}>
                    <Col span={16}>
                        {/*高级配置*/}
                        <Card bordered={true} size={"small"} bodyStyle={{height: 106}}>
                            <Spin style={{width: "100%"}} spinning={!reqEditor}>
                                <Form
                                    onSubmitCapture={(e) => e.preventDefault()}
                                    // layout={"horizontal"}
                                    size={"small"}
                                    // labelCol={{span: 8}}
                                    // wrapperCol={{span: 16}}
                                >
                                    <Row gutter={8}>
                                        <Col span={12} xl={8}>
                                            <Form.Item
                                                label={<OneLine width={68}>Intruder</OneLine>}
                                                style={{marginBottom: 4}}
                                            >
                                                <Button
                                                    style={{backgroundColor: "#08a701"}}
                                                    size={"small"}
                                                    type={"primary"}
                                                    onClick={() => {
                                                        const m = showModal({
                                                            width: "70%",
                                                            content: (
                                                                <>
                                                                    <StringFuzzer
                                                                        advanced={true}
                                                                        disableBasicMode={true}
                                                                        insertCallback={(template: string) => {
                                                                            if (!template) {
                                                                                Modal.warn({
                                                                                    title: "Payload 为空 / Fuzz 模版为空"
                                                                                })
                                                                            } else {
                                                                                if (reqEditor && template) {
                                                                                    reqEditor.trigger(
                                                                                        "keyboard",
                                                                                        "type",
                                                                                        {
                                                                                            text: template
                                                                                        }
                                                                                    )
                                                                                } else {
                                                                                    Modal.error({
                                                                                        title: "BUG: 编辑器失效"
                                                                                    })
                                                                                }
                                                                                m.destroy()
                                                                            }
                                                                        }}
                                                                    />
                                                                </>
                                                            )
                                                        })
                                                    }}
                                                >
                                                    插入 yak.fuzz 语法
                                                </Button>
                                            </Form.Item>
                                        </Col>
                                        <Col span={12} xl={8}>
                                            <SwitchItem
                                                label={<OneLine width={68}>渲染 fuzz</OneLine>}
                                                setValue={(e) => {
                                                    if (!e) {
                                                        Modal.confirm({
                                                            title: "确认关闭 Fuzz 功能吗？关闭之后，所有的 Fuzz 标签将会失效",
                                                            onOk: () => {
                                                                setForceFuzz(e)
                                                            }
                                                        })
                                                        return
                                                    }
                                                    setForceFuzz(e)
                                                }}
                                                size={"small"}
                                                value={forceFuzz}
                                                formItemStyle={{marginBottom: 4}}
                                            />
                                        </Col>
                                        <Col span={12} xl={8}>
                                            <InputInteger
                                                label={<OneLine width={68}>并发线程</OneLine>}
                                                size={"small"}
                                                setValue={(e) => {
                                                    setConcurrent(e)
                                                }}
                                                formItemStyle={{marginBottom: 4}} // width={40}
                                                width={50}
                                                value={concurrent}
                                            />
                                        </Col>
                                        <Col span={12} xl={8}>
                                            <SwitchItem
                                                label={<OneLine width={68}>HTTPS</OneLine>}
                                                setValue={(e) => {
                                                    setIsHttps(e)
                                                }}
                                                size={"small"}
                                                value={isHttps}
                                                formItemStyle={{marginBottom: 4}}
                                            />
                                        </Col>
                                        <Col span={12} xl={8}>
                                            <ManyMultiSelectForString
                                                formItemStyle={{marginBottom: 4}}
                                                label={<OneLine width={68}>设置代理</OneLine>}
                                                data={[
                                                    "http://127.0.0.1:7890",
                                                    "http://127.0.0.1:8080",
                                                    "http://127.0.0.1:8082"
                                                ].map((i) => {
                                                    return {label: i, value: i}
                                                })}
                                                mode={"tags"}
                                                defaultSep={","}
                                                value={proxy}
                                                setValue={(r) => {
                                                    setProxy(r.split(",").join(","))
                                                }}
                                            />
                                        </Col>
                                        <Col span={12} xl={8}>
                                            <InputItem
                                                extraFormItemProps={{
                                                    style: {marginBottom: 0}
                                                }}
                                                label={<OneLine width={68}>请求 Host</OneLine>}
                                                setValue={setActualHost}
                                                value={actualHost}
                                            />
                                        </Col>
                                        <Col span={12} xl={8}>
                                            <InputFloat
                                                formItemStyle={{marginBottom: 4}}
                                                size={"small"}
                                                label={<OneLine width={68}>超时时间</OneLine>}
                                                setValue={setParamTimeout}
                                                value={timeout}
                                            />
                                        </Col>
                                    </Row>
                                </Form>
                            </Spin>
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card bordered={true} size={"small"} bodyStyle={{height: 106}}>
                            <div style={{marginTop: 30, textAlign: "center"}}>
                                <p style={{color: "#888"}}>选择可用的漏洞插件（装修中）</p>
                            </div>
                        </Card>
                    </Col>
                </Row>
            )}
            <Divider style={{marginTop: 12, marginBottom: 4}}/>
            <ResizeBox
                style={{overflow: "hidden"}}
                firstNode={<HTTPPacketEditor
                    system={props.system}
                    simpleMode={viewMode === "result"}
                    refreshTrigger={refreshTrigger}
                    hideSearch={true}
                    bordered={true}
                    originValue={new Buffer(request)}
                    actions={[
                        {
                            id: "packet-from-url",
                            label: "URL转数据包",
                            contextMenuGroupId: "urlPacket",
                            run: () => {
                                setUrlPacketShow(true)
                            }
                        }
                    ]}
                    onEditor={setReqEditor}
                    onChange={(i) => setRequest(new Buffer(i).toString("utf8"))}
                    extra={
                        <Space>
                            <Popover
                                trigger={"click"}
                                title={"从 URL 加载数据包"}
                                content={
                                    <div style={{width: 400}}>
                                        <Form
                                            layout={"vertical"}
                                            onSubmitCapture={(e) => {
                                                e.preventDefault()

                                                ipcRenderer
                                                    .invoke("Codec", {
                                                        Type: "packet-from-url",
                                                        Text: targetUrl
                                                    })
                                                    .then((e) => {
                                                        if (e?.Result) {
                                                            setRequest(e.Result)
                                                            refreshRequest()
                                                        }
                                                    })
                                                    .finally(() => {
                                                    })
                                            }}
                                            size={"small"}
                                        >
                                            <InputItem
                                                label={"从 URL 构造请求"}
                                                value={targetUrl}
                                                setValue={setTargetUrl}
                                                extraFormItemProps={{style: {marginBottom: 8}}}
                                            ></InputItem>
                                            <Form.Item style={{marginBottom: 8}}>
                                                <Button type={"primary"} htmlType={"submit"}>
                                                    构造请求
                                                </Button>
                                            </Form.Item>
                                        </Form>
                                    </div>
                                }
                            >
                                <Button size={"small"} type={"primary"}>
                                    URL
                                </Button>
                            </Popover>
                            <Popover
                                trigger={"click"}
                                placement={"bottom"}
                                destroyTooltipOnHide={true}
                                content={
                                    <div style={{width: 400}}>
                                        <HTTPFuzzerHistorySelector onSelect={e => {
                                            loadHistory(e)
                                        }}/>
                                    </div>
                                }
                            >
                                <Button size={"small"} type={"primary"} icon={<HistoryOutlined/>}>
                                    历史
                                </Button>
                            </Popover>

                            {/*<Button*/}
                            {/*    size={"small"}*/}
                            {/*    type={viewMode === "request" ? "primary" : "link"}*/}
                            {/*    icon={<ColumnWidthOutlined/>}*/}
                            {/*    onClick={() => {*/}
                            {/*        if (viewMode === "request") {*/}
                            {/*            setViewMode("split")*/}
                            {/*        } else {*/}
                            {/*            setViewMode("request")*/}
                            {/*        }*/}
                            {/*    }}*/}
                            {/*/>*/}
                        </Space>
                    }
                />}
                secondNode={<AutoSpin spinning={false}>
                    {onlyOneResponse ? (
                        <>{redirectedResponse ? responseViewer(redirectedResponse) : responseViewer(content[0])}</>
                    ) : (
                        <>
                            {(content || []).length > 0 ? (
                                <HTTPFuzzerResultsCard
                                    onSendToWebFuzzer={props.onSendToWebFuzzer}
                                    sendToPlugin={props.sendToPlugin}
                                    setRequest={(r) => {
                                        setRequest(r)
                                        refreshRequest()
                                    }}
                                    extra={
                                        <div>
                                            <Input
                                                value={keyword}
                                                style={{maxWidth: 200}}
                                                allowClear
                                                placeholder="输入字符串或正则表达式"
                                                onChange={e => setKeyword(e.target.value)}
                                                addonAfter={
                                                        <DownloadOutlined style={{cursor: "pointer"}} onClick={downloadContent} />
                                                }></Input>
                                            <Button
                                                size={"small"}
                                                type={viewMode === "result" ? "primary" : "link"}
                                                icon={<ColumnWidthOutlined/>}
                                                onClick={() => {
                                                    if (viewMode === "result") {
                                                        setViewMode("split")
                                                    } else {
                                                        setViewMode("result")
                                                    }
                                                }}
                                            />
                                        </div>
                                    }
                                    failedResponses={failedResults}
                                    successResponses={filterContent.length !==0 ? filterContent : keyword ? [] : successResults}
                                />
                            ) : (
                                <Result
                                    status={"info"}
                                    title={"请在左边编辑并发送一个 HTTP 请求/模糊测试"}
                                    subTitle={
                                        "本栏结果针对模糊测试的多个 HTTP 请求结果展示做了优化，可以自动识别单个/多个请求的展示"
                                    }
                                />
                            )}
                        </>
                    )}
                </AutoSpin>}/>
            <Modal
                visible={urlPacketShow}
                title='从 URL 加载数据包'
                onCancel={() => setUrlPacketShow(false)}
                footer={null}
            >
                <Form
                    layout={"vertical"}
                    onSubmitCapture={(e) => {
                        e.preventDefault()

                        ipcRenderer
                            .invoke("Codec", {
                                Type: "packet-from-url",
                                Text: targetUrl
                            })
                            .then((e) => {
                                if (e?.Result) {
                                    setRequest(e.Result)
                                    refreshRequest()
                                    setUrlPacketShow(false)
                                }
                            })
                            .finally(() => {
                            })
                    }}
                    size={"small"}
                >
                    <InputItem
                        label={"从 URL 构造请求"}
                        value={targetUrl}
                        setValue={setTargetUrl}
                        extraFormItemProps={{style: {marginBottom: 8}}}
                    ></InputItem>
                    <Form.Item style={{marginBottom: 8}}>
                        <Button type={"primary"} htmlType={"submit"}>
                            构造请求
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}
