import React, {useState, useMemo, useRef, useEffect} from "react"

import YakitSteps from "./YakitSteps/YakitSteps"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useMemoizedFn, useGetState} from "ahooks"
import {Radio, Progress} from "antd"
import {YakitPluginOnlineDetail} from "../online/PluginsOnlineType"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import "../plugins.scss"
import styles from "./PluginLocalUpload.module.scss"
import {randomString} from "@/utils/randomUtil"
import {DownloadOnlinePluginAllResProps} from "@/pages/yakitStore/YakitStorePage"
import {failed, yakitNotify} from "@/utils/notification"
import classNames from "classnames"
import {YakScript} from "@/pages/invoker/schema"

interface PluginLocalUploadProps {
    pluginNames: string[]
    onClose: () => void
}
interface SaveYakScriptToOnlineRequest {
    ScriptNames: string[]
    IsPrivate: boolean
    All?: boolean
}

interface SaveYakScriptToOnlineResponse {
    Progress: number
    Message: string
    MessageType: string
}

const {ipcRenderer} = window.require("electron")

export const PluginLocalUpload: React.FC<PluginLocalUploadProps> = React.memo((props) => {
    const {pluginNames, onClose} = props
    const [current, setCurrent] = useState<number>(0)
    const [isPrivate, setIsPrivate] = useState<boolean>(true)

    const [successPluginNames, setSuccessPluginNames] = useState<string[]>([])

    const onPrivateSelectionPrev = useMemoizedFn((v) => {
        setCurrent(current + 1)
        setIsPrivate(v)
    })
    const onAutoTestNext = useMemoizedFn((pluginNames) => {
        setCurrent(current + 1)
        setSuccessPluginNames(pluginNames)
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
                title: "上传中",
                content: (
                    <PluginUpload
                        show={current === 2 && successPluginNames.length > 0}
                        pluginNames={successPluginNames}
                        onSave={onClose}
                        onCancel={onClose}
                        isPrivate={isPrivate}
                    />
                )
            }
        ]
    }, [current, successPluginNames, pluginNames, isPrivate])
    return (
        <div className={styles["plugin-local-upload"]}>
            <YakitSteps current={current}>
                {steps.map((item) => (
                    <YakitSteps.YakitStep key={item.title} title={item.title} />
                ))}
            </YakitSteps>
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
    const {isUploadAll, isPrivate, show, pluginNames, onSave, onCancel, footerClassName} = props
    const taskTokenRef = useRef(randomString(40))
    const [percent, setPercent] = useState<number>(0)
    const [messageList, setMessageList] = useState<MessageListProps[]>([])
    const [isHaveError, setIsHaveError] = useState<boolean>(false)
    const [isShowRetry, setIsShowRetry] = useState<boolean>(false)

    useEffect(() => {
        const taskToken = taskTokenRef.current
        if (!taskToken) {
            return
        }
        ipcRenderer.on(`${taskToken}-data`, onProgressData)
        ipcRenderer.on(`${taskToken}-end`, () => {})
        ipcRenderer.on(`${taskToken}-error`, (_, e) => {
            setIsShowRetry(true)
            yakitNotify("error", "批量上传异常，请重试")
        })
        return () => {
            ipcRenderer.invoke("cancel-SaveYakScriptToOnline", taskToken)
            ipcRenderer.removeAllListeners(`${taskToken}-data`)
            ipcRenderer.removeAllListeners(`${taskToken}-error`)
            ipcRenderer.removeAllListeners(`${taskToken}-end`)
        }
    }, [])
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
    const onProgressData = useMemoizedFn((_, data: SaveYakScriptToOnlineResponse) => {
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
                yakitNotify("success", "上传完毕,全部成功")
                setTimeout(() => {
                    onSave()
                }, 200)
            }
        }
    })
    const startUpload = useMemoizedFn(() => {
        const params: SaveYakScriptToOnlineRequest = {
            ScriptNames: pluginNames,
            IsPrivate: isPrivate,
            All: isUploadAll
        }
        ipcRenderer
            .invoke("SaveYakScriptToOnline", params, taskTokenRef.current)
            .then(() => {})
            .catch((e) => {
                failed(`开始检测失败:${e}`)
            })
    })
    const onClickNext = useMemoizedFn(() => {
        onSave()
    })
    const onClickCancel = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-SaveYakScriptToOnline", taskTokenRef.current)
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

interface PluginLocalUploadSingleProps {
    onClose: () => void
    plugin: YakScript
}
export const PluginLocalUploadSingle: React.FC<PluginLocalUploadSingleProps> = React.memo((props) => {
    const {plugin, onClose} = props
    const [current, setCurrent] = useState<number>(0)
    const [isPrivate, setIsPrivate] = useState<boolean>(true)

    const taskTokenRef = useRef(randomString(40))

    const onPrivateSelectionPrev = useMemoizedFn((v) => {
        setCurrent(current + 1)
        setIsPrivate(v)
    })
    useEffect(() => {
        const taskToken = taskTokenRef.current
        if (!taskToken) {
            return
        }
        ipcRenderer.on(`${taskToken}-data`, () => {})
        ipcRenderer.on(`${taskToken}-end`, () => {
            yakitNotify("success", "上传成功")
            onClose()
        })
        ipcRenderer.on(`${taskToken}-error`, (_, e) => {
            yakitNotify("error", "上传异常:" + e)
        })
        return () => {
            ipcRenderer.invoke("cancel-SaveYakScriptToOnline", taskToken)
            ipcRenderer.removeAllListeners(`${taskToken}-data`)
            ipcRenderer.removeAllListeners(`${taskToken}-error`)
            ipcRenderer.removeAllListeners(`${taskToken}-end`)
        }
    }, [])
    /**检测后上传 */
    const onAutoTestAfter = useMemoizedFn(() => {
        const params: SaveYakScriptToOnlineRequest = {
            ScriptNames: [plugin.ScriptName],
            IsPrivate: isPrivate,
            All: false
        }
        ipcRenderer
            .invoke("SaveYakScriptToOnline", params, taskTokenRef.current)
            .then(() => {})
            .catch((e) => {
                failed(`开始检测失败:${e}`)
            })
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
                    <PluginAutoTestSingle
                        show={current === 1}
                        plugin={plugin}
                        onNext={onAutoTestAfter}
                        onCancel={onClose}
                    />
                )
            }
        ]
    }, [current, plugin, isPrivate])
    return (
        <div className={styles["plugin-local-upload"]}>
            <YakitSteps current={current}>
                {steps.map((item) => (
                    <YakitSteps.YakitStep key={item.title} title={item.title} />
                ))}
            </YakitSteps>
            <div className={styles["plugin-local-upload-steps-content"]}>{steps[current]?.content}</div>
        </div>
    )
})

interface PluginAutoTestSingleProps {
    show: boolean
    plugin: YakScript
    /**下一步 */
    onNext: (b: boolean) => void
    onCancel: () => void
}
const PluginAutoTestSingle: React.FC<PluginAutoTestSingleProps> = React.memo((props) => {
    const {onCancel} = props
    const onClickCancel = useMemoizedFn((e) => {
        e.stopPropagation()
        onCancel()
    })
    return (
        <div>
            <YakitButton onClick={onClickCancel}>取消</YakitButton>
        </div>
    )
})
