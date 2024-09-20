import {defaultValueCtx, Editor, rootCtx} from "@milkdown/kit/core"
import React from "react"

import {Milkdown, useEditor} from "@milkdown/react"
import {commonmark, imageSchema} from "@milkdown/kit/preset/commonmark"

import {gfm} from "@milkdown/kit/preset/gfm"
import {nord} from "@milkdown/theme-nord"
import {history} from "@milkdown/kit/plugin/history"
import {clipboard} from "@milkdown/kit/plugin/clipboard"

import {useNodeViewFactory, usePluginViewFactory} from "@prosemirror-adapter/react"
import {tooltip, TooltipView} from "./Tooltip"
import {BlockView, menuAPI} from "./Block"
import {block} from "@milkdown/plugin-block" // 引入block插件
import {cursor} from "@milkdown/kit/plugin/cursor"

import {imageBlockComponent, imageBlockConfig} from "@milkdown/kit/component/image-block"
import {listItemBlockComponent} from "@milkdown/kit/component/list-item-block"
import {codeBlockComponent, codeBlockConfig} from "@milkdown/kit/component/code-block"

import {html} from "@milkdown/kit/component"
import {languages} from "@codemirror/language-data"
import {basicSetup} from "codemirror"
import {defaultKeymap} from "@codemirror/commands"
import {keymap} from "@codemirror/view"
import {oneDark} from "@codemirror/theme-one-dark"

import {linkTooltipPlugin, linkTooltipConfig} from "@milkdown/kit/component/link-tooltip"

import "@milkdown/theme-nord/style.css"
import "./css/index.css"
import {yakitInfo} from "@/utils/notification"
import {placeholderConfig, placeholderPlugin} from "./Placeholder"

const markdown = `# Milkdown React Commonmark

Maybe more? ![]()

This is a demo for using [Milkdown](https://milkdown.dev) link tooltip component

> You're scared of a world where you're needed.

This is a demo for using Milkdown with **React**.

\`\`\`ts
import { Editor } from '@milkdown/kit/core';
import { commonmark } from '@milkdown/kit/preset/commonmark';

import { nord } from '@milkdown/theme-nord';
import '@milkdown/theme-nord/style.css';

Editor
  .make()
  .config(nord)
  .use(commonmark)
  .create();
\`\`\`

- [ ] Todo list item 1
    - [ ] Todo List item 1.1
    - [ ] Todo List item 1.2
- [ ] Todo list item 2
  1. List item 1
     1. List item 1.1
     2. List item 1.2
  2. List item 2
  3. List item 3
- [ ] Todo list item 3
  - List item 1
    - List item 1.1
    - List item 1.2
- List item 2
- List item 3

`

const check = html`
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="w-6 h-6"
    >
        <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
`

interface MilkdownEditorProps {}
export const MilkdownEditor: React.FC<MilkdownEditorProps> = React.memo((props) => {
    const nodeViewFactory = useNodeViewFactory()
    const pluginViewFactory = usePluginViewFactory()
    useEditor((root) => {
        return (
            Editor.make()
                .config((ctx) => {
                    ctx.set(rootCtx, root)
                    ctx.set(defaultValueCtx, markdown)
                    ctx.set(tooltip.key, {
                        view: pluginViewFactory({
                            component: TooltipView
                        })
                    })
                    ctx.set(block.key, {
                        view: pluginViewFactory({
                            component: BlockView
                        })
                    })
                    ctx.update(imageBlockConfig.key, (value) => ({
                        uploadButton: () => <div>uploadButton</div>,
                        imageIcon: () => <div>imageBlockConfig-imageIcon</div>,
                        captionIcon: () => <div>captionIcon</div>,
                        confirmButton: () => <div>confirm</div>,
                        captionPlaceholderText: "Write Image Caption",
                        uploadPlaceholderText: "or paste link",
                        onUpload: value.onUpload
                    }))

                    // ctx.set(listItemBlockConfig.key, {
                    //     renderLabel: ({label, listType, checked, readonly}) => {
                    //         if (checked == null) {
                    //             if (listType === "bullet") return <span className='label'>{listType}</span>

                    //             return <span className='label'>{label}</span>
                    //         }

                    //         if (checked) return <span className='label'>{label}</span>

                    //         return <span className='label'>{label}</span>
                    //     }
                    // })
                    ctx.update(codeBlockConfig.key, (defaultConfig) => ({
                        ...defaultConfig,
                        languages,
                        extensions: [basicSetup, oneDark, keymap.of(defaultKeymap)],
                        renderLanguage: (language, selected) => {
                            return html`<span class="leading">${selected ? check : null}</span>${language}`
                        }
                    }))

                    ctx.update(linkTooltipConfig.key, (defaultConfig) => ({
                        ...defaultConfig,
                        linkIcon: () => "🔗",
                        editButton: () => "✎",
                        removeButton: () => "❌",
                        confirmButton: () => "✔️",
                        onCopyLink: (link: string) => {
                            console.log("Link copied:", link)
                            yakitInfo("Link copied")
                        }
                    }))

                    ctx.update(placeholderConfig.key, (prev) => {
                        return {
                            ...prev
                        }
                    })
                })
                .config(nord)
                .use(commonmark)
                .use(gfm)
                .use(cursor)
                .use(tooltip)
                .use(history)
                .use(clipboard)
                // Add a custom node view
                // .use(
                //     $view(blockquoteSchema.node, () =>
                //         nodeViewFactory({
                //             component: Blockquote
                //         })
                //     )
                // )
                // block
                .use(block) // 使用 block 插件，启用块手柄
                .use(menuAPI)
                // image
                .use(imageBlockComponent)
                // listItem
                .use(listItemBlockComponent)
                // code
                .use(codeBlockComponent)
                // linkTooltip
                .use(linkTooltipPlugin)
                // placeholder
                .use(placeholderPlugin)
                .use(placeholderConfig)
        )
    }, [])

    return <Milkdown />
})
