import React, {useEffect, useRef, useState} from "react"
import {Form} from "antd"
import {useCreation, useMemoizedFn} from "ahooks"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import styles from "./AIStartModelForm.module.scss"
import {ExecResult} from "@/pages/invoker/schema"
import {yakitNotify} from "@/utils/notification"
import {grpcCancelStartLocalModel, grpcStartLocalModel} from "../utils"
import {StartLocalModelRequest} from "../../type/aiChat"
import {AIStartModelFormProps} from "./AIStartModelFormType"

const {ipcRenderer} = window.require("electron")

export const AIStartModelForm: React.FC<AIStartModelFormProps> = React.memo((props) => {
    const {item, token, onSuccess} = props
    const [loading, setLoading] = useState(false)
    const hasErrorRef = useRef<boolean>(false)
    useEffect(() => {
        ipcRenderer.on(`${token}-data`, async (e, data: ExecResult) => {})
        ipcRenderer.on(`${token}-error`, (e, error) => {
            yakitNotify("error", `[StartLocalModel] error: ${error}`)
            hasErrorRef.current = true
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            if (!hasErrorRef.current) {
                onSuccess()
            }
            setLoading(false)
            // 模型运行结束
            yakitNotify("info", `模型 ${item.Name} 运行结束`)
        })
        return () => {
            // 只清理事件监听器，不取消模型启动
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [])

    const handleSubmit = useMemoizedFn((value: Omit<StartLocalModelRequest, "token">) => {
        const params: StartLocalModelRequest = {
            ...value,
            token
        }
        grpcStartLocalModel(params).then(() => {
            setLoading(true)
        })
    })
    const onCancel = useMemoizedFn(() => {
        grpcCancelStartLocalModel(token)
    })
    const initialValues = useCreation(() => {
        return {
            ModelName: item.Name,
            Host: "127.0.0.1",
            Port: item.DefaultPort || 8080
        }
    }, [])
    return (
        <div className={styles["ai-start-model-form"]}>
            <Form labelCol={{span: 6}} wrapperCol={{span: 18}} onFinish={handleSubmit} initialValues={initialValues}>
                <Form.Item label='模型名称' name='ModelName'>
                    <YakitInput disabled />
                </Form.Item>

                <Form.Item label='主机地址' name='Host'>
                    <YakitInput />
                </Form.Item>

                <Form.Item label='端口' name='Port'>
                    <YakitInputNumber min={1} max={65535} />
                </Form.Item>

                <Form.Item colon={false} label=' '>
                    <div className={styles["button-group"]}>
                        <YakitButton type='primary' htmlType='submit' loading={loading}>
                            启动模型
                        </YakitButton>
                        {loading && (
                            <YakitButton type='outline1' onClick={onCancel}>
                                取消
                            </YakitButton>
                        )}
                    </div>
                </Form.Item>
            </Form>
        </div>
    )
})
