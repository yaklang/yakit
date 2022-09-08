import React, {useEffect, useState} from "react";
import {Button, Form, Modal, Popconfirm, Space, Spin} from "antd";
import {YakEditor} from "../../utils/editors";
import {SwitchItem} from "../../utils/inputUtil";
import {failed, info} from "../../utils/notification";
import {AutoCard} from "../../components/AutoCard";
import {Buffer} from "buffer";
import {saveABSFileToOpen} from "../../utils/openWebsite";

export interface MITMContentReplacerImportProp {
    onClosed?: () => any
}

const {ipcRenderer} = window.require("electron");

const defaultConfig = `[
    {
        "Rule": "(?i)(jsonp_[a-z0-9]+)|((_?callback|_cb|_call|_?jsonp_?)=)",
        "NoReplace": true,
        "Color": "yellow",
        "EnableForRequest": true,
        "EnableForHeader": true,
        "Index": 1,
        "ExtraTag": [
            "疑似JSONP"
        ]
    },
    {
        "Rule": "(?i)((password)|(pass)|(secret)|(mima))['\\"]?\\\\s*[\\\\:\\\\=]",
        "NoReplace": true,
        "Color": "red",
        "EnableForRequest": true,
        "EnableForHeader": true,
        "EnableForBody": true,
        "Index": 2,
        "ExtraTag": [
            "登陆/密码传输"
        ]
    },
    {
        "Rule": "(?i)((access|admin|api|debug|auth|authorization|gpg|ops|ray|deploy|s3|certificate|aws|app|application|docker|es|elastic|elasticsearch|secret)[-_]{0,5}(key|token|secret|secretkey|pass|password|sid|debug))|(secret|password)([\\"']?\\\\s*:\\\\s*|\\\\s*=\\\\s*)",
        "NoReplace": true,
        "Color": "red",
        "EnableForRequest": true,
        "EnableForResponse": true,
        "EnableForHeader": true,
        "EnableForBody": true,
        "Index": 3,
        "ExtraTag": [
            "敏感信息"
        ]
    },
    {
        "Rule": "(BEGIN PUBLIC KEY).*?(END PUBLIC KEY)",
        "NoReplace": true,
        "Color": "purple",
        "EnableForRequest": true,
        "EnableForResponse": true,
        "EnableForHeader": true,
        "EnableForBody": true,
        "Index": 4,
        "ExtraTag": [
            "公钥传输"
        ]
    }
]`

export const MITMContentReplacerImport: React.FC<MITMContentReplacerImportProp> = (props) => {
    const [params, setParams] = useState<{ JsonRaw: Uint8Array, ReplaceAll: boolean }>({
        JsonRaw: new Uint8Array(), ReplaceAll: false,
    });
    const [loading, setLoading] = useState(false);

    return <Form
        labelCol={{span: 5}} wrapperCol={{span: 14}}
        onSubmitCapture={e => {
            ipcRenderer.invoke("ImportMITMReplacerRules", {...params}).then(e => {
                if (props.onClosed) {
                    props.onClosed()
                }
                info("导入成功")
            }).catch(e => {
                Modal.error({title: "导入失败", content: `${e}`})
            })
        }}
    >
        <Form.Item label={"JSON"}>
            <div style={{height: 400}}>
                {loading ? <Spin/> : <YakEditor
                    triggerId={loading}
                    type={"json"} value={new Buffer(params.JsonRaw).toString("utf8")}
                    setValue={e => {
                        setParams({...params, JsonRaw: Buffer.from(e)})
                    }}
                />}
            </div>
        </Form.Item>
        <SwitchItem label={"全部替换"} setValue={ReplaceAll => setParams({...params, ReplaceAll})}
                    value={params.ReplaceAll}/>
        <Form.Item colon={false} label={" "}>
            <Space>
                <Button type="primary" htmlType="submit"> 导入配置 </Button>
                <Popconfirm
                    title={"默认填充配置将会使用 Yakit 内置的简易规则，帮助用户入门"}
                    onConfirm={() => {
                        setParams({ReplaceAll: true, JsonRaw: Buffer.from(defaultConfig)})
                        setLoading(true)
                        setTimeout(() => setLoading(false), 300)
                    }}
                >
                    <Button type={"link"}> 使用默认配置 </Button>
                </Popconfirm>
            </Space>
        </Form.Item>
    </Form>
};

export interface MITMContentReplacerExportProps {

}

export const MITMContentReplacerExport: React.FC<MITMContentReplacerExportProps> = (props) => {
    const [value, setValue] = useState<Uint8Array>(new Uint8Array)
    const [loading, setLoading] = useState(true)
    useEffect(() => {
        ipcRenderer.invoke("ExportMITMReplacerRules", {}).then((r: { JsonRaw: Uint8Array }) => {
            setValue(r.JsonRaw)
        }).catch(e => {
            failed(`导出失败：${e}`)
        }).finally(() => setTimeout(() => setLoading(false), 300))
    }, [])

    return <AutoCard size={"small"} bordered={false} loading={loading} extra={[
        <Button size={"small"} type={"primary"} onClick={() => {
            saveABSFileToOpen("yakit-mitm-replacer-rules-config.json", value)
        }}>另存为</Button>
    ]}>
        <div style={{height: 530}}>
            <YakEditor type={"json"} value={new Buffer(value).toString("utf8")} readOnly={true}/>
        </div>
    </AutoCard>
};