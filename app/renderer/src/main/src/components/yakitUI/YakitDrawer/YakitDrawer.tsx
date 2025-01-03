import {Drawer} from "antd"
import React, {useEffect, useState} from "react"
import {YakitDrawerProps} from "./YakitDrawerType"
import styles from "./YakitDrawer.module.scss"
import classNames from "classnames"
import {RemoveIcon} from "@/assets/newIcon"
import {ShowDrawerProps} from "@/utils/showModal"
import {ErrorBoundary} from "react-error-boundary"
import {createRoot} from "react-dom/client"
import emiter from "@/utils/eventBus/eventBus"

const {ipcRenderer} = window.require("electron")

/**
 * @description:YakitDrawer  抽屉 placement === "bottom" heard有背景色
 * @augments DrawerProps 继承antd的 DrawerProps 默认属性
 */
export const YakitDrawer: React.FC<YakitDrawerProps> = (props) => {
    const {visible, ...restProps} = props
    useEffect(() => {
        if (visible) {
            emiter.emit("setYakitHeaderDraggable", false)
        } else {
            emiter.emit("setYakitHeaderDraggable", true)
        }
    }, [visible])
    return (
        <Drawer
            visible={visible}
            {...restProps}
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
    const {onVisibleSetter,...resProps}=props
    const [visible, setVisible] = useState<boolean>(true)

    useEffect(() => {
        if (visible && onVisibleSetter) {
            onVisibleSetter(setVisible)
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
            {...resProps}
        />
    )
}

export const showYakitDrawer = (props: ShowDrawerProps) => {
    const div = document.createElement("div")
    document.body.appendChild(div)

    let setter: (r: boolean) => any = () => {}
    let yakitDrawerRootDiv
    const render = (targetConfig: ShowDrawerProps) => {
        setTimeout(() => {
            if (!yakitDrawerRootDiv) {
                yakitDrawerRootDiv = createRoot(div)
            }
            yakitDrawerRootDiv.render(
                <>
                    <YakitBaseDrawer
                        {...(targetConfig as YakitDrawerProps)}
                        onVisibleSetter={(r) => {
                            setter = r
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
                if (yakitDrawerRootDiv) {
                    yakitDrawerRootDiv.unmount()
                }
            }, 400)
        }
    }
}
