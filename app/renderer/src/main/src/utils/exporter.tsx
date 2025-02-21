import React, {useEffect, useState} from "react"
import {randomString} from "./randomUtil"
import {info} from "./notification"
import {showModal} from "./showModal"
import {Button, Form, Space} from "antd"
import {InputItem, SwitchItem} from "./inputUtil"
import {AutoCard} from "../components/AutoCard"
import {useGetState} from "ahooks"
import {openABSFileLocated} from "./openWebsite"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {FuzzerRemoteGV} from "@/enums/fuzzer"
import {getRemoteValue, setRemoteValue} from "./kv"

export interface ExtractableValue {
    StringValue?: string
    BytesValue?: Uint8Array
}

export interface ExtractableData {
    [key: string]: ExtractableValue
}

export interface GeneralExporterProp extends basicConfig {
    Data: ExtractableData[]
    onFinish: () => void
}

interface basicConfig {
    JsonOutput: boolean
    CSVOutput: boolean
    DirName: string
    FilePattern: string
}

const {ipcRenderer} = window.require("electron")

const GeneralExporter: React.FC<GeneralExporterProp> = (props) => {
    const [token, setToken] = useState(randomString(30))
    const [paths, setPaths, getPaths] = useGetState<string[]>([])

    useEffect(() => {
        if (!token) {
            return
        }

        ipcRenderer.on(`${token}-data`, (_, data: {FilePath: string}) => {
            const origin = getPaths()
            origin.push(data.FilePath)
            setPaths(origin.map((v) => v))
        })
        ipcRenderer.on(`${token}-end`, () => {
            info("导出结束")
            props.onFinish()
        })
        ipcRenderer.on(`${token}-error`, (_, e) => {})

        const {JsonOutput, CSVOutput, DirName, FilePattern} = props
        ipcRenderer
            .invoke("ExtractDataToFile", {
                token,
                params: {JsonOutput, CSVOutput, DirName, FilePattern}
            })
            .then(() => {
                info("发送生成文件配置成功...")
            })
        props.Data.forEach((value) => {
            ipcRenderer
                .invoke("ExtractDataToFile", {
                    token,
                    params: {Data: value}
                })
                .then(() => {})
        })
        ipcRenderer.invoke("ExtractDataToFile", {token, params: {Finished: true}})

        return () => {
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [token])

    return (
        <AutoCard title={"获取生成的文件（点击打开文件位置）"}>
            <Space direction={"vertical"}>
                {paths.map((i) => {
                    return (
                        <YakitButton
                            type='text'
                            onClick={() => {
                                openABSFileLocated(i)
                            }}
                        >
                            {i}
                        </YakitButton>
                    )
                })}
            </Space>
        </AutoCard>
    )
}

export const exportData = (data: ExtractableData[], onlyPayloads: boolean) => {
    const m = showYakitModal({
        title: "导出数据",
        width: 700,
        footer: null,
        content: (
            <>
                <GeneralExporterForm
                    Data={data}
                    onlyPayloads={onlyPayloads}
                    destroyModal={() => {
                        m.destroy()
                    }}
                />
            </>
        )
    })
}

interface ExportColumns {
    dataKey: string
    title: string
    isChecked: boolean
    disabled: boolean
}
interface GeneralExporterFormProp {
    Config?: basicConfig
    Data: ExtractableData[]
    onlyPayloads: boolean
    destroyModal: () => void
}

const GeneralExporterForm: React.FC<GeneralExporterFormProp> = (props) => {
    const {Config, Data, onlyPayloads, destroyModal} = props
    const [params, setParams] = useState<basicConfig>(
        !!Config
            ? Config
            : {
                  CSVOutput: true,
                  DirName: "",
                  FilePattern: "",
                  JsonOutput: true
              }
    )

    const [exportColumns, setExportColumns] = useState<ExportColumns[]>(() => {
        const arr = [
            {
                dataKey: "Method",
                title: "Method",
                isChecked: true,
                disabled: false
            },
            {
                dataKey: "StatusCode",
                title: "状态",
                isChecked: true,
                disabled: false
            },
            {
                dataKey: "BodyLength",
                title: "响应大小",
                isChecked: true,
                disabled: false
            },
            {
                dataKey: "DurationMs",
                title: "延迟(ms)",
                isChecked: true,
                disabled: false
            },
            {
                dataKey: "Payloads",
                title: "Payloads",
                isChecked: true,
                disabled: false
            },
            {
                dataKey: "ExtractedResults",
                title: "提取数据",
                isChecked: true,
                disabled: false
            },
            {
                dataKey: "ContentType",
                title: "Content-Type",
                isChecked: true,
                disabled: false
            },
            {
                dataKey: "Https",
                title: "Https",
                isChecked: true,
                disabled: false
            },
            {
                dataKey: "Host",
                title: "Host",
                isChecked: true,
                disabled: false
            },
            {
                dataKey: "Request",
                title: "请求包",
                isChecked: true,
                disabled: false
            },
            {
                dataKey: "Response",
                title: "响应包",
                isChecked: true,
                disabled: false
            }
        ]
        if (onlyPayloads) {
            arr.forEach((item) => {
                if (item.dataKey === "Payloads") {
                    item.isChecked = true
                    item.disabled = true
                } else {
                    item.isChecked = false
                    item.disabled = true
                }
            })
        }
        return arr
    })
    useEffect(() => {
        if (!onlyPayloads) {
            getRemoteValue(FuzzerRemoteGV.FuzzerExportCustomFields).then((res) => {
                if (res) {
                    try {
                        const arr = JSON.parse(res) || []
                        const updatedColumns = exportColumns.map((item) => {
                            if (arr.includes(item.dataKey)) {
                                return {...item, isChecked: true}
                            } else {
                                return {...item, isChecked: false}
                            }
                        })
                        setExportColumns(updatedColumns)
                    } catch (error) {}
                }
            })
        }
    }, [onlyPayloads])

    return (
        <Form
            labelCol={{span: 5}}
            wrapperCol={{span: 19}}
            onSubmitCapture={(e) => {
                destroyModal()
                const filteredData = Data.map((i) => {
                    const result: Partial<ExtractableData> = {}
                    exportColumns.forEach((column) => {
                        if (column.isChecked) {
                            switch (column.dataKey) {
                                case "Method":
                                    result.Method = {StringValue: i.Method.StringValue}
                                    break
                                case "StatusCode":
                                    result.StatusCode = {StringValue: i.StatusCode.StringValue}
                                    break
                                case "BodyLength":
                                    result.BodyLength = {StringValue: i.BodyLength.StringValue}
                                    break
                                case "DurationMs":
                                    result.DurationMs = {StringValue: i.DurationMs.StringValue}
                                    break
                                case "Payloads":
                                    result.Payloads = {StringValue: i.Payloads.StringValue}
                                    break
                                case "ExtractedResults":
                                    result.ExtractedResults = {StringValue: i.ExtractedResults.StringValue}
                                    break
                                case "ContentType":
                                    result.ContentType = {StringValue: i.ContentType.StringValue}
                                    break
                                case "Https":
                                    result.Https = {StringValue: i.Https.StringValue}
                                    break
                                case "Host":
                                    result.Host = {StringValue: i.Host.StringValue}
                                    break
                                case "Request":
                                    result.Request = {BytesValue: i.Request.BytesValue}
                                    break
                                case "Response":
                                    result.Response = {BytesValue: i.Response.BytesValue}
                                    break
                                default:
                                    break
                            }
                        }
                    })
                    return result
                }) as ExtractableData[]

                showYakitModal({
                    title: "生成导出文件",
                    width: 700,
                    footer: null,
                    content: (
                        <GeneralExporter
                            {...params}
                            Data={filteredData}
                            onFinish={() => {
                                if (!onlyPayloads) {
                                    setRemoteValue(
                                        FuzzerRemoteGV.FuzzerExportCustomFields,
                                        JSON.stringify(
                                            exportColumns.filter((item) => item.isChecked).map((item) => item.dataKey)
                                        )
                                    )
                                }
                            }}
                        />
                    )
                })
            }}
            style={{padding: 24}}
        >
            <Form.Item label='导出字段' name='exportColumns'>
                <div style={{display: "flex", flexWrap: "wrap", gap: "8px"}}>
                    {exportColumns.map((item) => (
                        <YakitCheckbox
                            key={item.dataKey}
                            checked={item.isChecked}
                            disabled={item.disabled}
                            onChange={(e) => {
                                const updatedColumns = exportColumns.map((i) => {
                                    if (i.dataKey === item.dataKey) {
                                        return {...i, isChecked: e.target.checked}
                                    }
                                    return i
                                })
                                setExportColumns(updatedColumns)
                            }}
                        >
                            {item.title}
                        </YakitCheckbox>
                    ))}
                </div>
            </Form.Item>
            <Form.Item label={"导出 JSON"} valuePropName='checked'>
                <YakitSwitch
                    onChange={(JsonOutput) => setParams({...params, JsonOutput})}
                    checked={params.JsonOutput}
                />
            </Form.Item>
            <Form.Item label={"导出 CSV"} valuePropName='checked'>
                <YakitSwitch onChange={(CSVOutput) => setParams({...params, CSVOutput})} checked={params.CSVOutput} />
            </Form.Item>
            <Form.Item label={"输出到目录"} valuePropName='checked'>
                <YakitInput
                    placeholder={"可为空，默认为 yakit 临时目录"}
                    onChange={(e) => setParams({...params, DirName: e.target.value})}
                    value={params.DirName}
                />
            </Form.Item>
            <Form.Item label={"文件名"} valuePropName='checked'>
                <YakitInput
                    placeholder={"'*' 可作为随机字符串填空，不需要填写后缀"}
                    onChange={(e) => setParams({...params, FilePattern: e.target.value})}
                    value={params.FilePattern}
                />
            </Form.Item>
            <Form.Item colon={false} label={" "}>
                <YakitButton type='primary' htmlType='submit'>
                    生成数据到本地文件{" "}
                </YakitButton>
            </Form.Item>
        </Form>
    )
}
