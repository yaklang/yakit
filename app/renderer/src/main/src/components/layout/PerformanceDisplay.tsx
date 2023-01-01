import React, {useState, useEffect, useRef} from "react"
import {Sparklines, SparklinesCurve} from "react-sparklines"

import styles from "./performanceDisplay.module.scss"
import {Button} from "antd";
import {RocketOutlined} from "@ant-design/icons";
import {manageYakLocalProcess} from "@/components/layout/WelcomeConsoleUtil";

const {ipcRenderer} = window.require("electron")

export const PerformanceDisplay: React.FC = React.memo(() => {
    // cpu和内存可视图数据
    const [cpu, setCpu] = useState<number[]>([])

    const [showLine, setShowLine] = useState<boolean>(true)
    const showLineTime = useRef<any>(null)

    useEffect(() => {
        ipcRenderer.invoke("start-compute-percent")
        const time = setInterval(() => {
            ipcRenderer.invoke("fetch-compute-percent").then((res) => setCpu(res))
        }, 500)

        return () => {
            clearInterval(time)
            ipcRenderer.invoke("clear-compute-percent")
        }
    }, [])

    const onWinResize = (e: UIEvent) => {
        if (!!e.target) {
            const win = e.target as Window
            if (showLineTime.current) clearTimeout(showLineTime.current)
            showLineTime.current = setTimeout(() => {
                setShowLine(win.innerWidth >= 950)
            }, 200)
        }
    }

    useEffect(() => {
        if (window) {
            window.addEventListener("resize", onWinResize)
            return () => {
                window.removeEventListener("resize", onWinResize)
                if (showLineTime.current) clearTimeout(showLineTime.current)
                showLineTime.current = null
            }
        }
    }, [])

    return (
        <div className={styles["cpu-wrapper"]}>
            <div className={styles["cpu-title"]}>
                <span className={styles["title-headline"]}>CPU </span>
                <span className={styles["title-content"]}>{`${cpu[cpu.length - 1] || 0}%`}</span>
            </div>

            {showLine && (
                <div className={styles["cpu-spark"]}>
                    <Sparklines data={cpu} width={96} height={10} max={96}>
                        <SparklinesCurve color='#85899E'/>
                    </Sparklines>
                </div>
            )}
            <Button className={styles["cpu-title"]}
                    style={{marginLeft: 0, paddingLeft: 0}}
                    type={"link"} onClick={() => {
                manageYakLocalProcess()
            }} size={"small"}>进程</Button>
        </div>
    )
})
