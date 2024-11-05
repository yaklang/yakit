import React, {useState, useMemo, useRef, useEffect} from "react"
import YakitSteps from "./YakitSteps/YakitSteps"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useMemoizedFn} from "ahooks"
import {Radio, Progress} from "antd"
import {randomString} from "@/utils/randomUtil"
import {failed, yakitNotify} from "@/utils/notification"
import {YakScript} from "@/pages/invoker/schema"
import {CodeScoreModule} from "../funcTemplate"
import usePluginUploadHooks, {SaveYakScriptToOnlineRequest, SaveYakScriptToOnlineResponse} from "../pluginUploadHooks"
import {PluginUploadSupplement} from "@/pages/pluginHub/pluginUploadModal/PluginUploadModal"

import classNames from "classnames"
import "../plugins.scss"
import styles from "./PluginLocalUpload.module.scss"

interface PluginLocalUploadProps {
    pluginNames: string[]
    onClose: () => void
}

const {ipcRenderer} = window.require("electron")

export const PluginLocalUpload: React.FC<PluginLocalUploadProps> = React.memo((props) => {
    const {pluginNames, onClose} = props
    const [current, setCurrent] = useState<number>(0)
    const [isPrivate, setIsPrivate] = useState<boolean>(true)

    const [successPluginNames, setSuccessPluginNames] = useState<string[]>([])
    const [supplementJson, setSupplementJson] = useState<string>("")
    // 选择展示类型
    const onPrivateSelectionPrev = useMemoizedFn((v) => {
        if (v) {
            // true 选择的私密，私密会跳过检测，直接上传
            setCurrent(current + 3)
            setSuccessPluginNames(pluginNames)
        } else {
            setCurrent(current + 1)
        }
        setIsPrivate(v)
    })
    // 返回符合的插件名集合
    const onAutoTestNext = useMemoizedFn((pluginNames) => {
        setCurrent(current + 1)
        setSuccessPluginNames(pluginNames)
    })

    // 返回补充资料
    const handleUploadSupplement = useMemoizedFn((data: string) => {
        setCurrent(current + 1)
        setSupplementJson(data)
    })

    const steps = useMemo(() => {
        return [
            {
                title: "选私密/公开",
                content: <PluginIsPrivateSelection onNext={onPrivateSelectionPrev} />
            },
            {
                title: "自动检测",
                content: (
                    <PluginAutoTest
                        show={current === 1}
                        pluginNames={pluginNames}
                        onNext={onAutoTestNext}
                        onCancel={onClose}
                    />
                )
            },
            {
                title: "下一步", //补充资料",
                content: <PluginUploadSupplement nextName='下一步' loading={false} callback={handleUploadSupplement} />
            },
            {
                title: "上传中",
                content: (
                    <PluginUpload
                        show={current === 3 && successPluginNames.length > 0}
                        pluginNames={successPluginNames}
                        onSave={onClose}
                        onCancel={onClose}
                        isPrivate={isPrivate}
                        supplementJson={supplementJson}
                    />
                )
            }
        ]
    }, [current, successPluginNames, pluginNames, isPrivate, supplementJson])
    return (
        <div className={styles["plugin-local-upload"]}>
            <YakitSteps current={current}>
                {steps.map((item) => (
                    <YakitSteps.YakitStep key={item.title} title={item.title} />
                ))}
            </YakitSteps>
            {current !== 2 && (
                <div className={styles["header-wrapper"]}>
                    <div className={styles["title-style"]}>提示：</div>
                    <div className={styles["header-body"]}>
                        <div className={styles["opt-content"]}>
                            <div className={styles["content-order"]}>1</div>
                            批量上传只支持新增，更新插件请点击编辑逐个进行更新
                        </div>
                    </div>
                </div>
            )}
            <div className={styles["plugin-local-upload-steps-content"]}>{steps[current]?.content}</div>
        </div>
    )
})

