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
import {OutlineArrowscollapseIcon, OutlineArrowsexpandIcon} from "@/assets/icon/outline"
import classNames from "classnames"
import {Form} from "antd"
import cloneDeep from "lodash/cloneDeep"
import {defaultPorts} from "@/pages/portscan/PortScanPage"

export const NewPortScan: React.FC<NewPortScanProps> = React.memo((props) => {
    const [selectList, setSelectList] = useState<YakScript[]>([])
    // 隐藏插件列表
    const [hidden, setHidden] = useState<boolean>(false)
    return (
        <div>
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
                    <span className={styles["port-scan-executor-title-text"]}>已选插件组</span>
                    {selectNum > 0 && (
                        <YakitTag closable onClose={onRemove} color='info'>
                            {selectNum}
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

    /**额外参数弹出框 */
    const [extraParamsVisible, setExtraParamsVisible] = useState<boolean>(false)
    const [extraParamsValue, setExtraParamsValue] = useState<PortScanExecuteExtraFormValue>(
        cloneDeep(defPortScanExecuteExtraFormValue)
    )

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
        </>
    )
})

const NewPortScanExecuteForm: React.FC<NewPortScanExecuteFormProps> = React.memo((props) => {
    return <div></div>
})
