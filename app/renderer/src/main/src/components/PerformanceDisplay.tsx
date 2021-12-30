import React, { useState, useEffect } from "react"
import { Typography } from "antd"
import { Sparklines, SparklinesCurve } from "react-sparklines"

const { ipcRenderer } = window.require("electron")

const { Text } = Typography

export const PerformanceDisplay: React.FC = () => {
    // cpu和内存可视图数据
    const [cpu, setCpu] = useState<number[]>([])

    useEffect(() => {
        ipcRenderer.invoke("start-compute-percent")
        const time = setInterval(() => {
            ipcRenderer.invoke("fetch-compute-percent").then((res) => {
                setCpu(res)
            })
        }, 500)

        return () => {
            clearInterval(time)
            ipcRenderer.invoke("clear-compute-percent")
        }
    }, [])

    return (
        <div style={{ display: "inline-block", marginRight: 5 }}>
            {/* <div style={{ width: 50, height: 64, position: "relative", display: "inline-block", textAlign: "right" }}>
                <span style={{ height: 25, lineHeight: "25px", position: "absolute", top: 5, right: 0 }}>CPU</span>
                <span>{`${cpu[cpu.length - 1] || 0}%`}</span>
            </div> */}
            <span style={{ height: 20, marginRight: 5 }}>{`CPU:${cpu[cpu.length - 1] || 0}%`}</span>

            <div style={{ width: 100, height: "100%", display: "inline-block" }}>
                <Sparklines data={cpu} width={100} height={20} max={100}>
                    <SparklinesCurve />
                </Sparklines>
            </div>
        </div>
    )
}
