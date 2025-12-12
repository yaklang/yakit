import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {FileNodeProps} from "@/pages/yakRunner/FileTree/FileTreeType"
import {useMemo, useState} from "react"
import FilePreview from "../FilePreview/FilePreview"
import FileTreeSystemListWapper from "../FileTreeSystemList/FileTreeSystemList"
import {useMemoizedFn} from "ahooks"
import {customFolderStore, useCustomFolder} from "../store/useCustomFolder"
import useAIChatUIData from "@/pages/ai-re-act/hooks/useAIChatUIData"
const FileTreeSystem = () => {
    // 单选
    const [selected, setSelected] = useState<FileNodeProps>()
    // ai的文件夹
    const {grpcFolders} = useAIChatUIData()
    // 用户文件夹
    const customFolder = useCustomFolder()

    const filstNode = useMemoizedFn(() => {
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
                path={Array.from(customFolder)}
                setOpenFolder={customFolderStore.addCustomFolder}
                setSelected={setSelected}
            />
        )
        return [aiFolderDom, customFolderDom]
    })

    const filePreviewData = useMemo(() => {
      if(selected?.isFolder) return undefined
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
