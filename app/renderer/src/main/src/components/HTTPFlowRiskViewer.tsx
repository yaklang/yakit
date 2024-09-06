import React, {useState} from "react"
import {Card, Divider, Space} from "antd"
import {LogLevelToCode} from "./HTTPFlowTable/HTTPFlowTable"
import {YakEditor} from "@/utils/editors"
import {CopyComponents, YakitTag} from "./yakitUI/YakitTag/YakitTag"
import {YakitSwitch} from "./yakitUI/YakitSwitch/YakitSwitch"
import {YakitButton} from "./yakitUI/YakitButton/YakitButton"
import {showYakitModal} from "./yakitUI/YakitModal/YakitModalConfirm"

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
    const {risk} = props
    const {risk_name, is_https, url, highlight, request, response, fragment, level} = risk
    const [showFragment, setShowFragment] = useState(false)

    return (
        <>
            <Card
                style={{width: "100%"}}
                size={"small"}
                title={
                    <>
                        <YakitTag color={LogLevelToCode(level) as any}>{level.toUpperCase()}</YakitTag>
                        <span>{risk_name}</span>
                        <Divider type={"vertical"} />
                        {highlight !== "" && (fragment || []).length > 0 ? (
                            <span style={{color: "#85899e", display: "inline-flex", alignItems: "center"}}>
                                详情：
                                <YakitSwitch checked={showFragment} onChange={setShowFragment} />
                            </span>
                        ) : undefined}
                    </>
                }
                bodyStyle={{overflow: "hidden", width: "100%"}}
                extra={
                    <YakitButton
                        type='text'
                        onClick={() => {
                            showYakitModal({
                                title: "JSON Object",
                                content: <div style={{overflow: "auto"}}>{JSON.stringify(props.risk)}</div>,
                                bodyStyle: {padding: 24},
                                footer: null
                            })
                        }}
                    >
                        JSON
                    </YakitButton>
                }
            >
                <Space direction={"vertical"} style={{width: "100%"}}>
                    <div style={{display: "flex", alignItems: "center"}}>
                        <YakitTag>URL</YakitTag>
                        <div style={{display: "flex", alignItems: "center"}}>
                            :<span style={{marginLeft: 8}}>{url}</span>
                            <CopyComponents copyText={url} />
                        </div>
                    </div>
                    {showFragment &&
                        (fragment || []).map((i) => (
                            <Card bordered={false} hoverable={true} bodyStyle={{padding: 8}}>
                                <Space direction={"vertical"} style={{width: "100%"}}>
                                    <div style={{display: "flex", alignItems: "center"}}>
                                        <span style={{marginLeft: 8}}>{highlight}</span>
                                        <CopyComponents copyText={highlight} />
                                    </div>
                                    <YakEditor readOnly={true} value={i} type={"http"} noWordWrap={true} full={true} />
                                </Space>
                            </Card>
                        ))}
                </Space>
            </Card>
        </>
    )
}
