import {Ctx} from "@milkdown/kit/ctx"
import {slashFactory, SlashProvider} from "@milkdown/kit/plugin/slash"
import {useInstance} from "@milkdown/react"
import {usePluginViewContext} from "@prosemirror-adapter/react"
import React, {useCallback, useEffect, useRef} from "react"
import {useCreation, useDebounceEffect, useMemoizedFn} from "ahooks"
import {HttpUploadImgBaseRequest} from "@/apiUtils/http"
import {InitEditorHooksLocalProps} from "../utils/initEditor"
import {SlashType, SlashKeyEnum, localSlashList, onlineSlashList} from "../constants"
import styles from "./Slash.module.scss"
import {EditorView} from "@milkdown/kit/prose/view"
import {EditorState} from "@milkdown/kit/prose/state"
import {
    createBlankHeading1,
    createBlankHeading2,
    createBlankHeading3,
    createBlankOrderedList,
    createBlankUnorderedList,
    createBlankTask,
    createBlankCodeBlock,
    createBlankQuote,
    createBlankHighLight,
    uploadFileInMilkdown,
    createDivider
} from "../utils/utils"
import {useStore} from "@/store"

export const slash = slashFactory("Commands")

interface SlashViewProps {
    type: HttpUploadImgBaseRequest["type"]
    notepadHash?: string
    localProps?: InitEditorHooksLocalProps
}

export const SlashView: React.FC<SlashViewProps> = (props) => {
    const {type, notepadHash, localProps} = props
    const ref = useRef<HTMLDivElement>(null)
    const slashProvider = useRef<SlashProvider>()

    const userInfo = useStore((s) => s.userInfo)

    const {view, prevState} = usePluginViewContext()
    const [loading, get] = useInstance()
    const action = useCallback(
        (fn: (ctx: Ctx) => void) => {
            if (loading) return
            get().action(fn)
        },
        [loading]
    )

    useEffect(() => {
        const div = ref.current
        if (loading || !div) {
            return
        }
        slashProvider.current = new SlashProvider({
            content: div,
            shouldShow: (view: EditorView, prevState?: EditorState | undefined) => {
                const {selection} = view.state
                const {$from} = selection
                const node = $from.node()
                // 段落开头并含有/才显示
                if (node.type.name === "paragraph" && node.content.size === 1 && node.textContent === "/") {
                    return true
                }
                return false
            }
        })

        return () => {
            slashProvider.current?.destroy()
        }
    }, [loading])

    useDebounceEffect(
        () => {
            if (loading || !slashProvider.current) return
            slashProvider.current?.update(view, prevState)
        },
        [loading, view, prevState],
        {wait: 200, leading: true}
    )

    const slashList = useCreation(() => {
        if (!!localProps?.local) {
            return localSlashList
        } else {
            return onlineSlashList
        }
    }, [localProps?.local])

    const onSelect = useMemoizedFn((key: SlashType) => {
        switch (key) {
            case SlashKeyEnum.Text:
                break
            case SlashKeyEnum.Heading1:
                createBlankHeading1(action, view)
                break
            case SlashKeyEnum.Heading2:
                createBlankHeading2(action, view)
                break
            case SlashKeyEnum.Heading3:
                createBlankHeading3(action, view)
                break
            case SlashKeyEnum.OrderedList:
                createBlankOrderedList(action, view)
                break
            case SlashKeyEnum.UnorderedList:
                createBlankUnorderedList(action, view)
                break
            case SlashKeyEnum.CodeBlock:
                createBlankCodeBlock(action, view)
                break
            case SlashKeyEnum.Quote:
                createBlankQuote(action, view)
                break
            case SlashKeyEnum.Divider:
                createDivider(action, view)
                break
            case SlashKeyEnum.Task:
                createBlankTask(action, view)
                break
            case SlashKeyEnum.HighLight:
                createBlankHighLight(action, view)
                break
            case SlashKeyEnum.File:
                uploadFileInMilkdown(action, {
                    type,
                    notepadHash: notepadHash || "",
                    userId: userInfo.user_id || 0
                })
                break
            default:
                break
        }
        if (key !== SlashKeyEnum.CodeBlock) {
            view.focus()
        }
        slashProvider.current?.hide()
    })

    return (
        <div aria-expanded='false' data-show='false' className={styles["slash"]} ref={ref}>
            {Object.entries(slashList).map(([key, data]) => {
                return (
                    <div key={key}>
                        <div className={styles["slash-title"]}>{key}</div>
                        {data.map((ele) => (
                            <div key={ele.id} className={styles["slash-item"]} onClick={() => onSelect(ele.id)}>
                                {ele.icon}
                                {ele.label}
                            </div>
                        ))}
                    </div>
                )
            })}
        </div>
    )
}
