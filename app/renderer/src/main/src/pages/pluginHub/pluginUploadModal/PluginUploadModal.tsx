import React, {memo, ReactNode, useEffect, useMemo, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {CodeScoreModule} from "@/pages/plugins/funcTemplate"
import {Radio, Upload} from "antd"
import {YakitPluginOnlineDetail} from "@/pages/plugins/online/PluginsOnlineType"
import {apiFetchOnlinePluginInfo} from "@/pages/plugins/utils"
import {YakScript} from "@/pages/invoker/schema"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import YakitSteps from "@/pages/plugins/local/YakitSteps/YakitSteps"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {API} from "@/services/swagger/resposeType"
import {httpUploadPluginToOnline} from "../utils/http"
import {grpcDownloadOnlinePlugin} from "../utils/grpc"
import {failed, yakitNotify} from "@/utils/notification"
import emiter from "@/utils/eventBus/eventBus"
import {pluginConvertLocalToOnline, pluginSupplementConvertToJSON} from "@/pages/pluginEditor/utils/convert"
import {FileItem} from "fs"
import {PluginImageTextarea} from "@/pages/pluginEditor/pluginImageTextarea/PluginImageTextarea"
import {PluginImageTextareaRefProps} from "@/pages/pluginEditor/pluginImageTextarea/PluginImageTextareaType"
import {httpDeleteOSSResource, httpUploadFile} from "@/apiUtils/http"
import {OutlineLoadingIcon, OutlineTrashIcon} from "@/assets/icon/outline"

import classNames from "classnames"
import "../../plugins/plugins.scss"
import styles from "./PluginUploadModal.module.scss"

interface PluginUploadModalProps {
    visible: boolean
    isLogin?: boolean
    info?: YakScript
    callback: (result: boolean, plugin?: YakScript, onlinePlugin?: API.PostPluginsResponse) => void
}
/** @name 单个本地插件-上传弹框 */
export const PluginUploadModal: React.FC<PluginUploadModalProps> = memo((props) => {
    const {visible, info, isLogin, callback} = props

    const [loading, setloading] = useState<boolean>(false)
    const localPlugin = useRef<YakScript>()
    const [onlinePlugin, setOnlinePlugin] = useState<YakitPluginOnlineDetail>()
    const [mode, setMode] = useState<"upload" | "submit" | "">("")

    const errorInfo = useRef<string>("")
    const [isError, setIsError] = useState<boolean>(false)

    // 获取插件的操作状态
    const handleInfo = useMemoizedFn(() => {
        if (!info) {
            errorInfo.current = "未获取到插件信息，请关闭重试"
            setIsError(true)
            return
        }
        if (!!info.IsCorePlugin) {
            errorInfo.current = "内置插件不支持上传"
            setIsError(true)
            return
        }

        setloading(true)
        localPlugin.current = info
        const uuid = info.UUID
        if (uuid) {
            apiFetchOnlinePluginInfo({uuid: uuid}, true)
                .then((res) => {
                    setOnlinePlugin(res)
                    setMode("submit")
                })
                .catch(() => {
                    setMode("upload")
                })
                .finally(() => {
                    setTimeout(() => {
                        setloading(false)
                    }, 200)
                })
        } else {
            setMode("upload")
            setTimeout(() => {
                setloading(false)
            }, 200)
        }
    })
    useEffect(() => {
        if (visible) handleInfo()
        return () => {
            handleReset()
        }
    }, [visible])
    // 重置
    const handleReset = useMemoizedFn(() => {
        setloading(false)
        localPlugin.current = undefined
        setOnlinePlugin(undefined)
        setMode("")
        errorInfo.current = ""
        setIsError(false)
        setCurrent(0)
        setIsPrivate(true)
        setPluginLoading(false)
    })

    const [pluginLoading, setPluginLoading] = useState<boolean>(false)
    const handleUpload = useMemoizedFn((request: API.PluginsEditRequest) => {
        if (!request) {
            setPluginLoading(false)
            return
        }
        if (!isLogin) {
            setMode("")
            errorInfo.current = "未登录，请登录后重试"
            setIsError(true)
            setPluginLoading(false)
            return
        }

        httpUploadPluginToOnline({...request})
            .then((onlineRes) => {
                // 上传新建
                if (mode === "upload") {
                    // 刷新我的列表
                    emiter.emit("onRefreshOwnPluginList")
                    let plugin: YakScript | undefined = undefined
                    // 下载插件
                    grpcDownloadOnlinePlugin({uuid: onlineRes.uuid})
                        .then((localRes) => {
                            plugin = localRes
                            yakitNotify("success", "插件同步至云端成功, 并已下载至本地")
                        })
                        .catch(() => {})
                        .finally(() => {
                            callback(true, plugin)
                        })
                }
                // 上传修改
                if (mode === "submit") {
                    const {isUpdate} = onlineRes
                    // 编辑线上插件不存在，操作转为新建线上插件
                    if (!isUpdate) {
                        let plugin: YakScript | undefined = undefined
                        // 下载插件
                        grpcDownloadOnlinePlugin({uuid: onlineRes.uuid})
                            .then((localRes) => {
                                plugin = localRes
                                // 刷新我的列表
                                emiter.emit("onRefreshOwnPluginList")
                            })
                            .catch(() => {})
                            .finally(() => {
                                callback(true, plugin)
                            })
                    } else {
                        // 编辑插件操作
                        if (onlineRes.isAuthor) {
                            // 自己插件刷新我的插件列表
                            emiter.emit("onRefreshOwnPluginList")
                        }
                        callback(true, undefined, onlineRes)
                    }
                }
            })
            .catch((err) => {
                callback(false)
            })
    })

    const [current, setCurrent] = useState<number>(0)

    const [isPrivate, setIsPrivate] = useState<boolean>(true)
    const handlePrivateChange = useMemoizedFn((result: boolean) => {
        setIsPrivate(result)
        setCurrent((val) => val + 1)
    })
    // 私密上传
    const handlePrivateUpload = useMemoizedFn(() => {
        if (!localPlugin.current) {
            yakitNotify("error", "未获取到插件信息，请关闭重试")
            return
        }
        const info = pluginConvertLocalToOnline(localPlugin.current)
        setPluginLoading(true)
        handleUpload({...info, is_private: true})
    })

    // 公开检测结果
    const handlePublicUpload = useMemoizedFn((result: boolean) => {
        if (result) {
            setCurrent((val) => val + 1)
        } else {
            handleCancel()
        }
    })

    // 补充资料提交
    const handleUploadSupplement = useMemoizedFn((data: string) => {
        if (pluginLoading) return
        if (!localPlugin.current) {
            yakitNotify("error", "未获取到插件信息，请关闭重试")
            return
        }
        const info = pluginConvertLocalToOnline(localPlugin.current)
        setPluginLoading(true)
        handleUpload({...info, is_private: false}) //pluginSupplement: data || undefined})
    })

    // 私密提交
    const handlePrivateSubmit = useMemoizedFn(() => {
        setCurrent((val) => val + 1)
    })
    // 公开提交
    const handlePublicSubmit = useMemoizedFn((result: boolean) => {
        if (result) {
            setTimeout(() => {
                setCurrent((val) => val + 1)
            }, 300)
        } else {
            handleCancel()
        }
    })
    // 提交修改意见
    const handleModifyReason = useMemoizedFn((reason: string) => {
        if (pluginLoading) return
        if (!localPlugin.current) {
            yakitNotify("error", "未获取到插件信息，请关闭重试")
            return
        }
        if (!onlinePlugin) {
            yakitNotify("error", "未获取到插件UUID，请关闭重试")
            return
        }
        setPluginLoading(true)
        const info = pluginConvertLocalToOnline(localPlugin.current)
        handleUpload({...info, uuid: onlinePlugin.uuid, logDescription: reason})
    })

    // 关闭 modal
    const handleCancel = useMemoizedFn(() => {
        callback(false)
    })

    // 上传过程
    const uploadSteps = useMemo(() => {
        return [
            {
                title: "公开/私密",
                content: <PluginUploadSelectPrivate callback={handlePrivateChange} />
            },
            {
                title: "自动检测",
                content: isPrivate ? (
                    <PluginUploadPrivateScoreTip
                        tip='私密插件不进行源码自动检测，开始上传插件'
                        content={
                            <YakitSpin
                                spinning={true}
                                tip='上传中...'
                                wrapperClassName={styles["upload-modal-private-upload-spin"]}
                            />
                        }
                        callback={handlePrivateUpload}
                    />
                ) : localPlugin.current ? (
                    <PluginUploadScore plugin={localPlugin.current} callback={handlePublicUpload} />
                ) : null
            },
            {
                title: "上传", //补充资料",
                content: (
                    <PluginUploadSupplement nextName='上传' loading={pluginLoading} callback={handleUploadSupplement} />
                )
            }
        ]
    }, [current, isPrivate, pluginLoading])
    // 提交过程
    const submitSteps = useMemo(() => {
        return [
            {
                title: "自动检测",
                content: onlinePlugin?.is_private ? (
                    <PluginUploadPrivateScoreTip
                        tip='私密插件不进行源码自动检测，自动进行下一步'
                        content={
                            <YakitSpin
                                spinning={true}
                                tip='跳转中...'
                                wrapperClassName={styles["upload-modal-private-upload-spin"]}
                            />
                        }
                        callback={handlePrivateSubmit}
                    />
                ) : localPlugin.current ? (
                    <PluginUploadScore isSubmit={true} plugin={localPlugin.current} callback={handlePublicSubmit} />
                ) : null
            },
            {
                title: "修改描述",
                content: <PluginUploadModifyReason loading={pluginLoading} callback={handleModifyReason} />
            }
        ]
    }, [onlinePlugin, current, isPrivate, pluginLoading])

    return (
        <YakitModal
            bodyStyle={{padding: 0}}
            type='white'
            title='上传插件'
            centered={true}
            footer={null}
            maskClosable={false}
            visible={visible}
            onCancel={handleCancel}
        >
            <div
                className={styles["plugin-upload-modal"]}
                onClick={(e) => {
                    e.stopPropagation()
                }}
            >
                {loading && (
                    <YakitSpin wrapperClassName={styles["spin-loading"]} spinning={loading} tip='获取插件信息中...' />
                )}
                {!loading && isError && <YakitEmpty title={errorInfo.current || "意外错误，请关闭重试"} />}
                {!loading && !!mode && (
                    <>
                        <YakitSteps current={current}>
                            {(mode === "upload" ? uploadSteps : submitSteps).map((item) => (
                                <YakitSteps.YakitStep key={item.title} title={item.title} />
                            ))}
                        </YakitSteps>

                        <div className={styles["plugin-upload-steps-content"]}>
                            {(mode === "upload" ? uploadSteps : submitSteps)[current]?.content}
                        </div>
                    </>
                )}
            </div>
        </YakitModal>
    )
})

interface PluginUploadSelectPrivateProps {
    callback: (isPrivate: boolean) => void
}
/** @name 上传弹框-公开/私密 */
const PluginUploadSelectPrivate: React.FC<PluginUploadSelectPrivateProps> = memo((props) => {
    const {callback} = props

    const [isPrivate, setIsPrivate] = useState<boolean>(true)
    const handleNext = useMemoizedFn(() => {
        callback(isPrivate)
    })

    return (
        <>
            <div className={styles["plugin-upload-tips-header"]}>
                <div className={styles["header-title"]}>提示：</div>
                <div className={styles["header-body"]}>
                    <div className={styles["list-opt"]}>
                        <div className={styles["opt-order"]}>1</div>
                        选择私密将不会进行自动检测
                        {/* 和补充资料填写 */}
                    </div>
                </div>
            </div>
            <div className={styles["upload-modal-select-private"]}>
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
            <div className={styles["upload-modal-next-btn"]}>
                <YakitButton onClick={handleNext}>下一步</YakitButton>
            </div>
        </>
    )
})

interface PluginUploadScoreProps {
    isSubmit?: boolean
    plugin: YakScript
    callback: (isSuccess: boolean) => void
}
/** @name 上传弹框-插件评分 */
const PluginUploadScore: React.FC<PluginUploadScoreProps> = memo((props) => {
    const {isSubmit, plugin, callback} = props

    const handleScore = useMemoizedFn((isSuccess: boolean) => {
        if (isSuccess) callback(isSuccess)
    })
    const handleClose = useMemoizedFn(() => {
        callback(false)
    })

    return (
        <>
            <div className={styles["plugin-upload-tips-header"]}>
                <div className={styles["header-title"]}>检测项包含：</div>
                <div className={styles["header-body"]}>
                    <div className={styles["list-opt"]}>
                        <div className={styles["opt-order"]}>1</div>
                        基础编译测试，判断语法是否符合规范，是否存在不正确语法；
                    </div>
                    <div className={styles["list-opt"]}>
                        <div className={styles["opt-order"]}>2</div>
                        把基础防误报服务器作为测试基准，防止条件过于宽松导致的误报；
                    </div>
                    <div className={styles["list-opt"]}>
                        <div className={styles["opt-order"]}>3</div>
                        检查插件执行过程是否会发生崩溃。
                    </div>
                </div>
            </div>
            <CodeScoreModule
                hiddenScoreHint={true}
                type={plugin.Type}
                code={plugin.Content}
                isStart={true}
                successHint={isSubmit ? "（表现良好，开始进行下一步...）" : undefined}
                callback={handleScore}
                specialExtraBtn={
                    <YakitButton type='outline2' onClick={handleClose}>
                        关闭
                    </YakitButton>
                }
            />
        </>
    )
})

interface PluginUploadPrivateScoreTipProps {
    tip: string
    content: ReactNode
    callback: () => void
}
/** @name 上传弹框-私密插件不评分并提示 */
const PluginUploadPrivateScoreTip: React.FC<PluginUploadPrivateScoreTipProps> = memo((props) => {
    const {tip, content, callback} = props

    useEffect(() => {
        callback()
    }, [])

    return (
        <>
            <div className={styles["plugin-upload-tips-header"]}>
                <div className={styles["header-title"]}>提示：</div>
                <div className={styles["header-body"]}>
                    <div className={styles["list-opt"]}>
                        <div className={styles["opt-order"]}>1</div>
                        {tip}
                    </div>
                </div>
            </div>
            <div className={styles["upload-modal-private-upload"]}>{content}</div>
        </>
    )
})

interface PluginUploadModifyReasonProps {
    loading?: boolean
    callback: (content: string) => void
}
/** @name 上传弹框-提交修改意见 */
const PluginUploadModifyReason: React.FC<PluginUploadModifyReasonProps> = memo((props) => {
    const {loading, callback} = props

    const [content, setContent] = useState<string>("")
    const handleSubmit = useMemoizedFn(() => {
        if (!content) {
            yakitNotify("error", "请填写修改意见")
            return
        }
        callback(content)
    })

    return (
        <>
            <div className={styles["plugin-upload-tips-header"]}>
                <div className={styles["header-title"]}>提示：</div>
                <div className={styles["header-body"]}>
                    <div className={styles["list-opt"]}>
                        <div className={styles["opt-order"]}>1</div>
                        修改插件需要填写修改内容，方便作者审核
                    </div>
                </div>
            </div>
            <div className={styles["upload-modal-modify-reason"]}>
                <YakitInput.TextArea
                    placeholder='请简单描述一下修改内容，方便作者审核...'
                    autoSize={{minRows: 3, maxRows: 3}}
                    showCount
                    value={content}
                    maxLength={150}
                    onChange={(e) => setContent(e.target.value)}
                />
            </div>
            <div className={styles["upload-modal-next-btn"]}>
                <YakitButton loading={loading} onClick={handleSubmit}>
                    提交
                </YakitButton>
            </div>
        </>
    )
})

interface PluginUploadSupplementProps {
    nextName?: string
    loading?: boolean
    callback: (value: string) => void
}
/** @name 上传弹框-补充资料 */
export const PluginUploadSupplement: React.FC<PluginUploadSupplementProps> = memo((props) => {
    const {nextName = "提交", loading, callback} = props

    const textareaRef = useRef<PluginImageTextareaRefProps>(null)
    const handleSubmit = useMemoizedFn(() => {
        callback("")
        // if (uploadLoading) {
        //     failed("文件上传中，请稍后")
        //     return
        // }

        // if (!textareaRef.current) {
        //     failed("该弹框异常，请关闭后重试")
        //     return
        // }

        // const info = textareaRef.current.getData()
        // if (!info) return

        // const jsonStr = pluginSupplementConvertToJSON(info, {url: fileUrl.current, name: fileName})
        // callback(jsonStr)
    })

    const [uploadLoading, setUploadLoading] = useState<boolean>(false)
    const [fileName, setFileName] = useState<string>("")
    const fileUrl = useRef<string>("")
    const uploadFile = useMemoizedFn((file: FileItem) => {
        if (uploadLoading) return
        if (file.size > 5 * 1024 * 1024) {
            failed("压缩包大小不能超过5MB")
            return
        }

        let uploadUrl: string = "" // 有值代表上传成功
        setUploadLoading(true)
        httpUploadFile({path: file.path, name: file.name})
            .then((res) => {
                uploadUrl = res
            })
            .finally(() => {
                setTimeout(() => {
                    if (uploadUrl) {
                        fileUrl.current && deleteFile(fileUrl.current)
                        fileUrl.current = uploadUrl
                        setFileName(file.name)
                    }
                    setUploadLoading(false)
                }, 300)
            })
    })

    const [delArr, setDelArr] = useState<string[]>([])
    const deleteFile = useMemoizedFn((url?: string) => {
        let isReplace: boolean = !!url // 删除还是替换
        const delUrl = url || fileUrl.current

        if (!delUrl) return
        const isExist = delArr.includes(delUrl)
        if (isExist) return

        const [name, path] = delUrl.split("/").reverse()
        if (!name || !path) {
            failed(`删除文件出现异常，异常值: ${url}`)
            return
        }
        setDelArr((arr) => arr.concat([delUrl]))

        let isSuccess: boolean = false
        httpDeleteOSSResource({
            file_name: [`${path}/${name}`]
        })
            .then(() => {
                isSuccess = true
            })
            .finally(() => {
                if (!isReplace) {
                    fileUrl.current = ""
                    setFileName("")
                }
                setDelArr((arr) => arr.filter((item) => item !== url))
            })
    })

    return (
        <>
            <div className={styles["plugin-upload-tips-header"]}>
                <div className={styles["header-title"]}>提示：</div>
                <div className={styles["header-body"]}>
                    <div className={classNames(styles["list-opt"], styles["upload-modal-supplement-tip-order"])}>
                        <div className={styles["opt-order"]}>1</div>
                        <div className={styles["upload-modal-supplement-tip-content"]}>
                            点击上传即可上传插件
                            {/* 如插件为<span className={styles["strong-text"]}>漏洞检测插件</span>，请
                            <span className={styles["strong-text"]}>补充测试站</span>
                            地址，或者复现流程，并粘贴<span className={styles["strong-text"]}>复现截图</span>
                            ，该内容只有审核可见。如<span className={styles["strong-text"]}>不是漏洞检测插件</span>
                            ，直接
                            <span className={styles["strong-text"]}>点击下一步</span>上传即可 */}
                        </div>
                    </div>
                </div>
            </div>
            {/* <div className={styles["upload-modal-supplement-item"]}>
                <div className={styles["item-header"]}>说明/截图</div>
                <div className={styles["item-body"]}>
                    <PluginImageTextarea ref={textareaRef} type='supplement' />
                </div>
            </div> */}
            {/* <div className={styles["upload-modal-supplement-item"]}>
                <div className={styles["item-header"]}>附件</div>
                <div className={styles["item-body"]}>
                    <div className={styles["upload-supplement-file"]}>
                        <Upload
                            accept='application/zip,.rar'
                            disabled={uploadLoading}
                            multiple={false}
                            showUploadList={false}
                            beforeUpload={(file: any) => {
                                uploadFile(file)
                                return false
                            }}
                        >
                            <span className={styles["upload-coantent"]}>点击上传压缩包附件</span>
                        </Upload>
                        <span>注: 上传压缩包，提供复现流程或截图</span>
                    </div>

                    <div className={styles["upload-supplement-url"]}>
                        {uploadLoading ? (
                            <>
                                <OutlineLoadingIcon
                                    className={classNames(styles["icon-style"], "icon-rotate-animation")}
                                />
                                <span className={styles["loading-text-style"]}>文件上传中...</span>
                            </>
                        ) : (
                            fileName && (
                                <>
                                    <div className='content-ellipsis' title={fileName}>
                                        {fileName}
                                    </div>
                                    <YakitButton
                                        size='small'
                                        type='text'
                                        loading={delArr.includes(fileUrl.current)}
                                        icon={<OutlineTrashIcon />}
                                        onClick={() => {
                                            deleteFile()
                                        }}
                                    />
                                </>
                            )
                        )}
                    </div>
                </div>
            </div> */}
            <div style={{paddingTop: 24}} className={styles["upload-modal-next-btn"]}>
                <YakitButton loading={!!loading} onClick={handleSubmit}>
                    {nextName}
                </YakitButton>
            </div>
        </>
    )
})
