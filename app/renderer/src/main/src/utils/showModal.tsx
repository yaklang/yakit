import React, {useEffect, useState} from "react"
import {ModalProps} from "antd/lib/modal"
import {Drawer, DrawerProps, Modal} from "antd"
import {ErrorBoundary} from "react-error-boundary"
import {createRoot} from "react-dom/client"
import emiter from "./eventBus/eventBus"
import {HTML5Backend} from "react-dnd-html5-backend"
import {DndProvider} from "react-dnd"
const {ipcRenderer} = window.require("electron")

export interface BaseModalProp extends ModalProps, React.ComponentProps<any> {
    onVisibleSetter?: (setter: (i: boolean) => any) => any
}

export const BaseModal: React.FC<BaseModalProp> = (props) => {
    const [visible, setVisible] = useState(true)

    useEffect(() => {
        if (visible && props.onVisibleSetter) {
            props.onVisibleSetter(setVisible)
        }
    }, [visible])

    return (
        <Modal
            {...props}
            footer={false}
            visible={visible}
            onCancel={() => setVisible(false)}
            onOk={(e) => {
                if (props.onOk) props.onOk(e)
            }}
            closable={true}
            destroyOnClose={true}
            cancelButtonProps={{hidden: true}}
        />
    )
}

export interface ShowModalProps extends BaseModalProp {
    content?: React.ReactNode
    modalAfterClose?: () => any
}

export const showModal = (props: ShowModalProps) => {
    const div = document.createElement("div")
    document.body.appendChild(div)
    let modalRootDiv
    let setter: (r: boolean) => any = () => {}
    const render = (targetConfig: ShowModalProps) => {
        setTimeout(() => {
            if (!modalRootDiv) {
                modalRootDiv = createRoot(div)
            }
            modalRootDiv.render(
                <>
                    <BaseModal
                        {...(targetConfig as ModalProps)}
                        onVisibleSetter={(r) => {
                            setter = r
                        }}
                        afterClose={() => {
                            if (props.modalAfterClose) props.modalAfterClose()
                            setTimeout(() => {
                                if (modalRootDiv) {
                                    modalRootDiv.unmount()
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
                    </BaseModal>
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
                if (modalRootDiv) {
                    modalRootDiv.unmount()
                }
            }, 400)
        }
    }
}

export interface BaseDrawerProp extends DrawerProps, React.ComponentProps<any> {
    afterClose?: (invisibleSetter?: (b: boolean) => any) => any
    afterVisible?: (invisibleSetter?: (b: boolean) => any) => any
    afterInvisible?: (invisibleSetter?: (b: boolean) => any) => any
}

export const BaseDrawer: React.FC<BaseDrawerProp> = (props) => {
    const {afterVisible,afterInvisible,afterClose,...restProps}=props;
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        setVisible(true)
    }, [])

    useEffect(() => {
        if (visible) {
            emiter.emit("setYakitHeaderDraggable", false)
            if (afterVisible) afterVisible(setVisible)
        } else {
            emiter.emit("setYakitHeaderDraggable", true)
        }
    }, [visible])

    const close = () => {
        setVisible(false)
        if (afterInvisible) afterInvisible(setVisible)
        setTimeout(() => {
            if (afterClose) afterClose(setVisible)
        }, 1000)
    }

    return (
        <Drawer
            visible={visible}
            destroyOnClose={true}
            onClose={close}
            closable={true}
            width={"50%"}
            maskClosable={true}
            {...restProps}
        ></Drawer>
    )
}

export interface ShowDrawerProps extends BaseDrawerProp {
    content?: React.ReactNode
}

export const showDrawer = (props: ShowDrawerProps) => {
    const div = document.createElement("div")
    document.body.appendChild(div)

    let onDestroy: ((i: boolean) => any) | undefined = () => undefined
    let drawerRootDiv
    const render = (targetConfig: ShowModalProps) => {
        setTimeout(() => {
            if (!drawerRootDiv) {
                drawerRootDiv = createRoot(div)
            }
            drawerRootDiv.render(
                <DndProvider backend={HTML5Backend}>
                    <BaseDrawer
                        {...(targetConfig as BaseDrawerProp)}
                        afterVisible={(setter) => {
                            onDestroy = setter
                        }}
                        afterClose={() => {
                            setTimeout(() => {
                                if (drawerRootDiv) {
                                    drawerRootDiv.unmount()
                                }
                            })
                        }}
                    >
                        {targetConfig.content}
                    </BaseDrawer>
                </DndProvider>
            )
        })
    }
    render(props)
    return {
        destroy: () => {
            onDestroy && onDestroy(false)
            setTimeout(() => {
                if (drawerRootDiv) {
                    drawerRootDiv.unmount()
                }
            }, 500)
        }
    }
}
