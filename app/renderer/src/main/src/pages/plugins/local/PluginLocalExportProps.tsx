import {useRef, useState} from "react"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {
    ImportAndExportStatusInfo,
    LogListInfo,
    SaveProgressStream
} from "@/components/YakitUploadModal/YakitUploadModal"
import {v4 as uuidv4} from "uuid"
import {yakitFailed, yakitNotify} from "@/utils/notification"
import {ExportYakScriptLocalResponse, ExportYakScriptStreamRequest} from "./PluginsLocalType"
import {useDebounceEffect} from "ahooks"
import {Form} from "antd"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {ExecResult} from "@/pages/invoker/schema"
import {ExecResultMessage} from "@/components/yakitLogSchema"
import {openABSFileLocated} from "@/utils/openWebsite"
const {ipcRenderer} = window.require("electron")

declare type getContainerFunc = () => HTMLElement
interface PluginLocalExportProps {
    visible: boolean
    onClose: () => void
    getContainer?: string | HTMLElement | getContainerFunc | false
    exportLocalParams: ExportYakScriptStreamRequest
}

export const PluginLocalExport: React.FC<PluginLocalExportProps> = (props) => {
    const {visible, exportLocalParams, onClose, getContainer} = props
    const [localStreamData, setLocalStreamData] = useState<SaveProgressStream>()
    const localStreamDataRef = useRef<SaveProgressStream>()
    const [locallogListInfo, setLocallogListInfo] = useState<LogListInfo[]>([])
    const locallogListInfoRef = useRef<LogListInfo[]>([])

    useDebounceEffect(
        () => {
            let timer
            if (visible) {
                // 发送导出流信号
                const sendExportSignal = async () => {
                    try {
                        await ipcRenderer.invoke("ExportYakScriptStream", exportLocalParams)
                    } catch (error) {
                        yakitFailed(error + "")
                    }
                }
                sendExportSignal()

                // 每200毫秒渲染一次数据
                timer = setInterval(() => {
                    setLocalStreamData(localStreamDataRef.current)
                    // setLocallogListInfo([...locallogListInfoRef.current])
                }, 200)

                ipcRenderer.on("export-yak-script-data", (e, data: ExecResult) => {
                    let obj: ExecResultMessage = JSON.parse(Buffer.from(data.Message).toString())
                    if (obj.type === "log" && obj.content.level === "file") {
                        locallogListInfoRef.current.unshift({
                            message: obj.content.data,
                            isError: false,
                            key: uuidv4()
                        })
                    }
                    if (obj.type === "progress") {
                        localStreamDataRef.current = {Progress: obj.content.progress}
                        if (obj.content.progress === 1) {
                            const logMsg = locallogListInfoRef.current[locallogListInfoRef.current.length - 1].message
                            try {
                                const logObj = JSON.parse(logMsg) || {}
                                ipcRenderer.invoke("is-file-exists", logObj.path).then((flag: boolean) => {
                                    if (flag) {
                                        openABSFileLocated(logObj.path)
                                    }
                                })
                            } catch (error) {}
                            setTimeout(() => {
                                handleExportLocalPluginFinish()
                            }, 300)
                        }
                    }
                })

                return () => {
                    clearInterval(timer)
                    ipcRenderer.invoke("cancel-ExportYakScriptStream")
                    ipcRenderer.removeAllListeners("export-yak-script-data")
                }
            }
        },
        [visible, exportLocalParams],
        {wait: 300}
    )

    const resetLocalExport = () => {
        setLocalStreamData(undefined)
        setLocallogListInfo([])
        localStreamDataRef.current = undefined
        locallogListInfoRef.current = []
    }

    const handleExportLocalPluginFinish = () => {
        if (localStreamDataRef.current && localStreamDataRef.current.Progress !== 1) {
            ipcRenderer.invoke("cancel-ExportYakScriptStream")
            yakitNotify("info", "取消导出插件")
        }
        resetLocalExport()
        onClose()
    }

    return (
        <YakitModal
            visible={visible}
            getContainer={getContainer}
            type='white'
            title='导出本地插件'
            onCancel={handleExportLocalPluginFinish}
            width={680}
            closable={true}
            maskClosable={false}
            destroyOnClose={true}
            bodyStyle={{padding: 0}}
            footerStyle={{justifyContent: "flex-end"}}
            footer={
                <YakitButton type={"outline2"} onClick={handleExportLocalPluginFinish}>
                    {localStreamData?.Progress === 1 ? "完成" : "取消"}
                </YakitButton>
            }
        >
            <div style={{padding: "0 16px"}}>
                <ImportAndExportStatusInfo
                    title='导出中'
                    showDownloadDetail={false}
                    streamData={localStreamData || {Progress: 0}}
                    logListInfo={locallogListInfo}
                ></ImportAndExportStatusInfo>
            </div>
        </YakitModal>
    )
}

interface PluginLocalExportFormProps {
    onCancel: () => void
    onOK: (values: {OutputFilename: string; Password: string}) => void
}
export const PluginLocalExportForm: React.FC<PluginLocalExportFormProps> = (props) => {
    const {onCancel, onOK} = props
    const [form] = Form.useForm()

    return (
        <Form
            form={form}
            layout={"horizontal"}
            labelCol={{span: 5}}
            wrapperCol={{span: 18}}
            onValuesChange={(changedValues, allValues) => {}}
            onSubmitCapture={(e) => {
                e.preventDefault()
            }}
        >
            <Form.Item label={"文件名"} rules={[{required: true, message: "请填写文件夹名"}]} name={"OutputFilename"}>
                <YakitInput />
            </Form.Item>

            <Form.Item label={"密码"} name={"Password"}>
                <YakitInput />
            </Form.Item>

            <div style={{display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, marginRight: 20}}>
                <YakitButton type='outline2' onClick={onCancel}>
                    取消
                </YakitButton>
                <YakitButton type={"primary"} onClick={() => form.validateFields().then((res) => onOK(res))}>
                    确定
                </YakitButton>
            </div>
        </Form>
    )
}
