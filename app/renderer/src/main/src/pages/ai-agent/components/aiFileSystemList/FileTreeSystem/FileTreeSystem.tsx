import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {FileNodeProps} from "@/pages/yakRunner/FileTree/FileTreeType"
import {useMemo, useState} from "react"
import FilePreview from "../FilePreview/FilePreview"
import FileTreeSystemListWapper from "../FileTreeSystemList/FileTreeSystemList"
import {useMemoizedFn} from "ahooks"
import useAIChatUIData from "@/pages/ai-re-act/hooks/useAIChatUIData"
import {historyStore, useHistoryItems} from "../store/useHistoryFolder"
import {useCustomFolder, customFolderStore} from "../store/useCustomFolder"

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
        const aiFolderDom = (
            <FileTreeSystemListWapper
                key='aiFolder'
                path={grpcFolders.map((item) => ({path: item, isFolder: true}))}
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
                title='已打开文件/文件夹'
                selected={selected}
                historyFolder={historyFolder}
                path={customFolder}
                setOpenFolder={onSetFolder}
                setSelected={setSelected}
            />
        )
        return [aiFolderDom, customFolderDom]
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
            firstNode={filstNode}
            secondNode={<FilePreview data={filePreviewData} />}
        />
    )
}

export default FileTreeSystem
