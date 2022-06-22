import React, {useEffect, useState} from "react";
import {Button, Form, Popconfirm, Space, Spin} from "antd";
import {YakCodeEditor} from "./editors";
import {StringToUint8Array, Uint8ArrayToString} from "./str";
import {info} from "./notification";
import {InputFileNameItem, SelectOne} from "./inputUtil";
import {showModal} from "./showModal";
import {saveABSFileToOpen} from "./openWebsite";
import {randomString} from "./randomUtil";

export const updateMenuItem = () => {
    ipcRenderer.invoke("change-main-menu", {}).then(() => {
        info("更新菜单栏")
    })
}

export const showConfigMenuItems = () => {
    let m = showModal({
        title: "配置菜单栏", width: 800, content: (
            <ConfigMenuItems onFinished={() => {
                m.destroy()
                updateMenuItem()
            }}/>
        )
    })
}


interface ConfigMenuItemsProp {
    onFinished?: () => any
}

const {ipcRenderer} = window.require("electron");

const ConfigMenuItems: React.FC<ConfigMenuItemsProp> = (props) => {
    const [config, setConfig] = useState("");
    const [jsonFileName, setJsonFileName] = useState("");
    const [mode, setMode] = useState<"import" | "export" | "import-file">("export");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true)
        setTimeout(() => {
            setLoading(false)
        }, 500)

        if (mode === "export") {
            ipcRenderer.invoke("ExportMenuItem", {}).then((rsp: { RawJson: string }) => {
                setConfig(rsp.RawJson)
            })
        } else {
            setConfig("")
        }
    }, [mode])

    return <Form
        labelCol={{span: 4}} wrapperCol={{span: 18}}
        onSubmitCapture={e => {
            e.preventDefault()

            if (mode === "import") {
                ipcRenderer.invoke("ImportMenuItem", {
                    RawJson: config,
                }).then(() => {
                    info("导入成功")
                    if (props.onFinished) props.onFinished();
                })
            }

            if (mode === "import-file") {
                ipcRenderer.invoke("ImportMenuItem", {
                    JsonFileName: jsonFileName,
                }).then(() => {
                    info("导入成功")
                    if (props.onFinished) props.onFinished();
                })
            }
        }}
    >
        <SelectOne
            label={" "} colon={false}
            data={[
                {text: "导入配置文件", value: "import-file"},
                {text: "导入JSON", value: "import"},
                {text: "导出配置", value: "export"},
            ]}
            value={mode} setValue={setMode}
            help={mode === "import" ? `导入配置将会追加菜单栏配置，并不会完全覆盖` : "导出配置将会把数据导出为 JSON"}
        />
        {
            loading ? <Spin/> : <>
                {mode === "import" && <Form.Item label={"配置 JSON"}>
                    <div style={{height: 400}}>
                        <YakCodeEditor
                            originValue={StringToUint8Array(config, "utf8")}
                            language={"json"}
                            onChange={r => setConfig(Uint8ArrayToString(r, "utf8"))}
                        />
                    </div>
                </Form.Item>}
                {mode === "import-file" && <InputFileNameItem
                    label={"文件名"} filename={jsonFileName} setFileName={setJsonFileName}
                />}
                {mode === "export" && <Form.Item
                    label={"配置 JSON"}
                    help={(
                        <>
                            <Button onClick={() => {
                                saveABSFileToOpen(`config-${randomString(10)}.json`, config)
                            }} type={"link"}>下载为 JSON 文件</Button>
                        </>
                    )}
                >
                    <div style={{height: 400}}>
                        <YakCodeEditor
                            originValue={StringToUint8Array(config, "utf8")}
                            language={"json"} readOnly={true}
                        />
                    </div>
                </Form.Item>}
                <Form.Item colon={false} label={" "}>
                    <Space>
                        {(mode === "import" || mode === "import-file") &&
                        <Button type="primary" htmlType="submit"> 导入 </Button>}
                        <Popconfirm
                            title={"删除当前配置，不可恢复，确认操作吗？"}
                            onConfirm={() => {
                                ipcRenderer.invoke("DeleteAllMenuItem", {}).then(() => {
                                    info("删除全部菜单栏配置成功")
                                    if (props.onFinished) props.onFinished();
                                })
                            }}
                        >
                            <Button type={"primary"} danger={true}> 删除全部 </Button>
                        </Popconfirm>
                    </Space>
                </Form.Item>
            </>
        }
    </Form>
};

