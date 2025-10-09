import {FC, useMemo, useRef} from "react"
import {Form} from "antd"
import {useForm} from "antd/es/form/Form"
import {useRequest, useSafeState} from "ahooks"

import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {YakitTag} from "../yakitUI/YakitTag/YakitTag"
import {YakitInput} from "../yakitUI/YakitInput/YakitInput"
import {YakitSelect} from "../yakitUI/YakitSelect/YakitSelect"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import styles from "./CustomizeCode.module.scss"
import {useTheme} from "@/hook/useTheme"
import {YakitModal} from "../yakitUI/YakitModal/YakitModal"
import {yakitNotify} from "@/utils/notification"
import type {
    CodeCustomizeModalProps,
    RowOf,
    TCodeCustomizeTagProps,
    TCustomCodeGeneral,
    TCustomEditorCodeGeneral,
    TQueryCustomCodeRequest
} from "./CustomizeCodeTypes"
import {YakitSpin} from "../yakitUI/YakitSpin/YakitSpin"
import {OutlineXIcon} from "@/assets/icon/outline"

const {ipcRenderer} = window.require("electron")

const {Item} = Form

// 使用位置 下拉框的 options
const selectOptions = [
    {
        label: "http",
        value: "http"
    },
    {
        label: "yak",
        value: "yak"
    }
]

const LevelOptions = [
    {
        label: "Method",
        value: "method"
    },
    {
        label: "Function",
        value: "function"
    },
    {
        label: "Constructor",
        value: "constructor"
    },
    {
        label: "Field",
        value: "field"
    },
    {
        label: "Variable",
        value: "variable"
    },
    {
        label: "Class",
        value: "class"
    },
    {
        label: "Struct",
        value: "struct"
    },
    {
        label: "Interface",
        value: "interface"
    },
    {
        label: "Module",
        value: "module"
    },
    {
        label: "Property",
        value: "property"
    },
    {
        label: "Event",
        value: "event"
    },
    {
        label: "Operator",
        value: "operator"
    },
    {
        label: "Unit",
        value: "unit"
    },
    {
        label: "Value",
        value: "value"
    },
    {
        label: "Constant",
        value: "constant"
    },
    {
        label: "Enum",
        value: "enum"
    },
    {
        label: "EnumMember",
        value: "enumMember"
    },
    {
        label: "Keyword",
        value: "keyword"
    },
    {
        label: "Text",
        value: "text"
    },
    {
        label: "Color",
        value: "color"
    },
    {
        label: "File",
        value: "file"
    },
    {
        label: "Reference",
        value: "reference"
    },
    {
        label: "Customcolor",
        value: "customcolor"
    },
    {
        label: "Folder",
        value: "folder"
    },
    {
        label: "TypeParameter",
        value: "typeParameter"
    },
    {
        label: "User",
        value: "user"
    },
    {
        label: "Issue",
        value: "issue"
    },
    {
        label: "Snippet",
        value: "snippet"
    }
]

export const getAllRows = <T extends Record<string, any[]>>(data: T): RowOf<T>[] => {
    const keys = Object.keys(data) as (keyof T)[]
    const length = Math.max(...keys.map((k) => data[k].length))

    return Array.from({length}, (_, index) =>
        keys.reduce((obj, key) => {
            const arr = data[key]
            if (Array.isArray(arr) && index < arr.length) {
                // 将 key 末尾的 s 去掉
                const singular = (key as string).replace(/s$/, "")
                ;(obj as any)[singular] = arr[index]
            }
            return obj
        }, {} as RowOf<T>)
    )
}

