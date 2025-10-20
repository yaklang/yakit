/**
 * DevTools 开发者工具组件
 * 仅在开发模式下显示，用于查看 GRPC 调用日志
 */

import React, {useEffect, useState, lazy, Suspense, memo, useCallback, useMemo} from "react"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {YakitDrawer} from "../yakitUI/YakitDrawer/YakitDrawer"
import {YakitSpin} from "../yakitUI/YakitSpin/YakitSpin"
import {Tooltip} from "antd"
import {BugOutlined, ThunderboltOutlined} from "@ant-design/icons"
import classNames from "classnames"

import styles from "./style.module.scss"

const {ipcRenderer} = window.require("electron")

// 懒加载 GRPCLogViewer 组件，优化首屏加载性能
const GRPCLogViewer = lazy(() => import("../GRPCLogViewer/GRPCLogViewer"))

/**
 * 加载动画组件
 * 在 GRPCLogViewer 组件加载时显示
 */
const LoadingFallback = memo(() => (
    <div className={styles.loadingContainer}>
        <YakitSpin tip="正在加载开发工具..." size="large" />
    </div>
))

LoadingFallback.displayName = "LoadingFallback"

/**
 * 开发者工具入口按钮组件
 */
interface DevToolsButtonProps {
    onClick: () => void
    isActive: boolean
}

const DevToolsButton = memo<DevToolsButtonProps>(({onClick, isActive}) => (
    <div className={classNames(styles.devToolsButton, {[styles.active]: isActive})}>
        <Tooltip 
            title={
                <div>
                    <div>开发者工具</div>
                    <div style={{fontSize: 12, opacity: 0.8}}>查看 GRPC 调用日志</div>
                </div>
            }
            placement="left"
        >
            <YakitButton
                type="primary"
                icon={isActive ? <ThunderboltOutlined /> : <BugOutlined />}
                onClick={onClick}
                size="large"
                className={styles.devButton}
            />
        </Tooltip>
    </div>
))

DevToolsButton.displayName = "DevToolsButton"

/**
 * DevTools 主组件
 * 功能：
 * 1. 自动检测开发模式
 * 2. 提供浮动按钮入口
 * 3. 抽屉式展示 GRPC 日志查看器
 */
export const DevTools: React.FC = memo(() => {
    const [visible, setVisible] = useState<boolean>(false)
    const [isDevMode, setIsDevMode] = useState<boolean>(false)
    const [loaded, setLoaded] = useState<boolean>(false)

    // 检查开发模式
    useEffect(() => {
        let isMounted = true

        ipcRenderer
            .invoke("is-dev-mode")
            .then((result: boolean) => {
                if (isMounted) {
                    setIsDevMode(result)
                    setLoaded(true)
                    
                    if (result) {
                        console.log("[DevTools] 开发模式已启用")
                    }
                }
            })
            .catch((error: Error) => {
                console.error("[DevTools] 检查开发模式失败:", error)
                if (isMounted) {
                    setLoaded(true)
                }
            })

        return () => {
            isMounted = false
        }
    }, [])

    // 处理打开抽屉
    const handleOpen = useCallback(() => {
        setVisible(true)
    }, [])

    // 处理关闭抽屉
    const handleClose = useCallback(() => {
        setVisible(false)
    }, [])

    // 标记组件是否已经被加载过
    const [hasBeenOpened, setHasBeenOpened] = useState<boolean>(false)

    // 当抽屉第一次打开时，标记为已加载
    useEffect(() => {
        if (visible && !hasBeenOpened) {
            setHasBeenOpened(true)
        }
    }, [visible, hasBeenOpened])

    // 使用 useMemo 缓存抽屉内容
    // 一旦加载过就保持挂载，只通过 CSS 控制显示/隐藏
    const drawerContent = useMemo(() => {
        if (!hasBeenOpened) return null

        return (
            <div style={{display: visible ? "block" : "none", height: "100%"}}>
                <Suspense fallback={<LoadingFallback />}>
                    <GRPCLogViewer visible={visible} />
                </Suspense>
            </div>
        )
    }, [hasBeenOpened, visible])

    // 如果加载未完成或非开发模式，则不渲染
    if (!loaded || !isDevMode) {
        return null
    }

    return (
        <>
            {/* 浮动入口按钮 */}
            <DevToolsButton onClick={handleOpen} isActive={visible} />

            {/* 日志查看器抽屉 */}
            <YakitDrawer
                destroyOnClose={false}
                visible={visible}
                onClose={handleClose}
                title={
                    <div className={styles.drawerTitle}>
                        <BugOutlined className={styles.titleIcon} />
                        <span>GRPC 日志查看器</span>
                    </div>
                }
                width="85%"
                bodyStyle={{padding: 0, height: "100%"}}
                headerStyle={{borderBottom: "1px solid #f0f0f0"}}
                className={styles.devToolsDrawer}
            >
                <div className={styles.devToolsContainer}>
                    {drawerContent}
                </div>
            </YakitDrawer>
        </>
    )
})

DevTools.displayName = "DevTools" 