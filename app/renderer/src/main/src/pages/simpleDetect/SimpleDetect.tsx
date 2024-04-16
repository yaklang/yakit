import React, {useEffect, useRef, useState} from "react"
import {SimpleDetectFormContentProps, SimpleDetectProps} from "./SimpleDetectType"
import {Button, Form, Popconfirm, Progress, Slider} from "antd"
import {ExpandAndRetract, ExpandAndRetractExcessiveState} from "../plugins/operator/expandAndRetract/ExpandAndRetract"
import {useCreation, useGetState, useInViewport, useMemoizedFn} from "ahooks"
import {randomString} from "@/utils/randomUtil"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {failed, success, warn, yakitNotify} from "@/utils/notification"
import {RecordPortScanRequest, apiCancelSimpleDetect, apiSimpleDetect} from "../securityTool/newPortScan/utils"
import styles from "./SimpleDetect.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import classNames from "classnames"
import {PluginExecuteResult} from "../plugins/operator/pluginExecuteResult/PluginExecuteResult"
import {PortScanExecuteExtraFormValue} from "../securityTool/newPortScan/NewPortScanType"
import {defPortScanExecuteExtraFormValue} from "../securityTool/newPortScan/NewPortScan"
import cloneDeep from "lodash/cloneDeep"
import {YakitFormDraggerContent} from "@/components/yakitUI/YakitForm/YakitForm"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {useStore} from "@/store"
import {DownloadOnlinePluginsRequest} from "../plugins/utils"
import {DownloadOnlinePluginAllResProps} from "../yakitStore/YakitStorePage"
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitRoute, YakitRouteToPageInfo} from "@/routes/newRoute"
import emiter from "@/utils/eventBus/eventBus"
import {SliderMarks} from "antd/lib/slider"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"

const SimpleDetectExtraParamsDrawer = React.lazy(() => import("./SimpleDetectExtraParamsDrawer"))

const {ipcRenderer} = window.require("electron")

