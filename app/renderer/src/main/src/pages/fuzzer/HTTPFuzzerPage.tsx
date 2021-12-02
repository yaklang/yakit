import React, {useEffect, useState} from "react"
import {
    Alert,
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
    Tabs,
    Tag,
    Typography
} from "antd"
import {HTTPPacketEditor, IMonacoEditor} from "../../utils/editors"
import {showDrawer, showModal} from "../../utils/showModal"
import {fuzzerTemplates} from "./fuzzerTemplates"
import {StringFuzzer} from "./StringFuzzer"
import {InputFloat, InputInteger, InputItem, ManyMultiSelectForString, OneLine, SwitchItem} from "../../utils/inputUtil"
import {fixEncoding} from "../../utils/convertor"
import {FuzzerResponseToHTTPFlowDetail} from "../../components/HTTPFlowDetail"
import {FuzzerResponseTableEx} from "./FuzzerResponseTable"
import {randomString} from "../../utils/randomUtil"
import {LinerResizeCols} from "../../components/LinerResizeCols"
import {DeleteOutlined, ProfileOutlined, ColumnWidthOutlined} from "@ant-design/icons";
import {HTTPPacketFuzzable} from "@components/HTTPHistory";
import {HTTPFuzzerResultsCard} from "./HTTPFuzzerResultsCard";


const {ipcRenderer} = window.require("electron")

export const analyzeFuzzerResponse = (i: FuzzerResponse, setRequest: (r: string) => any) => {
    let m = showDrawer({
        width: "90%",
        content: (
            <>
                <FuzzerResponseToHTTPFlowDetail
                    response={i}
                    sendToWebFuzzer={(isHttps, request) => {
                        setRequest(request)
                        m.destroy()
                    }}
                    onClosed={() => {
                        m.destroy()
                    }}
                />
            </>
        )
    })
}

export interface HTTPFuzzerPageProp {
    isHttps?: boolean
    request?: string
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
}

const defaultPostTemplate = `POST / HTTP/1.1
Content-Type: application/json
Host: www.example.com

{"key": "value"}`

