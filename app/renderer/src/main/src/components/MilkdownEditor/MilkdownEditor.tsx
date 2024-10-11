import {defaultValueCtx, Editor, rootCtx} from "@milkdown/kit/core"
import React, {useEffect} from "react"

import {Milkdown, MilkdownProvider, useEditor} from "@milkdown/react"
import {blockquoteSchema, codeBlockSchema, commonmark} from "@milkdown/kit/preset/commonmark"
import {gfm} from "@milkdown/kit/preset/gfm"
import {history} from "@milkdown/kit/plugin/history"
import {clipboard} from "@milkdown/kit/plugin/clipboard"

import {ProsemirrorAdapterProvider, useNodeViewFactory, usePluginViewFactory} from "@prosemirror-adapter/react"
import {tooltip, TooltipView} from "./Tooltip/Tooltip"
import {BlockView, menuAPI} from "./Block"
import {block} from "@milkdown/plugin-block" // 引入block插件
import {cursor} from "@milkdown/kit/plugin/cursor"
import {imageBlockComponent, imageBlockConfig} from "@milkdown/kit/component/image-block"
import {listItemBlockComponent} from "@milkdown/kit/component/list-item-block"

import {linkTooltipPlugin, linkTooltipConfig} from "@milkdown/kit/component/link-tooltip"

import "./css/index.scss"
import {yakitInfo} from "@/utils/notification"
import {placeholderConfig, placeholderPlugin} from "./Placeholder"
import {$view} from "@milkdown/kit/utils"
import {CustomCodeComponent} from "./CodeBlock"
import {Blockquote} from "./Blockquote"
import {CustomMilkdownProps, MilkdownEditorProps} from "./MilkdownEditorType"
import {alterCustomPlugin} from "./utils/alertPlugin"

import {diffLines} from "diff"
import {useMemoizedFn} from "ahooks"
import {underlinePlugin} from "./utils/underline"

const markdown = `

:u[This text will be underlined]

~~what is Milkdown? Please~~

# 1-1  Milkdown React Commonmark

## 1-2  Milkdown React Commonmark
### 1-3  Milkdown React Commonmark

# 2-1  Milkdown React Commonmark
# 2-1  Milkdown React Commonmark
# 2-1  Milkdown React Commonmark
# 2-1  Milkdown React Commonmark
# 2-1  Milkdown React Commonmark
# 2-1  Milkdown React Commonmark
# 2-1  Milkdown React Commonmark
# 2-1  Milkdown React Commonmark
# 2-1  Milkdown React Commonmark
# 2-1  Milkdown React Commonmark
# 2-1  Milkdown React Commonmark
# 2-1  Milkdown React Commonmark
# 2-1  Milkdown React Commonmark
# 2-1  Milkdown React Commonmark
# 2-1  Milkdown React Commonmark
## 2-2  Milkdown React Commonmark
### 2-3  Milkdown React Commonmark
### 2-3  Milkdown React Commonmark
### 2-3  Milkdown React Commonmark
### 2-3  Milkdown React Commonmark
### 2-3  Milkdown React Commonmark
### 2-3  Milkdown React Commonmark
### 2-3  Milkdown React Commonmark
### 2-3  Milkdown React Commonmark

> \[!NOTE]
> Useful information that users should know, even when skimming content.

> fdsfdsf

:::note
markdown
:::
:::tip
markdown
:::
:::danger
markdown
:::
:::caution
markdown
:::

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
const markdown1 = `#ggg`
const markdown2 = `#ggg
fsdfsdf
`
const CustomMilkdown: React.FC<CustomMilkdownProps> = React.memo((props) => {
    const {setEditor, customPlugin = []} = props
    const nodeViewFactory = useNodeViewFactory()
    const pluginViewFactory = usePluginViewFactory()

    const {get} = useEditor((root) => {
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
                })
                .use(commonmark)
                .use(gfm)
                .use(cursor)
                .use(tooltip)
                .use(history)
                .use(clipboard)
                // Add a custom node view
                .use(
                    $view(blockquoteSchema.node, () =>
                        nodeViewFactory({
                            component: Blockquote
                        })
                    )
                )
                // block
                .use(block) // 使用 block 插件，启用块手柄
                .use(menuAPI)
                // image
                .use(imageBlockComponent)
                // listItem
                .use(listItemBlockComponent)
                // code
                // .use(codeBlockComponent)
                .use(
                    $view(codeBlockSchema.node, () => {
                        return nodeViewFactory({
                            component: CustomCodeComponent,
                            stopEvent: (e) => true
                        })
                    })
                )
                // linkTooltip
                .use(linkTooltipPlugin)
                // placeholder
                .use(placeholderPlugin)
                .use(placeholderConfig)
                // alterCustomPlugin
                .use([...alterCustomPlugin()])
                // underlinePlugin
                .use([...underlinePlugin()])
                .use(customPlugin)
        )
    }, [])
    useEffect(() => {
        const editor = get()
        if (editor && setEditor) {
            setEditor(editor)
        }
    }, [get])

    const onDifferences = useMemoizedFn((ctx) => {
        // 获取两个文档的差异
        const differences = diffLines(markdown1, markdown2)

        let content = ""

        differences.forEach((part) => {
            if (part.removed) {
                content += `~~${part.value}~~\n` // 用删除线标记删除内容
            } else if (part.added) {
                content += "`" + `${part.value}` + "`" + "\n" // 用高亮标记新增内容
            } else {
                content += part.value // 未改变的内容保持原样
            }
        })

        ctx.set(defaultValueCtx, content)
    })
    return <Milkdown />
})

export const MilkdownEditor: React.FC<MilkdownEditorProps> = React.memo((props) => {
    return (
        <MilkdownProvider>
            <ProsemirrorAdapterProvider>
                <CustomMilkdown {...props} />
            </ProsemirrorAdapterProvider>
        </MilkdownProvider>
    )
})
