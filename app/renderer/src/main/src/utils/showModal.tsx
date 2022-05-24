import React, {useEffect, useRef, useState} from "react";
import ReactDOM from "react-dom";
import {ModalProps} from "antd/lib/modal";
import {Drawer, DrawerProps, Modal} from "antd";
import {ErrorBoundary} from 'react-error-boundary'

export interface BaseModalProp extends ModalProps, React.ComponentProps<any> {
    onVisibleSetter?: (setter: (i: boolean) => any) => any
}

export const BaseModal: React.FC<BaseModalProp> = (props) => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        if (visible && props.onVisibleSetter) {
            props.onVisibleSetter(setVisible)
        }
    }, [visible])

    return <Modal
        {...props}
        footer={false}
        visible={visible}
        onCancel={() => setVisible(false)}
        onOk={(e) => {
            if (props.onOk) props.onOk(e)
        }}
        closable={true} destroyOnClose={true}
        cancelButtonProps={{hidden: true}}
    />
};

export interface ShowModalProps extends BaseModalProp {
    content?: React.ReactNode;
}

export const showModal = (props: ShowModalProps) => {
    const div = document.createElement("div");
    document.body.appendChild(div)

    let setter: (r: boolean) => any = () => {
    };
    const render = (targetConfig: ShowModalProps) => {
        setTimeout(() => {
            ReactDOM.render(<>
                <BaseModal
                    {...targetConfig as ModalProps}
                    onVisibleSetter={r => {
                        setter = r
                    }}
                    afterClose={() => {
                        const unmountResult = ReactDOM.unmountComponentAtNode(div);
                        if (unmountResult && div.parentNode) {
                            div.parentNode.removeChild(div);
                        }
                    }}
                >
                    <ErrorBoundary FallbackComponent={({error, resetErrorBoundary}) => {
                        return <div>
                            <p>弹框内逻辑性崩溃，请关闭重试！</p>
                            <pre>{error.message}</pre>
                        </div>
                    }}>
                        {targetConfig.content}
                    </ErrorBoundary>
                </BaseModal>
            </>, div)
        })
    }
    render(props);
    return {
        destroy: () => {
            if (setter) {
                setter(false)
            }
            setTimeout(() => {
                const unmountResult = ReactDOM.unmountComponentAtNode(div);
                if (unmountResult && div.parentNode) {
                    div.parentNode.removeChild(div)
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
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setVisible(true)
    }, [])

    useEffect(() => {
        if (visible) {
            if (props.afterVisible) props.afterVisible(setVisible);
        }
    }, [visible])

    const close = () => {
        setVisible(false)
        if (props.afterInvisible) props.afterInvisible(setVisible);
        setTimeout(() => {
            if (props.afterClose) props.afterClose(setVisible);
        }, 1000)
    }

    return <Drawer
        visible={visible}
        destroyOnClose={true}
        onClose={close}
        closable={true} width={"50%"} maskClosable={true}
        {...props}
    >

    </Drawer>
};

export interface ShowDrawerProps extends BaseDrawerProp {
    content?: React.ReactNode;
}

export const showDrawer = (props: ShowDrawerProps) => {
    const div = document.createElement("div");
    document.body.appendChild(div)

    let onDestroy: ((i: boolean) => any) | undefined = () => undefined;

    const render = (targetConfig: ShowModalProps) => {
        setTimeout(() => {
            ReactDOM.render(<>
                <BaseDrawer
                    {...targetConfig as BaseDrawerProp}
                    afterVisible={(setter) => {
                        onDestroy = setter
                    }}
                    afterClose={() => {
                        const unmountResult = ReactDOM.unmountComponentAtNode(div);
                        if (unmountResult && div.parentNode) {
                            div.parentNode.removeChild(div);
                        }
                    }}
                >
                    {targetConfig.content}
                </BaseDrawer>
            </>, div)
        })
    }
    render(props);
    return {
        destroy: () => {
            onDestroy && onDestroy(false)
            setTimeout(() => {
                const unmountResult = ReactDOM.unmountComponentAtNode(div);
                if (unmountResult && div.parentNode) {
                    div.parentNode.removeChild(div)
                }
            }, 500)
        }
    }
}