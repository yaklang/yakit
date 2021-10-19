import React, {useEffect, useRef, useState} from "react";
import {Button, Card, Col, Divider, Empty, Form, PageHeader, Row, Slider, Space, Spin, Switch, Tabs, Tag} from "antd";
import {InputItem, MultiSelectForString, SelectOne, SwitchItem} from "../../utils/inputUtil";
import {randomString} from "../../utils/randomUtil";
import {ExecResult} from "../invoker/schema";
import {failed, info} from "../../utils/notification";
import {XTerm} from "xterm-for-react";
import {writeExecResultXTerm, xtermClear, xtermFit} from "../../utils/xtermUtils";
import {ClosedPortTableViewer, OpenPortTableViewer} from "./PortTable";
import {YakitLogFormatterProp} from "../invoker/YakitLogFormatter";
import {ExtractExecResultMessageToYakitPort, YakitPort} from "../../components/yakitLogSchema";
import {PortAssetDescription, PortAssetTable} from "../assetViewer/PortAssetPage";
import {PortAsset} from "../assetViewer/models";


const {ipcRenderer} = window.require("electron");

export interface PortScanPageProp {

}

export interface PortScanParams {
    Targets: string
    Ports: string
    Mode: "syn" | "fingerprint" | "all",
    Proto: ("tcp" | "udp")[],
    Concurrent: number,
    Active: boolean
    FingerprintMode: "service" | "web" | "all"
    SaveToDB: boolean
    SaveClosedPorts: boolean
}

