import React, {useEffect, useRef, useState} from "react"
import {
    NewPortScanExecuteProps,
    NewPortScanExecuteContentProps,
    NewPortScanExecuteFormProps,
    NewPortScanProps,
    PortScanExecuteExtraFormValue
} from "./newPortScanType"
import styles from "./newPortScan.module.scss"
import {
    ExpandAndRetract,
    ExpandAndRetractExcessiveState
} from "@/pages/plugins/operator/expandAndRetract/ExpandAndRetract"
import {useControllableValue, useCreation, useMemoizedFn} from "ahooks"
import {YakScript} from "@/pages/invoker/schema"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {PluginExecuteProgress} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineArrowscollapseIcon,
    OutlineArrowsexpandIcon,
    OutlineClipboardlistIcon,
    OutlineRefreshIcon,
    OutlineStoreIcon
} from "@/assets/icon/outline"
import classNames from "classnames"
import {Checkbox, Form} from "antd"
import cloneDeep from "lodash/cloneDeep"
import {ScanPortTemplate, defaultPorts} from "@/pages/portscan/PortScanPage"
import {YakitFormDraggerContent} from "@/components/yakitUI/YakitForm/YakitForm"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {SolidStoreIcon} from "@/assets/icon/solid"
import {isEnpriTrace} from "@/utils/envfile"
import {PluginExecuteResult} from "@/pages/plugins/operator/pluginExecuteResult/PluginExecuteResult"
import {randomString} from "@/utils/randomUtil"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"

const NewPortScanExtraParamsDrawer = React.lazy(() => import("./newPortScanExtraParamsDrawer"))

const {ipcRenderer} = window.require("electron")

export const NewPortScan: React.FC<NewPortScanProps> = React.memo((props) => {
    const [selectList, setSelectList] = useState<YakScript[]>([])
    // 隐藏插件列表
    const [hidden, setHidden] = useState<boolean>(false)
    return (
        <div className={styles["new-port-scan-wrapper"]}>
            <NewPortScanExecute
                selectList={selectList}
                setSelectList={setSelectList}
                hidden={hidden}
                setHidden={setHidden}
            />
        </div>
    )
})

const NewPortScanExecute: React.FC<NewPortScanExecuteProps> = React.memo((props) => {
    const {selectList, setSelectList} = props

    const [hidden, setHidden] = useControllableValue<boolean>(props, {
        defaultValue: false,
        valuePropName: "hidden",
        trigger: "setHidden"
    })

    /**是否展开/收起 */
    const [isExpand, setIsExpand] = useState<boolean>(true)
    const [progressList, setProgressList] = useState<StreamResult.Progress[]>([])
    const [executeStatus, setExecuteStatus] = useState<ExpandAndRetractExcessiveState>("default")

    const pluginBatchExecuteContentRef = useRef(null)

    const selectNum = useCreation(() => {
        return selectList.length
    }, [selectList])

    const onExpand = useMemoizedFn((e) => {
        e.stopPropagation()
        setIsExpand(!isExpand)
    })
    const onRemove = useMemoizedFn((e) => {
        e.stopPropagation()
        setSelectList([])
    })
    const isExecuting = useCreation(() => {
        if (executeStatus === "process") return true
        return false
    }, [executeStatus])
    const onStopExecute = useMemoizedFn(() => {
        // pluginBatchExecuteContentRef.current?.onStopExecute()
    })
    const onStartExecute = useMemoizedFn(() => {
        // pluginBatchExecuteContentRef.current?.onStartExecute()
    })

    return (
        <div className={styles["port-scan-execute-wrapper"]}>
            <ExpandAndRetract isExpand={isExpand} onExpand={onExpand} status={executeStatus}>
                <div className={styles["port-scan-executor-title"]}>
                    <span className={styles["port-scan-executor-title-text"]}>端口指纹扫描</span>
                    {selectNum > 0 && (
                        <YakitTag closable onClose={onRemove} color='info'>
                            {selectNum} 个插件扫描中...
                        </YakitTag>
                    )}
                </div>
                <div className={styles["port-scan-executor-btn"]}>
                    {progressList.length === 1 && (
                        <PluginExecuteProgress percent={progressList[0].progress} name={progressList[0].id} />
                    )}
                    {isExecuting
                        ? !isExpand && (
                              <>
                                  <YakitButton danger onClick={onStopExecute}>
                                      停止
                                  </YakitButton>
                                  <div className={styles["divider-style"]}></div>
                              </>
                          )
                        : !isExpand && (
                              <>
                                  <YakitButton onClick={onStartExecute} disabled={selectNum === 0}>
                                      执行
                                  </YakitButton>
                                  <div className={styles["divider-style"]}></div>
                              </>
                          )}
                    {isEnpriTrace() && (
                        <>
                            <YakitButton icon={<OutlineClipboardlistIcon />} disabled={executeStatus === "default"}>
                                生成报告
                            </YakitButton>
                            <div className={styles["divider-style"]}></div>
                        </>
                    )}
                    <YakitButton
                        type='text2'
                        icon={hidden ? <OutlineArrowscollapseIcon /> : <OutlineArrowsexpandIcon />}
                        onClick={(e) => {
                            e.stopPropagation()
                            setHidden(!hidden)
                        }}
                    />
                </div>
            </ExpandAndRetract>
            <div className={styles["port-scan-executor-body"]}>
                <NewPortScanExecuteContent
                    isExpand={isExpand}
                    isExecuting={isExecuting}
                    setExecuteStatus={setExecuteStatus}
                    selectNum={selectNum}
                />
            </div>
        </div>
    )
})

