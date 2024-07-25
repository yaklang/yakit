import React, {useEffect, useMemo, useRef, useState} from "react"
import {AuditCodeProps} from "./AuditCodeType"
import classNames from "classnames"
import styles from "./AuditCode.module.scss"
import {YakScript} from "@/pages/invoker/schema"
import {Form, FormInstance} from "antd"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {ExtraParamsNodeByType} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/PluginExecuteExtraParams"
import {ExecuteEnterNodeByPluginParams} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {YakParamProps} from "@/pages/plugins/pluginsType"
import {
    getValueByType,
    getYakExecutorParam,
    onCodeToInfo,
    ParamsToGroupByGroupName
} from "@/pages/plugins/editDetails/utils"
import {useDebounceFn, useMemoizedFn} from "ahooks"
import {grpcFetchLocalPluginDetail} from "@/pages/pluginHub/utils/grpc"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {apiDebugPlugin, DebugPluginRequest} from "@/pages/plugins/utils"
import {HTTPRequestBuilderParams} from "@/models/HTTPRequestBuilder"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {yakitNotify} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {CustomPluginExecuteFormValue} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType"
import {defPluginExecuteFormValue} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/constants"
import useStore from "../hooks/useStore"
import {getNameByPath} from "../utils"

const {ipcRenderer} = window.require("electron")

export const AuditCode: React.FC<AuditCodeProps> = (props) => {
    useEffect(() => {
        // console.log("我是audit-code")
    }, [])
    return <div className={styles["audit-code"]}>我是audit-code</div>
}

interface AuditModalFormProps {
    onCancle: () => void
    isInitDefault: boolean
}

export const AuditModalForm: React.FC<AuditModalFormProps> = (props) => {
    const {onCancle, isInitDefault} = props
    const {fileTree} = useStore()
    const tokenRef = useRef<string>(randomString(40))
    const [loading, setLoading] = useState<boolean>(true)
    const [runtimeId, setRuntimeId] = useState<string>("")
    const [streamInfo, debugPluginStreamEvent] = useHoldGRPCStream({
        taskName: "debug-plugin",
        apiKey: "DebugPlugin",
        token: tokenRef.current,
        onEnd: () => {
            debugPluginStreamEvent.stop()
            setTimeout(() => setIsExecuting(false), 300)
        },
        setRuntimeId: (rId) => {
            yakitNotify("info", `调试任务启动成功，运行时 ID: ${rId}`)
            setRuntimeId(rId)
        }
    })

    /** 是否在执行中 */
    const [isExecuting, setIsExecuting] = useState<boolean>(false)
    const [plugin, setPlugin] = useState<YakScript>()
    const [form] = Form.useForm()

    // 获取参数
    const handleFetchParams = useDebounceFn(
        useMemoizedFn(async () => {
            const newPlugin = await grpcFetchLocalPluginDetail({Name: "YakSSA项目编译"}, true)
            console.log("xxx", newPlugin)
            setLoading(false)
            setPlugin(newPlugin)
        }),
        {wait: 300}
    ).run

    useEffect(() => {
        handleFetchParams()
    }, [])

    // 必要参数
    const requiredParams = useMemo(() => {
        return plugin?.Params.filter((item) => !!item.Required) || []
    }, [plugin?.Params])

    // 设置默认值
    const initRequiredFormValue = useMemoizedFn(async () => {
        let ProjectPath = ""
        let ProjectName = ""
        if (fileTree.length > 0) {
            ProjectPath = fileTree[0].path
            ProjectName = await getNameByPath(ProjectPath)
        }
        // 必填参数
        let initRequiredFormValue: CustomPluginExecuteFormValue = {...defPluginExecuteFormValue}
        requiredParams.forEach((ele) => {
            const value = getValueByType(ele.DefaultValue, ele.TypeVerbose)
            if (ele.Field === "ProjectName") {
                initRequiredFormValue = {
                    ...initRequiredFormValue,
                    [ele.Field]: ProjectName
                }
                return
            }
            if (ele.Field === "ProjectPath") {
                initRequiredFormValue = {
                    ...initRequiredFormValue,
                    [ele.Field]: ProjectPath
                }
                return
            }
            initRequiredFormValue = {
                ...initRequiredFormValue,
                [ele.Field]: value
            }
        })
        console.log("cccc", initRequiredFormValue)

        form.setFieldsValue({...initRequiredFormValue})
    })

    useEffect(() => {
        if (plugin?.Params && isInitDefault) {
            initRequiredFormValue()
        }
    }, [plugin?.Params, isInitDefault])

    /** 选填参数 */
    const groupParams = useMemo(() => {
        const arr = plugin?.Params.filter((item) => !item.Required) || []
        return ParamsToGroupByGroupName(arr)
    }, [plugin?.Params])

    const onStartExecute = useMemoizedFn(() => {
        if (form && plugin) {
            form.validateFields()
                .then(async (value: any) => {
                    const requestParams: DebugPluginRequest = {
                        Code: plugin.Content,
                        PluginType: "yak",
                        Input: value["Input"] || "",
                        HTTPRequestTemplate: {} as HTTPRequestBuilderParams,
                        ExecParams: [],
                        PluginName: ""
                    }

                    const request: Record<string, any> = {}
                    for (let el of plugin?.Params || []) request[el.Field] = value[el.Field] || undefined
                    requestParams.ExecParams = getYakExecutorParam({...value})

                    debugPluginStreamEvent.reset()
                    setRuntimeId("")

                    console.log("执行:", plugin, value, requestParams)
                    // apiDebugPlugin(requestParams, tokenRef.current).then(() => {
                    //     setIsExecuting(true)
                    //     debugPluginStreamEvent.start()
                    // })
                })
                .catch(() => {})
        }
    })

    return (
        <YakitSpin spinning={loading}>
            <Form
                style={{padding: 16}}
                form={form}
                onFinish={() => {}}
                size='small'
                labelCol={{span: 8}}
                wrapperCol={{span: 16}}
                labelWrap={true}
                validateMessages={{
                    /* eslint-disable no-template-curly-in-string */
                    required: "${label} 是必填字段"
                }}
            >
                <div className={styles["custom-params-wrapper"]}>
                    <ExecuteEnterNodeByPluginParams
                        paramsList={requiredParams}
                        pluginType={"yak"}
                        isExecuting={isExecuting}
                    />
                </div>
                {groupParams.length > 0 ? (
                    <>
                        <div className={styles["additional-params-divider"]}>
                            <div className={styles["text-style"]}>额外参数 (非必填)</div>
                            <div className={styles["divider-style"]}></div>
                        </div>
                        <ExtraParamsNodeByType extraParamsGroup={groupParams} pluginType={"yak"} />
                    </>
                ) : null}
            </Form>
            <div className={styles["audit-form-footer"]}>
                <YakitButton type='outline2' onClick={onCancle}>
                    取消
                </YakitButton>
                <YakitButton onClick={onStartExecute}>开始编译</YakitButton>
            </div>
        </YakitSpin>
    )
}
