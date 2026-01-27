import {Ctx} from "@milkdown/kit/ctx"
import {slashFactory, SlashProvider} from "@milkdown/kit/plugin/slash"
import {useInstance} from "@milkdown/react"
import {usePluginViewContext} from "@prosemirror-adapter/react"
import React, {useCallback, useEffect, useRef} from "react"
import {useCreation, useDebounceEffect, useDebounceFn, useMemoizedFn} from "ahooks"
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
    createDivider,
    createBlankText
} from "../utils/utils"
import {useStore} from "@/store"
import type {VirtualElement} from "@floating-ui/dom"
import {computePosition, flip, offset} from "@floating-ui/dom"
import {posToDOMRect} from "@milkdown/prose"

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
    const initializedRef = useRef<boolean>(false)

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
                return onShouldShow(view)
            }
        })

        return () => {
            slashProvider.current?.destroy()
        }
    }, [loading])

    useDebounceEffect(
        () => {
            if (loading || !slashProvider.current) return
            slashUpdate(view, prevState)
        },
        [loading, view, prevState],
        {wait: 200, leading: true}
    )

    /**根据编辑器选中得变化更新 slash 得位置 */
    const slashUpdate = useDebounceFn(
        (view: EditorView, prevState?: EditorState) => {
            if (!ref.current) return
            const {state, composing} = view
            const {selection, doc} = state
            const {ranges} = selection
            const from = Math.min(...ranges.map((range) => range.$from.pos))
            const to = Math.max(...ranges.map((range) => range.$to.pos))
            const isSame = prevState && prevState.doc.eq(doc) && prevState.selection.eq(selection)

            if (!initializedRef.current) {
                view.dom.parentElement?.appendChild(ref.current)
                initializedRef.current = true
            }

            if (composing || isSame) return
            if (!onShouldShow(view)) {
                slashProvider.current?.hide()
                return
            }
            const virtualEl: VirtualElement = {
                getBoundingClientRect: () => posToDOMRect(view, from, to)
            }
            computePosition(virtualEl, ref.current, {
                placement: "top",
                middleware: [flip()]
            }).then(({x, y}) => {
                if (!ref.current) return
                let styleObj: {left: null | string; top: null | string} = {
                    left: `12px`, // 目前只有空段落才会显示,left为12;
                    top: `${y > 0 ? y : 0}px`
                }
                Object.assign(ref.current.style, styleObj)
            })

            slashProvider.current?.show()
        },
        {wait: 200}
    ).run
    /**判断 slash 是否显示 */
    const onShouldShow = (view: EditorView): boolean => {
        if (!ref.current) {
            return false
        }
        const {selection} = view.state
        const {$from} = selection
        const node = $from.node()
        const parentNode = $from.node(-1)

        // 段落开头并含有/才显示
        if (
            parentNode&&parentNode.type.name === "doc" &&
            node&&node.type.name === "paragraph" &&
            node.content.size === 1 &&
            node.textContent === "/"
        ) {
            return true
        }
        return false
    }

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
                createBlankText(action, view)
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
                const {dispatch, state} = view
                const {tr, selection} = state
                const {from} = selection
                dispatch(tr.deleteRange(from - 1, from))
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
