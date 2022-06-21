import React, {useEffect, useRef, useState} from "react"
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
    Popover, Checkbox, Tooltip
} from "antd"
import {HTTPPacketEditor, IMonacoEditor} from "../../utils/editors"
import {showDrawer, showModal} from "../../utils/showModal"
import {monacoEditorWrite} from "./fuzzerTemplates"
import {StringFuzzer} from "./StringFuzzer"
import {
    CopyableField,
    InputFloat,
    InputInteger,
    InputItem,
    ManyMultiSelectForString,
    OneLine,
    SwitchItem
} from "../../utils/inputUtil"
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
    DownloadOutlined, QuestionCircleOutlined
} from "@ant-design/icons"
import {HTTPFuzzerResultsCard} from "./HTTPFuzzerResultsCard"
import {failed, success} from "../../utils/notification"
import {AutoSpin} from "../../components/AutoSpin"
import {ResizeBox} from "../../components/ResizeBox"
import {useGetState, useMemoizedFn} from "ahooks";
import {getValue, saveValue} from "../../utils/kv";
import {HTTPFuzzerHistorySelector} from "./HTTPFuzzerHistory";
import {PayloadManagerPage} from "../payloadManager/PayloadManager";
import {HackerPlugin} from "../hacker/HackerPlugin"
import {fuzzerInfoProp} from "../MainOperator"
import {ItemSelects} from "../../components/baseTemplate/FormItemUtil"
import {HTTPFuzzerHotPatch} from "./HTTPFuzzerHotPatch";
import {AutoCard} from "../../components/AutoCard";
import {callCopyToClipboard} from "../../utils/basic";
import {exportHTTPFuzzerResponse, exportPayloadResponse} from "./HTTPFuzzerPageExport";
import {StringToUint8Array, Uint8ArrayToString} from "../../utils/str";

const {ipcRenderer} = window.require("electron")

