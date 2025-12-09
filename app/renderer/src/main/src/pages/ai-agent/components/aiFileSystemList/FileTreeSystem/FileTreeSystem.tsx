import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {FileNodeProps} from "@/pages/yakRunner/FileTree/FileTreeType"
import {useMemo, useState} from "react"
import FilePreview from "../FilePreview/FilePreview"
import FileTreeSystemListWapper from "../FileTreeSystemList/FileTreeSystemList"
import {useMemoizedFn} from "ahooks"
import useAIChatUIData from "@/pages/ai-re-act/hooks/useAIChatUIData"
import {HistoryItem} from "../type"
import {historyStore, useHistoryItems} from "../store/useHistoryFolder"
import {useCustomFolder, customFolderStore} from "../store/useCustomFolder"

const filterIsDir = (items: HistoryItem[], flag = true) => {
    return items.filter((item) => item.isFolder === flag)
}

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
        customFolderStore.addCustomFolderItem({path, isFolder})
    })
    const filstNode = useMemoizedFn(() => {
        const customFileDom = (
            <FileTreeSystemListWapper
                isOpen
                key='customFile'
                title='已打开文件'
                selected={selected}
                isFolder={false}
                historyFolder={filterIsDir(historyFolder, false)}
                path={customFolder.filter((item) => !item.isFolder).map((item) => item.path)}
                setOpenFolder={onSetFolder}
                setSelected={setSelected}
            />
        )

        const aiFolderDom = (
            <FileTreeSystemListWapper
                key='aiFolder'
                path={grpcFolders}
                selected={selected}
                setSelected={setSelected}
                title='AI Artifacts'
                isOpen={false}
            />
        )

        const customFolderDom = (
            <FileTreeSystemListWapper
                isOpen
                key='customFolder'
                title='已打开文件系统'
                selected={selected}
                historyFolder={filterIsDir(historyFolder)}
                path={customFolder.filter((item) => item.isFolder).map((item) => item.path)}
                setOpenFolder={onSetFolder}
                setSelected={setSelected}
            />
        )
        return [aiFolderDom, customFileDom, customFolderDom]
    })
    const filePreviewData = useMemo(() => {
        if (selected?.isFolder) return undefined
        return selected
    }, [selected])

    return (
        <YakitResizeBox
            firstRatio='300px'
            firstNodeStyle={{padding: "4px", overflowY: "auto"}}
            lineDirection='right'
            firstMinSize={200}
            lineStyle={{width: 4}}
            firstNode={filstNode}
            secondNode={<FilePreview data={filePreviewData} />}
        />
    )
}

export default FileTreeSystem