interface PluginIsPrivateSelectionProps {
    /**下一步 */
    onNext: (b: boolean) => void
}
const PluginIsPrivateSelection: React.FC<PluginIsPrivateSelectionProps> = React.memo((props) => {
    const {onNext} = props
    const [isPrivate, setIsPrivate] = useState<boolean>(true)
    const onClickNext = useMemoizedFn(() => {
        onNext(isPrivate)
    })
    return (
        <>
            <div className={styles["plugin-isPrivate-select"]}>
                <Radio
                    className='plugins-radio-wrapper'
                    checked={isPrivate}
                    onClick={(e) => {
                        setIsPrivate(true)
                    }}
                >
                    私密(仅自己可见)
                </Radio>
                <Radio
                    className='plugins-radio-wrapper'
                    checked={!isPrivate}
                    onClick={(e) => {
                        setIsPrivate(false)
                    }}
                >
                    公开(审核通过后，将上架到插件商店)
                </Radio>
            </div>
            <div className={styles["plugin-local-upload-steps-action"]}>
                <YakitButton onClick={onClickNext}>下一步</YakitButton>
            </div>
        </>
    )
})
interface PluginAutoTestProps {
    /**是否显示 */
    show: boolean
    /**选择的插件 */
    pluginNames: string[]
    /**取消 */
    onCancel: () => void
    /**
     * 下一步
     */
    onNext: (names: string[]) => void
}
interface MessageListProps {
    Message: string
    MessageType: string
}
interface SmokingEvaluatePluginBatchRequest {
    ScriptNames: string[]
}
interface SmokingEvaluatePluginBatchResponse {
    Progress: number
    Message: string
    MessageType: string
}
const PluginAutoTest: React.FC<PluginAutoTestProps> = React.memo((props) => {
    const {show, pluginNames, onNext, onCancel} = props
    const taskTokenRef = useRef(randomString(40))
    const [percent, setPercent] = useState<number>(0)
    const [messageList, setMessageList] = useState<MessageListProps[]>([])
    const [isHaveError, setIsHaveError] = useState<boolean>(false)
    const [isShowRetry, setIsShowRetry] = useState<boolean>(false)
    const [successPluginNames, setSuccessPluginNames] = useState<string[]>([])

    useEffect(() => {
        const taskToken = taskTokenRef.current
        if (!taskToken) {
            return
        }
        ipcRenderer.on(`${taskToken}-data`, onProgressData)
        ipcRenderer.on(`${taskToken}-end`, () => {})
        ipcRenderer.on(`${taskToken}-error`, (_, e) => {
            setIsShowRetry(true)
            yakitNotify("error", "自动评分异常，请重试")
        })
        return () => {
            ipcRenderer.invoke("cancel-SmokingEvaluatePluginBatch", taskToken)
            ipcRenderer.removeAllListeners(`${taskToken}-data`)
            ipcRenderer.removeAllListeners(`${taskToken}-error`)
            ipcRenderer.removeAllListeners(`${taskToken}-end`)
        }
    }, [])
    useEffect(() => {
        if (show) {
            startAutoTest()
            onReset()
        }
    }, [show])
    /**重置数据 */
    const onReset = useMemoizedFn(() => {
        setPercent(0)
        setMessageList([])
        setIsHaveError(false)
        setIsShowRetry(false)
    })
    const onProgressData = useMemoizedFn((_, data: SmokingEvaluatePluginBatchResponse) => {
        try {
            if (data.Progress === 2) {
                const pluginNameList: string[] = JSON.parse(data.Message || "[]") || []
                setSuccessPluginNames(pluginNameList)
                if (pluginNameList.length === pluginNames.length) {
                    yakitNotify("success", "检测完毕,全部成功,自动进入下一步上传")
                    setTimeout(() => {
                        onNext(pluginNameList)
                    }, 200)
                } else if (pluginNameList.length === 0) {
                    yakitNotify("error", "检测完毕,全部失败,不能进行上传操作")
                } else {
                    setIsHaveError(true)
                }
            } else {
                const p = Math.floor(data.Progress * 100)
                setPercent(p)
                setMessageList([
                    {
                        Message: data.Message,
                        MessageType: data.MessageType
                    },
                    ...messageList
                ])
            }
        } catch (error) {}
    })
    const startAutoTest = useMemoizedFn(() => {
        const params: SmokingEvaluatePluginBatchRequest = {
            ScriptNames: pluginNames
        }
        ipcRenderer
            .invoke("SmokingEvaluatePluginBatch", params, taskTokenRef.current)
            .then(() => {})
            .catch((e) => {
                failed(`开始检测失败:${e}`)
            })
    })
    const onClickNext = useMemoizedFn(() => {
        onNext(successPluginNames)
    })
    const onClickCancel = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-SmokingEvaluatePluginBatch", taskTokenRef.current)
        onCancel()
    })
    const onClickRetry = useMemoizedFn(() => {
        onReset()
        startAutoTest()
    })
    return (
        <>
            <div className={styles["plugin-progress"]}>
                <Progress
                    strokeColor='#F28B44'
                    trailColor='#F0F2F5'
                    percent={percent}
                    format={(percent) => `已检测 ${percent}%`}
                />
                {messageList.length > 0 && (
                    <div className={styles["plugin-message-list"]}>
                        {messageList.map((i) => {
                            return (
                                <p
                                    className={classNames(styles["plugin-message"], {
                                        [styles["plugin-message-error"]]: i.MessageType === "error"
                                    })}
                                >
                                    {i.Message}
                                </p>
                            )
                        })}
                    </div>
                )}
            </div>
            <div className={styles["plugin-local-upload-steps-action"]}>
                <YakitButton type='outline2' onClick={onClickCancel}>
                    取消
                </YakitButton>
                {isShowRetry && <YakitButton onClick={onClickRetry}>重试</YakitButton>}
                {isHaveError && <YakitButton onClick={onClickNext}>下一步</YakitButton>}
            </div>
        </>
    )
})
interface PluginUploadProps {
    /**是否一键上传所有本地插件 */
    isUploadAll?: boolean
    /**插件选择的私密/公开状态 */
    isPrivate: boolean
    /**是否显示 */
    show: boolean
    /**选择的插件 */
    pluginNames: string[]
    /** 插件的补充资料 */
    supplementJson?: string
    /**取消 */
    onCancel: () => void
    /**
     * 下一步
     */
    onSave: () => void
    /**底部按钮className */
    footerClassName?: string
}
export const PluginUpload: React.FC<PluginUploadProps> = React.memo((props) => {
    const {isUploadAll, isPrivate, show, pluginNames, supplementJson, onSave, onCancel, footerClassName} = props
    const taskTokenRef = useRef(randomString(40))
    const [percent, setPercent] = useState<number>(0)
    const [messageList, setMessageList] = useState<MessageListProps[]>([])
    const [isHaveError, setIsHaveError] = useState<boolean>(false)
    const [isShowRetry, setIsShowRetry] = useState<boolean>(false)

    useEffect(() => {
        if (show) {
            startUpload()
            onReset()
        }
    }, [show])
    /**重置数据 */
    const onReset = useMemoizedFn(() => {
        setPercent(0)
        setMessageList([])
        setIsHaveError(false)
        setIsShowRetry(false)
    })
    const onProgressData = useMemoizedFn((data: SaveYakScriptToOnlineResponse) => {
        const p = Math.floor(data.Progress * 100)
        setPercent(p)
        setMessageList([
            {
                Message: data.Message,
                MessageType: data.MessageType
            },
            ...messageList
        ])
        if (data.Progress === 1) {
            if (data.MessageType === "finalError") {
                setIsHaveError(true)
            } else {
                setTimeout(() => {
                    onSave()
                }, 200)
            }
        }
    })
    const {onStart, onCancel: onPluginUploadCancel} = usePluginUploadHooks({
        taskToken: taskTokenRef.current,
        onUploadData: onProgressData,
        onUploadSuccess: () => {},
        onUploadEnd: () => {},
        onUploadError: () => {
            setIsShowRetry(true)
        }
    })
    const startUpload = useMemoizedFn(() => {
        const params: SaveYakScriptToOnlineRequest = {
            ScriptNames: pluginNames,
            IsPrivate: isPrivate,
            All: isUploadAll
        }
        if (supplementJson) params.PluginSupplement = supplementJson
        onStart(params)
    })
    const onClickNext = useMemoizedFn(() => {
        onSave()
    })
    const onClickCancel = useMemoizedFn(() => {
        onPluginUploadCancel()
        onCancel()
    })
    const onClickRetry = useMemoizedFn(() => {
        onReset()
        startUpload()
    })
    return (
        <>
            <div className={styles["plugin-progress"]}>
                <Progress
                    strokeColor='#F28B44'
                    trailColor='#F0F2F5'
                    percent={percent}
                    format={(percent) => `已上传 ${percent}%`}
                />
                {messageList.length > 0 && (
                    <div className={styles["plugin-message-list"]}>
                        {messageList.map((i) => {
                            return (
                                <p
                                    className={classNames(styles["plugin-message"], {
                                        [styles["plugin-message-error"]]: i.MessageType === "error"
                                    })}
                                >
                                    {i.Message}
                                </p>
                            )
                        })}
                    </div>
                )}
            </div>
            <div className={classNames(styles["plugin-local-upload-steps-action"], footerClassName)}>
                <YakitButton type='outline2' onClick={onClickCancel}>
                    取消
                </YakitButton>
                {isShowRetry && <YakitButton onClick={onClickRetry}>重试</YakitButton>}
                {isHaveError && <YakitButton onClick={onClickNext}>完成</YakitButton>}
            </div>
        </>
    )
})
