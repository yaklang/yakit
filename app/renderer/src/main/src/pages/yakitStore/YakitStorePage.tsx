import React, {useEffect, useState} from "react";
import {Button, Card, Col, Empty, Form, Input, List, Popconfirm, Popover, Row, Space, Tabs, Tag} from "antd";
import {DownloadOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, SettingOutlined} from "@ant-design/icons";
import {showDrawer, showModal} from "../../utils/showModal";
import {AutoUpdateYakModuleViewer} from "../../utils/basic";
import {QueryYakScriptRequest, QueryYakScriptsResponse, YakScript} from "../invoker/schema";
import {failed} from "../../utils/notification";
import {CopyableField, SwitchItem} from "../../utils/inputUtil";
import {formatDate} from "../../utils/timeUtil";
import {PluginManagement, PluginOperator} from "./PluginOperator";
import {YakScriptCreatorForm} from "../invoker/YakScriptCreator";

const {ipcRenderer} = window.require("electron");

export interface YakitStorePageProp {

}

export const YakitStorePage: React.FC<YakitStorePageProp> = (props) => {
    const [script, setScript] = useState<YakScript>();
    const [trigger, setTrigger] = useState(false);
    const [keyword, setKeyword] = useState("");
    const [ignored, setIgnored] = useState(false);
    const [history, setHistory] = useState(false);

    const [loading, setLoading] = useState(false)

    useEffect(() => {
        setLoading(true)
        setTimeout(() => {
            setLoading(false)
        }, 200)
    }, [script])

    return <div style={{height: "100%"}}>
        <Row style={{height: "100%"}} gutter={16}>
            <Col span={8} style={{height: "100%"}}>
                <Card
                    bodyStyle={{padding: 0, paddingRight: 16, overflow: "auto"}}
                    bordered={true}
                    style={{height: "100%", overflow: "auto"}}
                    title={<Space>
                        插件商店
                        <Button
                            size={"small"}
                            type={"link"}
                            onClick={e => setTrigger(!trigger)}
                        >
                            <ReloadOutlined/>
                        </Button>
                        <Button
                            size={"small"} type={"link"}
                            onClick={e => {
                                let m = showModal({
                                    title: "设置 Keyword",
                                    content: <>
                                        <KeywordSetter
                                            defaultIgnore={ignored}
                                            defaultHistory={history}
                                            onFinished={(e, ignored, history) => {
                                                setKeyword(e)
                                                setIgnored(ignored)
                                                setHistory(history)
                                                m.destroy()
                                            }} defaultValue={keyword}
                                        />
                                    </>
                                })
                            }}
                        >
                            <SearchOutlined/>
                        </Button>
                    </Space>}
                    size={"small"}
                    extra={<Space>
                        <Popconfirm
                            title={"更新模块数据库？"}
                            onConfirm={e => {
                                showModal({
                                    title: "自动更新 Yak 模块", content: <>
                                        <AutoUpdateYakModuleViewer/>
                                    </>, width: "60%",
                                })
                            }}
                        >
                            <Button size={"small"} type={"primary"} icon={<DownloadOutlined/>}>
                                更新商店
                            </Button>
                        </Popconfirm>
                        <Button
                            size={"small"} type={"link"} icon={<PlusOutlined/>}
                            onClick={() => {
                                let m = showDrawer({
                                    title: "创建新插件", width: "100%",
                                    content: <>
                                        <YakScriptCreatorForm
                                            onChanged={e => setTrigger(!trigger)}
                                            onCreated={() => {
                                                m.destroy()
                                            }}
                                        />
                                    </>, keyboard: false,
                                })
                            }}
                        >新插件</Button>
                    </Space>}
                >
                    <Tabs
                        tabPosition={"left"} size={"small"}
                        style={{margin: 8, marginLeft: 8, paddingRight: 8, width: "100%", overflow: "auto"}}
                        tabBarStyle={{
                            padding: 0, margin: 0, width: 70, marginLeft: -20
                        }}
                        direction={"ltr"}
                    >
                        {[
                            {tab: "YAK", key: "yak"},
                            {tab: "YAML", key: "nuclei"},
                            {tab: "MITM", key: "mitm"},
                        ].map(e => {
                            return <Tabs.TabPane tab={e.tab} key={e.key}>
                                <YakModuleList
                                    currentId={script?.Id} Keyword={keyword} Type={e.key as any}
                                    onClicked={setScript} trigger={trigger} isHistory={history}
                                    isIgnored={ignored}
                                />
                            </Tabs.TabPane>
                        })}
                    </Tabs>
                </Card>
            </Col>
            <Col span={16}>
                {script ? (
                    <Card
                        loading={loading}
                        title={<Space>
                            <div>
                                Yak[{script?.Type}] 模块详情
                            </div>
                        </Space>} bordered={false} size={"small"}
                    >
                        <PluginOperator yakScriptId={script.Id}/>
                    </Card>
                ) : <Empty style={{marginTop: 100}}>
                    在左侧所选模块查看详情
                </Empty>}
            </Col>
        </Row>
    </div>
};

export interface YakModuleListProp {
    Type: "yak" | "mitm" | "nuclei",
    Keyword: string
    onClicked: (y: YakScript) => any
    currentId?: number
    trigger?: boolean
    isIgnored?: boolean
    isHistory?: boolean
}

