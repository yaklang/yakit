import {FileNodeProps} from "@/pages/yakRunner/FileTree/FileTreeType"
import {useState} from "react"
import {useCustomFolder} from "../../components/aiFileSystemList/store/useCustomFolder"
import {historyStore, useHistoryItems} from "../../components/aiFileSystemList/store/useHistoryFolder"
import {useMemoizedFn} from "ahooks"
import styles from "./FileTreeList.module.scss"
import classNames from "classnames"
import FileTreeSystemListWapper from "../../components/aiFileSystemList/FileTreeSystemListWapper/FileTreeSystemListWapper"
import { useFileTreeDrop } from "../hooks/useFileTreeDrop"

const FileTreeList = () => {
    const [selected, setSelected] = useState<FileNodeProps>()
    // 用户文件夹
    const customFolder = useCustomFolder()
    const historyFolder = useHistoryItems()


    const onSetFolder = useMemoizedFn((path: string, isFolder: boolean) => {
        historyStore.addHistoryItem({path, isFolder})
    })

    const {dropRef, dragging, dragSource, setDragSource} = useFileTreeDrop({
        onAddPath: (path, isFolder) => {
            historyStore.addHistoryItem({path, isFolder})
        }
    })

    return (
        <div
            ref={dropRef}
            className={classNames(styles.container, {
                [styles.dragging]: dragging && dragSource !== "AIRreeToChat"
            })}
        >
            {dragging && dragSource !== "AIRreeToChat" && <div className={styles.dragHint}>松开以添加文件 / 文件夹</div>}

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
        </div>
    )
}
export default FileTreeList
