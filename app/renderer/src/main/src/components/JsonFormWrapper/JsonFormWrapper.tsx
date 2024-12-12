import React, {useEffect, useMemo, useRef, useState} from "react"
import styles from "./JsonFormWrapper.module.scss"
import validator from "@rjsf/validator-ajv8" // 添加这行
import JsonForm from "@rjsf/antd"
import { RJSFSchema, UiSchema, WidgetProps} from "@rjsf/utils"
import {YakitSelect} from "../yakitUI/YakitSelect/YakitSelect"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {YakitInput} from "../yakitUI/YakitInput/YakitInput"
import {YakitDragger} from "../yakitUI/YakitForm/YakitForm"
import {useGetState, useMemoizedFn, useUpdateEffect} from "ahooks"
import {YakitInputNumber} from "../yakitUI/YakitInputNumber/YakitInputNumber"
import {Checkbox, Form, FormInstance, Grid} from "antd"
import {YakitCheckbox} from "../yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitSwitch} from "../yakitUI/YakitSwitch/YakitSwitch"
import {YakitRadioButtons} from "../yakitUI/YakitRadioButtons/YakitRadioButtons"
import classNames from "classnames"
import ArrayFieldTemplate from "./templates/ArrayFieldTemplate"
import ObjectFieldTemplate from "./templates/ObjectFieldTemplate"

export const getJsonSchemaListResult = (obj: {[key: string]: any}) => {
    // 此处的key用于筛选重复的表单数据
    let keyError: string[] = []
    let jsonSchemaError: JsonFormValidateProps[] = []
    let keySuccess: string[] = []
    let jsonSchemaSuccess: JsonFormValidateProps[] = []

    Object.keys(obj).forEach((key) => {
        const result: JsonFormValidateProps = obj[key]()
        if (result.pass) {
            if (!keySuccess.includes(result.key)) {
                jsonSchemaSuccess.push(result)
                keySuccess.push(result.key)
            }
        } else {
            if (!keyError.includes(result.key)) {
                jsonSchemaError.push(result)
                keyError.push(result.key)
            }
        }
    })

    return {
        jsonSchemaError,
        jsonSchemaSuccess
    }
}

export interface JsonFormValidateProps {
    pass: boolean
    error?: any[]
    key: string
    value: string
}

export interface JsonFormSchemaListWrapper {
    /** JsonSchema数据收集(PS:此处可能存在多个内部Form因此采用Ref数组的形式依次校验) */
    jsonSchemaListRef?: React.MutableRefObject<{
        [key: string]: any
    }>
    /** JsonSchema 默认值(PS:此值为对象 key值用于寻找对应默认值) */
    jsonSchemaInitial?: {
        [key: string]: any
    }
}

export interface JsonFormWrapperProps {
    jsonSchemaListRef: React.MutableRefObject<{
        [key: string]: any
    }>
    field: string
    value?: string
    onChange?: (v: string) => void
    schema: RJSFSchema
    disabled?: boolean
}