export const HTTPFuzzerPage: React.FC<HTTPFuzzerPageProp> = (props) => {
    // params
    const [isHttps, setIsHttps] = useState(props.isHttps || false)
    const [request, setRequest] = useState(props.request || defaultPostTemplate)
    const [concurrent, setConcurrent] = useState(20)
    const [forceFuzz, setForceFuzz] = useState(true)
    const [timeout, setTimeout] = useState(5.0)
    const [proxy, setProxy] = useState("")
    const [actualHost, setActualHost] = useState("")
    const [advancedConfig, setAdvancedConfig] = useState(false);

    // state
    const [loading, setLoading] = useState(false)
    const [content, setContent] = useState<FuzzerResponse[]>([])
    const [templates, setTemplates] =
        useState<{ name: string; template: string }[]>(fuzzerTemplates)
    const [reqEditor, setReqEditor] = useState<IMonacoEditor>()
    const [debuggingTag, setDebuggingTag] = useState(false)
    const [fuzzToken, setFuzzToken] = useState("")
    const [search, setSearch] = useState("")

    const [viewMode, setViewMode] = useState<"split" | "request" | "result">("split");


    const [refreshTrigger, setRefreshTrigger] = useState(false);
    const refreshRequest = () => {
        setRefreshTrigger(!refreshTrigger);
    }

    useEffect(() => {
        setIsHttps(!!props.isHttps)
        if (props.request) {
            setRequest(props.request)
            setContent([])
        }
    }, [props.isHttps, props.request])

    const submitToHTTPFuzzer = () => {
        setLoading(true)
        ipcRenderer.invoke(
            "HTTPFuzzer",
            {
                Request: request,
                ForceFuzz: forceFuzz,
                IsHTTPS: isHttps,
                Concurrent: concurrent,
                PerRequestTimeoutSeconds: timeout,
                Proxy: proxy
            },
            fuzzToken
        )
    }

    const cancelCurrentHTTPFuzzer = () => {
        ipcRenderer.invoke("cancel-HTTPFuzzer", fuzzToken)
    }

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
        const updateData = () => {
            if (buffer.length <= 0) {
                return
            }
            setContent([...buffer])
        }
        ipcRenderer.on(dataToken, (e, data) => {
            const response = new Buffer(data.ResponseRaw).toString(
                fixEncoding(data.GuessResponseEncoding)
            )
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
                RequestRaw: data.RequestRaw
            } as FuzzerResponse)
            // setContent([...buffer])
        })
        ipcRenderer.on(endToken, () => {
            updateData()
            buffer = []
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

    const onlyOneResponse = !loading && (content || []).length === 1;

    const filtredResponses =
        search === ""
            ? content || []
            : (content || []).filter((i) => {
                return Buffer.from(i.ResponseRaw).toString().includes(search)
            })
    const successResults = filtredResponses.filter((i) => i.Ok)
    const failedResults = filtredResponses.filter((i) => !i.Ok)


    const getLeftSpan = () => {
        switch (viewMode) {
            case "request":
                return 18;
            case "result":
                return 6;
            case "split":
            default:
                return 12
        }
    };

    return (
        <div style={{height: "100%", width: "100%", display: "flex", flexDirection: "column", overflow: "hidden"}}>
            <Row gutter={8}>
                <Col span={12} style={{textAlign: "left"}}>
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
                                    submitToHTTPFuzzer()
                                }}
                                // size={"small"}
                                type={"primary"}
                            >
                                发送数据包
                            </Button>
                        )}
                        <SwitchItem
                            label={"高级配置"} formItemStyle={{marginBottom: 0}}
                            value={advancedConfig} setValue={setAdvancedConfig}
                            size={"small"}
                        />
                        {loading && <Space>
                            <Spin size={"small"}/>
                            <div style={{color: "#3a8be3"}}>
                                sending packets
                            </div>
                        </Space>}
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
                <Col span={12} style={{textAlign: "left"}}>
                </Col>
            </Row>

            {advancedConfig && <Row style={{marginTop: 8}} gutter={8}>
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
                                            label={<OneLine width={68}>
                                                Intruder
                                            </OneLine>}
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
                                                                    insertCallback={(
                                                                        template: string
                                                                    ) => {
                                                                        if (!template) {
                                                                            Modal.warn({
                                                                                title: "Payload 为空 / Fuzz 模版为空"
                                                                            })
                                                                        } else {
                                                                            if (
                                                                                reqEditor &&
                                                                                template
                                                                            ) {
                                                                                reqEditor.trigger(
                                                                                    "keyboard",
                                                                                    "type",
                                                                                    {
                                                                                        text: template
                                                                                    }
                                                                                )
                                                                            } else {
                                                                                Modal.error(
                                                                                    {
                                                                                        title: "BUG: 编辑器失效"
                                                                                    }
                                                                                )
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
                                            setValue={setTimeout}
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
            </Row>}
            <Divider style={{marginTop: 12, marginBottom: 4}}/>
            <Row style={{flex: "1"}} gutter={5}>
                <Col span={getLeftSpan()}>
                    <HTTPPacketEditor
                        simpleMode={viewMode === "result"}
                        refreshTrigger={refreshTrigger}
                        hideSearch={true} bordered={true}
                        originValue={new Buffer(request)}
                        onEditor={setReqEditor}
                        onChange={(i) => setRequest(new Buffer(i).toString("utf8"))}
                        extra={<Space>
                            <Button
                                size={"small"}
                                type={viewMode === "request" ? "primary" : "link"}
                                icon={<ColumnWidthOutlined/>}
                                onClick={() => {
                                    if (viewMode === "request") {
                                        setViewMode("split")
                                    } else {
                                        setViewMode("request")
                                    }
                                }}
                            />
                        </Space>}
                    />
                </Col>
                <Col span={24 - getLeftSpan()}>
                    {onlyOneResponse ? (
                        <>
                            <HTTPPacketEditor
                                simpleMode={viewMode === "request"}
                                originValue={content[0].ResponseRaw}
                                bordered={true} hideSearch={true}
                                emptyOr={!content[0].Ok && (
                                    <Result
                                        status={"error"} title={"请求失败"}
                                        // no such host
                                        subTitle={(() => {
                                            const reason = content[0]!.Reason;
                                            if (reason.includes("tcp: i/o timeout")) {
                                                return "网络超时"
                                            }
                                            if (reason.includes("no such host")) {
                                                return "DNS 错误或主机错误"
                                            }
                                            return undefined
                                        })()}
                                    >
                                        <>详细原因：{content[0].Reason}</>
                                    </Result>
                                )}
                                readOnly={true} extra={
                                viewMode === "request" ? <Button
                                        size={"small"}
                                        type={"link"}
                                        icon={<ColumnWidthOutlined/>}
                                        onClick={() => {
                                            setViewMode("result")
                                        }}
                                    /> :
                                    <Space>
                                        {loading && <Spin size={"small"} spinning={loading}/>}
                                        {onlyOneResponse
                                            ?
                                            <Space>
                                                <Tag>{content[0].DurationMs}ms</Tag>
                                                <Space key='single'>
                                                    <Button
                                                        size={"small"}
                                                        onClick={() => {
                                                            analyzeFuzzerResponse(content[0], r => {
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
                                                    >

                                                    </Button>
                                                </Space>
                                            </Space>
                                            :
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
                                        }
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
                            }
                            />
                            {/*<YakEditor*/}
                            {/*    readOnly={true} bytes={true} valueBytes={content[0].ResponseRaw}*/}
                            {/*/>*/}
                        </>
                    ) : (
                        <>
                            {(content || []).length > 0 ? (
                                <HTTPFuzzerResultsCard
                                    setRequest={r => {
                                        setRequest(r)
                                        refreshRequest()
                                    }}
                                    extra={<Button
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
                                    />}
                                    failedResponses={failedResults}
                                    successResponses={successResults}
                                />
                            ) : (
                                <Result
                                    status={"info"}
                                    title={"请在左边编辑并发送一个 HTTP 请求/模糊测试"}
                                    subTitle={"本栏结果针对模糊测试的多个 HTTP 请求结果展示做了优化，可以自动识别单个/多个请求的展示"}
                                />
                            )}
                        </>)}
                </Col>
            </Row>
            {/*<LinerResizeCols*/}
            {/*    style={{flex: "1"}}*/}
            {/*    leftNode={*/}
            {/*        <HTTPPacketEditor*/}
            {/*            refreshTrigger={refreshTrigger}*/}
            {/*            hideSearch={true} bordered={true}*/}
            {/*            originValue={new Buffer(request)}*/}
            {/*            onEditor={setReqEditor}*/}
            {/*            onChange={(i) => setRequest(new Buffer(i).toString("utf8"))}*/}
            {/*        />*/}
            {/*    }*/}
            {/*    rightNode={*/}
            {/*        */}
            {/*    }*/}
            {/*/>*/}
        </div>)
}


