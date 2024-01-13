import {useRef, useState} from "react"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {
    ImportAndExportStatusInfo,
    LogListInfo,
    SaveProgressStream
} from "@/components/YakitUploadModal/YakitUploadModal"
import {v4 as uuidv4} from "uuid"
import {yakitFailed} from "@/utils/notification"
import {ExportParamsProps, ExportYakScriptLocalResponse} from "./PluginsLocalType"
import {useDebounceEffect} from "ahooks"
const {ipcRenderer} = window.require("electron")

export const initExportLocalParams: ExportParamsProps = {
    OutputDir: "",
    YakScriptIds: [],
    Keywords: "",
    Type: "",
    UserName: "",
    Tags: ""
}

declare type getContainerFunc = () => HTMLElement
interface PluginLocalExportProps {
    visible: boolean
    onClose: () => void
    getContainer?: string | HTMLElement | getContainerFunc | false
    exportLocalParams: ExportParamsProps
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
                try {
                    // 发送导出流信号
                    const sendExportSignal = async () => {
                        await ipcRenderer.invoke("ExportLocalYakScriptStream", exportLocalParams)
                    }
                    sendExportSignal()

                    // 每200毫秒渲染一次数据
                    timer = setInterval(() => {
                        setLocalStreamData(localStreamDataRef.current)
                        setLocallogListInfo([...locallogListInfoRef.current])
                    }, 200)

                    // 接收导出返回的流数据
                    ipcRenderer.on("export-yak-script-data", (e, data: ExportYakScriptLocalResponse) => {
                        localStreamDataRef.current = {Progress: data.Progress}
                        // 只展示错误日志和最后一条日志
                        if (data.MessageType === "error" || data.Progress === 1) {
                            locallogListInfoRef.current.unshift({
                                message: data.Message,
                                isError: ["error", "finalError"].includes(data.MessageType),
                                key: uuidv4()
                            })
                        }
                        // 导出成功或状态为finished自动关闭弹窗
                        if (["success", "finished"].includes(data.MessageType) && data.Progress === 1) {
                            setTimeout(() => {
                                handleExportLocalPluginFinish()
                            }, 300)
                        }
                    })
                } catch (error) {
                    yakitFailed(error + "")
                }

                return () => {
                    clearInterval(timer)
                    ipcRenderer.invoke("cancel-exportYakScript")
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
            footer={[
                <YakitButton type={"outline2"} onClick={handleExportLocalPluginFinish}>
                    {localStreamData?.Progress === 1 ? "完成" : "取消"}
                </YakitButton>
            ]}
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
