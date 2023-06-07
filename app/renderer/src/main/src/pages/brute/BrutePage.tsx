import React, {useEffect, useState} from "react"
import {Button, Card, Checkbox, Col, Form, Row, Space, Spin, Tag} from "antd"
import {ReloadOutlined} from "@ant-design/icons"
import {InputInteger, InputItem, SwitchItem} from "../../utils/inputUtil"
import {randomString} from "../../utils/randomUtil"
import {PluginResultUI} from "../yakitStore/viewers/base"
import {warn, failed} from "../../utils/notification"
import {showModal} from "../../utils/showModal"
import {AutoCard} from "../../components/AutoCard"
import useHoldingIPCRStream from "../../hook/useHoldingIPCRStream"
import {SelectItem} from "../../utils/SelectItem"
import { xtermClear } from "../../utils/xtermUtils"
import { ContentUploadInput } from "../../components/functionTemplate/ContentUploadTextArea"

const {ipcRenderer} = window.require("electron")

export interface StartBruteParams {
    Type: string
    Targets: string
    TargetFile?: string
    Usernames?: string[]
    UsernamesDict?: string[]
    UsernameFile?: string
    ReplaceDefaultUsernameDict?: boolean
    Passwords?: string[]
    PasswordsDict?: string[]
    PasswordFile?: string
    ReplaceDefaultPasswordDict?: boolean

    Prefix?: string

    Concurrent?: number
    TargetTaskConcurrent?: number

    OkToStop?: boolean
    DelayMin?: number
    DelayMax?: number

    PluginScriptName?: string

    usernameValue?: string
    passwordValue?: string
}

export interface BrutePageProp {
    sendTarget?: string
}

