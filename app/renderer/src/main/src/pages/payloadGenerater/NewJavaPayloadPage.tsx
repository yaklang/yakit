import React, {useRef, useEffect, useState} from "react"
import {useGetState, useMemoizedFn} from "ahooks"
import {InputNumber, Button, Form, Cascader, Switch, Input, Select, Spin, Tooltip} from "antd"
import {QuestionOutlined, ThunderboltFilled} from "@ant-design/icons"
import {failed, info, success} from "../../utils/notification"
import {showModal} from "../../utils/showModal"
import {
    FacadesRequest,
    SettingReverseParamsInfo,
    SettingReverseServer,
    StartReverseServer
} from "../reverseServer/NewReverseServerPage"
import {randomString} from "@/utils/randomUtil"

import "./javaPayloadPage.scss"

const {ipcRenderer} = window.require("electron")

export interface JavaPayloadPageProp {}

export interface YsoGeneraterRequest {
    Gadget: string
    Class: string
    Options: {Key: string; Value: string | number | boolean}[]
}

interface ParamsProps {
    Gadget: string
    Class: string
    [key: string]: string | number | boolean
}
export interface ParamsRefProps extends ParamsProps {
    useGadget: boolean
}

export interface FormList {
    Key: string
    KeyVerbose: string
    Help: string
    Value: string
    Type: string
}

export interface FormBindInfo {
    [key: string]: string[]
}

const DefaultParams: ParamsProps = {
    Gadget: "",
    Class: ""
}

export const convertRequest = (value: ParamsRefProps) => {
    const dataRef = value
    const excludeKey = ["useGadget", "Gadget", "Class"]
    const data: YsoGeneraterRequest = {
        Gadget: dataRef.Gadget,
        Class: dataRef.Class,
        Options: []
    }
    for (let name in dataRef) {
        if (!excludeKey.includes(name)) data.Options.push({Key: name, Value: dataRef[name]})
    }
    return data
}

export const JavaPayloadPage: React.FC<JavaPayloadPageProp> = React.memo((props) => {
    const [status, setStatus] = useState<"setting" | "start">("setting")
    const [token, setToken, getToken] = useGetState<string>(randomString(40))
    const [loading, setLoading] = useState<boolean>(false)
    const paramsRef = useRef<ParamsRefProps>({useGadget: true, ...DefaultParams})
    const formListRef = useRef<FormList[]>([])
    const formBindRef = useRef<FormBindInfo>({})
    const [addrParams, setAddrParams] = useState<SettingReverseParamsInfo>({
        BridgeParam: {Addr: "", Secret: ""},
        IsRemote: false,
        ReversePort: 8085,
        ReverseHost: "127.0.0.1"
    })
    const [remoteIp, setRemoteIp] = useState<string>("")

    const btnSubmit = useMemoizedFn(
        (
            type: "server" | "copy" | "yakRun" | "apply",
            value: ParamsRefProps,
            formList: FormList[],
            formBind: FormBindInfo
        ) => {
            paramsRef.current = value
            formListRef.current = formList
            formBindRef.current = formBind

            if (type === "server") startServer()
        }
    )

    const startFacadeServer = useMemoizedFn((params: SettingReverseParamsInfo, remoteIp: string) => {
        const classData = {...convertRequest({...paramsRef.current})}
        let startFacadeParams: FacadesRequest = {
            ...params,
            GenerateClassParams: {...classData},
            Token: getToken()
        }
        if (startFacadeParams.IsRemote) startFacadeParams.ReverseHost = remoteIp

        ipcRenderer
            .invoke("StartFacadesWithYsoObject", startFacadeParams, token)
            .then(() => {
                info("启动FacadeServer")
                setStatus("start")
                setTimeout(() => {
                    ipcRenderer
                        .invoke("ApplyClassToFacades", {
                            Token: getToken(),
                            GenerateClassParams: {...classData}
                        })
                        // .then((res) => info("应用到FacadeServer成功"))
                        .catch((err) => failed(`应用到FacadeServer失败${err}`))
                        .finally(() => setTimeout(() => setLoading(false), 300))
                }, 500)
            })
            .catch((e: any) => {
                failed("启动FacadeServer失败: " + `${e}`)
            })
    })
    const startServer = useMemoizedFn(() => {
        const m = showModal({
            width: "40%",
            content: (
                <SettingReverseServer
                    defaultSetting={addrParams}
                    setServer={(params) => {
                        setAddrParams(params.setting)
                        setRemoteIp(params.remoteIp)
                        startFacadeServer(params.setting, params.remoteIp)

                        m.destroy()
                        setTimeout(() => setLoading(false), 300)
                    }}
                ></SettingReverseServer>
            ),
            modalAfterClose: () => setTimeout(() => setLoading(false), 300)
        })
    })

    return (
        <div className='java-payload-wrapper'>
            {status === "setting" && (
                <PayloadForm
                    loading={loading}
                    setLoading={setLoading}
                    paramsData={{...paramsRef.current}}
                    formLists={[...formListRef.current]}
                    formBind={{...formBindRef.current}}
                    btnSubmit={btnSubmit}
                />
            )}
            {status === "start" && addrParams && (
                <StartReverseServer
                    loading={loading}
                    setLoading={setLoading}
                    token={token}
                    addr={addrParams}
                    remoteIp={remoteIp}
                    stop={(isCancel) => {
                        if (!isCancel) ipcRenderer.invoke("cancel-StartFacadesWithYsoObject", token)
                        setStatus("setting")
                        setToken(randomString(40))
                    }}
                    apply={(value) => {
                        ipcRenderer
                            .invoke("ApplyClassToFacades", {...value})
                            .then((res) => info("应用到FacadeServer成功"))
                            .catch((err) => failed(`应用到FacadeServer失败${err}`))
                            .finally(() => setTimeout(() => setLoading(false), 300))
                    }}
                    paramsData={{...paramsRef.current}}
                    formLists={[...formListRef.current]}
                    formBind={{...formBindRef.current}}
                />
            )}
        </div>
    )
})

