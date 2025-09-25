import {TrashIcon, PlusIcon} from "@/assets/newIcon"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {useUpdateEffect} from "ahooks"
import {Form, InputNumber, Space} from "antd"
import {FC} from "react"

interface TKnowledgeModalVisibleProps {
    knowledgeModalData: {data: {}; visible: boolean}
    setKnowledgeModalData: (value: {data: {}; visible: boolean}) => void
}

const KnowledgeModalVisible: FC<TKnowledgeModalVisibleProps> = ({knowledgeModalData, setKnowledgeModalData}) => {
    const [form] = Form.useForm()
    useUpdateEffect(() => {
        form.setFieldsValue(knowledgeModalData.data)
    }, [knowledgeModalData.visible])
    return (
        <YakitModal
            // getContainer={document.getElementById("repository-manage") || document.body}
            title='编辑知识条目'
            visible={knowledgeModalData.visible}
            maskClosable={false}
            onCancel={() => {
                form.resetFields()
                setKnowledgeModalData({
                    data: {},
                    visible: false
                })
            }}
            // onOk={handleSubmit}
            width={800}
            okText='确认'
            cancelText='取消'
        >
            <Form form={form} labelCol={{span: 3}} style={{maxHeight: "65vh", overflow: "auto"}}>
                <Form.Item label='知识标题' name='KnowledgeTitle' rules={[{required: true, message: "请输入知识标题"}]}>
                    <YakitInput placeholder='请输入知识标题' />
                </Form.Item>

                <Form.Item
                    label='知识详情'
                    name='KnowledgeDetails'
                    rules={[{required: true, message: "请输入知识详情"}]}
                >
                    <YakitInput.TextArea placeholder='请输入知识详情' rows={6} maxLength={5000} showCount />
                </Form.Item>

                <Form.Item
                    label='知识类型'
                    name='KnowledgeType'
                    rules={[{required: true, message: "请输入知识类型"}]}
                    style={{marginTop: 24}}
                >
                    <YakitInput placeholder='请输入知识类型' />
                </Form.Item>

                <Form.Item
                    label='重要度评分'
                    name='ImportanceScore'
                    rules={[{required: true, message: "请输入重要度评分"}]}
                >
                    <InputNumber min={1} max={10} style={{width: "100%"}} />
                </Form.Item>

                <Form.Item label='关键词' name='Keywords'>
                    <Form.List name='Keywords'>
                        {(fields, {add, remove}) => (
                            <>
                                {fields.map(({key, name, ...restField}) => (
                                    <Space key={key} style={{display: "flex", marginBottom: 8}} align='baseline'>
                                        <Form.Item {...restField} name={[name]} style={{marginBottom: 0, flex: 1}}>
                                            <YakitInput placeholder='请输入关键词' />
                                        </Form.Item>
                                        <YakitButton
                                            type='text2'
                                            colors='danger'
                                            icon={<TrashIcon />}
                                            onClick={() => remove(name)}
                                        />
                                    </Space>
                                ))}
                                <YakitButton type='outline1' onClick={() => add()} icon={<PlusIcon />}>
                                    添加关键词
                                </YakitButton>
                            </>
                        )}
                    </Form.List>
                </Form.Item>

                <Form.Item label='摘要' name='Summary'>
                    <YakitInput.TextArea placeholder='请输入摘要' rows={3} maxLength={500} showCount />
                </Form.Item>

                <Form.Item label='潜在问题' name='PotentialQuestions'>
                    <Form.List name='PotentialQuestions'>
                        {(fields, {add, remove}) => (
                            <>
                                {fields.map(({key, name, ...restField}) => (
                                    <Space key={key} style={{display: "flex", marginBottom: 8}} align='baseline'>
                                        <Form.Item {...restField} name={[name]} style={{marginBottom: 0, flex: 1}}>
                                            <YakitInput placeholder='请输入潜在问题' />
                                        </Form.Item>
                                        <YakitButton
                                            type='text2'
                                            colors='danger'
                                            icon={<TrashIcon />}
                                            onClick={() => remove(name)}
                                        />
                                    </Space>
                                ))}
                                <YakitButton type='outline1' onClick={() => add()} icon={<PlusIcon />}>
                                    添加问题
                                </YakitButton>
                            </>
                        )}
                    </Form.List>
                </Form.Item>
            </Form>
        </YakitModal>
    )
}

export {KnowledgeModalVisible}
