import { FC, useEffect, useMemo } from "react"
import { Form, Spin } from "antd"
import { useForm } from "antd/es/form/Form"
import { useRequest, useSafeState } from "ahooks"

import { YakitButton } from "../yakitUI/YakitButton/YakitButton"
import { YakitTag } from "../yakitUI/YakitTag/YakitTag"
import { YakitInput } from "../yakitUI/YakitInput/YakitInput"
import { YakitSelect } from "../yakitUI/YakitSelect/YakitSelect"
import { YakitEditor } from "@/components/yakitUI/YakitEditor/YakitEditor"
import styles from "./CustomizeCode.module.scss"
import { useTheme } from "@/hook/useTheme"
import { YakitModal } from "../yakitUI/YakitModal/YakitModal"
import { yakitNotify } from "@/utils/notification"
import type {
    CodeCustomizeModalProps,
    TCodeCustomizeTagProps,
    TCustomCodeGeneral,
    TQueryCustomCodeRequest
} from "./CustomizeCodeTypes"
import { YakitSpin } from "../yakitUI/YakitSpin/YakitSpin"
import form from "antd/lib/form"
import { OutlineXIcon } from "@/assets/icon/outline"

const { ipcRenderer } = window.require("electron")

const { Item } = Form

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

const CodeCustomize: FC<Partial<TCodeCustomizeTagProps>> = ({ value }) => {
    const [form] = useForm()
    const { theme } = useTheme()

    const [visibleOpen, setVisibleOpen] = useSafeState(false)
    const [submitStatus, setSubmitStatus] = useSafeState(false)

    // 获取代码接口定义
    const { data, run } = useRequest(
        async () => {
            const result: TCustomCodeGeneral<string[]> = await ipcRenderer.invoke("QueryCustomCode", { Filter: {} })
            const { Names } = result
            return Names
        },
        {
            manual: true,
            onError: (err) => {
                yakitNotify("error", `获取自定义代码片段组失败：${err}`)
            }
        }
    )

    // 删除代码接口定义
    const { run: runDeleteCode, loading } = useRequest(
        async (response: TQueryCustomCodeRequest) => {
            console.log(response, "response")
            await ipcRenderer.invoke("DeleteCustomCode", response)
        },
        {
            manual: true,
            onSuccess: () => {
                run()
                yakitNotify("success", "删除自定义代码片段成功")
            },
            onError: (error) => {
                run()
                yakitNotify("error", `删除自定义代码片段失败：${error}`)
            }
        }
    )

    useEffect(() => {
        run()
    }, [])

    // 删除自定义代码片段
    const onDelete = (name: string) => {
        runDeleteCode({ Filter: { Name: [name] } })
    }

    // 获取 自定义代码片段
    const codeCustomizeTag = useMemo(() => {
        return Array.isArray(data) ? (
            data.map((it) => (
                <YakitTag size='large' key={it} color='main'>
                    <YakitSpin spinning={loading}>
                        <div className={styles["code-tag"]}>
                            <div> {it}</div>
                            <div className={styles["close-icon"]} onClick={() => onDelete(it)}>
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
    }, [data])

    const handCodeCustomizeOk = async () => {
        setSubmitStatus(true)
        const resultFormValue = await form.validateFields()
        ipcRenderer
            .invoke("CreateCustomCode", resultFormValue as TCustomCodeGeneral<string>)
            .then(() => {
                yakitNotify("success", "添加自定义代码片段组成功")
                run()
                setVisibleOpen(false)
            })
            .catch((err) => {
                yakitNotify("error", `添加自定义代码片段组失败：${err}`)
            })
            .finally(() => {
                setSubmitStatus(false)
            })
    }

    const codeCustomizeModalVisible = () => setVisibleOpen((val) => !val)

    return (
        <div>
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
                submitStatus={submitStatus}
            />
        </div>
    )
}

const CodeCustomizeModal: FC<CodeCustomizeModalProps> = (props) => {
    const { form, theme, visible, title, onOk, codeCustomizeModalVisible, submitStatus } = props

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
            confirmLoading={submitStatus}
        >
            <Form labelCol={{ span: 5 }} wrapperCol={{ span: 18 }} form={form}>
                <Item
                    label='名称'
                    name='Name'
                    rules={[{ required: true, message: "该项为必填" }]}
                    tooltip='该名称是自动补全出现的名称，建议用英文'
                >
                    <YakitInput placeholder='请输入' />
                </Item>
                <Item
                    label='使用位置'
                    name='State'
                    rules={[{ required: true, message: "该项为必填" }]}
                    tooltip='该代码片段的使用位置,http是指数据包,yak是指yak代码'
                >
                    <YakitSelect placeholder='请选择' options={selectOptions} />
                </Item>
                <Item label='描述' name='Description'>
                    <YakitInput placeholder='请输入' />
                </Item>
                <Item noStyle dependencies={["State"]}>
                    {({ getFieldValue }) => {
                        const getAddress = getFieldValue("State") || "yak"
                        return (
                            <Item label='代码片段' name='Code' className={styles["customize-code-segmentation-item"]}>
                                <YakitEditor propsTheme={theme} type={getAddress} />
                            </Item>
                        )
                    }}
                </Item>
            </Form>
        </YakitModal>
    )
}

export { CodeCustomize }
