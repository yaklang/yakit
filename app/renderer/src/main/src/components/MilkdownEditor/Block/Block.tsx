import {BlockProvider} from "@milkdown/kit/plugin/block"
import {useInstance} from "@milkdown/react"
import {useCallback, useEffect, useRef, useState} from "react"
import {usePluginViewContext} from "@prosemirror-adapter/react"
import {paragraphSchema} from "@milkdown/kit/preset/commonmark"
import {TextSelection} from "@milkdown/kit/prose/state"
import styles from "./Block.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinePlusIcon} from "@/assets/icon/outline"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"

import {useMemoizedFn} from "ahooks"
import {Ctx} from "@milkdown/kit/ctx"
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
import {Tooltip} from "antd"
import {
    BlockListProps,
    createMilkdownMenuListByKey,
    localBlockKey,
    MilkdownMenuKeyEnum,
    onlineBlockKey
} from "../constants"
import {HttpUploadImgBaseRequest} from "@/apiUtils/http"
import {useStore} from "@/store"
import {InitEditorHooksLocalProps} from "../utils/initEditor"

interface BlockViewProps {
    type: HttpUploadImgBaseRequest["type"]
    notepadHash?: string
    localProps?: InitEditorHooksLocalProps
}
export const BlockView: React.FC<BlockViewProps> = (props) => {
    const {notepadHash, type, localProps} = props

    const userInfo = useStore((s) => s.userInfo)

    const ref = useRef<HTMLDivElement>(null)
    const blockProvider = useRef<BlockProvider>()

    const [visibleAdd, setVisibleAdd] = useState(false)
    const [blockList, setBlockList] = useState<BlockListProps[]>(
        !!localProps?.local ? createMilkdownMenuListByKey(localBlockKey) : createMilkdownMenuListByKey(onlineBlockKey)
    ) // 后期选中某个类型的组件可能不会显示一些操作

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

        const editor = get()
        if (!editor) {
            return
        }
        blockProvider.current = new BlockProvider({
            ctx: editor.ctx,
            content: div
        })
        blockProvider.current?.update()
    }, [loading])

    useEffect(() => {
        return () => {
            // 单独的Effect中卸载，避免在开发过程中热加载的时候报错
            blockProvider.current?.destroy()
        }
    }, [])

    const onAddContent = useMemoizedFn(({key}) => {
        switch (key) {
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
            case MilkdownMenuKeyEnum.Task:
                createBlankTask(action, view)
                break
            case MilkdownMenuKeyEnum.CodeBlock:
                createBlankCodeBlock(action, view)
                break
            case MilkdownMenuKeyEnum.Quote:
                createBlankQuote(action, view)
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
            case MilkdownMenuKeyEnum.Divider:
                createDivider(action, view)
                break

            default:
                break
        }
        if (key !== MilkdownMenuKeyEnum.CodeBlock) {
            view.focus()
        }
        setVisibleAdd(false)
        blockProvider.current?.hide()
    })
    const onAdd = (e) => {
        e.preventDefault()
        e.stopPropagation()
        const editor = get()
        if (!editor) return
        if (!view.hasFocus()) view.focus()
        const {state, dispatch} = view
        const active = blockProvider.current?.active
        if (!active) return
        const $pos = active.$pos
        const pos = $pos.pos + active.node.nodeSize
        let tr = state.tr.insert(pos, paragraphSchema.type(editor.ctx).create())
        tr = tr.setSelection(TextSelection.near(tr.doc.resolve(pos)))
        dispatch(tr.scrollIntoView())
        blockProvider.current?.hide()
    }
    return (
        <div className={styles["block-wrapper"]} ref={ref}>
            <YakitPopover
                overlayClassName={styles["tooltip-popover"]}
                placement='bottomLeft'
                content={
                    <div className={styles["tooltip-popover-content"]}>
                        {blockList.map((ele) => (
                            <Tooltip key={ele.key} title={ele.description}>
                                <YakitButton
                                    key={ele.key}
                                    size='large'
                                    type='text2'
                                    icon={ele.icon}
                                    onClick={() => onAddContent(ele)}
                                />
                            </Tooltip>
                        ))}
                    </div>
                }
                visible={visibleAdd}
                onVisibleChange={setVisibleAdd}
            >
                <div className={styles["tooltip-popover-btn"]} onMouseDown={onAdd}>
                    <OutlinePlusIcon />
                </div>
            </YakitPopover>
        </div>
    )
}
