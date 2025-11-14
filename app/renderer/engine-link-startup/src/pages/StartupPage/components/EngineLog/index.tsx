import React, {useEffect, useRef} from "react"
import {getReleaseEditionName} from "@/utils/envfile"
import {xtermFit} from "@/utils/xtermUtils"
import ReactResizeDetector from "react-resize-detector"
import {XTerm} from "xterm-for-react"
import {useXTermOptions} from "@/hooks/useXTermOptions"
import {useMemoizedFn} from "ahooks"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"

import styles from "./EngineLog.module.scss"

const {ipcRenderer} = window.require("electron")

export interface EngineLogProps {
    englineLogMax: boolean
    setEnglineLogMax: (max: boolean) => void
}

export const EngineLog: React.FC<EngineLogProps> = React.memo((props) => {
    const {englineLogMax, setEnglineLogMax} = props

    const xtermRef = useRef<any>(null)
    const terminalOptions = useXTermOptions({
        getTerminal: () => xtermRef.current?.terminal,
        delay: 200
    })

    /** 日志输出 */
    const writeToConsole = (i: string) => {
        if (!xtermRef) return
        xtermRef.current.terminal.write(i)
    }

    const liveEngineLog = useMemoizedFn((e, stdout) => {
        writeToConsole(`[INFO] ${getReleaseEditionName()}-Verbose-Log: ${stdout}`)
    })

    useEffect(() => {
        if (!xtermRef) {
            return
        }

        writeToConsole(`欢迎使用 ${getReleaseEditionName()}!\n`)

        ipcRenderer.on("live-engine-stdio", (e, stdout) => {
            writeToConsole(stdout)
        })

        ipcRenderer.on("live-engine-log", liveEngineLog)
        return () => {
            ipcRenderer.removeAllListeners("live-engine-log", liveEngineLog)
            ipcRenderer.removeAllListeners("live-engine-stdio")
        }
    }, [xtermRef])

    return (
        <div className={styles["engine-log-wrapper"]}>
            <div className={styles["engine-log-header"]}>
                <div className={styles["header-title"]}>连接日志</div>
                <div>
                    {englineLogMax ? (
                        <YakitButton type='text' size='small' onClick={() => setEnglineLogMax(false)}>
                            还原
                        </YakitButton>
                    ) : (
                        <YakitButton type='text' size='small' onClick={() => setEnglineLogMax(true)}>
                            展开
                        </YakitButton>
                    )}
                </div>
            </div>
            <div className={styles["engine-log-body"]}>
                <ReactResizeDetector
                    onResize={(width, height) => {
                        if (!width || !height) return

                        const row = Math.floor(height / 18.5)
                        const col = Math.floor(width / 10)
                        if (xtermRef) xtermFit(xtermRef, col, row)
                    }}
                    handleWidth={true}
                    handleHeight={true}
                    refreshMode={"debounce"}
                    refreshRate={50}
                />
                <XTerm ref={xtermRef} options={terminalOptions} />
            </div>
        </div>
    )
})
