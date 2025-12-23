import {useDrop} from "ahooks"
import {useRef, useState, useCallback} from "react"
import {FileListStoreKey, FileToChatQuestionList, fileToChatQuestionStore} from "@/pages/ai-re-act/aiReActChat/store"
import {handleOnFiles} from "../utils"

export const TREE_DRAG_KEY = "application/x-file-chat-path"

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
            if (!e?.dataTransfer) return

            const dt = e.dataTransfer
            const isTreeDrag = !!dt.getData(TREE_DRAG_KEY)
            const isDesktopDrag = dt.files && dt.files.length > 0

            if (isTreeDrag || isDesktopDrag) {
                setIsHovering(true)
            }
        },

        onDragOver: (e) => {
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