export const SimpleDetect: React.FC<SimpleDetectProps> = React.memo((props) => {
    const {pageId} = props
    const {queryPagesDataById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById
        }),
        shallow
    )
    const initSpaceEnginePageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.Space_Engine, pageId)
        if (currentItem && currentItem.pageName) {
            return currentItem.pageName
        }
        return YakitRouteToPageInfo[YakitRoute.Space_Engine].label
    })
    const [form] = Form.useForm()
    const [tabName, setTabName] = useState<string>(initSpaceEnginePageInfo())
    /**是否展开/收起 */
    const [isExpand, setIsExpand] = useState<boolean>(true)
    /**是否在执行中 */
    const [isExecuting, setIsExecuting] = useState<boolean>(false)
    const [executeStatus, setExecuteStatus] = useState<ExpandAndRetractExcessiveState>("default")

    /**额外参数弹出框 */
    const [extraParamsVisible, setExtraParamsVisible] = useState<boolean>(false)
    const [extraParamsValue, setExtraParamsValue] = useState<PortScanExecuteExtraFormValue>(
        cloneDeep(defPortScanExecuteExtraFormValue)
    )

    const [runtimeId, setRuntimeId] = useState<string>("")

    const simpleDetectWrapperRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(simpleDetectWrapperRef)
    const tokenRef = useRef<string>(randomString(40))

    const defaultTabs = useCreation(() => {
        return [
            {tabName: "扫描端口列表", type: "port"},
            {tabName: "日志", type: "log"}
        ]
    }, [])

    const [streamInfo, simpleDetectStreamEvent] = useHoldGRPCStream({
        tabs: defaultTabs,
        taskName: "SimpleDetect",
        apiKey: "SimpleDetect",
        token: tokenRef.current,
        onEnd: () => {
            simpleDetectStreamEvent.stop()
            setTimeout(() => {
                setExecuteStatus("finished")
                setIsExecuting(false)
            }, 300)
        },
        setRuntimeId: (rId) => {
            yakitNotify("info", `调试任务启动成功，运行时 ID: ${rId}`)
            setRuntimeId(rId)
        }
    })

    useEffect(() => {
        if (inViewport) emiter.on("secondMenuTabDataChange", onSetTabName)
        return () => {
            emiter.off("secondMenuTabDataChange", onSetTabName)
        }
    }, [inViewport])
    const onSetTabName = useMemoizedFn(() => {
        setTabName(initSpaceEnginePageInfo())
    })

    const onExpand = useMemoizedFn(() => {
        setIsExpand(!isExpand)
    })
    const onStartExecute = useMemoizedFn((value) => {
        simpleDetectStreamEvent.reset()
        setExecuteStatus("process")
        setRuntimeId("")
        const params: RecordPortScanRequest = {
            ...value
        }
        apiSimpleDetect(params, tokenRef.current).then(() => {
            setIsExecuting(true)
            setIsExpand(false)
            simpleDetectStreamEvent.start()
        })
    })
    const onStopExecute = useMemoizedFn((e) => {
        e.stopPropagation()
        apiCancelSimpleDetect(tokenRef.current).then(() => {
            simpleDetectStreamEvent.stop()
            setIsExecuting(false)
        })
    })
    /**在顶部的执行按钮 */
    const onExecuteInTop = useMemoizedFn((e) => {
        e.stopPropagation()
        form.validateFields()
            .then(onStartExecute)
            .catch(() => {
                setIsExpand(true)
            })
    })
    const openExtraPropsDrawer = useMemoizedFn(() => {
        setExtraParamsValue({
            ...extraParamsValue,
            SkippedHostAliveScan: form.getFieldValue("SkippedHostAliveScan")
        })
        setExtraParamsVisible(true)
    })
    /**保存额外参数 */
    const onSaveExtraParams = useMemoizedFn((v: PortScanExecuteExtraFormValue) => {
        setExtraParamsValue({...v} as PortScanExecuteExtraFormValue)
        setExtraParamsVisible(false)
        form.setFieldsValue({
            SkippedHostAliveScan: v.SkippedHostAliveScan
        })
    })
    const isShowResult = useCreation(() => {
        return isExecuting || runtimeId
    }, [isExecuting, runtimeId])
    return (
        <>
            <div className={styles["simple-detect-wrapper"]} ref={simpleDetectWrapperRef}>
                <ExpandAndRetract
                    className={styles["simple-detect-heard"]}
                    onExpand={onExpand}
                    isExpand={isExpand}
                    status={executeStatus}
                >
                    <span className={styles["simple-detect-heard-tabName"]}>{tabName}</span>
                    <div>
                        {isExecuting
                            ? !isExpand && (
                                  <>
                                      <YakitButton danger onClick={onStopExecute}>
                                          停止
                                      </YakitButton>
                                  </>
                              )
                            : !isExpand && (
                                  <>
                                      <YakitButton onClick={onExecuteInTop}>执行</YakitButton>
                                      <div className={styles["divider-style"]}></div>
                                  </>
                              )}
                    </div>
                </ExpandAndRetract>
                <div className={styles["simple-detect-content"]}>
                    <div
                        className={classNames(styles["simple-detect-form-wrapper"], {
                            [styles["simple-detect-form-wrapper-hidden"]]: !isExpand
                        })}
                    >
                        <Form
                            form={form}
                            onFinish={onStartExecute}
                            labelCol={{span: 6}}
                            wrapperCol={{span: 12}} //这样设置是为了让输入框居中
                            validateMessages={{
                                /* eslint-disable no-template-curly-in-string */
                                required: "${label} 是必填字段"
                            }}
                            labelWrap={true}
                        >
                            <SimpleDetectFormContent disabled={isExecuting} inViewport={inViewport} form={form} />
                            <Form.Item colon={false} label={" "} style={{marginBottom: 0}}>
                                <div className={styles["simple-detect-form-operate"]}>
                                    {isExecuting ? (
                                        <YakitButton danger onClick={onStopExecute} size='large'>
                                            停止
                                        </YakitButton>
                                    ) : (
                                        <YakitButton
                                            className={styles["simple-detect-form-operate-start"]}
                                            htmlType='submit'
                                            size='large'
                                        >
                                            开始执行
                                        </YakitButton>
                                    )}
                                    <YakitButton
                                        type='text'
                                        onClick={openExtraPropsDrawer}
                                        disabled={isExecuting}
                                        size='large'
                                    >
                                        额外参数
                                    </YakitButton>
                                </div>
                            </Form.Item>
                        </Form>
                    </div>
                    {isShowResult && (
                        <PluginExecuteResult streamInfo={streamInfo} runtimeId={runtimeId} loading={isExecuting} />
                    )}
                </div>
            </div>
            <React.Suspense fallback={<div>loading...</div>}>
                <SimpleDetectExtraParamsDrawer
                    extraParamsValue={extraParamsValue}
                    visible={extraParamsVisible}
                    onSave={onSaveExtraParams}
                />
            </React.Suspense>
        </>
    )
})

