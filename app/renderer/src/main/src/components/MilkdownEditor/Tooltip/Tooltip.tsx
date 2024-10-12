import {Ctx} from "@milkdown/kit/ctx"
import {tooltipFactory, TooltipProvider} from "@milkdown/kit/plugin/tooltip"
import {
    codeBlockSchema,
    listItemSchema,
    toggleEmphasisCommand,
    toggleInlineCodeCommand,
    toggleStrongCommand,
    turnIntoTextCommand,
    wrapInBlockquoteCommand,
    wrapInBulletListCommand,
    wrapInHeadingCommand,
    wrapInOrderedListCommand
} from "@milkdown/kit/preset/commonmark"
import {useInstance} from "@milkdown/react"
import {usePluginViewContext} from "@prosemirror-adapter/react"
import {ReactNode, useCallback, useEffect, useRef, useState} from "react"
import {callCommand} from "@milkdown/kit/utils"
import {useDebounceEffect, useMemoizedFn} from "ahooks"
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
import {
    OutlineAnnotationIcon,
    OutlineChevrondownIcon,
    OutlineChevronupIcon,
    OutlineLightbulbIcon
} from "@/assets/icon/outline"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {toggleStrikethroughCommand} from "@milkdown/kit/preset/gfm"
import {NodeType, Attrs} from "@milkdown/kit/prose/model"
import {Transaction} from "@milkdown/kit/prose/state"
import {setWrapInBlockType} from "./utils"
import classNames from "classnames"
import {alterCommand, alterToParagraphCommand} from "../utils/alertPlugin"
import {underlineCommand} from "../utils/underline"

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

interface TooltipViewProps {}
export const TooltipView: React.FC<TooltipViewProps> = () => {
    const [visibleText, setVisibleText] = useState<boolean>(false)
    const [visibleLight, setVisibleLight] = useState<boolean>(false)
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
            content: div,
            offset: {
                crossAxis: 100
            }
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
        action(callCommand(underlineCommand.key))
    })
    const onAddCode = useMemoizedFn((e) => {
        e.preventDefault()
        action(callCommand(toggleInlineCodeCommand.key))
    })
    const onComment = useMemoizedFn((e) => {
        e.preventDefault()
    })
    const onText = useMemoizedFn(({label}) => {
        switch (label) {
            case "正文":
                action(callCommand(turnIntoTextCommand.key))
                break
            case "一级标题":
                action(callCommand(wrapInHeadingCommand.key, 1))
                break
            case "二级标题":
                action(callCommand(wrapInHeadingCommand.key, 2))
                break
            case "三级标题":
                action(callCommand(wrapInHeadingCommand.key, 3))
                break
            case "有序列表":
                action(callCommand(wrapInOrderedListCommand.key))
                break
            case "无序列表":
                action(callCommand(wrapInBulletListCommand.key))
                break
            case "任务":
                action((ctx) => {
                    const {dispatch, state} = view
                    const command = setWrapInBlockType(listItemSchema.type(ctx), {checked: false})
                    command(state, dispatch)
                })
                break
            case "代码块":
                action((ctx) => {
                    const {dispatch, state} = view
                    const command = setWrapInBlockType(codeBlockSchema.type(ctx))
                    command(state, dispatch)
                })
                break
            case "引用":
                action(callCommand(wrapInBlockquoteCommand.key))
                break
            default:
                break
        }
        setVisibleText(false)
    })
    const onLight = useMemoizedFn((type: string) => {
        switch (type) {
            case "remove":
                action(callCommand(alterToParagraphCommand.key))
                break
            default:
                action(callCommand(alterCommand.key, type))
                break
        }
        setVisibleLight(false)
    })
    return (
        <div className={styles["tooltip"]} ref={ref}>
            <YakitPopover
                overlayClassName={styles["tooltip-popover"]}
                placement='bottomLeft'
                visible={visibleText}
                onVisibleChange={setVisibleText}
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
                        {visibleText ? (
                            <OutlineChevronupIcon className={styles["t-icon"]} />
                        ) : (
                            <OutlineChevrondownIcon className={styles["t-icon"]} />
                        )}
                    </div>
                </div>
            </YakitPopover>
            <div className={styles["tooltip-divider"]} />
            <YakitPopover
                overlayClassName={styles["tooltip-popover"]}
                placement='bottomLeft'
                visible={visibleLight}
                onVisibleChange={setVisibleLight}
                content={
                    <div className={styles["tooltip-light-popover-content"]}>
                        {["remove", "note", "success", "warning", "danger"].map((type) => (
                            <div
                                key={type}
                                className={classNames(styles["tooltip-type-item"], styles[`item-${type}`])}
                                onClick={() => onLight(type)}
                            />
                        ))}
                    </div>
                }
            >
                <div className={styles["tooltip-light-wrapper"]}>
                    <div className={styles["tooltip-t"]}>
                        <OutlineLightbulbIcon />
                        {visibleLight ? (
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
