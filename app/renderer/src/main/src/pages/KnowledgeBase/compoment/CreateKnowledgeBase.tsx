import {type FC} from "react"

import {useRequest, useUpdateEffect} from "ahooks"
import {Form} from "antd"

import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {failed} from "@/utils/notification"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"

import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitFormDragger} from "@/components/yakitUI/YakitForm/YakitForm"

import type {FormInstance} from "antd/es/form/Form"

const {ipcRenderer} = window.require("electron")

const CreateKnowledgeBase: FC<{form: FormInstance<any>}> = ({form}) => {
    const KnowledgeBaseFileValue = Form.useWatch("KnowledgeBaseFile", form)

    const {data, loading} = useRequest(
        async () => {
            const result = await ipcRenderer.invoke("GetKnowledgeBaseTypeList")
            if (result?.KnowledgeBaseTypes?.length > 0) {
                form.setFieldsValue({KnowledgeBaseType: result?.KnowledgeBaseTypes?.[0]?.Name})
            }
            return result?.KnowledgeBaseTypes?.map((it) => ({
                value: it?.Name,
                label: it?.Name
            }))
        },
        {
            onError: (error) => failed(`获取知识库类型失败: ${error}`)
        }
    )

    useUpdateEffect(() => {
        const result = KnowledgeBaseFileValue
            ? KnowledgeBaseFileValue.split(/[/\\]/) // 按 / 或 \ 分割
                  .pop()! // 最后一个就是文件名 + 扩展名
                  .replace(/\.[^/.]+$/, "") // 去掉扩展名
            : undefined

        if (result) {
            form.setFieldsValue({KnowledgeBaseName: result})
        }
    }, [KnowledgeBaseFileValue])

    return (
        <Form form={form} layout='vertical'>
            <YakitSpin spinning={loading}>
                <YakitFormDragger
                    formItemProps={{
                        name: "KnowledgeBaseFile",
                        label: "上传文件",
                        rules: [
                            {
                                validator: (_, value) => {
                                    if (!value) {
                                        return Promise.reject("请上传文件")
                                    }

                                    // 必须包含点，且不能是 ".xxx"
                                    // 主文件名 (点前) 至少 1 个字符
                                    const reg = /^[^.]+\.[^.]+$/

                                    if (!reg.test(value)) {
                                        return Promise.reject("请上传有效的文件")
                                    }

                                    return Promise.resolve()
                                }
                            }
                        ]
                    }}
                    renderType='textarea'
                    textareaProps={{
                        rows: 3
                    }}
                    size='large'
                    help='可将文件拖入框内或'
                    selectType='file'
                    multiple={true}
                />

                <Form.Item
                    label='知识库名：'
                    name='KnowledgeBaseName'
                    rules={[
                        {required: true, message: "请输入知识库名"},
                        {
                            validator: (_, value) => {
                                if (typeof value === "string" && value.trim() === "") {
                                    return Promise.reject(new Error("知识库名不能为空字符串"))
                                }
                                return Promise.resolve()
                            }
                        }
                    ]}
                >
                    <YakitInput placeholder='请输入知识库名' />
                </Form.Item>

                <Form.Item
                    label='知识库类型：'
                    name='KnowledgeBaseType'
                    rules={[{required: true, message: "请输入知识库类型"}]}
                >
                    <YakitSelect options={data} placeholder='请选择' />
                </Form.Item>
                <Form.Item
                    label='补充提示词：'
                    name='KnowledgeBaseDescription'
                    rules={[{max: 500, message: "描述最多 500 个字符"}]}
                >
                    <YakitInput.TextArea maxLength={500} placeholder='请输入补充提示词' rows={3} showCount />
                </Form.Item>
                <Form.Item label='知识条目长度限制' name='KnowledgeBaseLength' initialValue={1000}>
                    <YakitInputNumber />
                </Form.Item>
            </YakitSpin>
        </Form>
    )
}

export {CreateKnowledgeBase}