const ScanTypeOptions = [
    {
        value: "基础扫描",
        label: "基础扫描"
    },
    {
        value: "专项扫描",
        label: "专项扫描"
    }
]
const marks: SliderMarks = {
    1: {
        label: <div>慢速</div>
    },
    2: {
        label: <div>适中</div>
    },
    3: {
        label: <div>快速</div>
    }
}
const SimpleDetectFormContent: React.FC<SimpleDetectFormContentProps> = React.memo((props) => {
    const {disabled, inViewport, form} = props
    const scanType = Form.useWatch("scanType", form)
    const scanTypeExtra = useCreation(() => {
        let str: string = ""
        switch (scanType) {
            case "基础扫描":
                str = "包含合规检测、小字典弱口令检测与部分漏洞检测"
                break
            case "专项扫描":
                str = "针对不同场景的专项漏洞检测扫描"
                break
        }
        return str
    }, [scanType])
    return (
        <>
            <YakitFormDraggerContent
                formItemProps={{
                    name: "Targets",
                    label: "扫描目标",
                    rules: [{required: true}]
                }}
                accept='.txt,.xlsx,.xls,.csv'
                textareaProps={{
                    placeholder: "域名/主机/IP/IP段均可，逗号分隔或按行分割",
                    rows: 3
                }}
                help='可将TXT、Excel文件拖入框内或'
                disabled={disabled}
            />
            <Form.Item label='扫描模式' name='scanType' initialValue='基础扫描' extra={scanTypeExtra}>
                <YakitRadioButtons buttonStyle='solid' options={ScanTypeOptions} />
            </Form.Item>
            <Form.Item name='scanDeep' label='扫描速度' extra='扫描速度越慢，扫描结果就越详细，可根据实际情况进行选择'>
                <Slider tipFormatter={null} min={1} max={3} marks={marks} disabled={disabled} />
            </Form.Item>
            <Form.Item label={" "} colon={false}>
                <div className={styles["form-extra"]}>
                    <Form.Item name='SkippedHostAliveScan' valuePropName='checked' noStyle>
                        <YakitCheckbox disabled={disabled}>跳过主机存活检测</YakitCheckbox>
                    </Form.Item>
                </div>
            </Form.Item>
        </>
    )
})

interface DownloadAllPluginProps {
    type?: "modal" | "default"
    setDownloadPlugin?: (v: boolean) => void
    onClose?: () => void
    delAllPlugins?: () => void
}

