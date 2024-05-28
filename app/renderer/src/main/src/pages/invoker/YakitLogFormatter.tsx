import React from "react";
import {Button, Card, Col, Divider, Row, Space, Tag, Timeline} from "antd";
import {formatTimestamp} from "../../utils/timeUtil";
import {showModal} from "../../utils/showModal";
import {GraphData} from "../graph/base";
import {BarGraph} from "../graph/BarGraph";
import {PieGraph} from "../graph/PieGraph";
import {ExecResultLog} from "./batch/ExecMessageViewer";
import {LogLevelToCode} from "../../components/HTTPFlowTable/HTTPFlowTable";
import {HTTPFlowRiskViewer, YakitHTTPFlowRisk} from "../../components/HTTPFlowRiskViewer";
import {YakEditor} from "../../utils/editors";
import {AutoCard} from "../../components/AutoCard";
import MDEditor from "@uiw/react-md-editor";
import {openABSFileLocated} from "../../utils/openWebsite";
import {callCopyToClipboard} from "../../utils/basic";
import {RiskDetails} from "../risks/RiskTable";
import {Risk} from "../risks/schema";

export interface YakitLogViewersProp {
    data: ExecResultLog[]
    finished?: boolean
    onlyTime?: boolean
}

export const YakitLogViewers = React.memo((props: YakitLogViewersProp) => {
    return <Timeline pending={!props.finished} reverse={true}>
        {(props.data || []).map(e => {
            return <Timeline.Item color={LogLevelToCode(e.level)}>
                <YakitLogFormatter data={e.data} level={e.level} timestamp={e.timestamp} onlyTime={props.onlyTime}/>
            </Timeline.Item>
        })}
    </Timeline>
});

export interface YakitLogFormatterProp {
    level: string
    data: string | any
    timestamp: number
    onlyTime?: boolean
    isCollapsed?: boolean
}


