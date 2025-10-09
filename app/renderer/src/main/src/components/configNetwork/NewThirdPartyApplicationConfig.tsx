import React, {useEffect, useMemo, useState} from "react"
import {Form} from "antd"
import {ThirdPartyApplicationConfig} from "@/components/configNetwork/ConfigNetworkPage"
import {KVPair} from "@/models/kv"
import {YakitAutoComplete} from "../yakitUI/YakitAutoComplete/YakitAutoComplete"
import {YakitSelect} from "../yakitUI/YakitSelect/YakitSelect"
import {SelectOptionsProps} from "@/demoComponents/itemSelect/ItemSelectType"
import {useDebounceEffect, useDebounceFn, useMemoizedFn, useUpdateEffect} from "ahooks"
import {OutlineInformationcircleIcon} from "@/assets/icon/outline"
import {YakitInput} from "../yakitUI/YakitInput/YakitInput"
import {YakitSwitch} from "../yakitUI/YakitSwitch/YakitSwitch"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {yakitNotify} from "@/utils/notification"
import {YakitSpin} from "../yakitUI/YakitSpin/YakitSpin"
import styles from "./ConfigNetworkPage.module.scss"
const {ipcRenderer} = window.require("electron")

interface ThirdPartyAppConfigItemTemplate {
    Required: boolean
    Name: string
    Verbose: string
    Type: string
    DefaultValue: string
    Desc: string
    Extra: string
}
interface GetThirdPartyAppConfigTemplate {
    Name: string
    Verbose: string
    Type: string
    Items: ThirdPartyAppConfigItemTemplate[]
}
export interface GetThirdPartyAppConfigTemplateResponse {
    Templates: GetThirdPartyAppConfigTemplate[]
}

export interface ThirdPartyApplicationConfigProp {
    formValues?: ThirdPartyApplicationConfig
    // 禁止类型改变
    disabledType?: boolean
    // 是否可新增类型
    canAddType?: boolean
    // 类型下拉是否只展示ai类型的
    isOnlyShowAiType?: boolean
    onAdd: (i: ThirdPartyApplicationConfig) => void
    onCancel: () => void
}

const defautFormValues = {
    Type: "",
    api_key: "",
    user_identifier: "",
    ExtraParams: [] as KVPair[]
}

const defaultFormItems: ThirdPartyAppConfigItemTemplate[] = [
    {
        DefaultValue: "",
        Desc: "APIKey / Token",
        Extra: "",
        Name: "api_key",
        Required: true,
        Type: "string",
        Verbose: "ApiKey"
    },
    {
        DefaultValue: "",
        Desc: "email / username",
        Extra: "",
        Name: "user_identifier",
        Required: false,
        Type: "string",
        Verbose: "用户信息"
    }
]