const CodeCustomize: FC<Partial<TCodeCustomizeTagProps>> = ({value}) => {
    const [form] = useForm()
    const {theme} = useTheme()

    const [visibleOpen, setVisibleOpen] = useSafeState(false)
    const stateRef = useRef({
        edit: false,
        insert: false,
        previousNameValue: ""
    })

    // 获取代码接口定义
    const {data: detailCustomCodeData, run: detailCustomCodeRun} = useRequest(
        async () => {
            const result: TCustomCodeGeneral<string[]> = await ipcRenderer.invoke("QuerySnippets", {Filter: {}})
            return result
        },
        {
            onError: (err) => {
                yakitNotify("error", `获取自定义代码片段组失败：${err}`)
            }
        }
    )

    // 创建代码片段接口定义
    const {run: createCustomCodeRun, loading: createCustomCodeLoading} = useRequest(
        async (responseValue: TCustomCodeGeneral<string>) => {
            await ipcRenderer.invoke("CreateSnippet", responseValue)
        },
        {
            manual: true,
            onSuccess: () => {
                detailCustomCodeRun()
                setVisibleOpen(false)
                yakitNotify("success", "添加自定义代码片段组成功")
            },
            onError: (error) => {
                yakitNotify("error", `添加自定义代码片段组失败：${error}`)
            }
        }
    )

    // 删除代码接口定义
    const {run: runDeleteCode, loading: deleteCustomCodeLoading} = useRequest(
        async (response: TQueryCustomCodeRequest) => {
            await ipcRenderer.invoke("DeleteSnippets", response)
        },
        {
            manual: true,
            onSuccess: () => {
                detailCustomCodeRun()
                yakitNotify("success", "删除自定义代码片段成功")
            },
            onError: (error) => {
                yakitNotify("error", `删除自定义代码片段失败：${error}`)
            }
        }
    )
    // 更新代码接口定义
    const {run: updateCustomCodeRun} = useRequest(
        async (response: TCustomEditorCodeGeneral<string>) => {
            await ipcRenderer.invoke("UpdateSnippet", response)
        },
        {
            manual: true,
            onSuccess: () => {
                detailCustomCodeRun()
                setVisibleOpen(false)
                yakitNotify("success", "编辑自定义代码片段组成功")
            },
            onError: (error) => {
                yakitNotify("error", `编辑自定义代码片段组失败：${error}`)
            }
        }
    )

    // 删除自定义代码片段
    const onDelete = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, name: string) => {
        e.stopPropagation()
        runDeleteCode({Filter: {Name: [name]}})
    }

    const onUpdateCustomCode = (name: string) => {
        const transformDetailData = detailCustomCodeData && getAllRows(detailCustomCodeData)
        const targetData = transformDetailData?.find((it) => it.Name === name)
        form.setFieldsValue(targetData)
        stateRef.current = {
            edit: true,
            insert: false,
            previousNameValue: name
        }
        setVisibleOpen(true)
    }

    // 获取 自定义代码片段
    const codeCustomizeTag = useMemo(() => {
        return Array.isArray(detailCustomCodeData?.Names) ? (
            detailCustomCodeData?.Names.map((it) => (
                <YakitTag
                    size='large'
                    key={it}
                    color='main'
                    className={styles["code-tag-containaer"]}
                    onClick={() => onUpdateCustomCode(it)}
                >
                    <YakitSpin spinning={deleteCustomCodeLoading}>
                        <div className={styles["code-tag-content"]}>
                            <div>{it}</div>
                            <div className={styles["close-icon"]} onClick={(e) => onDelete(e, it)}>
                                <OutlineXIcon />
                            </div>
                        </div>
                    </YakitSpin>
                </YakitTag>
            ))
        ) : (
            <></>
        )
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [detailCustomCodeData])

    // 添加 / 编辑 自定义代码片段 func
    const handCodeCustomizeOk = async () => {
        const resultFormValue = await form.validateFields()
        if (stateRef.current.edit) {
            updateCustomCodeRun({
                ...resultFormValue,
                Target: stateRef.current.previousNameValue
            })
        }
        if (stateRef.current.insert) {
            createCustomCodeRun(resultFormValue)
        }
    }

    const codeCustomizeModalVisible = () => {
        setVisibleOpen((val) => !val)
        stateRef.current = {
            edit: false,
            insert: true,
            previousNameValue: stateRef.current.previousNameValue
        }
    }

    return (
        <div className={styles["customizeCode_tags"]}>
            {codeCustomizeTag}
            <YakitButton type={"primary"} onClick={codeCustomizeModalVisible}>
                添加
            </YakitButton>
            <CodeCustomizeModal
                theme={theme}
                form={form}
                visible={visibleOpen}
                onOk={handCodeCustomizeOk}
                title='添加代码片段'
                codeCustomizeModalVisible={codeCustomizeModalVisible}
                confirmLoading={createCustomCodeLoading}
            />
        </div>
    )
}

const CodeCustomizeModal: FC<CodeCustomizeModalProps> = (props) => {
    const {form, theme, visible, title, onOk, codeCustomizeModalVisible, confirmLoading} = props

    const onCancel = () => {
        codeCustomizeModalVisible()
    }

    return (
        <YakitModal
            visible={visible}
            width={600}
            title={title}
            onCancel={onCancel}
            onOk={onOk}
            maskClosable={false}
            afterClose={() => form.resetFields()}
            confirmLoading={confirmLoading}
        >
            <Form labelCol={{span: 5}} wrapperCol={{span: 18}} form={form}>
                <Item
                    label='名称'
                    name='Name'
                    rules={[
                        {required: true, message: "该项为必填"},
                        {max: 50, message: "代码片段名称最多50个字"},
                        {
                            pattern: /^[A-Za-z\p{P}][A-Za-z0-9_\-]*$/u,
                            message: "首字符必须为字母或标点符号，其余只能是字母/数字/下划线/中划线"
                        }
                    ]}
                    tooltip='该名称是自动补全出现的名称，建议用英文'
                >
                    <YakitInput placeholder='请输入' />
                </Item>
                <Item
                    label='使用位置'
                    name='State'
                    rules={[{required: true, message: "该项为必填"}]}
                    tooltip='该代码片段的使用位置,http是指数据包,yak是指yak代码'
                >
                    <YakitSelect placeholder='请选择' options={selectOptions} />
                </Item>
                <Item label='代码类型' name='Level' rules={[{required: true, message: "请选择类型定义"}]} initialValue={'method'}>
                    <YakitSelect options={LevelOptions} placeholder='请选择' />
                </Item>
                <Item label='描述' name='Description' rules={[{max: 200, message: "代码片段描述最多200个字"}]}>
                    <YakitInput placeholder='请输入' />
                </Item>
                <Item noStyle dependencies={["State"]}>
                    {({getFieldValue}) => {
                        const getAddress = getFieldValue("State") || "yak"
                        return (
                            <Item
                                label='代码片段'
                                name='Code'
                                className={styles["customize-code-segmentation-item"]}
                                rules={[{required: true, message: "该项为必填"}]}
                            >
                                <YakitEditor propsTheme={theme} type={getAddress} />
                            </Item>
                        )
                    }}
                </Item>
            </Form>
        </YakitModal>
    )
}

export {CodeCustomize}
