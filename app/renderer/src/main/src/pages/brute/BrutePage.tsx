import React, {useEffect, useState} from "react";
import {Button, Card, Col, Form, Layout, List, Checkbox, Row, Upload, Space, Input} from "antd";
import {InboxOutlined, ReloadOutlined, UploadOutlined} from "@ant-design/icons";
import {InputInteger, InputItem, SwitchItem} from "../../utils/inputUtil";
import {HoldingIPCRenderExecStream} from "../../pages/yakitStore/PluginExecutor";
import {randomString} from "../../utils/randomUtil";
import {ExecResultLog, ExecResultProgress} from "../../pages/invoker/batch/ExecMessageViewer";
import {PluginResultUI, StatusCardProps} from "../../pages/yakitStore/viewers/base";
import {failed} from "../../utils/notification";

const {ipcRenderer} = window.require("electron");

export interface StartBruteParams {
    Type: string
    Targets: string
    TargetFile?: string
    Usernames?: string[]
    UsernameFile?: string
    Passwords?: string[]
    PasswordFile?: string

    Prefix?: string

    Concurrent?: number
    TargetTaskConcurrent?: number

    OkToStop?: boolean
    DelayMin?: number
    DelayMax?: number

    PluginScriptName?: string
}

export interface BrutePageProp {

}

