import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {Dispatch, FC, MutableRefObject, SetStateAction, useState} from "react"
import styles from "../knowledgeBase.module.scss"
import Dragger from "antd/lib/upload/Dragger"
import {PropertyIcon} from "@/pages/payloadManager/icon"
import {failed, yakitNotify} from "@/utils/notification"
import {useCreation, useDebounceFn, useRequest, useSafeState} from "ahooks"
import {OutlinePaperclipIcon} from "@/assets/icon/outline"
import {SolidXcircleIcon} from "@/assets/icon/solid"
import {grpcFetchLocalPluginDetail} from "@/pages/pluginHub/utils/grpc"
import {apiCancelDebugPlugin, apiDebugPlugin, DebugPluginRequest} from "@/pages/plugins/utils"
import {defPluginExecuteFormValue} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/constants"
import {randomString} from "@/utils/randomUtil"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {ExpandAndRetractExcessiveState} from "@/pages/plugins/operator/expandAndRetract/ExpandAndRetract"
import {PluginExecuteResult} from "@/pages/plugins/operator/pluginExecuteResult/PluginExecuteResult"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"

interface TAddKnowledgenBaseModalProps {
    addKnowledgenBaseModal: {
        addKnowledgenBaseModalVisible: boolean
        knowledgeBaseId: number | undefined
        KnowledgeBaseName: string | undefined
    }
    setAddKnowledgenBaseModal: (preValue: {
        addKnowledgenBaseModalVisible: boolean
        knowledgeBaseId: number | undefined
        KnowledgeBaseName: string | undefined
    }) => void
    token: MutableRefObject<string>
    lastTokenRef: MutableRefObject<string>
    setIsRefresh: Dispatch<SetStateAction<boolean>>
    runAsync: (params: any) => Promise<any>
    params?: any
}

