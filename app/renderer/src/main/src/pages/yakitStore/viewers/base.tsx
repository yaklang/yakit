import React from "react";
import {YakScript} from "../../invoker/schema";
import {YakitLog} from "../../../components/yakitLogSchema";
import {Card, Divider, Progress, Tabs, Timeline, Tree} from "antd";
import {LogLevelToCode} from "../../../components/HTTPFlowTable";
import {YakitLogFormatter} from "../../invoker/YakitLogFormatter";
import {ExecResultLog, ExecResultProgress} from "../../invoker/batch/ExecMessageViewer";
import {randomString} from "../../../utils/randomUtil";
import {ConvertWebsiteForestToTreeData} from "../../../components/WebsiteTree";
import {WebsiteTreeViewer} from "./WebsiteTree";

export const PluginResultUI = (loading: boolean, results: ExecResultLog[], progress: ExecResultProgress[], script: YakScript) => {
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

    const features: ({ feature: string, params: any } | undefined)[] = results.filter(i => {
        return i.level === "json-feature"
    }).map(i => {
        try {
            return JSON.parse(i.data) as { feature: string, params: any };
        } catch (e) {
            return undefined
        }
    }).filter(i => !!i);

    const basicNode = <>
        <Divider orientation={"left"}>Yakit Module Output</Divider>
        <Card
            size={"small"} hoverable={true} bordered={true} title={`任务额外日志与结果`}
            style={{marginBottom: 20, marginRight: 2}}
        >
            {progressTable.size > 0 && progressBars.map(i => i.node)}
            <Timeline pending={loading} style={{marginTop: 10, marginBottom: 10}}>
                {(results || []).sort().filter(i => i.level === "json-feature").map(e => {
                    return <Timeline.Item color={LogLevelToCode(e.level)}>
                        <YakitLogFormatter data={e.data} level={e.level} timestamp={e.timestamp}/>
                    </Timeline.Item>
                })}
            </Timeline>
        </Card>
    </>;

    const finalFeatures = features.filter(i => !!i) as { feature: string, params: any }[];

    if (finalFeatures.length > 0) {
        return <Tabs size={"small"}>
            {finalFeatures.map(i => {
                let feature = i.feature;
                return <Tabs.TabPane
                    tab={`插件结果视图[${i.feature}]`}
                    key={randomString(200)}>
                    <YakitFeatureRender params={i.params} feature={i.feature}/>
                </Tabs.TabPane>
            })}
            <Tabs.TabPane tab={"基础插件信息 / 日志"} key={"log"}>
                {basicNode}
            </Tabs.TabPane>
        </Tabs>
    }

    return basicNode
};

export interface YakitFeatureRenderProp {
    feature: string
    params: any
}

export const YakitFeatureRender: React.FC<YakitFeatureRenderProp> = (props) => {
    switch (props.feature) {
        case "website-trees":
            return <div>
                <WebsiteTreeViewer {...props.params}/>
            </div>
    }
    return <div>
        Other
    </div>
};