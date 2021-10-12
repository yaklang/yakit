import React, {useEffect, useState} from "react";
import {Col, PageHeader, Row} from "antd";
import {YakEditor} from "../../utils/editors";

const {ipcRenderer} = window.require("electron");

export interface AnalyzerPageProp {
    isHttps: boolean
    request: string
    response: string
}

export const AnalyzerPage: React.FC<AnalyzerPageProp> = (props) => {
    const [response, setResponse] = useState<any>();
    const [error, setError] = useState("");

    useEffect(() => {
        ipcRenderer.invoke("http-analyze", {
            IsHTTPS: props.isHttps,
            Request: props.request,
            Response: props.response,
        })
    }, [props])

    useEffect(() => {
        ipcRenderer.on("client-http-analyze-data", (e, data) => {
        })
        ipcRenderer.on("client-http-analyze-error", (e, details) => {
            setError(details)
        })
        return () => {
        }
    }, [])

    return <div>
        <PageHeader title={"HTTP 模糊测试分析器"}/>
        <Row gutter={8}>
            <Col span={12}>
                <div style={{height: 500}}>
                    <YakEditor value={props.request} readOnly={true}/>
                </div>
            </Col>
            <Col span={12}>
                <div style={{height: 500}}>
                    <YakEditor value={props.response} readOnly={true}/>
                </div>
            </Col>
        </Row>
    </div>
};