import React, {useEffect, useMemo, useState} from "react"
import {
    ExecuteEnterNodeByPluginParamsProps,
    FormExtraSettingProps,
    OutputFormComponentsByTypeProps,
    PluginExecuteDetailHeardProps,
    YakExtraParamProps
} from "./LocalPluginExecuteDetailHeardType"
import {PluginDetailHeader} from "../../baseTemplate"
import styles from "./LocalPluginExecuteDetailHeard.module.scss"
import {useDebounceFn, useMemoizedFn} from "ahooks"
import {Form} from "antd"
import {YakParamProps} from "../../pluginsType"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {QuestionMarkCircleIcon} from "@/assets/newIcon"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {HTTPPacketEditor, YakCodeEditor} from "@/utils/editors"
import {YakitFormDragger} from "@/components/yakitUI/YakitForm/YakitForm"
import {failed} from "@/utils/notification"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {Uint8ArrayToString} from "@/utils/str"
import classNames from "classnames"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitSelectProps} from "@/components/yakitUI/YakitSelect/YakitSelectType"

/**
 * @description 根据组名将参数分组
 * @returns 返回处理好分组后的数据
 *  */
const ParamsToGroupByGroupName = (arr: YakParamProps[]): YakExtraParamProps[] => {
    let map = {}
    let paramsGroupList: YakExtraParamProps[] = []
    for (var i = 0; i < arr.length; i++) {
        var ai = arr[i]
        if (!map[ai.Group || "default"]) {
            paramsGroupList.push({
                group: ai.Group || "default",
                data: [ai]
            })
            map[ai.Group || "default"] = ai
        } else {
            for (var j = 0; j < paramsGroupList.length; j++) {
                var dj = paramsGroupList[j]
                if (dj.group === ai.Group) {
                    dj.data.push(ai)
                    break
                }
            }
        }
    }
    return paramsGroupList || []
}

/**
 * @description 表单显示的值,根据类型返回对应的类型的值
 */
const getValueByType = (defaultValue, type: string): number | string | boolean | string[] => {
    let value
    switch (type) {
        case "uint":
        case "float":
            value = parseInt(defaultValue || "0")
            break
        case "boolean":
            value = defaultValue === "true"
            break
        case "http-packet":
        case "yak":
            value = Buffer.from((defaultValue || "") as string, "utf8")
            break
        case "select":
            const newVal = defaultValue ? defaultValue.split(",") : []
            value = newVal.length > 0 ? newVal : undefined
            break
        default:
            value = defaultValue
            break
    }
    return value
}

/**插件执行头部 */
export const LocalPluginExecuteDetailHeard: React.FC<PluginExecuteDetailHeardProps> = React.memo((props) => {
    const {plugin, extraNode} = props
    const [form] = Form.useForm()

    /**必填的参数,作为页面上主要显示 */
    const requiredParams: YakParamProps[] = useMemo(() => {
        return plugin.Params?.filter((ele) => ele.Required) || []
    }, [plugin.Params])
    /**额外参数,根据参数组分类 */
    const extraParamsGroup: YakExtraParamProps[] = useMemo(() => {
        const paramsList = plugin.Params?.filter((ele) => !ele.Required) || []
        return ParamsToGroupByGroupName(paramsList)
    }, [plugin.Params])
    useEffect(() => {
        initFormValue()
    }, [plugin.Params])
    /**初始表单初始值 */
    const initFormValue = useMemoizedFn(() => {
        initRequiredFormValue()
        initExtraFormValue()
    })
    const initRequiredFormValue = useMemoizedFn(() => {
        // 必填参数
        let initRequiredFormValue = {}
        requiredParams.forEach((ele) => {
            const value = getValueByType(ele.DefaultValue, ele.TypeVerbose)
            initRequiredFormValue = {
                ...initRequiredFormValue,
                [ele.Field]: value
            }
        })
        form.setFieldsValue({...initRequiredFormValue})
    })
    const initExtraFormValue = useMemoizedFn(() => {
        // 额外参数
        let initExtraFormValue = {}
        const extraParamsList = plugin.Params?.filter((ele) => !ele.Required) || []
        extraParamsList.forEach((ele) => {
            let value
            if (ele.TypeVerbose === "boolean") {
                value = ele.DefaultValue === "true"
            }
            value = ele.DefaultValue
            initExtraFormValue = {
                ...initExtraFormValue,
                [ele.Field]: value
            }
        })
        // console.log("initExtraFormValue", initExtraFormValue)
    })
    /**yak/codec/lua根据后端返的生成;mitm/port-scan/nuclei前端固定*/
    const pluginParamsNodeByPluginType = (type: string) => {
        switch (type) {
            case "yak":
            case "lua":
                return <ExecuteEnterNodeByPluginParams paramsList={requiredParams} />
            case "codec":
                return <></>
            case "mitm":
            case "port-scan":
            case "nuclei":
                return <></>
            default:
                return <></>
        }
    }
    /**开始执行 */
    const onStartExecute = useMemoizedFn((value) => {
        let newValue = value
        Object.entries(value).forEach(([key, val]) => {
            if (val instanceof Buffer) {
                newValue[key] = Uint8ArrayToString(val)
            }
        })
        // console.log("newValue", newValue)
    })
    return (
        <div>
            <PluginDetailHeader
                pluginName={plugin.ScriptName}
                help={plugin.Help}
                tags={plugin.Tags}
                extraNode={
                    <div>
                        <>{extraNode}</>
                    </div>
                }
                img={plugin.HeadImg || ""}
                user={plugin.Author}
                pluginId={plugin.UUID}
                updated_at={plugin.UpdatedAt || 0}
                prImgs={(plugin.CollaboratorInfo || []).map((ele) => ({
                    headImg: ele.HeadImg,
                    userName: ele.UserName
                }))}
                type={plugin.Type}
            />
            <Form
                form={form}
                onFinish={onStartExecute}
                className={styles["plugin-execute-form-wrapper"]}
                labelCol={{span: 6}}
                wrapperCol={{span: 12}} //这样设置是为什么让输入框居中
                validateMessages={{
                    /* eslint-disable no-template-curly-in-string */
                    required: "${label} 是必填字段"
                }}
            >
                {pluginParamsNodeByPluginType(plugin.Type)}
                <Form.Item colon={false} label={" "}>
                    <YakitButton htmlType='submit'>开始执行</YakitButton>
                </Form.Item>
            </Form>
        </div>
    )
})

