import classNames from "classnames"
import styles from "./FileTreeDrop.module.scss"
import type {FC, ReactNode} from "react"
import {useMemo} from "react"
import {historyStore} from "../../components/aiFileSystemList/store/useHistoryFolder"
import {customFolderStore} from "../../components/aiFileSystemList/store/useCustomFolder"
import {useFileTreeDrop} from "../hooks/useFileTreeDrop"
import {DragSource} from "../type"

type FileTreeDropRenderProps = {
    setDragSource: (source: DragSource) => void
}

type FileTreeDropProps = {
    className?: string
    children?: (props: FileTreeDropRenderProps) => ReactNode
}

const FileTreeDrop: FC<FileTreeDropProps> = ({className, children}) => {
    const {
        dropRef,
        dragging,
        dragSource,
        setDragSource
    } = useFileTreeDrop({
        onAddPath: (path, isFolder) => {
            historyStore.addHistoryItem({path, isFolder})
            customFolderStore.addCustomFolderItem({path, isFolder})
        }
    })

    const renderProps = useMemo<FileTreeDropRenderProps>(() => {
        return {setDragSource}
    }, [setDragSource])

    const showDropHint =
        dragging && dragSource !== "AIRreeToChat"

    return (
        <div
            ref={dropRef}
            className={classNames(
                styles.container,
                className,
                {
                    [styles.dragging]: showDropHint
                }
            )}
        >
            {children?.(renderProps)}
        </div>
    )
}

export default FileTreeDrop