export const analyzeFuzzerResponse =
    (
        i: FuzzerResponse,
        setRequest: (isHttps: boolean, request: string) => any,
        index?: number,
        data?: FuzzerResponse[]
    ) => {
        let m = showDrawer({
            width: "90%",
            content: (
                <>
                    <FuzzerResponseToHTTPFlowDetail
                        response={i}
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
    order?: string
    fuzzerParams?: fuzzerInfoProp
}

const Text = Typography.Text;

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

    IsHTTPS?: boolean
    Count?: number

    HeaderSimilarity?: number
    BodySimilarity?: number
    MatchedByFilter?: boolean
}

const defaultPostTemplate = `POST / HTTP/1.1
Content-Type: application/json
Host: www.example.com

{"key": "value"}`

const WEB_FUZZ_PROXY = "WEB_FUZZ_PROXY"
const WEB_FUZZ_HOTPATCH_CODE = "WEB_FUZZ_HOTPATCH_CODE"

interface HistoryHTTPFuzzerTask {
    Request: string
    Proxy: string
    IsHTTPS: boolean
}

export const showDictsAndSelect = (res: (i: string) => any) => {
    const m = showModal({
        title: "选择想要插入的字典",
        width: 1200,
        content: <div style={{width: 1100, height: 500, overflow: "hidden"}}>
            <PayloadManagerPage readOnly={true} selectorHandle={e => {
                res(e)
                m.destroy()
            }}/>
        </div>
    })
}

interface FuzzResponseFilter {
    MinBodySize: number
    MaxBodySize: number
    Regexps: string[]
    Keywords: string[]
    StatusCode: string[]
}

function removeEmptyFiledFromFuzzResponseFilter(i: FuzzResponseFilter): FuzzResponseFilter {
    i.Keywords = (i.Keywords || []).filter(i => !!i)
    i.StatusCode = (i.StatusCode || []).filter(i => !!i)
    i.Regexps = (i.Regexps || []).filter(i => !!i)
    return {...i}
}

function filterIsEmpty(f: FuzzResponseFilter): boolean {
    return f.MinBodySize === 0 && f.MaxBodySize === 0 &&
        f.Regexps.length === 0 && f.Keywords.length === 0 &&
        f.StatusCode.length === 0
}

function copyAsUrl(f: { Request: string, IsHTTPS: boolean }) {
    ipcRenderer.invoke("ExtractUrl", f).then((data: { Url: string }) => {
        callCopyToClipboard(data.Url)
    }).catch(e => {
        failed("复制 URL 失败：包含 Fuzz 标签可能会导致 URL 不完整")
    })
}

export const HTTPFuzzerPage: React.FC<HTTPFuzzerPageProp> = (props) => {
    // params
    const [isHttps, setIsHttps, getIsHttps] = useGetState<boolean>(props.fuzzerParams?.isHttps || props.isHttps || false)
    const [noFixContentLength, setNoFixContentLength] = useState(false)
    const [request, setRequest, getRequest] = useGetState(props.fuzzerParams?.request || props.request || defaultPostTemplate)
    const [concurrent, setConcurrent] = useState(props.fuzzerParams?.concurrent || 20)
    const [forceFuzz, setForceFuzz] = useState<boolean>(props.fuzzerParams?.forceFuzz || true)
    const [timeout, setParamTimeout] = useState(props.fuzzerParams?.timeout || 10.0)
    const [proxy, setProxy] = useState(props.fuzzerParams?.proxy || "")
    const [actualHost, setActualHost] = useState(props.fuzzerParams?.actualHost || "")
    const [advancedConfig, setAdvancedConfig] = useState(false)
    const [redirectedResponse, setRedirectedResponse] = useState<FuzzerResponse>()
    const [historyTask, setHistoryTask] = useState<HistoryHTTPFuzzerTask>();
    const [hotPatchCode, setHotPatchCode] = useState<string>("");

    // filter
    const [_, setFilter, getFilter] = useGetState<FuzzResponseFilter>({
        Keywords: [],
        MaxBodySize: 0,
        MinBodySize: 0,
        Regexps: [],
        StatusCode: []
    });
    const [droppedCount, setDroppedCount] = useState(0);

    // state
    const [loading, setLoading] = useState(false)
    const [content, setContent] = useState<FuzzerResponse[]>([])
    const [reqEditor, setReqEditor] = useState<IMonacoEditor>()
    const [fuzzToken, setFuzzToken] = useState("")
    const [search, setSearch] = useState("")
    const [targetUrl, setTargetUrl] = useState("")

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

    useEffect(() => {
        getValue(WEB_FUZZ_HOTPATCH_CODE).then((data: any) => {
            if (!data) {
                return
            }
            setHotPatchCode(`${data}`)
        })
    }, [])

    // 定时器
    const sendTimer = useRef<any>(null)

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

    const sendToFuzzer = useMemoizedFn((isHttps: boolean, request: string) => {
        ipcRenderer.invoke("send-to-tab", {
            type: "fuzzer",
            data: {isHttps: isHttps, request: request}
        })
    })
    const sendToPlugin = useMemoizedFn((request: Uint8Array, isHTTPS: boolean, response?: Uint8Array) => {
        let m = showDrawer({
            width: "80%",
            content: <HackerPlugin request={request} isHTTPS={isHTTPS} response={response}></HackerPlugin>
        })
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

        setDroppedCount(0)
        ipcRenderer.invoke(
            "HTTPFuzzer",
            {
                Request: request,
                RequestRaw: StringToUint8Array(request),
                ForceFuzz: forceFuzz,
                IsHTTPS: isHttps,
                Concurrent: concurrent,
                PerRequestTimeoutSeconds: timeout,
                NoFixContentLength: noFixContentLength,
                Proxy: proxy,
                ActualAddr: actualHost,
                HotPatchCode: hotPatchCode,
                Filter: getFilter(),
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
        let droppedCount = 0;
        let count: number = 0
        const updateData = () => {
            if (buffer.length <= 0) {
                return
            }
            if (JSON.stringify(buffer) !== JSON.stringify(content)) setContent([...buffer])
        }

        ipcRenderer.on(dataToken, (e: any, data: any) => {
            if (data["MatchedByFilter"] !== true && !filterIsEmpty(getFilter())) {
                // 不匹配的
                droppedCount++
                setDroppedCount(droppedCount)
                return
            }
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
                IsHTTPS: data.IsHTTPS,
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
            droppedCount = 0
            setLoading(false)
        })

        const updateDataId = setInterval(() => {
            updateData()
        }, 200)

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
                } catch (error) {
                }
            }, 500)
        )
    }

    useEffect(() => {
        if (!!keyword) {
            searchContent(keyword)
        } else {
            setFilterContent([])
        }
    }, [keyword])

    useEffect(() => {
        if (keyword && content.length !== 0) {
            const filters = content.filter(item => {
                return Buffer.from(item.ResponseRaw).toString("utf8").match(new RegExp(keyword, 'g'))
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

    const sendFuzzerSettingInfo = useMemoizedFn(() => {
        const info: fuzzerInfoProp = {
            time: new Date().getTime().toString(),
            isHttps: isHttps,
            forceFuzz: forceFuzz,
            concurrent: concurrent,
            proxy: proxy,
            actualHost: actualHost,
            timeout: timeout,
            request: request
        }
        if (sendTimer.current) {
            clearTimeout(sendTimer.current)
            sendTimer.current = null
        }
        sendTimer.current = setTimeout(() => {
            ipcRenderer.invoke('send-fuzzer-setting-data', {key: props.order || "", param: JSON.stringify(info)})
        }, 1000);
    })
    useEffect(() => {
        sendFuzzerSettingInfo()
    }, [isHttps, forceFuzz, concurrent, proxy, actualHost, timeout, request])

    const responseViewer = useMemoizedFn((rsp: FuzzerResponse) => {
        return (
            <HTTPPacketEditor
                system={props.system}
                originValue={rsp.ResponseRaw}
                bordered={true}
                hideSearch={true}
                isResponse={true}
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
                    (
                        <Space>
                            {loading && <Spin size={"small"} spinning={loading}/>}
                            {onlyOneResponse ? (
                                <Space>
                                    {content[0].IsHTTPS && <Tag>{content[0].IsHTTPS ? "https" : ""}</Tag>}
                                    <Tag>{content[0].DurationMs}ms</Tag>
                                    <Space key='single'>
                                        <Button
                                            size={"small"}
                                            onClick={() => {
                                                analyzeFuzzerResponse(
                                                    rsp,
                                                    (bool, r) => {
                                                        // setRequest(r)
                                                        // refreshRequest()
                                                    }
                                                )
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
                                        />
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

                        </Space>
                    )
                }
            />
        )
    })

    const hotPatchTrigger = useMemoizedFn(() => {
        let m = showModal({
            title: "调试 / 插入热加载代码",
            width: "60%",
            content: (
                <div>
                    <HTTPFuzzerHotPatch initialHotPatchCode={hotPatchCode || ""} onInsert={tag => {
                        if (reqEditor) monacoEditorWrite(reqEditor, tag);
                        m.destroy()
                    }} onSaveCode={code => {
                        setHotPatchCode(code)
                        saveValue(WEB_FUZZ_HOTPATCH_CODE, code)
                    }}/>
                </div>
            )
        })
    })

    useEffect(() => {
        if (!props.request) {
            return
        }

        setLoading(true)
        ipcRenderer.invoke("IsMultipartFormDataRequest", {
            Request: StringToUint8Array(props.request || "", "utf8")
        }).then((e: { IsMultipartFormData: boolean }) => {
            if (e.IsMultipartFormData) {
                showModal({
                    title: "潜在的数据包编码问题提示",
                    content: (
                        <Space direction={"vertical"}>
                            <Space>
                                <Typography>
                                    <Text>当前数据包包含一个</Text>
                                    <Text mark={true}>
                                        原始文件内容 mutlipart/form-data
                                    </Text>
                                    <Text>
                                        文件中的不可见字符进入编辑器将会被编码导致丢失信息。
                                    </Text>
                                </Typography>
                            </Space>
                            <Space>
                                <Typography>
                                    <Button type={"link"} size={"small"} onClick={() => {
                                        ipcRenderer.invoke(
                                            "FixUploadPacket", {Request: StringToUint8Array(props.request || "", "utf8")},
                                        ).then((fixed: { Request: Uint8Array }) => {
                                            setRequest(Uint8ArrayToString(fixed.Request, "utf8"))
                                            refreshRequest()
                                        })
                                    }}>
                                        点击替换
                                    </Button>
                                    <Text>
                                        后，会替换掉原始文件内容
                                    </Text>
                                </Typography>
                            </Space>
                            <br/>
                            <Space>
                                <Typography>
                                    <Text>如需要插入具体文件内容，可右键</Text>
                                    <Text mark={true}>
                                        插入文件
                                    </Text>
                                </Typography>
                            </Space>
                        </Space>
                    ),
                    width: "40%",
                })
            }
        }).finally(() => setLoading(false))
    }, [props.request])

    return (
        <div style={{height: "100%", width: "100%", display: "flex", flexDirection: "column", overflow: "hidden"}}>
            <Row gutter={8} style={{marginBottom: 8}}>
                <Col span={24} style={{textAlign: "left", marginTop: 4}}>
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
                                    sendFuzzerSettingInfo()
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
                        <Checkbox defaultChecked={isHttps} value={isHttps} onChange={() => setIsHttps(!isHttps)}>强制
                            HTTPS</Checkbox>
                        <SwitchItem
                            label={"高级配置"}
                            formItemStyle={{marginBottom: 0}}
                            value={advancedConfig}
                            setValue={setAdvancedConfig}
                            size={"small"}
                        />
                        {droppedCount > 0 && <Tag color={"red"}>已丢弃[{droppedCount}]个响应</Tag>}
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
                                                NoFixContentLength: noFixContentLength,
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
                <Row style={{marginBottom: 8}} gutter={8}>
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
                                            <SwitchItem
                                                label={<OneLine width={70}>
                                                    <Tooltip title={"不修复 Content-Length: 常用发送多个数据包"}>
                                                        不修复长度
                                                    </Tooltip>
                                                </OneLine>}
                                                setValue={(e) => {
                                                    setNoFixContentLength(e)
                                                }}
                                                size={"small"}
                                                value={noFixContentLength}
                                                formItemStyle={{marginBottom: 4}}
                                            />
                                        </Col>
                                        <Col span={12} xl={8}>
                                            <ItemSelects
                                                item={{
                                                    style: {marginBottom: 4},
                                                    label: <OneLine width={68}>设置代理</OneLine>,
                                                }}
                                                select={{
                                                    style: {width: "100%"},
                                                    allowClear: true,
                                                    autoClearSearchValue: true,
                                                    maxTagTextLength: 8,
                                                    mode: "tags",
                                                    data: [
                                                        {text: "http://127.0.0.1:7890", value: "http://127.0.0.1:7890"},
                                                        {text: "http://127.0.0.1:8080", value: "http://127.0.0.1:8080"},
                                                        {text: "http://127.0.0.1:8082", value: "http://127.0.0.1:8082"}
                                                    ],
                                                    value: proxy ? proxy.split(",") : [],
                                                    setValue: (value) => setProxy(value.join(",")),
                                                    maxTagCount: "responsive",
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
                        <AutoCard title={(
                            <Tooltip title={"通过过滤匹配，丢弃无用数据包，保证界面性能！"}>
                                设置过滤器
                            </Tooltip>
                        )}
                                  bordered={false} size={"small"} bodyStyle={{paddingTop: 4}}
                                  style={{marginTop: 0, paddingTop: 0}}
                        >
                            <Form size={"small"} onSubmitCapture={e => e.preventDefault()}>
                                <Row gutter={20}>
                                    <Col span={12}>
                                        <InputItem
                                            label={"状态码"} placeholder={"200,300-399"}
                                            disable={loading}
                                            value={getFilter().StatusCode.join(",")}
                                            setValue={e => {
                                                setFilter({...getFilter(), StatusCode: e.split(",").filter(i => !!i)})
                                            }}
                                            extraFormItemProps={{style: {marginBottom: 0}}}
                                        />
                                    </Col>
                                    <Col span={12}>
                                        <InputItem
                                            label={"关键字"} placeholder={"Login,登录成功"}
                                            value={getFilter().Keywords.join(",")}
                                            disable={loading}
                                            setValue={e => {
                                                setFilter({...getFilter(), Keywords: e.split(",").filter(i => !!i)})
                                            }}
                                            extraFormItemProps={{style: {marginBottom: 0}}}
                                        />
                                    </Col>
                                    <Col span={12}>
                                        <InputItem
                                            label={"正则"} placeholder={`Welcome\\s+\\w+!`}
                                            value={getFilter().Regexps.join(",")}
                                            disable={loading}
                                            setValue={e => {
                                                setFilter({...getFilter(), Regexps: e.split(",").filter(i => !!i)})
                                            }}
                                            extraFormItemProps={{style: {marginBottom: 0, marginTop: 2}}}
                                        />
                                    </Col>
                                </Row>
                            </Form>
                        </AutoCard>
                    </Col>
                </Row>
            )}
            {/*<Divider style={{marginTop: 6, marginBottom: 8, paddingTop: 0}}/>*/}
            <ResizeBox
                firstMinSize={350} secondMinSize={360}
                style={{overflow: "hidden"}}
                firstNode={<HTTPPacketEditor
                    system={props.system}
                    refreshTrigger={refreshTrigger}
                    hideSearch={true}
                    bordered={true}
                    utf8={true}
                    originValue={StringToUint8Array(request)}
                    actions={[
                        {
                            id: "packet-from-url",
                            label: "URL转数据包",
                            contextMenuGroupId: "1_urlPacket",
                            run: () => {
                                setUrlPacketShow(true)
                            }
                        },
                        {
                            id: "copy-as-url",
                            label: "复制为 URL",
                            contextMenuGroupId: "1_urlPacket",
                            run: () => {
                                copyAsUrl({Request: getRequest(), IsHTTPS: getIsHttps()})
                            }
                        },
                        {
                            id: "insert-intruder-tag",
                            label: "插入模糊测试字典标签",
                            contextMenuGroupId: "1_urlPacket",
                            run: (editor) => {
                                showDictsAndSelect(i => {
                                    monacoEditorWrite(editor, i, editor.getSelection())
                                })
                            }
                        },
                        {
                            id: "insert-hotpatch-tag",
                            label: "插入热加载标签",
                            contextMenuGroupId: "1_urlPacket",
                            run: (editor) => {
                                hotPatchTrigger()
                            }
                        },
                    ]}
                    onEditor={setReqEditor}
                    onChange={(i) => setRequest(Uint8ArrayToString(i))}
                    extra={
                        <Space size={2}>
                            <Button
                                style={{marginRight: 1}}
                                size={"small"} type={"primary"}
                                onClick={() => {
                                    hotPatchTrigger()
                                }}
                            >热加载标签</Button>
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
                                    onSendToWebFuzzer={sendToFuzzer}
                                    sendToPlugin={sendToPlugin}
                                    setRequest={(r) => {
                                        setRequest(r)
                                        refreshRequest()
                                    }}
                                    extra={
                                        <div>
                                            <Popover
                                                title={"导出数据"}
                                                trigger={["click"]}
                                                content={<>
                                                    <Space>
                                                        <Button
                                                            size={"small"}
                                                            type={"primary"}
                                                            onClick={() => {
                                                                exportHTTPFuzzerResponse(successResults)
                                                            }}
                                                        >
                                                            导出所有请求
                                                        </Button>
                                                        <Button
                                                            size={"small"}
                                                            type={"primary"}
                                                            onClick={() => {
                                                                exportPayloadResponse(successResults)
                                                            }}
                                                        >
                                                            仅导出 Payload
                                                        </Button>
                                                    </Space>
                                                </>}>
                                                <Button>导出数据</Button>
                                            </Popover>
                                            {/*<Input*/}
                                            {/*    value={keyword}*/}
                                            {/*    style={{maxWidth: 200}}*/}
                                            {/*    allowClear*/}
                                            {/*    placeholder="输入字符串或正则表达式"*/}
                                            {/*    onChange={e => setKeyword(e.target.value)}*/}
                                            {/*    addonAfter={*/}
                                            {/*        <DownloadOutlined style={{cursor: "pointer"}}*/}
                                            {/*                          onClick={downloadContent}/>*/}
                                            {/*    }></Input>*/}
                                        </div>
                                    }
                                    failedResponses={failedResults}
                                    successResponses={filterContent.length !== 0 ? filterContent : keyword ? [] : successResults}
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