export const NewThirdPartyApplicationConfig: React.FC<ThirdPartyApplicationConfigProp> = (props) => {
    const {
        formValues = defautFormValues,
        disabledType = false,
        canAddType = true,
        isOnlyShowAiType = false,
        onAdd,
        onCancel
    } = props
    const [form] = Form.useForm()
    const typeVal = Form.useWatch("Type", form)
    const [options, setOptions] = useState<SelectOptionsProps[]>([])
    const [templates, setTemplates] = useState<GetThirdPartyAppConfigTemplate[]>([])
    const [modelOptionLoading, setModelOptionLoading] = useState<boolean>(false)
    const [modelNameAllOptions, setModelNameAllOptions] = useState<SelectOptionsProps[]>([])
    const apiKeyWatch = Form.useWatch("api_key", form)

    // 获取类型
    useEffect(() => {
        ipcRenderer.invoke("GetThirdPartyAppConfigTemplate").then((res: GetThirdPartyAppConfigTemplateResponse) => {
            const templates = res.Templates
            setTemplates(templates)
            let newOptions: SelectOptionsProps[] = []
            if (isOnlyShowAiType) {
                newOptions = templates
                    .filter((item) => item.Type === "ai")
                    .map((item) => ({label: item.Verbose, value: item.Name}))
            } else {
                newOptions = templates.map((item) => ({label: item.Verbose, value: item.Name}))
            }
            setOptions(newOptions)
        })
    }, [isOnlyShowAiType])

    useUpdateEffect(() => {
        if (apiKeyWatch) {
            getModelNameOption()
        } else {
            handleDefaultModalNameOption()
        }
    }, [apiKeyWatch])
    const getModelNameOption = useDebounceFn(
        useMemoizedFn(() => {
            setModelOptionLoading(true)
            const v = form.getFieldsValue()
            ipcRenderer
                .invoke("ListAiModel", {Config: JSON.stringify(v)})
                .then((res) => {
                    const modalNamelist: SelectOptionsProps[] = res.ModelName.map((modelName: string) => ({
                        label: modelName,
                        value: modelName
                    }))
                    const name = getModelNameDefaultName()
                    // 确保默认值在选项里
                    const hasDefault = modalNamelist.some((item) => item.value === name)
                    const newOptions = hasDefault
                        ? modalNamelist
                        : name
                        ? [{label: name, value: name}, ...modalNamelist]
                        : modalNamelist
                    setModelNameAllOptions(newOptions)
                    yakitNotify("success", "获取成功")
                })
                .catch((error) => {
                    yakitNotify("error", error + "")
                    handleDefaultModalNameOption()
                })
                .finally(() => {
                    setModelOptionLoading(false)
                })
        }),
        {wait: 500}
    ).run
    const getModelNameDefaultName = () => {
        const templatesobj = templates.find((item) => item.Name === typeVal)
        const formItems = templatesobj?.Items || []
        const modelType = templatesobj?.Type
        const obj = formItems.find((item) => modelType === "ai" && item.Type === "list" && item.Name === "model")
        return obj?.DefaultValue
    }
    const handleDefaultModalNameOption = () => {
        const name = getModelNameDefaultName()
        if (name) {
            setModelNameAllOptions([{label: name, value: name}])
        } else {
            setModelNameAllOptions([])
        }
    }
    useDebounceEffect(
        () => {
            handleDefaultModalNameOption()
        },
        [typeVal],
        {wait: 300}
    )

    // 切换类型，渲染不同表单项（目前只有输入框、开关、下拉）
    const renderAllFormItems = useMemoizedFn(() => {
        const templatesobj = templates.find((item) => item.Name === typeVal)
        const formItems = templatesobj?.Items || []
        const modelType = templatesobj?.Type
        return formItems.map((item, index) => (
            <React.Fragment key={index}>{renderSingleFormItem(item, modelType)}</React.Fragment>
        ))
    })
    const renderSingleFormItem = (item: ThirdPartyAppConfigItemTemplate, modelType?: string) => {
        const formProps = {
            rules: [{required: item.Required, message: `请填写${item.Verbose}`}],
            label: item.Verbose,
            name: item.Name,
            tooltip: item.Desc
                ? {
                      icon: <OutlineInformationcircleIcon />,
                      title: item.Desc
                  }
                : null
        }
        switch (item.Type) {
            case "string":
                return (
                    <Form.Item {...formProps}>
                        <YakitInput />
                    </Form.Item>
                )
            case "bool":
                return (
                    <Form.Item {...formProps} valuePropName='checked'>
                        <YakitSwitch />
                    </Form.Item>
                )
            case "list":
                if (modelType === "ai" && item.Name === "model") {
                    // 模型名称
                    return (
                        <Form.Item
                            {...formProps}
                            help={
                                <div style={{height: 30}}>
                                    如无法自动获取，请
                                    <YakitButton
                                        type='text'
                                        onClick={() => {
                                            getModelNameOption()
                                        }}
                                        style={{padding: 0, fontSize: 14}}
                                    >
                                        点击刷新
                                    </YakitButton>
                                    重新获取
                                </div>
                            }
                        >
                            <YakitAutoComplete
                                options={modelNameAllOptions}
                                onFocus={getModelNameOption}
                                dropdownRender={(menu) => {
                                    return (
                                        <>
                                            <YakitSpin spinning={modelOptionLoading}>{menu}</YakitSpin>
                                        </>
                                    )
                                }}
                                filterOption={(inputValue, option) => {
                                    if (option?.value && typeof option?.value === "string") {
                                        return option?.value?.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                                    }
                                    return false
                                }}
                            ></YakitAutoComplete>
                        </Form.Item>
                    )
                } else {
                    return (
                        <Form.Item {...formProps}>
                            <YakitSelect />
                        </Form.Item>
                    )
                }
            default:
                return <></>
                break
        }
    }
    // 判断当前类型值是否在options存在
    const isInOptions = useMemo(() => {
        return options.findIndex((item) => item.value === typeVal) !== -1
    }, [options, typeVal])

    const initialValues = useMemo(() => {
        const copyFormValues = {...formValues}
        Object.keys(copyFormValues).forEach((key) => {
            if (copyFormValues[key] === "true") {
                copyFormValues[key] = true
            } else if (copyFormValues[key] === "false") {
                copyFormValues[key] = false
            }
        })
        return copyFormValues
    }, [formValues])

    return (
        <div className={styles["config-form-wrapper"]}>
            <Form
                form={form}
                layout={"horizontal"}
                labelCol={{span: 5}}
                wrapperCol={{span: 18}}
                initialValues={initialValues}
                onValuesChange={(changedValues, allValues) => {
                    // 当类型改变时，表单项的值采用默认值
                    if (changedValues.Type !== undefined) {
                        const templatesobj = templates.find((item) => item.Name === changedValues.Type)
                        const formItems = templatesobj?.Items || []
                        formItems.forEach((item) => {
                            form.setFieldsValue({
                                [item.Name]: ["string", "list"].includes(item.Type)
                                    ? item.DefaultValue
                                    : item.DefaultValue === "true"
                            })
                        })
                    }
                }}
                onSubmitCapture={(e) => {
                    e.preventDefault()
                }}
                className={styles["config-form"]}
            >
                <Form.Item
                    label={"类型"}
                    rules={[{required: true, message: `请${canAddType ? "填写" : "选择"}类型`}]}
                    name={"Type"}
                >
                    {canAddType ? (
                        <YakitAutoComplete options={options} disabled={disabledType} />
                    ) : (
                        <YakitSelect disabled={disabledType} options={options}></YakitSelect>
                    )}
                </Form.Item>
                {isInOptions ? (
                    <>{renderAllFormItems()}</>
                ) : (
                    <>
                        {defaultFormItems.map((item, index) => (
                            <React.Fragment key={index}>{renderSingleFormItem(item)}</React.Fragment>
                        ))}
                    </>
                )}
            </Form>
            <div className={styles["config-footer"]}>
                <YakitButton size='large' type='outline2' onClick={onCancel}>
                    取消
                </YakitButton>
                <YakitButton
                    size='large'
                    type={"primary"}
                    onClick={() => {
                        form.validateFields().then((res) => {
                            const ExtraParams = Object.keys(res)
                                .filter((key) => key !== "Type")
                                .map((key) => ({Key: key, Value: res[key]}))
                            onAdd({
                                Type: res.Type,
                                ExtraParams
                            })
                        })
                    }}
                >
                    确定添加
                </YakitButton>
            </div>
        </div>
    )
}

export default NewThirdPartyApplicationConfig
