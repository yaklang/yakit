import React, {useEffect, useState} from "react";
import {Button, Card, Checkbox, Col, Form, Input, List, Row, Space, Tag} from "antd";
import {ReloadOutlined} from "@ant-design/icons";
import {InputInteger, InputItem, SwitchItem} from "../../utils/inputUtil";
import {HoldingIPCRenderExecStream} from "../yakitStore/PluginExecutor";
import {randomString} from "../../utils/randomUtil";
import {ExecResultLog, ExecResultProgress} from "../invoker/batch/ExecMessageViewer";
import {PluginResultUI, StatusCardProps} from "../yakitStore/viewers/base";
import {failed} from "../../utils/notification";
import {TimeIntervalItem, TimeUnit} from "../../utils/timeInterval";
import {showDrawer, showModal} from "../../utils/showModal";

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
        Concurrent: 50,
        DelayMax: 5,
        DelayMin: 1,
        OkToStop: true,
        PasswordFile: "",
        Passwords: [],
        PluginScriptName: "",
        Prefix: "",
        TargetFile: "",
        TargetTaskConcurrent: 1,
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
                                    <Tag>目标并发:{params.Concurrent}</Tag>
                                    {(params?.TargetTaskConcurrent || 1) > 1 &&
                                    <Tag>目标内爆破并发:{params.TargetTaskConcurrent}</Tag>}
                                    {params?.OkToStop ? <Tag>爆破成功即停止</Tag> : <Tag>爆破成功后仍继续</Tag>}
                                    {(params?.DelayMax || 0) > 0 && <Tag>随机暂停:{params.DelayMin}-{params.DelayMax}s</Tag>}
                                    <Button
                                        type={"link"} size={"small"}
                                        onClick={e => {
                                            showModal({
                                                title: "设置高级参数",
                                                width: "50%",
                                                content: <>
                                                    <BruteParamsForm defaultParams={params} setParams={setParams}/>
                                                </>
                                            })
                                        }}
                                    >更多参数</Button>
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

interface BruteParamsFormProp {
    defaultParams: StartBruteParams
    setParams: (p: StartBruteParams) => any
}

const BruteParamsForm: React.FC<BruteParamsFormProp> = (props) => {
    const [params, setParams] = useState<StartBruteParams>(props.defaultParams);

    useEffect(() => {
        if (!params) {
            return
        }
        props.setParams({...params})
    }, [params])

    return <Form onSubmitCapture={e => {
        e.preventDefault()

    }} labelCol={{span: 5}} wrapperCol={{span: 14}}>
        <InputItem label={"爆破用户"} setValue={
            Usernames => setParams({...params, Usernames: (Usernames || "").split("\n")})}
                   value={(params?.Usernames || []).join("\n")}
                   textarea={true} textareaRow={5}
        />
        <InputItem label={"爆破密码"} setValue={
            item => setParams({...params, Passwords: item.split("\n")})}
                   value={(params?.Passwords || []).join("\n")}
                   textarea={true} textareaRow={5}
        />

        <InputInteger
            label={"目标并发"} help={"同时爆破 n 个目标"}
            value={params.Concurrent}
            setValue={e => setParams({...params, Concurrent: e})}
        />
        <InputInteger
            label={"目标内并发"} help={"每个目标同时执行多少爆破任务"}
            value={params.TargetTaskConcurrent}
            setValue={e => setParams({...params, TargetTaskConcurrent: e})}
        />
        <SwitchItem
            label={"自动停止"} help={"遇到第一个爆破结果时终止任务"}
            setValue={OkToStop => setParams({...params, OkToStop})} value={params.OkToStop}
        />
        <InputInteger
            label={"最小延迟"} max={params.DelayMax} min={0}
            setValue={DelayMin => setParams({...params, DelayMin})} value={params.DelayMin}/>
        <InputInteger
            label={"最大延迟"} setValue={DelayMax => setParams({...params, DelayMax})}
            value={params.DelayMax}
            min={params.DelayMin}
        />
    </Form>
};