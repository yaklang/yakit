import {memo, useEffect, useRef} from "react"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitModal, YakitModalProp} from "@/components/yakitUI/YakitModal/YakitModal"
import {ImportAndExportStatusInfo} from "@/components/YakitUploadModal/YakitUploadModal"
import {yakitNotify} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {useMemoizedFn, useSafeState} from "ahooks"
import {Form, FormInstance, FormProps} from "antd"
import {useCampare} from "@/hook/useCompare/useCompare"
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

type IsProgressFinished<P> = (progress: P) => boolean
type GetProgressValue<P> = (progress: P) => number

export type ImportExportModalExtra = {
    hint: boolean
} & {
    title: string
    type: "export" | "import"
    apiKey: string
}
interface ImportExportModalProps<F, R, P> {
    getContainer?: HTMLElement
    extra: ImportExportModalExtra
    modelProps?: YakitModalProp
    formProps?: FormProps
    renderForm: (form: FormInstance) => React.ReactNode
    onBeforeSubmit?: (values: F) => Promise<void> | void
    onSubmitForm: (values: F) => R
    initialProgress: P
    getProgressValue: GetProgressValue<P>
    isProgressFinished: IsProgressFinished<P>
    onFinished: (result: boolean) => void
}
const ImportExportModalInner = <F, R, P>(props: ImportExportModalProps<F, R, P>) => {
    const {
        getContainer,
        extra,
        modelProps = {},
        formProps = {},
        renderForm,
        onBeforeSubmit,
        onSubmitForm,
        initialProgress,
        getProgressValue,
        isProgressFinished,
        onFinished
    } = props

    const [form] = Form.useForm()

    const [token, setToken] = useSafeState("")
    const [showProgressStream, setShowProgressStream] = useSafeState(false)
    const timeRef = useRef<ReturnType<typeof setTimeout>>()
    const importExportStreamRef = useRef<P>(initialProgress)
    const [progressStream, setProgressStream] = useSafeState<P>(initialProgress)

    const onSubmit = useMemoizedFn(async () => {
        try {
            const values = form.getFieldsValue() as F
            await onBeforeSubmit?.(values)
            const params = onSubmitForm(values)
            await ipcRenderer.invoke(extra.apiKey, params, token)
            setShowProgressStream(true)
        } catch (e) {
            yakitNotify("error", `[${extra.apiKey}] error:  ${e}`)
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

    const progressStreamCom = useCampare(progressStream)
    useEffect(() => {
        if (isProgressFinished(progressStream)) {
            onFinished(true)
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
        ipcRenderer.on(`${token}-data`, async (_, data: P) => {
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
        onFinished(false)
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

    useEffect(() => {
        if (extra.hint) {
            setToken(randomString(40))
            form.resetFields()
        }
        // 关闭时重置所有数据
        return () => {
            if (extra.hint) {
                setShowProgressStream(false)
                setProgressStream(initialProgress)
                importExportStreamRef.current = initialProgress
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
                {...modelProps}
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
                        <Form
                            form={form}
                            layout={"horizontal"}
                            labelCol={{span: ImportExportModalSize[extra.type].labelCol}}
                            wrapperCol={{span: ImportExportModalSize[extra.type].wrapperCol}}
                            {...formProps}
                            onSubmitCapture={(e) => {
                                e.preventDefault()
                            }}
                        >
                            {exportDescribeMemoizedFn(extra.type)}
                            {renderForm(form)}
                        </Form>
                    </div>
                ) : (
                    <div style={{padding: "0 16px"}}>
                        <ImportAndExportStatusInfo
                            title={extra.type === "export" ? "导出中" : "导入中"}
                            showDownloadDetail={false}
                            streamData={{
                                Progress: getProgressValue(progressStream)
                            }}
                            logListInfo={[]}
                        />
                    </div>
                )}
            </YakitModal>
        </>
    )
}
const ImportExportModal = memo(<F, R, P>(props: ImportExportModalProps<F, R, P>) => (
    <ImportExportModalInner {...props} />
)) as <F, R, P>(props: ImportExportModalProps<F, R, P>) => JSX.Element

export default ImportExportModal
