import React, {useEffect} from "react"
import {Milkdown, MilkdownProvider, useEditor} from "@milkdown/react"
import {ProsemirrorAdapterProvider} from "@prosemirror-adapter/react"
import useInitEditorHooks, {InitEditorHooksLocalProps} from "@/components/MilkdownEditor/utils/initEditor"
import {getMarkdown} from "@milkdown/kit/utils"
import {useCreation} from "ahooks"
import {AIMilkdownInputProps} from "./type"
import {defaultValueCtx, Editor, editorViewOptionsCtx, rootCtx} from "@milkdown/kit/core"
import {listener, listenerCtx} from "@milkdown/kit/plugin/listener"
import {mentionCustomPlugin, mentionCustomSchema} from "../../../../components/MilkdownEditor/utils/mentionPlugin"
import {useNodeViewFactory, usePluginViewFactory} from "@prosemirror-adapter/react"
import {mentionFactory} from "../../../../components/MilkdownEditor/Mention/MentionListView"
import {$view} from "@milkdown/kit/utils"
import {Ctx} from "@milkdown/kit/ctx"

export const AIMilkdownInput: React.FC<AIMilkdownInputProps> = React.memo(
    React.forwardRef((props, ref) => {
        const {readonly, defaultValue, onChange} = props
        const nodeViewFactory = useNodeViewFactory()
        const pluginViewFactory = usePluginViewFactory()
        const {get, loading} = useEditor(
            (root) => {
                const mentionPlugin = [
                    ...mentionCustomPlugin(),
                    mentionFactory,
                    // $view(mentionCustomSchema.node, () =>
                    //     nodeViewFactory({
                    //         component: () => <AIMention />
                    //     })
                    // ),
                    // (ctx: Ctx) => () => {
                    //     ctx.set(mentionFactory.key, {
                    //         view: pluginViewFactory({
                    //             component: () => <AIMentionList />
                    //         })
                    //     })
                    // }
                ].flat()
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
                                    onChange && onChange(nextMarkdown, prevMarkdown)
                                }
                            })
                        })
                        // mention 提及@
                        .use(mentionPlugin)
                )
            },
            [readonly, defaultValue]
        )

        return (
            <MilkdownProvider>
                <ProsemirrorAdapterProvider>
                    <Milkdown />
                </ProsemirrorAdapterProvider>
            </MilkdownProvider>
        )
    })
)