/**执行的入口通过插件参数生成组件 */
const ExecuteEnterNodeByPluginParams: React.FC<ExecuteEnterNodeByPluginParamsProps> = React.memo((props) => {
    const {paramsList} = props
    // console.log("paramsList", paramsList)
    const formContent = (item: YakParamProps) => {
        let extraSetting: FormExtraSettingProps | undefined = undefined
        try {
            extraSetting = JSON.parse(item.ExtraSetting || "{}") || {
                double: false,
                data: []
            }
        } catch (error) {
            failed("获取参数配置数据错误，请重新打开该页面")
        }
        switch (item.TypeVerbose) {
            case "upload-path":
                return (
                    <>
                        <YakitFormDragger
                            className={styles["plugin-execute-form-item"]}
                            formItemProps={{
                                name: item.Field,
                                label: item.FieldVerbose || item.Field,
                                labelCol: {span: 6},
                                wrapperCol: {span: 12},
                                required: item.Required
                            }}
                            selectType='all'
                        />
                    </>
                )

            default:
                return <OutputFormComponentsByType item={item} extraSetting={extraSetting} />
        }
    }
    return (
        <>
            {paramsList.map((item) => (
                <React.Fragment key={item.Field}>{formContent(item)}</React.Fragment>
            ))}
        </>
    )
})

const OutputFormComponentsByType: React.FC<OutputFormComponentsByTypeProps> = (props) => {
    const {item, extraSetting} = props
    const [validateStatus, setValidateStatus] = useState<"success" | "error">("success")
    const formProps = {
        rules: [{required: item.Required}],
        label: item.FieldVerbose || item.Field,
        name: item.Field,
        className: styles["plugin-execute-form-item"],
        tooltip: {
            icon: <QuestionMarkCircleIcon />,
            title: item.Help
        }
    }
    const onValidateStatus = useDebounceFn(
        (value: "success" | "error") => {
            setValidateStatus(value)
        },
        {wait: 200, leading: true}
    ).run
    switch (item.TypeVerbose) {
        case "string":
            return (
                <Form.Item {...formProps}>
                    <YakitInput placeholder='请输入' />
                </Form.Item>
            )
        case "text":
            return (
                <Form.Item {...formProps}>
                    <YakitInput.TextArea placeholder='请输入' />
                </Form.Item>
            )
        case "uint":
            return (
                <Form.Item {...formProps}>
                    <YakitInputNumber precision={0} min={1} />
                </Form.Item>
            )
        case "float":
            return (
                <Form.Item {...formProps}>
                    <YakitInputNumber step={0.1} />
                </Form.Item>
            )
        case "boolean":
            return (
                <Form.Item {...formProps} valuePropName='checked'>
                    <YakitSwitch size='large' />
                </Form.Item>
            )
        case "select":
            let selectProps: YakitSelectProps = {
                options: extraSetting?.data || []
            }
            if (extraSetting?.double) {
                selectProps = {
                    ...selectProps,
                    mode: "tags"
                }
            }
            return (
                <Form.Item {...formProps}>
                    <YakitSelect {...selectProps} />
                </Form.Item>
            )
        case "http-packet":
            return (
                <Form.Item
                    {...formProps}
                    rules={[
                        {required: item.Required},
                        {
                            validator: async (rule, value) => {
                                if (value.length === 0) {
                                    onValidateStatus("error")
                                    return Promise.reject(`${formProps.label} 是必填字段`)
                                }
                                if (validateStatus === "error") onValidateStatus("success")
                                return Promise.resolve()
                            }
                        }
                    ]}
                    valuePropName='originValue'
                    className={classNames(formProps.className, styles["code-wrapper"])}
                    initialValue={Buffer.from(item.DefaultValue || "", "utf8")}
                >
                    <HTTPPacketEditor
                        noHeader={true}
                        noHex={true}
                        originValue={Buffer.from(item.DefaultValue || "", "utf8")}
                    />
                </Form.Item>
            )
        case "yak":
            return (
                <Form.Item
                    {...formProps}
                    rules={[
                        {required: item.Required},
                        {
                            validator: async (rule, value) => {
                                if (value.length === 0) {
                                    onValidateStatus("error")
                                    return Promise.reject(`${formProps.label} 是必填字段`)
                                }
                                if (validateStatus === "error") onValidateStatus("success")
                                return Promise.resolve()
                            }
                        }
                    ]}
                    valuePropName='originValue'
                    className={classNames(formProps.className, styles["code-wrapper"], {
                        [styles["code-error-wrapper"]]: validateStatus === "error"
                    })}
                    initialValue={Buffer.from(item.DefaultValue || "", "utf8")}
                >
                    <YakCodeEditor language={"yak"} originValue={Buffer.from(item.DefaultValue, "utf8")} />
                </Form.Item>
            )

        default:
            return <></>
    }
}
