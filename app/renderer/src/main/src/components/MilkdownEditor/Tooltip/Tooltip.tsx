import {Ctx} from "@milkdown/kit/ctx"
import {tooltipFactory, TooltipProvider} from "@milkdown/kit/plugin/tooltip"
import {
    codeBlockSchema,
    toggleEmphasisCommand,
    toggleInlineCodeCommand,
    toggleStrongCommand
} from "@milkdown/kit/preset/commonmark"
import {useInstance} from "@milkdown/react"
import {usePluginViewContext} from "@prosemirror-adapter/react"
import {ReactNode, useCallback, useEffect, useRef, useState} from "react"
import {callCommand} from "@milkdown/kit/utils"
import {useDebounceEffect, useDebounceFn, useMemoizedFn} from "ahooks"
import {
    IconBold,
    IconCheckSquare,
    IconCode2,
    IconCurlyBraces,
    IconHeading1,
    IconHeading2,
    IconHeading3,
    IconItalic,
    IconList,
    IconListOrdered,
    IconQuote,
    IconStrikethrough,
    IconType,
    IconUnderline
} from "../icon/icon"
import styles from "./Tooltip.module.scss"
import React from "react"
import {OutlineAnnotationIcon, OutlineChevrondownIcon, OutlineChevronupIcon} from "@/assets/icon/outline"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {toggleStrikethroughCommand} from "@milkdown/kit/preset/gfm"
import {NodeType, Attrs} from "@milkdown/kit/prose/model"
import {Command, Transaction} from "@milkdown/kit/prose/state"

export const tooltip = tooltipFactory("Text")

const tooltipTextList = [
    {
        id: 1,
        icon: <IconType />,
        label: "正文"
    },
    {
        id: 2,
        icon: <IconHeading1 />,
        label: "一级标题"
    },
    {
        id: 3,
        icon: <IconHeading2 />,
        label: "二级标题"
    },
    {
        id: 4,
        icon: <IconHeading3 />,
        label: "三级标题"
    },
    {
        id: 5,
        label: "divider"
    },
    {
        id: 6,
        icon: <IconListOrdered />,
        label: "有序列表"
    },
    {
        id: 7,
        icon: <IconList />,
        label: "无序列表"
    },
    {
        id: 8,
        icon: <IconCheckSquare />,
        label: "任务"
    },
    {
        id: 9,
        label: "divider"
    },
    {
        id: 10,
        icon: <IconCurlyBraces />,
        label: "代码块"
    },
    {
        id: 11,
        icon: <IconQuote />,
        label: "引用"
    }
]
const addBlockType = (tr: Transaction, nodeType: NodeType, attrs: Attrs | null = null) => {
    const node = nodeType.createAndFill(attrs)
    if (!node) return null

    return tr.replaceSelectionWith(node)
}
const clearRange = (tr: Transaction) => {
    const {$from, $to} = tr.selection
    const {pos: from} = $from
    const {pos: to} = $to
    tr = tr.deleteRange(from - $from.node().content.size, to)
    return tr
}
const clearContentAndAddBlockType = (nodeType: NodeType, attrs: Attrs | null = null) => {
    return (state, dispatch) => {
        const tr = addBlockType(clearRange(state.tr), nodeType, attrs)
        if (!tr) return false

        if (dispatch) dispatch(tr.scrollIntoView())

        return true
    }
}

interface TooltipViewProps {}
export const TooltipView: React.FC<TooltipViewProps> = () => {
    const [visible, setVisible] = useState<boolean>(false)
    const ref = useRef<HTMLDivElement>(null)
    const tooltipProvider = useRef<TooltipProvider>()

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
        tooltipProvider.current = new TooltipProvider({
            content: div
        })

        return () => {
            tooltipProvider.current?.destroy()
        }
    }, [loading])

    useDebounceEffect(
        () => {
            tooltipProvider.current?.update(view, prevState)
        },
        [view, prevState],
        {wait: 200, leading: true}
    )
    const onBold = useMemoizedFn((e) => {
        e.preventDefault()
        action(callCommand(toggleStrongCommand.key))
    })

    const onEmphasis = useMemoizedFn((e) => {
        e.preventDefault()
        action(callCommand(toggleEmphasisCommand.key))
    })
    const onStrikethrough = useMemoizedFn((e) => {
        e.preventDefault()
        action(callCommand(toggleStrikethroughCommand.key))
    })
    const onUnderline = useMemoizedFn((e) => {
        e.preventDefault()
        action(callCommand("toggleUnderlineCommand"))
    })
    const onAddCode = useMemoizedFn((e) => {
        e.preventDefault()
        const {dispatch, state} = view
        const editor = get()
        if (!editor) return
        const command = clearContentAndAddBlockType(codeBlockSchema.type(editor.ctx))
        command(state, dispatch)
    })
    const onComment = useMemoizedFn((e) => {
        e.preventDefault()
    })
    const onText = useMemoizedFn(({label}) => {
        switch (label) {
            case "正文":
                break

            default:
                break
        }
    })
    return (
        <div className={styles["tooltip"]} ref={ref}>
            <YakitPopover
                overlayClassName={styles["tooltip-popover"]}
                placement='bottomLeft'
                onVisibleChange={setVisible}
                content={
                    <div className={styles["tooltip-popover-content"]}>
                        {tooltipTextList.map((item) => {
                            return item.label === "divider" ? (
                                <div key={item.id} className={styles["tooltip-divider-horizontal"]} />
                            ) : (
                                <div key={item.id} className={styles["tooltip-list-item"]} onClick={() => onText(item)}>
                                    <span className={styles["icon"]}>{item.icon}</span>
                                    <span>{item.label}</span>
                                </div>
                            )
                        })}
                    </div>
                }
            >
                <div className={styles["tooltip-t-wrapper"]}>
                    <div className={styles["tooltip-t"]}>
                        <IconType />
                        {visible ? (
                            <OutlineChevronupIcon className={styles["t-icon"]} />
                        ) : (
                            <OutlineChevrondownIcon className={styles["t-icon"]} />
                        )}
                    </div>
                </div>
            </YakitPopover>
            <div className={styles["tooltip-divider"]} />
            <div className={styles["tooltip-tool"]}>
                <TooltipIcon icon={<IconBold />} onClick={onBold} />
                <TooltipIcon icon={<IconStrikethrough />} onClick={onStrikethrough} />
                <TooltipIcon icon={<IconItalic />} onClick={onEmphasis} />
                <TooltipIcon icon={<IconUnderline />} onClick={onUnderline} />
                <TooltipIcon icon={<IconCode2 />} onClick={onAddCode} />
                <TooltipIcon icon={<OutlineAnnotationIcon />} onClick={onComment} />
            </div>
        </div>
    )
}

interface TooltipIconProps {
    icon: ReactNode
    onClick: React.MouseEventHandler<HTMLDivElement>
}
const TooltipIcon: React.FC<TooltipIconProps> = React.memo((props) => {
    const {icon, onClick} = props
    return (
        <div className={styles["tooltip-icon"]} onClick={onClick}>
            {icon}
        </div>
    )
})
