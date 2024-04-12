import React, {useEffect, useRef, useState} from "react"
import {WinUIOpCloseSvgIcon, WinUIOpMaxSvgIcon, WinUIOpMinSvgIcon, WinUIOpRestoreSvgIcon} from "./icons"
import {useMemoizedFn} from "ahooks"
import {YakitHint} from "../yakitUI/YakitHint/YakitHint"
import {useRunNodeStore} from "@/store/runNode"
import {YakitCheckbox} from "../yakitUI/YakitCheckbox/YakitCheckbox"
import {yakitFailed} from "@/utils/notification"
import {useTemporaryProjectStore} from "@/store/temporaryProject"

import styles from "./uiOperate.module.scss"

const {ipcRenderer} = window.require("electron")

export interface WinUIOpProp {
    currentProjectId: string // 当前项目id
    pageChildrenShow: boolean
}

export const WinUIOp: React.FC<WinUIOpProp> = React.memo((props) => {
    const [isMax, setIsMax] = useState<boolean>(false)

    const operate = useMemoizedFn((type: "close" | "min" | "max") => {
        ipcRenderer.invoke("UIOperate", type)
    })

    useEffect(() => {
        ipcRenderer.invoke("is-maximize-screen")
        ipcRenderer.on("callback-is-maximize-screen", (_, value: boolean) => {
            setIsMax(value)
        })

        ipcRenderer.on("callback-win-maximize", async (e: any) => setIsMax(true))
        ipcRenderer.on("callback-win-unmaximize", async (e: any) => setIsMax(false))

        return () => {
            ipcRenderer.removeAllListeners("callback-win-maximize")
            ipcRenderer.removeAllListeners("callback-win-unmaximize")
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
            className={styles["win-ui-op-wrapper"]}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
        >
            <div className={styles["win-ui-op-body"]}>
                <div className={styles["op-btn"]} onClick={() => operate("min")}>
                    <WinUIOpMinSvgIcon className={styles["icon-style"]} />
                </div>
                <div className={styles["short-divider-wrapper"]}>
                    <div className={styles["divider-style"]}></div>
                </div>

                <div className={styles["op-btn"]} onClick={() => operate("max")}>
                    {isMax ? (
                        <WinUIOpRestoreSvgIcon className={styles["icon-style"]} />
                    ) : (
                        <WinUIOpMaxSvgIcon className={styles["icon-style"]} />
                    )}
                </div>
                <div className={styles["short-divider-wrapper"]}>
                    <div className={styles["divider-style"]}></div>
                </div>

                <div className={styles["op-btn"]} onClick={handleCloseSoft}>
                    <WinUIOpCloseSvgIcon className={styles["icon-style"]} />
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

interface TemporaryProjectPopProp {
    onOk: () => void
    onCancel: () => void
    title?: string
    content?: any
}

export const TemporaryProjectPop: React.FC<TemporaryProjectPopProp> = (props) => {
    const [temporaryProjectNoPrompt, setTemporaryProjectNoPrompt] = useState<boolean>(false)

    const {setTemporaryProjectNoPromptFlag} = useTemporaryProjectStore()

    const onok = useMemoizedFn(() => {
        setTemporaryProjectNoPromptFlag(temporaryProjectNoPrompt)
        props.onOk()
    })

    return (
        <YakitHint
            visible={true}
            title={props.title || "退出临时项目"}
            footerExtra={
                <YakitCheckbox
                    value={temporaryProjectNoPrompt}
                    onChange={(e) => setTemporaryProjectNoPrompt(e.target.checked)}
                >
                    下次不再提醒
                </YakitCheckbox>
            }
            content={
                props.content ? (
                    props.content
                ) : (
                    <>
                        <div>
                            确认退出后，临时项目所有数据都不会保存，包括流量数据、端口数据、域名数据和漏洞数据等。
                        </div>
                        <div>退出前可在设置-项目管理中导出数据</div>
                    </>
                )
            }
            onOk={onok}
            onCancel={props.onCancel}
        />
    )
}
