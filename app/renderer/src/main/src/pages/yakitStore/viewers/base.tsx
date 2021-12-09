import React, {useState} from "react";
import {YakScript} from "../../invoker/schema";
import {YakitLog} from "../../../components/yakitLogSchema";
import {Card, Col, Divider, Progress, Row, Statistic, Tabs, Timeline, Tree} from "antd";
import {LogLevelToCode} from "../../../components/HTTPFlowTable";
import {YakitLogFormatter} from "../../invoker/YakitLogFormatter";
import {ExecResultLog, ExecResultProgress} from "../../invoker/batch/ExecMessageViewer";
import {randomString} from "../../../utils/randomUtil";
import {ConvertWebsiteForestToTreeData} from "../../../components/WebsiteTree";
import {WebsiteTreeViewer} from "./WebsiteTree";
import {BasicTable} from "./BasicTable";


export interface StatusCardProps {
    Id: string
    Data: string
    Timestamp: number
}

export interface PluginResultUIProp {
    loading: boolean
    results: ExecResultLog[]
    progress: ExecResultProgress[]
    statusCards: StatusCardProps[]
    script: YakScript
}

export const PluginResultUI: React.FC<PluginResultUIProp> = (props) => {
    const {loading, results, progress, script, statusCards} = props;
    const [active, setActive] = useState("feature");

    let progressBars: { id: string, node: React.ReactNode }[] = [];
    progress.forEach((v) => {
        progressBars.push({
            id: v.id, node: <Card size={"small"} hoverable={false} bordered={true} title={`任务进度ID：${v.id}`}>
                <Progress percent={parseInt((v.progress * 100).toFixed(0))} status="active"/>
            </Card>,
        })
    })
    // progressBars = progressBars.sort((a, b) => a.id.localeCompare(b.id));

    const features: { feature: string, params: any, key: string }[] = results.filter(i => {
        return i.level === "json-feature"
    }).map(i => {
        try {
            let res = JSON.parse(i.data) as { feature: string, params: any, key: string };
            if (!res.key) {
                res.key = randomString(50)
            }
            return res
        } catch (e) {
            return {feature: "", params: undefined, key: ""}
        }
    }).filter(i => i.feature !== "");


    const finalFeatures = features.length > 0 ?
        features.filter((data, i) => features.indexOf(data) === i)
        : [];

    return <div style={{width: "100%"}}>
        {statusCards.length > 0 && <div style={{marginTop: 8, marginBottom: 8}}>
            <Row gutter={8}>
                {statusCards.map((card, index) => {
                    return <Col key={card.Id} span={8}>
                        <Card hoverable={true} bodyStyle={{padding: 12}}>
                            <Statistic title={card.Id} value={card.Data}/>
                        </Card>
                    </Col>
                })}
            </Row>
        </div>}
        {progressBars.length > 0 && <div style={{marginTop: 4, marginBottom: 8}}>
            {progressBars.map(i => i.node)}
        </div>}
        <Tabs
            size={"small"}
            activeKey={active}
            onChange={setActive}
        >
            {(finalFeatures || []).map(i => {
                return <Tabs.TabPane
                    tab={YakitFeatureTabName(i.feature, i.params)}
                    key={"feature"}>
                    <YakitFeatureRender
                        params={i.params} feature={i.feature}
                        execResultsLog={results}
                    />
                </Tabs.TabPane>
            })}
            <Tabs.TabPane tab={"基础插件信息 / 日志"} key={finalFeatures.length > 0 ? "log" : "feature"}>
                {<>
                    <Divider orientation={"left"}>Yakit Module Output</Divider>
                    <Card
                        size={"small"} hoverable={true} bordered={true} title={`任务额外日志与结果`}
                        style={{marginBottom: 20, marginRight: 2}}
                    >
                        <Timeline pending={loading} style={{marginTop: 10, marginBottom: 10}}>
                            {(results || []).filter(i => {
                                return !(i.level.startsWith("json-feature") || i.level.startsWith("feature-"))
                            }).splice(0, 25).map((e,index) => {
                                return <Timeline.Item key={index} color={LogLevelToCode(e.level)}>
                                    <YakitLogFormatter data={e.data} level={e.level} timestamp={e.timestamp}/>
                                </Timeline.Item>
                            })}
                        </Timeline>
                    </Card>
                </>}
            </Tabs.TabPane>
        </Tabs>
    </div>
};

export interface YakitFeatureRenderProp {
    feature: string
    params: any
    execResultsLog: ExecResultLog[]
}

export const YakitFeatureTabName = (feature: string, params: any) => {
    switch (feature) {
        case "website-trees":
            return "网站树结构 / Website Map";
        case "fixed-table":
            return params["table_name"] || "输出表";
    }
    return feature.toUpperCase
}

export const YakitFeatureRender: React.FC<YakitFeatureRenderProp> = (props) => {
    switch (props.feature) {
        case "website-trees":
            return <div>
                <WebsiteTreeViewer {...props.params} maxHeight={400}/>
            </div>
        case "fixed-table":
            return <div>
                <BasicTable
                    columns={(props.params["columns"] || []) as string[]}
                    data={(props.execResultsLog || []).filter(i => i.level === "feature-table-data").map(i => {
                        try {
                            return JSON.parse(i.data).data;
                        } catch (e) {
                            return {} as any
                        }

                    })}
                />
            </div>
    }
    return <div>
        Other
    </div>
};