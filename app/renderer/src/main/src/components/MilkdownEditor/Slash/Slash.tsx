import {Ctx} from "@milkdown/kit/ctx"
import {slashFactory, SlashProvider} from "@milkdown/kit/plugin/slash"
import {useInstance} from "@milkdown/react"
import {usePluginViewContext} from "@prosemirror-adapter/react"
import React, {useCallback, useEffect, useRef} from "react"
import {useCreation, useDebounceEffect, useMemoizedFn} from "ahooks"
import {HttpUploadImgBaseRequest} from "@/apiUtils/http"
import {InitEditorHooksLocalProps} from "../utils/initEditor"
import {
    MilkdownMenuType,
    MilkdownMenuKeyEnum,
    createMilkdownMenuListByKey,
    baseSlashKey,
    onlineCommonSlashKey,
    localCommonSlashKey
} from "../constants"
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
                const parentNode = $from.node(-1)

                // 段落开头并含有/才显示
                if (
                    parentNode.type.name === "doc" &&
                    node.type.name === "paragraph" &&
                    node.content.size === 1 &&
                    node.textContent === "/"
                ) {
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
            return {
                基础: createMilkdownMenuListByKey(baseSlashKey),
                常用: createMilkdownMenuListByKey(localCommonSlashKey)
            }
        } else {
            return {
                基础: createMilkdownMenuListByKey(baseSlashKey),
                常用: createMilkdownMenuListByKey(onlineCommonSlashKey)
            }
        }
    }, [localProps?.local])

    const onSelect = useMemoizedFn((key: MilkdownMenuType) => {
        switch (key) {
            case MilkdownMenuKeyEnum.Text:
                break
            case MilkdownMenuKeyEnum.Heading1:
                createBlankHeading1(action, view)
                break
            case MilkdownMenuKeyEnum.Heading2:
                createBlankHeading2(action, view)
                break
            case MilkdownMenuKeyEnum.Heading3:
                createBlankHeading3(action, view)
                break
            case MilkdownMenuKeyEnum.OrderedList:
                createBlankOrderedList(action, view)
                break
            case MilkdownMenuKeyEnum.UnorderedList:
                createBlankUnorderedList(action, view)
                break
            case MilkdownMenuKeyEnum.CodeBlock:
                createBlankCodeBlock(action, view)
                break
            case MilkdownMenuKeyEnum.Quote:
                createBlankQuote(action, view)
                break
            case MilkdownMenuKeyEnum.Divider:
                createDivider(action, view)
                break
            case MilkdownMenuKeyEnum.Task:
                createBlankTask(action, view)
                break
            case MilkdownMenuKeyEnum.HighLight:
                createBlankHighLight(action, view)
                break
            case MilkdownMenuKeyEnum.File:
                uploadFileInMilkdown(action, {
                    type,
                    notepadHash: notepadHash || "",
                    userId: userInfo.user_id || 0
                })
                break
            default:
                break
        }
        if (key !== MilkdownMenuKeyEnum.CodeBlock) {
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
                            <div key={ele.key} className={styles["slash-item"]} onClick={() => onSelect(ele.key)}>
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
