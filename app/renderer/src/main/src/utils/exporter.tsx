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

export interface ExtractableValue {
    StringValue: string
    BytesValue: Uint8Array
}

export interface ExtractableData {
    [key: string]: ExtractableValue
}

export interface GeneralExporterProp extends basicConfig {
    Data: ExtractableData[]
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

export const exportData = (data: ExtractableData[]) => {
    showYakitModal({
        title: "导出数据",
        width: "60%",
        footer: null,
        content: (
            <>
                <GeneralExporterForm Data={data} />
            </>
        )
    })
}

export const testExportData = () => {
    exportData([
        {KYE: {StringValue: "asdfasdfasdfasdfasdf", BytesValue: new Uint8Array()}},
        {KYE: {StringValue: "asdfasasdf", BytesValue: new Uint8Array()}},
        {KYE: {StringValue: "asdfassdf", BytesValue: new Uint8Array()}}
    ])
}

interface GeneralExporterFormProp {
    Config?: basicConfig
    Data: ExtractableData[]
}

const GeneralExporterForm: React.FC<GeneralExporterFormProp> = (props) => {
    const [params, setParams] = useState<basicConfig>(
        !!props.Config
            ? props.Config
            : {
                  CSVOutput: true,
                  DirName: "",
                  FilePattern: "",
                  JsonOutput: true
              }
    )
    return (
        <Form
            labelCol={{span: 5}}
            wrapperCol={{span: 14}}
            onSubmitCapture={(e) => {
                showYakitModal({
                    title: "生成导出文件",
                    width: "50%",
                    footer: null,
                    content: <GeneralExporter {...params} Data={props.Data} />
                })
            }}
            style={{padding: 24}}
        >
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