export const PortScanPage: React.FC<PortScanPageProp> = (props) => {
    const [params, setParams] = useState<PortScanParams>({
        Ports: "22,443,445,80,8000-8004,3306,3389,5432,8080-8084,7000-7005", Mode: "fingerprint",
        Targets: "",
        Active: true,
        Concurrent: 50,
        FingerprintMode: "all",
        Proto: ["tcp"],
        SaveClosedPorts: false,
        SaveToDB: true
    });
    const [loading, setLoading] = useState(false);
    const [resettingData, setResettingData] = useState(false);
    const [token, setToken] = useState("");
    const xtermRef = useRef(null);
    const [resetTrigger, setResetTrigger] = useState(false);
    const [openPorts, setOpenPorts] = useState<YakitPort[]>([]);
    const [closedPorts, setClosedPorts] = useState<YakitPort[]>([]);
    const [port, setPort] = useState<PortAsset>();
    const [advanced, setAdvanced] = useState(false);

    useEffect(() => {
        if (xtermRef) xtermFit(xtermRef, 128, 10);
    });

    useEffect(() => {
        if (!xtermRef) {
            return
        }

        const token = randomString(40);
        setToken(token)

        const openPorts: YakitPort[] = [];
        const closedPorts: YakitPort[] = [];
        ipcRenderer.on(`${token}-data`, async (e: any, data: ExecResult) => {
            if (data.IsMessage) {
                try {
                    let messageJsonRaw = Buffer.from(data.Message).toString("utf8");
                    let logInfo = ExtractExecResultMessageToYakitPort(JSON.parse(messageJsonRaw));
                    if (!logInfo) {
                        return
                    }
                    if (logInfo.isOpen) {
                        openPorts.unshift(logInfo)
                    } else {
                        closedPorts.unshift(logInfo)
                    }
                } catch (e) {
                    failed("解析端口扫描结果失败...")
                }
            }
            writeExecResultXTerm(xtermRef, data)
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            failed(`[PortScan] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            info("[PortScan] finished")
            setLoading(false)
        })

        const syncPorts = () => {
            if (openPorts) setOpenPorts([...openPorts]);
            if (closedPorts) setClosedPorts([...closedPorts]);
        }
        let id = setInterval(syncPorts, 1000)
        return () => {
            clearInterval(id);
            ipcRenderer.invoke("cancel-PortScan", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [xtermRef, resetTrigger])

    return <div>
        <Tabs>
            <Tabs.TabPane tab={"扫描端口操作台"} key={"scan"}>
                <Row gutter={12}>
                    <Col span={8} md={8} xxl={6}>
                        <Form
                            onSubmitCapture={e => {
                                e.preventDefault()

                                if (!token) {
                                    failed("No Token Assigned")
                                    return
                                }

                                if (params.Targets === "") {
                                    failed("需要设置扫描主机")
                                    return;
                                }

                                setLoading(true)
                                ipcRenderer.invoke("PortScan", params, token)
                            }}
                            layout={"vertical"}
                        >
                            <Spin spinning={loading}>
                                <SelectOne label={"扫描模式"} data={[
                                    {value: "syn", text: "SYN"},
                                    {value: "fingerprint", text: "指纹"},
                                    {value: "all", text: "SYN+指纹"},
                                ]} help={"SYN 扫描需要 yak 启动时具有root"}
                                           setValue={Mode => setParams({...params, Mode})} value={params.Mode}
                                />
                                <InputItem label={"扫描目标"} setValue={Targets => setParams({...params, Targets})}
                                           value={params.Targets}/>
                                <InputItem label={"扫描端口"} setValue={Ports => setParams({...params, Ports})}
                                           value={params.Ports}
                                />
                                <Form.Item label={"并发"}
                                           help={`最多同时扫描${params.Concurrent}个端口`} style={{width: "100%"}}
                                >
                                    <Slider
                                        style={{width: "90%"}}
                                        onChange={value => setParams({...params, Concurrent: value})}
                                        value={params.Concurrent}
                                        min={1} max={200}
                                    />
                                </Form.Item>
                                <Divider orientation={"left"}>高级选项 <Switch size={"small"} checked={advanced}
                                                                           onChange={setAdvanced}/></Divider>
                                {advanced && <>
                                    {/*<MultiSelectForString*/}
                                    {/*    label={"协议"}*/}
                                    {/*    data={[*/}
                                    {/*        {value: "tcp", label: "TCP"},*/}
                                    {/*        {value: "udp", label: "UDP"},*/}
                                    {/*    ]}*/}
                                    {/*    setValue={Proto => setParams({...params, Proto: Proto.split(",") as any})}*/}
                                    {/*    value={params.Proto.join(",")}*/}
                                    {/*/>*/}
                                    <SwitchItem
                                        label={"主动模式"} help={"允许指纹探测主动发包"}
                                        setValue={Active => setParams({...params, Active})} value={params.Active}
                                    />
                                    <SwitchItem
                                        label={"扫描结果入库"}
                                        setValue={SaveToDB => {
                                            setParams({...params, SaveToDB, SaveClosedPorts: false})
                                        }} value={params.SaveToDB}
                                    />
                                    {params.SaveToDB && <SwitchItem
                                        label={"保存关闭的端口"}
                                        setValue={SaveClosedPorts => setParams({...params, SaveClosedPorts})}
                                        value={params.SaveClosedPorts}
                                    />}
                                    {
                                        params.Mode !== "syn" && <SelectOne
                                            label={"高级指纹选项"}
                                            data={[
                                                {value: "web", text: "仅web指纹"},
                                                {value: "service", text: "仅nmap指纹"},
                                                {value: "all", text: "全部指纹"},
                                            ]}
                                            setValue={FingerprintMode => setParams({...params, FingerprintMode})}
                                            value={params.FingerprintMode}
                                        />
                                    }
                                </>}
                            </Spin>

                            <Form.Item>
                                {loading ? <Button
                                        style={{
                                            width: "100%", height: 38,
                                        }}
                                        type="primary" danger={true}
                                        onClick={() => {
                                            ipcRenderer.invoke("cancel-PortScan", token)
                                        }}
                                    > 立即停止扫描 </Button> :
                                    <Button style={{
                                        width: "100%", height: 38,
                                    }} type="primary" htmlType="submit"> 开始扫描端口 </Button>}

                            </Form.Item>
                        </Form>
                    </Col>
                    <Col span={16} md={16} xxl={18}>
                        <div>
                            <Row>
                                <Col span={24} style={{marginBottom: 8}}>
                                    <div style={{
                                        textAlign: "right"
                                    }}>
                                        {loading ? <Tag color={"green"}>正在执行...</Tag> : <Tag>
                                            闲置中...
                                        </Tag>}
                                        <Button disabled={resettingData || loading} size={"small"} onClick={e => {
                                            xtermClear(xtermRef);
                                            setResettingData(true)
                                            setResetTrigger(!resetTrigger)
                                            setTimeout(() => {
                                                setResettingData(false)
                                            }, 1200)
                                        }} type={"link"} danger={true}>清空缓存结果</Button>
                                    </div>
                                </Col>
                                <Col span={24}>
                                    <div style={{width: "100%", overflow: "auto"}}>
                                        <XTerm ref={xtermRef} options={{
                                            convertEol: true, disableStdin: true,
                                        }} onResize={r => xtermFit(xtermRef, r.cols, 10)}/>
                                    </div>
                                </Col>
                            </Row>
                            <Spin spinning={resettingData}>
                                <Row style={{marginTop: 6}} gutter={6}>
                                    <Col span={16}>
                                        <OpenPortTableViewer data={openPorts}/>
                                    </Col>
                                    <Col span={8}>
                                        <ClosedPortTableViewer data={closedPorts}/>
                                    </Col>
                                </Row>
                            </Spin>
                        </div>
                    </Col>
                </Row>
            </Tabs.TabPane>
            <Tabs.TabPane tab={"端口资产管理"} key={"port"}>
                <Row gutter={12}>
                    <Col span={16}>
                        <PortAssetTable onClicked={(i) => {
                            setPort(i)
                        }}/>
                    </Col>
                    <Col span={8}>
                        {port ? <PortAssetDescription port={port}/> : <Empty>
                            点击端口列表查看内容
                        </Empty>}
                    </Col>
                </Row>
            </Tabs.TabPane>
        </Tabs>
    </div>
};