import React, {useEffect, useState, lazy, Suspense, memo} from "react"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {YakitDrawer} from "../yakitUI/YakitDrawer/YakitDrawer"

import styles from "./style.module.scss"
import {Tooltip, Spin} from "antd"
import {BugFilled} from "@ant-design/icons"

const {ipcRenderer} = window.require("electron")

// 懒加载 GRPCLogViewer 组件
const GRPCLogViewer = lazy(() => import("../GRPCLogViewer/GRPCLogViewer"))

// 加载动画包装器
const LoadingFallback = () => (
    <div style={{padding: 24, textAlign: "center", height: "100%", display: "flex", alignItems: "center", justifyContent: "center"}}>
        <Spin tip="Loading..." />
    </div>
)

export const DevTools: React.FC = () => {
    const [visible, setVisible] = useState<boolean>(false)
    const [isDevMode, setIsDevMode] = useState<boolean>(false)
    const [loaded, setLoaded] = useState<boolean>(false)

    // 检查开发模式
    useEffect(() => {
        // 检查是否是开发模式
        ipcRenderer.invoke("is-dev-mode").then((result: boolean) => {
            setIsDevMode(result)
            setLoaded(true)
        })
    }, [])

    // 如果加载未完成或非开发模式，则不渲染
    if (!loaded || !isDevMode) {
        return null
    }

    // 处理打开/关闭抽屉
    const handleToggleDrawer = (open: boolean) => {
        setVisible(open)
    }

    return (
        <>
            <div className={styles.devToolsButton}>
                <Tooltip title="Dev Tools">
                    <YakitButton
                        type="primary"
                        icon={<BugFilled />}
                        onClick={() => handleToggleDrawer(true)}
                    />
                </Tooltip>
            </div>

            <YakitDrawer
                destroyOnClose={false}
                visible={visible}
                onClose={() => handleToggleDrawer(false)}
                title="GRPC Logger"
                width="80%"
                bodyStyle={{padding: 0}}
            >
                <div className={styles.devToolsContainer}>
                    {/* 只有在抽屉打开时才渲染内容 */}
                    {visible && (
                        <Suspense fallback={<LoadingFallback />}>
                            <GRPCLogViewer visible={visible} />
                        </Suspense>
                    )}
                </div>
            </YakitDrawer>
        </>
    )
} 