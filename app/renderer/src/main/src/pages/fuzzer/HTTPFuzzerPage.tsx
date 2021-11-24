import React, {useEffect, useState} from "react";
import {
    Alert,
    Button,
    Card,
    Col, Divider,
    Form, Input,
    Modal,
    notification,
    PageHeader,
    Popover,
    Result,
    Row,
    Select,
    Space,
    Spin,
    Switch,
    Table, Tabs,
    Tag,
    Tooltip,
    Typography
} from "antd";
import {HTTPPacketEditor, IMonacoEditor, YakEditor} from "../../utils/editors";
import {formatTimestamp} from "../../utils/timeUtil";
import {showDrawer, showModal} from "../../utils/showModal";
import {fuzzerTemplates} from "./fuzzerTemplates";
import {StringFuzzer} from "./StringFuzzer";
import {InputFloat, InputInteger, InputItem, ManyMultiSelectForString, SwitchItem} from "../../utils/inputUtil";
import {fixEncoding} from "../../utils/convertor";
import {FuzzerResponseToHTTPFlowDetail} from "../../components/HTTPFlowDetail";
import {FuzzerResponseTable, FuzzerResponseTableEx} from "./FuzzerResponseTable";
import {randomString} from "../../utils/randomUtil";
import {contentDemo} from "./demoContent";

const {ipcRenderer} = window.require("electron");

export const analyzeFuzzerResponse = (i: FuzzerResponse, setRequest: (r: string) => any) => {
    let m = showDrawer({
        width: "90%",
        content: <>
            <FuzzerResponseToHTTPFlowDetail
                response={i}
                onSendToFuzzer={(r) => {
                    setRequest(new Buffer(r).toString())
                    m.destroy()
                }}
            /></>
    })
}

export interface HTTPFuzzerPageProp {
    isHttps?: boolean
    request?: string
}

const {Text} = Typography;

export interface FuzzerResponse {
    Method: string
    StatusCode: number
    Host: string
    ContentType: string
    Headers: { Header: string, Value: string }[]
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
    const [isHttps, setIsHttps] = useState(props.isHttps || false);
    const [request, setRequest] = useState(props.request || defaultPostTemplate);
    const [concurrent, setConcurrent] = useState(20);
    const [forceFuzz, setForceFuzz] = useState(true);
    const [timeout, setTimeout] = useState(5.0);
    const [proxy, setProxy] = useState("");
    const [actualHost, setActualHost] = useState("");

    // state
    const [loading, setLoading] = useState(false);
    const [content, setContent] = useState<FuzzerResponse[]>([]);
    const [templates, setTemplates] = useState<{ name: string, template: string }[]>(fuzzerTemplates)
    const [reqEditor, setReqEditor] = useState<IMonacoEditor>();
    const [debuggingTag, setDebuggingTag] = useState(false);
    const [fuzzToken, setFuzzToken] = useState("");

    const [search, setSearch] = useState("");

    useEffect(() => {
        setIsHttps(!!props.isHttps);
        if (props.request) {
            setRequest(props.request)
            setContent([])
        }
    }, [props.isHttps, props.request])

    const submitToHTTPFuzzer = () => {
        setLoading(true)
        ipcRenderer.invoke("HTTPFuzzer", {
            Request: request,
            ForceFuzz: forceFuzz,
            IsHTTPS: isHttps,
            Concurrent: concurrent,
            PerRequestTimeoutSeconds: timeout,
            Proxy: proxy,
        }, fuzzToken)
    };

    const cancelCurrentHTTPFuzzer = () => {
        ipcRenderer.invoke("cancel-HTTPFuzzer", fuzzToken)
    }