const AddKnowledgenBaseModal: FC<TAddKnowledgenBaseModalProps> = ({
    addKnowledgenBaseModal,
    setAddKnowledgenBaseModal,
    token,
    lastTokenRef,
    setIsRefresh,
    runAsync,
    params
}) => {
    const [uploadList, setUploadList] = useSafeState<{path: string; name: string}[]>([])

    const [executeStatus, setExecuteStatus] = useSafeState<ExpandAndRetractExcessiveState>("default")
    const [runtimeId, setRuntimeId] = useState<string>("")
    const [_, setSreamStatus, getSreamStatus] = useGetSetState({
        error: false,
        success: false
    })
    const [targetToken, setTargetToken, getTargetToken] = useGetSetState<string>("")

    const {run} = useRequest(async (params) => await apiDebugPlugin(params), {
        manual: true,
        onSuccess: () => {
            setExecuteStatus("process")
            debugPluginStreamEvent.start()
        }
    })

    const beforeUploadFun = useDebounceFn(
        (fileList: any[]) => {
            let arr: {
                path: string
                name: string
            }[] = []
            fileList.forEach((f) => {
                let name = f.name.split(".")[0]
                arr.push({
                    path: f.path,
                    name
                })
            })
            setUploadList(arr)
        },
        {
            wait: 200
        }
    ).run

    const [streamInfo, debugPluginStreamEvent] = useHoldGRPCStream({
        taskName: "debug-plugin",
        apiKey: "DebugPlugin",
        token: getTargetToken(),
        onError: () =>
            setSreamStatus({
                error: true,
                success: false
            }),
        onEnd: async () => {
            const {error, success} = getSreamStatus()
            if (error && !success) {
                debugPluginStreamEvent.stop()
                await runAsync(params)
                onCancel()
                setTimeout(() => {
                    setExecuteStatus("finished")
                }, 300)
                apiCancelDebugPlugin(getTargetToken()).then(() => {
                    setRuntimeId("")
                    token.current = ""
                    lastTokenRef.current = ""
                    debugPluginStreamEvent.reset()
                    setAddKnowledgenBaseModal({
                        addKnowledgenBaseModalVisible: false,
                        knowledgeBaseId: addKnowledgenBaseModal.knowledgeBaseId,
                        KnowledgeBaseName: addKnowledgenBaseModal.KnowledgeBaseName
                    })
                    setIsRefresh((prev) => !prev)
                    setSreamStatus({
                        success: false,
                        error: false
                    })
                })
            } else if (!error && !success) {
                setSreamStatus((pre) => ({...pre, success: true}))
                setTargetToken(lastTokenRef.current)

                const pluginData = await grpcFetchLocalPluginDetail({Name: "构建知识条目"}, true)
                let executeParams = {
                    params: {
                        Code: "",
                        PluginType: "yak",
                        PluginName: "构建知识条目",
                        ExecParams: [
                            {
                                Key: "kbName",
                                Value: addKnowledgenBaseModal.KnowledgeBaseName!
                            },
                            {
                                Key: "query",
                                Value: ""
                            },
                            {
                                Key: "entrylen",
                                Value: "1000"
                            },
                            {
                                Key: "k",
                                Value: "0"
                            },
                            {
                                Key: "kmin",
                                Value: "2"
                            },
                            {
                                Key: "kmax",
                                Value: "4"
                            }
                        ]
                    },
                    pluginCustomParams: pluginData?.Params
                }
                run({
                    ...executeParams,
                    token: lastTokenRef.current
                })
            } else {
                debugPluginStreamEvent.stop()
                await runAsync(params)
                onCancel()
                setTimeout(() => {
                    setExecuteStatus("finished")
                }, 300)
                apiCancelDebugPlugin(getTargetToken()).then(() => {
                    setRuntimeId("")
                    token.current = ""
                    lastTokenRef.current = ""
                    debugPluginStreamEvent.reset()
                    setAddKnowledgenBaseModal({
                        addKnowledgenBaseModalVisible: false,
                        knowledgeBaseId: addKnowledgenBaseModal.knowledgeBaseId,
                        KnowledgeBaseName: addKnowledgenBaseModal.KnowledgeBaseName
                    })
                    setIsRefresh((prev) => !prev)
                    setSreamStatus({
                        success: false,
                        error: false
                    })
                })
            }
        },
        setRuntimeId: (rId) => {
            yakitNotify("info", `调试任务启动成功，运行时 ID: ${rId}`)
            setRuntimeId(rId)
        }
    })

    const isExecuting = useCreation(() => {
        if (executeStatus === "process") return true
        return false
    }, [executeStatus])

    const isShowResult = useCreation(() => {
        return isExecuting || runtimeId
    }, [isExecuting, runtimeId])

    const handleOk = async () => {
        if (!uploadList.length) {
            failed("请上传添加知识库条目扫描所需文件")
            return
        }
        if (uploadList.length > 0 && !isShowResult) {
            const pathStr = uploadList.map((it) => it.path).join(",")
            setTargetToken(token.current)
            const plugin = await grpcFetchLocalPluginDetail({Name: "构建知识库"}, true)

            let executeParams: DebugPluginRequest = {
                Code: "",
                PluginType: plugin.Type,
                Input: "",
                HTTPRequestTemplate: {
                    ...defPluginExecuteFormValue,
                    IsHttpFlowId: false,
                    HTTPFlowId: []
                },
                ExecParams: [
                    {
                        Key: "files",
                        Value: pathStr
                    },
                    {
                        Key: "kbName",
                        Value: addKnowledgenBaseModal.KnowledgeBaseName || "default"
                    },
                    {
                        Key: "prompt",
                        Value: ""
                    },
                    {
                        Key: "entrylen",
                        Value: "1000"
                    },
                    {
                        Key: "k",
                        Value: "0"
                    },
                    {
                        Key: "kmin",
                        Value: "2"
                    },
                    {
                        Key: "kmax",
                        Value: "4"
                    }
                ],
                PluginName: plugin.ScriptName
            }
            run({
                params: executeParams,
                token: token.current,
                pluginCustomParams: plugin.Params
            })
        }
    }

    // 关闭弹窗事件
    const onCancel = () => {
        setUploadList([])
        setExecuteStatus("default")
        if (isShowResult) {
            setSreamStatus({
                error: true,
                success: false
            })
            apiCancelDebugPlugin(getTargetToken()).then(() => {
                debugPluginStreamEvent.stop()
            })
        } else {
            setAddKnowledgenBaseModal({
                addKnowledgenBaseModalVisible: false,
                knowledgeBaseId: addKnowledgenBaseModal.knowledgeBaseId,
                KnowledgeBaseName: addKnowledgenBaseModal.KnowledgeBaseName
            })
        }
    }

    // 手动停止
    const headleStop = () => {
        setSreamStatus({
            error: true,
            success: false
        })
        apiCancelDebugPlugin(getTargetToken()).then(() => {
            debugPluginStreamEvent.stop()
        })
    }

    return (
        <YakitModal
            getContainer={document.getElementById("repository-manage") || document.body}
            title={"添加知识库条目"}
            visible={addKnowledgenBaseModal.addKnowledgenBaseModalVisible}
            onCancel={onCancel}
            maskClosable={false}
            width={isShowResult ? "50%" : 600}
            destroyOnClose
            footer={[
                <div className={styles["vector-detail-modal-footer"]} key={randomString(50)}>
                    {!isShowResult && (
                        <YakitButton type='outline1' key='vectorDatailSubmit' onClick={onCancel}>
                            取消
                        </YakitButton>
                    )}
                    {!isShowResult ? (
                        <YakitButton colors={"primary"} key='vectorDatailClose' onClick={handleOk}>
                            确定
                        </YakitButton>
                    ) : (
                        <YakitButton colors={"danger"} key='vectorDatailClose' onClick={headleStop}>
                            停止
                        </YakitButton>
                    )}
                </div>
            ]}
        >
            <div className={styles["upload-dragger-box"]}>
                {!isShowResult ? (
                    <div>
                        <Dragger
                            className={styles["upload-dragger"]}
                            multiple={true}
                            showUploadList={false}
                            beforeUpload={(f: any, fileList: any) => {
                                beforeUploadFun(fileList)
                                return false
                            }}
                        >
                            <div className={styles["upload-info"]}>
                                <div className={styles["add-file-icon"]}>
                                    <PropertyIcon />
                                </div>
                                <div className={styles["content"]}>
                                    <div className={styles["title"]}>
                                        可将文件拖入框内，或
                                        <span className={styles["hight-light"]}>点击此处导入</span>
                                    </div>
                                    <div className={styles["sub-title"]}>支持文件夹批量上传</div>
                                </div>
                            </div>
                        </Dragger>
                        <div className={styles["upload-list"]}>
                            {uploadList.map((item, index) => (
                                <div className={styles["upload-list-item"]} key={index}>
                                    <div className={styles["link-icon"]}>
                                        <OutlinePaperclipIcon />
                                    </div>
                                    <div className={styles["text"]}>{item.path}</div>
                                    <div
                                        className={styles["close-icon"]}
                                        onClick={() => {
                                            const newUploadList = uploadList.filter(
                                                (itemIn) => itemIn.path !== item.path
                                            )
                                            setUploadList(newUploadList)
                                        }}
                                    >
                                        <SolidXcircleIcon />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <PluginExecuteResult
                        streamInfo={streamInfo}
                        runtimeId={runtimeId}
                        loading={isExecuting}
                        defaultActiveKey='日志'
                    />
                )}
            </div>
        </YakitModal>
    )
}

export {AddKnowledgenBaseModal}
