import {FileNodeProps} from "@/pages/yakRunner/FileTree/FileTreeType"
import FileTreeSystemListWapper from "../../components/aiFileSystemList/FileTreeSystemList/FileTreeSystemList"
import {useState} from "react"
import {customFolderStore, useCustomFolder} from "../../components/aiFileSystemList/store/useCustomFolder"
import {historyStore, useHistoryItems} from "../../components/aiFileSystemList/store/useHistoryFolder"
import {useMemoizedFn} from "ahooks"

const FileTreeList = () => {
    const [selected, setSelected] = useState<FileNodeProps>()
    const historyFolder = useHistoryItems()
    // 用户文件夹
    const customFolder = useCustomFolder()

    const onSetFolder = useMemoizedFn((path: string, isFolder: boolean) => {
        historyStore.addHistoryItem({path, isFolder})
        customFolderStore.addCustomFolderItem({path, isFolder})
    })

    return (
        <FileTreeSystemListWapper
            isOpen
            key='customFolder'
            title='已打开文件/文件夹'
            selected={selected}
            historyFolder={historyFolder}
            path={customFolder}
            setOpenFolder={onSetFolder}
            setSelected={setSelected}
        />
    )
}
export default FileTreeList