import {FileNodeProps} from "@/pages/yakRunner/FileTree/FileTreeType"
import {useState} from "react"
import {useCustomFolder} from "../../components/aiFileSystemList/store/useCustomFolder"
import FileTreeSystemListWapper from "../../components/aiFileSystemList/FileTreeSystemListWapper/FileTreeSystemListWapper"
import FileTreeDrop from "../FileTreeDrop/FileTreeDrop"

const FileTreeList = () => {
    const [selected, setSelected] = useState<FileNodeProps>()
    // 用户文件夹
    const customFolder = useCustomFolder()

    return (
        <FileTreeDrop>
            {({setDragSource}) => (
                <FileTreeSystemListWapper
                    isOpen
                    key='customFolder'
                    title='我打开的文件'
                    selected={selected}
                    path={customFolder}
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
    )
}
export default FileTreeList
