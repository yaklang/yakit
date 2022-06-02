import React, {useEffect, useState} from "react";
import {randomString} from "./randomUtil";
import {info} from "./notification";
import {showModal} from "./showModal";
import {Button, Form, Space} from "antd";
import {InputItem, SwitchItem} from "./inputUtil";
import {AutoCard} from "../components/AutoCard";
import {useGetState} from "ahooks";
import {openABSFileLocated} from "./openWebsite";

export interface ExtractableValue {
    StringValue: string,
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

const {ipcRenderer} = window.require("electron");

const GeneralExporter: React.FC<GeneralExporterProp> = (props) => {
    const [token, setToken] = useState(randomString(30));
    const [paths, setPaths, getPaths] = useGetState<string[]>([]);

    useEffect(() => {
        if (!token) {
            return
        }

        ipcRenderer.on(`${token}-data`, (_, data: { FilePath: string }) => {
            const origin = getPaths();
            origin.push(data.FilePath)
            setPaths(origin.map(v => v))
        })
        ipcRenderer.on(`${token}-end`, () => {
            info("导出结束")
        })
        ipcRenderer.on(`${token}-error`, (_, e) => {

        })

        const {JsonOutput, CSVOutput, DirName, FilePattern} = props;
        ipcRenderer.invoke("ExtractDataToFile", {
            token,
            params: {JsonOutput, CSVOutput, DirName, FilePattern}
        }).then(() => {
            info("发送生成文件配置成功...")
        })
        props.Data.forEach(value => {
            ipcRenderer.invoke("ExtractDataToFile", {
                token,
                params: {Data: value}
            }).then(() => {
            })
        })
        ipcRenderer.invoke("ExtractDataToFile", {token, params: {Finished: true}})

        return () => {
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [token])

    return <AutoCard title={"获取生成的文件"}>
        <Space direction={"vertical"}>
            {paths.map(i => {
                return <Button
                    type={"link"}
                    onClick={() => {
                        openABSFileLocated(i)
                    }}
                >{i}</Button>
            })}
        </Space>
    </AutoCard>
};

export const exportData = (data: ExtractableData[]) => {
    showModal({
        title: "导出数据",
        width: "60%",
        content: (
            <>
                <GeneralExporterForm Data={data}/>
            </>
        )
    })
}

export const testExportData = () => {
    exportData([
        {"KYE": {StringValue: "asdfasdfasdfasdfasdf", BytesValue: new Uint8Array}},
        {"KYE": {StringValue: "asdfasasdf", BytesValue: new Uint8Array}},
        {"KYE": {StringValue: "asdfassdf", BytesValue: new Uint8Array}},
    ])
}

interface GeneralExporterFormProp {
    Config?: basicConfig,
    Data: ExtractableData[]
}

const GeneralExporterForm: React.FC<GeneralExporterFormProp> = (props) => {
    const [params, setParams] = useState<basicConfig>(!!props.Config ? props.Config : {
        CSVOutput: true,
        DirName: "",
        FilePattern: "",
        JsonOutput: true
    });
    return <Form
        labelCol={{span: 5}} wrapperCol={{span: 14}}
        onSubmitCapture={e => {
            showModal({
                title: "生成导出文件", width: "50%",
                content: (
                    <GeneralExporter {...params} Data={props.Data}/>
                )
            })
        }}
    >
        <SwitchItem
            label={"导出 JSON"}
            setValue={JsonOutput => setParams({...params, JsonOutput})} value={params.JsonOutput}
        />
        <SwitchItem
            label={"导出 CSV"}
            setValue={CSVOutput => setParams({...params, CSVOutput})} value={params.CSVOutput}
        />
        <InputItem
            label={"输出到目录"} placeholder={"可为空，默认为 yakit 临时目录"}
            setValue={DirName => setParams({...params, DirName})} value={params.DirName}
        />
        <InputItem
            label={"文件名"} placeholder={"'*' 可作为随机字符串填空，不需要填写后缀"}
            setValue={FilePattern => setParams({...params, FilePattern})} value={params.FilePattern}
        />
        <Form.Item colon={false} label={" "}>
            <Button type="primary" htmlType="submit"> 生成数据到本地文件 </Button>
        </Form.Item>
    </Form>
};