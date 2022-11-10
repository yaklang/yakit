import React, {useState} from "react";
import {Button, Card, Descriptions, Divider, Space, Switch, Tag} from "antd";
import {LogLevelToCode} from "./HTTPFlowTable/HTTPFlowTable";
import {CopyableField} from "../utils/inputUtil";
import {showModal} from "../utils/showModal";
import {CodeViewer} from "../utils/codeViewer";

export interface HTTPFlowRiskViewerProp {
    risk: YakitHTTPFlowRisk
}

export interface YakitHTTPFlowRisk {
    url: string
    is_https: string
    highlight: string
    request: Uint8Array
    response: Uint8Array
    fragment: string[]
    level: "low" | "middle" | "high" | "critical" | "medium"
    risk_name: string
}

export const HTTPFlowRiskViewer: React.FC<HTTPFlowRiskViewerProp> = (props) => {
    const {risk} = props;
    const {risk_name, is_https, url, highlight, request, response, fragment, level} = risk;
    const [showFragment, setShowFragment] = useState(false);

    return <>
        <Card
            style={{width: "100%"}}
            size={"small"} title={<>
            <Tag color={LogLevelToCode(level) as any}>{level.toUpperCase()}</Tag>
            <span>{risk_name}</span>
            <Divider type={"vertical"}/>
            {
                highlight !== "" && (fragment || []).length > 0 ?
                    <span style={{color: "#999"}}>详情：<Switch size={"small"} checked={showFragment}
                                                             onChange={setShowFragment}/></span> : undefined
            }
        </>}
            bodyStyle={{overflow: "hidden", width: "100%"}}
            extra={[
                <Button type={"link"} onClick={() => {
                    showModal({
                        title: "JSON Object",
                        width: "50%",
                        content: <div style={{overflow: "auto"}}>
                            {JSON.stringify(props.risk)}
                        </div>
                    })
                }}>JSON</Button>
            ]}>
            <Space direction={"vertical"} style={{width: "100%"}}>
                <Descriptions bordered={false} size={"small"} column={2}>
                    <Descriptions.Item label={<Tag>URL</Tag>} span={2}>
                        <CopyableField text={url} width={"100%"}/>
                    </Descriptions.Item>
                </Descriptions>
                {showFragment && fragment.map(i => <Card
                    bordered={false} hoverable={true}
                    bodyStyle={{padding: 8}}
                >
                    <Space direction={"vertical"} style={{width: "100%"}}>
                        <CopyableField text={highlight}/>
                        <CodeViewer
                            mode={"http"}
                            value={i} highlightKeywords={highlight.split(",")}
                            width={"100%"} height={300}
                        />
                    </Space>
                </Card>)}
            </Space>
        </Card>
    </>
};