export const YakitLogFormatter: React.FC<YakitLogFormatterProp> = (props) => {
    switch (props.level) {
        case "file":
            try {
                const obj = JSON.parse(props.data) as {
                    title: string,
                    description: string,
                    path: string,
                    is_dir: boolean,
                    is_existed: boolean,
                    file_size: string,
                    dir: string,
                };
                return <div>
                    <AutoCard
                        size={"small"}
                        title={`${obj.title}`}
                        extra={<Space>
                            <Button size={"small"} onClick={() => {
                                callCopyToClipboard(obj.path)
                            }}>复制文件名</Button>
                            <Button
                                type={"primary"}
                                size={"small"}
                                disabled={!obj.is_existed}
                                onClick={() => {
                                    openABSFileLocated(obj.path)
                                }}
                            >打开文件位置</Button>
                        </Space>}
                    >
                        <Space direction={"vertical"}>
                            {obj.description && <div>
                                {obj.description}
                            </div>}
                            <Space>
                                {!obj.is_existed && <Tag color={"red"}>未创建成功</Tag>}
                                {obj.is_dir ? <Tag color={"orange"}>文件夹</Tag> : <Tag>非文件夹</Tag>}
                                {obj.file_size && <Tag color={"geekblue"}>{obj.file_size}</Tag>}
                            </Space>
                            <div>{obj.path}</div>
                        </Space>
                    </AutoCard>
                </div>
            } catch (e) {
                return <div style={{height: 150}}>
                    <AutoCard style={{padding: 0}} bodyStyle={{padding: 0}}>
                        <YakEditor readOnly={true} type={"http"} value={props.data}/>
                    </AutoCard>
                </div>
            }
        case "json-risk":
            try {
                return <RiskDetails info={JSON.parse(props.data) as Risk} shrink={true}/>
            } catch (e) {
                return <div>Risk</div>
            }
        case "json":
            return <div style={{display: 'flex'}}>
                <div style={{width: 70}}>
                    {props.timestamp > 0 &&
                        <Tag color={"geekblue"}>{formatTimestamp(props.timestamp, props.onlyTime)}</Tag>}
                </div>
                <pre style={{
                    backgroundColor: '#f4f4f4', // 设置背景色
                    border: '1px solid #ddd', // 设置边框
                    borderRadius: '5px', // 设置边框圆角
                    padding: '10px', // 设置内边距
                    whiteSpace: 'pre-wrap', // 保留换行符
                    fontFamily: 'Courier New, Courier, monospace', // 设置字体
                    fontSize: '14px', // 设置字号
                    lineHeight: '1.5', // 设置行高
                    overflowX: 'auto' // 水平滚动条
                }}>{props.data}</pre>
            </div>
        case "markdown":
            return <MDEditor.Markdown source={props.data}/>
        case "text":
            return <div style={{height: 300}}>
                <AutoCard style={{padding: 0}} bodyStyle={{padding: 0}}>
                    <YakEditor readOnly={true} type={"http"} value={props.data}/>
                </AutoCard>
            </div>
        case "success":
            return <Space direction={"vertical"} style={{width: "100%"}}>
                {props.timestamp > 0 &&
                    <Tag color={"geekblue"}>{formatTimestamp(props.timestamp, props.onlyTime)}</Tag>}
                <Card size={"small"} title={<Tag color={"green"}>模块执行结果</Tag>}>
                    {props.data}
                </Card>
            </Space>
        case "json-table":
            let obj: { head: string[], data: string[][] } = JSON.parse(props.data)
            return <Space direction={"vertical"} style={{width: "100%"}}>
                {props.timestamp > 0 &&
                    <Tag color={"geekblue"}>{formatTimestamp(props.timestamp, props.onlyTime)}</Tag>}
                <Card
                    size={"small"} title={<Tag color={"green"}>直接结果(表格)</Tag>}
                    extra={[
                        <Button onClick={e => showModal({
                            title: "JSON 数据",
                            content: <>
                                {JSON.stringify(obj)}
                            </>
                        })}>JSON</Button>
                    ]}
                >
                    {(obj.head || []).length > 0 && <Row gutter={4}>
                        {(obj.head || []).map(i => <Col span={24.0 / (obj.head.length)}>
                            <div style={{border: "2px"}}>
                                {i}
                            </div>
                        </Col>)}
                        <Divider style={{marginTop: 4, marginBottom: 4}}/>
                    </Row>}
                    {(obj.data || []).length > 0 && <>
                        {obj.data.map(i => <Row>
                            {(i || []).map(element => {
                                return <Col span={24.0 / (i.length)}>
                                    {element}
                                </Col>
                            })}
                        </Row>)}
                    </>}
                </Card>
            </Space>
        case "json-httpflow-risk":
            try {
                return <HTTPFlowRiskViewer risk={JSON.parse(props.data) as YakitHTTPFlowRisk}/>
            } catch (e) {
                console.info(e)
                return <div/>
            }
        case "json-feature":
            return <div/>
        case "json-graph":
            let graphData: GraphData = JSON.parse(props.data);
            return <Space direction={"vertical"}>
                {props.timestamp > 0 &&
                    <Tag color={"geekblue"}>{formatTimestamp(props.timestamp, props.onlyTime)}</Tag>}
                <Card
                    size={"small"} title={<Tag color={"green"}>直接结果(图)</Tag>}
                    extra={[
                        <Button onClick={e => showModal({
                            title: "JSON 数据",
                            content: <>
                                {JSON.stringify(graphData)}
                            </>
                        })}>JSON</Button>
                    ]}
                >
                    {(() => {
                        switch (graphData.type) {
                            case "bar":
                                return <div>
                                    <BarGraph {...graphData}/>
                                </div>
                            case "pie":
                                return <div>
                                    <PieGraph {...graphData}/>
                                </div>
                        }
                        return <div>{props.data}</div>
                    })()}
                </Card>
            </Space>
    }
    return <Space>
        {/*{props.timestamp > 0 && <Tag color={"geekblue"}>{formatTimestamp(props.timestamp, props.onlyTime)}</Tag>}*/}
        <div>
            [{formatTimestamp(props.timestamp, props.onlyTime)}]: {props.data}
        </div>
    </Space>
};