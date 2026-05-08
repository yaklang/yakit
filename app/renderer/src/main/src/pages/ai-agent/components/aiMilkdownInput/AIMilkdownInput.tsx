import React, { useEffect, useImperativeHandle } from 'react'
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'
import { ProsemirrorAdapterProvider } from '@prosemirror-adapter/react'
import { $remark, callCommand, getMarkdown } from '@milkdown/kit/utils'
import { AIMilkdownInputBaseProps, AIMilkdownInputProps } from './type'
import { defaultValueCtx, Editor, editorViewOptionsCtx, rootCtx } from '@milkdown/kit/core'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { useNodeViewFactory, usePluginViewFactory } from '@prosemirror-adapter/react'
import { $view } from '@milkdown/kit/utils'
import { Ctx } from '@milkdown/kit/ctx'
import { codeBlockSchema, commonmark, imageSchema, insertImageCommand } from '@milkdown/kit/preset/commonmark'
import { gfm } from '@milkdown/kit/preset/gfm'
import classNames from 'classnames'
import styles from './AIMilkdownInput.module.scss'
import { gapCursorPlugin } from '@milkdown/kit/plugin/cursor'
import { history } from '@milkdown/kit/plugin/history'
import { clipboard } from '@milkdown/kit/plugin/clipboard'
import { placeholderConfig, placeholderPlugin } from '@/components/MilkdownEditor/Placeholder'
import { AICustomMention, aiMentionFactory, AIMilkdownMention } from './aiMilkdownMention/AIMilkdownMention'
import {
  aiMentionCommand,
  AIMentionCommandParams,
  aiMentionCustomPlugin,
  aiMentionCustomSchema,
} from './aiMilkdownMention/aiMentionPlugin'
import directive from 'remark-directive'
import { useMemoizedFn } from 'ahooks'
import { aiCustomPlugin } from './customPlugin'
import { customShiftEnterPlugin } from '@/components/MilkdownEditor/utils/utils'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { upload, uploadConfig } from '@milkdown/kit/plugin/upload'
import { Node } from '@milkdown/kit/prose/model'
import { AICustomFile } from './aiCustomFile/AICustomFile'
import { yakitNotify } from '@/utils/notification'
import useSessionId from '@/pages/ai-re-act/hooks/useSessionId'

import { AICustomCode } from './aiCustomCode/AICustomCode'
import { handleOpenFileSystemDialog } from '@/utils/fileSystemDialog'
import { getAIImageSuffix } from './utils'

const remarkDirective = $remark(`remark-directive`, () => directive)

