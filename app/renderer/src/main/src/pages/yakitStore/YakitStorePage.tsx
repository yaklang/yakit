import React, {useEffect, useState} from "react";
import {Button, Card, Col, List, Popconfirm, Row, Space, Tabs, Tag} from "antd";
import {ReloadOutlined} from "@ant-design/icons";
import {showModal} from "../../utils/showModal";
import {AutoUpdateYakModuleViewer} from "../../utils/basic";
import {QueryYakScriptRequest, QueryYakScriptsResponse, YakScript} from "../invoker/schema";
import {failed} from "../../utils/notification";
import {SettingOutlined} from "@ant-design/icons";
import {CopyableField} from "../../utils/inputUtil";
import {formatDate, formatTimestamp} from "../../utils/timeUtil";

const {ipcRenderer} = window.require("electron");

export interface YakitStorePageProp {

}

export const YakitStorePage: React.FC<YakitStorePageProp> = (props) => {
    return <div style={{height: "100%"}}>
        <Row style={{height: "100%"}}>
            <Col span={8} style={{height: "100%"}}>
                <Card
                    bodyStyle={{padding: 0, paddingRight: 16, overflow: "auto"}}
                    bordered={true}
                    style={{height: "100%", overflow: "auto"}}
                    title={<Space>
                        插件商店
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
                            <Button size={"small"} type={"link"}><ReloadOutlined/></Button>
                        </Popconfirm>
                    </Space>}
                    size={"small"} extra={[]}
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
                            {tab: "MITM", key: "yak-mitm"},
                        ].map(e => {
                            return <Tabs.TabPane tab={e.tab} key={e.key}>
                                <YakModuleList Keyword={""} Type={e.key as any}/>
                            </Tabs.TabPane>
                        })}
                    </Tabs>
                </Card>
            </Col>
            <Col span={16}>
                <Card
                    title={<Space>
                        <div>
                            Yak 模块
                        </div>
                        <Tag>{}</Tag>
                    </Space>} bordered={false} size={"small"}
                >

                </Card>
            </Col>
        </Row>
    </div>
};

export interface YakModuleListProp {
    Type: "yak" | "yak-mitm" | "nuclei",
    Keyword: string
}

export const YakModuleList: React.FC<YakModuleListProp> = (props) => {
    const [params, setParams] = useState<QueryYakScriptRequest>({
        IsHistory: false,
        Keyword: props.Keyword,
        Pagination: {Limit: 10, Order: "desc", Page: 1, OrderBy: "updated_at"},
        Type: props.Type
    });
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<QueryYakScriptsResponse>({
        Data: [], Pagination: {
            Limit: 10, Page: 1,
            Order: "desc", OrderBy: "updated_at"
        }, Total: 0
    });


    const update = (page?: number, limit?: number) => {
        const newParams = {
            ...params
        }
        if (page) newParams.Pagination.Page = page;
        if (limit) newParams.Pagination.Limit = limit;

        setLoading(true)
        ipcRenderer.invoke("QueryYakScript", newParams).then(data => {
            setResponse(data)
        }).catch(e => {
            failed("Query Local Yak Script failed: " + `${e}`)
        }).finally(() => {
            setTimeout(() => setLoading(false), 200)
        })
    }

    useEffect(() => {
        update(1)
    }, [props.Type, props.Keyword])

    return <List<YakScript>
        loading={loading} style={{width: "100%"}}
        dataSource={response.Data} split={false}
        pagination={{
            size: "small",
            pageSize: response.Pagination.Limit || 10,
            total: response.Total,
            showTotal: (i) => <Tag>Total:{i}</Tag>,
            onChange: update
        }}
        renderItem={(i: YakScript) => {
            let isAnonymous = false;
            if (i.Author === "" || i.Author === "anonymous") {
                isAnonymous = true
            }

            return <List.Item style={{marginLeft: 0}} key={i.Id}>
                <Card
                    size={"small"} bordered={true} hoverable={true}
                    title={i.ScriptName} style={{width: "100%"}}
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