import { useEditor } from '@milkdown/react'
import { block, blockConfig } from '@milkdown/plugin-block' // 引入block插件
import { Ctx } from '@milkdown/kit/ctx'
import { BlockView } from '../Block/Block'
import { useNodeViewFactory, usePluginViewFactory } from '@prosemirror-adapter/react'
import { CustomMilkdownProps, MilkdownCollabProps } from '../MilkdownEditorType'
import { placeholderConfig, placeholderPlugin } from '../Placeholder'
import { fileCustomSchema, uploadCustomPlugin } from './uploadPlugin'
import { upload, uploadConfig } from '@milkdown/kit/plugin/upload'
import { ImgMaxSize } from '@/pages/pluginEditor/pluginImageTextarea/PluginImageTextarea'
import { yakitNotify, yakitInfo } from '@/utils/notification'
import { Blockquote } from '../Blockquote'
import { CustomCodeComponent } from '../CodeBlock/CodeBlock'
import { ListItem } from '../ListItem/ListItem'
import { MilkdownHr } from '../MilkdownHr/MilkdownHr'
import { tooltip, TooltipView } from '../Tooltip/Tooltip'
import { alterCustomPlugin } from './alertPlugin'
import { codeCustomPlugin } from './codePlugin'
import { commentCustomPlugin } from './commentPlugin'
import { headingCustomPlugin } from './headingPlugin'
import { insertImageBlockCommand } from './imageBlock'
import { listCustomPlugin } from './listPlugin'
import { trackDeletePlugin } from './trackDeletePlugin'
import { underlineCustomPlugin } from './underline'
import { useCreation, useMemoizedFn } from 'ahooks'
import { $view } from '@milkdown/kit/utils'
import { CustomFile } from '../CustomFile/CustomFile'
import { getBase64 } from '../MilkdownEditor'
import { Node } from '@milkdown/kit/prose/model'
import { imageBlockComponent, imageBlockConfig } from '@milkdown/kit/component/image-block'
import { imageInlineComponent, inlineImageConfig } from '@milkdown/kit/component/image-inline'
import { html } from 'atomico'
import { linkTooltipPlugin, linkTooltipConfig } from '@milkdown/kit/component/link-tooltip'
import {
  blockquoteSchema,
  codeBlockSchema,
  commonmark,
  hrSchema,
  listItemSchema,
  syncHeadingIdPlugin,
} from '@milkdown/kit/preset/commonmark'
import { defaultValueCtx, Editor, editorViewOptionsCtx, rootCtx } from '@milkdown/kit/core'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { gfm } from '@milkdown/kit/preset/gfm'
import { history } from '@milkdown/kit/plugin/history'
import { clipboard } from '@milkdown/kit/plugin/clipboard'
import { cursor } from '@milkdown/kit/plugin/cursor'
import { trailing } from '@milkdown/kit/plugin/trailing'
import { collab } from '@milkdown/plugin-collab'
import { tableBlock } from '@milkdown/kit/component/table-block'
import { markCustomPlugin } from './markPlugin'
import { jumpToLinePlugin, jumpToLinePluginKey } from './jumpLine'
import { editorViewCtx } from '@milkdown/core'
import { TextSelection } from '@milkdown/kit/prose/state'
import type { EditorView } from '@milkdown/prose/view'
import { mentionFactory, MentionListView } from '../Mention/MentionListView'
import { mentionCustomPlugin, mentionCustomSchema } from './mentionPlugin'
import { CustomMention } from '../Mention/CustomMention'
import { useEffect } from 'react'
import emiter from '@/utils/eventBus/eventBus'
import { slash, SlashView } from '../Slash/Slash'
import { httpUploadImgPath } from '@/apiUtils/http'
import { customShiftEnterPlugin } from './utils'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

export interface InitEditorHooksCollabProps extends MilkdownCollabProps {
  onCollab: (ctx: Ctx) => void
  onSaveHistory: (newValue: string) => void
}
interface InitEditorHooksDiffProps {
  onDiff: (ctx: Ctx) => void
}
export interface InitEditorHooksLocalProps {
  local: boolean
  upload: (path: string) => void
}
interface InitEditorHooksProps extends Omit<
  CustomMilkdownProps,
  'collabProps' | 'setEditor' | 'onSaveContentBeforeDestroy'
