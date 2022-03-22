import React, {useEffect, useRef, useState} from "react";
import {YakScript} from "../../invoker/schema";
import {YakitLog} from "../../../components/yakitLogSchema";
import {Card, Col, Divider, Progress, Row, Space, Statistic, Tabs, Timeline, Tree} from "antd";
import {LogLevelToCode} from "../../../components/HTTPFlowTable";
import {YakitLogFormatter} from "../../invoker/YakitLogFormatter";
import {ExecResultLog, ExecResultProgress} from "../../invoker/batch/ExecMessageViewer";
import {randomString} from "../../../utils/randomUtil";
import {ConvertWebsiteForestToTreeData} from "../../../components/WebsiteTree";
import {WebsiteTreeViewer} from "./WebsiteTree";
import {BasicTable} from "./BasicTable";
import {XTerm} from "xterm-for-react";
import {formatDate} from "../../../utils/timeUtil";
import { xtermFit } from "../../../utils/xtermUtils";
import { CVXterm } from "../../../components/CVXterm";
import { AutoCard } from "../../../components/AutoCard";

const {ipcRenderer} = window.require("electron");

export interface StatusCardProps {
    Id: string
    Data: string
    Timestamp: number
    Tag?: string
}

export interface StatusCardInfoProps {
    tag: string
    info: StatusCardProps[]
}

export type ExecResultStatusCard = StatusCardProps

export interface PluginResultUIProp {
    loading: boolean
    results: ExecResultLog[]
    featureType: ExecResultLog[]
    feature?: ExecResultLog[]
    progress: ExecResultProgress[]
    statusCards: StatusCardInfoProps[]
    script?: YakScript
    defaultConsole?: boolean

    onXtermRef?: (ref: any) => any
    debugMode?: boolean
}

const idToColor = (id: string) => {
    switch (true) {
        case id.includes("success"):
        case id.includes("成功"):
        case id.includes("succeeded"):
        case id.includes("finished"):
            return "#b7eb8f"
        case id.includes("error"):
        case id.includes("失败"):
        case id.includes("错误"):
        case id.includes("fatal"):
        case id.includes("missed"):
        case id.includes("miss"):
        case id.includes("failed"):
        case id.includes("panic"):
            return "#ea5f5f"
        default:
            return "#8c8c8c"
    }
}

