import React, {useEffect, useImperativeHandle} from "react"
import {Milkdown, MilkdownProvider, useEditor} from "@milkdown/react"
import {ProsemirrorAdapterProvider} from "@prosemirror-adapter/react"
import {$remark, callCommand, getMarkdown} from "@milkdown/kit/utils"
import {AIMilkdownInputBaseProps, AIMilkdownInputProps} from "./type"
import {defaultValueCtx, Editor, editorViewCtx, editorViewOptionsCtx, rootCtx} from "@milkdown/kit/core"
import {listener, listenerCtx} from "@milkdown/kit/plugin/listener"
import {useNodeViewFactory, usePluginViewFactory} from "@prosemirror-adapter/react"
import {$view} from "@milkdown/kit/utils"
import {Ctx} from "@milkdown/kit/ctx"
import {commonmark} from "@milkdown/kit/preset/commonmark"
import {gfm} from "@milkdown/kit/preset/gfm"
import classNames from "classnames"
import styles from "./AIMilkdownInput.module.scss"
import {gapCursorPlugin} from "@milkdown/kit/plugin/cursor"
import {history} from "@milkdown/kit/plugin/history"
import {clipboard} from "@milkdown/kit/plugin/clipboard"
import {placeholderConfig, placeholderPlugin} from "@/components/MilkdownEditor/Placeholder"
import {AICustomMention, aiMentionFactory, AIMilkdownMention} from "./aiMilkdownMention/AIMilkdownMention"
import {
    aiMentionCommand,
    AIMentionCommandParams,
    aiMentionCustomPlugin,
    aiMentionCustomSchema
} from "./aiMilkdownMention/aiMentionPlugin"
import directive from "remark-directive"
import {useMemoizedFn} from "ahooks"
import {aiCustomPlugin} from "./customPlugin"

const remarkDirective = $remark(`remark-directive`, () => directive)

export const AIMilkdownInputBase: React.FC<AIMilkdownInputBaseProps> = React.memo(
    React.forwardRef((props, ref) => {
        const {readonly, defaultValue, onUpdateContent, onUpdateEditor, classNameWrapper, onMemfitExtra, filterMode} =
            props
        const nodeViewFactory = useNodeViewFactory()
        const pluginViewFactory = usePluginViewFactory()
        useImperativeHandle(
            ref,
            () => ({
                setMention: (v: AIMentionCommandParams) => {
                    onSetMention(v)
                }
            }),
            []
        )
        const {get, loading} = useEditor(
            (root) => {
                const mentionPlugin = [
                    ...aiMentionCustomPlugin(),
                    aiMentionFactory,
                    $view(aiMentionCustomSchema.node, () =>
                        nodeViewFactory({
                            component: () => <AICustomMention />
                        })
                    ),
                    (ctx: Ctx) => () => {
                        ctx.set(aiMentionFactory.key, {
                            view: pluginViewFactory({
                                component: () => (
                                    <AIMilkdownMention onMemfitExtra={onMemfitExtra} filterMode={filterMode} />
                                )
                            })
                        })
                    }
                ].flat()
                const placeholder = [
                    placeholderConfig,
                    placeholderPlugin,
                    (ctx: Ctx) => () => {
                        ctx.update(placeholderConfig.key, (prev) => ({
                            ...prev,
                            text: "请告诉我，你想做什么...(shift + enter 换行)"
                        }))
                    }
                ]

                const customPlugin = [...aiCustomPlugin()]

                return (
                    Editor.make()
                        .config((ctx) => {
                            ctx.set(rootCtx, root)
                            // 配置为只读
                            ctx.set(editorViewOptionsCtx, {
                                editable: () => !readonly
                            })
                            ctx.set(defaultValueCtx, defaultValue || "")

                            const listener = ctx.get(listenerCtx)
                            listener.markdownUpdated((ctx, nextMarkdown, prevMarkdown) => {
                                const isSave = nextMarkdown !== prevMarkdown
                                if (isSave) {
                                    onUpdateContent && onUpdateContent(nextMarkdown)
                                }
                            })
                        })
                        .use(remarkDirective)
                        .use(commonmark)
                        .use(gfm)
                        .use(gapCursorPlugin)
                        .use(history)
                        .use(clipboard)
                        // placeholder
                        .use(placeholder)
                        // listener
                        .use(listener)
                        // mention 提及@
                        .use(mentionPlugin)
                        // 自定义
                        .use(customPlugin)
                )
            },
            [readonly, defaultValue]
        )
        useEffect(() => {
            if (loading) return
            const editor = get()
            if (editor) {
                onUpdateEditor?.(editor)
            }
            editor?.action((ctx) => {
                // 简单阻止所有文件粘贴
                ctx.get(editorViewCtx).dom.addEventListener("paste", (e) => {
                    const clipboardData = e.clipboardData
                    if (clipboardData?.types.includes("Files")) {
                        e.preventDefault()
                    }
                })
            })
        }, [loading, get])
        useEffect(() => {
            return () => {
                const value = get()?.action(getMarkdown()) || ""
                onUpdateContent && onUpdateContent(value)
            }
        }, [])

        const onSetMention = useMemoizedFn((params: AIMentionCommandParams) => {
            get()?.action(callCommand<AIMentionCommandParams>(aiMentionCommand.key, params))
        })
        return (
            <div className={classNames(styles["ai-milkdown-input"], classNameWrapper)}>
                <Milkdown />
            </div>
        )
    })
)

export const AIMilkdownInput: React.FC<AIMilkdownInputProps> = React.memo(
    React.forwardRef((props, ref) => {
        return (
            <MilkdownProvider>
                <ProsemirrorAdapterProvider>
                    <AIMilkdownInputBase {...props} ref={ref} />
                </ProsemirrorAdapterProvider>
            </MilkdownProvider>
        )
    })
)
