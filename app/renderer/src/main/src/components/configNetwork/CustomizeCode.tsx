import {FC, useMemo} from "react"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {YakitTag} from "../yakitUI/YakitTag/YakitTag"
import {showYakitModal} from "../yakitUI/YakitModal/YakitModalConfirm"
import {Form, FormInstance} from "antd"
import {useForm} from "antd/es/form/Form"
import {YakitInput} from "../yakitUI/YakitInput/YakitInput"
import {YakitSelect} from "../yakitUI/YakitSelect/YakitSelect"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import styles from "./CustomizeCode.module.scss"
import {type Theme, useTheme} from "@/hook/useTheme"

const {Item} = Form

type TCodeCustomizeTagProps = {
    value: string[]
    onChange: (val: TCodeCustomizeTagProps["value"]) => TCodeCustomizeTagProps["value"]
}

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

const CodeCustomize: FC<Partial<TCodeCustomizeTagProps>> = ({value}) => {
    const [form] = useForm()
    const {theme} = useTheme()

    const codeCustomizeTag = useMemo(() => {
        const list = ["数据包", "html模版", "css模版"]
        return (
            Array.isArray(list) &&
            list.map((it) => (
                <YakitTag size='large' key={it} color='main'>
                    {it}
                </YakitTag>
            ))
        )
    }, [value])

    const handCodeCustomizeOk = () => {
        const resultFormValue = form.validateFields()
        console.log(resultFormValue, "value")
    }

    const openCodeCustomizeModal = () => {
        showYakitModal({
            type: "white",
            title: "添加代码片段",
            width: 650,
            content: <CodeCustomizeModal form={form} theme={theme} />,
            onOk: handCodeCustomizeOk,
            onCancel: () => form.resetFields(),
            centered: true,
            destroyOnClose: true,
            maskClosable: false
        })
    }

    return (
        <div>
            {codeCustomizeTag}{" "}
            <YakitButton type={"primary"} onClick={openCodeCustomizeModal}>
                添加
            </YakitButton>
        </div>
    )
}

const CodeCustomizeModal: FC<{form: FormInstance<unknown>; theme: Theme}> = ({form, theme}) => {
    return (
        <Form labelCol={{span: 4}} wrapperCol={{span: 18}} form={form}>
            <Item
                label='名称'
                name='name'
                rules={[{required: true, message: "该项为必填"}]}
                tooltip='该名称是自动补全出现的名称，建议用英文'
            >
                <YakitInput placeholder='请输入' />
            </Item>
            <Item
                label='使用位置'
                name='address'
                rules={[{required: true, message: "该项为必填"}]}
                tooltip='该代码片段的使用位置,http是指数据包,yak是指yak代码'
            >
                <YakitSelect placeholder='请选择' options={selectOptions} />
            </Item>
            <Item label='描述' name='destroy'>
                <YakitInput placeholder='请输入' />
            </Item>
            <Item label='代码片段' name='code' className={styles["customize-code-segmentation-item"]}>
                <YakitEditor
                    propsTheme={theme}
                    type={"yak"}
                    value='akjhdjkahsdjk'
                    // value={packetMode ? dePacketValue : dePayloadValue}
                    // setValue={packetMode ? setDePacketValue : setDePayloadValue}
                />
            </Item>
        </Form>
    )
}

export {CodeCustomize}
