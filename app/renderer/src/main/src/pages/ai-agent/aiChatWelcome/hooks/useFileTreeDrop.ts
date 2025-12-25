import {useDrop} from "ahooks"
import {useRef, useState} from "react"
import {yakitNotify} from "@/utils/notification"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import {DragSource} from "@/pages/ai-agent/aiChatWelcome/type"
import {fetchIsFolderByPath} from "../utils"

export interface UseFileTreeDropOptions {
    onAddPath: (path: string, isFolder: boolean) => void
}

export const useFileTreeDrop = (options: UseFileTreeDropOptions) => {
    const {onAddPath} = options

    const [dragging, setDragging] = useState<boolean>(false)
    const [dragSource, setDragSource] = useState<DragSource>(null)

    const dropRef = useRef<HTMLDivElement | null>(null)

    const {t} = useI18nNamespaces(["yakitUi"])

    useDrop(dropRef, {
        onDragEnter: () => {
            if (dragSource === "AIRreeToChat") return
            setDragging(true)
        },
        onDragLeave: () => {
            setDragging(false)
        },
        onDrop: () => {
            setDragging(false)
        },
        onFiles: async (files: File[]) => {
            try {
                setDragSource("desktopToAItree")

                for (const file of files) {
                    if (!("path" in file)) continue

                    const fileWithPath = file as File & {path: string}
                    const fullPath = fileWithPath.path

                    const isFolder = await fetchIsFolderByPath(fullPath)
                    if (isFolder !== null) {
                        onAddPath(fullPath, isFolder)
                    }
                }
            } catch {
                yakitNotify("error", t("YakitDraggerContent.file_read_error"))
            } finally {
                setDragSource(null)
            }
        }
    })

    return {
        dropRef,
        dragging,
        dragSource,
        setDragSource
    }
}