interface PayloadFormProp {
    isShowGadget?: boolean
    loading: boolean
    setLoading: (value: boolean) => any
    paramsData: ParamsRefProps
    formLists?: FormList[]
    formBind?: FormBindInfo
    btnSubmit: (
        type: "server" | "copy" | "yakRun" | "apply",
        value: ParamsRefProps,
        formList: FormList[],
        formBind: FormBindInfo
    ) => any
}

interface YsoClassGeneraterOptions extends FormList {
    BindOptions: {[key: string]: {Options: YsoClassGeneraterOptions[]}}
}

interface YsoOptionInfo {
    Name: string
    NameVerbose: string
    Help: string
}
interface OptionInfo {
    Name: string
    NameVerbose: string | React.ReactNode
    Label: string
    Help: string
    isLeaf?: boolean
    children?: OptionInfo[]
}

enum FormParamsType {
    String = "String",
    Base64Bytes = "Base64Bytes",
    StringBool = "StringBool",
    StringPort = "StringPort"
}

export const PayloadForm: React.FC<PayloadFormProp> = React.memo((props) => {
    const {isShowGadget = true, loading, setLoading, paramsData, formLists = [], formBind = {}, btnSubmit} = props

    const isInit = useRef<boolean>(true)

    const [formInstance] = Form.useForm()
    const [useGadget, setUseGadget, getUseGadget] = useGetState<boolean>(isShowGadget ? paramsData.useGadget : false)
    const paramsRef = useRef<ParamsRefProps>({...paramsData})
    const [params, setParams] = useState<ParamsProps>({...paramsData})

    const setParamsValue = useMemoizedFn((args: {key: string; value: string | number | boolean}[]) => {
        for (let item of args) paramsRef.current[item.key] = item.value
        setParams({...paramsRef.current})
        formInstance.setFieldsValue({...paramsRef.current})
    })

    const [btnLoading, setBtnLoading] = useState<boolean>(false)
    const [options, setOptions] = useState<OptionInfo[]>([])
    const [formList, setFormList] = useState<FormList[]>([...formLists])
    const formBindRef = useRef<FormBindInfo>({...formBind})

    const submit = useMemoizedFn((type: "server" | "copy" | "yakRun" | "apply") => {
        formInstance.validateFields().then(() => {
            setLoading(true)
            if (type === "copy") {
                copyPayload({...paramsRef.current})
            } else if (type === "yakRun") {
                sendYakRunning({...paramsRef.current})
            } else {
                btnSubmit(type, {...paramsRef.current}, [...formList], {...formBindRef.current})
            }
        })
    })
    const copyPayload = useMemoizedFn((value: ParamsRefProps) => {
        const generaterRequest = convertRequest(value)
        ipcRenderer
            .invoke("GenerateYsoBytes", generaterRequest)
            .then((d: {Bytes: Uint8Array; FileName: string}) => {
                success("生成字节码成功")
                ipcRenderer
                    .invoke("BytesToBase64", {
                        Bytes: d.Bytes
                    })
                    .then((res: {Base64: string}) => {
                        ipcRenderer
                            .invoke("copy-clipboard", res.Base64)
                            .then(() => {
                                success("复制Base64成功")
                            })
                            .catch((err) => {
                                failed(`${err}`)
                            })
                    })
                    .catch((err) => {
                        failed(`${err}`)
                    })
            })
            .catch((e: any) => {
                failed("生成字节码失败: " + `${e}`)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })
    const sendYakRunning = useMemoizedFn((value: ParamsRefProps) => {
        const generaterRequest = convertRequest(value)
        ipcRenderer
            .invoke("GenerateYsoCode", generaterRequest)
            .then((d: {Code: string}) => {
                success("生成代码成功")
                setTimeout(() => {
                    ipcRenderer.invoke("send-to-tab", {
                        type: "add-yak-running",
                        data: {
                            name: `${generaterRequest.Gadget}/${generaterRequest.Class}-${new Date().getTime()}`,
                            code: d.Code
                        }
                    })
                }, 300)
            })
            .catch((e: any) => {
                failed("生成代码失败: " + `${e}`)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })
    const cleatParams = useMemoizedFn(() => {
        paramsRef.current = {useGadget, ...DefaultParams}
        setParams({...DefaultParams})
        formInstance.setFieldsValue({useGadget, ...DefaultParams})
        // formInstance.resetFields()
        setFormList([])
        formBindRef.current = {}
    })

    useEffect(() => {
        loadOptions(useGadget)
        if (isInit.current) {
            formInstance.setFieldsValue({...paramsData})
            formInstance.resetFields()
            isInit.current = false
        } else cleatParams()
    }, [useGadget])
    const loadOptions = (isGadget: boolean) => {
        ipcRenderer
            .invoke(
                isGadget ? "GetAllYsoGadgetOptions" : "GetAllYsoClassOptions",
                isGadget ? undefined : {Gadget: "None"}
            )
            .then((d: {Options: YsoOptionInfo[]}) => {
                const {Options} = d
                let optionArr: OptionInfo[] = Options.map((item) => {
                    const info: OptionInfo = {
                        ...item,
                        NameVerbose: isGadget ? (
                            <div className='form-item-options-title'>
                                {item.NameVerbose}
                                {!!item.Help && (
                                    <Tooltip placement='bottom' title={item.Help}>
                                        <QuestionOutlined className='question-icon' />
                                    </Tooltip>
                                )}
                            </div>
                        ) : (
                            item.NameVerbose
                        ),
                        Label: item.NameVerbose,
                        isLeaf: false,
                        children: []
                    }
                    return info
                })
                setOptions(optionArr)
            })
            .catch((e: any) => failed(`${isGadget ? "获取利用链失败: " : "获取恶意类失败: "} ${e}`))
    }
    const loadClassOptions = useMemoizedFn((selectedOptions: any[]) => {
        const targetOption = selectedOptions[selectedOptions.length - 1]

        if (selectedOptions.length === 1) {
            ipcRenderer
                .invoke("GetAllYsoClassOptions", {Gadget: targetOption.Name})
                .then((d: {Options: YsoOptionInfo[]}) => {
                    const {Options} = d
                    let optionArr: OptionInfo[] = Options.map((item) => {
                        const info: OptionInfo = {
                            ...item,
                            NameVerbose: useGadget ? (
                                <div className='form-item-options-title'>
                                    {item.NameVerbose}
                                    {!!item.Help && (
                                        <Tooltip placement='bottom' title={item.Help}>
                                            <QuestionOutlined className='question-icon' />
                                        </Tooltip>
                                    )}
                                </div>
                            ) : (
                                item.NameVerbose
                            ),
                            Label: item.NameVerbose,
                            isLeaf: true
                        }
                        return info
                    })
                    targetOption.children = optionArr
                    setOptions([...options])
                })
                .catch((e: any) => {
                    failed("Get class options failed: " + `${e}`)
                })
        }
    })

    const loadGeneraterFormList = useMemoizedFn((value: any[]) => {
        setBtnLoading(true)
        ipcRenderer
            .invoke("GetAllYsoClassGeneraterOptions", {Class: value[1], Gadget: value[0]})
            .then((d: {Options: YsoClassGeneraterOptions[]}) => {
                const {Options} = d

                const paramsOptions: {[key: string]: string | number | boolean} = {}
                const formLists: FormList[] = []
                for (let el of Options) {
                    if (Object.keys(el.BindOptions).length > 0) {
                        const relation: string[] = []
                        for (let bindValue in el.BindOptions) {
                            relation.push(
                                `${bindValue}||${el.BindOptions[bindValue].Options.map((item) => item.Key).join("||")}`
                            )
                        }
                        formBindRef.current[el.Key] = [...relation]
                    }
                    formLists.push(el)
                    switch (el.Type) {
                        case FormParamsType.String:
                        case FormParamsType.Base64Bytes:
                            paramsOptions[el.Key] = el.Value
                            break
                        case FormParamsType.StringPort:
                            paramsOptions[el.Key] = !el.Value ? 1 : +el.Value || 1
                            break
                        case FormParamsType.StringBool:
                            paramsOptions[el.Key] = !el.Value ? false : el.Value === "false" ? false : true
                            break
                    }
                }
                paramsRef.current = {
                    useGadget,
                    Gadget: paramsRef.current.Gadget,
                    Class: paramsRef.current.Class,
                    ...paramsOptions
                }
                setParams({...paramsRef.current})
                formInstance.setFieldsValue({...paramsRef.current})
                setTimeout(() => setFormList(formLists), 300)
            })
            .catch((e: any) => {
                failed("Get class generater options failed: " + `${e}`)
            })
            .finally(() => setTimeout(() => setBtnLoading(false), 300))
    })

    // 暂时只支持布尔类型与string类型的单向绑定
    const judgeBindValue = useMemoizedFn((key: string) => {
        const bindRef = formBindRef.current
        const paramsValue = paramsRef.current

        for (let keyName in bindRef) {
            const valueArr = bindRef[keyName] || []
            for (let bindKey of valueArr) {
                if (bindKey.indexOf(key) > -1) {
                    const value = bindKey.split("||").shift()
                    if ((!!paramsValue[keyName]).toString() !== value) {
                        return false
                    }
                }
            }
        }
        return true
    })

    return (
        <div className={`${isShowGadget ? "payload-form-body" : "payload-small-form-body"} form-common-style`}>
            <Spin spinning={loading}>
                <Form
                    form={formInstance}
                    name='form'
                    labelCol={{span: isShowGadget ? 4 : 6}}
                    wrapperCol={{span: isShowGadget ? 20 : 18}}
                    colon={false}
                    initialValues={{...paramsRef.current}}
                    autoComplete='off'
                    layout={isShowGadget ? "horizontal" : "vertical"}
                >
                    {isShowGadget && (
                        <Form.Item label='使用利用链' name='useGadget' help='关闭则不使用利用链,只生成恶意类'>
                            <Switch
                                checked={useGadget}
                                onChange={(check) => {
                                    setUseGadget(check)
                                    setTimeout(() => cleatParams(), 300)
                                }}
                            />
                        </Form.Item>
                    )}

                    <Form.Item
                        label={
                            <div className='form-item-label-title'>
                                {useGadget ? "利用链" : "恶意类"}
                                {/* <Tooltip placement='bottom' title='关闭则不使用利用链,只生成Class'>
                                    <QuestionOutlined className='question-icon' />
                                </Tooltip> */}
                            </div>
                        }
                        rules={[
                            () => ({
                                validator(_, value) {
                                    if (getUseGadget()) {
                                        if (Array.isArray(value) && value.length > 0) return Promise.resolve()
                                        return Promise.reject(new Error("请选择利用链"))
                                    } else {
                                        if (!!value) return Promise.resolve()
                                        return Promise.reject(new Error("请选择恶意类"))
                                    }
                                }
                            })
                        ]}
                        name={useGadget ? "[Gadget,Class]" : "Class"}
                    >
                        {useGadget ? (
                            <Cascader
                                fieldNames={{label: "NameVerbose", value: "Name", children: "children"}}
                                loadData={loadClassOptions}
                                options={options}
                                value={!params.Gadget ? [] : [params.Gadget, params.Class]}
                                placeholder='请选择利用链'
                                onChange={(value: any[]) => {
                                    if (!value || value.length === 0) cleatParams()
                                    else {
                                        setParamsValue([
                                            {key: "Gadget", value: value[0]},
                                            {key: "Class", value: value[1]}
                                        ])
                                        // 防止此操作干扰上面的赋值操作
                                        setTimeout(() => loadGeneraterFormList(value), 200)
                                    }
                                }}
                                displayRender={(label, selectedOptions) => {
                                    const diplay = (selectedOptions || []).map((item: any) => item.Label).join(" / ")
                                    return <>{diplay}</>
                                }}
                            />
                        ) : (
                            <Select
                                allowClear={true}
                                placeholder='请选择恶意类'
                                value={params.Class}
                                onChange={(value) => {
                                    if (!!value) {
                                        setParamsValue([
                                            {key: "Gadget", value: "None"},
                                            {key: "Class", value: value}
                                        ])
                                        // 防止此操作干扰上面的赋值操作
                                        setTimeout(() => loadGeneraterFormList(["None", value]), 200)
                                    } else cleatParams()
                                }}
                            >
                                {options.map((item) => {
                                    return (
                                        <Select.Option key={item.Name} value={item.Name}>
                                            <div className='form-item-options-title'>
                                                {item.NameVerbose}
                                                {!!item.Help && (
                                                    <Tooltip placement='bottom' title={item.Help}>
                                                        <QuestionOutlined className='question-icon' />
                                                    </Tooltip>
                                                )}
                                            </div>
                                        </Select.Option>
                                    )
                                })}
                            </Select>
                        )}
                    </Form.Item>

                    {formList.map((item) => {
                        const flag = judgeBindValue(item.Key)
                        if (!flag) return <div key={item.Key}></div>

                        let hint = "请填写内容"
                        if (item.Type === FormParamsType.String || item.Type === FormParamsType.Base64Bytes)
                            hint = `请填写${item.KeyVerbose}`
                        if (item.Type === FormParamsType.StringPort) hint = `请输入${item.KeyVerbose}`
                        if (item.Type === FormParamsType.StringBool) hint = `请开关${item.KeyVerbose}`

                        return (
                            <Form.Item
                                key={item.Key}
                                label={
                                    <div className='form-item-label-title'>
                                        {item.KeyVerbose}
                                        {!!item.Help && (
                                            <Tooltip placement='bottom' title={item.Help}>
                                                <QuestionOutlined className='question-icon' />
                                            </Tooltip>
                                        )}
                                    </div>
                                }
                                name={item.Key}
                                rules={[
                                    () => ({
                                        validator(_, value) {
                                            if (
                                                item.Type === FormParamsType.StringBool ||
                                                item.Type === FormParamsType.StringPort
                                            )
                                                return Promise.resolve()
                                            if (value) return Promise.resolve()
                                            return Promise.reject(new Error(hint))
                                        }
                                    })
                                ]}
                            >
                                {(item.Type === FormParamsType.String || item.Type === FormParamsType.Base64Bytes) && (
                                    <Input
                                        allowClear={true}
                                        placeholder={
                                            item.Type === FormParamsType.Base64Bytes
                                                ? "填写内容需Base64编码"
                                                : `请输入${item.KeyVerbose}`
                                        }
                                        value={params[item.Key] as string}
                                        onChange={(e) => setParamsValue([{key: item.Key, value: e.target.value}])}
                                    />
                                )}
                                {item.Type === FormParamsType.StringPort && (
                                    <InputNumber
                                        min={0}
                                        max={65535}
                                        precision={0}
                                        value={+params[item.Key]}
                                        onChange={(value) => setParamsValue([{key: item.Key, value: value}])}
                                    />
                                )}
                                {item.Type === FormParamsType.StringBool && (
                                    <Switch
                                        checked={!!params[item.Key]}
                                        onChange={(check) => {
                                            const info: {key: string; value: string | boolean}[] = [
                                                {key: item.Key, value: check}
                                            ]
                                            for (let name in formBindRef.current) {
                                                if (name === item.Key) {
                                                    const keyArr = formBindRef.current[name].filter(
                                                        (item) => item.indexOf(check.toString()) > -1
                                                    )
                                                    if (keyArr.length > 0) {
                                                        const keys = keyArr[keyArr.length - 1].split("||")
                                                        keys.shift()
                                                        for (let keyName of keys) info.push({key: keyName, value: ""})
                                                    }
                                                    break
                                                }
                                            }
                                            setParamsValue([...info])
                                        }}
                                    />
                                )}
                            </Form.Item>
                        )
                    })}

                    <Form.Item wrapperCol={isShowGadget ? {offset: 4} : undefined} className='form-type-btn'>
                        {isShowGadget && !useGadget && (
                            <Button loading={btnLoading} type='primary' onClick={() => submit("server")}>
                                启动反连服务
                            </Button>
                        )}
                        {!isShowGadget && (
                            <Button loading={btnLoading} type='primary' onClick={() => submit("apply")}>
                                应用
                            </Button>
                        )}
                        <Button
                            loading={btnLoading}
                            className={useGadget ? "primary-btn" : "other-btn"}
                            onClick={() => submit("copy")}
                        >
                            复制 Payload
                        </Button>
                        <Button
                            loading={btnLoading}
                            className='other-btn'
                            icon={<ThunderboltFilled style={{color: "#40a9ff"}} />}
                            onClick={() => submit("yakRun")}
                        >
                            Yak Runner
                        </Button>
                    </Form.Item>
                </Form>
            </Spin>
        </div>
    )
})
