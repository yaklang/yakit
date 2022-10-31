import React, {useState, useEffect} from "react"
import {Sparklines, SparklinesCurve} from "react-sparklines"

import styles from "./performanceDisplay.module.scss"

const {ipcRenderer} = window.require("electron")

export const PerformanceDisplay: React.FC = React.memo(() => {
    // cpu和内存可视图数据
    const [cpu, setCpu] = useState<number[]>([])

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

    return (
        <div className={styles["cpu-wrapper"]}>
            <div className={styles["cpu-title"]}>
                <span className={styles["title-headline"]}>CPU </span>
                <span className={styles["title-content"]}>{`${cpu[cpu.length - 1] || 0}%`}</span>
            </div>

            <div className={styles["cpu-spark"]}>
                <Sparklines data={cpu} width={96} height={10} max={96}>
                    <SparklinesCurve color='#85899E' />
                </Sparklines>
            </div>
        </div>
    )
})
