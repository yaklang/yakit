import React, {useEffect, useState} from "react"
import style from "./YakitModalConfirm.module.scss"
import {YakitButton} from "../YakitButton/YakitButton"
import {ShowModalProps} from "@/utils/showModal"
import ReactDOM from "react-dom"
import {YakitModal, YakitModalProp} from "./YakitModal"
import {ErrorBoundary} from "react-error-boundary"
import {ExclamationCircleOutlined} from "@ant-design/icons"
import {OutlineXIcon} from "@/assets/icon/outline"
import {createRoot} from "react-dom/client"
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
    let yakitModalConfirmRootDiv
    const render = (targetConfig: ShowModalProps) => {
        setTimeout(() => {
            if (!yakitModalConfirmRootDiv) {
                yakitModalConfirmRootDiv = createRoot(div)
            }
            yakitModalConfirmRootDiv.render(
                <>
                    <YakitBaseModal
                        {...(targetConfig as YakitModalProp)}
                        onVisibleSetter={(r) => {
                            setter = r
                        }}
                        afterClose={() => {
                            if (props.modalAfterClose) props.modalAfterClose()
                            setTimeout(() => {
                                if (yakitModalConfirmRootDiv) {
                                    yakitModalConfirmRootDiv.unmount()
                                }
                            })
                        }}
                        title={null}
                        // headerStyle={{paddingBottom: 0}}
                        bodyStyle={{padding: 0}}
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
                </>
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
                if (yakitModalConfirmRootDiv) {
                    yakitModalConfirmRootDiv.unmount()
                }
            }, 400)
        }
    }
}

interface YakitBaseModalProp
    extends Omit<YakitModalProp, "cancelButtonProps" | "okButtonProps" | "okType">,
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
                        onClick={(e) => {
                            if (props.onCancel) props.onCancel(e)
                            setVisible(false)
                        }}
                        {...props.cancelButtonProps}
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
                        {...props.okButtonProps}
                    >
                        {props.onOkText || "确定"}
                    </YakitButton>
                </div>
            }
            visible={visible}
            closable={true}
            destroyOnClose={true}
            closeIcon={
                <div
                    onClick={(e) => {
                        e.stopPropagation()
                        setVisible(false)
                    }}
                    className='modal-remove-icon'
                >
                    <OutlineXIcon />
                </div>
            }
            {...props}
            onCancel={(e) => {
                if (props.onCancel) props.onCancel(e)
                setVisible(false)
            }}
        />
    )
}

export const debugYakitModal = (y: any) => {
    const m = showYakitModal({
        title: "调试信息",
        width: "50%",
        content: (
            <div style={{marginLeft: 20, marginRight: 20, marginTop: 16, marginBottom: 20}}>{JSON.stringify(y)}</div>
        ),
        onOk: () => {
            m.destroy()
        }
    })
}

export const debugYakitModalAny = (y: any) => {
    const m = showYakitModal({
        title: "调试信息",
        width: "50%",
        content: <div style={{marginLeft: 20, marginRight: 20, marginTop: 16, marginBottom: 20}}>{y}</div>,
        onOk: () => {
            m.destroy()
        }
    })
}

export const showYakitModal = (props: ShowModalProps) => {
    const div = document.createElement("div")
    if (!!props.getContainer && props.getContainer instanceof HTMLElement) {
        props.getContainer.appendChild(div)
    } else {
        document.body.appendChild(div)
    }

    let setter: (r: boolean) => any = () => {}
    let yakitModalRootDiv
    const render = (targetConfig: ShowModalProps) => {
        setTimeout(() => {
            if (!yakitModalRootDiv) {
                yakitModalRootDiv = createRoot(div)
            }
            yakitModalRootDiv.render(
                <>
                    <YakitBaseModal
                        bodyStyle={{padding: 0}}
                        {...(targetConfig as YakitModalProp)}
                        onVisibleSetter={(r) => {
                            setter = r
                        }}
                        afterClose={() => {
                            if (props.modalAfterClose) props.modalAfterClose()
                            setTimeout(() => {
                                if (yakitModalRootDiv) {
                                    yakitModalRootDiv.unmount()
                                }
                            })
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
                </>
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
                if (yakitModalRootDiv) {
                    yakitModalRootDiv.unmount()
                }
            }, 400)
        }
    }
}
