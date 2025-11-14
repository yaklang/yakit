import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {FileNodeProps} from "@/pages/yakRunner/FileTree/FileTreeType"
import {FC, useState} from "react"
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
                setSelected={setSelected}
                title='ai生成文件夹'
                isOpen={false}
            />
        )

        const customFolderDom = (
            <FileTreeSystemListWapper
                isOpen
                key='customFolder'
                title='本地文件夹'
                path={Array.from(customFolder)}
                setOpenFolder={customFolderStore.addCustomFolder}
                setSelected={setSelected}
            />
        )
        return [aiFolderDom, customFolderDom]
    })

    return (
        <YakitResizeBox
            firstRatio='300px'
            firstNodeStyle={{padding: "4px", overflowY: "auto"}}
            lineDirection='right'
            firstMinSize={200}
            lineStyle={{width: 4}}
            firstNode={filstNode}
            secondNode={<FilePreview data={selected} />}
        />
    )
}

export default FileTreeSystem
