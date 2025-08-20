import React, {useEffect, useRef, useState} from "react"
import {Form} from "antd"
import {useCreation, useMemoizedFn} from "ahooks"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import styles from "./AIStartModelForm.module.scss"
import {yakitNotify} from "@/utils/notification"
import {grpcStartLocalModel} from "../utils"
import {StartLocalModelRequest} from "../../type/aiChat"
import {AIStartModelFormProps} from "./AIStartModelFormType"

const {ipcRenderer} = window.require("electron")

export const AIStartModelForm: React.FC<AIStartModelFormProps> = React.memo((props) => {
    const {item, token, onSuccess} = props
    const [loading, setLoading] = useState(false)
    const hasErrorRef = useRef<boolean>(false)
    const [form] = Form.useForm<Omit<StartLocalModelRequest, "token">>()
    useEffect(() => {
        ipcRenderer.on(`${token}-error`, (e, error) => {
            yakitNotify("error", `[StartLocalModel] error: ${error}`)
            hasErrorRef.current = true
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            if (!hasErrorRef.current) {
                onSuccess()
            }
            hasErrorRef.current = false
            setLoading(false)
        })
        return () => {
            // 只清理事件监听器，不取消模型启动
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [])

    const handleSubmit = useMemoizedFn(() => {
        form.validateFields().then((value: Omit<StartLocalModelRequest, "token">) => {
            const params: StartLocalModelRequest = {
                ...value,
                token
            }
            grpcStartLocalModel(params).then(() => {
                setLoading(true)
            })
        })
    })
    const initialValues = useCreation(() => {
        return {
            ModelName: item.Name,
            Host: "127.0.0.1",
            Port: item.DefaultPort || 8080
        }
    }, [])
    return (
        <div>
            <Form
                form={form}
                labelCol={{span: 6}}
                wrapperCol={{span: 16}}
                initialValues={initialValues}
                className={styles["ai-start-model-form"]}
            >
                <Form.Item label='模型名称' name='ModelName'>
                    <YakitInput disabled />
                </Form.Item>

                <Form.Item label='主机地址' name='Host'>
                    <YakitInput />
                </Form.Item>

                <Form.Item label='端口' name='Port'>
                    <YakitInputNumber min={1} max={65535} />
                </Form.Item>
            </Form>
            <div className={styles["button-group"]}>
                <YakitButton type='primary' htmlType='submit' loading={loading} onClick={handleSubmit}>
                    立即启动
                </YakitButton>
            </div>
        </div>
    )
})
