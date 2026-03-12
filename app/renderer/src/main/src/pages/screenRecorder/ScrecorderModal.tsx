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
import {Screen_Recorder_Framerate, Screen_Recorder_CoefficientPTS} from "./ScreenRecorderList"

import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

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

export const FramerateData = (t: any) => [
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
        label: `7fps(${t("ScrecorderModal.recommended")})`
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

export const CoefficientPTSData = (t: any) => [
    {
        value: 1,
        label: `X1：1${t("ScrecorderModal.speed")}`
    },
    {
        value: 0.33,
        label: `X3：3${t("ScrecorderModal.speed")}`
    },
    {
        value: 0.2,
        label: `X5：5${t("ScrecorderModal.speed")}`
    }
]

export const ScrecorderModal: React.FC<ScrecorderModalProp> = React.memo((props) => {
    const {t} = useI18nNamespaces(["screenRecorder", "yakitUi"])
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
            <div className={classNames(styles["tip"])}>{t("ScrecorderModal.screenRecorderDesc")}</div>
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
                    label={t("ScrecorderModal.framerate")}
                    help={t("ScrecorderModal.framerateHelp")}
                    tooltip={{
                        title: t("ScrecorderModal.framerateTooltip"),
                        icon: <InformationCircleIcon style={{cursor: "auto"}} />
                    }}
                    name='Framerate'
                >
                    <YakitSelect options={FramerateData(t)} disabled={disabled} />
                </Form.Item>
                <Form.Item
                    label={t("ScrecorderModal.speed")}
                    help={t("ScrecorderModal.speedHelp")}
                    name='CoefficientPTS'
                >
                    <YakitSelect options={CoefficientPTSData(t)} disabled={disabled} />
                </Form.Item>
                <div className={styles["disable-mouse"]}>
                    <Form.Item noStyle valuePropName='checked' name='DisableMouse'>
                        <YakitSwitch size='large' disabled={disabled} />
                    </Form.Item>
                    {t("ScrecorderModal.mouseCapture")}
                </div>
                {footer ? (
                    footer
                ) : (
                    <div className={styles["footer-btns"]}>
                        <YakitButton type='outline2' size='large' onClick={() => onClose()}>
                            {t("YakitButton.cancel")}
                        </YakitButton>
                        <YakitButton htmlType='submit' type='primary' size='large'>
                            <PlayIcon style={{height: 16}} />
                            {t("ScrecorderModal.startRecording")}
                        </YakitButton>
                    </div>
                )}
            </Form>
        </div>
    )
})
