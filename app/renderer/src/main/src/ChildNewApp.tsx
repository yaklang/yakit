import React, {useEffect, useMemo, useState} from "react"
import OpenPacketNewWindow from "./components/OpenPacketNewWindow/OpenPacketNewWindow"
import styles from "./ChildNewApp.module.scss"
import {useDebounceFn, useMemoizedFn} from "ahooks"
import {coordinate} from "./pages/globalVariable"
import {YakitSpin} from "./components/yakitUI/YakitSpin/YakitSpin"
import TitleBar from "./components/BaseTitleBar"

const {ipcRenderer} = window.require("electron")

interface ParentWindowData {
    type: string
    data: any
}
interface ChildNewAppProps {}
const ChildNewApp: React.FC<ChildNewAppProps> = (props) => {
    const [parentWinData, setParentWinData] = useState<ParentWindowData>()
    useEffect(() => {
        ipcRenderer.send("request-parent-data")
        ipcRenderer.on("get-parent-window-data", (e, data) => {
            setParentWinData(data as ParentWindowData)
        })
        return () => {
            setParentWinData(undefined)
            ipcRenderer.removeAllListeners("get-parent-window-data")
        }
    }, [])
    // 全局记录鼠标坐标位置(为右键菜单提供定位)
    const handleMouseMove = useDebounceFn(
        useMemoizedFn((e: MouseEvent) => {
            const {screenX, screenY, clientX, clientY, pageX, pageY} = e

            coordinate.screenX = screenX
            coordinate.screenY = screenY
            coordinate.clientX = clientX
            coordinate.clientY = clientY
            coordinate.pageX = pageX
            coordinate.pageY = pageY
        }),
        {wait: 50}
    ).run
    useEffect(() => {
        document.addEventListener("mousemove", handleMouseMove)
        return () => {
            document.removeEventListener("mousemove", handleMouseMove)
        }
    }, [])

    const childNewAppEle = useMemo(() => {
        if (parentWinData) {
            switch (parentWinData.type) {
                case "openPacketNewWindow":
                    return <OpenPacketNewWindow data={parentWinData.data} />
            }
        }
        return null
    }, [parentWinData])

    return (
        <div className={styles["child-new-app-wrapper"]}>
            <TitleBar />
            {childNewAppEle}
        </div>
    )
}

export default ChildNewApp