export const AIMilkdownInputBase: React.FC<AIMilkdownInputBaseProps> = React.memo(
  React.forwardRef((props, ref) => {
    const {
      readonly,
      defaultValue,
      onUpdateContent,
      onUpdateEditor,
      classNameWrapper,
      onMemfitExtra,
      filterMode,
      chatDataStoreKey,
    } = props
    const { t, i18n } = useI18nNamespaces(['aiAgent'])
    const nodeViewFactory = useNodeViewFactory()
    const pluginViewFactory = usePluginViewFactory()

    const { getSession } = useSessionId()

    const sessionIdRef = React.useRef<string>('') // 作为当前对话得文件路径

    useImperativeHandle(
      ref,
      () => ({
        setMention: (v: AIMentionCommandParams) => {
          onSetMention(v)
        },
        setImage: () => {
          onSetImage()
        },
        getSessionId: () => sessionIdRef.current,
      }),
      [],
    )
    const { get, loading } = useEditor(
      (root) => {
        const uploadPlugins = [
          upload,
          $view(imageSchema.node, () =>
            nodeViewFactory({
              component: () => <AICustomFile sessionId={sessionIdRef.current} chatDataStoreKey={chatDataStoreKey} />,
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
                  if (file.size > 1 * 1024 * 1024) {
                    yakitNotify('error', '图片大小不能超过1M')
                    continue
                  }
                  images.push(file)
                }

                const nodes: Node[] = await Promise.all(
                  images.map((image) => {
                    const src = URL.createObjectURL(image)
                    return schema.nodes.image.createAndFill({
                      src,
                      alt: image.name,
                      title: '',
                    }) as unknown as Node
                  }),
                )
                const session = getSession(sessionIdRef.current)
                sessionIdRef.current = session
                return nodes
              },
            }))
          },
        ].flat()
        const mentionPlugin = [
          ...aiMentionCustomPlugin(),
          aiMentionFactory,
          $view(aiMentionCustomSchema.node, () =>
            nodeViewFactory({
              component: () => <AICustomMention />,
            }),
          ),
          (ctx: Ctx) => () => {
            ctx.set(aiMentionFactory.key, {
              view: pluginViewFactory({
                component: () => <AIMilkdownMention onMemfitExtra={onMemfitExtra} filterMode={filterMode} />,
              }),
            })
          },
        ].flat()
        const codePlugin = [
          $view(codeBlockSchema.node, () => {
            return nodeViewFactory({
              component: () => <AICustomCode />,
            })
          }),
        ].flat()
        const placeholder = [
          placeholderConfig,
          placeholderPlugin,
          (ctx: Ctx) => () => {
            ctx.update(placeholderConfig.key, (prev) => ({
              ...prev,
              text: t('AIMilkdownInput.placeholder'),
            }))
          },
        ]

        const customPlugin = [...aiCustomPlugin()]

        return (
          Editor.make()
            .config((ctx) => {
              ctx.set(rootCtx, root)
              // 配置为只读
              ctx.set(editorViewOptionsCtx, {
                editable: () => !readonly,
              })
              ctx.set(defaultValueCtx, defaultValue || '')

              const listener = ctx.get(listenerCtx)
              listener.markdownUpdated((ctx, nextMarkdown, prevMarkdown) => {
                const isSave = nextMarkdown !== prevMarkdown
                if (isSave) {
                  onUpdateContent && onUpdateContent(nextMarkdown)
                }
              })
            })
            .use(remarkDirective)
            /** customShiftEnterPlugin 方法的注册顺序要先于commonmark，不然会失效，导致Shift-Enter尾部换行塌陷 */
            .use(customShiftEnterPlugin)
            .use(commonmark)
            .use(gfm)
            .use(gapCursorPlugin)
            .use(history)
            .use(clipboard)
            // placeholder
            .use(placeholder)
            // uploadPlugins
            .use(uploadPlugins)
            // listener
            .use(listener)
            // mention 提及@
            .use(mentionPlugin)
            // ```codePlugin```
            .use(codePlugin)
            // 自定义
            .use(customPlugin)
        )
      },
      [readonly, defaultValue, i18n.language],
    )
    useEffect(() => {
      if (loading) return
      const editor = get()
      if (editor) {
        onUpdateEditor?.(editor)
      }
    }, [loading, get])
    useEffect(() => {
      return () => {
        const value = get()?.action(getMarkdown()) || ''
        onUpdateContent && onUpdateContent(value)
      }
    }, [])

    const onSetMention = useMemoizedFn((params: AIMentionCommandParams) => {
      get()?.action(callCommand<AIMentionCommandParams>(aiMentionCommand.key, params))
    })
    const onSetImage = useMemoizedFn(() => {
      handleOpenFileSystemDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: '图片', extensions: getAIImageSuffix() }, // 关键：设置文件过滤器
        ],
      }).then((data) => {
        if (data.filePaths.length > 8) {
          yakitNotify('warning', '一次最多只能上传8张图片')
        }
        const filePaths = data.filePaths.slice(0, 8)
        const filesLength = filePaths.length
        for (let index = 0; index < filesLength; index++) {
          const element = filePaths[index]
          get()?.action(
            callCommand(insertImageCommand.key, {
              src: element,
              alt: element,
            }),
          )
        }
      })
    })
    return (
      <div className={classNames(styles['ai-milkdown-input'], classNameWrapper)}>
        <Milkdown />
      </div>
    )
  }),
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
  }),
)
