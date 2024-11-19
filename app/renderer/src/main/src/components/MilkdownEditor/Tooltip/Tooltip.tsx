import {Ctx} from "@milkdown/kit/ctx"
import {tooltipFactory, TooltipProvider} from "@milkdown/kit/plugin/tooltip"
import {
    createCodeBlockCommand,
    listItemSchema,
    paragraphSchema,
    toggleEmphasisCommand,
    toggleInlineCodeCommand,
    toggleStrongCommand,
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
import {IconBold, IconCode2, IconItalic, IconStrikethrough, IconType, IconUnderline} from "../icon/icon"
import styles from "./Tooltip.module.scss"
import React from "react"
import {OutlineChevrondownIcon, OutlineChevronupIcon, OutlineLightbulbIcon} from "@/assets/icon/outline"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {toggleStrikethroughCommand} from "@milkdown/kit/preset/gfm"
import classNames from "classnames"
import {alterCommand, alterToParagraphCommand} from "../utils/alertPlugin"
import {underlineCommand} from "../utils/underline"
import {commentCommand} from "../utils/commentPlugin"
import {setWrapInBlockType} from "../utils/utils"
import {Tooltip} from "antd"
import {MilkdownBaseUtilProps, TooltipListProps} from "../MilkdownEditorType"
import {cloneDeep} from "lodash"
import {defaultTooltipList} from "../constants"
import {listToParagraphCommand} from "../utils/listPlugin"
import {listToHeadingCommand} from "../utils/headingPlugin"

export const tooltip = tooltipFactory("Text")

const highlight = [
    {
        label: "remove",
        description: "清除高亮"
    },
    {
        label: "note",
        description: "灰色:  :::note空格"
    },
    {
        label: "success",
        description: "绿色:  :::success空格"
    },
    {
        label: "danger",
        description: "红色:  :::danger空格"
    },
    {
        label: "warning",
        description: "黄色:  :::warning空格"
    }
]

interface TooltipViewProps {}
export const TooltipView: React.FC<TooltipViewProps> = () => {
    const [visibleText, setVisibleText] = useState<boolean>(false)
    const [visibleLight, setVisibleLight] = useState<boolean>(false)
    const [tooltipTextList, setTooltipTextList] = useState<TooltipListProps[]>(cloneDeep(defaultTooltipList))

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
    const onAddComment = useMemoizedFn((e) => {
        e.preventDefault()
        action(callCommand(commentCommand.key, "111"))
    })
    const onText = useMemoizedFn(({label}) => {
        const {dispatch, state} = view
        switch (label) {
            case "正文":
                convertToParagraph()
                break
            case "一级标题":
                convertToHeading(1)
                break
            case "二级标题":
                convertToHeading(2)
                break
            case "三级标题":
                convertToHeading(3)
                break
            case "有序列表":
                action(callCommand(wrapInOrderedListCommand.key))
                break
            case "无序列表":
                action(callCommand(wrapInBulletListCommand.key))
                break
            case "任务":
                action((ctx) => {
                    const command = setWrapInBlockType(listItemSchema.type(ctx), {checked: false})
                    command(state, dispatch)
                })
                break
            case "代码块":
                action(callCommand(createCodeBlockCommand.key))
                break
            case "引用":
                action(callCommand(wrapInBlockquoteCommand.key))
                break
            default:
                break
        }
        tooltipProvider.current?.hide()
        setVisibleText(false)
    })
    /**
     * 获取选中内容的父节点类型
     */
    const getParentNodeTypeBySelection = useMemoizedFn(() => {
        try {
            const {state} = view
            const {selection} = state
            const {$from} = selection
            // 获取父节点类型
            const parentNode = $from.node(-1) // 使用 -1 获取上一级节点
            return parentNode.type.name
        } catch (error) {
            return ""
        }
    })
    /**选中的内容是否是list */
    const isListTypeSelection = useMemoizedFn(() => {
        try {
            const {state} = view
            return getParentNodeTypeBySelection() === state.schema.nodes.list_item.name
        } catch (error) {
            return false
        }
    })
    /**
     * 转为正文,目前除了常见的，只支持list
     */
    const convertToParagraph = useMemoizedFn(() => {
        try {
            const {dispatch, state} = view
            if (isListTypeSelection()) {
                action(callCommand(listToParagraphCommand.key))
            } else {
                action((ctx) => {
                    const command = setWrapInBlockType(paragraphSchema.type(ctx))
                    command(state, dispatch)
                })
            }
        } catch (error) {}
    })
    /**
     * 转为标题,目前除了常见的，只支持list
     * @param level 标题级别
     */
    const convertToHeading = useMemoizedFn((level: number) => {
        try {
            if (isListTypeSelection()) {
                action(callCommand(listToHeadingCommand.key, level))
            } else {
                action(callCommand(wrapInHeadingCommand.key, level))
            }
        } catch (error) {}
    })
    /**高亮操作 */
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
                        {tooltipTextList.map((ele) => {
                            if (ele.label === "divider") {
                                return <div key={ele.id} className={styles["tooltip-divider-horizontal"]} />
                            }
                            const item = ele as MilkdownBaseUtilProps
                            return (
                                <Tooltip key={item.id} title={item.description} placement='right'>
                                    <div
                                        key={item.id}
                                        className={styles["tooltip-list-item"]}
                                        onClick={() => onText(item)}
                                    >
                                        <span className={styles["icon"]}>{item.icon}</span>
                                        <span>{item.label}</span>
                                    </div>
                                </Tooltip>
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
                        {highlight.map((item) => (
                            <Tooltip key={item.label} title={item.description}>
                                <div
                                    key={item.label}
                                    className={classNames(styles["tooltip-type-item"], styles[`item-${item.label}`])}
                                    onClick={() => onLight(item.label)}
                                />
                            </Tooltip>
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
                <TooltipIcon title='粗体:**文本**空格' icon={<IconBold />} onClick={onBold} />
                <TooltipIcon title='删除线:~文本~空格' icon={<IconStrikethrough />} onClick={onStrikethrough} />
                <TooltipIcon title='斜体:*文本*空格' icon={<IconItalic />} onClick={onEmphasis} />
                <TooltipIcon title='下划线: :u[文本]' icon={<IconUnderline />} onClick={onUnderline} />
                <TooltipIcon title='代码块:```空格' icon={<IconCode2 />} onClick={onAddCode} />
                {/* <TooltipIcon icon={<OutlineAnnotationIcon />} onClick={onAddComment} /> */}
            </div>
        </div>
    )
}

interface TooltipIconProps {
    title?: ReactNode
    icon: ReactNode
    onClick: React.MouseEventHandler<HTMLDivElement>
}
const TooltipIcon: React.FC<TooltipIconProps> = React.memo((props) => {
    const {icon, onClick, title} = props
    const node = (
        <div className={styles["tooltip-icon"]} onClick={onClick}>
            {icon}
        </div>
    )
    return title ? <Tooltip title={title}>{node}</Tooltip> : node
})
