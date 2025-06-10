import {memo, useEffect, useRef} from "react"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitFormDragger} from "@/components/yakitUI/YakitForm/YakitForm"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {ImportAndExportStatusInfo} from "@/components/YakitUploadModal/YakitUploadModal"
import {yakitNotify} from "@/utils/notification"
import {openABSFileLocated} from "@/utils/openWebsite"
import {randomString} from "@/utils/randomUtil"
import {useMemoizedFn, useSafeState} from "ahooks"
import {Form} from "antd"
import {useCampare} from "@/hook/useCompare/useCompare"
import {YakitFormDraggerProps} from "@/components/yakitUI/YakitForm/YakitFormType"
import styles from "./ImportExportModal.module.scss"

const {ipcRenderer} = window.require("electron")

const ImportExportModalSize = {
    export: {
        width: 520,
        labelCol: 5,
        wrapperCol: 18
    },
    import: {
        width: 720,
        labelCol: 6,
        wrapperCol: 17
    }
}
export interface ExportImportProgress {
    Progress: number
    Verbose: string
}
interface ExportRequest<T> {
    Filter: T
    Password: string
    TargetPath: string
}
interface ImportRequest {
    InputPath: string
    Password: string
}
export type ImportExportModalExtra = {
    hint: boolean
} & {
    title: string
    type: "export" | "import"
    apiKey: string
}
type ImportExportWhichUse = "fingerprint" | "rule"
interface ImportExportModalComProps<T> {
    /** 是否被dom节点包含 */
    getContainer?: HTMLElement
    extra: ImportExportModalExtra
    whichUse: ImportExportWhichUse
    filterData: T
    onCallback: (result: boolean) => void
    yakitFormDraggerProps?: YakitFormDraggerProps
}
const ImportExportModalInner = <T,>(props: ImportExportModalComProps<T>) => {
    const {getContainer, extra, onCallback, filterData, yakitFormDraggerProps = {}} = props

    const [form] = Form.useForm()

    const [token, setToken] = useSafeState("")
    const [showProgressStream, setShowProgressStream] = useSafeState(false)
    const timeRef = useRef<ReturnType<typeof setTimeout>>()
    const importExportStreamRef = useRef<ExportImportProgress>({
        Progress: 0,
        Verbose: ""
    })
    const [progressStream, setProgressStream] = useSafeState<ExportImportProgress>({
        Progress: 0,
        Verbose: ""
    })

    // 导出路径
    const exportPath = useRef<string>("")

    const onSubmit = useMemoizedFn(() => {
        const formValue = form.getFieldsValue()

        if (extra.type === "export") {
            if (!formValue.TargetPath) {
                yakitNotify("error", `请填写文件夹名`)
                return
            }
            const request: ExportRequest<T> = {
                Filter: filterData,
                TargetPath: formValue?.TargetPath || "",
                Password: formValue?.Password || undefined
            }
            if (!request.TargetPath.endsWith(".zip")) {
                request.TargetPath = request.TargetPath + ".zip"
            }
            ipcRenderer
                .invoke("GenerateProjectsFilePath", request.TargetPath)
                .then((res) => {
                    exportPath.current = res
                    ipcRenderer.invoke(extra.apiKey, request, token).then(() => {
                        setShowProgressStream(true)
                    })
                })
                .catch(() => {})
        }

        if (extra.type === "import") {
            if (!formValue.InputPath) {
                yakitNotify("error", `请输入本地路径`)
                return
            }
            const params: ImportRequest = {
                InputPath: formValue.InputPath,
                Password: formValue.Password || undefined
            }
            ipcRenderer.invoke(extra.apiKey, params, token).then(() => {
                setShowProgressStream(true)
            })
        }
    })

    const onCancelStream = useMemoizedFn(() => {
        if (!token) return

        ipcRenderer.invoke(`cancel-${extra.apiKey}`, token)
        ipcRenderer.removeAllListeners(`${token}-data`)
        ipcRenderer.removeAllListeners(`${token}-error`)
        ipcRenderer.removeAllListeners(`${token}-end`)
        clearInterval(timeRef.current)
    })
    const onSuccessStream = useMemoizedFn(() => {
        if (extra.type === "export") {
            exportPath.current && openABSFileLocated(exportPath.current)
        }
        onCallback(true)
    })

    const progressStreamCom = useCampare(progressStream)
    useEffect(() => {
        if (progressStream.Progress === 1) {
            onSuccessStream()
        }
    }, [progressStreamCom])

    useEffect(() => {
        if (!token) {
            return
        }
        const typeTitle = extra.apiKey
        const updateImportExportHTTPFlowStream = () => {
            setProgressStream({...importExportStreamRef.current})
        }
        timeRef.current = setInterval(updateImportExportHTTPFlowStream, 500)
        ipcRenderer.on(`${token}-data`, async (_, data: ExportImportProgress) => {
            importExportStreamRef.current = data
        })
        ipcRenderer.on(`${token}-error`, (_, error) => {
            yakitNotify("error", `[${typeTitle}] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, () => {
            yakitNotify("info", `[${typeTitle}] finished`)
        })
        return () => {
            if (token) {
                onCancelStream()
            }
        }
    }, [token])

    const onCancel = useMemoizedFn(() => {
        onCallback(false)
    })

    // modal header 描述文字
    const exportDescribeMemoizedFn = useMemoizedFn((type) => {
        switch (type) {
            case "export":
                return (
                    <div className={styles["export-hint"]}>
                        远程模式下导出后请打开~Yakit\yakit-projects\projects路径查看导出文件，文件名无需填写后缀
                    </div>
                )
            case "import":
                return (
                    <div className={styles["import-hint"]}>
                        导入外部资源存在潜在风险，可能会被植入恶意代码或Payload，造成数据泄露、系统被入侵等严重后果。请务必谨慎考虑引入外部资源的必要性，并确保资源来源可信、内容安全。如果确实需要使用外部资源，建议优先选择官方发布的安全版本，或自行编写可控的数据源。同时，请保持系统和软件的最新版本，及时修复已知漏洞，做好日常安全防护。
                    </div>
                )

            default:
                break
        }
    })

    // 导入 / 导出 item 节点
    const exportItemMemoizedFn = useMemoizedFn((type) => {
        switch (type) {
            case "export":
                return (
                    <Form.Item
                        label={"文件夹名"}
                        rules={[{required: true, message: "请填写文件夹名"}]}
                        name={"TargetPath"}
                    >
                        <YakitInput />
                    </Form.Item>
                )
            case "import":
                return (
                    <>
                        <YakitFormDragger
                            formItemProps={{
                                name: "InputPath",
                                label: "本地路径",
                                rules: [{required: true, message: "请输入本地路径"}]
                            }}
                            multiple={false}
                            selectType='file'
                            fileExtensionIsExist={false}
                            {...yakitFormDraggerProps}
                        />
                    </>
                )

            default:
                break
        }
    })

    useEffect(() => {
        if (extra.hint) {
            setToken(randomString(40))
            form.resetFields()
        }
        // 关闭时重置所有数据
        return () => {
            if (extra.hint) {
                setShowProgressStream(false)
                setProgressStream({Progress: 0, Verbose: ""})
                importExportStreamRef.current = {Progress: 0, Verbose: ""}
                exportPath.current = ""
                clearInterval(timeRef.current)
            }
        }
    }, [extra.hint])

    return (
        <>
            <YakitModal
                getContainer={getContainer}
                type='white'
                width={ImportExportModalSize[extra.type].width}
                centered={true}
                keyboard={false}
                maskClosable={false}
                visible={extra.hint}
                title={extra.title}
                bodyStyle={{padding: 0}}
                onCancel={() => {
                    onCancelStream()
                    onCancel()
                }}
                footerStyle={{justifyContent: "flex-end"}}
                footer={
                    <>
                        {!showProgressStream ? (
                            <>
                                {extra.type === "export" && (
                                    <YakitButton type={"outline2"} onClick={onCancel} style={{marginRight: 8}}>
                                        取消
                                    </YakitButton>
                                )}
                                <YakitButton onClick={onSubmit}>
                                    {extra.type === "import" ? "导入" : "确定"}
                                </YakitButton>
                            </>
                        ) : (
                            <YakitButton
                                type={"outline2"}
                                onClick={() => {
                                    onCancelStream()
                                    onCancel()
                                }}
                            >
                                取消
                            </YakitButton>
                        )}
                    </>
                }
            >
                {!showProgressStream ? (
                    <div className={styles["import-export-modal"]}>
                        {exportDescribeMemoizedFn(extra.type)}
                        <Form
                            form={form}
                            layout={"horizontal"}
                            labelCol={{span: ImportExportModalSize[extra.type].labelCol}}
                            wrapperCol={{span: ImportExportModalSize[extra.type].wrapperCol}}
                            onSubmitCapture={(e) => {
                                e.preventDefault()
                            }}
                        >
                            {exportItemMemoizedFn(extra.type)}
                            <Form.Item label={"密码"} name={"Password"}>
                                <YakitInput />
                            </Form.Item>
                        </Form>
                    </div>
                ) : (
                    <div style={{padding: "0 16px"}}>
                        <ImportAndExportStatusInfo
                            title={extra.type === "export" ? "导出中" : "导入中"}
                            showDownloadDetail={false}
                            streamData={progressStream || {Progress: 0}}
                            logListInfo={[]}
                        />
                    </div>
                )}
            </YakitModal>
        </>
    )
}
const ImportExportModal = memo(<T,>(props: ImportExportModalComProps<T>) => <ImportExportModalInner {...props} />) as <
    T
>(
    props: ImportExportModalComProps<T>
) => JSX.Element

export default ImportExportModal
