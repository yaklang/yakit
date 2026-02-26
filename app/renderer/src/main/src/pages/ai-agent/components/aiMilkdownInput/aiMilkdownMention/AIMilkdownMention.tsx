import React, {useCallback, useEffect, useRef} from "react"
import {Ctx} from "@milkdown/kit/ctx"
import {slashFactory, SlashProvider} from "@milkdown/kit/plugin/slash"
import {useInstance} from "@milkdown/react"
import {useNodeViewContext, usePluginViewContext} from "@prosemirror-adapter/react"
import {useClickAway, useCreation, useDebounceEffect, useKeyPress, useMemoizedFn} from "ahooks"
import styles from "./AIMilkdownMention.module.scss"
import {iconMap} from "@/pages/ai-agent/defaultConstant"
import {AIChatMention} from "../../aiChatMention/AIChatMention"
import {AIChatMentionProps, AIChatMentionSelectItem, AIMentionTypeItem, iconMapType} from "../../aiChatMention/type"
import {callCommand} from "@milkdown/kit/utils"
import {aiMentionCommand, AIMentionCommandParams} from "./aiMentionPlugin"
import classNames from "classnames"
import {OutlineXIcon} from "@/assets/icon/outline"
import {removeAIOffsetCommand} from "../customPlugin"
import {AIMilkdownInputBaseProps} from "../type"

export const aiMentionFactory = slashFactory("ai-mention-commands")

interface AIMilkdownMentionProps {
    onMemfitExtra?: (v: AIMentionCommandParams) => void
    filterMode?: AIChatMentionProps["filterMode"]
}
const mentionWidth = 300
const mentionTarget = "@"

export const AIMilkdownMention: React.FC<AIMilkdownMentionProps> = (props) => {
    const {onMemfitExtra, filterMode} = props
    const ref = useRef<HTMLDivElement>(null)
    const slashProvider = useRef<SlashProvider>()

    const {view, prevState} = usePluginViewContext()
    const [loading, get] = useInstance()
    const action = useCallback(
        (fn: (ctx: Ctx) => void) => {
            if (loading) return
            get().action(fn)
        },
        [loading]
    )
    useKeyPress(
        "esc",
        (e) => {
            e.stopPropagation()
            e.preventDefault()
            onHide()
        },
        {
            target: ref,
            exactMatch: true,
            useCapture: true
        }
    )
    useClickAway(() => {
        onHide()
    }, ref)

    useEffect(() => {
        const div = ref.current
        if (loading || !div) {
            return
        }
        slashProvider.current = new SlashProvider({
            content: div,
            trigger: mentionTarget
        })
    }, [loading])

    useEffect(() => {
        return () => {
            // 单独的Effect中卸载，避免报错
            slashProvider.current?.destroy()
        }
    }, [])

    useDebounceEffect(
        () => {
            if (loading || !slashProvider.current) return
            slashProvider.current?.update(view, prevState)
        },
        [loading, view, prevState],
        {wait: 200, leading: true}
    )

    const onSure = useMemoizedFn((type: AIMentionTypeItem, value?: AIChatMentionSelectItem) => {
        const params: AIMentionCommandParams = {
            mentionType: type,
            mentionId: value?.id || "0",
            mentionName: value?.name || ""
        }
        switch (type) {
            case "focusMode":
                action(callCommand(removeAIOffsetCommand.key))
                onMemfitExtra?.(params)
                break

            default:
                action(callCommand<AIMentionCommandParams>(aiMentionCommand.key, params))
                break
        }

        onHide()
    })

    const onHide = useMemoizedFn(() => {
        if (slashProvider.current?.element?.dataset?.show === "false") return
        view.focus()
        // 关闭窗口
        slashProvider.current?.hide()
    })

    return (
        <div
            aria-expanded='false'
            data-show='false'
            className={styles["ai-mention"]}
            style={{
                width: mentionWidth
            }}
            ref={ref}
        >
            <AIChatMention onSelect={onSure} filterMode={filterMode} />
        </div>
    )
}

interface AICustomMentionProps {}
export const AICustomMention: React.FC<AICustomMentionProps> = (props) => {
    const {node, selected, view, contentRef} = useNodeViewContext()
    const locked = node?.attrs?.lock ?? false
    const readonly = useCreation(() => {
        return !view.editable
    }, [view.editable])
    const onRemove = useMemoizedFn(() => {
        if (locked) return
        const {state, dispatch} = view
        const {from, to} = state.selection
        if (from !== to) {
            // 创建一个事务来删除选中的范围
            const tr = state.tr.delete(from, to)

            // 提交事务
            if (dispatch) {
                dispatch(tr)
            }
        }
    })
    return (
        <div
            className={classNames(styles["mention-custom"], {
                [styles["mention-custom-selected"]]: selected && !readonly
            })}
            contentEditable={false}
        >
            <div className={styles["mention-icon-wrapper"]}>
                {iconMap[node?.attrs?.mentionType as iconMapType] || null}
            </div>
            <div className={styles["content"]} ref={contentRef} contentEditable={false}></div>
            {!readonly && !locked && <OutlineXIcon className={styles["mention-icon-wrapper"]} onClick={onRemove} />}
        </div>
    )
}
