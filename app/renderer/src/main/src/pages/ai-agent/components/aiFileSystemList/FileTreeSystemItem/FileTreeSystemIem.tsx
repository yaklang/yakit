import {FileNodeProps} from "@/pages/yakRunner/FileTree/FileTreeType"
import {FolderDefault, FolderDefaultExpanded, KeyToIcon} from "@/pages/yakRunner/FileTree/icon"
import {FC, useMemo} from "react"
import styles from "./FileTreeSystemItem.module.scss"
// import {Dropdown} from "antd"
// import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"

const FileTreeSystemItem: FC<{
    data: FileNodeProps
    expanded?: boolean
}> = ({data, expanded}) => {
    const iconImage = useMemo(() => {
        if (!data.isFolder) return KeyToIcon[data.icon].iconPath
        if (expanded) return KeyToIcon[FolderDefaultExpanded].iconPath
        return KeyToIcon[FolderDefault].iconPath
    }, [data.icon, data.isFolder, expanded])

    // const handleDropdown = (key: string) => {
    //     switch (key) {
    //         case 'path':

    //             break;

    //         default:
    //             break;
    //     }
    // }

    return (
        // <YakitDropdownMenu
        //     menu={{
        //         data: [
        //             {
        //                 key: "path",
        //                 label: "复制路径"
        //             },
        //             {
        //                 key: "relativePath",
        //                 label: "复制相对路径"
        //             },
        //             {
        //                 key: "openFolder",
        //                 label: "在文件夹中显示"
        //             }
        //         ],
        //         onClick({domEvent, key}) {
        //             domEvent.preventDefault()
        //             handleDropdown(key)
        //         }
        //     }}
        //     dropdown={{
        //         trigger: ["contextMenu"],
        //         placement: "bottomRight",
        //         getPopupContainer: () => document.body
        //     }}
        // >
        <div className={styles["file-tree-system-item"]}>
            <img src={iconImage} alt='' />
            <span>{data.name}</span>
        </div>
        // </YakitDropdownMenu>
    )
}

export default FileTreeSystemItem
