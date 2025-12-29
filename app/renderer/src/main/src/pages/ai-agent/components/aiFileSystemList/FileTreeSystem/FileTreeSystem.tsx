import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {FileNodeProps} from "@/pages/yakRunner/FileTree/FileTreeType"
import {useMemo, useState} from "react"
import FilePreview from "../FilePreview/FilePreview"
import FileTreeSystemListWapper from "../FileTreeSystemListWapper/FileTreeSystemListWapper"
import {useMemoizedFn} from "ahooks"
import useAIChatUIData from "@/pages/ai-re-act/hooks/useAIChatUIData"
import {historyStore, useHistoryItems} from "../store/useHistoryFolder"
import {useCustomFolder, customFolderStore} from "../store/useCustomFolder"
import styles from "./FileTreeSystem.module.scss"
import FileTreeDrop from "@/pages/ai-agent/aiChatWelcome/FileTreeDrop/FileTreeDrop"

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

    return (
        <YakitResizeBox
            firstRatio='50%'
            firstNodeStyle={{padding: "4px", overflowY: "auto"}}
            lineDirection='right'
            firstMinSize={200}
            lineStyle={{width: 4}}
            firstNode={
                <div className={styles["file-tree-system-left"]}>
                    <FileTreeSystemListWapper
                        key='aiFolder'
                        path={grpcFolders}
                        selected={selected}
                        setSelected={setSelected}
                        title='AI Artifacts'
                        isOpen={false}
                    />
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
            }
            secondNode={<FilePreview data={filePreviewData} />}
        />
    )
}

export default FileTreeSystem
