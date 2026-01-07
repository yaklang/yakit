import React, {useEffect, useMemo, useRef, useState} from "react"
import styles from "./JsonFormWrapper.module.scss"
import validator from "@rjsf/validator-ajv8" // 添加这行
import JsonForm from "@rjsf/antd"
import {RJSFSchema, UiSchema, WidgetProps} from "@rjsf/utils"
import {YakitSelect} from "../yakitUI/YakitSelect/YakitSelect"
import {YakitInput} from "../yakitUI/YakitInput/YakitInput"
import {YakitDragger} from "../yakitUI/YakitForm/YakitForm"
import {useGetState, useMemoizedFn, useUpdateEffect} from "ahooks"
import {YakitInputNumber} from "../yakitUI/YakitInputNumber/YakitInputNumber"
import {Checkbox} from "antd"
import {YakitCheckbox} from "../yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitSwitch} from "../yakitUI/YakitSwitch/YakitSwitch"
import {YakitRadioButtons} from "../yakitUI/YakitRadioButtons/YakitRadioButtons"
import classNames from "classnames"
import ArrayFieldTemplate from "./templates/ArrayFieldTemplate"
import ObjectFieldTemplate from "./templates/ObjectFieldTemplate"
import {ColumnSchemaProps, EditTable, UiSchemaTableProps} from "./editTable/EditTable"
import {cloneDeep} from "lodash"

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
    uiSchema: UiSchema
    disabled?: boolean
}

/** 创建一个包装组件来处理 JsonForm */
export const JsonFormWrapper: React.FC<JsonFormWrapperProps> = React.memo((props) => {
    const {jsonSchemaListRef, field, value, schema, uiSchema, disabled} = props

    const [formData, setFormData, getFormData] = useGetState<any>(value || {})
    const jsonSchemaRef = useRef<any>()
    // 用于强制刷新
    const [formKey, setFormKey] = useState(0)

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
            return {
                pass: (result?.errors || []).length === 0,
                error: result?.errors,
                key: field,
                value: getFormData()
            } as JsonFormValidateProps
        } catch (error) {
            // console.error("JsonForm validation error:", error)
            return {
                pass: false,
                key: field,
                value: getFormData()
            } as JsonFormValidateProps
        }
    }

