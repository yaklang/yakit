import {InformationCircleIcon, PlayIcon, RemoveIcon} from "@/assets/newIcon"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {randomString} from "@/utils/randomUtil"
import {useMemoizedFn} from "ahooks"
import {Form} from "antd"
import classNames from "classnames"
import React, {CSSProperties, ReactNode, useEffect, useState} from "react"
import styles from "./ScrecorderModal.module.scss"
import {Screen_Recorder_Framerate,Screen_Recorder_CoefficientPTS} from "./ScreenRecorderList"

const {ipcRenderer} = window.require("electron")

interface ScrecorderModalProp {
    onClose: () => void
    token: string
    onStartCallback: () => void
    formStyle?: CSSProperties
    footer?: ReactNode
    disabled?: boolean
}

export interface StartScrecorderParams {
    Framerate: string
    ResolutionSize: string
    CoefficientPTS: number
    DisableMouse: boolean
}

export const FramerateData = [
    {
        value: "3",
        label: "3fps"
    },
    {
        value: "5",
        label: "5fps"
    },
    {
        value: "7",
        label: "7fps(推荐)"
    },
    {
        value: "10",
        label: "10fps"
    },
    {
        value: "15",
        label: "15fps"
    },
    {
        value: "20",
        label: "20fps"
    },
    {
        value: "25",
        label: "25fps"
    },
    {
        value: "30",
        label: "30fps"
    }
]

export const CoefficientPTSData = [
    {
        value: 1,
        label: "X1：1倍速"
    },
    {
        value: 0.33,
        label: "X3：3倍速"
    },
    {
        value: 0.2,
        label: "X5：5倍速"
    },
]

export const ScrecorderModal: React.FC<ScrecorderModalProp> = React.memo((props) => {
    const {onClose, token, onStartCallback, formStyle, footer, disabled} = props
    const [params, setParams] = useState<StartScrecorderParams>({
        CoefficientPTS: 1,
        DisableMouse: true, // 鼠标捕捉
        Framerate: "7", // 帧率
        ResolutionSize: "" // 分辨率
    })
    const [form] = Form.useForm()
    useEffect(() => {
        getRemoteValue(Screen_Recorder_Framerate).then((val) => {
            form.setFieldsValue({
                Framerate: val || "7"
            })
        })
        getRemoteValue(Screen_Recorder_CoefficientPTS).then((val) => {
            form.setFieldsValue({
                CoefficientPTS: +val || 1
            })
        })
    }, [])

    const onStart = useMemoizedFn((v) => {
        const newValue = {
            ...params,
            ...v,
            DisableMouse: !v.DisableMouse
        }
        setRemoteValue(Screen_Recorder_Framerate, newValue.Framerate)
        setRemoteValue(Screen_Recorder_CoefficientPTS, newValue.CoefficientPTS)
        ipcRenderer.invoke("StartScrecorder", newValue, token).then(() => {
            onStartCallback()
        })
    })
    return (
        <div className={styles["screcorder-modal-content"]}>
            <div className={classNames(styles["tip"])}>
                本录屏在 Windows 下，会同时录制所有屏幕，合并在一个文件中；在 MacOS 下多屏会生成多个文件
            </div>
            <Form
                layout='vertical'
                style={{padding: "16px 24px 24px", ...formStyle}}
                initialValues={{...params}}
                onFinish={(v) => {
                    onStart(v)
                }}
                form={form}
            >
                <Form.Item
                    label='帧率'
                    help='渗透测试过程记录推荐使用低帧率（5fps 以下）以免 CPU 占用过高'
                    tooltip={{
                        title: "帧率即每秒截屏次数",
                        icon: <InformationCircleIcon style={{cursor: "auto"}} />
                    }}
                    name='Framerate'
                >
                    <YakitSelect options={FramerateData} disabled={disabled} />
                </Form.Item>
                <Form.Item
                    label='倍速'
                    help='直接录制倍速视频，免视频后期处理'
                    name='CoefficientPTS'
                >
                    <YakitSelect options={CoefficientPTSData} disabled={disabled} />
                </Form.Item>
                <div className={styles["disable-mouse"]}>
                    <Form.Item noStyle valuePropName='checked' name='DisableMouse'>
                        <YakitSwitch size='large' disabled={disabled} />
                    </Form.Item>
                    鼠标捕捉
                </div>
                {footer ? (
                    footer
                ) : (
                    <div className={styles["footer-btns"]}>
                        <YakitButton type='outline2' size='large' onClick={() => onClose()}>
                            取消
                        </YakitButton>
                        <YakitButton htmlType='submit' type='primary' size='large'>
                            <PlayIcon style={{height: 16}} />
                            开始录屏
                        </YakitButton>
                    </div>
                )}
            </Form>
        </div>
    )
})