export const PluginResultUI: React.FC<PluginResultUIProp> = React.memo((props) => {
    const {loading, results, featureType = [], feature = [], progress, script, statusCards} = props;
    const [active, setActive] = useState(props.defaultConsole ? "console" : "feature-0");
    const xtermRef = useRef(null)
    const timer = useRef<any>(null)

    useEffect(() => {
        if (!xtermRef) {
            return
        }
        if (props.onXtermRef) props.onXtermRef(xtermRef);
    }, [xtermRef])

    let progressBars: { id: string, node: React.ReactNode }[] = [];
    progress.forEach((v) => {
        progressBars.push({
            id: v.id, node: <Card size={"small"} hoverable={false} bordered={true} title={`任务进度ID：${v.id}`}>
                <Progress percent={parseInt((v.progress * 100).toFixed(0))} status="active"/>
            </Card>,
        })
    })
    // progressBars = progressBars.sort((a, b) => a.id.localeCompare(b.id));

    const features: { feature: string, params: any, key: string }[] = featureType.filter(i => {
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

    const timelineItemProps = (results || []).filter(i => {
        return !((i?.level || "").startsWith("json-feature") || (i?.level || "").startsWith("feature-"))
    }).splice(0, 25);

    return <div style={{width: "100%", height: "100%", overflow: "hidden auto"}}>
        {/* <div style={{width: "100%", height: "100%", display: "flex", flexDirection: "column", overflow: "auto"}}> */}
        {props.debugMode && props.onXtermRef && <>
            <div style={{width: "100%", height: 240}}>
                <XTerm ref={xtermRef} options={{convertEol: true, rows: 8}}
                       onResize={(r) => {
                           xtermFit(xtermRef, 50, 18)
                       }}
                       customKeyEventHandler={(e) => {
                        if (e.keyCode === 67 && (e.ctrlKey || e.metaKey)) {
                            const str = xtermRef?.current ? (xtermRef.current as any).terminal.getSelection() : ""
    
                            if (timer.current) {
                                clearTimeout(timer.current)
                                timer.current = null
                            }
                            timer.current = setTimeout(() => {
                                ipcRenderer.invoke("copy-clipboard", str).finally(() => {
                                    timer.current = null
                                })
                            }, 300)
                        }
                        return true
                    }}
                />
            </div>
        </>}
        {statusCards.length > 0 && <div style={{marginTop: 8, marginBottom: 8}}>
            <Row gutter={8}>
                {statusCards.map((card, cardIndex) => {
                    return <Col key={card.tag} span={8} style={{marginBottom: 8}}>
                        <Card hoverable={true} bodyStyle={{padding: 12}}>
                            <div>
                                <h2>{card.tag}</h2>
                                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                    {card.info.map((info, infoIndex) => {
                                        return <Statistic valueStyle={{
                                            color: idToColor(info.Id),
                                            textAlign: `${(infoIndex >= 1) && (card.info.length === infoIndex + 1) ? 'right' : 'left'}`
                                        }} key={info.Id} title={card.info.length > 1 ? info.Id : ''} value={info.Data}/>
                                    })}
                                </div>
                            </div>

                        </Card>
                    </Col>
                })}
            </Row>
        </div>}
        {progressBars.length > 0 && <div style={{marginTop: 4, marginBottom: 8}}>
            {progressBars.map(i => i.node)}
        </div>}
        <Tabs
            style={{flex: 1}}
            className={"main-content-tabs"}
            size={"small"}
            activeKey={active}
            onChange={activeKey => {
                setActive(activeKey)
                setTimeout(() => {
                    if (xtermRef && props.debugMode) xtermFit(xtermRef, 50, 18)
                }, 50);
            }}
        >
            {(finalFeatures || []).map((i, index) => {
                return <Tabs.TabPane
                    tab={YakitFeatureTabName(i.feature, i.params)}
                    key={`feature-${index}`}>
                    <YakitFeatureRender
                        params={i.params} feature={i.feature}
                        execResultsLog={feature || []}
                    />
                </Tabs.TabPane>
            })}
            <Tabs.TabPane tab={"基础插件信息 / 日志"} key={finalFeatures.length > 0 ? "log" : "feature-0"}>
                {<>
                    {/*<Divider orientation={"left"}>Yakit Module Output</Divider>*/}
                    <AutoCard
                        size={"small"} hoverable={true} bordered={true} title={<Space>
                        <div>
                            任务额外日志与结果
                        </div>
                        {(timelineItemProps || []).length > 0 ? formatDate(timelineItemProps[0].timestamp) : ""}
                    </Space>}
                        style={{marginBottom: 20, marginRight: 2}}
                        bodyStyle={{overflowY: "auto"}}
                    >
                        <Timeline pending={loading} style={{marginTop: 10, marginBottom: 10}}>
                            {timelineItemProps.map((e, index) => {
                                return <Timeline.Item key={index} color={LogLevelToCode(e.level)}>
                                    <YakitLogFormatter data={e.data} level={e.level} timestamp={e.timestamp} 
                                    onlyTime={true}/>
                                </Timeline.Item>
                            })}
                        </Timeline>
                    </AutoCard>
                </>}
            </Tabs.TabPane>
            {!props.debugMode && props.onXtermRef && <Tabs.TabPane tab={"Console"} key={"console"}>
                <div style={{width: "100%", height: "100%"}}>
                    <CVXterm 
                        ref={xtermRef} 
                        options={{convertEol: true}}
                    />
                    {/* <XTerm ref={xtermRef} options={{convertEol: true, rows: 8}}
                        onResize={(r) => {
                            xtermFit(xtermRef, 50, 18)
                        }}
                        customKeyEventHandler={(e) => {
                            if (e.keyCode === 67 && (e.ctrlKey || e.metaKey)) {
                                const str = xtermRef?.current ? (xtermRef.current as any).terminal.getSelection() : ""
        
                                if (timer.current) {
                                    clearTimeout(timer.current)
                                    timer.current = null
                                }
                                timer.current = setTimeout(() => {
                                    ipcRenderer.invoke("copy-clipboard", str).finally(() => {
                                        timer.current = null
                                    })
                                }, 300)
                            }
                            return true
                        }}
                    /> */}
                </div>
            </Tabs.TabPane>}
        </Tabs>
        {/* </div> */}
    </div>
});

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
            return <div style={{height: "100%"}}>
                <WebsiteTreeViewer {...props.params}/>
            </div>
        case "fixed-table":
            return <div style={{height: "100%", display: "flex", flexFlow: "column", overflowY: "auto"}}>
                <BasicTable
                    columns={(props.params["columns"] || []) as string[]}
                    data={(props.execResultsLog || []).filter(i => i.level === "feature-table-data").map(i => {
                        try {
                            const originData = JSON.parse(i.data)
                            return {...originData.data, table_name: originData?.table_name};
                        } catch (e) {
                            return {} as any
                        }

                    }).filter(i => {
                        try {
                            if ((i?.table_name || "") === (props.params?.table_name || "")) {
                                return true
                            }
                        } catch (e) {
                            return false
                        }
                        return false
                    })}
                />
            </div>
    }
    return <div>
        Other
    </div>
};