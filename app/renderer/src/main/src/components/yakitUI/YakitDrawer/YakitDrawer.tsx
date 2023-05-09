import {Drawer} from "antd"
import React, {useEffect, useState} from "react"
import {YakitDrawerProps} from "./YakitDrawerType"
import styles from "./YakitDrawer.module.scss"
import classNames from "classnames"
import {RemoveIcon} from "@/assets/newIcon"
import { ShowDrawerProps } from "@/utils/showModal"
import ReactDOM from "react-dom"
import { ErrorBoundary } from "react-error-boundary"

const {ipcRenderer} = window.require("electron")

/**
 * @description:YakitDrawer  抽屉 placement === "bottom" heard有背景色
 * @augments DrawerProps 继承antd的 DrawerProps 默认属性
 */
export const YakitDrawer: React.FC<YakitDrawerProps> = (props) => {
    const {visible} = props
    useEffect(() => {
        if (visible) {
            ipcRenderer.invoke("update-yakit-header-title-drop", false)
        } else {
            ipcRenderer.invoke("update-yakit-header-title-drop", true)
        }
    }, [visible])
    return (
        <Drawer
            {...props}
            closeIcon={<div className={styles["yakit-drawer-icon"]}>{props.closeIcon || <RemoveIcon className={styles["yakit-drawer-remove-icon"]}/>}</div>}
            className={classNames(
                styles["yakit-drawer"],
                {[styles["yakit-drawer-bottom"]]: props.placement === "bottom"},
                props.className
            )}
        >
            {props.children}
        </Drawer>
    )
}


const YakitBaseDrawer: React.FC<ShowDrawerProps> = (props) => {
    const [visible, setVisible] = useState<boolean>(true)

    useEffect(() => {
        if (visible && props.onVisibleSetter) {
            props.onVisibleSetter(setVisible)
        }
    }, [visible])

    return (
        <YakitDrawer
            onClose={(e) => {
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

export const showYakitDrawer = (props: ShowDrawerProps) => {
    const div = document.createElement("div")
    document.body.appendChild(div)

    let setter: (r: boolean) => any = () => {}
    const render = (targetConfig: ShowDrawerProps) => {
        setTimeout(() => {
            ReactDOM.render(
                <>
                    <YakitBaseDrawer
                        {...(targetConfig as YakitDrawerProps)}
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
                    </YakitBaseDrawer>
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
