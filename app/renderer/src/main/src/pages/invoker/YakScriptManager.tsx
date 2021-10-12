import React, {useEffect, useState} from "react";
import {
    Typography,
    Button,
    PageHeader,
    Table,
    Tag,
    Space,
    Popconfirm,
    Row,
    Col,
    Card,
    Empty,
    Divider,
    Descriptions, Form, Modal
} from "antd";
import {showDrawer} from "../../utils/showModal";
import {YakScriptCreatorForm} from "./YakScriptCreator";
import {QueryYakScriptRequest, QueryYakScriptsResponse, YakScript} from "./schema";
import {ReloadOutlined} from "@ant-design/icons";
import {failed} from "../../utils/notification";
import {formatTimestamp} from "../../utils/timeUtil";
import {YakEditor} from "../../utils/editors";
import {YakScriptParamsSetter} from "./YakScriptParamsSetter";
import {InputItem, ManySelectOne, SelectOne} from "../../utils/inputUtil";
import {startExecuteYakScript} from "./ExecYakScript";
import {YakBatchExecutor} from "./batch/YakBatchExecutor";

export interface YakScriptManagerPageProp {
    type?: "yak" | "nuclei" | string
    keyword?: string
    limit?: number
    onLoadYakScript?: (s: YakScript) => any
    onlyViewer?: boolean
}

const {Text} = Typography;
const {ipcRenderer} = window.require("electron");

export const YakScriptManagerPage: React.FC<YakScriptManagerPageProp> = (props) => {
    const [response, setResponse] = useState<QueryYakScriptsResponse>({
        Data: [], Pagination: {
            Limit: props.limit || 10, Page: 1,
            Order: "desc", OrderBy: "updated_at"
        },
        Total: 0
    });
    const [selectedScript, setSelectedScript] = useState<YakScript>();
    const {Data, Pagination, Total} = response;
    const [params, setParams] = useState<QueryYakScriptRequest>({
        Pagination: {
            Limit: props.limit || 10, Page: 1,
            Order: "desc", OrderBy: "updated_at"
        }, Type: props.type || undefined,
        Keyword: props.keyword || "", IsHistory: false
    });
    const [loading, setLoading] = useState(false);

    const isMainPage = !props.onLoadYakScript

    const update = (page?: number, limit?: number) => {
        const newParams = {
            ...params
        }
        if (page) newParams.Pagination.Page = page;
        if (limit) newParams.Pagination.Limit = limit;
        setLoading(true)
        setTimeout(() => {
            setLoading(false)
        }, 3000)
        ipcRenderer.invoke("query-yak-script", newParams)
    };

    useEffect(() => {
        update(1)
    }, [params.Type])

    useEffect(() => {
        const handleData = (e: any, data: QueryYakScriptsResponse) => {
            setResponse(data)
            setTimeout(() => setLoading(false), 400)
        }
        const handleError = (e: any, data: any) => {
            failed(data)
            setTimeout(() => setLoading(false), 400)
        };
        ipcRenderer.on("client-query-yak-script-data", handleData);
        ipcRenderer.on("client-query-yak-script-error", handleError);

        update(1)
        return () => {
            ipcRenderer.removeListener("client-query-yak-script-data", handleData)
            ipcRenderer.removeListener("client-query-yak-script-error", handleError)
        }
    }, [])


    const renderTable = () => {
        return <Space direction={"vertical"} style={{width: "100%"}}>
            {!props.onlyViewer && <Form onSubmitCapture={e => {
                e.preventDefault()
                update(1)
            }} layout={"inline"}>
                <InputItem
                    label={"搜索关键字"}
                    setValue={Keyword => setParams({...params, Keyword})}
                    value={params.Keyword}
                />
                <Form.Item colon={false}>
                    <Button.Group>
                        <Button type="primary" htmlType="submit">搜索</Button>
                        <Button onClick={e => {
                            if (!params.Keyword) {
                                Modal.error({title: "关键字为空无法生成批量扫描能力"});
                                return
                            }
                            showDrawer({
                                title: "", width: "93%", mask: false, keyboard: false,
                                content: <>
                                    <YakBatchExecutor
                                        keyword={params.Keyword || ""}
                                        verbose={`自定义搜索关键字: ${params.Keyword}`}/>
                                </>,
                            })
                        }}>批量</Button>
                    </Button.Group>
                </Form.Item>
            </Form>}
            <Table<YakScript>
                dataSource={Data}
                rowKey={"Id"}
                loading={loading} bordered={true}
                scroll={{y: 750}}
                expandable={{
                    expandedRowRender: (i: YakScript) => {
                        return <div style={{height: 400}}>
                            <YakEditor
                                type={"yak"} readOnly={true} value={i.Content}
                            />
                        </div>
                    },
                }}
                onRow={isMainPage ? r => {
                    return {
                        onClick: () => {
                            setSelectedScript(r)
                        }
                    }
                } : undefined}
                pagination={{
                    size: "small",
                    pageSize: Pagination?.Limit || 10,
                    total: Total,
                    showTotal: (i) => <Tag>共{i}条历史记录</Tag>,
                    // onChange(page: number, limit?: number): any {
                    //     update(page, limit)
                    // },
                }}
                onChange={(p) => {
                    update(p.current, p.pageSize)
                }}
                columns={isMainPage ? [
                    {
                        title: "模块名称", width: 300,
                        render: (i: YakScript) => <Tag><Text
                            style={{maxWidth: 260}} copyable={true}
                            ellipsis={{tooltip: true}}>
                            {i.ScriptName}
                        </Text></Tag>
                    },
                    // {
                    //     title: "描述", render: (i: YakScript) => <Text
                    //         style={{maxWidth: 300}}
                    //         ellipsis={{tooltip: true}}
                    //     >{i.Help}</Text>, width: 330,
                    // },
                    {
                        title: "操作", fixed: "right", width: 135, render: (i: YakScript) => <Space>
                            <Button size={"small"} onClick={e => {
                                let m = showDrawer({
                                    title: "修改当前 Yak 模块", width: "90%", keyboard: false,
                                    content: <>
                                        <YakScriptCreatorForm
                                            modified={i}
                                            onCreated={(created) => {
                                                m.destroy()
                                            }}
                                        />
                                    </>
                                })
                            }}>修改</Button>
                            <Popconfirm
                                title={"确认想要删除该模块？"}
                                onConfirm={e => {
                                    ipcRenderer.invoke("delete-yak-script", i.Id)
                                    setLoading(true)
                                    setTimeout(() => update(1), 1000)
                                }}
                            >
                                <Button size={"small"} danger={true}>删除</Button>
                            </Popconfirm>
                        </Space>
                    },
                ] : [
                    {
                        title: "模块名称", fixed: "left",
                        render: (i: YakScript) => <Tag><Text style={{maxWidth: 200}} copyable={true}
                                                             ellipsis={{tooltip: true}}>
                            {i.ScriptName}
                        </Text></Tag>
                    },
                    {
                        title: "描述", render: (i: YakScript) => <Text
                            style={{maxWidth: 200}}
                            ellipsis={{tooltip: true}}
                        >{i.Help}</Text>
                    },
                    {
                        title: "操作", fixed: "right", render: (i: YakScript) => <Space>
                            {props.onLoadYakScript && <Button size={"small"} onClick={e => {
                                props.onLoadYakScript && props.onLoadYakScript(i)
                            }} type={"primary"}>加载</Button>}
                        </Space>
                    },
                ]}
            />
        </Space>
    }

    return <div>
        {!props.onlyViewer && <PageHeader
            title={"Yak 模块管理器"}
            subTitle={<Space>
                <Button
                    icon={<ReloadOutlined/>}
                    type={"link"}
                    onClick={() => {
                        update()
                    }}
                />
                {props.type ? undefined : <Form layout={"inline"}>
                    <ManySelectOne
                        formItemStyle={{marginBottom: 0, width: 200}}
                        label={"模块类型"}
                        data={[
                            {value: "yak", text: "Yak 原生模块"},
                            {value: "nuclei", text: "nuclei Yaml模块"},
                            {value: undefined, text: "全部"},
                        ]}
                        setValue={Type => setParams({...params, Type})} value={params.Type}
                    />
                </Form>}
                <div>
                    你可以在这里管理 / 添加你的 Yak 模块
                </div>
            </Space>}
            extra={[
                isMainPage ? <Popconfirm
                    title={<>
                        确定要加载本地 nuclei poc 吗？<br/>
                        可通过 <Text mark={true} copyable={true}>yak update-nuclei-poc</Text> 一键更新已知 PoC
                    </>}
                    onConfirm={() => {
                        ipcRenderer.invoke("update-nuclei-poc")
                    }}
                >
                    <Button>加载 PoC(nuclei)</Button>
                </Popconfirm> : undefined,
                <Button type={"primary"} onClick={e => {
                    let m = showDrawer({
                        title: "创建新的 Yakit 模块",
                        keyboard: false,
                        width: "95%",
                        content: <>
                            <YakScriptCreatorForm onCreated={() => {
                                update(1)
                                m.destroy()
                            }}/>
                        </>
                    })
                }}>创建新脚本</Button>
            ]}
        />}
        {(isMainPage && !props.onlyViewer) ? <Row gutter={12}>
            <Col span={8}>
                {renderTable()}
            </Col>
            <Col span={16}>
                {selectedScript ? <YakScriptOperator script={selectedScript}/> : <Empty/>}
            </Col>
        </Row> : <Row>
            <Col span={24}>
                {renderTable()}
            </Col>
        </Row>}
    </div>
};