export const defPortScanExecuteExtraFormValue: PortScanExecuteExtraFormValue = {
    // -------start 表单放外面的字段
    Ports: defaultPorts,
    Mode: "fingerprint",
    Concurrent: 50,
    SkippedHostAliveScan: false,
    // -------end 表单放外面的字段

    // Targets: props.sendTarget ? JSON.parse(props.sendTarget || "[]").join(",") : "",
    Targets: "",
    Active: true,
    FingerprintMode: "all",
    Proto: ["tcp"],
    SaveClosedPorts: false,
    SaveToDB: true,
    Proxy: [],
    EnableBrute: false,
    ProbeTimeout: 7,
    ScriptNames: [],
    ProbeMax: 3,
    EnableCClassScan: false,
    HostAlivePorts: "22,80,443",
    EnableBasicCrawler: true,
    BasicCrawlerRequestMax: 5,
    SynConcurrent: 1000,
    HostAliveConcurrent: 20
}

const NewPortScanExecuteContent: React.FC<NewPortScanExecuteContentProps> = React.memo((props) => {
    const {isExpand, isExecuting, setExecuteStatus, selectNum} = props
    const [form] = Form.useForm()

    const [runtimeId, setRuntimeId] = useState<string>("")
    /**额外参数弹出框 */
    const [extraParamsVisible, setExtraParamsVisible] = useState<boolean>(false)
    const [extraParamsValue, setExtraParamsValue] = useState<PortScanExecuteExtraFormValue>(
        cloneDeep(defPortScanExecuteExtraFormValue)
    )

    const [stopLoading, setStopLoading] = useControllableValue<boolean>(props, {
        defaultValue: false,
        valuePropName: "stopLoading",
        trigger: "setStopLoading"
    })

    const tokenRef = useRef<string>(randomString(40))

    const [streamInfo, portScanStreamEvent] = useHoldGRPCStream({
        taskName: "Port-Scan",
        apiKey: "PortScan",
        token: tokenRef.current,
        onEnd: () => {
            portScanStreamEvent.stop()
            setTimeout(() => {
                setExecuteStatus("finished")
                setStopLoading(false)
            }, 200)
        },
        setRuntimeId: (rId) => {
            setRuntimeId(rId)
        }
    })

    /**开始执行 */
    const onStartExecute = useMemoizedFn((value) => {
        console.log("value", value)
    })
    /**取消执行 */
    const onStopExecute = useMemoizedFn((e) => {
        e.stopPropagation()
    })
    const openExtraPropsDrawer = useMemoizedFn(() => {
        setExtraParamsVisible(true)
    })
    /**保存额外参数 */
    const onSaveExtraParams = useMemoizedFn((v: PortScanExecuteExtraFormValue) => {
        setExtraParamsValue({...v} as PortScanExecuteExtraFormValue)
        setExtraParamsVisible(false)
    })
    const isShowResult = useCreation(() => {
        return isExecuting || runtimeId
    }, [isExecuting, runtimeId])
    return (
        <>
            <div
                className={classNames(styles["port-scan-form-wrapper"], {
                    [styles["port-scan-form-wrapper-hidden"]]: !isExpand
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
                    <NewPortScanExecuteForm form={form} disabled={isExecuting} />
                    <Form.Item colon={false} label={" "} style={{marginBottom: 0}}>
                        <div className={styles["plugin-execute-form-operate"]}>
                            {isExecuting ? (
                                <YakitButton danger onClick={onStopExecute} size='large'>
                                    停止
                                </YakitButton>
                            ) : (
                                <YakitButton
                                    className={styles["plugin-execute-form-operate-start"]}
                                    htmlType='submit'
                                    size='large'
                                    disabled={selectNum === 0}
                                >
                                    开始执行
                                </YakitButton>
                            )}
                            <YakitButton type='text' onClick={openExtraPropsDrawer} disabled={isExecuting} size='large'>
                                额外参数
                            </YakitButton>
                        </div>
                    </Form.Item>
                </Form>
            </div>
            {isShowResult && (
                <PluginExecuteResult
                    streamInfo={streamInfo}
                    runtimeId={runtimeId}
                    loading={isExecuting}
                    pluginType={"yak"} // 算yak类型的插件，可以传空字符串
                    defaultActiveKey={""}
                />
            )}
            <React.Suspense fallback={<div>loading...</div>}>
                <NewPortScanExtraParamsDrawer
                    extraParamsValue={extraParamsValue}
                    visible={extraParamsVisible}
                    setVisible={setExtraParamsVisible}
                    onSave={onSaveExtraParams}
                />
            </React.Suspense>
        </>
    )
})

const NewPortScanExecuteForm: React.FC<NewPortScanExecuteFormProps> = React.memo((props) => {
    const {disabled} = props
    const [loading, setLoading] = useState(false)
    const [templatePort, setTemplatePort] = useState<string>()
    useEffect(() => {
        fetchLocalCache()
    }, [])
    const fetchLocalCache = useMemoizedFn(() => {
        setLoading(true)
        ipcRenderer
            .invoke("fetch-local-cache", ScanPortTemplate)
            .then((value: any) => {
                if (value) {
                    setTemplatePort(value || "")
                }
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => setLoading(false), 100)
            })
    })
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
            <Form.Item name='presetPort' label='预设端口' valuePropName='checked'>
                <Checkbox.Group className={styles["preset-port-group-wrapper"]}>
                    <YakitCheckbox value={"top100"}>常见100端口</YakitCheckbox>
                    <YakitCheckbox value={"topweb"}>常见 Web 端口</YakitCheckbox>
                    <YakitCheckbox value={"top1000+"}>常见一两千</YakitCheckbox>
                    <YakitCheckbox value={"topdb"}>常见数据库与 MQ</YakitCheckbox>
                    <YakitCheckbox value={"topudp"}>常见 UDP 端口</YakitCheckbox>
                    {templatePort && <YakitCheckbox value={"template"}>模板</YakitCheckbox>}
                </Checkbox.Group>
            </Form.Item>
            <Form.Item
                label='扫描端口'
                name='Ports'
                extra={
                    <div className={styles["ports-form-extra"]}>
                        <YakitButton type='text' icon={<OutlineStoreIcon />} style={{paddingLeft: 0}}>
                            存为模块
                        </YakitButton>
                        <div className={styles["divider-style"]}></div>
                        <YakitButton type='text' icon={<OutlineRefreshIcon />}>
                            默认配置
                        </YakitButton>
                    </div>
                }
            >
                <YakitInput.TextArea rows={3} />
            </Form.Item>
            <Form.Item label={" "} colon={false}>
                <div className={styles["form-extra"]}>
                    <Form.Item name='SkippedHostAliveScan' valuePropName='checked' noStyle>
                        <YakitCheckbox>跳过主机存活检测</YakitCheckbox>
                    </Form.Item>
                    <YakitTag>扫描模式：指纹</YakitTag>
                    <YakitTag>指纹扫描并发：50</YakitTag>
                </div>
            </Form.Item>
        </>
    )
})