/** 创建一个包装组件来处理 JsonForm */
export const JsonFormWrapper: React.FC<JsonFormWrapperProps> = React.memo((props) => {
    const {jsonSchemaListRef, field, value, schema, disabled} = props

    const [formData, setFormData, getFormData] = useGetState<any>(value || {})
    const jsonSchemaRef = useRef<any>()

    useEffect(() => {
        if (jsonSchemaListRef.current) {
            if (!jsonSchemaListRef.current.hasOwnProperty(field)) {
                jsonSchemaListRef.current = {
                    ...jsonSchemaListRef.current,
                    [field]: validate
                }
            }
        }
    }, [])

    // 调用校验是否错误
    const validate = () => {
        try {
            const result = jsonSchemaRef.current?.validate(getFormData())
            // console.log("result?.errors", result?.errors)
            // console.log("formData---", field, getFormData())

            return {
                pass: (result?.errors || []).length === 0,
                error: result?.errors,
                key: field,
                value: getFormData()
            } as JsonFormValidateProps
        } catch (error) {
            console.error("JsonForm validation error:", error)
            return {
                pass: false,
                key: field,
                value: getFormData()
            } as JsonFormValidateProps
        }
    }

    useEffect(() => {
        // 当外部 value 变化时更新内部状态
        setFormData(value)
    }, [value])

    // const UploadFolderPath = useMemoizedFn((props: FieldProps) => {
    //     const {formData, disabled, onChange} = props
    //     return (
    //         <></>
    //     )
    // })

    // const fields: RegistryFieldsType = {
    //     "/test": UploadFolderPath,
    // }

    // const uiSchema: UiSchema = Object.keys(schema.properties || {}).reduce((acc, key) => {
    //     // 是否显示字段的 label
    //     acc[key] = {
    //         "ui:label": true
    //     }
    //     return acc
    // }, {})

    const getTextWidget = useMemoizedFn((props: WidgetProps) => {
        const {id, required, readonly, disabled, value, onChange, onBlur, onFocus, autofocus, options, schema} = props
        if (schema.type === "number") {
            return (
                <YakitInputNumber
                    style={{width: "100%"}}
                    id={id}
                    {...options}
                    autoFocus={autofocus}
                    required={required}
                    disabled={disabled || readonly}
                    value={value}
                    onChange={(value) => {
                        onChange(value)
                    }}
                    onBlur={(value) => {
                        onBlur(id, value)
                    }}
                    onFocus={(value) => {
                        onFocus(id, value)
                    }}
                />
            )
        } else if (schema.yakit_type === "upload-folder-path") {
            return (
                <YakitDragger
                    value={value}
                    isShowPathNumber={false}
                    selectType='folder'
                    multiple={false}
                    help='可将文件夹拖入框内或点击此处'
                    disabled={disabled}
                    onChange={(value) => {
                        onChange(value === "" ? options.emptyValue : value)
                    }}
                />
            )
        } else if (schema.yakit_type === "upload-path") {
            return (
                <YakitDragger
                    value={value}
                    isShowPathNumber={false}
                    selectType='file'
                    multiple={false}
                    disabled={disabled}
                    onChange={(value) => {
                        onChange(value === "" ? options.emptyValue : value)
                    }}
                />
            )
        }

        return (
            <YakitInput
                {...options}
                type='text'
                autoFocus={autofocus}
                required={required}
                disabled={disabled || readonly}
                value={value}
                onChange={(event) => {
                    onChange(event.target.value === "" ? options.emptyValue : event.target.value)
                }}
                onBlur={(event) => {
                    onBlur(id, event.target.value)
                }}
                onFocus={(event) => {
                    onFocus(id, event.target.value)
                }}
            />
        )
    })

    const getTextareaWidget = useMemoizedFn((props: WidgetProps) => {
        const {id, placeholder, value, required, disabled, autofocus, readonly, onBlur, onFocus, onChange, options} =
            props

        return (
            <YakitInput.TextArea
                placeholder={placeholder}
                disabled={disabled || readonly}
                value={value}
                required={required}
                autoFocus={autofocus}
                rows={options.rows || 5}
                onChange={(event) => {
                    onChange(event.target.value === "" ? options.emptyValue : event.target.value)
                }}
                onBlur={(event) => {
                    onBlur(id, event.target.value)
                }}
                onFocus={(event) => {
                    onFocus(id, event.target.value)
                }}
            />
        )
    })

    const getSelectWidget = useMemoizedFn((props: WidgetProps) => {
        const {id, options, multiple, disabled, readonly, value, autofocus, onChange, onBlur, onFocus} = props
        const {enumOptions = [], enumDisabled} = options
        let mode: any = multiple ? "multiple" : "default"
        mode = options.mode || mode
        return (
            <YakitSelect
                mode={mode}
                value={value}
                disabled={disabled || readonly}
                autoFocus={autofocus}
                onChange={(value) => onChange(value)}
                onBlur={(value) => onBlur(id, value)}
                onFocus={(value) => onFocus(id, value)}
            >
                {enumOptions.map(({value, label}: any, i: number) => {
                    const disabled: any = enumDisabled && enumDisabled.indexOf(value) !== -1

                    return (
                        <YakitSelect.Option key={i} value={value} disabled={disabled}>
                            {label}
                        </YakitSelect.Option>
                    )
                })}
            </YakitSelect>
        )
    })

    // 应后端要求 此处替换控件为switch
    const getSwitchWidget = useMemoizedFn((props: WidgetProps) => {
        const {label, value, disabled, readonly, autofocus, onChange}: WidgetProps = props
        return (
            <div className='ant-form-item' style={{alignItems: "center"}}>
                <div className='ant-form-item-label'>
                    <label className='ant-form-item-required'>{label}</label>
                </div>
                <div className='ant-form-item-control'>
                    <YakitSwitch
                        checked={value}
                        disabled={disabled || readonly}
                        autoFocus={autofocus}
                        onChange={(value) => onChange(value)}
                    />
                </div>
            </div>
        )
    })

    const getCheckboxesWidget = useMemoizedFn((props: WidgetProps) => {
        const {id, options, value, disabled, readonly, autofocus, onChange}: WidgetProps = props
        const {enumOptions, enumDisabled} = options
        return (
            <Checkbox.Group onChange={(value) => onChange(value)}>
                {(enumOptions as any[]).map((option: any, index: number) => {
                    const checked: boolean = value.indexOf(option.value) !== -1
                    const itemDisabled: any = enumDisabled && (enumDisabled as string[]).indexOf(option.value) !== -1
                    return (
                        <YakitCheckbox
                            id={`${id}_${index}`}
                            checked={checked}
                            disabled={disabled || itemDisabled || readonly}
                            autoFocus={autofocus && index === 0}
                            value={option.value}
                        >
                            {option.label}
                        </YakitCheckbox>
                    )
                })}
            </Checkbox.Group>
        )
    })

    const getPasswordWidget = useMemoizedFn((props: WidgetProps) => {
        const {id, required, readonly, disabled, value, onFocus, onBlur, onChange, options, autofocus} = props
        return (
            <YakitInput
                autoFocus={autofocus}
                required={required}
                disabled={disabled || readonly}
                type='password'
                value={value}
                onChange={(event) => {
                    onChange(event.target.value === "" ? options.emptyValue : event.target.value)
                }}
                onBlur={(event) => {
                    onBlur(id, event.target.value)
                }}
                onFocus={(event) => {
                    onFocus(id, event.target.value)
                }}
            />
        )
    })

    const getRadioWidget = useMemoizedFn((props: WidgetProps) => {
        const {options, value, disabled, readonly, onChange} = props
        const {enumOptions, enumDisabled} = options
        return (
            <YakitRadioButtons
                disabled={disabled}
                value={value}
                onChange={(e) => {
                    onChange(e.target.value)
                }}
                buttonStyle='solid'
                options={(enumOptions as object[]).map((option: any) => {
                    const itemDisabled: any = enumDisabled && (enumDisabled as string[]).indexOf(option.value) !== -1
                    const info = {
                        value: option.value,
                        label: option.label,
                        disabled: itemDisabled
                    }
                    return info
                })}
            />
        )
    })

    const getUpDownWidget = useMemoizedFn((props: WidgetProps) => {
        const {id, required, readonly, disabled, value, onChange, onBlur, onFocus, autofocus, options, schema} = props
        if (schema.multipleOf) {
            options.step = schema.multipleOf
        }

        if (typeof schema.minimum !== "undefined") {
            options.min = schema.minimum
        }

        if (typeof schema.maximum !== "undefined") {
            options.max = schema.maximum
        }
        return (
            <YakitInputNumber
                id={id}
                {...options}
                autoFocus={autofocus}
                required={required}
                disabled={disabled || readonly}
                value={value}
                onChange={(value) => onChange(value)}
                onBlur={(value) => onBlur(id, value)}
                onFocus={(value) => onFocus(id, value)}
            />
        )
    })

    const uiSchema: UiSchema = {
        "ui:grid": [
            {
                firstName: 7,
                lastName: 7,
                companyName: 7,
                b: 3
            },
            
        ]
        
    }

    // {
    //     type: "object",
    //     properties: {
    //         firstName: {
    //             type: "string"
    //         },
    //         lastName: {
    //             type: "string"
    //         },
    //         companyName: {
    //             type: "string"
    //         },
    //         b: {
    //             type: "boolean"
    //         }
    //     }
    // }
    return (
        <>
            <JsonForm
                ref={jsonSchemaRef}
                // tagName={AntdForm}
                className={classNames(styles["json-schema-box"])}
                schema={schema}
                // 使用自定义的UI控件映射
                validator={validator} // 添加空的验证器
                templates={{ArrayFieldTemplate, ObjectFieldTemplate}}
                widgets={{
                    // 将默认控件替换为自定义控件
                    TextWidget: getTextWidget,
                    TextareaWidget: getTextareaWidget,
                    SelectWidget: getSelectWidget,
                    CheckboxWidget: getSwitchWidget,
                    CheckboxesWidget: getCheckboxesWidget,
                    PasswordWidget: getPasswordWidget,
                    RadioWidget: getRadioWidget,
                    UpDownWidget: getUpDownWidget
                }}
                // 自定义控件
                // fields={fields}
                uiSchema={
                    {
                    /* 字段名 */
                    // unremovable: {
                    /* 全局 className*/
                    "ui:classNames": "json-schema-row-form"
                    // }
                    }
                }
                disabled={disabled}
                formData={formData}
                onChange={(e) => {
                    // 更新表单值
                    setFormData(e.formData)
                }}
                /**
                 * 如果omitExtraData和liveOmit都被设置为true，那么当onChange被调用时，
                 * 不在任何表单字段中的额外表单数据值将被删除。默认为false。
                 *  */
                omitExtraData={true}
                liveOmit={true}
                // 如果设置为true，表单将在更改表单数据时执行验证并显示任何验证错误，而不仅仅是在提交时。
                liveValidate={true}
                /**
                 * 当此属性设置为top或bottom时，错误列表（或ErrorList中定义的自定义错误列表）也将显示在表单的底部或顶部。
                 * 当设置为false时，只显示内联输入验证错误。默认设置为top。
                 *  */
                showErrorList={false}
                onSubmit={(e) => {}}
                // 添加错误处理
                onError={(errors) => {}}
            >
                {/* 这行代码会移除默认的提交按钮 */}
                <></>
            </JsonForm>
        </>
    )
})
