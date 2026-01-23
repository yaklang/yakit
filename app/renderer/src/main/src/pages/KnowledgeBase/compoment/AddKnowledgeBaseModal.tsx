import {YakitFormDragger} from "@/components/yakitUI/YakitForm/YakitForm"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {Collapse, Form} from "antd"
import {Dispatch, FC, SetStateAction} from "react"
import {getFileInfoList} from "../utils"
import {randomString} from "@/utils/randomUtil"
import {useKnowledgeBase} from "../hooks/useKnowledgeBase"
import {success} from "@/utils/notification"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import styles from "../knowledgeBase.module.scss"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"

interface AddKnowledgeBaseModalProps {
    addModalData: {visible: boolean; KnowledgeBaseName: string}
    setAddModalData: Dispatch<
        SetStateAction<{
            visible: boolean
            KnowledgeBaseName: string
        }>
    >
    addManuallyItem?: boolean
}

const AddKnowledgeBaseModal: FC<AddKnowledgeBaseModalProps> = ({
    addModalData,
    setAddModalData,
    addManuallyItem = true
}) => {
    const [form] = Form.useForm()
    const {editKnowledgeBase, knowledgeBases} = useKnowledgeBase()
    const watchDisableERM = Form.useWatch("disableERM", form)

    const onOk = async () => {
        const findKnowledgeBase = knowledgeBases.find((it) => it.KnowledgeBaseName === addModalData.KnowledgeBaseName)
        const resultFormData = await form.validateFields()
        const file = getFileInfoList(resultFormData.KnowledgeBaseFile)

        const streamToken = randomString(50)
        const transformFormData = {
            ...resultFormData,
            ...findKnowledgeBase,
            KnowledgeBaseLength: resultFormData.KnowledgeBaseLength,
            KnowledgeBaseFile: file,
            streamToken,
            streamstep: 1,
            addManuallyItem,
            historyGenerateKnowledgeList: []
        }
        if (findKnowledgeBase?.ID) {
            editKnowledgeBase(findKnowledgeBase?.ID, transformFormData)
            setAddModalData({
                visible: false,
                KnowledgeBaseName: ""
            })
            form.resetFields()
            success("添加知识成功")
        }
    }
    const onCancel = () => {
        form.resetFields()
        setAddModalData({visible: false, KnowledgeBaseName: ""})
    }
    return (
        <YakitModal
            title='添加'
            visible={addModalData.visible}
            onCancel={onCancel}
            onOk={onOk}
            className={styles["create-knowledge-from"]}
        >
            <Form
                form={form}
                layout='vertical'
                initialValues={{disableERM: "true"}}
                className={styles["create-knowledge-from-container"]}
            >
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
                                }
                            }
                        ]
                    }}
                    renderType='textarea'
                    textareaProps={{
                        rows: 2
                    }}
                    size='large'
                    help='可将文件拖入框内或'
                    selectType='file'
                    multiple={true}
                />
                <Form.Item
                    label='构建模式'
                    name='disableERM'
                    help={
                        watchDisableERM === "true"
                            ? "仅存储知识和向量，不会存储实体，构建速度更快"
                            : "会存储实体、知识和向量全部内容，构建速度较慢"
                    }
                >
                    <YakitRadioButtons
                        size='middle'
                        buttonStyle='solid'
                        options={[
                            {
                                value: "false",
                                label: "增强知识图谱索引"
                            },
                            {
                                value: "true",
                                label: "仅构建知识索引"
                            }
                        ]}
                    />
                </Form.Item>

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
                            <YakitInput.TextArea maxLength={500} placeholder='请输入描述' rows={2} showCount />
                        </Form.Item>

                        <Form.Item label='知识条目长度限制：' name='KnowledgeBaseLength' initialValue={300}>
                            <YakitInputNumber />
                        </Form.Item>
                        <Form.Item label='分析并发数：' name='concurrency' initialValue={10}>
                            <YakitInputNumber />
                        </Form.Item>

                        <Form.Item label='切片粒度：' name='chunk' initialValue={"Medium"}>
                            <YakitSelect
                                options={[
                                    {
                                        label: "超细粒度 4k",
                                        value: "UltraFine"
                                    },
                                    {
                                        label: "细粒度 10k",
                                        value: "Fine"
                                    },
                                    {
                                        label: "中粒度 20k",
                                        value: "Medium"
                                    },
                                    {
                                        label: "粗粒度 40k",
                                        value: "Coarse"
                                    }
                                ]}
                            />
                        </Form.Item>
                    </Collapse.Panel>
                </YakitCollapse>
            </Form>
        </YakitModal>
    )
}

export {AddKnowledgeBaseModal}