export const DownloadAllPlugin: React.FC<DownloadAllPluginProps> = (props) => {
    const {setDownloadPlugin, onClose, delAllPlugins} = props
    const type = props.type || "default"
    // 全局登录状态
    const {userInfo} = useStore()
    // 全部添加进度条
    const [addLoading, setAddLoading] = useState<boolean>(false)
    // 全部添加进度
    const [percent, setPercent, getPercent] = useGetState<number>(0)
    const [taskToken, setTaskToken] = useState(randomString(40))
    useEffect(() => {
        if (!taskToken) {
            return
        }
        ipcRenderer.on(`${taskToken}-data`, (_, data: DownloadOnlinePluginAllResProps) => {
            const p = Math.floor(data.Progress * 100)
            setPercent(p)
        })
        ipcRenderer.on(`${taskToken}-end`, () => {
            setTimeout(() => {
                type === "default" && setAddLoading(false)
                setPercent(0)
                setDownloadPlugin && setDownloadPlugin(false)
                onClose && onClose()
            }, 500)
        })
        ipcRenderer.on(`${taskToken}-error`, (_, e) => {})
        return () => {
            ipcRenderer.removeAllListeners(`${taskToken}-data`)
            ipcRenderer.removeAllListeners(`${taskToken}-error`)
            ipcRenderer.removeAllListeners(`${taskToken}-end`)
        }
    }, [taskToken])
    const AddAllPlugin = useMemoizedFn(() => {
        if (!userInfo.isLogin) {
            warn("我的插件需要先登录才能下载，请先登录")
            return
        }
        // 全部添加
        setAddLoading(true)
        setDownloadPlugin && setDownloadPlugin(true)
        const addParams: DownloadOnlinePluginsRequest = {ListType: ""}
        ipcRenderer
            .invoke("DownloadOnlinePlugins", addParams, taskToken)
            .then(() => {})
            .catch((e) => {
                failed(`添加失败:${e}`)
            })
    })
    const StopAllPlugin = () => {
        onClose && onClose()
        setAddLoading(false)
        ipcRenderer.invoke("cancel-DownloadOnlinePlugins", taskToken).catch((e) => {
            failed(`停止添加失败:${e}`)
        })
    }
    const onRemoveAllLocalPlugin = () => {
        // 全部删除
        ipcRenderer
            .invoke("DeleteLocalPluginsByWhere", {})
            .then(() => {
                delAllPlugins && delAllPlugins()
                success("全部删除成功")
            })
            .catch((e) => {
                failed(`删除所有本地插件错误:${e}`)
            })
    }
    if (type === "modal") {
        return (
            <div className={styles["download-all-plugin-modal"]}>
                {addLoading ? (
                    <div>
                        <div>下载进度</div>
                        <div className={styles["filter-opt-progress-modal"]}>
                            <Progress
                                size='small'
                                status={!addLoading && percent !== 0 ? "exception" : undefined}
                                percent={percent}
                            />
                        </div>
                        <div style={{textAlign: "center", marginTop: 10}}>
                            <Button type='primary' onClick={StopAllPlugin}>
                                取消
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div>检测到本地未下载任何插件，无法进行安全检测，请点击“一键导入”进行插件下载</div>
                        <div style={{textAlign: "center", marginTop: 10}}>
                            <Button type='primary' onClick={AddAllPlugin}>
                                一键导入
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        )
    }
    return (
        <div className={styles["download-all-plugin"]}>
            {addLoading && (
                <div className={styles["filter-opt-progress"]}>
                    <Progress
                        size='small'
                        status={!addLoading && percent !== 0 ? "exception" : undefined}
                        percent={percent}
                    />
                </div>
            )}
            {addLoading ? (
                <Button style={{marginLeft: 12}} size='small' type='primary' danger onClick={StopAllPlugin}>
                    停止
                </Button>
            ) : (
                <Popconfirm
                    title={"确定将插件商店所有数据导入到本地吗?"}
                    onConfirm={AddAllPlugin}
                    okText='Yes'
                    cancelText='No'
                    placement={"left"}
                >
                    <div className={styles["operation-text"]}>一键导入插件</div>
                </Popconfirm>
            )}
            {userInfo.role !== "admin" && (
                <Popconfirm
                    title={"确定将插件商店所有本地数据清除吗?"}
                    onConfirm={onRemoveAllLocalPlugin}
                    okText='Yes'
                    cancelText='No'
                    placement={"left"}
                >
                    <YakitButton type='text' colors='danger' className={styles["clean-local-plugin"]}>
                        一键清除插件
                    </YakitButton>
                </Popconfirm>
            )}
        </div>
    )
}