export const YakModuleList: React.FC<YakModuleListProp> = (props) => {
    const [params, setParams] = useState<QueryYakScriptRequest>({
        IsHistory: props.isHistory,
        Keyword: props.Keyword,
        Pagination: {Limit: 10, Order: "desc", Page: 1, OrderBy: "updated_at"},
        Type: props.Type, IsIgnore: props.isIgnored
    });
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<QueryYakScriptsResponse>({
        Data: [], Pagination: {
            Limit: 10, Page: 1,
            Order: "desc", OrderBy: "updated_at"
        }, Total: 0
    });
    const [trigger, setTrigger] = useState(false);


    const update = (page?: number, limit?: number,
                    keyword?: string, Type?: string,
                    isIgnore?: boolean, isHistory?: boolean
    ) => {
        const newParams = {
            ...params
        }
        if (page) newParams.Pagination.Page = page;
        if (limit) newParams.Pagination.Limit = limit;

        newParams.Keyword = keyword;
        newParams.Type = Type;
        newParams.IsIgnore = isIgnore
        newParams.IsHistory = isHistory
        setLoading(true)
        ipcRenderer.invoke("QueryYakScript", newParams).then(data => {
            setResponse(data)
        }).catch((e: any) => {
            failed("Query Local Yak Script failed: " + `${e}`)
        }).finally(() => {
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
    }, [
        props.trigger, props.Keyword, props.Type, props.isHistory, props.isIgnored, trigger,
    ])


    return <List<YakScript>
        loading={loading} style={{width: "100%"}}
        dataSource={response.Data} split={false}
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
            let isAnonymous = false;
            if (i.Author === "" || i.Author === "anonymous") {
                isAnonymous = true
            }

            return <List.Item style={{marginLeft: 0}} key={i.Id}>
                <Card
                    size={"small"} bordered={true} hoverable={true}
                    title={i.ScriptName} style={{
                    width: "100%",
                    backgroundColor: props.currentId === i.Id ? "rgba(79,188,255,0.26)" : "#fff"
                }}
                    onClick={() => props.onClicked(i)}
                >
                    <Row>
                        <Col span={24}>
                            <CopyableField
                                style={{width: "100%", color: "#5f5f5f", marginBottom: 5}}
                                text={i.Help || "No Description about it."}
                                noCopy={true}
                            />
                        </Col>
                    </Row>
                    <Row style={{marginBottom: 4}}>
                        {i.Tags && <Col span={24}>
                            <div style={{width: "100%", textAlign: "right", color: "#888888"}}>
                                {/*{(i.Tags.split(",")).map(word => {*/}
                                {/*    return <Tag>{word}</Tag>*/}
                                {/*})}*/}
                                TAG:{i.Tags}
                            </div>
                        </Col>}
                    </Row>
                    <Row>
                        <Col span={12}>
                            <Space style={{width: "100%"}}>
                                <Tag color={isAnonymous ? "gray" : "geekblue"}>{i.Author || "anonymous"}</Tag>
                            </Space>
                        </Col>
                        <Col span={12} style={{textAlign: "right"}}>
                            <Space>
                                <CopyableField noCopy={true} text={formatDate(i.CreatedAt)}/>

                                <Button
                                    size={"small"} type={"link"} style={{marginRight: 0}}
                                    onClick={() => {
                                        const modal = showModal({
                                            title: `插件管理: ${i.ScriptName}`,
                                            content: <>
                                                <PluginManagement script={i} vertical={true} update={() => {
                                                    setLoading(true)
                                                    modal.destroy()
                                                    setTimeout(() => {
                                                        setTrigger(!trigger)
                                                    }, 300)
                                                }}/>
                                            </>
                                        })
                                    }}
                                >
                                    <SettingOutlined/>
                                </Button>
                            </Space>
                        </Col>
                    </Row>
                </Card>
            </List.Item>
        }}
    >

    </List>
};


interface KeywordSetterProp {
    onFinished: (s: string, ignored: boolean, history: boolean) => any
    defaultValue: string
    defaultIgnore: boolean
    defaultHistory: boolean
}

const KeywordSetter: React.FC<KeywordSetterProp> = (props) => {
    const [keyword, setKeyword] = useState(props.defaultValue);
    const [ignored, setIgnored] = useState(props.defaultIgnore)
    const [history, setHistory] = useState(props.defaultHistory)

    return <div>
        <Form onSubmitCapture={e => {
            e.preventDefault()

            props.onFinished(keyword, ignored, history)
        }} layout={"vertical"} style={{
            marginLeft: 10, marginTop: 6
        }}>
            <Form.Item label={"插件关键字"}>
                <Input value={keyword} onChange={e => {
                    setKeyword(e.target.value)
                }}/>
            </Form.Item>
            <SwitchItem label={"查看历史记录"} value={history} setValue={setHistory}/>
            <SwitchItem label={"查看已忽略/隐藏的插件"} value={ignored} setValue={setIgnored}/>
            <Form.Item>
                <Button type="primary" htmlType="submit"> Search </Button>
            </Form.Item>
        </Form>
    </div>
};