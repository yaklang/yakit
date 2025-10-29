import React, {useEffect, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {WinUIOpCloseSvgIcon, WinUIOpMaxSvgIcon, WinUIOpMinSvgIcon, WinUIOpRestoreSvgIcon} from "@/assets/newIcon"
import {ipcEventPre} from "@/utils/ipcEventPre"
import styles from "./WinUIOp.module.scss"

const {ipcRenderer} = window.require("electron")

interface WinUIOpProp {}

export const WinUIOp: React.FC<WinUIOpProp> = React.memo((props) => {
    const [isMax, setIsMax] = useState<boolean>(false)

    const operate = useMemoizedFn((type: "close" | "min" | "max") => {
        ipcRenderer.invoke(`${ipcEventPre}UIOperate`, type)
    })

    useEffect(() => {
        ipcRenderer.invoke(`${ipcEventPre}is-maximize-screen`)
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

    const handleCloseSoft = async () => {
        operate("close")
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
            </div>
        </div>
    )
})