export const BrutePage: React.FC<BrutePageProp> = (props) => {
    const [availableTypes, setAvailableTypes] = useState<string[]>([]);
    const [typeLoading, setTypeLoading] = useState(false);
    const [selectedType, setSelectedType] = useState<string>("");
    const [targetTextRow, setTargetTextRow] = useState(false);
    const [allowTargetFileUpload, setAllowTargetFileUpload] = useState(false);
    const [advanced, setAdvanced] = useState(false);
    const [taskToken, setTaskToken] = useState("");
    const [resetTrigger, setResetTrigger] = useState(false);
    const reset = () => {
        setResetTrigger(!resetTrigger)
        setLogs([])
        setStatusCards([])
        setProgress([])
    }

    // execStream
    const [logs, setLogs] = useState<ExecResultLog[]>([]);
    const [progress, setProgress] = useState<ExecResultProgress[]>([]);
    const [statusCards, setStatusCards] = useState<StatusCardProps[]>([]);
    const [xtermRef, setXtermRef] = useState<any>();
    const [loading, setLoading] = useState(false);

    // params
    const [params, setParams] = useState<StartBruteParams>({
        Concurrent: 0,
        DelayMax: 0,
        DelayMin: 0,
        OkToStop: false,
        PasswordFile: "",
        Passwords: [],
        PluginScriptName: "",
        Prefix: "",
        TargetFile: "",
        TargetTaskConcurrent: 0,
        Targets: "",
        Type: "",
        UsernameFile: "",
        Usernames: []
    });

    useEffect(() => {
        setParams({...params, Type: selectedType})
    }, [selectedType])

    const loadTypes = () => {
        setTypeLoading(true);
        ipcRenderer.invoke("GetAvailableBruteTypes").then((d: { Types: string[] }) => {
            const types = d.Types.sort((a, b) => a.localeCompare(b))
            setAvailableTypes(types)

            if (selectedType.length <= 0 && d.Types.length > 0) {
                setSelectedType([types[0]].join(","))
            }
        }).catch(e => {
        }).finally(() => setTimeout(() => setTypeLoading(false), 300))
    }

    useEffect(() => {
        if (availableTypes.length <= 0) {
            loadTypes()
        }

        const token = randomString(40);
        setTaskToken(token);
        return HoldingIPCRenderExecStream(
            "brute",
            "StartBrute",
            token,
            xtermRef,
            setLogs, setProgress, setStatusCards,
            () => {
                setTimeout(() => setLoading(false), 300)
            }
        )
    }, [resetTrigger, xtermRef])

    return <div style={{height: "100%", backgroundColor: "#fff", width: "100%", display: "flex"}}>
        <div style={{height: "100%", width: 200,}}>
            <Card
                loading={typeLoading}
                size={"small"}
                style={{marginRight: 8, height: "100%"}} bodyStyle={{padding: 8}}
                title={<div>
                    可用爆破类型 <Button
                    type={"link"}
                    size={"small"}
                    icon={<ReloadOutlined/>}
                    onClick={() => {
                        loadTypes()
                    }}
                />
                </div>}
            >
                <List<string>
                    dataSource={availableTypes}
                    renderItem={i => {
                        const included = selectedType.includes(i);
                        return <div key={i} style={{margin: 4}}>
                            <Checkbox checked={included} onChange={e => {
                                e.preventDefault()

                                if (included) {
                                    setSelectedType([...selectedType.split(",").filter(target => i !== target)].join(","))
                                } else {
                                    setSelectedType([...selectedType.split(",").filter(target => i !== target), i].join(","))
                                }
                            }}>
                                {i}
                            </Checkbox>
                        </div>
                    }}
                />
            </Card>
        </div>
        <div style={{flex: 1, width: "100%", display: "flex", flexDirection: "column"}}>
            <Row style={{marginBottom: 30, marginTop: 35,}}>
                <Col span={3}/>
                <Col span={17}>
                    <Form onSubmitCapture={e => {
                        e.preventDefault()

                        if ((!params.Targets) && (!params.TargetFile)) {
                            failed("不允许空目标")
                            return
                        }
                        if (!params.Type) {
                            failed("不允许空类型")
                            return
                        }

                        alert(JSON.stringify(params))
                        setLoading(true)
                        ipcRenderer.invoke("StartBrute", params, taskToken)
                    }} style={{width: "100%", textAlign: "center", alignItems: "center"}}>
                        <Space direction={"vertical"} style={{width: "100%"}} size={4}>
                            <div style={{display: "flex", flexDirection: "row", alignItems: "center"}}>
                                <span style={{marginRight: 8}}>输入目标: </span>
                                <Form.Item
                                    required={true}
                                    style={{marginBottom: 0, flex: '1 1 0px'}}
                                >
                                    {targetTextRow ? <Input.TextArea/> : <Row style={{
                                        width: "100%", display: "flex", flexDirection: "row",
                                    }}>
                                        <Input
                                            style={{marginRight: 8, height: 42, flex: 1}} allowClear={true}
                                            onChange={e => {
                                                setParams({...params, Targets: e.target.value})
                                            }}
                                        />
                                        {loading ? <Button
                                            style={{height: 42, width: 180}}
                                            type={"primary"}
                                            onClick={() => {
                                                ipcRenderer.invoke("cancel-StartBrute", taskToken)
                                            }}
                                            danger={true}
                                        >立即停止任务</Button> : <Button
                                            style={{height: 42, width: 180}}
                                            type={"primary"} htmlType={"submit"}
                                        >开始检测</Button>}
                                    </Row>}
                                </Form.Item>
                            </div>
                            <div style={{textAlign: "right", width: "100%"}}>
                                <Space>
                                    <span>
                                        上传文件：
                                        <Checkbox checked={allowTargetFileUpload} onClick={e => {
                                            setAllowTargetFileUpload(!allowTargetFileUpload)
                                        }}/>
                                    </span>
                                    <span>
                                        高级配置：
                                        <Checkbox checked={advanced} onClick={e => {
                                            setAdvanced(!advanced)
                                        }}/>
                                    </span>
                                    <Button
                                        danger={true}
                                        onClick={() => {
                                            setLoading(false)
                                            reset()
                                        }}
                                        size={"small"}
                                        type={"link"}
                                    >重置数据</Button>
                                </Space>
                            </div>
                            {advanced && <div style={{textAlign: "left"}}>
                                <Form onSubmitCapture={e => e.preventDefault()} size={"small"} layout={"inline"}>
                                    <SwitchItem
                                        label={"自动字典"} setValue={() => {
                                    }} formItemStyle={{marginBottom: 0}}/>
                                    <InputItem
                                        label={"爆破用户"} style={{marginBottom: 0}}
                                        suffix={<Button size={"small"} type={"link"}>
                                            导入文件
                                        </Button>}
                                    />
                                    <InputItem
                                        label={"爆破密码"} style={{marginBottom: 0}}
                                        suffix={<Button size={"small"} type={"link"}>
                                            导入文件
                                        </Button>}
                                    />
                                    <InputInteger label={"并发目标"} setValue={() => {
                                    }} formItemStyle={{marginBottom: 0}}/>
                                    <InputInteger label={"随机延时"} setValue={() => {
                                    }} formItemStyle={{marginBottom: 0}}/>
                                </Form>
                            </div>}
                        </Space>
                    </Form>
                </Col>
            </Row>
            {/*<Row style={{marginBottom: 8}}>*/}
            {/*    <Col span={24}>*/}
            {/*        */}
            {/*    </Col>*/}
            {/*</Row>*/}
            <Card style={{flex: 1, overflow: "auto"}}>
                <PluginResultUI
                    // script={script}
                    loading={loading} progress={progress}
                    results={logs}
                    statusCards={statusCards}
                    onXtermRef={setXtermRef}
                />
            </Card>
        </div>
    </div>
};