    useEffect(() => {
        const token = randomString(60);
        setFuzzToken(token);

        const dataToken = `${token}-data`;
        const errToken = `${token}-error`;
        const endToken = `${token}-end`;

        ipcRenderer.on(errToken, (e, details) => {
            notification['error']({message: `提交模糊测试请求失败 ${details}`, placement: "bottomRight"})
        })
        let buffer: FuzzerResponse[] = [];
        const updateData = () => {
            if (buffer.length <= 0) {
                return
            }
            setContent([...buffer])
        }
        ipcRenderer.on(dataToken, (e, data) => {
            const response = new Buffer(data.ResponseRaw).toString(fixEncoding(data.GuessResponseEncoding))
            buffer.push({
                StatusCode: data.StatusCode,
                Ok: data.Ok,
                Reason: data.Reason,
                Method: data.Method, Host: data.Host,
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
            ipcRenderer.removeAllListeners(errToken);
            ipcRenderer.removeAllListeners(dataToken);
            ipcRenderer.removeAllListeners(endToken);
        }
    }, [])

    const onlyOneResponse = !loading && (content || []).length === 1;

    const filtredResponses = search === "" ? (content || []) : (content || []).filter(i => {
        return Buffer.from(i.ResponseRaw).toString().includes(search)
    })
    const successResults = filtredResponses.filter(i => i.Ok);
    const failedResults = filtredResponses.filter(i => !i.Ok);

    return <>
        {/*<PageHeader*/}
        {/*    title={"Web Fuzzer 操作台"}*/}
        {/*    subTitle={<Space>*/}
        {/*        <Form.Item style={{marginBottom: 0}} label={"选择 Fuzz 模版"}>*/}
        {/*            <Select*/}
        {/*                style={{width: 200}}*/}
        {/*                options={(templates || []).map(i => {*/}
        {/*                    return {label: i.name, value: i.template}*/}
        {/*                })}*/}
        {/*                onChange={r => setRequest(`${r}`)}*/}
        {/*                placeholder={"选择一个模版开始 Fuzz"}*/}
        {/*            />*/}
        {/*        </Form.Item>*/}
        {/*        <Button*/}
        {/*            disabled={debuggingTag}*/}
        {/*            type={"primary"}*/}
        {/*            onClick={() => {*/}
        {/*                showDrawer({*/}
        {/*                    mask: false,*/}
        {/*                    afterVisible: () => {*/}
        {/*                        setDebuggingTag(true)*/}
        {/*                    },*/}
        {/*                    afterInvisible: () => setDebuggingTag(false),*/}
        {/*                    content: <>*/}
        {/*                        <StringFuzzer/>*/}
        {/*                    </>*/}
        {/*                })*/}
        {/*            }}>*/}
        {/*            Payload Fuzzer / 调试 Payload*/}
        {/*        </Button>*/}
        {/*    </Space>}*/}
        {/*    // extra={[*/}
        {/*    //     <Space>*/}
        {/*    //*/}
        {/*    //     </Space>*/}
        {/*    // ]}*/}
        {/*>*/}

        {/*</PageHeader>*/}
        <Row gutter={8}>
            <Col span={12} style={{textAlign: "left"}}>
                <Space>
                    <Popover trigger={"click"} content={<>
                        <Spin style={{width: "100%"}} spinning={!reqEditor}>
                            <Space
                                style={{width: "100%"}}
                                direction={"vertical"}
                            >

                                <Form
                                    onSubmitCapture={e => e.preventDefault()}
                                    layout={"horizontal"}
                                    size={"small"}
                                    labelCol={{span: 8}} wrapperCol={{span: 16}}
                                >
                                    <Form.Item label={" "} colon={false} style={{marginBottom: 4}}>
                                        <Button
                                            style={{backgroundColor: "#08a701"}}
                                            size={"small"}
                                            type={"primary"}
                                            onClick={() => {
                                                const m = showModal({
                                                    width: "70%",
                                                    content: <>
                                                        <StringFuzzer
                                                            advanced={true}
                                                            disableBasicMode={true}
                                                            insertCallback={(template: string) => {
                                                                if (!template) {
                                                                    Modal.warn({title: "Payload 为空 / Fuzz 模版为空"})
                                                                } else {
                                                                    if (reqEditor && template) {
                                                                        reqEditor.trigger("keyboard", "type", {text: template})
                                                                    } else {
                                                                        Modal.error({title: "BUG: 编辑器失效"})
                                                                    }
                                                                    m.destroy()
                                                                }
                                                            }}
                                                        />
                                                    </>
                                                })
                                            }}>插入Fuzz标签</Button>
                                    </Form.Item>
                                    <SwitchItem
                                        label={"Fuzz"}
                                        setValue={e => {
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
                                        }} size={"small"} value={forceFuzz}
                                        formItemStyle={{marginBottom: 4}}
                                    />
                                    <InputInteger
                                        label={"并发"} size={"small"}
                                        setValue={e => {
                                            setConcurrent(e)
                                        }} formItemStyle={{marginBottom: 4}} // width={40}
                                        value={concurrent}
                                    />
                                    <SwitchItem label={"HTTPS"} setValue={e => {
                                        setIsHttps(e)
                                    }} size={"small"} value={isHttps}
                                                formItemStyle={{marginBottom: 4}}
                                    />
                                    <Popover
                                        title={
                                            <>
                                                设置代理: 通常可以用于访问一些因为网络问题无法访问的网页
                                                <br/>
                                                或把请求发送到基于代理模式的扫描器
                                            </>
                                        }
                                        trigger={"click"}
                                        content={<>
                                            <ManyMultiSelectForString
                                                label={"输入代理（逗号分割）"}
                                                data={[
                                                    "http://127.0.0.1:7890",
                                                    "http://127.0.0.1:8080",
                                                    "http://127.0.0.1:8082",
                                                ].map(i => {
                                                    return {label: i, value: i}
                                                })}
                                                mode={"tags"} defaultSep={","}
                                                value={proxy}
                                                setValue={(r) => {
                                                    setProxy(r.split(",").join(","))
                                                }}
                                            />
                                        </>}>
                                        <Form.Item label={" "} colon={false} style={{marginBottom: 0}}>
                                            <Button
                                                size={"small"}
                                            >
                                                {proxy ? "修改代理" : "设置代理"}
                                            </Button>
                                        </Form.Item>
                                    </Popover>
                                    <InputFloat
                                        formItemStyle={{marginBottom: 4}} size={"small"}
                                        label={"请求超时时间"} setValue={setTimeout}
                                        value={timeout}
                                    />
                                    <InputItem
                                        extraFormItemProps={{
                                            style: {marginBottom: 4}
                                        }}
                                        label={"请求 Host"}
                                        setValue={setActualHost} value={actualHost}
                                    />
                                </Form>
                            </Space>
                        </Spin>
                    </>}>
                        <Button type={"link"} size={"small"}>配置请求包</Button>
                    </Popover>
                    {actualHost !== "" && <Tag color={"red"}>请求 Host:{actualHost}</Tag>}
                    {loading ? <Button
                        onClick={() => {
                            cancelCurrentHTTPFuzzer()
                        }}
                        size={"small"} danger={true}
                        type={"primary"}
                    >强制停止</Button> : <Button
                        onClick={() => {
                            setContent([])
                            submitToHTTPFuzzer()
                        }}
                        size={"small"}
                        type={"primary"}
                    >Go / Fuzz</Button>}
                </Space>
            </Col>
            <Col span={12} style={{textAlign: "left"}}>
                <Space>
                    {/*<Space>*/}
                    {/*<Text style={{marginBottom: 0}}>模糊测试 / HTTP 请求结果</Text>*/}
                    {loading && <Spin size={"small"} spinning={loading}/>}
                    {/*</Space>*/}
                    {onlyOneResponse ? [
                        <Space>
                            <Space key='single'>
                                <Button size={"small"}
                                        onClick={() => {
                                            analyzeFuzzerResponse(content[0], setRequest)
                                        }}
                                        type={"primary"}
                                >分析该 HTTP 响应</Button>
                                <Button size={"small"}
                                        onClick={() => {
                                            setContent([])
                                        }}
                                        danger={true}
                                >清空响应</Button>
                            </Space>
                            <Tag>{formatTimestamp(content[0].Timestamp)}</Tag>
                        </Space>
                    ] : [
                        <Space key='list'>
                            <Tag color={"green"}>成功:{successResults.length}</Tag>
                            <Input size={"small"} value={search} onChange={e => {
                                setSearch(e.target.value)
                            }}/>
                            {/*<Tag>当前请求结果数[{(content || []).length}]</Tag>*/}
                            <Button size={"small"} onClick={() => {
                                setContent([])
                            }}>清除数据</Button>
                        </Space>
                    ]}
                </Space>
            </Col>
        </Row>
        <Divider style={{marginTop: 12, marginBottom: 4}}/>
        <Row style={{marginLeft: 16, marginRight: 16}} gutter={8}>
            <Col span={12} style={{height: "100%"}}>
                <div style={{height: "100%"}}>
                    <HTTPPacketEditor
                        bordered={false} originValue={new Buffer(request)}
                        onEditor={setReqEditor} onChange={i => setRequest(new Buffer(i).toString("utf8"))}
                    />
                </div>
            </Col>
            <Col span={12}>
                {onlyOneResponse ? <>
                    {!content[0].Ok && <Alert
                        style={{marginBottom: 8}} type={"error"}
                        message={<>
                            请求失败：{content[0].Reason}
                        </>}>

                    </Alert>}
                    <HTTPPacketEditor
                        originValue={content[0].ResponseRaw} bordered={false} readOnly={true}
                    />
                    {/*<YakEditor*/}
                    {/*    readOnly={true} bytes={true} valueBytes={content[0].ResponseRaw}*/}
                    {/*/>*/}
                </> : <>{(content || []).length > 0 ?
                    <>
                        <Tabs>
                            <Tabs.TabPane key={"success"}
                                          tab={<div style={{
                                              marginLeft: 12,
                                              marginRight: 12
                                          }}>正常请求{`[${(successResults || []).length}]`}</div>}>
                                <FuzzerResponseTableEx
                                    success={true}
                                    content={successResults} setRequest={setRequest}
                                />
                            </Tabs.TabPane>
                            <Tabs.TabPane key={"failed"} tab={`网络错误 / 请求错误 [${(failedResults || []).length}]`}>
                                <FuzzerResponseTableEx
                                    success={false}
                                    content={failedResults} setRequest={setRequest}
                                />
                            </Tabs.TabPane>
                        </Tabs>
                    </>
                    : <Result
                        status={"info"}
                        title={"请在左边编辑并发送一个 HTTP 请求/模糊测试"}
                        subTitle={"本栏结果针对模糊测试的多个 HTTP 请求结果展示做了优化，可以自动识别单个/多个请求的展示"}
                    />}
                </>}
            </Col>
        </Row>
    </>
}