import React, {CSSProperties, ReactNode, useEffect, useState} from "react"
import {Modal, ModalProps} from "antd"
import style from "./YakitModalConfirm.module.scss"
import {YakitButton, YakitButtonProp} from "../YakitButton/YakitButton"
import {RemoveIcon} from "@/assets/newIcon"
import {showModal, ShowModalProps} from "@/utils/showModal"
import ReactDOM from "react-dom"
import {YakitModal} from "./YakitModal"
import {ErrorBoundary} from "react-error-boundary"
import {ExclamationCircleOutlined} from "@ant-design/icons"

export interface YakitModalConfirmProps extends YakitBaseModalProp {
    title?: React.ReactNode | string
    content?: React.ReactNode | string
    modalAfterClose?: () => any
    onOk?: () => any
    onCancel?: () => any
    onOkText?: string
    onCancelText?: string
    showConfirmLoading?: boolean
}
export const YakitModalConfirm = (props: YakitModalConfirmProps) => {
    const div = document.createElement("div")
    document.body.appendChild(div)
    let setter: (r: boolean) => any = () => {}

    const render = (targetConfig: ShowModalProps) => {
        setTimeout(() => {
            ReactDOM.render(
                <>
                    <YakitBaseModal
                        {...(targetConfig as ModalProps)}
                        onVisibleSetter={(r) => {
                            setter = r
                        }}
                        afterClose={() => {
                            if (props.modalAfterClose) props.modalAfterClose()
                            const unmountResult = ReactDOM.unmountComponentAtNode(div)
                            if (unmountResult && div.parentNode) {
                                div.parentNode.removeChild(div)
                            }
                        }}
                        title={null}
                    >
                        <ErrorBoundary
                            FallbackComponent={({error, resetErrorBoundary}) => {
                                if (!error) {
                                    return <div>未知错误</div>
                                }
                                return (
                                    <div>
                                        <p>弹框内逻辑性崩溃，请关闭重试！</p>
                                        <pre>{error?.message}</pre>
                                    </div>
                                )
                            }}
                        >
                            <div className={style["modal-content-warp"]}>
                                <div className={style["down-modal"]}>
                                    <div className={style["down-modal-heard"]}>
                                        <ExclamationCircleOutlined className={style["modal-icon"]} />
                                        <div>
                                            {props.title && (
                                                <>
                                                    {(typeof props.title === "string" && (
                                                        <div className={style["modal-title"]}>{props.title}</div>
                                                    )) ||
                                                        props.title}
                                                </>
                                            )}
                                            {props.content && (
                                                <>
                                                    {(typeof props.content === "string" && (
                                                        <div className={style["modal-content"]}>{props.content}</div>
                                                    )) ||
                                                        props.content}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ErrorBoundary>
                    </YakitBaseModal>
                </>,
                div
            )
        })
    }
    render(props)
    return {
        destroy: () => {
            if (setter) {
                setter(false)
            }
            setTimeout(() => {
                const unmountResult = ReactDOM.unmountComponentAtNode(div)
                if (unmountResult && div.parentNode) {
                    div.parentNode.removeChild(div)
                }
            }, 400)
        }
    }
}

interface YakitBaseModalProp
    extends Omit<ModalProps, "cancelButtonProps" | "okButtonProps" | "okType">,
        React.ComponentProps<any> {
    onVisibleSetter?: (setter: (i: boolean) => any) => any
    showConfirmLoading?: boolean
}

const YakitBaseModal: React.FC<YakitBaseModalProp> = (props) => {
    const [visible, setVisible] = useState<boolean>(true)
    const [loading, setLoading] = useState<boolean>(false)

    useEffect(() => {
        if (visible && props.onVisibleSetter) {
            props.onVisibleSetter(setVisible)
        }
    }, [visible])

    return (
        <YakitModal
            footerStyle={{backgroundColor: "#fff", borderTop: 0, padding: 0}}
            footer={
                <div className={style["modal-confirm-btns"]}>
                    <YakitButton
                        type='outline2'
                        themeClass={style["modal-confirm-btns-cancel"]}
                        onClick={(e) => {
                            if (props.onCancel) props.onCancel(e)
                            setVisible(false)
                        }}
                    >
                        {props.onCancelText || "取消"}
                    </YakitButton>
                    <YakitButton
                        onClick={(e) => {
                            if (props.showConfirmLoading) {
                                setLoading(true)
                            }
                            if (props.onOk) {
                                props.onOk(e)
                            }
                        }}
                        loading={loading}
                    >
                        {props.onOkText || "确定"}
                    </YakitButton>
                </div>
            }
            onCancel={(e) => {
                if (props.onCancel) props.onCancel(e)
                setVisible(false)
            }}
            visible={visible}
            closable={true}
            destroyOnClose={true}
            {...props}
        />
    )
}

export const showYakitModal = (props: ShowModalProps) => {
    const div = document.createElement("div")
    document.body.appendChild(div)

    let setter: (r: boolean) => any = () => {}
    const render = (targetConfig: ShowModalProps) => {
        setTimeout(() => {
            ReactDOM.render(
                <>
                    <YakitBaseModal
                        {...(targetConfig as ModalProps)}
                        onVisibleSetter={(r) => {
                            setter = r
                        }}
                        afterClose={() => {
                            if (props.modalAfterClose) props.modalAfterClose()
                            const unmountResult = ReactDOM.unmountComponentAtNode(div)
                            if (unmountResult && div.parentNode) {
                                div.parentNode.removeChild(div)
                            }
                        }}
                    >
                        <ErrorBoundary
                            FallbackComponent={({error, resetErrorBoundary}) => {
                                if (!error) {
                                    return <div>未知错误</div>
                                }
                                return (
                                    <div>
                                        <p>弹框内逻辑性崩溃，请关闭重试！</p>
                                        <pre>{error?.message}</pre>
                                    </div>
                                )
                            }}
                        >
                            {targetConfig.content}
                        </ErrorBoundary>
                    </YakitBaseModal>
                </>,
                div
            )
        })
    }
    render(props)
    return {
        destroy: () => {
            if (setter) {
                setter(false)
            }
            setTimeout(() => {
                const unmountResult = ReactDOM.unmountComponentAtNode(div)
                if (unmountResult && div.parentNode) {
                    div.parentNode.removeChild(div)
                }
            }, 400)
        }
    }
}
