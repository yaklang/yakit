import React, {type FC} from "react"

import {useUpdateEffect} from "ahooks"
import {Collapse, Form} from "antd"

import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"

import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitFormDragger} from "@/components/yakitUI/YakitForm/YakitForm"

import type {FormInstance} from "antd/es/form/Form"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import styles from "../knowledgeBase.module.scss"
import {extractFileName, knowledgeTypeOptions} from "../utils"
import {useKnowledgeBase} from "../hooks/useKnowledgeBase"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"

const CreateKnowledgeBase: FC<{form: FormInstance<any>; type?: "new"}> = ({form, type}) => {
    const {knowledgeBases} = useKnowledgeBase()
    const KnowledgeBaseFileValue = Form.useWatch("KnowledgeBaseFile", form)

    useUpdateEffect(() => {
        const result = KnowledgeBaseFileValue
            ? KnowledgeBaseFileValue.split(/[/\\]/) // 按 / 或 \ 分割
                  .pop()! // 最后一个就是文件名 + 扩展名
                  .replace(/\.[^/.]+$/, "") // 去掉扩展名
            : undefined
        const getKnowledgeBaseName = form.getFieldValue("KnowledgeBaseName")
        if (result && (!getKnowledgeBaseName || getKnowledgeBaseName?.trim() === "")) {
            form.setFieldsValue({KnowledgeBaseName: result})
        }
    }, [KnowledgeBaseFileValue])

    return (
        <Form
            form={form}
            layout='vertical'
            className={styles["create-knowledge-from"]}
            initialValues={{disableERM: false}}
            onValuesChange={(changedValues) => {
                if (changedValues.importPath) {
                    const fileName = extractFileName(changedValues.importPath)
                    form.setFieldsValue({knowledgeBaseName: fileName})
                }
            }}
        >
            <Form.Item
                label='知识库名：'
                name='KnowledgeBaseName'
                required
                rules={[
                    {
                        validator: (_, value) => {
                            if (!value || value.trim() === "") {
                                return Promise.reject(new Error("请输入知识库名"))
                            }
                            if (type !== "new") {
                                const exists = knowledgeBases.some((it) => it.KnowledgeBaseName === value)
                                if (exists) {
                                    return Promise.reject(new Error("知识库名称重复，请重新输入"))
                                }
                            }

                            return Promise.resolve()
                        }
                    }
                ]}
            >
                <YakitInput placeholder='请输入知识库名' />
            </Form.Item>

            <YakitFormDragger
                formItemProps={{
                    name: "KnowledgeBaseFile",
                    label: "上传文件",
                    rules: [
                        {
                            validator: (_, value) => {
                                if (value) {
                                    // 多个文件用逗号分隔
                                    const files = value.split(",").map((i) => i.trim())

                                    // 校验格式：必须有文件名 + 后缀
                                    const reg = /^[^.\/]+?\.[^.\/]+$/

                                    for (const file of files) {
                                        // 取文件名 (兼容 windows、mac 路径)
                                        const fileName = file.split("/").pop()?.split("\\").pop()

                                        if (!fileName || !reg.test(fileName)) {
                                            return Promise.reject("请上传有效的文件")
                                        }
                                    }

                                    return Promise.resolve()
                                } else {
                                    return Promise.resolve()
                                }
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

            <Form.Item label='Tags：' name='Tags'>
                <YakitSelect mode='tags' placeholder='请选择' options={knowledgeTypeOptions} />
            </Form.Item>
            {type === "new" ? (
                <React.Fragment>
                    <Form.Item label='补充提示词：' name='prompt'>
                        <YakitInput placeholder='请输入补充提示词' />
                    </Form.Item>
                    <Form.Item
                        label='描述：'
                        name='KnowledgeBaseDescription'
                        rules={[{max: 500, message: "描述最多 500 个字符"}]}
                    >
                        <YakitInput.TextArea maxLength={500} placeholder='请输入描述' rows={3} showCount />
                    </Form.Item>
                    <Form.Item label='仅构建知识' name='disableERM' valuePropName='checked'>
                        <YakitSwitch />
                    </Form.Item>
                    <Form.Item label='知识条目长度限制' name='KnowledgeBaseLength' initialValue={300}>
                        <YakitInputNumber />
                    </Form.Item>
                </React.Fragment>
            ) : (
                <YakitCollapse bordered={false} className={styles["create-knowledge-configuration"]}>
                    <Collapse.Panel header='高级配置' key='1'>
                        <Form.Item label='补充提示词：' name='prompt'>
                            <YakitInput placeholder='请输入补充提示词' />
                        </Form.Item>
                        <Form.Item
                            label='描述：'
                            name='KnowledgeBaseDescription'
                            rules={[{max: 500, message: "描述最多 500 个字符"}]}
                        >
                            <YakitInput.TextArea maxLength={500} placeholder='请输入描述' rows={3} showCount />
                        </Form.Item>
                        <Form.Item label='仅构建知识' name='disableERM' valuePropName='checked'>
                            <YakitSwitch />
                        </Form.Item>
                        <Form.Item label='知识条目长度限制' name='KnowledgeBaseLength' initialValue={300}>
                            <YakitInputNumber />
                        </Form.Item>
                    </Collapse.Panel>
                </YakitCollapse>
            )}
        </Form>
    )
}

export {CreateKnowledgeBase}
