import React, {useEffect, useState} from "react";
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox";
import {
    HybridScanControlRequest,
    HybridScanInputTarget,
    HybridScanPluginConfig,
    HybridScanResponse,
    HybridScanStatisticResponse
} from "@/models/HybridScan";
import {ExecResult, genDefaultPagination} from "@/pages/invoker/schema";
import {Space, Tag} from "antd";
import {AutoCard} from "@/components/AutoCard";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {randomString} from "@/utils/randomUtil";
import {failed, info} from "@/utils/notification";
import {useCookieState} from "ahooks";

export interface HybridScanDemoProp {

}


const {ipcRenderer} = window.require("electron");

export const HybridScanDemo: React.FC<HybridScanDemoProp> = (props) => {
    const [token, setToken] = useState(randomString(40))
    const [loading, setLoading] = useState(false);

    const [target, setTarget] = React.useState<HybridScanInputTarget>({
        Input: `http://www.example.com/`, InputFile: [],
        HTTPRequestTemplate: {
            IsHttps: false, IsRawHTTPRequest: false, RawHTTPRequest: new Uint8Array(),
            Method: "GET", Path: ["/"], GetParams: [], Headers: [], Cookie: [],
            Body: new Uint8Array(), PostParams: [], MultipartParams: [], MultipartFileParams: [],
        },
    })
    const [plugin, setPlugin] = React.useState<HybridScanPluginConfig>({
        PluginNames: ["基础 XSS 检测"],
        Filter: {Pagination: genDefaultPagination() /* Pagination is ignore for hybrid scan */}
    })

    const [status, setStatus] = React.useState<HybridScanStatisticResponse>({
        ActiveTargets: 0,
        ActiveTasks: 0,
        FinishedTargets: 0,
        FinishedTasks: 0,
        HybridScanTaskId: "",
        TotalPlugins: 0,
        TotalTargets: 0,
        TotalTasks: 0
    })

    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e, data: HybridScanResponse) => {
            setStatus(data)
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            failed(`[HybridScan] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            info("[HybridScan] finished")
            setLoading(false)
        })
        return () => {
            ipcRenderer.invoke("cancel-HybridScan", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [token])

    return <YakitResizeBox
        firstRatio={"350px"}
        firstMinSize={"280px"}
        firstNode={<AutoCard title={"设置参数"} size={"small"} extra={<div>
            <YakitButton disabled={loading} onClick={() => {
                ipcRenderer.invoke("HybridScan", {
                    Control: true, HybridScanMode: "new",
                } as HybridScanControlRequest, token).then(() => {
                    info(`启动成功，任务ID: ${token}`)
                    setLoading(true)

                    // send target / plugin
                    ipcRenderer.invoke("HybridScan", {Targets: target, Plugin: plugin}, token).then(() => {
                        info("发送扫描目标与插件成功")
                    })
                })
            }}>启动</YakitButton>
            <YakitButton disabled={!loading} onClick={() => {
                ipcRenderer.invoke("cancel-HybridScan", token)
                setTimeout(() => {
                    setToken(randomString(40))
                }, 100)
            }}>
                停止任务
            </YakitButton>
        </div>}>
            <Space direction={"vertical"}>
                <div>默认INPUT: {target.Input}</div>
                <div>插件启用：</div>
                {plugin.PluginNames.map(i => {
                    return <Tag>{i}</Tag>
                })}
            </Space>
        </AutoCard>}
        secondNode={<AutoCard title={"执行结果"}>
            <Space direction={"vertical"}>
                {JSON.stringify(status)}
            </Space>
        </AutoCard>}
    />
};