> {
  collabProps?: InitEditorHooksCollabProps
  diffProps?: InitEditorHooksDiffProps
  localProps?: InitEditorHooksLocalProps
  inViewport?: boolean
}
export default function useInitEditorHooks(props: InitEditorHooksProps) {
  const {
    type,
    readonly,
    defaultValue,
    collabProps,
    customPlugin,
    onMarkdownUpdated,
    diffProps,
    localProps,
    inViewport,
    positionElementId,
    isControlEditorType,
  } = props
  const { t, i18n } = useI18nNamespaces(['components'])

  const nodeViewFactory = useNodeViewFactory()
  const pluginViewFactory = usePluginViewFactory()

  const collabParams: InitEditorHooksCollabProps = useCreation(() => {
    if (!collabProps) {
      const def: InitEditorHooksCollabProps = {
        title: '',
        enableCollab: false,
        milkdownHash: '',
        routeInfo: {
          pageId: '',
          route: null,
        },
        onChangeWSLinkStatus: () => {},
        onChangeOnlineUser: () => {},
        onSetTitle: () => {},
        onCollab: () => {},
        onSaveHistory: () => {},
      }
      return def
    }
    return collabProps
  }, [collabProps])

  const { get, loading } = useEditor(
    (root) => {
      //#region 编辑器引用的相关插件 start
      const blockPlugins = [
        block,
        (ctx: Ctx) => () => {
          ctx.set(block.key, {
            view: pluginViewFactory({
              component: () => (
                <BlockView localProps={localProps} type={type} notepadHash={collabParams?.milkdownHash} />
              ),
            }),
          })
        },
        (ctx: Ctx) => () => {
          ctx.update(blockConfig.key, () => ({
            filterNodes: (pos, node) => {
              if (node.type.name === 'paragraph' && !node.content.size) {
                return true
              }
              return false
            },
          }))
        },
      ].flat()
      const placeholder = [placeholderConfig, placeholderPlugin]
      const uploadPlugins = [
        ...uploadCustomPlugin(),
        upload,
        $view(fileCustomSchema.node, () =>
          nodeViewFactory({
            component: () => <CustomFile type={type} />,
          }),
        ),
        (ctx: Ctx) => () => {
          ctx.update(uploadConfig.key, (prev) => ({
            ...prev,
            uploader: async (files, schema) => {
              const images: File[] = []
              for (let i = 0; i < files.length; i++) {
                const file = files.item(i)
                if (!file) {
                  continue
                }

                // You can handle whatever the file type you want, we handle image here.
                if (!file.type.includes('image')) {
                  continue
                }
                if (file.size > ImgMaxSize) {
                  yakitNotify('error', t('MilkdownEditor.initEditor.imageTooLarge'))
                  continue
                }
                images.push(file)
              }
              const nodes: Node[] = await Promise.all(
                images.map(async (image) => {
                  const alt = image.name
                  try {
                    const src = await uploadImg(image)
                    return schema.nodes['image-block'].createAndFill({
                      src,
                      alt,
                    }) as Node
                  } catch (error) {
                    return schema.nodes.image.createAndFill({
                      src: '',
                      alt,
                    }) as Node
                  }
                }),
              )
              return nodes
            },
          }))
        },
      ].flat()

      const imagePlugin = [
        imageBlockComponent,
        imageInlineComponent,
        insertImageBlockCommand,
        // TODO 自定义imageBlockSchema.node
        // $view(imageBlockSchema.node, () =>
        //     nodeViewFactory({
        //         component: () => <CustomImageBlock />
        //     })
        // ),
        (ctx: Ctx) => () => {
          ctx.update(imageBlockConfig.key, (value) => ({
            ...value,
            captionIcon: () => html`
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M7 8H17M7 12H11M12 20L8 16H5C3.89543 16 3 15.1046 3 14V6C3 4.89543 3.89543 4 5 4H19C20.1046 4 21 4.89543 21 6V14C21 15.1046 20.1046 16 19 16H16L12 20Z"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            `,
            onUpload: async (image: File) => {
              const url = uploadImg(image)
              return url
            },
          }))
        },
        (ctx: Ctx) => () => {
          ctx.update(inlineImageConfig.key, (value) => ({
            ...value,
            imageIcon: () =>
              html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M4 16L8.58579 11.4142C9.36683 10.6332 10.6332 10.6332 11.4142 11.4142L16 16M14 14L15.5858 12.4142C16.3668 11.6332 17.6332 11.6332 18.4142 12.4142L20 14M14 8H14.01M6 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20Z"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <circle cx="14" cy="8" r="1" fill="currentColor" />
              </svg> `,
            onUpload: async (image: File) => {
              const url = uploadImg(image)
              return url
            },
          }))
        },
      ].flat()

      const linkTooltip = [
        linkTooltipPlugin,
        (ctx: Ctx) => () => {
          ctx.update(linkTooltipConfig.key, (defaultConfig) => ({
            ...defaultConfig,
            linkIcon: () => '🔗',
            editButton: () => '✎',
            removeButton: () => '❌',
            confirmButton: () => '✔️',
            onCopyLink: (link: string) => {
              yakitInfo('Link copied')
            },
          }))
        },
      ].flat()

      const listPlugin = [
        ...listCustomPlugin(),
        $view(listItemSchema.node, () =>
          nodeViewFactory({
            component: ListItem,
          }),
        ),
      ].flat()
      const headingPlugin = [...headingCustomPlugin()].flat()
      const codePlugin = [
        ...codeCustomPlugin(),
        $view(codeBlockSchema.node, () => {
          return nodeViewFactory({
            component: () => <CustomCodeComponent isControlEditorType={isControlEditorType} />,
            stopEvent: (e) => true,
          })
        }),
      ].flat()
      const blockquotePlugin = [
        $view(blockquoteSchema.node, () =>
          nodeViewFactory({
            component: Blockquote,
          }),
        ),
      ].flat()

      const alterPlugin = [...alterCustomPlugin()].flat()

      const underlinePlugin = [...underlineCustomPlugin()].flat()

      const commentPlugin = [...commentCustomPlugin()].flat()

      const hrPlugin = [
        $view(hrSchema.node, () =>
          nodeViewFactory({
            component: MilkdownHr,
          }),
        ),
      ].flat()
      const markPlugin = [...markCustomPlugin()].flat()
      /**启动了在线协作才有 @ 提及 相关逻辑 */
      const mentionPlugin = [
        ...mentionCustomPlugin(),
        mentionFactory,
        $view(mentionCustomSchema.node, () =>
          nodeViewFactory({
            component: () => <CustomMention notepadHash={collabParams?.milkdownHash} />,
          }),
        ),
        (ctx: Ctx) => () => {
          if (!!collabParams?.enableCollab) {
            ctx.set(mentionFactory.key, {
              view: pluginViewFactory({
                component: () => <MentionListView notepadHash={collabParams?.milkdownHash} />,
              }),
            })
          }
        },
      ].flat()
      const slashPlugin = [
        slash,
        (ctx: Ctx) => () => {
          ctx.set(slash.key, {
            view: pluginViewFactory({
              component: () => (
                <SlashView localProps={localProps} type={type} notepadHash={collabParams?.milkdownHash} />
              ),
            }),
          })
        },
      ].flat()
      //#endregion
      return (
        Editor.make()
          .config((ctx) => {
            ctx.set(rootCtx, root)
            ctx.set(tooltip.key, {
              view: pluginViewFactory({
                component: TooltipView,
              }),
            })

            // 配置为只读
            ctx.set(editorViewOptionsCtx, {
              editable: () => !readonly,
            })
            ctx.set(defaultValueCtx, defaultValue || '')
            collabParams.onCollab(ctx)
            diffProps?.onDiff(ctx)
            const listener = ctx.get(listenerCtx)
            listener.markdownUpdated((ctx, nextMarkdown, prevMarkdown) => {
              const isSave = nextMarkdown !== prevMarkdown
              if (collabParams.enableCollab && isSave) {
                collabParams.onSaveHistory(nextMarkdown)
              }
              if (isSave) {
                onMarkdownUpdated && onMarkdownUpdated(nextMarkdown, prevMarkdown)
              }
            })
          })
          /** customShiftEnterPlugin 方法的注册顺序要先于commonmark，不然会失效，导致Shift-Enter尾部换行塌陷 */
          .use(customShiftEnterPlugin)
          .use(commonmark.filter((x) => x !== syncHeadingIdPlugin))
          .use(gfm)
          .use(cursor)
          .use(tooltip)
          .use(history)
          .use(clipboard)
          // trailing
          .use(trailing)
          // collab
          .use(collab)
          // listener
          .use(listener)
          // blockquote
          .use(blockquotePlugin)
          // block
          .use(blockPlugins)
          // upload
          .use(uploadPlugins)
          // image
          .use(imagePlugin)
          // listItem
          .use(listPlugin)
          .use(headingPlugin)
          // code
          .use(codePlugin)
          // linkTooltip
          .use(linkTooltip)
          // placeholder
          .use(placeholder)
          // table
          .use(tableBlock)
          // alterCustomPlugin
          .use(alterPlugin)
          // underlinePlugin
          .use(underlinePlugin)
          // commentPlugin
          .use(commentPlugin)
          // hrPlugin
          .use(hrPlugin)
          // markPlugin
          .use(markPlugin)
          // slash
          .use(slashPlugin)
          // trackDeletePlugin
          .use(trackDeletePlugin())
          // .use(jumpToLinePlugin(0))
          // mention 提及@
          .use(mentionPlugin)
          .use(customPlugin || [])
      )
    },
    [readonly, defaultValue, type, collabParams.enableCollab, collabParams.milkdownHash, i18n.language],
  )

  const uploadImg = async (image) => {
    if (localProps?.local) {
      // 目前本地编辑器不支持上次图片
      return ''
    }
    if (image.size > ImgMaxSize) {
      yakitNotify('error', t('MilkdownEditor.initEditor.imageTooLarge'))
      return ''
    }
    try {
      const base64 = await getBase64(image)
      const src = await httpUploadImgPath({
        base64,
        imgInfo: {
          filename: image.name || 'image.png',
          contentType: image.type || 'image/png',
        },
        type: collabParams.enableCollab ? 'notepad' : 'img',
        filedHash: collabParams.milkdownHash,
      })
      return src
    } catch (error) {
      return ''
    }
  }
  //#region 位置定位
  useEffect(() => {
    if (!inViewport) return
    emiter.on('refreshPositionElement', onSetRefreshPositionElement)
    return () => {
      emiter.off('refreshPositionElement', onSetRefreshPositionElement)
    }
  }, [inViewport])
  useEffect(() => {
    if (loading || !positionElementId) return
    const editor = get()
    if (editor) {
      jumpByElementId(positionElementId)
    }
  }, [loading, positionElementId])
  /**根据id跳转到对应位置 */
  const jumpByElementId = useMemoizedFn((targetId: string) => {
    setTimeout(() => {
      const element = document.getElementById(targetId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }, 200)
  })
  const onSetRefreshPositionElement = useMemoizedFn((positionElementId) => {
    jumpByElementId(positionElementId)
  })
  // 调用跳转到行
  const jumpToFifthLine = (line: number) => {
    if (!line) return
    get()?.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      jumpToLine(view, +line)
    })
  }
  //NOTE - 跳转到指定行的逻辑,暂未使用
  const jumpToLine = (view: EditorView, lineNumber: number) => {
    if (!lineNumber) return
    const doc = view.state.doc
    let currentLine = 1 // 当前行号（从 1 开始）
    let targetPos = 0 // 目标行的起始位置
    let isBreak = false
    // 遍历文档节点，计算行号
    doc.descendants((node, pos) => {
      if (currentLine > lineNumber || isBreak) return false // 提前终止遍历
      if (node.isText) {
        const text = node.text || ''
        const lines = text.split('\n')
        for (let i = 0; i < lines.length; i++) {
          if (currentLine === lineNumber) {
            targetPos = pos + lines.slice(0, i).join('\n').length
            if (i > 0) targetPos += 1 // 跳过换行符
            isBreak = true
            break // 找到目标行，终止遍历
          }
          currentLine++
        }
      } else if (node.isBlock) {
        // 块级节点（如段落、标题）默认占一行
        if (currentLine === lineNumber) {
          targetPos = pos + 1 // 跳过节点开始位置
          isBreak = true
          return false
        }
        currentLine++
      }
      return true // 继续遍历子节点
    })

    // 设置光标位置
    if (targetPos > 0 && targetPos <= doc.content.size) {
      const tr = view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(targetPos)))
      tr.scrollIntoView()
      view.dispatch(tr)
      view.focus()

      // // 获取目标位置的 DOM 节点
      // const domPos = view.domAtPos(targetPos)
      // const targetNode = domPos.node
    }
  }

  //#endregion
  return { get, loading, jumpToFifthLine } as const
}