export const BrutePage: React.FC<BrutePageProp> = (props) => {
    const [typeLoading, setTypeLoading] = useState(false)
    const [availableTypes, setAvailableTypes] = useState<string[]>([])
    const [selectedType, setSelectedType] = useState<string[]>([])
    const [advanced, setAdvanced] = useState(false)
    const [taskToken, setTaskToken] = useState(randomString(40))
    
    const [loading, setLoading] = useState(false)
    const [uploadLoading, setUploadLoading] = useState(false)

    const [infoState, {reset, setXtermRef}, xtermRef] = useHoldingIPCRStream("brute", "StartBrute", taskToken, () => {
        setTimeout(() => setLoading(false), 300)
    })

    // params
    const [params, setParams] = useState<StartBruteParams>({
        Concurrent: 50,
        DelayMax: 5,
        DelayMin: 1,
        OkToStop: true,
        PasswordFile: "",
        Passwords: [],
        PasswordsDict: [],
        ReplaceDefaultPasswordDict: false,
        PluginScriptName: "",
        Prefix: "",
        TargetFile: "",
        TargetTaskConcurrent: 1,
        Targets: props.sendTarget ? JSON.parse(props.sendTarget || "[]").join(",") : "",
        Type: "",
        UsernameFile: "",
        Usernames: [],
        UsernamesDict: [],
        ReplaceDefaultUsernameDict: false,

        usernameValue: "",
        passwordValue: ""
    })

    useEffect(() => {
        setParams({...params, Type: selectedType.join(",")})
    }, [selectedType])

    const loadTypes = () => {
        setTypeLoading(true)
        ipcRenderer
            .invoke("GetAvailableBruteTypes")
            .then((d: { Types: string[] }) => {
                const types = d.Types.sort((a, b) => a.localeCompare(b))
                setAvailableTypes(types)

                if (selectedType.length <= 0 && d.Types.length > 0) {
                    setSelectedType([types[0]])
                }
            })
            .catch((e: any) => {
            })
            .finally(() => setTimeout(() => setTypeLoading(false), 300))
    }

    useEffect(() => {
        if (availableTypes.length <= 0) loadTypes()
    }, [])

    return (
        <div style={{width: "100%", height: "100%", display: "flex", flexFlow: "row"}}>
            <div style={{height: "100%", width: 200}}>
                <Card
                    loading={typeLoading}
                    size={"small"}
                    style={{marginRight: 8, height: "100%"}}
                    bodyStyle={{padding: 8}}
                    title={
                        <div>
                            可用爆破类型{" "}
                            <Button
                                type={"link"}
                                size={"small"}
                                icon={<ReloadOutlined/>}
                                onClick={() => {
                                    loadTypes()
                                }}
                            />
                        </div>
                    }
                >
                    <Checkbox.Group
                        value={selectedType}
                        style={{marginLeft: 4}}
                        onChange={(checkedValue) => setSelectedType(checkedValue as string[])}
                    >
                        {availableTypes.map((item) => (
                            <Row key={item}>
                                <Checkbox value={item}>{item}</Checkbox>
                            </Row>
                        ))}
                    </Checkbox.Group>
                </Card>
            </div>
            <div style={{flex: 1,overflow: "hidden"}}>
                <div style={{height: "100%", display: "flex", flexDirection: "column"}}>
                    <Row style={{marginBottom: 30, marginTop: 35}}>
                    <Col span={3}/>
                    <Col span={17}>
                        <Form
                            onSubmitCapture={(e) => {
                                e.preventDefault()

                                if (!params.Targets && !params.TargetFile) {
                                    failed("请填写爆破目标")
                                    return
                                }

                                if (!params.Type) {
                                    failed("请至少选择一个爆破类型")
                                    return
                                }

                                const info = JSON.parse(JSON.stringify(params))
                                info.Usernames = (info.Usernames || []).concat(info.UsernamesDict || [])
                                delete info.UsernamesDict
                                info.Passwords = (info.Passwords || []).concat(info.PasswordsDict || [])
                                delete info.PasswordsDict

                                info.Targets = info.Targets.split(",").join("\n")

                                xtermClear(xtermRef)
                                reset()
                                setLoading(true)

                                setTimeout(() => {
                                    ipcRenderer.invoke("StartBrute", info, taskToken)
                                }, 300)
                            }}
                            style={{width: "100%", textAlign: "center", alignItems: "center"}}
                        >
                            <Space direction={"vertical"} style={{width: "100%"}} size={4}>
                                <Spin spinning={uploadLoading}>
                                    <ContentUploadInput
                                        type="textarea"
                                        beforeUpload={(f) => {
                                            const typeArr:string[] = ["text/plain",'.csv', '.xls', '.xlsx',"application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]
                                            if (!typeArr.includes(f.type)) {
                                                failed(`${f.name}非txt、Excel文件，请上传txt、Excel格式文件！`)
                                                return false
                                            }

                                            setUploadLoading(true)
                                            ipcRenderer.invoke("fetch-file-content", (f as any).path).then((res) => {
                                                let Targets = res
                                                // 处理Excel格式文件
                                                if(f.type!=="text/plain"){
                                                    let str = JSON.stringify(res)
                                                    Targets = str.replace(/(\[|\]|\{|\}|\")/g, '')
                                                }
                                                setParams({...params, Targets})
                                                setTimeout(() => setUploadLoading(false), 100)
                                            })
                                            return false
                                        }}
                                        item={{
                                            style: {textAlign: "left"},
                                            label: "输入目标:",
                                        }}
                                        textarea={{
                                            isBubbing: true,
                                            setValue: (Targets) => setParams({...params, Targets}),
                                            value: params.Targets,
                                            rows: 1,
                                            placeholder: "内容规则 域名(:端口)/IP(:端口)/IP段，如需批量输入请在此框以逗号分割"
                                        }}
                                        suffixNode={
                                            loading ? (
                                                <Button
                                                    type='primary'
                                                    danger
                                                    onClick={(e) => ipcRenderer.invoke("cancel-StartBrute", taskToken)}
                                                >
                                                    立即停止任务
                                                </Button>
                                            ) : (
                                                <Button type='primary' htmlType='submit'>
                                                    开始检测
                                                </Button>
                                            )
                                        }
                                    ></ContentUploadInput>
                                </Spin>
                                <div style={{textAlign: "left", width: "100%", marginLeft: 68}}>
                                    <Space>
                                        <Tag>目标并发:{params.Concurrent}</Tag>
                                        {(params?.TargetTaskConcurrent || 1) > 1 && (
                                            <Tag>目标内爆破并发:{params.TargetTaskConcurrent}</Tag>
                                        )}
                                        {params?.OkToStop ? <Tag>爆破成功即停止</Tag> : <Tag>爆破成功后仍继续</Tag>}
                                        {(params?.DelayMax || 0) > 0 && (
                                            <Tag>
                                                随机暂停:{params.DelayMin}-{params.DelayMax}s
                                            </Tag>
                                        )}
                                        <Button
                                            type={"link"}
                                            size={"small"}
                                            onClick={(e) => {
                                                showModal({
                                                    title: "设置高级参数",
                                                    width: "50%",
                                                    content: (
                                                        <>
                                                            <BruteParamsForm
                                                                defaultParams={params}
                                                                setParams={setParams}
                                                            />
                                                        </>
                                                    )
                                                })
                                            }}
                                        >
                                            更多参数
                                        </Button>
                                    </Space>
                                </div>
                                {advanced && (
                                    <div style={{textAlign: "left"}}>
                                        <Form
                                            onSubmitCapture={(e) => e.preventDefault()}
                                            size={"small"}
                                            layout={"inline"}
                                        >
                                            <SwitchItem
                                                label={"自动字典"}
                                                setValue={() => {
                                                }}
                                                formItemStyle={{marginBottom: 0}}
                                            />
                                            <InputItem
                                                label={"爆破用户"}
                                                style={{marginBottom: 0}}
                                                suffix={
                                                    <Button size={"small"} type={"link"}>
                                                        导入文件
                                                    </Button>
                                                }
                                            />
                                            <InputItem
                                                label={"爆破密码"}
                                                style={{marginBottom: 0}}
                                                suffix={
                                                    <Button size={"small"} type={"link"}>
                                                        导入文件
                                                    </Button>
                                                }
                                            />
                                            <InputInteger
                                                label={"并发目标"}
                                                setValue={() => {
                                                }}
                                                formItemStyle={{marginBottom: 0}}
                                            />
                                            <InputInteger
                                                label={"随机延时"}
                                                setValue={() => {
                                                }}
                                                formItemStyle={{marginBottom: 0}}
                                            />
                                        </Form>
                                    </div>
                                )}
                            </Space>
                        </Form>
                    </Col>
                    </Row>
                    {/*<Row style={{marginBottom: 8}}>*/}
                    {/*    <Col span={24}>*/}
                    {/*        */}
                    {/*    </Col>*/}
                    {/*</Row>*/}
                    <div style={{flex: 1, overflow: "hidden"}}>
                        <AutoCard bodyStyle={{padding: 10,overflow: "hidden"}}>
                            <PluginResultUI
                                // script={script}
                                loading={loading}
                                risks={infoState.riskState}
                                progress={infoState.processState}
                                results={infoState.messageState}
                                featureType={infoState.featureTypeState}
                                feature={infoState.featureMessageState}
                                statusCards={infoState.statusState}
                                onXtermRef={setXtermRef}
                            />
                        </AutoCard>
                    </div>
                </div>
            </div>
        </div>
    )
}

interface BruteParamsFormProp {
    defaultParams: StartBruteParams
    setParams: (p: StartBruteParams) => any
}

const BruteParamsForm: React.FC<BruteParamsFormProp> = (props) => {
    const [params, setParams] = useState<StartBruteParams>(props.defaultParams)

    useEffect(() => {
        if (!params) {
            return
        }
        props.setParams({...params})
    }, [params])

    return (
        <Form
            onSubmitCapture={(e) => {
                e.preventDefault()
            }}
            labelCol={{span: 5}}
            wrapperCol={{span: 14}}
        >
            <SelectItem
                style={{marginBottom: 10}}
                label={"爆破用户字典"}
                value={params.usernameValue || ""}
                onChange={(value, dict) => {
                    if (!dict && (params.Usernames || []).length === 0) {
                        setParams({
                            ...params,
                            usernameValue: value,
                            UsernamesDict: [],
                            ReplaceDefaultUsernameDict: false
                        })
                    } else {
                        setParams({
                            ...params,
                            usernameValue: value,
                            UsernamesDict: dict ? dict.split("\n") : []
                        })
                    }
                }}
            />

            <InputItem
                style={{marginBottom: 5}}
                label={"爆破用户"}
                setValue={(Usernames) => {
                    if ((params.UsernamesDict || []).length === 0 && !Usernames) {
                        setParams({
                            ...params,
                            Usernames: [],
                            ReplaceDefaultUsernameDict: false
                        })
                    } else {
                        setParams({
                            ...params,
                            Usernames: Usernames ? Usernames.split("\n") : []
                        })
                    }
                }}
                value={(params?.Usernames || []).join("\n")}
                textarea={true}
                textareaRow={5}
            />

            <Form.Item label={" "} colon={false} style={{marginBottom: 5}}>
                <Checkbox
                    checked={!params.ReplaceDefaultUsernameDict}
                    onChange={(e) => {
                        if ((params.UsernamesDict || []).length === 0 && (params.Usernames || []).length === 0) {
                            warn("在内容未填时此项必须勾选")
                            setParams({
                                ...params,
                                ReplaceDefaultUsernameDict: false
                            })
                        } else {
                            setParams({
                                ...params,
                                ReplaceDefaultUsernameDict: !params.ReplaceDefaultUsernameDict
                            })
                        }
                    }}
                ></Checkbox>
                &nbsp;
                <span style={{color: "rgb(100,100,100)"}}>同时使用默认用户字典</span>
            </Form.Item>

            <SelectItem
                style={{marginBottom: 10}}
                label={"爆破密码字典"}
                value={params.passwordValue || ""}
                onChange={(value, dict) => {
                    if (!dict && (params.Passwords || []).length === 0) {
                        setParams({
                            ...params,
                            passwordValue: value,
                            PasswordsDict: [],
                            ReplaceDefaultPasswordDict: false
                        })
                    } else {
                        setParams({
                            ...params,
                            passwordValue: value,
                            PasswordsDict: dict ? dict.split("\n") : []
                        })
                    }
                }}
            />
            <InputItem
                style={{marginBottom: 5}}
                label={"爆破密码"}
                setValue={(item) => {
                    if ((params.PasswordsDict || []).length === 0 && !item) {
                        setParams({
                            ...params,
                            Passwords: [],
                            ReplaceDefaultPasswordDict: false
                        })
                    } else {
                        setParams({...params, Passwords: item ? item.split("\n") : []})
                    }
                }}
                value={(params?.Passwords || []).join("\n")}
                textarea={true}
                textareaRow={5}
            />

            <Form.Item label={" "} colon={false} style={{marginBottom: 5}}>
                <Checkbox
                    checked={!params.ReplaceDefaultPasswordDict}
                    onChange={(e) => {
                        if ((params.PasswordsDict || []).length === 0 && (params.Passwords || []).length === 0) {
                            warn("在内容未填时此项必须勾选")
                            setParams({
                                ...params,
                                ReplaceDefaultPasswordDict: false
                            })
                        } else {
                            setParams({
                                ...params,
                                ReplaceDefaultPasswordDict: !params.ReplaceDefaultPasswordDict
                            })
                        }
                    }}
                ></Checkbox>
                &nbsp;
                <span style={{color: "rgb(100,100,100)"}}>同时使用默认用户字典</span>
            </Form.Item>

            <InputInteger
                label={"目标并发"}
                help={"同时爆破 n 个目标"}
                value={params.Concurrent}
                setValue={(e) => setParams({...params, Concurrent: e})}
            />
            <InputInteger
                label={"目标内并发"}
                help={"每个目标同时执行多少爆破任务"}
                value={params.TargetTaskConcurrent}
                setValue={(e) => setParams({...params, TargetTaskConcurrent: e})}
            />
            <SwitchItem
                label={"自动停止"}
                help={"遇到第一个爆破结果时终止任务"}
                setValue={(OkToStop) => setParams({...params, OkToStop})}
                value={params.OkToStop}
            />
            <InputInteger
                label={"最小延迟"}
                max={params.DelayMax}
                min={0}
                setValue={(DelayMin) => setParams({...params, DelayMin})}
                value={params.DelayMin}
            />
            <InputInteger
                label={"最大延迟"}
                setValue={(DelayMax) => setParams({...params, DelayMax})}
                value={params.DelayMax}
                min={params.DelayMin}
            />
        </Form>
    )
}