export interface YakScriptOperatorProp {
    script: YakScript
}

export const YakScriptOperator: React.FC<YakScriptOperatorProp> = (props) => {
    const {script} = props;

    return <Card title={<Space>
        <Text>{script.ScriptName}</Text>
        <Tag color={"geekblue"}>{script.Type}</Tag>
    </Space>}>
        <Descriptions bordered={true} column={2} labelStyle={{
            width: 100,
        }}>
            <Descriptions.Item span={2} label={<Space>
                <Tag><Text>{"模块描述"}</Text></Tag>
            </Space>}>
                {script.Help}
            </Descriptions.Item>
            {script.Level && <Descriptions.Item label={<Space>
                <Tag><Text>{"模块级别"}</Text></Tag>
            </Space>}>
                {script.Level}
            </Descriptions.Item>}
            {script.Author && <Descriptions.Item label={<Space>
                <Tag><Text>{"模块作者"}</Text></Tag>
            </Space>}>
                {script.Author}
            </Descriptions.Item>}
            {script.Tags && <Descriptions.Item label={<Space>
                <Tag><Text>{"标签/关键字"}</Text></Tag>
            </Space>}>
                {script.Tags}
            </Descriptions.Item>}
        </Descriptions>
        <Divider/>
        <YakScriptParamsSetter
            submitVerbose={"执行该脚本"}
            {...script}
            params={[]}
            onParamsConfirm={r => {
                startExecuteYakScript(script, r)
            }}
        />
    </Card>
};