import React, {useState} from "react";
import {YakScript} from "../../invoker/schema";
import {YakitLog} from "../../../components/yakitLogSchema";
import {Card, Divider, Progress, Tabs, Timeline, Tree} from "antd";
import {LogLevelToCode} from "../../../components/HTTPFlowTable";
import {YakitLogFormatter} from "../../invoker/YakitLogFormatter";
import {ExecResultLog, ExecResultProgress} from "../../invoker/batch/ExecMessageViewer";
import {randomString} from "../../../utils/randomUtil";
import {ConvertWebsiteForestToTreeData} from "../../../components/WebsiteTree";
import {WebsiteTreeViewer} from "./WebsiteTree";
import {BasicTable} from "./BasicTable";


export interface PluginResultUIProp {
    loading: boolean
    results: ExecResultLog[]
    progress: ExecResultProgress[]
    script: YakScript
}

export const PluginResultUI: React.FC<PluginResultUIProp> = (props) => {
    const {loading, results, progress, script} = props;
    const [active, setActive] = useState("feature");

    // 处理 Progress
    const progressTable = new Map<string, number>();
    progress.forEach(i => {
        let percent = progressTable.get(i.id)
        if (!percent) {
            progressTable.set(i.id, i.progress)
        } else {
            progressTable.set(i.id, Math.max(percent, i.progress))
        }
    })
    let progressBars: { id: string, node: React.ReactNode }[] = [];
    progressTable.forEach((v, k) => {
        progressBars.push({
            id: k, node: <Card size={"small"} hoverable={false} bordered={true} title={`任务进度ID：${k}`}>
                <Progress percent={parseInt((v * 100).toFixed(0))} status="active"/>
            </Card>,
        })
    })
    progressBars = progressBars.sort((a, b) => a.id.localeCompare(b.id));

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
        features.slice(features.length - 1)
        : [];

    return <Tabs
        size={"small"}
        activeKey={active}
        onChange={setActive}
    >
        {(finalFeatures || []).map(i => {
            return <Tabs.TabPane
                tab={`插件结果视图[${i.feature}]`}
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
                    {progressTable.size > 0 && progressBars.map(i => i.node)}
                    <Timeline pending={loading} style={{marginTop: 10, marginBottom: 10}}>
                        {(results || []).filter(i => {
                            return i.level !== "json-feature"
                        }).map(e => {
                            return <Timeline.Item color={LogLevelToCode(e.level)}>
                                <YakitLogFormatter data={e.data} level={e.level} timestamp={e.timestamp}/>
                            </Timeline.Item>
                        })}
                    </Timeline>
                </Card>
            </>}
        </Tabs.TabPane>
    </Tabs>
};

export interface YakitFeatureRenderProp {
    feature: string
    params: any
    execResultsLog: ExecResultLog[]
}

export const YakitFeatureRender: React.FC<YakitFeatureRenderProp> = (props) => {
    switch (props.feature) {
        case "website-trees":
            return <div>
                <WebsiteTreeViewer {...props.params}/>
            </div>
        case "fixed-table":
            return <div>
                <Card
                    bodyStyle={{padding: 0}} title={`输出表：${props.params.table_name}`}
                    size={"small"}
                >
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
                </Card>
            </div>
    }
    return <div>
        Other
    </div>
};