/** 填充必填字段为 undefined，用于让校验失败 */
const fillRequiredEmpty = (schema, data) => {
    if (!schema || schema.type !== "object") return data;
    const result = { ...data };

    const requiredFields = schema.required || [];
    for (const key of requiredFields) {
        // 若当前必填字段不存在，则填充 undefined
        if (!(key in result)) {
            result[key] = undefined;
        }
    }

    // 递归处理子对象
    for (const key in schema.properties || {}) {
        const prop = schema.properties?.[key];
        if (prop && prop.type === "object") {
            result[key] = fillRequiredEmpty(prop as RJSFSchema, result[key] || {});
        }
    }

    return result;
};

    useEffect(() => {
        // 初始化时填充必填字段的默认值（否则默认值为{}校验通过）
        const initFormData = fillRequiredEmpty(schema, getFormData())
        setFormData(initFormData)
    }, [])

    useUpdateEffect(() => {
        // 当外部 value 变化时更新内部状态
        value && setFormData(value)
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

    const getTextWidget = useMemoizedFn((props: WidgetProps) => {
        const {
            id,
            required,
            readonly,
            disabled,
            value,
            onChange,
            onBlur,
            onFocus,
            autofocus,
            options,
            schema,
            uiSchema
        } = props
        const uiStyle = uiSchema?.["ui:component_style"] || {}
        if (schema.type === "number") {
            return (
                <YakitInputNumber
                    style={{width: "100%", ...uiStyle}}
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
        } else if (schema.yakit_type === "file") {
            return getFileWidget(props)
        } else if (schema.yakit_type === "files") {
            return getFilesWidget(props)
        } else if (schema.yakit_type === "folder") {
            return getFolderWidget(props)
        }

        return (
            <YakitInput
                {...options}
                style={{width: "100%", ...uiStyle}}
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
        const {
            id,
            placeholder,
            value,
            required,
            disabled,
            autofocus,
            readonly,
            onBlur,
            onFocus,
            onChange,
            options,
            uiSchema
        } = props
        const uiStyle = uiSchema?.["ui:component_style"] || {}
        return (
            <YakitInput.TextArea
                style={uiStyle}
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
        const {id, options, multiple, disabled, readonly, value, autofocus, onChange, onBlur, onFocus, uiSchema} = props
        const {enumOptions = [], enumDisabled} = options
        const uiStyle = uiSchema?.["ui:component_style"] || {}
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
                style={uiStyle}
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
        const {label, value, disabled, readonly, autofocus, onChange, uiSchema}: WidgetProps = props
        const uiStyle = uiSchema?.["ui:component_style"] || {}
        return (
            <div className='ant-form-item' style={{alignItems: "center"}}>
                <div className='ant-form-item-label'>
                    <label className='ant-form-item-required'>{label}</label>
                </div>
                <div className='ant-form-item-control'>
                    <YakitSwitch
                        style={uiStyle}
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
        const {id, options, value, disabled, readonly, autofocus, onChange, uiSchema}: WidgetProps = props
        const uiStyle = uiSchema?.["ui:component_style"] || {}
        const {enumOptions, enumDisabled} = options
        return (
            <Checkbox.Group onChange={(value) => onChange(value)} style={uiStyle}>
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
        const {id, required, readonly, disabled, value, onFocus, onBlur, onChange, options, autofocus, uiSchema} = props
        const uiStyle = uiSchema?.["ui:component_style"] || {}
        return (
            <YakitInput.Password
                allowClear
                style={uiStyle}
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

    const getRadioWidget = useMemoizedFn((props: WidgetProps) => {
        const {options, value, disabled, onChange, uiSchema} = props
        const {enumOptions, enumDisabled} = options
        const uiStyle = uiSchema?.["ui:component_style"] || {}
        return (
            <YakitRadioButtons
                style={uiStyle}
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
        const {
            id,
            required,
            readonly,
            disabled,
            value,
            onChange,
            onBlur,
            onFocus,
            autofocus,
            options,
            schema,
            uiSchema
        } = props
        const uiStyle = uiSchema?.["ui:component_style"] || {}
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
                style={uiStyle}
            />
        )
    })

    const getFileWidget = useMemoizedFn((props: WidgetProps) => {
        const {disabled, value, onChange, options, uiSchema} = props
        const uiStyle = uiSchema?.["ui:component_style"] || {}
        return (
            <YakitDragger
                inputProps={{style: uiStyle}}
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
    })

    const getFilesWidget = useMemoizedFn((props: WidgetProps) => {
        const {disabled, value, onChange, options, uiSchema} = props
        const uiStyle = uiSchema?.["ui:component_style"] || {}
        return (
            <YakitDragger
                inputProps={{style: uiStyle}}
                value={value}
                isShowPathNumber={false}
                selectType='file'
                renderType='textarea'
                multiple={false}
                disabled={disabled}
                onChange={(value) => {
                    onChange(value === "" ? options.emptyValue : value)
                }}
            />
        )
    })

    const getFolderWidget = useMemoizedFn((props: WidgetProps) => {
        const {disabled, value, onChange, options, uiSchema} = props
        const uiStyle = uiSchema?.["ui:component_style"] || {}
        return (
            <YakitDragger
                inputProps={{style: uiStyle}}
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
    })

    const getTableWidget = useMemoizedFn((props: WidgetProps) => {
        const {value, onChange, options, uiSchema} = props
        return (
            <EditTable
                columnSchema={props.schema as ColumnSchemaProps}
                uiSchema={uiSchema as UiSchemaTableProps}
                value={value}
                onChange={(arr: any[]) => {
                    // 注：options.emptyValue在返回为数组时会导致校验无效
                    onChange(arr)
                }}
            />
        )
    })

    // 处理 allOf 条件更新
    const handleAllOfUpdate = (data: any) => {
        const newData = {...data}
        const allOfRules = schema?.allOf || []

        allOfRules.forEach((rule: any) => {
            const cond = rule.if?.properties
            const thenProps = rule.then?.properties
            if (!cond || !thenProps) return

            // 判断 if 条件是否满足
            const isMatch = Object.entries(cond).every(([k, v]: any) => {
                return newData[k] === v.const
            })

            if (isMatch) {
                Object.entries(thenProps).forEach(([key, val]: any) => {
                    if (val.const !== undefined) newData[key] = val.const
                })
            }
        })

        return newData
    }
    // const uiSchema: UiSchema = Object.keys(schema.properties || {}).reduce((acc, key) => {
    //     // 是否显示字段的 label
    //     acc[key] = {
    //         "ui:label": true
    //     }
    //     return acc
    // }, {})
    // const uiSchema: UiSchema = {
    //     "ui:grid": [
    //         {
    //             firstName: 7,
    //             lastName: 7,
    //             companyName: 7,
    //             b: 3
    //         }
    //     ]
    // }

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

    /* 字段名 */
    // unremovable: {
    /* 全局 className*/
    // "ui:classNames": "json-schema-row-form"
    // }
    return (
        <>
            <JsonForm
                key={formKey} // 使用 key 强制刷新组件
                ref={jsonSchemaRef}
                // tagName={AntdForm}
                // 此处的json-schema-form应用于特殊页面的另类布局处理
                className={classNames(styles["json-schema-box"], "json-schema-form")}
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
                    UpDownWidget: getUpDownWidget,
                    FileWidget: getFileWidget,
                    // uiSchema 自定义控件
                    files: getFilesWidget,
                    folder: getFolderWidget,
                    table: getTableWidget
                }}
                // 自定义控件
                // fields={fields}
                uiSchema={uiSchema}
                disabled={disabled}
                formData={formData}
                onChange={(e) => {
                    const newFormData = cloneDeep(e.formData)
                    // 手动触发 allOf 条件逻辑
                    const updated = handleAllOfUpdate(newFormData)
                    // 判断 allOf 更新后是否真的改变了数据
                    const isSame = JSON.stringify(updated) === JSON.stringify(e.formData)
                    // 更新表单值
                    setFormData(updated)
                    // 强制刷新
                    if (!isSame) {
                        setFormKey((k) => k + 1)
                    }
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
