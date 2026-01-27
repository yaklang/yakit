import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {FileNodeProps} from "@/pages/yakRunner/FileTree/FileTreeType"
import {useEffect, useMemo, useRef, useState} from "react"
import FilePreview from "../FilePreview/FilePreview"
import FileTreeSystemListWapper from "../FileTreeSystemListWapper/FileTreeSystemListWapper"
import {useMemoizedFn} from "ahooks"
import useAIChatUIData from "@/pages/ai-re-act/hooks/useAIChatUIData"
import {historyStore, useHistoryItems} from "../store/useHistoryFolder"
import {useCustomFolder} from "../store/useCustomFolder"
import styles from "./FileTreeSystem.module.scss"
import FileTreeDrop from "@/pages/ai-agent/aiChatWelcome/FileTreeDrop/FileTreeDrop"
import {Divider} from "antd"

const FileTreeSystem = () => {
    // 单选
    const [selected, setSelected] = useState<FileNodeProps>()
    // ai的文件夹
    const {grpcFolders} = useAIChatUIData()
    // 打开的本地文件夹history
    const historyFolder = useHistoryItems()
    // 用户文件夹
    const customFolder = useCustomFolder()

    const onSetFolder = useMemoizedFn((path: string, isFolder: boolean) => {
        historyStore.addHistoryItem({path, isFolder})
    })

    const filePreviewData = useMemo(() => {
        if (selected?.isFolder) return undefined
        return selected
    }, [selected])

    const hasEmittedRef = useRef(false)

    const [firstRatio, setFirstRatio] = useState("50%")

    useEffect(() => {
        if (!filePreviewData) return
        // 打开了就一直打开，目前没有关闭预览，所以只发一次事件
        if (hasEmittedRef.current) return

        // emiter.emit("filePreviewReady", "")
        setFirstRatio("30%")
        hasEmittedRef.current = true
    }, [filePreviewData])

    // const resizeBoxStyle = useMemo(() => {
    //     if(!filePreviewData) return {
    //         firstNodeStyle: { width: "100%" },
    //         secondNodeStyle:{ display: "none" }
    //     }
    //     return {
    //         firstNodeStyle: {width: "30%", padding: "4px", overflow: "hidden"}
    //     }
    // }, [filePreviewData])

    return (
        <YakitResizeBox
            firstRatio={firstRatio}
            lineDirection='right'
            firstMinSize={200}
            lineStyle={{width: 4}}
            firstNodeStyle={{width: "30%", padding: "4px", overflow: "hidden"}}
            firstNode={
                <div className={styles.fileTreeSystemLeft}>
                    <div className={styles.topPanel}>
                        <FileTreeSystemListWapper
                            key='aiFolder'
                            path={grpcFolders}
                            selected={selected}
                            setSelected={setSelected}
                            title='AI Artifacts'
                            isOpen={false}
                        />
                    </div>
                    <Divider style={{margin: 0}} />
                    <div className={styles.bottomPanel}>
                        <FileTreeDrop>
                            {({setDragSource}) => (
                                <FileTreeSystemListWapper
                                    isOpen
                                    key='customFolder'
                                    title='已打开文件/文件夹'
                                    selected={selected}
                                    historyFolder={historyFolder}
                                    path={customFolder}
                                    setOpenFolder={onSetFolder}
                                    setSelected={setSelected}
                                    onTreeDragStart={() => {
                                        setDragSource("AIRreeToChat")
                                    }}
                                    onTreeDragEnd={() => {
                                        setDragSource(null)
                                    }}
                                />
                            )}
                        </FileTreeDrop>
                    </div>
                </div>
            }
            secondNode={<FilePreview data={filePreviewData} />}
        />
    )
}

export default FileTreeSystem
