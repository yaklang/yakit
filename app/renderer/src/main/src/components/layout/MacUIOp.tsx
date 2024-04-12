import React, {useEffect, useRef, useState} from "react"
import {MacUIOpCloseSvgIcon, MacUIOpMaxSvgIcon, MacUIOpMinSvgIcon, MacUIOpRestoreSvgIcon} from "./icons"
import {useMemoizedFn} from "ahooks"
import {YakitHint} from "../yakitUI/YakitHint/YakitHint"
import {useRunNodeStore} from "@/store/runNode"
import {useTemporaryProjectStore} from "@/store/temporaryProject"
import {TemporaryProjectPop} from "./WinUIOp"
import {yakitFailed} from "@/utils/notification"
import classNames from "classnames"
import styles from "./uiOperate.module.scss"

const {ipcRenderer} = window.require("electron")

export interface MacUIOpProp {
    currentProjectId: string // 当前项目id
    pageChildrenShow: boolean
}

export const MacUIOp: React.FC<MacUIOpProp> = React.memo((props) => {
    const [show, setShow] = useState<boolean>(false)
    const [isMax, setIsMax] = useState<boolean>(false)

    const operate = useMemoizedFn((type: "close" | "min" | "full") => {
        ipcRenderer.invoke("UIOperate", type)
    })

    useEffect(() => {
        ipcRenderer.invoke("is-full-screen")
        ipcRenderer.on("callback-is-full-screen", (_, value: boolean) => setIsMax(value))

        ipcRenderer.on("callback-win-enter-full", async (e: any) => setIsMax(true))
        ipcRenderer.on("callback-win-leave-full", async (e: any) => setIsMax(false))

        return () => {
            ipcRenderer.removeAllListeners("callback-win-enter-full")
            ipcRenderer.removeAllListeners("callback-win-leave-full")
        }
    }, [])

    const {runNodeList, clearRunNodeList} = useRunNodeStore()
    const [closeRunNodeItemVerifyVisible, setCloseRunNodeItemVerifyVisible] = useState<boolean>(false)
    const {temporaryProjectId, temporaryProjectNoPromptFlag} = useTemporaryProjectStore()
    const lastTemporaryProjectIdRef = useRef<string>("")
    const [closeTemporaryProjectVisible, setCloseTemporaryProjectVisible] = useState<boolean>(false)
    const lastTemporaryProjectNoPromptRef = useRef<boolean>(false)

    useEffect(() => {
        lastTemporaryProjectNoPromptRef.current = temporaryProjectNoPromptFlag
    }, [temporaryProjectNoPromptFlag])

    useEffect(() => {
        lastTemporaryProjectIdRef.current = temporaryProjectId
    }, [temporaryProjectId])

    const handleCloseSoft = async () => {
        if (props.pageChildrenShow) {
            /**
             * 当关闭按钮出现在项目里面时，点关闭给弹窗的情况
             * 临时项目的弹窗需要放到最后一个弹窗弹出
             */
            // 如果运行节点存在
            if (Array.from(runNodeList).length) {
                setCloseRunNodeItemVerifyVisible(true)
                return
            }

            // 如果打开得是临时项目
            if (
                lastTemporaryProjectIdRef.current &&
                props.currentProjectId &&
                lastTemporaryProjectIdRef.current === props.currentProjectId &&
                !lastTemporaryProjectNoPromptRef.current
            ) {
                setCloseTemporaryProjectVisible(true)
                return
            }
        }
        operate("close")
    }

    const handleKillAllRunNode = async () => {
        let promises: (() => Promise<any>)[] = []
        Array.from(runNodeList).forEach(([key, pid]) => {
            promises.push(() => ipcRenderer.invoke("kill-run-node", {pid}))
        })
        try {
            await Promise.allSettled(promises.map((promiseFunc) => promiseFunc()))
            clearRunNodeList()
        } catch (error) {
            yakitFailed(error + "")
        }
    }

    return (
        <div
            className={styles["mac-ui-op-wrapper"]}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
        >
            <div
                className={styles["mac-ui-op-body"]}
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
            >
                <div className={styles["op-btn"]} onClick={handleCloseSoft}>
                    {show ? (
                        <MacUIOpCloseSvgIcon />
                    ) : (
                        <div className={styles["op-hidn-btn"]}>
                            <div className={classNames(styles["btn-icon"], styles["close-bg-color"])}></div>
                        </div>
                    )}
                </div>
                <div className={styles["op-btn"]} onClick={(e) => operate("min")}>
                    {show ? (
                        <MacUIOpMinSvgIcon />
                    ) : (
                        <div className={styles["op-hidn-btn"]}>
                            <div className={classNames(styles["btn-icon"], styles["min-bg-color"])}></div>
                        </div>
                    )}
                </div>
                <div className={styles["op-btn"]} onClick={(e) => operate("full")}>
                    {show ? (
                        isMax ? (
                            <MacUIOpRestoreSvgIcon />
                        ) : (
                            <MacUIOpMaxSvgIcon />
                        )
                    ) : (
                        <div className={styles["op-hidn-btn"]}>
                            <div className={classNames(styles["btn-icon"], styles["max-bg-color"])}></div>
                        </div>
                    )}
                </div>
                {/* 关闭运行节点确认弹框 */}
                <YakitHint
                    visible={closeRunNodeItemVerifyVisible}
                    title='是否确认关闭节点'
                    content='关闭Yakit会默认关掉所有启用的节点'
                    onOk={async () => {
                        await handleKillAllRunNode()
                        setCloseRunNodeItemVerifyVisible(false)
                        handleCloseSoft()
                    }}
                    onCancel={() => {
                        setCloseRunNodeItemVerifyVisible(false)
                    }}
                />

                {/* 退出临时项目确认弹框 */}
                {closeTemporaryProjectVisible && (
                    <TemporaryProjectPop
                        title='关闭Yakit'
                        content='关闭Yakit会自动退出临时项目，临时项目所有数据都不会保存。退出前可在设置-项目管理中导出数据'
                        onOk={async () => {
                            setCloseTemporaryProjectVisible(false)
                            operate("close")
                        }}
                        onCancel={() => {
                            setCloseTemporaryProjectVisible(false)
                        }}
                    />
                )}
            </div>
        </div>
    )
})
