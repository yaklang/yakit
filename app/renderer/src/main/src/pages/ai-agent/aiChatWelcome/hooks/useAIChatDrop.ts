import {useDrop} from "ahooks"
import {DragEvent, useRef, useState, useCallback} from "react"
import {FileListStoreKey, FileToChatQuestionList, fileToChatQuestionStore} from "@/pages/ai-re-act/aiReActChat/store"
import {handleOnFiles} from "../utils"

export const TREE_DRAG_KEY = "application/x-file-chat-path"

const isValidDrag = (e: DragEvent<Element>): boolean => {
    if (!e?.dataTransfer) return false

    const dt = e.dataTransfer

    // 1. 检查是否为树形组件拖拽
    const isTreeDrag = dt.types.includes(TREE_DRAG_KEY)

    // 2. 检查是否为桌面文件拖拽（改进的方法）
    // 检查 types 数组中是否有 'Files'
    const isDesktopDragByTypes = dt.types.includes("Files")

    // 检查是否有任何文件类型
    const isDesktopDragByFileTypes = Array.from(dt.types).some(
        (type) =>
            type.startsWith("application/") ||
            type.startsWith("image/") ||
            type.startsWith("video/") ||
            type.startsWith("audio/") ||
            type.includes("file")
    )
    return isTreeDrag || isDesktopDragByTypes || isDesktopDragByFileTypes
}

const useAIChatDrop = (key: FileListStoreKey) => {
    const [isHovering, setIsHovering] = useState(false)

    const dropRef = useRef<HTMLDivElement | null>(null)

    const addToChatStore = useCallback(
        (items: FileToChatQuestionList[]) => {
            if (items.length === 0) return
            for (const item of items) {
                fileToChatQuestionStore.add(key, item)
            }
        },
        [key]
    )

    useDrop(dropRef, {
        onDragEnter: (e) => {
            if (!e) return
            if (!isValidDrag(e)) return
            setIsHovering(true)
        },

        onDragOver: (e) => {
            if (!e) return
            if (!isValidDrag(e)) return
            e?.preventDefault()
            if (!e?.dataTransfer) return

            e.dataTransfer.dropEffect = "copy"
            setIsHovering(true)
        },

        onDragLeave: () => {
            setIsHovering(false)
        },

        onDrop: async (e) => {
            setIsHovering(false)

            if (!e?.dataTransfer) return
            const dt = e.dataTransfer

            // Tree → Chat
            const treeData = dt.getData(TREE_DRAG_KEY)
            if (treeData) {
                try {
                    const parsed = JSON.parse(treeData) as FileToChatQuestionList
                    addToChatStore([parsed])
                } catch {}
                return
            }

            // Desktop → Chat
            const files = Array.from(dt.files ?? [])
            if (files.length === 0) return

            const items = await handleOnFiles(files)
            addToChatStore(items)
        }
    })

    return {
        dropRef,
        isHovering
    }
}

export default useAIChatDrop
